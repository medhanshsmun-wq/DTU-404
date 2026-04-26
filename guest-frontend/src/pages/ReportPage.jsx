import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Send, Loader2, CheckCircle, AlertTriangle,
  Flame, Droplets, Heart, ShieldAlert, Wrench, HelpCircle
} from 'lucide-react';
import { useAuth } from '../App';

const CATEGORIES = [
  { id: 'fire', label: 'Fire / Smoke', icon: Flame, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'flood', label: 'Water / Flood', icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'medical', label: 'Medical', icon: Heart, color: 'text-pink-400', bg: 'bg-pink-500/10' },
  { id: 'security', label: 'Security', icon: ShieldAlert, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'infrastructure', label: 'Facility Issue', icon: Wrench, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  { id: 'other', label: 'Other', icon: HelpCircle, color: 'text-[#888]', bg: 'bg-[#1a1a1a]' },
];

function ReportPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [isResolved, setIsResolved] = useState(false);

  const [recentReports, setRecentReports] = useState([]);

  useEffect(() => {
    api('/api/guest/reports').then(setRecentReports).catch(() => {});
  }, [api, result, isResolved]);

  // Handle report UI rendering ...

  const handleResolve = async () => {
    if (!result || !result.incidentId || isResolved) return;
    try {
      await api('/api/guest/resolve', {
        method: 'POST',
        body: JSON.stringify({ incidentId: result.incidentId }),
      });
      setIsResolved(true);
    } catch (e) {
      console.error("Failed to resolve incident", e);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    try {
      const data = await api('/api/guest/report', {
        method: 'POST',
        body: JSON.stringify({ category, description }),
      });
      setResult(data);
    } catch {
      setResult({ error: 'Failed to submit report' });
    } finally {
      setIsSubmitting(false);
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/15 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-[#f5f0e8] mb-2">Report Submitted</h2>
          <p className="text-sm text-[#888] mb-1">
            Priority: <span className={`font-bold ${
              result.tier === 'Critical' ? 'text-red-400' :
              result.tier === 'High' ? 'text-orange-400' :
              result.tier === 'Medium' ? 'text-yellow-400' : 'text-green-400'
            }`}>{result.tier}</span>
          </p>
          <p className="text-xs text-[#555] mb-6">Our team has been notified and will respond shortly.</p>
          <div className="flex flex-col gap-3 max-w-xs mx-auto">
            {isResolved ? (
              <div className="text-xs text-green-400 bg-green-500/10 border border-green-500/20 py-2 rounded-xl flex items-center justify-center gap-2">
                <CheckCircle className="w-4 h-4" />
                Marked as Resolved
              </div>
            ) : (
              <button onClick={handleResolve} className="btn bg-[#1a1a1a] text-[#a1a1a1] hover:text-green-400 hover:bg-green-500/10 border border-[#333] hover:border-green-500/30">
                Problem Resolved
              </button>
            )}
            <button onClick={() => navigate('/')} className="btn-primary">
              Return Home
            </button>
          </div>
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
          <h1 className="text-lg font-semibold text-[#f5f0e8]">Report an Issue</h1>
          <p className="text-xs text-[#666]">Help us keep everyone safe</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Category Selection */}
        <div>
          <label className="section-title">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isSelected
                      ? `${cat.bg} border-current ${cat.color}`
                      : 'bg-[#111] border-[#222] text-[#666] hover:border-[#333]'
                  }`}
                >
                  <Icon className={`w-5 h-5 mx-auto mb-1 ${isSelected ? cat.color : 'text-[#555]'}`} />
                  <span className="text-[10px] font-medium">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="section-title">What's happening?</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what you see or are experiencing..."
            className="input h-32 resize-none"
            disabled={isSubmitting}
          />
        </div>

        {result?.error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4" />
            {result.error}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!description.trim() || isSubmitting}
          className="btn-primary flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
          ) : (
            <><Send className="w-4 h-4" /> Submit Report</>
          )}
        </button>
      </form>

      {/* Recent Reports */}
      {recentReports.length > 0 && (
        <div className="mt-8 pt-6 border-t border-[#222]">
          <h2 className="section-title">Your Recent Reports</h2>
          <div className="space-y-3">
            {recentReports.map(report => (
              <div key={report.id} className="card p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`badge text-[9px] ${
                      report.tier === 'Critical' ? 'badge-critical' :
                      report.tier === 'High' ? 'badge-high' :
                      'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                    }`}>{report.tier}</span>
                    <span className="text-[10px] text-[#ccc] font-medium">{report.category}</span>
                  </div>
                  <span className={`text-[9px] font-semibold px-2 py-0.5 rounded ${
                    report.status === 'Resolved' ? 'bg-green-500/10 text-green-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>{report.status}</span>
                </div>
                <p className="text-xs text-[#888]">{report.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

export default ReportPage;
