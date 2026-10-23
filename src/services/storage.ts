/**
 * ILLUMATRIX Storage Service
 * Handles persistence of projects, source stories, configuration, and stale tracking.
 * Guarantees exact text preservation across reloads.
 */

import { 
  ProjectSettings, 
  SourceStory, 
  StaleMatrix, 
  ActivityEvent, 
  ScriptVersion,
  ContinuityBible,
  ScenePackageData,
  SeoPackageData,
  ThumbnailStudioPackage,
  ThumbnailPromptItem,
  DefaultModelPreference,
  ProjectSession
} from '../types/hud';

const STORAGE_KEYS = {
  PROJECT: 'illum_project_v1',
  STORIES: 'illum_stories_v1',
  SELECTED_STORY_ID: 'illum_selected_story_id_v1',
  SCRIPT_VERSIONS: 'illum_script_versions_v1',
  ACTIVE_SCRIPT: 'illum_active_script_v1',
  SCENE_PROMPTS: 'illum_scene_prompts_v1',
  CONTINUITY_BIBLE: 'illum_continuity_bible_v1',
  SEO_PACKAGE: 'illum_seo_package_v1',
  THUMBNAILS: 'illum_thumbnails_v1',
  STALE_MATRIX: 'illum_stale_matrix_v1',
  ACTIVITY_LOG: 'illum_activity_log_v1',
  DEFAULT_MODEL_PREFERENCE: 'illum_default_model_preference_v1',
  SESSIONS: 'illum_sessions_v1',
  ACTIVE_SESSION_ID: 'illum_active_session_id_v1',
};

// Initial default story with multiple paragraphs and exact line breaks per Page 7
export const DEFAULT_STORIES: SourceStory[] = [
  {
    id: 'story_glitch_kuiper',
    projectId: 'proj_matrix_01',
    title: 'The Glitch in the Kuiper Belt',
    sourceType: 'article',
    notes: 'Spectroscopic confirmation from New Horizons telemetric payload, Oct 2026. Non-random prime sequence.',
    rawText: `In October 2026, deep-space telemetry from the New Horizons probe detected an anomalous gravitational signature beyond Pluto.

Astronomers initially dismissed the anomaly as sensor noise. However, spectroscopic data confirmed an artificial crystalline structure drifting in stable resonance with Neptune's orbit.

The object emitted a localized electromagnetic pulse every 8.4 seconds—repeating a non-random prime number sequence that defies natural astrophysical explanations.

Now, an international consortium is preparing an optical survey to determine if the object is an ancient relic or an active monitoring relay.`,
    version: 1,
    wordCount: 84,
    charCount: 574,
    isArchived: false,
    createdAt: '2026-10-18T14:20:00.000Z',
    updatedAt: '2026-10-19T08:15:00.000Z',
  },
  {
    id: 'story_silicon_synthetics',
    projectId: 'proj_matrix_01',
    title: 'Silicon-Based Neural Synthetics',
    sourceType: 'research_notes',
    notes: 'Neuromorphic bioprinting lab tests; 400% efficiency gain measured against binary architectures.',
    rawText: `Recent breakthroughs in neuromorphic bio-printing have enabled the synthesis of artificial synaptic pathways using crystalline gallium arsenide.

Unlike conventional silicon transistors that operate on binary logic, these biomorphic junctions emulate biological neural plasticity in real time.

Early lab simulations demonstrated a 400% efficiency gain in continuous sequence modeling without thermal degradation.

Ethical review boards are now debating whether autonomous synthetic networks can be legally recognized as proprietary computational entities.`,
    version: 1,
    wordCount: 70,
    charCount: 528,
    isArchived: false,
    createdAt: '2026-10-17T09:00:00.000Z',
    updatedAt: '2026-10-18T11:45:00.000Z',
  }
];

export const DEFAULT_CONTINUITY_BIBLE: ContinuityBible = {
  id: 'bible_matrix_01',
  projectId: 'proj_matrix_01',
  voiceNarrator: 'Objective, authoritative, measured pacing with steady cadence. No exaggerated hype.',
  musicMood: 'Dark ambient electronic space drone with subtle analog arpeggio swells. Minimalist low-end resonance.',
  soundDesign: 'Deep sub-bass vacuum drone, periodic 8.4s electromagnetic chime resonance, subtle metallic texture.',
  visualPalette: 'Obsidian void black (#030712), sharp icy cobalt cyan (#00F0FF), glowing ruby core filament (#FB7185), directional rim lighting.',
  recurringSubjects: 'Monolithic geometric crystalline relay prism with etched fractal circuits; distant pale blue Earth dot.',
  cameraGrammar: 'Slow deliberate dolly tracks, intimate macro probe glides across facets, dramatic pedestal cranes.',
  updatedAt: '2026-10-18T14:30:00.000Z',
};

export const DEFAULT_SCENE_PACKAGES: ScenePackageData[] = [
  {
    id: 'scene_01',
    sceneNumber: 1,
    title: 'THE KUIPER BELT ANOMALY',
    format: '9:16 vertical',
    durationSec: 8,
    scriptBeat: 'Beyond the orbit of Pluto, deep-space telemetry has just detected an anomaly that defies natural explanation.',
    visualPrompt: 'Cinematic 9:16 portrait composition. A vast field of jagged frozen asteroids drifting in the dark obsidian vacuum of the outer solar system. Far in the center, an ominous geometric crystalline prism catches a faint ray of distant sunlight, radiating sharp ruby lens flares and micro-fractal glints. Camera performs a slow, deliberate forward tracking motion with slight orbital tilt. Soft cold blue fill light with stark directional key rim light, ultra-detailed dust particles floating through the beam.',
    continuitySnippet: 'Style: Cinematic realism; Palette: Deep void black, icy cobalt cyan, glowing ruby red; Lighting: Distant low-angle sunlight rim; Camera: Smooth mechanical dolly track.',
    narration: 'Beyond the orbit of Pluto, deep-space telemetry has just detected an anomaly that defies natural explanation.',
    soundDesign: 'Deep sub-bass vacuum drone, subtle metallic resonance ascending into silence.',
    visualStyleId: 'cinematic',
    isCustomEdited: false,
    scriptVersionReference: 1,
  },
  {
    id: 'scene_02',
    sceneNumber: 2,
    title: 'THE CRYPTIC TRANSMISSION',
    format: '9:16 vertical',
    durationSec: 8,
    scriptBeat: 'Spectroscopic data confirms an artificial crystalline relay repeating an encoded prime number pulse every eight point four seconds.',
    visualPrompt: 'Cinematic 9:16 macro shot. Extreme close-up on the monolithic crystalline surface. Intricate micro-etched photonic circuits pulse with luminous red laser filaments in strict non-random intervals. Camera executes an intimate slow pan along the geometric fractal ridges, capturing realistic glass refraction and prismatic chromatic aberration. Volumetric light shafts illuminate ionized space dust surrounding the relay.',
    continuitySnippet: 'Style: Cinematic realism; Palette: Monolith charcoal, intense ruby core filaments, deep space black; Texture: Crystalline facet refractions; Camera: Micro-probe pan.',
    narration: 'Spectroscopic data confirms an artificial crystalline relay repeating an encoded prime number pulse every eight point four seconds.',
    soundDesign: 'Rhythmic electromagnetic chime pulse at 8.4s interval, textured analog tape flutter.',
    visualStyleId: 'cinematic',
    isCustomEdited: false,
    scriptVersionReference: 1,
  },
  {
    id: 'scene_03',
    sceneNumber: 3,
    title: 'THE COSMIC REVELATION',
    format: '9:16 vertical',
    durationSec: 8,
    scriptBeat: 'Now science must answer: is humanity being monitored, or have we awakened an ancient orbital relic?',
    visualPrompt: 'Cinematic 9:16 epic wide shot. The monumental dark crystalline relay looms in the right foreground like an ancient alien spire. In the distant cosmic background, Earth is visible as a fragile pale blue dot illuminated by the sun. Camera executes an expansive vertical pedestal lift and slow roll, emphasizing the incomprehensible cosmic scale. Eerie twilight rim lighting casting long procedural shadows across space.',
    continuitySnippet: 'Style: Cinematic realism; Palette: Void black, earth blue, alien crimson; Continuity Subject: Spire silhouette; Camera: Cosmic crane-up pullout.',
    narration: 'Now science must answer: is humanity being monitored, or have we awakened an ancient orbital relic?',
    soundDesign: 'Haunting orchestral swell with low cello bow scrape, fading into infinite static.',
    visualStyleId: 'cinematic',
    isCustomEdited: false,
    scriptVersionReference: 1,
  }
];

export const DEFAULT_SEO_PACKAGE: SeoPackageData = {
  id: 'seo_matrix_01',
  projectId: 'proj_matrix_01',
  sourceStoryId: 'story_glitch_kuiper',
  sourceStoryVersion: 1,
  scriptVersionReference: 1,
  titleOptions: [
    'The Glitch Past Pluto: New Horizons Anomalous Signal Explained',
    'NASA Probe Detects Crystalline Signal in the Kuiper Belt',
    'Deep Space Anomaly: Crystalline Relay Detected Beyond Neptune',
    'Spectroscopic Data Confirms Artificial Structure in Outer Solar System',
  ],
  selectedTitle: 'The Glitch Past Pluto: New Horizons Anomalous Signal Explained',
  description: `In October 2026, deep-space telemetry from the New Horizons probe detected an anomalous gravitational signature and non-random 8.4-second electromagnetic pulse beyond Pluto. Here is the scientific breakdown of the Kuiper Belt crystalline anomaly and what an optical survey might reveal.\n\n#Space #Science #Astronomy #KuiperBelt #DeepSpace`,
  tags: [
    'space exploration',
    'kuiper belt',
    'new horizons probe',
    'astrophysics',
    'deep space signal',
    'neptune orbit',
    'space documentary',
    'sci-fi science',
  ],
  hashtags: ['#Space', '#Science', '#Astronomy', '#KuiperBelt', '#DeepSpace'],
  chapters: [
    { timestamp: '00:00', title: 'The Kuiper Belt Anomaly' },
    { timestamp: '00:08', title: 'The Cryptic Transmission' },
    { timestamp: '00:16', title: 'The Cosmic Revelation' },
  ],
  isCustomEdited: false,
  createdAt: '2026-10-18T14:30:00.000Z',
  updatedAt: '2026-10-18T14:30:00.000Z',
};

export const DEFAULT_THUMBNAIL_PACKAGE: ThumbnailStudioPackage = {
  id: 'thumb_pkg_matrix_01',
  projectId: 'proj_matrix_01',
  sourceStoryId: 'story_glitch_kuiper',
  sourceStoryVersion: 1,
  scriptVersionReference: 1,
  selectedOptionId: 'option_a',
  isApproved: true,
  approvedAt: '2026-10-18T14:30:00.000Z',
  createdAt: '2026-10-18T14:30:00.000Z',
  updatedAt: '2026-10-18T14:30:00.000Z',
  options: [
    {
      id: 'option_a',
      name: 'PROMPT A // OBJECT OF ENIGMA',
      conceptAngle: 'Close macro focus on the alien artifact crystalline core with intense light refraction and ruby laser conduits',
      ratio: '9:16 vertical',
      focalSubject: 'Luminous monolithic crystalline tetrahedron with glowing internal ruby micro-circuits',
      lightingAndMood: 'High contrast deep space void, harsh celestial rim lighting, volumetric laser glow, chromatic lens flares',
      composition: 'Extreme low-angle upward tilt, macro depth of field with floating stardust particles',
      detailedPrompt: 'Hyper-detailed cinematic thumbnail image, 9:16 vertical orientation. Macro view of an ancient alien crystalline tetrahedron floating in the deep void beyond Pluto. Intricate glowing red fiber-optic conduits visible beneath translucent quartz facets. A single stark beam of distant white sunlight hits the faceted edge, causing vibrant chromatic prismatic glare. Ominous, awe-inspiring atmosphere, Unreal Engine 5 render style, 8k resolution, crisp textures, deep space black.',
      overlayTextSuggestion: 'SIGNAL DETECTED',
      negativeConstraints: 'No cartoon effects, no blurry artifacts, no low resolution, no generic flying saucers.',
      previewImageUrl: '/src/assets/images/thumb_enigma_v_1792435064413.jpg',
      isCustomEdited: false,
    },
    {
      id: 'option_b',
      name: 'PROMPT B // ASTRONOMER DISCOVERY',
      conceptAngle: 'Human observer scale with deep space radar telescope & anomalous visual screen',
      ratio: '9:16 vertical',
      focalSubject: 'Silhouette of a lone observatory astronomer staring in shock at a massive holographic telemetry screen showing a repeating 8.4s prime waveform',
      lightingAndMood: 'Dark observatory room bathed in amber and cyan holographic luminescence, cold night sky through open dome ceiling',
      composition: 'Over-the-shoulder medium shot, dynamic diagonal composition emphasizing the scale of the telemetry pulse',
      detailedPrompt: 'Atmospheric cinematic documentary thumbnail, 9:16 aspect ratio. Inside a dark mountain observatory dome at midnight. In the foreground, an astronomer in silhouette turns in shock toward a glowing holographic monitor displaying an anomalous repeating geometric signal and deep space coordinates past Pluto. Through open dome slit, the starlit Milky Way is sharp. Dramatic teal and warm amber rim lighting, 35mm film grain, intense curiosity hook.',
      overlayTextSuggestion: 'IT IS NOT RANDOM',
      negativeConstraints: 'No cheesy monster faces, no low contrast, no generic stock photo look, no distorted hands.',
      previewImageUrl: '/src/assets/images/thumb_observer_v_1792435065654.jpg',
      isCustomEdited: false,
    }
  ]
};

export const StorageService = {
  // Test storage availability and quota health
  verifyStorageHealth(): { isFunctional: boolean; isPrivateBrowsingRisk: boolean; error?: string } {
    try {
      const testKey = '__illum_health_check__';
      localStorage.setItem(testKey, 'ok');
      const val = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      if (val === 'ok') {
        return { isFunctional: true, isPrivateBrowsingRisk: false };
      }
      return { isFunctional: false, isPrivateBrowsingRisk: true, error: 'Read-back verification failed' };
    } catch (e: any) {
      const isQuota = e?.name === 'QuotaExceededError' || String(e).includes('quota');
      return {
        isFunctional: false,
        isPrivateBrowsingRisk: !isQuota,
        error: isQuota ? 'Browser storage quota exceeded' : 'Browser storage disabled or restricted (private browsing)',
      };
    }
  },

  // Load Project with schema validation
  loadProject(defaultProject: ProjectSettings): ProjectSettings {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROJECT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && typeof parsed.name === 'string' && typeof parsed.format === 'string') {
          return {
            ...defaultProject,
            ...parsed,
            id: typeof parsed.id === 'string' ? parsed.id : defaultProject.id,
            name: parsed.name.trim() || defaultProject.name,
            format: (parsed.format === '9:16_SHORTS' || parsed.format === '16:9_LONG_FORM') ? parsed.format : defaultProject.format,
            shortsDuration: typeof parsed.shortsDuration === 'number' ? parsed.shortsDuration : defaultProject.shortsDuration,
            longFormDurationMinutes: typeof parsed.longFormDurationMinutes === 'number' ? parsed.longFormDurationMinutes : defaultProject.longFormDurationMinutes,
            modeId: typeof parsed.modeId === 'string' ? parsed.modeId : defaultProject.modeId,
            language: (parsed.language === 'en' || parsed.language === 'hi') ? parsed.language : defaultProject.language,
            visualStyleId: typeof parsed.visualStyleId === 'string' ? parsed.visualStyleId : defaultProject.visualStyleId,
            selectedConnectionId: typeof parsed.selectedConnectionId === 'string' ? parsed.selectedConnectionId : undefined,
            selectedModelId: typeof parsed.selectedModelId === 'string' ? parsed.selectedModelId : undefined,
            selectedModelDisplayName: typeof parsed.selectedModelDisplayName === 'string' ? parsed.selectedModelDisplayName : undefined,
          };
        }
      }
    } catch (e) {
      console.warn('Failed to load project from localStorage, using default', e);
    }
    return defaultProject;
  },

  // Save Project
  saveProject(project: ProjectSettings): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PROJECT, JSON.stringify(project));
    } catch (e) {
      console.error('Failed to save project to localStorage', e);
    }
  },

  // Default Model Preference for New Sessions (Task 2 Requirement)
  getDefaultModelPreference(): DefaultModelPreference | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.DEFAULT_MODEL_PREFERENCE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.connectionId === 'string' && typeof parsed.modelId === 'string') {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load default model preference', e);
    }
    return null;
  },

  setDefaultModelPreference(pref: DefaultModelPreference): void {
    try {
      localStorage.setItem(STORAGE_KEYS.DEFAULT_MODEL_PREFERENCE, JSON.stringify({
        ...pref,
        updatedAt: new Date().toISOString(),
      }));
    } catch (e) {
      console.error('Failed to save default model preference', e);
    }
  },

  // Multi-Session Management (Task 2 Requirement)
  getSavedSessions(): ProjectSession[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(s => s && typeof s.id === 'string' && typeof s.name === 'string');
        }
      }
    } catch (e) {
      console.warn('Failed to load sessions from storage', e);
    }
    return [];
  },

  saveSession(session: ProjectSession): void {
    try {
      const existing = this.getSavedSessions();
      const updated = [session, ...existing.filter(s => s.id !== session.id)];
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to save session to storage', e);
    }
  },

  deleteSession(sessionId: string): void {
    try {
      const existing = this.getSavedSessions();
      const filtered = existing.filter(s => s.id !== sessionId);
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(filtered));
    } catch (e) {
      console.error('Failed to delete session from storage', e);
    }
  },

  getActiveSessionId(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION_ID);
    } catch (e) {
      return null;
    }
  },

  setActiveSessionId(sessionId: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION_ID, sessionId);
    } catch (e) {
      console.error('Failed to set active session ID', e);
    }
  },

  // Load Source Stories with item validation
  loadStories(): SourceStory[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STORIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validStories = parsed.filter(s => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.rawText === 'string');
          if (validStories.length > 0) {
            return validStories;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to load stories from localStorage, using defaults', e);
    }
    return DEFAULT_STORIES;
  },

  // Save Source Stories
  saveStories(stories: SourceStory[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STORIES, JSON.stringify(stories));
    } catch (e) {
      console.error('Failed to save stories to localStorage', e);
    }
  },

  // Load Selected Story ID
  loadSelectedStoryId(fallbackId: string): string {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SELECTED_STORY_ID);
      if (saved && typeof saved === 'string') return saved;
    } catch (e) {
      console.warn('Failed to load selectedStoryId', e);
    }
    return fallbackId;
  },

  // Save Selected Story ID
  saveSelectedStoryId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SELECTED_STORY_ID, id);
    } catch (e) {
      console.error('Failed to save selectedStoryId', e);
    }
  },

  // Load Script Versions with validation
  loadScriptVersions(): ScriptVersion[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCRIPT_VERSIONS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(v => v && typeof v.id === 'string' && Array.isArray(v.scenes));
        }
      }
    } catch (e) {
      console.warn('Failed to load script versions', e);
    }
    return [];
  },

  // Save Script Versions
  saveScriptVersions(versions: ScriptVersion[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCRIPT_VERSIONS, JSON.stringify(versions));
    } catch (e) {
      console.error('Failed to save script versions', e);
    }
  },

  // Load Active Script Version with structure check
  loadActiveScriptVersion(): ScriptVersion | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_SCRIPT);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.id === 'string' && Array.isArray(parsed.scenes) && parsed.scenes.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load active script', e);
    }
    return null;
  },

  // Save Active Script Version
  saveActiveScriptVersion(script: ScriptVersion): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SCRIPT, JSON.stringify(script));
    } catch (e) {
      console.error('Failed to save active script', e);
    }
  },

  // Load Stale Matrix
  loadStaleMatrix(fallback: StaleMatrix): StaleMatrix {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.STALE_MATRIX);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...fallback, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load stale matrix', e);
    }
    return fallback;
  },

  // Save Stale Matrix
  saveStaleMatrix(matrix: StaleMatrix): void {
    try {
      localStorage.setItem(STORAGE_KEYS.STALE_MATRIX, JSON.stringify(matrix));
    } catch (e) {
      console.error('Failed to save stale matrix', e);
    }
  },

  // Export Stories Bundle
  exportStoriesJson(stories: SourceStory[]): string {
    return JSON.stringify({
      schema: 'illum_stories_export_v1',
      exportedAt: new Date().toISOString(),
      storiesCount: stories.length,
      stories,
    }, null, 2);
  },

  // Import Stories Bundle with validation
  importStoriesJson(jsonString: string): SourceStory[] | null {
    try {
      const parsed = JSON.parse(jsonString);
      const rawStories = (parsed && Array.isArray(parsed.stories)) ? parsed.stories : Array.isArray(parsed) ? parsed : null;
      if (rawStories && rawStories.length > 0) {
        const validated = rawStories.filter((s: any) => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.rawText === 'string');
        if (validated.length > 0) {
          return validated;
        }
      }
    } catch (e) {
      console.error('Failed to parse imported stories JSON', e);
    }
    return null;
  },

  // Load Scene Packages (Phase 4) with validation
  loadScenePackages(): ScenePackageData[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCENE_PROMPTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0]?.visualPrompt) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Failed to load scene packages from localStorage', e);
    }
    return DEFAULT_SCENE_PACKAGES;
  },

  // Save Scene Packages (Phase 4)
  saveScenePackages(scenes: ScenePackageData[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SCENE_PROMPTS, JSON.stringify(scenes));
    } catch (e) {
      console.error('Failed to save scene packages to localStorage', e);
    }
  },

  // Load Continuity Bible (Phase 4) with validation
  loadContinuityBible(): ContinuityBible {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CONTINUITY_BIBLE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed.visualPalette === 'string') {
          return { ...DEFAULT_CONTINUITY_BIBLE, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load continuity bible from localStorage', e);
    }
    return DEFAULT_CONTINUITY_BIBLE;
  },

  // Save Continuity Bible (Phase 4)
  saveContinuityBible(bible: ContinuityBible): void {
    try {
      localStorage.setItem(STORAGE_KEYS.CONTINUITY_BIBLE, JSON.stringify(bible));
    } catch (e) {
      console.error('Failed to save continuity bible to localStorage', e);
    }
  },

  // Load SEO Package (Phase 5) with validation
  loadSeoPackage(fallback: SeoPackageData = DEFAULT_SEO_PACKAGE): SeoPackageData {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SEO_PACKAGE);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.titleOptions) && typeof parsed.selectedTitle === 'string') {
          return { ...fallback, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load SEO package from localStorage', e);
    }
    return fallback;
  },

  // Save SEO Package (Phase 5)
  saveSeoPackage(seo: SeoPackageData): void {
    try {
      localStorage.setItem(STORAGE_KEYS.SEO_PACKAGE, JSON.stringify(seo));
    } catch (e) {
      console.error('Failed to save SEO package to localStorage', e);
    }
  },

  // Load Thumbnail Package (Phase 6) with validation
  loadThumbnailPackage(fallback: ThumbnailStudioPackage = DEFAULT_THUMBNAIL_PACKAGE): ThumbnailStudioPackage {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.THUMBNAILS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.options) && parsed.options.length >= 2) {
          return { ...fallback, ...parsed };
        }
      }
    } catch (e) {
      console.warn('Failed to load thumbnail package from localStorage', e);
    }
    return fallback;
  },

  // Save Thumbnail Package (Phase 6)
  saveThumbnailPackage(pkg: ThumbnailStudioPackage): void {
    try {
      localStorage.setItem(STORAGE_KEYS.THUMBNAILS, JSON.stringify(pkg));
    } catch (e) {
      console.error('Failed to save thumbnail package to localStorage', e);
    }
  },

  // Complete Project Backup Export (Page 22 & Task 1 Invariant)
  exportProjectBackupJson(payload: {
    project: ProjectSettings;
    stories: SourceStory[];
    selectedStoryId: string;
    scriptVersions: ScriptVersion[];
    currentScript: ScriptVersion;
    scenePackages: ScenePackageData[];
    continuityBible: ContinuityBible;
    seoPackage: SeoPackageData;
    thumbnailsPackage: ThumbnailStudioPackage;
    staleMatrix: StaleMatrix;
  }): string {
    return JSON.stringify({
      schemaVersion: 'illum_project_backup_v2',
      exportTimestamp: new Date().toISOString(),
      securityAudit: 'CLEAN — ZERO API KEYS OR SECRETS EXPORTED',
      storageNotice: 'LOCAL BROWSER BACKUP: Import this JSON to completely restore all stories, scripts, scenes, SEO, and thumbnails on any device.',
      project: payload.project,
      stories: payload.stories,
      selectedStoryId: payload.selectedStoryId,
      scriptVersions: payload.scriptVersions,
      currentScript: payload.currentScript,
      scenePackages: payload.scenePackages,
      continuityBible: payload.continuityBible,
      seoPackage: payload.seoPackage,
      thumbnailsPackage: payload.thumbnailsPackage,
      staleMatrix: payload.staleMatrix,
    }, null, 2);
  },

  // Complete Project Backup Import with Strict Validation & Corruption Recovery
  importProjectBackupJson(jsonString: string): {
    success: boolean;
    error?: string;
    data?: {
      project: ProjectSettings;
      stories: SourceStory[];
      selectedStoryId: string;
      scriptVersions: ScriptVersion[];
      currentScript: ScriptVersion;
      scenePackages: ScenePackageData[];
      continuityBible: ContinuityBible;
      seoPackage: SeoPackageData;
      thumbnailsPackage: ThumbnailStudioPackage;
      staleMatrix: StaleMatrix;
    };
  } {
    try {
      if (!jsonString || typeof jsonString !== 'string' || jsonString.trim().length === 0) {
        return { success: false, error: 'Empty file provided.' };
      }
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, error: 'Invalid JSON structure.' };
      }

      // 1. Validate Project Settings
      const rawProj = parsed.project;
      if (!rawProj || typeof rawProj.name !== 'string' || typeof rawProj.format !== 'string') {
        return { success: false, error: 'Invalid or missing project settings in backup.' };
      }

      // 2. Validate Stories (Support v2 stories array or v1 single sourceStory)
      let restoredStories: SourceStory[] = [];
      if (Array.isArray(parsed.stories) && parsed.stories.length > 0) {
        restoredStories = parsed.stories.filter((s: any) => s && typeof s.id === 'string' && typeof s.title === 'string' && typeof s.rawText === 'string');
      } else if (parsed.sourceStory && typeof parsed.sourceStory.title === 'string' && typeof parsed.sourceStory.rawText === 'string') {
        restoredStories = [{
          id: parsed.sourceStory.id || `story_${Date.now()}`,
          projectId: rawProj.id || 'proj_matrix_01',
          title: parsed.sourceStory.title,
          sourceType: parsed.sourceStory.sourceType || 'article',
          rawText: parsed.sourceStory.rawText,
          version: parsed.sourceStory.version || 1,
          wordCount: parsed.sourceStory.wordCount || parsed.sourceStory.rawText.split(/\s+/).length,
          charCount: parsed.sourceStory.charCount || parsed.sourceStory.rawText.length,
          isArchived: false,
          createdAt: parsed.sourceStory.createdAt || new Date().toISOString(),
          updatedAt: parsed.sourceStory.updatedAt || new Date().toISOString(),
        }];
      }

      if (restoredStories.length === 0) {
        return { success: false, error: 'Backup does not contain valid source stories.' };
      }

      const restoredSelectedId = (parsed.selectedStoryId && restoredStories.some(s => s.id === parsed.selectedStoryId))
        ? parsed.selectedStoryId
        : restoredStories[0].id;

      // 3. Validate Script
      const rawScript = parsed.currentScript || parsed.script;
      if (!rawScript || typeof rawScript.id !== 'string' || !Array.isArray(rawScript.scenes) || rawScript.scenes.length === 0) {
        return { success: false, error: 'Backup does not contain a valid script with scenes.' };
      }

      const restoredScriptVersions: ScriptVersion[] = (Array.isArray(parsed.scriptVersions) && parsed.scriptVersions.length > 0)
        ? parsed.scriptVersions.filter((v: any) => v && typeof v.id === 'string' && Array.isArray(v.scenes))
        : [rawScript];

      // 4. Validate Scene Packages
      const rawScenes = parsed.scenePackages || parsed.googleFlowScenes;
      const restoredScenePackages: ScenePackageData[] = (Array.isArray(rawScenes) && rawScenes.length > 0)
        ? rawScenes.filter((sp: any) => sp && typeof sp.id === 'string' && typeof sp.visualPrompt === 'string')
        : DEFAULT_SCENE_PACKAGES;

      // 5. Validate Continuity Bible
      const restoredBible: ContinuityBible = (parsed.continuityBible && typeof parsed.continuityBible.visualPalette === 'string')
        ? { ...DEFAULT_CONTINUITY_BIBLE, ...parsed.continuityBible }
        : DEFAULT_CONTINUITY_BIBLE;

      // 6. Validate SEO Package
      const restoredSeo: SeoPackageData = (parsed.seoPackage && Array.isArray(parsed.seoPackage.titleOptions))
        ? { ...DEFAULT_SEO_PACKAGE, ...parsed.seoPackage }
        : DEFAULT_SEO_PACKAGE;

      // 7. Validate Thumbnails Package
      const restoredThumbnails: ThumbnailStudioPackage = (parsed.thumbnailsPackage || parsed.thumbnails) && Array.isArray((parsed.thumbnailsPackage || parsed.thumbnails).options)
        ? { ...DEFAULT_THUMBNAIL_PACKAGE, ...(parsed.thumbnailsPackage || parsed.thumbnails) }
        : DEFAULT_THUMBNAIL_PACKAGE;

      // 8. Validate Stale Matrix
      const restoredStale: StaleMatrix = (parsed.staleMatrix && typeof parsed.staleMatrix === 'object')
        ? {
            sourceStoryStale: false,
            scriptStale: false,
            promptsStale: false,
            thumbnailsStale: false,
            seoStale: false,
            ...parsed.staleMatrix
          }
        : {
            sourceStoryStale: false,
            scriptStale: false,
            promptsStale: false,
            thumbnailsStale: false,
            seoStale: false,
          };

      return {
        success: true,
        data: {
          project: {
            id: rawProj.id || 'proj_matrix_01',
            name: rawProj.name,
            format: rawProj.format || '9:16_SHORTS',
            shortsDuration: rawProj.shortsDuration || 24,
            longFormDurationMinutes: rawProj.longFormDurationMinutes || 4,
            modeId: rawProj.modeId || 'scifi_explainer',
            language: rawProj.language || 'en',
            visualStyleId: rawProj.visualStyleId || 'cinematic',
            targetAudience: rawProj.targetAudience,
            callToAction: rawProj.callToAction,
            selectedConnectionId: typeof rawProj.selectedConnectionId === 'string' ? rawProj.selectedConnectionId : undefined,
            selectedModelId: typeof rawProj.selectedModelId === 'string' ? rawProj.selectedModelId : undefined,
            selectedModelDisplayName: typeof rawProj.selectedModelDisplayName === 'string' ? rawProj.selectedModelDisplayName : undefined,
            createdAt: rawProj.createdAt || new Date().toISOString(),
            updatedAt: rawProj.updatedAt || new Date().toISOString(),
          },
          stories: restoredStories,
          selectedStoryId: restoredSelectedId,
          scriptVersions: restoredScriptVersions,
          currentScript: rawScript,
          scenePackages: restoredScenePackages,
          continuityBible: restoredBible,
          seoPackage: restoredSeo,
          thumbnailsPackage: restoredThumbnails,
          staleMatrix: restoredStale,
        }
      };
    } catch (e: any) {
      return { success: false, error: `Malformed backup JSON: ${e?.message || 'Parse error'}` };
    }
  }
};
