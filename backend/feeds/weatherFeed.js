// ============================================================
// WEATHER FEED — Open-Meteo (Free, No API Key)
// ============================================================
// Polls current weather for Taj Hotel Mumbai (18.922°N, 72.835°E)
// every 30 seconds. Exposes current state and can auto-generate
// weather incidents when thresholds are breached.
// ============================================================

const MUMBAI_LAT = 18.922;
const MUMBAI_LON = 72.835;
const POLL_INTERVAL_MS = 30_000;

let currentWeather = null;
let pollTimer = null;

/**
 * Fetch the latest weather from Open-Meteo.
 */
async function fetchWeather() {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${MUMBAI_LAT}&longitude=${MUMBAI_LON}&current=temperature_2m,relative_humidity_2m,rain,weather_code,wind_speed_10m,surface_pressure&timezone=Asia/Kolkata`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
    const data = await res.json();

    currentWeather = {
      temperature:  data.current.temperature_2m,
      humidity:     data.current.relative_humidity_2m,
      rain:         data.current.rain,           // mm in last hour
      windSpeed:    data.current.wind_speed_10m,  // km/h
      pressure:     data.current.surface_pressure,
      weatherCode:  data.current.weather_code,
      fetchedAt:    new Date().toISOString(),
    };
  } catch (err) {
    console.warn("[WeatherFeed] Fetch failed:", err.message);
  }
}

/**
 * Check if current weather crosses danger thresholds.
 * Returns an array of auto-incident descriptors (may be empty).
 */
export function checkWeatherThresholds() {
  if (!currentWeather) return [];
  const incidents = [];

  // Heavy rainfall → flood risk
  if (currentWeather.rain > 30) {
    incidents.push({
      description: `Extreme rainfall detected: ${currentWeather.rain} mm/hr. Urban flooding risk is high near Colaba. Basement and lobby inundation possible. Road access may be compromised.`,
      source: "weather_feed",
      sensorSignals: {
        rainIntensity: `${currentWeather.rain} mm/hr`,
        floodRisk: "high",
      },
    });
  } else if (currentWeather.rain > 15) {
    incidents.push({
      description: `Heavy rainfall: ${currentWeather.rain} mm/hr near venue. Monitor for water accumulation in low-lying areas.`,
      source: "weather_feed",
      sensorSignals: {
        rainIntensity: `${currentWeather.rain} mm/hr`,
        floodRisk: "moderate",
      },
    });
  }

  // Extreme wind → cyclone / storm risk
  if (currentWeather.windSpeed > 80) {
    incidents.push({
      description: `Extreme wind speed: ${currentWeather.windSpeed} km/h. Possible cyclone conditions. Flying debris risk, window damage, and outdoor area hazard.`,
      source: "weather_feed",
      sensorSignals: {
        windSpeed: `${currentWeather.windSpeed} km/h`,
        cycloneRisk: "high",
      },
    });
  } else if (currentWeather.windSpeed > 50) {
    incidents.push({
      description: `High wind advisory: ${currentWeather.windSpeed} km/h. Secure outdoor furniture and monitor facade integrity.`,
      source: "weather_feed",
      sensorSignals: {
        windSpeed: `${currentWeather.windSpeed} km/h`,
        cycloneRisk: "moderate",
      },
    });
  }

  // Rapid pressure drop → storm system
  if (currentWeather.pressure < 1000) {
    incidents.push({
      description: `Low atmospheric pressure: ${currentWeather.pressure} hPa. Indicates approaching storm system over Arabian Sea.`,
      source: "weather_feed",
      sensorSignals: {
        pressure: `${currentWeather.pressure} hPa`,
        stormApproaching: true,
      },
    });
  }

  return incidents;
}

/**
 * Get the current weather state (for dashboard display).
 */
export function getCurrentWeather() {
  return currentWeather;
}

/**
 * Start the weather polling loop.
 */
export function startWeatherFeed() {
  console.log("[WeatherFeed] Starting Open-Meteo poller for Mumbai (30s interval)");
  fetchWeather(); // immediate first fetch
  pollTimer = setInterval(fetchWeather, POLL_INTERVAL_MS);
}

/**
 * Stop the weather polling loop.
 */
export function stopWeatherFeed() {
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = null;
}
