// ============================================================
// EARTHQUAKE FEED — USGS GeoJSON (Free, No API Key)
// ============================================================
// Polls USGS real-time earthquake feed every 60 seconds.
// Filters for quakes within ~500 km of Mumbai.
// Auto-generates incidents for M ≥ 4.0.
// ============================================================

const MUMBAI_LAT = 18.922;
const MUMBAI_LON = 72.835;
const MAX_DISTANCE_KM = 500;
const POLL_INTERVAL_MS = 60_000;
const USGS_FEED_URL = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_hour.geojson";

let latestQuakes = [];
let seenQuakeIds = new Set();
let pollTimer = null;

/**
 * Haversine distance between two lat/lon points in km.
 */
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fetch latest earthquakes from USGS.
 */
async function fetchQuakes() {
  try {
    const res = await fetch(USGS_FEED_URL);
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const data = await res.json();

    // Filter for quakes near Mumbai
    latestQuakes = (data.features || [])
      .filter((f) => {
        const [lon, lat] = f.geometry.coordinates;
        return haversineKm(MUMBAI_LAT, MUMBAI_LON, lat, lon) <= MAX_DISTANCE_KM;
      })
      .map((f) => ({
        id: f.id,
        magnitude: f.properties.mag,
        place: f.properties.place,
        time: new Date(f.properties.time).toISOString(),
        distance: Math.round(
          haversineKm(MUMBAI_LAT, MUMBAI_LON, f.geometry.coordinates[1], f.geometry.coordinates[0])
        ),
        depth: f.geometry.coordinates[2],
      }));
  } catch (err) {
    console.warn("[EarthquakeFeed] Fetch failed:", err.message);
  }
}

/**
 * Check for NEW quakes that should auto-generate incidents.
 * Returns array of incident descriptors for quakes M ≥ 4.0
 * that haven't been seen before.
 */
export function checkEarthquakeThresholds() {
  const incidents = [];

  for (const quake of latestQuakes) {
    if (seenQuakeIds.has(quake.id)) continue;
    if (quake.magnitude < 4.0) continue;

    seenQuakeIds.add(quake.id);

    const severity = quake.magnitude >= 6.0 ? "major" : quake.magnitude >= 5.0 ? "significant" : "moderate";

    incidents.push({
      description: `Earthquake detected: M${quake.magnitude} ${severity} earthquake at ${quake.place}, ${quake.distance} km from venue. Depth: ${quake.depth} km. Check structural integrity, activate seismic protocol.`,
      source: "earthquake_feed",
      sensorSignals: {
        earthquakeMagnitude: quake.magnitude,
        earthquakeDistance: `${quake.distance} km`,
        earthquakeDepth: `${quake.depth} km`,
        earthquakePlace: quake.place,
      },
    });
  }

  return incidents;
}

/**
 * Get latest quake data for dashboard display.
 */
export function getLatestQuakes() {
  return latestQuakes;
}

/**
 * Get seismic status summary.
 */
export function getSeismicStatus() {
  if (latestQuakes.length === 0) {
    return { status: "Clear", recentQuakes: 0, maxMagnitude: null };
  }
  const maxMag = Math.max(...latestQuakes.map((q) => q.magnitude));
  return {
    status: maxMag >= 5.0 ? "Alert" : maxMag >= 3.0 ? "Activity" : "Minor",
    recentQuakes: latestQuakes.length,
    maxMagnitude: maxMag,
  };
}

export function startEarthquakeFeed() {
  console.log("[EarthquakeFeed] Starting USGS poller for Mumbai region (60s interval)");
  fetchQuakes();
  pollTimer = setInterval(fetchQuakes, POLL_INTERVAL_MS);
}

export function stopEarthquakeFeed() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}
