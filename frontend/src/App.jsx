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
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Analytics Dashboard</h1>
        <p className="text-xs text-[#525252] mt-0.5">Performance metrics, trends, and incident intelligence</p>
      </div>

      {/* ── KPI Row ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'This Week',     value: '106', change: '+12%', positive: false },
          { label: 'Avg Response',   value: '2.3m', change: '-18%', positive: true },
          { label: 'Resolution Rate', value: '94%', change: '+3%',  positive: true },
          { label: 'Auto-Dispatched', value: '78%', change: '+15%', positive: true },
          { label: 'Sensor Uptime',   value: '99.9%', change: '0%',  positive: true },
          { label: 'AI Accuracy',     value: '97.2%', change: '+1.2%', positive: true },
        ].map((stat, i) => (
          <div key={i} className="card p-4">
            <div className="text-[10px] text-[#525252] uppercase tracking-wider font-medium mb-1">{stat.label}</div>
            <div className="text-xl font-bold text-white">{stat.value}</div>
            <div className={`text-[10px] font-medium mt-1 ${
              stat.change === '0%' ? 'text-[#525252]' :
              stat.positive ? 'text-green-400' : 'text-red-400'
            }`}>
              {stat.change} vs last week
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 1: Pie + Bar ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Tier Distribution — Donut Chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Incident Distribution by Tier</h3>
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
                        className="transition-all duration-500"
                      />
                    );
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-white">{totalIncidents}</span>
                <span className="text-[9px] text-[#525252]">Total</span>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {tierDistribution.map((tier, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: tier.color }} />
                  <span className="text-xs text-[#a1a1a1] flex-1">{tier.tier}</span>
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
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Incidents by Zone</h3>
          <div className="space-y-2.5">
            {zoneIncidents.map((zone, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-[11px] text-[#737373] w-24 truncate flex-shrink-0">{zone.zone}</span>
                <div className="flex-1 h-5 bg-[#1a1a1a] rounded overflow-hidden relative">
                  <div
                    className="h-full rounded transition-all duration-700 ease-out"
                    style={{
                      width: `${(zone.count / maxZone) * 100}%`,
                      background: `linear-gradient(90deg, ${
                        zone.count > 15 ? '#ef4444' : zone.count > 10 ? '#f97316' : zone.count > 6 ? '#eab308' : '#3b82f6'
                      }55, ${
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* 24h Trend — Line/Area Chart */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-white mb-4">24-Hour Incident Trend</h3>
          <div className="h-48 relative">
            <svg viewBox="0 0 480 160" className="w-full h-full" preserveAspectRatio="none">
              {/* Grid lines */}
              {[0, 40, 80, 120].map(y => (
                <line key={y} x1="0" y1={y} x2="480" y2={y} stroke="#1f1f1f" strokeWidth="0.5" />
              ))}
              {/* Area fill */}
              <path
                d={`M0,160 ${hourlyTrend.map((v, i) => `L${(i / 23) * 480},${160 - (v / maxHour) * 140}`).join(' ')} L480,160 Z`}
                fill="url(#areaGrad)" opacity="0.3"
              />
              {/* Line */}
              <path
                d={hourlyTrend.map((v, i) => `${i === 0 ? 'M' : 'L'}${(i / 23) * 480},${160 - (v / maxHour) * 140}`).join(' ')}
                fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinejoin="round"
              />
              {/* Dots at peak hours */}
              {hourlyTrend.map((v, i) => v >= maxHour * 0.8 ? (
                <circle key={i} cx={(i / 23) * 480} cy={160 - (v / maxHour) * 140} r="3" fill="#3b82f6" />
              ) : null)}
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
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
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">By Source</h3>
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
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: src.color }} />
                  <span className="text-[10px] text-[#737373] flex-1 truncate">{src.source}</span>
                  <span className="text-[10px] font-bold text-white">{src.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Weekly Bars + Response Times + Factor Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

        {/* Weekly Stacked Bar Chart */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Weekly Breakdown</h3>
          <div className="h-44 flex items-end justify-between gap-2">
            {weeklyIncidents.map((d, i) => {
              const maxTotal = Math.max(...weeklyIncidents.map(w => w.total));
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] text-[#525252] font-medium mb-1">{d.total}</span>
                  <div className="w-full flex flex-col" style={{ height: `${(d.total / maxTotal) * 120}px` }}>
                    <div className="flex-none rounded-t" style={{ height: `${(d.critical / d.total) * 100}%`, backgroundColor: '#ef4444' }} />
                    <div className="flex-none" style={{ height: `${(d.high / d.total) * 100}%`, backgroundColor: '#f97316' }} />
                    <div className="flex-none" style={{ height: `${(d.medium / d.total) * 100}%`, backgroundColor: '#eab308' }} />
                    <div className="flex-none rounded-b" style={{ height: `${(d.low / d.total) * 100}%`, backgroundColor: '#22c55e' }} />
                  </div>
                  <span className="text-[9px] text-[#525252]">{d.day}</span>
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
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Response Time</h3>
          <div className="space-y-3">
            {responseTimeData.map((r, i) => (
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#737373]">{r.range}</span>
                  <span className="text-[11px] font-bold text-white">{r.count}</span>
                </div>
                <div className="h-2 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
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
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Avg Factor Scores (V/S/I/H/L/P)</h3>
          <div className="space-y-3">
            {factorAverages.map((f, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                  f.value >= 7 ? 'bg-red-500/15 text-red-400' :
                  f.value >= 5 ? 'bg-yellow-500/15 text-yellow-400' :
                  'bg-blue-500/15 text-blue-400'
                }`}>
                  {f.factor}
                </span>
                <span className="text-[10px] text-[#737373] w-20 truncate">{f.label}</span>
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
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-white mb-4">Dispatch Authority Performance</h3>
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
                  <tr key={i} className="table-row">
                    <td className="table-cell text-white font-medium text-sm">{d.authority}</td>
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
                          className="h-full bg-blue-500 rounded-full transition-all duration-700"
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
    { name: 'Fire Detection - Lobby', status: 'active', lastPing: '2s ago', type: 'Smoke' },
    { name: 'Fire Detection - Kitchen', status: 'active', lastPing: '1s ago', type: 'Heat' },
    { name: 'CCTV - Main Entrance', status: 'active', lastPing: '0s ago', type: 'Video' },
    { name: 'CCTV - Conference Hall', status: 'active', lastPing: '1s ago', type: 'Video' },
    { name: 'Water Level - Basement', status: 'active', lastPing: '5s ago', type: 'Flood' },
    { name: 'Motion - East Wing', status: 'warning', lastPing: '30s ago', type: 'Motion' },
    { name: 'Seismic Monitor', status: 'active', lastPing: '2s ago', type: 'Seismic' },
    { name: 'Air Quality - HVAC', status: 'inactive', lastPing: '5m ago', type: 'Air' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Sensor Network</h1>
        <p className="text-xs text-[#525252] mt-0.5">Monitor connected IoT devices and feeds</p>
      </div>
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#1f1f1f]">
              <th className="table-cell table-header text-left">Sensor</th>
              <th className="table-cell table-header text-left">Type</th>
              <th className="table-cell table-header text-left">Status</th>
              <th className="table-cell table-header text-left">Last Ping</th>
            </tr>
          </thead>
          <tbody>
            {sensors.map((sensor, i) => (
              <tr key={i} className="table-row">
                <td className="table-cell text-white font-medium">{sensor.name}</td>
                <td className="table-cell">
                  <span className="badge badge-neutral">{sensor.type}</span>
                </td>
                <td className="table-cell">
                  <span className={`badge ${
                    sensor.status === 'active' ? 'badge-low' :
                    sensor.status === 'warning' ? 'badge-medium' :
                    'badge-critical'
                  }`}>
                    {sensor.status}
                  </span>
                </td>
                <td className="table-cell text-[#737373]">{sensor.lastPing}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsView() {
  const alerts = [
    { message: 'High temperature detected in Kitchen Area', time: '2 min ago', severity: 'high' },
    { message: 'CCTV Camera #3 motion detection triggered', time: '5 min ago', severity: 'medium' },
    { message: 'Water sensor threshold exceeded in Basement', time: '12 min ago', severity: 'critical' },
    { message: 'Scheduled maintenance reminder for Fire System', time: '1 hour ago', severity: 'low' },
    { message: 'New firmware available for Motion sensors', time: '3 hours ago', severity: 'low' },
  ];

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">System Alerts</h1>
        <p className="text-xs text-[#525252] mt-0.5">Notifications and system messages</p>
      </div>
      <div className="space-y-2">
        {alerts.map((alert, i) => (
          <div key={i} className="card p-4 flex items-start gap-4">
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
              alert.severity === 'critical' ? 'bg-red-500' :
              alert.severity === 'high' ? 'bg-orange-500' :
              alert.severity === 'medium' ? 'bg-yellow-500' :
              'bg-green-500'
            }`} />
            <div className="flex-1">
              <p className="text-sm text-white">{alert.message}</p>
              <p className="text-xs text-[#525252] mt-1">{alert.time}</p>
            </div>
            <button className="text-xs text-[#525252] hover:text-white transition-colors">
              Dismiss
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SettingsView() {
  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Settings</h1>
        <p className="text-xs text-[#525252] mt-0.5">Configure system preferences</p>
      </div>
      <div className="space-y-6">
        <div className="card p-5">
          <h3 className="text-sm font-medium text-white mb-4">General</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Auto-refresh dashboard</p>
                <p className="text-xs text-[#525252]">Automatically update incident feed</p>
              </div>
              <button className="w-10 h-6 rounded-full bg-green-500 relative">
                <div className="w-4 h-4 rounded-full bg-white absolute right-1 top-1" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white">Sound notifications</p>
                <p className="text-xs text-[#525252]">Play sound for critical alerts</p>
              </div>
              <button className="w-10 h-6 rounded-full bg-[#262626] relative">
                <div className="w-4 h-4 rounded-full bg-white absolute left-1 top-1" />
              </button>
            </div>
          </div>
        </div>
        <div className="card p-5">
          <h3 className="text-sm font-medium text-white mb-4">API Configuration</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#525252] block mb-1.5">Backend URL</label>
              <input 
                type="text" 
                value={API_BASE_URL} 
                readOnly 
                className="input bg-[#0a0a0a]" 
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
