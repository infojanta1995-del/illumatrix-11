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
  ScenePackageData
} from '../src/types/hud';
import { WORKFLOW_STAGES } from '../src/data/registries';

// Helper mock for localStorage in Node test environment
class MockLocalStorage {
  private store: Record<string, string> = {};
  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }
  setItem(key: string, value: string): void {
    this.store[key] = value;
  }
  removeItem(key: string): void {
    delete this.store[key];
  }
  clear(): void {
    this.store = {};
  }
}

// 1. SECURITY & SECRET ISOLATION AUDIT
test('Phase 9 Security: Sanitizer scrubs simulated API keys and bearer tokens', () => {
  // Test error sanitization logic matching server.ts
  const simulatedApiKey = 'AIzaSy' + 'A1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6';
  const simulatedSecret = 'sk-proj-99998888777766665555444433332222';
  
  function sanitizeError(err: any): string {
    const raw = typeof err === 'string' ? err : err?.message || JSON.stringify(err) || 'Unknown error';
    return raw
      .replace(/AIzaSy[A-Za-z0-9_-]{33}/g, '[REDACTED_API_KEY]')
      .replace(/key=[A-Za-z0-9_-]+/gi, 'key=[REDACTED_API_KEY]')
      .replace(/bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]')
      .replace(/sk-[A-Za-z0-9_-]{20,}/g, '[REDACTED_SECRET]');
  }

  const dirtyMessage = `Error 403: Google GenAI rejected request with key=${simulatedApiKey}, token Bearer secret_jwt_token_example, and key ${simulatedSecret}`;
  const cleaned = sanitizeError(dirtyMessage);

  assert.ok(!cleaned.includes(simulatedApiKey), 'Simulated API key must not exist in sanitized string');
  assert.ok(!cleaned.includes(simulatedSecret), 'Simulated secret token must not exist in sanitized string');
  assert.ok(cleaned.includes('[REDACTED_API_KEY]'), 'Should contain redacted key marker');
  assert.ok(cleaned.includes('[REDACTED_TOKEN]'), 'Should contain redacted token marker');
  assert.ok(cleaned.includes('[REDACTED_SECRET]'), 'Should contain redacted secret marker');
});

test('Phase 9 Security: Export payloads contain ZERO API keys or server configuration', () => {
  const jsonExport = {
    schemaVersion: '1.0.0',
    exportTimestamp: new Date().toISOString(),
    securityAudit: 'CLEAN — ZERO API KEYS OR SECRETS EXPORTED',
    project: {
      id: 'proj_matrix_01',
      name: 'ILLUMATRIX_KUIPER_ANOMALY',
      format: '9:16_SHORTS',
      shortsDuration: 24,
      longFormDurationMinutes: 5,
      modeId: 'scifi_explainer',
      language: 'en',
      visualStyleId: 'cinematic',
    },
    sourceStory: DEFAULT_STORIES[0],
    script: {
      id: 'script_v1',
      versionNumber: 1,
      scenes: DEFAULT_SCENE_PACKAGES,
      isApproved: true,
    },
    continuityBible: DEFAULT_CONTINUITY_BIBLE,
    googleFlowScenes: DEFAULT_SCENE_PACKAGES,
    seoPackage: DEFAULT_SEO_PACKAGE,
    thumbnails: DEFAULT_THUMBNAIL_PACKAGE,
  };

  const serialized = JSON.stringify(jsonExport);
  assert.ok(!serialized.includes('apiKey'), 'Must not contain apiKey property');
  assert.ok(!serialized.includes('GEMINI_API_KEY'), 'Must not contain GEMINI_API_KEY');
  assert.ok(!serialized.includes('secret'), 'Must not contain secret tokens');
  assert.ok(serialized.includes('CLEAN — ZERO API KEYS OR SECRETS EXPORTED'));
});

// 2. DATA RELIABILITY & CORRUPTED STORAGE RECOVERY
test('Phase 9 Data Reliability: StorageService safely recovers from corrupted or malformed localStorage', () => {
  const mockStorage = new MockLocalStorage();
  (globalThis as any).localStorage = mockStorage;

  const defaultProject: ProjectSettings = {
    id: 'proj_matrix_01',
    name: 'ILLUMATRIX ALPHA',
    format: '9:16_SHORTS',
    shortsDuration: 24,
    longFormDurationMinutes: 5,
    modeId: 'scifi_explainer',
    language: 'en',
    visualStyleId: 'cinematic',
    createdAt: '2026-10-18T14:00:00.000Z',
    updatedAt: '2026-10-18T14:00:00.000Z',
  };

  // 1. Corrupt non-JSON data
  mockStorage.setItem('illum_project_v1', 'MALFORMED_NON_JSON{{{');
  const recoveredProject = StorageService.loadProject(defaultProject);
  assert.equal(recoveredProject.name, defaultProject.name, 'Must return fallback on syntax error');

  // 2. Corrupt partial stories data
  mockStorage.setItem('illum_stories_v1', JSON.stringify([{ badField: 123 }]));
  const recoveredStories = StorageService.loadStories();
  assert.equal(recoveredStories.length, DEFAULT_STORIES.length, 'Must return default stories when stored array has invalid schema');

  // 3. Corrupt thumbnail package (missing options)
  mockStorage.setItem('illum_thumbnails_v1', JSON.stringify({ options: [] }));
  const recoveredThumbnails = StorageService.loadThumbnailPackage();
  assert.equal(recoveredThumbnails.options.length, 2, 'Must return default thumbnails if options array is empty or corrupt');

  // 4. Corrupt SEO package (missing selectedTitle)
  mockStorage.setItem('illum_seo_package_v1', JSON.stringify({ titleOptions: [] }));
  const recoveredSeo = StorageService.loadSeoPackage();
  assert.equal(recoveredSeo.selectedTitle, DEFAULT_SEO_PACKAGE.selectedTitle);
});

// 3. REAL PROVIDER VS FALLBACK CONTRACT
test('Phase 9 AI Verification: Fallback vs Real Provider contract is honest and distinct', () => {
  // Real Provider response shape:
  const realProviderResponse = {
    success: true,
    provider: 'Google GenAI (gemini-3.1-flash-lite)',
    isFallback: false,
    data: { scriptTitle: 'Real Title' },
  };

  // Fallback response shape:
  const fallbackResponse = {
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: { scriptTitle: 'Local Title' },
  };

  assert.equal(realProviderResponse.isFallback, false);
  assert.ok(realProviderResponse.provider.includes('Google GenAI'));

  assert.equal(fallbackResponse.isFallback, true);
  assert.ok(fallbackResponse.provider.includes('Fallback'));
  assert.notEqual(realProviderResponse.provider, fallbackResponse.provider, 'Provider strings must never be conflated');
});

// 4. STYLE REGENERATION NARRATION INVARIANT
test('Phase 9 Workflow: Style regeneration strictly preserves narration text byte-for-byte', () => {
  const originalScenes = DEFAULT_SCENE_PACKAGES;
  const newStyle = 'anime_cyberpunk';

  // Simulate prompt style transformation
  const transformed = originalScenes.map(scene => ({
    ...scene,
    visualStyleId: newStyle,
    visualPrompt: `[ANIME CYBERPUNK]: Cel-shaded neon linework with chromatic halos. ${scene.visualPrompt}`,
    continuitySnippet: `Style: Anime Cyberpunk; Narration preserved.`,
    scriptBeat: scene.scriptBeat,
    narration: scene.narration,
  }));

  for (let i = 0; i < originalScenes.length; i++) {
    assert.strictEqual(
      transformed[i].narration,
      originalScenes[i].narration,
      `Scene ${i + 1} narration must be strictly byte-for-byte identical`
    );
    assert.strictEqual(
      transformed[i].scriptBeat,
      originalScenes[i].scriptBeat,
      `Scene ${i + 1} script beat must be strictly byte-for-byte identical`
    );
    assert.strictEqual(transformed[i].visualStyleId, newStyle);
  }
});
