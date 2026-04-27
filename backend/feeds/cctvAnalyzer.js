import { analyzeCCTVImage } from "../ai.js";

/**
 * General purpose CCTV frame analysis (Unified Engine).
 * Used for autonomous scanning.
 */
export async function runCCTVAnalysis(frameBase64, mimeType, location, environmentContext = {}) {
  try {
    console.log(`[CCTV Analyzer] Analyzing frame for location '${location}'...`);
    const result = await analyzeCCTVImage(frameBase64, mimeType, location, environmentContext);

    if (result) {
      console.log(`[CCTV Analyzer] 🚨 INCIDENT DETECTED by Vision AI:`, result.hazardType);
      return {
        description: `Autonomous Vision Detection: ${result.explanation?.join(" ")}`,
        source: "autonomous_cctv",
        location: location,
        sensorSignals: result.sensorSignals || {},
        aiResult: result 
      };
    }
    return null;
  } catch (err) {
    console.error("[CCTV Analyzer] Error:", err.message);
    return null;
  }
}
