# Taj Hotel Crisis Response - Deployment Guide

This repository contains the backend and two React/Vite frontends (Employee and Guest). 
Follow these instructions to deploy the final demo to the cloud.

## 1. Environment Variables

### Backend (`/backend/.env`)
Create a `.env` file in the `backend/` directory with the following variables:
- `PORT` (e.g., 3001)
- `MONGODB_URI` - MongoDB Atlas connection string. (Required for data persistence)
- `GEMINI_API_KEY` - Your Gemini AI API Key for incident enrichment.
- `GEMINI_MODEL` - `gemini-2.5-flash` or similar.

### Frontends (`/frontend/.env` and `/guest-frontend/.env`)
Create `.env` files in both frontend directories:
- `VITE_API_BASE_URL` - The public URL of your deployed backend (e.g., `https://taj-crisis-backend.onrender.com`).

---

## 2. Deploying the Backend (Docker / Render / Railway)

The backend is fully Dockerized. You can deploy it easily to platforms like Render, Railway, or Fly.io.

1. Create a new Web Service on your platform.
2. Point it to your GitHub repository and set the Root Directory to `backend`.
3. The platform should automatically detect the `Dockerfile` and build it.
4. Ensure you add the required Environment Variables in the platform's dashboard.
5. Once deployed, note the public URL.

---

## 3. Deploying the Frontends (Vercel / Netlify)

Both the Employee Dashboard (`/frontend`) and the Guest App (`/guest-frontend`) are standard Vite applications, ideal for static hosting on Vercel or Netlify.

### Deploying the Employee Dashboard
1. Create a new project on Vercel/Netlify.
2. Set the Root Directory to `frontend`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add `VITE_API_BASE_URL` to the Environment Variables, pointing to your deployed backend.

### Deploying the Guest App
1. Create a new project on Vercel/Netlify.
2. Set the Root Directory to `guest-frontend`.
3. Build Command: `npm run build`
4. Output Directory: `dist`
5. Add `VITE_API_BASE_URL` to the Environment Variables.

---

## 4. Local Testing

To run the full stack locally for testing before deployment:

1. Ensure MongoDB is running locally or you have an Atlas cluster URI in `backend/.env`.
2. Run `./start_servers.sh` from the root directory.
3. Access the Employee Dashboard at `http://localhost:5173`.
4. Access the Guest App at `http://localhost:5174`.

## 5. Running the Hybrid CCTV Pipeline (Live Demo)

For the live demonstration of the autonomous hybrid medical detection pipeline:
1. Ensure the backend is running (`npm start` in `backend/`).
2. Navigate to `backend/cctv_pipeline/`.
3. Create a python virtual environment: `python3 -m venv venv`
4. Activate the virtual environment: `source venv/bin/activate`
5. Install dependencies: `pip install -r requirements.txt ultralytics`
6. Run the pipeline: `python main.py`
The script will loop the `cam07_incident.mp4` video, run local Ultralytics YOLO person detection, and upon detecting a "Person Down", send the frame to the Node.js backend to be verified by Gemini Vision AI. If confirmed, a real incident will automatically appear on the dashboard.
