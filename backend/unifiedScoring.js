// ============================================================
// UNIFIED PRIORITY ENGINE — Full Spec Implementation
// ============================================================
// Master Formula:
//   Final = max(OverrideFloor, min(10, 0.20*BCP + 0.80*LIS + CompoundModifier))
//
// LIS = 0.30V + 0.20S + 0.20I + 0.15H + 0.10L + 0.05P
//
// Where:
//   V = Vital / Life Threat         (0-10)
//   S = Severity / Spread           (0-10)
//   I = Immediate Intervention Need (0-10)
//   H = Historical / Hazard Context (0-10)
//   L = Location / Access Risk      (0-10)
//   P = Propagation / Population    (0-10)
//
// Domain Adapters: Medical, Hazard, Infrastructure/Crowd
// Each adapter computes V,S,I,H,L,P from domain-specific sub-scores.
// ============================================================

import { getBaselineRisk, getCompoundBaselineRisk, getDomainBCP } from "./baselineRisk.js";
import { applyHardOverrides } from "./hardOverrides.js";

// ── LIS Weights (from spec) ───────────────────────────────
const LIS_WEIGHTS = {
  V: 0.30,
  S: 0.20,
  I: 0.20,
  H: 0.15,
  L: 0.10,
  P: 0.05,
};

const BCP_WEIGHT = 0.20;
const LIS_WEIGHT = 0.80;

// ── Factor human-readable labels ──────────────────────────
const FACTOR_LABELS = {
  V: "Vital / Life Threat",
  S: "Severity / Spread",
  I: "Immediate Intervention Need",
  H: "Historical / Hazard Context",
  L: "Location / Access Risk",
  P: "Propagation / Population Impact",
};

// ── Tier Bands (from spec) ────────────────────────────────
function assignTier(score) {
  if (score >= 8.0) return "Critical";
  if (score >= 6.0) return "High";
  if (score >= 4.0) return "Medium";
  return "Low";
}

// ── Autonomy Levels ───────────────────────────────────────
function assignAutonomyLevel(tier, confidence, overrideApplied) {
  if (tier === "Critical" && confidence >= 0.7) return "A3"; // auto-protective
  if (tier === "Critical") return "A2"; // dispatch internal
  if (tier === "High" && confidence >= 0.6) return "A2";
  if (tier === "High") return "A1"; // notify staff
  if (tier === "Medium") return "A1";
  return "A0"; // log only
}

// ── Reranking Cadence (seconds) ───────────────────────────
const RERANK_CADENCE = {
  // Critical / fast-moving
  "fire": 5,
  "gas_leak": 5,
  "cardiac_arrest": 3,
  "seizure": 5,
  "anaphylaxis": 3,
  "crowd_surge": 5,
  "crowd_crush": 3,
  // High / moderate
  "elevator_entrapment": 10,
  "blackout": 10,
  "cyber_physical": 10,
  "stroke": 5,
  "bleeding": 5,
  // Slow-moving
  "flood": 15,
  "landslide": 20,
  "cyclone": 30,
  "hvac_collapse": 15,
  // Default
  "default": 10,
};

function getRerankCadence(incidentType) {
  const normalized = (incidentType || "").toLowerCase().replace(/[\s\/]+/g, "_");
  for (const [key, val] of Object.entries(RERANK_CADENCE)) {
    if (normalized.includes(key)) return val;
  }
  return RERANK_CADENCE.default;
}

// ============================================================
// DOMAIN ADAPTERS
// ============================================================

/**
 * Detect which domain an incident belongs to.
 * Returns "medical", "hazard", or "infrastructure_crowd".
 */
export function detectDomain(hazardType) {
  const h = (hazardType || "").toLowerCase();

  const medicalTypes = ["medical", "cardiac", "anaphylaxis", "seizure", "stroke", "bleeding", "health", "food"];
  if (medicalTypes.some((t) => h.includes(t))) return "medical";

  const hazardTypes = ["fire", "flood", "earthquake", "cyclone", "storm", "landslide", "gas", "smoke", "hazard"];
  if (hazardTypes.some((t) => h.includes(t))) return "hazard";

  return "infrastructure_crowd";
}

// ── Hazard Adapter (5B from spec) ─────────────────────────
function hazardAdapter(liveFactors, sensorSignals = {}) {
  // V_haz = min(10, A + E + C + O)
  // A = active hazard intensity 0-4, E = escalation speed 0-3
  // C = critical systems compromise 0-2, O = occupants in immediate danger 0-3
  const A = clamp(toNum(liveFactors.activeHazardIntensity, liveFactors.V, liveFactors.currentSeverity, 0), 0, 4);
  const E_v = clamp(toNum(liveFactors.escalationSpeed, 0), 0, 3);
  const C_v = clamp(toNum(liveFactors.criticalSystemsCompromise, 0), 0, 2);
  const O = clamp(toNum(liveFactors.occupantsInDanger, 0), 0, 3);
  const V = Math.min(10, A + E_v + C_v + O);

  // S_haz = min(10, Z + M + D + T)
  const Z = clamp(toNum(liveFactors.zoneSpread, 0), 0, 4);
  const M = clamp(toNum(liveFactors.magnitude, 0), 0, 2);
  const D = clamp(toNum(liveFactors.damageSignals, 0), 0, 3);
  const T = clamp(toNum(liveFactors.trend, 0), 0, 1);
  const S = Math.min(10, Z + M + D + T);

  // I_haz = min(10, Li + Ri + Ci)
  const Li = clamp(toNum(liveFactors.lifesavingNeeded, 0), 0, 6);
  const Ri = clamp(toNum(liveFactors.riskIfDelayed, 0), 0, 3);
  const Ci = clamp(toNum(liveFactors.interventionComplexity, 0), 0, 2);
  const I = Math.min(10, Li + Ri + Ci);

  // H_haz = min(10, Bh + Ch + Dh + W)
  const Bh = clamp(toNum(liveFactors.baselineSiteExposure, 0), 0, 4);
  const Ch = clamp(toNum(liveFactors.conditionSiteMatch, 0), 0, 3);
  const Dh = clamp(toNum(liveFactors.dependencyFragility, 0), 0, 2);
  const W = clamp(toNum(liveFactors.warningCompound, 0), 0, 1);
  const H = Math.min(10, Bh + Ch + Dh + W);

  // L_haz = min(10, Al + Hl + Rl)
  const Al = clamp(toNum(liveFactors.accessDifficulty, 0), 0, 4);
  const Hl = clamp(toNum(liveFactors.hazardLocationRisk, 0), 0, 3);
  const Rl = clamp(toNum(liveFactors.responderDelay, 0), 0, 3);
  const L = Math.min(10, Al + Hl + Rl);

  // P_haz = min(10, Np + Cp + Ep)
  const Np = clamp(toNum(liveFactors.peopleAffected, 0), 0, 4);
  const Cp = clamp(toNum(liveFactors.cascadeRisk, 0), 0, 3);
  const Ep = clamp(toNum(liveFactors.panicPotential, 0), 0, 3);
  const P = Math.min(10, Np + Cp + Ep);

  return { V, S, I, H, L, P };
}

// ── Medical Adapter (5A from spec) ────────────────────────
function medicalAdapter(liveFactors) {
  // V_med = min(10, R + B + C + U)
  const R = clamp(toNum(liveFactors.respirationAbnormality, 0), 0, 4);
  const B = clamp(toNum(liveFactors.bloodOxygenAbnormality, 0), 0, 3);
  const C_m = clamp(toNum(liveFactors.circulationAbnormality, 0), 0, 2);
  const U = clamp(toNum(liveFactors.consciousnessState, 0), 0, 3);
  const V = Math.min(10, R + B + C_m + U);

  // S_med = min(10, Ps + Ds + As + Ts)
  const Ps = clamp(toNum(liveFactors.painScore, 0), 0, 4);
  const Ds = clamp(toNum(liveFactors.distressBehavior, 0), 0, 2);
  const As = clamp(toNum(liveFactors.acuteRedFlags, 0), 0, 3);
  const Ts = clamp(toNum(liveFactors.timeSensitivity, 0), 0, 1);
  const S = Math.min(10, Ps + Ds + As + Ts);

  // I_med = min(10, Li + Ri + Ci)
  const Li = clamp(toNum(liveFactors.lifesavingNeeded, 0), 0, 6);
  const Ri = clamp(toNum(liveFactors.riskIfDelayed, 0), 0, 3);
  const Ci = clamp(toNum(liveFactors.interventionComplexity, 0), 0, 2);
  const I = Math.min(10, Li + Ri + Ci);

  // H_med = min(10, Bc + Cm + Mr + Af)
  const Bc = clamp(toNum(liveFactors.chronicDiseaseRisk, 0), 0, 4);
  const Cm = clamp(toNum(liveFactors.conditionEventMatch, 0), 0, 3);
  const Mr = clamp(toNum(liveFactors.medicationRisk, 0), 0, 2);
  const Af = clamp(toNum(liveFactors.ageFrailtyModifier, 0), 0, 1);
  const H = Math.min(10, Bc + Cm + Mr + Af);

  // L_med = min(10, Al + Hl + Rl)
  const Al = clamp(toNum(liveFactors.accessDifficulty, 0), 0, 4);
  const Hl = clamp(toNum(liveFactors.hazardLocationRisk, 0), 0, 3);
  const Rl = clamp(toNum(liveFactors.responderDelay, 0), 0, 3);
  const L = Math.min(10, Al + Hl + Rl);

  // P_med = min(10, Np + Cp + Ep)
  const Np = clamp(toNum(liveFactors.peopleAffected, 0), 0, 4);
  const Cp = clamp(toNum(liveFactors.cascadeRisk, 0), 0, 3);
  const Ep = clamp(toNum(liveFactors.panicPotential, 0), 0, 3);
  const P = Math.min(10, Np + Cp + Ep);

  return { V, S, I, H, L, P };
}

// ── Infrastructure / Crowd Adapter (5C from spec) ─────────
function infrastructureCrowdAdapter(liveFactors) {
  // V_inf = min(10, Ls + Ve + Ex)
  const Ls = clamp(toNum(liveFactors.lifeSafetyExposure, 0), 0, 4);
  const Ve = clamp(toNum(liveFactors.velocityEscalation, 0), 0, 3);
  const Ex = clamp(toNum(liveFactors.exposedTrapped, 0), 0, 3);
  const V = Math.min(10, Ls + Ve + Ex);

  // S_inf = min(10, Co + Sc + Dm)
  const Co = clamp(toNum(liveFactors.continuityDisruption, 0), 0, 4);
  const Sc = clamp(toNum(liveFactors.scopeFailure, 0), 0, 3);
  const Dm = clamp(toNum(liveFactors.damageFunctionalLoss, 0), 0, 3);
  const S = Math.min(10, Co + Sc + Dm);

  // I_inf = min(10, Ac + Ri + Rc)
  const Ac = clamp(toNum(liveFactors.actionNeededNow, 0), 0, 4);
  const Ri = clamp(toNum(liveFactors.riskIfDelayed, 0), 0, 3);
  const Rc = clamp(toNum(liveFactors.responseComplexity, 0), 0, 3);
  const I = Math.min(10, Ac + Ri + Rc);

  // H_inf = min(10, Fg + Dep + Wn)
  const Fg = clamp(toNum(liveFactors.fragilityComplianceGap, 0), 0, 4);
  const Dep = clamp(toNum(liveFactors.dependencyConcentration, 0), 0, 3);
  const Wn = clamp(toNum(liveFactors.warningPeakLoad, 0), 0, 3);
  const H = Math.min(10, Fg + Dep + Wn);

  // L_inf = min(10, Eg + Ad + Rt)
  const Eg = clamp(toNum(liveFactors.egressImpairment, 0), 0, 4);
  const Ad = clamp(toNum(liveFactors.accessDifficulty, 0), 0, 3);
  const Rt = clamp(toNum(liveFactors.responderDelay, 0), 0, 3);
  const L = Math.min(10, Eg + Ad + Rt);

  // P_inf = min(10, Np + Cp + Ep)
  const Np = clamp(toNum(liveFactors.peopleAffected, 0), 0, 4);
  const Cp = clamp(toNum(liveFactors.cascadeRisk, 0), 0, 3);
  const Ep = clamp(toNum(liveFactors.panicPotential, 0), 0, 3);
  const P = Math.min(10, Np + Cp + Ep);

  return { V, S, I, H, L, P };
}

// ── Adapter Dispatcher ────────────────────────────────────
function chooseAdapter(domain) {
  switch (domain) {
    case "medical":
      return medicalAdapter;
    case "hazard":
      return hazardAdapter;
    case "infrastructure_crowd":
      return infrastructureCrowdAdapter;
    default:
      return hazardAdapter;
  }
}

// ── Fallback: Map Legacy Factors to V/S/I/H/L/P ──────────
// When the AI or deterministic classifier provides old-style factors,
// we map them to the new schema so the unified engine still works.
function mapLegacyFactors(liveFactors, domain) {
  // If factors already have V,S,I,H,L,P at top level, use them
  if (liveFactors.V !== undefined && liveFactors.S !== undefined) {
    return {
      V: clamp(liveFactors.V, 0, 10),
      S: clamp(liveFactors.S, 0, 10),
      I: clamp(liveFactors.I, 0, 10),
      H: clamp(liveFactors.H, 0, 10),
      L: clamp(liveFactors.L, 0, 10),
      P: clamp(liveFactors.P, 0, 10),
    };
  }

  // Map from old names: currentSeverity, peopleAtRisk, timeToHarm, spreadPotential, evacuationDifficulty, meshOfflineNeed
  const cs = toNum(liveFactors.currentSeverity, 5);
  const par = toNum(liveFactors.peopleAtRisk, 3);
  const tth = toNum(liveFactors.timeToHarm, 5);
  const sp = toNum(liveFactors.spreadPotential, 3);
  const ed = toNum(liveFactors.evacuationDifficulty, 3);
  const mon = toNum(liveFactors.meshOfflineNeed, 2);

  return {
    V: clamp(Math.max(cs, tth * 0.8), 0, 10),          // Life threat ≈ max(severity, urgency)
    S: clamp((cs * 0.6 + sp * 0.4), 0, 10),             // Severity ≈ severity + spread
    I: clamp((tth * 0.7 + cs * 0.3), 0, 10),            // Intervention urgency
    H: clamp(3, 0, 10),                                   // Default context (overridden by BCP)
    L: clamp((ed * 0.7 + mon * 0.3), 0, 10),            // Location/access
    P: clamp((par * 0.7 + sp * 0.3), 0, 10),            // Population impact
  };
}

// ============================================================
// COMPOUND MODIFIER ENGINE
// ============================================================

/**
 * Compute compound modifier (0 to 1.5) based on overlapping active incidents.
 * Rules from spec:
 *   +0.5 if a secondary incident affects the same zone
 *   +0.5 if comms or power failure impairs response to primary
 *   +0.5 if egress or responder routes degraded by secondary
 */
export function computeCompoundModifier(incident, activeIncidents = []) {
  let modifier = 0;
  const myZone = (incident.location || "").toLowerCase();
  const myType = (incident.hazardType || "").toLowerCase();

  for (const other of activeIncidents) {
    if (other.id === incident.id) continue;
    if (other.status !== "Active") continue;

    const otherZone = (other.location || "").toLowerCase();
    const otherType = (other.hazardType || "").toLowerCase();

    // +0.5 if secondary incident in same zone
    if (otherZone && myZone && otherZone === myZone && otherType !== myType) {
      modifier += 0.5;
    }

    // +0.5 if comms/power failure impairs response
    if (
      otherType.includes("infrastructure") ||
      otherType.includes("blackout") ||
      otherType.includes("comms") ||
      otherType.includes("power")
    ) {
      modifier += 0.5;
    }

    // +0.5 if egress degraded by secondary
    if (
      otherType.includes("crowd") ||
      otherType.includes("blocked") ||
      (other.sensorSignals && other.sensorSignals.exitBlocked)
    ) {
      modifier += 0.5;
    }
  }

  return Math.min(1.5, modifier);
}

// ============================================================
// CONFIDENCE ENGINE
// ============================================================

/**
 * Compute confidence score (0.0 to 1.0).
 * Confidence = 0.35*SourceAgreement + 0.25*SensorQuality + 0.20*Recency + 0.20*ModelCertainty
 */
export function computeConfidence(incident) {
  // Source agreement: higher if multiple sources confirm
  let sourceAgreement = 0.5; // default: single source
  const source = incident.source || "";
  if (source === "sensor_cctv" || source === "sensor_iot") {
    sourceAgreement = 0.7; // sensor data is more reliable
  }
  if (incident.isCompound) {
    sourceAgreement = 0.8; // multiple detections increase agreement
  }

  // Sensor quality: higher if we have numeric signals
  let sensorQuality = 0.4;
  const signals = incident.sensorSignals || {};
  const signalCount = Object.keys(signals).length;
  if (signalCount >= 3) sensorQuality = 0.8;
  else if (signalCount >= 1) sensorQuality = 0.6;

  // Recency: based on timestamp
  let recency = 0.8;
  if (incident.timestamp) {
    const ageMs = Date.now() - new Date(incident.timestamp).getTime();
    if (ageMs < 10000) recency = 1.0;
    else if (ageMs < 60000) recency = 0.8;
    else if (ageMs < 300000) recency = 0.5;
    else recency = 0.3;
  }

  // Model certainty: from AI confidence or deterministic
  let modelCertainty = toNum(incident.aiConfidence, incident.confidence, 0.7);

  const confidence =
    0.35 * sourceAgreement +
    0.25 * sensorQuality +
    0.20 * recency +
    0.20 * modelCertainty;

  return round(Math.min(1.0, Math.max(0.0, confidence)));
}

// ============================================================
// MAIN SCORING FUNCTION
// ============================================================

/**
 * Score an incident using the Unified Priority Engine.
 * This is the single entry point replacing the old computeFinalPriority().
 *
 * @param {Object} incident - The incident to score
 * @param {Array} activeIncidents - All currently active incidents (for compound modifier)
 * @returns {Object} Canonical output object per spec
 */
export function scoreIncident(incident, activeIncidents = []) {
  const domain = detectDomain(incident.hazardType);
  const adapter = chooseAdapter(domain);

  // 1. Base Context Prior
  const bcp = incident.isCompound && incident.compoundTypes?.length
    ? getCompoundBaselineRisk(incident.compoundTypes)
    : getDomainBCP(incident.hazardType, domain, incident);

  // 2. Compute V, S, I, H, L, P via domain adapter
  //    First try the adapter with domain-specific sub-scores.
  //    If they're missing (AI gave old-style factors), fall back to mapping.
  let factors;
  const lf = incident.liveFactors || {};
  const hasSubScores = lf.activeHazardIntensity !== undefined ||
                       lf.respirationAbnormality !== undefined ||
                       lf.lifeSafetyExposure !== undefined ||
                       lf.V !== undefined;

  if (hasSubScores) {
    if (lf.V !== undefined) {
      // Already V/S/I/H/L/P format
      factors = mapLegacyFactors(lf, domain);
    } else {
      // Domain-specific sub-scores
      factors = adapter(lf, incident.sensorSignals);
    }
  } else {
    // Legacy factor names — map them
    factors = mapLegacyFactors(lf, domain);
  }

  // 3. Compute Live Incident Score
  const lis = round(
    LIS_WEIGHTS.V * factors.V +
    LIS_WEIGHTS.S * factors.S +
    LIS_WEIGHTS.I * factors.I +
    LIS_WEIGHTS.H * factors.H +
    LIS_WEIGHTS.L * factors.L +
    LIS_WEIGHTS.P * factors.P
  );

  // 4. Hard overrides
  const { finalPriority: overrideFloor, overrideApplied, overrideReason } =
    applyHardOverrides(incident, 0);
  const effectiveOverride = overrideApplied ? overrideFloor : 0;

  // 5. Compound modifier
  const compoundModifier = computeCompoundModifier(incident, activeIncidents);

  // 6. Master formula
  const rawScore = 0.20 * bcp + 0.80 * lis + compoundModifier;
  const finalScore = round(Math.min(10, Math.max(effectiveOverride, rawScore)));

  // 7. Tier and autonomy
  const tier = assignTier(finalScore);
  const confidence = computeConfidence(incident);
  const autonomyLevel = assignAutonomyLevel(tier, confidence, overrideApplied);

  // 8. Reranking cadence
  const rerankAfterSec = getRerankCadence(incident.hazardType);

  // 9. Build canonical output
  return {
    // Scoring
    score: finalScore,
    finalPriority: finalScore,  // backwards compat
    tier,
    priorityBand: tier,         // backwards compat
    confidence,
    autonomyLevel,

    // Breakdown
    bcp: round(bcp),
    lis: round(lis),
    factors: {
      V: round(factors.V),
      S: round(factors.S),
      I: round(factors.I),
      H: round(factors.H),
      L: round(factors.L),
      P: round(factors.P),
    },
    factorLabels: FACTOR_LABELS,
    domain,

    // Overrides & compound
    overrideFloor: round(effectiveOverride),
    overrideApplied,
    overrideReason,
    compoundModifier: round(compoundModifier),

    // Reranking
    rerankAfterSec,

    // Legacy compat
    baselineRisk: round(bcp),
    liveScore: round(lis),
    rawPriority: round(rawScore),

    // Detailed breakdown for dashboard
    liveFactorBreakdown: {
      V: { value: round(factors.V), weight: LIS_WEIGHTS.V, label: FACTOR_LABELS.V },
      S: { value: round(factors.S), weight: LIS_WEIGHTS.S, label: FACTOR_LABELS.S },
      I: { value: round(factors.I), weight: LIS_WEIGHTS.I, label: FACTOR_LABELS.I },
      H: { value: round(factors.H), weight: LIS_WEIGHTS.H, label: FACTOR_LABELS.H },
      L: { value: round(factors.L), weight: LIS_WEIGHTS.L, label: FACTOR_LABELS.L },
      P: { value: round(factors.P), weight: LIS_WEIGHTS.P, label: FACTOR_LABELS.P },
    },
  };
}

// ── Utilities ─────────────────────────────────────────────
function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function round(val) {
  return parseFloat(val.toFixed(2));
}

function toNum(...args) {
  for (const a of args) {
    const n = parseFloat(a);
    if (!isNaN(n)) return n;
  }
  return 0;
}
