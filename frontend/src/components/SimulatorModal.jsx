import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Send, Activity, Loader2, MapPin, AlertTriangle, Flame, Droplets, Users, Heart, Shield, ChevronRight } from 'lucide-react';
import { API_BASE_URL } from '../config';

const LOCATIONS = [
  "Facility - General",
  "Main Building - Lobby",
  "Main Building - Floor 1",
  "Main Building - Floor 2",
  "East Wing - Lobby",
  "East Wing - Floor 1",
  "East Wing - Floor 2",
  "Kitchen Area",
  "Restaurant",
  "Conference Hall",
  "Pool Area",
  "Parking - Basement",
  "Outdoor Terrace",
];

const PRESETS = [
  {
    label: "Kitchen Fire",
    description: "Small fire detected in the main kitchen, contained to one stove. Extinguisher used. No smoke spread to corridors. 3 staff in the area, all safe.",
    tier: "Medium",
    icon: Flame,
    color: "orange",
  },
  {
    label: "Severe Flooding",
    description: "Extreme rainfall causing rapid water flooding in the lobby and basement. Water depth at 0.7m in lobby and rising fast. 63 guests and staff in affected ground-floor and mezzanine zones. 2 exits blocked by water. Basement parking fully submerged.",
    tier: "Critical",
    icon: Droplets,
    color: "red",
  },
  {
    label: "Earthquake Impact",
    description: "Earthquake felt strongly across the venue, estimated M5.5. Power is out in the East Wing. Guests evacuating via stairwells. Reports of cracked walls on Floor 3. Elevators are stuck. 120+ guests in East Wing.",
    tier: "Critical",
    icon: Activity,
    color: "red",
  },
  {
    label: "Medical Emergency",
    description: "Guest found unresponsive with no pulse in Room 412. Staff performing CPR. AED requested. No breathing detected. Elderly male, approximately 65 years old.",
    tier: "Critical",
    icon: Heart,
    color: "red",
  },
  {
    label: "Crowd Safety Risk",
    description: "CCTV detects dangerous crowd density at Conference Hall exit. 200+ guests trying to exit simultaneously. Crowd crush risk imminent. 2 side exits are locked.",
    tier: "Critical",
    icon: Users,
    color: "red",
  },
  {
    label: "Security Threat",
    description: "Suspicious individual reported near main entrance. Security cameras show person with concealed object. Staff have been alerted. 50+ guests in immediate area.",
    tier: "High",
    icon: Shield,
    color: "orange",
  },
];

function SimulatorModal({ onClose }) {
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedPreset, setSelectedPreset] = useState(null);

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

  const handlePresetSelect = (preset, index) => {
    setDescription(preset.description);
    setSelectedPreset(index);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-2xl bg-[#0a0a0a] border border-[#262626] rounded-xl shadow-2xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#1f1f1f]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center">
              <Activity className="w-5 h-5 text-black" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Simulate Event</h2>
              <p className="text-xs text-[#525252]">Test the priority engine with custom scenarios</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 rounded-lg hover:bg-[#1a1a1a] transition-colors text-[#525252] hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Info Banner */}
          <div className="bg-[#111111] border border-[#1f1f1f] rounded-lg p-4 mb-5">
            <p className="text-xs text-[#737373] leading-relaxed">
              The Priority Engine will classify the incident, select the appropriate domain adapter 
              (Medical / Hazard / Infrastructure), compute <span className="text-white font-medium">V/S/I/H/L/P</span> factors, 
              apply hard overrides and compound modifiers, and produce an explainable priority ranking.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Location */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
                <MapPin className="w-3.5 h-3.5" />
                Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input"
              >
                {LOCATIONS.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-[#737373] uppercase tracking-wider mb-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Incident Description
              </label>
              <textarea
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  setSelectedPreset(null);
                }}
                placeholder="Describe what's happening - include details about water depth, smoke level, people count, blocked exits, medical symptoms, etc."
                className="input h-28 resize-none"
                disabled={isSubmitting}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-xs text-red-400">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Scenario Presets */}
            <div>
              <label className="text-xs font-medium text-[#737373] uppercase tracking-wider mb-3 block">
                Quick Scenarios
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((preset, i) => {
                  const Icon = preset.icon;
                  const isSelected = selectedPreset === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handlePresetSelect(preset, i)}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        isSelected 
                          ? 'bg-[#1a1a1a] border-[#404040]' 
                          : 'bg-[#111111] border-[#1f1f1f] hover:border-[#333333]'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        preset.color === 'red' ? 'bg-red-500/10' : 'bg-orange-500/10'
                      }`}>
                        <Icon className={`w-4 h-4 ${
                          preset.color === 'red' ? 'text-red-400' : 'text-orange-400'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-white">{preset.label}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${
                            preset.tier === 'Critical' ? 'bg-red-500/15 text-red-400' :
                            preset.tier === 'High' ? 'bg-orange-500/15 text-orange-400' :
                            'bg-yellow-500/15 text-yellow-400'
                          }`}>
                            {preset.tier}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className={`w-4 h-4 text-[#404040] ${isSelected ? 'text-white' : ''}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-5 border-t border-[#1f1f1f] bg-[#0a0a0a]">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!description.trim() || isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Dispatch Event
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default SimulatorModal;
