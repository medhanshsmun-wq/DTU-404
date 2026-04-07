import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Send, Loader2, CheckCircle2, AlertCircle, Cpu, Zap } from 'lucide-react';
import { API_BASE_URL } from '../config';

function AgentResponseServicePanel() {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Taj Hotel Mumbai - General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsSubmitting(true);
    setError('');
    setResult(null);

    try {
      const start = performance.now();
      const response = await fetch(`${API_BASE_URL}/api/incidents/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, location }),
      });

      if (!response.ok) throw new Error('Backend returned an error');

      const incident = await response.json();
      const latencyMs = Math.round(performance.now() - start);
      setResult({ incident, latencyMs });
    } catch (err) {
      setError(err.message || 'Failed to reach backend service');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-4 overflow-hidden">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center text-xs font-semibold text-white gap-2">
          <div className="p-1.5 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
            <Bot className="h-3.5 w-3.5 text-indigo-400" />
          </div>
          Quick Dispatch
        </h3>
        {result && (
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
            <Zap className="w-2.5 h-2.5" />
            {result.latencyMs}ms
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-indigo-500/50 placeholder:text-slate-600"
          placeholder="Location"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-slate-700/50 bg-slate-900/60 px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none"
          placeholder="Describe an incident..."
        />
        <button
          type="submit"
          disabled={!description.trim() || isSubmitting}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-500 px-3 py-2 text-xs font-semibold text-white transition hover:from-indigo-500 hover:to-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/10"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="h-3 w-3" />
              Dispatch
            </>
          )}
        </button>
      </form>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 flex items-start rounded-lg border border-red-500/20 bg-red-500/8 p-2.5 text-[11px] text-red-300 gap-2"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 rounded-lg border border-slate-700/40 bg-slate-900/50 p-3"
          >
            <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[10px]">
              <span className={`rounded-md px-1.5 py-0.5 font-bold border ${
                result.incident.tier === 'Critical' ? 'bg-red-500/15 text-red-400 border-red-500/30' :
                result.incident.tier === 'High' ? 'bg-orange-500/15 text-orange-400 border-orange-500/30' :
                result.incident.tier === 'Medium' ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30' :
                'bg-blue-500/15 text-blue-400 border-blue-500/30'
              }`}>
                {result.incident.tier || result.incident.priorityBand}
              </span>
              <span className="rounded-md bg-slate-800/80 px-1.5 py-0.5 text-slate-300 border border-slate-700/50">
                {result.incident.hazardType}
              </span>
              <span className={`rounded-md px-1.5 py-0.5 font-bold ${
                result.incident.score >= 8 ? 'bg-red-500/15 text-red-400' :
                result.incident.score >= 6 ? 'bg-orange-500/15 text-orange-400' :
                'bg-emerald-500/15 text-emerald-400'
              }`}>
                Score {result.incident.score}
              </span>
            </div>

            {/* Factor pills */}
            {result.incident.factors && (
              <div className="grid grid-cols-6 gap-1 mb-2">
                {Object.entries(result.incident.factors).map(([key, val]) => (
                  <div key={key} className="text-center bg-slate-800/40 rounded px-1 py-0.5">
                    <div className="text-[8px] text-slate-500 font-bold">{key}</div>
                    <div className={`text-[10px] font-black ${val >= 8 ? 'text-red-400' : val >= 6 ? 'text-orange-400' : 'text-slate-300'}`}>
                      {typeof val === 'number' ? val.toFixed(1) : val}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {Array.isArray(result.incident.explanation) && result.incident.explanation.length > 0 && (
              <ul className="space-y-0.5 text-[10px] text-slate-400">
                {result.incident.explanation.slice(0, 2).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <CheckCircle2 className="h-2.5 w-2.5 mt-0.5 text-emerald-400/70" />
                    <span className="line-clamp-1">{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

export default AgentResponseServicePanel;
