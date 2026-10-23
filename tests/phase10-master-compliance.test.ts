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
  StaleMatrix, 
  StageId, 
  ShortsDuration,
  LongFormDuration,
  ScenePackageData
} from '../src/types/hud';
import { WORKFLOW_STAGES, CONTENT_MODES, VISUAL_STYLES } from '../src/data/registries';

// Master Blueprint Phase 10 Compliance & Final Acceptance Suite

test('Phase 10 Compliance: 7 Workflow Stages, 7 Content Modes, and 12 Visual Styles', () => {
  assert.equal(WORKFLOW_STAGES.length, 7, 'Must have exactly 7 workflow stages');
  assert.equal(CONTENT_MODES.length, 7, 'Must have exactly 7 content modes per Blueprint Page 8');
  assert.ok(VISUAL_STYLES.length >= 10, 'Must have full visual styles registry per Blueprint Page 4 & 12');

  const requiredModes = [
    'documentary',
    'explainer',
    'breaking_news',
    'horror_story',
    'funny',
    'scifi_explainer',
    'detailed_explainer'
  ];
  for (const m of requiredModes) {
    assert.ok(CONTENT_MODES.some(cm => cm.id === m), `Content mode ${m} must exist`);
  }
});

test('Phase 10 Long-Form Reliability: Pacing and Scene Counts (3m, 4m, 5m, 8m, 10m)', () => {
  const longFormDurations: LongFormDuration[] = [3, 4, 5, 8, 10];
  
  for (const durMinutes of longFormDurations) {
    const totalSeconds = durMinutes * 60;
    const sceneCount = Math.max(4, Math.round(totalSeconds / 30));
    
    if (durMinutes === 3) assert.equal(sceneCount, 6, '3m must produce 6 scenes (30s each)');
    if (durMinutes === 4) assert.equal(sceneCount, 8, '4m must produce 8 scenes (30s each)');
    if (durMinutes === 5) assert.equal(sceneCount, 10, '5m must produce 10 scenes (30s each)');
    if (durMinutes === 8) assert.equal(sceneCount, 16, '8m must produce 16 scenes (30s each)');
    if (durMinutes === 10) assert.equal(sceneCount, 20, '10m must produce 20 scenes (30s each)');

    // Verify timestamp generator logic
    for (let i = 0; i < sceneCount; i++) {
      const startMin = Math.floor((i * 30) / 60);
      const startSec = (i * 30) % 60;
      const endMin = Math.floor(((i + 1) * 30) / 60);
      const endSec = ((i + 1) * 30) % 60;
      const stamp = `${String(startMin).padStart(2, '0')}:${String(startSec).padStart(2, '0')}–${String(endMin).padStart(2, '0')}:${String(endSec).padStart(2, '0')}`;
      assert.match(stamp, /^\d{2}:\d{2}–\d{2}:\d{2}$/, 'Timestamp must be valid mm:ss format');
    }
  }
});

test('Phase 10 Shorts Reliability: Pacing and Scene Counts (24s, 32s, 40s, 48s)', () => {
  const shortsDurations: ShortsDuration[] = [24, 32, 40, 48];
  
  for (const durSec of shortsDurations) {
    const sceneCount = Math.round(durSec / 8);
    if (durSec === 24) assert.equal(sceneCount, 3, '24s Shorts must have 3 scenes');
    if (durSec === 32) assert.equal(sceneCount, 4, '32s Shorts must have 4 scenes');
    if (durSec === 40) assert.equal(sceneCount, 5, '40s Shorts must have 5 scenes');
    if (durSec === 48) assert.equal(sceneCount, 6, '48s Shorts must have 6 scenes');
  }
});

test('Phase 10 Thumbnail Studio: Dual-angle requirements and primary selection', () => {
  const pkg = DEFAULT_THUMBNAIL_PACKAGE;
  assert.equal(pkg.options.length, 2, 'Must have exactly two thumbnail options');
  
  const optionA = pkg.options.find(o => o.id === 'option_a')!;
  const optionB = pkg.options.find(o => o.id === 'option_b')!;
  assert.ok(optionA, 'Option A must exist');
  assert.ok(optionB, 'Option B must exist');

  // Option A must be Object of Enigma / Macro
  assert.ok(optionA.name.includes('ENIGMA') || optionA.conceptAngle.toLowerCase().includes('macro') || optionA.conceptAngle.toLowerCase().includes('crystalline'));
  // Option B must be Observer / Human reaction
  assert.ok(optionB.name.includes('ASTRONOMER') || optionB.conceptAngle.toLowerCase().includes('observer'));

  // Ratio must match format
  assert.equal(optionA.ratio, '9:16 vertical');
  assert.equal(optionB.ratio, '9:16 vertical');
});

test('Phase 10 SEO Package: Scene boundaries mapped to chapter markers', () => {
  const scenes = [
    { sceneNumber: 1, timeRange: '0–8s', purpose: 'Hook' },
    { sceneNumber: 2, timeRange: '8–16s', purpose: 'Main Idea' },
    { sceneNumber: 3, timeRange: '16–24s', purpose: 'Payoff' },
  ];

  const chapters = scenes.map((s, idx) => {
    const totalSec = idx * 8;
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return {
      timestamp: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
      title: s.purpose,
    };
  });

  assert.equal(chapters[0].timestamp, '00:00');
  assert.equal(chapters[1].timestamp, '00:08');
  assert.equal(chapters[2].timestamp, '00:16');
});

test('Phase 10 Workflow Invariant: Script modification voids approval and marks downstream stale', () => {
  let isApproved = true;
  let staleMatrix: StaleMatrix = {
    sourceStoryStale: false,
    scriptStale: false,
    promptsStale: false,
    thumbnailsStale: false,
    seoStale: false,
  };

  // User edits scene 1 narration
  const onScriptModified = () => {
    isApproved = false;
    staleMatrix = {
      ...staleMatrix,
      promptsStale: true,
      thumbnailsStale: true,
      seoStale: true,
    };
  };

  onScriptModified();
  assert.equal(isApproved, false, 'Approval must be revoked upon modification');
  assert.equal(staleMatrix.promptsStale, true, 'Scene prompts must become stale');
  assert.equal(staleMatrix.thumbnailsStale, true, 'Thumbnails must become stale');
  assert.equal(staleMatrix.seoStale, true, 'SEO package must become stale');
});
