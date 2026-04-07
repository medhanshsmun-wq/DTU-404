import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Activity, Loader, MapPin, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';

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
    label: "Kitchen fire — contained",
    description: "Small fire detected in the main kitchen, contained to one stove. Extinguisher used. No smoke spread to corridors. 3 staff in the area, all safe.",
    tier: "Low/Medium",
  },
  {
    label: "Extreme flood — blocked exits",
    description: "Extreme rainfall causing rapid water flooding in the lobby and basement. Water depth at 0.7m in lobby and rising fast. 63 guests and staff in affected ground-floor and mezzanine zones. 2 exits blocked by water. Basement parking fully submerged.",
    tier: "Critical",
  },
  {
    label: "Earthquake M5.5 — power out",
    description: "Earthquake felt strongly across the venue, estimated M5.5. Power is out in the Tower Wing. Guests evacuating via stairwells. Reports of cracked walls on Floor 3. Elevators are stuck. 120+ guests in Tower Wing.",
    tier: "Critical",
  },
  {
    label: "Smoke in escape corridor",
    description: "Heavy smoke detected in the main escape corridor on Floor 2. Fire source unknown. Visibility below 5 meters. 40 guests on Floor 2, stairwell access compromised. Sprinklers have activated.",
    tier: "Critical",
  },
  {
    label: "Guest cardiac arrest",
    description: "Guest found unresponsive with no pulse in Room 412. Staff performing CPR. AED requested. No breathing detected. Elderly male, approximately 65 years old.",
    tier: "Critical",
  },
  {
    label: "Crowd crush at ballroom",
    description: "CCTV detects dangerous crowd density at Crystal Ballroom exit. 200+ guests trying to exit simultaneously. Crowd crush risk imminent. 2 side exits are locked.",
    tier: "Critical",
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
      const res = await fetch(`${API_BASE_URL}/api/incidents/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, location })
      });

      if (!res.ok) throw new Error("Failed to simulate incident");
      onClose();
    } catch (err) {
      console.error(err);
      setError("Failed to reach backend. Ensure it is running.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#06090f]/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="glass-panel-elevated w-full max-w-2xl rounded-2xl border border-slate-600/30 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center p-5 border-b border-slate-700/30">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            Simulate Crisis Event
          </h2>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700/50">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-slate-500 text-xs mb-4 leading-relaxed">
            The Unified Priority Engine will classify the incident, select the domain adapter (Medical / Hazard / Infrastructure+Crowd), compute <strong className="text-slate-300">V/S/I/H/L/P</strong> factors, apply hard overrides and compound modifiers, and produce an explainable priority ranking.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Location */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Venue Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:ring-1 focus:ring-indigo-500/50"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-1.5 block">
                Incident Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe what's happening — include details about water depth, smoke level, people count, blocked exits, medical symptoms, etc."
                className="w-full h-28 bg-slate-900/80 border border-slate-700/50 rounded-xl p-3 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-xs resize-none"
                disabled={isSubmitting}
              />
            </div>

            {error && (
              <div className="text-red-400 text-xs bg-red-500/8 p-2.5 rounded-lg border border-red-500/15">{error}</div>
            )}

            {/* Presets */}
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mb-2">Scenario Presets</div>
              <div className="grid grid-cols-2 gap-1.5">
                {PRESETS.map((preset, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setDescription(preset.description)}
                    className="text-[11px] bg-slate-800/60 hover:bg-slate-700/60 text-slate-300 border border-slate-700/40 py-2 px-3 rounded-lg transition-colors text-left flex items-center justify-between gap-2 group"
                  >
                    <span>{preset.label}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                      preset.tier === 'Critical' ? 'bg-red-500/15 text-red-400' :
                      preset.tier === 'High' ? 'bg-orange-500/15 text-orange-400' :
                      'bg-slate-700/50 text-slate-500'
                    } opacity-0 group-hover:opacity-100 transition-opacity`}>
                      {preset.tier}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-400 hover:text-white text-xs font-medium transition-colors rounded-lg hover:bg-slate-800/50"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!description.trim() || isSubmitting}
                className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-30 text-white px-5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/15"
              >
                {isSubmitting ? (
                  <><Loader className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                ) : (
                  <><Send className="w-3.5 h-3.5" /> Dispatch Incident</>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default SimulatorModal;
