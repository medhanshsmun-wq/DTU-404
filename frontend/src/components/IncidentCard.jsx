import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, CheckCircle, ChevronDown, ChevronUp,
  Zap, Clock, MapPin, Radio, Brain, RefreshCw,
  Activity, Gauge, Heart, Flame, Users, Shield,
  DoorOpen, Siren, ExternalLink, Copy, MoreHorizontal
} from 'lucide-react';

const TIER_CONFIG = {
  Critical: {
    bg: 'bg-red-500/8',
    border: 'border-red-500/30',
    text: 'text-red-400',
    badgeBg: 'badge-critical',
    indicator: 'bg-red-500',
    glow: 'tier-critical',
    pulse: true,
  },
  High: {
    bg: 'bg-orange-500/8',
    border: 'border-orange-500/25',
    text: 'text-orange-400',
    badgeBg: 'badge-high',
    indicator: 'bg-orange-500',
    glow: 'tier-high',
    pulse: false,
  },
  Medium: {
    bg: 'bg-yellow-500/6',
    border: 'border-yellow-500/20',
    text: 'text-yellow-400',
    badgeBg: 'badge-medium',
    indicator: 'bg-yellow-500',
    glow: 'tier-medium',
    pulse: false,
  },
  Low: {
    bg: 'bg-green-500/6',
    border: 'border-green-500/20',
    text: 'text-green-400',
    badgeBg: 'badge-low',
    indicator: 'bg-green-500',
    glow: 'tier-low',
    pulse: false,
  },
};

const FACTOR_META = {
  V: { label: "Vital", fullLabel: "Life Threat", icon: Heart, color: "text-red-400", bg: "bg-red-500/10" },
  S: { label: "Severity", fullLabel: "Spread Risk", icon: Flame, color: "text-orange-400", bg: "bg-orange-500/10" },
  I: { label: "Intervention", fullLabel: "Response Need", icon: Siren, color: "text-amber-400", bg: "bg-amber-500/10" },
  H: { label: "Hazard", fullLabel: "Context Risk", icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10" },
  L: { label: "Location", fullLabel: "Access Level", icon: DoorOpen, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  P: { label: "Population", fullLabel: "Impact Scope", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
};

const DOMAIN_LABELS = {
  medical: { label: "Medical", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/20" },
  hazard: { label: "Hazard", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  infrastructure_crowd: { label: "Infrastructure", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/20" },
};

const SOURCE_LABELS = {
  manual: "Manual",
  weather_feed: "Weather",
  earthquake_feed: "Seismic",
  sensor_iot: "IoT",
  sensor_cctv: "CCTV",
};

const AUTONOMY_LABELS = {
  A0: "Log Only",
  A1: "Notify Staff",
  A2: "Dispatch",
  A3: "Auto-Protect",
  A4: "Escalate",
};

function IncidentCard({ incident, onResolve }) {
  const [expanded, setExpanded] = useState(false);
  const tier = TIER_CONFIG[incident.tier || incident.priorityBand] || TIER_CONFIG.Low;
  const score = incident.score ?? incident.finalPriority ?? 0;
  const confidence = incident.confidence ?? 0;
  const domain = DOMAIN_LABELS[incident.domain] || DOMAIN_LABELS.hazard;

  const getScoreColor = (s) => {
    if (s >= 8) return 'text-red-400';
    if (s >= 6) return 'text-orange-400';
    if (s >= 4) return 'text-yellow-400';
    return 'text-green-400';
  };

  return (
    <div className={`card relative overflow-hidden ${tier.glow} ${tier.pulse ? 'crisis-pulse' : ''}`}>
      {/* Status Indicator */}
      <div className={`absolute top-0 left-0 w-1 h-full ${tier.indicator}`} />

      <div className="p-4 pl-5">
        {/* Header Row */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              <span className={`badge ${tier.badgeBg}`}>
                {incident.tier || incident.priorityBand}
              </span>

              <span className={`badge ${domain.bg} ${domain.color} border ${domain.border}`}>
                {domain.label}
              </span>

              {incident.autonomyLevel && (
                <span className={`autonomy-badge autonomy-${incident.autonomyLevel}`}>
                  {incident.autonomyLevel}
                </span>
              )}

              {incident.isCompound && (
                <span className="badge bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  <Zap className="w-3 h-3" />
                  Compound
                </span>
              )}

              {incident.overrideApplied && (
                <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <AlertTriangle className="w-3 h-3" />
                  Override
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-sm font-semibold text-white leading-tight">
              {incident.isCompound
                ? incident.compoundTypes?.join(' + ')
                : incident.hazardType}
            </h3>

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[11px] text-[#525252]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {incident.location}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(incident.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              <span className="flex items-center gap-1">
                <Radio className="w-3 h-3" />
                {SOURCE_LABELS[incident.source] || incident.source}
              </span>
              {incident.rerankAfterSec && (
                <span className="flex items-center gap-1 text-blue-400">
                  <RefreshCw className="w-3 h-3" />
                  {incident.rerankAfterSec}s
                </span>
              )}
            </div>

            {/* Description */}
            <p className="mt-2 text-xs text-[#737373] line-clamp-2">
              {incident.rawDescription}
            </p>
          </div>

          {/* Score Panel */}
          <div className="flex-shrink-0 w-28">
            <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-3 text-center">
              <div className="text-[9px] text-[#525252] uppercase tracking-widest font-semibold mb-0.5">
                Priority
              </div>
              <div className={`text-2xl font-bold tabular-nums ${getScoreColor(score)}`}>
                {score.toFixed?.(1) || score}
              </div>
              <div className="text-[10px] text-[#525252]">/10</div>

              {/* Confidence */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] text-[#525252]">Conf.</span>
                  <span className={`text-[10px] font-semibold ${
                    confidence >= 0.8 ? 'text-green-400' : confidence >= 0.6 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {(confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${
                      confidence >= 0.8 ? 'bg-green-500' : confidence >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${confidence * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Factor Pills */}
        {incident.factors && (
          <div className="grid grid-cols-6 gap-1.5 mt-3">
            {Object.entries(FACTOR_META).map(([key, meta]) => {
              const value = incident.factors[key] ?? 0;
              return <FactorPill key={key} code={key} value={value} meta={meta} />;
            })}
          </div>
        )}

        {/* Explanation */}
        {incident.explanation && incident.explanation.length > 0 && (
          <div className="mt-3 bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2.5">
            <ul className="space-y-1">
              {incident.explanation.slice(0, expanded ? undefined : 2).map((bullet, i) => (
                <li key={i} className="text-[11px] text-[#a1a1a1] flex items-start gap-2">
                  <span className={`mt-0.5 ${tier.text}`}>
                    <ChevronDown className="w-3 h-3 rotate-[-90deg]" />
                  </span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Override Reason */}
        {incident.overrideApplied && incident.overrideReason && (
          <div className="mt-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2 text-[11px] text-amber-400/90 flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <span><strong>Override:</strong> {incident.overrideReason}</span>
          </div>
        )}

        {/* Actions Row */}
        <div className="mt-3 flex items-center justify-between">
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[11px] text-[#525252] hover:text-white flex items-center gap-1 transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {expanded ? "Show less" : "Show details"}
          </button>
          
          {onResolve && (
            <button
              onClick={() => onResolve(incident.id)}
              className="text-[11px] font-medium px-2.5 py-1 bg-[#1a1a1a] hover:bg-green-500/20 text-[#a1a1a1] hover:text-green-400 border border-[#262626] hover:border-green-500/30 rounded flex items-center gap-1.5 transition-all"
            >
              <CheckCircle className="w-3 h-3" />
              Mark as Resolved
            </button>
          )}
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-4 space-y-4">
                {/* Factor Breakdown */}
                {incident.liveFactorBreakdown && (
                  <div>
                    <div className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-purple-400" />
                      Factor Analysis
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {Object.entries(incident.liveFactorBreakdown).map(([key, { value, weight, label }]) => {
                        const meta = FACTOR_META[key] || {};
                        const Icon = meta.icon || Activity;
                        return (
                          <div key={key} className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-2.5">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className={`w-3.5 h-3.5 ${meta.color || 'text-[#525252]'}`} />
                              <span className="text-[10px] text-[#525252] truncate">{label || meta.fullLabel || key}</span>
                            </div>
                            <div className="flex items-baseline gap-1.5">
                              <span className={`text-base font-bold ${getScoreColor(value)}`}>{value}</span>
                              <span className="text-[9px] text-[#525252] font-mono">x {weight}</span>
                              <span className="text-[9px] text-[#525252] font-mono">= {(value * weight).toFixed(2)}</span>
                            </div>
                            <div className="progress-bar mt-1.5">
                              <div
                                className={`progress-bar-fill ${meta.color?.replace('text-', 'bg-') || 'bg-[#525252]'}`}
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
                      <Siren className="w-3.5 h-3.5 text-green-400" />
                      Recommended Actions
                    </div>
                    <div className="space-y-1">
                      {incident.recommendedActions.map((action, i) => (
                        <div key={i} className="flex items-start text-[11px] bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg px-3 py-2 gap-2">
                          <CheckCircle className="w-3 h-3 mt-0.5 text-green-500/70 flex-shrink-0" />
                          <span className="text-[#a1a1a1]">{action}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sensor Signals */}
                {incident.sensorSignals && Object.keys(incident.sensorSignals).length > 0 && (
                  <div>
                    <div className="text-[11px] font-semibold text-white mb-2 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-blue-400" />
                      Sensor Data
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(incident.sensorSignals).map(([key, val]) => (
                        <span key={key} className="text-[10px] bg-[#0a0a0a] text-[#a1a1a1] border border-[#1f1f1f] px-2 py-1 rounded font-mono">
                          {key}: <strong className="text-white">{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val)}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Formula Breakdown */}
                <div className="bg-[#0a0a0a] border border-[#1f1f1f] rounded-lg p-3">
                  <div className="text-[10px] text-[#525252] font-mono">
                    Score = BCP({incident.bcp}) x 0.20 + LIS({incident.lis}) x 0.80
                    {incident.compoundModifier > 0 && (
                      <span className="text-purple-400"> + CM({incident.compoundModifier})</span>
                    )}
                  </div>
                </div>
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
    <div className={`${meta.bg} border border-[#1f1f1f] rounded-lg px-2 py-1.5 text-center`}>
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className={`w-2.5 h-2.5 ${meta.color}`} />
        <span className={`text-[9px] font-semibold ${meta.color}`}>{code}</span>
      </div>
      <div className={`text-sm font-bold tabular-nums ${
        value >= 8 ? 'text-red-400' : value >= 6 ? 'text-orange-400' : value >= 4 ? 'text-yellow-400' : 'text-green-400'
      }`}>
        {typeof value === 'number' ? value.toFixed(1) : value}
      </div>
      <div className="h-0.5 bg-[#1a1a1a] rounded-full mt-1 overflow-hidden">
        <div className={`h-full rounded-full ${meta.color.replace('text-', 'bg-')}`} style={{ width: `${pct}%`, opacity: 0.6 }} />
      </div>
    </div>
  );
}

export default IncidentCard;
