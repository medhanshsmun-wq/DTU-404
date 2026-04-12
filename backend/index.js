// ============================================================
// SERVER — Main Entry Point (Unified Priority Engine)
// ============================================================
// Pipeline: Input → AI/Deterministic → Unified Scoring → Overrides → Dashboard
// CCTV:     Deterministic classify → Score → Broadcast → Async LLM enrich (gated)
// Feeds:    Weather + Earthquake + Sensor → Auto-Incident (parallel)
// Rerank:   Variable cadence per incident type (2-30 seconds)
// ============================================================

import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import dotenv from "dotenv";

import { analyzeIncident, generateSummaryFromCV, classifyFromCVSignals } from "./ai.js";
import {
  shouldCallLLMForCVEnrichment,
  recordSuccessfulCctvLlmEnrichment,
} from "./cctvEnrichmentPolicy.js";
import { scoreIncident, detectDomain, computeCompoundModifier, computeConfidence } from "./unifiedScoring.js";
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
 * 1. AI interprets the description (returns V/S/I/H/L/P)
 * 2. Unified scoring engine computes priority
 * 3. Hard overrides + compound modifier applied
 * 4. Returns the complete incident object
 */
async function processIncident(description, location, source = "manual") {
  // Gather live environmental context for AI
  const environmentContext = {
    weather: getCurrentWeather(),
    seismic: getSeismicStatus(),
  };

  // 1. AI Analysis — returns V/S/I/H/L/P factors
  const aiResult = await analyzeIncident(description, environmentContext);

  // 2. Build incident object for scoring
  const incidentForScoring = {
    hazardType: aiResult.hazardType,
    isCompound: aiResult.isCompound,
    compoundTypes: aiResult.compoundTypes,
    liveFactors: aiResult.liveFactors,
    rawDescription: description,
    sensorSignals: aiResult.sensorSignals || {},
    source,
    location: location || "Taj Hotel Mumbai - General",
    confidence: aiResult.confidence,
  };

  // 3. Unified scoring engine (deterministic + overrides + compound)
  const scoring = scoreIncident(incidentForScoring, activeIncidents);

  // 4. Assemble final incident
  const key = dedupKey(source, location || "general", aiResult.hazardType);
  const incident = {
    id: genId(),
    timestamp: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    status: "Active",
    source,
    _dedupKey: key,

    // Classification
    hazardType: aiResult.hazardType,
    isCompound: aiResult.isCompound,
    compoundTypes: aiResult.compoundTypes || [],

    // Description
    rawDescription: description,
    location: location || "Taj Hotel Mumbai - General",

    // Unified Scoring (canonical output)
    ...scoring,

    // AI outputs
    aiConfidence: aiResult.confidence,
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

// ── Hybrid CCTV Pipeline Webhook (Unified Engine) ─────────
// Hot-path: deterministic classify → unified score → broadcast (~5ms)
// Background: async LLM enrichment → update incident → re-broadcast
app.post("/api/cctv/stream_event", async (req, res) => {
  const { source, location, description, sensorSignals, ml, forceLlmEnrich } = req.body;

  if (!description) return res.status(400).json({ error: "Missing CV state description" });

  const startTime = Date.now();

  try {
    // 1. DETERMINISTIC classification — V/S/I/H/L/P (~1ms)
    // Optional `ml` from edge model: { confidence, topLabels?, version? } — used for LLM gating only here
    const classification = classifyFromCVSignals(sensorSignals || {}, description);
    if (ml && typeof ml.confidence === "number") {
      classification.confidence = Math.max(classification.confidence, ml.confidence);
    }

    // 2. Build incident for unified scoring
    const incidentForScoring = {
      hazardType: classification.hazardType,
      isCompound: classification.isCompound,
      compoundTypes: classification.compoundTypes,
      liveFactors: classification.liveFactors,
      rawDescription: description,
      sensorSignals: sensorSignals || {},
      source: source || "sensor_cctv",
      location: location || "Main Lobby Camera A",
      confidence: classification.confidence,
    };

    // 3. Unified scoring (with compound modifier from active incidents)
    const scoring = scoreIncident(incidentForScoring, activeIncidents);

    // 4. Deduplication — update existing or create new
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
      existing.aiConfidence = classification.confidence;
      existing.mlHints = ml || existing.mlHints;
      Object.assign(existing, scoring);
      incident = existing;
      console.log(`[CCTV Fast] Updated ${existing.id} | ${scoring.tier} (${scoring.score}) | ${Date.now() - startTime}ms`);
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
        aiConfidence: classification.confidence,
        explanation: classification.explanation,
        recommendedActions: classification.recommendedActions,
        sensorSignals: sensorSignals || {},
        mlHints: ml || null,
      };
      activeIncidents.push(incident);
      console.log(`[CCTV Fast] New ${incident.id} | ${scoring.tier} (${scoring.score}) | V=${scoring.factors.V} S=${scoring.factors.S} I=${scoring.factors.I} | ${Date.now() - startTime}ms`);
    }

    // 5. Broadcast immediately (dashboard gets update in ~5ms)
    broadcastIncidents();

    const enrichDecision = shouldCallLLMForCVEnrichment({
      dedupKey: key,
      tier: scoring.tier,
      isCompound: classification.isCompound,
      classificationConfidence: classification.confidence,
      mlConfidence: ml && typeof ml.confidence === "number" ? ml.confidence : undefined,
      force: Boolean(forceLlmEnrich),
    });

    // 6. Respond to Python pipeline immediately
    res.json({
      id: incident.id,
      tier: incident.tier,
      priorityBand: incident.tier,
      score: incident.score,
      finalPriority: incident.finalPriority,
      factors: incident.factors,
      latencyMs: Date.now() - startTime,
      enrichmentPending: enrichDecision.call,
      enrichmentPolicy: enrichDecision.reason,
    });

    // 7. ASYNC LLM enrichment (gated — autonomous CV path avoids constant API use)
    if (enrichDecision.call) {
      const cvState = { location, description, sensorSignals };
      const environmentContext = { weather: getCurrentWeather(), seismic: getSeismicStatus() };

      generateSummaryFromCV(cvState, environmentContext)
        .then((aiEnriched) => {
          recordSuccessfulCctvLlmEnrichment(key);
          // Merge LLM enrichment into the existing incident
          incident.explanation = aiEnriched.explanation || incident.explanation;
          incident.recommendedActions = aiEnriched.recommendedActions || incident.recommendedActions;
          incident.aiConfidence = aiEnriched.confidence || incident.aiConfidence;
          incident._enrichedAt = new Date().toISOString();

          // Re-score with LLM factors if they're better
          if (aiEnriched.liveFactors) {
            const enrichedScoring = scoreIncident({
              ...incidentForScoring,
              liveFactors: aiEnriched.liveFactors,
              confidence: aiEnriched.confidence,
            }, activeIncidents);

            // Take the higher score (deterministic vs LLM)
            if (enrichedScoring.score > incident.score) {
              Object.assign(incident, enrichedScoring);
            }
          }

          // Re-broadcast with enriched data
          broadcastIncidents();
          console.log(`[CCTV Enrich] LLM merged for ${incident.id} (+${Date.now() - startTime}ms total)`);
        })
        .catch((err) => {
          console.warn(`[CCTV Enrich] LLM enrichment failed (non-critical): ${err.message}`);
        });
    } else {
      console.log(`[CCTV Enrich] Skipped LLM (${enrichDecision.reason}) for ${incident.id}`);
    }

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
        source: cctvEv.source,
        location: cctvEv.location,
        confidence: aiResult.confidence,
      };

      const scoring = scoreIncident(incidentForScoring, activeIncidents);

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
        aiConfidence: aiResult.confidence,
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

// ── Continuous Reranking Loop ──────────────────────────────
// The spec mandates variable reranking cadence per incident type.
// We use a fast base loop (5 seconds) and rerank incidents whose
// rerankAfterSec has elapsed since their last rerank.

const BASE_RERANK_INTERVAL_MS = 5_000;
const AUTO_FEED_CHECK_INTERVAL_MS = 30_000;
let lastAutoFeedCheck = 0;

async function continuousRerankLoop() {
  const now = Date.now();

  // 1. Check auto-feeds every 30s
  if (autoFeedEnabled && (now - lastAutoFeedCheck > AUTO_FEED_CHECK_INTERVAL_MS)) {
    lastAutoFeedCheck = now;

    const weatherIncidents = checkWeatherThresholds();
    const earthquakeIncidents = checkEarthquakeThresholds();
    const sensorIncidents = checkSensorEvents();

    const autoIncidents = [...weatherIncidents, ...earthquakeIncidents, ...sensorIncidents];

    if (autoIncidents.length > 0) {
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

  // 2. Rerank active incidents that are due for rescoring
  let anyChanged = false;
  for (const incident of activeIncidents) {
    if (incident.status !== "Active") continue;

    const rerankSec = incident.rerankAfterSec || 10;
    const lastRanked = incident._lastRerankedAt || new Date(incident.timestamp).getTime();
    const elapsed = (now - lastRanked) / 1000;

    if (elapsed >= rerankSec) {
      // Re-score with current context
      const newScoring = scoreIncident({
        hazardType: incident.hazardType,
        isCompound: incident.isCompound,
        compoundTypes: incident.compoundTypes,
        liveFactors: incident.liveFactors || incident.factors,
        rawDescription: incident.rawDescription,
        sensorSignals: incident.sensorSignals || {},
        source: incident.source,
        location: incident.location,
        confidence: incident.aiConfidence,
      }, activeIncidents);

      // Update scoring fields
      const oldScore = incident.score;
      Object.assign(incident, newScoring);
      incident._lastRerankedAt = now;

      if (Math.abs(oldScore - newScoring.score) > 0.1) {
        anyChanged = true;
      }
    }
  }

  // 3. Broadcast updated environment
  io.emit("environment_update", {
    weather: getCurrentWeather(),
    seismic: getSeismicStatus(),
  });

  // 4. Re-rank and broadcast if anything changed
  if (anyChanged) {
    broadcastIncidents();
  }
}

// ── Boot ───────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🚨 Crisis Response Backend running on port ${PORT}`);
  console.log("   Engine:   Unified Priority Engine (V/S/I/H/L/P)");
  console.log("   Pipeline: Deterministic CV → Unified Score → Overrides → Dashboard");
  console.log("   CCTV:     ~5ms hot-path + async LLM enrichment");
  console.log("   Rerank:   Continuous (2-30s per incident type)");
  console.log("   Feeds:    Weather (Open-Meteo) + Earthquake (USGS) + IoT Simulator\n");

  // Start automated data feeds
  startWeatherFeed();
  startEarthquakeFeed();

  // Start the continuous reranking loop
  setInterval(continuousRerankLoop, BASE_RERANK_INTERVAL_MS);
});
