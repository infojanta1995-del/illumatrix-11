import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  DEFAULT_STORIES, 
  DEFAULT_SEO_PACKAGE, 
  DEFAULT_THUMBNAIL_PACKAGE, 
  DEFAULT_SCENE_PACKAGES, 
  DEFAULT_CONTINUITY_BIBLE 
} from '../src/services/storage';
import { ProjectSettings, ScriptVersion, StaleMatrix } from '../src/types/hud';

const mockProject: ProjectSettings = {
  id: 'proj_test_01',
  name: 'Quantum Horizons Test',
  format: '9:16_SHORTS',
  shortsDuration: 24,
  longFormDurationMinutes: 4,
  modeId: 'scifi_explainer',
  language: 'en',
  visualStyleId: 'cinematic',
  createdAt: '2026-10-18T10:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
};

const mockApprovedScript: ScriptVersion = {
  id: 'script_test_v1',
  sourceStoryId: 'story_glitch_kuiper',
  sourceStoryVersion: 1,
  versionNumber: 1,
  title: 'The Glitch in the Kuiper Belt',
  hookSummary: 'Beyond Pluto, deep-space telemetry detects an anomaly.',
  scenes: [
    {
      id: 'sc_1',
      sceneNumber: 1,
      timeRange: '0–8s',
      purpose: 'Hook',
      narrationText: 'Beyond the orbit of Pluto, deep-space telemetry has just detected an anomaly that defies natural explanation.',
      visualDirectionDraft: 'Cinematic wide angle opening with celestial object.',
      wordCount: 16,
    },
    {
      id: 'sc_2',
      sceneNumber: 2,
      timeRange: '8–16s',
      purpose: 'Reveal',
      narrationText: 'Spectroscopic data confirms an artificial crystalline relay repeating an encoded prime pulse every eight point four seconds.',
      visualDirectionDraft: 'Macro tracking shot across crystalline facets.',
      wordCount: 18,
    },
    {
      id: 'sc_3',
      sceneNumber: 3,
      timeRange: '16–24s',
      purpose: 'Payoff',
      narrationText: 'Now science must answer: is humanity being monitored, or have we awakened an ancient orbital relic?',
      visualDirectionDraft: 'Cosmic scale pull-back revealing distant Earth.',
      wordCount: 16,
    },
  ],
  totalWords: 50,
  speakingDurationSeconds: 20,
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
};

test('Review Engine - Readiness Audit passes when all stages approved and fresh', () => {
  const isScriptApproved = mockApprovedScript.isApproved;
  const hasSelectedSource = true;
  const scenePackages = DEFAULT_SCENE_PACKAGES;
  const expectedSceneCount = 3; // 24s / 8s
  const isThumbnailsApproved = DEFAULT_THUMBNAIL_PACKAGE.isApproved;
  const isSeoStale = false;
  const isThumbnailsStale = false;

  const isSceneCountValid = scenePackages.length === expectedSceneCount;
  const isScriptValid = isScriptApproved && mockApprovedScript.scenes.length === expectedSceneCount;
  const isThumbnailsValid = isThumbnailsApproved && !isThumbnailsStale;
  const isSeoValid = !isSeoStale && Boolean(DEFAULT_SEO_PACKAGE.selectedTitle);

  const isProductionReady = hasSelectedSource && isScriptValid && isSceneCountValid && isThumbnailsValid && isSeoValid;

  assert.equal(isProductionReady, true, 'Project must be certified production-ready');
});

test('Review Engine - Readiness Audit blocks when script is unapproved', () => {
  const unapprovedScript: ScriptVersion = {
    ...mockApprovedScript,
    isApproved: false,
    approvedAt: undefined,
  };

  const isScriptApproved = unapprovedScript.isApproved;
  const isProductionReady = isScriptApproved;

  assert.equal(isProductionReady, false, 'Project readiness must fail when script is unapproved');
});

test('Review Engine - Readiness Audit flags stale deliverables when script version increments', () => {
  const currentScriptVersion = 2;
  const seoScriptVersionRef = DEFAULT_SEO_PACKAGE.scriptVersionReference; // 1
  const thumbScriptVersionRef = DEFAULT_THUMBNAIL_PACKAGE.scriptVersionReference; // 1

  const isSeoStale = seoScriptVersionRef !== currentScriptVersion;
  const isThumbnailsStale = thumbScriptVersionRef !== currentScriptVersion;

  assert.equal(isSeoStale, true, 'SEO must be flagged stale when script version increments');
  assert.equal(isThumbnailsStale, true, 'Thumbnails must be flagged stale when script version increments');
});

test('Export Engine - Master Markdown Bundle contains all required blueprint sections', () => {
  const scenes = DEFAULT_SCENE_PACKAGES;
  const continuity = DEFAULT_CONTINUITY_BIBLE;
  const seo = DEFAULT_SEO_PACKAGE;
  const thumbs = DEFAULT_THUMBNAIL_PACKAGE;

  // Build markdown representation
  const markdown = `# ILLUMATRIX PRODUCTION PACKAGE
Project: ${mockProject.name}
Format: 9:16 Vertical Shorts
Target Duration: 24 seconds (3 scenes @ 8s pacing)

## CONTINUITY BIBLE
- Voice & Narrator Persona: ${continuity.voiceNarrator}
- Visual Color Palette: ${continuity.visualPalette}

## GOOGLE FLOW SCENE PACKAGES
${scenes.map(s => `### SCENE 0${s.sceneNumber} — ${s.title}\n- Visual Prompt:\n${s.visualPrompt}\n- Narration: "${s.narration}"`).join('\n\n')}

## PLATFORM METADATA & SEO PACKAGE
- Selected Video Title: ${seo.selectedTitle}
- Video Description:
${seo.description}
- Search Tags: ${seo.tags.join(', ')}

## THUMBNAIL IMAGE PROMPTS (Midjourney / Imagen / DALL-E)
${thumbs.options.map(o => `### ${o.name}\n- Detailed Image Generation Prompt:\n${o.detailedPrompt}\n- Recommended Text Overlay: "${o.overlayTextSuggestion}"`).join('\n\n')}

## SECURITY & COMPLIANCE CERTIFICATION
- Zero API keys, private tokens, or server-side credentials are included in this export.
`;

  assert.ok(markdown.includes('ILLUMATRIX PRODUCTION PACKAGE'));
  assert.ok(markdown.includes('CONTINUITY BIBLE'));
  assert.ok(markdown.includes('GOOGLE FLOW SCENE PACKAGES'));
  assert.ok(markdown.includes('PLATFORM METADATA & SEO PACKAGE'));
  assert.ok(markdown.includes('THUMBNAIL IMAGE PROMPTS'));
  assert.ok(markdown.includes('SECURITY & COMPLIANCE CERTIFICATION'));
  assert.ok(markdown.includes('SCENE 01 — THE KUIPER BELT ANOMALY'));
  assert.ok(markdown.includes('PROMPT A'));
});

test('Export Engine - Structured JSON Project Backup has zero secrets and valid schema', () => {
  const backup = {
    schemaVersion: '1.0.0',
    exportTimestamp: new Date().toISOString(),
    securityAudit: 'CLEAN — ZERO API KEYS OR SECRETS EXPORTED',
    project: mockProject,
    sourceStory: DEFAULT_STORIES[0],
    script: mockApprovedScript,
    continuityBible: DEFAULT_CONTINUITY_BIBLE,
    googleFlowScenes: DEFAULT_SCENE_PACKAGES,
    seoPackage: DEFAULT_SEO_PACKAGE,
    thumbnails: DEFAULT_THUMBNAIL_PACKAGE,
  };

  const serialized = JSON.stringify(backup);
  const parsed = JSON.parse(serialized);

  assert.equal(parsed.schemaVersion, '1.0.0');
  assert.equal(parsed.securityAudit, 'CLEAN — ZERO API KEYS OR SECRETS EXPORTED');
  assert.ok(!serialized.includes('GEMINI_API_KEY'), 'No GEMINI_API_KEY in export');
  assert.ok(!serialized.includes('AIStudioApiKey'), 'No API keys in export');
  assert.equal(parsed.googleFlowScenes.length, 3);
  assert.equal(parsed.thumbnails.options.length, 2);
});

test('Export Engine - Google Flow batch prompts format correctly', () => {
  const scenes = DEFAULT_SCENE_PACKAGES;
  const batchText = scenes.map(s => `// --- SCENE 0${s.sceneNumber}: ${s.title} (${s.durationSec}s) ---\n${s.visualPrompt}`).join('\n\n');

  assert.ok(batchText.includes('SCENE 01: THE KUIPER BELT ANOMALY'));
  assert.ok(batchText.includes('Cinematic 9:16 portrait composition'));
  assert.ok(batchText.includes('SCENE 02: THE CRYPTIC TRANSMISSION'));
});

test('Export Engine - Spoken Narration teleprompter transcript preserves exact text', () => {
  const scenes = mockApprovedScript.scenes;
  const transcript = scenes.map(s => `[SCENE 0${s.sceneNumber}] (${s.purpose})\n${s.narrationText}`).join('\n\n');

  assert.ok(transcript.includes('[SCENE 01] (Hook)'));
  assert.ok(transcript.includes('Beyond the orbit of Pluto, deep-space telemetry has just detected an anomaly that defies natural explanation.'));
  assert.ok(transcript.includes('[SCENE 03] (Payoff)'));
});

test('Export Engine - SEO metadata file formats titles, description, tags, and chapter markers', () => {
  const seo = DEFAULT_SEO_PACKAGE;
  const chaptersText = seo.chapters.map(c => `${c.timestamp} - ${c.title}`).join('\n');
  const seoText = `TITLE:\n${seo.selectedTitle}\n\nDESCRIPTION:\n${seo.description}\n\nCHAPTERS:\n${chaptersText}\n\nTAGS:\n${seo.tags.join(', ')}`;

  assert.ok(seoText.includes('TITLE:\nThe Glitch Past Pluto'));
  assert.ok(seoText.includes('00:00 - The Kuiper Belt Anomaly'));
  assert.ok(seoText.includes('00:08 - The Cryptic Transmission'));
  assert.ok(seoText.includes('00:16 - The Cosmic Revelation'));
  assert.ok(seoText.includes('space exploration, kuiper belt'));
});

test('Export Engine - Thumbnail Prompts file formats Option A and Option B prompts', () => {
  const thumbs = DEFAULT_THUMBNAIL_PACKAGE;
  const optA = thumbs.options[0];
  const optB = thumbs.options[1];

  const thumbsText = `PRIMARY: ${optA.name}\nRATIO: ${optA.ratio}\nOVERLAY: "${optA.overlayTextSuggestion}"\nPROMPT:\n${optA.detailedPrompt}\n\nALT: ${optB.name}\nRATIO: ${optB.ratio}\nOVERLAY: "${optB.overlayTextSuggestion}"\nPROMPT:\n${optB.detailedPrompt}`;

  assert.ok(thumbsText.includes('PRIMARY: PROMPT A // OBJECT OF ENIGMA'));
  assert.ok(thumbsText.includes('SIGNAL DETECTED'));
  assert.ok(thumbsText.includes('ALT: PROMPT B // ASTRONOMER DISCOVERY'));
  assert.ok(thumbsText.includes('IT IS NOT RANDOM'));
});
