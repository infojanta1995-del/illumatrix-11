import React from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { WORKFLOW_STAGES } from '../../data/registries';
import { RadarVisualizer } from './RadarVisualizer';
import { 
  Cpu, 
  Terminal, 
  Sliders, 
  FolderGit2, 
  Activity, 
  Layers, 
  AlertTriangle,
  Radio
} from 'lucide-react';

export const TopStatusBar: React.FC = () => {
  const { 
    project, 
    activeStageId, 
    activeConnection, 
    activeJob, 
    staleMatrix,
    activityEvents,
    isControlCenterOpen,
    setIsControlCenterOpen,
    isActivityDrawerOpen,
    setIsActivityDrawerOpen,
    isProjectModalOpen,
    setIsProjectModalOpen,
    setIsProviderModalOpen,
  } = useWorkflow();

  const currentStage = WORKFLOW_STAGES.find(s => s.id === activeStageId);
  const isAnyStale = Object.values(staleMatrix).some(v => v === true);

  return (
    <header className="h-14 border-b border-[#1E293B] bg-[#030712]/95 backdrop-blur-md px-4 flex items-center justify-between z-30 select-none">
      {/* Brand & Project Zone */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2">
          {/* Cybernetic HUD Glyphs */}
          <div className="w-8 h-8 rounded border border-[#00F0FF]/40 bg-[#0B0F19] flex items-center justify-center text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.2)]">
            <Radio className="w-4 h-4 text-[#00F0FF] animate-pulse" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-widest text-sm text-white font-mono">
                ILLUMATRIX
              </span>
              <span className="text-[10px] px-1 py-0.2 bg-[#FFE600]/10 border border-[#FFE600]/30 text-[#FFE600] font-mono rounded">
                HUD v1.0
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono tracking-tight">
              AI Content Preparation Workspace
            </span>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="h-6 w-px bg-[#1E293B] hidden sm:block" />

        {/* Project Selector / Rename Trigger */}
        <button
          onClick={() => setIsProjectModalOpen(true)}
          className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0B0F19] hover:bg-[#111726] border border-[#1E293B] hover:border-[#334155] transition-colors text-left group"
          title="Click to configure project settings"
        >
          <FolderGit2 className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#00F0FF]" />
          <div className="flex flex-col">
            <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider">PROJECT</span>
            <span className="text-xs text-slate-200 font-mono font-medium max-w-[140px] truncate">
              {project.name}
            </span>
          </div>
          <Sliders className="w-3 h-3 text-slate-600 group-hover:text-slate-300 ml-1" />
        </button>

        {/* Browser Storage Advisory Indicator (Task 1 Invariant) */}
        <div
          className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded bg-[#0B0F19] border border-amber-500/30 text-amber-400 text-[10px] font-mono select-none"
          title="Persistence Warning: Stored only in this browser's localStorage. Not saved on a cloud database. Export a Complete Project Backup (.json) in Stage 07 to save permanently."
        >
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>BROWSER STORAGE ONLY</span>
        </div>
      </div>

      {/* Middle Zone: Active Stage & Workflow Telemetry */}
      <div className="hidden lg:flex items-center gap-4">
        {/* Active Stage Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 bg-[#0B0F19] border border-[#1E293B] rounded">
          <Layers className="w-3.5 h-3.5 text-[#00F0FF]" />
          <span className="text-xs font-mono text-slate-400">STAGE</span>
          <span className="text-xs font-mono font-semibold text-[#00F0FF]">
            {currentStage?.stepNumber} // {currentStage?.shortLabel.toUpperCase()}
          </span>
          {isAnyStale ? (
            <div className="flex items-center gap-1 text-[10px] text-[#FFE600] bg-[#FFE600]/10 px-1.5 py-0.5 rounded border border-[#FFE600]/30 font-mono" title="Upstream changes have marked some downstream outputs stale">
              <AlertTriangle className="w-3 h-3 text-[#FFE600]" />
              <span>STALE</span>
            </div>
          ) : null}
        </div>

        {/* Radar Telemetry Mini Widget */}
        <div className="flex items-center px-2.5 py-1 bg-[#0B0F19] border border-[#1E293B] rounded">
          <RadarVisualizer 
            isActive={activeJob !== null} 
            size={24} 
            label="RADAR"
            progressPercent={activeJob?.progressPercent}
          />
        </div>
      </div>

      {/* Right Zone: Provider Status & HUD Toggles */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Connection Badge */}
        <button 
          onClick={() => setIsProviderModalOpen(true)}
          className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded bg-[#0B0F19] hover:bg-[#111726] border border-[#1E293B] hover:border-[#00F0FF]/50 text-xs font-mono transition-all text-left cursor-pointer group"
          title={`Click to manage AI providers & keys · Active: ${activeConnection.name} (${activeConnection.provider}) · Model: ${activeConnection.modelId} · Quota: ${activeConnection.quotaPool} · Status: ${activeConnection.status.toUpperCase()}`}
        >
          <Cpu className={`w-3.5 h-3.5 ${
            !activeConnection.isEnabled ? 'text-slate-500' :
            activeConnection.status === 'online' ? 'text-[#10B981]' :
            activeConnection.status === 'degraded' ? 'text-[#FB7185]' :
            activeConnection.status === 'cooldown' ? 'text-[#FB7185]' :
            'text-[#EAB308]'
          }`} />
          <div className="flex items-center gap-1.5 max-w-[200px] truncate">
            <span className="text-[10px] text-slate-400 font-semibold truncate">
              {activeConnection.provider}:
            </span>
            <span className="text-slate-200 group-hover:text-white truncate">
              {activeConnection.modelId}
            </span>
          </div>
          <span className={`w-1.5 h-1.5 rounded-full ${
            !activeConnection.isEnabled ? 'bg-slate-500' :
            activeConnection.status === 'online' ? 'bg-[#10B981]' :
            activeConnection.status === 'cooldown' ? 'bg-[#FB7185] animate-ping' :
            activeConnection.status === 'degraded' ? 'bg-[#FB7185]' :
            'bg-[#EAB308]'
          }`} title={
            activeConnection.status === 'online' ? 'Verified Online (Real Test Passed)' :
            activeConnection.status === 'degraded' ? 'Connection Failed' :
            activeConnection.status === 'cooldown' ? 'Cooldown Active' :
            'Untested / Not Verified'
          } />
          {activeConnection.reportedLatencyMs !== null ? (
            <span className="text-slate-400 text-[10px] tabular-nums">
              {activeConnection.reportedLatencyMs}ms
            </span>
          ) : (
            <span className="text-slate-500 text-[10px]">
              {activeConnection.status === 'untested' ? 'Untested' : activeConnection.hasKey ? 'Ready' : 'Setup'}
            </span>
          )}
        </button>

        {/* Terminal Activity Stream Toggle */}
        <button
          onClick={() => setIsActivityDrawerOpen(!isActivityDrawerOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-all ${
            isActivityDrawerOpen 
              ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-[#00F0FF]' 
              : 'bg-[#0B0F19] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
          }`}
          title="Toggle Terminal Activity Stream"
        >
          <Terminal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">TERMINAL</span>
          <span className="px-1 text-[10px] bg-slate-800 text-slate-300 rounded tabular-nums">
            {activityEvents.length}
          </span>
        </button>

        {/* Control Center Toggle */}
        <button
          onClick={() => setIsControlCenterOpen(!isControlCenterOpen)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-all ${
            isControlCenterOpen 
              ? 'bg-[#FFE600]/15 border-[#FFE600] text-[#FFE600]' 
              : 'bg-[#0B0F19] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-[#334155]'
          }`}
          title="Toggle Control Center / Quota Monitor"
        >
          <Activity className="w-3.5 h-3.5" />
          <span className="hidden md:inline">CONTROL</span>
        </button>
      </div>
    </header>
  );
};
