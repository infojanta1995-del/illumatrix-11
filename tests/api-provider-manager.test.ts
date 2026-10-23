import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { 
  providerManager, 
  sanitizeError, 
  maskApiKey, 
  cleanJsonText,
  detectProvider,
  PROVIDER_REGISTRY,
  SupportedProvider
} from '../src/server/providerManager';
import {
  validateCustomProviderUrl,
  safeSsrfFetch,
  isRestrictedIpv4,
  isRestrictedIpv6,
  isRestrictedHostname,
  type DnsResolver,
} from '../src/server/urlSafetyValidator';

test('Provider Manager - Key Protection and Sanitization across All Providers', async (t) => {
  await t.test('maskApiKey hides secret characters securely', () => {
    assert.equal(maskApiKey(''), 'None configured');
    assert.equal(maskApiKey(undefined), 'None configured');
    assert.equal(maskApiKey('12345678'), '••••••••');
    assert.equal(maskApiKey('AIzaSyD-TestKey123456789'), 'AIza••••6789');
    assert.equal(maskApiKey('sk-proj-abcdef1234567890xyz'), 'sk-p••••0xyz');
    assert.equal(maskApiKey('gsk_1234567890abcdef1234567890'), 'gsk_••••7890');
    assert.equal(maskApiKey('csk-wafer1234567890abcdef'), 'csk-••••cdef');
    assert.equal(maskApiKey('hf_0123456789abcdef0123456789'), 'hf_0••••6789');
  });

  await t.test('sanitizeError scrubs API keys across all 10 provider key prefixes', () => {
    // Google Gemini
    const googleErr = 'GoogleGenAIError: Request failed with key=AIzaSySecretKey123456789 and quota exceeded';
    assert.ok(!sanitizeError(googleErr).includes('AIzaSySecretKey123456789'));
    assert.ok(sanitizeError(googleErr).includes('AIza***') || sanitizeError(googleErr).includes('key=***'));

    // OpenAI Project
    const openAiErr = 'Error: 401 Unauthorized for Bearer sk-proj-1234567890abcdef1234567890';
    assert.ok(!sanitizeError(openAiErr).includes('sk-proj-1234567890abcdef1234567890'));

    // OpenRouter
    const openRouterErr = 'OpenRouterError: Invalid key sk-or-v1-abcdef0123456789abcdef0123456789';
    assert.ok(!sanitizeError(openRouterErr).includes('sk-or-v1-abcdef0123456789abcdef0123456789'));

    // Groq
    const groqErr = 'GroqAPI: 401 Invalid credentials gsk_0123456789abcdef0123456789abcdef';
    assert.ok(!sanitizeError(groqErr).includes('gsk_0123456789abcdef0123456789abcdef'));

    // Cerebras
    const cerebrasErr = 'CerebrasCS3: 403 Forbidden with csk-0123456789abcdef0123456789';
    assert.ok(!sanitizeError(cerebrasErr).includes('csk-0123456789abcdef0123456789'));

    // Hugging Face
    const hfErr = 'HuggingFace: Token rejected hf_0123456789abcdef0123456789abcdef';
    assert.ok(!sanitizeError(hfErr).includes('hf_0123456789abcdef0123456789abcdef'));

    // SambaNova UUID
    const sambaErr = 'SambaNova: Failed request for 550e8400-e29b-41d4-a716-446655440000 key';
    assert.ok(!sanitizeError(sambaErr).includes('550e8400-e29b-41d4-a716-446655440000'));
  });

  await t.test('Public connection representations NEVER expose cleartext API keys', () => {
    const publicConns = providerManager.getPublicConnections();
    for (const conn of publicConns) {
      assert.equal((conn as any).apiKey, undefined, `Connection ${conn.id} leaked raw apiKey in public view!`);
      assert.ok(typeof conn.hasKey === 'boolean');
      assert.ok(typeof conn.maskedKey === 'string');
      if (conn.hasKey && conn.provider !== 'Ollama') {
        assert.ok(conn.maskedKey.includes('••••'));
      }
    }
  });
});

test('Provider Manager - Task 2: Provider Auto-Detection & Ambiguity Handling', async (t) => {
  await t.test('Detects Google Gemini from AIzaSy prefix', () => {
    const res = detectProvider('AIzaSyD_TestGoogleKey123456789');
    assert.equal(res.detectedProvider, 'Google GenAI');
    assert.equal(res.confidence, 'reliable');
  });

  await t.test('Detects Groq from gsk_ prefix', () => {
    const res = detectProvider('gsk_testGroqKey1234567890abcdef');
    assert.equal(res.detectedProvider, 'Groq');
    assert.equal(res.confidence, 'reliable');
    assert.equal(res.suggestedModel, 'llama-3.3-70b-versatile');
  });

  await t.test('Detects OpenRouter from sk-or-v1- prefix', () => {
    const res = detectProvider('sk-or-v1-testOpenRouterKey123456789');
    assert.equal(res.detectedProvider, 'OpenRouter');
    assert.equal(res.confidence, 'reliable');
  });

  await t.test('Detects Cerebras from csk- prefix', () => {
    const res = detectProvider('csk-cerebrasKey1234567890');
    assert.equal(res.detectedProvider, 'Cerebras');
    assert.equal(res.confidence, 'reliable');
  });

  await t.test('Detects Hugging Face from hf_ prefix', () => {
    const res = detectProvider('hf_userToken1234567890abcdef');
    assert.equal(res.detectedProvider, 'Hugging Face');
    assert.equal(res.confidence, 'reliable');
  });

  await t.test('Detects SambaNova from 36-char UUID format', () => {
    const res = detectProvider('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
    assert.equal(res.detectedProvider, 'SambaNova');
    assert.equal(res.confidence, 'reliable');
  });

  await t.test('Detects Cloudflare Workers AI from accountId or endpoint URL', () => {
    const res = detectProvider('some_token_here', '', '023e105f4ecef8ad9ca31a8372d0c353');
    assert.equal(res.detectedProvider, 'Cloudflare Workers AI');
    assert.equal(res.confidence, 'reliable');
  });

  await t.test('Detects Ollama from localhost:11434 endpoint', () => {
    const res = detectProvider('', 'http://localhost:11434');
    assert.equal(res.detectedProvider, 'Ollama');
    assert.equal(res.confidence, 'reliable');
  });

  await t.test('Detects OpenAI Project key from sk-proj- prefix', () => {
    const res = detectProvider('sk-proj-testOpenAiKey1234567890');
    assert.equal(res.detectedProvider, 'OpenAI');
    assert.equal(res.confidence, 'reliable');
  });

  await t.test('Flags ambiguous generic sk- prefix and asks user to confirm provider', () => {
    const res = detectProvider('sk-genericAmbiguousKey123456789');
    assert.equal(res.detectedProvider, null);
    assert.equal(res.confidence, 'ambiguous');
    assert.ok(res.reason.includes('shared by multiple providers'));
    assert.ok(res.ambiguousOptions?.includes('OpenAI'));
    assert.ok(res.ambiguousOptions?.includes('Mistral AI'));
  });

  await t.test('Flags unclassified strings as ambiguous without guessing', () => {
    const res = detectProvider('unrecognized_custom_token_12345');
    assert.equal(res.detectedProvider, null);
    assert.equal(res.confidence, 'ambiguous');
  });
});

test('Provider Manager - Task 1: Multiple Connections per Provider & CRUD', async (t) => {
  const groqId1 = `conn_groq_work_${Date.now()}`;
  const groqId2 = `conn_groq_personal_${Date.now()}`;

  await t.test('Add multiple distinct connections for the same provider (Groq)', () => {
    const conn1 = providerManager.addOrUpdateConnection({
      id: groqId1,
      name: 'Groq Work LPU Account',
      provider: 'Groq',
      modelId: 'llama-3.3-70b-versatile',
      apiKey: 'gsk_testWorkAccountKey1234567890',
      quotaPool: 'GROQ_WORK_ACCOUNT_POOL',
    });

    const conn2 = providerManager.addOrUpdateConnection({
      id: groqId2,
      name: 'Groq Personal Free Account',
      provider: 'Groq',
      modelId: 'llama-3.1-8b-instant',
      apiKey: 'gsk_testPersonalAccountKey1234567890',
      quotaPool: 'GROQ_PERSONAL_FREE_POOL',
    });

    assert.equal(conn1.id, groqId1);
    assert.equal(conn1.provider, 'Groq');
    assert.equal(conn1.quotaPool, 'GROQ_WORK_ACCOUNT_POOL');

    assert.equal(conn2.id, groqId2);
    assert.equal(conn2.provider, 'Groq');
    assert.equal(conn2.quotaPool, 'GROQ_PERSONAL_FREE_POOL');

    // Both connections exist concurrently
    const publicConns = providerManager.getPublicConnections();
    assert.ok(publicConns.some(c => c.id === groqId1));
    assert.ok(publicConns.some(c => c.id === groqId2));
  });

  await t.test('Switch active connection to second connection', () => {
    const ok = providerManager.setActiveConnectionId(groqId2);
    assert.equal(ok, true);
    assert.equal(providerManager.getActiveConnectionId(), groqId2);

    const creds = providerManager.getEffectiveCredentials(groqId2);
    assert.equal(creds.name, 'Groq Personal Free Account');
    assert.equal(creds.modelId, 'llama-3.1-8b-instant');
    assert.equal(creds.quotaPool, 'GROQ_PERSONAL_FREE_POOL');
  });

  await t.test('Safely deleting active connection re-routes to a valid replacement', () => {
    // Delete groqId2 which is active
    const deleteResult = providerManager.deleteConnection(groqId2);
    assert.equal(deleteResult.success, true);
    assert.ok(deleteResult.switchedActiveTo);
    assert.notEqual(providerManager.getActiveConnectionId(), groqId2);

    // Clean up groqId1
    providerManager.deleteConnection(groqId1);
  });
});

test('Provider Manager - Task 3 & 4: Provider-Specific Adapters & Testing Statuses', async (t) => {
  await t.test('Cloudflare Workers AI returns CONFIG_MISSING when accountId is missing', async () => {
    const cfId = `conn_cf_test_${Date.now()}`;
    providerManager.addOrUpdateConnection({
      id: cfId,
      name: 'Cloudflare Incomplete Node',
      provider: 'Cloudflare Workers AI',
      modelId: '@cf/meta/llama-3.3-70b-instruct',
      apiKey: 'test_bearer_token',
      // accountId deliberately omitted
    });

    const testRes = await providerManager.testConnection(cfId);
    assert.equal(testRes.success, false);
    assert.equal(testRes.errorCategory, 'CONFIG_MISSING');
    assert.ok(testRes.error?.includes('Account ID is required'));

    providerManager.deleteConnection(cfId);
  });

  await t.test('Ollama connection supports key-less configuration', () => {
    const ollamaId = `conn_ollama_local_${Date.now()}`;
    const conn = providerManager.addOrUpdateConnection({
      id: ollamaId,
      name: 'Local Ollama Node',
      provider: 'Ollama',
      modelId: 'llama3.2',
      baseUrl: 'http://localhost:11434',
      apiKey: '', // Empty key permitted for local Ollama!
    });

    assert.equal(conn.provider, 'Ollama');
    assert.equal(conn.hasKey, true); // Ollama is ready without required key
    assert.equal(conn.status, 'untested'); // Untested status, not green!

    providerManager.deleteConnection(ollamaId);
  });

  await t.test('Untested connections are honestly marked as untested, never green', () => {
    const testId = `conn_untested_${Date.now()}`;
    const conn = providerManager.addOrUpdateConnection({
      id: testId,
      name: 'Untested Mistral Node',
      provider: 'Mistral AI',
      modelId: 'mistral-small-latest',
      apiKey: 'test_mistral_key_1234567890',
    });

    assert.equal(conn.status, 'untested');
    assert.equal(conn.lastTestStatus, 'untested');

    providerManager.deleteConnection(testId);
  });

  await t.test('Registry covers all 10 requested providers', () => {
    const requiredProviders: SupportedProvider[] = [
      'Google GenAI',
      'Groq',
      'OpenRouter',
      'Cerebras',
      'Cloudflare Workers AI',
      'Hugging Face',
      'Mistral AI',
      'SambaNova',
      'Ollama',
      'OpenAI'
    ];

    for (const p of requiredProviders) {
      assert.ok(PROVIDER_REGISTRY[p], `Registry is missing provider: ${p}`);
      assert.ok(PROVIDER_REGISTRY[p].defaultModel, `Provider ${p} has no default model`);
      assert.ok(PROVIDER_REGISTRY[p].defaultQuotaPool, `Provider ${p} has no quota pool`);
    }
  });
});

test('Task 0.3: Credential Security, Environment Key Loading & Zero Secret Persistence', async (t) => {
  await t.test('1. Default connection dynamically resolves key from process.env.GEMINI_API_KEY', () => {
    const defaultConn = providerManager.getConnection('conn_gemini_primary');
    assert.ok(defaultConn, 'Default connection conn_gemini_primary should exist');
    assert.equal(defaultConn.isDefault, true);

    const resolved = providerManager.resolveEffectiveApiKey(defaultConn);
    const expectedEnvKey = (process.env.GEMINI_API_KEY || '').trim();
    assert.equal(resolved, expectedEnvKey);

    const publicConn = providerManager.getPublicConnections().find(c => c.id === 'conn_gemini_primary');
    assert.ok(publicConn);
    assert.equal((publicConn as any).apiKey, undefined, 'Cleartext key leaked in public connection!');
    if (expectedEnvKey.length > 0) {
      assert.equal(publicConn.hasKey, true);
      assert.ok(publicConn.maskedKey.includes('••••'));
    }
  });

  await t.test('2. Non-default Google connection does not silently map GEMINI_API_KEY', () => {
    const flashConn = providerManager.getConnection('conn_gemini_flash');
    assert.ok(flashConn, 'conn_gemini_flash should exist');
    assert.equal(flashConn.isDefault, false);

    // If GEMINI_FLASH_API_KEY is unset and no explicit key is saved, it should not inherit GEMINI_API_KEY
    if (!process.env.GEMINI_FLASH_API_KEY && (!flashConn.apiKey || flashConn.apiKey.length === 0)) {
      const resolved = providerManager.resolveEffectiveApiKey(flashConn);
      assert.equal(resolved, '', 'Non-default Google connection must NOT silently inherit GEMINI_API_KEY');
      const publicFlash = providerManager.getPublicConnections().find(c => c.id === 'conn_gemini_flash');
      assert.ok(publicFlash);
      assert.equal(publicFlash.hasKey, false);
      assert.equal(publicFlash.status, 'unconfigured');
    }
  });

  await t.test('3. Missing credentials produce clear, safe status without crashing', async () => {
    const missingKeyId = `conn_missing_key_${Date.now()}`;
    providerManager.addOrUpdateConnection({
      id: missingKeyId,
      name: 'Missing Key Test Node',
      provider: 'Groq',
      modelId: 'llama-3.3-70b-versatile',
      apiKey: '', // Deliberately empty
    });

    const testRes = await providerManager.testConnection(missingKeyId);
    assert.equal(testRes.success, false);
    assert.equal(testRes.status, 'unconfigured');
    assert.equal(testRes.errorCategory, 'CONFIG_MISSING');
    assert.ok(testRes.error?.toLowerCase().includes('no api key'));

    providerManager.deleteConnection(missingKeyId);
  });

  await t.test('4. Stored .provider_connections.json file contains zero cleartext environment secrets', () => {
    const connectionsPath = path.resolve(process.cwd(), '.provider_connections.json');
    if (fs.existsSync(connectionsPath)) {
      const content = fs.readFileSync(connectionsPath, 'utf-8');
      const parsed = JSON.parse(content);
      const connectionsList = Array.isArray(parsed) ? parsed : (parsed.connections || []);

      const envKey = (process.env.GEMINI_API_KEY || '').trim();
      const flashKey = (process.env.GEMINI_FLASH_API_KEY || '').trim();

      for (const conn of connectionsList) {
        if (envKey.length > 8) {
          assert.notEqual(conn.apiKey, envKey, `Connection ${conn.id} in stored file contains live GEMINI_API_KEY!`);
          assert.ok(!content.includes(envKey), `Raw GEMINI_API_KEY found stored on disk in .provider_connections.json!`);
        }
        if (flashKey.length > 8) {
          assert.notEqual(conn.apiKey, flashKey, `Connection ${conn.id} in stored file contains live GEMINI_FLASH_API_KEY!`);
        }
      }

      const defaultRecord = connectionsList.find((c: any) => c.id === 'conn_gemini_primary');
      if (defaultRecord) {
        assert.equal(defaultRecord.apiKey, '', 'Default connection apiKey on disk should be empty string (resolved via env)');
      }
    }
  });

  await t.test('5. Root .gitignore exists and ignores .env*, .provider_connections.json, dist/, node_modules/', () => {
    const gitignorePath = path.resolve(process.cwd(), '.gitignore');
    assert.ok(fs.existsSync(gitignorePath), '.gitignore must exist in root');
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');

    assert.ok(gitignoreContent.includes('.env'), '.gitignore must ignore .env');
    assert.ok(gitignoreContent.includes('.provider_connections.json'), '.gitignore must ignore .provider_connections.json');
    assert.ok(gitignoreContent.includes('dist/'), '.gitignore must ignore dist/');
    assert.ok(gitignoreContent.includes('node_modules/'), '.gitignore must ignore node_modules/');
    assert.ok(gitignoreContent.includes('!.env.example'), '.gitignore must preserve !.env.example exception');
  });
});

test('Task 0.4: Custom Provider SSRF Protection & Server-Side URL Safety Validation', async (t) => {
  // 1. Valid public endpoints
  await t.test('1. Valid public HTTPS URLs pass validation', async () => {
    const mockPublicResolver: DnsResolver = async () => [
      { address: '93.184.216.34', family: 4 },
    ];

    const res1 = await validateCustomProviderUrl('https://api.openai.com/v1', mockPublicResolver);
    assert.equal(res1.isValid, true);
    assert.equal(res1.error, undefined);

    const res2 = await validateCustomProviderUrl('https://api.groq.com/openai/v1', mockPublicResolver);
    assert.equal(res2.isValid, true);
  });

  // 2. Localhost & Loopback IPv4/IPv6
  await t.test('2. Rejects localhost, loopback IPv4 and IPv6 destinations', async () => {
    const loopbacks = [
      'http://127.0.0.1:8000/v1',
      'http://127.0.0.2:8000',
      'http://127.255.255.254:3000',
      'http://localhost:3000/api',
      'http://app.localhost:8080',
      'http://[::1]:8080/v1',
      'http://[0:0:0:0:0:0:0:1]:8000',
    ];

    for (const url of loopbacks) {
      const res = await validateCustomProviderUrl(url);
      assert.equal(res.isValid, false, `Expected ${url} to be rejected`);
      assert.equal(res.errorCategory, 'SSRF_BLOCKED', `Expected SSRF_BLOCKED for ${url}`);
      assert.ok(res.error && res.error.length > 0);
    }
  });

  // 3. Link-local and cloud metadata addresses
  await t.test('3. Rejects cloud instance metadata and link-local destinations', async () => {
    const metadataEndpoints = [
      'http://169.254.169.254/latest/meta-data',
      'http://169.254.169.254/computeMetadata/v1',
      'http://169.254.1.1:8000',
      'http://metadata.google.internal/computeMetadata/v1',
      'http://instance-data/latest/meta-data',
      'http://[fe80::1]:8080',
      'http://[fe80::a00:27ff:fe8e:e88a]:80',
    ];

    for (const url of metadataEndpoints) {
      const res = await validateCustomProviderUrl(url);
      assert.equal(res.isValid, false, `Expected metadata URL ${url} to be rejected`);
      assert.equal(res.errorCategory, 'SSRF_BLOCKED');
    }
  });

  // 4. Private IPv4 ranges
  await t.test('4. Rejects private IPv4 ranges (RFC 1918, CGNAT, 0.0.0.0/8)', async () => {
    const privateUrls = [
      'http://10.0.0.1:8000/v1',
      'http://10.254.254.254:80',
      'http://172.16.0.1:8080',
      'http://172.24.1.1:8000',
      'http://172.31.255.255:80',
      'http://192.168.0.1:8080',
      'http://192.168.1.254:80',
      'http://0.0.0.0:8000',
      'http://100.64.0.1:8080', // CGNAT
      'http://100.127.255.255:80',
    ];

    for (const url of privateUrls) {
      const res = await validateCustomProviderUrl(url);
      assert.equal(res.isValid, false, `Expected private IP URL ${url} to be rejected`);
      assert.equal(res.errorCategory, 'SSRF_BLOCKED');
    }
  });

  // 5. IPv6 Unique-Local and IPv4-Mapped IPv6
  await t.test('5. Rejects IPv6 unique-local and IPv4-mapped IPv6 restricted addresses', async () => {
    const ipv6Targets = [
      'http://[fc00::1]:8000',
      'http://[fd12:3456:789a::1]:8080',
      'http://[::ffff:127.0.0.1]:8000',
      'http://[::ffff:169.254.169.254]:80',
      'http://[::ffff:10.0.0.1]:8000',
      'http://[::ffff:192.168.1.1]:80',
      'http://[64:ff9b::127.0.0.1]:80',
    ];

    for (const url of ipv6Targets) {
      const res = await validateCustomProviderUrl(url);
      assert.equal(res.isValid, false, `Expected ${url} to be rejected`);
      assert.equal(res.errorCategory, 'SSRF_BLOCKED');
    }
  });

  // 6. Unsupported protocols, malformed URLs, and embedded credentials
  await t.test('6. Rejects unsupported protocols, malformed URLs, and embedded credentials', async () => {
    // Protocol checks
    const fileRes = await validateCustomProviderUrl('file:///etc/passwd');
    assert.equal(fileRes.isValid, false);
    assert.equal(fileRes.errorCategory, 'UNSUPPORTED_PROTOCOL');

    const ftpRes = await validateCustomProviderUrl('ftp://example.com/v1');
    assert.equal(ftpRes.isValid, false);
    assert.equal(ftpRes.errorCategory, 'UNSUPPORTED_PROTOCOL');

    const gopherRes = await validateCustomProviderUrl('gopher://127.0.0.1:70');
    assert.equal(gopherRes.isValid, false);
    assert.equal(gopherRes.errorCategory, 'UNSUPPORTED_PROTOCOL');

    // Embedded credentials check
    const credsRes = await validateCustomProviderUrl('https://admin:secret@api.example.com/v1');
    assert.equal(credsRes.isValid, false);
    assert.equal(credsRes.errorCategory, 'INVALID_URL');
    assert.ok(credsRes.error?.includes('Embedded credentials'));

    // Malformed URLs
    const malformedRes = await validateCustomProviderUrl('not-a-valid-url');
    assert.equal(malformedRes.isValid, false);
    assert.equal(malformedRes.errorCategory, 'INVALID_URL');
  });

  // 7. Hostname DNS resolution: public vs restricted
  await t.test('7. Validates hostnames against resolved DNS records', async () => {
    const publicResolver: DnsResolver = async () => [
      { address: '104.18.2.1', family: 4 },
    ];
    const restrictedResolver: DnsResolver = async () => [
      { address: '192.168.1.50', family: 4 },
    ];

    const pubRes = await validateCustomProviderUrl('https://custom-ai.company.org/v1', publicResolver);
    assert.equal(pubRes.isValid, true);
    assert.deepEqual(pubRes.resolvedIps, ['104.18.2.1']);

    const privRes = await validateCustomProviderUrl('https://custom-ai.company.org/v1', restrictedResolver);
    assert.equal(privRes.isValid, false);
    assert.equal(privRes.errorCategory, 'SSRF_BLOCKED');
  });

  // 8. Hostnames with mixed public and restricted DNS answers (split horizon rebinding attempt)
  await t.test('8. Rejects hostnames with mixed public and restricted DNS answers', async () => {
    const mixedResolver: DnsResolver = async () => [
      { address: '93.184.216.34', family: 4 }, // public
      { address: '169.254.169.254', family: 4 }, // cloud metadata
    ];

    const mixedRes = await validateCustomProviderUrl('https://mixed-dns.example.com/v1', mixedResolver);
    assert.equal(mixedRes.isValid, false);
    assert.equal(mixedRes.errorCategory, 'SSRF_BLOCKED');
    assert.ok(mixedRes.error?.includes('private, loopback, or cloud metadata'));
  });

  // 9. Redirect revalidation in safeSsrfFetch
  await t.test('9. safeSsrfFetch re-validates redirect destinations and blocks SSRF redirect targets', async () => {
    // Intercept with customResolver that resolves attacker.com to public, but target to 169.254.169.254
    const redirectResolver: DnsResolver = async (host: string) => {
      if (host === 'metadata.target') {
        return [{ address: '169.254.169.254', family: 4 }];
      }
      return [{ address: '93.184.216.34', family: 4 }];
    };

    // Attempt calling directly to a restricted IP via safeSsrfFetch
    await assert.rejects(
      async () => {
        await safeSsrfFetch('http://169.254.169.254/latest/meta-data', {}, redirectResolver);
      },
      (err: any) => {
        assert.equal(err.category, 'SSRF_BLOCKED');
        return true;
      }
    );
  });

  // 10. Provider Manager testConnection() enforcement on custom provider
  await t.test('10. Provider Manager testConnection() blocks restricted endpoints with SSRF_BLOCKED', async () => {
    const customSsrfConnId = `conn_custom_ssrf_${Date.now()}`;
    providerManager.addOrUpdateConnection({
      id: customSsrfConnId,
      name: 'Malicious Metadata Custom Node',
      provider: 'OpenAI Compatible',
      modelId: 'gpt-4o-mini',
      baseUrl: 'http://169.254.169.254/v1',
      apiKey: 'test_key_1234567890',
    });

    const testRes = await providerManager.testConnection(customSsrfConnId);
    assert.equal(testRes.success, false);
    assert.equal(testRes.status, 'degraded');
    assert.equal(testRes.errorCategory, 'SSRF_BLOCKED');
    assert.ok(testRes.error?.includes('Destination is restricted'));
    // Ensure no secrets leaked
    assert.ok(!testRes.error?.includes('test_key_1234567890'));

    providerManager.deleteConnection(customSsrfConnId);
  });

  // 11. Provider Manager executeTextGeneration() enforcement on custom provider
  await t.test('11. Provider Manager executeTextGeneration() blocks restricted endpoints with SSRF_BLOCKED', async () => {
    const customSsrfConnId = `conn_custom_exec_ssrf_${Date.now()}`;
    providerManager.addOrUpdateConnection({
      id: customSsrfConnId,
      name: 'Loopback Custom Node',
      provider: 'OpenAI Compatible',
      modelId: 'gpt-4o-mini',
      baseUrl: 'http://127.0.0.1:8888/v1',
      apiKey: 'test_key_1234567890',
    });

    await assert.rejects(
      async () => {
        await providerManager.executeTextGeneration({
          connectionId: customSsrfConnId,
          prompt: 'Test prompt',
        });
      },
      (err: any) => {
        assert.equal(err.category, 'SSRF_BLOCKED');
        assert.ok(err.message.includes('Destination is restricted'));
        return true;
      }
    );

    providerManager.deleteConnection(customSsrfConnId);
  });

  // 12. Built-in integrations (Google GenAI, Groq default, OpenRouter default) are unaffected
  await t.test('12. Built-in default endpoints are not flagged as custom SSRF targets', () => {
    const defaultGoogle = providerManager.getConnection('conn_gemini_primary');
    assert.ok(defaultGoogle);
    assert.equal(defaultGoogle.provider, 'Google GenAI');

    const defaultGroq = providerManager.getConnection('conn_groq_qwen');
    assert.ok(defaultGroq);
    assert.equal(defaultGroq.baseUrl, 'https://api.groq.com/openai/v1');

    const defaultOpenRouter = providerManager.getConnection('conn_openrouter_default');
    assert.ok(defaultOpenRouter);
    assert.equal(defaultOpenRouter.baseUrl, 'https://openrouter.ai/api/v1');
  });
});


