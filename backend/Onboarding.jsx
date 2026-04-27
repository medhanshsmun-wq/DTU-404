import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Activity, PhoneCall, Eye, Cpu, Zap } from 'lucide-react';

export default function Onboarding() {
  const navigate = useNavigate();

  const capabilities = [
    {
      icon: <Eye className="w-6 h-6 text-blue-400" />,
      title: "Hybrid Edge-to-Cloud AI Vision",
      description: "Combines high-speed local YOLOv8 detection with Gemini Multimodal AI for zero-latency, zero-false-positive medical and security threat verification.",
      color: "from-blue-500/20 to-blue-500/5"
    },
    {
      icon: <Activity className="w-6 h-6 text-red-400" />,
      title: "Unified Priority Engine",
      description: "Context-aware scoring using the V/S/I/H/L/P framework. Instantly evaluates life threat, spread risk, and location context tailored to the Taj Hotel's specific risk baseline.",
      color: "from-red-500/20 to-red-500/5"
    },
    {
      icon: <PhoneCall className="w-6 h-6 text-green-400" />,
      title: "Autonomous Voice Dispatch",
      description: "Multi-tiered autonomy (A0-A3). Automatically calculates optimal routing and initiates synthetic voice calls in Hindi and English to EMS, Fire, and Police.",
      color: "from-green-500/20 to-green-500/5"
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-orange-400" />,
      title: "Dynamic Personnel Routing",
      description: "Simulated HR integration routes on-duty security, engineering, and medical staff to incident zones based on proximity, hazard type, and severity.",
      color: "from-orange-500/20 to-orange-500/5"
    },
    {
      icon: <Cpu className="w-6 h-6 text-purple-400" />,
      title: "Continuous Environmental Reranking",
      description: "Constantly polls Open-Meteo and USGS for weather and seismic shifts. Active incidents are reranked every 5 seconds to adapt to unfolding environmental hazards.",
      color: "from-purple-500/20 to-purple-500/5"
    },
    {
      icon: <Zap className="w-6 h-6 text-yellow-400" />,
      title: "Guest App Integration",
      description: "Bi-directional WebSocket communication. Pushes real-time, zone-specific alerts to guests while allowing them to trigger geo-located SOS panics and service requests.",
      color: "from-yellow-500/20 to-yellow-500/5"
    }
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f0e8] font-sans selection:bg-[#d4af37] selection:text-black">
      {/* Hero Section */}
      <div className="relative overflow-hidden border-b border-[#1f1f1f]">
        <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-[0.03]"></div>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-blue-500/10 blur-[100px] pointer-events-none"></div>
        
        <div className="max-w-6xl mx-auto px-6 py-24 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#111] border border-[#222] mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-xs font-medium text-[#a1a1a1] tracking-wide uppercase">System Online • v2.0 Platform</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            Taj Hotel <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#d4af37] to-[#a88b2a]">Crisis Response</span>
          </h1>
          
          <p className="text-lg md:text-xl text-[#888] max-w-3xl mx-auto leading-relaxed mb-10">
            An autonomous, event-driven command center. Harnessing edge computer vision, multimodal LLMs, and dynamic priority scoring to protect guests and staff in real-time.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={() => navigate('/dashboard')}
              className="px-8 py-3.5 bg-gradient-to-r from-[#d4af37] to-[#a88b2a] text-black font-semibold rounded-lg shadow-lg shadow-[#d4af37]/20 hover:scale-105 transition-all"
            >
              Launch Command Center
            </button>
            <button 
              onClick={() => navigate('/guest-portal')}
              className="px-8 py-3.5 bg-[#111] border border-[#333] text-white font-semibold rounded-lg hover:bg-[#1a1a1a] hover:border-[#444] transition-all"
            >
              Simulate Guest App
            </button>
          </div>
        </div>
      </div>

      {/* Capabilities Grid */}
      <div className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-4">Platform Capabilities</h2>
          <p className="text-[#888]">The intelligence driving our unified incident management.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, idx) => (
            <div key={idx} className="group relative bg-[#111] border border-[#222] rounded-2xl p-6 hover:border-[#444] transition-all duration-300">
              <div className={`absolute inset-0 bg-gradient-to-br ${cap.color} opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none`}></div>
              
              <div className="relative z-10">
                <div className="w-12 h-12 bg-[#0a0a0a] border border-[#222] rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                  {cap.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{cap.title}</h3>
                <p className="text-sm text-[#737373] leading-relaxed">
                  {cap.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Architecture Teaser */}
      <div className="border-t border-[#1f1f1f] bg-[#0d0d0d]">
        <div className="max-w-4xl mx-auto px-6 py-20 text-center">
          <ShieldAlert className="w-12 h-12 text-[#d4af37] mx-auto mb-6" />
          <h2 className="text-2xl font-bold mb-4">Ready to initialize?</h2>
          <p className="text-[#888] mb-8">
            Ensure your backend is running on <code className="bg-[#1a1a1a] px-2 py-1 rounded text-[#ccc]">localhost:3001</code> and the Python YOLO-Pose pipeline is active to experience the full autonomous hybrid flow.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-[#1a1a1a] text-white border border-[#333] rounded-lg hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-colors"
          >
            Enter Operator Mode
          </button>
        </div>
      </div>
    </div>
  );
}