/**
 * ILLUMATRIX Client AI Service
 * Calls server-side proxy routes at /api/ai/* keeping all secrets isolated.
 * Source of truth: ILLUMATRIX Final Master Blueprint
 */

import { ScriptSceneBeat, ScriptVersion, SupportedProvider, DiscoveredModel } from '../types/hud';

export interface ScriptGenerationParams {
  connectionId?: string;
  sourceText: string;
  sourceTitle: string;
  sourceVersion: number;
  contentMode: string;
  language: 'en' | 'hi';
  format: '9:16_SHORTS' | '16:9_LONG_FORM';
  duration: number;
  visualStyle: string;
  targetAudience?: string;
  callToAction?: string;
}

export interface GeneratedScriptResponse {
  title: string;
  hookSummary: string;
  scenes: Array<{
    sceneNumber: number;
    timeRange: string;
    purpose: string;
    narrationText: string;
    visualDirectionDraft: string;
    wordCount?: number;
  }>;
  totalEstimatedWords: number;
  speakingDurationSeconds: number;
  editorialNotes?: string;
}

export const AIService = {
  // Check health and server runtime connection
  async checkHealth(): Promise<{ online: boolean; provider: string; model: string; hasKey: boolean; latencyMs: number }> {
    const start = performance.now();
    try {
      const res = await fetch('/api/ai/health');
      const latencyMs = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        return {
          online: data.status === 'online',
          provider: data.provider || 'Google GenAI',
          model: data.model || 'gemini-3.8-flash',
          hasKey: Boolean(data.hasKey),
          latencyMs,
        };
      }
    } catch (e) {
      console.warn('AI health check failed:', e);
    }
    return {
      online: false,
      provider: 'Local Workflow Engine',
      model: 'deterministic-fallback',
      hasKey: false,
      latencyMs: Math.round(performance.now() - start),
    };
  },

  // Auto-detect provider locally on server without third-party leaks
  async detectProvider(params: { key?: string; baseUrl?: string; accountId?: string }): Promise<{
    success: boolean;
    detectedProvider: SupportedProvider | null;
    confidence: 'reliable' | 'ambiguous' | 'none';
    reason: string;
    suggestedModel?: string;
    suggestedBaseUrl?: string;
    suggestedQuotaPool?: string;
    ambiguousOptions?: SupportedProvider[];
  }> {
    try {
      const res = await fetch('/api/providers/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Provider detection request failed:', e);
    }
    return {
      success: false,
      detectedProvider: null,
      confidence: 'none',
      reason: 'Detection service unavailable',
    };
  },

  // Provider Connection Management API
  async getProviders(): Promise<{ success: boolean; connections: any[]; activeConnectionId: string }> {
    try {
      const res = await fetch('/api/providers');
      if (res.ok) {
        const data = await res.json();
        return {
          success: true,
          connections: data.connections || [],
          activeConnectionId: data.activeConnectionId || 'conn_gemini_primary',
        };
      }
    } catch (e) {
      console.warn('Failed to fetch providers from server:', e);
    }
    return { success: false, connections: [], activeConnectionId: 'conn_gemini_primary' };
  },

  async saveProvider(payload: {
    id?: string;
    name: string;
    provider: SupportedProvider;
    modelId: string;
    baseUrl?: string;
    accountId?: string;
    apiKey?: string;
    quotaPool?: string;
    isEnabled?: boolean;
  }): Promise<{ success: boolean; connection?: any; message?: string }> {
    try {
      const res = await fetch('/api/providers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, connection: data.connection };
      }
      return { success: false, message: data.message || 'Failed to save provider.' };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Network error saving provider.' };
    }
  },

  async setActiveProvider(id: string): Promise<boolean> {
    try {
      const res = await fetch('/api/providers/active', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async testProvider(id: string): Promise<{
    success: boolean;
    status?: string;
    latencyMs?: number;
    error?: string;
    errorCategory?: string;
    model?: string;
    testedAt?: string;
  }> {
    try {
      const res = await fetch('/api/providers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, error: e?.message || 'Network error testing connection.' };
    }
  },

  async toggleProvider(id: string): Promise<{ success: boolean; isEnabled: boolean }> {
    try {
      const res = await fetch(`/api/providers/${encodeURIComponent(id)}/toggle`, {
        method: 'POST',
      });
      return await res.json();
    } catch {
      return { success: false, isEnabled: false };
    }
  },

  async deleteProvider(id: string): Promise<{ success: boolean; message?: string; switchedActiveTo?: string }> {
    try {
      const res = await fetch(`/api/providers/${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      return { success: res.ok, message: data.message, switchedActiveTo: data.switchedActiveTo };
    } catch {
      return { success: false, message: 'Network error deleting connection.' };
    }
  },

  // Dynamic model discovery for a provider or connection
  async fetchAvailableModels(params: {
    connectionId?: string;
    provider?: SupportedProvider;
    apiKey?: string;
    baseUrl?: string;
  }): Promise<{
    success: boolean;
    provider: SupportedProvider;
    models: DiscoveredModel[];
    source: 'live_api' | 'cached_catalog';
    message?: string;
  }> {
    try {
      const res = await fetch('/api/providers/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return data;
      }
      return {
        success: false,
        provider: params.provider || 'Google GenAI',
        models: [],
        source: 'cached_catalog',
        message: data.message || 'Failed to discover models.',
      };
    } catch (e: any) {
      return {
        success: false,
        provider: params.provider || 'Google GenAI',
        models: [],
        source: 'cached_catalog',
        message: e?.message || 'Network error discovering models.',
      };
    }
  },

  // Refresh model catalog for a specific connection
  async refreshConnectionModels(connectionId: string): Promise<{
    success: boolean;
    provider: SupportedProvider;
    models: DiscoveredModel[];
    source: 'live_api' | 'cached_catalog';
    message?: string;
    catalogStatus?: 'loaded' | 'refresh_required' | 'failed';
    catalogFetchedAt?: string;
  }> {
    try {
      const res = await fetch(`/api/providers/${encodeURIComponent(connectionId)}/refresh-models`, {
        method: 'POST',
      });
      const data = await res.json();
      return data;
    } catch (e: any) {
      return {
        success: false,
        provider: 'Google GenAI',
        models: [],
        source: 'cached_catalog',
        message: e?.message || 'Network error refreshing models.',
      };
    }
  },

  // Single model lookup
  async lookupSingleModel(params: {
    provider: SupportedProvider;
    modelId: string;
    apiKey?: string;
  }): Promise<{ success: boolean; model?: DiscoveredModel; message?: string }> {
    try {
      const res = await fetch('/api/providers/single-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      return await res.json();
    } catch (e: any) {
      return { success: false, message: e?.message || 'Network error looking up model info.' };
    }
  },

  // Generate full script from source story and configuration
  async generateScript(params: ScriptGenerationParams): Promise<{
    success: boolean;
    data?: GeneratedScriptResponse;
    provider?: string;
    isFallback?: boolean;
    errorCategory?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();

      if (!response.ok || result.error) {
        return {
          success: false,
          errorCategory: result.category || (response.status === 429 ? 'RATE_LIMIT_429' : 'TRANSIENT_5XX'),
          errorMessage: result.message || `Provider returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: result.data,
        provider: result.provider,
        isFallback: Boolean(result.isFallback),
      };
    } catch (networkError: any) {
      return {
        success: false,
        errorCategory: 'TRANSIENT_5XX',
        errorMessage: networkError?.message || 'Network connection failed while calling AI proxy.',
      };
    }
  },

  // Regenerate a single scene beat in isolation
  async regenerateSingleScene(params: {
    connectionId?: string;
    sceneNumber: number;
    timeRange: string;
    purpose: string;
    sourceText: string;
    contentMode: string;
    language: string;
    visualStyle: string;
  }): Promise<{ success: boolean; data?: { narrationText: string; visualDirectionDraft: string; wordCount: number }; errorMessage?: string }> {
    try {
      const response = await fetch('/api/ai/regenerate-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        return { success: true, data: result.data };
      }
      return { success: false, errorMessage: result.message || 'Single scene regeneration failed.' };
    } catch (e: any) {
      return { success: false, errorMessage: e?.message || 'Network error during single scene regeneration.' };
    }
  },

  // Generate Google Flow Scene Prompts from approved script scenes
  async generateScenePrompts(params: {
    connectionId?: string;
    scenes: Array<{
      sceneNumber: number;
      timeRange: string;
      purpose: string;
      narrationText: string;
      visualDirectionDraft: string;
    }>;
    format: string;
    visualStyleId: string;
    language: string;
    continuityBible: any;
    sourceTitle: string;
    contentMode?: string;
  }): Promise<{
    success: boolean;
    data?: any[];
    provider?: string;
    isFallback?: boolean;
    errorCategory?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/generate-scene-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        return {
          success: false,
          errorCategory: result.category || (response.status === 429 ? 'RATE_LIMIT_429' : 'TRANSIENT_5XX'),
          errorMessage: result.message || `Provider returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: result.data,
        provider: result.provider,
        isFallback: Boolean(result.isFallback),
      };
    } catch (e: any) {
      return {
        success: false,
        errorCategory: 'TRANSIENT_5XX',
        errorMessage: e?.message || 'Network failure while connecting to prompt generation engine.',
      };
    }
  },

  // Regenerate visual style only (preserving script & narration)
  async regenerateStylePrompts(params: {
    connectionId?: string;
    scenes: any[];
    newVisualStyleId: string;
    continuityBible: any;
    contentMode?: string;
  }): Promise<{
    success: boolean;
    data?: any[];
    provider?: string;
    isFallback?: boolean;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/regenerate-style-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        return {
          success: true,
          data: result.data,
          provider: result.provider,
          isFallback: Boolean(result.isFallback),
        };
      }
      return { success: false, errorMessage: result.message || 'Style regeneration failed.' };
    } catch (e: any) {
      return { success: false, errorMessage: e?.message || 'Network error during style regeneration.' };
    }
  },

  // Regenerate a single scene prompt package in isolation
  async regenerateSingleScenePrompt(params: {
    connectionId?: string;
    sceneNumber: number;
    format: string;
    durationSec: number;
    scriptBeat: string;
    narration: string;
    visualStyleId: string;
    continuityBible: any;
    contentMode?: string;
  }): Promise<{
    success: boolean;
    data?: any;
    provider?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/regenerate-scene-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        return {
          success: true,
          data: result.data,
          provider: result.provider,
        };
      }
      return { success: false, errorMessage: result.message || 'Single prompt regeneration failed.' };
    } catch (e: any) {
      return { success: false, errorMessage: e?.message || 'Network error during prompt regeneration.' };
    }
  },

  // Repair a prompt rejected by Google Flow
  async repairFlowRejection(params: {
    scene: any;
    rejectionReason: string;
    contentMode: string;
    continuityBible: any;
  }): Promise<{
    success: boolean;
    data?: any;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/repair-flow-rejection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (response.ok && result.success) {
        return {
          success: true,
          data: result.data,
        };
      }
      return { success: false, errorMessage: result.message || 'Failed to repair prompt.' };
    } catch (e: any) {
      return { success: false, errorMessage: e?.message || 'Network error repairing prompt.' };
    }
  },

  // Generate SEO Package from approved script and project context
  async generateSeoPackage(params: {
    connectionId?: string;
    sourceTitle: string;
    sourceText: string;
    scriptTitle: string;
    hookSummary: string;
    scenes: Array<{
      sceneNumber: number;
      timeRange: string;
      purpose: string;
      narrationText: string;
    }>;
    contentMode: string;
    language: string;
    format: string;
    duration: number;
    targetAudience?: string;
    callToAction?: string;
  }): Promise<{
    success: boolean;
    data?: {
      titleOptions: string[];
      selectedTitle: string;
      description: string;
      tags: string[];
      hashtags: string[];
      chapters: Array<{ timestamp: string; title: string }>;
    };
    provider?: string;
    errorCategory?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        return {
          success: false,
          errorCategory: result.category || (response.status === 429 ? 'RATE_LIMIT_429' : 'TRANSIENT_5XX'),
          errorMessage: result.message || `Provider returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: result.data,
        provider: result.provider,
      };
    } catch (e: any) {
      return {
        success: false,
        errorCategory: 'TRANSIENT_5XX',
        errorMessage: e?.message || 'Network failure while connecting to SEO generation engine.',
      };
    }
  },

  // Generate Two Distinct Thumbnail Prompts (Phase 6 Core)
  async generateThumbnails(params: {
    connectionId?: string;
    sourceTitle: string;
    sourceText: string;
    scriptTitle: string;
    hookSummary: string;
    scenes: Array<{
      sceneNumber: number;
      timeRange: string;
      purpose: string;
      narrationText: string;
      visualDirectionDraft: string;
    }>;
    visualStyleId: string;
    continuityBible: any;
    selectedSeoTitle: string;
    language: string;
    format: string;
  }): Promise<{
    success: boolean;
    data?: any[];
    provider?: string;
    errorCategory?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/generate-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        return {
          success: false,
          errorCategory: result.category || (response.status === 429 ? 'RATE_LIMIT_429' : 'TRANSIENT_5XX'),
          errorMessage: result.message || `Provider returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: result.data,
        provider: result.provider,
      };
    } catch (e: any) {
      return {
        success: false,
        errorCategory: 'TRANSIENT_5XX',
        errorMessage: e?.message || 'Network failure while connecting to thumbnail generation engine.',
      };
    }
  },

  // Regenerate a single thumbnail option in isolation
  async regenerateSingleThumbnail(params: {
    connectionId?: string;
    optionId: string;
    sourceTitle: string;
    scriptTitle: string;
    hookSummary: string;
    visualStyleId: string;
    continuityBible: any;
    selectedSeoTitle: string;
    language: string;
    format: string;
    existingConceptAngle?: string;
  }): Promise<{
    success: boolean;
    data?: any;
    provider?: string;
    errorCategory?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/regenerate-single-thumbnail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        return {
          success: false,
          errorCategory: result.category || (response.status === 429 ? 'RATE_LIMIT_429' : 'TRANSIENT_5XX'),
          errorMessage: result.message || `Provider returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        data: result.data,
        provider: result.provider,
      };
    } catch (e: any) {
      return {
        success: false,
        errorCategory: 'TRANSIENT_5XX',
        errorMessage: e?.message || 'Network failure while connecting to thumbnail regeneration engine.',
      };
    }
  },

  // Render actual thumbnail image using backend Google Imagen provider
  async renderThumbnailImage(params: {
    connectionId?: string;
    prompt: string;
    format: string;
    optionId: string;
  }): Promise<{
    success: boolean;
    imageUrl?: string;
    provider?: string;
    errorCategory?: string;
    errorMessage?: string;
  }> {
    try {
      const response = await fetch('/api/ai/render-thumbnail-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      const result = await response.json();
      if (!response.ok || result.error) {
        return {
          success: false,
          errorCategory: result.category || (response.status === 429 ? 'RATE_LIMIT_429' : response.status === 503 ? 'KEY_UNCONFIGURED' : 'TRANSIENT_5XX'),
          errorMessage: result.message || `Provider returned HTTP ${response.status}`,
        };
      }

      return {
        success: true,
        imageUrl: result.imageUrl,
        provider: result.provider,
      };
    } catch (e: any) {
      return {
        success: false,
        errorCategory: 'TRANSIENT_5XX',
        errorMessage: e?.message || 'Network failure while connecting to image rendering engine.',
      };
    }
  }
};

