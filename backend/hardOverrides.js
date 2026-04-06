// ============================================================
// HARD OVERRIDE RULES — Deterministic Safety Clamps
// ============================================================
// These run AFTER the formula. They enforce minimum/maximum
// priority scores based on specific signal conditions.
//
// Philosophy: "AI helps interpret, RULES decide escalation."
// No formula miscalculation should ever under-rank a
// life-threatening condition.
// ============================================================

/**
 * Each rule checks signals from the AI analysis and raw sensor data.
 * Returns { minPriority, maxPriority, reason } or null if no match.
 */
const OVERRIDE_RULES = [
  {
    name: "Smoke in escape corridor",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      const signals = incident.sensorSignals || {};
      return (
        (desc.includes("smoke") && (desc.includes("corridor") || desc.includes("stairwell") || desc.includes("escape") || desc.includes("exit"))) ||
        signals.smokeInCorridor === true
      );
    },
    minPriority: 8.5,
    reason: "Active smoke detected in escape route — minimum priority enforced",
  },
  {
    name: "Water above knee level and rising",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      const signals = incident.sensorSignals || {};
      const waterDepthStr = (signals.waterDepth || "").toLowerCase();
      const hasHighWater = waterDepthStr.includes("0.5") || waterDepthStr.includes("0.6") || waterDepthStr.includes("0.7") || waterDepthStr.includes("0.8") || waterDepthStr.includes("0.9") || waterDepthStr.includes("1.");
      const isRising = waterDepthStr.includes("rising") || desc.includes("rising");
      return (
        (hasHighWater && isRising) ||
        (desc.includes("water") && desc.includes("knee") && desc.includes("rising")) ||
        (desc.includes("flood") && desc.includes("rising") && (desc.includes("blocked") || desc.includes("trapped")))
      );
    },
    minPriority: 8.5,
    reason: "Water above knee level and rising in occupied zone — minimum priority enforced",
  },
  {
    name: "Structural collapse or landslide",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("collapse") || desc.includes("landslide") ||
        desc.includes("structural failure") || desc.includes("building damage")
      );
    },
    minPriority: 9.0,
    reason: "Structural collapse or landslide detected — minimum priority enforced",
  },
  {
    name: "Confirmed trapped person",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return desc.includes("trapped") || desc.includes("stuck under") || desc.includes("pinned");
    },
    minPriority: 9.0,
    reason: "Confirmed trapped person(s) — minimum priority enforced",
  },
  {
    name: "Major earthquake (≥6.0)",
    test: (incident) => {
      const signals = incident.sensorSignals || {};
      return signals.earthquakeMagnitude && parseFloat(signals.earthquakeMagnitude) >= 6.0;
    },
    minPriority: 9.5,
    reason: "Major earthquake (M≥6.0) detected near venue — minimum priority enforced",
  },
  {
    name: "Moderate earthquake (≥4.0)",
    test: (incident) => {
      const signals = incident.sensorSignals || {};
      return signals.earthquakeMagnitude && parseFloat(signals.earthquakeMagnitude) >= 4.0;
    },
    minPriority: 7.0,
    reason: "Moderate earthquake (M≥4.0) detected near venue — elevated priority enforced",
  },
  {
    name: "Contained fire — cap",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        (desc.includes("contained") || desc.includes("extinguished") || desc.includes("extinguisher")) &&
        (desc.includes("fire") || desc.includes("flame")) &&
        !desc.includes("spreading") && !desc.includes("smoke in corridor")
      );
    },
    maxPriority: 4.5,
    reason: "Fire confirmed contained and controlled — priority capped",
  },
];

/**
 * Apply hard override rules to a scored incident.
 * Returns adjusted { finalPriority, overrideApplied, overrideReason }.
 */
export function applyHardOverrides(incident, computedPriority) {
  let finalPriority = computedPriority;
  let overrideApplied = false;
  let overrideReason = null;

  for (const rule of OVERRIDE_RULES) {
    try {
      if (rule.test(incident)) {
        if (rule.minPriority && finalPriority < rule.minPriority) {
          finalPriority = rule.minPriority;
          overrideApplied = true;
          overrideReason = rule.reason;
        }
        if (rule.maxPriority && finalPriority > rule.maxPriority) {
          finalPriority = rule.maxPriority;
          overrideApplied = true;
          overrideReason = rule.reason;
        }
      }
    } catch (e) {
      // Never let a rule crash the pipeline
      console.warn(`Override rule "${rule.name}" threw:`, e.message);
    }
  }

  return { finalPriority, overrideApplied, overrideReason };
}
