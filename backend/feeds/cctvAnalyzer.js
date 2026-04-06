import { analyzeCCTVImage } from "../ai.js";

// Mock URLs for demonstration. In production, these would be local camera stream snapshots.
const CCTV_MOCK_SCENARIOS = {
  clear: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Taj_Mahal_Palace_Hotel_pool_area.jpg/800px-Taj_Mahal_Palace_Hotel_pool_area.jpg",
  fire: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Fire_in_a_room.jpg/800px-Fire_in_a_room.jpg"
};

let cctvTimer = null;
let isCCTVRunning = false;
let currentScenario = "clear";

/**
 * Fetch an image from a URL, convert to base64, and return { base64, mimeType }
 */
async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  const mimeType = response.headers.get("content-type") || "image/jpeg";
  const base64 = Buffer.from(buffer).toString("base64");
  return { base64, mimeType };
}

/**
 * Runs a single CCTV analysis cycle on the current mock scenario
 */
export async function runCCTVAnalysis(environmentContext = {}) {
  try {
    const url = CCTV_MOCK_SCENARIOS[currentScenario];
    console.log(`[CCTV Analyzer] Fetching frame for scenario '${currentScenario}'...`);
    const { base64, mimeType } = await fetchImageAsBase64(url);

    console.log(`[CCTV Analyzer] Analyzing frame with Gemini Vision...`);
    const result = await analyzeCCTVImage(base64, mimeType, "Main Lobby / Kitchen", environmentContext);

    if (result) {
      console.log(`[CCTV Analyzer] 🚨 INCIDENT DETECTED by Vision AI:`, result.hazardType);
      return {
        description: `CCTV Vision Analysis: ${result.explanation?.join(" ")}`,
        source: "sensor_cctv",
        location: "Main Lobby / Kitchen",
        sensorSignals: {
          ...result.sensorSignals,
          cctvEvidenceUrl: url
        },
        aiResult: result // Pass the parsed result to the server, so we skip the text analysis step
      };
    } else {
      console.log(`[CCTV Analyzer] Frame safe. No incident detected.`);
      return null;
    }
  } catch (err) {
    console.error("[CCTV Analyzer] Error:", err.message);
    return null;
  }
}

/**
 * Switch the mock scenario
 */
export function setCCTVScenario(scenarioName) {
  if (CCTV_MOCK_SCENARIOS[scenarioName]) {
    currentScenario = scenarioName;
    console.log(`[CCTV Analyzer] Scenario switched to: ${scenarioName}`);
  }
}

export function isCCTVAnalyzerRunning() {
  return isCCTVRunning;
}

// NOTE: We don't necessarily want a `setInterval` running every 30s that eats up Gemini API credits during idle prototype time.
// We should expose an endpoint to trigger it, or just run it occasionally if enabled.
