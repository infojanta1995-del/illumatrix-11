import React from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { WORKFLOW_STAGES } from '../../data/registries';
import { SetupWorkspace } from '../stages/SetupWorkspace';
import { SourcesWorkspace } from '../stages/SourcesWorkspace';
import { ScriptStudioWorkspace } from '../stages/ScriptStudioWorkspace';
import { ScenePromptsWorkspace } from '../stages/ScenePromptsWorkspace';
import { SeoPackageWorkspace } from '../stages/SeoPackageWorkspace';
import { ThumbnailStudioWorkspace } from '../stages/ThumbnailStudioWorkspace';
import { ReviewExportWorkspace } from '../stages/ReviewExportWorkspace';
import { Lock, ArrowLeft, ArrowRight, Layers } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const TaskWorkspace: React.FC = () => {
  const { 
    activeStageId, 
    setActiveStageId, 
    requestStageNavigation,
    getStageStatus, 
    navigateToNextStage, 
    navigateToPrevStage 
  } = useWorkflow();

  const currentStage = WORKFLOW_STAGES.find(s => s.id === activeStageId) || WORKFLOW_STAGES[0];
  const stageStatus = getStageStatus(activeStageId);
  const isBlocked = stageStatus === 'blocked';

  // Render workspace content based on active stage ID
  const renderStageContent = () => {
    switch (activeStageId) {
      case '01_SETUP':
        return <SetupWorkspace />;
      case '02_SOURCES':
        return <SourcesWorkspace />;
      case '03_SCRIPT_STUDIO':
        return <ScriptStudioWorkspace />;
      case '04_SCENE_PROMPTS':
        return <ScenePromptsWorkspace />;
      case '05_SEO_PACKAGE':
        return <SeoPackageWorkspace />;
      case '06_THUMBNAIL_STUDIO':
        return <ThumbnailStudioWorkspace />;
      case '07_REVIEW_EXPORT':
        return <ReviewExportWorkspace />;
      default:
        return <SetupWorkspace />;
    }
  };

  return (
    <main className="flex-1 overflow-y-auto bg-[#030712] hud-grid-bg p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        {/* Stage Breadcrumb Bar */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 pb-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>ILLUMATRIX</span>
            <span>/</span>
            <span className="text-slate-400">STAGE {currentStage.stepNumber}</span>
            <span>/</span>
            <span className="text-[#00F0FF] font-semibold">{currentStage.shortLabel.toUpperCase()}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 uppercase">STAGE {currentStage.stepNumber} OF 07</span>
          </div>
        </div>

        {/* Blocker State Banner (if active stage prerequisites are unfulfilled) */}
        {isBlocked ? (
          <div className="p-6 rounded-2xl bg-[#0B0F19] border border-[#FB7185]/40 text-center space-y-4 max-w-lg mx-auto my-12">
            <div className="w-12 h-12 rounded-full bg-[#FB7185]/15 border border-[#FB7185]/30 text-[#FB7185] flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                STAGE LOCKED: PREREQUISITE REQUIRED
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-1.5 leading-relaxed">
                {currentStage.prerequisiteMessage || 'A preceding workflow artifact must be completed first.'}
              </p>
            </div>

            <button
              onClick={() => {
                // Return to prerequisite stage with unsaved-change guard
                if (activeStageId === '03_SCRIPT_STUDIO') requestStageNavigation('02_SOURCES');
                else if (activeStageId === '04_SCENE_PROMPTS' || activeStageId === '05_SEO_PACKAGE' || activeStageId === '06_THUMBNAIL_STUDIO') requestStageNavigation('03_SCRIPT_STUDIO');
                else requestStageNavigation('01_SETUP');
              }}
              className="px-4 py-2 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF] text-[#00F0FF] font-mono text-xs font-bold transition-all"
            >
              Go to Required Step
            </button>
          </div>
        ) : (
          /* Animated Task Workspace Container */
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStageId}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {renderStageContent()}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* Bottom Pager Controls */}
      <footer className="max-w-6xl w-full mx-auto pt-6 border-t border-[#1E293B] flex items-center justify-between text-xs font-mono text-slate-500 mt-8">
        <button
          onClick={navigateToPrevStage}
          disabled={activeStageId === '01_SETUP'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
            activeStageId === '01_SETUP'
              ? 'opacity-30 border-transparent cursor-not-allowed'
              : 'border-[#1E293B] hover:border-[#334155] text-slate-400 hover:text-white bg-[#0B0F19]'
          }`}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>PREVIOUS STAGE</span>
        </button>

        <span className="text-[10px] text-slate-600">
          Obsidian Cyberpunk HUD // Workspace Engine Active
        </span>

        <button
          onClick={navigateToNextStage}
          disabled={activeStageId === '07_REVIEW_EXPORT'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
            activeStageId === '07_REVIEW_EXPORT'
              ? 'opacity-30 border-transparent cursor-not-allowed'
              : 'border-[#1E293B] hover:border-[#334155] text-slate-400 hover:text-white bg-[#0B0F19]'
          }`}
        >
          <span>NEXT STAGE</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </footer>
    </main>
  );
};
