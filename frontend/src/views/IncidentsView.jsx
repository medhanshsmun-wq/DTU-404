import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Shield, Filter, CheckCircle, Clock } from 'lucide-react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';
import IncidentCard from '../components/IncidentCard';

export default function IncidentsView() {
  const [incidents, setIncidents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState('all');

  useEffect(() => {
    const socket = io(API_BASE_URL);
    socket.on('incidents_update', (data) => setIncidents(data));
    return () => socket.disconnect();
  }, []);

  const handleResolve = (id) => {
    const socket = io(API_BASE_URL);
    socket.emit('resolve_incident', id);
  };

  const filteredIncidents = incidents.filter(i => {
    const matchesSearch = i.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.rawDescription?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          i.hazardType?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedView === 'critical') return matchesSearch && i.tier === 'Critical';
    if (selectedView === 'high') return matchesSearch && (i.tier === 'High' || i.tier === 'Critical');
    if (selectedView === 'active') return matchesSearch && (i.status === 'Active' || i.status === 'En Route');
    if (selectedView === 'resolved') return matchesSearch && i.status === 'Resolved';
    return matchesSearch;
  });

  return (
    <div className="p-6 h-screen flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Incident Operations Center</h1>
          <p className="text-sm text-[#737373] mt-1">Full triage and resolution workspace for all reported incidents.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search database..."
              className="input pl-9 pr-3 py-2 w-64 text-sm"
            />
          </div>

          <div className="flex items-center bg-[#111111] rounded-lg border border-[#1f1f1f] p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'active', label: 'Active' },
              { key: 'critical', label: 'Critical' },
              { key: 'resolved', label: 'Resolved' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setSelectedView(tab.key)}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${
                  selectedView === tab.key
                    ? 'bg-[#262626] text-white shadow-sm'
                    : 'text-[#737373] hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredIncidents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full card p-16 flex flex-col items-center justify-center text-center border-dashed"
              >
                <Shield className="w-16 h-16 mb-4 text-[#262626]" />
                <h3 className="text-lg font-medium text-[#a1a1a1]">No Matches</h3>
                <p className="max-w-md mt-2 text-sm text-[#525252] leading-relaxed">
                  No incidents match your current search and filter settings. Try adjusting your criteria.
                </p>
              </motion.div>
            ) : (
              filteredIncidents.map((incident, index) => (
                <motion.div
                  key={incident.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  layout
                >
                  <IncidentCard incident={incident} onResolve={handleResolve} />
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
