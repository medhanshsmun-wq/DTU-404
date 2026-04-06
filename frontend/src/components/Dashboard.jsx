import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import {
  Shield, Activity, Radio, MapPin, Zap, Cloud, Waves,
  Thermometer, Wind, Droplets, ToggleLeft, ToggleRight,
  AlertTriangle, Gauge
} from 'lucide-react';
import IncidentCard from './IncidentCard';
import SimulatorModal from './SimulatorModal';
import BaselineTable from './BaselineTable';

const SOCKET_SERVER_URL = "http://localhost:3001";

function Dashboard() {
  const [incidents, setIncidents] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [weather, setWeather] = useState(null);
  const [seismic, setSeismic] = useState(null);
  const [autoFeedEnabled, setAutoFeedEnabled] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socket.on('incidents_update', (data) => {
      setIncidents(data); // already sorted by server
    });

    socket.on('environment_update', (data) => {
      if (data.weather) setWeather(data.weather);
      if (data.seismic) setSeismic(data.seismic);
    });

    socket.on('feed_status', (data) => {
      setAutoFeedEnabled(data.autoFeedEnabled);
    });

    return () => socket.disconnect();
  }, []);

  const activeIncidents = incidents.filter(i => i.status === "Active");
  const hasExtreme = activeIncidents.some(i => i.priorityBand === "Extreme");

  const toggleAutoFeed = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/feeds/toggle', { method: 'POST' });
      const data = await res.json();
      setAutoFeedEnabled(data.autoFeedEnabled);
    } catch (err) {
      console.error("Failed to toggle feed:", err);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Ambient glow */}
      <div className={`absolute top-0 left-0 w-full h-[500px] transition-all duration-1000 blur-3xl opacity-15 pointer-events-none ${hasExtreme ? 'bg-gradient-to-br from-red-600 via-orange-500 to-transparent' : 'bg-gradient-to-br from-blue-600 via-indigo-500 to-transparent'}`} />

      {/* Header */}
      <header className="w-full max-w-[1600px] mx-auto px-6 pt-8 pb-4 flex items-center justify-between z-10">
        <div className="flex items-center space-x-4">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-700 shadow-xl">
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
              <span>Taj Hotel Nexus</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">Live</span>
            </h1>
            <p className="text-slate-400 text-sm">Dual-Layer Crisis Intelligence System</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Auto-Feed Toggle */}
          <button
            onClick={toggleAutoFeed}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all border ${autoFeedEnabled
              ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/20'
              : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
            }`}
          >
            {autoFeedEnabled
              ? <ToggleRight className="w-4 h-4" />
              : <ToggleLeft className="w-4 h-4" />
            }
            <span>Auto Sensors</span>
          </button>

          <div className="flex items-center space-x-2 text-sm">
            <Radio className={`w-4 h-4 ${isConnected ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`} />
            <span className={isConnected ? "text-emerald-400 font-medium" : "text-slate-500"}>
              {isConnected ? "Mesh Connected" : "Connecting..."}
            </span>
          </div>

          <button
            onClick={() => setIsSimulatorOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium transition-colors border border-indigo-400/30 shadow-lg shadow-indigo-500/20"
          >
            <Zap className="w-4 h-4" />
            <span>Simulate Incident</span>
          </button>
        </div>
      </header>

      {/* Environment Strip */}
      <div className="w-full max-w-[1600px] mx-auto px-6 z-10">
        <div className="glass-panel rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            {weather ? (
              <>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Thermometer className="w-4 h-4 text-orange-400" />
                  <span>{weather.temperature}°C</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Droplets className="w-4 h-4 text-blue-400" />
                  <span>{weather.rain} mm/hr</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Wind className="w-4 h-4 text-cyan-400" />
                  <span>{weather.windSpeed} km/h</span>
                </div>
                <div className="flex items-center space-x-1.5 text-slate-300">
                  <Gauge className="w-4 h-4 text-violet-400" />
                  <span>{weather.pressure} hPa</span>
                </div>
              </>
            ) : (
              <span className="text-slate-500 text-xs">Loading weather data...</span>
            )}
          </div>

          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-1.5">
              <Waves className={`w-4 h-4 ${seismic?.status === 'Alert' ? 'text-red-400' : seismic?.status === 'Activity' ? 'text-yellow-400' : 'text-emerald-400'}`} />
              <span className={`font-medium ${seismic?.status === 'Alert' ? 'text-red-400' : seismic?.status === 'Activity' ? 'text-yellow-400' : 'text-emerald-400'}`}>
                Seismic: {seismic?.status || "Loading..."}
              </span>
              {seismic?.maxMagnitude && (
                <span className="text-slate-500 text-xs">(M{seismic.maxMagnitude})</span>
              )}
            </div>

            <div className="h-4 w-px bg-slate-700" />

            <div className="flex items-center space-x-1.5">
              <Cloud className="w-4 h-4 text-slate-400" />
              <span className="text-slate-400 text-xs">Mumbai, Colaba</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="w-full max-w-[1600px] mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-4 gap-6 z-10 flex-1">
        {/* Left Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Active</div>
              <div className="text-2xl font-bold text-white">{activeIncidents.length}</div>
            </div>
            <div className="glass-panel p-4 rounded-xl">
              <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">Extreme</div>
              <div className={`text-2xl font-bold ${hasExtreme ? 'text-red-400' : 'text-emerald-400'}`}>
                {activeIncidents.filter(i => i.priorityBand === "Extreme").length}
              </div>
            </div>
          </div>

          {/* Venue Map */}
          <div className="glass-panel p-5 rounded-2xl">
            <h2 className="text-sm font-semibold text-white flex items-center mb-4">
              <MapPin className="w-4 h-4 mr-2 text-slate-400" />
              Venue Status
            </h2>
            <div className="aspect-[4/3] bg-slate-800/50 border border-slate-700/50 rounded-xl relative flex items-center justify-center p-3">
              <div className="absolute top-[15%] left-[15%] w-[35%] h-[45%] bg-slate-700/20 border border-slate-600/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest text-center">Palace<br/>Wing</span>
              </div>
              <div className="absolute bottom-[15%] right-[15%] w-[28%] h-[55%] bg-slate-700/20 border border-slate-600/30 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <span className="text-[10px] text-slate-500 font-medium uppercase tracking-widest text-center">Tower<br/>Wing</span>
              </div>
              {activeIncidents.slice(0, 5).map((inc, i) => {
                const positions = [
                  { top: '25%', left: '30%' },
                  { top: '60%', right: '25%' },
                  { top: '45%', left: '50%' },
                  { top: '30%', right: '35%' },
                  { bottom: '25%', left: '35%' },
                ];
                const pos = positions[i] || positions[0];
                return (
                  <div key={inc.id} className="absolute" style={pos}>
                    {inc.priorityBand === "Extreme" && <div className="absolute -inset-3 bg-red-500/20 rounded-full animate-ping" />}
                    <div className={`w-3 h-3 rounded-full shadow-lg ${
                      inc.priorityBand === "Extreme" ? "bg-red-500 shadow-red-500/50" :
                      inc.priorityBand === "High" ? "bg-orange-500 shadow-orange-500/50" :
                      inc.priorityBand === "Medium" ? "bg-yellow-500 shadow-yellow-500/50" :
                      "bg-blue-500 shadow-blue-500/50"
                    }`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Baseline Risk Table */}
          <BaselineTable />
        </div>

        {/* Right — Incident Feed */}
        <div className="lg:col-span-3 space-y-4 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-xl font-bold text-white flex items-center">
              <Activity className="w-5 h-5 mr-2 text-blue-400" />
              Prioritized Intelligence Feed
            </h2>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-slate-400 bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
                Baseline ×0.20 + Live ×0.80
              </span>
              {autoFeedEnabled && (
                <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/30 flex items-center">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-2 animate-pulse" />
                  Auto-Feed Active
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-4">
            {activeIncidents.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center text-center border-dashed border-slate-700 text-slate-400">
                <Shield className="w-12 h-12 mb-4 text-slate-600 opacity-50" />
                <h3 className="text-lg font-medium text-slate-300">All Clear</h3>
                <p className="max-w-xs mt-2 text-sm leading-relaxed">No active incidents reported. Venue is secure.</p>
              </div>
            ) : (
              activeIncidents.map((incident) => (
                <IncidentCard key={incident.id} incident={incident} />
              ))
            )}
          </div>
        </div>
      </main>

      {isSimulatorOpen && <SimulatorModal onClose={() => setIsSimulatorOpen(false)} />}
    </div>
  );
}

export default Dashboard;
