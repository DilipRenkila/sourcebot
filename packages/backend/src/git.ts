import { GitRepository } from './types.js';
import { simpleGit, SimpleGitProgressEvent } from 'simple-git';
import { existsSync } from 'fs';
import { createLogger } from './logger.js';

const logger = createLogger('git');

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
            '--no-bare',
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

    await git.cwd({
        path: repo.path,
    }).pull(
        "origin",
        undefined,
        [
            "--progress"
        ]
    );
}
