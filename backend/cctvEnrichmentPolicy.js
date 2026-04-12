// ============================================================
// CCTV LLM enrichment gate — fewer Gemini calls on the hot path
// ============================================================
// Flow: local CV/ML + deterministic classify → unified score → dispatch;
// LLM optionally refines narrative + factors. Record success to throttle.
//
// Env:
//   CCTV_LLM_ENRICHMENT = always | smart | never   (default: smart)
//   CCTV_LLM_MIN_INTERVAL_SEC — min gap between optional LLM calls per dedup key (default: 90)
//   CCTV_LLM_CRITICAL_INTERVAL_SEC — min gap for Critical tier (default: 25)
//   CCTV_LLM_SMART_CONF_THRESHOLD — below this, always eligible for LLM in smart mode (default: 0.82)
// ============================================================

const lastSuccessfulLlmByDedupKey = new Map();

function envMode() {
  const v = (process.env.CCTV_LLM_ENRICHMENT || "smart").toLowerCase();
  if (v === "always" || v === "never") return v;
  return "smart";
}

function numEnv(name, def) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

export function recordSuccessfulCctvLlmEnrichment(dedupKey) {
  lastSuccessfulLlmByDedupKey.set(dedupKey, Date.now());
}

/** @internal */
export function _resetCctvLlmPolicyForTests() {
  lastSuccessfulLlmByDedupKey.clear();
}

/**
 * @param {object} p
 * @param {string} p.dedupKey
 * @param {string} p.tier
 * @param {boolean} p.isCompound
 * @param {number} p.classificationConfidence
 * @param {number|undefined} p.mlConfidence
 * @param {boolean} p.force
 */
export function shouldCallLLMForCVEnrichment(p) {
  const mode = envMode();
  if (mode === "never") return { call: false, reason: "CCTV_LLM_ENRICHMENT=never" };
  if (p.force) return { call: true, reason: "forceLlmEnrich" };
  if (mode === "always") return { call: true, reason: "CCTV_LLM_ENRICHMENT=always" };

  const minGapMs = numEnv("CCTV_LLM_MIN_INTERVAL_SEC", 90) * 1000;
  const criticalGapMs = numEnv("CCTV_LLM_CRITICAL_INTERVAL_SEC", 25) * 1000;
  const confTh = numEnv("CCTV_LLM_SMART_CONF_THRESHOLD", 0.82);

  const last = lastSuccessfulLlmByDedupKey.get(p.dedupKey) || 0;
  const elapsed = Date.now() - last;

  const ml = typeof p.mlConfidence === "number" ? p.mlConfidence : null;
  const effectiveConf =
    ml == null ? p.classificationConfidence : Math.min(p.classificationConfidence, ml);

  // Confident benign-ish — no narrative LLM needed
  if (p.tier === "Low" && !p.isCompound && effectiveConf >= confTh) {
    return { call: false, reason: "smart_skip_low_tier" };
  }

  if (p.tier === "Critical") {
    if (elapsed < criticalGapMs) {
      return { call: false, reason: "critical_throttle" };
    }
    return { call: true, reason: "critical_tier" };
  }

  if (p.isCompound || effectiveConf < confTh) {
    if (elapsed < minGapMs) {
      return { call: false, reason: "rate_limit" };
    }
    return { call: true, reason: p.isCompound ? "compound" : "low_confidence" };
  }

  // Medium / High with strong confidence — occasional LLM refresh only
  if (elapsed < minGapMs) {
    return { call: false, reason: "rate_limit" };
  }
  return { call: true, reason: "periodic_refresh" };
}
