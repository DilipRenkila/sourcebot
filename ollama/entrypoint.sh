#!/bin/bash

echo "Starting Ollama server..."
ollama serve &
SERVE_PID=$!

echo "Waiting for Ollama server to be active..."
while ! ollama list | grep -q 'NAME'; do
  sleep 1
done

ollama pull nomic-embed-text

ollama pull bge-m3

ollama pull deepseek-coder-v2

wait $SERVE_PID
