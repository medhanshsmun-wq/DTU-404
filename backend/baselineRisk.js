// ============================================================
// BASELINE RISK PRIORS — Taj Hotel Mumbai (Colaba)
// ============================================================
// These are static, venue-specific hazard priors scored 0-10.
// They represent the LONG-TERM historical risk at THIS location.
//
// Context:  Taj Mahal Palace Hotel, Colaba, Mumbai
//   - Coastal location (Arabian Sea) → flood, cyclone, storm surge
//   - Seismic Zone III → moderate earthquake risk
//   - Monsoon season (Jun-Sep) → extreme rainfall, urban flooding
//   - Dense urban hospitality → fire, crowd, security risks
//   - 2008 attack history → elevated security baseline
// ============================================================

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
