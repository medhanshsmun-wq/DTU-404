#!/bin/bash

# Simple script to start all servers at once

# 1. Start Backend
echo "Starting Backend..."
cd backend
npm install
npm start &
cd ..

# 2. Start Main Frontend
echo "Starting Frontend..."
cd frontend
npm install
npm run dev &
cd ..

# 3. Start Guest Frontend
echo "Starting Guest Frontend..."
cd guest-frontend
npm install
npm run dev &
cd ..

echo "All servers are starting up in the background!"
echo "Press Ctrl+C to stop this script (note: you may need to kill node processes manually if they run in background, or just keep this terminal open)"

wait
