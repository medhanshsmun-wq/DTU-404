import React, { useState, useEffect, useRef } from 'react';
import { Camera, Maximize2, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CAMERAS = [
  { id: 'cam-01', label: 'CAM 01 - NORMAL HALLWAY', src: '/cctv/cam01_normal.mp4' },
  { id: 'cam-07', label: 'CAM 07 - HALLWAY (MEDICAL)', src: '/cctv/cam07_incident.mp4' },
];

export default function CCTVMonitor() {
  const [activeCam, setActiveCam] = useState(CAMERAS[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [isRecording, setIsRecording] = useState(true);
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const recTimer = setInterval(() => {
      setIsRecording(prev => !prev);
    }, 800);
    return () => clearInterval(recTimer);
  }, []);

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable fullscreen: ${err.message}`);
          setIsFullscreen(true); // fallback
        });
      } else {
        setIsFullscreen(true);
      }
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`card flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen bg-black rounded-none' : 'h-[400px]'}`}
    >
      {/* Header */}
      <div className="p-3 border-b border-[#222] flex items-center justify-between bg-[#111]">
        <h3 className="text-sm font-semibold text-white flex items-center gap-2">
          <Camera className="w-4 h-4 text-blue-400" />
          Live CCTV Feed
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#888] bg-[#1a1a1a] px-2 py-1 rounded">Edge AI: ACTIVE</span>
          <button onClick={handleFullscreen} className="p-1 hover:bg-[#222] rounded transition-colors text-[#888] hover:text-white">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Feed Area */}
      <div className="flex-1 relative bg-black overflow-hidden group">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCam.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <video 
              ref={videoRef}
              key={activeCam.id}
              src={activeCam.src} 
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain filter contrast-125 brightness-90"
            />
          </motion.div>
        </AnimatePresence>

        {/* Scanlines Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDAsIDAsIDAsIDAuMSkiLz4KPC9zdmc+')] opacity-30 mix-blend-overlay"></div>

        {/* Feed HUD */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm border border-white/10">
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              <span className="text-[10px] font-mono font-bold text-red-400 tracking-widest">REC</span>
            </div>
          )}
        </div>

        <div className="absolute top-3 right-3 bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
          <span className="text-[10px] font-mono text-white tracking-wider">{activeCam.label}</span>
        </div>

        <div className="absolute bottom-3 right-3 bg-black/60 px-2 py-1 rounded backdrop-blur-sm border border-white/10">
          <span className="text-[10px] font-mono text-white tracking-widest">{time}</span>
        </div>
      </div>

      {/* Camera Switcher */}
      <div className="p-3 bg-[#111] border-t border-[#222] flex gap-2 overflow-x-auto">
        {CAMERAS.map((cam) => (
          <button
            key={cam.id}
            onClick={() => setActiveCam(cam)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
              activeCam.id === cam.id
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'bg-[#1a1a1a] text-[#888] border border-[#222] hover:bg-[#222] hover:text-white'
            }`}
          >
            <Radio className={`w-3 h-3 ${activeCam.id === cam.id ? 'animate-pulse' : ''}`} />
            {cam.label}
          </button>
        ))}
        {isFullscreen && (
          <button
            onClick={() => setIsFullscreen(false)}
            className="ml-auto px-3 py-1.5 rounded-lg text-xs font-medium bg-[#1a1a1a] text-[#888] border border-[#222] hover:bg-[#222] hover:text-white"
          >
            Exit Fullscreen
          </button>
        )}
      </div>
    </div>
  );
}
