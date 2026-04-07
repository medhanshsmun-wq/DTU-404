// ============================================================
// SERVER — Main Entry Point (Optimized)
// ============================================================
// Pipeline: Input → AI/Deterministic → Scoring → Hard Overrides → Dashboard
// CCTV:     Deterministic classify → Score → Broadcast → Async LLM enrich
// Feeds:    Weather + Earthquake + Sensor → Auto-Incident (parallel)
// Loop:     Re-rank all active incidents every 30 seconds
// ============================================================

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import { analyzeIncident, generateSummaryFromCV, classifyFromCVSignals } from "./ai.js";
import { computeFinalPriority } from "./scoring.js";
import { startWeatherFeed, getCurrentWeather, checkWeatherThresholds } from "./feeds/weatherFeed.js";
import { startEarthquakeFeed, getSeismicStatus, getLatestQuakes, checkEarthquakeThresholds } from "./feeds/earthquakeFeed.js";
import { startSensorSimulator, stopSensorSimulator, isSensorSimulatorRunning, checkSensorEvents, getSensorState } from "./feeds/sensorSimulator.js";
import { runCCTVAnalysis, setCCTVScenario } from "./feeds/cctvAnalyzer.js";
import { llmCache, cvCache } from "./cache.js";

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
 * Generate a dedup key for an incident based on source + location + hazard.
 */
function dedupKey(source, location, hazardType) {
  return `${source}::${location}::${hazardType}`.toLowerCase();
}

/**
 * Find an existing active incident matching the dedup key.
 */
function findExistingIncident(key) {
  return activeIncidents.find(
    (inc) => inc.status === "Active" && inc._dedupKey === key
  );
}

/**
 * Full incident processing pipeline (for manual/text incidents).
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
  const key = dedupKey(source, location || "general", aiResult.hazardType);
  const incident = {
    id: genId(),
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: "Active",
    source, // "manual" | "weather_feed" | "earthquake_feed" | "sensor_iot" | "sensor_cctv"
    _dedupKey: key,

    // Classification
    hazardType: aiResult.hazardType,
    isCompound: aiResult.isCompound,
    compoundTypes: aiResult.compoundTypes || [],

    // Description
    rawDescription: description,
    location: location || "Taj Hotel Mumbai - General",

    // Scoring
    ...scoring,

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

// Cache stats endpoint
app.get("/api/cache/stats", (req, res) => {
  res.json({
    llmCache: llmCache.stats(),
    cvCache: cvCache.stats(),
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

// ── Hybrid CCTV Pipeline Webhook (OPTIMIZED) ──────────────
// Hot-path: deterministic classify → score → broadcast (~5ms)
// Background: async LLM enrichment → update incident → re-broadcast
app.post("/api/cctv/stream_event", async (req, res) => {
  const { source, location, description, sensorSignals } = req.body;

  if (!description) return res.status(400).json({ error: "Missing CV state description" });

  const startTime = Date.now();

  try {
    // 1. DETERMINISTIC classification (no LLM, ~1ms)
    const classification = classifyFromCVSignals(sensorSignals || {}, description);

    // 2. Score deterministically
    const incidentForScoring = {
      hazardType: classification.hazardType,
      isCompound: classification.isCompound,
      compoundTypes: classification.compoundTypes,
      liveFactors: classification.liveFactors,
      rawDescription: description,
      sensorSignals: sensorSignals || {},
    };

    const scoring = computeFinalPriority(incidentForScoring);

    // 3. Deduplication — update existing or create new
    const key = dedupKey(source || "sensor_cctv", location || "Main Lobby Camera A", classification.hazardType);
    const existing = findExistingIncident(key);

    let incident;
    if (existing) {
      // UPDATE existing incident in-place
      existing.lastUpdated = new Date().toISOString();
      existing.rawDescription = description;
      existing.sensorSignals = sensorSignals || {};
      existing.hazardType = classification.hazardType;
      existing.isCompound = classification.isCompound;
      existing.compoundTypes = classification.compoundTypes || [];
      existing.explanation = classification.explanation;
      existing.recommendedActions = classification.recommendedActions;
      existing.confidence = classification.confidence;
      Object.assign(existing, scoring);
      incident = existing;
      console.log(`[CCTV Fast] Updated existing incident ${existing.id} in ${Date.now() - startTime}ms`);
    } else {
      // CREATE new incident
      incident = {
        id: genId(),
        timestamp: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        status: "Active",
        source: source || "sensor_cctv",
        _dedupKey: key,
        hazardType: classification.hazardType,
        isCompound: classification.isCompound,
        compoundTypes: classification.compoundTypes || [],
        rawDescription: description,
        location: location || "Main Lobby Camera A",
        ...scoring,
        confidence: classification.confidence,
        explanation: classification.explanation,
        recommendedActions: classification.recommendedActions,
        sensorSignals: sensorSignals || {},
      };
      activeIncidents.push(incident);
      console.log(`[CCTV Fast] New incident ${incident.id} created in ${Date.now() - startTime}ms`);
    }

    // 4. Broadcast immediately (dashboard gets update in ~5ms)
    broadcastIncidents();

    // 5. Respond to Python pipeline immediately
    res.json({
      id: incident.id,
      priorityBand: incident.priorityBand,
      finalPriority: incident.finalPriority,
      latencyMs: Date.now() - startTime,
      enrichmentPending: true,
    });

    // 6. ASYNC LLM enrichment (fire-and-forget, non-blocking)
    const cvState = { location, description, sensorSignals };
    const environmentContext = { weather: getCurrentWeather(), seismic: getSeismicStatus() };

    generateSummaryFromCV(cvState, environmentContext)
      .then((aiEnriched) => {
        // Merge LLM enrichment into the existing incident
        incident.explanation = aiEnriched.explanation || incident.explanation;
        incident.recommendedActions = aiEnriched.recommendedActions || incident.recommendedActions;
        incident.confidence = aiEnriched.confidence || incident.confidence;
        incident._enrichedAt = new Date().toISOString();

        // Re-broadcast with enriched data
        broadcastIncidents();
        console.log(`[CCTV Enrich] LLM enrichment merged for ${incident.id} (+${Date.now() - startTime}ms total)`);
      })
      .catch((err) => {
        console.warn(`[CCTV Enrich] LLM enrichment failed (non-critical): ${err.message}`);
        // Incident is already on dashboard with deterministic data — this is fine
      });

  } catch (err) {
    console.error("[CCTV Fast] Error:", err.message);
    res.status(500).json({ error: "Failed to process CCTV event" });
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
        lastUpdated: new Date().toISOString(),
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

// Update incident (PATCH)
app.patch("/api/incidents/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const incident = activeIncidents.find((inc) => inc.id === id);
  if (!incident) return res.status(404).json({ error: "Incident not found" });

  Object.assign(incident, updates, { lastUpdated: new Date().toISOString() });
  broadcastIncidents();
  res.json(incident);
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
      inc.id === id ? { ...inc, status: "Resolved", lastUpdated: new Date().toISOString() } : inc
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
  // 1. Check automated feeds for new incidents (PARALLEL)
  if (autoFeedEnabled) {
    const weatherIncidents = checkWeatherThresholds();
    const earthquakeIncidents = checkEarthquakeThresholds();
    const sensorIncidents = checkSensorEvents();

    const autoIncidents = [...weatherIncidents, ...earthquakeIncidents, ...sensorIncidents];

    if (autoIncidents.length > 0) {
      // Process all auto-incidents in parallel
      const results = await Promise.allSettled(
        autoIncidents.map(async (raw) => {
          console.log(`[AutoFeed] Processing auto-incident from ${raw.source}: "${raw.description.substring(0, 50)}..."`);
          const incident = await processIncident(raw.description, raw.location, raw.source);
          incident.sensorSignals = { ...incident.sensorSignals, ...raw.sensorSignals };
          return incident;
        })
      );

      for (const result of results) {
        if (result.status === "fulfilled") {
          activeIncidents.push(result.value);
        } else {
          console.warn(`[AutoFeed] Failed to process: ${result.reason?.message}`);
        }
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
  console.log("   Pipeline: Deterministic CV → Scoring → Hard Overrides → Dashboard");
  console.log("   CCTV:     ~5ms hot-path + async LLM enrichment");
  console.log("   Feeds:    Weather (Open-Meteo) + Earthquake (USGS) + IoT Simulator\n");

  // Start automated data feeds
  startWeatherFeed();
  startEarthquakeFeed();

  // Start the re-ranking loop
  setInterval(autoFeedAndRerank, RERANK_INTERVAL_MS);
});
