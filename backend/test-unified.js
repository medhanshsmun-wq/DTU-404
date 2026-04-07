// Quick test: Verify the unified scoring engine against spec examples
import { scoreIncident, detectDomain, computeCompoundModifier } from "./unifiedScoring.js";

console.log("=== UNIFIED PRIORITY ENGINE — Verification Tests ===\n");

// Test 1: Fire with smoke in corridor (spec example → should be Critical, ~8.5)
const fireIncident = {
  hazardType: "Fires and Hazards",
  isCompound: false,
  compoundTypes: [],
  liveFactors: { V: 8, S: 7, I: 8, H: 6, L: 7, P: 6 },
  rawDescription: "Smoke in occupied escape corridor on Floor 12 East Wing. One stairwell degraded. 85 people in affected stack.",
  sensorSignals: { smokeInCorridor: true },
  source: "sensor_cctv",
  location: "Floor 12 East Wing",
  confidence: 0.88,
};
const fire = scoreIncident(fireIncident, []);
console.log("Test 1: Corridor Smoke Fire");
console.log(`  Score: ${fire.score} (expected ~8.5)`);
console.log(`  Tier:  ${fire.tier} (expected Critical)`);
console.log(`  BCP:   ${fire.bcp}`);
console.log(`  LIS:   ${fire.lis}`);
console.log(`  Factors: V=${fire.factors.V} S=${fire.factors.S} I=${fire.factors.I} H=${fire.factors.H} L=${fire.factors.L} P=${fire.factors.P}`);
console.log(`  Override: ${fire.overrideApplied ? fire.overrideReason : "none"}`);
console.log(`  Autonomy: ${fire.autonomyLevel}`);
console.log(`  Rerank: ${fire.rerankAfterSec}s`);
console.log(`  ✅ ${fire.tier === "Critical" ? "PASS" : "FAIL"}`);
console.log();

// Test 2: Cardiac arrest (medical domain → should be 10.0, Critical)
const cardiacIncident = {
  hazardType: "Medical Emergencies",
  isCompound: false,
  compoundTypes: [],
  liveFactors: { V: 10, S: 8, I: 10, H: 5, L: 3, P: 2 },
  rawDescription: "Guest found with no pulse and not breathing in room 412. Staff performing CPR.",
  sensorSignals: {},
  source: "manual",
  location: "Room 412",
  confidence: 0.95,
};
const cardiac = scoreIncident(cardiacIncident, []);
console.log("Test 2: Cardiac Arrest");
console.log(`  Score: ${cardiac.score} (expected 10.0 from override)`);
console.log(`  Tier:  ${cardiac.tier} (expected Critical)`);
console.log(`  Domain: ${cardiac.domain}`);
console.log(`  Override: ${cardiac.overrideApplied ? cardiac.overrideReason : "none"}`);
console.log(`  ✅ ${cardiac.score >= 9.5 ? "PASS" : "FAIL"}`);
console.log();

// Test 3: Contained fire (should be capped at Medium)
const containedFire = {
  hazardType: "Fires and Hazards",
  isCompound: false,
  compoundTypes: [],
  liveFactors: { V: 3, S: 2, I: 3, H: 4, L: 2, P: 2 },
  rawDescription: "Small contained fire in kitchen extinguished with fire extinguisher. No spread.",
  sensorSignals: {},
  source: "manual",
  location: "Main Kitchen",
  confidence: 0.9,
};
const contained = scoreIncident(containedFire, []);
console.log("Test 3: Contained Kitchen Fire");
console.log(`  Score: ${contained.score} (expected ≤4.5 from cap)`);
console.log(`  Tier:  ${contained.tier} (expected Medium or Low)`);
console.log(`  Override: ${contained.overrideApplied ? contained.overrideReason : "none"}`);
console.log(`  ✅ ${contained.score <= 4.5 ? "PASS" : "FAIL"}`);
console.log();

// Test 4: Compound incident (fire + infrastructure failure → +0.5 modifier)
const compoundFire = {
  id: "inc-1",
  hazardType: "Fires and Hazards",
  isCompound: true,
  compoundTypes: ["Fires and Hazards", "Infrastructure Failures"],
  liveFactors: { V: 7, S: 6, I: 7, H: 5, L: 6, P: 5 },
  rawDescription: "Fire in lobby with internal comms failure. Cannot reach fire team via radio.",
  sensorSignals: {},
  source: "sensor_iot",
  location: "Palace Wing - Lobby",
  confidence: 0.8,
};
const infraIncident = {
  id: "inc-2",
  status: "Active",
  hazardType: "Infrastructure Failures",
  location: "Palace Wing - Lobby",
  sensorSignals: {},
};
const compound = scoreIncident(compoundFire, [infraIncident]);
console.log("Test 4: Compound — Fire + Infrastructure Failure");
console.log(`  Score: ${compound.score}`);
console.log(`  Compound Modifier: ${compound.compoundModifier} (expected ≥0.5)`);
console.log(`  ✅ ${compound.compoundModifier >= 0.5 ? "PASS" : "FAIL"}`);
console.log();

// Test 5: Domain detection
console.log("Test 5: Domain Detection");
console.log(`  "Fires and Hazards" → ${detectDomain("Fires and Hazards")} (expected hazard)`);
console.log(`  "Medical Emergencies" → ${detectDomain("Medical Emergencies")} (expected medical)`);
console.log(`  "Crowd Panic" → ${detectDomain("Crowd Panic")} (expected infrastructure_crowd)`);
console.log(`  "Flood" → ${detectDomain("Flood")} (expected hazard)`);
console.log(`  "Infrastructure Failures" → ${detectDomain("Infrastructure Failures")} (expected infrastructure_crowd)`);
console.log();

// Test 6: CV deterministic classifier
import { classifyFromCVSignals } from "./ai.js";
const cvResult = classifyFromCVSignals({
  smokeDensity: 0.8,
  occupancyCount: 50,
  exitBlocked: true,
  waterLevel: 0.5,
}, "CCTV detected dense smoke, blocked exit, rising water");
console.log("Test 6: Deterministic CV Classifier");
console.log(`  Hazard Type: ${cvResult.hazardType}`);
console.log(`  Compound: ${cvResult.isCompound} (${cvResult.compoundTypes.join(", ")})`);
console.log(`  Factors: V=${cvResult.liveFactors.V} S=${cvResult.liveFactors.S} I=${cvResult.liveFactors.I} H=${cvResult.liveFactors.H} L=${cvResult.liveFactors.L} P=${cvResult.liveFactors.P}`);

const cvScored = scoreIncident({
  hazardType: cvResult.hazardType,
  isCompound: cvResult.isCompound,
  compoundTypes: cvResult.compoundTypes,
  liveFactors: cvResult.liveFactors,
  rawDescription: "CCTV detected dense smoke, blocked exit, rising water",
  sensorSignals: { smokeDensity: 0.8, exitBlocked: true, waterLevel: 0.5 },
  source: "sensor_cctv",
  location: "Main Lobby Camera A",
  confidence: 0.85,
}, []);
console.log(`  Scored: ${cvScored.score} → ${cvScored.tier}`);
console.log(`  ✅ ${cvScored.tier === "Critical" ? "PASS" : "FAIL"}`);
console.log();

console.log("=== All tests complete ===");
