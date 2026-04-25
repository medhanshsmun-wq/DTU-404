import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  AlertCircle,
  MessageSquare,
  Activity,
  Settings,
  Bell,
  BarChart3,
  Shield,
  Radio,
  ChevronRight,
  Zap,
  Clock
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Command center dashboard' },
  { id: 'incidents', label: 'Incidents', icon: AlertCircle, badge: null, description: 'Active incident feed' },
  { id: 'analytics', label: 'Analytics', icon: BarChart3, description: 'Performance metrics' },
  { id: 'sensors', label: 'Sensors', icon: Radio, description: 'IoT device network' },
];

const SECONDARY_NAV = [
  { id: 'alerts', label: 'Alerts', icon: Bell, description: 'System notifications' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'System configuration' },
];

function Sidebar({ activeView, onViewChange, incidentCount = 0, isConnected = false }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [hoveredItem, setHoveredItem] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatDate = (date) => {
    return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <aside className="sidebar">
      {/* Logo Section */}
      <div className="p-5 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center">
            <Shield className="w-5 h-5 text-black" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-semibold text-white tracking-tight">Sentinel Command</h1>
            <p className="text-[11px] text-[#525252] truncate">Response Management</p>
          </div>
        </div>
      </div>

      {/* Connection Status + Clock */}
      <div className="px-5 py-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2 mb-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 pulse-green' : 'bg-red-500 pulse-red'}`} />
          <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {isConnected && (
            <span className="ml-auto text-[10px] text-[#525252] bg-[#1a1a1a] px-1.5 py-0.5 rounded">
              Live
            </span>
          )}
        </div>
        {/* Real-time Clock */}
        <div className="flex items-center gap-2 text-[10px]">
          <Clock className="w-3 h-3 text-[#404040]" />
          <span className="text-[#525252] font-mono tabular-nums">{formatTime(currentTime)}</span>
          <span className="text-[#333333]">·</span>
          <span className="text-[#404040]">{formatDate(currentTime)}</span>
        </div>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="mb-3">
          <span className="px-3 text-[10px] font-semibold text-[#525252] uppercase tracking-wider">
            Main
          </span>
        </div>
        
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const showBadge = item.id === 'incidents' && incidentCount > 0;
          const isHovered = hoveredItem === item.id;
          
          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => onViewChange(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`nav-item w-full ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 nav-icon ${isActive ? 'text-blue-400' : ''}`} />
                <span className="flex-1 text-left">{item.label}</span>
                {showBadge && (
                  <span className="min-w-[20px] h-5 flex items-center justify-center bg-red-500/15 text-red-400 text-[10px] font-semibold rounded-full px-1.5">
                    {incidentCount}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#525252]" />}
              </button>
              {/* Tooltip */}
              {isHovered && !isActive && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 px-2.5 py-1.5 bg-[#262626] rounded-lg shadow-xl border border-[#333333] whitespace-nowrap animate-fade-in pointer-events-none">
                  <div className="text-[11px] text-white font-medium">{item.label}</div>
                  <div className="text-[9px] text-[#525252]">{item.description}</div>
                </div>
              )}
            </div>
          );
        })}

        <div className="my-4 h-px bg-[#1f1f1f]" />
        
        <div className="mb-3">
          <span className="px-3 text-[10px] font-semibold text-[#525252] uppercase tracking-wider">
            System
          </span>
        </div>
        
        {SECONDARY_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          const isHovered = hoveredItem === item.id;
          
          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => onViewChange(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`nav-item w-full ${isActive ? 'active' : ''}`}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 nav-icon ${isActive ? 'text-blue-400' : ''}`} />
                <span className="flex-1 text-left">{item.label}</span>
              </button>
              {isHovered && !isActive && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 px-2.5 py-1.5 bg-[#262626] rounded-lg shadow-xl border border-[#333333] whitespace-nowrap animate-fade-in pointer-events-none">
                  <div className="text-[11px] text-white font-medium">{item.label}</div>
                  <div className="text-[9px] text-[#525252]">{item.description}</div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Quick Actions */}
      <div className="p-3 border-t border-[#1f1f1f]">
        <button
          onClick={() => onViewChange('simulate')}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-medium px-4 py-2.5 rounded-lg text-sm transition-all hover:bg-neutral-200 hover:scale-[1.02] active:scale-[0.98]"
        >
          <Zap className="w-4 h-4" />
          <span>Simulate Event</span>
        </button>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-semibold">
            OP
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Operator</p>
            <p className="text-[11px] text-[#525252] truncate">Control Room</p>
          </div>
          <button className="p-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors">
            <Settings className="w-4 h-4 text-[#525252]" />
          </button>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
