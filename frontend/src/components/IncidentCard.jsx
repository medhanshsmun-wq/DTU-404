import React, { useState } from 'react';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Zap, ShieldAlert, Target, Clock, ArrowUpRight,
  DoorOpen, Wifi
} from 'lucide-react';

const BAND_STYLES = {
  Extreme: {
    bg: 'bg-red-500/10', border: 'border-red-500/50', text: 'text-red-400',
    strip: 'bg-gradient-to-b from-red-600 to-red-400 shadow-[0_0_15px_rgba(239,68,68,0.5)]',
    pulse: true,
  },
  High: {
    bg: 'bg-orange-500/10', border: 'border-orange-500/50', text: 'text-orange-400',
    strip: 'bg-gradient-to-b from-orange-500 to-orange-400',
    pulse: false,
  },
  Medium: {
    bg: 'bg-yellow-500/10', border: 'border-yellow-500/50', text: 'text-yellow-400',
    strip: 'bg-gradient-to-b from-yellow-500 to-yellow-400',
    pulse: false,
  },
  Low: {
    bg: 'bg-blue-500/10', border: 'border-blue-500/50', text: 'text-blue-400',
    strip: 'bg-gradient-to-b from-blue-500 to-blue-400',
    pulse: false,
  },
};

const FACTOR_ICONS = {
  currentSeverity: ShieldAlert,
  peopleAtRisk: Target,
  timeToHarm: Clock,
  spreadPotential: ArrowUpRight,
  evacuationDifficulty: DoorOpen,
  meshOfflineNeed: Wifi,
};

const FACTOR_LABELS = {
  currentSeverity: "Severity",
  peopleAtRisk: "People at Risk",
  timeToHarm: "Time to Harm",
  spreadPotential: "Spread",
  evacuationDifficulty: "Evac Difficulty",
  meshOfflineNeed: "Mesh Need",
};

const SOURCE_LABELS = {
  manual: "Manual Report",
  weather_feed: "Weather Feed",
  earthquake_feed: "Seismic Feed",
  sensor_iot: "IoT Sensor",
  sensor_cctv: "CCTV Detection",
};

function IncidentCard({ incident }) {
  const [expanded, setExpanded] = useState(false);
  const band = BAND_STYLES[incident.priorityBand] || BAND_STYLES.Low;

  const getScoreColor = (score) => {
    if (score >= 8) return 'text-red-400';
    if (score >= 5) return 'text-orange-400';
    return 'text-emerald-400';
  };

  const confidenceColor = incident.confidence >= 0.8 ? 'text-emerald-400' :
                          incident.confidence >= 0.6 ? 'text-yellow-400' : 'text-red-400';

  return (
    <div className={`glass-panel rounded-2xl relative overflow-hidden ${band.pulse ? 'crisis-high' : ''}`}>
      {/* Color strip */}
      <div className={`absolute top-0 left-0 w-2 h-full ${band.strip}`} />

      <div className="pl-6 pr-5 py-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className={`px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider border ${band.bg} ${band.border} ${band.text}`}>
                {incident.priorityBand}
              </span>
              {incident.isCompound && (
                <span className="bg-fuchsia-500/20 text-fuchsia-400 border border-fuchsia-500/30 px-2 py-0.5 rounded text-xs font-semibold flex items-center">
                  <Zap className="w-3 h-3 mr-1" /> Compound
                </span>
              )}
              {incident.overrideApplied && (
                <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded text-xs font-semibold flex items-center">
                  <AlertTriangle className="w-3 h-3 mr-1" /> Override
                </span>
              )}
              <span className="text-[10px] text-slate-500 font-medium bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                {SOURCE_LABELS[incident.source] || incident.source}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-lg font-semibold text-white leading-tight">
              {incident.isCompound
                ? incident.compoundTypes?.join(' + ')
                : incident.hazardType}
            </h3>

            {/* Location + time */}
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
              <span>{incident.location}</span>
              <span>•</span>
              <span>{new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
            </div>

            {/* Description */}
            <p className="mt-2 text-sm text-slate-400 italic line-clamp-2">"{incident.rawDescription}"</p>
          </div>

          {/* Score Block */}
          <div className="flex-shrink-0 w-40 bg-slate-900/70 border border-slate-700 rounded-xl p-4 text-center">
            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold mb-1">Priority</div>
            <div className={`text-4xl font-black ${getScoreColor(incident.finalPriority)}`}>
              {incident.finalPriority?.toFixed(1)}
            </div>
            <div className="text-slate-600 text-xs">/10</div>
            <div className="mt-2 flex items-center justify-center space-x-1">
              <span className="text-[10px] text-slate-500">Confidence:</span>
              <span className={`text-xs font-bold ${confidenceColor}`}>
                {(incident.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="mt-1 text-[9px] text-slate-600">
              Base {incident.baselineRisk} × 0.20 + Live {incident.liveScore} × 0.80
            </div>
          </div>
        </div>

        {/* Explanation bullets */}
        {incident.explanation && incident.explanation.length > 0 && (
          <div className="mt-4 bg-slate-800/40 border border-slate-700/50 rounded-lg p-3">
            <div className="text-xs font-semibold text-white mb-2">Why ranked {incident.priorityBand?.toLowerCase()}:</div>
            <ul className="space-y-1">
              {incident.explanation.map((bullet, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start">
                  <span className="text-slate-500 mr-2 mt-0.5">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Override reason */}
        {incident.overrideApplied && incident.overrideReason && (
          <div className="mt-3 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-amber-400 flex items-start">
            <AlertTriangle className="w-3.5 h-3.5 mr-2 mt-0.5 flex-shrink-0" />
            <span><strong>Hard Override:</strong> {incident.overrideReason}</span>
          </div>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-xs text-slate-500 hover:text-slate-300 flex items-center transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
          {expanded ? "Hide details" : "Show actions & factor breakdown"}
        </button>

        {expanded && (
          <div className="mt-4 space-y-4">
            {/* Live Factor Breakdown */}
            {incident.liveFactorBreakdown && (
              <div>
                <div className="text-xs font-semibold text-white mb-3">Live Factor Breakdown</div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(incident.liveFactorBreakdown).map(([key, { value, weight }]) => {
                    const Icon = FACTOR_ICONS[key] || ShieldAlert;
                    return (
                      <div key={key} className="bg-slate-800/50 border border-slate-700/40 rounded-lg p-2.5 flex items-center space-x-2">
                        <Icon className={`w-4 h-4 flex-shrink-0 ${getScoreColor(value)}`} />
                        <div className="min-w-0">
                          <div className="text-[10px] text-slate-500 truncate">{FACTOR_LABELS[key]}</div>
                          <div className="flex items-baseline space-x-1">
                            <span className={`text-sm font-bold ${getScoreColor(value)}`}>{value}</span>
                            <span className="text-[9px] text-slate-600">×{weight}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recommended Actions */}
            {incident.recommendedActions && incident.recommendedActions.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-white mb-2">Recommended Actions</div>
                <div className="space-y-1.5">
                  {incident.recommendedActions.map((action, i) => (
                    <div key={i} className="flex items-start text-xs bg-slate-800/30 border border-slate-700/30 rounded-lg px-3 py-2">
                      <CheckCircle className="w-3.5 h-3.5 mr-2 mt-0.5 text-emerald-500 flex-shrink-0" />
                      <span className="text-slate-300">{action}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default IncidentCard;
