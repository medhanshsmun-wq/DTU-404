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
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-white">Analytics</h1>
        <p className="text-xs text-[#525252] mt-0.5">Performance metrics and trends</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: 'Incidents This Week', value: '24', change: '+12%' },
          { label: 'Avg Response Time', value: '2.3m', change: '-8%' },
          { label: 'Resolution Rate', value: '94%', change: '+3%' },
          { label: 'Critical Incidents', value: '3', change: '-25%' },
          { label: 'Sensor Uptime', value: '99.9%', change: '0%' },
          { label: 'AI Accuracy', value: '97.2%', change: '+1.2%' },
        ].map((stat, i) => (
          <div key={i} className="card p-5">
            <div className="text-xs text-[#525252] mb-1">{stat.label}</div>
            <div className="flex items-end justify-between">
              <span className="text-2xl font-bold text-white">{stat.value}</span>
              <span className={`text-xs font-medium ${
                stat.change.startsWith('+') ? 'text-green-400' : 
                stat.change.startsWith('-') ? 'text-red-400' : 'text-[#525252]'
              }`}>
                {stat.change}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-6 card p-5">
        <h3 className="text-sm font-medium text-white mb-4">Incident Trends</h3>
        <div className="h-48 flex items-end justify-between gap-2">
          {[40, 65, 45, 80, 55, 70, 35].map((height, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div 
                className="w-full bg-blue-500/20 rounded-t transition-all hover:bg-blue-500/30"
                style={{ height: `${height}%` }}
              />
              <span className="text-[10px] text-[#525252]">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}
              </span>
            </div>
          ))}
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
