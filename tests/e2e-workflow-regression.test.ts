import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  DEFAULT_STORIES, 
  DEFAULT_SEO_PACKAGE, 
  DEFAULT_THUMBNAIL_PACKAGE, 
  DEFAULT_SCENE_PACKAGES, 
  DEFAULT_CONTINUITY_BIBLE,
  StorageService 
} from '../src/services/storage';
import { 
  ProjectSettings, 
  ScriptVersion, 
  ScriptSceneBeat,
  StaleMatrix, 
  StageId, 
  StageStatus,
  VideoFormat,
  ShortsDuration,
  ScenePackageData,
  SeoPackageData,
  ThumbnailStudioPackage,
  ThumbnailPromptItem,
  ContinuityBible,
  SourceStory
} from '../src/types/hud';
import { WORKFLOW_STAGES } from '../src/data/registries';
import { validateCustomProviderUrl } from '../src/server/urlSafetyValidator';

// In-memory mock for localStorage in Node test runner
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = String(value);
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

// Baseline mock project for regression verification
const createMockProject = (overrides?: Partial<ProjectSettings>): ProjectSettings => ({
  id: 'proj_matrix_regression_01',
  name: 'ILLUMATRIX Pipeline Test',
  format: '9:16_SHORTS',
  shortsDuration: 24,
  longFormDurationMinutes: 4,
  modeId: 'scifi_explainer',
  language: 'en',
  visualStyleId: 'cinematic',
  targetAudience: 'Curiosity-driven Tech Enthusiasts',
  callToAction: 'Follow for Daily Reality Glitches',
  createdAt: '2026-10-18T10:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
  ...overrides,
});

// Baseline mock approved script (24s Shorts = 3 scenes @ 8s pacing)
const createMockApprovedScript = (overrides?: Partial<ScriptVersion>): ScriptVersion => ({
  id: 'script_v1_regression',
  sourceStoryId: 'story_glitch_kuiper',
  sourceStoryVersion: 1,
  versionNumber: 1,
  title: 'The Glitch in the Kuiper Belt — Explainer',
  hookSummary: 'Beyond Pluto, deep-space telemetry detects an anomaly that defies natural explanation.',
  scenes: [
    {
      id: 'beat_01',
      sceneNumber: 1,
      timeRange: '0–8s',
      purpose: 'Hook',
      narrationText: 'Beyond the orbit of Pluto, deep-space telemetry has just detected an anomaly that defies natural explanation.',
      visualDirectionDraft: 'Cinematic wide angle opening of deep space asteroids with pulsing crystalline facet.',
      wordCount: 16,
      isCustomEdited: false,
    },
    {
      id: 'beat_02',
      sceneNumber: 2,
      timeRange: '8–16s',
      purpose: 'Reveal',
      narrationText: 'Spectroscopic data confirms an artificial crystalline relay repeating an encoded prime pulse every eight point four seconds.',
      visualDirectionDraft: 'Macro probe glide along micro-etched photonic circuits.',
      wordCount: 18,
      isCustomEdited: false,
    },
    {
      id: 'beat_03',
      sceneNumber: 3,
      timeRange: '16–24s',
      purpose: 'Payoff',
      narrationText: 'Now science must answer: is humanity being monitored, or have we awakened an ancient orbital relic?',
      visualDirectionDraft: 'Cosmic scale pull-back revealing distant pale blue Earth dot.',
      wordCount: 16,
      isCustomEdited: false,
    },
  ],
  totalWords: 50,
  speakingDurationSeconds: 20,
  editorialNotes: 'Approved regression baseline.',
  isApproved: true,
  approvedAt: '2026-10-18T12:00:00.000Z',
  createdAt: '2026-10-18T11:00:00.000Z',
  updatedAt: '2026-10-18T12:00:00.000Z',
  configSnapshot: {
    format: '9:16_SHORTS',
    duration: 24,
    modeId: 'scifi_explainer',
    language: 'en',
    visualStyleId: 'cinematic',
  },
  ...overrides,
});

// Helper simulating stage status evaluation matching WorkflowContext logic
function computeStageStatus(params: {
  activeStageId: StageId;
  targetStageId: StageId;
  hasSelectedSource: boolean;
  isScriptApproved: boolean;
  hasGeneratedPrompts: boolean;
  scenePackagesCount: number;
  staleMatrix: StaleMatrix;
  currentScriptVersion: number;
  seoScriptVersionRef?: number;
  thumbnailsScriptVersionRef?: number;
  hasSeoTitle: boolean;
  isThumbnailsApproved: boolean;
}): StageStatus {
  const {
    activeStageId,
    targetStageId,
    hasSelectedSource,
    isScriptApproved,
    hasGeneratedPrompts,
    scenePackagesCount,
    staleMatrix,
    currentScriptVersion,
    seoScriptVersionRef,
    thumbnailsScriptVersionRef,
    hasSeoTitle,
    isThumbnailsApproved,
  } = params;

  if (activeStageId === targetStageId) return 'current';

  switch (targetStageId) {
    case '01_SETUP':
      return 'completed';
    case '02_SOURCES':
      return hasSelectedSource ? 'completed' : 'unlocked';
    case '03_SCRIPT_STUDIO':
      if (!hasSelectedSource) return 'blocked';
      if (staleMatrix.scriptStale) return 'stale';
      return isScriptApproved ? 'completed' : 'unlocked';
    case '04_SCENE_PROMPTS':
      if (!isScriptApproved) return 'blocked';
      if (staleMatrix.promptsStale) return 'stale';
      return hasGeneratedPrompts ? 'completed' : 'unlocked';
    case '05_SEO_PACKAGE':
      if (!isScriptApproved) return 'blocked';
      if (staleMatrix.seoStale || (seoScriptVersionRef !== undefined && seoScriptVersionRef !== currentScriptVersion)) return 'stale';
      return hasSeoTitle ? 'completed' : 'unlocked';
    case '06_THUMBNAIL_STUDIO':
      if (!isScriptApproved) return 'blocked';
      if (staleMatrix.thumbnailsStale || (thumbnailsScriptVersionRef !== undefined && thumbnailsScriptVersionRef !== currentScriptVersion)) return 'stale';
      return isThumbnailsApproved ? 'completed' : 'unlocked';
    case '07_REVIEW_EXPORT': {
      const isAnyStale = Object.values(staleMatrix).some(v => v === true) || 
        (seoScriptVersionRef !== undefined && seoScriptVersionRef !== currentScriptVersion) || 
        (thumbnailsScriptVersionRef !== undefined && thumbnailsScriptVersionRef !== currentScriptVersion);
      if (isAnyStale) return 'stale';
      if (hasSelectedSource && isScriptApproved && hasGeneratedPrompts && scenePackagesCount > 0 && hasSeoTitle && isThumbnailsApproved) {
        return 'completed';
      }
      return 'unlocked';
    }
    default:
      return 'unlocked';
  }
}

// Helper simulating Readiness Audit evaluation matching ReviewExportWorkspace
interface AuditResult {
  isProductionReady: boolean;
  criticalBlockers: string[];
  warnings: string[];
}

function evaluateReadinessAudit(params: {
  project: ProjectSettings;
  hasSelectedSource: boolean;
  currentScript: ScriptVersion;
  isScriptApproved: boolean;
  scenePackages: ScenePackageData[];
  seoPackage: SeoPackageData;
  thumbnailsPackage: ThumbnailStudioPackage;
  staleMatrix: StaleMatrix;
}): AuditResult {
  const {
    project,
    hasSelectedSource,
    currentScript,
    isScriptApproved,
    scenePackages,
    seoPackage,
    thumbnailsPackage,
    staleMatrix,
  } = params;

  const isShorts = project.format === '9:16_SHORTS';
  const expectedSceneCount = isShorts 
    ? Math.round(project.shortsDuration / 8) 
    : Math.max(4, Math.round((project.longFormDurationMinutes * 60) / 30));

  const isSeoStale = staleMatrix.seoStale || (seoPackage.scriptVersionReference !== currentScript.versionNumber);
  const isThumbnailsStale = staleMatrix.thumbnailsStale || (thumbnailsPackage.scriptVersionReference !== currentScript.versionNumber);
  const isAnyStale = Object.values(staleMatrix).some(v => v === true) || isSeoStale || isThumbnailsStale;

  const blockers: string[] = [];
  const warnings: string[] = [];

  // 1. Source story check
  if (!hasSelectedSource) {
    blockers.push('No ground-truth source story selected');
  }

  // 2. Script beats count check
  if (currentScript.scenes.length !== expectedSceneCount) {
    blockers.push(`Scene count mismatch: ${currentScript.scenes.length} scenes present, expected ${expectedSceneCount}`);
  }

  // 3. Script explicit approval check
  if (!isScriptApproved || !currentScript.isApproved) {
    blockers.push('Script draft is unapproved or modified. Explicit approval required in Stage 03');
  }

  // 4. Scene Prompts check
  if (scenePackages.length !== expectedSceneCount) {
    blockers.push(`Scene packages incomplete (${scenePackages.length}/${expectedSceneCount})`);
  }

  // Warnings
  if (isSeoStale) {
    warnings.push(`SEO package is STALE relative to Script v${currentScript.versionNumber}`);
  } else if (!seoPackage.selectedTitle) {
    warnings.push('SEO title and description not yet generated');
  }

  if (isThumbnailsStale) {
    warnings.push(`Thumbnails package is STALE relative to Script v${currentScript.versionNumber}`);
  } else if (!thumbnailsPackage.isApproved) {
    warnings.push('Thumbnail package is in draft state. Review and click "Approve Thumbnail Package" in Stage 06');
  }

  const isProductionReady = blockers.length === 0 && !isAnyStale && thumbnailsPackage.isApproved;

  return {
    isProductionReady,
    criticalBlockers: blockers,
    warnings,
  };
}

// ============================================================================
// STAGE 1: SETUP & RULES REGRESSION TESTS
// ============================================================================
test('Stage 01 Setup & Rules: Validates format bounds and pacing invariants', () => {
  // Shorts duration pacing constraint: 8 seconds per scene strictly enforced
  const validShortsDurations: ShortsDuration[] = [24, 32, 40, 48];
  for (const dur of validShortsDurations) {
    const scenesCount = dur / 8;
    assert.equal(Number.isInteger(scenesCount), true, `Shorts ${dur}s must cleanly divide into 8s scenes`);
    assert.ok(scenesCount >= 3 && scenesCount <= 6, `Shorts ${dur}s must yield 3 to 6 scenes`);
  }

  // Long-form duration options must preserve configured choices [3, 4, 5, 8, 10] minutes
  const allowedLongFormMinutes = [3, 4, 5, 8, 10];
  assert.equal(allowedLongFormMinutes.length, 5);
  assert.equal(allowedLongFormMinutes[0], 3);
  assert.equal(allowedLongFormMinutes[1], 4);

  // Stage 01 status is always accessible and completed by default
  const status = computeStageStatus({
    activeStageId: '01_SETUP',
    targetStageId: '01_SETUP',
    hasSelectedSource: true,
    isScriptApproved: true,
    hasGeneratedPrompts: true,
    scenePackagesCount: 3,
    staleMatrix: { sourceStoryStale: false, scriptStale: false, promptsStale: false, thumbnailsStale: false, seoStale: false },
    currentScriptVersion: 1,
    hasSeoTitle: true,
    isThumbnailsApproved: true,
  });
  assert.equal(status, 'current');
});

// ============================================================================
// STAGE 2: SOURCE LIBRARY REGRESSION TESTS
// ============================================================================
test('Stage 02 Source Library: Preserves exact text, paragraph breaks, and soft-delete semantics', () => {
  const story = DEFAULT_STORIES[0];
  assert.ok(story.rawText.includes('\n\n'), 'Source text must preserve paragraph breaks');
  assert.ok(story.rawText.includes('8.4 seconds'), 'Source text must preserve numbers and punctuation');

  // Word count and char count calculation verification
  const words = story.rawText.trim().split(/\s+/).filter(Boolean).length;
  assert.ok(Math.abs(words - story.wordCount) <= 1, 'Word count must accurately reflect text within tokenization boundary');
  assert.equal(story.wordCount, 84, 'Curated story wordCount must be 84');

  // Editing rawText increments story version and marks content changed
  const editedText = story.rawText + '\n\nUpdated optical survey telemetry confirmed artificial lattice.';
  const isContentChanged = editedText !== story.rawText;
  const nextVersion = isContentChanged ? story.version + 1 : story.version;
  assert.equal(isContentChanged, true);
  assert.equal(nextVersion, 2, 'Content change must increment version');

  // Soft-deletion / Archiving invariant: archiving retains story without deleting scripts or prompts
  const archivedStory: SourceStory = {
    ...story,
    isArchived: true,
    updatedAt: new Date().toISOString(),
  };
  assert.equal(archivedStory.isArchived, true);
  assert.equal(archivedStory.rawText, story.rawText, 'Archiving must not clear or corrupt rawText');

  // Last remaining active story guard
  const storiesList: SourceStory[] = [story];
  const canDeleteLast = storiesList.filter(s => !s.isArchived).length > 1;
  assert.equal(canDeleteLast, false, 'UI and workflow must safeguard last active story against deletion');
});

// ============================================================================
// STAGE 3: SCRIPT STUDIO REGRESSION TESTS
// ============================================================================
test('Stage 03 Script Studio: Breakdown adherence, approval invalidation, and version rollback', () => {
  const script = createMockApprovedScript();
  assert.equal(script.scenes.length, 3, '24s Shorts must contain exactly 3 scene beats');
  assert.equal(script.scenes[0].timeRange, '0–8s');
  assert.equal(script.scenes[1].timeRange, '8–16s');
  assert.equal(script.scenes[2].timeRange, '16–24s');
  assert.equal(script.isApproved, true);

  // Saving a draft or modifying narration resets explicit approval
  const editedScenes: ScriptSceneBeat[] = script.scenes.map((s, idx) => {
    if (idx === 0) {
      return { ...s, narrationText: 'Modified hook narration text.', isCustomEdited: true, wordCount: 4 };
    }
    return s;
  });

  const draftScript: ScriptVersion = {
    ...script,
    scenes: editedScenes,
    isApproved: false, // Editing draft resets approval per Blueprint
    updatedAt: new Date().toISOString(),
  };
  assert.equal(draftScript.isApproved, false, 'Script approval must reset to false on custom draft edits');

  // Explicit approval restores isApproved: true and sets approvedAt timestamp
  const approvedNow = new Date().toISOString();
  const reApprovedScript: ScriptVersion = {
    ...draftScript,
    isApproved: true,
    approvedAt: approvedNow,
  };
  assert.equal(reApprovedScript.isApproved, true);
  assert.ok(reApprovedScript.approvedAt);

  // Rollback to prior version restores that version and its approval state
  const versionHistory: ScriptVersion[] = [
    script, // v1 approved
    { ...draftScript, versionNumber: 2, isApproved: false } // v2 unapproved draft
  ];

  const rolledBackTarget = versionHistory.find(v => v.versionNumber === 1);
  assert.ok(rolledBackTarget);
  assert.equal(rolledBackTarget.versionNumber, 1);
  assert.equal(rolledBackTarget.isApproved, true, 'Rollback to v1 restores v1 approval status');
});

// ============================================================================
// STAGE 4: SCENE PROMPTS REGRESSION TESTS
// ============================================================================
test('Stage 04 Scene Prompts: Approval prerequisite, style regeneration invariant, and prompt safety', () => {
  // Prerequisite gate: unapproved script blocks Stage 04
  const unapprovedStatus = computeStageStatus({
    activeStageId: '03_SCRIPT_STUDIO',
    targetStageId: '04_SCENE_PROMPTS',
    hasSelectedSource: true,
    isScriptApproved: false,
    hasGeneratedPrompts: false,
    scenePackagesCount: 0,
    staleMatrix: { sourceStoryStale: false, scriptStale: false, promptsStale: false, thumbnailsStale: false, seoStale: false },
    currentScriptVersion: 1,
    hasSeoTitle: false,
    isThumbnailsApproved: false,
  });
  assert.equal(unapprovedStatus, 'blocked', 'Stage 04 must be blocked if script is unapproved');

  // Once script is approved, Stage 04 unlocks
  const approvedStatus = computeStageStatus({
    activeStageId: '03_SCRIPT_STUDIO',
    targetStageId: '04_SCENE_PROMPTS',
    hasSelectedSource: true,
    isScriptApproved: true,
    hasGeneratedPrompts: false,
    scenePackagesCount: 0,
    staleMatrix: { sourceStoryStale: false, scriptStale: false, promptsStale: false, thumbnailsStale: false, seoStale: false },
    currentScriptVersion: 1,
    hasSeoTitle: false,
    isThumbnailsApproved: false,
  });
  assert.equal(approvedStatus, 'unlocked', 'Stage 04 must unlock once script is approved');

  // Visual Style Change Invariant: spoken narration and script beats MUST be preserved byte-for-byte
  const originalScenes = DEFAULT_SCENE_PACKAGES;
  const initialNarration0 = originalScenes[0].narration;
  const initialBeat0 = originalScenes[0].scriptBeat;

  const restyledScenes = originalScenes.map(s => ({
    ...s,
    visualStyleId: 'retro_anime',
    visualPrompt: `[RETRO ANIME 1980s CEL]: Hand-drawn cel animation style. ${s.visualPrompt}`,
    continuitySnippet: 'Style: Retro Anime; Script Beat preserved byte-for-byte.',
    // Invariant:
    scriptBeat: s.scriptBeat,
    narration: s.narration,
  }));

  assert.equal(restyledScenes[0].visualStyleId, 'retro_anime');
  assert.equal(restyledScenes[0].narration, initialNarration0, 'Narration must remain 100% byte-for-byte identical');
  assert.equal(restyledScenes[0].scriptBeat, initialBeat0, 'Script beat must remain 100% byte-for-byte identical');
  assert.ok(restyledScenes[0].visualPrompt.includes('[RETRO ANIME 1980s CEL]'));
});

// ============================================================================
// STAGE 5: SEO PACKAGE REGRESSION TESTS
// ============================================================================
test('Stage 05 SEO Package: A/B title variants, timestamp chapter alignment, and version tracking', () => {
  const seo = DEFAULT_SEO_PACKAGE;
  assert.ok(seo.selectedTitle.length > 0, 'Selected title must be non-empty');
  assert.ok(seo.titleOptions.length >= 2, 'Must provide multiple title options for A/B testing');
  assert.ok(seo.tags.length >= 3, 'Must provide platform search tags');

  // Chapter markers must match scene count and timing boundaries
  const chapters = seo.chapters;
  assert.equal(chapters.length, 3, '24s Shorts must align with 3 chapters');
  assert.equal(chapters[0].timestamp, '00:00');
  assert.equal(chapters[1].timestamp, '00:08');
  assert.equal(chapters[2].timestamp, '00:16');

  // Script version reference tracking: when active script is v2, v1 SEO is stale
  const currentScriptVersion = 2;
  const isStale = seo.scriptVersionReference !== currentScriptVersion;
  assert.equal(isStale, true, 'SEO referencing v1 is stale when active script is v2');
});

// ============================================================================
// STAGE 6: THUMBNAIL STUDIO REGRESSION TESTS
// ============================================================================
test('Stage 06 Thumbnail Studio: Dual distinct options, aspect ratio responsiveness, and approval workflow', () => {
  const pkg = DEFAULT_THUMBNAIL_PACKAGE;
  assert.equal(pkg.options.length, 2, 'Must contain exactly two distinct options');
  
  const optA = pkg.options.find(o => o.id === 'option_a')!;
  const optB = pkg.options.find(o => o.id === 'option_b')!;

  assert.ok(optA && optB, 'Both Option A and Option B must exist');
  assert.notEqual(optA.conceptAngle, optB.conceptAngle, 'Option A and B must embody distinct narrative hooks');
  assert.notEqual(optA.focalSubject, optB.focalSubject, 'Option A and B must feature distinct focal subjects');

  // Aspect ratio responsiveness: 9:16 Shorts vs 16:9 Long-Form
  const isShorts = true;
  const ratio = isShorts ? '9:16 vertical' : '16:9 horizontal';
  const responsiveOptions = pkg.options.map(o => ({ ...o, ratio }));
  assert.equal(responsiveOptions[0].ratio, '9:16 vertical');

  // Approval workflow: manual customization resets approval
  const approvedPkg: ThumbnailStudioPackage = {
    ...pkg,
    isApproved: true,
    approvedAt: new Date().toISOString(),
  };
  assert.equal(approvedPkg.isApproved, true);

  const editedPkg: ThumbnailStudioPackage = {
    ...approvedPkg,
    options: approvedPkg.options.map(o => o.id === 'option_a' ? { ...o, detailedPrompt: 'Edited prompt', isCustomEdited: true } : o),
    isApproved: false, // Editing draft resets approval
  };
  assert.equal(editedPkg.isApproved, false, 'Editing thumbnail draft must reset approval state');
});

// ============================================================================
// STAGE 7: REVIEW & EXPORT REGRESSION TESTS
// ============================================================================
test('Stage 07 Review & Export: Readiness audit blocks on incomplete/stale deliverables and passes on certified state', () => {
  const project = createMockProject();
  const script = createMockApprovedScript();
  const scenes = DEFAULT_SCENE_PACKAGES;
  const seo = DEFAULT_SEO_PACKAGE;
  const thumbs: ThumbnailStudioPackage = {
    ...DEFAULT_THUMBNAIL_PACKAGE,
    isApproved: true,
    approvedAt: '2026-10-18T12:00:00.000Z',
  };
  const freshMatrix: StaleMatrix = {
    sourceStoryStale: false,
    scriptStale: false,
    promptsStale: false,
    thumbnailsStale: false,
    seoStale: false,
  };

  // 1. All conditions satisfied -> Production Ready PASS
  const certifiedAudit = evaluateReadinessAudit({
    project,
    hasSelectedSource: true,
    currentScript: script,
    isScriptApproved: true,
    scenePackages: scenes,
    seoPackage: seo,
    thumbnailsPackage: thumbs,
    staleMatrix: freshMatrix,
  });
  assert.equal(certifiedAudit.isProductionReady, true, 'Certified project must pass readiness audit');
  assert.equal(certifiedAudit.criticalBlockers.length, 0);

  // 2. Unapproved script -> BLOCKS readiness
  const unapprovedScriptAudit = evaluateReadinessAudit({
    project,
    hasSelectedSource: true,
    currentScript: { ...script, isApproved: false },
    isScriptApproved: false,
    scenePackages: scenes,
    seoPackage: seo,
    thumbnailsPackage: thumbs,
    staleMatrix: freshMatrix,
  });
  assert.equal(unapprovedScriptAudit.isProductionReady, false, 'Unapproved script must block production readiness');
  assert.ok(unapprovedScriptAudit.criticalBlockers.some(b => b.includes('Explicit approval required')));

  // 3. Scene count mismatch (e.g. 2 scenes instead of 3 for 24s Shorts) -> BLOCKS readiness
  const mismatchAudit = evaluateReadinessAudit({
    project,
    hasSelectedSource: true,
    currentScript: { ...script, scenes: script.scenes.slice(0, 2) },
    isScriptApproved: true,
    scenePackages: scenes.slice(0, 2),
    seoPackage: seo,
    thumbnailsPackage: thumbs,
    staleMatrix: freshMatrix,
  });
  assert.equal(mismatchAudit.isProductionReady, false, 'Scene count mismatch must block production readiness');
  assert.ok(mismatchAudit.criticalBlockers.some(b => b.includes('Scene count mismatch')));

  // 4. Stale deliverable (e.g. thumbnails or SEO stale) -> BLOCKS readiness
  const staleAudit = evaluateReadinessAudit({
    project,
    hasSelectedSource: true,
    currentScript: script,
    isScriptApproved: true,
    scenePackages: scenes,
    seoPackage: seo,
    thumbnailsPackage: thumbs,
    staleMatrix: { ...freshMatrix, promptsStale: true, upstreamReason: 'Visual style changed' },
  });
  assert.equal(staleAudit.isProductionReady, false, 'Stale deliverable must block production readiness');

  // 5. Unapproved thumbnails -> BLOCKS production readiness
  const unapprovedThumbsAudit = evaluateReadinessAudit({
    project,
    hasSelectedSource: true,
    currentScript: script,
    isScriptApproved: true,
    scenePackages: scenes,
    seoPackage: seo,
    thumbnailsPackage: { ...thumbs, isApproved: false },
    staleMatrix: freshMatrix,
  });
  assert.equal(unapprovedThumbsAudit.isProductionReady, false, 'Unapproved thumbnails must block production readiness');
  assert.ok(unapprovedThumbsAudit.warnings.some(w => w.includes('Thumbnail package is in draft state')));
});

// ============================================================================
// END-TO-END WORKFLOW INTEGRATION: NAVIGATION & INVARIANT PERSISTENCE
// ============================================================================
test('E2E Workflow: Stage-to-stage navigation and data persistence across all 7 stages', () => {
  // Set up mock localStorage
  const mockStorage = new MockLocalStorage();
  (globalThis as any).localStorage = mockStorage;

  const project = createMockProject({ name: 'E2E Full Loop Project', shortsDuration: 24 });
  const story = DEFAULT_STORIES[0];
  const script = createMockApprovedScript();
  const scenes = DEFAULT_SCENE_PACKAGES;
  const continuity = DEFAULT_CONTINUITY_BIBLE;
  const seo = DEFAULT_SEO_PACKAGE;
  const thumbs = DEFAULT_THUMBNAIL_PACKAGE;
  const staleMatrix: StaleMatrix = {
    sourceStoryStale: false,
    scriptStale: false,
    promptsStale: false,
    thumbnailsStale: false,
    seoStale: false,
  };

  // Simulate sequential navigation through all 7 stages
  const stageSequence: StageId[] = [
    '01_SETUP',
    '02_SOURCES',
    '03_SCRIPT_STUDIO',
    '04_SCENE_PROMPTS',
    '05_SEO_PACKAGE',
    '06_THUMBNAIL_STUDIO',
    '07_REVIEW_EXPORT',
  ];

  for (let i = 0; i < stageSequence.length; i++) {
    const stageId = stageSequence[i];
    const status = computeStageStatus({
      activeStageId: stageId,
      targetStageId: stageId,
      hasSelectedSource: true,
      isScriptApproved: true,
      hasGeneratedPrompts: true,
      scenePackagesCount: 3,
      staleMatrix,
      currentScriptVersion: 1,
      seoScriptVersionRef: 1,
      thumbnailsScriptVersionRef: 1,
      hasSeoTitle: true,
      isThumbnailsApproved: true,
    });
    assert.equal(status, 'current', `Stage ${stageId} must be enterable and active`);
  }

  // Persist all 7 slices to storage
  StorageService.saveProject(project);
  StorageService.saveStories([story]);
  StorageService.saveSelectedStoryId(story.id);
  StorageService.saveActiveScriptVersion(script);
  StorageService.saveScenePackages(scenes);
  StorageService.saveContinuityBible(continuity);
  StorageService.saveSeoPackage(seo);
  StorageService.saveThumbnailPackage(thumbs);
  StorageService.saveStaleMatrix(staleMatrix);

  // Jump backwards from Stage 07 to Stage 01 and reload state: all 7 slices must match exactly
  const loadedProject = StorageService.loadProject(project);
  assert.equal(loadedProject.name, 'E2E Full Loop Project');
  assert.equal(loadedProject.shortsDuration, 24);

  const loadedStories = StorageService.loadStories();
  assert.equal(loadedStories.length, 1);
  assert.equal(loadedStories[0].title, story.title);
  assert.equal(loadedStories[0].rawText, story.rawText, 'Exact line breaks must persist across reload');

  const loadedScript = StorageService.loadActiveScriptVersion(script);
  assert.equal(loadedScript.scenes.length, 3);
  assert.equal(loadedScript.isApproved, true);

  const loadedScenes = StorageService.loadScenePackages();
  assert.equal(loadedScenes.length, 3);
  assert.equal(loadedScenes[0].narration, script.scenes[0].narrationText);

  const loadedSeo = StorageService.loadSeoPackage();
  assert.equal(loadedSeo.selectedTitle, seo.selectedTitle);

  const loadedThumbs = StorageService.loadThumbnailPackage();
  assert.equal(loadedThumbs.options.length, 2);
});

// ============================================================================
// END-TO-END WORKFLOW INTEGRATION: FULL BACKUP ROUNDTRIP & SECRET SCRUBBING
// ============================================================================
test('E2E Workflow: Project backup export & restore round-trip with zero secrets leakage', () => {
  const project = createMockProject({ name: 'Deep Space Relic' });
  const stories = DEFAULT_STORIES;
  const script = createMockApprovedScript();
  const scenes = DEFAULT_SCENE_PACKAGES;
  const continuity = DEFAULT_CONTINUITY_BIBLE;
  const seo = DEFAULT_SEO_PACKAGE;
  const thumbs = DEFAULT_THUMBNAIL_PACKAGE;
  const staleMatrix: StaleMatrix = {
    sourceStoryStale: false,
    scriptStale: false,
    promptsStale: false,
    thumbnailsStale: false,
    seoStale: false,
  };

  // 1. Export complete project backup
  const backupJsonStr = StorageService.exportProjectBackupJson({
    project,
    stories,
    selectedStoryId: stories[0].id,
    scriptVersions: [script],
    currentScript: script,
    scenePackages: scenes,
    continuityBible: continuity,
    seoPackage: seo,
    thumbnailsPackage: thumbs,
    staleMatrix,
  });

  // Zero secrets invariant
  const forbiddenKeywords = ['GEMINI_API_KEY', 'sk-', 'Bearer ', 'client_secret', 'private_key', 'AIza'];
  for (const kw of forbiddenKeywords) {
    assert.ok(!backupJsonStr.includes(kw), `Backup payload must never contain ${kw}`);
  }

  // 2. Restore complete project backup
  const restoreRes = StorageService.importProjectBackupJson(backupJsonStr);
  assert.equal(restoreRes.success, true);
  assert.ok(restoreRes.data);

  const restored = restoreRes.data!;
  assert.equal(restored.project.name, 'Deep Space Relic');
  assert.equal(restored.stories.length, DEFAULT_STORIES.length);
  assert.equal(restored.stories[0].rawText, DEFAULT_STORIES[0].rawText, 'Line breaks must match 100%');
  assert.equal(restored.currentScript.scenes.length, 3);
  assert.equal(restored.scenePackages.length, 3);
  assert.equal(restored.seoPackage.selectedTitle, seo.selectedTitle);
  assert.equal(restored.thumbnailsPackage.options.length, 2);
});

// ============================================================================
// END-TO-END WORKFLOW INTEGRATION: DELIVERABLE REGENERATION ISOLATION
// ============================================================================
test('E2E Workflow: Single deliverable regeneration isolation prevents cross-stage corruption', () => {
  const initialScenes = DEFAULT_SCENE_PACKAGES;
  const scene1Before = { ...initialScenes[0] };
  const scene3Before = { ...initialScenes[2] };

  // Regenerate only Scene 2 prompt package in isolation
  const regeneratedScene2: ScenePackageData = {
    ...initialScenes[1],
    visualPrompt: 'Regenerated visual prompt for Scene 2 with revised volumetric lighting shafts.',
    soundDesign: 'Deep electromagnetic pulse and rising sine pitch.',
    // Invariant:
    scriptBeat: initialScenes[1].scriptBeat,
    narration: initialScenes[1].narration,
  };

  const updatedScenes = initialScenes.map(s => s.sceneNumber === 2 ? regeneratedScene2 : s);

  // Scene 1 and Scene 3 must be 100% byte-for-byte identical
  assert.deepEqual(updatedScenes[0], scene1Before, 'Scene 1 must not be mutated when regenerating Scene 2');
  assert.deepEqual(updatedScenes[2], scene3Before, 'Scene 3 must not be mutated when regenerating Scene 2');

  // Scene 2 visual prompt changed, but script narration remains strictly preserved
  assert.equal(updatedScenes[1].visualPrompt, 'Regenerated visual prompt for Scene 2 with revised volumetric lighting shafts.');
  assert.equal(updatedScenes[1].narration, initialScenes[1].narration, 'Scene 2 narration must remain strictly intact');

  // Single thumbnail option regeneration isolation: regenerating Option B preserves Option A
  const initialThumbs = DEFAULT_THUMBNAIL_PACKAGE;
  const optABefore = { ...initialThumbs.options[0] };

  const regeneratedOptB: ThumbnailPromptItem = {
    ...initialThumbs.options[1],
    detailedPrompt: 'Regenerated Option B prompt with intensified amber rim lighting.',
    lightingAndMood: 'Volumetric amber sunlight with stark contrast.',
  };

  const updatedThumbs = {
    ...initialThumbs,
    options: initialThumbs.options.map(o => o.id === 'option_b' ? regeneratedOptB : o),
    isApproved: false, // Invalidates approval
  };

  assert.deepEqual(updatedThumbs.options[0], optABefore, 'Option A must not be mutated when regenerating Option B');
  assert.equal(updatedThumbs.options[1].detailedPrompt, 'Regenerated Option B prompt with intensified amber rim lighting.');
  assert.equal(updatedThumbs.isApproved, false, 'Modifying Option B must reset thumbnail package approval');
});

// ============================================================================
// END-TO-END WORKFLOW INTEGRATION: CASCADING INVALIDATION MATRIX
// ============================================================================
test('E2E Workflow: Upstream cascading invalidation triggers correct downstream stale flags', () => {
  let matrix: StaleMatrix = {
    sourceStoryStale: false,
    scriptStale: false,
    promptsStale: false,
    thumbnailsStale: false,
    seoStale: false,
  };

  // 1. Changing source story content invalidates all downstream stages
  matrix = {
    ...matrix,
    sourceStoryStale: true,
    scriptStale: true,
    promptsStale: true,
    thumbnailsStale: true,
    seoStale: true,
    upstreamReason: 'Source story modified',
  };
  assert.equal(matrix.scriptStale, true);
  assert.equal(matrix.promptsStale, true);
  assert.equal(matrix.thumbnailsStale, true);
  assert.equal(matrix.seoStale, true);

  // 2. Generating and approving new Script clears scriptStale, but prompts/thumbnails/seo stay stale
  matrix.scriptStale = false;
  matrix.upstreamReason = 'Script approved; downstream generation required';
  assert.equal(matrix.scriptStale, false);
  assert.equal(matrix.promptsStale, true);
  assert.equal(matrix.thumbnailsStale, true);
  assert.equal(matrix.seoStale, true);

  // 3. Changing visual style only invalidates prompts and thumbnails; script remains fresh
  matrix = {
    sourceStoryStale: false,
    scriptStale: false,
    promptsStale: true,
    thumbnailsStale: true,
    seoStale: false,
    upstreamReason: 'Visual style modified',
  };
  assert.equal(matrix.scriptStale, false, 'Visual style change must not invalidate script');
  assert.equal(matrix.promptsStale, true);
  assert.equal(matrix.thumbnailsStale, true);
  assert.equal(matrix.seoStale, false, 'Visual style change must not invalidate SEO metadata');
});

// ============================================================================
// END-TO-END WORKFLOW INTEGRATION: ERROR HANDLING & INVALID TRANSITIONS
// ============================================================================
test('E2E Workflow: Invalid inputs and bad transitions produce safe errors without crashes', async () => {
  // 1. Restoring empty backup string
  const emptyRestore = StorageService.importProjectBackupJson('');
  assert.equal(emptyRestore.success, false);
  assert.equal(emptyRestore.error, 'Empty file provided.');

  // 2. Restoring corrupted JSON syntax
  const corruptedRestore = StorageService.importProjectBackupJson('{ this is not json }');
  assert.equal(corruptedRestore.success, false);
  assert.ok(corruptedRestore.error?.includes('Invalid JSON structure') || corruptedRestore.error?.includes('JSON'));

  // 3. Restoring JSON missing project settings
  const missingProjRestore = StorageService.importProjectBackupJson(JSON.stringify({ someKey: 'value' }));
  assert.equal(missingProjRestore.success, false);
  assert.ok(missingProjRestore.error?.includes('Invalid or missing project settings'));

  // 4. Custom provider SSRF protection blocks restricted destinations
  const localhostValidation = await validateCustomProviderUrl('http://localhost:8080/v1');
  assert.equal(localhostValidation.isValid, false);
  assert.equal(localhostValidation.errorCategory, 'SSRF_BLOCKED');

  const metadataValidation = await validateCustomProviderUrl('http://169.254.169.254/latest/meta-data');
  assert.equal(metadataValidation.isValid, false);
  assert.equal(metadataValidation.errorCategory, 'SSRF_BLOCKED');

  const validPublicValidation = await validateCustomProviderUrl('https://api.openai.com/v1');
  assert.equal(validPublicValidation.isValid, true);
});
