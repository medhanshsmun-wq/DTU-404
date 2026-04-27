# 🛡️ Sentinel
### Autonomous Crisis Management & Hospitality Intelligence Platform

> *Transforming hotels from buildings into living, thinking environments that protect guests and empower staff.*

---

## Table of Contents

- [Overview](#overview)
- [Platform Architecture](#platform-architecture)
- [Core Modules](#core-modules)
  - [Operator Dashboard](#1-operator-dashboard--the-command-center)
  - [Guest Portal](#2-guest-portal--premium-safety--service)
  - [AI & Vision Engine](#3-ai--vision-engine)
- [Tech Stack](#tech-stack)
- [System Design](#system-design)
  - [Unified Priority Engine (UPE)](#unified-priority-engine-upe--vsihlp)
  - [Real-Time Communication](#real-time-communication)
  - [Auto-Protect Dispatch](#auto-protect-dispatch)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running Locally](#running-locally)
- [Demo Walkthrough](#demo-walkthrough)
- [Project Structure](#project-structure)
- [Deployment](#deployment)
- [API Reference](#api-reference)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

**Sentinel** is a next-generation safety and hospitality intelligence platform engineered for high-end venues. It bridges the gap between **Real-Time AI Surveillance** and **Automated Emergency Response**, while simultaneously providing guests with a premium, safety-first digital experience.

Unlike traditional security systems that rely on passive recording and reactive human monitoring, Sentinel is **proactive and autonomous**. Its AI core continuously analyzes live feeds, scores threats across six dimensions, dispatches the nearest qualified responders, and notifies guests — all within seconds, without human intervention.

**Key Value Propositions:**
- **Zero-Lag Emergency Response**: From detection to dispatch in under 5 seconds
- **Context-Aware AI**: Differentiates between a guest walking vs. a guest who has fallen
- **Unified Operator Experience**: A single command center for security, service, and staff
- **Guest-First Safety**: Guests receive real-time alerts and evacuation guidance on their own devices
- **Autonomous Authority Coordination**: Auto-initiates voice dispatch to local emergency services

---

## Platform Architecture

Sentinel is built on a **high-performance monorepo** architecture with distinct frontend applications and a shared real-time backend.

```
┌─────────────────────────────────────────────────────────────────┐
│                        SENTINEL PLATFORM                        │
├──────────────────────┬──────────────────────┬───────────────────┤
│   Operator Dashboard │    Guest Portal       │   Backend API     │
│   (React / Vercel)   │   (React / Vercel)    │  (Node / Render)  │
├──────────────────────┴──────────────────────┴───────────────────┤
│                    Socket.io Real-Time Layer                     │
├─────────────────────────────────────────────────────────────────┤
│              MongoDB Atlas  │  Gemini 1.5/2.5 Flash             │
│         (Persistence Layer) │  (AI Vision & Text Engine)         │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment Topology

| Component          | Platform | Notes                                      |
|--------------------|----------|--------------------------------------------|
| Backend API        | Render   | Node.js + Express, always-on service       |
| Operator Dashboard | Vercel   | React SPA, CDN-cached global delivery      |
| Guest Portal       | Vercel   | React SPA, mobile-first responsive design  |
| Database           | MongoDB Atlas | Geo-distributed, auto-failover cluster |
| AI Engine          | Google Cloud | Gemini Flash via Vertex AI SDK         |

---

## Core Modules

### 1. Operator Dashboard — The Command Center

The Operator Dashboard is the **"brain"** of hotel security operations. It provides a unified interface for monitoring, response coordination, and service management.

#### CCTV Autonomous Monitoring
- Continuously processes live feeds (simulated via high-fidelity video loops)
- Detects anomalies including: **falls**, **fires**, **security threats**, **unauthorized access**, and **medical emergencies**
- AI analysis runs in the background without requiring operator attention
- Each scan cycle produces a structured threat assessment report

#### Incident Lifecycle Management
Every detected incident progresses through a tracked lifecycle with millisecond-precision timestamps:

```
DETECTED → ANALYZING → DISPATCHING → EN ROUTE → ON SCENE → RESOLVED
```

Operators can view incident history, force-resolve incidents, or escalate severity at any stage.

#### Dispatch Monitor
- **Auto-Protect Dispatch**: When a critical threat is scored above threshold, the system automatically:
  1. Identifies the nearest qualified staff member by role (Security / Medical / Fire)
  2. Calculates optimal routing based on current zone occupancy
  3. Assigns the responder and updates their status in real time
  4. Initiates a **simulated voice call** to local authorities (e.g., Mumbai Fire Brigade) with a context-aware emergency message

#### Staff & Personnel Roster
- Live roster of all on-duty personnel with their current zone and availability status
- Role-based qualification tags ensure the right responder is always dispatched
- Responder location updates in real time as they move through the property

#### Services Management
- Receives and tracks all guest service requests (Room Service, Housekeeping, Maintenance, Transportation)
- Requests appear instantly via Socket.io, assignable to available staff

---

### 2. Guest Portal — Premium Safety & Service

The Guest Portal is a **mobile-first progressive web application** that transforms the guest's smartphone into a personal safety and concierge device.

#### Demo Login Credentials

| Field       | Value   |
|-------------|---------|
| Room Number | `100`   |
| Last Name   | `Guest` |

#### Real-Time Safety Alerts
- When an incident is detected near the guest's registered zone, an **immediate, high-priority push alert** appears on their device
- Alerts include: incident type, recommended actions, nearest exit, and an estimated "all-clear" timeline
- Powered by Socket.io for sub-second delivery

#### Self-Reported Movement
- Guests can update their **current zone** (e.g., Sea Lounge, Pool, Lobby, Restaurant)
- The Command Center ingests this data for **real-time soul accounting** during evacuations
- Zone data persists to MongoDB for audit trails

#### Digital Concierge
A full-featured luxury service request system:

| Service Category | Examples                                      |
|------------------|-----------------------------------------------|
| Room Service     | Menu browsing, dietary preferences, scheduling |
| Housekeeping     | Turn-down, linen change, DND management       |
| Maintenance      | AC, plumbing, electronics, in-room tech       |
| Transportation   | Airport pickup, taxi, car rental, local tours |

#### Emergency Information System
- Interactive floor plans with highlighted evacuation routes
- **Fire evacuation protocols** with assembly point mapping
- **Earthquake protocols**: Drop-Cover-Hold instructions and safe zones
- **Medical emergency guides**: CPR basics, AED locations, emergency contacts
- All content is available **offline** after first load

---

### 3. AI & Vision Engine

Sentinel's intelligence layer is powered by **Google Gemini 1.5 Flash** (vision) and **Gemini 2.5 Flash** (text reasoning), orchestrated by a proprietary analysis pipeline.

#### Dynamic Threat Detection
The AI does not rely on simple motion detection. It performs **semantic scene understanding**:

| Scene Signal             | AI Interpretation                      |
|--------------------------|----------------------------------------|
| Person lying on floor    | Medical Emergency — Cardiac / Fall     |
| Smoke + rising heat      | Fire — Stage 1 / Stage 2               |
| Crowd density spike      | Potential Stampede / Panic Risk        |
| Person at restricted door| Security Breach — Unauthorized Access  |
| Erratic movement pattern | Intoxication / Behavioral Threat       |

#### Autonomous Enrichment
Beyond classification, the AI generates:
- **Natural language incident descriptions** for operator awareness
- **Specific recommended actions** tailored to the threat type and location
- **Severity reasoning** explaining the VSIHLP score assigned

#### Rate-Limit Management
- An intelligent **"Heartbeat" polling mechanism** locally manages API call cadence
- Prevents quota exhaustion during high-activity periods
- Falls back to last-known state with a visual indicator when the API is rate-limited
- Automatically resumes full-fidelity analysis when quota resets

---

## Tech Stack

### Backend
| Technology     | Purpose                                         |
|----------------|-------------------------------------------------|
| Node.js        | Runtime environment                             |
| Express.js     | REST API framework                              |
| Socket.io      | Real-time bi-directional event communication    |
| MongoDB Atlas  | Incident logs, personnel rosters, guest sessions|
| Mongoose       | ODM for MongoDB schema and query management     |

### Frontend (Both Dashboards)
| Technology     | Purpose                                         |
|----------------|-------------------------------------------------|
| React          | Component-based UI framework                    |
| Socket.io Client | Real-time event subscription from browser    |
| Axios          | HTTP client for REST API calls                  |
| React Router   | Client-side navigation                          |

### AI / Intelligence
| Technology              | Purpose                                      |
|-------------------------|----------------------------------------------|
| Gemini 1.5 Flash Vision | CCTV frame analysis, object/event detection  |
| Gemini 2.5 Flash Text   | Incident enrichment, dispatch messaging      |
| Google AI SDK           | Model orchestration and prompt management    |

### Infrastructure
| Service        | Role                                            |
|----------------|-------------------------------------------------|
| Render         | Backend hosting (Node.js, persistent service)   |
| Vercel         | Frontend hosting (global CDN, edge functions)   |
| MongoDB Atlas  | Database hosting (geo-replicated cluster)       |

---

## System Design

### Unified Priority Engine (UPE) — VSIHLP

Every incident detected by the AI is scored across **6 weighted dimensions** to produce a composite Priority Score (0–100) that drives dispatch thresholds:

| Dimension    | Code | Description                                      | Weight |
|--------------|------|--------------------------------------------------|--------|
| Vital        | V    | Is there a direct threat to human life?          | 30%    |
| Severity     | S    | How rapidly could this threat spread or escalate?| 20%    |
| Immediate    | I    | Is immediate physical intervention required?     | 20%    |
| Historical   | H    | Has this zone had prior incidents? Any patterns? | 10%    |
| Location     | L    | Is the zone high-access (lobby) or restricted?   | 10%    |
| Propagation  | P    | Could panic or information spread worsen outcomes?| 10%   |

**Dispatch Thresholds:**

| Score Range | Classification | Response Level                        |
|-------------|----------------|---------------------------------------|
| 0 – 30      | Low            | Log only, monitor                     |
| 31 – 60     | Medium         | Alert operator, standby dispatch      |
| 61 – 80     | High           | Auto-dispatch staff, notify guest     |
| 81 – 100    | Critical       | Full dispatch + authority voice call  |

---

### Real-Time Communication

Sentinel uses **Socket.io rooms** to scope event delivery:

```
sentinel-ops          → All operator dashboard clients
sentinel-guest-{room} → Specific guest's portal session
sentinel-staff-{id}   → Individual staff member's device
```

**Core Events:**

| Event Name              | Direction       | Payload                          |
|-------------------------|-----------------|----------------------------------|
| `incident:detected`     | Server → Ops    | Incident object with VSIHLP score|
| `incident:updated`      | Server → Ops    | Lifecycle stage change           |
| `dispatch:assigned`     | Server → Staff  | Assignment details + route       |
| `alert:guest`           | Server → Guest  | Emergency alert + actions        |
| `service:new`           | Guest → Server  | Service request object           |
| `zone:update`           | Guest → Server  | Guest's current location         |

---

### Auto-Protect Dispatch

The dispatch algorithm follows this decision tree when a High or Critical incident is scored:

```
1. Query personnel roster → filter by: on-duty, correct role, not currently deployed
2. Calculate proximity score for each candidate (zone graph distance)
3. Select optimal candidate (nearest + highest qualification match)
4. Emit dispatch:assigned event to staff device
5. Update incident record with responder ID and dispatch timestamp
6. If Critical: Invoke Voice Dispatch API → generate context message → initiate call
7. Begin polling responder status until ON_SCENE confirmed
```

---

## Getting Started

### Prerequisites

- Node.js `v18+`
- npm or yarn
- MongoDB Atlas account (free tier supported)
- Google AI Studio API key (Gemini access)

### Environment Variables

Create a `.env` file in the `/backend` directory:

```env
# Server
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/sentinel

# Google AI
GEMINI_API_KEY=your_gemini_api_key_here

# Socket.io
CORS_ORIGIN=http://localhost:5173,http://localhost:5174

# Optional: Voice Dispatch
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
```

Create a `.env` file in `/frontend` and `/guest-frontend`:

```env
VITE_API_BASE_URL=http://localhost:3001
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/sentinel.git
cd sentinel

# Install backend dependencies
cd backend
npm install

# Install operator dashboard dependencies
cd ../frontend
npm install

# Install guest portal dependencies
cd ../guest-frontend
npm install
```

### Running Locally

Open **three terminal windows**:

```bash
# Terminal 1: Backend API
cd backend
npm run dev
# → Listening on http://localhost:5000

# Terminal 2: Operator Dashboard
cd frontend
npm run dev
# → Served on http://localhost:5173

# Terminal 3: Guest Portal
cd guest-frontend
npm run dev
# → Served on http://localhost:5174
```

---

## Demo Walkthrough

Follow this sequence to experience the full Sentinel emergency response lifecycle:

### Step 1 — Trigger Detection
1. Open the **Operator Dashboard** at `http://localhost:5173`
2. Navigate to the **CCTV Monitor** panel
3. Click **"Start Autonomous Scan"**
4. The AI begins analyzing the simulated live feed

### Step 2 — Watch Auto-Protect Respond
- Within seconds, the AI detects an anomaly (e.g., a fall or smoke event)
- The **VSIHLP score** populates in real time
- The **Dispatch Monitor** shows a responder being assigned (e.g., *Deepak Verma — Security* or *Meera Deshmukh — Medical*)
- A simulated **voice dispatch call** is placed to the relevant authority
- The incident card moves through: `DETECTED → DISPATCHING → EN ROUTE`

### Step 3 — Experience the Guest View
1. Open the **Guest Portal** at `http://localhost:5174`
2. Log in with Room `100` / Last Name `Guest`
3. As the incident unfolds on the operator side, watch the **emergency alert banner** appear on the guest's screen with recommended actions

### Step 4 — Test the Digital Concierge
1. From the Guest Portal, navigate to **Services**
2. Submit a **Room Service** request
3. Switch back to the Operator Dashboard → **Services Tab**
4. Watch the request appear **instantly** (Socket.io, zero refresh)

---

## Project Structure

```
sentinel/
├── backend/
│   ├── src/
│   │   ├── config/          # DB connection, environment setup
│   │   ├── controllers/     # Route handler logic
│   │   ├── models/          # Mongoose schemas (Incident, Personnel, Guest, Service)
│   │   ├── routes/          # Express API routes
│   │   ├── services/
│   │   │   ├── aiService.js         # Gemini Vision + Text integration
│   │   │   ├── dispatchService.js   # Auto-Protect dispatch logic
│   │   │   ├── priorityEngine.js    # VSIHLP scoring engine
│   │   │   └── voiceService.js      # Authority voice dispatch
│   │   ├── sockets/         # Socket.io event handlers and room management
│   │   └── utils/           # Helpers, rate-limit manager, logger
│   ├── .env
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── CCTVMonitor/         # Live feed view + scan controls
│   │   │   ├── DispatchMonitor/     # Real-time dispatch status
│   │   │   ├── IncidentList/        # Incident lifecycle tracker
│   │   │   ├── PersonnelRoster/     # Staff availability + zone map
│   │   │   └── ServicesPanel/       # Guest service request management
│   │   ├── hooks/           # useSocket, useIncidents, useDispatch
│   │   ├── services/        # API client (Axios)
│   │   └── App.jsx
│   └── package.json
│
├── guest-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AlertBanner/         # Real-time emergency alert
│   │   │   ├── ZoneSelector/        # Guest location self-reporting
│   │   │   ├── ServiceRequest/      # Digital concierge UI
│   │   │   └── EmergencyInfo/       # Floor plans, protocols, guides
│   │   ├── hooks/           # useSocket, useAlerts, useGuestSession
│   │   ├── services/        # API client (Axios)
│   │   └── App.jsx
│   └── package.json
│
└── README.md
```

---

## Deployment

### Backend (Render)

1. Push the `/backend` directory to a GitHub repository
2. Create a new **Web Service** on Render
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add all environment variables from `.env` in the Render dashboard
6. Enable **"Always On"** to prevent cold starts during emergencies

### Frontends (Vercel)

For each frontend (`frontend-operator`, `frontend-guest`):

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy operator dashboard
cd frontend-operator
vercel --prod

# Deploy guest portal
cd frontend-guest
vercel --prod
```

Set `VITE_API_BASE_URL` to your Render backend URL in Vercel's environment variable settings.

### MongoDB Atlas

1. Create a free M0 cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Whitelist Render's outbound IPs (or use `0.0.0.0/0` for development)
3. Create a database user and copy the connection string to `MONGODB_URI`

---

## API Reference

### Incidents

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| GET    | `/api/incidents`          | Fetch all incidents (paginated)    |
| GET    | `/api/incidents/:id`      | Fetch a single incident by ID      |
| POST   | `/api/incidents`          | Create a new incident (manual)     |
| PATCH  | `/api/incidents/:id`      | Update incident status             |
| DELETE | `/api/incidents/:id`      | Archive/delete an incident         |

### Personnel

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| GET    | `/api/personnel`          | List all on-duty personnel         |
| GET    | `/api/personnel/:id`      | Get individual staff record        |
| PATCH  | `/api/personnel/:id/zone` | Update staff current zone          |

### Guests

| Method | Endpoint                   | Description                        |
|--------|----------------------------|------------------------------------|
| POST   | `/api/guests/login`        | Authenticate guest by room + name  |
| GET    | `/api/guests/:id`          | Get guest session data             |
| PATCH  | `/api/guests/:id/zone`     | Update guest's current zone        |

### Services

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| GET    | `/api/services`           | List all pending service requests  |
| POST   | `/api/services`           | Submit a new service request       |
| PATCH  | `/api/services/:id`       | Update request status              |

### AI Scan

| Method | Endpoint                  | Description                        |
|--------|---------------------------|------------------------------------|
| POST   | `/api/ai/scan`            | Trigger a manual CCTV analysis     |
| GET    | `/api/ai/status`          | Get current scan + rate-limit status|

---

## Contributing

Sentinel is designed to be extended. Community contributions are welcome.

```bash
# Fork the repository and create your branch
git checkout -b feature/your-feature-name

# Make your changes and commit
git commit -m "feat: add your feature description"

# Push and open a Pull Request
git push origin feature/your-feature-name
```

**Branch naming convention:**
- `feature/` — New capabilities
- `fix/` — Bug fixes
- `docs/` — Documentation updates
- `refactor/` — Code improvements without behavior change

Please ensure all PRs include updated tests and documentation.

---

## License

This project is licensed under the **MIT License**. See [LICENSE](./LICENSE) for full terms.

---

<div align="center">

**Sentinel** — *Every second counts. Every guest matters.*


</div>
