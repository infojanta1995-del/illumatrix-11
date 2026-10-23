/**
 * ILLUMATRIX HUD & Workflow Types
 * Source of truth: ILLUMATRIX Final Master Blueprint
 */

export type StageId = 
  | '01_SETUP'
  | '02_SOURCES'
  | '03_SCRIPT_STUDIO'
  | '04_SCENE_PROMPTS'
  | '05_SEO_PACKAGE'
  | '06_THUMBNAIL_STUDIO'
  | '07_REVIEW_EXPORT';

export type StageStatus = 'unlocked' | 'current' | 'completed' | 'blocked' | 'stale';

export interface StageDefinition {
  id: StageId;
  stepNumber: string; // '01', '02', etc.
  title: string;
  shortLabel: string;
  description: string;
  prerequisiteMessage?: string;
}

export type VideoFormat = '9:16_SHORTS' | '16:9_LONG_FORM';
export type ShortsDuration = 24 | 32 | 40 | 48; // seconds
export type LongFormDuration = 3 | 4 | 5 | 8 | 10; // minutes (unresolved conflict preserved)
export type Language = 'en' | 'hi';
export type SourceType = 'article' | 'research_notes' | 'raw_transcript' | 'news_dispatch' | 'creative_story';

export interface SourceStory {
  id: string;
  projectId: string;
  title: string;
  sourceType: SourceType;
  notes?: string;
  rawText: string; // Exact line breaks & paragraphs preserved
  version: number;
  wordCount: number;
  charCount: number;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScriptSceneBeat {
  id: string;
  sceneNumber: number;
  timeRange: string;
  purpose: string;
  narrationText: string;
  visualDirectionDraft: string;
  wordCount: number;
  isCustomEdited?: boolean;
}

export interface ScriptVersion {
  id: string;
  sourceStoryId: string;
  sourceStoryVersion: number;
  versionNumber: number;
  title: string;
  hookSummary: string;
  scenes: ScriptSceneBeat[];
  totalWords: number;
  speakingDurationSeconds: number;
  editorialNotes?: string;
  isApproved: boolean;
  isFallback?: boolean;
  fallbackReason?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  configSnapshot: {
    format: VideoFormat;
    duration: number;
    modeId: string;
    language: Language;
    visualStyleId: string;
  };
}

export interface FictionalCharacterSpec {
  id: string;
  role: string;
  originalAppearance: string; // Distinct original appearance: facial structure, hair, build, distinguishing marks
  wardrobeAndStyle: string;
  notes?: string;
}

export interface ContinuityBible {
  id: string;
  projectId: string;
  voiceNarrator: string;
  musicMood: string;
  soundDesign: string;
  visualPalette: string;
  recurringSubjects?: string;
  cameraGrammar?: string;
  fictionalCharacters?: FictionalCharacterSpec[];
  updatedAt: string;
}

export type SafetyReviewStatus = 'clean' | 'flagged' | 'revised' | 'unrepairable';

export interface SafetyIssueFlag {
  type: 
    | 'prominent_person_name' 
    | 'likeness_request' 
    | 'unconfirmed_depiction' 
    | 'proxy_description' 
    | 'risky_inherited_context';
  entityOrPhrase?: string;
  reason: string;
  severity: 'warning' | 'high';
}

export interface PromptSafetyReview {
  status: SafetyReviewStatus;
  flags: SafetyIssueFlag[];
  isRevised: boolean;
  originalVisualPrompt?: string; // Preserves unedited original visual prompt for review/recovery
  explanation?: string;
  suggestedAction?: string;
  fictionalCharacterProfile?: {
    role: string;
    appearance: string;
    wardrobe: string;
    continuityId: string;
  };
  contextualCategory?: 'fictional_creative' | 'documentary_news' | 'abstract_scifi';
  reviewedAt: string;
}

export interface ScenePackageData {
  id: string;
  sceneNumber: number;
  title: string;
  format: '9:16 vertical' | '16:9 horizontal';
  durationSec: number;
  scriptBeat: string;
  visualPrompt: string;
  continuitySnippet: string;
  narration: string;
  soundDesign: string;
  visualStyleId: string;
  isCustomEdited: boolean;
  scriptVersionReference: number;
  safetyReview?: PromptSafetyReview;
  originalVisualPrompt?: string; // Preserves baseline prompt prior to safety revision
  flowRejectionReported?: boolean;
  flowRejectionReason?: string;
  isFallback?: boolean;
  generatorProvider?: string;
}

export interface ChapterMarker {
  timestamp: string; // e.g. "00:00", "00:08", "00:16"
  title: string;
}

export interface SeoPackageData {
  id: string;
  projectId: string;
  sourceStoryId: string;
  sourceStoryVersion: number;
  scriptVersionReference: number;
  titleOptions: string[];
  selectedTitle: string;
  description: string;
  tags: string[];
  hashtags: string[];
  chapters: ChapterMarker[];
  isCustomEdited: boolean;
  isFallback?: boolean;
  generatorProvider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ThumbnailPromptItem {
  id: string; // 'option_a' | 'option_b'
  name: string;
  conceptAngle: string;
  ratio: string;
  focalSubject: string;
  lightingAndMood: string;
  composition: string;
  detailedPrompt: string;
  overlayTextSuggestion: string;
  negativeConstraints: string;
  previewImageUrl?: string;
  isCustomEdited?: boolean;
}

export interface ThumbnailStudioPackage {
  id: string;
  projectId: string;
  sourceStoryId: string;
  sourceStoryVersion: number;
  scriptVersionReference: number;
  options: ThumbnailPromptItem[];
  selectedOptionId: string; // 'option_a' | 'option_b'
  isApproved: boolean;
  approvedAt?: string;
  isFallback?: boolean;
  generatorProvider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ContentMode {
  id: string;
  name: string;
  tagline: string;
  pacing: string;
  tone: string;
  rules: string;
}

export interface VisualStyle {
  id: string;
  name: string;
  category: 'Cinematic' | 'Craft & Stop-Motion' | 'Animation' | 'Artistic & Illustrative' | 'Stylized Digital';
  promptTreatment: string;
  isDefault?: boolean;
}

export interface ProjectSettings {
  id: string;
  name: string;
  format: VideoFormat;
  shortsDuration: ShortsDuration;
  longFormDurationMinutes: LongFormDuration;
  modeId: string;
  language: Language;
  visualStyleId: string;
  targetAudience?: string;
  callToAction?: string;
  selectedConnectionId?: string;
  selectedModelId?: string;
  selectedModelDisplayName?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DefaultModelPreference {
  connectionId: string;
  modelId: string;
  modelDisplayName?: string;
  provider?: SupportedProvider;
  updatedAt?: string;
}

export interface ProjectSession {
  id: string;
  name: string;
  selectedConnectionId?: string;
  selectedModelId?: string;
  selectedModelDisplayName?: string;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface StaleMatrix {
  sourceStoryStale: boolean;
  scriptStale: boolean;
  promptsStale: boolean;
  thumbnailsStale: boolean;
  seoStale: boolean;
  upstreamReason?: string;
}

export type SupportedProvider =
  | 'Google GenAI'
  | 'Groq'
  | 'OpenRouter'
  | 'Cerebras'
  | 'Cloudflare Workers AI'
  | 'Hugging Face'
  | 'Mistral AI'
  | 'SambaNova'
  | 'Ollama'
  | 'OpenAI'
  | 'OpenAI Compatible'
  | 'External Provider'
  | 'Local Mock Engine';

export interface ModelCapability {
  supportsText: boolean;
  supportsImageGeneration: boolean;
  supportsStructuredJson: boolean;
  supportsStreaming: boolean;
  supportsTools: boolean;
}

export type ModelPrimaryModality =
  | 'text'
  | 'multimodal'
  | 'image'
  | 'audio'
  | 'embedding'
  | 'reranker'
  | 'moderation'
  | 'unknown';

export interface ModelCompatibility {
  primaryModality: ModelPrimaryModality;
  isTextGenerationCapable: boolean;
  isImageGenerationCapable: boolean;
  supportsStructuredJson: boolean;
  supportsStreaming: boolean;
  supportsTools: boolean;
  compatibilityStatus: 'compatible' | 'incompatible' | 'unknown';
  reason?: string;
}

export interface ModelPricing {
  promptPricePerMillion?: number; // USD per 1M prompt tokens
  completionPricePerMillion?: number; // USD per 1M completion tokens
  isZeroPriced: boolean; // Verified zero-priced ($0.00 / 1M)
  pricingTier?: 'free' | 'paid' | 'unknown'; // Verified pricing tier
  pricingNote?: string;
}

export interface AccountLimitSnapshot {
  source: 'USER-SUPPLIED SNAPSHOT' | 'LIVE PROVIDER RESPONSE' | 'PUBLISHED CATALOG' | 'UNKNOWN' | 'LIVE PROVIDER DATA';
  asOfDate?: string;
  rpm?: number | string;
  rpd?: number | string;
  tpm?: number | string;
  tpd?: number | string;
  rawDetails?: string;
}

export interface DiscoveredModel {
  id: string; // Exact API Model ID (e.g. "qwen/qwen3.8-27b", "gemini-3.8-flash")
  displayName: string; // Human-readable label (e.g. "Qwen 3.8 27B", "Gemini 3.8 Flash")
  provider: SupportedProvider;
  description?: string;
  contextLength?: number;
  capabilities: ModelCapability;
  pricing?: ModelPricing;
  accountLimits?: AccountLimitSnapshot;
  supportedParameters?: string[];
  compatibility?: ModelCompatibility;
  isAvailable: boolean;
  source: 'live_api' | 'cached_catalog';
  fetchedAt?: string;
}

export interface ProviderConnection {
  id: string;
  name: string;
  provider: SupportedProvider;
  modelId: string;
  modelDisplayName?: string;
  baseUrl?: string;
  accountId?: string;
  status: 'online' | 'unconfigured' | 'cooldown' | 'degraded' | 'disabled' | 'untested';
  modelStatus?: 'verified' | 'rate_limited' | 'unavailable' | 'untested';
  catalogStatus?: 'loaded' | 'refresh_required' | 'failed' | 'untested';
  catalogFetchedAt?: string;
  quotaPool: string;
  isDefault?: boolean;
  isEnabled?: boolean;
  supportsStreaming: boolean;
  supportsStructuredJson: boolean;
  allowFailover?: boolean;
  lastChecked: string;
  lastTestStatus?: 'success' | 'failed' | 'untested';
  lastTestError?: string;
  lastTestedAt?: string;
  reportedLatencyMs: number | null; // null represents "Not reported"
  observedCallsCount: number;
  quotaReported: boolean;
  cooldownRemainingSec?: number;
  hasKey?: boolean;
  maskedKey?: string;
  accountLimits?: AccountLimitSnapshot;
  pricing?: ModelPricing;
  capabilities?: ModelCapability;
  supportedParameters?: string[];
  discoveredModels?: DiscoveredModel[];
}

export type JobStatus = 'idle' | 'queued' | 'running' | 'succeeded' | 'failed' | 'retrying' | 'cancelled';

export interface AIJob {
  id: string;
  taskType: string;
  stageId: StageId;
  status: JobStatus;
  progressPercent: number;
  attemptCount: number;
  maxAttempts: number;
  connectionId: string;
  createdAt: string;
  startedAt?: string;
  finishedAt?: string;
  latencyMs?: number;
  errorCategory?: 'RATE_LIMIT_429' | 'QUOTA_EXHAUSTED' | 'TRANSIENT_5XX' | 'INVALID_CREDENTIALS' | 'MALFORMED' | null;
  errorMessage?: string;
}

export interface ActivityEvent {
  id: string;
  timestamp: string;
  stageId?: StageId;
  category: 'SYSTEM' | 'CONFIG' | 'SOURCE' | 'SCRIPT' | 'PROMPTS' | 'STYLE' | 'JOB' | 'FAILOVER' | 'EXPORT' | 'AI';
  level: 'info' | 'success' | 'warning' | 'error';
  message: string;
  meta?: Record<string, unknown>;
}
