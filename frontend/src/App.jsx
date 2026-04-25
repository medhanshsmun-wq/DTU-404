import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import SimulatorModal from './components/SimulatorModal';
import { API_BASE_URL } from './config';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('overview');
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [incidentCount, setIncidentCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Socket connection for status
  useEffect(() => {
    const socket = io(API_BASE_URL);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    return () => socket.disconnect();
  }, []);

  const handleViewChange = (view) => {
    if (view === 'simulate') {
      setIsSimulatorOpen(true);
    } else {
      setActiveView(view);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={handleViewChange}
        incidentCount={incidentCount}
        isConnected={isConnected}
      />

      {/* Main Content */}
      <main className="main-content">
        {activeView === 'overview' || activeView === 'incidents' ? (
          <Dashboard onIncidentCountChange={setIncidentCount} />
        ) : activeView === 'analytics' ? (
          <AnalyticsView />
        ) : activeView === 'sensors' ? (
          <SensorsView />
        ) : activeView === 'alerts' ? (
          <AlertsView />
        ) : activeView === 'settings' ? (
          <SettingsView />
        ) : (
          <Dashboard onIncidentCountChange={setIncidentCount} />
        )}
      </main>

      {/* Simulator Modal */}
      {isSimulatorOpen && (
        <SimulatorModal onClose={() => setIsSimulatorOpen(false)} />
      )}
    </div>
  );
}

// Placeholder Views
function AnalyticsView() {
  // ── Mock Analytics Data ──────────────────────────────
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hoveredZone, setHoveredZone] = useState(null);

  const weeklyIncidents = [
    { day: 'Mon', total: 12, critical: 2, high: 3, medium: 4, low: 3 },
    { day: 'Tue', total: 18, critical: 4, high: 5, medium: 6, low: 3 },
    { day: 'Wed', total: 9, critical: 1, high: 2, medium: 3, low: 3 },
    { day: 'Thu', total: 24, critical: 6, high: 7, medium: 7, low: 4 },
    { day: 'Fri', total: 15, critical: 3, high: 4, medium: 5, low: 3 },
    { day: 'Sat', total: 20, critical: 5, high: 5, medium: 6, low: 4 },
    { day: 'Sun', total: 8, critical: 1, high: 2, medium: 3, low: 2 },
  ];

  const tierDistribution = [
    { tier: 'Critical', count: 22, color: '#ef4444' },
    { tier: 'High', count: 28, color: '#f97316' },
    { tier: 'Medium', count: 34, color: '#eab308' },
    { tier: 'Low', count: 22, color: '#22c55e' },
  ];

  const sourceDistribution = [
    { source: 'IoT Sensors', count: 38, color: '#3b82f6' },
    { source: 'CCTV Vision', count: 24, color: '#8b5cf6' },
    { source: 'Guest Reports', count: 18, color: '#d4af37' },
    { source: 'Weather Feed', count: 12, color: '#06b6d4' },
    { source: 'Manual', count: 8, color: '#ec4899' },
    { source: 'Earthquake', count: 6, color: '#f97316' },
  ];

  const zoneIncidents = [
    { zone: 'Main Kitchen', count: 18 },
    { zone: 'Palace Lobby', count: 14 },
    { zone: 'Pool & Spa', count: 11 },
    { zone: 'Tower F1', count: 9 },
    { zone: 'Basement', count: 8 },
    { zone: 'Ballroom', count: 7 },
    { zone: 'Sea Lounge', count: 5 },
    { zone: 'Terrace', count: 4 },
  ];

  const hourlyTrend = [
    3, 2, 1, 1, 0, 1, 2, 5, 8, 12, 15, 14,
    16, 13, 11, 10, 12, 14, 18, 15, 10, 8, 5, 4,
  ];

  const responseTimeData = [
    { range: '<1m', count: 12, color: '#22c55e' },
    { range: '1-3m', count: 28, color: '#3b82f6' },
    { range: '3-5m', count: 22, color: '#eab308' },
    { range: '5-10m', count: 18, color: '#f97316' },
    { range: '>10m', count: 8, color: '#ef4444' },
  ];

  const factorAverages = [
    { factor: 'V', label: 'Vulnerability', value: 6.2 },
    { factor: 'S', label: 'Speed', value: 5.8 },
    { factor: 'I', label: 'Impact', value: 7.1 },
    { factor: 'H', label: 'Historical', value: 4.9 },
    { factor: 'L', label: 'Location', value: 5.4 },
    { factor: 'P', label: 'Preparedness', value: 3.8 },
  ];

  const dispatchStats = [
    { authority: 'Hotel Security', dispatches: 42, avgResponse: '1.8m', icon: '🛡️' },
    { authority: 'Fire Brigade', dispatches: 8, avgResponse: '8.2m', icon: '🚒' },
    { authority: 'Medical/EMS', dispatches: 6, avgResponse: '11.5m', icon: '🚑' },
    { authority: 'Engineering', dispatches: 18, avgResponse: '4.3m', icon: '🔧' },
    { authority: 'Police', dispatches: 3, avgResponse: '9.7m', icon: '🚔' },
    { authority: 'Management', dispatches: 15, avgResponse: '3.1m', icon: '👔' },
  ];

  const totalIncidents = tierDistribution.reduce((s, t) => s + t.count, 0);
  const maxZone = Math.max(...zoneIncidents.map(z => z.count));
  const maxHour = Math.max(...hourlyTrend);
  const totalSources = sourceDistribution.reduce((s, d) => s + d.count, 0);
  const maxResponseTime = Math.max(...responseTimeData.map(r => r.count));

  return (
    <div className="p-6">
      {/* Header with freshness badge */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Analytics Dashboard</h1>
          <p className="text-xs text-[#525252] mt-0.5">Performance metrics, trends, and incident intelligence</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#525252] bg-[#111111] border border-[#1f1f1f] px-3 py-1.5 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-green" />
          <span>Last updated: just now</span>
        </div>
      </div>

      {/* ── KPI Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'This Week', value: '106', change: '+12%', positive: false, accent: '#ef4444' },
          { label: 'Avg Response', value: '2.3m', change: '-18%', positive: true, accent: '#22c55e' },
          { label: 'Resolution Rate', value: '94%', change: '+3%', positive: true, accent: '#3b82f6' },
          { label: 'Auto-Dispatched', value: '78%', change: '+15%', positive: true, accent: '#8b5cf6' },
          { label: 'Sensor Uptime', value: '99.9%', change: '0%', positive: true, accent: '#06b6d4' },
          { label: 'AI Accuracy', value: '97.2%', change: '+1.2%', positive: true, accent: '#d4af37' },
        ].map((stat, i) => (
          <div key={i} className="card-glow p-4 relative overflow-hidden stagger-item">
            {/* Gradient accent strip */}
            <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg, ${stat.accent}, transparent)` }} />
            <div className="text-[10px] text-[#525252] uppercase tracking-wider font-medium mb-1">{stat.label}</div>
            <div className="text-xl font-bold text-white count-pop">{stat.value}</div>
            <div className={`text-[10px] font-medium mt-1 ${
              stat.change === '0%' ? 'text-[#525252]' :
              stat.positive ? 'text-green-400' : 'text-red-400'
            }`}>
              {stat.positive && stat.change !== '0%' ? '↗' : stat.change !== '0%' ? '↘' : '→'} {stat.change} vs last week
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Pie + Bar ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">

        {/* Tier Distribution — Donut Chart */}
        <div className="card-glow p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <h3 className="text-sm font-semibold text-white">Incident Distribution by Tier</h3>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  let cumulative = 0;
                  return tierDistribution.map((tier, i) => {
                    const pct = (tier.count / totalIncidents) * 100;
                    const dashArray = `${pct * 2.512} ${251.2 - pct * 2.512}`;
                    const dashOffset = -(cumulative * 2.512);
                    cumulative += pct;
                    return (
                      <circle
                        key={i}
                        cx="50" cy="50" r="40"
                        fill="none"
                        stroke={tier.color}
                        strokeWidth="12"
                        strokeDasharray={dashArray}
                        strokeDashoffset={dashOffset}
                        strokeLinecap="butt"
                        className="transition-all duration-500 hover:opacity-80"
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white count-pop">{totalIncidents}</span>
                <span className="text-[9px] text-[#525252]">Total</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {tierDistribution.map((tier, i) => (
                <div key={i} className="flex items-center gap-2 group cursor-pointer">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0 transition-transform group-hover:scale-125" style={{ backgroundColor: tier.color }} />
                  <span className="text-xs text-[#a1a1a1] flex-1 group-hover:text-white transition-colors">{tier.tier}</span>
                  <span className="text-xs font-bold text-white">{tier.count}</span>
                  <span className="text-[10px] text-[#525252] w-10 text-right">
                    {((tier.count / totalIncidents) * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Zone Incidents — Horizontal Bar Chart */}
        <div className="card-glow p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-orange-500" />
            <h3 className="text-sm font-semibold text-white">Incidents by Zone</h3>
          </div>
          <div className="space-y-2.5">
            {zoneIncidents.map((zone, i) => (
              <div
                key={i}
                className="flex items-center gap-3 group cursor-pointer"
                onMouseEnter={() => setHoveredZone(i)}
                onMouseLeave={() => setHoveredZone(null)}
              >
                <span className={`text-[11px] w-24 truncate flex-shrink-0 transition-colors ${hoveredZone === i ? 'text-white' : 'text-[#737373]'}`}>{zone.zone}</span>
                <div className="flex-1 h-5 bg-[#1a1a1a] rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-700 ease-out"
                    style={{
                      width: `${(zone.count / maxZone) * 100}%`,
                      background: `linear-gradient(90deg, ${
                        zone.count > 15 ? '#ef4444' : zone.count > 10 ? '#f97316' : zone.count > 6 ? '#eab308' : '#3b82f6'
                      }${hoveredZone === i ? '88' : '55'}, ${
                        zone.count > 15 ? '#ef4444' : zone.count > 10 ? '#f97316' : zone.count > 6 ? '#eab308' : '#3b82f6'
                      }22)`,
                    }}
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-[#a1a1a1]">
                    {zone.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Line Chart + Source Breakdown ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* 24h Trend — Line/Area Chart */}
        <div className="card-glow p-5 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-blue-500" />
            <h3 className="text-sm font-semibold text-white">24-Hour Incident Trend</h3>
            <span className="text-[9px] text-[#525252] ml-auto">Peak: {maxHour} incidents at 18:00</span>
          </div>
          <div className="h-48 relative">
            <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 40, 80, 120].map(y => (
                <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="#1f1f1f" strokeWidth="0.5" />
              ))}
              {/* Area fill */}
              <path
                d={`M0,160 ${hourlyTrend.map((v, i) => `L${(i / 23) * 480},${160 - (v / maxHour) * 140}`).join(' ')} L480,160 Z`}
                fill="url(#areaGrad2)" opacity="0.3"
              />
              {/* Line */}
              <path
                d={hourlyTrend.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / 23) * 480},${160 - (v / maxHour) * 140}`).join(' ')}
                fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"
              />
              {/* Dots at peak hours */}
              {hourlyTrend.map((v, i) => v >= maxHour * 0.8 ? (
                <g key={i}>
                  <circle cx={(i / 23) * 480} cy={160 - (v / maxHour) * 140} r="5" fill="#3b82f6" opacity="0.2" />
                  <circle cx={(i / 23) * 480} cy={160 - (v / maxHour) * 140} r="3" fill="#3b82f6" />
                </g>
              ) : null)}
              <defs>
                <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
            {/* X-axis labels */}
            <div className="flex justify-between mt-1 px-0">
              {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:00'].map((t, i) => (
                <span key={i} className="text-[9px] text-[#525252]">{t}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Source Distribution — Donut */}
        <div className="card-glow p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-purple-500" />
            <h3 className="text-sm font-semibold text-white">By Source</h3>
          </div>
          <div className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                {(() => {
                  let cum = 0;
                  return sourceDistribution.map((src, i) => {
                    const pct = (src.count / totalSources) * 100;
                    const dashArray = `${pct * 2.512} ${251.2 - pct * 2.512}`;
                    const dashOffset = -(cum * 2.512);
                    cum += pct;
                    return (
                      <circle
                        key={i} cx="50" cy="50" r="40" fill="none"
                        stroke={src.color} strokeWidth="10"
                        strokeDasharray={dashArray} strokeDashoffset={dashOffset}
                        className="hover:opacity-80 transition-opacity"
                        style={{ cursor: 'pointer' }}
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-white">{totalSources}</span>
                <span className="text-[8px] text-[#525252]">Events</span>
              </div>
            </div>
            <div className="w-full space-y-1.5">
              {sourceDistribution.map((src, i) => (
                <div key={i} className="flex items-center gap-2 group cursor-pointer">
                  <div className="w-2 h-2 rounded-full flex-shrink-0 transition-transform group-hover:scale-150" style={{ backgroundColor: src.color }} />
                  <span className="text-[10px] text-[#737373] flex-1 truncate group-hover:text-white transition-colors">{src.source}</span>
                  <span className="text-[10px] font-bold text-white">{src.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Weekly Bars + Response Times + Factor Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">

        {/* Weekly Stacked Bar Chart */}
        <div className="card-glow p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-amber-500" />
            <h3 className="text-sm font-semibold text-white">Weekly Breakdown</h3>
          </div>
          <div className="h-44 flex items-end justify-between gap-2">
            {weeklyIncidents.map((d, i) => {
              const maxTotal = Math.max(...weeklyIncidents.map(w => w.total));
              const isHovered = hoveredBar === i;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col items-center gap-1 cursor-pointer relative"
                  onMouseEnter={() => setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {/* Hover Tooltip */}
                  {isHovered && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-[#262626] border border-[#333333] rounded-lg px-2.5 py-1.5 z-10 shadow-xl whitespace-nowrap animate-fade-in">
                      <div className="text-[10px] text-white font-semibold">{d.day}: {d.total} total</div>
                      <div className="text-[8px] text-[#737373]">
                        C:{d.critical} H:{d.high} M:{d.medium} L:{d.low}
                      </div>
                    </div>
                  )}
                  <span className="text-[9px] text-[#525252] font-medium mb-1">{d.total}</span>
                  <div
                    className="w-full flex flex-col transition-all duration-200"
                    style={{
                      height: `${(d.total / maxTotal) * 120}px`,
                      transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                      transformOrigin: 'bottom',
                    }}
                  >
                    <div className="flex-none rounded-t" style={{ height: `${(d.critical / d.total) * 100}%`, backgroundColor: '#ef4444' }} />
                    <div className="flex-none" style={{ height: `${(d.high / d.total) * 100}%`, backgroundColor: '#f97316' }} />
                    <div className="flex-none" style={{ height: `${(d.medium / d.total) * 100}%`, backgroundColor: '#eab308' }} />
                    <div className="flex-none rounded-b" style={{ height: `${(d.low / d.total) * 100}%`, backgroundColor: '#22c55e' }} />
                  </div>
                  <span className={`text-[9px] transition-colors ${isHovered ? 'text-white' : 'text-[#525252]'}`}>{d.day}</span>
                </div>
              );
            })}
          </div>
          <div className="flex items-center justify-center gap-3 mt-3">
            {[{ l: 'Crit', c: '#ef4444' }, { l: 'High', c: '#f97316' }, { l: 'Med', c: '#eab308' }, { l: 'Low', c: '#22c55e' }].map(t => (
              <div key={t.l} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.c }} />
                <span className="text-[9px] text-[#525252]">{t.l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Response Time Distribution */}
        <div className="card-glow p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-green-500" />
            <h3 className="text-sm font-semibold text-white">Response Time</h3>
          </div>
          <div className="space-y-3">
            {responseTimeData.map((r, i) => (
              <div key={i} className="group cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#737373] group-hover:text-white transition-colors">{r.range}</span>
                  <span className="text-[11px] font-bold text-white">{r.count}</span>
                </div>
                <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700 group-hover:opacity-100 opacity-80"
                    style={{
                      width: `${(r.count / maxResponseTime) * 100}%`,
                      backgroundColor: r.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#1f1f1f]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#525252]">Median</span>
              <span className="text-white font-bold">2.8m</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span className="text-[#525252]">P95</span>
              <span className="text-orange-400 font-bold">8.4m</span>
            </div>
          </div>
        </div>

        {/* V/S/I/H/L/P Factor Averages */}
        <div className="card-glow p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-4 rounded-full bg-red-500" />
            <h3 className="text-sm font-semibold text-white">Avg Factor Scores (V/S/I/H/L/P)</h3>
          </div>
          <div className="space-y-3">
            {factorAverages.map((f, i) => (
              <div key={i} className="flex items-center gap-2 group cursor-pointer">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold transition-transform group-hover:scale-110 ${
                  f.value >= 7 ? 'bg-red-500/15 text-red-400' :
                  f.value >= 5 ? 'bg-yellow-500/15 text-yellow-400' :
                  'bg-blue-500/15 text-blue-400'
                }`}>
                  {f.factor}
                </span>
                <span className="text-[10px] text-[#737373] w-20 truncate group-hover:text-white transition-colors">{f.label}</span>
                <div className="flex-1 h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${f.value * 10}%`,
                      backgroundColor: f.value >= 7 ? '#ef4444' : f.value >= 5 ? '#eab308' : '#3b82f6',
                    }}
                  />
                </div>
                <span className={`text-[11px] font-mono font-bold w-6 text-right ${
                  f.value >= 7 ? 'text-red-400' : f.value >= 5 ? 'text-yellow-400' : 'text-blue-400'
                }`}>
                  {f.value}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-3 border-t border-[#1f1f1f]">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#525252]">Top Contributor</span>
              <span className="text-red-400 font-semibold">Impact (7.1)</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Dispatch Authority Stats ────────────────── */}
      <div className="card-glow p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-4 rounded-full bg-cyan-500" />
          <h3 className="text-sm font-semibold text-white">Dispatch Authority Performance</h3>
          <span className="text-[9px] text-[#525252] ml-auto">{dispatchStats.reduce((s, d) => s + d.dispatches, 0)} total dispatches</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px]">
            <thead>
              <tr className="border-b border-[#1f1f1f]">
                <th className="table-cell table-header text-left">Authority</th>
                <th className="table-cell table-header text-center">Dispatches</th>
                <th className="table-cell table-header text-center">Avg Response</th>
                <th className="table-cell table-header text-left">Activity</th>
              </tr>
            </thead>
            <tbody>
              {dispatchStats.map((d, i) => {
                const maxDispatches = Math.max(...dispatchStats.map(s => s.dispatches));
                return (
                  <tr key={i} className="table-row group">
                    <td className="table-cell text-white font-medium text-sm">
                      <span className="mr-2">{d.icon}</span>
                      {d.authority}
                    </td>
                    <td className="table-cell text-center">
                      <span className="text-sm font-bold text-white">{d.dispatches}</span>
                    </td>
                    <td className="table-cell text-center">
                      <span className={`text-sm font-medium ${
                        parseFloat(d.avgResponse) <= 3 ? 'text-green-400' :
                        parseFloat(d.avgResponse) <= 8 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {d.avgResponse}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="h-2 w-32 bg-[#1a1a1a] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full transition-all duration-700 group-hover:bg-blue-400"
                          style={{ width: `${(d.dispatches / maxDispatches) * 100}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SensorsView() {
  const sensors = [
    { name: 'Fire Detection - Lobby', status: 'active', lastPing: '2s ago', type: 'Smoke', zone: 'Main Lobby', signal: 95, uptime: 99.9, icon: '🔥' },
    { name: 'Fire Detection - Kitchen', status: 'active', lastPing: '1s ago', type: 'Heat', zone: 'Kitchen Area', signal: 98, uptime: 99.8, icon: '🌡️' },
    { name: 'CCTV - Main Entrance', status: 'active', lastPing: '0s ago', type: 'Video', zone: 'Main Entrance', signal: 100, uptime: 100, icon: '📹' },
    { name: 'CCTV - Conference Hall', status: 'active', lastPing: '1s ago', type: 'Video', zone: 'Conference Hall', signal: 92, uptime: 99.5, icon: '📹' },
    { name: 'Water Level - Basement', status: 'active', lastPing: '5s ago', type: 'Flood', zone: 'Basement B1', signal: 87, uptime: 98.2, icon: '💧' },
    { name: 'Motion - East Wing', status: 'warning', lastPing: '30s ago', type: 'Motion', zone: 'East Wing F1', signal: 45, uptime: 94.1, icon: '👁️' },
    { name: 'Seismic Monitor', status: 'active', lastPing: '2s ago', type: 'Seismic', zone: 'Foundation', signal: 99, uptime: 99.9, icon: '📊' },
    { name: 'Air Quality - HVAC', status: 'inactive', lastPing: '5m ago', type: 'Air', zone: 'Central HVAC', signal: 0, uptime: 78.3, icon: '🌬️' },
    { name: 'Smoke Detector - Ballroom', status: 'active', lastPing: '3s ago', type: 'Smoke', zone: 'Ballroom', signal: 91, uptime: 99.7, icon: '🔥' },
    { name: 'Crowd Density - Pool', status: 'active', lastPing: '1s ago', type: 'Vision', zone: 'Pool Area', signal: 96, uptime: 99.4, icon: '👥' },
    { name: 'Gas Leak Detector - Kitchen', status: 'active', lastPing: '4s ago', type: 'Gas', zone: 'Kitchen Area', signal: 94, uptime: 99.6, icon: '⚠️' },
    { name: 'Elevator Status - Tower', status: 'warning', lastPing: '15s ago', type: 'System', zone: 'Tower A', signal: 62, uptime: 96.8, icon: '🛗' },
  ];

  const activeCount = sensors.filter(s => s.status === 'active').length;
  const warningCount = sensors.filter(s => s.status === 'warning').length;
  const inactiveCount = sensors.filter(s => s.status === 'inactive').length;

  const getSignalBars = (signal) => {
    const bars = 5;
    const activeBars = Math.ceil((signal / 100) * bars);
    return Array.from({ length: bars }, (_, i) => ({
      active: i < activeBars,
      height: 4 + (i * 3),
    }));
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Sensor Network</h1>
          <p className="text-xs text-[#525252] mt-0.5">Monitor connected IoT devices and feeds</p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#525252] bg-[#111111] border border-[#1f1f1f] px-3 py-1.5 rounded-lg">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 pulse-green" />
          <span>{sensors.length} devices registered</span>
        </div>
      </div>

      {/* Health Summary Strip */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="card-glow p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-green-500 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-green-500 pulse-green" />
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400 count-pop">{activeCount}</div>
              <div className="text-[10px] text-[#525252] uppercase tracking-wider font-medium">Active</div>
            </div>
          </div>
        </div>
        <div className="card-glow p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-amber-500 pulse-amber" />
            </div>
            <div>
              <div className="text-2xl font-bold text-amber-400 count-pop">{warningCount}</div>
              <div className="text-[10px] text-[#525252] uppercase tracking-wider font-medium">Warning</div>
            </div>
          </div>
        </div>
        <div className="card-glow p-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 to-transparent" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div>
              <div className="text-2xl font-bold text-red-400 count-pop">{inactiveCount}</div>
              <div className="text-[10px] text-[#525252] uppercase tracking-wider font-medium">Offline</div>
            </div>
          </div>
        </div>
      </div>

      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {sensors.map((sensor, i) => (
          <div key={i} className="sensor-card stagger-item group">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{sensor.icon}</span>
                <div>
                  <h4 className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors leading-tight">{sensor.name}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#525252]">{sensor.zone}</span>
                    <span className="text-[10px] text-[#333333]">·</span>
                    <span className="text-[10px] text-[#525252]">{sensor.type}</span>
                  </div>
                </div>
              </div>
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                sensor.status === 'active' ? 'bg-green-500 pulse-green' :
                sensor.status === 'warning' ? 'bg-amber-500 pulse-amber' :
                'bg-red-500'
              }`} />
            </div>

            <div className="flex items-center justify-between">
              {/* Signal Strength */}
              <div className="flex items-center gap-2">
                <div className="flex items-end gap-0.5 h-4">
                  {getSignalBars(sensor.signal).map((bar, j) => (
                    <div
                      key={j}
                      className={`signal-bar ${sensor.status === 'inactive' ? '' : sensor.status === 'warning' ? 'warning' : bar.active ? 'active' : ''}`}
                      style={{ height: `${bar.height}px` }}
                    />
                  ))}
                </div>
                <span className={`text-[10px] font-mono font-semibold ${
                  sensor.signal >= 80 ? 'text-green-400' : sensor.signal >= 50 ? 'text-amber-400' : 'text-red-400'
                }`}>{sensor.signal}%</span>
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[9px] text-[#525252] uppercase tracking-wider">Uptime</div>
                  <div className={`text-[11px] font-mono font-semibold ${sensor.uptime >= 99 ? 'text-green-400' : sensor.uptime >= 95 ? 'text-amber-400' : 'text-red-400'}`}>
                    {sensor.uptime}%
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[9px] text-[#525252] uppercase tracking-wider">Ping</div>
                  <div className="text-[11px] text-[#737373] font-mono">{sensor.lastPing}</div>
                </div>
              </div>
            </div>

            {/* Status badge */}
            <div className="mt-3 pt-3 border-t border-[#1f1f1f] flex items-center justify-between">
              <span className={`badge ${
                sensor.status === 'active' ? 'badge-low' :
                sensor.status === 'warning' ? 'badge-medium' :
                'badge-critical'
              }`}>
                {sensor.status}
              </span>
              <button className="text-[10px] text-[#525252] hover:text-white transition-colors opacity-0 group-hover:opacity-100">
                Details →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsView() {
  const [filter, setFilter] = useState('all');
  const [readAlerts, setReadAlerts] = useState(new Set());

  const alerts = [
    { id: 1, message: 'Water sensor threshold exceeded in Basement', detail: 'Sensor B1-WL-01 reading 87cm, threshold is 50cm. Immediate inspection required.', time: '12 min ago', severity: 'critical', source: 'IoT Sensor', zone: 'Basement B1' },
    { id: 2, message: 'High temperature detected in Kitchen Area', detail: 'Temperature sensor reading 78°C near stove #3. Auto-ventilation triggered.', time: '2 min ago', severity: 'high', source: 'Heat Sensor', zone: 'Kitchen' },
    { id: 3, message: 'CCTV Camera #3 motion detection at restricted zone', detail: 'Unauthorized movement detected in staff-only area after hours. Recording stored.', time: '5 min ago', severity: 'high', source: 'CCTV Vision', zone: 'East Wing' },
    { id: 4, message: 'Seismic micro-tremor detected — monitoring active', detail: 'Magnitude 1.2 tremor detected. Below alert threshold. Continuous monitoring engaged.', time: '18 min ago', severity: 'medium', source: 'Seismic Monitor', zone: 'Foundation' },
    { id: 5, message: 'Guest emergency button pressed — Room 407', detail: 'SOS button activated in Room 407. Staff dispatched for welfare check.', time: '25 min ago', severity: 'high', source: 'Guest Portal', zone: 'Floor 4' },
    { id: 6, message: 'Air quality index dropped below safe threshold', detail: 'CO2 levels at 1200ppm in Conference Hall. HVAC boost activated.', time: '35 min ago', severity: 'medium', source: 'Air Sensor', zone: 'Conference Hall' },
    { id: 7, message: 'Scheduled maintenance reminder for Fire System', detail: 'Quarterly fire suppression system inspection due. Last test: 87 days ago.', time: '1 hour ago', severity: 'low', source: 'System', zone: 'All Zones' },
    { id: 8, message: 'New firmware available for Motion sensors', detail: 'Motion sensor firmware v2.4.1 available. Fixes false-positive edge case.', time: '3 hours ago', severity: 'low', source: 'System', zone: 'System-wide' },
    { id: 9, message: 'Backup power test completed successfully', detail: 'UPS and generator failover test passed. Switchover time: 2.3s.', time: '5 hours ago', severity: 'low', source: 'System', zone: 'Utility Room' },
  ];

  const [expandedAlert, setExpandedAlert] = useState(null);

  const severityConfig = {
    critical: { color: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', icon: '🔴', label: 'CRITICAL' },
    high: { color: 'bg-orange-500', text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: '🟠', label: 'HIGH' },
    medium: { color: 'bg-yellow-500', text: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', icon: '🟡', label: 'MEDIUM' },
    low: { color: 'bg-green-500', text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', icon: '🟢', label: 'LOW' },
  };

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'critical') return a.severity === 'critical';
    if (filter === 'high') return a.severity === 'critical' || a.severity === 'high';
    if (filter === 'unread') return !readAlerts.has(a.id);
    return true;
  });

  const toggleRead = (id) => {
    setReadAlerts(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearAll = () => setReadAlerts(new Set(alerts.map(a => a.id)));

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">System Alerts</h1>
          <p className="text-xs text-[#525252] mt-0.5">Notifications, warnings, and system messages</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#525252]">{alerts.length - readAlerts.size} unread</span>
          <button
            onClick={clearAll}
            className="text-[10px] text-[#525252] hover:text-white transition-colors bg-[#111111] border border-[#1f1f1f] px-2.5 py-1 rounded-lg hover:border-[#333333]"
          >
            Mark all read
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center bg-[#111111] rounded-lg border border-[#1f1f1f] p-0.5 mb-5 w-fit">
        {[
          { key: 'all', label: 'All', count: alerts.length },
          { key: 'critical', label: 'Critical', count: alerts.filter(a => a.severity === 'critical').length },
          { key: 'high', label: 'High+', count: alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length },
          { key: 'unread', label: 'Unread', count: alerts.length - readAlerts.size },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
              filter === tab.key
                ? 'bg-[#262626] text-white'
                : 'text-[#737373] hover:text-white'
            }`}
          >
            {tab.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
              filter === tab.key ? 'bg-[#333333] text-white' : 'bg-[#1a1a1a] text-[#525252]'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative">
        <div className="timeline-line" />

        <div className="space-y-1">
          {filteredAlerts.length === 0 ? (
            <div className="card p-12 flex flex-col items-center justify-center text-center ml-10 border-dashed">
              <div className="text-3xl mb-3">✓</div>
              <h3 className="text-sm font-medium text-[#a1a1a1]">All caught up</h3>
              <p className="text-xs text-[#525252] mt-1">No alerts match your current filter.</p>
            </div>
          ) : (
            filteredAlerts.map((alert, i) => {
              const config = severityConfig[alert.severity];
              const isRead = readAlerts.has(alert.id);
              const isExpanded = expandedAlert === alert.id;

              return (
                <div key={alert.id} className={`flex items-start gap-3 stagger-item transition-opacity ${isRead ? 'opacity-50' : ''}`}>
                  {/* Timeline Dot */}
                  <div className={`timeline-dot mt-4 ${config.color}`} />

                  {/* Alert Card */}
                  <div
                    className={`flex-1 card-glow p-4 cursor-pointer ${isExpanded ? 'ring-1 ring-[#333333]' : ''}`}
                    onClick={() => setExpandedAlert(isExpanded ? null : alert.id)}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${config.bg} ${config.text} border ${config.border}`}>
                            {config.label}
                          </span>
                          <span className="text-[9px] text-[#525252] bg-[#1a1a1a] px-1.5 py-0.5 rounded">{alert.source}</span>
                          <span className="text-[9px] text-[#404040]">·</span>
                          <span className="text-[9px] text-[#525252]">{alert.zone}</span>
                        </div>
                        <p className="text-sm text-white font-medium leading-snug">{alert.message}</p>
                        <p className="text-[11px] text-[#525252] mt-1">{alert.time}</p>

                        {isExpanded && (
                          <div className="mt-3 pt-3 border-t border-[#1f1f1f] animate-fade-in">
                            <p className="text-xs text-[#737373] leading-relaxed">{alert.detail}</p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleRead(alert.id); }}
                          className={`text-[10px] px-2 py-1 rounded transition-all ${
                            isRead
                              ? 'text-[#525252] hover:text-white'
                              : 'text-blue-400 bg-blue-500/10 hover:bg-blue-500/20'
                          }`}
                        >
                          {isRead ? 'Unread' : 'Read'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function SettingsView() {
  const [settings, setSettings] = useState({
    autoRefresh: true,
    soundNotifications: false,
    desktopNotifications: true,
    emailDigest: 'daily',
    compactMode: false,
    darkTheme: true,
    refreshRate: '5',
    defaultView: 'overview',
    escalationThreshold: 'high',
  });

  const toggle = (key) => setSettings(prev => ({ ...prev, [key]: !prev[key] }));

  const ToggleButton = ({ active, onToggle }) => (
    <button
      onClick={onToggle}
      className={`toggle-switch ${active ? 'active' : ''}`}
      role="switch"
      aria-checked={active}
    />
  );

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
          <p className="text-xs text-[#525252] mt-0.5">Configure system preferences and integrations</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-[#525252] bg-[#111111] border border-[#1f1f1f] px-2.5 py-1 rounded-lg">v2.4.1</span>
        </div>
      </div>

      {/* Profile Card */}
      <div className="card-glow p-5 mb-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-transparent" />
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
            OP
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">Operator Console</h3>
            <p className="text-xs text-[#525252] mt-0.5">Control Room · Shift A · Active since 06:00</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge badge-info">Admin</span>
            <span className="badge badge-low">On Duty</span>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {/* General Settings */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <span className="text-blue-400 text-sm">⚙️</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">General</h3>
              <p className="text-[10px] text-[#525252]">Core application settings</p>
            </div>
          </div>
          <div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Auto-refresh dashboard</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Automatically update the incident feed in real-time</p>
              </div>
              <ToggleButton active={settings.autoRefresh} onToggle={() => toggle('autoRefresh')} />
            </div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Dark theme</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Use dark color scheme across the application</p>
              </div>
              <ToggleButton active={settings.darkTheme} onToggle={() => toggle('darkTheme')} />
            </div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Compact mode</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Reduce spacing for denser information display</p>
              </div>
              <ToggleButton active={settings.compactMode} onToggle={() => toggle('compactMode')} />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <span className="text-amber-400 text-sm">🔔</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Notifications</h3>
              <p className="text-[10px] text-[#525252]">Alert delivery preferences</p>
            </div>
          </div>
          <div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Sound notifications</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Play audio alert for critical tier incidents</p>
              </div>
              <ToggleButton active={settings.soundNotifications} onToggle={() => toggle('soundNotifications')} />
            </div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Desktop notifications</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Show browser push notifications for new incidents</p>
              </div>
              <ToggleButton active={settings.desktopNotifications} onToggle={() => toggle('desktopNotifications')} />
            </div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Email digest</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Receive incident summaries via email</p>
              </div>
              <select
                value={settings.emailDigest}
                onChange={(e) => setSettings(prev => ({ ...prev, emailDigest: e.target.value }))}
                className="input w-32 text-xs"
              >
                <option value="off">Off</option>
                <option value="realtime">Real-time</option>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Escalation threshold</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Minimum tier level that triggers escalation alerts</p>
              </div>
              <select
                value={settings.escalationThreshold}
                onChange={(e) => setSettings(prev => ({ ...prev, escalationThreshold: e.target.value }))}
                className="input w-32 text-xs"
              >
                <option value="critical">Critical only</option>
                <option value="high">High+</option>
                <option value="medium">Medium+</option>
                <option value="all">All tiers</option>
              </select>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <span className="text-purple-400 text-sm">🔗</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Integrations</h3>
              <p className="text-[10px] text-[#525252]">API connections and external services</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <label className="text-[11px] text-[#525252] uppercase tracking-wider font-medium mb-1.5 block">Backend API URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={API_BASE_URL}
                  readOnly
                  className="input bg-[#0a0a0a] flex-1 font-mono text-[12px]"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(API_BASE_URL)}
                  className="btn-secondary px-3 py-2 text-xs whitespace-nowrap"
                >
                  Copy
                </button>
              </div>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 pulse-green" />
                <span className="text-xs text-[#a1a1a1]">Socket.IO</span>
              </div>
              <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Connected</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 pulse-green" />
                <span className="text-xs text-[#a1a1a1]">Weather API</span>
              </div>
              <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
            <div className="flex items-center justify-between py-3 border-t border-[#1f1f1f]">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 pulse-green" />
                <span className="text-xs text-[#a1a1a1]">Seismic Feed</span>
              </div>
              <span className="text-[10px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded">Active</span>
            </div>
          </div>
        </div>

        {/* Display */}
        <div className="settings-section">
          <div className="settings-section-header">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
              <span className="text-cyan-400 text-sm">🖥️</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Display</h3>
              <p className="text-[10px] text-[#525252]">Dashboard appearance and behavior</p>
            </div>
          </div>
          <div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Refresh interval</p>
                <p className="text-[11px] text-[#525252] mt-0.5">How often the dashboard polls for updates</p>
              </div>
              <select
                value={settings.refreshRate}
                onChange={(e) => setSettings(prev => ({ ...prev, refreshRate: e.target.value }))}
                className="input w-32 text-xs"
              >
                <option value="1">1 second</option>
                <option value="5">5 seconds</option>
                <option value="10">10 seconds</option>
                <option value="30">30 seconds</option>
                <option value="60">1 minute</option>
              </select>
            </div>
            <div className="settings-row">
              <div>
                <p className="text-sm text-white">Default view</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Landing page when opening the dashboard</p>
              </div>
              <select
                value={settings.defaultView}
                onChange={(e) => setSettings(prev => ({ ...prev, defaultView: e.target.value }))}
                className="input w-32 text-xs"
              >
                <option value="overview">Overview</option>
                <option value="incidents">Incidents</option>
                <option value="analytics">Analytics</option>
                <option value="sensors">Sensors</option>
              </select>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="settings-section border-red-500/20">
          <div className="settings-section-header border-red-500/10">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <span className="text-red-400 text-sm">⚠️</span>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-red-400">Danger Zone</h3>
              <p className="text-[10px] text-[#525252]">Irreversible actions</p>
            </div>
          </div>
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Reset all settings</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Restore default configuration values</p>
              </div>
              <button className="btn-danger text-xs px-3 py-1.5">Reset</button>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#1f1f1f]">
              <div>
                <p className="text-sm text-white">Clear local data</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Remove cached data and session information</p>
              </div>
              <button className="btn-danger text-xs px-3 py-1.5">Clear</button>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-[#1f1f1f]">
              <div>
                <p className="text-sm text-white">Export configuration</p>
                <p className="text-[11px] text-[#525252] mt-0.5">Download settings as JSON file</p>
              </div>
              <button className="btn-secondary text-xs px-3 py-1.5">Export</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

