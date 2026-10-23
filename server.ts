import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { providerManager, detectProvider, PROVIDER_REGISTRY } from './src/server/providerManager';
import { PromptSafetyEngine } from './src/services/promptSafetyEngine';
import { validateCustomProviderUrl } from './src/server/urlSafetyValidator';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.use(express.json({ limit: '2mb' }));

// Allowed and benchmarked text generation models (primary fast model + backup model)
const TEXT_MODELS = ['gemini-3.1-flash-lite', 'gemini-3.8-flash'];

// Secret scrubbing helper to ensure zero API keys or credentials can ever appear in logs or error payloads
function sanitizeError(err: any): string {
  const raw = String(err?.message || err || 'Unknown error');
  return raw
    .replace(/key=[a-zA-Z0-9_\-]+/gi, 'key=***')
    .replace(/AIza[a-zA-Z0-9_\-]+/gi, 'AIza***')
    .replace(/Bearer\s+[a-zA-Z0-9_\-\.]+/gi, 'Bearer ***');
}

// Dynamic Google GenAI client retrieval to support environment changes at runtime
let cachedAiClient: GoogleGenAI | null = null;
let lastApiKey: string | undefined = undefined;

function getAiClient(): GoogleGenAI | null {
  const currentKey = process.env.GEMINI_API_KEY;
  if (!currentKey) {
    cachedAiClient = null;
    lastApiKey = undefined;
    return null;
  }

  if (!cachedAiClient || lastApiKey !== currentKey) {
    try {
      cachedAiClient = new GoogleGenAI({
        apiKey: currentKey,
        httpOptions: {
          timeout: 30000,
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
      lastApiKey = currentKey;
    } catch (err) {
      console.error('Failed to initialize Google GenAI SDK:', sanitizeError(err));
      cachedAiClient = null;
    }
  }
  return cachedAiClient;
}

// Shared robust model execution with automatic retry and model fallback
async function generateWithModelFallback(
  client: GoogleGenAI,
  prompt: string | any,
  options: {
    systemInstruction?: string;
    responseMimeType?: string;
    responseSchema?: any;
    models?: string[];
  }
): Promise<{ text: string; model: string }> {
  const models = options.models || TEXT_MODELS;
  let lastError: any = null;

  for (const modelName of models) {
    // Up to 2 attempts per model with backoff for transient 503 / high demand spikes
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const config: any = {};
        if (options.systemInstruction) config.systemInstruction = options.systemInstruction;
        if (options.responseMimeType) config.responseMimeType = options.responseMimeType;
        if (options.responseSchema) config.responseSchema = options.responseSchema;
        if (modelName === 'gemini-3.8-flash') {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
        }

        const res = await client.models.generateContent({
          model: modelName,
          contents: prompt,
          config,
        });

        if (res.text) {
          return { text: res.text, model: modelName };
        }
      } catch (err: any) {
        lastError = err;
        const msg = sanitizeError(err);
        const status = err?.status || err?.code;
        const isTransient = status === 503 || status === 429 || msg.includes('503') || msg.includes('high demand') || msg.includes('UNAVAILABLE');

        if (attempt === 1 && isTransient) {
          console.warn(`Transient issue on ${modelName} (attempt 1), backing off before retry:`, msg);
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }

        console.warn(`Model ${modelName} call failed after ${attempt} attempt(s):`, msg);
        break; // Failover to the next candidate model
      }
    }
  }

  throw lastError || new Error('All configured AI models failed to return content');
}

// 1. Health & Connection check
app.get('/api/ai/health', (_req: Request, res: Response) => {
  const activeId = providerManager.getActiveConnectionId();
  const conns = providerManager.getPublicConnections();
  const activeConn = conns.find(c => c.id === activeId) || conns[0];

  res.json({
    status: activeConn?.hasKey ? (activeConn.isEnabled ? activeConn.status : 'disabled') : 'unconfigured',
    provider: activeConn?.provider || 'Google GenAI',
    connectionName: activeConn?.name || 'Default Runtime',
    model: activeConn?.modelId || TEXT_MODELS[0],
    backupModel: TEXT_MODELS[1],
    hasKey: Boolean(activeConn?.hasKey),
    activeConnectionId: activeId,
    lastTestStatus: activeConn?.lastTestStatus || 'untested',
    timestamp: new Date().toISOString(),
  });
});

// Provider Connection Management API Routes
app.get('/api/providers', (_req: Request, res: Response) => {
  res.json({
    success: true,
    connections: providerManager.getPublicConnections(),
    activeConnectionId: providerManager.getActiveConnectionId(),
  });
});

app.post('/api/providers/detect', (req: Request, res: Response) => {
  const { key, baseUrl, accountId } = req.body || {};
  const result = detectProvider(key, baseUrl, accountId);
  res.json({ success: true, ...result });
});

app.post('/api/providers', async (req: Request, res: Response): Promise<void> => {
  const { id, name, provider, modelId, baseUrl, accountId, apiKey, quotaPool, isEnabled } = req.body || {};
  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: true, message: 'Provider name is required.' });
    return;
  }

  const cleanBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';
  const provKey = (provider || 'Google GenAI') as keyof typeof PROVIDER_REGISTRY;
  const isCustom =
    provKey === 'OpenAI Compatible' ||
    (provKey as string) === 'External Provider' ||
    (cleanBaseUrl.length > 0 && cleanBaseUrl !== PROVIDER_REGISTRY[provKey]?.defaultBaseUrl);

  if (isCustom && cleanBaseUrl.length > 0) {
    const urlValidation = await validateCustomProviderUrl(cleanBaseUrl);
    if (!urlValidation.isValid) {
      res.status(400).json({
        error: true,
        category: urlValidation.errorCategory || 'SSRF_BLOCKED',
        message: urlValidation.error || 'Destination URL failed SSRF security validation.',
      });
      return;
    }
  }

  const saved = providerManager.addOrUpdateConnection({
    id,
    name,
    provider: provider || 'Google GenAI',
    modelId: modelId || 'gemini-3.1-flash-lite',
    baseUrl,
    accountId,
    apiKey,
    quotaPool,
    isEnabled,
  });
  res.json({ success: true, connection: saved });
});

app.post('/api/providers/active', (req: Request, res: Response) => {
  const { id } = req.body || {};
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: true, message: 'Connection ID is required.' });
    return;
  }
  const ok = providerManager.setActiveConnectionId(id);
  if (!ok) {
    res.status(404).json({ error: true, message: 'Connection not found.' });
    return;
  }
  res.json({ success: true, activeConnectionId: id });
});

app.post('/api/providers/test', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.body || {};
  if (!id || typeof id !== 'string') {
    res.status(400).json({ error: true, message: 'Connection ID is required.' });
    return;
  }
  const result = await providerManager.testConnection(id);
  res.json(result);
});

app.post('/api/providers/:id/toggle', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = providerManager.toggleConnection(id);
  res.json(result);
});

app.delete('/api/providers/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const result = providerManager.deleteConnection(id);
  if (!result.success) {
    res.status(400).json({ error: true, message: result.message || 'Cannot delete default or non-existent connection.' });
    return;
  }
  res.json({ success: true, switchedActiveTo: result.switchedActiveTo });
});

// Dynamic Model Discovery & Live Catalog Routes
app.post('/api/providers/models', async (req: Request, res: Response): Promise<void> => {
  const { connectionId, provider, apiKey, baseUrl } = req.body || {};
  try {
    const result = await providerManager.fetchAvailableModels({
      connectionId,
      provider,
      apiKey,
      baseUrl,
    });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Error discovering models',
    });
  }
});

app.get('/api/providers/:id/models', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await providerManager.fetchAvailableModels({ connectionId: id });
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Error discovering models for connection',
    });
  }
});

app.post('/api/providers/:id/refresh-models', async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  try {
    const result = await providerManager.refreshModelsForConnection(id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Error refreshing models for connection',
    });
  }
});

app.post('/api/providers/single-model', async (req: Request, res: Response): Promise<void> => {
  const { provider, modelId, apiKey } = req.body || {};
  if (!provider || !modelId) {
    res.status(400).json({ success: false, message: 'Provider and modelId are required.' });
    return;
  }
  try {
    const result = await providerManager.fetchSingleModelInfo(provider, modelId, apiKey);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({
      success: false,
      message: err?.message || 'Error looking up single model info',
    });
  }
});

// Mode specific guidelines per Blueprint Page 8
const MODE_PROMPTS: Record<string, string> = {
  documentary: 'Evidence-aware, measured, informative, narrative progression. Avoid unsupported claims. Ground strictly in facts provided.',
  explainer: 'Plain-language explanation, clear logical sequence, relatable analogy when useful, concrete concept-to-takeaway.',
  breaking_news: 'Lead with confirmed developments first. Distinguish confirmed facts from unknowns. Clear urgent delivery without sensational misinformation.',
  horror_story: 'Atmospheric tension escalation, claustrophobic sensory details, controlled reveals, satisfying chilling payoff.',
  funny: 'Setup, comedic escalation, contrast, sharp punchline. Do not force jokes that falsify source facts.',
  scifi_explainer: 'Speculative/futuristic framing clearly separated from real facts. Coherent concepts and vivid scientific grounding.',
  detailed_explainer: 'Exhaustive context and explanatory depth. Structured sequence, clear definitions, and layered technical transitions.',
};

// 2. Script Generation Endpoint (Phase 3 Core)
app.post('/api/ai/generate-script', async (req: Request, res: Response): Promise<void> => {
  const {
    connectionId,
    modelId,
    sourceText,
    sourceTitle,
    contentMode = 'scifi_explainer',
    language = 'en',
    format = '9:16_SHORTS',
    duration = 24,
    visualStyle = 'cinematic',
    targetAudience,
    callToAction,
  } = req.body;

  if (!sourceText || typeof sourceText !== 'string' || sourceText.trim().length === 0) {
    res.status(400).json({ error: true, message: 'Source text is required and cannot be empty.' });
    return;
  }

  if (sourceText.length > 50000) {
    res.status(400).json({ error: true, message: 'Source text exceeds maximum limit (50,000 characters).' });
    return;
  }

  // Calculate required scenes for Shorts per Blueprint Page 6 & 9
  // 24s -> 3 scenes (0-8s Hook, 8-16s Main, 16-24s Ending/Payoff)
  // 32s -> 4 scenes, 40s -> 5 scenes, 48s -> 6 scenes
  const isShorts = format === '9:16_SHORTS';
  const expectedSceneCount = isShorts ? Math.max(3, Math.min(6, Math.round(duration / 8))) : Math.max(4, Math.round((duration * 60) / 30));

  const modeGuidance = MODE_PROMPTS[contentMode] || MODE_PROMPTS.explainer;
  const langRequirement = language === 'hi' 
    ? 'HINDI LANGUAGE MANDATE: All narrationText and title must be written in natural, fluent, idiomatic Devanagari Hindi (हिंदी). Do NOT output English or Romanized Hindi.'
    : 'ENGLISH LANGUAGE MANDATE: All narrationText and title must be written in crisp, natural, high-retention English.';

  const systemInstruction = `You are ILLUMATRIX Script Engine, an elite content preparation intelligence.
Transform the provided source story into a highly engaging, high-retention video script.

NON-NEGOTIABLE CORE RULES:
1. FAITHFUL TO SOURCE: Ground factual information strictly in the provided source story. Never invent facts, fake statistics, fake quotes, or unconfirmed news.
2. NO VIRALITY PROMISES: Optimize for retention, curiosity loops, and narrative clarity.
3. SCENE COUNT AND TIMING:
   - For Shorts (${format}): Output EXACTLY ${expectedSceneCount} scenes (each scene corresponds to an 8-second pacing block, e.g. 0–8s, 8–16s). Narration per scene: 16–22 words.
   - For Long-Form (${format}): Output EXACTLY ${expectedSceneCount} narrative scenes (~30-second pacing blocks, formatted as mm:ss–mm:ss timestamps, e.g. 00:00–00:30, 00:30–01:00). Narration per scene: 55–75 words.
4. LANGUAGE: ${langRequirement}
5. MODE GUIDANCE: ${modeGuidance}
6. VISUAL CUES: Provide a visual direction draft tailored to ${visualStyle} visual style.
7. SPEAKING RATE: Narration pacing must comfortably match the duration (${isShorts ? '16–22 words per 8s scene' : '55–75 words per 30s scene'}).`;

  const userPrompt = `SOURCE STORY TITLE: ${typeof sourceTitle === 'string' ? sourceTitle.slice(0, 300) : 'Source Article'}
SOURCE STORY TEXT:
${sourceText}

CONFIGURATION:
- Video Format: ${format}
- Target Duration: ${isShorts ? `${duration} seconds` : `${duration} minutes`}
- Required Scene Count: ${expectedSceneCount} scenes
- Content Mode: ${contentMode}
- Language: ${language === 'hi' ? 'Hindi (हिंदी)' : 'English'}
- Visual Style: ${visualStyle}
${targetAudience ? `- Target Audience: ${String(targetAudience).slice(0, 200)}` : ''}
${callToAction ? `- Call to Action: ${String(callToAction).slice(0, 200)}` : ''}

Draft the complete script breakdown with exactly ${expectedSceneCount} scenes.`;

  // Dispatch through shared Provider Manager
  try {
    const aiResult = await providerManager.executeTextGeneration({
      connectionId,
      modelId,
      prompt: userPrompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          hookSummary: { type: Type.STRING },
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                timeRange: { type: Type.STRING },
                purpose: { type: Type.STRING },
                narrationText: { type: Type.STRING },
                visualDirectionDraft: { type: Type.STRING },
                wordCount: { type: Type.INTEGER },
              },
              required: ['sceneNumber', 'timeRange', 'purpose', 'narrationText', 'visualDirectionDraft'],
            },
          },
          totalEstimatedWords: { type: Type.INTEGER },
          speakingDurationSeconds: { type: Type.INTEGER },
          editorialNotes: { type: Type.STRING },
        },
        required: ['title', 'hookSummary', 'scenes', 'totalEstimatedWords', 'speakingDurationSeconds'],
      },
    });

    if (aiResult.text) {
      const parsedData = JSON.parse(aiResult.text);
      res.json({
        success: true,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
        isFallback: false,
        data: parsedData,
        rawResponse: aiResult.text,
      });
      return;
    }
  } catch (apiError: any) {
    const sanitized = sanitizeError(apiError);
    console.error('AI execution error:', sanitized);
    
    const isRateLimit = apiError?.status === 429 || sanitized.includes('429');
    const isQuota = sanitized.toLowerCase().includes('quota');
    const is503 = apiError?.status === 503 || sanitized.includes('503') || sanitized.includes('high demand');
    const isPermission = apiError?.status === 403 || sanitized.includes('403') || sanitized.includes('API key not valid');
    
    if (isRateLimit || isQuota || is503 || isPermission) {
      res.status(isRateLimit ? 429 : isPermission ? 403 : is503 ? 503 : 500).json({
        error: true,
        category: isRateLimit ? 'RATE_LIMIT_429' : isQuota ? 'QUOTA_EXHAUSTED' : isPermission ? 'INVALID_CREDENTIALS' : is503 ? 'SERVICE_UNAVAILABLE_503' : 'TRANSIENT_5XX',
        message: sanitized,
      });
      return;
    }
  }

  // Graceful Local High-Precision Generator if AI provider returns offline/fallback
  // Extracts directly from source text without inventing unrelated external facts
  const cleanSource = sourceText.replace(/\r\n/g, '\n').trim();
  const paragraphs = cleanSource.split(/\n\s*\n/).map((p: string) => p.trim()).filter((p: string) => p.length > 0);
  
  // Extract sentences from source text
  const rawSentences = cleanSource
    .split(/(?<=[.?!।])\s+/)
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 5);

  const sentences = rawSentences.length > 0 ? rawSentences : (paragraphs.length > 0 ? paragraphs : [cleanSource]);

  const fallbackScenes = [];

  for (let i = 0; i < expectedSceneCount; i++) {
    const sceneNum = i + 1;
    const timeRange = isShorts
      ? `${i * 8}–${(i + 1) * 8}s`
      : `${String(Math.floor((i * 30) / 60)).padStart(2, '0')}:${String((i * 30) % 60).padStart(2, '0')}–${String(Math.floor(((i + 1) * 30) / 60)).padStart(2, '0')}:${String(((i + 1) * 30) % 60).padStart(2, '0')}`;
    let purpose = 'Development';
    let narrationText = '';
    let visualCue = '';

    // Calculate sentence index to spread source text evenly across scenes
    const sentenceIdx = Math.min(
      Math.floor((i / Math.max(1, expectedSceneCount - 1)) * (sentences.length - 1)),
      sentences.length - 1
    );
    const sourceSegment = sentences[sentenceIdx] || sentences[0] || cleanSource.slice(0, 100);

    // Limit words to fit ~16-22 words for shorts or ~55-75 words for longform
    const maxTargetWords = isShorts ? 22 : 65;
    const segmentWords = sourceSegment.split(/\s+/);
    const trimmedSegment = segmentWords.slice(0, maxTargetWords).join(' ');

    if (sceneNum === 1) {
      purpose = 'Hook / Immediate Curiosity';
      narrationText = trimmedSegment;
      visualCue = `Cinematic opening composition establishing ${sourceTitle || 'the primary subject'} with dramatic atmospheric lighting.`;
    } else if (sceneNum === expectedSceneCount) {
      purpose = 'Ending / Payoff & Curiosity Loop';
      const lastSentence = sentences[sentences.length - 1] || sourceSegment;
      narrationText = lastSentence.split(/\s+/).slice(0, maxTargetWords).join(' ');
      visualCue = `Expansive concluding wide shot reflecting on the implications of ${sourceTitle || 'the narrative'}.`;
    } else {
      purpose = sceneNum === 2 ? 'Main Idea / Key Reveal' : `Context Beat ${sceneNum - 1}`;
      narrationText = trimmedSegment;
      visualCue = `Detailed focal shot highlighting key evidence and progression from the source account.`;
    }

    fallbackScenes.push({
      sceneNumber: sceneNum,
      timeRange,
      purpose,
      narrationText,
      visualDirectionDraft: visualCue,
      wordCount: narrationText.split(/\s+/).length,
    });
  }

  const totalWords = fallbackScenes.reduce((acc, s) => acc + s.wordCount, 0);

  res.json({
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: {
      title: `${sourceTitle || 'Source Analysis'} — ${contentMode.toUpperCase()}`,
      hookSummary: fallbackScenes[0].narrationText,
      scenes: fallbackScenes,
      totalEstimatedWords: totalWords,
      speakingDurationSeconds: Math.round(totalWords / 2.5),
      editorialNotes: 'Generated via Local Deterministic Engine (Offline/Fallback Mode) directly from the provided source text. This is a deterministic structural fallback, not a live AI generation.',
    },
  });
});

// 3. Single Scene Regeneration Endpoint
app.post('/api/ai/regenerate-scene', async (req: Request, res: Response): Promise<void> => {
  const {
    connectionId,
    modelId,
    sceneNumber,
    timeRange = '0–8s',
    purpose = 'Development',
    sourceText,
    contentMode = 'scifi_explainer',
    language = 'en',
    visualStyle = 'cinematic'
  } = req.body;

  if (!sceneNumber || typeof sceneNumber !== 'number') {
    res.status(400).json({ error: true, message: 'Valid sceneNumber is required.' });
    return;
  }

  if (!sourceText || typeof sourceText !== 'string') {
    res.status(400).json({ error: true, message: 'Source text context is required.' });
    return;
  }

  try {
    const prompt = `Regenerate ONLY Scene ${sceneNumber} (${timeRange}) with purpose "${purpose}".
SOURCE STORY CONTEXT:
${sourceText.slice(0, 20000)}

RULES:
- Content Mode: ${contentMode}
- Language: ${language === 'hi' ? 'Natural Hindi (हिंदी)' : 'English'}
- Visual Style: ${visualStyle}
- Return JSON with: narrationText, visualDirectionDraft, wordCount.`;

    const aiResult = await providerManager.executeTextGeneration({
      connectionId,
      modelId,
      prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          narrationText: { type: Type.STRING },
          visualDirectionDraft: { type: Type.STRING },
          wordCount: { type: Type.INTEGER },
        },
        required: ['narrationText', 'visualDirectionDraft'],
      },
    });

    if (aiResult.text) {
      res.json({
        success: true,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
        isFallback: false,
        data: JSON.parse(aiResult.text),
      });
      return;
    }
  } catch (e: any) {
    const sanitized = sanitizeError(e);
    console.warn('Single scene regeneration failed:', sanitized);
    const isRateLimit = e?.status === 429 || sanitized.includes('429');
    const is503 = e?.status === 503 || sanitized.includes('503') || sanitized.includes('high demand');
    const isPermission = e?.status === 403 || sanitized.includes('403') || sanitized.includes('API key');
    if (isRateLimit || is503 || isPermission) {
      res.status(isRateLimit ? 429 : isPermission ? 403 : is503 ? 503 : 500).json({
        error: true,
        category: isRateLimit ? 'RATE_LIMIT_429' : isPermission ? 'INVALID_CREDENTIALS' : is503 ? 'SERVICE_UNAVAILABLE_503' : 'TRANSIENT_5XX',
        message: sanitized,
      });
      return;
    }
  }

  res.json({
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: {
      narrationText: language === 'hi'
        ? `नए वैज्ञानिक निष्कर्षों से पता चलता है कि सिग्नल की आवृत्ति में एक छिपा हुआ गणितीय क्रम मौजूद है।`
        : `Refined telemetric measurements reveal a secondary harmonic pulse embedded within the prime transmission.`,
      visualDirectionDraft: `Dynamic orbit shot highlighting secondary prismatic refraction layers on the crystalline prism.`,
      wordCount: 18,
    },
  });
});

// Visual Style Dictionary for Google Flow Prompts
const STYLE_PROMPTS: Record<string, { name: string; treatment: string; camera: string; lighting: string }> = {
  cinematic: {
    name: 'Cinematic',
    treatment: 'Film-like 35mm composition, motivated cinematic camera movement, sharp subject separation, subtle volumetric lighting, controlled chromatic color grade.',
    camera: 'Smooth mechanical dolly track, slow cinematic orbit, deliberate vertical pedestal lift.',
    lighting: 'Cold atmospheric fill with stark directional key rim light, crisp edge separation.',
  },
  paper_craft: {
    name: 'Paper Craft / Stop Motion',
    treatment: 'Intricate layered paper cutouts, visible fiber texture, physical handcrafted depth, tactile stop-motion lighting.',
    camera: 'Gentle step-frame stop-motion camera drift, macro diorama framing.',
    lighting: 'Warm studio tabletop lighting casting tangible soft paper shadows.',
  },
  claymation: {
    name: 'Claymation',
    treatment: 'Expressive sculpted clay models with visible fingerprint ridges, physical stop-motion charm, tactile plasticity.',
    camera: 'Close-up tactile framing with gentle handmade camera jitters.',
    lighting: 'Directional tungsten desk lamp rim lights with soft physical bounce.',
  },
  '3d_animation': {
    name: '3D Animated Family-Film',
    treatment: 'Rich expressive stylized 3D geometry, luminous subsurface scattering, appealing character shapes, vibrant color palette.',
    camera: 'Fluid sweeping 3D camera crane moves, dynamic focal lengths.',
    lighting: 'Lush golden-hour rim highlights and colorful ambient fills.',
  },
  ghibli_anime: {
    name: 'Ghibli-inspired Hand-Drawn Anime',
    treatment: 'Exquisite hand-painted background art, soft pastel environmental atmosphere, wind-blown particulate motion, nostalgic cel aesthetic.',
    camera: 'Expansive painterly panning, gentle organic drift across scenic vistas.',
    lighting: 'Soft diffused morning sunlight, dappled foliage shadows.',
  },
  retro_anime_90s: {
    name: '90s Retro Anime Cel Shading',
    treatment: 'Bold ink linework, vibrant 90s cel shading, analog VHS grain texture, high-contrast dynamic action lines.',
    camera: 'Dynamic diagonal crash zooms, dramatic dutch angle tracking.',
    lighting: 'Harsh neon highlights with dramatic cast shadow gradients.',
  },
  watercolor: {
    name: 'Watercolor Illustration',
    treatment: 'Delicate pigment washes, organic bleeding edges, heavy cold-press paper grain texture, ethereal fluid motion.',
    camera: 'Slow lyrical push-in across damp pigments, floating perspective.',
    lighting: 'High-key luminous paper glow with transparent watercolor washes.',
  },
  ink_wash: {
    name: 'Ink Wash / Sumi-e',
    treatment: 'Expressive black ink brush strokes, mindful negative space, atmospheric water dilution, poetic minimalist aesthetics.',
    camera: 'Meditative horizontal scroll, gentle fluid focus pulls.',
    lighting: 'Monochrome charcoal gradations against pristine parchment.',
  },
  flat_vector: {
    name: 'Flat Vector Illustration',
    treatment: 'Crisp geometric contours, bold graphic color blocking, modern minimalist iconography, clean planar composition.',
    camera: 'Smooth 2D parallax sliding, rhythmic lateral pans.',
    lighting: 'Flat graphic illumination without harsh specular glare.',
  },
  isometric_3d: {
    name: 'Isometric 3D Render',
    treatment: 'Orthographic isometric projection, detailed miniature diorama scale, clean geometric bevels, pristine architectural model feel.',
    camera: 'Fixed 45-degree isometric perspective with gentle rotational micro-turntable.',
    lighting: 'Clean studio softbox lighting with crisp ambient occlusion shadows.',
  },
  pixel_art: {
    name: 'Pixel Art 8-Bit',
    treatment: 'Strict pixel grid fidelity, nostalgic CRT scanline curvature, limited retro palette, retro gaming sprite charm.',
    camera: 'Pixel-perfect 2D lateral scrolling and stepped tile zooms.',
    lighting: 'Indexed color brightness steps with classic dithered shading.',
  },
  comic_book: {
    name: 'Comic Book Graphic Novel',
    treatment: 'Bold graphic ink contours, authentic Ben-Day halftone dot patterns, dramatic noir hatching, dynamic graphic framing.',
    camera: 'Snappy panel-to-panel whip pans and angular punch-ins.',
    lighting: 'High-contrast chiaroscuro with saturated pop-art accent tones.',
  },
  noir_sketch: {
    name: 'Noir Black & White Sketch',
    treatment: 'High-contrast charcoal sketching, gritty graphite texture, dramatic Venetian blind shadow patterns, moody mystery.',
    camera: 'Low-angle claustrophobic framing with slow suspenseful tilt.',
    lighting: 'Extreme high-contrast key lighting, deep obsidian blacks and stark silvery highlights.',
  },
};

// 4. Generate Google Flow Scene Prompts (Phase 4 Core + Safety Compliance)
app.post('/api/ai/generate-scene-prompts', async (req: Request, res: Response): Promise<void> => {
  const {
    connectionId,
    modelId,
    scenes = [],
    format = '9:16_SHORTS',
    visualStyleId = 'cinematic',
    language = 'en',
    continuityBible = {},
    sourceTitle = 'Source Narrative',
    contentMode = 'scifi_explainer',
  } = req.body;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    res.status(400).json({ error: true, message: 'Approved script scenes array is required.' });
    return;
  }

  const isShorts = format === '9:16_SHORTS';
  const formatLabel: '9:16 vertical' | '16:9 horizontal' = isShorts ? '9:16 vertical' : '16:9 horizontal';
  const durationSec = isShorts ? 8 : 30;
  const styleConfig = STYLE_PROMPTS[visualStyleId] || STYLE_PROMPTS.cinematic;

  const systemInstruction = `You are ILLUMATRIX Google Flow Prompt Engine.
You translate approved video script scenes into production-grade Google Flow video prompt packages.
NON-NEGOTIABLE IMMUTABLE BOUNDARIES:
1. SCRIPT NARRATION IS IMMUTABLE: You must return the narration and script beat EXACTLY as provided, byte-for-byte. NEVER rewrite, summarize, truncate, or translate narration.
2. VISUAL SPECIFICITY: For each scene, create a rich visual prompt specifically tailored for Google Flow video generation:
   - Aspect ratio: ${formatLabel}
   - Visual Style: ${styleConfig.name} (${styleConfig.treatment})
   - Camera Direction: Motivated camera movement (${styleConfig.camera})
   - Lighting & Palette: ${continuityBible.visualPalette || styleConfig.lighting}
   - Composition & Environment: Describe subject action, foreground/background layers, and textures without inventing fake narrative facts.
3. SOUND DESIGN: Describe scene-specific atmospheric audio, foley, and sound cues complementing ${continuityBible.soundDesign || 'ambient space drone'}.
4. CONTINUITY SNIPPET: Concise 1-2 sentence checklist for visual continuity.
5. GOOGLE FLOW PROMINENT-PERSON SAFETY & COMPLIANCE MANDATES:
   - NEVER instruct Google Flow to generate recognizable likenesses, faces, or digital clones of real, living or prominent public figures (politicians, CEOs, celebrities, athletes, historical icons).
   - CREATIVE & FICTIONAL SCENES: Portray scenes using original fictional characters with distinct, original facial features, hairstyles, and wardrobe (e.g. 'an original fictional researcher with angular features, slate-grey curly hair, amber spectacles...').
   - DOCUMENTARY & HISTORICAL SCENES: If the script references real historical figures, do NOT generate synthetic face likenesses or fake deepfake depictions of them. Focus visual prompts on authentic archival documents, technical blueprints, laboratory instrumentation, environment, hardware, telemetry, or over-the-shoulder silhouette framing. Factual narration is strictly preserved.
   - NO MODERATION BYPASS: Never use evasive wording to trick Google Flow safety filters.`;

  const userPrompt = `PROJECT: ${sourceTitle}
FORMAT: ${formatLabel} (${durationSec}s per scene)
VISUAL STYLE: ${styleConfig.name}
CONTENT MODE: ${contentMode}
CONTINUITY BIBLE:
- Palette: ${continuityBible.visualPalette || 'Default Palette'}
- Sound: ${continuityBible.soundDesign || 'Default Sound'}
- Recurring Subjects: ${continuityBible.recurringSubjects || 'None specified'}
- Camera Grammar: ${continuityBible.cameraGrammar || styleConfig.camera}

SCENES TO GENERATE PROMPT PACKAGES FOR:
${JSON.stringify(scenes.map((s: any) => ({
  sceneNumber: s.sceneNumber,
  timeRange: s.timeRange,
  purpose: s.purpose,
  narrationText: s.narrationText,
  visualDirectionDraft: s.visualDirectionDraft,
})), null, 2)}

Generate a complete production prompt package for each scene.`;

  try {
    const aiResult = await providerManager.executeTextGeneration({
      connectionId,
      modelId,
      prompt: userPrompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          packages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                title: { type: Type.STRING },
                visualPrompt: { type: Type.STRING },
                continuitySnippet: { type: Type.STRING },
                soundDesign: { type: Type.STRING },
              },
              required: ['sceneNumber', 'title', 'visualPrompt', 'continuitySnippet', 'soundDesign'],
            },
          },
        },
        required: ['packages'],
      },
    });

    if (aiResult.text) {
      const parsed = JSON.parse(aiResult.text);
      const mappedPackages = scenes.map((s: any) => {
        const matched = (parsed.packages || []).find((p: any) => p.sceneNumber === s.sceneNumber) || {};
        return {
          id: `scene_pkg_${s.sceneNumber}_${Date.now()}`,
          sceneNumber: s.sceneNumber,
          title: matched.title || `SCENE 0${s.sceneNumber} — ${s.purpose.toUpperCase()}`,
          format: formatLabel,
          durationSec,
          scriptBeat: s.narrationText, // Byte-for-byte preserved
          visualPrompt: matched.visualPrompt || `${styleConfig.name} ${formatLabel} composition. ${s.visualDirectionDraft} ${styleConfig.treatment}`,
          continuitySnippet: matched.continuitySnippet || `Style: ${styleConfig.name}; Palette: ${continuityBible.visualPalette || 'Obsidian & Cyan'}; Camera: ${styleConfig.camera}`,
          narration: s.narrationText, // Byte-for-byte preserved
          soundDesign: matched.soundDesign || `${continuityBible.soundDesign || 'Atmospheric ambient sound'}.`,
          visualStyleId,
          isCustomEdited: false,
          scriptVersionReference: s.scriptVersionReference || 1,
        };
      });

      // Execute shared Prompt Safety Review across generated packages
      const reviewedPackages = PromptSafetyEngine.reviewAndRepairScenePackages(mappedPackages, {
        contentMode,
        sourceTitle,
        continuityBible,
        format: formatLabel,
        visualStyleId,
      });

      res.json({
        success: true,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
        isFallback: false,
        data: reviewedPackages,
      });
      return;
    }
  } catch (e: any) {
    const sanitized = sanitizeError(e);
    const category = e?.category || (e?.status === 429 ? 'RATE_LIMIT_429' : e?.status === 403 ? 'INVALID_CREDENTIALS' : 'TRANSIENT_5XX');
    if (category === 'RATE_LIMIT_429' || category === 'QUOTA_EXHAUSTED' || category === 'INVALID_CREDENTIALS') {
      res.status(category === 'RATE_LIMIT_429' ? 429 : category === 'INVALID_CREDENTIALS' ? 403 : 500).json({
        error: true,
        category,
        message: sanitized,
      });
      return;
    }
    console.warn('AI Scene Prompt generation fell back to deterministic generator:', sanitized);
  }

  // Deterministic Local Prompt Synthesis (Honest fallback preserving Page 11 copy layout)
  const localPackages = scenes.map((s: any) => {
    const sceneNum = s.sceneNumber;
    const purposeTitle = s.purpose ? s.purpose.replace(/^beat\s*\d+:\s*/i, '').trim().toUpperCase() : `SCENE 0${sceneNum}`;
    const title = `SCENE 0${sceneNum} — ${purposeTitle}`;
    
    // Scene-specific visual direction from approved beat
    const visualDraft = s.visualDirectionDraft ? s.visualDirectionDraft.replace(/\.$/, '') : `Focused visual composition highlighting ${s.purpose || 'the key subject'}`;
    const visualPrompt = `${styleConfig.name} ${formatLabel} composition. ${visualDraft}. ${styleConfig.treatment} Lighting & atmosphere: ${continuityBible.visualPalette || styleConfig.lighting}. Camera grammar: ${continuityBible.cameraGrammar || styleConfig.camera}.`;
    
    const soundDesign = `${continuityBible.soundDesign || 'Atmospheric soundscape with nuanced textures'}, motivated by ${s.purpose || 'narrative beat'}.`;
    const continuitySnippet = `Visual Style: ${styleConfig.name}; Palette: ${continuityBible.visualPalette || 'Obsidian black & cyan'}; Camera: ${continuityBible.cameraGrammar || styleConfig.camera}`;

    return {
      id: `scene_pkg_${sceneNum}_${Date.now()}`,
      sceneNumber: sceneNum,
      title,
      format: formatLabel,
      durationSec,
      scriptBeat: s.narrationText,
      visualPrompt,
      continuitySnippet,
      narration: s.narrationText,
      soundDesign,
      visualStyleId,
      isCustomEdited: false,
      scriptVersionReference: s.scriptVersionReference || 1,
    };
  });

  // Execute shared Prompt Safety Review across local fallback packages
  const reviewedLocal = PromptSafetyEngine.reviewAndRepairScenePackages(localPackages, {
    contentMode,
    sourceTitle,
    continuityBible,
    format: formatLabel,
    visualStyleId,
  });

  res.json({
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: reviewedLocal,
  });
});

// 5. Style-Only Regeneration Endpoint (Blueprint Page 12 Invariant + Safety Review)
app.post('/api/ai/regenerate-style-prompts', async (req: Request, res: Response): Promise<void> => {
  const {
    connectionId,
    modelId,
    scenes = [],
    newVisualStyleId = 'cinematic',
    continuityBible = {},
    contentMode = 'scifi_explainer',
  } = req.body;

  if (!Array.isArray(scenes) || scenes.length === 0) {
    res.status(400).json({ error: true, message: 'Scenes array is required and must not be empty.' });
    return;
  }

  if (scenes.length > 20) {
    res.status(400).json({ error: true, message: 'Scenes array exceeds maximum length (20 scenes).' });
    return;
  }

  const styleConfig = STYLE_PROMPTS[newVisualStyleId] || STYLE_PROMPTS.cinematic;

  try {
    const prompt = `STYLE-ONLY REGENERATION MANDATE:
Regenerate ONLY the visual descriptors for the following scenes to match the "${styleConfig.name}" aesthetic.
STYLE TREATMENT: ${styleConfig.treatment}
CAMERA GRAMMAR: ${styleConfig.camera}
LIGHTING: ${styleConfig.lighting}

IMMUTABLE LAW: SCRIPT NARRATION AND SCRIPT BEATS MUST REMAIN 100% BYTE-FOR-BYTE IDENTICAL. DO NOT MODIFY NARRATION.
PROMINENT PERSON MANDATE: Do not introduce or recreate recognizable likenesses of real prominent public figures.

INPUT SCENES:
${JSON.stringify(scenes.map((s: any) => ({
  sceneNumber: s.sceneNumber,
  visualPrompt: s.visualPrompt,
  narration: s.narration,
})), null, 2)}

Return updated visual prompts and continuity snippets reflecting the "${styleConfig.name}" aesthetic.`;

    const aiResult = await providerManager.executeTextGeneration({
      connectionId,
      modelId,
      prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          scenes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                sceneNumber: { type: Type.INTEGER },
                visualPrompt: { type: Type.STRING },
                continuitySnippet: { type: Type.STRING },
              },
              required: ['sceneNumber', 'visualPrompt', 'continuitySnippet'],
            },
          },
        },
        required: ['scenes'],
      },
    });

    if (aiResult.text) {
      const parsed = JSON.parse(aiResult.text);
      const updated = scenes.map((s: any) => {
        const match = (parsed.scenes || []).find((m: any) => m.sceneNumber === s.sceneNumber);
        const originalBase = s.originalVisualPrompt || s.visualPrompt;
        return {
          ...s,
          visualStyleId: newVisualStyleId,
          originalVisualPrompt: originalBase,
          visualPrompt: match?.visualPrompt || `[${styleConfig.name.toUpperCase()}]: ${styleConfig.treatment} ${s.visualPrompt.replace(/^\[.*?\]:\s*/, '')}`,
          continuitySnippet: match?.continuitySnippet || `Style: ${styleConfig.name}; Script & Narration strictly preserved.`,
          // Narration & scriptBeat STRICTLY preserved:
          scriptBeat: s.scriptBeat,
          narration: s.narration,
        };
      });

      // Safety review after style regeneration to prevent likeness reintroduction
      const reviewedUpdated = PromptSafetyEngine.reviewAndRepairScenePackages(updated, {
        contentMode,
        continuityBible,
        visualStyleId: newVisualStyleId,
      });

      res.json({
        success: true,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
        isFallback: false,
        data: reviewedUpdated,
      });
      return;
    }
  } catch (e: any) {
    const sanitized = sanitizeError(e);
    const category = e?.category || (e?.status === 429 ? 'RATE_LIMIT_429' : e?.status === 403 ? 'INVALID_CREDENTIALS' : 'TRANSIENT_5XX');
    if (category === 'RATE_LIMIT_429' || category === 'QUOTA_EXHAUSTED' || category === 'INVALID_CREDENTIALS') {
      res.status(category === 'RATE_LIMIT_429' ? 429 : category === 'INVALID_CREDENTIALS' ? 403 : 500).json({
        error: true,
        category,
        message: sanitized,
      });
      return;
    }
    console.warn('Style regeneration fell back to deterministic generator:', sanitized);
  }

  // Deterministic local style replacement preserving narration (Used when key is not configured)
  const updatedLocal = scenes.map((s: any) => ({
    ...s,
    visualStyleId: newVisualStyleId,
    originalVisualPrompt: s.originalVisualPrompt || s.visualPrompt,
    visualPrompt: `[${styleConfig.name.toUpperCase()} AESTHETIC]: ${styleConfig.treatment} ${s.visualPrompt.replace(/^\[.*?\]:\s*/, '')}`,
    continuitySnippet: `Visual Style: ${styleConfig.name}; Palette: ${continuityBible.visualPalette || 'Coherent grade'}; Script Beat & Narration strictly preserved.`,
    scriptBeat: s.scriptBeat,
    narration: s.narration,
  }));

  const reviewedLocal = PromptSafetyEngine.reviewAndRepairScenePackages(updatedLocal, {
    contentMode,
    continuityBible,
    visualStyleId: newVisualStyleId,
  });

  res.json({
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: reviewedLocal,
  });
});

// 6. Single Scene Prompt Regeneration Endpoint (With Safety Review)
app.post('/api/ai/regenerate-scene-prompt', async (req: Request, res: Response): Promise<void> => {
  const {
    connectionId,
    modelId,
    sceneNumber,
    format = '9:16 vertical',
    durationSec = 8,
    scriptBeat,
    narration,
    visualStyleId = 'cinematic',
    continuityBible = {},
    contentMode = 'scifi_explainer',
  } = req.body;

  if (!sceneNumber || typeof sceneNumber !== 'number') {
    res.status(400).json({ error: true, message: 'Valid sceneNumber is required.' });
    return;
  }

  const styleConfig = STYLE_PROMPTS[visualStyleId] || STYLE_PROMPTS.cinematic;

  try {
    const prompt = `Regenerate ONLY Scene ${sceneNumber} prompt package.
FORMAT: ${format} | DURATION: ${durationSec}s
STYLE: ${styleConfig.name} (${styleConfig.treatment})
CONTENT MODE: ${contentMode}
SCRIPT BEAT / NARRATION (IMMUTABLE): "${narration || scriptBeat || ''}"
PROMINENT PERSON MANDATE: Do NOT request likenesses of real prominent public figures. Use original fictional characters or documentary setting/instrumentation.

Create a refined visualPrompt, continuitySnippet, and soundDesign for this single scene.`;

    const aiResult = await providerManager.executeTextGeneration({
      connectionId,
      modelId,
      prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          visualPrompt: { type: Type.STRING },
          continuitySnippet: { type: Type.STRING },
          soundDesign: { type: Type.STRING },
        },
        required: ['title', 'visualPrompt', 'continuitySnippet', 'soundDesign'],
      },
    });

    if (aiResult.text) {
      const parsed = JSON.parse(aiResult.text);
      const rawPrompt = parsed.visualPrompt || `${styleConfig.name} ${format} composition. Refined visual direction.`;

      const safetyResult = PromptSafetyEngine.reviewPrompt(
        rawPrompt,
        narration || scriptBeat || '',
        { contentMode, continuityBible, format, visualStyleId }
      );

      res.json({
        success: true,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
        isFallback: false,
        data: {
          sceneNumber,
          title: parsed.title || `SCENE 0${sceneNumber} — REFINED BEAT`,
          format,
          durationSec,
          scriptBeat,
          narration,
          originalVisualPrompt: rawPrompt,
          visualPrompt: safetyResult.revisedVisualPrompt || rawPrompt,
          safetyReview: {
            status: safetyResult.status,
            flags: safetyResult.flags,
            isRevised: safetyResult.isRevised,
            originalVisualPrompt: rawPrompt,
            explanation: safetyResult.explanation,
            suggestedAction: safetyResult.suggestedAction,
            fictionalCharacterProfile: safetyResult.fictionalCharacterProfile,
            contextualCategory: safetyResult.contextualCategory,
            reviewedAt: new Date().toISOString(),
          },
          continuitySnippet: parsed.continuitySnippet,
          soundDesign: parsed.soundDesign,
          visualStyleId,
        },
      });
      return;
    }
  } catch (e: any) {
    const sanitized = sanitizeError(e);
    const category = e?.category || (e?.status === 429 ? 'RATE_LIMIT_429' : e?.status === 403 ? 'INVALID_CREDENTIALS' : 'TRANSIENT_5XX');
    if (category === 'RATE_LIMIT_429' || category === 'QUOTA_EXHAUSTED' || category === 'INVALID_CREDENTIALS') {
      res.status(category === 'RATE_LIMIT_429' ? 429 : category === 'INVALID_CREDENTIALS' ? 403 : 500).json({
        error: true,
        category,
        message: sanitized,
      });
      return;
    }
    console.warn('Single scene prompt regen fell back to deterministic generator:', sanitized);
  }

  const fallbackRawPrompt = `${styleConfig.name} ${format} composition. Dynamic re-framing highlighting specular facets and atmospheric light rays. ${styleConfig.treatment}`;
  const fallbackSafetyResult = PromptSafetyEngine.reviewPrompt(
    fallbackRawPrompt,
    narration || scriptBeat || '',
    { contentMode, continuityBible, format, visualStyleId }
  );

  res.json({
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: {
      sceneNumber,
      title: `SCENE 0${sceneNumber} — REFINED PERSPECTIVE`,
      format,
      durationSec,
      scriptBeat,
      narration,
      originalVisualPrompt: fallbackRawPrompt,
      visualPrompt: fallbackSafetyResult.revisedVisualPrompt || fallbackRawPrompt,
      safetyReview: {
        status: fallbackSafetyResult.status,
        flags: fallbackSafetyResult.flags,
        isRevised: fallbackSafetyResult.isRevised,
        originalVisualPrompt: fallbackRawPrompt,
        explanation: fallbackSafetyResult.explanation,
        suggestedAction: fallbackSafetyResult.suggestedAction,
        fictionalCharacterProfile: fallbackSafetyResult.fictionalCharacterProfile,
        contextualCategory: fallbackSafetyResult.contextualCategory,
        reviewedAt: new Date().toISOString(),
      },
      continuitySnippet: `Style: ${styleConfig.name}; Invariant: Narration strictly preserved.`,
      soundDesign: `Refined atmospheric soundscape with crisp spatial placement.`,
      visualStyleId,
    },
  });
});

// 6b. Repair Prompt After Google Flow Rejection (Task 6 Transparent Workflow)
app.post('/api/ai/repair-flow-rejection', async (req: Request, res: Response): Promise<void> => {
  const { scene, rejectionReason, contentMode = 'scifi_explainer', continuityBible = {} } = req.body || {};
  if (!scene || !scene.visualPrompt) {
    res.status(400).json({ error: true, message: 'Valid scene package with visualPrompt is required.' });
    return;
  }

  const originalPrompt = scene.originalVisualPrompt || scene.visualPrompt;
  const reviewResult = PromptSafetyEngine.reviewPrompt(
    scene.visualPrompt,
    scene.narration || scene.scriptBeat || '',
    {
      contentMode,
      continuityBible,
      format: scene.format,
      visualStyleId: scene.visualStyleId,
    }
  );

  const repairedVisualPrompt = reviewResult.revisedVisualPrompt || PromptSafetyEngine.synthesizeFictionalCharacterPrompt(
    scene.visualPrompt,
    PromptSafetyEngine.getOrCreateFictionalCharacter({ contentMode, continuityBible })
  );

  const updatedScene: any = {
    ...scene,
    originalVisualPrompt: originalPrompt,
    visualPrompt: repairedVisualPrompt,
    flowRejectionReported: true,
    flowRejectionReason: rejectionReason || 'Prominent-person or likeness policy rejection in Google Flow',
    safetyReview: {
      status: 'revised',
      flags: [
        ...reviewResult.flags,
        {
          type: 'likeness_request',
          entityOrPhrase: 'Google Flow rejection reported',
          reason: rejectionReason || 'User reported Google Flow rejected this prompt under prominent-person / likeness policies.',
          severity: 'high',
        }
      ],
      isRevised: true,
      originalVisualPrompt: originalPrompt,
      explanation: 'Prompt safely repaired to mitigate Google Flow rejection. Transformed into an original fictional subject or environmental archival composition while strictly preserving approved script narration.',
      suggestedAction: 'Review the alternative prompt. If acceptable, copy into Google Flow.',
      fictionalCharacterProfile: reviewResult.fictionalCharacterProfile,
      contextualCategory: reviewResult.contextualCategory,
      reviewedAt: new Date().toISOString(),
    },
    // Invariants strictly preserved:
    scriptBeat: scene.scriptBeat,
    narration: scene.narration,
    durationSec: scene.durationSec,
    format: scene.format,
  };

  res.json({
    success: true,
    data: updatedScene,
    message: 'Prompt repaired for Google Flow compliance.',
  });
});


// 7. SEO Package Generation Endpoint (Phase 5 Core)
app.post('/api/ai/generate-seo', async (req: Request, res: Response): Promise<void> => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: true, message: 'Invalid request body.' });
    return;
  }

  const {
    connectionId,
    modelId,
    sourceTitle = 'Source Article',
    sourceText = '',
    scriptTitle = '',
    hookSummary = '',
    scenes = [],
    contentMode = 'scifi_explainer',
    language = 'en',
    format = '9:16_SHORTS',
    duration = 24,
    targetAudience,
    callToAction,
  } = req.body;

  if (typeof sourceText === 'string' && sourceText.length > 50000) {
    res.status(400).json({ error: true, message: 'Source text exceeds maximum limit (50,000 chars).' });
    return;
  }

  if (Array.isArray(scenes) && scenes.length > 30) {
    res.status(400).json({ error: true, message: 'Scenes array exceeds maximum limit (30 scenes).' });
    return;
  }

  const isShorts = format === '9:16_SHORTS';
  const langRequirement = language === 'hi'
    ? 'HINDI LANGUAGE MANDATE: All titles and description MUST be written in natural, fluent, idiomatic Devanagari Hindi (हिंदी). Do NOT output English or Romanized transliteration for titles/description.'
    : 'ENGLISH LANGUAGE MANDATE: All titles and description must be written in crisp, high-retention English.';

  const systemInstruction = `You are ILLUMATRIX SEO Engine, an elite metadata optimization intelligence.
Your task is to generate a comprehensive, highly discoverable, script-grounded SEO package for a video.

CRITICAL INVARIANTS:
1. STRICT TRUTH & FIDELITY: Ground all titles, descriptions, and tags strictly in the provided script scenes and source facts. NEVER fabricate facts, false quotes, fake news, sensationalist lies, or promise details not in the script.
2. NO SENSATIONAL CLICKBAIT: Write high-retention titles that spark curiosity honestly without deceptive claims.
3. LANGUAGE: ${langRequirement}
4. TIMESTAMPS: Generate chapter markers strictly based on actual scene boundaries (e.g. 00:00, 00:08, 00:16 for Shorts). Never invent arbitrary timestamps.
5. FORMAT: ${isShorts ? '9:16 Shorts format' : '16:9 Long-Form format'}.
6. MODE: Tailor phrasing to "${contentMode}" tone.`;

  const userPrompt = `SOURCE TITLE: ${sourceTitle}
SCRIPT TITLE: ${scriptTitle || sourceTitle}
HOOK: ${hookSummary}
FORMAT: ${format} (${isShorts ? `${duration}s Shorts` : `${duration}m Long-Form`})
CONTENT MODE: ${contentMode}
LANGUAGE: ${language === 'hi' ? 'Hindi (Devanagari)' : 'English'}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ''}
${callToAction ? `CALL TO ACTION: ${callToAction}` : ''}

APPROVED SCRIPT SCENES:
${JSON.stringify(scenes.map((s: any) => ({
  sceneNumber: s.sceneNumber,
  timeRange: s.timeRange,
  purpose: s.purpose,
  narrationText: s.narrationText,
})), null, 2)}

Generate a complete SEO deliverable with 4 distinct title variants, an engaging description, tags, hashtags, and scene-derived chapter markers.`;

  try {
    const aiResult = await providerManager.executeTextGeneration({
      connectionId,
      prompt: userPrompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          titleOptions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          selectedTitle: { type: Type.STRING },
          description: { type: Type.STRING },
          tags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          hashtags: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          chapters: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                timestamp: { type: Type.STRING },
                title: { type: Type.STRING },
              },
              required: ['timestamp', 'title'],
            },
          },
        },
        required: ['titleOptions', 'selectedTitle', 'description', 'tags', 'hashtags', 'chapters'],
      },
    });

    if (aiResult.text) {
      const parsed = JSON.parse(aiResult.text);
      res.json({
        success: true,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
        isFallback: false,
        data: parsed,
      });
      return;
    }
  } catch (e: any) {
    const sanitized = sanitizeError(e);
    const category = e?.category || (e?.status === 429 ? 'RATE_LIMIT_429' : e?.status === 403 ? 'INVALID_CREDENTIALS' : 'TRANSIENT_5XX');
    if (category === 'RATE_LIMIT_429' || category === 'QUOTA_EXHAUSTED' || category === 'INVALID_CREDENTIALS') {
      res.status(category === 'RATE_LIMIT_429' ? 429 : category === 'INVALID_CREDENTIALS' ? 403 : 500).json({
        error: true,
        category,
        message: sanitized,
      });
      return;
    }
    console.warn('SEO generation fell back to deterministic generator:', sanitized);
  }

  // Deterministic Local Fallback (Honest reporting grounded strictly in source content)
  const isHindi = language === 'hi';
  const cleanTitle = (scriptTitle || sourceTitle || 'Source Analysis').replace(/\s*—\s*.*$/, '').trim();

  const fallbackTitles = isHindi ? [
    `${cleanTitle}: पूरा सच और विस्तृत विश्लेषण`,
    `${cleanTitle}: महत्वपूर्ण निष्कर्ष और मुख्य बिंदु`,
    `${cleanTitle}: क्या हैं प्रामाणिक तथ्य?`,
    `${cleanTitle}: विस्तृत रिपोर्ट और समीक्षा`,
  ] : [
    `${cleanTitle}: Evidence & Core Analysis`,
    `The Truth About ${cleanTitle} Explained`,
    `${cleanTitle} — Complete Overview & Key Takeaways`,
    `${cleanTitle}: Key Discoveries and Breakdown`,
  ];

  const sceneChapters = Array.isArray(scenes) && scenes.length > 0 ? scenes.map((s: any, idx: number) => {
    let timestamp = '00:00';
    if (s.timeRange && typeof s.timeRange === 'string' && s.timeRange.includes('–')) {
      const start = s.timeRange.split('–')[0].trim().replace(/s$/, '');
      if (start.includes(':')) {
        timestamp = start.length === 4 ? `0${start}` : start;
      } else {
        const sec = parseInt(start, 10) || 0;
        const mins = Math.floor(sec / 60);
        const secs = sec % 60;
        timestamp = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      }
    } else {
      const stepSec = isShorts ? 8 : 30;
      const totalSec = idx * stepSec;
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      timestamp = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    const chapterName = s.purpose ? s.purpose.replace(/^beat\s*\d+:\s*/i, '').trim() : `Scene 0${s.sceneNumber || idx + 1}`;
    return {
      timestamp,
      title: chapterName.charAt(0).toUpperCase() + chapterName.slice(1),
    };
  }) : [
    { timestamp: '00:00', title: isHindi ? 'शुरुआती बिंदु' : 'Opening Context' },
    { timestamp: '00:08', title: isHindi ? 'मुख्य विश्लेषण' : 'Core Evidence' },
    { timestamp: '00:16', title: isHindi ? 'निष्कर्ष' : 'Conclusion & Payoff' },
  ];

  const fallbackDescription = isHindi
    ? `${hookSummary || `${cleanTitle} पर आधारित प्रामाणिक वैज्ञानिक विश्लेषण।`}\n\nइस वीडियो में हम स्रोत से प्राप्त पुष्ट तथ्यों का गहराई से विश्लेषण करते हैं। किसी भी भ्रामक जानकारी के बिना प्रामाणिक विवरण।\n\n${callToAction ? `👉 ${callToAction}\n\n` : ''}समय सीमा (Chapters):\n${sceneChapters.map((c: any) => `${c.timestamp} - ${c.title}`).join('\n')}\n\n#विश्लेषण #रिपोर्ट #जानकारी #तथ्य #हिंदी`
    : `${hookSummary || `A grounded analysis of ${cleanTitle}.`}\n\nIn this video, we examine the confirmed facts and evidence directly from the source account without speculation or sensationalism.\n\n${callToAction ? `👉 ${callToAction}\n\n` : ''}Chapter Markers:\n${sceneChapters.map((c: any) => `${c.timestamp} - ${c.title}`).join('\n')}\n\n#Analysis #Documentary #Overview #DeepDive #Facts`;

  const titleWords = cleanTitle.toLowerCase().split(/[^a-zA-Z0-9\u0900-\u097F]+/).filter((w: string) => w.length > 3);
  const fallbackTags = isHindi
    ? [cleanTitle, 'वैज्ञानिक विश्लेषण', 'मुख्य बिंदु', 'प्रामाणिक रिपोर्ट', 'हिंदी जानकारी', ...titleWords].slice(0, 10)
    : [cleanTitle, 'detailed breakdown', 'source analysis', 'documentary overview', 'facts explained', ...titleWords].slice(0, 10);

  const fallbackHashtags = isHindi
    ? ['#विश्लेषण', '#रिपोर्ट', '#जानकारी', '#तथ्य', '#हिंदी']
    : ['#Analysis', '#Documentary', '#Overview', '#DeepDive', '#Facts'];

  res.json({
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: {
      titleOptions: fallbackTitles,
      selectedTitle: fallbackTitles[0],
      description: fallbackDescription,
      tags: fallbackTags,
      hashtags: fallbackHashtags,
      chapters: sceneChapters,
    },
  });
});

// 8. Thumbnail Studio Generation Endpoint (Phase 6 Core)
app.post('/api/ai/generate-thumbnails', async (req: Request, res: Response): Promise<void> => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: true, message: 'Invalid request body.' });
    return;
  }

  const {
    connectionId,
    sourceTitle = 'Source Narrative',
    sourceText = '',
    scriptTitle = '',
    hookSummary = '',
    scenes = [],
    visualStyleId = 'cinematic',
    continuityBible = {},
    selectedSeoTitle = '',
    language = 'en',
    format = '9:16_SHORTS',
  } = req.body;

  if (typeof sourceText === 'string' && sourceText.length > 50000) {
    res.status(400).json({ error: true, message: 'Source text exceeds maximum limit (50,000 chars).' });
    return;
  }

  if (Array.isArray(scenes) && scenes.length > 30) {
    res.status(400).json({ error: true, message: 'Scenes array exceeds maximum limit (30 scenes).' });
    return;
  }

  const isShorts = format === '9:16_SHORTS';
  const formatRatio: '9:16 vertical' | '16:9 horizontal' = isShorts ? '9:16 vertical' : '16:9 horizontal';
  const styleConfig = STYLE_PROMPTS[visualStyleId] || STYLE_PROMPTS.cinematic;
  const isHindi = language === 'hi';

  const defaultPreviewA = isShorts 
    ? '/src/assets/images/thumb_enigma_v_1792435064413.jpg' 
    : '/src/assets/images/thumbnail_enigma_1792435046467.jpg';
  const defaultPreviewB = isShorts 
    ? '/src/assets/images/thumb_observer_v_1792435065654.jpg' 
    : '/src/assets/images/thumbnail_observer_1792435045693.jpg';

  const systemInstruction = `You are ILLUMATRIX Thumbnail Prompt Engine.
You create production-grade image generation prompt packages for video thumbnails (Midjourney, ChatGPT DALL-E, Gemini Imagen, Stable Diffusion).

CRITICAL NON-NEGOTIABLE INVARIANTS:
1. TWO MEANINGFULLY DISTINCT VISUAL ANGLES:
   - Option A (OBJECT OF ENIGMA): Extreme close-up / macro focus on the central anomaly, artifact, or phenomenon. Emphasize specular highlights, internal energy, prismatic refraction, and tactile materials.
   - Option B (OBSERVER REACTION): Human scale discovery or reaction perspective. Protagonist, scientist, observer, or witness in an authentic setting reacting to the revelation (e.g. holographic screen, cosmic vista, telemetry waveform).
2. RATIO: Exactly "${formatRatio}".
3. VISUAL STYLE: ${styleConfig.name} (${styleConfig.treatment}).
4. PALETTE: Grounded in "${continuityBible.visualPalette || 'Obsidian black and cyan with stark lighting'}".
5. OVERLAY TEXT: 2-4 punchy words suitable for high-CTR YouTube thumbnails.
   ${isHindi ? 'HINDI MANDATE: All overlayTextSuggestion values MUST be in natural Devanagari Hindi (हिंदी) (e.g. "गुप्त संकेत", "यह क्या है?").' : 'ENGLISH MANDATE: overlayTextSuggestion in crisp English (e.g. "SIGNAL DETECTED", "IT IS NOT RANDOM").'}
6. FIDELITY & NO CHEAP CLICKBAIT: Ground strictly in approved story elements. No generic alien heads or deceptive fake clickbait.`;

  const userPrompt = `PROJECT: ${sourceTitle}
SCRIPT TITLE: ${scriptTitle || selectedSeoTitle || sourceTitle}
HOOK: ${hookSummary}
FORMAT: ${formatRatio}
VISUAL STYLE: ${styleConfig.name}
PALETTE & CONTINUITY:
- Palette: ${continuityBible.visualPalette || 'Obsidian void & icy cyan'}
- Recurring Subjects: ${continuityBible.recurringSubjects || 'Crystalline artifact prism'}
- Lighting: ${continuityBible.cameraGrammar || styleConfig.lighting}

SCRIPT SCENES CONTEXT:
${JSON.stringify(scenes.map((s: any) => ({
  sceneNumber: s.sceneNumber,
  purpose: s.purpose,
  narration: s.narrationText,
  visualDirection: s.visualDirectionDraft,
})), null, 2)}

Generate the two distinct thumbnail prompt packages (Option A: Object Macro Enigma, Option B: Observer Reaction).`;

  try {
    const aiResult = await providerManager.executeTextGeneration({
      connectionId,
      prompt: userPrompt,
      systemInstruction,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          options: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                conceptAngle: { type: Type.STRING },
                ratio: { type: Type.STRING },
                focalSubject: { type: Type.STRING },
                lightingAndMood: { type: Type.STRING },
                composition: { type: Type.STRING },
                detailedPrompt: { type: Type.STRING },
                overlayTextSuggestion: { type: Type.STRING },
                negativeConstraints: { type: Type.STRING },
              },
              required: [
                'id',
                'name',
                'conceptAngle',
                'ratio',
                'focalSubject',
                'lightingAndMood',
                'composition',
                'detailedPrompt',
                'overlayTextSuggestion',
                'negativeConstraints'
              ],
            },
          },
        },
        required: ['options'],
      },
    });

    if (aiResult.text) {
      const parsed = JSON.parse(aiResult.text);
      const mappedOptions = (parsed.options || []).map((opt: any, idx: number) => {
        const isA = idx === 0 || opt.id === 'option_a';
        return {
          ...opt,
          id: isA ? 'option_a' : 'option_b',
          name: isA ? 'PROMPT A // OBJECT OF ENIGMA' : 'PROMPT B // ASTRONOMER DISCOVERY',
          ratio: formatRatio,
          previewImageUrl: isA ? defaultPreviewA : defaultPreviewB,
          isCustomEdited: false,
        };
      });

      res.json({
        success: true,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
        isFallback: false,
        data: mappedOptions,
      });
      return;
    }
  } catch (e: any) {
    const sanitized = sanitizeError(e);
    const category = e?.category || (e?.status === 429 ? 'RATE_LIMIT_429' : e?.status === 403 ? 'INVALID_CREDENTIALS' : 'TRANSIENT_5XX');
    if (category === 'RATE_LIMIT_429' || category === 'QUOTA_EXHAUSTED' || category === 'INVALID_CREDENTIALS') {
      res.status(category === 'RATE_LIMIT_429' ? 429 : category === 'INVALID_CREDENTIALS' ? 403 : 500).json({
        error: true,
        category,
        message: sanitized,
      });
      return;
    }
    console.warn('Thumbnail generation fell back to deterministic generator:', sanitized);
  }

  // Deterministic Local Fallback (Honest reporting when API key unconfigured)
  const localOptionA = {
    id: 'option_a',
    name: 'PROMPT A // OBJECT OF ENIGMA',
    conceptAngle: 'Close macro focus on the alien artifact crystalline core with intense light refraction and ruby laser conduits',
    ratio: formatRatio,
    focalSubject: 'Luminous monolithic crystalline tetrahedron with glowing internal ruby micro-circuits',
    lightingAndMood: `${continuityBible.visualPalette || 'Deep void black and cobalt cyan'}, volumetric laser glow, chromatic prismatic glare`,
    composition: 'Extreme low-angle upward tilt, macro depth of field with floating stardust particles',
    detailedPrompt: `Hyper-detailed ${styleConfig.name} thumbnail image, ${formatRatio} orientation. Macro view of an ancient alien crystalline tetrahedron floating in the deep void beyond Pluto. Intricate glowing red fiber-optic conduits visible beneath translucent quartz facets. A single stark beam of distant white sunlight hits the faceted edge, causing vibrant chromatic prismatic glare. ${styleConfig.treatment}. Ominous, awe-inspiring atmosphere, Unreal Engine 5 render style, 8k resolution, crisp textures.`,
    overlayTextSuggestion: isHindi ? 'संकेत मिला' : 'SIGNAL DETECTED',
    negativeConstraints: 'No cartoon effects, no blurry artifacts, no low resolution, no generic flying saucers.',
    previewImageUrl: defaultPreviewA,
    isCustomEdited: false,
  };

  const localOptionB = {
    id: 'option_b',
    name: 'PROMPT B // ASTRONOMER DISCOVERY',
    conceptAngle: 'Human observer scale with deep space radar telescope & anomalous visual screen',
    ratio: formatRatio,
    focalSubject: 'Silhouette of a lone observatory astronomer staring in shock at a massive holographic telemetry screen showing a repeating 8.4s prime waveform',
    lightingAndMood: 'Dark observatory room bathed in amber and cyan holographic luminescence, cold night sky through open dome ceiling',
    composition: 'Over-the-shoulder medium shot, dynamic diagonal composition emphasizing the scale of the telemetry pulse',
    detailedPrompt: `Atmospheric ${styleConfig.name} documentary thumbnail, ${formatRatio} aspect ratio. Inside a dark mountain observatory dome at midnight. In the foreground, an astronomer in silhouette turns in shock toward a glowing holographic monitor displaying an anomalous repeating geometric signal and deep space coordinates past Pluto. Through open dome slit, the starlit Milky Way is sharp. ${styleConfig.treatment}. Dramatic teal and warm amber rim lighting, 35mm film grain, intense curiosity hook.`,
    overlayTextSuggestion: isHindi ? 'यह यादृच्छिक नहीं है' : 'IT IS NOT RANDOM',
    negativeConstraints: 'No cheesy monster faces, no low contrast, no generic stock photo look, no distorted hands.',
    previewImageUrl: defaultPreviewB,
    isCustomEdited: false,
  };

  res.json({
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: [localOptionA, localOptionB],
  });
});

// 9. Single Thumbnail Regeneration Endpoint
app.post('/api/ai/regenerate-single-thumbnail', async (req: Request, res: Response): Promise<void> => {
  if (!req.body || typeof req.body !== 'object') {
    res.status(400).json({ error: true, message: 'Invalid request body.' });
    return;
  }

  const {
    connectionId,
    optionId = 'option_a',
    sourceTitle = 'Source Narrative',
    scriptTitle = '',
    hookSummary = '',
    visualStyleId = 'cinematic',
    continuityBible = {},
    selectedSeoTitle = '',
    language = 'en',
    format = '9:16_SHORTS',
    existingConceptAngle = '',
  } = req.body;

  if (optionId !== 'option_a' && optionId !== 'option_b') {
    res.status(400).json({ error: true, message: 'optionId must be "option_a" or "option_b".' });
    return;
  }

  const isShorts = format === '9:16_SHORTS';
  const formatRatio: '9:16 vertical' | '16:9 horizontal' = isShorts ? '9:16 vertical' : '16:9 horizontal';
  const styleConfig = STYLE_PROMPTS[visualStyleId] || STYLE_PROMPTS.cinematic;
  const isA = optionId === 'option_a';
  const isHindi = language === 'hi';

  const defaultPreview = isA 
    ? (isShorts ? '/src/assets/images/thumb_enigma_v_1792435064413.jpg' : '/src/assets/images/thumbnail_enigma_1792435046467.jpg')
    : (isShorts ? '/src/assets/images/thumb_observer_v_1792435065654.jpg' : '/src/assets/images/thumbnail_observer_1792435045693.jpg');

  try {
    const prompt = `Regenerate ONLY ${isA ? 'Option A (Focal Object / Macro Enigma)' : 'Option B (Observer / Reaction Discovery)'} thumbnail prompt package.
PROJECT: ${sourceTitle} | TITLE: ${scriptTitle || selectedSeoTitle}
FORMAT: ${formatRatio}
STYLE: ${styleConfig.name} (${styleConfig.treatment})
PALETTE: ${continuityBible.visualPalette || 'Deep Obsidian Void and Cyan'}
${existingConceptAngle ? `EXISTING ANGLE TO REFINE: ${existingConceptAngle}` : ''}
${isHindi ? 'HINDI MANDATE: overlayTextSuggestion in Devanagari Hindi.' : 'ENGLISH MANDATE: overlayTextSuggestion in English.'}

Return JSON with refined: id, name, conceptAngle, ratio, focalSubject, lightingAndMood, composition, detailedPrompt, overlayTextSuggestion, negativeConstraints.`;

    const aiResult = await providerManager.executeTextGeneration({
      connectionId,
      prompt,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          conceptAngle: { type: Type.STRING },
          ratio: { type: Type.STRING },
          focalSubject: { type: Type.STRING },
          lightingAndMood: { type: Type.STRING },
          composition: { type: Type.STRING },
          detailedPrompt: { type: Type.STRING },
          overlayTextSuggestion: { type: Type.STRING },
          negativeConstraints: { type: Type.STRING },
        },
        required: [
          'id',
          'name',
          'conceptAngle',
          'ratio',
          'focalSubject',
          'lightingAndMood',
          'composition',
          'detailedPrompt',
          'overlayTextSuggestion',
          'negativeConstraints'
        ],
      },
    });

    if (aiResult.text) {
      const parsed = JSON.parse(aiResult.text);
      res.json({
        success: true,
        provider: aiResult.provider,
        latencyMs: aiResult.latencyMs,
        isFallback: false,
        data: {
          ...parsed,
          id: optionId,
          name: isA ? 'PROMPT A // OBJECT OF ENIGMA' : 'PROMPT B // ASTRONOMER DISCOVERY',
          ratio: formatRatio,
          previewImageUrl: defaultPreview,
          isCustomEdited: false,
        },
      });
      return;
    }
  } catch (e: any) {
    const sanitized = sanitizeError(e);
    const category = e?.category || (e?.status === 429 ? 'RATE_LIMIT_429' : e?.status === 403 ? 'INVALID_CREDENTIALS' : 'TRANSIENT_5XX');
    if (category === 'RATE_LIMIT_429' || category === 'QUOTA_EXHAUSTED' || category === 'INVALID_CREDENTIALS') {
      res.status(category === 'RATE_LIMIT_429' ? 429 : category === 'INVALID_CREDENTIALS' ? 403 : 500).json({
        error: true,
        category,
        message: sanitized,
      });
      return;
    }
    console.warn(`Single thumbnail regen fell back to deterministic generator:`, sanitized);
  }

  res.json({
    success: true,
    provider: 'Local Workflow Engine (Deterministic Fallback)',
    isFallback: true,
    data: {
      id: optionId,
      name: isA ? 'PROMPT A // OBJECT OF ENIGMA' : 'PROMPT B // ASTRONOMER DISCOVERY',
      conceptAngle: isA 
        ? 'Refined macro geometric prism core with heightened chromatic aberration' 
        : 'Shocked observer silhouette framed by anamorphic radar screen',
      ratio: formatRatio,
      focalSubject: isA 
        ? 'Prismatic alien crystal prism with visible photonic micro-traces' 
        : 'Observer hands on control panel with luminous telemetry waveform',
      lightingAndMood: `${continuityBible.visualPalette || 'Obsidian black and cyan'} with directional rim lighting`,
      composition: isA ? '45-degree angled macro tracking shot' : 'Dramatic low-angle Dutch tilt',
      detailedPrompt: isA 
        ? `Ultra-detailed ${styleConfig.name} thumbnail, ${formatRatio}. Extreme close-up on the monolithic crystalline prism floating in deep space. Glowing ruby filaments trace intricate circuits beneath the translucent surface. ${styleConfig.treatment}. 8k resolution, crisp cinematic lighting.`
        : `Atmospheric ${styleConfig.name} thumbnail, ${formatRatio}. Inside a high-altitude observatory, a lone astronomer turns in shock toward a glowing terminal displaying an anomalous repeating pulse. ${styleConfig.treatment}. 35mm lens, intense narrative tension.`,
      overlayTextSuggestion: isA ? (isHindi ? 'गुप्त संकेत' : 'SIGNAL DETECTED') : (isHindi ? 'अलौकिक खोज' : 'NOT RANDOM'),
      negativeConstraints: 'No distorted geometry, no blurry text, no low contrast.',
      previewImageUrl: defaultPreview,
      isCustomEdited: false,
    },
  });
});

// 10. Actual Image Rendering Endpoint via Google GenAI
app.post('/api/ai/render-thumbnail-image', async (req: Request, res: Response): Promise<void> => {
  const { prompt, format = '9:16_SHORTS', optionId = 'option_a', connectionId } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    res.status(400).json({ error: true, message: 'Image prompt is required.' });
    return;
  }

  if (prompt.length > 5000) {
    res.status(400).json({ error: true, message: 'Prompt exceeds maximum character limit (5000 chars).' });
    return;
  }

  const isShorts = format === '9:16_SHORTS' || String(format).includes('9:16');
  const aspectRatio = isShorts ? '9:16' : '16:9';

  const creds = providerManager.getEffectiveCredentials(connectionId);
  if (!creds.hasKey || !creds.apiKey) {
    res.status(503).json({
      error: true,
      category: 'KEY_UNCONFIGURED',
      message: `API key is not configured for connection "${creds.name}". Configure a valid key in Provider Manager.`,
    });
    return;
  }

  if (creds.provider !== 'Google GenAI') {
    res.status(400).json({
      error: true,
      category: 'UNSUPPORTED_PROVIDER',
      message: `Image rendering requires Google GenAI (gemini-3.1-flash-lite-image). Active connection "${creds.name}" is using ${creds.provider}. Switch to a Google GenAI connection or export the prompt package.`,
    });
    return;
  }

  try {
    const client = new GoogleGenAI({
      apiKey: creds.apiKey,
      httpOptions: {
        timeout: 45000,
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await client.models.generateContent({
      model: 'gemini-3.1-flash-lite-image',
      contents: {
        parts: [
          { text: prompt },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
        },
      },
    });

    let base64Image: string | null = null;
    let mimeType = 'image/jpeg';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        base64Image = part.inlineData.data;
        mimeType = part.inlineData.mimeType || 'image/jpeg';
        break;
      }
    }

    if (base64Image) {
      res.json({
        success: true,
        provider: `Google GenAI (gemini-3.1-flash-lite-image) [${creds.name}]`,
        isFallback: false,
        imageUrl: `data:${mimeType};base64,${base64Image}`,
        optionId,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    res.status(500).json({
      error: true,
      category: 'EMPTY_RESPONSE',
      message: 'Gemini image provider returned no image bytes.',
    });
  } catch (err: any) {
    const sanitized = sanitizeError(err);
    console.error('Gemini image generation error:', sanitized);
    const isRateLimit = err?.status === 429 || sanitized.includes('429');
    const isQuota = sanitized.toLowerCase().includes('quota') || sanitized.includes('RESOURCE_EXHAUSTED');
    const isPermission = err?.status === 403 || sanitized.includes('permission') || sanitized.includes('IAM');

    res.status(isRateLimit ? 429 : isPermission ? 403 : 500).json({
      error: true,
      category: isRateLimit ? 'RATE_LIMIT_429' : isQuota ? 'QUOTA_EXHAUSTED' : isPermission ? 'PERMISSION_DENIED' : 'TRANSIENT_5XX',
      message: isQuota
        ? 'Real-time image generation requires a Gemini API key with active image quota (gemini-3.1-flash-lite-image free-tier quota is 0). You can export the prompt package directly to Midjourney, Google Flow, or ChatGPT DALL-E.'
        : sanitized || 'Failed to render image via Gemini.',
    });
  }
});

// Vite Integration (Dev Mode Middleware vs Production Static)
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ILLUMATRIX Full-Stack Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start ILLUMATRIX server:', err);
});
