# Startup & Git Procedure

This guide explains how to start all the project servers and how to push your changes to Git.

## 1. Starting the Servers

To run the full stack, you need to start the backend, frontend, and guest-frontend servers. You can run these commands in separate terminal windows.

### Terminal 1: Backend Server
```bash
cd backend
npm install
npm start
```
*(Runs on `http://localhost:3000` or the port defined in `.env`)*

### Terminal 2: Main Frontend
```bash
cd frontend
npm install
npm run dev
```
*(Runs Vite dev server, typically on `http://localhost:5173`)*

### Terminal 3: Guest Frontend
```bash
cd guest-frontend
npm install
npm run dev
```
*(Runs Vite dev server, typically on `http://localhost:5174`)*

---

## 2. Pushing to Git

When you are ready to share your changes with the team, follow these steps in your terminal from the root folder (`hackathon`):

**Step 1: Check your changes**
```bash
git status
```

**Step 2: Add your changes**
```bash
# To add all changed files:
git add .

# Or to add specific files:
# git add path/to/file
```

**Step 3: Commit your changes**
```bash
git commit -m "Brief description of the changes you made"
```

**Step 4: Pull latest changes (to avoid conflicts)**
```bash
git pull origin main
```
*(Replace `main` with your current branch if you are not working on the main branch)*

**Step 5: Push to the repository**
```bash
git push origin main
```

---

## Quick Start / Git Scripts

There are two included scripts in the root directory that automate these processes:
- `./start_servers.sh` : Starts the Backend, Operator Dashboard, and Guest App simultaneously.
- `./push_to_git.sh` : Automatically prompts for a commit message and pushes to your repository.
