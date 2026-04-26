import { AnalyticsView, SensorsView, AlertsView, SettingsView } from './views/LiveViews';
import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import Dashboard from './components/Dashboard';
import Sidebar from './components/Sidebar';
import IncidentsView from './views/IncidentsView';
import ServicesView from './views/ServicesView';
import SecurityScannerView from './views/SecurityScannerView';
import { API_BASE_URL } from './config';
import './App.css';

function App() {
  const [activeView, setActiveView] = useState('overview');
  const [incidentCount, setIncidentCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Socket connection for status
  useEffect(() => {
    const socket = io(API_BASE_URL);
    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));
    return () => socket.disconnect();
  }, []);

  const handleViewChange = (view) => {
    setActiveView(view);
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0a0a]">
      {/* Sidebar */}
      <Sidebar 
        activeView={activeView} 
        onViewChange={handleViewChange}
        incidentCount={incidentCount}
        isConnected={isConnected}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content */}
      <main className={`main-content ${isSidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {activeView === 'overview' ? (
          <Dashboard onIncidentCountChange={setIncidentCount} />
        ) : activeView === 'incidents' ? (
          <IncidentsView />
        ) : activeView === 'services' ? (
          <ServicesView />
        ) : activeView === 'security' ? (
          <SecurityScannerView />
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
    </div>
  );
}

export default App;
