import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useAuth } from '../App';

const AREA_COLORS = {
  public: { bg: 'rgba(212, 175, 55, 0.12)', border: 'rgba(212, 175, 55, 0.3)', text: '#d4af37' },
  restaurant: { bg: 'rgba(249, 115, 22, 0.12)', border: 'rgba(249, 115, 22, 0.3)', text: '#f97316' },
  rooms: { bg: 'rgba(99, 102, 241, 0.12)', border: 'rgba(99, 102, 241, 0.3)', text: '#818cf8' },
  recreational: { bg: 'rgba(34, 197, 94, 0.12)', border: 'rgba(34, 197, 94, 0.3)', text: '#22c55e' },
  event: { bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.3)', text: '#a855f7' },
  meeting: { bg: 'rgba(59, 130, 246, 0.12)', border: 'rgba(59, 130, 246, 0.3)', text: '#3b82f6' },
  service: { bg: 'rgba(161, 161, 161, 0.12)', border: 'rgba(161, 161, 161, 0.3)', text: '#a1a1a1' },
  utility: { bg: 'rgba(82, 82, 82, 0.12)', border: 'rgba(82, 82, 82, 0.3)', text: '#737373' },
  outdoor: { bg: 'rgba(6, 182, 212, 0.12)', border: 'rgba(6, 182, 212, 0.3)', text: '#06b6d4' },
};

function FloorPlansPage() {
  const { api } = useAuth();
  const navigate = useNavigate();
  const [floors, setFloors] = useState([]);
  const [currentFloor, setCurrentFloor] = useState(0);

  useEffect(() => {
    api('/api/guest/floor-plans').then((data) => {
      setFloors(data);
      // Start at ground floor
      const groundIdx = data.findIndex((f) => f.floor === 0);
      setCurrentFloor(groundIdx >= 0 ? groundIdx : 0);
    });
  }, []);

  const floor = floors[currentFloor];

  if (!floor) {
    return (
      <div className="page-container">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[#1a1a1a]">
            <ArrowLeft className="w-5 h-5 text-[#888]" />
          </button>
          <h1 className="text-lg font-semibold text-[#f5f0e8]">Floor Plans</h1>
        </div>
        <div className="text-center text-[#555] py-20">Loading floor plans...</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-[#1a1a1a]">
          <ArrowLeft className="w-5 h-5 text-[#888]" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-[#f5f0e8]">Floor Plans</h1>
          <p className="text-xs text-[#666]">Emergency exits & assembly points</p>
        </div>
      </div>

      {/* Floor Selector */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentFloor(Math.max(0, currentFloor - 1))}
          disabled={currentFloor === 0}
          className="p-2 rounded-xl bg-[#111] border border-[#222] disabled:opacity-30"
        >
          <ChevronLeft className="w-5 h-5 text-[#888]" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-[#f5f0e8]">{floor.name}</p>
          <p className="text-[10px] text-[#666]">Level {floor.floor >= 0 ? floor.floor : `B${Math.abs(floor.floor)}`}</p>
        </div>
        <button
          onClick={() => setCurrentFloor(Math.min(floors.length - 1, currentFloor + 1))}
          disabled={currentFloor === floors.length - 1}
          className="p-2 rounded-xl bg-[#111] border border-[#222] disabled:opacity-30"
        >
          <ChevronRight className="w-5 h-5 text-[#888]" />
        </button>
      </div>

      {/* Floor Plan SVG */}
      <motion.div
        key={floor.id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="floor-plan-container"
      >
        {/* Areas */}
        {floor.areas.map((area) => {
          const colors = AREA_COLORS[area.type] || AREA_COLORS.utility;
          return (
            <div
              key={area.id}
              className="floor-area"
              style={{
                left: `${area.x}%`,
                top: `${area.y}%`,
                width: `${area.w}%`,
                height: `${area.h}%`,
                backgroundColor: colors.bg,
                borderColor: colors.border,
                color: colors.text,
              }}
            >
              <span className="px-1 font-medium leading-tight" style={{ fontSize: Math.min(area.w, area.h) > 20 ? '9px' : '7px' }}>
                {area.name}
              </span>
            </div>
          );
        })}

        {/* Emergency Exits */}
        {floor.exits.map((exit, i) => (
          <div
            key={`exit-${i}`}
            className="floor-exit"
            style={{ left: `${exit.x}%`, top: `${exit.y}%`, transform: 'translate(-50%, -50%)' }}
            title={exit.label}
          />
        ))}

        {/* Stairwells */}
        {floor.stairwells.map((sw, i) => (
          <div
            key={`sw-${i}`}
            className="floor-stairwell"
            style={{ left: `${sw.x}%`, top: `${sw.y}%`, transform: 'translate(-50%, -50%)' }}
            title={sw.label}
          />
        ))}

        {/* Assembly Point */}
        {floor.assemblyPoint && (
          <div
            className="absolute flex items-center gap-1 bg-green-500/20 border border-green-500/40 rounded-lg px-2 py-1"
            style={{
              left: `${floor.assemblyPoint.x}%`,
              top: `${floor.assemblyPoint.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <MapPin className="w-3 h-3 text-green-400" />
            <span className="text-[7px] text-green-400 font-semibold">ASSEMBLY</span>
          </div>
        )}
      </motion.div>

      {/* Legend */}
      <div className="mt-4 card p-3">
        <p className="text-[10px] text-[#888] font-semibold uppercase tracking-wider mb-2">Legend</p>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5">
            <div className="floor-exit w-2.5 h-2.5" style={{ position: 'static', animation: 'none' }} />
            <span className="text-[10px] text-[#999]">Emergency Exit</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded border-2 border-blue-400 bg-blue-500/30" />
            <span className="text-[10px] text-[#999]">Stairwell</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-green-400" />
            <span className="text-[10px] text-[#999]">Assembly Point</span>
          </div>
        </div>
      </div>

      {/* Floor Area List */}
      <div className="mt-3 space-y-1">
        {floor.areas.map((area) => {
          const colors = AREA_COLORS[area.type] || AREA_COLORS.utility;
          return (
            <div key={area.id} className="flex items-center gap-2 px-2 py-1.5">
              <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: colors.border }} />
              <span className="text-[11px] text-[#999]">{area.name}</span>
              <span className="text-[9px] text-[#555] ml-auto capitalize">{area.type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default FloorPlansPage;
