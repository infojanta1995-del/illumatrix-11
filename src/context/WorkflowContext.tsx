import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { 
  StageId, 
  StageStatus, 
  ProjectSettings, 
  StaleMatrix, 
  ProviderConnection, 
  AIJob, 
  ActivityEvent,
  SourceStory,
  SourceType,
  ScriptSceneBeat,
  ScriptVersion,
  ContinuityBible,
  ScenePackageData,
  SeoPackageData,
  ThumbnailStudioPackage,
  ThumbnailPromptItem,
  SupportedProvider,
  DiscoveredModel
} from '../types/hud';
import { WORKFLOW_STAGES } from '../data/registries';
import { StorageService, DEFAULT_STORIES, DEFAULT_SEO_PACKAGE, DEFAULT_THUMBNAIL_PACKAGE } from '../services/storage';
import { AIService } from '../services/aiService';

interface UnsavedModalState {
  isOpen: boolean;
  targetStoryId?: string;
  targetStageId?: StageId;
  onConfirmDiscard: () => void;
  onConfirmSave: () => void;
}

interface WorkflowContextType {
  // Navigation & Stage Status
  activeStageId: StageId;
  setActiveStageId: (stage: StageId) => void;
  getStageStatus: (stageId: StageId) => StageStatus;
  canNavigateToStage: (stageId: StageId) => boolean;
  navigateToNextStage: () => void;
  navigateToPrevStage: () => void;
  requestStageNavigation: (targetStage: StageId) => void;

  // Project Settings & Invariants
  project: ProjectSettings;
  updateProject: (partial: Partial<ProjectSettings>) => void;

  // Source Stories Management (Phase 2 Core)
  stories: SourceStory[];
  selectedStoryId: string;
  selectedStory: SourceStory;
  selectStory: (storyId: string) => boolean;
  saveStory: (storyData: Partial<SourceStory> & { id?: string }) => SourceStory;
  createBlankStory: () => SourceStory;
  duplicateStory: (storyId: string) => SourceStory;
  archiveStory: (storyId: string) => void;
  unarchiveStory: (storyId: string) => void;
  deleteStoryPermanently: (storyId: string) => boolean;
  importStoriesData: (jsonStr: string) => boolean;
  exportStoriesData: () => string;
  restoreCompleteProjectBackup: (backupJson: string) => { success: boolean; error?: string };
  exportCompleteProjectBackup: () => string;

  // Unsaved Edits Protection
  hasUnsavedSourceEdits: boolean;
  setHasUnsavedSourceEdits: (hasEdits: boolean) => void;
  unsavedModalState: UnsavedModalState;
  closeUnsavedModal: () => void;

  // Script Studio (Phase 3 Core)
  currentScript: ScriptVersion;
  scriptVersions: ScriptVersion[];
  isScriptGenerating: boolean;
  generateScriptWithAI: () => Promise<boolean>;
  regenerateSingleBeatWithAI: (sceneNumber: number) => Promise<boolean>;
  saveScriptDraft: (scenes: ScriptSceneBeat[], notes?: string) => void;
  approveScript: () => void;
  unlockScriptForEdits: () => void;
  rollbackScriptVersion: (versionNumber: number) => void;

  // Workflow State Flags
  hasSelectedSource: boolean;
  setHasSelectedSource: (selected: boolean) => void;
  hasGeneratedScript: boolean;
  setHasGeneratedScript: (generated: boolean) => void;
  isScriptApproved: boolean;
  setIsScriptApproved: (approved: boolean) => void;
  hasGeneratedPrompts: boolean;
  setHasGeneratedPrompts: (generated: boolean) => void;

  // Scene Prompts Studio (Phase 4 Core + Safety Compliance)
  scenePackages: ScenePackageData[];
  continuityBible: ContinuityBible;
  isPromptsGenerating: boolean;
  generatePromptsWithAI: () => Promise<boolean>;
  regenerateStyleWithAI: (newStyleId: string) => Promise<boolean>;
  regenerateSinglePromptWithAI: (sceneNumber: number) => Promise<boolean>;
  repairPromptAfterFlowRejection: (sceneId: string, rejectionReason: string) => Promise<boolean>;
  restoreOriginalScenePrompt: (sceneId: string) => void;
  updateScenePackage: (sceneId: string, partial: Partial<ScenePackageData>) => void;
  updateContinuityBible: (partial: Partial<ContinuityBible>) => void;

  // SEO Package Studio (Phase 5 Core)
  seoPackage: SeoPackageData;
  isSeoGenerating: boolean;
  generateSeoWithAI: () => Promise<boolean>;
  updateSeoPackage: (partial: Partial<SeoPackageData>) => void;
  resetSeoToDefault: () => void;

  // Thumbnail Studio (Phase 6 Core)
  thumbnailsPackage: ThumbnailStudioPackage;
  isThumbnailsGenerating: boolean;
  isSingleThumbnailRegenerating: string | null;
  isImageRendering: string | null;
  generateThumbnailsWithAI: () => Promise<boolean>;
  regenerateSingleThumbnailOptionWithAI: (optionId: string) => Promise<boolean>;
  renderThumbnailImageWithAI: (optionId: string) => Promise<boolean>;
  updateThumbnailOption: (optionId: string, partial: Partial<ThumbnailPromptItem>) => void;
  selectPrimaryThumbnail: (optionId: string) => void;
  approveThumbnails: () => void;
  unlockThumbnailsForEdits: () => void;
  resetThumbnailsToDefault: () => void;

  // Stale State Tracking
  staleMatrix: StaleMatrix;
  markArtifactStale: (artifact: keyof Omit<StaleMatrix, 'upstreamReason'>, reason: string) => void;
  clearArtifactStale: (artifact: keyof Omit<StaleMatrix, 'upstreamReason'>) => void;

  // AI Provider Connections & Switcher
  connections: ProviderConnection[];
  activeConnection: ProviderConnection;
  setActiveConnectionId: (id: string) => Promise<void>;
  isProviderModalOpen: boolean;
  setIsProviderModalOpen: (open: boolean) => void;
  refreshProviders: () => Promise<void>;
  saveProviderConnection: (payload: {
    id?: string;
    name: string;
    provider: SupportedProvider;
    modelId: string;
    modelDisplayName?: string;
    baseUrl?: string;
    accountId?: string;
    apiKey?: string;
    quotaPool?: string;
    isEnabled?: boolean;
    accountLimits?: any;
    pricing?: any;
    capabilities?: any;
    supportedParameters?: string[];
  }) => Promise<{ success: boolean; message?: string }>;
  discoverModels: (params: {
    connectionId?: string;
    provider?: SupportedProvider;
    apiKey?: string;
    baseUrl?: string;
  }) => Promise<{
    success: boolean;
    provider: SupportedProvider;
    models: DiscoveredModel[];
    source: 'live_api' | 'cached_catalog';
    message?: string;
  }>;
  refreshConnectionModels: (connectionId: string) => Promise<{
    success: boolean;
    provider: SupportedProvider;
    models: DiscoveredModel[];
    source: 'live_api' | 'cached_catalog';
    message?: string;
    catalogStatus?: 'loaded' | 'refresh_required' | 'failed';
    catalogFetchedAt?: string;
  }>;
  testProviderConnection: (id: string) => Promise<{
    success: boolean;
    status?: string;
    latencyMs?: number;
    error?: string;
    errorCategory?: string;
    model?: string;
    testedAt?: string;
  }>;
  toggleProviderConnection: (id: string) => Promise<boolean>;
  deleteProviderConnection: (id: string) => Promise<boolean>;
  simulateRateLimitTest: () => void;
  simulateQuotaExhaustedTest: () => void;

  // Job Queue & Telemetry
  jobs: AIJob[];
  activeJob: AIJob | null;
  triggerJobSimulation: (taskType: string, targetStage: StageId) => void;
  cancelActiveJob: () => void;
  retryJob: (jobId: string) => void;

  // Terminal Activity Stream
  activityEvents: ActivityEvent[];
  addActivityEvent: (
    category: ActivityEvent['category'], 
    message: string, 
    level?: ActivityEvent['level'], 
    stageId?: StageId
  ) => void;
  clearActivityEvents: () => void;

  // HUD Controls & Modals
  isControlCenterOpen: boolean;
  setIsControlCenterOpen: (open: boolean) => void;
  isActivityDrawerOpen: boolean;
  setIsActivityDrawerOpen: (open: boolean) => void;
  isProjectModalOpen: boolean;
  setIsProjectModalOpen: (open: boolean) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
}

const WorkflowContext = createContext<WorkflowContextType | undefined>(undefined);

const INITIAL_PROJECT_SETTINGS: ProjectSettings = {
  id: 'proj_matrix_01',
  name: 'Quantum Horizons',
  format: '9:16_SHORTS',
  shortsDuration: 24,
  longFormDurationMinutes: 4, // Explicitly keeping 3 vs 4 min configurable per Page 3/6
  modeId: 'scifi_explainer',
  language: 'en',
  visualStyleId: 'cinematic',
  targetAudience: 'Curiosity-driven Tech Enthusiasts',
  callToAction: 'Follow for Daily Reality Glitches',
  createdAt: '2026-10-18T10:00:00.000Z',
  updatedAt: new Date().toISOString(),
};

const DEFAULT_INITIAL_SCRIPT: ScriptVersion = {
  id: 'script_v1_glitch',
  sourceStoryId: 'story_glitch_kuiper',
  sourceStoryVersion: 1,
  versionNumber: 1,
  title: 'The Glitch in the Kuiper Belt — Sci-Fi Explainer',
  hookSummary: 'Beyond the orbit of Pluto, deep-space telemetry has just detected an anomaly that defies natural explanation.',
  scenes: [
    {
      id: 'beat_01',
      sceneNumber: 1,
      timeRange: '0–8s',
      purpose: 'Hook / Immediate Anomaly',
      narrationText: 'Beyond the orbit of Pluto, deep-space telemetry just detected an anomaly that defies natural explanation.',
      visualDirectionDraft: 'Extreme cinematic wide shot of icy Kuiper Belt asteroids, suddenly interrupted by a geometric crystalline reflection emitting a rhythmic ruby pulse.',
      wordCount: 16,
    },
    {
      id: 'beat_02',
      sceneNumber: 2,
      timeRange: '8–16s',
      purpose: 'Main Idea / Synthetic Relay',
      narrationText: 'Spectroscopic data confirms an artificial crystalline relay repeating an encoded prime number pulse every eight point four seconds.',
      visualDirectionDraft: 'Slow track-in macro view revealing hyper-precise fractal circuitry etched onto translucent crystal, pulsing with structured electromagnetic waves.',
      wordCount: 18,
    },
    {
      id: 'beat_03',
      sceneNumber: 3,
      timeRange: '16–24s',
      purpose: 'Ending / Payoff & Curiosity Loop',
      narrationText: 'Now science must answer: is humanity being monitored, or have we awakened an ancient orbital relic?',
      visualDirectionDraft: 'Dramatic wide pull-back showing Earth visible as a pale blue dot in the far distance, framed by the monolithic silhouette of the relay.',
      wordCount: 16,
    }
  ],
  totalWords: 50,
  speakingDurationSeconds: 20,
  editorialNotes: 'Initial grounded baseline. Pacing conforms strictly to 8-second scenes for 24s Shorts format.',
  isApproved: true,
  createdAt: '2026-10-18T14:30:00.000Z',
  updatedAt: '2026-10-18T14:30:00.000Z',
  configSnapshot: {
    format: '9:16_SHORTS',
    duration: 24,
    modeId: 'scifi_explainer',
    language: 'en',
    visualStyleId: 'cinematic',
  }
};

export const WorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Stage Navigation
  const [activeStageId, setActiveStageId] = useState<StageId>('01_SETUP');

  // Load Persisted Project Configuration or Initial Baseline
  const [project, setProject] = useState<ProjectSettings>(() => {
    return StorageService.loadProject(INITIAL_PROJECT_SETTINGS);
  });

  // Source Stories Persistence (Phase 2)
  const [stories, setStories] = useState<SourceStory[]>(() => {
    return StorageService.loadStories();
  });

  const [selectedStoryId, setSelectedStoryId] = useState<string>(() => {
    return StorageService.loadSelectedStoryId(stories[0]?.id || DEFAULT_STORIES[0].id);
  });

  // Script Studio State & Version History (Phase 3 Core)
  const [scriptVersions, setScriptVersions] = useState<ScriptVersion[]>(() => {
    const loaded = StorageService.loadScriptVersions();
    return loaded.length > 0 ? loaded : [DEFAULT_INITIAL_SCRIPT];
  });

  const [currentScript, setCurrentScript] = useState<ScriptVersion>(() => {
    const loaded = StorageService.loadActiveScriptVersion();
    return loaded || scriptVersions[0] || DEFAULT_INITIAL_SCRIPT;
  });

  const [isScriptGenerating, setIsScriptGenerating] = useState<boolean>(false);

  // Scene Prompts Studio & Continuity Bible (Phase 4 Core)
  const [scenePackages, setScenePackages] = useState<ScenePackageData[]>(() => {
    return StorageService.loadScenePackages();
  });

  const [continuityBible, setContinuityBible] = useState<ContinuityBible>(() => {
    return StorageService.loadContinuityBible();
  });
  const [isPromptsGenerating, setIsPromptsGenerating] = useState<boolean>(false);

  // SEO Package State (Phase 5 Core)
  const [seoPackage, setSeoPackage] = useState<SeoPackageData>(() => {
    return StorageService.loadSeoPackage();
  });
  const [isSeoGenerating, setIsSeoGenerating] = useState<boolean>(false);

  // Thumbnail Studio State (Phase 6 Core)
  const [thumbnailsPackage, setThumbnailsPackage] = useState<ThumbnailStudioPackage>(() => {
    return StorageService.loadThumbnailPackage();
  });
  const [isThumbnailsGenerating, setIsThumbnailsGenerating] = useState<boolean>(false);
  const [isSingleThumbnailRegenerating, setIsSingleThumbnailRegenerating] = useState<string | null>(null);
  const [isImageRendering, setIsImageRendering] = useState<string | null>(null);

  // Unsaved Edits State
  const [hasUnsavedSourceEdits, setHasUnsavedSourceEdits] = useState<boolean>(false);
  const [unsavedModalState, setUnsavedModalState] = useState<UnsavedModalState>({
    isOpen: false,
    onConfirmDiscard: () => {},
    onConfirmSave: () => {},
  });

  // Pipeline Artifact Flags
  const [hasSelectedSource, setHasSelectedSource] = useState<boolean>(true);
  const [hasGeneratedScript, setHasGeneratedScript] = useState<boolean>(true);
  const [isScriptApproved, setIsScriptApproved] = useState<boolean>(() => currentScript.isApproved);
  const [hasGeneratedPrompts, setHasGeneratedPrompts] = useState<boolean>(true);

  // Stale Matrix with Persistence
  const [staleMatrix, setStaleMatrix] = useState<StaleMatrix>(() => {
    return StorageService.loadStaleMatrix({
      sourceStoryStale: false,
      scriptStale: false,
      promptsStale: false,
      thumbnailsStale: false,
      seoStale: false,
    });
  });

  // UI Panels
  const [isControlCenterOpen, setIsControlCenterOpen] = useState<boolean>(true);
  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState<boolean>(false);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync Project to Storage
  useEffect(() => {
    StorageService.saveProject(project);
  }, [project]);

  // Sync Stories to Storage
  useEffect(() => {
    StorageService.saveStories(stories);
  }, [stories]);

  // Sync Selected Story ID to Storage
  useEffect(() => {
    StorageService.saveSelectedStoryId(selectedStoryId);
  }, [selectedStoryId]);

  // Sync Stale Matrix to Storage
  useEffect(() => {
    StorageService.saveStaleMatrix(staleMatrix);
  }, [staleMatrix]);

  // Sync Script Versions to Storage
  useEffect(() => {
    StorageService.saveScriptVersions(scriptVersions);
  }, [scriptVersions]);

  // Sync Active Script to Storage
  useEffect(() => {
    StorageService.saveActiveScriptVersion(currentScript);
    setIsScriptApproved(currentScript.isApproved);
  }, [currentScript]);

  // Sync Scene Packages to Storage
  useEffect(() => {
    StorageService.saveScenePackages(scenePackages);
  }, [scenePackages]);

  // Sync Continuity Bible to Storage
  useEffect(() => {
    StorageService.saveContinuityBible(continuityBible);
  }, [continuityBible]);

  // Sync SEO Package to Storage
  useEffect(() => {
    StorageService.saveSeoPackage(seoPackage);
  }, [seoPackage]);

  // Sync Thumbnail Package to Storage
  useEffect(() => {
    StorageService.saveThumbnailPackage(thumbnailsPackage);
  }, [thumbnailsPackage]);

  // Active Story computation
  const selectedStory = useMemo(() => {
    return stories.find(s => s.id === selectedStoryId) || stories[0] || DEFAULT_STORIES[0];
  }, [stories, selectedStoryId]);

  // Real & Transparent Provider Connections Registry
  const [connections, setConnections] = useState<ProviderConnection[]>([
    {
      id: 'conn_gemini_primary',
      name: 'Google GenAI (Fast Runtime)',
      provider: 'Google GenAI',
      modelId: 'gemini-3.1-flash-lite',
      status: 'unconfigured',
      quotaPool: 'GCP_PROJECT_DEFAULT_QUOTA',
      supportsStreaming: true,
      supportsStructuredJson: true,
      lastChecked: 'Initializing',
      reportedLatencyMs: null,
      observedCallsCount: 0,
      quotaReported: false,
    },
    {
      id: 'conn_gemini_pro',
      name: 'Google GenAI (Reasoning Pool)',
      provider: 'Google GenAI',
      modelId: 'gemini-3.8-flash',
      status: 'unconfigured',
      quotaPool: 'GCP_PROJECT_DEFAULT_QUOTA',
      supportsStreaming: true,
      supportsStructuredJson: true,
      lastChecked: 'Initializing',
      reportedLatencyMs: null,
      observedCallsCount: 0,
      quotaReported: false,
    },
    {
      id: 'conn_openai_custom',
      name: 'OpenAI-Compatible Custom Endpoint',
      provider: 'OpenAI Compatible',
      modelId: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      status: 'unconfigured',
      quotaPool: 'INDEPENDENT_3P_POOL',
      supportsStreaming: false,
      supportsStructuredJson: true,
      lastChecked: 'Never',
      reportedLatencyMs: null,
      observedCallsCount: 0,
      quotaReported: false,
    },
  ]);

  const [activeConnectionId, setActiveConnectionIdState] = useState<string>('conn_gemini_primary');
  const [isProviderModalOpen, setIsProviderModalOpen] = useState<boolean>(false);

  const activeConnection = useMemo(() => {
    return connections.find(c => c.id === activeConnectionId) || connections[0];
  }, [connections, activeConnectionId]);

  // Refresh provider connections from server
  const refreshProviders = useCallback(async () => {
    try {
      const res = await AIService.getProviders();
      if (res.success && Array.isArray(res.connections) && res.connections.length > 0) {
        setConnections(res.connections);
        if (res.activeConnectionId) {
          setActiveConnectionIdState(res.activeConnectionId);
        }
      }
    } catch (e) {
      console.warn('Failed to refresh providers from server:', e);
    }
  }, []);

  // Synchronize on mount
  useEffect(() => {
    refreshProviders();
  }, [refreshProviders]);

  // AI Job Queue State (starts honest with zero fake telemetry)
  const [jobs, setJobs] = useState<AIJob[]>([]);

  const activeJob = useMemo(() => {
    return jobs.find(j => j.status === 'running' || j.status === 'queued') || null;
  }, [jobs]);

  // Activity Stream Events
  const [activityEvents, setActivityEvents] = useState<ActivityEvent[]>([
    {
      id: 'act_001',
      timestamp: new Date().toLocaleTimeString(),
      stageId: '01_SETUP',
      category: 'SYSTEM',
      level: 'info',
      message: 'ILLUMATRIX Phase 2 active. Ground-truth Source Library & persistence initialized.',
    },
  ]);

  const addActivityEvent = useCallback((
    category: ActivityEvent['category'], 
    message: string, 
    level: ActivityEvent['level'] = 'info', 
    stageId?: StageId
  ) => {
    const newEvent: ActivityEvent = {
      id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toLocaleTimeString(),
      category,
      level,
      message,
      stageId: stageId || activeStageId,
    };
    setActivityEvents(prev => [newEvent, ...prev.slice(0, 49)]);
  }, [activeStageId]);

  const clearActivityEvents = useCallback(() => {
    setActivityEvents([]);
    addActivityEvent('SYSTEM', 'Activity stream cleared by user.', 'info');
  }, [addActivityEvent]);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Set active provider connection with server persistence
  const setActiveConnectionId = useCallback(async (id: string) => {
    setActiveConnectionIdState(id);
    await AIService.setActiveProvider(id);
    const target = connections.find(c => c.id === id);
    if (target) {
      addActivityEvent('AI', `Active provider connection switched to: ${target.name} (${target.modelId}). Quota pool: ${target.quotaPool}.`, 'info');
      showToast(`Switched active provider to: ${target.name}`);
    }
  }, [connections, addActivityEvent, showToast]);

  const saveProviderConnection = useCallback(async (payload: any) => {
    const res = await AIService.saveProvider(payload);
    if (res.success) {
      await refreshProviders();
      addActivityEvent('CONFIG', `Provider connection "${payload.name}" saved on server.`, 'success');
      showToast(`Connection "${payload.name}" saved successfully.`);
      return { success: true };
    }
    return { success: false, message: res.message };
  }, [refreshProviders, addActivityEvent, showToast]);

  const discoverModels = useCallback(async (params: {
    connectionId?: string;
    provider?: SupportedProvider;
    apiKey?: string;
    baseUrl?: string;
  }) => {
    return await AIService.fetchAvailableModels(params);
  }, []);

  const refreshConnectionModels = useCallback(async (connectionId: string) => {
    const res = await AIService.refreshConnectionModels(connectionId);
    await refreshProviders();
    return res;
  }, [refreshProviders]);

  const testProviderConnection = useCallback(async (id: string) => {
    const res = await AIService.testProvider(id);
    await refreshProviders();
    return res;
  }, [refreshProviders]);

  const toggleProviderConnection = useCallback(async (id: string) => {
    const res = await AIService.toggleProvider(id);
    await refreshProviders();
    return res.success;
  }, [refreshProviders]);

  const deleteProviderConnection = useCallback(async (id: string) => {
    const res = await AIService.deleteProvider(id);
    if (res.success) {
      await refreshProviders();
      if (res.switchedActiveTo) {
        setActiveConnectionIdState(res.switchedActiveTo);
        showToast('Active provider deleted; safely switched active connection.');
      } else {
        showToast('Provider connection removed.');
      }
      return true;
    }
    showToast(res.message || 'Failed to delete provider connection.');
    return false;
  }, [refreshProviders, showToast]);

  // Compute Stage Status & Blocker Invariants
  const getStageStatus = useCallback((stageId: StageId): StageStatus => {
    if (activeStageId === stageId) return 'current';

    switch (stageId) {
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
        if (staleMatrix.seoStale || (seoPackage && seoPackage.scriptVersionReference !== currentScript.versionNumber)) return 'stale';
        return (seoPackage && Boolean(seoPackage.selectedTitle)) ? 'completed' : 'unlocked';
      case '06_THUMBNAIL_STUDIO':
        if (!isScriptApproved) return 'blocked';
        if (staleMatrix.thumbnailsStale || (thumbnailsPackage && thumbnailsPackage.scriptVersionReference !== currentScript.versionNumber)) return 'stale';
        return (thumbnailsPackage && thumbnailsPackage.isApproved) ? 'completed' : 'unlocked';
      case '07_REVIEW_EXPORT':
        if (Object.values(staleMatrix).some(v => v === true) || (seoPackage && seoPackage.scriptVersionReference !== currentScript.versionNumber) || (thumbnailsPackage && thumbnailsPackage.scriptVersionReference !== currentScript.versionNumber)) return 'stale';
        if (hasSelectedSource && isScriptApproved && hasGeneratedPrompts && scenePackages.length > 0 && seoPackage && Boolean(seoPackage.selectedTitle) && thumbnailsPackage && thumbnailsPackage.isApproved) return 'completed';
        return 'unlocked';
      default:
        return 'unlocked';
    }
  }, [activeStageId, hasSelectedSource, isScriptApproved, hasGeneratedPrompts, scenePackages, staleMatrix, seoPackage, currentScript, thumbnailsPackage]);

  const canNavigateToStage = useCallback((stageId: StageId): boolean => {
    const status = getStageStatus(stageId);
    return status !== 'blocked';
  }, [getStageStatus]);

  // Unsaved-change protection wrapper (Page 7 requirement)
  const requestStageNavigation = useCallback((targetStage: StageId) => {
    if (hasUnsavedSourceEdits && activeStageId === '02_SOURCES') {
      setUnsavedModalState({
        isOpen: true,
        targetStageId: targetStage,
        onConfirmDiscard: () => {
          setHasUnsavedSourceEdits(false);
          setUnsavedModalState(prev => ({ ...prev, isOpen: false }));
          setActiveStageId(targetStage);
          addActivityEvent('SOURCE', 'Unsaved source edits discarded on stage navigation.', 'warning');
        },
        onConfirmSave: () => {
          // Handled in SourcesWorkspace via callback
          setHasUnsavedSourceEdits(false);
          setUnsavedModalState(prev => ({ ...prev, isOpen: false }));
          setActiveStageId(targetStage);
        }
      });
      return;
    }

    if (canNavigateToStage(targetStage)) {
      setActiveStageId(targetStage);
      const stageObj = WORKFLOW_STAGES.find(s => s.id === targetStage);
      addActivityEvent('SYSTEM', `Navigated to stage ${stageObj?.stepNumber}: ${stageObj?.shortLabel}`);
    } else {
      const stageObj = WORKFLOW_STAGES.find(s => s.id === targetStage);
      showToast(`Prerequisite required: ${stageObj?.prerequisiteMessage || 'Prerequisite missing.'}`);
    }
  }, [hasUnsavedSourceEdits, activeStageId, canNavigateToStage, addActivityEvent, showToast]);

  const closeUnsavedModal = useCallback(() => {
    setUnsavedModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  const navigateToNextStage = useCallback(() => {
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.id === activeStageId);
    if (currentIndex < WORKFLOW_STAGES.length - 1) {
      const nextStage = WORKFLOW_STAGES[currentIndex + 1].id;
      requestStageNavigation(nextStage);
    }
  }, [activeStageId, requestStageNavigation]);

  const navigateToPrevStage = useCallback(() => {
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.id === activeStageId);
    if (currentIndex > 0) {
      const prevStage = WORKFLOW_STAGES[currentIndex - 1].id;
      requestStageNavigation(prevStage);
    }
  }, [activeStageId, requestStageNavigation]);

  // Project update with stale invalidation
  const updateProject = useCallback((partial: Partial<ProjectSettings>) => {
    setProject(prev => {
      const updated = { ...prev, ...partial, updatedAt: new Date().toISOString() };
      
      const changedConfigKeys = Object.keys(partial).filter(k => 
        ['format', 'shortsDuration', 'longFormDurationMinutes', 'modeId', 'language'].includes(k)
      );

      if (changedConfigKeys.length > 0) {
        setStaleMatrix(s => ({
          ...s,
          scriptStale: true,
          promptsStale: true,
          thumbnailsStale: true,
          seoStale: true,
          upstreamReason: `Configuration modified: ${changedConfigKeys.join(', ')}`,
        }));
        addActivityEvent(
          'CONFIG', 
          `Project configuration changed (${changedConfigKeys.join(', ')}). Downstream artifacts marked STALE.`, 
          'warning'
        );
      } else if (partial.visualStyleId && partial.visualStyleId !== prev.visualStyleId) {
        // Visual style change marks prompts & thumbnails stale; script/narration remain untouched per Page 12 invariant!
        setStaleMatrix(s => ({
          ...s,
          promptsStale: true,
          thumbnailsStale: true,
          upstreamReason: `Visual style changed to "${partial.visualStyleId}". Script & Narration preserved.`,
        }));
        addActivityEvent(
          'STYLE', 
          `Visual style updated to "${partial.visualStyleId}". Scene prompts & thumbnails marked STALE.`, 
          'info'
        );
      }

      return updated;
    });
  }, [addActivityEvent]);

  // Mark & Clear Stale
  const markArtifactStale = useCallback((artifact: keyof Omit<StaleMatrix, 'upstreamReason'>, reason: string) => {
    setStaleMatrix(prev => ({
      ...prev,
      [artifact]: true,
      upstreamReason: reason,
    }));
    addActivityEvent('SYSTEM', `Artifact [${artifact}] marked STALE: ${reason}`, 'warning');
  }, [addActivityEvent]);

  const clearArtifactStale = useCallback((artifact: keyof Omit<StaleMatrix, 'upstreamReason'>) => {
    setStaleMatrix(prev => ({
      ...prev,
      [artifact]: false,
    }));
    addActivityEvent('SYSTEM', `Artifact [${artifact}] regenerated and verified fresh.`, 'success');
  }, [addActivityEvent]);

  // ==========================================
  // SOURCE STORIES CRUD & WORKFLOW ACTIONS (Phase 2)
  // ==========================================

  const selectStory = useCallback((storyId: string): boolean => {
    const target = stories.find(s => s.id === storyId);
    if (!target) return false;

    // Check if switching away from currently selected story with downstream outputs
    if (selectedStoryId && selectedStoryId !== storyId) {
      setStaleMatrix(s => ({
        ...s,
        scriptStale: true,
        promptsStale: true,
        thumbnailsStale: true,
        seoStale: true,
        upstreamReason: `Source story switched to "${target.title}" (v${target.version}).`,
      }));
      addActivityEvent('SOURCE', `Switched active source story to "${target.title}". Downstream outputs marked STALE.`, 'warning');
    }

    setSelectedStoryId(storyId);
    setHasSelectedSource(true);
    showToast(`Selected story: "${target.title}" (v${target.version})`);
    return true;
  }, [stories, selectedStoryId, addActivityEvent, showToast]);

  const saveStory = useCallback((storyData: Partial<SourceStory> & { id?: string }): SourceStory => {
    const raw = storyData.rawText !== undefined ? storyData.rawText : '';
    const words = raw.trim() ? raw.trim().split(/\s+/).length : 0;
    const chars = raw.length;
    const now = new Date().toISOString();

    let savedResult: SourceStory;

    if (storyData.id) {
      // Update existing story
      const existing = stories.find(s => s.id === storyData.id);
      const isContentChanged = existing && existing.rawText !== raw;
      const nextVersion = existing ? (isContentChanged ? existing.version + 1 : existing.version) : 1;

      savedResult = {
        id: storyData.id,
        projectId: project.id,
        title: (storyData.title || existing?.title || 'Untitled Source').trim(),
        sourceType: storyData.sourceType || existing?.sourceType || 'article',
        notes: storyData.notes !== undefined ? storyData.notes : existing?.notes,
        rawText: raw, // Exact line breaks & characters preserved
        version: nextVersion,
        wordCount: words,
        charCount: chars,
        isArchived: existing ? existing.isArchived : false,
        createdAt: existing?.createdAt || now,
        updatedAt: now,
      };

      setStories(prev => prev.map(s => s.id === storyData.id ? savedResult : s));

      if (isContentChanged) {
        // Page 7 & 10: Editing source story after script generation marks downstream outputs STALE_SOURCE
        markArtifactStale('sourceStoryStale', `Source story "${savedResult.title}" updated to v${savedResult.version}.`);
        markArtifactStale('scriptStale', 'Source story modified. Existing script marked STALE_SOURCE.');
        markArtifactStale('promptsStale', 'Source story modified.');
        markArtifactStale('thumbnailsStale', 'Source story modified; Thumbnail prompts require synchronization.');
        markArtifactStale('seoStale', 'Source story modified; SEO metadata requires synchronization.');
        addActivityEvent('SOURCE', `Story "${savedResult.title}" updated to v${savedResult.version}. Downstream outputs marked STALE.`, 'warning');
      } else {
        addActivityEvent('SOURCE', `Story "${savedResult.title}" saved.`, 'info');
      }
    } else {
      // Create new story
      const newId = `story_${Date.now()}`;
      savedResult = {
        id: newId,
        projectId: project.id,
        title: (storyData.title || 'New Ground-Truth Story').trim(),
        sourceType: storyData.sourceType || 'article',
        notes: storyData.notes || '',
        rawText: raw,
        version: 1,
        wordCount: words,
        charCount: chars,
        isArchived: false,
        createdAt: now,
        updatedAt: now,
      };

      setStories(prev => [savedResult, ...prev]);
      setSelectedStoryId(newId);
      setHasSelectedSource(true);
      addActivityEvent('SOURCE', `Created new ground-truth source: "${savedResult.title}".`, 'success');
    }

    setHasUnsavedSourceEdits(false);
    showToast(`Story "${savedResult.title}" saved (v${savedResult.version}). Exact line breaks preserved.`);
    return savedResult;
  }, [stories, project.id, markArtifactStale, addActivityEvent, showToast]);

  const createBlankStory = useCallback((): SourceStory => {
    const newStoryId = `story_${Date.now()}`;
    const newStory: SourceStory = {
      id: newStoryId,
      projectId: project.id,
      title: 'New Story Draft',
      sourceType: 'article',
      notes: '',
      rawText: 'Paste or type your ground-truth source text here.\n\nILLUMATRIX preserves paragraphs and line breaks without automatic summarization or modification.',
      version: 1,
      wordCount: 19,
      charCount: 154,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setStories(prev => [newStory, ...prev]);
    setSelectedStoryId(newStoryId);
    setHasSelectedSource(true);
    setHasUnsavedSourceEdits(false);
    addActivityEvent('SOURCE', 'Created new blank source story container.', 'info');
    showToast('New story container created.');
    return newStory;
  }, [project.id, addActivityEvent, showToast]);

  const duplicateStory = useCallback((storyId: string): SourceStory => {
    const original = stories.find(s => s.id === storyId) || selectedStory;
    const dupId = `story_${Date.now()}`;
    const duplicate: SourceStory = {
      ...original,
      id: dupId,
      title: `${original.title} (Copy)`,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setStories(prev => [duplicate, ...prev]);
    setSelectedStoryId(dupId);
    setHasUnsavedSourceEdits(false);
    addActivityEvent('SOURCE', `Duplicated story "${original.title}" as "${duplicate.title}".`, 'info');
    showToast(`Duplicated as "${duplicate.title}"`);
    return duplicate;
  }, [stories, selectedStory, addActivityEvent, showToast]);

  const archiveStory = useCallback((storyId: string) => {
    const target = stories.find(s => s.id === storyId);
    if (!target) return;

    // Page 7: Deleting a story must not silently erase scripts or prompts; use archive/soft-delete
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, isArchived: true, updatedAt: new Date().toISOString() } : s));
    addActivityEvent('SOURCE', `Archived story "${target.title}". Scripts and prompts created from it remain intact.`, 'warning');
    showToast(`Story "${target.title}" archived.`);

    // If active story was archived, switch selection to first non-archived story
    if (selectedStoryId === storyId) {
      const firstAvailable = stories.find(s => s.id !== storyId && !s.isArchived);
      if (firstAvailable) {
        setSelectedStoryId(firstAvailable.id);
      }
    }
  }, [stories, selectedStoryId, addActivityEvent, showToast]);

  const unarchiveStory = useCallback((storyId: string) => {
    setStories(prev => prev.map(s => s.id === storyId ? { ...s, isArchived: false, updatedAt: new Date().toISOString() } : s));
    addActivityEvent('SOURCE', `Restored archived story.`, 'info');
    showToast('Story unarchived.');
  }, [addActivityEvent, showToast]);

  const deleteStoryPermanently = useCallback((storyId: string): boolean => {
    const target = stories.find(s => s.id === storyId);
    if (!target) return false;

    if (stories.filter(s => !s.isArchived).length <= 1) {
      showToast('Cannot delete the last remaining active story.');
      return false;
    }

    setStories(prev => prev.filter(s => s.id !== storyId));
    addActivityEvent('SOURCE', `Permanently deleted story "${target.title}".`, 'warning');
    showToast(`Story "${target.title}" removed.`);

    if (selectedStoryId === storyId) {
      const remaining = stories.filter(s => s.id !== storyId && !s.isArchived);
      if (remaining.length > 0) {
        setSelectedStoryId(remaining[0].id);
      }
    }
    return true;
  }, [stories, selectedStoryId, addActivityEvent, showToast]);

  const importStoriesData = useCallback((jsonStr: string): boolean => {
    const imported = StorageService.importStoriesJson(jsonStr);
    if (imported && imported.length > 0) {
      setStories(imported);
      setSelectedStoryId(imported[0].id);
      setHasSelectedSource(true);
      addActivityEvent('SOURCE', `Imported ${imported.length} ground-truth stories from JSON backup.`, 'success');
      showToast(`Successfully imported ${imported.length} stories.`);
      return true;
    }
    showToast('Failed to import stories: Invalid JSON format.');
    return false;
  }, [addActivityEvent, showToast]);

  const exportStoriesData = useCallback((): string => {
    return StorageService.exportStoriesJson(stories);
  }, [stories]);

  // Complete Project Backup Export (Page 22 & Task 1 Invariant)
  const exportCompleteProjectBackup = useCallback((): string => {
    return StorageService.exportProjectBackupJson({
      project,
      stories,
      selectedStoryId,
      scriptVersions,
      currentScript,
      scenePackages,
      continuityBible,
      seoPackage,
      thumbnailsPackage,
      staleMatrix,
    });
  }, [
    project,
    stories,
    selectedStoryId,
    scriptVersions,
    currentScript,
    scenePackages,
    continuityBible,
    seoPackage,
    thumbnailsPackage,
    staleMatrix,
  ]);

  // Complete Project Backup Restore with Full Validation (Task 1 Invariant)
  const restoreCompleteProjectBackup = useCallback((backupJson: string): { success: boolean; error?: string } => {
    const res = StorageService.importProjectBackupJson(backupJson);
    if (!res.success || !res.data) {
      showToast(`Restore failed: ${res.error || 'Invalid backup file'}`);
      return { success: false, error: res.error };
    }

    const { data } = res;
    // Apply restored project state across all slices
    setProject(data.project);
    setStories(data.stories);
    setSelectedStoryId(data.selectedStoryId);
    setScriptVersions(data.scriptVersions);
    setCurrentScript(data.currentScript);
    setIsScriptApproved(data.currentScript.isApproved);
    setScenePackages(data.scenePackages);
    setContinuityBible(data.continuityBible);
    setSeoPackage(data.seoPackage);
    setThumbnailsPackage(data.thumbnailsPackage);
    setStaleMatrix(data.staleMatrix);
    setHasSelectedSource(true);
    setHasGeneratedScript(true);
    setHasGeneratedPrompts(data.scenePackages.length > 0);

    // Save synchronously to localStorage
    StorageService.saveProject(data.project);
    StorageService.saveStories(data.stories);
    StorageService.saveSelectedStoryId(data.selectedStoryId);
    StorageService.saveScriptVersions(data.scriptVersions);
    StorageService.saveActiveScriptVersion(data.currentScript);
    StorageService.saveScenePackages(data.scenePackages);
    StorageService.saveContinuityBible(data.continuityBible);
    StorageService.saveSeoPackage(data.seoPackage);
    StorageService.saveThumbnailPackage(data.thumbnailsPackage);
    StorageService.saveStaleMatrix(data.staleMatrix);

    addActivityEvent('SYSTEM', `Complete project backup "${data.project.name}" restored successfully.`, 'success');
    showToast(`Project "${data.project.name}" restored successfully!`);
    return { success: true };
  }, [showToast, addActivityEvent]);

  // ==========================================
  // SCRIPT STUDIO & AI GENERATION (Phase 3 Core)
  // ==========================================

  const generateScriptWithAI = useCallback(async (): Promise<boolean> => {
    if (!selectedStory || !selectedStory.rawText.trim()) {
      showToast('Cannot generate script: Source story is empty.');
      return false;
    }

    setIsScriptGenerating(true);
    const jobId = `job_script_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: 'GENERATE_SCRIPT_FROM_SOURCE',
      stageId: '03_SCRIPT_STUDIO',
      status: 'running',
      progressPercent: 20,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    addActivityEvent(
      'AI',
      `Script generation initiated on [${activeConnection.name}] for source "${selectedStory.title}" (v${selectedStory.version}).`,
      'info',
      '03_SCRIPT_STUDIO'
    );

    const startTime = performance.now();

    try {
      const response = await AIService.generateScript({
        connectionId: activeConnectionId,
        sourceText: selectedStory.rawText,
        sourceTitle: selectedStory.title,
        sourceVersion: selectedStory.version,
        contentMode: project.modeId,
        language: project.language,
        format: project.format,
        duration: project.format === '9:16_SHORTS' ? project.shortsDuration : project.longFormDurationMinutes,
        visualStyle: project.visualStyleId,
        targetAudience: project.targetAudience,
        callToAction: project.callToAction,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.success && response.data) {
        const scriptData = response.data;
        const nextVersionNum = (currentScript?.versionNumber || 0) + 1;
        const scriptId = `script_v${nextVersionNum}_${Date.now()}`;

        const newScenes: ScriptSceneBeat[] = scriptData.scenes.map((s, idx) => ({
          id: `beat_${scriptId}_${idx + 1}`,
          sceneNumber: s.sceneNumber,
          timeRange: s.timeRange,
          purpose: s.purpose,
          narrationText: s.narrationText,
          visualDirectionDraft: s.visualDirectionDraft,
          wordCount: s.wordCount || (s.narrationText.trim() ? s.narrationText.trim().split(/\s+/).length : 0),
          isCustomEdited: false,
        }));

        const totalWords = newScenes.reduce((acc, sc) => acc + sc.wordCount, 0);

        const isFallback = Boolean(response.isFallback);
        const newScriptVersion: ScriptVersion = {
          id: scriptId,
          sourceStoryId: selectedStory.id,
          sourceStoryVersion: selectedStory.version,
          versionNumber: nextVersionNum,
          title: scriptData.title || `${selectedStory.title} — ${project.modeId.toUpperCase()}`,
          hookSummary: scriptData.hookSummary || (newScenes[0]?.narrationText || ''),
          scenes: newScenes,
          totalWords: scriptData.totalEstimatedWords || totalWords,
          speakingDurationSeconds: scriptData.speakingDurationSeconds || Math.round(totalWords / 2.5),
          editorialNotes: scriptData.editorialNotes || (isFallback ? 'Generated via deterministic local fallback engine from source text.' : 'Generated with source grounding.'),
          isApproved: false, // Explicit approval gate mandatory per Blueprint!
          isFallback,
          fallbackReason: isFallback ? 'Local deterministic fallback generated from source text' : undefined,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          configSnapshot: {
            format: project.format,
            duration: project.format === '9:16_SHORTS' ? project.shortsDuration : project.longFormDurationMinutes,
            modeId: project.modeId,
            language: project.language,
            visualStyleId: project.visualStyleId,
          },
        };

        setCurrentScript(newScriptVersion);
        setScriptVersions(prev => [newScriptVersion, ...prev]);
        setIsScriptApproved(false);
        setHasGeneratedScript(true);

        // Update Job state
        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'succeeded',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          latencyMs: elapsed,
        } : j));

        // Invalidate downstream prompt stages since script changed
        setStaleMatrix(prev => ({
          ...prev,
          scriptStale: false,
          promptsStale: true,
          thumbnailsStale: true,
          seoStale: true,
          upstreamReason: `New script v${nextVersionNum} generated. Approval required before downstream generation.`,
        }));

        // Update Provider Connection Telemetry
        setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
          ...c,
          observedCallsCount: c.observedCallsCount + 1,
          reportedLatencyMs: elapsed,
          lastChecked: new Date().toLocaleTimeString(),
        } : c));

        if (isFallback) {
          addActivityEvent(
            'AI',
            `Script v${nextVersionNum} generated via LOCAL DETERMINISTIC FALLBACK (${totalWords} words). Grounded in source text. Awaiting explicit approval.`,
            'warning',
            '03_SCRIPT_STUDIO'
          );
          showToast(`Script v${nextVersionNum} generated via local fallback! Review beats and approve.`);
        } else {
          addActivityEvent(
            'AI',
            `Script v${nextVersionNum} generated successfully via live AI (${elapsed}ms, ${totalWords} words). Awaiting explicit approval.`,
            'success',
            '03_SCRIPT_STUDIO'
          );
          showToast(`Script v${nextVersionNum} generated! Review beats and approve.`);
        }
        setIsScriptGenerating(false);
        return true;
      } else {
        // Handle failure
        const isRateLimit = response.errorCategory === 'RATE_LIMIT_429';
        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'failed',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          errorCategory: (response.errorCategory as any) || 'TRANSIENT_5XX',
          errorMessage: response.errorMessage || 'Script generation failed.',
        } : j));

        if (isRateLimit) {
          setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
            ...c,
            status: 'cooldown',
            cooldownRemainingSec: 30,
          } : c));
        }

        addActivityEvent(
          'AI',
          `Script generation failed on [${activeConnection.name}]: ${response.errorMessage || 'Unknown error'}. Current draft preserved.`,
          'error',
          '03_SCRIPT_STUDIO'
        );
        showToast(`Generation failed: ${response.errorMessage || 'Check connection'}`);
        setIsScriptGenerating(false);
        return false;
      }
    } catch (e: any) {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        status: 'failed',
        progressPercent: 100,
        finishedAt: new Date().toISOString(),
        errorCategory: 'TRANSIENT_5XX',
        errorMessage: e?.message || 'Network exception during script generation.',
      } : j));

      addActivityEvent('AI', `Script generation exception: ${e?.message}`, 'error', '03_SCRIPT_STUDIO');
      showToast('Error connecting to AI service.');
      setIsScriptGenerating(false);
      return false;
    }
  }, [
    selectedStory, 
    project, 
    activeConnectionId, 
    activeConnection.name, 
    currentScript?.versionNumber, 
    addActivityEvent, 
    showToast
  ]);

  const regenerateSingleBeatWithAI = useCallback(async (sceneNumber: number): Promise<boolean> => {
    const targetBeat = currentScript.scenes.find(s => s.sceneNumber === sceneNumber);
    if (!targetBeat) return false;

    const jobId = `job_beat_${sceneNumber}_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: `REGENERATE_BEAT_0${sceneNumber}`,
      stageId: '03_SCRIPT_STUDIO',
      status: 'running',
      progressPercent: 30,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    addActivityEvent('AI', `Regenerating Beat 0${sceneNumber} in isolation...`, 'info', '03_SCRIPT_STUDIO');

    try {
      const result = await AIService.regenerateSingleScene({
        connectionId: activeConnectionId,
        sceneNumber,
        timeRange: targetBeat.timeRange,
        purpose: targetBeat.purpose,
        sourceText: selectedStory.rawText,
        contentMode: project.modeId,
        language: project.language,
        visualStyle: project.visualStyleId,
      });

      if (result.success && result.data) {
        const updatedScenes = currentScript.scenes.map(sc => {
          if (sc.sceneNumber === sceneNumber) {
            return {
              ...sc,
              narrationText: result.data!.narrationText,
              visualDirectionDraft: result.data!.visualDirectionDraft,
              wordCount: result.data!.wordCount,
              isCustomEdited: false,
            };
          }
          return sc;
        });

        const totalWords = updatedScenes.reduce((acc, s) => acc + s.wordCount, 0);

        const updatedScript: ScriptVersion = {
          ...currentScript,
          scenes: updatedScenes,
          totalWords,
          speakingDurationSeconds: Math.round(totalWords / 2.5),
          updatedAt: new Date().toISOString(),
          isApproved: false, // Modification voids approval
        };

        setCurrentScript(updatedScript);
        setIsScriptApproved(false);
        setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'succeeded', progressPercent: 100, finishedAt: new Date().toISOString() } : j));
        
        markArtifactStale('promptsStale', `Beat 0${sceneNumber} was regenerated.`);
        markArtifactStale('thumbnailsStale', `Beat 0${sceneNumber} was regenerated; script modified.`);
        markArtifactStale('seoStale', `Beat 0${sceneNumber} was regenerated; script modified.`);
        addActivityEvent('AI', `Beat 0${sceneNumber} regenerated successfully. Script requires re-approval.`, 'success', '03_SCRIPT_STUDIO');
        showToast(`Beat 0${sceneNumber} regenerated!`);
        return true;
      }
    } catch (e: any) {
      console.error(e);
    }

    setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: 'failed', progressPercent: 100, finishedAt: new Date().toISOString(), errorMessage: 'Failed to regenerate beat' } : j));
    addActivityEvent('AI', `Failed to regenerate beat 0${sceneNumber}.`, 'error', '03_SCRIPT_STUDIO');
    showToast(`Failed to regenerate Beat 0${sceneNumber}.`);
    return false;
  }, [currentScript, selectedStory.rawText, project, activeConnectionId, addActivityEvent, markArtifactStale, showToast]);

  const saveScriptDraft = useCallback((scenes: ScriptSceneBeat[], notes?: string) => {
    const totalWords = scenes.reduce((acc, sc) => acc + sc.wordCount, 0);
    const updatedScript: ScriptVersion = {
      ...currentScript,
      scenes,
      totalWords,
      speakingDurationSeconds: Math.round(totalWords / 2.5),
      editorialNotes: notes !== undefined ? notes : currentScript.editorialNotes,
      updatedAt: new Date().toISOString(),
      isApproved: false, // Editing draft resets approval
    };

    setCurrentScript(updatedScript);
    setIsScriptApproved(false);
    setScriptVersions(prev => prev.map(v => v.id === updatedScript.id ? updatedScript : v));

    markArtifactStale('scriptStale', 'Custom edits in script beats');
    markArtifactStale('promptsStale', 'Script narration modified');
    markArtifactStale('thumbnailsStale', 'Script beats modified; Thumbnail prompts require synchronization.');
    markArtifactStale('seoStale', 'Script beats modified; SEO metadata requires synchronization.');
    addActivityEvent('SCRIPT', `Script v${currentScript.versionNumber} draft saved with custom beat edits.`, 'info', '03_SCRIPT_STUDIO');
    showToast('Script draft saved. Re-approval required.');
  }, [currentScript, markArtifactStale, addActivityEvent, showToast]);

  const approveScript = useCallback(() => {
    const approvedNow = new Date().toISOString();
    const approvedScript: ScriptVersion = {
      ...currentScript,
      isApproved: true,
      approvedAt: approvedNow,
      updatedAt: approvedNow,
    };

    setCurrentScript(approvedScript);
    setIsScriptApproved(true);
    setScriptVersions(prev => prev.map(v => v.id === approvedScript.id ? approvedScript : v));

    clearArtifactStale('scriptStale');
    addActivityEvent(
      'SCRIPT',
      `Script version v${approvedScript.versionNumber} explicitly APPROVED. Stage 04 (Scene Prompts) unlocked.`,
      'success',
      '03_SCRIPT_STUDIO'
    );
    showToast(`Script v${approvedScript.versionNumber} APPROVED! Stage 04 Unlocked.`);
  }, [currentScript, clearArtifactStale, addActivityEvent, showToast]);

  const unlockScriptForEdits = useCallback(() => {
    const unapprovedScript: ScriptVersion = {
      ...currentScript,
      isApproved: false,
      updatedAt: new Date().toISOString(),
    };

    setCurrentScript(unapprovedScript);
    setIsScriptApproved(false);
    setScriptVersions(prev => prev.map(v => v.id === unapprovedScript.id ? unapprovedScript : v));

    markArtifactStale('scriptStale', 'Script unlocked for manual revisions');
    markArtifactStale('promptsStale', 'Script unlocked and subject to edits');
    markArtifactStale('thumbnailsStale', 'Script unlocked for manual revisions; Thumbnail prompts require synchronization.');
    markArtifactStale('seoStale', 'Script unlocked for manual revisions; SEO metadata requires synchronization.');
    addActivityEvent('SCRIPT', `Script v${currentScript.versionNumber} unlocked for edits. Stage 04 locked until re-approved.`, 'warning', '03_SCRIPT_STUDIO');
    showToast('Script unlocked for editing.');
  }, [currentScript, markArtifactStale, addActivityEvent, showToast]);

  const rollbackScriptVersion = useCallback((versionNumber: number) => {
    const target = scriptVersions.find(v => v.versionNumber === versionNumber);
    if (!target) {
      showToast(`Version v${versionNumber} not found.`);
      return;
    }

    setCurrentScript(target);
    setIsScriptApproved(target.isApproved);
    markArtifactStale('promptsStale', `Rolled back to script version v${versionNumber}.`);
    markArtifactStale('thumbnailsStale', `Rolled back to script version v${versionNumber}; Thumbnail prompts require synchronization.`);
    markArtifactStale('seoStale', `Rolled back to script version v${versionNumber}; SEO metadata requires synchronization.`);
    addActivityEvent('SCRIPT', `Rolled back active script to version v${versionNumber}.`, 'warning', '03_SCRIPT_STUDIO');
    showToast(`Restored script version v${versionNumber}.`);
  }, [scriptVersions, markArtifactStale, addActivityEvent, showToast]);

  // Real Job Simulation
  const triggerJobSimulation = useCallback((taskType: string, targetStage: StageId) => {
    const newJobId = `job_${Date.now()}`;
    const newJob: AIJob = {
      id: newJobId,
      taskType,
      stageId: targetStage,
      status: 'queued',
      progressPercent: 10,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    addActivityEvent('JOB', `Job ${newJobId} queued: ${taskType} on connection [${activeConnection.name}].`, 'info');

    setTimeout(() => {
      setJobs(prev => prev.map(j => j.id === newJobId ? { ...j, status: 'running', progressPercent: 45, startedAt: new Date().toISOString() } : j));
    }, 400);

    setTimeout(() => {
      setJobs(prev => prev.map(j => j.id === newJobId ? { ...j, progressPercent: 85 } : j));
    }, 1100);

    setTimeout(() => {
      const finishTime = new Date().toISOString();
      setJobs(prev => prev.map(j => j.id === newJobId ? { 
        ...j, 
        status: 'succeeded', 
        progressPercent: 100, 
        finishedAt: finishTime,
        latencyMs: 740 
      } : j));
      
      setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
        ...c,
        observedCallsCount: c.observedCallsCount + 1,
        reportedLatencyMs: 740,
        lastChecked: new Date().toLocaleTimeString(),
      } : c));

      addActivityEvent('JOB', `Job ${newJobId} succeeded in 740ms. Output persisted.`, 'success', targetStage);
      showToast(`Task completed successfully: ${taskType}`);
    }, 1700);
  }, [activeConnectionId, activeConnection.name, addActivityEvent, showToast]);

  const cancelActiveJob = useCallback(() => {
    if (!activeJob) return;
    setJobs(prev => prev.map(j => j.id === activeJob.id ? { ...j, status: 'cancelled', finishedAt: new Date().toISOString() } : j));
    addActivityEvent('JOB', `Job ${activeJob.id} cancelled by user. Previous output preserved intact.`, 'warning');
    showToast('Job cancelled.');
  }, [activeJob, addActivityEvent, showToast]);

  const retryJob = useCallback((jobId: string) => {
    const target = jobs.find(j => j.id === jobId);
    if (!target) return;
    triggerJobSimulation(target.taskType, target.stageId);
  }, [jobs, triggerJobSimulation]);

  // Provider Failure Simulations
  const simulateRateLimitTest = useCallback(() => {
    const errorJobId = `job_err_${Date.now()}`;
    const testJob: AIJob = {
      id: errorJobId,
      taskType: 'SIMULATE_RATE_LIMIT_TEST',
      stageId: activeStageId,
      status: 'failed',
      progressPercent: 100,
      attemptCount: 3,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      errorCategory: 'RATE_LIMIT_429',
      errorMessage: 'Provider returned HTTP 429 Too Many Requests. Cooldown activated.',
    };

    setJobs(prev => [testJob, ...prev]);
    setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
      ...c,
      status: 'cooldown',
      cooldownRemainingSec: 30,
    } : c));

    addActivityEvent(
      'FAILOVER', 
      `Rate limit 429 encountered on [${activeConnection.name}]. Connection marked in COOLDOWN. User edits preserved.`, 
      'error'
    );
    showToast('Simulated Rate Limit 429: Connection placed in Cooldown.');
  }, [activeStageId, activeConnectionId, activeConnection.name, addActivityEvent, showToast]);

  const simulateQuotaExhaustedTest = useCallback(() => {
    addActivityEvent(
      'FAILOVER', 
      'QUOTA TRUTH AUDIT: Multiple keys under GCP share the same project quota pool. Failover to same pool will not bypass quota limit.', 
      'warning'
    );
    showToast('Quota Truth: Keys in same GCP project share quota.');
  }, [addActivityEvent, showToast]);

  // Scene Prompts Studio (Phase 4 Core)
  const generatePromptsWithAI = useCallback(async (): Promise<boolean> => {
    if (!currentScript?.isApproved) {
      showToast('Stage 04 Locked: Explicit script approval in Stage 03 required.');
      addActivityEvent('PROMPTS', 'Prompt generation blocked: Script must be explicitly approved in Stage 03 first.', 'warning', '04_SCENE_PROMPTS');
      return false;
    }

    if (!currentScript?.scenes || currentScript.scenes.length === 0) {
      showToast('No approved script scenes available to generate prompts.');
      return false;
    }

    setIsPromptsGenerating(true);
    const jobId = `job_prompts_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: 'GENERATE_SCENE_PROMPTS_GOOGLE_FLOW',
      stageId: '04_SCENE_PROMPTS',
      status: 'running',
      progressPercent: 20,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    addActivityEvent(
      'AI',
      `Google Flow prompt generation initiated for ${currentScript.scenes.length} scenes (Script v${currentScript.versionNumber}) on [${activeConnection.name}]. Script narration preserved byte-for-byte.`,
      'info',
      '04_SCENE_PROMPTS'
    );

    const startTime = performance.now();
    try {
      const response = await AIService.generateScenePrompts({
        connectionId: activeConnectionId,
        scenes: currentScript.scenes,
        format: project.format,
        visualStyleId: project.visualStyleId,
        language: project.language,
        continuityBible,
        sourceTitle: selectedStory.title,
        contentMode: project.modeId,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.success && response.data) {
        const pkgs: ScenePackageData[] = response.data.map((p: any, idx: number) => ({
          id: p.id || `scene_pkg_${idx + 1}_${Date.now()}`,
          sceneNumber: p.sceneNumber || idx + 1,
          title: p.title || `SCENE 0${idx + 1}`,
          format: p.format || (project.format === '9:16_SHORTS' ? '9:16 vertical' : '16:9 horizontal'),
          durationSec: p.durationSec || 8,
          scriptBeat: p.scriptBeat || currentScript.scenes[idx]?.narrationText || '',
          visualPrompt: p.visualPrompt,
          continuitySnippet: p.continuitySnippet,
          narration: p.narration || currentScript.scenes[idx]?.narrationText || '',
          soundDesign: p.soundDesign,
          visualStyleId: p.visualStyleId || project.visualStyleId,
          isCustomEdited: false,
          scriptVersionReference: currentScript.versionNumber,
          safetyReview: p.safetyReview,
          originalVisualPrompt: p.originalVisualPrompt || p.visualPrompt,
          flowRejectionReported: false,
        }));

        setScenePackages(pkgs);
        setHasGeneratedPrompts(true);
        clearArtifactStale('promptsStale');

        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'succeeded',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          latencyMs: elapsed,
        } : j));

        setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
          ...c,
          observedCallsCount: c.observedCallsCount + 1,
          reportedLatencyMs: elapsed,
          lastChecked: new Date().toLocaleTimeString(),
        } : c));

        addActivityEvent(
          'AI',
          `Generated ${pkgs.length} Google Flow scene prompt packages in ${elapsed}ms via [${response.provider || activeConnection.name}]. Traceable to Script v${currentScript.versionNumber}.`,
          'success',
          '04_SCENE_PROMPTS'
        );
        showToast('Google Flow scene prompts generated successfully!');
        setIsPromptsGenerating(false);
        return true;
      } else {
        const isRateLimit = response.errorCategory === 'RATE_LIMIT_429';
        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'failed',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          errorCategory: (response.errorCategory as any) || 'TRANSIENT_5XX',
          errorMessage: response.errorMessage || 'Prompt generation failed.',
        } : j));

        if (isRateLimit) {
          setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
            ...c,
            status: 'cooldown',
            cooldownRemainingSec: 30,
          } : c));
        }

        addActivityEvent('AI', `Prompt generation failed on [${activeConnection.name}]: ${response.errorMessage}`, 'error', '04_SCENE_PROMPTS');
        showToast(`Prompt generation failed: ${response.errorMessage || 'Error'}`);
        setIsPromptsGenerating(false);
        return false;
      }
    } catch (e: any) {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        status: 'failed',
        progressPercent: 100,
        finishedAt: new Date().toISOString(),
        errorMessage: e?.message || 'Network exception',
      } : j));
      addActivityEvent('AI', `Prompt generation exception: ${e?.message}`, 'error', '04_SCENE_PROMPTS');
      showToast('Error connecting to AI service.');
      setIsPromptsGenerating(false);
      return false;
    }
  }, [currentScript, project, continuityBible, selectedStory.title, activeConnectionId, activeConnection.name, addActivityEvent, clearArtifactStale, showToast]);

  const regenerateStyleWithAI = useCallback(async (newStyleId: string): Promise<boolean> => {
    setIsPromptsGenerating(true);
    updateProject({ visualStyleId: newStyleId });
    
    const jobId = `job_style_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: `STYLE_ONLY_REGEN_${newStyleId.toUpperCase()}`,
      stageId: '04_SCENE_PROMPTS',
      status: 'running',
      progressPercent: 30,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };
    setJobs(prev => [newJob, ...prev]);

    addActivityEvent('STYLE', `Regenerating visual descriptors to match style "${newStyleId}". Script narration preserved byte-for-byte.`, 'info', '04_SCENE_PROMPTS');
    const startTime = performance.now();

    try {
      const response = await AIService.regenerateStylePrompts({
        connectionId: activeConnectionId,
        scenes: scenePackages,
        newVisualStyleId: newStyleId,
        continuityBible,
        contentMode: project.modeId,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.success && response.data) {
        // Merge visual updates while strictly preserving narration and non-style fields
        const updated = scenePackages.map(s => {
          const match = (response.data || []).find((m: any) => m.sceneNumber === s.sceneNumber);
          return {
            ...s,
            visualStyleId: newStyleId,
            originalVisualPrompt: match?.originalVisualPrompt || s.originalVisualPrompt || s.visualPrompt,
            visualPrompt: match?.visualPrompt || s.visualPrompt,
            continuitySnippet: match?.continuitySnippet || s.continuitySnippet,
            safetyReview: match?.safetyReview || s.safetyReview,
            // Script beat and narration preserved byte-for-byte:
            scriptBeat: s.scriptBeat,
            narration: s.narration,
            title: s.title,
            soundDesign: s.soundDesign,
            durationSec: s.durationSec,
            format: s.format,
            isCustomEdited: s.isCustomEdited,
            scriptVersionReference: s.scriptVersionReference,
          };
        });

        setScenePackages(updated);

        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'succeeded',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          latencyMs: elapsed,
        } : j));

        addActivityEvent('STYLE', `Visual style updated to "${newStyleId}" via [${response.provider || 'AI Engine'}]. Script narration strictly preserved.`, 'success', '04_SCENE_PROMPTS');
        showToast(`Visual style updated to "${newStyleId}"!`);
        setIsPromptsGenerating(false);
        return true;
      }
    } catch (e: any) {
      console.error(e);
    }

    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status: 'failed',
      progressPercent: 100,
      finishedAt: new Date().toISOString(),
      errorMessage: 'Style regeneration failed',
    } : j));

    setIsPromptsGenerating(false);
    showToast('Failed to regenerate visual style.');
    return false;
  }, [scenePackages, continuityBible, updateProject, project.modeId, activeConnectionId, addActivityEvent, showToast]);

  const regenerateSinglePromptWithAI = useCallback(async (sceneNumber: number): Promise<boolean> => {
    const targetScene = scenePackages.find(s => s.sceneNumber === sceneNumber);
    if (!targetScene) return false;

    const jobId = `job_scene_prompt_${sceneNumber}_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: `REGENERATE_PROMPT_SCENE_0${sceneNumber}`,
      stageId: '04_SCENE_PROMPTS',
      status: 'running',
      progressPercent: 30,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };
    setJobs(prev => [newJob, ...prev]);

    addActivityEvent('AI', `Regenerating scene prompt package 0${sceneNumber} in isolation on [${activeConnection.name}]...`, 'info', '04_SCENE_PROMPTS');
    const startTime = performance.now();

    try {
      const result = await AIService.regenerateSingleScenePrompt({
        connectionId: activeConnectionId,
        sceneNumber,
        format: targetScene.format,
        durationSec: targetScene.durationSec,
        scriptBeat: targetScene.scriptBeat,
        narration: targetScene.narration,
        visualStyleId: project.visualStyleId,
        continuityBible,
        contentMode: project.modeId,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (result.success && result.data) {
        setScenePackages(prev => prev.map(s => s.sceneNumber === sceneNumber ? { 
          ...s, 
          ...result.data, 
          scriptBeat: targetScene.scriptBeat, // Strict preservation
          narration: targetScene.narration,   // Strict preservation
          originalVisualPrompt: result.data.originalVisualPrompt || targetScene.originalVisualPrompt || targetScene.visualPrompt,
          safetyReview: result.data.safetyReview,
          isCustomEdited: false 
        } : s));

        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'succeeded',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          latencyMs: elapsed,
        } : j));

        addActivityEvent('AI', `Scene 0${sceneNumber} prompt package regenerated via [${result.provider || activeConnection.name}]. Script beat preserved.`, 'success', '04_SCENE_PROMPTS');
        showToast(`Scene 0${sceneNumber} prompt regenerated!`);
        return true;
      }
    } catch (e: any) {
      console.error(e);
    }

    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status: 'failed',
      progressPercent: 100,
      finishedAt: new Date().toISOString(),
      errorMessage: 'Failed to regenerate scene prompt',
    } : j));

    showToast(`Failed to regenerate Scene 0${sceneNumber} prompt.`);
    return false;
  }, [scenePackages, project.visualStyleId, project.modeId, continuityBible, activeConnectionId, activeConnection.name, addActivityEvent, showToast]);

  // Restore Original Prompt prior to safety revision
  const restoreOriginalScenePrompt = useCallback((sceneId: string) => {
    setScenePackages(prev => prev.map(s => {
      if (s.id === sceneId && s.originalVisualPrompt) {
        return {
          ...s,
          visualPrompt: s.originalVisualPrompt,
          isCustomEdited: true,
          safetyReview: s.safetyReview ? {
            ...s.safetyReview,
            isRevised: false,
            explanation: 'Original unrevised prompt restored by user.',
          } : undefined,
        };
      }
      return s;
    }));
    showToast('Original visual prompt restored.');
    addActivityEvent('PROMPTS', `Restored original baseline prompt for scene.`, 'info', '04_SCENE_PROMPTS');
  }, [showToast, addActivityEvent]);

  // Repair Prompt After Google Flow Rejection (Transparent User-Controlled Workflow)
  const repairPromptAfterFlowRejection = useCallback(async (sceneId: string, rejectionReason: string): Promise<boolean> => {
    const target = scenePackages.find(s => s.id === sceneId);
    if (!target) return false;

    addActivityEvent('PROMPTS', `Initiating policy repair for Scene 0${target.sceneNumber} after reported Google Flow rejection...`, 'warning', '04_SCENE_PROMPTS');
    try {
      const res = await AIService.repairFlowRejection({
        scene: target,
        rejectionReason,
        contentMode: project.modeId,
        continuityBible,
      });

      if (res.success && res.data) {
        setScenePackages(prev => prev.map(s => s.id === sceneId ? {
          ...s,
          ...res.data,
          scriptBeat: target.scriptBeat,
          narration: target.narration,
          durationSec: target.durationSec,
          format: target.format,
        } : s));
        addActivityEvent('PROMPTS', `Scene 0${target.sceneNumber} prompt revised for Google Flow policy compliance. Original prompt preserved.`, 'success', '04_SCENE_PROMPTS');
        showToast(`Scene 0${target.sceneNumber} revised for Google Flow compliance!`);
        return true;
      }
    } catch (e) {
      console.error('Failed to repair flow rejection:', e);
    }
    showToast('Failed to repair prompt.');
    return false;
  }, [scenePackages, project.modeId, continuityBible, addActivityEvent, showToast]);

  const updateScenePackage = useCallback((sceneId: string, partial: Partial<ScenePackageData>) => {
    setScenePackages(prev => prev.map(s => s.id === sceneId ? { ...s, ...partial, isCustomEdited: true } : s));
    markArtifactStale('promptsStale', 'Custom scene prompt modification');
  }, [markArtifactStale]);

  const updateContinuityBible = useCallback((partial: Partial<ContinuityBible>) => {
    setContinuityBible(prev => ({ ...prev, ...partial, updatedAt: new Date().toISOString() }));
    markArtifactStale('promptsStale', 'Continuity bible updated');
  }, [markArtifactStale]);

  // SEO Package Studio (Phase 5 Core)
  const generateSeoWithAI = useCallback(async (): Promise<boolean> => {
    if (!currentScript?.isApproved) {
      showToast('Stage 05 Locked: Explicit script approval in Stage 03 required.');
      addActivityEvent('EXPORT', 'SEO generation blocked: Script must be approved in Stage 03 first.', 'warning', '05_SEO_PACKAGE');
      return false;
    }

    setIsSeoGenerating(true);
    const jobId = `job_seo_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: 'GENERATE_SEO_METADATA_PACKAGE',
      stageId: '05_SEO_PACKAGE',
      status: 'running',
      progressPercent: 20,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    addActivityEvent(
      'AI',
      `SEO metadata generation initiated for Script "${currentScript.title}" (v${currentScript.versionNumber}) on [${activeConnection.name}].`,
      'info',
      '05_SEO_PACKAGE'
    );

    const startTime = performance.now();
    try {
      const response = await AIService.generateSeoPackage({
        connectionId: activeConnectionId,
        sourceTitle: selectedStory.title,
        sourceText: selectedStory.rawText,
        scriptTitle: currentScript.title,
        hookSummary: currentScript.hookSummary,
        scenes: currentScript.scenes,
        contentMode: project.modeId,
        language: project.language,
        format: project.format,
        duration: project.format === '9:16_SHORTS' ? project.shortsDuration : project.longFormDurationMinutes,
        targetAudience: project.targetAudience,
        callToAction: project.callToAction,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.success && response.data) {
        const data = response.data;
        const newSeo: SeoPackageData = {
          id: `seo_${Date.now()}`,
          projectId: project.id,
          sourceStoryId: selectedStory.id,
          sourceStoryVersion: selectedStory.version,
          scriptVersionReference: currentScript.versionNumber,
          titleOptions: data.titleOptions || [],
          selectedTitle: data.selectedTitle || data.titleOptions?.[0] || currentScript.title,
          description: data.description || '',
          tags: data.tags || [],
          hashtags: data.hashtags || [],
          chapters: data.chapters || [],
          isCustomEdited: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setSeoPackage(newSeo);
        clearArtifactStale('seoStale');

        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'succeeded',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          latencyMs: elapsed,
        } : j));

        setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
          ...c,
          observedCallsCount: c.observedCallsCount + 1,
          reportedLatencyMs: elapsed,
          lastChecked: new Date().toLocaleTimeString(),
        } : c));

        addActivityEvent(
          'AI',
          `SEO Package generated in ${elapsed}ms via [${response.provider || activeConnection.name}]. Traceable to Script v${currentScript.versionNumber}.`,
          'success',
          '05_SEO_PACKAGE'
        );
        showToast('SEO metadata package generated successfully!');
        setIsSeoGenerating(false);
        return true;
      } else {
        const isRateLimit = response.errorCategory === 'RATE_LIMIT_429';
        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'failed',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          errorCategory: (response.errorCategory as any) || 'TRANSIENT_5XX',
          errorMessage: response.errorMessage || 'SEO generation failed.',
        } : j));

        if (isRateLimit) {
          setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
            ...c,
            status: 'cooldown',
            cooldownRemainingSec: 30,
          } : c));
        }

        addActivityEvent('AI', `SEO generation failed on [${activeConnection.name}]: ${response.errorMessage}`, 'error', '05_SEO_PACKAGE');
        showToast(`SEO generation failed: ${response.errorMessage || 'Error'}`);
        setIsSeoGenerating(false);
        return false;
      }
    } catch (e: any) {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        status: 'failed',
        progressPercent: 100,
        finishedAt: new Date().toISOString(),
        errorMessage: e?.message || 'Network exception',
      } : j));
      addActivityEvent('AI', `SEO generation exception: ${e?.message}`, 'error', '05_SEO_PACKAGE');
      showToast('Error connecting to AI service.');
      setIsSeoGenerating(false);
      return false;
    }
  }, [currentScript, project, selectedStory, activeConnectionId, activeConnection.name, addActivityEvent, clearArtifactStale, showToast]);

  const updateSeoPackage = useCallback((partial: Partial<SeoPackageData>) => {
    setSeoPackage(prev => ({
      ...prev,
      ...partial,
      isCustomEdited: true,
      updatedAt: new Date().toISOString(),
    }));
  }, []);

  const resetSeoToDefault = useCallback(() => {
    setSeoPackage({
      ...DEFAULT_SEO_PACKAGE,
      id: `seo_${Date.now()}`,
      projectId: project.id,
      sourceStoryId: selectedStory.id,
      sourceStoryVersion: selectedStory.version,
      scriptVersionReference: currentScript.versionNumber,
      updatedAt: new Date().toISOString(),
    });
    showToast('SEO package reset to baseline.');
  }, [project.id, selectedStory.id, selectedStory.version, currentScript.versionNumber, showToast]);

  // ==========================================
  // THUMBNAIL STUDIO (Phase 6 Core)
  // ==========================================

  const generateThumbnailsWithAI = useCallback(async (): Promise<boolean> => {
    if (!currentScript?.isApproved) {
      showToast('Stage 06 Locked: Explicit script approval in Stage 03 required.');
      addActivityEvent('EXPORT', 'Thumbnail generation blocked: Script must be approved in Stage 03 first.', 'warning', '06_THUMBNAIL_STUDIO');
      return false;
    }

    setIsThumbnailsGenerating(true);
    const jobId = `job_thumbs_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: 'GENERATE_THUMBNAIL_PROMPT_PACKAGES',
      stageId: '06_THUMBNAIL_STUDIO',
      status: 'running',
      progressPercent: 25,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    addActivityEvent(
      'AI',
      `Generating two distinct thumbnail prompt packages (Option A & B) for Script "${currentScript.title}" (v${currentScript.versionNumber}) on [${activeConnection.name}].`,
      'info',
      '06_THUMBNAIL_STUDIO'
    );

    const startTime = performance.now();
    try {
      const response = await AIService.generateThumbnails({
        connectionId: activeConnectionId,
        sourceTitle: selectedStory.title,
        sourceText: selectedStory.rawText,
        scriptTitle: currentScript.title,
        hookSummary: currentScript.hookSummary,
        scenes: currentScript.scenes,
        visualStyleId: project.visualStyleId,
        continuityBible,
        selectedSeoTitle: seoPackage?.selectedTitle || currentScript.title,
        language: project.language,
        format: project.format,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.success && response.data && Array.isArray(response.data)) {
        const generatedOptions: ThumbnailPromptItem[] = response.data.map(opt => ({
          ...opt,
          isCustomEdited: false,
        }));

        const updatedPackage: ThumbnailStudioPackage = {
          id: `thumb_pkg_${Date.now()}`,
          projectId: project.id,
          sourceStoryId: selectedStory.id,
          sourceStoryVersion: selectedStory.version,
          scriptVersionReference: currentScript.versionNumber,
          options: generatedOptions,
          selectedOptionId: thumbnailsPackage.selectedOptionId || 'option_a',
          isApproved: false, // Requires explicit user inspection and approval
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setThumbnailsPackage(updatedPackage);
        clearArtifactStale('thumbnailsStale');

        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'succeeded',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          latencyMs: elapsed,
        } : j));

        setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
          ...c,
          observedCallsCount: c.observedCallsCount + 1,
          reportedLatencyMs: elapsed,
          lastChecked: new Date().toLocaleTimeString(),
        } : c));

        addActivityEvent(
          'AI',
          `Two distinct thumbnail prompt packages generated in ${elapsed}ms via [${response.provider || activeConnection.name}]. Traceable to Script v${currentScript.versionNumber}.`,
          'success',
          '06_THUMBNAIL_STUDIO'
        );
        showToast('Thumbnail prompt packages generated successfully! Review and approve.');
        setIsThumbnailsGenerating(false);
        return true;
      } else {
        const isRateLimit = response.errorCategory === 'RATE_LIMIT_429';
        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'failed',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          errorCategory: (response.errorCategory as any) || 'TRANSIENT_5XX',
          errorMessage: response.errorMessage || 'Thumbnail generation failed.',
        } : j));

        if (isRateLimit) {
          setConnections(prev => prev.map(c => c.id === activeConnectionId ? {
            ...c,
            status: 'cooldown',
            cooldownRemainingSec: 30,
          } : c));
        }

        addActivityEvent('AI', `Thumbnail generation failed on [${activeConnection.name}]: ${response.errorMessage}`, 'error', '06_THUMBNAIL_STUDIO');
        showToast(`Thumbnail generation failed: ${response.errorMessage || 'Error'}`);
        setIsThumbnailsGenerating(false);
        return false;
      }
    } catch (e: any) {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        status: 'failed',
        progressPercent: 100,
        finishedAt: new Date().toISOString(),
        errorMessage: e?.message || 'Network exception',
      } : j));
      addActivityEvent('AI', `Thumbnail generation exception: ${e?.message}`, 'error', '06_THUMBNAIL_STUDIO');
      showToast('Error connecting to AI service.');
      setIsThumbnailsGenerating(false);
      return false;
    }
  }, [currentScript, selectedStory, project, continuityBible, seoPackage?.selectedTitle, thumbnailsPackage.selectedOptionId, activeConnectionId, activeConnection.name, addActivityEvent, clearArtifactStale, showToast]);

  const regenerateSingleThumbnailOptionWithAI = useCallback(async (optionId: string): Promise<boolean> => {
    const targetOption = thumbnailsPackage.options.find(o => o.id === optionId);
    if (!targetOption) return false;

    setIsSingleThumbnailRegenerating(optionId);
    const jobId = `job_thumb_regen_${optionId}_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: `REGENERATE_THUMBNAIL_${optionId.toUpperCase()}`,
      stageId: '06_THUMBNAIL_STUDIO',
      status: 'running',
      progressPercent: 30,
      attemptCount: 1,
      maxAttempts: 3,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    addActivityEvent('AI', `Regenerating ${targetOption.name} in isolation...`, 'info', '06_THUMBNAIL_STUDIO');
    const startTime = performance.now();

    try {
      const response = await AIService.regenerateSingleThumbnail({
        connectionId: activeConnectionId,
        optionId,
        sourceTitle: selectedStory.title,
        scriptTitle: currentScript.title,
        hookSummary: currentScript.hookSummary,
        visualStyleId: project.visualStyleId,
        continuityBible,
        selectedSeoTitle: seoPackage?.selectedTitle || currentScript.title,
        language: project.language,
        format: project.format,
        existingConceptAngle: targetOption.conceptAngle,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.success && response.data) {
        const regeneratedItem: ThumbnailPromptItem = {
          ...response.data,
          previewImageUrl: targetOption.previewImageUrl || response.data.previewImageUrl,
          isCustomEdited: false,
        };

        const updatedOptions = thumbnailsPackage.options.map(opt => 
          opt.id === optionId ? regeneratedItem : opt
        );

        setThumbnailsPackage(prev => ({
          ...prev,
          options: updatedOptions,
          isApproved: false, // Invalidate approval on modification
          updatedAt: new Date().toISOString(),
        }));

        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'succeeded',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          latencyMs: elapsed,
        } : j));

        addActivityEvent('AI', `${targetOption.name} regenerated in isolation. Other options preserved.`, 'success', '06_THUMBNAIL_STUDIO');
        showToast(`${targetOption.name} regenerated!`);
        setIsSingleThumbnailRegenerating(null);
        return true;
      }
    } catch (e: any) {
      console.error(e);
    }

    setJobs(prev => prev.map(j => j.id === jobId ? {
      ...j,
      status: 'failed',
      progressPercent: 100,
      finishedAt: new Date().toISOString(),
      errorMessage: 'Regeneration failed',
    } : j));

    addActivityEvent('AI', `Failed to regenerate ${targetOption.name}.`, 'error', '06_THUMBNAIL_STUDIO');
    showToast(`Failed to regenerate ${targetOption.name}.`);
    setIsSingleThumbnailRegenerating(null);
    return false;
  }, [thumbnailsPackage, selectedStory.title, currentScript.title, currentScript.hookSummary, project.visualStyleId, project.language, project.format, continuityBible, seoPackage?.selectedTitle, activeConnectionId, addActivityEvent, showToast]);

  const updateThumbnailOption = useCallback((optionId: string, partial: Partial<ThumbnailPromptItem>) => {
    setThumbnailsPackage(prev => {
      const updatedOptions = prev.options.map(opt => 
        opt.id === optionId ? { ...opt, ...partial, isCustomEdited: true } : opt
      );
      return {
        ...prev,
        options: updatedOptions,
        isApproved: false, // Editing draft resets approval
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const selectPrimaryThumbnail = useCallback((optionId: string) => {
    setThumbnailsPackage(prev => ({
      ...prev,
      selectedOptionId: optionId,
      updatedAt: new Date().toISOString(),
    }));
    const optName = optionId === 'option_a' ? 'Option A' : 'Option B';
    showToast(`${optName} set as primary export thumbnail.`);
  }, [showToast]);

  const approveThumbnails = useCallback(() => {
    const approvedNow = new Date().toISOString();
    setThumbnailsPackage(prev => ({
      ...prev,
      isApproved: true,
      approvedAt: approvedNow,
      updatedAt: approvedNow,
    }));
    clearArtifactStale('thumbnailsStale');
    addActivityEvent('EXPORT', `Stage 06 Thumbnail package explicitly APPROVED. Ready for Stage 07 Export.`, 'success', '06_THUMBNAIL_STUDIO');
    showToast('Thumbnails APPROVED! Stage 07 ready.');
  }, [clearArtifactStale, addActivityEvent, showToast]);

  const unlockThumbnailsForEdits = useCallback(() => {
    setThumbnailsPackage(prev => ({
      ...prev,
      isApproved: false,
      updatedAt: new Date().toISOString(),
    }));
    addActivityEvent('EXPORT', 'Thumbnails unlocked for custom refinement.', 'info', '06_THUMBNAIL_STUDIO');
    showToast('Thumbnails unlocked for editing.');
  }, [addActivityEvent, showToast]);

  const resetThumbnailsToDefault = useCallback(() => {
    const isShorts = project.format === '9:16_SHORTS';
    setThumbnailsPackage({
      ...DEFAULT_THUMBNAIL_PACKAGE,
      id: `thumb_pkg_${Date.now()}`,
      projectId: project.id,
      sourceStoryId: selectedStory.id,
      sourceStoryVersion: selectedStory.version,
      scriptVersionReference: currentScript.versionNumber,
      updatedAt: new Date().toISOString(),
      options: DEFAULT_THUMBNAIL_PACKAGE.options.map(opt => ({
        ...opt,
        ratio: isShorts ? '9:16 vertical' : '16:9 horizontal',
        previewImageUrl: opt.id === 'option_a'
          ? (isShorts ? '/src/assets/images/thumb_enigma_v_1792435064413.jpg' : '/src/assets/images/thumbnail_enigma_1792435046467.jpg')
          : (isShorts ? '/src/assets/images/thumb_observer_v_1792435065654.jpg' : '/src/assets/images/thumbnail_observer_1792435045693.jpg'),
      }))
    });
    showToast('Thumbnail Studio reset to baseline.');
  }, [project.format, project.id, selectedStory.id, selectedStory.version, currentScript.versionNumber, showToast]);

  const renderThumbnailImageWithAI = useCallback(async (optionId: string): Promise<boolean> => {
    const targetOption = thumbnailsPackage.options.find(o => o.id === optionId);
    if (!targetOption) return false;

    setIsImageRendering(optionId);
    const jobId = `job_img_render_${optionId}_${Date.now()}`;
    const newJob: AIJob = {
      id: jobId,
      taskType: `RENDER_THUMBNAIL_IMAGE_${optionId.toUpperCase()}`,
      stageId: '06_THUMBNAIL_STUDIO',
      status: 'running',
      progressPercent: 30,
      attemptCount: 1,
      maxAttempts: 2,
      connectionId: activeConnectionId,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    setJobs(prev => [newJob, ...prev]);
    addActivityEvent('AI', `Rendering real thumbnail image for ${targetOption.name} with Google Imagen 3...`, 'info', '06_THUMBNAIL_STUDIO');
    const startTime = performance.now();

    try {
      const response = await AIService.renderThumbnailImage({
        connectionId: activeConnectionId,
        prompt: targetOption.detailedPrompt,
        format: project.format,
        optionId,
      });

      const elapsed = Math.round(performance.now() - startTime);

      if (response.success && response.imageUrl) {
        updateThumbnailOption(optionId, { previewImageUrl: response.imageUrl });

        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'succeeded',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          latencyMs: elapsed,
        } : j));

        addActivityEvent('AI', `Rendered image for ${targetOption.name} in ${elapsed}ms via [${response.provider || 'Google Imagen 3'}].`, 'success', '06_THUMBNAIL_STUDIO');
        showToast(`${targetOption.name} visual preview rendered!`);
        setIsImageRendering(null);
        return true;
      } else {
        setJobs(prev => prev.map(j => j.id === jobId ? {
          ...j,
          status: 'failed',
          progressPercent: 100,
          finishedAt: new Date().toISOString(),
          errorMessage: response.errorMessage || 'Image rendering failed',
          errorCategory: (response.errorCategory as any) || 'TRANSIENT_5XX',
        } : j));

        addActivityEvent('AI', `Image render failed for ${targetOption.name}: ${response.errorMessage}`, 'error', '06_THUMBNAIL_STUDIO');
        showToast(`Image render failed: ${response.errorMessage || 'Provider error'}`);
        setIsImageRendering(null);
        return false;
      }
    } catch (e: any) {
      setJobs(prev => prev.map(j => j.id === jobId ? {
        ...j,
        status: 'failed',
        progressPercent: 100,
        finishedAt: new Date().toISOString(),
        errorMessage: e?.message || 'Exception during image render',
      } : j));
      addActivityEvent('AI', `Image render exception: ${e?.message}`, 'error', '06_THUMBNAIL_STUDIO');
      showToast('Error connecting to image render engine.');
      setIsImageRendering(null);
      return false;
    }
  }, [thumbnailsPackage.options, project.format, activeConnectionId, updateThumbnailOption, addActivityEvent, showToast]);

  return (
    <WorkflowContext.Provider
      value={{
        activeStageId,
        setActiveStageId,
        getStageStatus,
        canNavigateToStage,
        navigateToNextStage,
        navigateToPrevStage,
        requestStageNavigation,
        project,
        updateProject,
        stories,
        selectedStoryId,
        selectedStory,
        selectStory,
        saveStory,
        createBlankStory,
        duplicateStory,
        archiveStory,
        unarchiveStory,
        deleteStoryPermanently,
        importStoriesData,
        exportStoriesData,
        restoreCompleteProjectBackup,
        exportCompleteProjectBackup,
        hasUnsavedSourceEdits,
        setHasUnsavedSourceEdits,
        unsavedModalState,
        closeUnsavedModal,
        hasSelectedSource,
        setHasSelectedSource,
        hasGeneratedScript,
        setHasGeneratedScript,
        isScriptApproved,
        setIsScriptApproved,
        hasGeneratedPrompts,
        setHasGeneratedPrompts,
        // Script Studio (Phase 3 Core)
        currentScript,
        scriptVersions,
        isScriptGenerating,
        generateScriptWithAI,
        regenerateSingleBeatWithAI,
        saveScriptDraft,
        approveScript,
        unlockScriptForEdits,
        rollbackScriptVersion,
        // Scene Prompts Studio (Phase 4 Core + Safety Compliance)
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
        // SEO Package Studio (Phase 5 Core)
        seoPackage,
        isSeoGenerating,
        generateSeoWithAI,
        updateSeoPackage,
        resetSeoToDefault,
        // Thumbnail Studio (Phase 6 Core)
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
        staleMatrix,
        markArtifactStale,
        clearArtifactStale,
        connections,
        activeConnection,
        setActiveConnectionId,
        isProviderModalOpen,
        setIsProviderModalOpen,
        refreshProviders,
        discoverModels,
        refreshConnectionModels,
        saveProviderConnection,
        testProviderConnection,
        toggleProviderConnection,
        deleteProviderConnection,
        simulateRateLimitTest,
        simulateQuotaExhaustedTest,
        jobs,
        activeJob,
        triggerJobSimulation,
        cancelActiveJob,
        retryJob,
        activityEvents,
        addActivityEvent,
        clearActivityEvents,
        isControlCenterOpen,
        setIsControlCenterOpen,
        isActivityDrawerOpen,
        setIsActivityDrawerOpen,
        isProjectModalOpen,
        setIsProjectModalOpen,
        toastMessage,
        showToast,
      }}
    >
      {children}
    </WorkflowContext.Provider>
  );
};

export const useWorkflow = () => {
  const context = useContext(WorkflowContext);
  if (!context) {
    throw new Error('useWorkflow must be used within a WorkflowProvider');
  }
  return context;
};
