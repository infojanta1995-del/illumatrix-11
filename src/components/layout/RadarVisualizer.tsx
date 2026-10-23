import React from 'react';

interface RadarVisualizerProps {
  isActive: boolean;
  size?: number;
  label?: string;
  progressPercent?: number;
}

export const RadarVisualizer: React.FC<RadarVisualizerProps> = ({
  isActive,
  size = 64,
  label,
  progressPercent,
}) => {
  return (
    <div className="flex items-center gap-3">
      <div 
        className="relative flex items-center justify-center shrink-0"
        style={{ width: size, height: size }}
      >
        {/* Outer Concentric Rings */}
        <svg 
          viewBox="0 0 100 100" 
          className="w-full h-full text-slate-800"
        >
          {/* Outer circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="46" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeDasharray="2 4"
          />
          {/* Middle circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="32" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1" 
          />
          {/* Inner circle */}
          <circle 
            cx="50" 
            cy="50" 
            r="16" 
            fill="none" 
            stroke={isActive ? '#00F0FF' : 'currentColor'} 
            strokeWidth="1" 
          />
          {/* Crosshairs */}
          <line x1="50" y1="4" x2="50" y2="96" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" />
          <line x1="4" y1="50" x2="96" y2="50" stroke="currentColor" strokeWidth="0.75" strokeDasharray="3 3" />
          
          {/* Rotating sweep when active (stopped when idle per blueprint Page 17 & 21) */}
          {isActive ? (
            <g className="origin-center animate-spin" style={{ animationDuration: '2.5s' }}>
              <path
                d="M50 50 L96 50 A46 46 0 0 0 82 17 Z"
                fill="url(#radarGradient)"
                opacity="0.4"
              />
            </g>
          ) : null}

          {/* Gradients */}
          <defs>
            <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#00F0FF" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#00F0FF" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>

        {/* Center Target Indicator */}
        <div className={`absolute w-2 h-2 rounded-full ${isActive ? 'bg-[#00F0FF] shadow-[0_0_8px_#00F0FF] animate-ping' : 'bg-slate-600'}`} />
        <div className={`absolute w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#FFE600]' : 'bg-slate-500'}`} />
      </div>

      {label ? (
        <div className="flex flex-col">
          <span className="text-[10px] tracking-wider text-slate-400 font-mono uppercase">
            {label}
          </span>
          <span className="text-xs font-mono font-semibold flex items-center gap-1.5">
            {isActive ? (
              <>
                <span className="text-[#00F0FF]">RADAR SCANNING</span>
                {progressPercent !== undefined ? (
                  <span className="text-slate-300">({progressPercent}%)</span>
                ) : null}
              </>
            ) : (
              <span className="text-slate-500">IDLE · STANDBY</span>
            )}
          </span>
        </div>
      ) : null}
    </div>
  );
};
