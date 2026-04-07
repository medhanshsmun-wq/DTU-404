import React from 'react';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  return (
    <div className="w-full min-h-screen bg-[#06090f] relative">
      {/* Ambient background orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="ambient-blob absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-blue-600/[0.03] blur-3xl" />
        <div className="ambient-blob absolute top-1/2 -right-40 w-[500px] h-[500px] rounded-full bg-indigo-600/[0.03] blur-3xl" style={{animationDelay: '-7s'}} />
        <div className="ambient-blob absolute -bottom-40 left-1/3 w-[400px] h-[400px] rounded-full bg-cyan-600/[0.02] blur-3xl" style={{animationDelay: '-14s'}} />
      </div>
      <Dashboard />
    </div>
  );
}

export default App;
