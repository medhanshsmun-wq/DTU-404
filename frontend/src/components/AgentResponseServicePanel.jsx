import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bot, Send, Loader2, CheckCircle2, AlertCircle, 
  Sparkles, MapPin, ChevronRight, X, Maximize2, Minimize2,
  MessageSquare, Clock, Zap
} from 'lucide-react';
import { API_BASE_URL } from '../config';

const QUICK_PROMPTS = [
  "Fire in kitchen",
  "Medical emergency",
  "Suspicious activity",
  "Water leak detected",
];

function AgentResponseServicePanel() {
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('Facility - General');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    const userMessage = { role: 'user', content: description, location, timestamp: new Date() };
    setChatHistory(prev => [...prev, userMessage]);
    
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
      
      const assistantMessage = { 
        role: 'assistant', 
        incident, 
        latencyMs, 
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, assistantMessage]);
      setResult({ incident, latencyMs });
      setDescription('');
    } catch (err) {
      setError(err.message || 'Failed to reach backend service');
      const errorMessage = { 
        role: 'error', 
        content: err.message || 'Failed to reach backend service', 
        timestamp: new Date() 
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setDescription(prompt);
    inputRef.current?.focus();
  };

  const clearChat = () => {
    setChatHistory([]);
    setResult(null);
    setError('');
  };

  return (
    <div className={`card overflow-hidden transition-all duration-300 ${isExpanded ? 'fixed inset-4 z-50' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-[#1f1f1f]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">AI Dispatch</h3>
            <p className="text-[10px] text-[#525252]">Intelligent incident classification</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {result && (
            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-500/10 px-2 py-1 rounded-full border border-green-500/20">
              <Zap className="w-3 h-3" />
              {result.latencyMs}ms
            </span>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors text-[#525252] hover:text-white"
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Chat History */}
      <div className={`overflow-y-auto ${isExpanded ? 'h-[calc(100%-200px)]' : 'h-48'} p-4 space-y-3`}>
        {chatHistory.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center mb-3">
              <MessageSquare className="w-5 h-5 text-[#525252]" />
            </div>
            <p className="text-xs text-[#525252] max-w-[200px]">
              Describe an incident to get AI-powered classification and priority scoring
            </p>
          </div>
        ) : (
          chatHistory.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts */}
      {chatHistory.length === 0 && (
        <div className="px-4 pb-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleQuickPrompt(prompt)}
                className="text-[10px] px-2.5 py-1 rounded-full bg-[#1a1a1a] text-[#737373] border border-[#262626] hover:border-[#404040] hover:text-white transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-[#1f1f1f] bg-[#0a0a0a]">
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Location Select */}
          <div className="flex items-center gap-2">
            <MapPin className="w-3.5 h-3.5 text-[#525252]" />
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="flex-1 bg-transparent text-xs text-[#737373] focus:outline-none cursor-pointer"
            >
              <option value="Facility - General">Facility - General</option>
              <option value="Main Building - Lobby">Main Building - Lobby</option>
              <option value="Main Building - Floor 1">Main Building - Floor 1</option>
              <option value="Main Building - Floor 2">Main Building - Floor 2</option>
              <option value="East Wing - Lobby">East Wing - Lobby</option>
              <option value="West Wing - Lobby">West Wing - Lobby</option>
              <option value="Kitchen Area">Kitchen Area</option>
              <option value="Conference Hall">Conference Hall</option>
              <option value="Pool Area">Pool Area</option>
              <option value="Parking - Basement">Parking - Basement</option>
              <option value="Outdoor Terrace">Outdoor Terrace</option>
            </select>
          </div>

          {/* Text Input */}
          <div className="flex items-end gap-2">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                  }
                }}
                rows={2}
                className="input resize-none pr-10"
                placeholder="Describe the incident..."
                disabled={isSubmitting}
              />
              {description && !isSubmitting && (
                <button
                  type="button"
                  onClick={() => setDescription('')}
                  className="absolute right-2 top-2 p-1 rounded hover:bg-[#262626] text-[#525252] hover:text-white transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={!description.trim() || isSubmitting}
              className="btn-primary h-[52px] px-4 flex items-center justify-center disabled:opacity-30"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>

        {/* Clear Chat */}
        {chatHistory.length > 0 && (
          <button
            onClick={clearChat}
            className="mt-2 text-[10px] text-[#525252] hover:text-white transition-colors"
          >
            Clear conversation
          </button>
        )}
      </div>

      {/* Expanded Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/60 -z-10" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
}

function ChatMessage({ message }) {
  if (message.role === 'user') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-end"
      >
        <div className="max-w-[85%]">
          <div className="chat-bubble-user text-xs">
            {message.content}
          </div>
          <div className="flex items-center justify-end gap-2 mt-1">
            <span className="text-[9px] text-[#525252]">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[9px] text-[#404040]">{message.location}</span>
          </div>
        </div>
      </motion.div>
    );
  }

  if (message.role === 'error') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2"
      >
        <div className="w-6 h-6 rounded-full bg-red-500/10 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
        </div>
        <div className="flex-1">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-xs text-red-400">
            {message.content}
          </div>
        </div>
      </motion.div>
    );
  }

  // Assistant message with incident result
  const { incident, latencyMs } = message;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2"
    >
      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3 h-3 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="chat-bubble-assistant text-xs">
          {/* Classification Result */}
          <div className="flex flex-wrap items-center gap-1.5 mb-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              incident.tier === 'Critical' ? 'bg-red-500/20 text-red-400' :
              incident.tier === 'High' ? 'bg-orange-500/20 text-orange-400' :
              incident.tier === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              {incident.tier || incident.priorityBand}
            </span>
            <span className="px-2 py-0.5 rounded bg-[#262626] text-[#a1a1a1] text-[10px]">
              {incident.hazardType}
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
              incident.score >= 8 ? 'bg-red-500/20 text-red-400' :
              incident.score >= 6 ? 'bg-orange-500/20 text-orange-400' :
              'bg-green-500/20 text-green-400'
            }`}>
              Score: {incident.score}
            </span>
          </div>

          {/* Factors */}
          {incident.factors && (
            <div className="grid grid-cols-6 gap-1 mb-2">
              {Object.entries(incident.factors).map(([key, val]) => (
                <div key={key} className="text-center bg-[#1a1a1a] rounded px-1 py-0.5">
                  <div className="text-[8px] text-[#525252] font-semibold">{key}</div>
                  <div className={`text-[10px] font-bold ${
                    val >= 8 ? 'text-red-400' : val >= 6 ? 'text-orange-400' : 'text-[#a1a1a1]'
                  }`}>
                    {typeof val === 'number' ? val.toFixed(1) : val}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Explanation */}
          {Array.isArray(incident.explanation) && incident.explanation.length > 0 && (
            <ul className="space-y-0.5">
              {incident.explanation.slice(0, 2).map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5 text-[#a1a1a1]">
                  <CheckCircle2 className="w-3 h-3 mt-0.5 text-green-400/70 flex-shrink-0" />
                  <span className="line-clamp-1">{item}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[9px] text-[#525252]">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-[9px] text-green-400">{latencyMs}ms</span>
        </div>
      </div>
    </motion.div>
  );
}

export default AgentResponseServicePanel;
