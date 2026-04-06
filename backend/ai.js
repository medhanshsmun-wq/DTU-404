// ============================================================
// AI MODULE — Gemini 3 Pro for Interpretation & Explanation
// ============================================================
// AI is used ONLY for:
//   1. Classifying the hazard type
//   2. Estimating live factor scores (0-10)
//   3. Generating the "why ranked high" explanation
//   4. Generating recommended actions
//   5. Estimating confidence
//
// AI does NOT decide evacuation or escalation — rules do that.
// ============================================================

import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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
 * Analyze an incident using Gemini.
 * Accepts the raw description + optional environmental context.
 */
export async function analyzeIncident(description, environmentContext = {}) {
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

    const userPrompt = `Analyze this incident at Taj Hotel Mumbai:

"${description}"
${contextStr}

Respond with the JSON assessment.`;

    const result = await model.generateContent(`${SYSTEM_PROMPT}\n\n${userPrompt}`);
    const text = result.response.text();
    const parsed = JSON.parse(text);

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
 * Generate human-readable explanation and recommendations
 * purely from the temporal CV state signals.
 */
export async function generateSummaryFromCV(cvState, environmentContext = {}) {
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
    return parsed;
  } catch(e) {
    console.error("[CCTV AI] Summary generation failed:", e.message);
    throw e;
  }
}
