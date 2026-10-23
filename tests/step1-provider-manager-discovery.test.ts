import { test } from 'node:test';
import assert from 'node:assert/strict';
import { 
  providerManager, 
  sanitizeError, 
  maskApiKey,
  PROVIDER_REGISTRY
} from '../src/server/providerManager';
import {
  classifyOpenRouterPricing,
  evaluateModelCompatibility,
  PRIMARY_PROVIDER_IDS,
  detectOpenRouterModality
} from '../src/server/modelCompatibility';
import type { SupportedProvider, DiscoveredModel } from '../src/types/hud';

test('STEP 1: Provider-Centric Directory & Credential Isolation', async (t) => {
  await t.test('1. PRIMARY_PROVIDERS supports exactly Google AI Studio / Gemini, Groq, and OpenRouter', () => {
    assert.deepEqual(PRIMARY_PROVIDER_IDS, ['Google GenAI', 'Groq', 'OpenRouter']);
    for (const pid of PRIMARY_PROVIDER_IDS) {
      assert.ok(PROVIDER_REGISTRY[pid], `Missing registry entry for ${pid}`);
    }
  });

  await t.test('2. Multiple API keys appear as separate connections nested under the same provider', () => {
    const groqKeyA = `conn_groq_a_${Date.now()}`;
    const groqKeyB = `conn_groq_b_${Date.now()}`;

    const connA = providerManager.addOrUpdateConnection({
      id: groqKeyA,
      name: 'Groq Key Alpha',
      provider: 'Groq',
      modelId: 'llama-3.3-70b-versatile',
      apiKey: 'gsk_keyAlpha1234567890abcdef',
      quotaPool: 'GROQ_ALPHA_POOL',
    });

    const connB = providerManager.addOrUpdateConnection({
      id: groqKeyB,
      name: 'Groq Key Beta',
      provider: 'Groq',
      modelId: 'qwen/qwen3.8-27b',
      apiKey: 'gsk_keyBeta0987654321fedcba',
      quotaPool: 'GROQ_BETA_POOL',
    });

    assert.equal(connA.id, groqKeyA);
    assert.equal(connB.id, groqKeyB);
    assert.equal(connA.provider, 'Groq');
    assert.equal(connB.provider, 'Groq');

    const publicConns = providerManager.getPublicConnections();
    const groqConns = publicConns.filter(c => c.provider === 'Groq');
    assert.ok(groqConns.some(c => c.id === groqKeyA));
    assert.ok(groqConns.some(c => c.id === groqKeyB));

    // Cleanup
    providerManager.deleteConnection(groqKeyA);
    providerManager.deleteConnection(groqKeyB);
  });

  await t.test('3. Secure credential storage and masking — zero cleartext keys in public models', () => {
    const testId = `conn_test_sec_${Date.now()}`;
    providerManager.addOrUpdateConnection({
      id: testId,
      name: 'Security Test Connection',
      provider: 'OpenRouter',
      modelId: 'meta-llama/llama-3.3-70b-instruct',
      apiKey: 'sk-or-v1-secretKey123456789abcdef0123456789',
    });

    const publicConn = providerManager.getPublicConnections().find(c => c.id === testId);
    assert.ok(publicConn);
    assert.equal((publicConn as any).apiKey, undefined, 'Cleartext key leaked in public connection!');
    assert.ok(publicConn.maskedKey.includes('••••'));
    assert.equal(publicConn.maskedKey, maskApiKey('sk-or-v1-secretKey123456789abcdef0123456789'));

    // Test maskApiKey function
    assert.equal(maskApiKey('AIzaSyD_TopSecret123456789'), 'AIza••••6789');
    assert.equal(maskApiKey('gsk_ultraSecretGroqKey123456'), 'gsk_••••3456');

    // Test sanitizer against multi-prefix leakage
    const dirtyError = 'Failed: AIzaSyD_TopSecret123456789 with sk-or-v1-secretKey123456789abcdef0123456789';
    const cleanError = sanitizeError(dirtyError);
    assert.ok(!cleanError.includes('TopSecret'));
    assert.ok(!cleanError.includes('secretKey'));

    providerManager.deleteConnection(testId);
  });
});

test('STEP 1: Accurate State Independence (Connection, Model, Catalog)', async (t) => {
  await t.test('4. Connection statuses (Connected, Failed, Untested) are strictly separated', () => {
    const testId = `conn_state_indep_${Date.now()}`;
    const conn = providerManager.addOrUpdateConnection({
      id: testId,
      name: 'State Independence Node',
      provider: 'Google GenAI',
      modelId: 'gemini-3.1-flash-lite',
      apiKey: 'AIzaSyFakeKey987654321',
    });

    // Newly added connections start as untested
    assert.equal(conn.status, 'untested');
    assert.equal(conn.modelStatus, 'untested');
    assert.equal(conn.catalogStatus, 'untested');

    // Model rate limit does NOT mark provider connection offline or failed
    // Simulating rate-limit setting
    const internal = (providerManager as any).connections.find((c: any) => c.id === testId);
    if (internal) {
      internal.status = 'online';
      internal.modelStatus = 'rate_limited';
      internal.cooldownRemainingSec = 30;
      (providerManager as any).saveConnections();
    }

    const updated = providerManager.getPublicConnections().find(c => c.id === testId);
    assert.ok(updated);
    assert.equal(updated.status, 'online', 'Connection status should remain online even when model is rate-limited');
    assert.equal(updated.modelStatus, 'rate_limited');

    providerManager.deleteConnection(testId);
  });

  await t.test('5. Reload resets saved connection health to untested for non-default keys', () => {
    // Verified that loadConnections() ensures saved health is not assumed to be connected
    const testId = `conn_reload_test_${Date.now()}`;
    providerManager.addOrUpdateConnection({
      id: testId,
      name: 'Reload Health Node',
      provider: 'Groq',
      modelId: 'llama-3.3-70b-versatile',
      apiKey: 'gsk_testKeyForReload12345',
    });

    // Force internal status to 'online' then trigger loadConnections
    const internal = (providerManager as any).connections.find((c: any) => c.id === testId);
    if (internal) {
      internal.status = 'online';
      (providerManager as any).saveConnections();
    }

    (providerManager as any).loadConnections();
    const afterReload = providerManager.getPublicConnections().find(c => c.id === testId);
    assert.ok(afterReload);
    assert.equal(
      afterReload.status, 
      'untested', 
      'Saved online status must not be treated as proof of current connectivity after reload'
    );

    providerManager.deleteConnection(testId);
  });
});

test('STEP 1: OpenRouter Pricing Classification Engine', async (t) => {
  await t.test('6. Verified zero-priced ($0.00 / 1M) requires prompt == 0 AND completion == 0', () => {
    const freeResult = classifyOpenRouterPricing({ prompt: 0, completion: 0 }, 'meta-llama/llama-3-8b-instruct:free');
    assert.equal(freeResult.isZeroPriced, true);
    assert.equal(freeResult.pricingTier, 'free');
    assert.equal(freeResult.promptPricePerMillion, 0);
    assert.equal(freeResult.completionPricePerMillion, 0);
  });

  await t.test('7. Model with ":free" in ID but positive pricing is NOT classified as free', () => {
    const deceptiveResult = classifyOpenRouterPricing(
      { prompt: 0.000001, completion: 0.000002 }, 
      'some-provider/fake-model:free'
    );
    assert.equal(deceptiveResult.isZeroPriced, false);
    assert.equal(deceptiveResult.pricingTier, 'paid');
    assert.notEqual(deceptiveResult.promptPricePerMillion, 0);
  });

  await t.test('8. Missing or ambiguous prices strictly classified as unknown without fabrication', () => {
    const nullPricing = classifyOpenRouterPricing(null, 'test-model');
    assert.equal(nullPricing.pricingTier, 'unknown');
    assert.equal(nullPricing.isZeroPriced, false);

    const missingCompletion = classifyOpenRouterPricing({ prompt: 0 }, 'test-model');
    assert.equal(missingCompletion.pricingTier, 'unknown');

    const ambiguousString = classifyOpenRouterPricing({ prompt: 'not-a-number', completion: 0 }, 'test-model');
    assert.equal(ambiguousString.pricingTier, 'unknown');
  });

  await t.test('9. Paid model computes exact USD per 1M tokens accurately', () => {
    // 0.0000025 per token -> $2.50 per 1M tokens
    const paidResult = classifyOpenRouterPricing(
      { prompt: 0.0000025, completion: 0.00001 }, 
      'anthropic/claude-3.5-sonnet'
    );
    assert.equal(paidResult.pricingTier, 'paid');
    assert.equal(paidResult.promptPricePerMillion, 2.5);
    assert.equal(paidResult.completionPricePerMillion, 10);
    assert.equal(paidResult.isZeroPriced, false);
  });
});

test('STEP 1: Model Compatibility Foundation', async (t) => {
  await t.test('10. Separates text-generation models from embeddings, audio, image, and rerankers', () => {
    const textModel = evaluateModelCompatibility({ id: 'meta-llama/llama-3.3-70b-instruct', provider: 'OpenRouter' });
    assert.equal(textModel.primaryModality, 'text');
    assert.equal(textModel.isTextGenerationCapable, true);
    assert.equal(textModel.compatibilityStatus, 'compatible');

    const embeddingModel = evaluateModelCompatibility({ id: 'text-embedding-3-small', provider: 'OpenRouter' });
    assert.equal(embeddingModel.primaryModality, 'embedding');
    assert.equal(embeddingModel.isTextGenerationCapable, false);
    assert.equal(embeddingModel.compatibilityStatus, 'incompatible');

    const rerankerModel = evaluateModelCompatibility({ id: 'cohere/rerank-v3-english', provider: 'OpenRouter' });
    assert.equal(rerankerModel.primaryModality, 'reranker');
    assert.equal(rerankerModel.isTextGenerationCapable, false);
    assert.equal(rerankerModel.compatibilityStatus, 'incompatible');

    const audioModel = evaluateModelCompatibility({ id: 'openai/whisper-large-v3', provider: 'Groq' });
    assert.equal(audioModel.primaryModality, 'audio');
    assert.equal(audioModel.isTextGenerationCapable, false);
    assert.equal(audioModel.compatibilityStatus, 'incompatible');

    const imageModel = evaluateModelCompatibility({ id: 'imagen-3.0-generate-002', provider: 'Google GenAI' });
    assert.equal(imageModel.primaryModality, 'image');
    assert.equal(imageModel.isTextGenerationCapable, false);
    assert.equal(imageModel.isImageGenerationCapable, true);
  });

  await t.test('11. Groq exact ID preservation and namespace handling', () => {
    // Test Groq namespace models like qwen/qwen3.8-27b
    const qwen = evaluateModelCompatibility({ id: 'qwen/qwen3.8-27b', provider: 'Groq' });
    assert.equal(qwen.primaryModality, 'text');
    assert.equal(qwen.isTextGenerationCapable, true);

    const llamaVersatile = evaluateModelCompatibility({ id: 'llama-3.3-70b-versatile', provider: 'Groq' });
    assert.equal(llamaVersatile.primaryModality, 'text');
    assert.equal(llamaVersatile.isTextGenerationCapable, true);
  });

  await t.test('12. Unknown modality models are safely marked unknown and excluded from text gen', () => {
    const unknownModel = evaluateModelCompatibility({ 
      id: 'strange-model-xyz', 
      provider: 'OpenRouter', 
      architecture: { modality: 'unknown' } 
    });
    assert.equal(unknownModel.compatibilityStatus, 'unknown');
    assert.equal(unknownModel.isTextGenerationCapable, false);
  });
});

test('STEP 1: Honest Error Classification', async (t) => {
  await t.test('13. Classifies authentication, quota, rate limit, and server errors accurately', () => {
    const authError = (providerManager as any).parseProviderError(
      { status: 401, message: 'Invalid API key provided' },
      'Groq'
    );
    assert.equal(authError.category, 'AUTH_ERROR');

    const quotaError = (providerManager as any).parseProviderError(
      { status: 429, message: 'Insufficient quota for project' },
      'Google GenAI'
    );
    assert.equal(quotaError.category, 'QUOTA_EXHAUSTED');

    const rateLimitError = (providerManager as any).parseProviderError(
      { status: 429, message: 'Rate limit exceeded: 30 requests per minute' },
      'Groq'
    );
    assert.equal(rateLimitError.category, 'RATE_LIMIT_429');

    const notFoundError = (providerManager as any).parseProviderError(
      { status: 404, message: 'Model not found' },
      'OpenRouter'
    );
    assert.equal(notFoundError.category, 'MODEL_NOT_FOUND');

    const ambiguousError = (providerManager as any).parseProviderError(
      { status: 500, message: 'Internal server error occurred' },
      'OpenRouter'
    );
    assert.equal(ambiguousError.category, 'SERVER_ERROR');
    assert.ok(!ambiguousError.details.includes('Invented specific diagnose'));
  });
});
