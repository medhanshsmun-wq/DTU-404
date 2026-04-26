import React, { useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Shield, ShieldAlert, Crosshair, AlertTriangle, Scan, Camera, Activity } from 'lucide-react';
import { API_BASE_URL } from '../config';

export default function SecurityScannerView() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isAutoScanning, setIsAutoScanning] = useState(false);
  const autoScanRef = useRef(false);
  const [streamActive, setStreamActive] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setStreamActive(true);
        setError(null);
      }
    } catch (err) {
      console.error("Camera access denied or unavailable", err);
      setError("Camera access denied or unavailable.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setStreamActive(false);
      setReport(null);
      stopAutoScan();
    }
  };

  const stopAutoScan = () => {
    autoScanRef.current = false;
    setIsAutoScanning(false);
  };

  const startAutoScan = async () => {
    if (autoScanRef.current || !streamActive) return;
    autoScanRef.current = true;
    setIsAutoScanning(true);
    
    while (autoScanRef.current) {
      const data = await captureAndScan();
      if (data && data.threatLevel >= 5) {
        // Clear hypothesis found, stop auto scanning
        autoScanRef.current = false;
        setIsAutoScanning(false);
        break;
      }
      await new Promise(r => setTimeout(r, 5000));
    }
  };

  const captureAndScan = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsScanning(true);
    setError(null);

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get Base64 image
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    const base64Image = dataUrl.split(',')[1];

    try {
      const response = await fetch(`${API_BASE_URL}/api/security/scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ frameBase64: base64Image, mimeType: 'image/jpeg' })
      });

      if (!response.ok) {
        throw new Error("Failed to scan frame");
      }

      const data = await response.json();
      setReport(data);
      return data;
    } catch (err) {
      console.error(err);
      setError("AI Analysis failed. Make sure the backend is reachable and Gemini is configured.");
      return null;
    } finally {
      setIsScanning(false);
    }
  }, [streamActive]);

  return (
    <div className="p-6 h-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="text-blue-400" />
            AI Security Scanner
          </h1>
          <p className="text-[#a1a1a1] mt-1">Real-time threat assessment via Local Camera & Gemini Vision</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
        {/* Left Column: Camera Feed */}
        <div className="card p-4 flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Camera className="w-4 h-4 text-cyan-400" />
              Live Camera Feed
            </h2>
            <div className="flex gap-2">
              {!streamActive ? (
                <button
                  onClick={startCamera}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-medium hover:bg-blue-500/30 transition"
                >
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-xs font-medium hover:bg-red-500/30 transition"
                >
                  Stop Camera
                </button>
              )}
            </div>
          </div>

          <div className="relative flex-1 bg-black rounded-lg border border-[#222] overflow-hidden flex items-center justify-center min-h-[300px]">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className={`w-full h-full object-cover ${!streamActive ? 'hidden' : ''}`}
            />
            
            {!streamActive && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-[#525252]">
                <Camera className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-sm">Camera Offline</span>
              </div>
            )}
            
            {streamActive && (
              <>
                <div className="absolute inset-0 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSJ0cmFuc3BhcmVudCIvPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDAsIDAsIDAsIDAuMSkiLz4KPC9zdmc+')] opacity-30 mix-blend-overlay"></div>
                {/* Scanner overlay effect */}
                {isScanning && (
                  <motion.div 
                    initial={{ top: 0 }}
                    animate={{ top: "100%" }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                  />
                )}
              </>
            )}
            {/* Hidden canvas to extract frames */}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="mt-4 flex justify-between">
            <button
              onClick={isAutoScanning ? stopAutoScan : startAutoScan}
              disabled={!streamActive || (isScanning && !isAutoScanning)}
              className={`flex items-center gap-2 px-4 py-2 text-white border rounded-lg text-sm font-medium transition ${
                isAutoScanning 
                  ? 'bg-red-500/20 border-red-500/40 hover:bg-red-500/30 text-red-400' 
                  : 'bg-[#1a1a1a] border-[#333] hover:bg-[#222]'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isAutoScanning ? (
                <>
                  <Scan className="w-4 h-4 animate-pulse text-red-400" />
                  Stop Auto-Scan
                </>
              ) : (
                <>
                  <Activity className="w-4 h-4 text-purple-400" />
                  Auto-Scan (5s)
                </>
              )}
            </button>
            <button
              onClick={captureAndScan}
              disabled={!streamActive || isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] text-white border border-[#333] rounded-lg text-sm font-medium hover:bg-[#222] disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isScanning ? (
                <>
                  <Scan className="w-4 h-4 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Crosshair className="w-4 h-4 text-cyan-400" />
                  Scan Frame for Threats
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded">
              {error}
            </div>
          )}
        </div>

        {/* Right Column: AI Analysis Report */}
        <div className="card p-4 flex flex-col h-full overflow-y-auto custom-scrollbar">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2 mb-4">
            <ShieldAlert className="w-4 h-4 text-orange-400" />
            AI Threat Assessment Report
          </h2>

          {!report ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center opacity-50">
              <ShieldAlert className="w-12 h-12 mb-3 text-[#525252]" />
              <h3 className="text-sm font-medium text-[#737373]">No Report Generated</h3>
              <p className="text-xs text-[#525252] mt-1 max-w-[200px]">Start the camera and click Scan to generate an AI assessment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Threat Level */}
              <div className="p-4 rounded-lg bg-[#111] border border-[#222] flex items-center justify-between">
                <div>
                  <div className="text-xs text-[#888] font-medium uppercase tracking-wider mb-1">Threat Level</div>
                  <div className="text-sm font-medium text-white">
                    {report.threatLevel >= 7 ? "CRITICAL" : report.threatLevel >= 4 ? "ELEVATED" : "SAFE"}
                  </div>
                </div>
                <div className={`text-3xl font-bold ${report.threatLevel >= 7 ? 'text-red-500' :
                    report.threatLevel >= 4 ? 'text-orange-500' : 'text-green-500'
                  }`}>
                  {report.threatLevel}/10
                </div>
              </div>

              {/* Suspicious Activity & Weapons */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border ${report.suspiciousActivity !== "None" ? 'bg-orange-500/10 border-orange-500/20 text-orange-400' : 'bg-[#111] border-[#222] text-[#888]'}`}>
                  <div className="text-[10px] uppercase font-bold tracking-wider mb-2 text-[#666]">Suspicious Activity</div>
                  <div className="text-sm">{report.suspiciousActivity}</div>
                </div>
                <div className={`p-4 rounded-lg border ${(report.weaponsDetected && report.weaponsDetected.length > 0 && report.weaponsDetected[0] !== "None") ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-[#111] border-[#222] text-[#888]'}`}>
                  <div className="text-[10px] uppercase font-bold tracking-wider mb-2 text-[#666]">Weapons Detected</div>
                  <div className="text-sm">
                    {report.weaponsDetected && report.weaponsDetected.length > 0 && report.weaponsDetected[0] !== "None"
                      ? report.weaponsDetected.join(", ")
                      : "None"}
                  </div>
                </div>
              </div>

              {/* Priority Factors */}
              {report.liveFactors && (
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(report.liveFactors).map(([key, val]) => (
                    <div key={key} className="p-2 rounded bg-[#111] border border-[#222] text-center">
                      <div className="text-[9px] text-[#525252] font-bold mb-0.5">{key}</div>
                      <div className={`text-xs font-bold ${val >= 7 ? 'text-red-400' : val >= 4 ? 'text-orange-400' : 'text-green-400'}`}>
                        {val}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Activity & Background */}
              <div className="space-y-3">
                <div className="p-3 bg-[#1a1a1a] rounded border border-[#222]">
                  <span className="text-xs text-blue-400 font-semibold uppercase tracking-wider block mb-1">Subject Activity</span>
                  <p className="text-sm text-[#ccc]">{report.activity}</p>
                </div>
                <div className="p-3 bg-[#1a1a1a] rounded border border-[#222]">
                  <span className="text-xs text-purple-400 font-semibold uppercase tracking-wider block mb-1">Background Details</span>
                  <p className="text-sm text-[#ccc]">{report.background}</p>
                </div>
              </div>

              {/* Full Report */}
              <div className="pt-4 border-t border-[#222]">
                <span className="text-xs text-[#888] font-medium uppercase tracking-wider block mb-2">Executive Summary</span>
                <p className="text-sm text-[#eee] leading-relaxed">
                  {report.fullReport}
                </p>
              </div>

              {/* Action Recommendation */}
              {report.threatLevel >= 7 && (
                <div className="mt-4 p-3 bg-red-500/20 border border-red-500/40 rounded flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-red-400">IMMEDIATE ACTION REQUIRED</h4>
                    <p className="text-xs text-red-300 mt-1">Lethal threat detected. Initiate lockdown protocol and dispatch armed security units.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
