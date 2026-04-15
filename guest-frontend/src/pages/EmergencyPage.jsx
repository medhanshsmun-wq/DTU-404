import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Phone, ShieldAlert, Flame, Heart, Siren,
  Loader2, CheckCircle, AlertTriangle
} from 'lucide-react';
import { useAuth } from '../App';

const EMERGENCY_TYPES = [
  { id: 'fire', label: 'Fire', Icon: Flame },
  { id: 'medical', label: 'Medical', Icon: Heart },
  { id: 'security', label: 'Security', Icon: ShieldAlert },
  { id: 'other', label: 'Other', Icon: AlertTriangle },
];

const EMERGENCY_CONTACTS = [
  { label: 'Hotel Security', number: 'EXT-100', icon: ShieldAlert, color: 'text-amber-400' },
  { label: 'Hotel Medical', number: 'EXT-300', icon: Heart, color: 'text-pink-400' },
  { label: 'Fire Emergency', number: '101', icon: Flame, color: 'text-red-400' },
  { label: 'Ambulance', number: '108', icon: Siren, color: 'text-blue-400' },
  { label: 'Police', number: '100', icon: ShieldAlert, color: 'text-purple-400' },
  { label: 'Universal Emergency', number: '112', icon: Phone, color: 'text-green-400' },
];

function EmergencyPage() {
  const { api, guest } = useAuth();
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleEmergency = async () => {
    setIsSubmitting(true);
    try {
      const data = await api('/api/guest/emergency', {
        method: 'POST',
        body: JSON.stringify({ type: selectedType || 'unspecified' }),
      });
      setResult(data);
    } catch {
      setResult({ error: 'Failed to send emergency alert' });
    } finally {
      setIsSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (result && result.success) {
    return (
      <div className="page-container flex flex-col items-center justify-center min-h-[80vh]">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-500/15 flex items-center justify-center emergency-pulse">
            <Siren className="w-10 h-10 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-[#f5f0e8] mb-2">Help is on the way</h2>
          <p className="text-sm text-[#888] mb-1">
            Alert dispatched as <span className="text-red-400 font-semibold">{result.tier}</span> priority
          </p>
          <p className="text-xs text-[#555] mb-6">
            Stay where you are. Hotel security and emergency teams have been notified.
          </p>
          <div className="card p-4 mb-4 text-left">
            <p className="text-xs text-[#888] mb-2">Your location has been shared:</p>
            <p className="text-sm text-[#ccc] font-medium">Room {guest?.room} — {guest?.firstName} {guest?.lastName}</p>
          </div>
          <button onClick={() => navigate('/')} className="btn-secondary">
            Return Home
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[#1a1a1a]">
          <ArrowLeft className="w-5 h-5 text-[#888]" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-red-400">Emergency</h1>
          <p className="text-xs text-[#666]">Get immediate help</p>
        </div>
      </div>

      {/* Emergency Type */}
      <div className="mb-5">
        <h2 className="section-title">Type (optional)</h2>
        <div className="grid grid-cols-4 gap-2">
          {EMERGENCY_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => setSelectedType(selectedType === type.id ? '' : type.id)}
              className={`p-3 rounded-xl border text-center transition-all ${
                selectedType === type.id
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-[#111] border-[#222] text-[#666]'
              }`}
            >
              <type.Icon className={`w-6 h-6 mx-auto mb-1 ${selectedType === type.id ? 'text-red-400' : 'text-[#666]'}`} />
              <span className="text-[10px] font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* PANIC BUTTON */}
      <div className="mb-8">
        {showConfirm ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            <div className="bg-red-500/10 border border-red-500/25 rounded-xl p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-red-400 mx-auto mb-2" />
              <p className="text-sm text-red-300 font-medium mb-1">Confirm Emergency Alert</p>
              <p className="text-xs text-red-400/60">This will immediately notify hotel security and emergency services.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setShowConfirm(false)} className="btn-secondary">Cancel</button>
              <button
                onClick={handleEmergency}
                disabled={isSubmitting}
                className="btn-emergency flex items-center justify-center gap-2 !py-3"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Siren className="w-5 h-5" />}
                {isSubmitting ? 'Sending...' : 'CONFIRM'}
              </button>
            </div>
          </motion.div>
        ) : (
          <button onClick={() => setShowConfirm(true)} className="btn-emergency flex items-center justify-center gap-3">
            <Siren className="w-6 h-6" />
            <span className="text-lg">EMERGENCY ALERT</span>
          </button>
        )}
      </div>

      {/* Emergency Contacts */}
      <h2 className="section-title">Emergency Contacts</h2>
      <div className="space-y-2">
        {EMERGENCY_CONTACTS.map((contact, i) => {
          const Icon = contact.icon;
          return (
            <a
              key={i}
              href={`tel:${contact.number}`}
              className="card p-3 flex items-center gap-3 active:bg-[#1a1a1a] transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-[#1a1a1a] flex items-center justify-center">
                <Icon className={`w-5 h-5 ${contact.color}`} />
              </div>
              <div className="flex-1">
                <p className="text-xs font-medium text-[#ccc]">{contact.label}</p>
                <p className="text-sm font-bold text-[#f5f0e8]">{contact.number}</p>
              </div>
              <Phone className="w-4 h-4 text-[#555]" />
            </a>
          );
        })}
      </div>
    </div>
  );
}

export default EmergencyPage;
