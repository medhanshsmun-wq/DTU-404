import React from 'react';

const BASELINES = [
  { type: "Fires & Hazards",    score: 8.0 },
  { type: "Security Threats",   score: 7.5 },
  { type: "Flood",              score: 7.0 },
  { type: "Cyclone",            score: 6.5 },
  { type: "External Threats",   score: 6.5 },
  { type: "Medical",            score: 6.0 },
  { type: "Crowd Panic",        score: 6.0 },
  { type: "Earthquake",         score: 5.5 },
  { type: "Storm Surge",        score: 5.0 },
  { type: "Infrastructure",     score: 4.5 },
  { type: "Health Risks",       score: 4.0 },
  { type: "Missing Persons",    score: 3.5 },
  { type: "Landslide",          score: 3.0 },
];

function BaselineTable() {
  return (
    <div className="glass-panel p-5 rounded-2xl">
      <h2 className="text-sm font-semibold text-white mb-3">Baseline Risk Priors</h2>
      <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
        Pre-computed long-term risk for Taj Hotel Mumbai. Affects 20% of the final priority.
      </p>
      <div className="space-y-2">
        {BASELINES.map(({ type, score }) => (
          <div key={type} className="flex items-center text-xs">
            <span className="text-slate-400 w-28 truncate flex-shrink-0">{type}</span>
            <div className="flex-1 mx-2 h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  score >= 7 ? 'bg-gradient-to-r from-red-500 to-orange-500' :
                  score >= 5 ? 'bg-gradient-to-r from-yellow-500 to-orange-400' :
                  'bg-gradient-to-r from-blue-500 to-cyan-400'
                }`}
                style={{ width: `${score * 10}%` }}
              />
            </div>
            <span className={`font-mono font-bold w-6 text-right ${
              score >= 7 ? 'text-red-400' : score >= 5 ? 'text-yellow-400' : 'text-blue-400'
            }`}>
              {score}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BaselineTable;
