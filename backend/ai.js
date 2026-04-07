// ============================================================
// AI MODULE — Unified Priority Engine
// ============================================================
// AI is used for:
//   1. Classifying incident type and domain
//   2. Estimating V/S/I/H/L/P factor scores (0-10)
//   3. Generating explanations & recommended actions
//   4. Estimating confidence
//
// CCTV hot-path uses DETERMINISTIC classifier (no LLM).
// LLM enrichment runs ASYNC in background after scoring.
//
// Factor Schema (Unified Priority Engine Spec):
//   V = Vital / Life Threat
//   S = Severity / Spread
//   I = Immediate Intervention Need
//   H = Historical / Hazard Context
//   L = Location / Access Risk
//   P = Propagation / Population Impact
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { llmCache, cvCache, LRUCache } from "./cache.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const GEMINI_TEXT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
const GEMINI_VISION_MODEL = process.env.GEMINI_VISION_MODEL || GEMINI_TEXT_MODEL;

// ── Deterministic CV Classifier (no LLM, ~1ms) ─────────────

const CV_HAZARD_RULES = [
  {
    // Compound: smoke + blocked exit + water
    test: (s) => s.smokeDensity > 0.5 && s.exitBlocked === true && s.waterLevel > 0.3,
    hazardType: "Fires and Hazards",
    isCompound: true,
    compoundTypes: ["Fires and Hazards", "Flood", "Crowd Panic"],
  },
  {
    // Compound: smoke + blocked exit
    test: (s) => s.smokeDensity > 0.5 && s.exitBlocked === true,
    hazardType: "Fires and Hazards",
    isCompound: true,
    compoundTypes: ["Fires and Hazards", "Crowd Panic"],
  },
  {
    // Compound: smoke + water
    test: (s) => s.smokeDensity > 0.5 && s.waterLevel > 0.3,
    hazardType: "Fires and Hazards",
    isCompound: true,
    compoundTypes: ["Fires and Hazards", "Flood"],
  },
  {
    // High smoke
    test: (s) => s.smokeDensity > 0.5,
    hazardType: "Fires and Hazards",
    isCompound: false,
    compoundTypes: [],
  },
  {
    // Blocked exit with crowd
    test: (s) => s.exitBlocked === true && s.occupancyCount > 20,
    hazardType: "Crowd Panic",
    isCompound: false,
    compoundTypes: [],
  },
  {
    // Blocked exit
    test: (s) => s.exitBlocked === true,
    hazardType: "Infrastructure Failures",
    isCompound: false,
    compoundTypes: [],
  },
  {
    // Significant water
    test: (s) => s.waterLevel > 0.3,
    hazardType: "Flood",
    isCompound: false,
    compoundTypes: [],
  },
  {
    // High crowd density
    test: (s) => s.occupancyCount > 50,
    hazardType: "Crowd Panic",
    isCompound: false,
    compoundTypes: [],
  },
];

/**
 * Deterministic classifier for CV sensor signals.
 * Runs in ~1ms. No LLM call.
 * Returns V/S/I/H/L/P factors per the Unified Priority Engine Spec.
 */
export function classifyFromCVSignals(sensorSignals, description = "") {
  const s = normalizeSensorSignals(sensorSignals);

  // Find first matching rule
  const rule = CV_HAZARD_RULES.find((r) => r.test(s)) || {
    hazardType: "Infrastructure Failures",
    isCompound: false,
    compoundTypes: [],
  };

  // Compute V/S/I/H/L/P using hazard adapter sub-score formulas
  const factors = computeHazardFactorsFromCV(s, rule);

  // Build explanation bullets from detected signals
  const explanation = buildExplanation(s, rule);
  const recommendedActions = buildActions(s, rule);

  return {
    hazardType: rule.hazardType,
    isCompound: rule.isCompound,
    compoundTypes: rule.compoundTypes,
    liveFactors: factors,
    confidence: 0.85,
    explanation,
    recommendedActions,
  };
}

/**
 * Compute V/S/I/H/L/P from CV sensor signals using the Hazard Adapter.
 * Maps raw sensor readings to the spec's sub-score formulas.
 */
function computeHazardFactorsFromCV(s, rule) {
  // V = Vital/Life Threat: min(10, A + E + C + O)
  //   A = active hazard intensity (0-4)
  //   E = escalation speed (0-3)
  //   C = critical systems compromise (0-2)
  //   O = occupants in immediate danger (0-3)
  const A = clamp(Math.max(s.smokeDensity * 4, s.waterLevel * 3), 0, 4);
  const E_v = clamp(
    s.smokeDensity > 0.7 ? 3 : s.smokeDensity > 0.4 ? 2 : s.waterLevel > 0.5 ? 2 : 0,
    0, 3
  );
  const C_v = clamp(s.exitBlocked ? 2 : s.smokeDensity > 0.8 ? 1 : 0, 0, 2);
  const O = clamp(
    s.occupancyCount > 30 ? 3 : s.occupancyCount > 15 ? 2 : s.occupancyCount > 5 ? 1 : 0,
    0, 3
  );
  const V = Math.min(10, A + E_v + C_v + O);

  // S = Severity/Spread: min(10, Z + M + D + T)
  //   Z = zone spread (0-4), M = magnitude (0-2), D = damage (0-3), T = trend (0-1)
  const Z = clamp(
    s.smokeDensity > 0.8 ? 4 : s.smokeDensity > 0.5 ? 3 : s.waterLevel > 0.5 ? 3 : s.waterLevel > 0.2 ? 2 : 0,
    0, 4
  );
  const M_s = clamp(Math.max(s.smokeDensity * 2, s.waterLevel * 1.5), 0, 2);
  const D = clamp(
    s.smokeDensity > 0.7 ? 3 : s.waterLevel > 0.5 ? 2 : s.exitBlocked ? 1 : 0,
    0, 3
  );
  const T = s.smokeDensity > 0.3 || s.waterLevel > 0.2 ? 1 : 0;
  const S = Math.min(10, Z + M_s + D + T);

  // I = Immediate Intervention Need: min(10, Li + Ri + Ci)
  //   Li = lifesaving needed (0-6), Ri = risk if delayed (0-3), Ci = complexity (0-2)
  const Li = clamp(
    (s.smokeDensity > 0.7 && s.exitBlocked ? 6 : s.smokeDensity > 0.6 ? 4 : s.waterLevel > 0.5 ? 3 : s.exitBlocked ? 2 : 0),
    0, 6
  );
  const Ri = clamp(
    s.smokeDensity > 0.5 ? 3 : s.waterLevel > 0.4 ? 2 : s.exitBlocked ? 2 : 0,
    0, 3
  );
  const Ci = clamp(
    rule.isCompound ? 2 : s.smokeDensity > 0.7 ? 1 : 0,
    0, 2
  );
  const I = Math.min(10, Li + Ri + Ci);

  // H = Historical/Hazard Context: min(10, Bh + Ch + Dh + W)
  //   Bh = baseline site exposure (0-4) — Taj Mumbai is coastal, heritage building
  //   Ch = condition-site match (0-3)
  //   Dh = dependency fragility (0-2)
  //   W = warning/compound (0-1)
  const Bh = 3; // Taj Mumbai: coastal heritage building, high exposure
  const Ch = clamp(
    s.smokeDensity > 0.5 ? 2 : s.waterLevel > 0.3 ? 2 : 1,
    0, 3
  );
  const Dh = 1; // Moderate dependency fragility
  const W = rule.isCompound ? 1 : 0;
  const H = Math.min(10, Bh + Ch + Dh + W);

  // L = Location/Access Risk: min(10, Al + Hl + Rl)
  //   Al = access difficulty (0-4), Hl = hazard location risk (0-3), Rl = responder delay (0-3)
  const Al = clamp(
    s.exitBlocked ? 4 : s.smokeDensity > 0.7 ? 3 : s.waterLevel > 0.5 ? 2 : 0,
    0, 4
  );
  const Hl = clamp(
    s.smokeDensity > 0.5 ? 2 : s.waterLevel > 0.3 ? 2 : 1,
    0, 3
  );
  const Rl = clamp(
    s.exitBlocked ? 2 : s.smokeDensity > 0.8 ? 1 : 0,
    0, 3
  );
  const L = Math.min(10, Al + Hl + Rl);

  // P = Propagation/Population Impact: min(10, Np + Cp + Ep)
  //   Np = people affected (0-4), Cp = cascade risk (0-3), Ep = panic potential (0-3)
  const Np = clamp(
    s.occupancyCount > 50 ? 4 : s.occupancyCount > 20 ? 3 : s.occupancyCount > 10 ? 2 : 1,
    0, 4
  );
  const Cp = clamp(
    rule.isCompound ? 3 : s.smokeDensity > 0.5 ? 2 : s.waterLevel > 0.3 ? 1 : 0,
    0, 3
  );
  const Ep = clamp(
    s.exitBlocked && s.occupancyCount > 20 ? 3 : s.smokeDensity > 0.5 ? 2 : 1,
    0, 3
  );
  const P = Math.min(10, Np + Cp + Ep);

  return { V, S, I, H, L, P };
}

/**
 * Normalize sensor signals to consistent numeric types.
 */
function normalizeSensorSignals(signals) {
  return {
    smokeDensity: toNumber(signals.smokeDensity, 0),
    occupancyCount: toNumber(signals.occupancyCount, 0),
    exitBlocked: toBool(signals.exitBlocked),
    waterLevel: toNumber(
      String(signals.waterLevel || "0").replace(/m$/i, ""),
      0
    ),
  };
}

function toNumber(val, fallback) {
  const n = parseFloat(val);
  return isNaN(n) ? fallback : n;
}

function toBool(val) {
  if (typeof val === "boolean") return val;
  if (typeof val === "string")
    return val.toLowerCase() === "true" || val === "1";
  return !!val;
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function buildExplanation(s, rule) {
  const bullets = [];
  if (s.smokeDensity > 0.5)
    bullets.push(
      `Dense smoke detected at ${(s.smokeDensity * 100).toFixed(0)}% density — visibility severely compromised`
    );
  if (s.smokeDensity > 0 && s.smokeDensity <= 0.5)
    bullets.push(
      `Light smoke detected at ${(s.smokeDensity * 100).toFixed(0)}% density — monitoring`
    );
  if (s.exitBlocked)
    bullets.push(
      "Emergency exit is blocked — evacuation routes compromised"
    );
  if (s.waterLevel > 0.3)
    bullets.push(
      `Water level at ${s.waterLevel.toFixed(2)}m and rising — flood conditions in progress`
    );
  if (s.waterLevel > 0 && s.waterLevel <= 0.3)
    bullets.push(
      `Water level at ${s.waterLevel.toFixed(2)}m — monitoring for escalation`
    );
  if (s.occupancyCount > 30)
    bullets.push(
      `High occupancy: approximately ${s.occupancyCount} people in zone — crowd management needed`
    );
  if (s.occupancyCount > 0 && s.occupancyCount <= 30)
    bullets.push(
      `${s.occupancyCount} people detected in zone`
    );
  if (rule.isCompound)
    bullets.push(
      `COMPOUND EVENT: ${rule.compoundTypes.join(" + ")} — cascading risk multiplier applies`
    );
  if (bullets.length === 0)
    bullets.push("Anomaly detected — situation under assessment");
  return bullets;
}

function buildActions(s, rule) {
  const actions = [];
  if (s.smokeDensity > 0.5) {
    actions.push("Activate fire alarm and notify fire brigade immediately");
    actions.push("Deploy fire wardens to verify source and extent of smoke");
  }
  if (s.exitBlocked) {
    actions.push(
      "Dispatch security to clear blocked exit — identify obstruction"
    );
    actions.push("Redirect evacuation to alternate routes via PA system");
  }
  if (s.waterLevel > 0.3) {
    actions.push(
      "Activate flood protocol — deploy sandbags and water pumps"
    );
    actions.push(
      "Evacuate basement and ground floor to upper levels"
    );
  }
  if (s.occupancyCount > 50) {
    actions.push(
      "Initiate crowd management — open secondary exits and deploy staff"
    );
  }
  if (actions.length === 0) {
    actions.push("Continue monitoring — dispatch staff for visual verification");
  }
  actions.push("Update command center with real-time status every 60 seconds");
  return actions;
}

// ── LLM-Based Analysis (for manual incidents & enrichment) ──

const SYSTEM_PROMPT = `You are the intelligence engine for a Rapid Crisis Response System at the Taj Hotel, Mumbai (Colaba, coastal location, Arabian Sea, Seismic Zone III, 2008 attack history).

Your role: Analyze an incident report and produce a structured JSON assessment using the Unified Priority Engine factor model.

**Incident Domains**:
- Medical: cardiac arrest, anaphylaxis, seizure, stroke, bleeding, food poisoning
- Hazard: fire, flood, earthquake, cyclone, storm surge, landslide, gas leak, smoke
- Infrastructure/Crowd: elevator entrapment, blackout, crowd surge, lockout, comms failure, HVAC collapse

**Six-Factor Scoring** (0-10 for each):
1. **V** (Vital / Life Threat): How close this event is to immediate loss of life or severe harm.
2. **S** (Severity / Spread): How severe the event is right now and how fast it is spreading or worsening.
3. **I** (Immediate Intervention Need): How urgently an intervention is needed.
4. **H** (Historical / Hazard Context): Guest, site, or system context that makes this incident more dangerous.
5. **L** (Location / Access Risk): How difficult it is to reach, contain, rescue, or evacuate.
6. **P** (Propagation / Population Impact): How many other people may be affected and how much cascade or panic is possible.

**Confidence**: 0.0 to 1.0. How certain are you about this assessment?

**Explanation**: Write 3-5 bullet points explaining WHY you scored the way you did.

**Recommended Actions**: 3-6 specific, actionable steps for the response team.

**Sensor Signals**: Extract or infer key measurable signals from the description.

Return EXACTLY this JSON (nothing else):
{
  "hazardType": "<primary type>",
  "isCompound": true/false,
  "compoundTypes": ["<type1>", "<type2>"],
  "liveFactors": {
    "V": <0-10>,
    "S": <0-10>,
    "I": <0-10>,
    "H": <0-10>,
    "L": <0-10>,
    "P": <0-10>
  },
  "confidence": <0.0-1.0>,
  "explanation": ["<bullet 1>", "<bullet 2>", "..."],
  "recommendedActions": ["<action 1>", "<action 2>", "..."],
  "sensorSignals": {
    "<key>": "<value>"
  }
}`;

/**
 * Analyze an incident using Gemini (with cache).
 * Used for manual incidents and text-based reports.
 */
export async function analyzeIncident(description, environmentContext = {}) {
  // Check cache first
  const cacheKey = LRUCache.hashKey({ description, env: environmentContext });
  const cached = llmCache.get(cacheKey);
  if (cached) {
    console.log("[AI] Cache HIT — skipping LLM call");
    return cached;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_TEXT_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    // Build context string from live environment data
    let contextStr = "";
    if (environmentContext.weather) {
      const w = environmentContext.weather;
      contextStr += `\n\nCURRENT WEATHER (live from Open-Meteo):
- Temperature: ${w.temperature}°C
- Rain: ${w.rain} mm/hr
- Wind: ${w.windSpeed} km/h
- Humidity: ${w.humidity}%
- Pressure: ${w.pressure} hPa`;
    }
    if (environmentContext.seismic) {
      const s = environmentContext.seismic;
      contextStr += `\n\nSEISMIC STATUS (live from USGS):
- Status: ${s.status}
- Recent quakes within 500km: ${s.recentQuakes}
- Max magnitude: ${s.maxMagnitude || "none"}`;
    }

    const userPrompt = `Analyze this incident at Taj Hotel Mumbai:\n\n"${description}"\n${contextStr}\n\nRespond with the JSON assessment.`;

    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${userPrompt}`);
    const text = result.response.text();
    const parsed = JSON.parse(text);

    // Cache the result
    llmCache.set(cacheKey, parsed);

    return parsed;
  } catch (error) {
    console.error("[AI] Analysis failed:", error.message);
    throw error;
  }
}

/**
 * Analyze a CCTV frame using Gemini Vision.
 * Returns null if no incident detected, or a JSON assessment if an incident is found.
 */
export async function analyzeCCTVImage(base64Image, mimeType, location, environmentContext = {}) {
  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_VISION_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    let contextStr = `CCTV Location: ${location}\n\n`;
    if (environmentContext.weather) {
      const w = environmentContext.weather;
      contextStr += `CURRENT WEATHER: Temp: ${w.temperature}°C, Rain: ${w.rain} mm/hr\n`;
    }

    const userPrompt = `Analyze this CCTV frame from Taj Hotel Mumbai.

${contextStr}

Look carefully for any signs of an emergency (fire, smoke, flooding water, extreme crowd density, violence, structural damage).
If you see a crisis, evaluate it using the JSON scheme. 
If the frame is completely normal and safe, return exactly: {"safe": true}.
Respond with the JSON assessment.`;

    const result = await model.generateContent([
      { text: SYSTEM_PROMPT },
      { text: userPrompt },
      {
        inlineData: {
          data: base64Image,
          mimeType: mimeType
        }
      }
    ]);

    const text = result.response.text();
    const parsed = JSON.parse(text);

    if (parsed.safe) {
      return null; // No incident detected
    }

    return parsed;
  } catch (error) {
    console.error("[CCTV AI] Image analysis failed:", error.message);
    throw error;
  }
}

/**
 * Generate human-readable enrichment from CV state using LLM.
 * This is the ASYNC ENRICHMENT path, called AFTER the deterministic
 * classifier has already scored and broadcast the incident.
 */
export async function generateSummaryFromCV(cvState, environmentContext = {}) {
  // Check cache
  const cacheKey = LRUCache.hashKey({
    desc: cvState.description,
    loc: cvState.location,
    signals: cvState.sensorSignals,
  });
  const cached = cvCache.get(cacheKey);
  if (cached) {
    console.log("[CCTV AI] Cache HIT — returning cached enrichment");
    return cached;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_TEXT_MODEL,
      generationConfig: { responseMimeType: "application/json" },
    });

    const userPrompt = `You are a Crisis Response Operator summarizing a CCTV CV pipeline output.

CV State:
Location: ${cvState.location}
Description: ${cvState.description}
Raw Detections: ${JSON.stringify(cvState.sensorSignals)}

Provide a JSON object using the Unified Priority Engine factor model:
1. "hazardType" (pick the best matching category)
2. "isCompound" (boolean)
3. "compoundTypes" (array of strings, if applicable)
4. "liveFactors" object with:
   - "V" (Vital/Life Threat, 0-10)
   - "S" (Severity/Spread, 0-10)
   - "I" (Immediate Intervention Need, 0-10)
   - "H" (Historical/Hazard Context, 0-10)
   - "L" (Location/Access Risk, 0-10)
   - "P" (Propagation/Population Impact, 0-10)
5. "explanation" (array of 3-5 bullet points)
6. "recommendedActions" (array of 3-6 actions)
7. "confidence" (0.0 to 1.0)

Keep it factual based on the CV state.
`;

    const result = await model.generateContent(userPrompt);
    const parsed = JSON.parse(result.response.text());

    // Cache the result
    cvCache.set(cacheKey, parsed);

    return parsed;
  } catch (e) {
    console.error("[CCTV AI] Enrichment generation failed:", e.message);
    throw e;
  }
}
