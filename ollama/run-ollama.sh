#!/usr/bin/env bash

ollama serve &
ollama list
ollama pull nomic-embed-text
ollama pull bge-m3
ollama pull deepseek-coder-v2
ollama pull manutic/nomic-embed-code:latest
