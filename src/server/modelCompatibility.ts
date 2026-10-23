/**
 * ILLUMATRIX Model Compatibility & Pricing Classification Engine
 * Evaluates model capabilities, modality boundaries, and pricing veracity.
 */

import type { SupportedProvider, ModelCapability, ModelPricing, AccountLimitSnapshot } from '../types/hud';

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
  isTextGenerationCapable: boolean; // Suitable for script / prompt generation workflow
  isImageGenerationCapable: boolean; // Suitable for thumbnail preview workflow
  supportsStructuredJson: boolean;
  supportsStreaming: boolean;
  supportsTools: boolean;
  compatibilityStatus: 'compatible' | 'incompatible' | 'unknown';
  reason?: string;
}

export interface ClassifiedPricing extends ModelPricing {
  promptPricePerMillion?: number;
  completionPricePerMillion?: number;
  isZeroPriced: boolean;
  pricingTier: 'free' | 'paid' | 'unknown';
  pricingNote?: string;
}

/**
 * OpenRouter Pricing Classifier
 * Enforces strict verification of input and output pricing fields.
 * - Zero-priced ($0.00 / 1M) requires prompt == 0 AND completion == 0.
 * - Missing or ambiguous values are strictly classified as 'unknown'.
 * - Never infers free tier from model names alone.
 * - Does not promise unlimited usage or guaranteed availability.
 */
export function classifyOpenRouterPricing(
  pricing: any,
  modelId: string
): ClassifiedPricing {
  if (!pricing || typeof pricing !== 'object') {
    return {
      isZeroPriced: false,
      pricingTier: 'unknown',
      pricingNote: 'Pricing metadata missing or unprovided by provider catalog',
    };
  }

  const promptRaw = pricing.prompt;
  const completionRaw = pricing.completion;

  if (promptRaw === undefined || promptRaw === null || completionRaw === undefined || completionRaw === null) {
    return {
      isZeroPriced: false,
      pricingTier: 'unknown',
      pricingNote: 'Incomplete pricing metadata (prompt or completion missing)',
    };
  }

  const promptNum = typeof promptRaw === 'number' ? promptRaw : parseFloat(String(promptRaw));
  const completionNum = typeof completionRaw === 'number' ? completionRaw : parseFloat(String(completionRaw));

  if (isNaN(promptNum) || isNaN(completionNum) || promptNum < 0 || completionNum < 0) {
    return {
      isZeroPriced: false,
      pricingTier: 'unknown',
      pricingNote: 'Ambiguous or unparseable pricing values',
    };
  }

  // Exact verification: both prompt and completion must be zero
  if (promptNum === 0 && completionNum === 0) {
    return {
      promptPricePerMillion: 0,
      completionPricePerMillion: 0,
      isZeroPriced: true,
      pricingTier: 'free',
      pricingNote: 'Verified zero-priced catalog route ($0.00/1M tokens, subject to provider load and availability)',
    };
  }

  // Paid model with verified positive pricing
  const promptPerMillion = Math.round(promptNum * 1_000_000 * 100) / 100;
  const completionPerMillion = Math.round(completionNum * 1_000_000 * 100) / 100;

  return {
    promptPricePerMillion: promptPerMillion,
    completionPricePerMillion: completionPerMillion,
    isZeroPriced: false,
    pricingTier: 'paid',
    pricingNote: `$${promptPerMillion.toFixed(2)} prompt / $${completionPerMillion.toFixed(2)} completion per 1M tokens`,
  };
}

/**
 * Model Compatibility Evaluator
 * Segregates general text generation models from embeddings, rerankers, audio, speech,
 * image, multimodal, and moderation models.
 * Unknown compatibility remains explicitly 'unknown' and excluded from incompatible workflows.
 */
export function evaluateModelCompatibility(model: {
  id: string;
  provider: SupportedProvider;
  displayName?: string;
  description?: string;
  architecture?: any;
  supportedParameters?: string[];
  supportedGenerationMethods?: string[];
}): ModelCompatibility {
  const idLower = model.id.toLowerCase();
  const descLower = (model.description || '').toLowerCase();
  const modalityLower = String(model.architecture?.modality || '').toLowerCase();
  const params = model.supportedParameters || [];

  // 1. Check for Embeddings
  if (
    idLower.includes('embedding') ||
    idLower.includes('bge-') ||
    idLower.includes('e5-') ||
    idLower.startsWith('text-embedding-') ||
    (model.supportedGenerationMethods &&
      model.supportedGenerationMethods.includes('embedContent') &&
      !model.supportedGenerationMethods.includes('generateContent'))
  ) {
    return {
      primaryModality: 'embedding',
      isTextGenerationCapable: false,
      isImageGenerationCapable: false,
      supportsStructuredJson: false,
      supportsStreaming: false,
      supportsTools: false,
      compatibilityStatus: 'incompatible',
      reason: 'Embedding models output vector representations, not generative narrative text.',
    };
  }

  // 2. Check for Rerankers
  if (idLower.includes('rerank') || idLower.includes('bge-reranker') || descLower.includes('rerank')) {
    return {
      primaryModality: 'reranker',
      isTextGenerationCapable: false,
      isImageGenerationCapable: false,
      supportsStructuredJson: false,
      supportsStreaming: false,
      supportsTools: false,
      compatibilityStatus: 'incompatible',
      reason: 'Reranker models score document pairs and do not support conversational generation.',
    };
  }

  // 3. Check for Content Safety / Moderation
  if (
    idLower.includes('guard') ||
    idLower.includes('moderation') ||
    idLower.includes('llama-guard') ||
    idLower.includes('aqa')
  ) {
    return {
      primaryModality: 'moderation',
      isTextGenerationCapable: false,
      isImageGenerationCapable: false,
      supportsStructuredJson: false,
      supportsStreaming: false,
      supportsTools: false,
      compatibilityStatus: 'incompatible',
      reason: 'Safety/moderation classifier model not intended for narrative script synthesis.',
    };
  }

  // 4. Check for Audio / Speech models
  if (
    idLower.includes('whisper') ||
    idLower.includes('tts') ||
    idLower.includes('audio') ||
    modalityLower.includes('audio') ||
    modalityLower.startsWith('audio->') ||
    modalityLower.endsWith('->audio')
  ) {
    return {
      primaryModality: 'audio',
      isTextGenerationCapable: false,
      isImageGenerationCapable: false,
      supportsStructuredJson: false,
      supportsStreaming: false,
      supportsTools: false,
      compatibilityStatus: 'incompatible',
      reason: 'Audio/speech model not compatible with text-based script generation.',
    };
  }

  // 5. Check for Image generation models
  if (
    idLower.includes('imagen') ||
    idLower.includes('image-preview') ||
    idLower.includes('image-only') ||
    idLower.includes('stable-diffusion') ||
    idLower.includes('flux') ||
    idLower.includes('midjourney') ||
    idLower.includes('dall-e') ||
    modalityLower.endsWith('->image')
  ) {
    return {
      primaryModality: 'image',
      isTextGenerationCapable: false,
      isImageGenerationCapable: true,
      supportsStructuredJson: false,
      supportsStreaming: false,
      supportsTools: false,
      compatibilityStatus: 'incompatible',
      reason: 'Image generation model cannot output structured narrative JSON scripts.',
    };
  }

  // 6. Check for Multimodal / Vision models (text+image -> text)
  if (
    modalityLower.includes('text+image') ||
    modalityLower.includes('multimodal') ||
    idLower.includes('vision') ||
    idLower.includes('vl-') ||
    idLower.includes('omni')
  ) {
    return {
      primaryModality: 'multimodal',
      isTextGenerationCapable: true,
      isImageGenerationCapable: false,
      supportsStructuredJson: params.includes('response_format') || model.provider === 'Google GenAI',
      supportsStreaming: true,
      supportsTools: params.includes('tools') || model.provider === 'Google GenAI',
      compatibilityStatus: 'compatible',
      reason: 'Multimodal model capable of text narrative and visual understanding.',
    };
  }

  // 7. General text generation models
  const isLikelyTextLlm =
    modalityLower.includes('text->text') ||
    idLower.includes('gemini') ||
    idLower.includes('llama') ||
    idLower.includes('qwen') ||
    idLower.includes('mistral') ||
    idLower.includes('mixtral') ||
    idLower.includes('deepseek') ||
    idLower.includes('claude') ||
    idLower.includes('gpt') ||
    idLower.includes('gemma') ||
    idLower.includes('phi');

  if (isLikelyTextLlm) {
    return {
      primaryModality: 'text',
      isTextGenerationCapable: true,
      isImageGenerationCapable: false,
      supportsStructuredJson:
        params.includes('response_format') || model.provider === 'Google GenAI' || model.provider === 'Groq',
      supportsStreaming: true,
      supportsTools: params.includes('tools') || model.provider === 'Google GenAI' || model.provider === 'Groq',
      compatibilityStatus: 'compatible',
      reason: 'General text generation model compatible with ILLUMATRIX script engine.',
    };
  }

  // 8. Unknown compatibility fallback - strictly classified as unknown and excluded from incompatible workflows
  return {
    primaryModality: 'unknown',
    isTextGenerationCapable: false,
    isImageGenerationCapable: false,
    supportsStructuredJson: false,
    supportsStreaming: false,
    supportsTools: false,
    compatibilityStatus: 'unknown',
    reason: 'Model architecture/modality is unconfirmed. Excluded from script workflows until validated.',
  };
}

export const PRIMARY_PROVIDER_IDS: SupportedProvider[] = ['Google GenAI', 'Groq', 'OpenRouter'];

export function detectOpenRouterModality(rawModel: any): ModelPrimaryModality {
  const comp = evaluateModelCompatibility({
    id: rawModel?.id || '',
    provider: 'OpenRouter',
    displayName: rawModel?.name,
    description: rawModel?.description,
    architecture: rawModel?.architecture,
    supportedParameters: rawModel?.supported_parameters,
  });
  return comp.primaryModality;
}

