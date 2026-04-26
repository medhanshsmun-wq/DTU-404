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

import { analyzeIncident, generateSummaryFromCV, classifyFromCVSignals, analyzeMedicalCCTVImage, analyzeSecurityFrame } from "./ai.js";
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
import {
  dispatchIncident, acknowledgeDispatch, resolveDispatch,
  getDispatchLog, getActiveDispatches, getDispatchByIncidentId, getAuthorities,
  getCallLog, getPersonnelDeployments, getPersonnelRoster, getVoiceScripts, initDispatchData
} from "./dispatchEngine.js";
import {
  authenticateGuest, validateSession, getGuestProfile,
  updateGuestLocation, getMovementHistory, getAllZones,
  createServiceRequest, getServiceRequests, getServiceTypes,
  getEmergencyPlans, getFloorPlans, getGuestAlerts,
  getActiveGuestSessions, initGuestData,
  getAllServiceRequestsAdmin, updateServiceRequestStatusAdmin
} from "./guestService.js";
import store from "./store.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

// Guest namespace
const guestIo = io.of("/guest");

// ── State ──────────────────────────────────────────────────
let activeIncidents = [];
let autoFeedEnabled = false;

function initIndexData() {
  activeIncidents = store.loadData('incidents', []);
  autoFeedEnabled = store.loadData('autoFeedEnabled', false);
}

// Save helpers
function saveIncidents() {
  store.saveData('incidents', activeIncidents);
}

function saveSettings() {
  store.saveData('autoFeedEnabled', autoFeedEnabled);
}

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

/**
 * After an incident is scored and stored, dispatch it to authorities.
 */
function autoDispatch(incident) {
  const dispatch = dispatchIncident(incident);
  io.emit("dispatch_update", dispatch);
  // Notify guest namespace of zone-relevant alerts
  guestIo.emit("alert_update", {
    id: incident.id,
    type: incident.hazardType,
    tier: incident.tier,
    location: incident.location,
    description: incident.rawDescription,
    timestamp: incident.timestamp,
    score: incident.score ?? incident.finalPriority ?? 0,
  });
  return dispatch;
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
    autoDispatch(incident);
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

// ── Medical CCTV Gemini Verification ─────────
app.post("/api/cctv/verify_medical", async (req, res) => {
  const { frameBase64, mimeType } = req.body;
  if (!frameBase64) return res.status(400).json({ error: "Missing frameBase64" });
  
  try {
    const result = await analyzeMedicalCCTVImage(frameBase64, mimeType || "image/jpeg");
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Security Scanner API ───────────────
app.post("/api/security/scan", async (req, res) => {
  const { frameBase64, mimeType } = req.body;
  if (!frameBase64) return res.status(400).json({ error: "Missing frameBase64" });
  
  try {
    const result = await analyzeSecurityFrame(frameBase64, mimeType || "image/jpeg");
    
    // If threat is high, automatically create a real system incident
    if (result.threatLevel >= 7) {
      console.log(`[Security Scanner] 🚨 High threat detected (${result.threatLevel}/10). Creating system incident.`);
      const incident = await processIncident(
        `[SECURITY SCANNER ALERT] ${result.fullReport}`, 
        "Security Console Live Feed",
        "security_scanner"
      );
      
      // Merge vision findings into incident
      incident.sensorSignals = {
        ...incident.sensorSignals,
        threatLevel: result.threatLevel,
        weapons: result.weaponsDetected
      };
      
      activeIncidents.push(incident);
      broadcastIncidents();
      autoDispatch(incident);
    }
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Hybrid CCTV Pipeline Webhook (Unified Engine) ─────────
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
      autoDispatch(incident);
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
      autoDispatch(incident);
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

// ── Dispatch Routes ───────────────────────────────────────

app.get("/api/dispatch/log", (req, res) => {
  res.json(getDispatchLog(parseInt(req.query.limit) || 50));
});

app.get("/api/dispatch/active", (req, res) => {
  res.json(getActiveDispatches());
});

app.get("/api/dispatch/authorities", (req, res) => {
  res.json(getAuthorities());
});

app.post("/api/dispatch/:incidentId/acknowledge", (req, res) => {
  const { incidentId } = req.params;
  const { authorityId } = req.body;
  const result = acknowledgeDispatch(incidentId, authorityId);
  if (!result) return res.status(404).json({ error: "Dispatch not found" });
  io.emit("dispatch_update", result);
  res.json(result);
});

app.post("/api/dispatch/:incidentId/resolve", (req, res) => {
  const { incidentId } = req.params;
  const result = resolveDispatch(incidentId);
  if (!result) return res.status(404).json({ error: "Dispatch not found" });
  
  // Find incident to notify guests
  const incident = activeIncidents.find(inc => inc.id === incidentId);
  if (incident) {
    incident.status = "Resolved";
    incident.lastUpdated = new Date().toISOString();
    
    // Notify guests that hotel has resolved it
    guestIo.emit("alert_resolved_by_hotel", {
      id: incidentId,
      message: "The hotel staff has resolved this incident. You may now dismiss this alert.",
      location: incident.location
    });
  }

  io.emit("dispatch_update", result);
  broadcastIncidents();
  res.json(result);
});

app.get("/api/dispatch/calls", (req, res) => {
  res.json(getCallLog(parseInt(req.query.limit) || 50));
});

app.get("/api/dispatch/personnel", (req, res) => {
  res.json(getPersonnelDeployments(parseInt(req.query.limit) || 50));
});

app.get("/api/dispatch/roster", (req, res) => {
  res.json(getPersonnelRoster());
});

app.get("/api/dispatch/voice-scripts", (req, res) => {
  res.json(getVoiceScripts());
});

// ── Guest Routes ──────────────────────────────────────────

app.post("/api/guest/login", (req, res) => {
  const { room, lastName } = req.body;
  if (!room || !lastName) return res.status(400).json({ error: "Room and last name required" });
  const result = authenticateGuest(room, lastName);
  if (!result.success) return res.status(401).json(result);
  console.log(`[Guest] ✅ Login: Room ${room} (${result.guest.firstName} ${result.guest.lastName})`);
  res.json(result);
});

app.get("/api/guest/profile", (req, res) => {
  const token = req.headers["x-guest-token"];
  const profile = getGuestProfile(token);
  if (!profile) return res.status(401).json({ error: "Invalid or expired session" });
  res.json(profile);
});

app.post("/api/guest/location", (req, res) => {
  const token = req.headers["x-guest-token"];
  const { zoneId } = req.body;
  if (!zoneId) return res.status(400).json({ error: "zoneId required" });
  const result = updateGuestLocation(token, zoneId);
  if (!result) return res.status(401).json({ error: "Invalid session" });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get("/api/guest/location/history", (req, res) => {
  const token = req.headers["x-guest-token"];
  const history = getMovementHistory(token);
  if (!history) return res.status(401).json({ error: "Invalid session" });
  res.json(history);
});

app.get("/api/guest/zones", (req, res) => {
  res.json(getAllZones());
});

app.post("/api/guest/report", async (req, res) => {
  const token = req.headers["x-guest-token"];
  const session = validateSession(token);
  if (!session) return res.status(401).json({ error: "Invalid session" });

  const { category, description, urgency } = req.body;
  if (!description) return res.status(400).json({ error: "Description required" });

  const guestName = `${session.guest.firstName} ${session.guest.lastName}`;
  const room = session.guest.room;
  const zone = getAllZones().find((z) => z.id === session.currentZone);
  const location = zone ? zone.name : "Unknown";
  const fullDesc = `[Guest Report — Room ${room}, ${guestName}] ${category ? `(${category}) ` : ""}${description}`;

  try {
    console.log(`[Guest Report] 📝 Room ${room}: "${description.substring(0, 60)}..."`);
    const incident = await processIncident(fullDesc, location, "guest_report");
    activeIncidents.push(incident);
    broadcastIncidents();
    autoDispatch(incident);
    res.json({ success: true, incidentId: incident.id, tier: incident.tier, score: incident.score });
  } catch (err) {
    console.error("[Guest Report] Error:", err.message);
    res.status(500).json({ error: "Failed to process report" });
  }
});

app.post("/api/guest/resolve", (req, res) => {
  const token = req.headers["x-guest-token"];
  const session = validateSession(token);
  if (!session) return res.status(401).json({ error: "Invalid session" });

  const { incidentId } = req.body;
  if (!incidentId) return res.status(400).json({ error: "Incident ID required" });

  const incident = activeIncidents.find((inc) => inc.id === incidentId && inc.status === "Active");
  if (!incident) return res.status(404).json({ error: "Active incident not found" });

  console.log(`[Guest Resolve] 🛑 Guest resolved incident ${incidentId}`);
  incident.status = "Resolved";
  incident.lastUpdated = new Date().toISOString();
  
  resolveDispatch(incidentId);
  broadcastIncidents();
  
  res.json({ success: true, incidentId });
});

app.post("/api/guest/emergency", async (req, res) => {
  const token = req.headers["x-guest-token"];
  const session = validateSession(token);
  if (!session) return res.status(401).json({ error: "Invalid session" });

  const guestName = `${session.guest.firstName} ${session.guest.lastName}`;
  const room = session.guest.room;
  const zone = getAllZones().find((z) => z.id === session.currentZone);
  const location = zone ? zone.name : "Unknown";
  const { type } = req.body;
  const emergencyDesc = `[EMERGENCY PANIC BUTTON] Guest ${guestName}, Room ${room}, at ${location}. ${type ? `Type: ${type}.` : ""} Guest has activated the emergency button — immediate response required. This is an unverified emergency report from a hotel guest.`;

  try {
    console.log(`[Guest Emergency] 🚨 PANIC BUTTON — Room ${room} (${guestName})`);
    const incident = await processIncident(emergencyDesc, location, "guest_emergency");
    activeIncidents.push(incident);
    broadcastIncidents();
    autoDispatch(incident);
    res.json({ success: true, incidentId: incident.id, tier: incident.tier, message: "Emergency alert dispatched. Help is on the way." });
  } catch (err) {
    console.error("[Guest Emergency] Error:", err.message);
    res.status(500).json({ error: "Failed to process emergency" });
  }
});

app.post("/api/guest/service-request", (req, res) => {
  const token = req.headers["x-guest-token"];
  const { type, details, items } = req.body;
  if (!type) return res.status(400).json({ error: "Service type required" });
  const result = createServiceRequest(token, type, details, items);
  if (!result) return res.status(401).json({ error: "Invalid session" });
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get("/api/service-requests/all", (req, res) => {
  res.json(getAllServiceRequestsAdmin());
});

app.patch("/api/service-requests/:guestId/:reqId", (req, res) => {
  const { guestId, reqId } = req.params;
  const { status } = req.body;
  const success = updateServiceRequestStatusAdmin(guestId, reqId, status);
  res.json({ success });
});

app.get("/api/guest/service-requests", (req, res) => {
  const token = req.headers["x-guest-token"];
  const requests = getServiceRequests(token);
  res.json(requests);
});

app.get("/api/guest/service-types", (req, res) => {
  res.json(getServiceTypes());
});

app.get("/api/guest/emergency-plans", (req, res) => {
  res.json(getEmergencyPlans());
});

app.get("/api/guest/floor-plans", (req, res) => {
  res.json(getFloorPlans());
});


app.get("/api/guest/reports", (req, res) => {
  const token = req.headers["x-guest-token"];
  const session = validateSession(token);
  if (!session) return res.status(401).json({ error: "Invalid session" });
  
  // Return recent guest reports
  const reports = activeIncidents
    .filter(inc => inc.source === "guest_report")
    .map(inc => ({
      id: inc.id,
      category: inc.hazardType,
      description: inc.description,
      tier: inc.tier,
      status: inc.status,
      time: inc.timestamp
    }));
  
  res.json(reports);
});

app.get("/api/guest/alerts", (req, res) => {
  const token = req.headers["x-guest-token"];
  const alerts = getGuestAlerts(token, activeIncidents);
  res.json(alerts);
});

app.get("/api/guest/sessions", (req, res) => {
  res.json(getActiveGuestSessions());
});

// ── WebSocket ──────────────────────────────────────────────

function broadcastIncidents() {
  const sorted = [...activeIncidents].sort((a, b) => b.finalPriority - a.finalPriority);
  io.emit("incidents_update", sorted);
}

// Main namespace (employee dashboard)
io.on("connection", (socket) => {
  console.log("[WS] Dashboard connected:", socket.id);
  broadcastIncidents();
  socket.emit("environment_update", {
    weather: getCurrentWeather(),
    seismic: getSeismicStatus(),
  });
  socket.emit("feed_status", { autoFeedEnabled, sensorSimulatorRunning: isSensorSimulatorRunning() });
  socket.emit("dispatch_log", getDispatchLog(20));

  socket.on("resolve_incident", (id) => {
    const incident = activeIncidents.find((inc) => inc.id === id);
    if (incident) {
      incident.status = "Resolved";
      incident.lastUpdated = new Date().toISOString();
      
      // Notify guests that hotel has resolved it
      guestIo.emit("alert_resolved_by_hotel", {
        id: id,
        message: "The hotel staff has resolved this incident. You may now dismiss this alert.",
        location: incident.location
      });
    }

    resolveDispatch(id);
    broadcastIncidents();
  });

  socket.on("disconnect", () => {
    console.log("[WS] Dashboard disconnected:", socket.id);
  });
});

// Guest namespace connection handler
guestIo.on("connection", (socket) => {
  console.log("[WS Guest] Guest connected:", socket.id);

  socket.on("authenticate", (token) => {
    const session = validateSession(token);
    if (session) {
      socket.join(`room_${session.guest.room}`);
      socket.join(`zone_${session.currentZone}`);
      socket.emit("authenticated", { success: true });
    } else {
      socket.emit("authenticated", { success: false });
    }
  });

  socket.on("zone_change", ({ token, zoneId }) => {
    const session = validateSession(token);
    if (session) {
      // Leave old zone, join new
      socket.rooms.forEach((room) => {
        if (room.startsWith("zone_")) socket.leave(room);
      });
      socket.join(`zone_${zoneId}`);
    }
  });

  socket.on("disconnect", () => {
    console.log("[WS Guest] Guest disconnected:", socket.id);
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
          autoDispatch(result.value);
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

      // Auto-resolve if score drops below 1.5
      if (newScoring.score < 1.5) {
        console.log(`[AI Auto-Resolve] 🛑 Incident ${incident.id} priority dropped below threshold. Auto-resolving.`);
        incident.status = "Resolved";
        incident.lastUpdated = new Date().toISOString();
        resolveDispatch(incident.id);
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

// ── Dashboard API Routes ───────────────────────────────────


app.get("/api/dispatch/history", (req, res) => {
  res.json(getDispatchLog());
});

app.get("/api/analytics", (req, res) => {
  // Simple analytics from activeIncidents and dispatchLog
  const dispatches = getDispatchLog();
  const critical = activeIncidents.filter(i => i.tier === 'Critical').length;
  const high = activeIncidents.filter(i => i.tier === 'High').length;
  const medium = activeIncidents.filter(i => i.tier === 'Medium').length;
  const low = activeIncidents.filter(i => i.tier === 'Low').length;

  res.json({
    tierCounts: { critical, high, medium, low },
    totalIncidents: activeIncidents.length,
    activeDispatches: dispatches.filter(d => !['Resolved', 'Stand Down'].includes(d.status)).length,
    avgScore: activeIncidents.length ? (activeIncidents.reduce((s, i) => s + (i.score || 0), 0) / activeIncidents.length).toFixed(1) : 0,
    sourceDistribution: activeIncidents.reduce((acc, i) => {
      acc[i.source] = (acc[i.source] || 0) + 1;
      return acc;
    }, {})
  });
});

app.get("/api/sensors", (req, res) => {
  res.json({
    weather: getCurrentWeather(),
    seismic: getSeismicStatus(),
    simulator: getSensorState()
  });
});

app.get("/api/alerts", (req, res) => {
  // Synthesize alerts from activeIncidents
  const alerts = activeIncidents.slice(0, 20).map(inc => ({
    id: inc.id,
    message: `Incident in ${inc.location}`,
    detail: inc.rawDescription,
    time: inc.timestamp,
    severity: inc.tier.toLowerCase(),
    source: inc.source,
    zone: inc.location
  }));
  res.json(alerts);
});

app.get("/api/settings", (req, res) => {
  res.json({ autoFeedEnabled });
});

app.post("/api/settings", (req, res) => {
  const { autoFeed } = req.body;
  if (typeof autoFeed === 'boolean') {
    autoFeedEnabled = autoFeed;
    if (autoFeed && !isSensorSimulatorRunning()) {
      startSensorSimulator(io);
    } else if (!autoFeed && isSensorSimulatorRunning()) {
      stopSensorSimulator();
    }
  }
  saveSettings();
  res.json({ autoFeedEnabled });
});

// ── Boot ───────────────────────────────────────────────────

const PORT = process.env.PORT || 3001;

async function bootServer() {
  await store.connectDB();
  await store.loadAllData();
  
  initIndexData();
  initDispatchData();
  initGuestData();

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
    
    // Periodically save state to disk
    setInterval(() => {
      saveIncidents();
      saveSettings();
    }, 5000);

    setInterval(() => {
      io.emit("dispatch_log", getDispatchLog(20));
    }, 1000);
  });
}

bootServer();
