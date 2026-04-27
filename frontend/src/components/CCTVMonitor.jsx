import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Maximize2, Radio, Shield, ShieldCheck, ShieldAlert, Activity, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { API_BASE_URL } from '../config';

const CAMERAS = [
  { id: 'cam-01', label: 'CAM 01 - NORTH HALLWAY', src: '/cctv/cam01_normal.mp4' },
  { id: 'cam-07', label: 'CAM 07 - EAST HALLWAY', src: '/cctv/cam07_incident.mp4' },
];

export default function CCTVMonitor() {
  const [activeCam, setActiveCam] = useState(CAMERAS[0]);
  const [time, setTime] = useState(new Date().toLocaleTimeString('en-US', { hour12: false }));
  const [isRecording, setIsRecording] = useState(true);
  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Autonomous Monitoring State
  const [isAutonomous, setIsAutonomous] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanResult, setLastScanResult] = useState(null);
  const [scanningCamId, setScanningCamId] = useState(null);
  
  // Refs for all camera video elements
  const videoRefs = useRef({});
  const canvasRef = useRef(null);

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
        containerRef.current.requestFullscreen();
      }
    } else {
      document.exitFullscreen();
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Movement detection refs
  const lastFrameRefs = useRef({});
  const lastFullScanRefs = useRef({}); // Track last time Gemini was called
  const scanCountRefs = useRef({}); // Track number of scans for baseline
  const MOVEMENT_THRESHOLD = 0.05; // Increased to 5% to avoid noise/flicker
  const FORCE_SCAN_INTERVAL = 30000; // Force scan every 30s for state verification
  const MIN_GEMINI_COOLDOWN = 10000; // Minimum 10s gap between Gemini calls per camera

  // Local Pre-Alert state for immediate judge feedback
  const [preAlertCamId, setPreAlertCamId] = useState(null);

  const scanCamera = useCallback(async (cam) => {
    const video = videoRefs.current[cam.id];
    if (!video || !canvasRef.current) return;

    try {
      const canvas = canvasRef.current;
      canvas.width = 160; 
      canvas.height = 90;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const lastFrame = lastFrameRefs.current[cam.id];
      const now = Date.now();
      
      let totalDiff = 0;
      if (lastFrame) {
        for (let i = 0; i < currentFrame.length; i += 4) {
          totalDiff += Math.abs(currentFrame[i] - lastFrame[i]); 
          totalDiff += Math.abs(currentFrame[i+1] - lastFrame[i+1]); 
          totalDiff += Math.abs(currentFrame[i+2] - lastFrame[i+2]); 
        }
      }
      
      const normalizedDiff = totalDiff / (canvas.width * canvas.height * 3 * 255);
      lastFrameRefs.current[cam.id] = currentFrame;
      
      // Initialize baseline for first 2 frames
      if (!scanCountRefs.current[cam.id]) scanCountRefs.current[cam.id] = 0;
      scanCountRefs.current[cam.id]++;
      
      if (scanCountRefs.current[cam.id] < 3) {
        console.log(`[Local AI] Setting baseline for ${cam.label}...`);
        return;
      }

      // 🚨 DECISION ENGINE: Trigger Gemini if...
      // A) Motion > Threshold AND Cooldown passed
      // B) Or it's been > 30s since last full check (Heartbeat scan)
      const lastFullScan = lastFullScanRefs.current[cam.id] || 0;
      const timeSinceLastScan = now - lastFullScan;
      
      const isMotionTrigger = normalizedDiff >= MOVEMENT_THRESHOLD && timeSinceLastScan > MIN_GEMINI_COOLDOWN;
      const isHeartbeatTrigger = timeSinceLastScan > FORCE_SCAN_INTERVAL;

      if (!isMotionTrigger && !isHeartbeatTrigger) {
        // Log skip reason for debugging if motion is high but cooldown is active
        if (normalizedDiff >= MOVEMENT_THRESHOLD && timeSinceLastScan <= MIN_GEMINI_COOLDOWN) {
          console.log(`[Local AI] Motion detected on ${cam.label} (${(normalizedDiff*100).toFixed(1)}%), but waiting for Gemini cooldown (${(MIN_GEMINI_COOLDOWN - timeSinceLastScan)/1000}s left)`);
        }
        return;
      }

      // 🚨 STAGE 1: IMMEDIATE LOCAL ALERT
      if (isMotionTrigger) {
        setPreAlertCamId(cam.id);
        setTimeout(() => setPreAlertCamId(null), 3000);
      }

      setScanningCamId(cam.id);
      setIsScanning(true);
      lastFullScanRefs.current[cam.id] = now;
      
      console.log(`[Local AI] 🚨 Triggered (${isMotionTrigger ? 'Motion' : 'Heartbeat'}). Escalating to Gemini...`);

      // Reuse high-res for Gemini
      canvas.width = 640;
      canvas.height = 360;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
      const base64Image = dataUrl.split(',')[1];

      const response = await fetch(`${API_BASE_URL}/api/cctv/analyze_frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frameBase64: base64Image,
          cameraId: cam.id,
          cameraLabel: cam.label
        })
      });

      const result = await response.json();
      setLastScanResult({ camId: cam.id, ...result });
      
      if (result.status === 'created') {
        console.log(`🚨 Autonomous Alert: ${result.incident.hazardType} at ${cam.label}`);
      }
    } catch (err) {
      console.error(`Failed to scan ${cam.label}:`, err);
    } finally {
      setIsScanning(false);
      setScanningCamId(null);
    }
  }, []);

  useEffect(() => {
    if (!isAutonomous) return;

    const activeIntervals = [];

    // Start an independent scanning loop for EACH camera
    CAMERAS.forEach((cam, index) => {
      // Stagger the initial start
      const timeoutId = setTimeout(() => {
        const intervalId = setInterval(() => {
          scanCamera(cam);
        }, 1500); // Local scanning every 1.5 seconds for instant-feel detection
        activeIntervals.push(intervalId);
      }, index * 750); // Small stagger
      
      activeIntervals.push(timeoutId);
    });

    return () => {
      activeIntervals.forEach(id => {
        clearInterval(id);
        clearTimeout(id);
      });
    };
  }, [isAutonomous, scanCamera]);

  return (
    <div 
      ref={containerRef} 
      className={`card flex flex-col ${isFullscreen ? 'fixed inset-0 z-50 h-screen w-screen bg-black rounded-none' : 'h-[450px]'}`}
    >
      {/* Header */}
      <div className="p-3 border-b border-[#222] flex items-center justify-between bg-[#0a0a0a]">
        <div className="flex items-center gap-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-blue-400" />
            Unified CCTV Command
          </h3>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider border ${
            isAutonomous ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-[#1a1a1a] border-[#333] text-[#666]'
          }`}>
            <Activity className={`w-3 h-3 ${isAutonomous ? 'animate-pulse' : ''}`} />
            {isAutonomous ? 'AUTONOMOUS ACTIVE' : 'MANUAL MODE'}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsAutonomous(!isAutonomous)}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
              isAutonomous 
                ? 'bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30' 
                : 'bg-blue-500/20 border-blue-500/30 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            {isAutonomous ? 'Stop Monitoring' : 'Start Autonomous Scan'}
          </button>
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
              ref={el => videoRefs.current[activeCam.id] = el}
              src={activeCam.src} 
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-contain filter contrast-125 brightness-90 saturate-50"
            />
          </motion.div>
        </AnimatePresence>

        {/* Hidden videos for background scanning of non-active cameras */}
        <div className="hidden">
          {CAMERAS.map(cam => (
            cam.id !== activeCam.id && (
              <video 
                key={cam.id}
                ref={el => videoRefs.current[cam.id] = el}
                src={cam.src}
                autoPlay
                loop
                muted
                playsInline
              />
            )
          ))}
        </div>

        {/* Scanlines Overlay */}
        <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDAsIDAsIDAsIDAuMSkiLz4KPC9zdmc+')] opacity-30 mix-blend-overlay"></div>

        {/* HUD Elements */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {isRecording && (
            <div className="flex items-center gap-1.5 bg-black/60 px-2 py-0.5 rounded backdrop-blur-md border border-white/10 shadow-lg">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]"></div>
              <span className="text-[10px] font-mono font-bold text-red-400 tracking-tighter">LIVE REC</span>
            </div>
          )}
          <div className="bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/10">
            <span className="text-[10px] font-mono text-white tracking-widest uppercase">{activeCam.label}</span>
          </div>
        </div>

        <div className="absolute bottom-4 right-4 bg-black/60 px-2 py-1 rounded backdrop-blur-md border border-white/10">
          <span className="text-[10px] font-mono text-white tracking-[0.2em]">{time}</span>
        </div>

        {/* Pre-Alert HUD (Immediate local feedback) */}
        {preAlertCamId === activeCam.id && (
          <div className="absolute inset-0 bg-red-600/10 flex items-center justify-center pointer-events-none border-4 border-red-500 animate-pulse z-30">
            <div className="bg-red-600 px-6 py-3 rounded-lg shadow-[0_0_50px_rgba(239,68,68,0.8)] border-2 border-white/30 flex flex-col items-center gap-2">
              <ShieldAlert className="w-12 h-12 text-white animate-bounce" />
              <div className="text-xl font-black text-white tracking-[0.2em] uppercase">Anomaly Detected</div>
              <div className="text-[10px] text-white/80 font-mono">Stage 1: Local Vision Analysis Triggered</div>
            </div>
          </div>
        )}

        {/* Scanning Indicator Overlay */}
        {isScanning && (
          <div className="absolute inset-0 border-2 border-blue-500/30 pointer-events-none overflow-hidden">
            <motion.div 
              initial={{ top: -2 }}
              animate={{ top: "100%" }}
              transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              className="absolute left-0 right-0 h-[2px] bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] z-20"
            />
            <div className="absolute top-4 right-4 bg-blue-600 px-3 py-1 rounded text-[10px] font-bold text-white shadow-lg animate-pulse flex items-center gap-2">
              <Eye className="w-3 h-3" />
              AI SCANNING: {CAMERAS.find(c => c.id === scanningCamId)?.label || 'System'}
            </div>
          </div>
        )}

        {/* Last Alert Summary Overlay */}
        {isAutonomous && lastScanResult && lastScanResult.status !== 'safe' && (
          <div className="absolute bottom-4 left-4 max-w-xs bg-red-600/90 p-3 rounded-lg backdrop-blur-md border border-red-400/50 shadow-2xl">
            <div className="flex items-center gap-2 mb-1 text-white">
              <ShieldAlert className="w-4 h-4" />
              <span className="text-[10px] font-bold uppercase tracking-widest">Incident Detected</span>
            </div>
            <p className="text-xs text-white/90 font-medium leading-tight">
              {lastScanResult.incident?.hazardType || 'Unknown Anomaly'} detected on {CAMERAS.find(c => c.id === lastScanResult.camId)?.label}
            </p>
          </div>
        )}
      </div>

      {/* Camera Switcher & Status Bar */}
      <div className="p-3 bg-[#0a0a0a] border-t border-[#222] flex items-center justify-between">
        <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-1">
          {CAMERAS.map((cam) => (
            <button
              key={cam.id}
              onClick={() => setActiveCam(cam)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all flex-shrink-0 ${
                activeCam.id === cam.id
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-[#111] text-[#888] border border-[#222] hover:bg-[#222] hover:text-white'
              }`}
            >
              <Radio className={`w-3 h-3 ${activeCam.id === cam.id ? 'animate-pulse' : ''}`} />
              {cam.label}
              {isAutonomous && lastScanResult?.camId === cam.id && lastScanResult.status !== 'safe' && (
                <div className="w-2 h-2 rounded-full bg-red-500 animate-ping"></div>
              )}
            </button>
          ))}
        </div>
        
        {isAutonomous && (
          <div className="flex items-center gap-4 px-4 border-l border-[#222]">
            <div className="flex flex-col items-end">
              <span className="text-[9px] text-[#555] uppercase font-bold">Vision AI Status</span>
              <div className="flex gap-0.5">
                {CAMERAS.map(c => (
                  <div key={c.id} className={`w-3 h-1 rounded-full ${scanningCamId === c.id ? 'bg-blue-500 animate-pulse' : 'bg-green-500/30'}`}></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Hidden Canvas for Frame Capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
