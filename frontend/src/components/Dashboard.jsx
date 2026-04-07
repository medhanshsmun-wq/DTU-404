import React, { useEffect, useState, useMemo } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Shield, Activity, Radio, Zap, Cloud,
  Thermometer, Wind, Droplets, ToggleLeft, ToggleRight,
  AlertTriangle, Gauge, Eye, TrendingUp, Clock, Users,
  Waves, ChevronRight, Cpu, Flame, Droplet
} from 'lucide-react';
import IncidentCard from './IncidentCard';
import SimulatorModal from './SimulatorModal';
import AgentResponseServicePanel from './AgentResponseServicePanel';
import { API_BASE_URL } from '../config';

const SOCKET_SERVER_URL = API_BASE_URL;

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [weather, setWeather] = useState(null);
  const [seismic, setSeismic] = useState(null);
  const [autoFeedEnabled, setAutoFeedEnabled] = useState(false);
  const [selectedView, setSelectedView] = useState('all'); // all, critical, high

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    socket.on('incidents_update', (data) => setIncidents(data));
    socket.on('environment_update', (data) => {
      if (data.weather) setWeather(data.weather);
      if (data.seismic) setSeismic(data.seismic);
    });
    socket.on('feed_status', (data) => setAutoFeedEnabled(data.autoFeedEnabled));
    return () => socket.disconnect();
  }, []);

  const activeIncidents = useMemo(() => incidents.filter(i => i.status === "Active"), [incidents]);
  const filteredIncidents = useMemo(() => {
    if (selectedView === 'critical') return activeIncidents.filter(i => i.tier === "Critical");
    if (selectedView === 'high') return activeIncidents.filter(i => i.tier === "High" || i.tier === "Critical");
    return activeIncidents;
  }, [activeIncidents, selectedView]);

  const tierCounts = useMemo(() => ({
    critical: activeIncidents.filter(i => i.tier === "Critical").length,
    high: activeIncidents.filter(i => i.tier === "High").length,
    medium: activeIncidents.filter(i => i.tier === "Medium").length,
    low: activeIncidents.filter(i => i.tier === "Low").length,
  }), [activeIncidents]);

  const hasCritical = tierCounts.critical > 0;
  const avgScore = activeIncidents.length > 0
    ? (activeIncidents.reduce((sum, i) => sum + (i.score || i.finalPriority || 0), 0) / activeIncidents.length).toFixed(1)
    : "—";

  const toggleAutoFeed = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/feeds/toggle`, { method: 'POST' });
      const data = await res.json();
      setAutoFeedEnabled(data.autoFeedEnabled);
    } catch (err) {
      console.error("Failed to toggle feed:", err);
    }
  };

  return (
    <div className="min-h-screen relative flex flex-col z-10">
      {/* Critical Alert Banner */}
      <AnimatePresence>
        {hasCritical && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border-b border-red-500/30"
          >
            <div className="max-w-[1600px] mx-auto px-6 py-2 flex items-center justify-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-200 text-xs font-semibold tracking-wide uppercase">
                {tierCounts.critical} Critical Incident{tierCounts.critical > 1 ? 's' : ''} — Protective Actions Required
              </span>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="w-full max-w-[1600px] mx-auto px-6 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-600/30 shadow-xl">
              <Shield className="w-7 h-7 text-blue-400" />
            </div>
            {isConnected && (
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-[#06090f]" />
            )}
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Taj Hotel Nexus
              <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold tracking-widest uppercase ${
                isConnected 
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              }`}>
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">Unified Priority Engine — V/S/I/H/L/P Factor Model</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleAutoFeed}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${autoFeedEnabled
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 shadow-lg shadow-emerald-900/20'
              : 'bg-slate-800/80 border-slate-700/50 text-slate-400 hover:bg-slate-700/80'
            }`}
          >
            {autoFeedEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
            <span>Auto Sensors</span>
          </button>

          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all border border-indigo-400/30 shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/30"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Simulate Incident</span>
          </button>
        </div>
      </header>

      {/* Environment Strip */}
      <div className="w-full max-w-[1600px] mx-auto px-6">
        <div className="glass-panel rounded-xl px-5 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-5 text-xs">
            {weather ? (
              <>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                  <span className="font-medium">{weather.temperature}°C</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  <span>{weather.rain} mm/hr</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Wind className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{weather.windSpeed} km/h</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-300">
                  <Gauge className="w-3.5 h-3.5 text-violet-400" />
                  <span>{weather.pressure} hPa</span>
                </div>
              </>
            ) : (
              <span className="text-slate-600 text-xs">Loading weather data...</span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <Waves className={`w-3.5 h-3.5 ${seismic?.status === 'Alert' ? 'text-red-400' : seismic?.status === 'Activity' ? 'text-yellow-400' : 'text-emerald-400'}`} />
              <span className={`font-semibold ${seismic?.status === 'Alert' ? 'text-red-400' : seismic?.status === 'Activity' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                Seismic: {seismic?.status || "Loading..."}
              </span>
            </div>
            <div className="h-3 w-px bg-slate-700" />
            <div className="flex items-center gap-1.5">
              <Cloud className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-slate-500">Mumbai, Colaba</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Strip */}
      <div className="w-full max-w-[1600px] mx-auto px-6 mt-4">
        <div className="grid grid-cols-6 gap-3">
          <StatCard icon={Eye} label="Active" value={activeIncidents.length} color="blue" />
          <StatCard icon={AlertTriangle} label="Critical" value={tierCounts.critical} color={tierCounts.critical > 0 ? "red" : "slate"} flash={tierCounts.critical > 0} />
          <StatCard icon={TrendingUp} label="High" value={tierCounts.high} color={tierCounts.high > 0 ? "orange" : "slate"} />
          <StatCard icon={Clock} label="Medium" value={tierCounts.medium} color={tierCounts.medium > 0 ? "yellow" : "slate"} />
          <StatCard icon={Users} label="Low" value={tierCounts.low} color="slate" />
          <StatCard icon={Cpu} label="Avg Score" value={avgScore} color="indigo" />
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-[1600px] mx-auto px-6 py-5 grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1">
        {/* Left Sidebar */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-5">
          <AgentResponseServicePanel />

          {/* Engine Info */}
          <div className="glass-panel rounded-2xl p-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Unified Engine</h3>
            <div className="space-y-2">
              <EngineRow label="Formula" value="0.20×BCP + 0.80×LIS + CM" />
              <EngineRow label="LIS" value="0.30V + 0.20S + 0.20I + 0.15H + 0.10L + 0.05P" />
              <EngineRow label="Domains" value="Medical • Hazard • Infra/Crowd" />
              <EngineRow label="Overrides" value="18 deterministic rules" />
              <EngineRow label="Rerank" value="2-30s per incident type" />
            </div>
          </div>

          {/* BCP Table */}
          <BaselineRiskPanel />
        </div>

        {/* Right — Incident Feed */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col">
          {/* Feed Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-400" />
                Intelligence Feed
              </h2>
              {autoFeedEnabled && (
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                  Live
                </span>
              )}
            </div>
            {/* View Filter */}
            <div className="flex items-center bg-slate-900/80 rounded-xl border border-slate-700/40 p-0.5">
              {[
                { key: 'all', label: 'All' },
                { key: 'critical', label: 'Critical' },
                { key: 'high', label: 'High+' },
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setSelectedView(tab.key)}
                  className={`px-3 py-1.5 text-[11px] font-semibold rounded-lg transition-all ${
                    selectedView === tab.key
                      ? 'bg-slate-700/70 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Incident List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredIncidents.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-panel p-16 rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-slate-700/50"
                >
                  <Shield className="w-12 h-12 mb-4 text-slate-700" />
                  <h3 className="text-base font-semibold text-slate-400">All Clear</h3>
                  <p className="max-w-xs mt-2 text-xs text-slate-600 leading-relaxed">
                    No active incidents. The venue is secure and operating normally.
                  </p>
                </motion.div>
              ) : (
                filteredIncidents.map((incident, index) => (
                  <motion.div
                    key={incident.id}
                    initial={{ opacity: 0, y: 20, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -50, scale: 0.95 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    layout
                  >
                    <IncidentCard incident={incident} />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {isSimulatorOpen && <SimulatorModal onClose={() => setIsSimulatorOpen(false)} />}
    </div>
  );
}

// ── Sub-Components ─────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, flash }) {
  const colors = {
    red: 'text-red-400 bg-red-500/8 border-red-500/20',
    orange: 'text-orange-400 bg-orange-500/8 border-orange-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/8 border-yellow-500/20',
    blue: 'text-blue-400 bg-blue-500/8 border-blue-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/8 border-indigo-500/20',
    slate: 'text-slate-400 bg-slate-800/50 border-slate-700/30',
  };

  return (
    <div className={`glass-panel rounded-xl p-3 border ${colors[color] || colors.slate} ${flash ? 'crisis-pulse' : ''}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-3.5 h-3.5 ${colors[color]?.split(' ')[0] || 'text-slate-400'}`} />
        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">{label}</span>
      </div>
      <div className={`text-xl font-black ${colors[color]?.split(' ')[0] || 'text-slate-400'}`}>{value}</div>
    </div>
  );
}

function EngineRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 text-[11px]">
      <span className="text-slate-500 w-16 flex-shrink-0 font-medium">{label}</span>
      <span className="text-slate-300 font-mono">{value}</span>
    </div>
  );
}

function BaselineRiskPanel() {
  const baselines = [
    { type: "Fires & Hazards", score: 8.0, icon: Flame },
    { type: "Security", score: 7.5, icon: Shield },
    { type: "Flood", score: 7.0, icon: Droplet },
    { type: "Cyclone", score: 6.5, icon: Wind },
    { type: "Medical", score: 6.0, icon: Users },
    { type: "Crowd Panic", score: 6.0, icon: Users },
    { type: "Earthquake", score: 5.5, icon: Waves },
    { type: "Infrastructure", score: 4.5, icon: Cpu },
  ];

  return (
    <div className="glass-panel rounded-2xl p-4">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Base Context Prior (BCP)</h3>
      <p className="text-[10px] text-slate-600 mb-3">Long-term venue risk — affects 20% of final score</p>
      <div className="space-y-1.5">
        {baselines.map(({ type, score, icon: Icon }) => (
          <div key={type} className="flex items-center gap-2 text-[11px] group">
            <Icon className="w-3 h-3 text-slate-600 flex-shrink-0" />
            <span className="text-slate-400 w-24 truncate flex-shrink-0">{type}</span>
            <div className="flex-1 h-1 bg-slate-800/80 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  score >= 7 ? 'bg-gradient-to-r from-red-500/80 to-orange-500/80' :
                  score >= 5 ? 'bg-gradient-to-r from-yellow-500/80 to-amber-400/80' :
                  'bg-gradient-to-r from-blue-500/80 to-cyan-400/80'
                }`}
                style={{ width: `${score * 10}%` }}
              />
            </div>
            <span className={`font-mono font-bold w-5 text-right ${
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

export default Dashboard;
