import React, { useState, useEffect } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { CONTENT_MODES } from '../../data/registries';
import { ScriptSceneBeat } from '../../types/hud';
import { 
  Clapperboard, 
  CheckCircle2, 
  RotateCcw, 
  Save, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  ArrowRight,
  Eye, 
  FileCode, 
  Clock, 
  Volume2,
  Sparkles,
  History,
  Check,
  RefreshCw,
  FileText,
  AlertOctagon,
  Cpu
} from 'lucide-react';

export const ScriptStudioWorkspace: React.FC = () => {
  const { 
    project, 
    currentScript,
    scriptVersions,
    isScriptGenerating,
    generateScriptWithAI,
    regenerateSingleBeatWithAI,
    saveScriptDraft,
    approveScript,
    unlockScriptForEdits,
    rollbackScriptVersion,
    isScriptApproved, 
    navigateToNextStage, 
    staleMatrix,
    showToast,
    stories,
    selectedStoryId,
    selectedStory,
    selectStory,
    activeConnection
  } = useWorkflow();

  // Local draft scenes state for responsive typing before saving/auto-syncing
  const [localScenes, setLocalScenes] = useState<ScriptSceneBeat[]>(currentScript.scenes);
  const [activeTab, setActiveTab] = useState<'script' | 'source_compare' | 'versions'>('script');
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState<boolean>(false);
  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState<boolean>(false);
  const [regeneratingBeatNum, setRegeneratingBeatNum] = useState<number | null>(null);
  const [hasUnsavedDraftEdits, setHasUnsavedDraftEdits] = useState<boolean>(false);

  // Sync local scenes whenever currentScript changes from external generation or rollback
  useEffect(() => {
    setLocalScenes(currentScript.scenes);
    setHasUnsavedDraftEdits(false);
  }, [currentScript.id, currentScript.updatedAt, currentScript.versionNumber]);

  // Handle single narration beat edit
  const handleNarrationChange = (sceneNum: number, newText: string) => {
    if (isScriptApproved) return;
    const words = newText.trim() ? newText.trim().split(/\s+/).length : 0;
    setLocalScenes(prev => prev.map(s => s.sceneNumber === sceneNum ? {
      ...s,
      narrationText: newText,
      wordCount: words,
      isCustomEdited: true,
    } : s));
    setHasUnsavedDraftEdits(true);
  };

  // Save manual draft edits
  const handleSaveDraft = () => {
    saveScriptDraft(localScenes);
    setHasUnsavedDraftEdits(false);
  };

  // Handle full script generation
  const handleConfirmRegenerate = async () => {
    setIsRegenerateModalOpen(false);
    const success = await generateScriptWithAI();
    if (success) {
      setHasUnsavedDraftEdits(false);
    }
  };

  // Handle single beat regeneration
  const handleRegenerateBeat = async (sceneNumber: number) => {
    if (isScriptApproved) {
      showToast('Unlock script to regenerate individual beats.');
      return;
    }
    setRegeneratingBeatNum(sceneNumber);
    await regenerateSingleBeatWithAI(sceneNumber);
    setRegeneratingBeatNum(null);
  };

  // Calculations for script pacing
  const totalWords = localScenes.reduce((acc, b) => acc + (b.narrationText.trim() ? b.narrationText.trim().split(/\s+/).length : 0), 0);
  const estSpeakingTime = Math.round(totalWords / 2.5); // ~2.5 words per sec standard voiceover
  const targetDuration = project.format === '9:16_SHORTS' ? project.shortsDuration : project.longFormDurationMinutes * 60;
  
  // Pacing status check: For 8s clips, optimal is 16-22 words
  const getPacingStatus = (words: number) => {
    if (words < 12) return { label: 'Sparse', color: 'text-amber-400', bg: 'bg-amber-400/10' };
    if (words > 23) return { label: 'Fast / Dense', color: 'text-rose-400', bg: 'bg-rose-400/10' };
    return { label: 'Optimal Pace', color: 'text-emerald-400', bg: 'bg-emerald-400/10' };
  };

  const currentModeInfo = CONTENT_MODES.find(m => m.id === project.modeId);

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E293B] gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#00F0FF] mb-1">
            <Clapperboard className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-bold tracking-wider">STAGE 03 // SCRIPT STUDIO & APPROVAL GATE</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            <span>High-Retention Script Generation</span>
            <span className="text-xs px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF]">
              v{currentScript.versionNumber}.0
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Synthesized from ground-truth source story using <strong className="text-white">{currentModeInfo?.name || project.modeId}</strong> mode in <strong className="text-[#FFE600]">{project.language === 'hi' ? 'Hindi (हिंदी)' : 'English'}</strong>. Explicit approval is strictly required to unlock downstream Google Flow prompts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isScriptApproved ? (
            <button
              onClick={navigateToNextStage}
              className="px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)] shrink-0"
            >
              <span>STAGE 04: SCENE PROMPTS</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="px-3 py-1.5 rounded bg-slate-900 border border-slate-800 text-slate-500 text-xs flex items-center gap-1.5 shrink-0">
              <Lock className="w-3.5 h-3.5 text-amber-500" />
              <span>APPROVAL REQUIRED</span>
            </div>
          )}
        </div>
      </div>

      {/* Script Approval & Status Banner */}
      <div className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
        staleMatrix.scriptStale
          ? 'bg-[#FB7185]/10 border-[#FB7185]/40 text-slate-200'
          : isScriptApproved
            ? 'bg-[#10B981]/10 border-[#10B981]/40 text-slate-200'
            : 'bg-[#FFE600]/10 border-[#FFE600]/40 text-slate-200'
      }`}>
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg shrink-0 ${
            staleMatrix.scriptStale 
              ? 'bg-[#FB7185]/20 text-[#FB7185]' 
              : isScriptApproved 
                ? 'bg-[#10B981]/20 text-[#10B981]' 
                : 'bg-[#FFE600]/20 text-[#FFE600]'
          }`}>
            {staleMatrix.scriptStale ? (
              <AlertOctagon className="w-5 h-5" />
            ) : isScriptApproved ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="text-xs font-bold flex items-center gap-2 flex-wrap">
              <span>
                {staleMatrix.scriptStale 
                  ? 'SCRIPT STALE (UPSTREAM SOURCE MODIFIED)' 
                  : isScriptApproved 
                    ? 'SCRIPT APPROVED & LOCKED' 
                    : 'DRAFT REVIEW PENDING EXPLICIT APPROVAL'}
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400">
                v{currentScript.versionNumber}.0
              </span>
              {currentScript.isFallback && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold" title="Produced by local deterministic fallback engine from source text. Not live model output.">
                  LOCAL FALLBACK ENGINE
                </span>
              )}
              {currentScript.approvedAt && isScriptApproved && (
                <span className="text-[10px] text-emerald-400/80">
                  Approved at {new Date(currentScript.approvedAt).toLocaleTimeString()}
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {currentScript.isFallback && !isScriptApproved ? (
                <span className="text-amber-300/90 font-medium">
                  Notice: Script was generated via local deterministic fallback from your source text. Inspect beats below and approve when ready.
                </span>
              ) : staleMatrix.scriptStale
                ? (staleMatrix.upstreamReason || 'The selected source story was modified. Regenerate script or re-approve.')
                : isScriptApproved 
                  ? 'This script version is verified and locked. Google Flow scene prompt generation (Stage 04) is enabled.' 
                  : 'Review narration beats below. Make any manual edits, then click "Approve Script" to unlock downstream prompt generation.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {hasUnsavedDraftEdits && !isScriptApproved && (
            <button
              onClick={handleSaveDraft}
              className="px-3 py-1.5 rounded bg-blue-600/30 hover:bg-blue-600/40 border border-blue-500/50 text-blue-200 text-xs flex items-center gap-1.5 transition-colors"
            >
              <Save className="w-3.5 h-3.5 text-blue-400" />
              <span>SAVE DRAFT EDITS</span>
            </button>
          )}

          <button
            onClick={() => setIsRegenerateModalOpen(true)}
            disabled={isScriptGenerating}
            className="px-3 py-1.5 rounded bg-[#030712] hover:bg-slate-900 border border-[#1E293B] text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            {isScriptGenerating ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#00F0FF]" />
            ) : (
              <RotateCcw className="w-3.5 h-3.5 text-[#FFE600]" />
            )}
            <span>{isScriptGenerating ? 'GENERATING...' : 'REGENERATE SCRIPT'}</span>
          </button>

          {!isScriptApproved ? (
            <button
              onClick={approveScript}
              disabled={isScriptGenerating}
              className="px-4 py-1.5 rounded bg-[#10B981] hover:bg-[#10B981]/90 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] disabled:opacity-50"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>APPROVE SCRIPT</span>
            </button>
          ) : (
            <button
              onClick={() => setIsUnlockConfirmOpen(true)}
              className="px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
            >
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>UNLOCK FOR EDITS</span>
            </button>
          )}
        </div>
      </div>

      {/* Script Studio Workspace Container */}
      <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
        {/* Source Story Grounding Header Bar (Page 7 & 8 requirement) */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-lg bg-[#030712] border border-[#1E293B] text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-[#00F0FF]" />
              GROUND-TRUTH SOURCE:
            </span>
            <select
              value={selectedStoryId}
              onChange={(e) => selectStory(e.target.value)}
              className="bg-[#0B0F19] border border-[#1E293B] rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#00F0FF] max-w-sm truncate"
            >
              {stories.filter(s => !s.isArchived).map(s => (
                <option key={s.id} value={s.id}>
                  {s.title} (v{s.version} · {s.wordCount} words)
                </option>
              ))}
            </select>

            <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400">
              v{selectedStory.version} · {selectedStory.wordCount} words
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5 text-[#00F0FF]" />
              Model: <strong className="text-white">{activeConnection.modelId}</strong>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              Mode: <strong className="text-[#FFE600]">{currentModeInfo?.name || project.modeId}</strong>
            </span>
          </div>
        </div>

        {/* Navigation Tabs & Script Pacing Telemetry */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1E293B] gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('script')}
              className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'script'
                  ? 'bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              <span>SCENE BEAT BREAKDOWN ({localScenes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('source_compare')}
              className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'source_compare'
                  ? 'bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>COMPARE WITH SOURCE</span>
            </button>

            <button
              onClick={() => setActiveTab('versions')}
              className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center gap-1.5 ${
                activeTab === 'versions'
                  ? 'bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>VERSIONS ({scriptVersions.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Volume2 className="w-3.5 h-3.5 text-[#00F0FF]" />
              <strong className="text-white tabular-nums">{totalWords}</strong> words
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-[#FFE600]" />
              Speaking: <strong className="text-[#FFE600] tabular-nums">~{estSpeakingTime}s</strong>
              <span className="text-[10px] text-slate-500">/ {targetDuration}s</span>
            </span>
          </div>
        </div>

        {/* Tab 1: Scene Beat Breakdown */}
        {activeTab === 'script' && (
          <div className="space-y-4">
            {isScriptGenerating ? (
              <div className="p-12 text-center rounded-xl bg-[#030712] border border-[#00F0FF]/30 space-y-3">
                <RefreshCw className="w-8 h-8 mx-auto text-[#00F0FF] animate-spin" />
                <h3 className="text-sm font-bold text-white">Synthesizing High-Retention Script...</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Grounding scenes in source story "{selectedStory.title}". Pacing strictly configured to 8-second clip intervals.
                </p>
              </div>
            ) : (
              localScenes.map((beat) => {
                const pace = getPacingStatus(beat.wordCount);
                const isRegeneratingThis = regeneratingBeatNum === beat.sceneNumber;

                return (
                  <div 
                    key={beat.id}
                    className={`p-4 rounded-lg bg-[#030712] border transition-all space-y-3 ${
                      beat.isCustomEdited 
                        ? 'border-blue-500/40 bg-blue-950/10' 
                        : 'border-[#1E293B] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] text-xs font-bold">
                          SCENE 0{beat.sceneNumber}
                        </span>
                        <span className="text-xs text-white font-semibold">
                          {beat.purpose}
                        </span>
                        {beat.isCustomEdited && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Custom Edited
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border ${pace.bg} ${pace.color} border-current/20`}>
                          {beat.wordCount} words · {pace.label}
                        </span>
                        <span className="text-xs text-[#FFE600] bg-[#FFE600]/10 px-2 py-0.5 rounded border border-[#FFE600]/30 tabular-nums">
                          {beat.timeRange}
                        </span>

                        {!isScriptApproved && (
                          <button
                            onClick={() => handleRegenerateBeat(beat.sceneNumber)}
                            disabled={isRegeneratingThis || isScriptGenerating}
                            title="Regenerate this single scene beat with AI"
                            className="p-1 rounded bg-[#0B0F19] hover:bg-slate-800 border border-[#1E293B] text-slate-400 hover:text-[#00F0FF] transition-colors disabled:opacity-40"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isRegeneratingThis ? 'animate-spin text-[#00F0FF]' : ''}`} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Voice-Over Narration Text Editor */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Volume2 className="w-3 h-3 text-[#00F0FF]" />
                          Voice-Over Narration ({project.language === 'hi' ? 'Devanagari Hindi हिंदी' : 'English'}):
                        </label>
                        {isScriptApproved && (
                          <span className="text-[10px] text-amber-400/80 flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" /> Read-only (Approved)
                          </span>
                        )}
                      </div>
                      <textarea
                        value={beat.narrationText}
                        onChange={(e) => handleNarrationChange(beat.sceneNumber, e.target.value)}
                        readOnly={isScriptApproved}
                        rows={2}
                        className={`w-full p-2.5 rounded bg-[#0B0F19] border text-slate-200 text-xs focus:outline-none transition-colors resize-y leading-relaxed font-mono ${
                          isScriptApproved 
                            ? 'border-slate-800/80 cursor-not-allowed opacity-90' 
                            : 'border-[#1E293B] focus:border-[#00F0FF]'
                        }`}
                      />
                    </div>

                    {/* Narrative Visual Direction Draft */}
                    <div className="p-2.5 rounded bg-[#0B0F19]/60 border border-slate-900 text-xs text-slate-400">
                      <span className="text-[10px] text-slate-500 uppercase block mb-0.5 font-bold tracking-wider">
                        Narrative Visual Direction Draft:
                      </span>
                      <p className="text-[11px] leading-relaxed text-slate-300">
                        {beat.visualDirectionDraft}
                      </p>
                    </div>
                  </div>
                );
              })
            )}

            {/* Mode & Prompting Rules Advice (Blueprint Page 8) */}
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] text-xs text-slate-400 space-y-1.5">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-[#FFE600]" />
                <span>Mode Guidance: {currentModeInfo?.name}</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                {currentModeInfo?.rules}
              </p>
              <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500">
                <span>Pacing: <strong className="text-slate-300">{currentModeInfo?.pacing}</strong></span>
                <span>•</span>
                <span>Tone: <strong className="text-slate-300">{currentModeInfo?.tone}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Side-by-Side Compare with Source */}
        {activeTab === 'source_compare' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Ground Truth Source Column */}
            <div className="p-4 rounded-lg bg-[#030712] border border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                <div>
                  <span className="text-slate-400 font-bold uppercase text-[10px] block">
                    GROUND-TRUTH SOURCE
                  </span>
                  <span className="text-xs text-white font-semibold">{selectedStory.title}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[#00F0FF]">
                  v{selectedStory.version} · {selectedStory.wordCount} words
                </span>
              </div>
              <div className="p-3 rounded bg-[#0B0F19] border border-slate-900 max-h-96 overflow-y-auto">
                <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-wrap font-mono">
                  {selectedStory.rawText}
                </p>
              </div>
              {selectedStory.notes && (
                <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-2">
                  <strong className="text-slate-400">Context Notes:</strong> {selectedStory.notes}
                </div>
              )}
            </div>

            {/* Generated Script Synthesis Column */}
            <div className="p-4 rounded-lg bg-[#030712] border border-[#1E293B] space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                <div>
                  <span className="text-[#00F0FF] font-bold uppercase text-[10px] block">
                    SCRIPT SYNTHESIS (v{currentScript.versionNumber})
                  </span>
                  <span className="text-xs text-white font-semibold">{currentScript.title}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[#FFE600]">
                  {totalWords} words · ~{estSpeakingTime}s
                </span>
              </div>
              <div className="p-3 rounded bg-[#0B0F19] border border-slate-900 max-h-96 overflow-y-auto space-y-3 text-slate-300 text-[11px]">
                {localScenes.map((b) => (
                  <div key={b.id} className="pb-2 border-b border-slate-900 last:border-0">
                    <span className="text-[#00F0FF] font-semibold block text-[10px] mb-0.5">
                      SCENE 0{b.sceneNumber} ({b.timeRange}) — {b.purpose}
                    </span>
                    <p className="leading-relaxed text-slate-200 font-mono">
                      "{b.narrationText}"
                    </p>
                  </div>
                ))}
              </div>
              <div className="text-[10px] text-slate-500 border-t border-slate-900 pt-2 flex items-center justify-between">
                <span>Adherence: <strong className="text-emerald-400">Ground-truth faithful</strong></span>
                <span>Approval: <strong className={isScriptApproved ? 'text-emerald-400' : 'text-amber-400'}>{isScriptApproved ? 'APPROVED' : 'PENDING'}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Script Version History */}
        {activeTab === 'versions' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 mb-2">
              Previous script generations and draft snapshots. Roll back to restore an earlier narration state.
            </div>
            {scriptVersions.map((v) => {
              const isCurrent = v.id === currentScript.id;
              return (
                <div 
                  key={v.id}
                  className={`p-4 rounded-lg bg-[#030712] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isCurrent ? 'border-[#00F0FF] bg-[#00F0FF]/5' : 'border-[#1E293B] hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">
                        Version v{v.versionNumber}.0
                      </span>
                      {isCurrent && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] font-semibold border border-[#00F0FF]/30">
                          ACTIVE
                        </span>
                      )}
                      {v.isApproved && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                          APPROVED
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300">
                      {v.title}
                    </p>
                    <div className="text-[10px] text-slate-500 flex items-center gap-2">
                      <span>{v.scenes.length} scenes</span>
                      <span>•</span>
                      <span>{v.totalWords} words (~{v.speakingDurationSeconds}s)</span>
                      <span>•</span>
                      <span>{new Date(v.createdAt).toLocaleString()}</span>
                    </div>
                  </div>

                  <div>
                    {!isCurrent && (
                      <button
                        onClick={() => rollbackScriptVersion(v.versionNumber)}
                        className="px-3 py-1.5 rounded bg-[#0B0F19] hover:bg-slate-800 border border-[#1E293B] text-slate-300 hover:text-[#00F0FF] text-xs flex items-center gap-1.5 transition-colors"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>Restore v{v.versionNumber}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal: Full Script Regeneration */}
      {isRegenerateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B0F19] border border-[#FFE600]/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center gap-3 text-[#FFE600]">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm text-white">CONFIRM SCRIPT REGENERATION</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Regenerating the full script will replace current draft beats with a newly synthesized version from source "{selectedStory.title}".
              Your current draft will be archived into the version history.
            </p>
            <div className="p-2.5 rounded bg-[#030712] border border-[#1E293B] text-[11px] text-slate-300 space-y-1">
              <div>Mode: <strong className="text-white">{currentModeInfo?.name}</strong></div>
              <div>Language: <strong className="text-[#FFE600]">{project.language === 'hi' ? 'Hindi (हिंदी)' : 'English'}</strong></div>
              <div>Duration: <strong className="text-white">{targetDuration}s</strong> ({Math.round(targetDuration / 8)} scenes)</div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setIsRegenerateModalOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRegenerate}
                className="px-4 py-1.5 rounded bg-[#FFE600] text-black font-bold text-xs hover:bg-[#FFE600]/90 transition-colors"
              >
                Proceed & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal: Unlock Script for Edits */}
      {isUnlockConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B0F19] border border-amber-500/40 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <Lock className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-sm text-white">UNLOCK SCRIPT FOR REVISION</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Unlocking the script will make narration beats editable again. Note that downstream Google Flow scene prompts (Stage 04) will be marked <strong className="text-amber-400">STALE</strong> and Stage 04 will require re-approval before proceeding.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setIsUnlockConfirmOpen(false)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white"
              >
                Keep Locked
              </button>
              <button
                onClick={() => {
                  setIsUnlockConfirmOpen(false);
                  unlockScriptForEdits();
                }}
                className="px-4 py-1.5 rounded bg-amber-500 text-black font-bold text-xs hover:bg-amber-400 transition-colors"
              >
                Unlock & Enable Edits
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
