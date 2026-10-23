import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { Terminal, X, Trash2, Filter, AlertTriangle, CheckCircle, Info, Flame } from 'lucide-react';
import { ActivityEvent } from '../../types/hud';

export const ActivityTerminal: React.FC = () => {
  const { 
    isActivityDrawerOpen, 
    setIsActivityDrawerOpen, 
    activityEvents, 
    clearActivityEvents 
  } = useWorkflow();

  const [filterCategory, setFilterCategory] = useState<string>('ALL');

  if (!isActivityDrawerOpen) return null;

  const filteredEvents = activityEvents.filter(e => {
    if (filterCategory === 'ALL') return true;
    if (filterCategory === 'ERRORS') return e.level === 'error' || e.level === 'warning';
    return e.category === filterCategory;
  });

  const getLevelIcon = (level: ActivityEvent['level']) => {
    switch (level) {
      case 'error':
        return <Flame className="w-3.5 h-3.5 text-[#FB7185] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-3.5 h-3.5 text-[#FFE600] shrink-0" />;
      case 'success':
        return <CheckCircle className="w-3.5 h-3.5 text-[#10B981] shrink-0" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#00F0FF] shrink-0" />;
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 bg-[#000000]/95 border-t border-[#1E293B] shadow-[0_-8px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl transition-all">
      {/* Terminal Title Bar */}
      <div className="h-10 px-4 border-b border-[#1E293B] flex items-center justify-between select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#00F0FF] font-semibold">
            <Terminal className="w-4 h-4 text-[#00F0FF]" />
            <span>ILLUMATRIX EVENT LOG // TERMINAL STREAM</span>
          </div>

          <div className="h-4 w-px bg-[#1E293B]" />

          {/* Filter Pills */}
          <div className="hidden sm:flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-500 mr-1" />
            {['ALL', 'JOB', 'AI', 'CONFIG', 'SCRIPT', 'PROMPTS', 'ERRORS'].map((cat) => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                  filterCategory === cat
                    ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearActivityEvents}
            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-colors"
            title="Clear Log"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsActivityDrawerOpen(false)}
            className="p-1 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-900 transition-colors"
            title="Close Terminal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Terminal Stream Viewport */}
      <div className="h-56 overflow-y-auto p-4 space-y-1.5 font-mono text-xs text-slate-300">
        {filteredEvents.length === 0 ? (
          <div className="text-slate-600 text-[11px] py-4 text-center">
            No events match the selected category filter.
          </div>
        ) : (
          filteredEvents.map((evt) => (
            <div 
              key={evt.id}
              className="flex items-start gap-2.5 py-1 px-2 rounded hover:bg-[#0B0F19] transition-colors border border-transparent hover:border-[#1E293B]"
            >
              <span className="text-slate-600 text-[10px] tabular-nums shrink-0 mt-0.5">
                [{evt.timestamp}]
              </span>

              <span className={`text-[9px] px-1 py-0.2 rounded border uppercase font-bold shrink-0 mt-0.5 ${
                evt.category === 'JOB' ? 'bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/30' :
                evt.category === 'FAILOVER' ? 'bg-[#FB7185]/10 text-[#FB7185] border-[#FB7185]/30' :
                evt.category === 'CONFIG' ? 'bg-[#FFE600]/10 text-[#FFE600] border-[#FFE600]/30' :
                evt.category === 'SCRIPT' ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/30' :
                'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {evt.category}
              </span>

              <div className="flex items-center gap-1.5 min-w-0">
                {getLevelIcon(evt.level)}
                <span className={`text-[11px] leading-relaxed break-all ${
                  evt.level === 'error' ? 'text-[#FB7185]' :
                  evt.level === 'warning' ? 'text-[#FFE600]' :
                  evt.level === 'success' ? 'text-slate-200' :
                  'text-slate-400'
                }`}>
                  {evt.message}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
