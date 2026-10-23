import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  Search, 
  Copy, 
  Check, 
  RotateCcw, 
  ArrowRight, 
  Tags, 
  FileText, 
  ListOrdered,
  Sparkles,
  Lock,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  Edit3,
  Plus,
  Trash2,
  Hash,
  ShieldCheck,
  Undo2
} from 'lucide-react';

export const SeoPackageWorkspace: React.FC = () => {
  const { 
    project, 
    selectedStory,
    currentScript,
    isScriptApproved,
    seoPackage,
    isSeoGenerating,
    generateSeoWithAI,
    updateSeoPackage,
    resetSeoToDefault,
    navigateToNextStage, 
    requestStageNavigation,
    addActivityEvent, 
    staleMatrix,
    showToast 
  } = useWorkflow();

  // Local UI State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [newTagInput, setNewTagInput] = useState<string>('');
  const [newHashtagInput, setNewHashtagInput] = useState<string>('');
  const [newTitleInput, setNewTitleInput] = useState<string>('');
  const [newChapterTime, setNewChapterTime] = useState<string>('00:00');
  const [newChapterTitle, setNewChapterTitle] = useState<string>('');

  // Modals State
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState<boolean>(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState<boolean>(false);

  const isScriptVersionMismatch = seoPackage.scriptVersionReference !== currentScript.versionNumber;
  const isSeoStale = staleMatrix.seoStale || isScriptVersionMismatch;
  const isShorts = project.format === '9:16_SHORTS';
  const totalTagsLength = seoPackage.tags.join(', ').length;

  // Derive chapter timestamps from script beats
  const handleRecalculateChapters = () => {
    if (!currentScript.scenes || currentScript.scenes.length === 0) {
      showToast('No script scenes found to derive chapters from.');
      return;
    }
    const sceneCount = currentScript.scenes.length;
    const isShortsFormat = project.format === '9:16_SHORTS';
    const totalDurationSec = isShortsFormat ? project.shortsDuration : project.longFormDurationMinutes * 60;
    const intervalSec = isShortsFormat ? 8 : Math.max(1, Math.round(totalDurationSec / sceneCount));

    const derived = currentScript.scenes.map((s, idx) => {
      const totalSec = idx * intervalSec;
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      const timestamp = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      const chapterTitle = s.purpose 
        ? s.purpose.replace(/^beat\s*\d+:\s*/i, '').trim() 
        : `Scene 0${s.sceneNumber}`;
      return {
        timestamp,
        title: chapterTitle.charAt(0).toUpperCase() + chapterTitle.slice(1),
      };
    });
    updateSeoPackage({ chapters: derived });
    addActivityEvent('CONFIG', `Chapter timestamps re-derived from script scene boundaries (${isShortsFormat ? '8s Shorts interval' : `${intervalSec}s Long-form interval`}).`, 'info', '05_SEO_PACKAGE');
    showToast('Chapter timestamps derived from script beats!');
  };

  // Copy helper with feedback
  const handleCopy = (text: string, key: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    addActivityEvent('EXPORT', `Copied SEO ${label} to clipboard.`, 'info', '05_SEO_PACKAGE');
    showToast(`${label} copied!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCopyFullPackage = () => {
    const chaptersText = seoPackage.chapters && seoPackage.chapters.length > 0
      ? `\n\nCHAPTER TIMESTAMPS:\n${seoPackage.chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n')}`
      : '';

    const hashtagsText = seoPackage.hashtags && seoPackage.hashtags.length > 0
      ? `\n\nHASHTAGS:\n${seoPackage.hashtags.join(' ')}`
      : '';

    const fullPackage = `TITLES:
${seoPackage.titleOptions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

SELECTED TITLE:
${seoPackage.selectedTitle}

DESCRIPTION:
${seoPackage.description}

TAGS:
${seoPackage.tags.join(', ')}${hashtagsText}${chaptersText}`;

    handleCopy(fullPackage, 'full_package', 'Complete SEO Package');
  };

  const handleRegenerateWithWarning = () => {
    if (!isScriptApproved) {
      showToast('Explicit script approval in Stage 03 is required before generating SEO metadata.');
      return;
    }

    if (seoPackage.isCustomEdited) {
      setIsOverwriteModalOpen(true);
      return;
    }

    generateSeoWithAI();
  };

  // Title management
  const handleSelectTitle = (title: string) => {
    updateSeoPackage({ selectedTitle: title });
    showToast('Active title updated.');
  };

  const handleUpdateTitleOption = (index: number, newText: string) => {
    const updated = [...seoPackage.titleOptions];
    const oldTitle = updated[index];
    updated[index] = newText;
    const isUpdatingSelected = seoPackage.selectedTitle === oldTitle;
    updateSeoPackage({ 
      titleOptions: updated,
      selectedTitle: isUpdatingSelected ? newText : seoPackage.selectedTitle,
    });
  };

  const handleAddTitleOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitleInput.trim()) return;
    const titleText = newTitleInput.trim();
    if (!seoPackage.titleOptions.includes(titleText)) {
      updateSeoPackage({
        titleOptions: [...seoPackage.titleOptions, titleText],
      });
      setNewTitleInput('');
      showToast('New title variant added.');
    }
  };

  const handleDeleteTitleOption = (index: number) => {
    if (seoPackage.titleOptions.length <= 1) {
      showToast('At least one title option is required.');
      return;
    }
    const targetTitle = seoPackage.titleOptions[index];
    const updated = seoPackage.titleOptions.filter((_, i) => i !== index);
    const newSelected = seoPackage.selectedTitle === targetTitle ? updated[0] : seoPackage.selectedTitle;
    updateSeoPackage({
      titleOptions: updated,
      selectedTitle: newSelected,
    });
    showToast('Title variant removed.');
  };

  // Tag management
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTagInput.trim().replace(/^#/, '');
    if (clean && !seoPackage.tags.includes(clean)) {
      updateSeoPackage({ tags: [...seoPackage.tags, clean] });
      setNewTagInput('');
      showToast('Tag added.');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateSeoPackage({ tags: seoPackage.tags.filter(t => t !== tagToRemove) });
  };

  // Hashtag management
  const handleAddHashtag = (e: React.FormEvent) => {
    e.preventDefault();
    let clean = newHashtagInput.trim();
    if (!clean) return;
    if (!clean.startsWith('#')) clean = `#${clean}`;
    if (!seoPackage.hashtags.includes(clean)) {
      updateSeoPackage({ hashtags: [...seoPackage.hashtags, clean] });
      setNewHashtagInput('');
      showToast('Hashtag added.');
    }
  };

  const handleRemoveHashtag = (hashToRemove: string) => {
    updateSeoPackage({ hashtags: seoPackage.hashtags.filter(h => h !== hashToRemove) });
  };

  // Chapter management
  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterTime.trim() || !newChapterTitle.trim()) return;
    updateSeoPackage({
      chapters: [
        ...seoPackage.chapters,
        { timestamp: newChapterTime.trim(), title: newChapterTitle.trim() },
      ],
    });
    setNewChapterTitle('');
    showToast('Chapter marker added.');
  };

  const handleRemoveChapter = (index: number) => {
    updateSeoPackage({
      chapters: seoPackage.chapters.filter((_, i) => i !== index),
    });
  };

  const handleUpdateChapter = (index: number, timestamp: string, title: string) => {
    const updated = [...seoPackage.chapters];
    updated[index] = { timestamp, title };
    updateSeoPackage({ chapters: updated });
  };

  // SCRIPT APPROVAL LOCK GATE
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
              STAGE 05 LOCKED: EXPLICIT SCRIPT APPROVAL REQUIRED
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
              Per the ILLUMATRIX Master Blueprint specification, Stage 05 (SEO & Metadata Packaging) requires an approved script from Stage 03 to ensure all titles, descriptions, and keywords are strictly grounded in verified script facts.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <button
              onClick={() => requestStageNavigation('03_SCRIPT_STUDIO')}
              className="px-5 py-2.5 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)]"
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
      {/* 1. Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-[#1E293B] gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#00F0FF] mb-1">
            <Search className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-bold tracking-wider">STAGE 05 // METADATA & SEO PACKAGE</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Title Variants, High-Retention Descriptions & Tags
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Optimized for audience discovery and search ranking without clickbait deceit, false promises, or fabricated facts. Grounded strictly in approved script beats.
          </p>

          {/* Traceability Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px]">
            <span className="px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1 font-semibold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Approved Script v{currentScript.versionNumber}</span>
            </span>

            <span className="px-2.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300">
              Source: <strong className="text-white">{selectedStory?.title || 'Ground-Truth'} (v{selectedStory?.version || 1})</strong>
            </span>

            <span className="px-2.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300">
              Format: <strong className="text-white">{isShorts ? '9:16 Shorts' : '16:9 Long-Form'}</strong>
            </span>

            <span className="px-2.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300">
              Language: <strong className="text-[#FFE600]">{project.language === 'hi' ? 'Hindi (हिंदी)' : 'English'}</strong>
            </span>

            <span className="px-2.5 py-0.5 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-300">
              Mode: <strong className="text-white">{project.modeId}</strong>
            </span>

            {seoPackage.isCustomEdited ? (
              <span className="px-2.5 py-0.5 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/30 text-[#00F0FF] font-bold flex items-center gap-1">
                <Edit3 className="w-3 h-3" />
                <span>MANUALLY EDITED</span>
              </span>
            ) : null}

            {isSeoStale ? (
              <span className="px-2.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                <span>STALE SEO</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF] font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>FRESH & SYNCHRONIZED</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={handleRegenerateWithWarning}
            disabled={isSeoGenerating}
            className={`px-3 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all ${
              isSeoStale
                ? 'bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                : 'bg-[#0B0F19] hover:bg-slate-900 border border-[#1E293B] hover:border-[#00F0FF]/50 text-slate-200'
            }`}
            title="Generate fresh SEO package using AI proxy grounded in approved script"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeoGenerating ? 'animate-spin text-black' : ''}`} />
            <span>{isSeoGenerating ? 'GENERATING SEO...' : isSeoStale ? 'SYNCHRONIZE SEO' : 'REGENERATE SEO WITH AI'}</span>
          </button>

          <button
            onClick={() => setIsResetModalOpen(true)}
            disabled={isSeoGenerating}
            className="px-3 py-2 rounded-lg bg-[#0B0F19] hover:bg-slate-900 border border-[#1E293B] hover:border-slate-700 text-slate-400 hover:text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
            title="Restore baseline SEO package"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESET</span>
          </button>

          <button
            onClick={handleCopyFullPackage}
            className={`px-3 py-2 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
              copiedKey === 'full_package'
                ? 'bg-emerald-500 text-black font-bold'
                : 'bg-[#0B0F19] hover:bg-[#00F0FF]/15 border border-[#1E293B] hover:border-[#00F0FF]/50 text-slate-300 hover:text-[#00F0FF]'
            }`}
            title="Copy complete SEO package to clipboard"
          >
            {copiedKey === 'full_package' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedKey === 'full_package' ? 'PACKAGE COPIED!' : 'COPY FULL SEO'}</span>
          </button>

          <button
            onClick={navigateToNextStage}
            className="px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)] shrink-0"
          >
            <span>STAGE 06: THUMBNAILS</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Stale Alert Banner */}
      {isSeoStale ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-amber-300 uppercase tracking-wide">
                STALE SEO METADATA DETECTED
              </div>
              <p className="text-slate-300 mt-0.5 leading-relaxed">
                {staleMatrix.upstreamReason || 'Script beats or source story modified since SEO metadata was generated.'}
                {isScriptVersionMismatch && (
                  <span className="block text-amber-200 mt-1 font-semibold">
                    Current Script is v{currentScript.versionNumber}, but SEO package references v{seoPackage.scriptVersionReference}. Synchronize to align titles and descriptions.
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={handleRegenerateWithWarning}
            disabled={isSeoGenerating}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs shrink-0 flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeoGenerating ? 'animate-spin' : ''}`} />
            <span>SYNCHRONIZE NOW</span>
          </button>
        </div>
      ) : null}

      {/* 3. Primary Workspace Grid (Two Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* ========================================================= */}
        {/* LEFT COLUMN: TITLE ALTERNATIVES & VIDEO DESCRIPTION       */}
        {/* ========================================================= */}
        <div className="space-y-6">
          
          {/* Title Alternatives Card */}
          <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00F0FF]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  TITLE ALTERNATIVES ({seoPackage.titleOptions.length})
                </span>
              </div>
              <span className="text-[10px] text-slate-500">
                Click to set active title for export
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Curated high-curiosity titles grounded in script beats. Selected title will be used in the production package export.
            </p>

            {/* List of Titles */}
            <div className="space-y-2.5">
              {seoPackage.titleOptions.map((title, index) => {
                const isSelected = title === seoPackage.selectedTitle;
                const charLen = title.length;
                const isOptimalLen = charLen >= 40 && charLen <= 70;

                return (
                  <div
                    key={index}
                    onClick={() => handleSelectTitle(title)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.12)]'
                        : 'bg-[#030712] border-[#1E293B] hover:border-[#334155]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 text-[10px] ${
                          isSelected ? 'border-[#00F0FF] bg-[#00F0FF] text-black font-bold' : 'border-slate-600 text-slate-500'
                        }`}>
                          {isSelected ? '✓' : index + 1}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {isSelected ? 'ACTIVE TITLE FOR EXPORT' : `OPTION 0${index + 1}`}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                          isOptimalLen 
                            ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
                            : 'text-slate-400 border-slate-800 bg-slate-900'
                        }`} title="Optimal YouTube title length is 40–70 characters">
                          {charLen} chars
                        </span>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopy(title, `title_${index}`, `Title #${index + 1}`);
                          }}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-[#00F0FF] transition-colors"
                          title="Copy this title"
                        >
                          {copiedKey === `title_${index}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>

                        {seoPackage.titleOptions.length > 1 ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTitleOption(index);
                            }}
                            className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-rose-400 transition-colors"
                            title="Remove this title"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <input
                      type="text"
                      value={title}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleUpdateTitleOption(index, e.target.value)}
                      className="w-full bg-[#0B0F19] border border-[#1E293B] focus:border-[#00F0FF] rounded p-2 text-white text-xs font-mono focus:outline-none transition-colors"
                    />
                  </div>
                );
              })}
            </div>

            {/* Add Title Form */}
            <form onSubmit={handleAddTitleOption} className="flex gap-2 pt-2 border-t border-[#1E293B]">
              <input
                type="text"
                value={newTitleInput}
                onChange={(e) => setNewTitleInput(e.target.value)}
                placeholder="Add custom title alternative..."
                className="flex-1 px-3 py-2 rounded-lg bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF] font-mono"
              />
              <button
                type="submit"
                disabled={!newTitleInput.trim()}
                className="px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 text-xs text-slate-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Video Description Card */}
          <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#FFE600]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  HIGH-RETENTION VIDEO DESCRIPTION
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 font-mono">
                  {seoPackage.description.length} chars | {seoPackage.description.trim().split(/\s+/).filter(Boolean).length} words
                </span>
                <button
                  onClick={() => handleCopy(seoPackage.description, 'description', 'Description')}
                  className="px-2.5 py-1 rounded bg-[#030712] hover:bg-slate-800 border border-[#1E293B] text-slate-300 hover:text-[#FFE600] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'description' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'description' ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Summarizes approved script content, includes viewer call-to-actions, and features search-optimized keyword density without stuffing.
            </p>

            <textarea
              value={seoPackage.description}
              onChange={(e) => updateSeoPackage({ description: e.target.value })}
              rows={8}
              placeholder="Comprehensive video description..."
              className="w-full p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-[#FFE600] transition-colors resize-y font-mono shadow-inner"
            />
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT COLUMN: DISCOVERY KEYWORDS, HASHTAGS & CHAPTERS     */}
        {/* ========================================================= */}
        <div className="space-y-6">

          {/* Discovery Keywords & Tags Card */}
          <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-[#00F0FF]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  DISCOVERY KEYWORDS & TAGS ({seoPackage.tags.length})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                  totalTagsLength <= 500 
                    ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' 
                    : 'text-amber-400 border-amber-500/30 bg-amber-500/10'
                }`} title="YouTube total tag limit is 500 characters">
                  {totalTagsLength}/500 chars
                </span>

                <button
                  onClick={() => handleCopy(seoPackage.tags.join(', '), 'tags_csv', 'Tags (Comma-Separated)')}
                  className="px-2.5 py-1 rounded bg-[#030712] hover:bg-slate-800 border border-[#1E293B] text-slate-300 hover:text-[#00F0FF] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Copy comma-separated tags for YouTube/Vimeo tag field"
                >
                  {copiedKey === 'tags_csv' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'tags_csv' ? 'COPIED CSV' : 'COPY TAGS CSV'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Algorithmic discovery keywords reflecting core themes, scientific terminology, and viewer search queries.
            </p>

            {/* Tag Chips */}
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-1">
              {seoPackage.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-md bg-[#030712] border border-[#1E293B] text-slate-300 text-xs flex items-center gap-1.5 hover:border-slate-700 transition-colors"
                >
                  <span className="text-slate-500 text-[10px]">#</span>
                  <span>{tag}</span>
                  <button
                    onClick={() => handleRemoveTag(tag)}
                    className="text-slate-500 hover:text-rose-400 text-xs ml-0.5"
                    title="Remove tag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add Tag Form */}
            <form onSubmit={handleAddTag} className="flex gap-2 pt-2 border-t border-[#1E293B]">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="Add keyword or search tag..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF] font-mono"
              />
              <button
                type="submit"
                disabled={!newTagInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 text-xs text-slate-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Tag</span>
              </button>
            </form>
          </div>

          {/* Topical Hashtags Card */}
          <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  TOPICAL HASHTAGS ({seoPackage.hashtags?.length || 0})
                </span>
              </div>

              <button
                onClick={() => handleCopy((seoPackage.hashtags || []).join(' '), 'hashtags', 'Hashtags')}
                className="px-2.5 py-1 rounded bg-[#030712] hover:bg-slate-800 border border-[#1E293B] text-slate-300 hover:text-emerald-400 text-[11px] font-semibold flex items-center gap-1 transition-colors"
              >
                {copiedKey === 'hashtags' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === 'hashtags' ? 'COPIED' : 'COPY'}</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {(seoPackage.hashtags || []).map((hash) => (
                <span
                  key={hash}
                  className="px-2.5 py-1 rounded-md bg-[#030712] border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-1.5"
                >
                  <span>{hash}</span>
                  <button
                    onClick={() => handleRemoveHashtag(hash)}
                    className="text-slate-500 hover:text-rose-400 text-xs ml-0.5"
                    title="Remove hashtag"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>

            {/* Add Hashtag Form */}
            <form onSubmit={handleAddHashtag} className="flex gap-2 pt-2 border-t border-[#1E293B]">
              <input
                type="text"
                value={newHashtagInput}
                onChange={(e) => setNewHashtagInput(e.target.value)}
                placeholder="Add #hashtag..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-emerald-400 font-mono"
              />
              <button
                type="submit"
                disabled={!newHashtagInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 text-xs text-slate-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Chapter Markers / Timestamps Card (Page 15 Blueprint) */}
          <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#10B981]" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  CHAPTER TIMESTAMPS ({seoPackage.chapters?.length || 0})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRecalculateChapters}
                  className="px-2 py-1 rounded bg-[#030712] hover:bg-slate-800 border border-[#1E293B] text-slate-400 hover:text-[#10B981] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                  title="Re-derive chapter markers from current script beats"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>RE-DERIVE BEATS</span>
                </button>

                <button
                  onClick={() => {
                    const txt = (seoPackage.chapters || []).map(c => `${c.timestamp} - ${c.title}`).join('\n');
                    handleCopy(txt, 'chapters', 'Chapter Timestamps');
                  }}
                  className="px-2.5 py-1 rounded bg-[#030712] hover:bg-slate-800 border border-[#1E293B] text-slate-300 hover:text-[#10B981] text-[11px] font-semibold flex items-center gap-1 transition-colors"
                >
                  {copiedKey === 'chapters' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'chapters' ? 'COPIED' : 'COPY TIMESTAMPS'}</span>
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isShorts ? (
                <>
                  <strong className="text-white">Shorts Format Notice:</strong> Short-form platforms (&lt;60s) do not render interactive progress-bar scrub chapters, but timestamps in descriptions assist viewer retention and search indexing based on 8-second pacing beats.
                </>
              ) : (
                <>
                  <strong className="text-white">Long-Form Chapters:</strong> Derived strictly from narrative scene boundaries. Timestamps are formatted in <code className="text-[#00F0FF]">mm:ss</code> notation.
                </>
              )}
            </p>

            {/* Chapter Items List */}
            <div className="space-y-2">
              {(seoPackage.chapters || []).map((ch, idx) => (
                <div 
                  key={idx}
                  className="p-2.5 rounded-lg bg-[#030712] border border-[#1E293B] flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <input
                      type="text"
                      value={ch.timestamp}
                      onChange={(e) => handleUpdateChapter(idx, e.target.value, ch.title)}
                      className="w-16 px-1.5 py-1 rounded bg-[#0B0F19] border border-[#1E293B] text-[#00F0FF] font-bold text-center text-xs font-mono focus:outline-none focus:border-[#00F0FF]"
                    />
                    <input
                      type="text"
                      value={ch.title}
                      onChange={(e) => handleUpdateChapter(idx, ch.timestamp, e.target.value)}
                      className="flex-1 px-2 py-1 rounded bg-[#0B0F19] border border-[#1E293B] text-slate-200 text-xs font-mono focus:outline-none focus:border-[#00F0FF]"
                    />
                  </div>

                  <button
                    onClick={() => handleRemoveChapter(idx)}
                    className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                    title="Remove chapter"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Chapter Marker Form */}
            <form onSubmit={handleAddChapter} className="flex gap-2 pt-2 border-t border-[#1E293B]">
              <input
                type="text"
                value={newChapterTime}
                onChange={(e) => setNewChapterTime(e.target.value)}
                placeholder="00:00"
                className="w-20 px-2.5 py-1.5 rounded-lg bg-[#030712] border border-[#1E293B] text-white text-xs text-center font-mono focus:outline-none focus:border-[#10B981]"
              />
              <input
                type="text"
                value={newChapterTitle}
                onChange={(e) => setNewChapterTitle(e.target.value)}
                placeholder="Chapter beat title..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-[#030712] border border-[#1E293B] text-white text-xs font-mono focus:outline-none focus:border-[#10B981]"
              />
              <button
                type="submit"
                disabled={!newChapterTitle.trim()}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 disabled:opacity-40 text-xs text-slate-300 font-semibold flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* 4. Manual Edit Overwrite Confirmation Modal */}
      {isOverwriteModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B0F19] border border-amber-500/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-amber-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">OVERWRITE MANUAL SEO EDITS?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You have previously edited titles, description, tags, or chapter markers manually. Regenerating will replace these customizations with fresh AI-generated metadata aligned with Script v{currentScript.versionNumber}.
            </p>

            <div className="p-3 rounded bg-[#030712] border border-[#1E293B] text-[11px] text-slate-400 space-y-1">
              <div className="text-white font-bold">What will be updated:</div>
              <div>• 4 title alternatives matching Script v{currentScript.versionNumber}</div>
              <div>• Video description grounded in approved script scenes</div>
              <div>• Search tags and structured chapter markers</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setIsOverwriteModalOpen(false)}
                className="px-3.5 py-1.5 rounded text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setIsOverwriteModalOpen(false);
                  generateSeoWithAI();
                }}
                className="px-4 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs transition-colors"
              >
                Proceed & Overwrite
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* 5. Reset to Baseline Confirmation Modal */}
      {isResetModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B0F19] border border-cyan-500/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-[#00F0FF]">
              <RotateCcw className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">RESET SEO PACKAGE TO BASELINE?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will restore the standard initial SEO package baseline for the project, resetting all titles, description, tags, and chapter markers.
            </p>

            <div className="p-3 rounded bg-[#030712] border border-[#1E293B] text-[11px] text-slate-400 space-y-1">
              <div className="text-white font-bold">Action Summary:</div>
              <div>• Restore 4 baseline title variants</div>
              <div>• Restore default retention video description</div>
              <div>• Clear custom tags and reset chapter markers</div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                onClick={() => setIsResetModalOpen(false)}
                className="px-3.5 py-1.5 rounded text-xs text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>

              <button
                onClick={() => {
                  setIsResetModalOpen(false);
                  resetSeoToDefault();
                }}
                className="px-4 py-1.5 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black font-bold text-xs transition-colors shadow-[0_0_12px_rgba(0,240,255,0.25)]"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
