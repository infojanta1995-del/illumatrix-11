import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { VISUAL_STYLES } from '../../data/registries';
import { ScenePackageData, ContinuityBible } from '../../types/hud';
import { DEFAULT_CONTINUITY_BIBLE } from '../../services/storage';
import { 
  Sparkles, 
  Copy, 
  RotateCcw, 
  Palette, 
  BookOpen, 
  ArrowRight,
  Check, 
  Layers, 
  Lock, 
  Volume2, 
  SlidersHorizontal,
  AlertTriangle,
  RefreshCw,
  ShieldCheck,
  Edit3,
  Undo2,
  Save,
  CheckCircle2,
  X,
  FileText,
  Eye,
  ShieldAlert,
  History,
  HelpCircle,
  AlertCircle
} from 'lucide-react';

export const ScenePromptsWorkspace: React.FC = () => {
  const { 
    project, 
    updateProject, 
    currentScript,
    isScriptApproved,
    scenePackages,
    continuityBible,
    isPromptsGenerating,
    generatePromptsWithAI,
    regenerateStyleWithAI,
    regenerateSinglePromptWithAI,
    repairPromptAfterFlowRejection,
    restoreOriginalScenePrompt,
    updateScenePackage,
    updateContinuityBible,
    navigateToNextStage, 
    requestStageNavigation,
    addActivityEvent, 
    markArtifactStale,
    staleMatrix,
    showToast,
    activeConnection
  } = useWorkflow();

  // Local UI State
  const [copiedSceneId, setCopiedSceneId] = useState<string | null>(null);
  const [isCopyAllSuccess, setIsCopyAllSuccess] = useState<boolean>(false);
  const [isStyleModalOpen, setIsStyleModalOpen] = useState<boolean>(false);
  const [isBibleDrawerOpen, setIsBibleDrawerOpen] = useState<boolean>(false);
  const [regeneratingSceneNum, setRegeneratingSceneNum] = useState<number | null>(null);

  // Safety Review Inspection & Flow Rejection States (Tasks 2, 3, 6)
  const [comparisonScene, setComparisonScene] = useState<ScenePackageData | null>(null);
  const [reportingFlowScene, setReportingFlowScene] = useState<ScenePackageData | null>(null);
  const [flowRejectionReasonInput, setFlowRejectionReasonInput] = useState<string>(
    'FAILED — This prompt might violate our policies about generating prominent people.'
  );
  const [isRepairingFlow, setIsRepairingFlow] = useState<boolean>(false);
  
  // Overwrite Warning Modal State
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState<boolean>(false);
  const [pendingOverwriteAction, setPendingOverwriteAction] = useState<(() => void) | null>(null);
  const [overwriteReason, setOverwriteReason] = useState<string>('');

  // Editable Continuity Bible Draft
  const [bibleDraft, setBibleDraft] = useState<ContinuityBible>(continuityBible);
  const [hasBibleEdits, setHasBibleEdits] = useState<boolean>(false);

  // Sync bibleDraft when external continuityBible changes
  useEffect(() => {
    setBibleDraft(continuityBible);
    setHasBibleEdits(false);
  }, [continuityBible.updatedAt, continuityBible.id]);

  const hasManualEdits = scenePackages.some(s => s.isCustomEdited);
  const isScriptVersionMismatch = scenePackages.length > 0 && 
    scenePackages[0]?.scriptVersionReference !== currentScript.versionNumber;
  const isPromptsStale = staleMatrix.promptsStale || isScriptVersionMismatch;

  const currentStyle = VISUAL_STYLES.find(s => s.id === project.visualStyleId) || VISUAL_STYLES[0];

  // ==========================================
  // CLIPBOARD COPY ACTIONS (PAGE 11 BLUEPRINT)
  // ==========================================

  const formatSingleSceneCopy = (scene: ScenePackageData): string => {
    const langLabel = project.language === 'hi' ? 'Hindi' : 'English';
    return `SCENE 0${scene.sceneNumber} — ${scene.title}
FORMAT: ${scene.format} | DURATION: ${scene.durationSec} seconds
SCRIPT BEAT: ${scene.scriptBeat}
VISUAL PROMPT:
${scene.visualPrompt}
CONTINUITY: ${scene.continuitySnippet}
NARRATION (${langLabel}):
${scene.narration}
SOUND DESIGN: ${scene.soundDesign}`;
  };

  const handleCopySingleScene = (scene: ScenePackageData) => {
    const copyText = formatSingleSceneCopy(scene);
    navigator.clipboard.writeText(copyText);
    setCopiedSceneId(scene.id);
    addActivityEvent(
      'PROMPTS', 
      `Copied Scene 0${scene.sceneNumber} complete production package to clipboard.`, 
      'info', 
      '04_SCENE_PROMPTS'
    );
    showToast(`Scene 0${scene.sceneNumber} package copied!`);
    setTimeout(() => setCopiedSceneId(null), 2000);
  };

  const handleCopyAllScenes = () => {
    if (scenePackages.length === 0) {
      showToast('No scene prompt packages available to copy.');
      return;
    }

    const fullBundle = scenePackages
      .map(scene => formatSingleSceneCopy(scene))
      .join('\n\n' + '='.repeat(60) + '\n\n');

    navigator.clipboard.writeText(fullBundle);
    setIsCopyAllSuccess(true);
    addActivityEvent(
      'PROMPTS', 
      `Copied all ${scenePackages.length} Google Flow scene prompt packages to clipboard.`, 
      'success', 
      '04_SCENE_PROMPTS'
    );
    showToast(`All ${scenePackages.length} scene prompt packages copied!`);
    setTimeout(() => setIsCopyAllSuccess(false), 2000);
  };

  // ==========================================
  // GENERATION & REGENERATION ACTIONS
  // ==========================================

  const handleGenerateAllWithWarning = () => {
    if (!isScriptApproved) {
      showToast('Explicit script approval in Stage 03 is required before generating prompts.');
      return;
    }

    if (hasManualEdits) {
      setOverwriteReason('One or more scenes contain manual prompt edits. Regenerating will overwrite them with fresh AI prompt packages matching Script v' + currentScript.versionNumber + '.');
      setPendingOverwriteAction(() => async () => {
        setIsOverwriteModalOpen(false);
        await generatePromptsWithAI();
      });
      setIsOverwriteModalOpen(true);
      return;
    }

    generatePromptsWithAI();
  };

  const handleStyleChangeWithWarning = (newStyleId: string) => {
    setIsStyleModalOpen(false);
    if (newStyleId === project.visualStyleId) return;

    if (hasManualEdits) {
      setOverwriteReason(`Changing visual style to "${newStyleId}" will update visual descriptors. Script narration and beats remain 100% byte-for-byte identical.`);
      setPendingOverwriteAction(() => async () => {
        setIsOverwriteModalOpen(false);
        await regenerateStyleWithAI(newStyleId);
      });
      setIsOverwriteModalOpen(true);
      return;
    }

    regenerateStyleWithAI(newStyleId);
  };

  const handleSingleSceneRegenerate = async (sceneNumber: number) => {
    setRegeneratingSceneNum(sceneNumber);
    await regenerateSinglePromptWithAI(sceneNumber);
    setRegeneratingSceneNum(null);
  };

  const handleRevertCustomEdit = (scene: ScenePackageData) => {
    // Reverts isCustomEdited flag and resets prompt to style standard or original prompt safely
    const styleObj = VISUAL_STYLES.find(s => s.id === project.visualStyleId) || VISUAL_STYLES[0];
    const formatLabel = project.format === '9:16_SHORTS' ? '9:16 vertical' : '16:9 horizontal';
    
    const fallbackVisualPrompt = scene.originalVisualPrompt || 
      `${styleObj.name} ${formatLabel} composition. Narrative focus on Scene 0${scene.sceneNumber} visual atmosphere. ${styleObj.promptTreatment}`;

    updateScenePackage(scene.id, {
      isCustomEdited: false,
      visualPrompt: fallbackVisualPrompt,
      continuitySnippet: `Visual Style: ${styleObj.name}; Palette: ${continuityBible.visualPalette}; Camera: ${continuityBible.cameraGrammar || styleObj.promptTreatment}`,
    });
    showToast(`Scene 0${scene.sceneNumber} reverted to generated baseline.`);
  };

  const handleOpenFlowRejectionModal = (scene: ScenePackageData) => {
    setReportingFlowScene(scene);
    setFlowRejectionReasonInput('FAILED — This prompt might violate our policies about generating prominent people.');
  };

  const handleConfirmFlowRejectionRepair = async () => {
    if (!reportingFlowScene) return;
    setIsRepairingFlow(true);
    await repairPromptAfterFlowRejection(reportingFlowScene.id, flowRejectionReasonInput);
    setIsRepairingFlow(false);
    setReportingFlowScene(null);
  };

  // ==========================================
  // CONTINUITY BIBLE HANDLERS
  // ==========================================

  const handleSaveContinuityBible = () => {
    updateContinuityBible(bibleDraft);
    setHasBibleEdits(false);
    showToast('Continuity Bible updated! Downstream prompts marked stale.');
    addActivityEvent(
      'PROMPTS', 
      'Continuity Bible parameters saved. Downstream scene prompts marked STALE.', 
      'info', 
      '04_SCENE_PROMPTS'
    );
  };

  const handleResetContinuityBible = () => {
    setBibleDraft(DEFAULT_CONTINUITY_BIBLE);
    updateContinuityBible(DEFAULT_CONTINUITY_BIBLE);
    setHasBibleEdits(false);
    showToast('Continuity Bible restored to default baseline.');
  };

  // ==========================================
  // SCRIPT APPROVAL GATE (LOCK SCREEN)
  // ==========================================

  if (!isScriptApproved) {
    return (
      <div className="space-y-6 font-mono">
        <div className="p-8 rounded-2xl bg-[#0B0F19] border border-[#FB7185]/40 text-center space-y-4 max-w-xl mx-auto my-8">
          <div className="w-14 h-14 rounded-full bg-[#FB7185]/15 border border-[#FB7185]/40 text-[#FB7185] flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(251,113,133,0.2)]">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold text-[#FB7185] uppercase tracking-widest px-2.5 py-0.5 rounded bg-[#FB7185]/10 border border-[#FB7185]/20">
              PREREQUISITE GATE ACTIVE
            </span>
            <h2 className="text-lg font-bold text-white tracking-wide">
              STAGE 04 LOCKED: EXPLICIT SCRIPT APPROVAL REQUIRED
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Per the ILLUMATRIX Master Blueprint specification, Google Flow Scene Prompt generation is strictly gated on Stage 03 Script Studio approval. Script beats must be reviewed and explicitly approved before production prompt packages can be generated.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => requestStageNavigation('03_SCRIPT_STUDIO')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)]"
            >
              <FileText className="w-4 h-4" />
              <span>GO TO STAGE 03 (SCRIPT STUDIO)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-mono">
      {/* 1. STAGE HEADER BANNER */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#1E293B] gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#00F0FF] mb-1">
            <Sparkles className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-bold tracking-wider">STAGE 04 // GOOGLE FLOW SCENE PROMPT STUDIO</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Self-Contained Scene Prompts & Production Packages
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Each scene prompt package is individually usable in Google Flow with format ratio, 8s duration, camera direction, lighting, immutable approved narration, and continuity specs.
          </p>

          {/* Traceability Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Approved Script v{currentScript.versionNumber}</span>
            </span>

            <span className="px-2.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300">
              Format: <strong className="text-white">{project.format === '9:16_SHORTS' ? '9:16 Vertical' : '16:9'}</strong>
            </span>

            <span className="px-2.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300">
              Scenes: <strong className="text-white">{scenePackages.length}</strong>
            </span>

            <span className="px-2.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300">
              Language: <strong className="text-[#FFE600]">{project.language === 'hi' ? 'Hindi (हिंदी)' : 'English'}</strong>
            </span>

            {isPromptsStale ? (
              <span className="px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>STALE PROMPTS</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>FRESH & SYNCHRONIZED</span>
              </span>
            )}
          </div>
        </div>

        {/* Global Toolbar Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleGenerateAllWithWarning}
            disabled={isPromptsGenerating}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
              isPromptsStale
                ? 'bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                : 'bg-[#0B0F19] hover:bg-slate-900 border border-[#1E293B] hover:border-[#00F0FF]/50 text-slate-200'
            }`}
            title="Generate Google Flow prompts for approved script scenes"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPromptsGenerating ? 'animate-spin text-black' : ''}`} />
            <span>{isPromptsGenerating ? 'GENERATING PROMPTS...' : isPromptsStale ? 'SYNCHRONIZE PROMPTS' : 'REGENERATE ALL PROMPTS'}</span>
          </button>

          <button
            onClick={handleCopyAllScenes}
            className={`px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
              isCopyAllSuccess
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-[#0B0F19] hover:bg-[#00F0FF]/15 border border-[#1E293B] hover:border-[#00F0FF]/50 text-slate-300 hover:text-[#00F0FF]'
            }`}
          >
            {isCopyAllSuccess ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{isCopyAllSuccess ? 'ALL COPIED!' : 'COPY ALL SCENES'}</span>
          </button>

          <button
            onClick={navigateToNextStage}
            className="px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)] shrink-0"
          >
            <span>STAGE 05: SEO</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. STALE ALERT BANNER (If prompts are out-of-sync with approved script) */}
      {isPromptsStale ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300 uppercase tracking-wide">
                STALE PROMPT ARTIFACT DETECTED
              </div>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                {staleMatrix.upstreamReason || `Prompt packages were generated for an earlier script version or parameters have changed.`}
                {isScriptVersionMismatch && (
                  <span className="block text-amber-200 mt-1 font-semibold">
                    Current Script is v{currentScript.versionNumber}, but prompt packages reference v{scenePackages[0]?.scriptVersionReference || 'N/A'}. Synchronize to align beats.
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={handleGenerateAllWithWarning}
            disabled={isPromptsGenerating}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPromptsGenerating ? 'animate-spin' : ''}`} />
            <span>SYNCHRONIZE NOW</span>
          </button>
        </div>
      ) : null}

      {/* 3. STYLE & CONTINUITY CONTROL BAR */}
      <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-[#00F0FF]" />
            <span className="text-slate-400">VISUAL STYLE:</span>
            <span className="text-[#00F0FF] font-bold">{currentStyle.name}</span>
          </div>

          <button
            onClick={() => setIsStyleModalOpen(true)}
            className="px-2.5 py-1 rounded bg-[#030712] hover:bg-[#00F0FF]/15 border border-[#1E293B] hover:border-[#00F0FF]/40 text-[#00F0FF] text-[11px] font-semibold flex items-center gap-1 transition-colors"
            title="Change visual style descriptors without modifying script beats or narration"
          >
            <SlidersHorizontal className="w-3 h-3" />
            <span>CHANGE STYLE ONLY (PAGE 12 INVARIANT)</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsBibleDrawerOpen(!isBibleDrawerOpen)}
            className={`px-3 py-1 rounded border text-[11px] font-semibold flex items-center gap-1.5 transition-colors ${
              isBibleDrawerOpen
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                : 'bg-[#030712] hover:bg-slate-900 border-[#1E293B] text-slate-300'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{isBibleDrawerOpen ? 'CLOSE CONTINUITY BIBLE' : 'VIEW / EDIT CONTINUITY BIBLE'}</span>
          </button>
        </div>
      </div>

      {/* 4. EDITABLE CONTINUITY BIBLE DRAWER (PAGE 13 SPECIFICATION) */}
      {isBibleDrawerOpen ? (
        <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#10B981]/50 space-y-4 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
            <div className="flex items-center gap-2 text-[#10B981]">
              <Layers className="w-4 h-4" />
              <h3 className="font-bold text-xs uppercase tracking-wider">
                SHARED CONTINUITY BIBLE (EMBEDDED ACROSS EVERY GOOGLE FLOW PROMPT)
              </h3>
            </div>

            <div className="flex items-center gap-2 text-xs">
              {hasBibleEdits ? (
                <span className="text-[10px] text-amber-400 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Unsaved Bible Edits</span>
                </span>
              ) : null}

              <button
                onClick={handleSaveContinuityBible}
                disabled={!hasBibleEdits}
                className={`px-3 py-1 rounded text-[11px] font-bold flex items-center gap-1.5 transition-all ${
                  hasBibleEdits
                    ? 'bg-[#10B981] hover:bg-[#10B981]/90 text-black shadow-[0_0_10px_rgba(16,185,129,0.3)]'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Save className="w-3 h-3" />
                <span>SAVE CONTINUITY BIBLE</span>
              </button>

              <button
                onClick={handleResetContinuityBible}
                className="px-2.5 py-1 rounded bg-[#030712] hover:bg-slate-900 border border-[#1E293B] text-slate-400 hover:text-white text-[11px] transition-colors"
                title="Restore default continuity values"
              >
                <Undo2 className="w-3 h-3" />
                <span>RESET</span>
              </button>

              <button
                onClick={() => setIsBibleDrawerOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            The Continuity Bible enforces coherent characters, visual motifs, auditory pacing, and camera rules across all scenes. Edits made here will propagate into Google Flow scene prompt packets and mark downstream scenes stale.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* Category 1: Voice & Narrator */}
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#FFE600] font-bold uppercase tracking-wider">
                  1. Voice & Narrator
                </span>
                <span className="text-[9px] text-slate-500">{project.language.toUpperCase()}</span>
              </div>
              <textarea
                value={bibleDraft.voiceNarrator}
                onChange={(e) => {
                  setBibleDraft({ ...bibleDraft, voiceNarrator: e.target.value });
                  setHasBibleEdits(true);
                }}
                rows={3}
                placeholder="Narrator vocal tone, cadence, and delivery rules..."
                className="w-full p-2 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-[#10B981] font-mono resize-none leading-relaxed"
              />
              <span className="text-[9px] text-slate-500 block">Cadence, tone, language discipline.</span>
            </div>

            {/* Category 2: Music Mood */}
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-2">
              <span className="text-[10px] text-[#00F0FF] font-bold uppercase tracking-wider block">
                2. Music Mood
              </span>
              <textarea
                value={bibleDraft.musicMood}
                onChange={(e) => {
                  setBibleDraft({ ...bibleDraft, musicMood: e.target.value });
                  setHasBibleEdits(true);
                }}
                rows={3}
                placeholder="Background musical score, tempo, mood, and analog textures..."
                className="w-full p-2 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-[#10B981] font-mono resize-none leading-relaxed"
              />
              <span className="text-[9px] text-slate-500 block">Instrumentation, atmosphere, tempo.</span>
            </div>

            {/* Category 3: Sound Design */}
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-2">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider block">
                3. Sound Design
              </span>
              <textarea
                value={bibleDraft.soundDesign}
                onChange={(e) => {
                  setBibleDraft({ ...bibleDraft, soundDesign: e.target.value });
                  setHasBibleEdits(true);
                }}
                rows={3}
                placeholder="Foley, atmospheric drones, electromagnetic chimes, spatial cues..."
                className="w-full p-2 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-[#10B981] font-mono resize-none leading-relaxed"
              />
              <span className="text-[9px] text-slate-500 block">Vacuum ambience, recurring audio signatures.</span>
            </div>

            {/* Category 4: Visual Identity & Palette */}
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-2">
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider block">
                4. Visual Palette & Camera
              </span>
              <textarea
                value={bibleDraft.visualPalette}
                onChange={(e) => {
                  setBibleDraft({ ...bibleDraft, visualPalette: e.target.value });
                  setHasBibleEdits(true);
                }}
                rows={3}
                placeholder="Color grading, key lighting, rim lights, and shaders..."
                className="w-full p-2 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-[#10B981] font-mono resize-none leading-relaxed"
              />
              <span className="text-[9px] text-slate-500 block">Lighting ratios, color accents, rim separation.</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. SCENE PROMPT CARDS (PAGE 11 BLUEPRINT FORMAT) */}
      {scenePackages.length === 0 ? (
        <div className="p-12 rounded-xl bg-[#0B0F19] border border-[#1E293B] text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] flex items-center justify-center mx-auto">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm">NO SCENE PROMPTS GENERATED YET</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Click below to generate self-contained Google Flow prompt packages for each approved scene in Script v{currentScript.versionNumber}.
            </p>
          </div>
          <button
            onClick={generatePromptsWithAI}
            disabled={isPromptsGenerating}
            className="px-5 py-2.5 rounded-lg bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black font-bold text-xs flex items-center gap-2 mx-auto transition-all shadow-[0_0_15px_rgba(0,240,255,0.3)]"
          >
            <RefreshCw className={`w-4 h-4 ${isPromptsGenerating ? 'animate-spin' : ''}`} />
            <span>GENERATE GOOGLE FLOW PROMPT PACKAGES</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {scenePackages.map((scene) => (
            <div 
              key={scene.id}
              className={`p-5 rounded-xl bg-[#0B0F19] border transition-all ${
                scene.isCustomEdited 
                  ? 'border-[#00F0FF]/40 shadow-[0_0_15px_rgba(0,240,255,0.08)]' 
                  : 'border-[#1E293B] hover:border-[#334155]'
              }`}
            >
              {/* Scene Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-[#1E293B] gap-2.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="px-2.5 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold tracking-wider">
                    SCENE 0{scene.sceneNumber}
                  </span>

                  <input
                    type="text"
                    value={scene.title}
                    onChange={(e) => {
                      updateScenePackage(scene.id, { title: e.target.value });
                    }}
                    className="font-bold text-white text-sm bg-transparent border-b border-transparent hover:border-slate-700 focus:border-[#00F0FF] focus:outline-none transition-colors px-1"
                    title="Click to edit scene title"
                  />

                  {scene.isCustomEdited ? (
                    <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-[10px] font-bold flex items-center gap-1">
                      <Edit3 className="w-3 h-3" />
                      <span>MANUALLY EDITED</span>
                    </span>
                  ) : null}

                  {/* Policy Review Status Badges (Tasks 2, 3, 6) */}
                  {scene.flowRejectionReported ? (
                    <span className="px-2 py-0.5 rounded bg-purple-500/15 border border-purple-500/40 text-purple-300 text-[10px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-purple-400" />
                      <span>FLOW REJECTED</span>
                    </span>
                  ) : scene.safetyReview?.status === 'revised' ? (
                    <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      <span>LIKENESS REVISED</span>
                    </span>
                  ) : scene.safetyReview?.status === 'unrepairable' ? (
                    <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>REVIEW REQUIRED</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-medium flex items-center gap-1" title="Visual prompt checked against prominent-people policy">
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span>POLICY REVIEWED</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    {scene.format}
                  </span>

                  <span className="text-[10px] text-[#FFE600] bg-[#FFE600]/10 px-2 py-0.5 rounded border border-[#FFE600]/30 font-bold">
                    {scene.durationSec}s
                  </span>

                  {scene.isCustomEdited ? (
                    <button
                      onClick={() => handleRevertCustomEdit(scene)}
                      className="px-2 py-1 rounded bg-[#030712] hover:bg-slate-900 border border-[#1E293B] text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                      title="Revert to baseline prompt"
                    >
                      <Undo2 className="w-3 h-3" />
                      <span>REVERT</span>
                    </button>
                  ) : null}

                  {/* Flow Rejection Report Action */}
                  <button
                    onClick={() => handleOpenFlowRejectionModal(scene)}
                    className="px-2 py-1 rounded bg-[#030712] hover:bg-rose-950/40 border border-[#1E293B] hover:border-rose-500/40 text-rose-300 text-[10px] font-medium flex items-center gap-1 transition-colors"
                    title="Report a Google Flow policy rejection for this scene to generate a safer revision"
                  >
                    <ShieldAlert className="w-3 h-3 text-rose-400" />
                    <span className="hidden sm:inline">FLOW REJECTED?</span>
                  </button>

                  <button
                    onClick={() => handleSingleSceneRegenerate(scene.sceneNumber)}
                    disabled={regeneratingSceneNum === scene.sceneNumber}
                    className="p-1.5 rounded bg-[#030712] hover:bg-slate-900 border border-[#1E293B] text-slate-400 hover:text-[#00F0FF] transition-colors"
                    title="Regenerate this scene prompt only (isolates other scenes)"
                  >
                    <RotateCcw className={`w-3.5 h-3.5 ${regeneratingSceneNum === scene.sceneNumber ? 'animate-spin text-[#00F0FF]' : ''}`} />
                  </button>

                  <button
                    onClick={() => handleCopySingleScene(scene)}
                    className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      copiedSceneId === scene.id
                        ? 'bg-[#10B981] text-black font-bold'
                        : 'bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF]'
                    }`}
                    title="Copy complete scene package per Page 11 blueprint"
                  >
                    {copiedSceneId === scene.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedSceneId === scene.id ? 'COPIED' : 'COPY SCENE'}</span>
                  </button>
                </div>
              </div>

              {/* Safety Review Notice Banner (Transparent Inspection - Task 6) */}
              {scene.safetyReview?.isRevised ? (
                <div className="mt-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-amber-300 uppercase tracking-wide text-[11px]">
                          Google Flow Likeness Policy Revision Applied
                        </span>
                        <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                          {scene.safetyReview.explanation || 'Visual prompt adapted to use an original fictional character or documentary environmental focus to reduce rejection risks.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setComparisonScene(scene)}
                        className="px-2.5 py-1 rounded bg-[#0B0F19] hover:bg-[#030712] border border-amber-500/40 text-amber-300 text-[10px] font-bold flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        <span>COMPARE ORIGINAL VS REVISED</span>
                      </button>

                      {scene.originalVisualPrompt && (
                        <button
                          onClick={() => restoreOriginalScenePrompt(scene.id)}
                          className="px-2.5 py-1 rounded bg-[#0B0F19] hover:bg-slate-900 border border-[#1E293B] text-slate-400 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                          title="Restore the unrevised original visual prompt"
                        >
                          <History className="w-3 h-3" />
                          <span>RESTORE ORIGINAL</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : scene.safetyReview?.status === 'unrepairable' ? (
                <div className="mt-3 p-3 rounded-lg bg-rose-500/10 border border-rose-500/40 text-xs space-y-1.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-rose-300 uppercase tracking-wide text-[11px]">
                        Editorial Review Required — Unrepairable Likeness Depiction
                      </span>
                      <p className="text-slate-300 text-[11px] mt-0.5 leading-relaxed">
                        {scene.safetyReview.explanation}
                      </p>
                      {scene.safetyReview.suggestedAction && (
                        <p className="text-rose-200 text-[10px] mt-1 font-semibold">
                          Recommendation: {scene.safetyReview.suggestedAction}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Invariant Script Beat Reference (Read-Only) */}
              <div className="mt-3.5 p-3 rounded-lg bg-[#030712] border border-[#1E293B] text-xs space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    APPROVED SCRIPT BEAT (INVARIANT — SCRIPT V{scene.scriptVersionReference || currentScript.versionNumber}):
                  </span>
                  <span className="text-slate-500">Immutable Narration</span>
                </div>
                <p className="text-slate-300 italic leading-relaxed">
                  "{scene.scriptBeat}"
                </p>
              </div>

              {/* Visual Prompt Section */}
              <div className="mt-4 space-y-1.5">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                  <span className="text-[#00F0FF] font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
                    Visual Prompt for Google Flow:
                  </span>
                  <span className="text-slate-500">Subject Action / Composition / Camera Motion / Lighting / Textures</span>
                </div>
                <textarea
                  value={scene.visualPrompt}
                  onChange={(e) => {
                    updateScenePackage(scene.id, { visualPrompt: e.target.value });
                  }}
                  rows={4}
                  className="w-full p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-[#00F0FF] transition-colors leading-relaxed font-mono resize-y shadow-inner"
                  placeholder="Detailed visual prompt tailored for Google Flow..."
                />
              </div>

              {/* Continuity Checklist Snippet */}
              <div className="mt-3 space-y-1">
                <div className="flex items-center justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                  <span className="text-slate-400 font-bold">Continuity Specification:</span>
                  <span className="text-slate-600">Style / Palette / Camera Guidelines</span>
                </div>
                <input
                  type="text"
                  value={scene.continuitySnippet}
                  onChange={(e) => {
                    updateScenePackage(scene.id, { continuitySnippet: e.target.value });
                  }}
                  className="w-full p-2.5 rounded-lg bg-[#030712] border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-[#00F0FF] font-mono"
                  placeholder="Scene-specific continuity checklist..."
                />
              </div>

              {/* Narration & Sound Grid */}
              <div className="mt-3.5 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Voice-Over Narration (Read-Only) */}
                <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-[#FFE600] font-bold uppercase">
                    <span className="flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-[#FFE600]" />
                      Voice-Over Narration ({project.language === 'hi' ? 'Hindi / हिंदी' : 'English'}):
                    </span>
                    <span className="text-[9px] text-slate-500">Read-Only</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed text-[11px] font-mono">
                    {scene.narration}
                  </p>
                </div>

                {/* Sound Design & Audio Atmosphere (Editable) */}
                <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase">
                    <span>Sound Design & Music Cues:</span>
                    <span className="text-[9px] text-slate-500">Editable</span>
                  </div>
                  <textarea
                    value={scene.soundDesign}
                    onChange={(e) => {
                      updateScenePackage(scene.id, { soundDesign: e.target.value });
                    }}
                    rows={2}
                    className="w-full p-2 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300 text-[11px] focus:outline-none focus:border-[#00F0FF] font-mono resize-none leading-relaxed"
                    placeholder="Atmospheric sound cues, foley, drones..."
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 6. VISUAL STYLE CHANGE MODAL (PAGE 12 STYLE-ONLY REGENERATION) */}
      {isStyleModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[#0B0F19] border border-[#00F0FF]/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2 text-[#00F0FF]">
                <Palette className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">REGENERATE VISUAL STYLE ONLY</h3>
              </div>
              <span className="text-[10px] px-2.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold">
                PAGE 12 INVARIANT: SCRIPT & NARRATION PRESERVED
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Select a new visual style. Only visual prompt descriptors, lighting, textures, and camera grammar will be regenerated. <strong>Script beats and narration will remain 100% byte-for-byte identical.</strong>
            </p>

            {hasManualEdits ? (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Notice: Custom visual prompt text will be updated to reflect the new style. Non-visual custom fields will be preserved.</span>
              </div>
            ) : null}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {VISUAL_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => handleStyleChangeWithWarning(style.id)}
                  className={`p-3 rounded-lg border text-left text-xs transition-all ${
                    project.visualStyleId === style.id
                      ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-white shadow-[0_0_12px_rgba(0,240,255,0.2)]'
                      : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155] hover:text-white'
                  }`}
                >
                  <div className="font-bold text-white mb-0.5 flex items-center justify-between">
                    <span>{style.name}</span>
                    {project.visualStyleId === style.id ? (
                      <Check className="w-3.5 h-3.5 text-[#00F0FF]" />
                    ) : null}
                  </div>
                  <div className="text-[10px] text-slate-500 uppercase">{style.category}</div>
                  <p className="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                    {style.promptTreatment}
                  </p>
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setIsStyleModalOpen(false)}
                className="px-4 py-1.5 rounded text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 7. MANUAL EDIT OVERWRITE CONFIRMATION MODAL */}
      {isOverwriteModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B0F19] border border-amber-500/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">OVERWRITE MANUAL PROMPT EDITS?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {overwriteReason}
            </p>

            <div className="p-3 rounded bg-[#030712] border border-[#1E293B] text-[11px] text-slate-400 space-y-1">
              <div className="text-white font-bold">Protected Invariants:</div>
              <div>• Script beats and narration will never be changed.</div>
              <div>• Manual edits to visual prompts in marked scenes will be replaced.</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => {
                  setIsOverwriteModalOpen(false);
                  setPendingOverwriteAction(null);
                }}
                className="px-3.5 py-1.5 rounded text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  if (pendingOverwriteAction) pendingOverwriteAction();
                }}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors"
              >
                Proceed & Overwrite
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 8. PROMPT SAFETY COMPARISON MODAL (TRANSPARENCY - TASK 6) */}
      {comparisonScene ? (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-[#0B0F19] border border-amber-500/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2 text-amber-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  PROMPT SAFETY AUDIT // SCENE 0{comparisonScene.sceneNumber}
                </h3>
              </div>
              <button
                onClick={() => setComparisonScene(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation of Policy Action */}
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-2 text-xs">
              <div className="flex items-center gap-2 text-amber-300 font-bold">
                <AlertCircle className="w-4 h-4" />
                <span>Detection & Resolution Summary</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                {comparisonScene.safetyReview?.explanation || 'A prominent person name or likeness directive was detected in the prompt context. To prevent Google Flow prompt rejection, ILLUMATRIX generated a safe alternative with an original fictional character or documentary environmental focus.'}
              </p>
              {comparisonScene.safetyReview?.flags && comparisonScene.safetyReview.flags.length > 0 && (
                <div className="pt-1 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Flagged Elements:</span>
                  {comparisonScene.safetyReview.flags.map((flag, i) => (
                    <div key={i} className="text-[11px] text-rose-300 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">
                      • <strong>{flag.type}:</strong> {flag.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Side-by-Side Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Original Visual Prompt */}
              <div className="p-3.5 rounded-lg bg-[#030712] border border-rose-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3.5 h-3.5" />
                    Original Prompt (Baseline)
                  </span>
                  <span className="text-[9px] text-rose-400/80">Risky for Flow</span>
                </div>
                <div className="p-2.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300 text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {comparisonScene.originalVisualPrompt || comparisonScene.visualPrompt}
                </div>
                <span className="text-[10px] text-slate-500 block">Contains prominent-person or likeness reference.</span>
              </div>

              {/* Revised Visual Prompt */}
              <div className="p-3.5 rounded-lg bg-[#030712] border border-emerald-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Revised Visual Prompt (Safe)
                  </span>
                  <span className="text-[9px] text-emerald-400">Flow-Optimized</span>
                </div>
                <div className="p-2.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-200 text-[11px] leading-relaxed max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {comparisonScene.visualPrompt}
                </div>
                <span className="text-[10px] text-slate-500 block">Uses distinct fictional character or documentary setting.</span>
              </div>
            </div>

            {/* Immutable Protected Law Notice */}
            <div className="p-2.5 rounded bg-[#030712] border border-[#1E293B] text-[10px] text-slate-400 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Invariant Law:</strong> Script beat narration ("{comparisonScene.scriptBeat.slice(0, 50)}...") is 100% byte-for-byte identical. Only visual likeness descriptors were revised.
              </span>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => {
                  restoreOriginalScenePrompt(comparisonScene.id);
                  setComparisonScene(null);
                }}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded bg-[#030712] hover:bg-slate-900 border border-[#1E293B] text-slate-300 hover:text-white text-xs flex items-center justify-center gap-1.5 transition-colors"
                title="Revert to unrevised original prompt"
              >
                <Undo2 className="w-3.5 h-3.5" />
                <span>Restore Original Prompt</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  onClick={() => setComparisonScene(null)}
                  className="w-full sm:w-auto px-4 py-1.5 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black font-bold text-xs transition-colors"
                >
                  Keep Revised Prompt
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 9. GOOGLE FLOW REJECTION REPAIR MODAL (TASK 6 TRANSPARENT WORKFLOW) */}
      {reportingFlowScene ? (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0B0F19] border border-rose-500/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-bold text-sm text-white">
                  GOOGLE FLOW REJECTION WORKFLOW // SCENE 0{reportingFlowScene.sceneNumber}
                </h3>
              </div>
              <button
                onClick={() => setReportingFlowScene(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              If Google Flow rejected Scene 0{reportingFlowScene.sceneNumber} with a policy violation (e.g. prominent people), ILLUMATRIX will preserve your original prompt and safely generate a compliant alternative.
            </p>

            <div className="space-y-1.5 text-xs">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                Google Flow Rejection Message:
              </label>
              <textarea
                value={flowRejectionReasonInput}
                onChange={(e) => setFlowRejectionReasonInput(e.target.value)}
                rows={3}
                className="w-full p-2.5 rounded bg-[#030712] border border-[#1E293B] text-rose-200 text-xs focus:outline-none focus:border-rose-400 font-mono resize-none leading-relaxed"
                placeholder="Paste the exact rejection message from Google Flow..."
              />
              <span className="text-[10px] text-slate-500 block">
                Standard: “FAILED — This prompt might violate our policies about generating prominent people.”
              </span>
            </div>

            <div className="p-3 rounded bg-[#030712] border border-[#1E293B] text-[11px] text-slate-400 space-y-1">
              <div className="text-white font-bold">Safety Guarantee:</div>
              <div>• Original prompt is preserved as a recoverable baseline.</div>
              <div>• Rewrites visual likeness descriptors into a safe, distinct original fictional character or verified documentary artifacts.</div>
              <div>• Approved script narration and scene pacing remain 100% byte-for-byte identical.</div>
              <div>• Note: No system can guarantee 100% acceptance as Google Flow moderates at generation time.</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setReportingFlowScene(null)}
                disabled={isRepairingFlow}
                className="px-3.5 py-1.5 rounded text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={handleConfirmFlowRejectionRepair}
                disabled={isRepairingFlow}
                className="px-4 py-1.5 rounded bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-[0_0_15px_rgba(251,113,133,0.3)]"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRepairingFlow ? 'animate-spin' : ''}`} />
                <span>{isRepairingFlow ? 'REPAIRING PROMPT...' : 'PRESERVE ORIGINAL & REPAIR PROMPT'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
