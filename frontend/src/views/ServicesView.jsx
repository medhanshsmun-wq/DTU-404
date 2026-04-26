import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UtensilsCrossed, Sparkles, BellRing, Wrench, Shirt, Bath, CupSoda, AlarmClock, Car, CheckCircle, Clock, Loader2, Search } from 'lucide-react';
import { io } from 'socket.io-client';
import { API_BASE_URL } from '../config';

const ICON_MAP = {
  utensils: UtensilsCrossed,
  sparkles: Sparkles,
  'bell-ring': BellRing,
  wrench: Wrench,
  shirt: Shirt,
  bath: Bath,
  'cup-soda': CupSoda,
  'alarm-clock': AlarmClock,
  car: Car,
};

function ServiceIcon({ name, className }) {
  const IconComponent = ICON_MAP[name] || BellRing;
  return <IconComponent className={className} />;
}

export default function ServicesView() {
  const [requests, setRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedView, setSelectedView] = useState('all');
  const [serviceTypes, setServiceTypes] = useState([]);

  useEffect(() => {
    // Initial fetch
    fetch(`${API_BASE_URL}/api/guest/service-types`)
      .then(res => res.json())
      .then(data => setServiceTypes(data))
      .catch(err => console.error("Failed to fetch service types:", err));
      
    // Ideally we should use socket for live updates or polling
    const fetchRequests = () => {
      fetch(`${API_BASE_URL}/api/service-requests/all`) // Need to create this endpoint
        .then(res => res.json())
        .then(data => setRequests(data))
        .catch(err => console.error("Failed to fetch service requests:", err));
    };
    
    fetchRequests();
    const interval = setInterval(fetchRequests, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateRequestStatus = (guestId, reqId, status) => {
    fetch(`${API_BASE_URL}/api/service-requests/${guestId}/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    }).then(res => res.json())
      .then(data => {
         if (data.success) {
           setRequests(prev => prev.map(r => (r.id === reqId && r.guestId === guestId) ? { ...r, status } : r));
         }
      })
      .catch(err => console.error(err));
  };

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.typeName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.guestId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (selectedView === 'pending') return matchesSearch && r.status === 'pending';
    if (selectedView === 'in_progress') return matchesSearch && r.status === 'in_progress';
    if (selectedView === 'completed') return matchesSearch && r.status === 'completed';
    return matchesSearch;
  });

  return (
    <div className="p-6 h-screen flex flex-col space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Hotel Services</h1>
          <p className="text-sm text-[#737373] mt-1">Manage guest requests, room service, and housekeeping.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#525252]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search requests..."
              className="input pl-9 pr-3 py-2 w-64 text-sm"
            />
          </div>

          <div className="flex items-center bg-[#111111] rounded-lg border border-[#1f1f1f] p-1">
            {[
              { key: 'all', label: 'All' },
              { key: 'pending', label: 'Pending' },
              { key: 'in_progress', label: 'In Progress' },
              { key: 'completed', label: 'Completed' },
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredRequests.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="col-span-full card p-16 flex flex-col items-center justify-center text-center border-dashed"
              >
                <BellRing className="w-16 h-16 mb-4 text-[#262626]" />
                <h3 className="text-lg font-medium text-[#a1a1a1]">No Active Requests</h3>
                <p className="max-w-md mt-2 text-sm text-[#525252] leading-relaxed">
                  No service requests match your current search and filter settings.
                </p>
              </motion.div>
            ) : (
              filteredRequests.map((req, index) => (
                <motion.div
                  key={`${req.guestId}-${req.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className="card p-4 flex flex-col gap-3"
                  layout
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                       <ServiceIcon name={req.typeIcon} className="w-5 h-5 text-[#d4af37]" />
                       <span className="font-semibold text-white text-sm">{req.typeName}</span>
                    </div>
                    <span className={`badge text-[10px] ${
                      req.status === 'pending' ? 'badge-gold' :
                      req.status === 'in_progress' ? 'bg-blue-500/15 text-blue-400' :
                      'bg-green-500/15 text-green-400'
                    }`}>
                      {req.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div className="text-xs text-[#a1a1a1]">
                    <span className="font-medium text-[#737373]">Guest ID:</span> {req.guestId}
                  </div>
                  {req.items && req.items.length > 0 && (
                    <div className="bg-[#1a1a1a] rounded p-2 text-xs text-[#ccc]">
                       <span className="font-medium text-[#737373] block mb-1">Order Items:</span>
                       <ul className="list-disc pl-4 space-y-1">
                         {req.items.map((item, i) => (
                           <li key={i}>{item.name} <span className="text-[#888]">- ${item.price}</span></li>
                         ))}
                       </ul>
                       <div className="mt-2 text-right font-semibold text-[#d4af37]">Total: ${req.items.reduce((sum, item) => sum + item.price, 0).toFixed(2)}</div>
                    </div>
                  )}
                  {req.details && (
                    <div className="bg-[#1a1a1a] rounded p-2 text-xs text-[#ccc]">
                      <span className="font-medium text-[#737373]">Notes:</span> {req.details}
                    </div>
                  )}
                  <div className="mt-auto pt-3 border-t border-[#1f1f1f] flex gap-2">
                     {req.status === 'pending' && (
                       <button onClick={() => updateRequestStatus(req.guestId, req.id, 'in_progress')} className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded transition-colors">
                         Accept Request
                       </button>
                     )}
                     {req.status === 'in_progress' && (
                       <button onClick={() => updateRequestStatus(req.guestId, req.id, 'completed')} className="flex-1 py-1.5 bg-green-600 hover:bg-green-500 text-white text-xs font-medium rounded transition-colors">
                         Mark Completed
                       </button>
                     )}
                  </div>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
