// ============================================================
// AI MODULE — Optimized
// ============================================================
// AI is used for:
//   1. Classifying hazard type (manual/text incidents)
//   2. Estimating live factor scores (0-10)
//   3. Generating explanations & recommended actions
//   4. Estimating confidence
//
// CCTV hot-path uses DETERMINISTIC classifier (no LLM).
// LLM enrichment runs ASYNC in background after scoring.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { llmCache, cvCache, LRUCache } from "./cache.js";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ── Deterministic CV Classifier (no LLM, ~1ms) ─────────────

const CV_HAZARD_RULES = [
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
 * Returns the same shape as a Gemini response.
 */
export function classifyFromCVSignals(sensorSignals, description = "") {
  const s = normalizeSensorSignals(sensorSignals);

  // Find first matching rule
  const rule = CV_HAZARD_RULES.find((r) => r.test(s)) || {
    hazardType: "Infrastructure Failures",
    isCompound: false,
    compoundTypes: [],
  };

  // Compute live factors from raw numeric signals
  const liveFactors = {
    currentSeverity: clamp(
      Math.max(s.smokeDensity * 10, s.waterLevel * 8, s.exitBlocked ? 7 : 0),
      0,
      10
    ),
    peopleAtRisk: clamp(Math.min(s.occupancyCount / 5, 10), 0, 10),
    timeToHarm: computeTimeToHarm(s),
    spreadPotential: clamp(
      Math.max(s.smokeDensity * 8, s.waterLevel * 6),
      0,
      10
    ),
    evacuationDifficulty: clamp(
      (s.exitBlocked ? 8 : 0) +
        s.smokeDensity * 3 +
        Math.min(s.occupancyCount / 20, 3),
      0,
      10
    ),
    meshOfflineNeed: clamp(s.smokeDensity > 0.7 ? 5 : 2, 0, 10),
  };

  // Build explanation bullets from detected signals
  const explanation = buildExplanation(s, rule);
  const recommendedActions = buildActions(s, rule);

  return {
    hazardType: rule.hazardType,
    isCompound: rule.isCompound,
    compoundTypes: rule.compoundTypes,
    liveFactors,
    confidence: 0.85, // deterministic classifier has fixed high confidence
    explanation,
    recommendedActions,
  };
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

function computeTimeToHarm(s) {
  // 10 = immediate, 1 = distant
  if (s.smokeDensity > 0.8 && s.exitBlocked) return 9.5;
  if (s.smokeDensity > 0.7) return 8;
  if (s.waterLevel > 0.6) return 7;
  if (s.exitBlocked && s.occupancyCount > 30) return 7.5;
  if (s.exitBlocked) return 6;
  if (s.smokeDensity > 0.4) return 5;
  if (s.waterLevel > 0.2) return 4;
  return 3;
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

Your role: Analyze an incident report (which may come from manual input, IoT sensors, CCTV, or weather/seismic feeds) and produce a structured JSON assessment.

**Hazard Types** (pick the best match, or multiple for compound):
- Fires and Hazards
- Flood
- Earthquake
- Cyclone
- Storm Surge
- Landslide
- Medical Emergencies
- Security Threats
- Crowd Panic
- Infrastructure Failures
- Health Risks
- Missing Persons
- External Threats

**Live Factor Scoring** (0-10 for each, based on the specific incident described):
1. **currentSeverity**: How bad is it RIGHT NOW? (not how bad it could get)
2. **peopleAtRisk**: How many guests/staff are exposed? Include vulnerable populations.
3. **timeToHarm**: How quickly can this become life-threatening? (10 = seconds, 1 = days)
4. **spreadPotential**: Is it growing, rising, spreading floor-to-floor or zone-to-zone?
5. **evacuationDifficulty**: Are exits blocked? Lifts unusable? Visibility low?
6. **meshOfflineNeed**: Will internet/cellular failure seriously hurt the response?

**Confidence**: 0.0 to 1.0. How certain are you about this assessment? Lower if information is sparse or ambiguous.

**Explanation**: Write 3-5 bullet points explaining WHY you scored the way you did. Be specific — mention numbers, locations, conditions.

**Recommended Actions**: 3-6 specific, actionable steps for the response team. Include evacuation routes, resource requests, assembly points WHERE RELEVANT.

**Sensor Signals**: Extract or infer key measurable signals from the description (water depth, smoke level, occupancy count, blocked exits, etc.).

Return EXACTLY this JSON (nothing else):
{
  "hazardType": "<primary type>",
  "isCompound": true/false,
  "compoundTypes": ["<type1>", "<type2>"],
  "liveFactors": {
    "currentSeverity": <0-10>,
    "peopleAtRisk": <0-10>,
    "timeToHarm": <0-10>,
    "spreadPotential": <0-10>,
    "evacuationDifficulty": <0-10>,
    "meshOfflineNeed": <0-10>
  },
  "confidence": <0.0-1.0>,
  "explanation": ["<bullet 1>", "<bullet 2>", "..."],
  "recommendedActions": ["<action 1>", "<action 2>", "..."],
  "sensorSignals": {
    "<key>": "<value>",
    ...
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
      model: "gemini-3.1-flash-lite-preview",
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
      model: "gemini-3.1-flash-lite-preview",
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
 * This is now the ASYNC ENRICHMENT path, called AFTER the deterministic
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
      model: "gemini-3.1-flash-lite-preview",
      generationConfig: { responseMimeType: "application/json" },
    });

    const userPrompt = `You are a Crisis Response Operator summarizing a CCTV CV pipeline output.

CV State:
Location: ${cvState.location}
Description: ${cvState.description}
Raw Detections: ${JSON.stringify(cvState.sensorSignals)}

Provide a JSON object containing:
1. "hazardType" (pick the best matching category like "Fires and Hazards", "Flood", "Crowd Panic")
2. "isCompound" (boolean)
3. "compoundTypes" (array of strings, if applicable)
4. "liveFactors" (0-10 estimates for: currentSeverity, peopleAtRisk, timeToHarm, spreadPotential, evacuationDifficulty, meshOfflineNeed)
5. "explanation" (array of 3-5 bullet points explaining the scene)
6. "recommendedActions" (array of 3-6 specific actions)
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
