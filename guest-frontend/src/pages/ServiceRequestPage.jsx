import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, CheckCircle, Clock, Loader2,
  UtensilsCrossed, Sparkles, BellRing, Wrench, Shirt,
  Bath, CupSoda, AlarmClock, Car
} from 'lucide-react';
import { useAuth } from '../App';

// Map backend icon keys to Lucide components
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
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return <BellRing className={className} />;
  return <IconComponent className={className} />;
}

function ServiceRequestPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [serviceTypes, setServiceTypes] = useState([]);
  const [requests, setRequests] = useState([]);
  const [selectedType, setSelectedType] = useState(null);
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    api('/api/guest/service-types').then(setServiceTypes);
    api('/api/guest/service-requests').then(setRequests);
  }, []);

  const handleSubmit = async () => {
    if (!selectedType) return;
    setIsSubmitting(true);
    try {
      const result = await api('/api/guest/service-request', {
        method: 'POST',
        body: JSON.stringify({ type: selectedType, details }),
      });
      if (result.id) {
        setSuccessMsg(`${result.typeName} request submitted!`);
        setSelectedType(null);
        setDetails('');
        const updated = await api('/api/guest/service-requests');
        setRequests(updated);
        setTimeout(() => setSuccessMsg(''), 3000);
      }
    } catch {
      setSuccessMsg('Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[#1a1a1a]">
          <ArrowLeft className="w-5 h-5 text-[#888]" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-[#f5f0e8]">Hotel Services</h1>
          <p className="text-xs text-[#666]">Request room service, housekeeping & more</p>
        </div>
      </div>

      {/* Success Toast */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="flex items-center gap-2 bg-green-500/10 border border-green-500/25 rounded-xl px-4 py-3 text-xs text-green-400 mb-4"
        >
          <CheckCircle className="w-4 h-4" />
          {successMsg}
        </motion.div>
      )}

      {/* Service Types Grid */}
      <h2 className="section-title">Available Services</h2>
      <div className="grid grid-cols-3 gap-2 mb-6">
        {serviceTypes.map((svc) => (
          <button
            key={svc.id}
            onClick={() => setSelectedType(selectedType === svc.id ? null : svc.id)}
            className={`service-card text-center ${
              selectedType === svc.id ? 'border-[#d4af37]/50 bg-[#d4af37]/5' : ''
            }`}
          >
            <ServiceIcon
              name={svc.icon}
              className={`w-6 h-6 mx-auto mb-2 ${
                selectedType === svc.id ? 'text-[#d4af37]' : 'text-[#888]'
              }`}
            />
            <span className="text-[10px] font-medium text-[#ccc] block">{svc.name}</span>
            <span className="text-[9px] text-[#555] block mt-0.5">~{svc.estimatedMin}m</span>
          </button>
        ))}
      </div>

      {/* Details + Submit */}
      {selectedType && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 mb-6">
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Any special instructions? (optional)"
            className="input h-20 resize-none"
          />
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="btn-primary flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            ) : (
              'Request Service'
            )}
          </button>
        </motion.div>
      )}

      {/* Active Requests */}
      {requests.length > 0 && (
        <>
          <h2 className="section-title mt-6">Your Requests</h2>
          <div className="space-y-2">
            {requests.map((req) => (
              <div key={req.id} className="card p-3 flex items-center gap-3">
                <ServiceIcon name={req.typeIcon} className="w-5 h-5 text-[#d4af37]" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#ccc]">{req.typeName}</p>
                  {req.details && <p className="text-[10px] text-[#666] truncate">{req.details}</p>}
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`badge text-[9px] ${
                    req.status === 'pending' ? 'badge-gold' :
                    req.status === 'in_progress' ? 'bg-blue-500/15 text-blue-400' :
                    'bg-green-500/15 text-green-400'
                  }`}>
                    {req.status === 'pending' ? (
                      <><Clock className="w-2.5 h-2.5" /> Pending</>
                    ) : req.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ServiceRequestPage;
