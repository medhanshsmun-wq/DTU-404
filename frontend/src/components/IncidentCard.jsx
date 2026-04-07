import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Zap, ShieldAlert, Target, Clock, ArrowUpRight,
  DoorOpen, Wifi, Shield, Siren, Brain, RefreshCw,
  Activity, Gauge, Heart, Flame, Users
} from 'lucide-react';

const TIER_CONFIG = {
  Critical: {
    bg: 'bg-red-500/8',
    border: 'border-red-500/40',
    text: 'text-red-400',
    badgeBg: 'bg-red-500/15',
    strip: 'bg-gradient-to-b from-red-500 to-red-600',
    glow: 'tier-critical',
    pulse: true,
    scoreColor: 'text-red-400',
  },
  High: {
    bg: 'bg-orange-500/8',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    badgeBg: 'bg-orange-500/15',
    strip: 'bg-gradient-to-b from-orange-500 to-amber-500',
    glow: 'tier-high',
    pulse: false,
    scoreColor: 'text-orange-400',
  },
  Medium: {
    bg: 'bg-yellow-500/6',
    border: 'border-yellow-500/25',
    text: 'text-yellow-400',
    badgeBg: 'bg-yellow-500/15',
    strip: 'bg-gradient-to-b from-yellow-500 to-yellow-600',
    glow: 'tier-medium',
    pulse: false,
    scoreColor: 'text-yellow-400',
  },
  Low: {
    bg: 'bg-blue-500/6',
    border: 'border-blue-500/20',
    text: 'text-blue-400',
    badgeBg: 'bg-blue-500/15',
    strip: 'bg-gradient-to-b from-blue-500 to-blue-600',
    glow: 'tier-low',
    pulse: false,
    scoreColor: 'text-blue-400',
  },
};

const FACTOR_META = {
  V: { label: "Vital / Life Threat", icon: Heart, color: "text-red-400" },
  S: { label: "Severity / Spread", icon: Flame, color: "text-orange-400" },
  I: { label: "Intervention Need", icon: Siren, color: "text-amber-400" },
  H: { label: "Hazard Context", icon: Shield, color: "text-violet-400" },
  L: { label: "Location / Access", icon: DoorOpen, color: "text-cyan-400" },
  P: { label: "Population Impact", icon: Users, color: "text-blue-400" },
};

const DOMAIN_LABELS = {
  medical: { label: "Medical", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/25" },
  hazard: { label: "Hazard", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/25" },
  infrastructure_crowd: { label: "Infrastructure/Crowd", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/25" },
};

const SOURCE_LABELS = {
  manual: "Manual Report",
  weather_feed: "Weather Feed",
  earthquake_feed: "Seismic Feed",
  sensor_iot: "IoT Sensor",
  sensor_cctv: "CCTV Pipeline",
};

const AUTONOMY_LABELS = {
  A0: "Log Only",
  A1: "Notify Staff",
  A2: "Dispatch Responders",
  A3: "Auto-Protective",
  A4: "External Escalation",
};

function IncidentCard({ incident }) {
  const [expanded, setExpanded] = useState(false);
  const tier = TIER_CONFIG[incident.tier || incident.priorityBand] || TIER_CONFIG.Low;
  const score = incident.score ?? incident.finalPriority ?? 0;
  const confidence = incident.confidence ?? 0;
  const domain = DOMAIN_LABELS[incident.domain] || DOMAIN_LABELS.hazard;

  const getScoreColor = (s) => {
    if (s >= 8) return 'text-red-400';
    if (s >= 6) return 'text-orange-400';
    if (s >= 4) return 'text-yellow-400';
    return 'text-blue-400';
  };

  return (
    <div className={`glass-panel rounded-2xl relative overflow-hidden ${tier.glow} ${tier.pulse ? 'crisis-pulse' : ''}`}>
      {/* Color strip */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${tier.strip}`} />

      <div className="pl-5 pr-5 py-4">
        {/* Top Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges Row */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {/* Tier Badge */}
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${tier.badgeBg} ${tier.border} ${tier.text}`}>
                {incident.tier || incident.priorityBand}
              </span>

              {/* Domain Badge */}
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${domain.bg} ${domain.border} ${domain.color}`}>
                {domain.label}
              </span>

              {/* Autonomy Badge */}
              {incident.autonomyLevel && (
                <span className={`autonomy-badge autonomy-${incident.autonomyLevel}`}>
                  {incident.autonomyLevel}: {AUTONOMY_LABELS[incident.autonomyLevel] || incident.autonomyLevel}
                </span>
              )}

              {/* Compound Badge */}
              {incident.isCompound && (
                <span className="bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/25 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5" /> Compound
                </span>
              )}

              {/* Override Badge */}
              {incident.overrideApplied && (
                <span className="bg-amber-500/15 text-amber-400 border border-amber-500/25 px-2 py-0.5 rounded-md text-[10px] font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-2.5 h-2.5" /> Override
                </span>
              )}

              {/* Source */}
              <span className="text-[9px] text-slate-500 font-medium bg-slate-800/60 px-2 py-0.5 rounded border border-slate-700/50 ml-auto">
                {SOURCE_LABELS[incident.source] || incident.source}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-base font-semibold text-white leading-tight">
              {incident.isCompound
                ? incident.compoundTypes?.join(' + ')
                : incident.hazardType}
            </h3>

            {/* Location + Time + Rerank */}
            <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500">
              <span>{incident.location}</span>
              <span>•</span>
              <span>{new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              {incident.rerankAfterSec && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <RefreshCw className="w-2.5 h-2.5" />
                    {incident.rerankAfterSec}s rerank
                  </span>
                </>
              )}
            </div>

            {/* Description */}
            <p className="mt-2 text-xs text-slate-400 italic line-clamp-2">"{incident.rawDescription}"</p>
          </div>

          {/* Score Block */}
          <div className="flex-shrink-0 w-36">
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl p-3.5 text-center score-animate">
              <div className="text-[9px] text-slate-500 uppercase tracking-widest font-bold mb-1">Priority</div>
              <div className={`text-3xl font-black tabular-nums ${tier.scoreColor}`}>
                {score.toFixed?.(1) || score}
              </div>
              <div className="text-slate-600 text-[10px] font-medium">/10</div>

              {/* Confidence Bar */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-slate-500">Confidence</span>
                  <span className={`text-[10px] font-bold ${confidence >= 0.8 ? 'text-emerald-400' : confidence >= 0.6 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      confidence >= 0.8 ? 'bg-emerald-500' : confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
              </div>

              {/* Compact formula */}
              <div className="mt-2 text-[8px] text-slate-600 font-mono leading-relaxed">
                BCP {incident.bcp} × 0.20 + LIS {incident.lis} × 0.80
                {incident.compoundModifier > 0 && <span className="text-fuchsia-400"> + CM {incident.compoundModifier}</span>}
              </div>
            </div>
          </div>
        </div>

        {/* V/S/I/H/L/P Factor Bar — Always Visible */}
        {incident.factors && (
          <div className="mt-3 grid grid-cols-6 gap-1.5">
            {Object.entries(FACTOR_META).map(([key, meta]) => {
              const value = incident.factors[key] ?? 0;
              return (
                <FactorPill key={key} code={key} value={value} meta={meta} />
              );
            })}
          </div>
        )}

        {/* Explanation bullets */}
        {incident.explanation && incident.explanation.length > 0 && (
          <div className="mt-3 bg-slate-800/30 border border-slate-700/30 rounded-lg p-2.5">
            <ul className="space-y-1">
              {incident.explanation.slice(0, expanded ? undefined : 2).map((bullet, i) => (
                <li key={i} className="text-[11px] text-slate-300 flex items-start">
                  <span className={`mr-2 mt-0.5 text-[10px] font-bold ${tier.text}`}>›</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Override reason */}
        {incident.overrideApplied && incident.overrideReason && (
          <div className="mt-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 text-[11px] text-amber-400/90 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>Hard Override:</strong> {incident.overrideReason}</span>
          </div>
        )}

        {/* Expand/Collapse */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2.5 text-[11px] text-slate-500 hover:text-slate-300 flex items-center transition-colors"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5 mr-1" /> : <ChevronDown className="w-3.5 h-3.5 mr-1" />}
          {expanded ? "Collapse" : "Show actions & full breakdown"}
        </button>

        {/* Expanded Details */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-4">
                {/* Detailed Factor Breakdown */}
                {incident.liveFactorBreakdown && (
                  <div>
                    <div className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-indigo-400" />
                      Factor Analysis (V/S/I/H/L/P)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(incident.liveFactorBreakdown).map(([key, { value, weight, label }]) => {
                        const meta = FACTOR_META[key] || {};
                        const Icon = meta.icon || Activity;
                        return (
                          <div key={key} className="bg-slate-800/40 border border-slate-700/30 rounded-lg p-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className={`w-3.5 h-3.5 ${meta.color || 'text-slate-400'}`} />
                              <span className="text-[10px] text-slate-500 truncate">{label || meta.label || key}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-lg font-black ${getScoreColor(value)}`}>{value}</span>
                              <span className="text-[9px] text-slate-600 font-mono">× {weight}</span>
                              <span className="text-[9px] text-slate-600 font-mono">= {(value * weight).toFixed(2)}</span>
                            </div>
                            {/* Mini bar */}
                            <div className="h-0.5 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${meta.color?.replace('text-', 'bg-') || 'bg-slate-400'}`}
                                style={{ width: `${value * 10}%`, opacity: 0.7 }}
                              />
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
                    <div className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Siren className="w-3.5 h-3.5 text-emerald-400" />
                      Recommended Actions
                    </div>
                    <div className="space-y-1">
                      {incident.recommendedActions.map((action, i) => (
                        <div key={i} className="flex items-start text-[11px] bg-slate-800/20 border border-slate-700/20 rounded-lg px-3 py-2 gap-2">
                          <CheckCircle className="w-3 h-3 mt-0.5 text-emerald-500/70 flex-shrink-0" />
                          <span className="text-slate-300">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Raw Sensor Signals */}
                {incident.sensorSignals && Object.keys(incident.sensorSignals).length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-violet-400" />
                      Sensor Signals
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(incident.sensorSignals).map(([key, val]) => (
                        <span key={key} className="text-[10px] bg-slate-800/50 text-slate-300 border border-slate-700/30 px-2 py-1 rounded font-mono">
                          {key}: <strong>{typeof val === 'boolean' ? (val ? '✓' : '✗') : String(val)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function FactorPill({ code, value, meta }) {
  const Icon = meta.icon;
  const pct = Math.min(value * 10, 100);
  return (
    <div className="bg-slate-800/30 border border-slate-700/20 rounded-lg px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={`w-2.5 h-2.5 ${meta.color}`} />
        <span className={`text-[10px] font-bold ${meta.color}`}>{code}</span>
      </div>
      <div className={`text-sm font-black tabular-nums ${
        value >= 8 ? 'text-red-400' : value >= 6 ? 'text-orange-400' : value >= 4 ? 'text-yellow-400' : 'text-blue-400'
      }`}>
        {typeof value === 'number' ? value.toFixed(1) : value}
      </div>
      {/* Mini bar */}
      <div className="h-0.5 bg-slate-800 rounded-full mt-1 overflow-hidden">
        <div className={`h-full rounded-full ${meta.color.replace('text-', 'bg-')}`} style={{ width: `${pct}%`, opacity: 0.6 }} />
      </div>
    </div>
  );
}

export default IncidentCard;
