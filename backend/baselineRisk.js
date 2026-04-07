// ============================================================
// BASE CONTEXT PRIOR (BCP) — Unified Priority Engine
// ============================================================
// BCP is the slow-moving context score (0-10). It is NOT the 
// live severity score. It represents long-term historical risk
// at THIS specific venue.
//
// Context: Taj Mahal Palace Hotel, Colaba, Mumbai
//   - Coastal location (Arabian Sea) → flood, cyclone, storm surge
//   - Seismic Zone III → moderate earthquake risk
//   - Monsoon season (Jun-Sep) → extreme rainfall, urban flooding
//   - Dense urban hospitality → fire, crowd, security risks
//   - 2008 attack history → elevated security baseline
//
// Domains:
//   - Hazard: coastal/seismic/monsoon exposure
//   - Medical: venue event context, demographics
//   - Infrastructure: building age, redundancy, BMS dependence
// ============================================================

// ── Hazard BCP Values (venue-specific) ────────────────────
export const BASELINE_RISKS = {
  "Fires and Hazards":        8.0,
  "Flood":                    7.0,
  "Cyclone":                  6.5,
  "Earthquake":               5.5,
  "Storm Surge":              5.0,
  "Landslide":                3.0,
  "Medical Emergencies":      6.0,
  "Security Threats":         7.5,
  "Crowd Panic":              6.0,
  "Infrastructure Failures":  4.5,
  "Health Risks":             4.0,
  "Missing Persons":          3.5,
  "External Threats":         6.5,
};

// ── Medical BCP Components ────────────────────────────────
// From spec Section 4: age/frailty, chronic disease, allergy, 
// pregnancy/mobility, event context
const MEDICAL_BCP_BASE = 5.0;

// ── Infrastructure BCP Components ─────────────────────────
// From spec Section 4: building age, redundancy, BMS/cloud
// dependence, event-load, prior outages
const INFRA_BCP_COMPONENTS = {
  buildingAge: 1.5,           // Heritage building (1903) → high
  redundancyGap: 1.0,         // Moderate redundancy
  bmsDependence: 1.0,         // Smart building systems
  occupancyDensity: 1.0,      // High-density events common
  priorOutageHistory: 0.5,    // Some history
};
const INFRA_BCP_BASE = Object.values(INFRA_BCP_COMPONENTS).reduce((a, b) => a + b, 0);

/**
 * Look up the baseline risk for a given hazard type.
 * Falls back to 5.0 (moderate) for unknown types.
 */
export function getBaselineRisk(hazardType) {
  // Try exact match first
  if (BASELINE_RISKS[hazardType] !== undefined) {
    return BASELINE_RISKS[hazardType];
  }

  // Fuzzy match — check if the hazard type contains a known key
  const lowerHazard = hazardType.toLowerCase();
  for (const [key, value] of Object.entries(BASELINE_RISKS)) {
    if (lowerHazard.includes(key.toLowerCase()) || key.toLowerCase().includes(lowerHazard)) {
      return value;
    }
  }

  // Default moderate risk for unknowns
  return 5.0;
}

/**
 * For compound crises, return the MAX baseline of all involved types.
 */
export function getCompoundBaselineRisk(hazardTypes) {
  if (!Array.isArray(hazardTypes) || hazardTypes.length === 0) return 5.0;
  return Math.max(...hazardTypes.map(getBaselineRisk));
}

/**
 * Get domain-specific BCP.
 * Hazard: uses the BASELINE_RISKS lookup table.
 * Medical: uses base + optional patient context modifiers.
 * Infrastructure: uses component-based calculation.
 */
export function getDomainBCP(hazardType, domain, incident = {}) {
  switch (domain) {
    case "medical":
      return computeMedicalBCP(incident);
    case "hazard":
      return getBaselineRisk(hazardType);
    case "infrastructure_crowd":
      return computeInfraBCP(incident);
    default:
      return getBaselineRisk(hazardType);
  }
}

/**
 * Medical BCP: accounts for patient-specific context.
 * In the absence of patient data (common in a hotel), uses defaults.
 */
function computeMedicalBCP(incident) {
  let bcp = MEDICAL_BCP_BASE;
  const desc = (incident.rawDescription || "").toLowerCase();

  // Age/frailty modifier (+0-1.5)
  if (desc.includes("elderly") || desc.includes("aged") || desc.includes("senior")) {
    bcp += 1.5;
  } else if (desc.includes("child") || desc.includes("infant") || desc.includes("baby")) {
    bcp += 1.0;
  }

  // Event context modifier (+0-1.0)
  if (desc.includes("pool") || desc.includes("spa") || desc.includes("water")) {
    bcp += 0.5; // drowning risk context
  }
  if (desc.includes("alcohol") || desc.includes("bar") || desc.includes("party")) {
    bcp += 0.5; // alcohol-related medical risk
  }

  // Chronic condition modifier (+0-1.0)
  if (desc.includes("diabetic") || desc.includes("heart condition") || desc.includes("asthma")) {
    bcp += 1.0;
  }

  // Isolation modifier (+0-0.5)
  if (desc.includes("locked room") || desc.includes("alone") || desc.includes("isolated")) {
    bcp += 0.5;
  }

  return Math.min(10, bcp);
}

/**
 * Infrastructure BCP: accounts for building and system context.
 */
function computeInfraBCP(incident) {
  let bcp = INFRA_BCP_BASE;
  const desc = (incident.rawDescription || "").toLowerCase();

  // Event-load modifier (+0-1.0)
  if (desc.includes("event") || desc.includes("banquet") || desc.includes("conference") || desc.includes("full capacity")) {
    bcp += 1.0;
  }

  // Peak-hour modifier (+0-0.5)
  const hour = new Date().getHours();
  if (hour >= 18 && hour <= 23) {
    bcp += 0.5; // Evening peak
  }

  return Math.min(10, bcp);
}
