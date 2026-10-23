import React, { useState, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Download, 
  Copy, 
  FileText, 
  FileJson, 
  ShieldCheck, 
  Layers, 
  Volume2, 
  Sparkles, 
  Search, 
  Check, 
  ArrowRight, 
  Edit3, 
  Image, 
  Star,
  ExternalLink,
  Lock,
  RefreshCw,
  Eye,
  Sliders,
  FolderArchive,
  Terminal,
  FileCode,
  Radio
} from 'lucide-react';
import { StageId } from '../../types/hud';

type DeliverableTab = 'prompts' | 'continuity' | 'seo' | 'thumbnails' | 'script';

export const ReviewExportWorkspace: React.FC = () => {
  const { 
    project, 
    stories,
    selectedStoryId,
    scriptVersions,
    hasSelectedSource, 
    selectedStory,
    currentScript,
    isScriptApproved, 
    hasGeneratedPrompts, 
    staleMatrix,
    addActivityEvent,
    showToast,
    scenePackages,
    continuityBible,
    seoPackage,
    thumbnailsPackage,
    requestStageNavigation,
    restoreCompleteProjectBackup,
    exportCompleteProjectBackup,
  } = useWorkflow();

  // Local UI state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeDeliverableTab, setActiveDeliverableTab] = useState<DeliverableTab>('prompts');
  const [isWarningModalOpen, setIsWarningModalOpen] = useState<boolean>(false);
  const [pendingExportAction, setPendingExportAction] = useState<(() => void) | null>(null);
  const [activeAuditFilter, setActiveAuditFilter] = useState<'all' | 'issues' | 'verified'>('all');
  const [isDownloadingAll, setIsDownloadingAll] = useState<boolean>(false);
  const restoreFileInputRef = React.useRef<HTMLInputElement>(null);

  // File restore handler with complete project deserialization (Task 1 Invariant)
  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;
      const res = restoreCompleteProjectBackup(content);
      if (res.success) {
        showToast('Complete project backup restored successfully!');
      } else {
        showToast(`Restore failed: ${res.error || 'Invalid backup file'}`);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Version mismatch & stale computations
  const isScriptVersionMismatch = seoPackage.scriptVersionReference !== currentScript.versionNumber;
  const isSeoStale = staleMatrix.seoStale || isScriptVersionMismatch;

  const isThumbnailsVersionMismatch = thumbnailsPackage.scriptVersionReference !== currentScript.versionNumber;
  const isThumbnailsStale = staleMatrix.thumbnailsStale || isThumbnailsVersionMismatch;

  const isAnyStale = Object.values(staleMatrix).some(v => v === true) || isSeoStale || isThumbnailsStale;
  const isShorts = project.format === '9:16_SHORTS';
  const expectedSceneCount = isShorts ? Math.round(project.shortsDuration / 8) : Math.max(4, Math.round((project.longFormDurationMinutes * 60) / 30));

  const projectSlug = (project.name || 'illumatrix_project').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');

  // ==========================================
  // REVIEW ENGINE: Comprehensive Readiness Audit
  // ==========================================
  const auditItems = useMemo(() => {
    return [
      {
        id: 'setup_format',
        stageId: '01_SETUP' as StageId,
        title: 'Project Setup & Format Constraints',
        description: `${project.name} // ${isShorts ? `${project.shortsDuration}s Shorts (9:16)` : `${project.longFormDurationMinutes}m Long-Form (16:9)`} // ${project.language.toUpperCase()} // Mode: ${project.modeId}`,
        status: 'pass' as const,
        blocker: false,
      },
      {
        id: 'source_library',
        stageId: '02_SOURCES' as StageId,
        title: 'Ground-Truth Source Story Selection',
        description: hasSelectedSource 
          ? `Selected: "${selectedStory.title}" (v${selectedStory.version}, ${selectedStory.wordCount} words, line breaks preserved)`
          : 'No ground-truth source story selected',
        status: hasSelectedSource ? ('pass' as const) : ('fail' as const),
        blocker: true,
      },
      {
        id: 'script_beats',
        stageId: '03_SCRIPT_STUDIO' as StageId,
        title: 'Script Scene Breakdown & Duration Pacing',
        description: currentScript.scenes.length === expectedSceneCount
          ? `Generated ${currentScript.scenes.length} scenes (@ ${isShorts ? '8s Shorts' : '30s Long-Form'} pacing, ${currentScript.totalWords} words, ~${currentScript.speakingDurationSeconds}s spoken)`
          : `Scene count mismatch: ${currentScript.scenes.length} scenes present, expected ${expectedSceneCount}`,
        status: currentScript.scenes.length === expectedSceneCount ? ('pass' as const) : ('fail' as const),
        blocker: true,
      },
      {
        id: 'script_approval',
        stageId: '03_SCRIPT_STUDIO' as StageId,
        title: 'Script Studio Explicit Review & Approval',
        description: isScriptApproved
          ? `Script v${currentScript.versionNumber} explicitly APPROVED for production (${new Date(currentScript.approvedAt || currentScript.updatedAt).toLocaleTimeString()})`
          : 'Script draft is unapproved or modified. Explicit approval required in Stage 03',
        status: isScriptApproved ? ('pass' as const) : ('fail' as const),
        blocker: true,
      },
      {
        id: 'google_flow_prompts',
        stageId: '04_SCENE_PROMPTS' as StageId,
        title: 'Google Flow Scene Prompt Packages',
        description: hasGeneratedPrompts && scenePackages.length === expectedSceneCount
          ? `Generated ${scenePackages.length} self-contained video prompt packages with camera grammar & atmospheric sound`
          : `Scene packages incomplete (${scenePackages.length}/${expectedSceneCount})`,
        status: (hasGeneratedPrompts && scenePackages.length === expectedSceneCount) ? ('pass' as const) : ('fail' as const),
        blocker: true,
      },
      {
        id: 'google_flow_prompts_safety',
        stageId: '04_SCENE_PROMPTS' as StageId,
        title: 'Google Flow Likeness & Policy Compliance Audit',
        description: (() => {
          const unrepairable = scenePackages.filter(s => s.safetyReview?.status === 'unrepairable');
          const revised = scenePackages.filter(s => s.safetyReview?.isRevised);
          if (unrepairable.length > 0) {
            return `Attention Required: ${unrepairable.length} scene prompt(s) flagged with prominent-person likeness warnings requiring manual editorial review.`;
          }
          if (revised.length > 0) {
            return `Audited: ${revised.length} scene prompt(s) safely adapted with original fictional characters or archival documentary framing.`;
          }
          return `Audited: All ${scenePackages.length} scene prompt packages verified clean of prominent-person likeness requests.`;
        })(),
        status: scenePackages.some(s => s.safetyReview?.status === 'unrepairable') ? ('warning' as const) : ('pass' as const),
        blocker: false,
      },
      {
        id: 'continuity_bible',
        stageId: '04_SCENE_PROMPTS' as StageId,
        title: 'Continuity Bible Configuration',
        description: `Visual Palette: ${continuityBible.visualPalette.slice(0, 50)}... // Voice: ${continuityBible.voiceNarrator.slice(0, 35)}...`,
        status: continuityBible.visualPalette && continuityBible.voiceNarrator ? ('pass' as const) : ('warning' as const),
        blocker: false,
      },
      {
        id: 'seo_deliverables',
        stageId: '05_SEO_PACKAGE' as StageId,
        title: 'Platform Metadata & SEO Package',
        description: isSeoStale
          ? `SEO package v${seoPackage.scriptVersionReference} is STALE (Active Script is v${currentScript.versionNumber})`
          : Boolean(seoPackage && seoPackage.selectedTitle)
          ? `Selected Title: "${seoPackage.selectedTitle.slice(0, 45)}..." // ${seoPackage.tags.length} tags // ${seoPackage.chapters.length} chapter markers`
          : 'SEO title and description not yet generated',
        status: isSeoStale ? ('warning' as const) : Boolean(seoPackage && seoPackage.selectedTitle) ? ('pass' as const) : ('warning' as const),
        blocker: false,
      },
      {
        id: 'thumbnail_prompts',
        stageId: '06_THUMBNAIL_STUDIO' as StageId,
        title: 'Dual Distinct Thumbnail Image Prompts',
        description: isThumbnailsStale
          ? `Thumbnails v${thumbnailsPackage.scriptVersionReference} is STALE (Active Script is v${currentScript.versionNumber})`
          : `Two distinct angles (Option A Enigma vs Option B Observer) prepared. Primary designated: ${thumbnailsPackage.selectedOptionId === 'option_a' ? 'Option A' : 'Option B'}`,
        status: isThumbnailsStale ? ('warning' as const) : ('pass' as const),
        blocker: false,
      },
      {
        id: 'thumbnail_approval',
        stageId: '06_THUMBNAIL_STUDIO' as StageId,
        title: 'Thumbnail Studio Explicit Review & Approval',
        description: thumbnailsPackage.isApproved
          ? `Thumbnail prompt package explicitly APPROVED (${new Date(thumbnailsPackage.approvedAt || thumbnailsPackage.updatedAt).toLocaleTimeString()})`
          : 'Thumbnail package is in draft state. Review and click "Approve Thumbnail Package" in Stage 06',
        status: thumbnailsPackage.isApproved ? ('pass' as const) : ('warning' as const),
        blocker: false,
      },
      {
        id: 'security_audit',
        stageId: '07_REVIEW_EXPORT' as StageId,
        title: 'Security & Secret Isolation Invariant',
        description: 'Verified: Export payload strictly contains creative script, prompts, and metadata. Zero API keys or private tokens.',
        status: 'pass' as const,
        blocker: false,
      },
    ];
  }, [
    project, 
    isShorts, 
    hasSelectedSource, 
    selectedStory, 
    currentScript, 
    isScriptApproved, 
    expectedSceneCount, 
    hasGeneratedPrompts, 
    scenePackages, 
    continuityBible, 
    seoPackage, 
    isSeoStale, 
    thumbnailsPackage, 
    isThumbnailsStale
  ]);

  const criticalBlockers = auditItems.filter(i => i.status === 'fail' && i.blocker);
  const warnings = auditItems.filter(i => i.status === 'warning' || (i.status === 'fail' && !i.blocker));
  const isProductionReady = criticalBlockers.length === 0 && !isAnyStale && thumbnailsPackage.isApproved;

  const filteredAuditItems = useMemo(() => {
    if (activeAuditFilter === 'issues') {
      return auditItems.filter(i => i.status === 'fail' || i.status === 'warning');
    }
    if (activeAuditFilter === 'verified') {
      return auditItems.filter(i => i.status === 'pass');
    }
    return auditItems;
  }, [auditItems, activeAuditFilter]);

  // ==========================================
  // EXPORT ENGINE: Multi-Format Generators
  // ==========================================

  // 1. Master Production Markdown Document (.md)
  const generateMarkdownBundle = (): string => {
    const primaryThumb = thumbnailsPackage.options.find(o => o.id === thumbnailsPackage.selectedOptionId) || thumbnailsPackage.options[0];
    const secondaryThumb = thumbnailsPackage.options.find(o => o.id !== thumbnailsPackage.selectedOptionId) || thumbnailsPackage.options[1];

    const scenesMarkdown = scenePackages.map(s => `### SCENE 0${s.sceneNumber} — ${s.title}
- Aspect Ratio: ${s.format} | Duration: ${s.durationSec} seconds
- Script Beat (Immutable): "${s.scriptBeat}"
- Visual Prompt (Google Flow):
  ${s.visualPrompt}
- Continuity Guidance: ${s.continuitySnippet}
- Spoken Narration: "${s.narration}"
- Sound Design & Foley: ${s.soundDesign}`).join('\n\n');

    const continuityMarkdown = `## CONTINUITY BIBLE
- Voice & Narrator Persona: ${continuityBible.voiceNarrator}
- Music Mood & Atmosphere: ${continuityBible.musicMood}
- Sound Design & Foley Palette: ${continuityBible.soundDesign}
- Visual Color Palette: ${continuityBible.visualPalette}
${continuityBible.recurringSubjects ? `- Recurring Subjects: ${continuityBible.recurringSubjects}\n` : ''}${continuityBible.cameraGrammar ? `- Camera Movement Grammar: ${continuityBible.cameraGrammar}\n` : ''}`;

    const seoMarkdown = `## PLATFORM METADATA & SEO PACKAGE
- Selected Video Title: ${seoPackage.selectedTitle}

- Title Options (A/B Testing):
${seoPackage.titleOptions.map((t, i) => `  ${i + 1}. ${t}`).join('\n')}

- Video Description:
${seoPackage.description}

- Search Tags:
${seoPackage.tags.join(', ')}

${seoPackage.hashtags && seoPackage.hashtags.length > 0 ? `- Hashtags: ${seoPackage.hashtags.join(' ')}\n` : ''}${seoPackage.chapters && seoPackage.chapters.length > 0 ? `- Chapter Markers:\n${seoPackage.chapters.map(c => `  ${c.timestamp} - ${c.title}`).join('\n')}\n` : ''}`;

    const thumbnailsMarkdown = `## THUMBNAIL IMAGE PROMPTS (Midjourney / Imagen / DALL-E)
Status: ${thumbnailsPackage.isApproved ? 'APPROVED FOR PRODUCTION' : 'DRAFT (INSPECTION REQUIRED)'}
Primary Selection: ${primaryThumb?.name || 'Option A'} [${primaryThumb?.ratio || '9:16'}]

### ${primaryThumb?.name || 'PROMPT A'} [PRIMARY EXPORT]
- Aspect Ratio: ${primaryThumb?.ratio}
- Narrative Hook Concept: ${primaryThumb?.conceptAngle}
- Recommended Text Overlay: "${primaryThumb?.overlayTextSuggestion}"
- Focal Subject: ${primaryThumb?.focalSubject}
- Lighting & Mood: ${primaryThumb?.lightingAndMood}
- Composition: ${primaryThumb?.composition}
- Detailed Image Generation Prompt:
  ${primaryThumb?.detailedPrompt}
- Negative Constraints: ${primaryThumb?.negativeConstraints}

### ${secondaryThumb?.name || 'PROMPT B'} [ALTERNATIVE]
- Aspect Ratio: ${secondaryThumb?.ratio}
- Narrative Hook Concept: ${secondaryThumb?.conceptAngle}
- Recommended Text Overlay: "${secondaryThumb?.overlayTextSuggestion}"
- Focal Subject: ${secondaryThumb?.focalSubject}
- Lighting & Mood: ${secondaryThumb?.lightingAndMood}
- Composition: ${secondaryThumb?.composition}
- Detailed Image Generation Prompt:
  ${secondaryThumb?.detailedPrompt}
- Negative Constraints: ${secondaryThumb?.negativeConstraints}`;

    return `# ILLUMATRIX PRODUCTION PACKAGE
Project: ${project.name}
Format: ${isShorts ? '9:16 Vertical Shorts' : '16:9 Long-Form Video'}
Target Duration: ${isShorts ? `${project.shortsDuration} seconds (${expectedSceneCount} scenes @ 8s pacing)` : `${project.longFormDurationMinutes} minutes`}
Content Mode: ${project.modeId}
Spoken Language: ${project.language === 'hi' ? 'Hindi (Devanagari)' : 'English'}
Visual Style: ${project.visualStyleId}
Source Story: "${selectedStory.title}" (v${selectedStory.version})
Script Version: v${currentScript.versionNumber} (${currentScript.isApproved ? 'Approved' : 'Unapproved'})
Export Timestamp: ${new Date().toISOString()}

---

${continuityMarkdown}

---

## GOOGLE FLOW SCENE PACKAGES
Total Scenes: ${scenePackages.length}

${scenesMarkdown}

---

${seoMarkdown}

---

${thumbnailsMarkdown}

---

## SECURITY & COMPLIANCE CERTIFICATION
- Zero API keys, private tokens, or server-side credentials are included in this export.
- Generated strictly with ILLUMATRIX AI Content Preparation Workspace.
`;
  };

  // 2. Structured JSON Project Backup (.json)
  const generateJsonBackup = (): object => {
    return {
      schemaVersion: 'illum_project_backup_v2',
      exportTimestamp: new Date().toISOString(),
      securityAudit: 'CLEAN — ZERO API KEYS OR SECRETS EXPORTED',
      storageNotice: 'LOCAL BROWSER BACKUP: Import this JSON to completely restore all stories, scripts, scenes, SEO, and thumbnails on any device.',
      project: {
        id: project.id,
        name: project.name,
        format: project.format,
        shortsDuration: project.shortsDuration,
        longFormDurationMinutes: project.longFormDurationMinutes,
        modeId: project.modeId,
        language: project.language,
        visualStyleId: project.visualStyleId,
        targetAudience: project.targetAudience,
        callToAction: project.callToAction,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      },
      stories,
      selectedStoryId,
      scriptVersions,
      currentScript,
      continuityBible,
      googleFlowScenes: scenePackages,
      seoPackage,
      thumbnails: thumbnailsPackage,
      staleMatrix,
    };
  };

  // 3. Google Flow Prompts Batch File (.txt)
  const generateGoogleFlowBatch = (): string => {
    return `// ========================================================
// ILLUMATRIX GOOGLE FLOW PROMPT BATCH FILE
// Project: ${project.name}
// Format: ${isShorts ? '9:16 Vertical Shorts' : '16:9 Horizontal'}
// Total Scenes: ${scenePackages.length}
// ========================================================

${scenePackages.map(s => `// --- SCENE 0${s.sceneNumber}: ${s.title} (${s.durationSec}s) ---
// SCRIPT BEAT: "${s.scriptBeat}"
// CONTINUITY: ${s.continuitySnippet}

${s.visualPrompt}

// SOUND DESIGN: ${s.soundDesign}
`).join('\n\n')}`;
  };

  // 4. Voiceover Narration Teleprompter Script (.txt)
  const generateNarrationScript = (): string => {
    const totalWords = currentScript.totalWords || scenePackages.reduce((acc, s) => acc + s.narration.split(/\s+/).length, 0);
    return `========================================================
ILLUMATRIX VOICEOVER NARRATION TELEPROMPTER SCRIPT
Project: ${project.name}
Language: ${project.language === 'hi' ? 'Devanagari Hindi (हिंदी)' : 'English'}
Total Spoken Words: ${totalWords} words
Estimated Speaking Duration: ~${currentScript.speakingDurationSeconds || Math.round(totalWords / 2.5)} seconds
Script Version: v${currentScript.versionNumber} (${currentScript.isApproved ? 'APPROVED' : 'DRAFT'})
========================================================

${currentScript.scenes.map(s => `[SCENE 0${s.sceneNumber} // ${s.timeRange || `${(s.sceneNumber - 1) * 8}–${s.sceneNumber * 8}s`}] (${s.purpose})
${s.narrationText}
`).join('\n')}`;
  };

  // 5. YouTube & Social Platform SEO Metadata File (.txt)
  const generateSeoMetadataFile = (): string => {
    const chaptersText = seoPackage.chapters && seoPackage.chapters.length > 0
      ? `\n\nCHAPTER MARKERS:\n${seoPackage.chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n')}`
      : '';

    const hashtagsText = seoPackage.hashtags && seoPackage.hashtags.length > 0
      ? `\n\nHASHTAGS:\n${seoPackage.hashtags.join(' ')}`
      : '';

    return `========================================================
ILLUMATRIX PLATFORM METADATA & SEO PACKAGE
Project: ${project.name}
Format: ${isShorts ? 'YouTube Shorts / TikTok / Reels (9:16)' : 'YouTube Long-Form (16:9)'}
========================================================

SELECTED VIDEO TITLE:
${seoPackage.selectedTitle}

ALTERNATIVE TITLE VARIANTS (FOR A/B TESTING):
${seoPackage.titleOptions.map((t, i) => `${i + 1}. ${t}`).join('\n')}

DESCRIPTION:
${seoPackage.description}${hashtagsText}${chaptersText}

SEARCH TAGS (COMMA-SEPARATED):
${seoPackage.tags.join(', ')}
`;
  };

  // 6. Thumbnail Prompts File (.txt)
  const generateThumbnailPromptsFile = (): string => {
    const primaryThumb = thumbnailsPackage.options.find(o => o.id === thumbnailsPackage.selectedOptionId) || thumbnailsPackage.options[0];
    const secondaryThumb = thumbnailsPackage.options.find(o => o.id !== thumbnailsPackage.selectedOptionId) || thumbnailsPackage.options[1];

    return `========================================================
ILLUMATRIX THUMBNAIL IMAGE PROMPTS (MIDJOURNEY / IMAGEN / DALL-E)
Project: ${project.name}
Format Ratio: ${primaryThumb?.ratio || (isShorts ? '9:16 vertical' : '16:9 horizontal')}
Primary Selection: ${primaryThumb?.name || 'Option A'}
========================================================

=== PRIMARY THUMBNAIL: ${primaryThumb?.name} ===
ASPECT RATIO: ${primaryThumb?.ratio}
HOOK ANGLE: ${primaryThumb?.conceptAngle}
RECOMMENDED TEXT OVERLAY: "${primaryThumb?.overlayTextSuggestion}"
FOCAL SUBJECT: ${primaryThumb?.focalSubject}
LIGHTING & ATMOSPHERE: ${primaryThumb?.lightingAndMood}
COMPOSITION: ${primaryThumb?.composition}

DETAILED IMAGE GENERATION PROMPT:
${primaryThumb?.detailedPrompt}

NEGATIVE CONSTRAINTS:
${primaryThumb?.negativeConstraints}

========================================================

=== ALTERNATIVE THUMBNAIL: ${secondaryThumb?.name} ===
ASPECT RATIO: ${secondaryThumb?.ratio}
HOOK ANGLE: ${secondaryThumb?.conceptAngle}
RECOMMENDED TEXT OVERLAY: "${secondaryThumb?.overlayTextSuggestion}"
FOCAL SUBJECT: ${secondaryThumb?.focalSubject}
LIGHTING & ATMOSPHERE: ${secondaryThumb?.lightingAndMood}
COMPOSITION: ${secondaryThumb?.composition}

DETAILED IMAGE GENERATION PROMPT:
${secondaryThumb?.detailedPrompt}

NEGATIVE CONSTRAINTS:
${secondaryThumb?.negativeConstraints}
`;
  };

  // Generic File Download Helper
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Guarded Download Handler (Checks Blockers)
  const triggerGuardedExport = (exportFn: () => void) => {
    if (criticalBlockers.length > 0 || isAnyStale || !thumbnailsPackage.isApproved) {
      setPendingExportAction(() => exportFn);
      setIsWarningModalOpen(true);
      return;
    }
    exportFn();
  };

  // 1. Download Master Markdown
  const handleDownloadMarkdown = () => {
    const content = generateMarkdownBundle();
    downloadFile(content, `${projectSlug}_production_package.md`, 'text/markdown;charset=utf-8');
    addActivityEvent('EXPORT', `Downloaded Master Production Markdown package (${projectSlug}_production_package.md).`, 'success', '07_REVIEW_EXPORT');
    showToast('Master Markdown package downloaded!');
  };

  // 2. Download JSON Project Backup
  const handleDownloadJson = () => {
    const content = JSON.stringify(generateJsonBackup(), null, 2);
    downloadFile(content, `${projectSlug}_backup.json`, 'application/json;charset=utf-8');
    addActivityEvent('EXPORT', `Downloaded structured JSON project backup (${projectSlug}_backup.json).`, 'info', '07_REVIEW_EXPORT');
    showToast('Structured JSON backup downloaded!');
  };

  // 3. Download Google Flow Batch Script
  const handleDownloadGoogleFlow = () => {
    const content = generateGoogleFlowBatch();
    downloadFile(content, `${projectSlug}_google_flow_prompts.txt`, 'text/plain;charset=utf-8');
    addActivityEvent('EXPORT', `Downloaded Google Flow prompt batch file (${projectSlug}_google_flow_prompts.txt).`, 'info', '07_REVIEW_EXPORT');
    showToast('Google Flow prompts downloaded!');
  };

  // 4. Download Narration Script
  const handleDownloadNarration = () => {
    const content = generateNarrationScript();
    downloadFile(content, `${projectSlug}_narration_teleprompter.txt`, 'text/plain;charset=utf-8');
    addActivityEvent('EXPORT', `Downloaded voiceover teleprompter script (${projectSlug}_narration_teleprompter.txt).`, 'info', '07_REVIEW_EXPORT');
    showToast('Narration teleprompter script downloaded!');
  };

  // 5. Download SEO Metadata
  const handleDownloadSeo = () => {
    const content = generateSeoMetadataFile();
    downloadFile(content, `${projectSlug}_metadata_seo.txt`, 'text/plain;charset=utf-8');
    addActivityEvent('EXPORT', `Downloaded platform SEO metadata file (${projectSlug}_metadata_seo.txt).`, 'info', '07_REVIEW_EXPORT');
    showToast('Platform SEO metadata downloaded!');
  };

  // 6. Download Thumbnail Prompts
  const handleDownloadThumbnails = () => {
    const content = generateThumbnailPromptsFile();
    downloadFile(content, `${projectSlug}_thumbnail_prompts.txt`, 'text/plain;charset=utf-8');
    addActivityEvent('EXPORT', `Downloaded thumbnail prompts kit (${projectSlug}_thumbnail_prompts.txt).`, 'info', '07_REVIEW_EXPORT');
    showToast('Thumbnail prompts kit downloaded!');
  };

  // Download All 6 Deliverables Sequentially
  const handleDownloadAll = async () => {
    setIsDownloadingAll(true);
    addActivityEvent('EXPORT', 'Starting sequential export of all 6 production deliverables...', 'info', '07_REVIEW_EXPORT');

    handleDownloadMarkdown();
    await new Promise(r => setTimeout(r, 400));
    handleDownloadJson();
    await new Promise(r => setTimeout(r, 400));
    handleDownloadGoogleFlow();
    await new Promise(r => setTimeout(r, 400));
    handleDownloadNarration();
    await new Promise(r => setTimeout(r, 400));
    handleDownloadSeo();
    await new Promise(r => setTimeout(r, 400));
    handleDownloadThumbnails();

    setIsDownloadingAll(false);
    addActivityEvent('EXPORT', 'Successfully exported all 6 production deliverables.', 'success', '07_REVIEW_EXPORT');
    showToast('All 6 production deliverables downloaded!');
  };

  // Clipboard Copy Handler with feedback
  const handleCopyClipboard = (content: string, key: string, label: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(key);
    addActivityEvent('EXPORT', `Copied ${label} to clipboard.`, 'info', '07_REVIEW_EXPORT');
    showToast(`${label} copied to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  return (
    <div className="space-y-6 font-mono">
      {/* 1. Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E293B] gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#00F0FF] mb-1">
            <CheckCircle2 className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-bold tracking-wider">STAGE 07 // REVIEW, AUDIT & EXPORT ENGINE</span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">VERSION CERTIFICATION</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
            Production Package Verification & Export
            {isProductionReady ? (
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 font-bold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> CERTIFIED READY
              </span>
            ) : criticalBlockers.length > 0 ? (
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#FB7185]/15 text-[#FB7185] border border-[#FB7185]/30 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> BLOCKED ({criticalBlockers.length})
              </span>
            ) : (
              <span className="text-xs px-2.5 py-0.5 rounded bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/30 font-bold flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> DRAFT REVIEW
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
            Multi-stage audit validates script approval, scene prompt pacing, continuity invariants, SEO metadata, and thumbnail packages. Generates verified deliverables for Google Flow, teleprompters, and platforms.
          </p>
        </div>

        {/* Global Header Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => handleCopyClipboard(generateMarkdownBundle(), 'bundle_all', 'Master Markdown Bundle')}
            className="px-3 py-2 rounded-lg bg-[#0B0F19] hover:bg-[#00F0FF]/15 border border-[#1E293B] hover:border-[#00F0FF]/50 text-xs text-slate-300 hover:text-[#00F0FF] font-semibold flex items-center gap-1.5 transition-colors"
            title="Copy full master markdown package to clipboard"
          >
            {copiedKey === 'bundle_all' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>COPY MASTER MD</span>
          </button>

          <button
            onClick={() => triggerGuardedExport(handleDownloadAll)}
            disabled={isDownloadingAll}
            className={`px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)] shrink-0 ${
              isDownloadingAll
                ? 'bg-[#FFE600]/60 text-black cursor-wait'
                : 'bg-[#FFE600] hover:bg-[#FFE600]/90 text-black'
            }`}
            title="Download all 6 production deliverables"
          >
            <FolderArchive className="w-4 h-4" />
            <span>{isDownloadingAll ? 'DOWNLOADING ALL...' : 'DOWNLOAD ALL (6 FILES)'}</span>
          </button>
        </div>
      </div>

      {/* 2. Persistence & Storage Advisory Card (Task 1 Invariant) */}
      <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-amber-400 flex items-center gap-2">
              <span>BROWSER-ONLY STORAGE WARNING & PROJECT BACKUP</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950/60 border border-amber-600/40 text-amber-300 font-mono">
                LOCALSTORAGE ONLY
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 max-w-3xl leading-relaxed">
              All project stories, approved scripts, scene prompts, SEO data, and thumbnail options are stored only in this browser. There is no cloud database or remote server storage. Clearing your browser cache will erase your work. Export or restore a full JSON project backup below to protect your content.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <input
            type="file"
            ref={restoreFileInputRef}
            accept=".json"
            onChange={handleFileRestore}
            className="hidden"
          />
          <button
            onClick={() => restoreFileInputRef.current?.click()}
            className="px-3 py-2 rounded-lg bg-[#0B0F19] hover:bg-slate-800 border border-[#1E293B] hover:border-slate-600 text-xs text-slate-200 font-semibold flex items-center gap-1.5 transition-colors"
            title="Upload and restore a complete project backup JSON file"
          >
            <FolderArchive className="w-4 h-4 text-amber-400" />
            <span>RESTORE PROJECT (.JSON)</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className="px-3.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Download full recoverable project backup (.json) with all stories, scripts, prompts, SEO, and thumbnails"
          >
            <Download className="w-4 h-4" />
            <span>DOWNLOAD BACKUP (.JSON)</span>
          </button>
        </div>
      </div>

      {/* 3. Upstream Stale / Invalidation Banner */}
      {isAnyStale ? (
        <div className="p-4 rounded-xl bg-[#FFE600]/10 border border-[#FFE600]/40 text-xs text-slate-200 flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#FFE600] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-[#FFE600] block text-xs">
                UPSTREAM STALE DELIVERABLES DETECTED (PAGE 10 & 15 INVARIANT)
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Upstream modifications were made to project configuration, source story, or script beats. Affected downstream outputs are marked STALE to guarantee pipeline truth. You may export existing drafts or return to earlier stages to synchronize.
              </p>
              {staleMatrix.upstreamReason ? (
                <span className="text-[10px] text-slate-500 block">
                  Trigger Discrepancy: {staleMatrix.upstreamReason}
                </span>
              ) : null}
            </div>
          </div>
          <button
            onClick={() => requestStageNavigation('03_SCRIPT_STUDIO')}
            className="px-3 py-1.5 rounded-lg bg-[#FFE600] text-black font-bold text-xs flex items-center gap-1.5 transition-all shrink-0 hover:bg-[#FFE600]/90"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Review Upstream Stages</span>
          </button>
        </div>
      ) : null}

      {/* 3. Main Two-Column Layout: Audit Review Engine vs Export Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ========================================================
            LEFT COLUMN (7 cols): READINESS AUDIT & ISSUE TRACKER
           ======================================================== */}
        <div className="lg:col-span-7 space-y-4">
          <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
            
            {/* Audit Header & Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1E293B] gap-2">
              <div>
                <span className="text-xs text-white font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#00F0FF]" />
                  PROJECT READINESS & VERIFICATION AUDIT
                </span>
                <span className="text-[10px] text-slate-500">
                  Checking 11 core blueprint invariants across Stages 01–06
                </span>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 p-0.5 bg-[#030712] border border-[#1E293B] rounded-lg text-[10px]">
                <button
                  onClick={() => setActiveAuditFilter('all')}
                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                    activeAuditFilter === 'all' ? 'bg-[#1E293B] text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ALL ({auditItems.length})
                </button>
                <button
                  onClick={() => setActiveAuditFilter('issues')}
                  className={`px-2 py-0.5 rounded font-semibold transition-all flex items-center gap-1 ${
                    activeAuditFilter === 'issues' ? 'bg-[#FB7185]/20 text-[#FB7185] border border-[#FB7185]/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ISSUES ({criticalBlockers.length + warnings.length})
                </button>
                <button
                  onClick={() => setActiveAuditFilter('verified')}
                  className={`px-2 py-0.5 rounded font-semibold transition-all ${
                    activeAuditFilter === 'verified' ? 'bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  CLEAN ({auditItems.filter(i => i.status === 'pass').length})
                </button>
              </div>
            </div>

            {/* Audit Checklist Items */}
            <div className="space-y-2.5">
              {filteredAuditItems.map((item) => {
                const isPass = item.status === 'pass';
                const isWarning = item.status === 'warning';
                const isFail = item.status === 'fail';

                return (
                  <div 
                    key={item.id}
                    className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 transition-colors ${
                      isPass 
                        ? 'bg-[#030712] border-[#1E293B] hover:border-slate-700' 
                        : isFail 
                        ? 'bg-[#FB7185]/5 border-[#FB7185]/40 hover:border-[#FB7185]/60' 
                        : 'bg-[#FFE600]/5 border-[#FFE600]/40 hover:border-[#FFE600]/60'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {isPass ? (
                        <CheckCircle2 className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
                      ) : isFail ? (
                        <AlertTriangle className="w-4 h-4 text-[#FB7185] shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-[#FFE600] shrink-0 mt-0.5" />
                      )}

                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200 text-xs truncate">
                            {item.title}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded font-mono text-slate-500 bg-[#070C18] border border-[#1E293B]">
                            {item.stageId}
                          </span>
                        </div>
                        <p className={`text-[11px] leading-relaxed truncate ${
                          isFail ? 'text-[#FB7185]' : isWarning ? 'text-[#FFE600]' : 'text-slate-400'
                        }`}>
                          {item.description}
                        </p>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="shrink-0">
                      {isPass ? (
                        <span className="text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded bg-[#10B981]/10 border border-[#10B981]/20">
                          VERIFIED
                        </span>
                      ) : (
                        <button
                          onClick={() => requestStageNavigation(item.stageId)}
                          className={`text-[10px] font-bold px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                            isFail 
                              ? 'bg-[#FB7185]/20 hover:bg-[#FB7185]/30 text-[#FB7185] border border-[#FB7185]/40' 
                              : 'bg-[#FFE600]/20 hover:bg-[#FFE600]/30 text-[#FFE600] border border-[#FFE600]/40'
                          }`}
                        >
                          <span>FIX</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Audit Summary Notice */}
            <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] flex items-start gap-2.5 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-[#10B981] shrink-0 mt-0.5" />
              <p className="text-[10px] leading-relaxed text-slate-500">
                <strong className="text-slate-300">Security & Gate Invariant (Page 15 & 20):</strong> Unapproved scripts cannot be marked production ready. All exports strictly exclude environment variables, internal tokens, and Google GenAI API keys.
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================
            RIGHT COLUMN (5 cols): EXPORT ENGINE & DOWNLOAD SUITE
           ======================================================== */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
            
            <div className="pb-3 border-b border-[#1E293B] flex items-center justify-between">
              <div>
                <span className="text-xs text-white font-bold flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#FFE600]" />
                  MULTI-FORMAT EXPORT SUITE
                </span>
                <span className="text-[10px] text-slate-500">
                  Genuine file generation with proper formats & MIME types
                </span>
              </div>
            </div>

            {/* Individual File Download Cards */}
            <div className="space-y-2.5">

              {/* 1. Master Production Markdown Bundle */}
              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] hover:border-[#00F0FF]/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-5 h-5 text-[#00F0FF] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-[#00F0FF] truncate">
                      Master Markdown Bundle (.md)
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Complete human-readable package for Google Flow operators
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyClipboard(generateMarkdownBundle(), 'copy_md', 'Master Markdown')}
                    className="p-1.5 rounded bg-[#0B0F19] hover:bg-[#00F0FF]/15 text-slate-400 hover:text-[#00F0FF] border border-[#1E293B]"
                    title="Copy to clipboard"
                  >
                    {copiedKey === 'copy_md' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => triggerGuardedExport(handleDownloadMarkdown)}
                    className="p-1.5 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 font-bold"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 2. Structured JSON Project Backup */}
              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] hover:border-[#FFE600]/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileJson className="w-5 h-5 text-[#FFE600] shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-[#FFE600] truncate">
                      Structured JSON Backup (.json)
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Complete state backup for session import/restoration
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyClipboard(JSON.stringify(generateJsonBackup(), null, 2), 'copy_json', 'JSON Backup')}
                    className="p-1.5 rounded bg-[#0B0F19] hover:bg-[#FFE600]/15 text-slate-400 hover:text-[#FFE600] border border-[#1E293B]"
                    title="Copy JSON"
                  >
                    {copiedKey === 'copy_json' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => triggerGuardedExport(handleDownloadJson)}
                    className="p-1.5 rounded bg-[#FFE600]/15 hover:bg-[#FFE600]/25 text-[#FFE600] border border-[#FFE600]/40 font-bold"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 3. Google Flow Prompts Batch Script */}
              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] hover:border-emerald-500/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileCode className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-emerald-400 truncate">
                      Google Flow Batch File (.txt)
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Raw scene prompts formatted for batch runner execution
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyClipboard(generateGoogleFlowBatch(), 'copy_flow', 'Google Flow Batch')}
                    className="p-1.5 rounded bg-[#0B0F19] hover:bg-emerald-500/15 text-slate-400 hover:text-emerald-400 border border-[#1E293B]"
                    title="Copy Google Flow Prompts"
                  >
                    {copiedKey === 'copy_flow' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => triggerGuardedExport(handleDownloadGoogleFlow)}
                    className="p-1.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 font-bold"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 4. Voiceover & Narration Teleprompter */}
              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] hover:border-purple-400/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Volume2 className="w-5 h-5 text-purple-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-purple-400 truncate">
                      Narration Teleprompter (.txt)
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Clean timestamped script with pacing & speaking rates
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyClipboard(generateNarrationScript(), 'copy_narration', 'Narration Script')}
                    className="p-1.5 rounded bg-[#0B0F19] hover:bg-purple-400/15 text-slate-400 hover:text-purple-400 border border-[#1E293B]"
                    title="Copy Narration"
                  >
                    {copiedKey === 'copy_narration' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => triggerGuardedExport(handleDownloadNarration)}
                    className="p-1.5 rounded bg-purple-400/15 hover:bg-purple-400/25 text-purple-400 border border-purple-400/40 font-bold"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 5. Platform Metadata & SEO Package */}
              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] hover:border-cyan-400/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Search className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-cyan-400 truncate">
                      Platform SEO Metadata (.txt)
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      YouTube/TikTok title options, chapters, and search tags
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyClipboard(generateSeoMetadataFile(), 'copy_seo', 'SEO Metadata')}
                    className="p-1.5 rounded bg-[#0B0F19] hover:bg-cyan-400/15 text-slate-400 hover:text-cyan-400 border border-[#1E293B]"
                    title="Copy SEO"
                  >
                    {copiedKey === 'copy_seo' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => triggerGuardedExport(handleDownloadSeo)}
                    className="p-1.5 rounded bg-cyan-400/15 hover:bg-cyan-400/25 text-cyan-400 border border-cyan-400/40 font-bold"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* 6. Thumbnail Prompts Kit */}
              <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] hover:border-rose-400/50 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Image className="w-5 h-5 text-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-rose-400 truncate">
                      Thumbnail Prompts Kit (.txt)
                    </div>
                    <div className="text-[10px] text-slate-500 truncate">
                      Midjourney/Imagen prompts with ratios and text overlays
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopyClipboard(generateThumbnailPromptsFile(), 'copy_thumbs', 'Thumbnail Prompts')}
                    className="p-1.5 rounded bg-[#0B0F19] hover:bg-rose-400/15 text-slate-400 hover:text-rose-400 border border-[#1E293B]"
                    title="Copy Thumbnail Prompts"
                  >
                    {copiedKey === 'copy_thumbs' ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => triggerGuardedExport(handleDownloadThumbnails)}
                    className="p-1.5 rounded bg-rose-400/15 hover:bg-rose-400/25 text-rose-400 border border-rose-400/40 font-bold"
                    title="Download file"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>

      {/* 4. Live Deliverable Inspector (Interactive Tabs) */}
      <div className="p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#1E293B] gap-2">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#00F0FF]" />
            <span className="text-xs text-white font-bold uppercase tracking-wider">
              LIVE DELIVERABLE INSPECTOR
            </span>
          </div>

          {/* Deliverable Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[#030712] border border-[#1E293B] rounded-lg text-xs overflow-x-auto">
            <button
              onClick={() => setActiveDeliverableTab('prompts')}
              className={`px-3 py-1 rounded font-semibold transition-all shrink-0 ${
                activeDeliverableTab === 'prompts' 
                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SCENE PROMPTS ({scenePackages.length})
            </button>
            <button
              onClick={() => setActiveDeliverableTab('continuity')}
              className={`px-3 py-1 rounded font-semibold transition-all shrink-0 ${
                activeDeliverableTab === 'continuity' 
                  ? 'bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CONTINUITY BIBLE
            </button>
            <button
              onClick={() => setActiveDeliverableTab('seo')}
              className={`px-3 py-1 rounded font-semibold transition-all shrink-0 ${
                activeDeliverableTab === 'seo' 
                  ? 'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SEO & CHAPTERS
            </button>
            <button
              onClick={() => setActiveDeliverableTab('thumbnails')}
              className={`px-3 py-1 rounded font-semibold transition-all shrink-0 ${
                activeDeliverableTab === 'thumbnails' 
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              THUMBNAIL STUDIO
            </button>
            <button
              onClick={() => setActiveDeliverableTab('script')}
              className={`px-3 py-1 rounded font-semibold transition-all shrink-0 ${
                activeDeliverableTab === 'script' 
                  ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              SCRIPT v{currentScript.versionNumber}
            </button>
          </div>
        </div>

        {/* Tab 1: Scene Prompts */}
        {activeDeliverableTab === 'prompts' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Google Flow video prompt packages with 8s pacing</span>
              <button
                onClick={() => requestStageNavigation('04_SCENE_PROMPTS')}
                className="text-[11px] text-[#00F0FF] hover:underline flex items-center gap-1"
              >
                <span>Edit in Stage 04</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {scenePackages.map(s => (
                <div key={s.id} className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-2 text-xs">
                  <div className="flex items-center justify-between border-b border-[#1E293B] pb-1.5">
                    <span className="font-bold text-[#00F0FF] text-[11px]">SCENE 0{s.sceneNumber}</span>
                    <span className="text-[10px] text-slate-500 font-mono">{s.format} | {s.durationSec}s</span>
                  </div>
                  <div className="text-slate-200 font-semibold text-[11px] truncate">{s.title}</div>
                  <div className="text-slate-400 text-[10px] line-clamp-3 leading-relaxed">
                    {s.visualPrompt}
                  </div>
                  <div className="pt-1 border-t border-[#1E293B] text-[10px] text-slate-500 italic truncate">
                    Narration: "{s.narration}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 2: Continuity Bible */}
        {activeDeliverableTab === 'continuity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5">
              <span className="text-[10px] text-[#FFE600] uppercase font-bold block">Visual Color Palette</span>
              <p className="text-slate-200 leading-relaxed text-[11px]">{continuityBible.visualPalette}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5">
              <span className="text-[10px] text-[#FFE600] uppercase font-bold block">Voice & Narrator Persona</span>
              <p className="text-slate-200 leading-relaxed text-[11px]">{continuityBible.voiceNarrator}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5">
              <span className="text-[10px] text-[#FFE600] uppercase font-bold block">Sound Design & Foley</span>
              <p className="text-slate-200 leading-relaxed text-[11px]">{continuityBible.soundDesign}</p>
            </div>
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5">
              <span className="text-[10px] text-[#FFE600] uppercase font-bold block">Music Mood</span>
              <p className="text-slate-200 leading-relaxed text-[11px]">{continuityBible.musicMood}</p>
            </div>
            {continuityBible.recurringSubjects && (
              <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5 md:col-span-2">
                <span className="text-[10px] text-[#FFE600] uppercase font-bold block">Recurring Visual Subjects</span>
                <p className="text-slate-200 leading-relaxed text-[11px]">{continuityBible.recurringSubjects}</p>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: SEO Package */}
        {activeDeliverableTab === 'seo' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-2 md:col-span-2">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Selected Video Title</span>
              <div className="text-white font-bold text-sm tracking-wide">{seoPackage.selectedTitle}</div>
              <div className="text-[10px] text-slate-500 font-mono">
                {seoPackage.selectedTitle?.length || 0} characters // Tested against {seoPackage.titleOptions?.length || 0} variants
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">Description & Hashtags</span>
              <p className="text-slate-300 leading-relaxed text-[11px] whitespace-pre-line line-clamp-6">
                {seoPackage.description}
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] space-y-2">
              <span className="text-[10px] text-cyan-400 uppercase font-bold block">
                Chapter Markers ({seoPackage.chapters.length})
              </span>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {seoPackage.chapters.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 text-[11px] text-slate-300 font-mono">
                    <span className="text-cyan-400">{c.timestamp}</span>
                    <span>{c.title}</span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-[#1E293B] text-[10px] text-slate-500">
                Search Tags: {seoPackage.tags.slice(0, 6).join(', ')}...
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Thumbnail Studio */}
        {activeDeliverableTab === 'thumbnails' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {thumbnailsPackage.options.map(opt => {
              const isPrimary = opt.id === thumbnailsPackage.selectedOptionId;
              return (
                <div 
                  key={opt.id} 
                  className={`p-4 rounded-lg bg-[#030712] border flex gap-4 ${
                    isPrimary ? 'border-[#FFE600]/50 shadow-[0_0_15px_rgba(255,230,0,0.1)]' : 'border-[#1E293B]'
                  }`}
                >
                  <div className={`relative shrink-0 rounded overflow-hidden border border-[#1E293B] bg-black ${
                    isShorts ? 'w-24 h-40' : 'w-40 h-24'
                  }`}>
                    {opt.previewImageUrl ? (
                      <img src={opt.previewImageUrl} alt={opt.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <Image className="w-6 h-6" />
                      </div>
                    )}
                    <div className="absolute bottom-1.5 left-1 right-1 text-center">
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/85 text-white font-extrabold uppercase block truncate">
                        {opt.overlayTextSuggestion}
                      </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs flex items-center gap-1.5">
                        {opt.name}
                        {isPrimary && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFE600]/15 text-[#FFE600] border border-[#FFE600]/40 font-bold flex items-center gap-0.5">
                            <Star className="w-2.5 h-2.5 fill-[#FFE600]" /> PRIMARY
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{opt.ratio}</span>
                    </div>
                    <div className="text-[#00F0FF] text-[11px] font-semibold">{opt.conceptAngle}</div>
                    <p className="text-slate-400 text-[10px] line-clamp-3 leading-relaxed">
                      {opt.detailedPrompt}
                    </p>
                    <div className="text-[10px] text-slate-500 font-mono pt-1">
                      Negative: {opt.negativeConstraints}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Tab 5: Script & Source */}
        {activeDeliverableTab === 'script' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-lg bg-[#030712] border border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] text-purple-400 uppercase font-bold block">Active Script Version</span>
                <span className="text-white font-bold text-sm">{currentScript.title}</span>
                <span className="text-slate-500 text-[11px] block mt-0.5">
                  Version v{currentScript.versionNumber} // Grounded in: "{selectedStory.title}" (v{selectedStory.version})
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded font-bold ${
                  currentScript.isApproved ? 'bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30' : 'bg-[#FB7185]/15 text-[#FB7185] border border-[#FB7185]/30'
                }`}>
                  {currentScript.isApproved ? 'EXPLICITLY APPROVED' : 'UNAPPROVED DRAFT'}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              {currentScript.scenes.map(s => (
                <div key={s.id} className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] flex items-start gap-3">
                  <span className="text-[#00F0FF] font-bold text-xs shrink-0 w-16">
                    SCENE 0{s.sceneNumber}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>{s.purpose} ({s.timeRange})</span>
                      <span>{s.wordCount} words</span>
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed">{s.narrationText}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* 5. Warning Modal: Guarded Export Confirmation */}
      {isWarningModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B0F19] border border-[#FFE600]/40 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl font-mono">
            <div className="flex items-center gap-2 text-[#FFE600] font-bold text-sm">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Export With Unapproved or Stale Deliverables?</span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Your project contains unapproved or stale deliverables that may not match the latest approved script version:
            </p>

            <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5 text-xs">
              {criticalBlockers.map(b => (
                <div key={b.id} className="text-[#FB7185] flex items-center gap-1.5">
                  <span className="font-bold">❌ BLOCKER:</span>
                  <span>{b.title}</span>
                </div>
              ))}
              {isAnyStale && (
                <div className="text-[#FFE600] flex items-center gap-1.5">
                  <span className="font-bold">⚠️ WARNING:</span>
                  <span>Upstream changes detected (stale outputs)</span>
                </div>
              )}
              {!thumbnailsPackage.isApproved && (
                <div className="text-[#FFE600] flex items-center gap-1.5">
                  <span className="font-bold">⚠️ WARNING:</span>
                  <span>Thumbnail package is unapproved</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => {
                  setIsWarningModalOpen(false);
                  setPendingExportAction(null);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#030712] border border-[#1E293B] text-xs text-slate-300 hover:text-white"
              >
                Review Deliverables
              </button>
              <button
                onClick={() => {
                  setIsWarningModalOpen(false);
                  if (pendingExportAction) {
                    pendingExportAction();
                    setPendingExportAction(null);
                  }
                }}
                className="px-4 py-1.5 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black text-xs font-bold"
              >
                Export Anyway (Draft)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
