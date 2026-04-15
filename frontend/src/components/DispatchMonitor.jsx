import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import {
  Radio, Clock, CheckCircle, AlertTriangle, Shield,
  Phone, PhoneCall, PhoneOutgoing, Mail, ChevronDown, ChevronUp, Siren,
  Truck, Building2, User, Users, Zap, Activity, Workflow,
  Volume2, UserCheck, MapPin, MessageSquare
} from 'lucide-react';
import { API_BASE_URL } from '../config';

const URGENCY_COLORS = {
  critical: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400' },
  high: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
  normal: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
};

const CALL_STATUS_COLORS = {
  queued: 'text-[#525252]',
  initiated: 'text-yellow-400',
  ringing: 'text-amber-400',
  connected: 'text-blue-400',
  delivered: 'text-green-400',
  failed: 'text-red-400',
};

function DispatchMonitor() {
  const [dispatches, setDispatches] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/dispatch/active`)
      .then((r) => r.json())
      .then(setDispatches)
      .catch(() => {});

    const socket = io(API_BASE_URL);
    socket.on('dispatch_update', (dispatch) => {
      setDispatches((prev) => {
        const exists = prev.findIndex((d) => d.id === dispatch.id);
        if (exists >= 0) {
          const updated = [...prev];
          updated[exists] = dispatch;
          return updated;
        }
        return [dispatch, ...prev].slice(0, 20);
      });
    });

    socket.on('dispatch_log', (log) => {
      if (Array.isArray(log) && log.length > 0) {
        setDispatches(log);
      }
    });

    return () => socket.disconnect();
  }, []);

  const activeCount = dispatches.filter((d) => d.status === 'dispatched').length;
  const totalCalls = dispatches.reduce((sum, d) => sum + (d.voiceCalls?.length || 0), 0);
  const totalPersonnel = dispatches.reduce((sum, d) => sum + (d.personnelDeployed?.length || 0), 0);

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center">
            <Workflow className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Dispatch Monitor</h3>
            <p className="text-[10px] text-[#525252]">Autonomous routing + voice dispatch</p>
          </div>
        </div>
        {activeCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full border border-amber-500/20">
            <Siren className="w-3 h-3" />
            {activeCount} Active
          </span>
        )}
      </div>

      {/* Quick Stats */}
      {(totalCalls > 0 || totalPersonnel > 0) && (
        <div className="flex items-center gap-3 px-4 py-2 border-b border-[#1f1f1f] bg-[#0d0d0d]">
          {totalCalls > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-cyan-400">
              <PhoneOutgoing className="w-3 h-3" /> {totalCalls} voice calls
            </span>
          )}
          {totalPersonnel > 0 && (
            <span className="flex items-center gap-1 text-[9px] text-violet-400">
              <Users className="w-3 h-3" /> {totalPersonnel} deployed
            </span>
          )}
        </div>
      )}

      {/* Dispatch List */}
      <div className="max-h-[420px] overflow-y-auto">
        {dispatches.length === 0 ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-3">
              <Shield className="w-5 h-5 text-[#525252]" />
            </div>
            <p className="text-xs text-[#525252] max-w-[200px]">
              No dispatches yet. Incidents will be automatically routed with voice calls and personnel deployment.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#1f1f1f]">
            <AnimatePresence>
              {dispatches.slice(0, 15).map((dispatch) => (
                <DispatchItem
                  key={dispatch.id}
                  dispatch={dispatch}
                  isExpanded={expanded === dispatch.id}
                  onToggle={() => setExpanded(expanded === dispatch.id ? null : dispatch.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}

function DispatchItem({ dispatch, isExpanded, onToggle }) {
  const urgencyStyle = URGENCY_COLORS[dispatch.actions?.[0]?.urgency] || URGENCY_COLORS.normal;
  const isActive = dispatch.status === 'dispatched';
  const timeAgo = getTimeAgo(dispatch.timestamp);
  const hasVoiceCalls = dispatch.voiceCalls?.length > 0;
  const hasPersonnel = dispatch.personnelDeployed?.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="p-3 hover:bg-[#141414] transition-colors"
    >
      <button onClick={onToggle} className="w-full text-left">
        {/* Summary Row */}
        <div className="flex items-start gap-2.5">
          {/* Status Dot */}
          <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
            isActive ? 'bg-amber-500 animate-pulse' :
            dispatch.status === 'all_acknowledged' ? 'bg-green-500' :
            dispatch.status === 'resolved' ? 'bg-[#525252]' :
            'bg-blue-500'
          }`} />

          <div className="flex-1 min-w-0">
            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1 mb-1">
              <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded ${urgencyStyle.bg} ${urgencyStyle.text} border ${urgencyStyle.border}`}>
                {dispatch.autonomyLevel}
              </span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                dispatch.tier === 'Critical' ? 'bg-red-500/15 text-red-400' :
                dispatch.tier === 'High' ? 'bg-orange-500/15 text-orange-400' :
                dispatch.tier === 'Medium' ? 'bg-yellow-500/15 text-yellow-400' :
                'bg-green-500/15 text-green-400'
              }`}>
                {dispatch.tier}
              </span>
              {dispatch.isCompound && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400">
                  <Zap className="w-2.5 h-2.5 inline" /> Compound
                </span>
              )}
            </div>

            {/* Title */}
            <p className="text-[11px] font-medium text-white truncate">
              {dispatch.hazardType} — {dispatch.location}
            </p>

            {/* Quick indicators */}
            <div className="flex items-center gap-2 mt-1">
              {hasVoiceCalls && (
                <span className="flex items-center gap-0.5 text-[9px] text-cyan-400">
                  <PhoneCall className="w-2.5 h-2.5" /> {dispatch.voiceCalls.length}
                </span>
              )}
              {hasPersonnel && (
                <span className="flex items-center gap-0.5 text-[9px] text-violet-400">
                  <UserCheck className="w-2.5 h-2.5" /> {dispatch.personnelDeployed.length}
                </span>
              )}
              <span className="text-[9px] text-[#525252]">{timeAgo}</span>
            </div>
          </div>

          {/* Score */}
          <div className="flex-shrink-0 text-right">
            <div className={`text-sm font-bold tabular-nums ${
              dispatch.score >= 8 ? 'text-red-400' :
              dispatch.score >= 6 ? 'text-orange-400' :
              dispatch.score >= 4 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {dispatch.score?.toFixed?.(1) || dispatch.score}
            </div>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-[#525252] mx-auto mt-0.5" />
            ) : (
              <ChevronDown className="w-3 h-3 text-[#525252] mx-auto mt-0.5" />
            )}
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 pt-2 border-t border-[#1f1f1f] space-y-3">

              {/* Authority Actions */}
              <div>
                <div className="text-[9px] text-[#525252] uppercase tracking-wider font-semibold mb-1.5">
                  Authority Dispatch
                </div>
                <div className="space-y-1.5">
                  {(dispatch.actions || []).map((action, i) => (
                    <div key={i} className="flex items-start gap-2 bg-[#0a0a0a] rounded-lg p-2">
                      <div className="w-6 h-6 rounded bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                        {action.authorityType === 'external' ? (
                          <Siren className="w-3 h-3 text-red-400" />
                        ) : (
                          <Shield className="w-3 h-3 text-blue-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-semibold text-white">{action.authorityName}</span>
                          <span className={`text-[8px] px-1 py-0.5 rounded ${
                            action.actionType === 'auto_dispatch' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                          }`}>
                            {action.actionType === 'auto_dispatch' ? 'DISPATCH' : 'NOTIFY'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] text-[#525252] flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" /> {action.phone}
                          </span>
                          {action.voiceCall && (
                            <span className={`text-[9px] flex items-center gap-0.5 ${CALL_STATUS_COLORS[action.voiceCall.status] || 'text-[#525252]'}`}>
                              <Volume2 className="w-2.5 h-2.5" /> {action.voiceCall.status}
                            </span>
                          )}
                          <span className={`text-[9px] ${
                            action.status === 'acknowledged' ? 'text-green-400' : 'text-[#525252]'
                          }`}>
                            {action.status === 'acknowledged' ? (
                              <><CheckCircle className="w-2.5 h-2.5 inline" /> Ack'd</>
                            ) : (
                              <><Clock className="w-2.5 h-2.5 inline" /> Pending</>
                            )}
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] text-[#525252]">~{action.estimatedResponseMin}m</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Voice Calls */}
              {dispatch.voiceCalls?.length > 0 && (
                <div>
                  <div className="text-[9px] text-[#525252] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                    <PhoneOutgoing className="w-3 h-3 text-cyan-400" /> Voice Calls
                  </div>
                  <div className="space-y-1">
                    {dispatch.voiceCalls.map((call, i) => (
                      <div key={i} className="flex items-center gap-2 bg-cyan-500/5 border border-cyan-500/10 rounded-lg px-2 py-1.5">
                        <PhoneCall className={`w-3 h-3 flex-shrink-0 ${CALL_STATUS_COLORS[call.status]}`} />
                        <div className="flex-1 min-w-0">
                          <span className="text-[10px] text-white font-medium">{call.authorityName}</span>
                          <span className="text-[9px] text-[#525252] ml-1">{call.phone}</span>
                        </div>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${
                          call.status === 'delivered' ? 'bg-green-500/15 text-green-400' :
                          call.status === 'connected' ? 'bg-blue-500/15 text-blue-400' :
                          call.status === 'initiated' || call.status === 'ringing' ? 'bg-amber-500/15 text-amber-400 animate-pulse' :
                          'bg-[#1a1a1a] text-[#525252]'
                        }`}>
                          {call.status?.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Personnel Deployed */}
              {dispatch.personnelDeployed?.length > 0 && (
                <div>
                  <div className="text-[9px] text-[#525252] uppercase tracking-wider font-semibold mb-1.5 flex items-center gap-1">
                    <Users className="w-3 h-3 text-violet-400" /> Personnel Deployed ({dispatch.personnelDeployed.length})
                  </div>
                  <div className="space-y-1">
                    {dispatch.personnelDeployed.map((dep, i) => (
                      <div key={i} className="flex items-start gap-2 bg-violet-500/5 border border-violet-500/10 rounded-lg px-2 py-1.5">
                        <User className="w-3 h-3 text-violet-400 mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-white font-medium">{dep.name}</span>
                            <span className="text-[8px] text-violet-400 bg-violet-500/10 px-1 py-0.5 rounded">{dep.role}</span>
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            <MapPin className="w-2.5 h-2.5 text-[#525252]" />
                            <span className="text-[9px] text-[#737373]">{dep.fromZone}</span>
                            <span className="text-[9px] text-[#525252]">→</span>
                            <span className="text-[9px] text-amber-400 font-medium">{dep.toZone}</span>
                          </div>
                          {dep.order && (
                            <p className="text-[8px] text-[#525252] mt-1 leading-relaxed line-clamp-2">
                              {dep.order}
                            </p>
                          )}
                        </div>
                        <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded flex-shrink-0 ${
                          dep.status === 'on_scene' ? 'bg-green-500/15 text-green-400' :
                          dep.status === 'en_route' ? 'bg-blue-500/15 text-blue-400' :
                          dep.status === 'dispatched' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-[#1a1a1a] text-[#525252]'
                        }`}>
                          {dep.status?.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function getTimeAgo(timestamp) {
  const diff = Date.now() - new Date(timestamp).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default DispatchMonitor;
