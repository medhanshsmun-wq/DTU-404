import React, { useState } from 'react';
import { X, Send, Activity, Loader, MapPin } from 'lucide-react';

const LOCATIONS = [
  "Taj Hotel Mumbai - General",
  "Palace Wing - Lobby",
  "Palace Wing - Floor 1",
  "Palace Wing - Floor 2",
  "Tower Wing - Lobby",
  "Tower Wing - Floor 1",
  "Tower Wing - Floor 2",
  "Main Kitchen",
  "Sea Lounge Restaurant",
  "Crystal Ballroom",
  "Pool & Spa Area",
  "Basement / Parking",
  "Gateway Terrace",
];

const PRESETS = [
  {
    label: "Small contained kitchen fire",
    description: "Small fire detected in the main kitchen, contained to one stove. Extinguisher used. No smoke spread to corridors. 3 staff in the area, all safe.",
  },
  {
    label: "Extreme flood, rising water, blocked exits",
    description: "Extreme rainfall causing rapid water flooding in the lobby and basement. Water depth at 0.7m in lobby and rising fast. 63 guests and staff in affected ground-floor and mezzanine zones. 2 exits blocked by water. Basement parking fully submerged. Cellular connectivity is degraded.",
  },
  {
    label: "Earthquake M5.5, power out",
    description: "Earthquake felt strongly across the venue, estimated M5.5. Power is out in the Tower Wing. Guests evacuating via stairwells. Reports of cracked walls on Floor 3. Elevators are stuck. 120+ guests in Tower Wing.",
  },
  {
    label: "Smoke in escape corridor",
    description: "Heavy smoke detected in the main escape corridor on Floor 2. Fire source unknown. Visibility below 5 meters. 40 guests on Floor 2, stairwell access compromised. Sprinklers have activated.",
  },
  {
    label: "Cyclone approaching Mumbai",
    description: "IMD warning: Severe cyclonic storm approaching Mumbai coast. Expected landfall in 6 hours. Wind speeds 100+ km/h predicted. All outdoor areas unsafe. Storm surge risk along Colaba seafront.",
  },
  {
    label: "Crowd crush at ballroom event",
    description: "CCTV detects dangerous crowd density at Crystal Ballroom exit. 200+ guests trying to exit simultaneously. Crowd crush risk imminent. 2 side exits are locked.",
  },
];

function SimulatorModal({ onClose }) {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch('http://localhost:3001/api/incidents/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, location })
      });

      if (!res.ok) throw new Error("Failed to simulate incident");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to reach backend server. Ensure it is running on port 3001.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel w-full max-w-2xl rounded-2xl border border-slate-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
          <h2 className="text-xl font-bold text-white flex items-center">
            <Activity className="w-5 h-5 mr-2 text-indigo-400" />
            Simulate Crisis Event
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-400 text-sm mb-4">
            The dual-layer engine will classify the incident, compute live factor scores (Severity, People at Risk, Time to Harm, Spread, Evac Difficulty, Mesh Need), apply hard overrides, and produce an explainable priority ranking.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location selector */}
            <div>
              <label className="text-xs text-slate-500 uppercase font-semibold mb-1.5 block">
                <MapPin className="w-3 h-3 inline mr-1" />
                Venue Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-xs text-slate-500 uppercase font-semibold mb-1.5 block">
                Incident Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's happening — include details about water depth, smoke level, people count, blocked exits, etc."
                className="w-full h-32 bg-slate-900 border border-slate-700 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-sm"
                disabled={isSubmitting}
              />
            </div>

            {error && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-500/20">{error}</div>}

            {/* Presets */}
            <div>
              <div className="text-xs text-slate-500 uppercase font-semibold mb-2">Comparison Scenarios</div>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDescription(preset.description)}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 py-2 px-3 rounded-lg transition-colors text-left"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-300 hover:text-white mr-4 transition-colors text-sm font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!description.trim() || isSubmitting}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-medium transition-colors flex items-center shadow-lg shadow-indigo-500/20"
              >
                {isSubmitting ? (
                  <><Loader className="w-4 h-4 mr-2 animate-spin" /> Processing AI...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Dispatch Incident</>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SimulatorModal;
