import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  Image, 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  Layers,
  Lock,
  AlertTriangle,
  CheckCircle2,
  Edit3,
  Undo2,
  RefreshCw,
  Star,
  Eye,
  Sliders,
  Maximize2
} from 'lucide-react';
import { ThumbnailPromptItem } from '../../types/hud';

export const ThumbnailStudioWorkspace: React.FC = () => {
  const { 
    project, 
    currentScript,
    isScriptApproved,
    seoPackage,
    thumbnailsPackage,
    isThumbnailsGenerating,
    isSingleThumbnailRegenerating,
    isImageRendering,
    generateThumbnailsWithAI,
    regenerateSingleThumbnailOptionWithAI,
    renderThumbnailImageWithAI,
    updateThumbnailOption,
    selectPrimaryThumbnail,
    approveThumbnails,
    unlockThumbnailsForEdits,
    resetThumbnailsToDefault,
    navigateToNextStage, 
    requestStageNavigation,
    addActivityEvent, 
    staleMatrix,
    showToast 
  } = useWorkflow();

  // Local state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);
  const [isRegenerateAllModalOpen, setIsRegenerateAllModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'both' | 'option_a' | 'option_b'>('both');
  const [zoomImage, setZoomImage] = useState<{ url: string; title: string; overlay: string } | null>(null);

  const isScriptVersionMismatch = thumbnailsPackage.scriptVersionReference !== currentScript.versionNumber;
  const isThumbnailsStale = staleMatrix.thumbnailsStale || isScriptVersionMismatch;
  const isShorts = project.format === '9:16_SHORTS';

  const optionA = thumbnailsPackage.options.find(o => o.id === 'option_a') || thumbnailsPackage.options[0];
  const optionB = thumbnailsPackage.options.find(o => o.id === 'option_b') || thumbnailsPackage.options[1];

  const hasAnyCustomEdits = thumbnailsPackage.options.some(o => o.isCustomEdited);

  // Copy helper with feedback
  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addActivityEvent('EXPORT', `Copied ${label} to clipboard.`, 'info', '06_THUMBNAIL_STUDIO');
    showToast(`${label} copied!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyPromptItem = (prompt: ThumbnailPromptItem) => {
    const text = `${prompt.name}
RATIO: ${prompt.ratio}
HOOK ANGLE: ${prompt.conceptAngle}
RECOMMENDED TEXT OVERLAY: "${prompt.overlayTextSuggestion}"
FOCAL SUBJECT: ${prompt.focalSubject}
LIGHTING & MOOD: ${prompt.lightingAndMood}
COMPOSITION: ${prompt.composition}

DETAILED IMAGE PROMPT:
${prompt.detailedPrompt}

NEGATIVE CONSTRAINTS:
${prompt.negativeConstraints}`;

    handleCopy(text, prompt.id, prompt.name);
  };

  const handleCopyBoth = () => {
    if (!optionA || !optionB) return;
    const combined = `=== ${optionA.name} ===
RATIO: ${optionA.ratio}
CONCEPT ANGLE: ${optionA.conceptAngle}
TEXT OVERLAY: "${optionA.overlayTextSuggestion}"

PROMPT:
${optionA.detailedPrompt}

NEGATIVE: ${optionA.negativeConstraints}

========================================

=== ${optionB.name} ===
RATIO: ${optionB.ratio}
CONCEPT ANGLE: ${optionB.conceptAngle}
TEXT OVERLAY: "${optionB.overlayTextSuggestion}"

PROMPT:
${optionB.detailedPrompt}

NEGATIVE: ${optionB.negativeConstraints}`;

    handleCopy(combined, 'both', 'Both Thumbnail Prompts');
  };

  const handleCopyPrimary = () => {
    const primary = thumbnailsPackage.options.find(o => o.id === thumbnailsPackage.selectedOptionId) || optionA;
    if (primary) {
      handleCopyPromptItem(primary);
    }
  };

  const handleRegenerateAllClick = () => {
    if (!isScriptApproved) {
      showToast('Stage 06 Locked: Explicit script approval in Stage 03 required.');
      return;
    }

    if (hasAnyCustomEdits) {
      setIsRegenerateAllModalOpen(true);
      return;
    }

    generateThumbnailsWithAI();
  };

  return (
    <div className="space-y-6 font-mono">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E293B] gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#00F0FF] mb-1">
            <Image className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-bold tracking-wider">STAGE 06 // THUMBNAIL PROMPT STUDIO</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">SCRIPT v{currentScript.versionNumber}</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            Two Distinct High-CTR Image Prompts
            {thumbnailsPackage.isApproved ? (
              <span className="text-xs px-2 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> APPROVED
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/30 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> DRAFT
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Generates two meaningfully different visual angles: <strong className="text-slate-300">Option A (Macro Object of Enigma)</strong> vs <strong className="text-slate-300">Option B (Observer Discovery Reaction)</strong>. Grounded in approved script beats, continuity bible, and selected visual style.
          </p>
        </div>

        {/* Global Stage Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleCopyBoth}
            className="px-3 py-2 rounded-lg bg-[#0B0F19] hover:bg-[#00F0FF]/15 border border-[#1E293B] hover:border-[#00F0FF]/50 text-xs text-slate-300 hover:text-[#00F0FF] font-semibold flex items-center gap-1.5 transition-colors"
            title="Copy both prompt packages to clipboard"
          >
            {copiedKey === 'both' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>COPY BOTH</span>
          </button>

          <button
            onClick={handleCopyPrimary}
            className="px-3 py-2 rounded-lg bg-[#0B0F19] hover:bg-[#FFE600]/15 border border-[#1E293B] hover:border-[#FFE600]/50 text-xs text-slate-300 hover:text-[#FFE600] font-semibold flex items-center gap-1.5 transition-colors"
            title="Copy primary selected thumbnail prompt"
          >
            <Star className="w-3.5 h-3.5 text-[#FFE600]" />
            <span>COPY PRIMARY</span>
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            className="px-3 py-2 rounded-lg bg-[#0B0F19] hover:bg-slate-800 border border-[#1E293B] text-xs text-slate-400 hover:text-slate-200 transition-colors flex items-center gap-1.5"
            title="Reset prompts to baseline blueprint defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>

          <button
            onClick={handleRegenerateAllClick}
            disabled={isThumbnailsGenerating || !isScriptApproved}
            className={`px-3 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isThumbnailsGenerating
                ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/40 cursor-wait'
                : !isScriptApproved
                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                : 'bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF]'
            }`}
            title="Regenerate both Option A & Option B with AI"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isThumbnailsGenerating ? 'animate-spin' : ''}`} />
            <span>{isThumbnailsGenerating ? 'GENERATING...' : 'REGENERATE BOTH'}</span>
          </button>

          <button
            onClick={navigateToNextStage}
            className="px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)] shrink-0"
          >
            <span>STAGE 07: EXPORT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Approval Gate Barrier (Page 13 Invariant) */}
      {!isScriptApproved ? (
        <div className="p-4 rounded-xl bg-[#FB7185]/10 border border-[#FB7185]/40 text-xs text-slate-200 flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#FB7185] shrink-0 mt-0.5" />
          <div className="space-y-1.5 flex-1">
            <span className="font-bold text-[#FB7185] block text-xs">
              STAGE 06 LOCKED // SCRIPT APPROVAL REQUIRED (PAGE 13 INVARIANT)
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Thumbnail generation and approval are locked until the video script draft is explicitly reviewed and approved in Stage 03. This ensures all thumbnail concepts faithfully reflect approved narrative beats.
            </p>
            <button
              onClick={() => requestStageNavigation('03_SCRIPT_STUDIO')}
              className="mt-1 px-3 py-1.5 rounded-lg bg-[#FB7185]/20 hover:bg-[#FB7185]/30 border border-[#FB7185]/50 text-[#FB7185] font-semibold text-xs flex items-center gap-1.5 transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Go to Stage 03 (Script Studio) to Approve Script</span>
            </button>
          </div>
        </div>
      ) : null}

      {/* 3. Stale Detection Banner (Page 10 & 13 Invariant) */}
      {isThumbnailsStale && isScriptApproved ? (
        <div className="p-4 rounded-xl bg-[#FFE600]/10 border border-[#FFE600]/40 text-xs text-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FFE600] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[#FFE600] block text-xs">
                UPSTREAM SCRIPT MODIFICATION DETECTED (STALE ARTIFACT)
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The active script was updated to v{currentScript.versionNumber}, but thumbnail prompts were generated against v{thumbnailsPackage.scriptVersionReference}. Regenerate prompts with AI or re-approve to synchronize.
              </p>
              {staleMatrix.upstreamReason ? (
                <span className="text-[10px] text-slate-500 block">
                  Trigger: {staleMatrix.upstreamReason}
                </span>
              ) : null}
            </div>
          </div>
          <button
            onClick={generateThumbnailsWithAI}
            disabled={isThumbnailsGenerating}
            className="px-3 py-1.5 rounded-lg bg-[#FFE600] text-black font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 hover:bg-[#FFE600]/90"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isThumbnailsGenerating ? 'animate-spin' : ''}`} />
            <span>Synchronize Now</span>
          </button>
        </div>
      ) : null}

      {/* 4. Approval Control Status Bar */}
      {isScriptApproved ? (
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
          thumbnailsPackage.isApproved 
            ? 'bg-[#10B981]/10 border-[#10B981]/40 text-slate-200' 
            : 'bg-[#0B0F19] border-[#1E293B] text-slate-300'
        }`}>
          <div className="flex items-center gap-3">
            {thumbnailsPackage.isApproved ? (
              <ShieldCheck className="w-5 h-5 text-[#10B981] shrink-0" />
            ) : (
              <Edit3 className="w-5 h-5 text-[#FFE600] shrink-0" />
            )}
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>
                  {thumbnailsPackage.isApproved 
                    ? 'THUMBNAIL PROMPT PACKAGE APPROVED FOR PRODUCTION' 
                    : 'INSPECTION REQUIRED: REVIEW & APPROVE THUMBNAILS'}
                </span>
                <span className="text-[10px] font-normal text-slate-400">
                  (Primary: {thumbnailsPackage.selectedOptionId === 'option_a' ? 'Option A' : 'Option B'})
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {thumbnailsPackage.isApproved 
                  ? `Package marked production-ready on ${new Date(thumbnailsPackage.approvedAt || thumbnailsPackage.updatedAt).toLocaleTimeString()}. Stage 07 export unlocked.`
                  : 'Select your preferred export thumbnail, refine prompts or text overlays, then approve to finalize.'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {thumbnailsPackage.isApproved ? (
              <button
                onClick={unlockThumbnailsForEdits}
                className="px-3 py-1.5 rounded-lg bg-[#030712] hover:bg-slate-800 border border-[#1E293B] hover:border-slate-700 text-xs text-slate-300 font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Undo2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Unlock for Editing</span>
              </button>
            ) : (
              <button
                onClick={approveThumbnails}
                className="px-4 py-2 rounded-lg bg-[#10B981] hover:bg-[#10B981]/90 text-black font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(16,185,129,0.3)]"
              >
                <Check className="w-4 h-4" />
                <span>APPROVE THUMBNAIL PACKAGE</span>
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* 5. View Switcher Tabs (Desktop Dual Grid vs Focused View) */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 p-1 bg-[#0B0F19] border border-[#1E293B] rounded-lg">
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
              activeTab === 'both' 
                ? 'bg-[#1E293B] text-white shadow-sm' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SIDE-BY-SIDE VIEW
          </button>
          <button
            onClick={() => setActiveTab('option_a')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'option_a' 
                ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>OPTION A ONLY</span>
            {thumbnailsPackage.selectedOptionId === 'option_a' && <Star className="w-3 h-3 text-[#FFE600] fill-[#FFE600]" />}
          </button>
          <button
            onClick={() => setActiveTab('option_b')}
            className={`px-3 py-1 rounded text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'option_b' 
                ? 'bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/30' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>OPTION B ONLY</span>
            {thumbnailsPackage.selectedOptionId === 'option_b' && <Star className="w-3 h-3 text-[#FFE600] fill-[#FFE600]" />}
          </button>
        </div>

        {/* Selected Primary Badge */}
        <div className="text-xs text-slate-400 flex items-center gap-2">
          <span className="text-slate-500">Primary Export:</span>
          <span className="font-bold text-white px-2 py-0.5 rounded bg-[#1E293B] border border-slate-700">
            {thumbnailsPackage.selectedOptionId === 'option_a' ? 'Option A (Enigma Focus)' : 'Option B (Observer Reaction)'}
          </span>
        </div>
      </div>

      {/* 6. Dual Studio Cards Grid */}
      <div className={`grid gap-6 ${activeTab === 'both' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
        
        {/* ========================================================
            CARD A: OPTION A // OBJECT OF ENIGMA (Macro Focus)
           ======================================================== */}
        {(activeTab === 'both' || activeTab === 'option_a') && optionA && (
          <div className={`p-5 rounded-xl bg-[#0B0F19] border transition-all space-y-5 ${
            thumbnailsPackage.selectedOptionId === 'option_a' 
              ? 'border-[#00F0FF]/60 shadow-[0_0_20px_rgba(0,240,255,0.1)]' 
              : 'border-[#1E293B] hover:border-[#334155]'
          }`}>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold tracking-wider">
                  OPTION A
                </span>
                <span className="font-bold text-white text-xs tracking-wide">
                  OBJECT OF ENIGMA // MACRO FOCUS
                </span>
                {optionA.isCustomEdited && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                    EDITED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {thumbnailsPackage.selectedOptionId === 'option_a' ? (
                  <span className="px-2 py-0.5 rounded bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/40 text-[10px] font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#FFE600]" /> PRIMARY
                  </span>
                ) : (
                  <button
                    onClick={() => selectPrimaryThumbnail('option_a')}
                    className="px-2 py-0.5 rounded bg-[#030712] hover:bg-[#FFE600]/15 text-slate-400 hover:text-[#FFE600] border border-[#1E293B] hover:border-[#FFE600]/40 text-[10px] font-semibold transition-colors flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" /> SET PRIMARY
                  </button>
                )}

                <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E293B]">
                  {optionA.ratio}
                </span>
              </div>
            </div>

            {/* Visual Preview Frame */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span className="text-[#00F0FF] font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Visual Mock & Overlay Preview
                </span>
                <span className="text-slate-500">
                  {isShorts ? '9:16 Portrait Canvas' : '16:9 Landscape Canvas'}
                </span>
              </div>

              {/* Preview Container with Overlay Simulation */}
              <div className={`relative rounded-lg overflow-hidden border border-[#1E293B] bg-[#030712] group flex items-center justify-center ${
                isShorts ? 'aspect-[9/16] max-h-80 mx-auto w-48' : 'aspect-video w-full'
              }`}>
                {optionA.previewImageUrl ? (
                  <img 
                    src={optionA.previewImageUrl} 
                    alt="Option A Thumbnail Preview"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="text-slate-600 text-xs flex flex-col items-center gap-2">
                    <Image className="w-8 h-8 opacity-40" />
                    <span>No preview image loaded</span>
                  </div>
                )}

                {/* Cyberpunk Scanline & Grid Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* High-CTR Simulated Overlay Text Badge */}
                <div className="absolute bottom-4 left-3 right-3 text-center pointer-events-none">
                  <span className="inline-block px-3 py-1 rounded bg-black/85 backdrop-blur-md border border-[#00F0FF]/60 text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_15px_rgba(0,240,255,0.4)]">
                    {optionA.overlayTextSuggestion || 'SIGNAL DETECTED'}
                  </span>
                </div>

                {/* Top Corner Overlay Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] text-[#00F0FF] font-mono border border-[#00F0FF]/30 font-bold">
                    {isShorts ? '9:16 SHORTS' : '16:9 YOUTUBE'}
                  </span>
                </div>

                {/* Zoom Action */}
                {optionA.previewImageUrl && (
                  <button
                    onClick={() => setZoomImage({
                      url: optionA.previewImageUrl!,
                      title: optionA.name,
                      overlay: optionA.overlayTextSuggestion
                    })}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 border border-slate-700"
                    title="Zoom preview image"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Experimental Image Rendering (Paid Model) */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => renderThumbnailImageWithAI('option_a')}
                  disabled={isImageRendering === 'option_a'}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
                    isImageRendering === 'option_a'
                      ? 'bg-[#00F0FF]/15 border-[#00F0FF]/40 text-[#00F0FF] cursor-wait'
                      : 'bg-[#030712] hover:bg-[#00F0FF]/10 border-[#1E293B] hover:border-[#00F0FF]/40 text-slate-300 hover:text-[#00F0FF]'
                  }`}
                  title="Experimental image render using gemini-3.1-flash-lite-image (Requires active paid quota). Primary workflow is copying detailed prompt below."
                >
                  <Sparkles className={`w-3.5 h-3.5 text-[#00F0FF] ${isImageRendering === 'option_a' ? 'animate-spin' : ''}`} />
                  <span>{isImageRendering === 'option_a' ? 'Rendering with Gemini...' : 'Render Image Preview (Paid Model)'}</span>
                </button>

                <span className="text-[10px] text-slate-500 font-mono">
                  {optionA.previewImageUrl?.startsWith('data:') ? 'Live AI Render' : 'Blueprint Visual Reference'}
                </span>
              </div>
            </div>

            {/* Visual Hook Concept Angle */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                Narrative Hook & Concept Angle:
              </label>
              <input
                type="text"
                value={optionA.conceptAngle}
                onChange={(e) => updateThumbnailOption('option_a', { conceptAngle: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-[#030712] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-[#00F0FF] transition-colors"
                placeholder="Core visual hook angle..."
              />
            </div>

            {/* Focal Subject & Lighting Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Focal Subject:
                </label>
                <input
                  type="text"
                  value={optionA.focalSubject}
                  onChange={(e) => updateThumbnailOption('option_a', { focalSubject: e.target.value })}
                  className="w-full p-2 rounded bg-[#030712] border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Lighting & Palette (Continuity):
                </label>
                <input
                  type="text"
                  value={optionA.lightingAndMood}
                  onChange={(e) => updateThumbnailOption('option_a', { lightingAndMood: e.target.value })}
                  className="w-full p-2 rounded bg-[#030712] border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
            </div>

            {/* Composition & Framing */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Camera Angle & Composition:
              </label>
              <input
                type="text"
                value={optionA.composition}
                onChange={(e) => updateThumbnailOption('option_a', { composition: e.target.value })}
                className="w-full p-2 rounded bg-[#030712] border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-[#00F0FF]"
              />
            </div>

            {/* Detailed Image Generation Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span className="text-[#00F0FF] font-bold">Detailed Image Prompt (Midjourney / DALL-E / Imagen / SD):</span>
                <span className="text-slate-500 font-mono">
                  {optionA.detailedPrompt.length} chars | {optionA.detailedPrompt.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                value={optionA.detailedPrompt}
                onChange={(e) => updateThumbnailOption('option_a', { detailedPrompt: e.target.value })}
                rows={5}
                className="w-full p-3 rounded-lg bg-[#030712] border border-[#1E293B] text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-[#00F0FF] transition-colors resize-y font-mono"
              />
            </div>

            {/* Suggested Text Overlay & Negative Constraints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1">
                <label className="text-[10px] text-[#FFE600] font-bold uppercase block">
                  Suggested Overlay Text (2-4 words):
                </label>
                <input
                  type="text"
                  value={optionA.overlayTextSuggestion}
                  onChange={(e) => updateThumbnailOption('option_a', { overlayTextSuggestion: e.target.value })}
                  className="w-full p-1.5 rounded bg-black border border-[#1E293B] text-white font-extrabold text-sm tracking-wider uppercase focus:outline-none focus:border-[#FFE600]"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Negative Constraints:
                </label>
                <input
                  type="text"
                  value={optionA.negativeConstraints}
                  onChange={(e) => updateThumbnailOption('option_a', { negativeConstraints: e.target.value })}
                  className="w-full p-1.5 rounded bg-black border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Card Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => regenerateSingleThumbnailOptionWithAI('option_a')}
                disabled={isSingleThumbnailRegenerating === 'option_a' || isThumbnailsGenerating}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSingleThumbnailRegenerating === 'option_a'
                    ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40 cursor-wait'
                    : 'bg-[#030712] hover:bg-[#00F0FF]/15 border-[#1E293B] hover:border-[#00F0FF]/40 text-slate-300 hover:text-[#00F0FF]'
                }`}
                title="Regenerate Option A prompt in isolation"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSingleThumbnailRegenerating === 'option_a' ? 'animate-spin' : ''}`} />
                <span>{isSingleThumbnailRegenerating === 'option_a' ? 'Regenerating...' : 'Regen Option A (AI)'}</span>
              </button>

              <button
                onClick={() => handleCopyPromptItem(optionA)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copiedKey === optionA.id 
                    ? 'bg-[#10B981] text-black font-bold' 
                    : 'bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF]'
                }`}
              >
                {copiedKey === optionA.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === optionA.id ? 'COPIED' : 'COPY PROMPT A'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================
            CARD B: OPTION B // HUMAN OBSERVER REACTION (Observer Scale)
           ======================================================== */}
        {(activeTab === 'both' || activeTab === 'option_b') && optionB && (
          <div className={`p-5 rounded-xl bg-[#0B0F19] border transition-all space-y-5 ${
            thumbnailsPackage.selectedOptionId === 'option_b' 
              ? 'border-[#FFE600]/60 shadow-[0_0_20px_rgba(255,230,0,0.1)]' 
              : 'border-[#1E293B] hover:border-[#334155]'
          }`}>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-[#FFE600]/15 border border-[#FFE600]/40 text-[#FFE600] text-xs font-bold tracking-wider">
                  OPTION B
                </span>
                <span className="font-bold text-white text-xs tracking-wide">
                  OBSERVER REACTION // HUMAN SCALE
                </span>
                {optionB.isCustomEdited && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
                    EDITED
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {thumbnailsPackage.selectedOptionId === 'option_b' ? (
                  <span className="px-2 py-0.5 rounded bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/40 text-[10px] font-bold flex items-center gap-1">
                    <Star className="w-3 h-3 fill-[#FFE600]" /> PRIMARY
                  </span>
                ) : (
                  <button
                    onClick={() => selectPrimaryThumbnail('option_b')}
                    className="px-2 py-0.5 rounded bg-[#030712] hover:bg-[#FFE600]/15 text-slate-400 hover:text-[#FFE600] border border-[#1E293B] hover:border-[#FFE600]/40 text-[10px] font-semibold transition-colors flex items-center gap-1"
                  >
                    <Star className="w-3 h-3" /> SET PRIMARY
                  </button>
                )}

                <span className="text-[10px] font-mono text-slate-500 uppercase px-1.5 py-0.5 rounded bg-[#030712] border border-[#1E293B]">
                  {optionB.ratio}
                </span>
              </div>
            </div>

            {/* Visual Preview Frame */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span className="text-[#FFE600] font-bold flex items-center gap-1">
                  <Eye className="w-3 h-3" /> Visual Mock & Overlay Preview
                </span>
                <span className="text-slate-500">
                  {isShorts ? '9:16 Portrait Canvas' : '16:9 Landscape Canvas'}
                </span>
              </div>

              {/* Preview Container with Overlay Simulation */}
              <div className={`relative rounded-lg overflow-hidden border border-[#1E293B] bg-[#030712] group flex items-center justify-center ${
                isShorts ? 'aspect-[9/16] max-h-80 mx-auto w-48' : 'aspect-video w-full'
              }`}>
                {optionB.previewImageUrl ? (
                  <img 
                    src={optionB.previewImageUrl} 
                    alt="Option B Thumbnail Preview"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="text-slate-600 text-xs flex flex-col items-center gap-2">
                    <Image className="w-8 h-8 opacity-40" />
                    <span>No preview image loaded</span>
                  </div>
                )}

                {/* Cyberpunk Scanline & Grid Effect */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

                {/* High-CTR Simulated Overlay Text Badge */}
                <div className="absolute bottom-4 left-3 right-3 text-center pointer-events-none">
                  <span className="inline-block px-3 py-1 rounded bg-black/85 backdrop-blur-md border border-[#FFE600]/60 text-white font-extrabold text-xs sm:text-sm tracking-wider uppercase shadow-[0_0_15px_rgba(255,230,0,0.4)]">
                    {optionB.overlayTextSuggestion || 'IT IS NOT RANDOM'}
                  </span>
                </div>

                {/* Top Corner Overlay Badges */}
                <div className="absolute top-2 left-2 flex items-center gap-1">
                  <span className="px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-sm text-[9px] text-[#FFE600] font-mono border border-[#FFE600]/30 font-bold">
                    {isShorts ? '9:16 SHORTS' : '16:9 YOUTUBE'}
                  </span>
                </div>

                {/* Zoom Action */}
                {optionB.previewImageUrl && (
                  <button
                    onClick={() => setZoomImage({
                      url: optionB.previewImageUrl!,
                      title: optionB.name,
                      overlay: optionB.overlayTextSuggestion
                    })}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white transition-opacity opacity-0 group-hover:opacity-100 border border-slate-700"
                    title="Zoom preview image"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Experimental Image Rendering (Paid Model) */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => renderThumbnailImageWithAI('option_b')}
                  disabled={isImageRendering === 'option_b'}
                  className={`text-[11px] px-3 py-1.5 rounded-lg border font-semibold flex items-center gap-1.5 transition-all ${
                    isImageRendering === 'option_b'
                      ? 'bg-[#FFE600]/15 border-[#FFE600]/40 text-[#FFE600] cursor-wait'
                      : 'bg-[#030712] hover:bg-[#FFE600]/10 border-[#1E293B] hover:border-[#FFE600]/40 text-slate-300 hover:text-[#FFE600]'
                  }`}
                  title="Experimental image render using gemini-3.1-flash-lite-image (Requires active paid quota). Primary workflow is copying detailed prompt below."
                >
                  <Sparkles className={`w-3.5 h-3.5 text-[#FFE600] ${isImageRendering === 'option_b' ? 'animate-spin' : ''}`} />
                  <span>{isImageRendering === 'option_b' ? 'Rendering with Gemini...' : 'Render Image Preview (Paid Model)'}</span>
                </button>

                <span className="text-[10px] text-slate-500 font-mono">
                  {optionB.previewImageUrl?.startsWith('data:') ? 'Live AI Render' : 'Blueprint Visual Reference'}
                </span>
              </div>
            </div>

            {/* Visual Hook Concept Angle */}
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">
                Narrative Hook & Concept Angle:
              </label>
              <input
                type="text"
                value={optionB.conceptAngle}
                onChange={(e) => updateThumbnailOption('option_b', { conceptAngle: e.target.value })}
                className="w-full p-2.5 rounded-lg bg-[#030712] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-[#FFE600] transition-colors"
                placeholder="Core visual hook angle..."
              />
            </div>

            {/* Focal Subject & Lighting Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Focal Subject:
                </label>
                <input
                  type="text"
                  value={optionB.focalSubject}
                  onChange={(e) => updateThumbnailOption('option_b', { focalSubject: e.target.value })}
                  className="w-full p-2 rounded bg-[#030712] border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-[#FFE600]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider block">
                  Lighting & Atmosphere:
                </label>
                <input
                  type="text"
                  value={optionB.lightingAndMood}
                  onChange={(e) => updateThumbnailOption('option_b', { lightingAndMood: e.target.value })}
                  className="w-full p-2 rounded bg-[#030712] border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-[#FFE600]"
                />
              </div>
            </div>

            {/* Composition & Framing */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider block">
                Camera Angle & Composition:
              </label>
              <input
                type="text"
                value={optionB.composition}
                onChange={(e) => updateThumbnailOption('option_b', { composition: e.target.value })}
                className="w-full p-2 rounded bg-[#030712] border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-[#FFE600]"
              />
            </div>

            {/* Detailed Image Generation Prompt */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider">
                <span className="text-[#FFE600] font-bold">Detailed Image Prompt (Midjourney / DALL-E / Imagen / SD):</span>
                <span className="text-slate-500 font-mono">
                  {optionB.detailedPrompt.length} chars | {optionB.detailedPrompt.trim().split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
              <textarea
                value={optionB.detailedPrompt}
                onChange={(e) => updateThumbnailOption('option_b', { detailedPrompt: e.target.value })}
                rows={5}
                className="w-full p-3 rounded-lg bg-[#030712] border border-[#1E293B] text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-[#FFE600] transition-colors resize-y font-mono"
              />
            </div>

            {/* Suggested Text Overlay & Negative Constraints */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1">
                <label className="text-[10px] text-[#FFE600] font-bold uppercase block">
                  Suggested Overlay Text (2-4 words):
                </label>
                <input
                  type="text"
                  value={optionB.overlayTextSuggestion}
                  onChange={(e) => updateThumbnailOption('option_b', { overlayTextSuggestion: e.target.value })}
                  className="w-full p-1.5 rounded bg-black border border-[#1E293B] text-white font-extrabold text-sm tracking-wider uppercase focus:outline-none focus:border-[#FFE600]"
                />
              </div>

              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1">
                <label className="text-[10px] text-slate-400 font-bold uppercase block">
                  Negative Constraints:
                </label>
                <input
                  type="text"
                  value={optionB.negativeConstraints}
                  onChange={(e) => updateThumbnailOption('option_b', { negativeConstraints: e.target.value })}
                  className="w-full p-1.5 rounded bg-black border border-[#1E293B] text-slate-300 text-xs focus:outline-none focus:border-slate-500"
                />
              </div>
            </div>

            {/* Card Action Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#1E293B]">
              <button
                onClick={() => regenerateSingleThumbnailOptionWithAI('option_b')}
                disabled={isSingleThumbnailRegenerating === 'option_b' || isThumbnailsGenerating}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  isSingleThumbnailRegenerating === 'option_b'
                    ? 'bg-[#FFE600]/15 text-[#FFE600] border-[#FFE600]/40 cursor-wait'
                    : 'bg-[#030712] hover:bg-[#FFE600]/15 border-[#1E293B] hover:border-[#FFE600]/40 text-slate-300 hover:text-[#FFE600]'
                }`}
                title="Regenerate Option B prompt in isolation"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSingleThumbnailRegenerating === 'option_b' ? 'animate-spin' : ''}`} />
                <span>{isSingleThumbnailRegenerating === 'option_b' ? 'Regenerating...' : 'Regen Option B (AI)'}</span>
              </button>

              <button
                onClick={() => handleCopyPromptItem(optionB)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  copiedKey === optionB.id 
                    ? 'bg-[#10B981] text-black font-bold' 
                    : 'bg-[#FFE600]/15 hover:bg-[#FFE600]/25 border border-[#FFE600]/40 text-[#FFE600]'
                }`}
              >
                {copiedKey === optionB.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedKey === optionB.id ? 'COPIED' : 'COPY PROMPT B'}</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 7. Modal: Full-screen Image Zoom Modal */}
      {zoomImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setZoomImage(null)}
              className="absolute -top-10 right-0 px-3 py-1 rounded bg-[#1E293B] hover:bg-slate-700 text-white text-xs font-bold"
            >
              CLOSE [ESC]
            </button>
            <div className="relative rounded-xl overflow-hidden border border-[#1E293B] bg-black">
              <img 
                src={zoomImage.url} 
                alt={zoomImage.title} 
                className="max-h-[75vh] w-auto object-contain"
              />
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <span className="px-4 py-1.5 rounded bg-black/80 backdrop-blur-md border border-[#00F0FF]/60 text-white font-extrabold text-sm sm:text-base tracking-wider uppercase">
                  {zoomImage.overlay}
                </span>
              </div>
            </div>
            <div className="text-xs text-slate-400 mt-2 font-mono">
              {zoomImage.title}
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal: Reset to Defaults Confirmation */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-[#1E293B] rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#FB7185] font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Reset Thumbnail Studio to Baseline?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will discard any manual edits or regenerated prompts and restore Option A and Option B to their default blueprint configurations.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#030712] border border-[#1E293B] text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetThumbnailsToDefault();
                  setIsResetModalOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#FB7185] hover:bg-[#FB7185]/90 text-white text-xs font-bold"
              >
                Reset to Baseline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. Modal: Overwrite Custom Edits on Regenerate All */}
      {isRegenerateAllModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-[#FFE600]/40 rounded-xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-[#FFE600] font-bold text-sm">
              <AlertTriangle className="w-5 h-5" />
              <span>Overwrite Manual Prompt Edits?</span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              You have made custom modifications to thumbnail fields. Regenerating both options with AI will replace your edits with freshly generated prompt packages.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsRegenerateAllModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#030712] border border-[#1E293B] text-xs text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setIsRegenerateAllModalOpen(false);
                  generateThumbnailsWithAI();
                }}
                className="px-4 py-1.5 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black text-xs font-bold"
              >
                Proceed & Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
