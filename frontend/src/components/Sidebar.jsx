import React from 'react';
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
  Zap
} from 'lucide-react';

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'incidents', label: 'Incidents', icon: AlertCircle, badge: null },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'sensors', label: 'Sensors', icon: Radio },
];

const SECONDARY_NAV = [
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

function Sidebar({ activeView, onViewChange, incidentCount = 0, isConnected = false }) {
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

      {/* Connection Status */}
      <div className="px-5 py-3 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className={`text-xs font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          {isConnected && (
            <span className="ml-auto text-[10px] text-[#525252] bg-[#1a1a1a] px-1.5 py-0.5 rounded">
              Live
            </span>
          )}
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
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`nav-item w-full ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
              {showBadge && (
                <span className="min-w-[20px] h-5 flex items-center justify-center bg-red-500/15 text-red-400 text-[10px] font-semibold rounded-full px-1.5">
                  {incidentCount}
                </span>
              )}
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-[#525252]" />}
            </button>
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
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`nav-item w-full ${isActive ? 'active' : ''}`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1 text-left">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Quick Actions */}
      <div className="p-3 border-t border-[#1f1f1f]">
        <button
          onClick={() => onViewChange('simulate')}
          className="w-full flex items-center justify-center gap-2 bg-white text-black font-medium px-4 py-2.5 rounded-lg text-sm transition-all hover:bg-neutral-200"
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
