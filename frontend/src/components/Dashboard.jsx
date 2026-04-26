import React, { useEffect, useState, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertTriangle, Activity, TrendingUp, Clock, Users,
  Thermometer, Wind, Droplets, Gauge, Cloud, Waves,
  ToggleLeft, ToggleRight, ArrowUpRight, ArrowDownRight,
  Bell, Filter, Search, RefreshCw, ChevronRight,
  Flame, Shield, Cpu, Droplet, Eye, BarChart3
} from 'lucide-react';
import IncidentCard from './IncidentCard';
import DispatchMonitor from './DispatchMonitor';
import CCTVMonitor from './CCTVMonitor';
import { API_BASE_URL } from '../config';

const SOCKET_SERVER_URL = API_BASE_URL;

function Dashboard({ onIncidentCountChange }) {
  const [incidents, setIncidents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [weather, setWeather] = useState(null);
  const [seismic, setSeismic] = useState(null);
  const [autoFeedEnabled, setAutoFeedEnabled] = useState(false);
  const [selectedView, setSelectedView] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(SOCKET_SERVER_URL);
    socketRef.current.on('connect', () => setIsConnected(true));
    socketRef.current.on('disconnect', () => setIsConnected(false));
    socketRef.current.on('incidents_update', (data) => setIncidents(data));
    socketRef.current.on('environment_update', (data) => {
      if (data.weather) setWeather(data.weather);
      if (data.seismic) setSeismic(data.seismic);
    });
    socketRef.current.on('feed_status', (data) => setAutoFeedEnabled(data.autoFeedEnabled));
    return () => socketRef.current.disconnect();
  }, []);

  const handleResolve = (id) => {
    if (socketRef.current) {
      socketRef.current.emit('resolve_incident', id);
    }
  };

  const activeIncidents = useMemo(() => incidents.filter(i => i.status === "Active"), [incidents]);
  
  useEffect(() => {
    onIncidentCountChange?.(activeIncidents.length);
  }, [activeIncidents.length, onIncidentCountChange]);

  const filteredIncidents = useMemo(() => {
    let filtered = activeIncidents;
    if (selectedView === 'critical') filtered = filtered.filter(i => i.tier === "Critical");
    if (selectedView === 'high') filtered = filtered.filter(i => i.tier === "High" || i.tier === "Critical");
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(i => 
        i.hazardType?.toLowerCase().includes(query) ||
        i.location?.toLowerCase().includes(query) ||
        i.rawDescription?.toLowerCase().includes(query)
      );
    }
    return filtered;
  }, [activeIncidents, selectedView, searchQuery]);

  const tierCounts = useMemo(() => ({
    critical: activeIncidents.filter(i => i.tier === "Critical").length,
    high: activeIncidents.filter(i => i.tier === "High").length,
    medium: activeIncidents.filter(i => i.tier === "Medium").length,
    low: activeIncidents.filter(i => i.tier === "Low").length,
  }), [activeIncidents]);

  const hasCritical = tierCounts.critical > 0;
  const avgScore = activeIncidents.length > 0
    ? (activeIncidents.reduce((sum, i) => sum + (i.score || i.finalPriority || 0), 0) / activeIncidents.length).toFixed(1)
    : "0.0";

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
    <div className="min-h-screen">
      {/* Critical Alert Banner */}
      <AnimatePresence>
        {hasCritical && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/10 border-b border-red-500/20"
          >
            <div className="px-6 py-2 flex items-center justify-center gap-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-xs font-medium">
                {tierCounts.critical} Critical Incident{tierCounts.critical > 1 ? 's' : ''} Requiring Immediate Action
              </span>
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0a0a0a]/80 backdrop-blur-xl border-b border-[#1f1f1f]">
        <div className="px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white">Command Center</h1>
            <p className="text-xs text-[#525252] mt-0.5">Real-time incident monitoring and response</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Environment Status */}
            <div className="hidden lg:flex items-center gap-4 px-4 py-2 bg-[#111111] border border-[#1f1f1f] rounded-lg">
              {weather ? (
                <>
                  <div className="flex items-center gap-1.5 text-xs">
                    <Thermometer className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-white font-medium">{weather.temperature}°C</span>
                  </div>
                  <div className="w-px h-4 bg-[#262626]" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Droplets className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-[#a1a1a1]">{weather.rain} mm</span>
                  </div>
                  <div className="w-px h-4 bg-[#262626]" />
                  <div className="flex items-center gap-1.5 text-xs">
                    <Wind className="w-3.5 h-3.5 text-cyan-400" />
                    <span className="text-[#a1a1a1]">{weather.windSpeed} km/h</span>
                  </div>
                </>
              ) : (
                <span className="text-xs text-[#525252]">Loading weather...</span>
              )}
            </div>

            {/* Seismic Status */}
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
              seismic?.status === 'Alert' ? 'bg-red-500/10 border-red-500/30' :
              seismic?.status === 'Activity' ? 'bg-yellow-500/10 border-yellow-500/30' :
              'bg-green-500/10 border-green-500/30'
            }`}>
              <Waves className={`w-3.5 h-3.5 ${
                seismic?.status === 'Alert' ? 'text-red-400' :
                seismic?.status === 'Activity' ? 'text-yellow-400' :
                'text-green-400'
              }`} />
              <span className={`text-xs font-medium ${
                seismic?.status === 'Alert' ? 'text-red-400' :
                seismic?.status === 'Activity' ? 'text-yellow-400' :
                'text-green-400'
              }`}>
                {seismic?.status || 'Normal'}
              </span>
            </div>

            {/* Auto Feed Toggle */}
            <button
              onClick={toggleAutoFeed}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${
                autoFeedEnabled
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-[#111111] border-[#262626] text-[#737373] hover:border-[#333333]'
              }`}
            >
              {autoFeedEnabled ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
              <span>Auto Sensors</span>
            </button>
          </div>
        </div>
      </header>

      <div className="p-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <StatCard 
            icon={Eye} 
            label="Active" 
            value={activeIncidents.length} 
            trend={null}
            color="blue" 
          />
          <StatCard 
            icon={AlertTriangle} 
            label="Critical" 
            value={tierCounts.critical} 
            color={tierCounts.critical > 0 ? "red" : "neutral"} 
            flash={tierCounts.critical > 0}
          />
          <StatCard 
            icon={TrendingUp} 
            label="High" 
            value={tierCounts.high} 
            color={tierCounts.high > 0 ? "orange" : "neutral"} 
          />
          <StatCard 
            icon={Clock} 
            label="Medium" 
            value={tierCounts.medium} 
            color={tierCounts.medium > 0 ? "yellow" : "neutral"} 
          />
          <StatCard 
            icon={Shield} 
            label="Low" 
            value={tierCounts.low} 
            color="neutral" 
          />
          <StatCard 
            icon={BarChart3} 
            label="Avg Score" 
            value={avgScore} 
            color="purple" 
          />
        </div>

        {/* Command Center 2x2 Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          
          {/* Quadrant 1: Active Threats */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Active Threats
            </h2>
            <div className="card p-4 h-[400px] overflow-y-auto space-y-3 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {incidents.filter(i => i.status === 'Active' || i.status === 'En Route').length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="h-full flex flex-col items-center justify-center text-center opacity-50"
                  >
                    <Shield className="w-8 h-8 mb-3 text-[#525252]" />
                    <h3 className="text-sm font-medium text-[#737373]">No Active Threats</h3>
                  </motion.div>
                ) : (
                  incidents.filter(i => i.status === 'Active' || i.status === 'En Route').map((incident, index) => (
                    <motion.div
                      key={incident.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      layout
                    >
                      <IncidentCard incident={incident} onResolve={handleResolve} />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Quadrant 2: CCTV Overview */}
          <div className="space-y-4">
            <CCTVMonitor />
          </div>

          {/* Quadrant 3: Dispatch Operations */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-400" />
              Dispatch Operations
            </h2>
            <div className="h-[400px] overflow-y-auto card p-0 border-none bg-transparent custom-scrollbar">
              <DispatchMonitor />
            </div>
          </div>

          {/* Quadrant 4: Compact Recent Incidents */}
          <div className="space-y-4 h-[440px] flex flex-col">
            {/* Feed Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-purple-400" />
                  Recent Alerts
                </h2>
                {autoFeedEnabled && (
                  <span className="live-indicator text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
                    Live
                  </span>
                )}
              </div>
            </div>

            {/* Incident List */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              <AnimatePresence mode="popLayout">
                {incidents.slice(0, 5).length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="card p-16 flex flex-col items-center justify-center text-center border-dashed"
                  >
                    <Search className="w-12 h-12 mb-4 text-[#262626]" />
                    <h3 className="text-sm font-medium text-[#a1a1a1]">No Matches</h3>
                    <p className="max-w-xs mt-2 text-xs text-[#525252] leading-relaxed">
                      No incidents match your current search and filter settings.
                    </p>
                  </motion.div>
                ) : (
                  incidents.slice(0, 5).map((incident, index) => (
                    <motion.div
                      key={incident.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      layout
                    >
                      <IncidentCard incident={incident} onResolve={handleResolve} />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Sub-Components ─────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, trend, flash }) {
  const colorStyles = {
    red: 'text-red-400',
    orange: 'text-orange-400',
    yellow: 'text-yellow-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    neutral: 'text-[#737373]',
  };

  const bgStyles = {
    red: 'bg-red-500/10',
    orange: 'bg-orange-500/10',
    yellow: 'bg-yellow-500/10',
    blue: 'bg-blue-500/10',
    purple: 'bg-purple-500/10',
    green: 'bg-green-500/10',
    neutral: 'bg-[#1a1a1a]',
  };

  return (
    <div className={`stat-card ${flash ? 'crisis-pulse border-red-500/30' : ''}`}>
      <div className="flex items-center justify-between mb-2">
        <div className={`p-1.5 rounded-lg ${bgStyles[color]}`}>
          <Icon className={`w-4 h-4 ${colorStyles[color]}`} />
        </div>
        {trend && (
          <span className={`text-[10px] font-medium flex items-center gap-0.5 ${
            trend > 0 ? 'text-red-400' : 'text-green-400'
          }`}>
            {trend > 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className={`text-2xl font-bold ${colorStyles[color]}`}>{value}</div>
      <div className="text-[11px] text-[#525252] font-medium mt-0.5">{label}</div>
    </div>
  );
}

function EngineRow({ label, value }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="text-[#525252] w-16 flex-shrink-0 font-medium">{label}</span>
      <span className="text-[#a1a1a1] font-mono text-[11px]">{value}</span>
    </div>
  );
}

function BaselineRiskPanel() {
  const baselines = [
    { type: "Fire & Hazards", score: 8.0, icon: Flame },
    { type: "Security", score: 7.5, icon: Shield },
    { type: "Flood", score: 7.0, icon: Droplet },
    { type: "Cyclone", score: 6.5, icon: Wind },
    { type: "Medical", score: 6.0, icon: Users },
    { type: "Earthquake", score: 5.5, icon: Waves },
    { type: "Infrastructure", score: 4.5, icon: Cpu },
  ];

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-xs font-semibold text-[#737373] uppercase tracking-wider">
          Risk Baseline
        </h3>
        <span className="text-[10px] text-[#525252] bg-[#1a1a1a] px-1.5 py-0.5 rounded">
          BCP 20%
        </span>
      </div>
      <p className="text-[10px] text-[#525252] mb-3">Pre-computed venue risk factors</p>
      
      <div className="space-y-2">
        {baselines.map(({ type, score, icon: Icon }) => (
          <div key={type} className="flex items-center gap-2 text-xs group">
            <Icon className="w-3.5 h-3.5 text-[#525252] flex-shrink-0" />
            <span className="text-[#737373] w-24 truncate flex-shrink-0">{type}</span>
            <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  score >= 7 ? 'bg-red-500' :
                  score >= 5 ? 'bg-yellow-500' :
                  'bg-blue-500'
                }`}
                style={{ width: `${score * 10}%` }}
              />
            </div>
            <span className={`font-mono font-semibold w-6 text-right text-[11px] ${
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
