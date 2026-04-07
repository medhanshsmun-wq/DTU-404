// ============================================================
// HARD OVERRIDE RULES — Unified Priority Engine
// ============================================================
// Deterministic minimum scores when certain high-risk conditions
// are present. Rules run AFTER the formula.
//
// Philosophy: "AI helps interpret, RULES decide escalation."
// No formula miscalculation should ever under-rank a
// life-threatening condition.
//
// Domains: Medical, Hazard, Infrastructure/Crowd
// ============================================================

/**
 * Each rule checks signals from the AI analysis and raw sensor data.
 * Returns { minPriority, maxPriority, reason } or null if no match.
 */
const OVERRIDE_RULES = [
  // ────────────────────────────────────────────────────────
  // MEDICAL OVERRIDES (from spec Section 7)
  // ────────────────────────────────────────────────────────
  {
    name: "No pulse or no breathing",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("no pulse") ||
        desc.includes("not breathing") ||
        desc.includes("cardiac arrest") ||
        desc.includes("unresponsive") && desc.includes("no breath")
      );
    },
    minPriority: 10.0,
    reason: "No pulse or no breathing detected — maximum priority enforced",
  },
  {
    name: "Airway compromise or severe anaphylaxis",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("airway") && (desc.includes("block") || desc.includes("compromise") || desc.includes("obstruct")) ||
        desc.includes("anaphylaxis") && (desc.includes("severe") || desc.includes("throat") || desc.includes("swelling"))
      );
    },
    minPriority: 9.5,
    reason: "Airway compromise or severe anaphylaxis — minimum 9.5 enforced",
  },
  {
    name: "Major uncontrolled bleeding",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        (desc.includes("bleeding") || desc.includes("hemorrhage") || desc.includes("blood")) &&
        (desc.includes("major") || desc.includes("uncontrolled") || desc.includes("severe") || desc.includes("profuse"))
      );
    },
    minPriority: 9.0,
    reason: "Major uncontrolled bleeding — minimum 9.0 enforced",
  },
  {
    name: "Stroke red flags with acute onset",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("stroke") &&
        (desc.includes("acute") || desc.includes("sudden") || desc.includes("face droop") || desc.includes("slurred"))
      );
    },
    minPriority: 8.5,
    reason: "Stroke red flags with acute onset — minimum 8.5 enforced",
  },
  {
    name: "Prolonged or repeated seizure",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("seizure") &&
        (desc.includes("5 minute") || desc.includes("prolonged") || desc.includes("repeated") ||
         desc.includes("status epilepticus") || desc.includes("continuous"))
      );
    },
    minPriority: 9.0,
    reason: "Seizure longer than 5 minutes or repeated seizure — minimum 9.0 enforced",
  },

  // ────────────────────────────────────────────────────────
  // HAZARD OVERRIDES (from spec Section 7)
  // ────────────────────────────────────────────────────────
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

      // Handle numeric waterLevel (from optimized pipeline) and string waterDepth (legacy)
      let waterLevel = 0;
      if (typeof signals.waterLevel === "number") {
        waterLevel = signals.waterLevel;
      } else if (signals.waterLevel) {
        waterLevel = parseFloat(String(signals.waterLevel).replace(/m$/i, "")) || 0;
      } else if (signals.waterDepth) {
        const depthStr = String(signals.waterDepth).toLowerCase();
        waterLevel = parseFloat(depthStr) || 0;
      }

      const hasHighWater = waterLevel >= 0.4;
      const isRising = desc.includes("rising") || (typeof signals.waterDepth === "string" && signals.waterDepth.includes("rising"));

      return (
        (hasHighWater && isRising) ||
        (hasHighWater && desc.includes("water")) ||
        (desc.includes("water") && desc.includes("knee") && desc.includes("rising")) ||
        (desc.includes("flood") && desc.includes("rising") && (desc.includes("blocked") || desc.includes("trapped")))
      );
    },
    minPriority: 8.5,
    reason: "Water above knee level and rising in occupied zone — minimum priority enforced",
  },
  {
    name: "Structural collapse or active landslide",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("collapse") || desc.includes("landslide") ||
        desc.includes("structural failure") || desc.includes("building damage")
      );
    },
    minPriority: 9.5,  // Increased from 9.0 per spec
    reason: "Structural collapse or active landslide — minimum 9.5 enforced",
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
    name: "Confirmed gas leak with symptoms or ignition risk",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("gas leak") &&
        (desc.includes("symptom") || desc.includes("ignition") || desc.includes("smell") || desc.includes("evacuate"))
      );
    },
    minPriority: 9.0,
    reason: "Confirmed gas leak with symptoms or ignition risk — minimum 9.0 enforced",
  },

  // ────────────────────────────────────────────────────────
  // INFRASTRUCTURE / CROWD OVERRIDES (from spec Section 7)
  // ────────────────────────────────────────────────────────
  {
    name: "Crowd crush indicators at exit",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        (desc.includes("crowd") && desc.includes("crush")) ||
        (desc.includes("stampede"))
      );
    },
    minPriority: 9.5,
    reason: "Crowd crush indicators at exit — minimum 9.5 enforced",
  },
  {
    name: "All egress blocked in occupied zone",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      const signals = incident.sensorSignals || {};
      return (
        (desc.includes("all") && desc.includes("exit") && desc.includes("blocked")) ||
        (desc.includes("egress") && desc.includes("blocked")) ||
        (signals.blockedExits && parseInt(signals.blockedExits) >= 3)
      );
    },
    minPriority: 9.5,
    reason: "All egress blocked in occupied zone — minimum 9.5 enforced",
  },
  {
    name: "Full lockout during evacuation or fire",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("lockout") &&
        (desc.includes("evacuation") || desc.includes("fire") || desc.includes("emergency"))
      );
    },
    minPriority: 9.0,
    reason: "Full keyless lockout during evacuation or fire — minimum 9.0 enforced",
  },
  {
    name: "Cyber-physical BMS attack during occupancy",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        (desc.includes("cyber") && desc.includes("attack")) ||
        (desc.includes("bms") && (desc.includes("compromise") || desc.includes("hack") || desc.includes("attack")))
      );
    },
    minPriority: 9.0,
    reason: "Cyber-physical control of alarms or BMS during occupancy — minimum 9.0 enforced",
  },
  {
    name: "Multi-elevator entrapment with medical distress",
    test: (incident) => {
      const desc = (incident.rawDescription || "").toLowerCase();
      return (
        desc.includes("elevator") && desc.includes("trap") &&
        (desc.includes("medical") || desc.includes("distress") || desc.includes("panic") || desc.includes("breathing"))
      );
    },
    minPriority: 8.5,
    reason: "Multi-elevator entrapment with medical distress — minimum 8.5 enforced",
  },

  // ────────────────────────────────────────────────────────
  // CAPS (maximum limits for contained situations)
  // ────────────────────────────────────────────────────────
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
