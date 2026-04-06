// ============================================================
// SERVER — Main Entry Point
// ============================================================
// Pipeline: Input → AI Analysis → Scoring Engine → Hard Overrides → Dashboard
// Feeds:    Weather + Earthquake + Sensor → Auto-Incident Generation
// Loop:     Re-rank all active incidents every 30 seconds
// ============================================================

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import { analyzeIncident, generateSummaryFromCV } from "./ai.js";
import { computeFinalPriority } from "./scoring.js";
import { startWeatherFeed, getCurrentWeather, checkWeatherThresholds } from "./feeds/weatherFeed.js";
import { startEarthquakeFeed, getSeismicStatus, getLatestQuakes, checkEarthquakeThresholds } from "./feeds/earthquakeFeed.js";
import { startSensorSimulator, stopSensorSimulator, isSensorSimulatorRunning, checkSensorEvents, getSensorState } from "./feeds/sensorSimulator.js";
import { runCCTVAnalysis, setCCTVScenario } from "./feeds/cctvAnalyzer.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// ── State ──────────────────────────────────────────────────
let activeIncidents = [];
let autoFeedEnabled = false;

// ── Helpers ────────────────────────────────────────────────
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 6);
}

function getPriorityBand(score) {
  if (score >= 8.5) return "Extreme";
  if (score >= 6.5) return "High";
  if (score >= 4.0) return "Medium";
  return "Low";
}

/**
 * Full incident processing pipeline.
 * 1. AI interprets the description
 * 2. Scoring engine computes dual-layer priority
 * 3. Hard overrides applied
 * 4. Returns the complete incident object
 */
async function processIncident(description, location, source = "manual") {
  // Gather live environmental context for AI
  const environmentContext = {
    weather: getCurrentWeather(),
    seismic: getSeismicStatus(),
  };

  // 1. AI Analysis
  const aiResult = await analyzeIncident(description, environmentContext);

  // 2. Build incident object for scoring
  const incidentForScoring = {
    hazardType: aiResult.hazardType,
    isCompound: aiResult.isCompound,
    compoundTypes: aiResult.compoundTypes,
    liveFactors: aiResult.liveFactors,
    rawDescription: description,
    sensorSignals: aiResult.sensorSignals || {},
  };

  // 3. Scoring engine (deterministic)
  const scoring = computeFinalPriority(incidentForScoring);

  // 4. Assemble final incident
  const incident = {
    id: genId(),
    timestamp: new Date().toISOString(),
    status: "Active",
    source, // "manual" | "weather_feed" | "earthquake_feed" | "sensor_iot" | "sensor_cctv"

    // Classification
    hazardType: aiResult.hazardType,
    isCompound: aiResult.isCompound,
    compoundTypes: aiResult.compoundTypes || [],

    // Description
    rawDescription: description,
    location: location || "Taj Hotel Mumbai - General",

    // Scoring
    ...scoring, // baselineRisk, liveScore, rawPriority, finalPriority, priorityBand, overrideApplied, overrideReason, liveFactorBreakdown

    // AI outputs
    confidence: aiResult.confidence,
    explanation: aiResult.explanation,
    recommendedActions: aiResult.recommendedActions,
    sensorSignals: aiResult.sensorSignals || {},
  };

  return incident;
}

// ── API Routes ─────────────────────────────────────────────

// Simulate / manual report
app.post("/api/incidents/simulate", async (req, res) => {
  const { description, location } = req.body;
  if (!description) return res.status(400).json({ error: "Missing description" });

  try {
    console.log(`[Pipeline] Processing: "${description.substring(0, 60)}..."`);
    const incident = await processIncident(description, location, "manual");
    activeIncidents.push(incident);
    broadcastIncidents();
    res.json(incident);
  } catch (err) {
    console.error("[Pipeline] Error:", err.message);
    res.status(500).json({ error: "Failed to process incident" });
  }
});

// Get all active incidents
app.get("/api/incidents", (req, res) => {
  const sorted = [...activeIncidents].sort((a, b) => b.finalPriority - a.finalPriority);
  res.json(sorted);
});

// Get live environment state
app.get("/api/environment", (req, res) => {
  res.json({
    weather: getCurrentWeather(),
    seismic: getSeismicStatus(),
    quakes: getLatestQuakes(),
    sensorState: getSensorState(),
    autoFeedEnabled,
    sensorSimulatorRunning: isSensorSimulatorRunning(),
  });
});

// Toggle auto-feed
app.post("/api/feeds/toggle", (req, res) => {
  autoFeedEnabled = !autoFeedEnabled;
  if (autoFeedEnabled) {
    startSensorSimulator();
  } else {
    stopSensorSimulator();
  }
  console.log(`[Feeds] Auto-feed ${autoFeedEnabled ? "ENABLED" : "DISABLED"}`);
  io.emit("feed_status", { autoFeedEnabled, sensorSimulatorRunning: isSensorSimulatorRunning() });
  res.json({ autoFeedEnabled });
});

// CCTV Scenario selection and trigger
app.post("/api/cctv/scenario", (req, res) => {
  const { scenario } = req.body;
  setCCTVScenario(scenario);
  res.json({ success: true, scenario });
});

// Hybrid CCTV Pipeline Webhook (from Python tracker)
app.post("/api/cctv/stream_event", async (req, res) => {
  const { source, location, description, sensorSignals } = req.body;
  
  if (!description) return res.status(400).json({ error: "Missing CV state description" });

  try {
    console.log(`[CCTV Hybrid] Received CV Tracker Event: "${description}"`);
    
    // 1. Generate explanation/factors from AI purely using CV State
    const cvState = { location, description, sensorSignals };
    const environmentContext = { weather: getCurrentWeather(), seismic: getSeismicStatus() };
    const aiResult = await generateSummaryFromCV(cvState, environmentContext);

    // 2. Format incident for Scoring Engine
    const incidentForScoring = {
      hazardType: aiResult.hazardType,
      isCompound: aiResult.isCompound,
      compoundTypes: aiResult.compoundTypes,
      liveFactors: aiResult.liveFactors,
      rawDescription: description,
      sensorSignals: sensorSignals || {},
    };

    // 3. Score Incident deterministically
    const scoring = computeFinalPriority(incidentForScoring);

    // 4. Build Record
    const incident = {
      id: genId(),
      timestamp: new Date().toISOString(),
      status: "Active",
      source: source || "sensor_cctv",
      hazardType: aiResult.hazardType,
      isCompound: aiResult.isCompound,
      compoundTypes: aiResult.compoundTypes || [],
      rawDescription: description,
      location: location || "Main Lobby Camera A",
      ...scoring,
      confidence: aiResult.confidence,
      explanation: aiResult.explanation,
      recommendedActions: aiResult.recommendedActions,
      sensorSignals: sensorSignals || {},
    };

    // 5. Trigger Broadcast
    activeIncidents.push(incident);
    broadcastIncidents();
    
    res.json(incident);
  } catch (err) {
    console.error("[CCTV Hybrid] Error processing stream event:", err.message);
    res.status(500).json({ error: "Failed to process CCTV steam event" });
  }
});

app.post("/api/cctv/trigger", async (req, res) => {
  try {
    const environmentContext = {
      weather: getCurrentWeather(),
      seismic: getSeismicStatus(),
    };
    const cctvEv = await runCCTVAnalysis(environmentContext);
    
    if (cctvEv && cctvEv.aiResult) {
      // Instead of running AI again, we directly score it
      const aiResult = cctvEv.aiResult;
      const incidentForScoring = {
        hazardType: aiResult.hazardType,
        isCompound: aiResult.isCompound,
        compoundTypes: aiResult.compoundTypes,
        liveFactors: aiResult.liveFactors,
        rawDescription: cctvEv.description,
        sensorSignals: cctvEv.sensorSignals || {},
      };

      const scoring = computeFinalPriority(incidentForScoring);

      const incident = {
        id: genId(),
        timestamp: new Date().toISOString(),
        status: "Active",
        source: cctvEv.source,
        hazardType: aiResult.hazardType,
        isCompound: aiResult.isCompound,
        compoundTypes: aiResult.compoundTypes || [],
        rawDescription: cctvEv.description,
        location: cctvEv.location,
        ...scoring,
        confidence: aiResult.confidence,
        explanation: aiResult.explanation,
        recommendedActions: aiResult.recommendedActions,
        sensorSignals: cctvEv.sensorSignals || {},
      };

      activeIncidents.push(incident);
      broadcastIncidents();
      res.json(incident);
    } else {
      res.json({ message: "No incident detected by CCTV" });
    }
  } catch (err) {
    console.error("[CCTV] Trigger failed:", err.message);
    res.status(500).json({ error: "CCTV analysis failed" });
  }
});

// ── WebSocket ──────────────────────────────────────────────

function broadcastIncidents() {
  const sorted = [...activeIncidents].sort((a, b) => b.finalPriority - a.finalPriority);
  io.emit("incidents_update", sorted);
}

io.on("connection", (socket) => {
  console.log("[WS] Dashboard connected:", socket.id);
  broadcastIncidents();
  socket.emit("environment_update", {
    weather: getCurrentWeather(),
    seismic: getSeismicStatus(),
  });
  socket.emit("feed_status", { autoFeedEnabled, sensorSimulatorRunning: isSensorSimulatorRunning() });

  socket.on("resolve_incident", (id) => {
    activeIncidents = activeIncidents.map((inc) =>
      inc.id === id ? { ...inc, status: "Resolved" } : inc
    );
    broadcastIncidents();
  });

  socket.on("disconnect", () => {
    console.log("[WS] Dashboard disconnected:", socket.id);
  });
});

// ── Auto-Feed & Re-Ranking Loop (30 seconds) ──────────────

const RERANK_INTERVAL_MS = 30_000;

async function autoFeedAndRerank() {
  // 1. Check automated feeds for new incidents
  if (autoFeedEnabled) {
    const weatherIncidents = checkWeatherThresholds();
    const earthquakeIncidents = checkEarthquakeThresholds();
    const sensorIncidents = checkSensorEvents();

    const autoIncidents = [...weatherIncidents, ...earthquakeIncidents, ...sensorIncidents];

    for (const raw of autoIncidents) {
      try {
        console.log(`[AutoFeed] Processing auto-incident from ${raw.source}: "${raw.description.substring(0, 50)}..."`);
        const incident = await processIncident(raw.description, raw.location, raw.source);
        // Merge any raw sensor signals the feed already had
        incident.sensorSignals = { ...incident.sensorSignals, ...raw.sensorSignals };
        activeIncidents.push(incident);
      } catch (err) {
        console.warn(`[AutoFeed] Failed to process: ${err.message}`);
      }
    }
  }

  // 2. Broadcast updated environment
  io.emit("environment_update", {
    weather: getCurrentWeather(),
    seismic: getSeismicStatus(),
  });

  // 3. Re-rank and broadcast
  broadcastIncidents();
}

// ── Boot ───────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚨 Crisis Response Backend running on port ${PORT}`);
  console.log("   Pipeline: AI → Scoring → Hard Overrides → Dashboard");
  console.log("   Feeds:    Weather (Open-Meteo) + Earthquake (USGS) + IoT Simulator\n");

  // Start automated data feeds
  startWeatherFeed();
  startEarthquakeFeed();

  // Start the re-ranking loop
  setInterval(autoFeedAndRerank, RERANK_INTERVAL_MS);
});
