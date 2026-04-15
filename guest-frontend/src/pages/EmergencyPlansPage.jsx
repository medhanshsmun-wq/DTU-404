import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, ChevronDown, ChevronUp, Phone, MapPin,
  Flame, Globe, Waves, HeartPulse, Lock
} from 'lucide-react';
import { useAuth } from '../App';

// Map backend icon keys to Lucide components
const ICON_MAP = {
  flame: Flame,
  globe: Globe,
  waves: Waves,
  'heart-pulse': HeartPulse,
  lock: Lock,
};

function PlanIcon({ name, className }) {
  const IconComponent = ICON_MAP[name];
  if (!IconComponent) return <Flame className={className} />;
  return <IconComponent className={className} />;
}

function EmergencyPlansPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState([]);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    api('/api/guest/emergency-plans').then(setPlans);
  }, []);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[#1a1a1a]">
          <ArrowLeft className="w-5 h-5 text-[#888]" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-[#f5f0e8]">Emergency Plans</h1>
          <p className="text-xs text-[#666]">Step-by-step safety procedures</p>
        </div>
      </div>

      {/* Plans List */}
      <div className="space-y-3">
        {plans.map((plan) => {
          const isOpen = expanded === plan.id;
          return (
            <motion.div
              key={plan.id}
              layout
              className="card overflow-hidden"
            >
              {/* Plan Header */}
              <button
                onClick={() => setExpanded(isOpen ? null : plan.id)}
                className="w-full p-4 flex items-center gap-3 text-left"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${plan.color}15` }}
                >
                  <PlanIcon name={plan.icon} className="w-6 h-6" style={{ color: plan.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-[#f5f0e8]">{plan.title}</h3>
                  <p className="text-[10px] text-[#666] mt-0.5">{plan.summary}</p>
                </div>
                {isOpen ? (
                  <ChevronUp className="w-5 h-5 text-[#555] flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-[#555] flex-shrink-0" />
                )}
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 space-y-3">
                      {/* Steps */}
                      <div className="space-y-2">
                        {plan.steps.map((step, i) => (
                          <div key={i} className="step-card">
                            <div className="step-number">{i + 1}</div>
                            <span>{step}</span>
                          </div>
                        ))}
                      </div>

                      {/* Assembly Point */}
                      {plan.assemblyPoint && (
                        <div className="bg-green-500/10 border border-green-500/25 rounded-xl p-3 flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-[10px] text-green-400 font-semibold uppercase">Assembly Point</p>
                            <p className="text-xs text-green-300/80 mt-0.5">{plan.assemblyPoint}</p>
                          </div>
                        </div>
                      )}

                      {/* Emergency Contact */}
                      <div className="bg-[#0a0a0a] border border-[#222] rounded-xl p-3 flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#888]" />
                        <span className="text-[11px] text-[#999]">{plan.emergencyContact}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

export default EmergencyPlansPage;
