// ============================================================
// SCORING ENGINE — Pure Deterministic Math
// ============================================================
// No AI in this file. Just the formulas.
//
// Live Incident Score =
//   (Current Severity    × 0.30) +
//   (People at Risk      × 0.25) +
//   (Time to Harm        × 0.20) +
//   (Spread Potential     × 0.10) +
//   (Evacuation Difficulty × 0.10) +
//   (Mesh/Offline Need   × 0.05)
//
// Final Priority = (Baseline Risk × 0.20) + (Live Incident Score × 0.80)
// ============================================================

import { getBaselineRisk, getCompoundBaselineRisk } from "./baselineRisk.js";
import { applyHardOverrides } from "./hardOverrides.js";

const LIVE_WEIGHTS = {
  currentSeverity:      0.30,
  peopleAtRisk:         0.25,
  timeToHarm:           0.20,
  spreadPotential:      0.10,
  evacuationDifficulty: 0.10,
  meshOfflineNeed:      0.05,
};

const BASELINE_WEIGHT = 0.20;
const LIVE_WEIGHT     = 0.80;

/**
 * Compute the Live Incident Score from the 6 factors.
 * Each factor should be 0-10.
 */
export function computeLiveScore(factors) {
  let score = 0;
  for (const [key, weight] of Object.entries(LIVE_WEIGHTS)) {
    const val = clamp(factors[key] || 0, 0, 10);
    score += val * weight;
  }
  return round(score);
}

/**
 * Compute the Final Priority from baseline + live + overrides.
 * Returns the full scoring breakdown.
 */
export function computeFinalPriority(incident) {
  const { hazardType, compoundTypes, liveFactors, isCompound } = incident;

  // 1. Baseline Risk
  const baselineRisk = isCompound && compoundTypes?.length
    ? getCompoundBaselineRisk(compoundTypes)
    : getBaselineRisk(hazardType);

  // 2. Live Incident Score
  const liveScore = computeLiveScore(liveFactors);

  // 3. Weighted combination
  const rawPriority = round((baselineRisk * BASELINE_WEIGHT) + (liveScore * LIVE_WEIGHT));

  // 4. Hard overrides
  const { finalPriority, overrideApplied, overrideReason } = applyHardOverrides(incident, rawPriority);

  // 5. Priority band
  const priorityBand = getPriorityBand(finalPriority);

  return {
    baselineRisk:    round(baselineRisk),
    liveScore:       round(liveScore),
    rawPriority:     round(rawPriority),
    finalPriority:   round(finalPriority),
    priorityBand,
    overrideApplied,
    overrideReason,
    liveFactorBreakdown: {
      currentSeverity:      { value: liveFactors.currentSeverity      || 0, weight: LIVE_WEIGHTS.currentSeverity },
      peopleAtRisk:         { value: liveFactors.peopleAtRisk         || 0, weight: LIVE_WEIGHTS.peopleAtRisk },
      timeToHarm:           { value: liveFactors.timeToHarm           || 0, weight: LIVE_WEIGHTS.timeToHarm },
      spreadPotential:      { value: liveFactors.spreadPotential      || 0, weight: LIVE_WEIGHTS.spreadPotential },
      evacuationDifficulty: { value: liveFactors.evacuationDifficulty || 0, weight: LIVE_WEIGHTS.evacuationDifficulty },
      meshOfflineNeed:      { value: liveFactors.meshOfflineNeed      || 0, weight: LIVE_WEIGHTS.meshOfflineNeed },
    },
  };
}

/**
 * Priority band thresholds.
 */
function getPriorityBand(score) {
  if (score >= 8.5) return "Extreme";
  if (score >= 6.5) return "High";
  if (score >= 4.0) return "Medium";
  return "Low";
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function round(val) {
  return parseFloat(val.toFixed(2));
}
