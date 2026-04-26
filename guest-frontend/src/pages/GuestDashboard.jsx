import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin, FileWarning, BellRing, ShieldAlert, Map, BookOpen,
  Cloud, Thermometer, ChevronRight, AlertTriangle, LogOut, Crown, Droplets
} from 'lucide-react';
import { useAuth } from '../App';
import { API_BASE_URL } from '../config';

function GuestDashboard() {
  const { guest, alerts, setAlerts, api, logout } = useAuth();
  const navigate = useNavigate();
  const [weather, setWeather] = useState(null);
  const [currentZone, setCurrentZone] = useState(null);
  const [zones, setZones] = useState([]);
  const [showZonePicker, setShowZonePicker] = useState(false);


  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    api('/api/guest/profile').then((data) => {

      if (data.currentZoneName) setCurrentZone({ id: data.currentZone, name: data.currentZoneName });
    });
    api('/api/guest/zones').then(setZones);
    fetch(`${API_BASE_URL}/api/environment`)
      .then((r) => r.json())
      .then((d) => setWeather(d.weather))
      .catch(() => { });

    api('/api/guest/reports').then(setRecentReports).catch(() => {});
    api('/api/guest/alerts').then(setAlerts).catch(() => {});
  }, []);


  const handleZoneChange = async (zone) => {
    await api('/api/guest/location', {
      method: 'POST',
      body: JSON.stringify({ zoneId: zone.id }),
    });
    setCurrentZone(zone);
    setShowZonePicker(false);
  };

  const quickActions = [
    { label: 'Report Issue', icon: FileWarning, color: 'from-orange-500 to-red-600', path: '/report' },
    { label: 'Room Service', icon: BellRing, color: 'from-[#d4af37] to-[#a88b2a]', path: '/services' },
    { label: 'Emergency', icon: ShieldAlert, color: 'from-red-600 to-red-700', path: '/emergency' },
    { label: 'Floor Plans', icon: Map, color: 'from-blue-500 to-cyan-600', path: '/floor-plans' },
    { label: 'Safety Info', icon: BookOpen, color: 'from-purple-500 to-indigo-600', path: '/emergency-plans' },
  ];

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-[#f5f0e8]">
            Welcome, {guest?.firstName}
          </h1>
          <p className="text-xs text-[#666] mt-0.5 flex items-center gap-1">
            Room {guest?.room}
            {guest?.vip && <Crown className="w-3 h-3 text-[#d4af37]" />}
          </p>
        </div>
        <button onClick={logout} className="p-2 rounded-xl hover:bg-[#1a1a1a] transition-colors">
          <LogOut className="w-5 h-5 text-[#555]" />
        </button>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4 space-y-2">
          {alerts.slice(0, 3).map((alert) => (
            <div key={alert.id} className={`alert-card flex flex-col gap-2 ${alert.hotelResolved ? 'border-green-500/30 bg-green-500/5' : ''}`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${alert.hotelResolved ? 'text-green-400' : 'text-red-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[9px] ${alert.tier === 'Critical' ? 'badge-critical' : 'badge-high'} ${alert.hotelResolved ? '!bg-green-500/20 !text-green-400 !border-green-500/30' : ''}`}>
                      {alert.hotelResolved ? 'RESOLVED BY HOTEL' : alert.tier}
                    </span>
                    <span className={`text-[10px] ${alert.hotelResolved ? 'text-green-400/70' : 'text-red-400/70'}`}>{alert.type}</span>
                  </div>
                  <p className={`text-xs mt-1 line-clamp-2 ${alert.hotelResolved ? 'text-green-300/80' : 'text-red-300/80'}`}>
                    {alert.hotelResolved ? (alert.resolutionMessage || "Hotel staff has handled this incident.") : alert.description}
                  </p>
                </div>
                {alert.hotelResolved && (
                  <button 
                    onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))}
                    className="px-2 py-1 bg-green-500/20 text-green-400 border border-green-500/30 rounded text-[10px] font-bold hover:bg-green-500/30 transition"
                  >
                    DISMISS
                  </button>
                )}
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Location Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card-gold p-4 mb-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#d4af37]/15 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#d4af37]" />
            </div>
            <div>
              <p className="text-[10px] text-[#888] uppercase tracking-wider font-medium">Your Location</p>
              <p className="text-sm font-semibold text-[#f5f0e8]">{currentZone?.name || 'Loading...'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowZonePicker(!showZonePicker)}
            className="text-xs text-[#d4af37] font-medium flex items-center gap-1"
          >
            Update <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zone Picker */}
        {showZonePicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="mt-3 pt-3 border-t border-[#2a2418] overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
              {zones.map((zone) => (
                <button
                  key={zone.id}
                  onClick={() => handleZoneChange(zone)}
                  className={`text-left px-3 py-2 rounded-lg text-xs transition-all ${currentZone?.id === zone.id
                      ? 'bg-[#d4af37]/15 text-[#d4af37] border border-[#d4af37]/30'
                      : 'bg-[#111] text-[#999] hover:bg-[#1a1a1a] border border-transparent'
                    }`}
                >
                  <div className="font-medium truncate">{zone.name}</div>
                  <div className="text-[9px] text-[#555] mt-0.5">Floor {zone.floor}</div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Weather Widget */}
      {weather && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card p-3 mb-4"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Cloud className="w-4 h-4 text-[#666]" />
              <span className="text-xs text-[#999]">Mumbai</span>
            </div>
            <div className="flex items-center gap-1">
              <Thermometer className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-xs text-[#ccc] font-medium">{weather.temperature}°C</span>
            </div>
            <span className="text-xs text-[#666]">{weather.humidity}% humidity</span>
            {weather.rain > 0 && <span className="text-xs text-blue-400 flex items-center gap-0.5"><Droplets className="w-3 h-3" /> {weather.rain}mm</span>}
          </div>
        </motion.div>
      )}

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="section-title">Quick Actions</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action, i) => {
            const Icon = action.icon;
            return (
              <button
                key={i}
                onClick={() => navigate(action.path)}
                className={`card p-4 text-left transition-all active:scale-[0.97] ${action.path === '/emergency' ? 'col-span-2' : ''
                  }`}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 ${action.path === '/emergency' ? 'emergency-pulse' : ''
                  }`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-[#e8dcc8]">{action.label}</span>
                {action.path === '/emergency' && (
                  <p className="text-[10px] text-red-400/70 mt-1">Immediate help — fire, medical, security</p>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Recent Reports Widget */}
      {recentReports.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="mt-4"
        >
          <h2 className="section-title">Recent Reports</h2>
          <div className="space-y-2">
            {recentReports.slice(0, 2).map(report => (
              <div key={report.id} className="card p-3 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-[#ccc] font-medium">{report.category || 'Incident'}</span>
                  </div>
                  <span className={`text-[8px] font-semibold px-1.5 py-0.5 rounded ${
                    report.status === 'Resolved' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>{report.status}</span>
                </div>
                <p className="text-[11px] text-[#888] truncate">{report.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>

  );
}

export default GuestDashboard;
