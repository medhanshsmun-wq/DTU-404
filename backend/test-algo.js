import readline from 'readline';
import { analyzeIncident } from './ai.js';
import { computeFinalPriority } from './scoring.js';
import { getCurrentWeather } from './feeds/weatherFeed.js';
import { getSeismicStatus } from './feeds/earthquakeFeed.js';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log("======================================================");
console.log("🧠 Crisis Response Algorithm - Terminal Testing 🧠");
console.log("======================================================");
console.log("Type an incident description to test the pipeline.");
console.log("Type 'exit' or 'quit' to close.");
console.log("------------------------------------------------------\n");

async function askQuestion(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runLoop() {
  while (true) {
    const description = await askQuestion("Incident Description > ");
    
    if (description.toLowerCase() === 'exit' || description.toLowerCase() === 'quit') {
      console.log("Exiting. Stay safe! 🫡");
      rl.close();
      process.exit(0);
    }

    if (!description.trim()) continue;

    console.log("\n[1/3] Fetching live environmental context...");
    // Mock or grab real ones
    let environmentContext = {
      weather: { temperature: 30, rain: 0, windSpeed: 10, humidity: 70, pressure: 1010 },
      seismic: { status: "Normal", recentQuakes: 0, maxMagnitude: null }
    };
    
    try {
      environmentContext.weather = getCurrentWeather() || environmentContext.weather;
      environmentContext.seismic = getSeismicStatus() || environmentContext.seismic;
    } catch (e) {
      console.log("  (Failed to get live feeds, using defaults)");
    }

    console.log("[2/3] AI processing (Hazard matching, live factors, extraction)...");
    try {
      const aiResult = await analyzeIncident(description, environmentContext);
      
      console.log("[3/3] Deterministic Scoring Pipeline & Hard Overrides...");
      const incidentForScoring = {
        hazardType: aiResult.hazardType,
        isCompound: aiResult.isCompound,
        compoundTypes: aiResult.compoundTypes,
        liveFactors: aiResult.liveFactors,
        rawDescription: description,
        sensorSignals: aiResult.sensorSignals || {},
      };
      
      const scoring = computeFinalPriority(incidentForScoring);
      
      const finalResult = {
        hazardClassification: aiResult.hazardType,
        isCompound: aiResult.isCompound,
        compoundTypes: aiResult.compoundTypes,
        liveFactors: aiResult.liveFactors,
        scoring: {
          baselineRisk: scoring.baselineRisk,
          liveScore: scoring.liveScore,
          rawPriority: scoring.rawPriority,
          finalPriority: scoring.finalPriority,
          priorityBand: scoring.priorityBand,
          overrideApplied: scoring.overrideApplied,
          overrideReason: scoring.overrideReason
        },
        actions: aiResult.recommendedActions,
        explanation: aiResult.explanation,
        sensorSignals: aiResult.sensorSignals
      };

      console.log("\n================ ALGORITHM RESULT ================\n");
      // Output with syntax highlighting via console log
      console.dir(finalResult, { depth: null, colors: true });
      console.log("\n==================================================\n");

    } catch (error) {
      console.error("\n❌ Error analyzing incident:", error.message);
      console.log("   Check if your GEMINI_API_KEY is configured in the .env file.");
      console.log("\n------------------------------------------------------\n");
    }
  }
}

runLoop();
