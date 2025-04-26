#!/usr/bin/env bash

ollama serve &
ollama list
ollama pull nomic-embed-text
ollama pull bge-m3
