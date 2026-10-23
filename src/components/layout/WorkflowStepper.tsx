import React from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { WORKFLOW_STAGES } from '../../data/registries';
import { 
  Settings, 
  FileText, 
  Clapperboard, 
  Sparkles, 
  Search, 
  Image, 
  CheckCircle2, 
  Lock, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { StageId } from '../../types/hud';

const STAGE_ICONS: Record<StageId, React.ComponentType<{ className?: string }>> = {
  '01_SETUP': Settings,
  '02_SOURCES': FileText,
  '03_SCRIPT_STUDIO': Clapperboard,
  '04_SCENE_PROMPTS': Sparkles,
  '05_SEO_PACKAGE': Search,
  '06_THUMBNAIL_STUDIO': Image,
  '07_REVIEW_EXPORT': CheckCircle2,
};

export const WorkflowStepper: React.FC = () => {
  const { 
    activeStageId, 
    requestStageNavigation, 
    getStageStatus, 
    project,
    staleMatrix
  } = useWorkflow();

  const handleStageClick = (stageId: StageId) => {
    requestStageNavigation(stageId);
  };

  return (
    <aside className="w-64 border-r border-[#1E293B] bg-[#070C18]/90 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      {/* Workflow Navigation List */}
      <div className="p-3">
        <div className="flex items-center justify-between px-2 py-2 mb-2">
          <span className="text-[10px] font-mono text-slate-500 tracking-wider uppercase">
            WORKFLOW PIPELINE
          </span>
          <span className="text-[10px] font-mono text-[#00F0FF] bg-[#00F0FF]/10 px-1.5 py-0.5 rounded border border-[#00F0FF]/20">
            7 STAGES
          </span>
        </div>

        <nav className="space-y-1">
          {WORKFLOW_STAGES.map((stage) => {
            const Icon = STAGE_ICONS[stage.id];
            const status = getStageStatus(stage.id);
            const isCurrent = status === 'current';
            const isBlocked = status === 'blocked';
            const isStale = status === 'stale';
            const isCompleted = status === 'completed';

            return (
              <button
                key={stage.id}
                onClick={() => handleStageClick(stage.id)}
                disabled={isBlocked}
                className={`w-full group text-left px-3 py-2.5 rounded-lg font-mono text-xs transition-all flex items-center justify-between border ${
                  isCurrent
                    ? 'bg-[#00F0FF]/10 border-[#00F0FF]/60 text-white shadow-[0_0_12px_rgba(0,240,255,0.15)]'
                    : isStale
                    ? 'bg-[#FFE600]/5 border-[#FFE600]/40 text-[#FFE600] hover:bg-[#FFE600]/10'
                    : isBlocked
                    ? 'opacity-40 border-transparent text-slate-500 cursor-not-allowed hover:bg-transparent'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-[#0B0F19] hover:border-[#1E293B]'
                }`}
                title={isBlocked ? stage.prerequisiteMessage : stage.description}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`p-1.5 rounded ${
                    isCurrent 
                      ? 'bg-[#00F0FF]/20 text-[#00F0FF]' 
                      : isCompleted
                      ? 'bg-[#10B981]/15 text-[#10B981]'
                      : isStale
                      ? 'bg-[#FFE600]/20 text-[#FFE600]'
                      : 'bg-slate-900 text-slate-500'
                  }`}>
                    <Icon className="w-4 h-4 shrink-0" />
                  </div>

                  <div className="flex flex-col truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {stage.stepNumber}
                      </span>
                      <span className={`font-medium truncate ${isCurrent ? 'text-[#00F0FF]' : ''}`}>
                        {stage.shortLabel}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">
                      {stage.title}
                    </span>
                  </div>
                </div>

                {/* Right Status Indicator */}
                <div className="shrink-0 ml-2">
                  {isCurrent ? (
                    <ChevronRight className="w-3.5 h-3.5 text-[#00F0FF] animate-pulse" />
                  ) : isBlocked ? (
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                  ) : isStale ? (
                    <div className="flex items-center gap-1 text-[9px] text-[#FFE600] px-1 py-0.2 bg-[#FFE600]/10 rounded border border-[#FFE600]/30">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      <span>STALE</span>
                    </div>
                  ) : isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                  ) : null}
                </div>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Project Footprint Card at Bottom */}
      <div className="p-3 border-t border-[#1E293B] bg-[#030712]/70">
        <div className="px-2 py-1.5 rounded bg-[#0B0F19] border border-[#1E293B] text-[11px] font-mono space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-slate-500 uppercase text-[9px]">FORMAT</span>
            <span className="text-slate-200 font-semibold">
              {project.format === '9:16_SHORTS' ? '9:16 Shorts' : '16:9 Long-Form'}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="text-slate-500 uppercase text-[9px]">PACING</span>
            <span className="text-[#00F0FF] font-semibold">
              {project.format === '9:16_SHORTS' 
                ? `${project.shortsDuration}s (${project.shortsDuration / 8} scenes @ 8s)`
                : `${project.longFormDurationMinutes} min target`
              }
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="text-slate-500 uppercase text-[9px]">MODE</span>
            <span className="text-slate-200 capitalize">
              {project.modeId.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center justify-between text-slate-400">
            <span className="text-slate-500 uppercase text-[9px]">LANG</span>
            <span className="text-[#FFE600] uppercase font-bold">
              {project.language === 'hi' ? 'Hindi' : 'English'}
            </span>
          </div>

          {staleMatrix.scriptStale || staleMatrix.promptsStale ? (
            <div className="mt-1 pt-1 border-t border-[#1E293B] flex items-center gap-1 text-[9px] text-[#FFE600]">
              <AlertTriangle className="w-3 h-3 text-[#FFE600] shrink-0" />
              <span className="truncate">Outputs Stale (Review Required)</span>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
};
