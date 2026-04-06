// ============================================================
// SENSOR SIMULATOR — Simulated IoT / CCTV for Demo
// ============================================================
// Generates realistic sensor events for the prototype.
// Can be toggled on/off from the dashboard.
//
// Simulated sensors:
//   - Smoke detectors per zone
//   - Water level sensors (basement, lobby)
//   - Occupancy counters per zone
//   - CCTV flame/crowd detection
// ============================================================

const ZONES = [
  { id: "palace_lobby",    name: "Palace Wing - Lobby",     floor: 0 },
  { id: "tower_lobby",     name: "Tower Wing - Lobby",      floor: 0 },
  { id: "palace_f1",       name: "Palace Wing - Floor 1",   floor: 1 },
  { id: "tower_f1",        name: "Tower Wing - Floor 1",    floor: 1 },
  { id: "palace_f2",       name: "Palace Wing - Floor 2",   floor: 2 },
  { id: "tower_f2",        name: "Tower Wing - Floor 2",    floor: 2 },
  { id: "kitchen_main",    name: "Main Kitchen",            floor: 0 },
  { id: "pool_area",       name: "Pool & Spa Area",         floor: 0 },
  { id: "basement",        name: "Basement / Parking",      floor: -1 },
  { id: "sea_lounge",      name: "Sea Lounge Restaurant",   floor: 0 },
  { id: "ballroom",        name: "Crystal Ballroom",        floor: 1 },
  { id: "gateway_terrace", name: "Gateway Terrace",         floor: 0 },
];

let sensorState = {};
let simulatorTimer = null;
let isRunning = false;

// Initialize sensor state
function initSensors() {
  sensorState = {};
  for (const zone of ZONES) {
    sensorState[zone.id] = {
      zone: zone.name,
      floor: zone.floor,
      smokeLevel: 0,       // 0 = clear, 1-3 = low, 4-6 = medium, 7-10 = high
      waterLevel: 0,       // cm
      occupancy: Math.floor(Math.random() * 40) + 5,  // 5-45 people
      temperature: 24 + Math.random() * 3,             // 24-27°C
      cctvFlameDetected: false,
      cctvCrowdDensity: "normal", // normal | elevated | critical
      sprinklerActive: false,
      exitBlocked: false,
    };
  }
}

/**
 * Generate a random sensor event. Has a low probability (~5%) per tick
 * of triggering a meaningful anomaly in a random zone.
 * Returns an incident descriptor or null.
 */
function generateSensorEvent() {
  const eventRoll = Math.random();
  if (eventRoll > 0.05) return null; // 95% of the time, nothing happens

  const zone = ZONES[Math.floor(Math.random() * ZONES.length)];
  const state = sensorState[zone.id];
  const eventType = Math.random();

  if (eventType < 0.35) {
    // Smoke event
    const smokeLevel = 4 + Math.floor(Math.random() * 7); // 4-10
    state.smokeLevel = smokeLevel;
    state.temperature += 5 + Math.random() * 15;

    const severity = smokeLevel >= 7 ? "heavy" : "moderate";
    const flameDetected = Math.random() > 0.4;
    state.cctvFlameDetected = flameDetected;

    return {
      description: `Smoke detector triggered in ${zone.name}: ${severity} smoke (level ${smokeLevel}/10). Temperature rising to ${state.temperature.toFixed(1)}°C. ${flameDetected ? "CCTV flame detection POSITIVE." : "No visible flame on CCTV."} ${state.occupancy} people in zone.`,
      source: "sensor_iot",
      location: zone.name,
      sensorSignals: {
        smokeLevel,
        temperature: state.temperature.toFixed(1),
        cctvFlame: flameDetected,
        occupancy: state.occupancy,
        zone: zone.id,
        smokeInCorridor: smokeLevel >= 7 && zone.floor >= 1,
      },
    };
  } else if (eventType < 0.55) {
    // Water level event
    const waterCm = 20 + Math.floor(Math.random() * 80); // 20-100 cm
    state.waterLevel = waterCm;

    return {
      description: `Water level sensor alarm in ${zone.name}: water depth ${waterCm} cm and rising. ${state.occupancy} people in zone. ${waterCm > 50 ? "Exits partially blocked by water." : "Monitor for escalation."}`,
      source: "sensor_iot",
      location: zone.name,
      sensorSignals: {
        waterDepth: `${(waterCm / 100).toFixed(2)}m, rising`,
        occupancy: state.occupancy,
        zone: zone.id,
        blockedExits: waterCm > 50 ? Math.floor(Math.random() * 3) + 1 : 0,
      },
    };
  } else if (eventType < 0.75) {
    // Crowd density event
    const crowdCount = 80 + Math.floor(Math.random() * 120); // 80-200
    state.occupancy = crowdCount;
    state.cctvCrowdDensity = crowdCount > 150 ? "critical" : "elevated";

    return {
      description: `CCTV crowd density alert in ${zone.name}: ${crowdCount} people detected, density is ${state.cctvCrowdDensity}. Possible crowd crush risk. ${crowdCount > 150 ? "Immediate crowd management needed." : "Monitor closely."}`,
      source: "sensor_cctv",
      location: zone.name,
      sensorSignals: {
        crowdDensity: state.cctvCrowdDensity,
        occupancy: crowdCount,
        zone: zone.id,
      },
    };
  } else {
    // Sprinkler / infrastructure event
    state.sprinklerActive = true;

    return {
      description: `Sprinkler system activated in ${zone.name}. Possible fire or heat anomaly. ${state.occupancy} people in zone. Staff verification requested.`,
      source: "sensor_iot",
      location: zone.name,
      sensorSignals: {
        sprinklerActive: true,
        occupancy: state.occupancy,
        zone: zone.id,
      },
    };
  }
}

/**
 * Get current sensor state for dashboard.
 */
export function getSensorState() {
  return sensorState;
}

/**
 * Check for sensor events this tick.
 * Returns array of incident descriptors (usually 0 or 1).
 */
export function checkSensorEvents() {
  if (!isRunning) return [];
  const event = generateSensorEvent();
  return event ? [event] : [];
}

export function startSensorSimulator() {
  console.log("[SensorSimulator] Starting simulated IoT/CCTV feed");
  initSensors();
  isRunning = true;
}

export function stopSensorSimulator() {
  isRunning = false;
}

export function isSensorSimulatorRunning() {
  return isRunning;
}
