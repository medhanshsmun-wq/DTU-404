import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, FileWarning, BellRing, ShieldAlert, Info } from 'lucide-react';

const NAV_ITEMS = [
  { path: '/', label: 'Home', icon: Home },
  { path: '/report', label: 'Report', icon: FileWarning },
  { path: '/services', label: 'Services', icon: BellRing },
  { path: '/emergency', label: 'SOS', icon: ShieldAlert },
  { path: '/emergency-plans', label: 'Info', icon: Info },
];

function GuestNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="bottom-nav">
      <div className="bottom-nav-inner">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isEmergency = item.path === '/emergency';

          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`nav-btn ${isActive ? 'active' : ''}`}
            >
              <Icon className={`w-5 h-5 ${isEmergency ? (isActive ? 'text-red-400' : 'text-red-500/60') : ''}`} />
              <span className={`nav-label ${isEmergency ? (isActive ? 'text-red-400' : 'text-red-500/60') : ''}`}>
                {item.label}
              </span>
              {isActive && <div className="nav-indicator" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default GuestNavbar;
