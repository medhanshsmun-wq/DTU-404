#!/bin/bash

# Simple script to add, commit, and push changes to git

# Check if a commit message was provided
if [ -z "$1" ]; then
  echo "Error: Please provide a commit message."
  echo "Usage: ./push_to_git.sh \"Your commit message here\""
  exit 1
fi

COMMIT_MESSAGE=$1

echo "1. Adding all changes..."
git add .

echo "2. Committing changes..."
git commit -m "$COMMIT_MESSAGE"

echo "3. Pulling latest changes from the remote..."
# You can change 'main' to the branch you are actively using
git pull origin main --rebase

echo "4. Pushing changes to the remote repository..."
git push origin main

echo "Done!"
