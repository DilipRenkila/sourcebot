import { GitRepository } from './types.js';
import { simpleGit, SimpleGitProgressEvent } from 'simple-git';
import { existsSync } from 'fs';
import { createLogger } from './logger.js';

const logger = createLogger('git');

/**
 * Clones or pulls a repository depending on whether it already exists
 */

export const syncRepository = async (repo: GitRepository, onProgress?: (event: SimpleGitProgressEvent) => void) => {
    if (existsSync(repo.path)) {
        logger.info(`${repo.id} already exists. Pulling latest changes...`);
        try {
            const git = simpleGit({
                progress: onProgress,
            });

            // Check if it's a bare repository
            const isBare = await git.cwd({
                path: repo.path,
            }).raw(['config', '--get', 'core.bare']).then(
                output => output.trim() === 'true',
                () => false
            );

            if (isBare) {
                logger.warn(`${repo.id} is a bare repository. Cannot pull. Consider removing and re-cloning.`);
                return;
            }

            // Get the list of remote branches to determine the default branch
            const branches = await git.cwd({
                path: repo.path,
            }).branch(['-r']);

            // Try to determine the default branch
            let defaultBranch = null;
            
            // Check for common branch names in order of likelihood
            const branchPriorities = ['origin/main', 'origin/master', 'origin/develop', 'origin/dev'];
            
            for (const branch of branchPriorities) {
                if (branches.all.includes(branch)) {
                    defaultBranch = branch.replace('origin/', '');
                    break;
                }
            }
            
            // If we still don't have a default branch, use the first available remote branch
            if (!defaultBranch && branches.all.length > 0) {
                const firstBranch = branches.all.find(b => b.startsWith('origin/'));
                if (firstBranch) {
                    defaultBranch = firstBranch.replace('origin/', '');
                }
            }
            
            if (!defaultBranch) {
                throw new Error(`No remote branches found for repository ${repo.id}`);
            }
            
            // Pull using the identified default branch
            logger.info(`Pulling from branch '${defaultBranch}' for ${repo.id}`);
            await git.cwd({
                path: repo.path,
            }).pull("origin", defaultBranch, ["--progress"]);
            
            logger.info(`Successfully pulled latest changes for ${repo.id}`);
        } catch (error) {
            logger.error(`Failed to pull repository ${repo.id}: ${error}`);
            throw error;
        }
    } else {
        logger.info(`${repo.id} does not exist. Cloning...`);
        try {
            const git = simpleGit({
                progress: onProgress,
            });

            const gitConfig = Object.entries(repo.gitConfigMetadata ?? {}).flatMap(
                ([key, value]) => ['--config', `${key}=${value}`]
            );

            // Explicitly specify --no-bare to ensure we get a working copy
            await git.clone(
                repo.cloneUrl,
                repo.path,
                [
                    '--no-bare',
                    ...gitConfig
                ]
            );

            // This is still useful to ensure all branches are fetched
            await git.cwd({
                path: repo.path,
            }).addConfig("remote.origin.fetch", "+refs/heads/*:refs/heads/*");
            
            logger.info(`Successfully cloned ${repo.id}`);
        } catch (error) {
            logger.error(`Failed to clone repository ${repo.id}: ${error}`);
            throw error;
        }
    }
}
export const cloneRepository = async (repo: GitRepository, onProgress?: (event: SimpleGitProgressEvent) => void) => {
    if (existsSync(repo.path)) {
        logger.warn(`${repo.id} already exists. Skipping clone.`)
        return;
    }

    const git = simpleGit({
        progress: onProgress,
    });

    const gitConfig = Object.entries(repo.gitConfigMetadata ?? {}).flatMap(
        ([key, value]) => ['--config', `${key}=${value}`]
    );

    // Remove the "--bare" flag to get a full working copy
    await git.clone(
        repo.cloneUrl,
        repo.path,        
        [
            '--bare',
            ...gitConfig
        ]
    );

    // This is still useful to ensure all branches are fetched
    await git.cwd({
        path: repo.path,
    }).addConfig("remote.origin.fetch", "+refs/heads/*:refs/heads/*");
}


export const fetchRepository = async (repo: GitRepository, onProgress?: (event: SimpleGitProgressEvent) => void) => {
    const git = simpleGit({
        progress: onProgress,
    });

    await git.cwd({
        path: repo.path,
    }).fetch(
        "origin",
        [
            "--prune",
            "--progress"
        ]
    );
}

export const pullRepository = async (repo: GitRepository, onProgress?: (event: SimpleGitProgressEvent) => void) => {
    const git = simpleGit({
        progress: onProgress,
    });

    try {
        // First, fetch to make sure we have the latest remote information
        await git.cwd({
            path: repo.path,
        }).fetch("origin", ["--prune", "--progress"]);

        // Get the list of remote branches
        const branches = await git.cwd({
            path: repo.path,
        }).branch(['-r']);

        // Try to determine the default branch
        let defaultBranch = null;
        
        // Check for common branch names in order of likelihood
        const branchPriorities = ['origin/main', 'origin/master', 'origin/develop', 'origin/dev'];
        
        for (const branch of branchPriorities) {
            if (branches.all.includes(branch)) {
                defaultBranch = branch.replace('origin/', '');
                break;
            }
        }
        
        // If we still don't have a default branch, use the first available remote branch
        if (!defaultBranch && branches.all.length > 0) {
            const firstBranch = branches.all.find(b => b.startsWith('origin/'));
            if (firstBranch) {
                defaultBranch = firstBranch.replace('origin/', '');
            }
        }
        
        if (!defaultBranch) {
            throw new Error(`No remote branches found for repository ${repo.id}`);
        }
        
        // Pull using the identified default branch
        logger.info(`Pulling from branch '${defaultBranch}' for ${repo.id}`);
        await git.cwd({
            path: repo.path,
        }).pull("origin", defaultBranch, ["--progress"]);
        
    } catch (error) {
        logger.error(`Failed to pull repository ${repo.id}: ${error}`);
        throw error;
    }
}