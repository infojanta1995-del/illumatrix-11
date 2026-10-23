import React, { useState, useMemo } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  X, 
  Cpu, 
  Key, 
  Plus, 
  Trash2, 
  Check, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Zap, 
  Globe, 
  Sparkles, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Tag, 
  Coins, 
  Edit3,
  Layers,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  AlertTriangle
} from 'lucide-react';
import { 
  ProviderConnection, 
  SupportedProvider, 
  DiscoveredModel, 
  AccountLimitSnapshot, 
  ModelPricing, 
  ModelCapability 
} from '../../types/hud';
import { AIService } from '../../services/aiService';

export interface PrimaryProviderDefinition {
  id: SupportedProvider;
  name: string;
  badge: string;
  tagline: string;
  defaultModel: string;
  models: string[];
  defaultBaseUrl?: string;
  defaultQuotaPool: string;
  requiresKey: boolean;
  placeholderKey: string;
  keyHint: string;
}

export const PRIMARY_PROVIDERS: PrimaryProviderDefinition[] = [
  {
    id: 'Google GenAI',
    name: 'Google AI Studio / Gemini',
    badge: '1P SDK',
    tagline: 'Direct Google AI Studio integration for fast reasoning, JSON structuring, and multimodal vision.',
    defaultModel: 'gemini-3.1-flash-lite',
    models: ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-4-argon'],
    defaultQuotaPool: 'GCP_PROJECT_DEFAULT_QUOTA',
    requiresKey: true,
    placeholderKey: 'AIzaSy...',
    keyHint: 'Google AI Studio API key starting with AIzaSy',
  },
  {
    id: 'Groq',
    name: 'Groq',
    badge: 'LPU Speed',
    tagline: 'Ultra-low-latency LPU inference for open-weights models (Llama 3.3, Qwen, Mixtral).',
    defaultModel: 'llama-3.3-70b-versatile',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3.8-27b', 'mixtral-8x7b-32768'],
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    defaultQuotaPool: 'GROQ_CONSOLE_POOL',
    requiresKey: true,
    placeholderKey: 'gsk_...',
    keyHint: 'Groq API key starting with gsk_',
  },
  {
    id: 'OpenRouter',
    name: 'OpenRouter',
    badge: 'Gateway',
    tagline: 'Unified gateway with live catalog, verified pricing tiers, and multi-model routing.',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct',
    models: [
      'meta-llama/llama-3.3-70b-instruct',
      'google/gemini-2.0-flash-exp:free',
      'deepseek/deepseek-r1:free',
      'anthropic/claude-3.5-sonnet',
      'mistralai/mistral-large-2407',
    ],
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    defaultQuotaPool: 'OPENROUTER_POOL',
    requiresKey: true,
    placeholderKey: 'sk-or-v1-...',
    keyHint: 'OpenRouter API key starting with sk-or-v1-',
  },
];

export const ProviderManagerModal: React.FC = () => {
  const {
    isProviderModalOpen,
    setIsProviderModalOpen,
    connections,
    activeConnection,
    setActiveConnectionId,
    saveProviderConnection,
    testProviderConnection,
    toggleProviderConnection,
    deleteProviderConnection,
    refreshProviders,
    discoverModels,
    refreshConnectionModels,
    showToast,
  } = useWorkflow();

  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [refreshingCatalogId, setRefreshingCatalogId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, {
    success: boolean;
    status?: string;
    latencyMs?: number;
    error?: string;
    errorCategory?: string;
    model?: string;
    testedAt?: string;
  }>>({});

  // Form State
  const [formName, setFormName] = useState('');
  const [formProvider, setFormProvider] = useState<SupportedProvider>('Google GenAI');
  const [formModelId, setFormModelId] = useState('gemini-3.1-flash-lite');
  const [formModelDisplayName, setFormModelDisplayName] = useState('Gemini 3.1 Flash Lite');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formApiKey, setFormApiKey] = useState('');
  const [formQuotaPool, setFormQuotaPool] = useState('GCP_PROJECT_DEFAULT_QUOTA');
  const [showKeyPassword, setShowKeyPassword] = useState(false);
  const [formAccountLimits, setFormAccountLimits] = useState<AccountLimitSnapshot | undefined>(undefined);
  const [formPricing, setFormPricing] = useState<ModelPricing | undefined>(undefined);
  const [formCapabilities, setFormCapabilities] = useState<ModelCapability | undefined>(undefined);

  // Auto-detection state
  const [detectionNotice, setDetectionNotice] = useState<{
    detectedProvider: SupportedProvider | null;
    confidence: 'reliable' | 'ambiguous' | 'none';
    reason: string;
    suggestedModel?: string;
    suggestedBaseUrl?: string;
    suggestedQuotaPool?: string;
    ambiguousOptions?: SupportedProvider[];
  } | null>(null);

  // Dynamic Model Browser State
  const [modelBrowserOpen, setModelBrowserOpen] = useState(false);
  const [modelBrowserTarget, setModelBrowserTarget] = useState<{
    connectionId?: string;
    provider: SupportedProvider;
    currentModelId: string;
    isFormTarget?: boolean;
    apiKey?: string;
    baseUrl?: string;
  } | null>(null);
  const [browserModels, setBrowserModels] = useState<DiscoveredModel[]>([]);
  const [isDiscoveringModels, setIsDiscoveringModels] = useState(false);
  const [browserSearch, setBrowserSearch] = useState('');
  const [browserFilter, setBrowserFilter] = useState<'all' | 'text' | 'free' | 'paid'>('all');
  const [discoveryStatusMessage, setDiscoveryStatusMessage] = useState<string>('');
  const [discoverySource, setDiscoverySource] = useState<'live_api' | 'cached_catalog'>('cached_catalog');
  const [customModelInput, setCustomModelInput] = useState('');

  if (!isProviderModalOpen) return null;

  const currentProviderConfig = PRIMARY_PROVIDERS.find(p => p.id === formProvider) || PRIMARY_PROVIDERS[0];

  const handleStartAddForProvider = (providerId: SupportedProvider) => {
    setIsAdding(true);
    setEditingId(null);
    setFormProvider(providerId);
    const cfg = PRIMARY_PROVIDERS.find(p => p.id === providerId) || PRIMARY_PROVIDERS[0];
    setFormName(`${cfg.name} Key`);
    setFormModelId(cfg.defaultModel);
    setFormModelDisplayName(cfg.defaultModel);
    setFormBaseUrl(cfg.defaultBaseUrl || '');
    setFormApiKey('');
    setFormQuotaPool(cfg.defaultQuotaPool);
    setFormAccountLimits(undefined);
    setFormPricing(undefined);
    setFormCapabilities(undefined);
    setShowKeyPassword(false);
    setDetectionNotice(null);
  };

  const handleStartEdit = (conn: ProviderConnection) => {
    setEditingId(conn.id);
    setIsAdding(false);
    setFormName(conn.name);
    setFormProvider(conn.provider);
    setFormModelId(conn.modelId);
    setFormModelDisplayName(conn.modelDisplayName || conn.modelId);
    setFormBaseUrl(conn.baseUrl || '');
    setFormApiKey(''); // Secret key input starts blank; only updated if changed
    setFormQuotaPool(conn.quotaPool);
    setFormAccountLimits(conn.accountLimits);
    setFormPricing(conn.pricing);
    setFormCapabilities(conn.capabilities);
    setShowKeyPassword(false);
    setDetectionNotice(null);
  };

  const handleProviderSelect = (provId: SupportedProvider) => {
    setFormProvider(provId);
    const cfg = PRIMARY_PROVIDERS.find(p => p.id === provId);
    if (cfg) {
      setFormModelId(cfg.defaultModel);
      setFormModelDisplayName(cfg.defaultModel);
      setFormBaseUrl(cfg.defaultBaseUrl || '');
      setFormQuotaPool(cfg.defaultQuotaPool);
      setFormAccountLimits(undefined);
      setFormPricing(undefined);
      setFormCapabilities(undefined);
      if (isAdding && (!formName || formName.includes('Key') || formName.includes('Connection'))) {
        setFormName(`${cfg.name} Key`);
      }
    }
  };

  const handleOpenModelDiscovery = async (target: {
    connectionId?: string;
    provider: SupportedProvider;
    currentModelId: string;
    isFormTarget?: boolean;
    apiKey?: string;
    baseUrl?: string;
  }) => {
    setModelBrowserTarget(target);
    setModelBrowserOpen(true);
    setBrowserSearch('');
    setBrowserFilter('all');
    setCustomModelInput('');
    setIsDiscoveringModels(true);
    setDiscoveryStatusMessage(`Querying ${target.provider} live model catalog...`);

    try {
      const res = await discoverModels({
        connectionId: target.connectionId,
        provider: target.provider,
        apiKey: target.apiKey || (target.isFormTarget ? formApiKey : undefined),
        baseUrl: target.baseUrl || (target.isFormTarget ? formBaseUrl : undefined),
      });

      setBrowserModels(res.models || []);
      setDiscoverySource(res.source);
      setDiscoveryStatusMessage(res.message || `Discovered ${res.models?.length || 0} models.`);
    } catch (err: any) {
      setDiscoveryStatusMessage(`Model discovery failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDiscoveringModels(false);
    }
  };

  const handleRefreshConnectionCatalog = async (connId: string) => {
    setRefreshingCatalogId(connId);
    try {
      const res = await refreshConnectionModels(connId);
      if (res.success) {
        showToast(`Catalog refreshed for connection: ${res.models.length} models discovered (${res.source === 'live_api' ? 'Live API' : 'Cached'}).`);
      } else {
        showToast(res.message || 'Failed to refresh model catalog.');
      }
    } catch (err: any) {
      showToast(`Refresh error: ${err?.message || 'Network failure'}`);
    } finally {
      setRefreshingCatalogId(null);
    }
  };

  const handleSelectDiscoveredModel = async (model: DiscoveredModel) => {
    if (!modelBrowserTarget) return;

    if (modelBrowserTarget.isFormTarget) {
      setFormModelId(model.id);
      setFormModelDisplayName(model.displayName);
      setFormAccountLimits(model.accountLimits);
      setFormPricing(model.pricing);
      setFormCapabilities(model.capabilities);
      setModelBrowserOpen(false);
      showToast(`Selected model: ${model.displayName} (${model.id})`);
    } else if (modelBrowserTarget.connectionId) {
      const targetConn = connections.find(c => c.id === modelBrowserTarget.connectionId);
      if (targetConn) {
        const updateRes = await saveProviderConnection({
          id: targetConn.id,
          name: targetConn.name,
          provider: targetConn.provider,
          modelId: model.id,
          modelDisplayName: model.displayName,
          baseUrl: targetConn.baseUrl,
          quotaPool: targetConn.quotaPool,
          isEnabled: targetConn.isEnabled,
          accountLimits: model.accountLimits,
          pricing: model.pricing,
          capabilities: model.capabilities,
          supportedParameters: model.supportedParameters,
        });
        if (updateRes.success) {
          showToast(`Model updated to "${model.displayName}" (${model.id})`);
          setModelBrowserOpen(false);
        } else {
          showToast(`Failed to update model: ${updateRes.message}`);
        }
      }
    }
  };

  const handleSelectCustomModel = async () => {
    const trimmed = customModelInput.trim();
    if (!trimmed) return;

    const customModel: DiscoveredModel = {
      id: trimmed,
      displayName: trimmed,
      provider: modelBrowserTarget?.provider || 'OpenRouter',
      capabilities: {
        supportsText: true,
        supportsImageGeneration: false,
        supportsStructuredJson: false,
        supportsStreaming: true,
        supportsTools: false,
      },
      isAvailable: true,
      source: 'cached_catalog',
    };

    await handleSelectDiscoveredModel(customModel);
  };

  const filteredBrowserModels = useMemo(() => {
    return browserModels.filter(m => {
      const q = browserSearch.trim().toLowerCase();
      const matchSearch = !q || m.id.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q) || (m.description && m.description.toLowerCase().includes(q));
      if (!matchSearch) return false;

      if (browserFilter === 'text') {
        return m.capabilities?.supportsText !== false && !m.id.includes('image-only') && m.id !== 'gemini-3.1-flash-lite-image';
      }
      if (browserFilter === 'free') {
        // Strict pricing verification: free tier requires verified zero-price
        return m.pricing?.pricingTier === 'free' || m.pricing?.isZeroPriced === true;
      }
      if (browserFilter === 'paid') {
        return m.pricing?.pricingTier === 'paid' || (m.pricing && !m.pricing.isZeroPriced && (m.pricing.promptPricePerMillion! > 0 || m.pricing.completionPricePerMillion! > 0));
      }
      return true;
    });
  }, [browserModels, browserSearch, browserFilter]);

  // Local pattern detection without leaking key
  const handleKeyOrUrlChange = async (keyVal: string, urlVal: string) => {
    setFormApiKey(keyVal);
    if (keyVal.trim().length >= 4 || urlVal.trim().length > 0) {
      const result = await AIService.detectProvider({
        key: keyVal,
        baseUrl: urlVal,
      });

      if (result.confidence !== 'none') {
        setDetectionNotice(result);
        if (result.confidence === 'reliable' && result.detectedProvider && !editingId) {
          const matchedPrimary = PRIMARY_PROVIDERS.find(p => p.id === result.detectedProvider);
          if (matchedPrimary && matchedPrimary.id !== formProvider) {
            setFormProvider(matchedPrimary.id);
            setFormModelId(result.suggestedModel || matchedPrimary.defaultModel);
            setFormModelDisplayName(result.suggestedModel || matchedPrimary.defaultModel);
            setFormBaseUrl(result.suggestedBaseUrl || matchedPrimary.defaultBaseUrl || '');
            setFormQuotaPool(result.suggestedQuotaPool || matchedPrimary.defaultQuotaPool);
            setFormName(`${matchedPrimary.name} Key`);
          }
        }
      } else {
        setDetectionNotice(null);
      }
    } else {
      setDetectionNotice(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Connection label is required.');
      return;
    }

    if (currentProviderConfig.requiresKey && !editingId && !formApiKey.trim()) {
      showToast(`API Key is required for ${formProvider}.`);
      return;
    }

    const payload: any = {
      name: formName.trim(),
      provider: formProvider,
      modelId: formModelId.trim() || currentProviderConfig.defaultModel,
      modelDisplayName: formModelDisplayName.trim() || formModelId.trim() || currentProviderConfig.defaultModel,
      baseUrl: formBaseUrl.trim() || currentProviderConfig.defaultBaseUrl || undefined,
      quotaPool: formQuotaPool.trim() || currentProviderConfig.defaultQuotaPool,
      accountLimits: formAccountLimits,
      pricing: formPricing,
      capabilities: formCapabilities,
    };

    if (editingId) {
      payload.id = editingId;
      if (formApiKey.trim().length > 0) {
        payload.apiKey = formApiKey.trim();
      }
    } else {
      payload.apiKey = formApiKey.trim();
      payload.isEnabled = true;
    }

    const res = await saveProviderConnection(payload);
    if (res.success) {
      setIsAdding(false);
      setEditingId(null);
      setFormApiKey('');
      setDetectionNotice(null);
    } else {
      showToast(res.message || 'Failed to save provider connection.');
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const result = await testProviderConnection(id);
      setTestResults(prev => ({ ...prev, [id]: result }));
      if (result.success) {
        showToast(`✓ Connection verified! Latency: ${result.latencyMs}ms (${result.model})`);
      } else {
        showToast(`✗ Test failed [${result.errorCategory || 'ERROR'}]: ${result.error}`);
      }
    } catch (err: any) {
      setTestResults(prev => ({
        ...prev,
        [id]: {
          success: false,
          errorCategory: 'NETWORK_ERROR',
          error: err.message || 'Network exception during test request',
          testedAt: new Date().toISOString(),
        }
      }));
    } finally {
      setTestingId(null);
    }
  };

  const [connectionPendingDelete, setConnectionPendingDelete] = useState<ProviderConnection | null>(null);

  const handleDelete = (conn: ProviderConnection) => {
    if (conn.isDefault) {
      showToast('The baseline default connection cannot be removed.');
      return;
    }
    // Confirm removal when a connection is used by an active session or general remove
    setConnectionPendingDelete(conn);
  };

  const handleConfirmDelete = async () => {
    if (!connectionPendingDelete) return;
    const conn = connectionPendingDelete;
    const isActive = conn.id === activeConnection.id;
    const replacement = connections.find(c => c.id !== conn.id && c.isEnabled) || connections[0];

    await deleteProviderConnection(conn.id);
    setConnectionPendingDelete(null);
    if (isActive) {
      showToast(`Connection removed. Workspace routing safely reassigned to "${replacement.name}".`);
    } else {
      showToast(`Connection "${conn.name}" removed.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="w-full max-w-4xl bg-[#070C18] border border-[#1E293B] rounded-xl shadow-[0_10px_60px_rgba(0,0,0,0.95)] overflow-hidden font-mono flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-4 py-3 border-b border-[#1E293B] bg-[#0B0F19] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded border border-[#00F0FF]/40 bg-[#00F0FF]/10 flex items-center justify-center text-[#00F0FF]">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wider">
                  PROVIDER DIRECTORY & KEY MANAGER
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00F0FF]/10 border border-[#00F0FF]/30 text-[#00F0FF]">
                  3 PRIMARY PROVIDERS
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                Google AI Studio • Groq Console • OpenRouter Gateway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => refreshProviders()}
              className="p-1.5 rounded text-slate-400 hover:text-[#00F0FF] hover:bg-[#111726] border border-[#1E293B] transition-colors"
              title="Refresh provider telemetry and quotas"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsProviderModalOpen(false)}
              className="p-1.5 rounded text-slate-400 hover:text-white hover:bg-[#111726] border border-[#1E293B] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Architecture & Quota Security Banner */}
          <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-slate-200 font-semibold">
              <span className="flex items-center gap-1.5 text-[#FFE600]">
                <ShieldCheck className="w-3.5 h-3.5" />
                PROVIDER DIRECTORY & CREDENTIAL ISOLATION PROTOCOL
              </span>
              <span className="text-slate-500 text-[10px]">RESTRICTED 0600 STORAGE</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[10px] text-slate-400 pt-1">
              <div className="bg-[#0B0F19] p-2 rounded border border-[#1E293B]">
                <strong className="text-slate-200 block mb-0.5">🔒 Zero Cleartext Keys</strong>
                Credentials stay strictly on the server. Never saved to localStorage, client logs, or exported backups.
              </div>
              <div className="bg-[#0B0F19] p-2 rounded border border-[#1E293B]">
                <strong className="text-slate-200 block mb-0.5">🧪 Honest Status Verification</strong>
                Connected green status appears ONLY after a live provider test ping succeeds. Untested connections remain neutral.
              </div>
              <div className="bg-[#0B0F19] p-2 rounded border border-[#1E293B]">
                <strong className="text-slate-200 block mb-0.5">⚖️ Independent Catalogs & Cooldowns</strong>
                A single model cooldown never disconnects the provider. Multiple keys operate with isolated catalogs.
              </div>
            </div>
          </div>

          {/* Add / Edit Inline Form */}
          {(isAdding || editingId) && (
            <form onSubmit={handleSave} className="p-4 rounded-lg bg-[#0B0F19] border border-[#00F0FF]/50 space-y-3.5 shadow-[0_0_20px_rgba(0,240,255,0.08)]">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#00F0FF]" />
                  <span className="text-xs font-bold text-[#00F0FF]">
                    {isAdding ? `ADD NEW CONNECTION (${formProvider.toUpperCase()})` : `EDIT CONNECTION: ${formName}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingId(null); setDetectionNotice(null); }}
                  className="text-slate-500 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Provider Selector: 3 Primary Providers */}
              <div>
                <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1.5">
                  1. Target Provider *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PRIMARY_PROVIDERS.map((p) => {
                    const isSelected = formProvider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProviderSelect(p.id)}
                        className={`p-2.5 rounded border text-left transition-all flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-white shadow-[0_0_8px_rgba(0,240,255,0.2)]'
                            : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:text-slate-200 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full mb-1">
                          <span className="text-xs font-bold truncate">{p.name}</span>
                          <span className={`text-[8px] px-1 py-0.2 rounded border ${
                            isSelected ? 'bg-[#00F0FF]/30 border-[#00F0FF] text-[#00F0FF]' : 'bg-slate-900 border-slate-800 text-slate-500'
                          }`}>
                            {p.badge}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500 truncate">{p.defaultModel}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live Detection Notice Banner */}
              {detectionNotice && (
                <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2.5 transition-all ${
                  detectionNotice.confidence === 'reliable'
                    ? 'bg-[#00F0FF]/10 border-[#00F0FF]/50 text-slate-200'
                    : 'bg-[#FFE600]/10 border-[#FFE600]/50 text-slate-200'
                }`}>
                  <Zap className={`w-4 h-4 shrink-0 mt-0.5 ${
                    detectionNotice.confidence === 'reliable' ? 'text-[#00F0FF]' : 'text-[#FFE600]'
                  }`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[11px]">
                        {detectionNotice.confidence === 'reliable' ? '⚡ Auto-Detected Key Format:' : '⚠️ Key Format Notice:'}
                      </span>
                      {detectionNotice.detectedProvider && (
                        <span className="text-[10px] font-bold text-[#00F0FF] bg-[#00F0FF]/20 px-2 py-0.5 rounded border border-[#00F0FF]/40">
                          {detectionNotice.detectedProvider}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      {detectionNotice.reason}
                    </p>
                  </div>
                </div>
              )}

              {/* Connection Detail Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Connection Label / Name *
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. My Primary Gemini Key, Work Groq Account"
                    className="w-full px-2.5 py-1.5 rounded bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF]"
                    required
                  />
                  <span className="text-[9px] text-slate-500">Human-readable label for this specific credential instance.</span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">
                      Selected Model (Exact API ID) *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleOpenModelDiscovery({
                        provider: formProvider,
                        currentModelId: formModelId,
                        isFormTarget: true,
                        apiKey: formApiKey,
                        baseUrl: formBaseUrl,
                      })}
                      className="text-[10px] text-[#00F0FF] hover:underline flex items-center gap-1 font-semibold"
                    >
                      <Sparkles className="w-3 h-3 text-[#00F0FF]" />
                      <span>DISCOVER MODELS</span>
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={formModelId}
                      onChange={(e) => {
                        setFormModelId(e.target.value);
                        if (!formModelDisplayName || formModelDisplayName === formModelId) {
                          setFormModelDisplayName(e.target.value);
                        }
                      }}
                      placeholder="e.g. gemini-3.1-flash-lite, llama-3.3-70b-versatile, meta-llama/llama-3.3-70b-instruct"
                      className="w-full px-2.5 py-1.5 rounded bg-[#030712] border border-[#1E293B] text-white text-xs font-mono focus:outline-none focus:border-[#00F0FF]"
                      required
                    />
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {currentProviderConfig.models.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setFormModelId(m);
                            setFormModelDisplayName(m);
                          }}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                            formModelId === m
                              ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Base URL (Optional endpoint override for OpenRouter / Groq) */}
                {formProvider !== 'Google GenAI' && (
                  <div>
                    <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                      Endpoint Base URL (Optional)
                    </label>
                    <input
                      type="text"
                      value={formBaseUrl}
                      onChange={(e) => {
                        setFormBaseUrl(e.target.value);
                        handleKeyOrUrlChange(formApiKey, e.target.value);
                      }}
                      placeholder={currentProviderConfig.defaultBaseUrl || 'https://api.openai.com/v1'}
                      className="w-full px-2.5 py-1.5 rounded bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF]"
                    />
                    <span className="text-[9px] text-slate-500">
                      Standard endpoint: {currentProviderConfig.defaultBaseUrl}
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    Quota Pool Identifier
                  </label>
                  <input
                    type="text"
                    value={formQuotaPool}
                    onChange={(e) => setFormQuotaPool(e.target.value)}
                    placeholder="e.g. ACCOUNT_A_POOL"
                    className="w-full px-2.5 py-1.5 rounded bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF]"
                  />
                  <span className="text-[9px] text-slate-500">
                    Keys with matching pool share rate limits during failover.
                  </span>
                </div>

                {/* Secret Key Input */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                    API Secret Key {editingId ? '(Leave blank to retain saved key)' : '*'}
                  </label>
                  <div className="relative">
                    <input
                      type={showKeyPassword ? 'text' : 'password'}
                      value={formApiKey}
                      onChange={(e) => handleKeyOrUrlChange(e.target.value, formBaseUrl)}
                      placeholder={editingId ? '••••••••••••••••••••' : currentProviderConfig.placeholderKey}
                      className="w-full px-2.5 py-1.5 pr-9 rounded bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF] font-mono"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyPassword(!showKeyPassword)}
                      className="absolute right-2 top-2 text-slate-500 hover:text-white"
                    >
                      {showKeyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-500 mt-1">
                    <span>{currentProviderConfig.keyHint}</span>
                    <span className="text-slate-400">Kept server-side only in 0600 storage</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setEditingId(null); setDetectionNotice(null); }}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white border border-transparent hover:border-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,240,255,0.3)]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Update Connection' : 'Save Connection'}</span>
                </button>
              </div>
            </form>
          )}

          {/* PROVIDER-CENTRIC DIRECTORY: Exactly 3 Primary Providers */}
          <div className="space-y-4">
            {PRIMARY_PROVIDERS.map((providerDef) => {
              const providerConns = connections.filter(c => c.provider === providerDef.id);

              return (
                <div 
                  key={providerDef.id} 
                  className="rounded-xl border border-[#1E293B] bg-[#0B0F19]/90 overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.4)]"
                >
                  {/* Top-Level Provider Directory Entry */}
                  <div className="p-3.5 bg-[#0D1322] border-b border-[#1E293B] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] shrink-0">
                        <Cpu className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-white tracking-wider">
                            {providerDef.name.toUpperCase()}
                          </h4>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-slate-300">
                            {providerDef.badge}
                          </span>
                          <span className="text-[9px] px-2 py-0.2 rounded-full bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-semibold">
                            {providerConns.length} {providerConns.length === 1 ? 'KEY' : 'KEYS'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {providerDef.tagline}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                      <button
                        onClick={() => handleStartAddForProvider(providerDef.id)}
                        className="px-2.5 py-1 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/50 text-[#00F0FF] text-[10px] font-bold flex items-center gap-1 transition-all shadow-[0_0_8px_rgba(0,240,255,0.15)]"
                      >
                        <Plus className="w-3 h-3" />
                        <span>ADD {providerDef.id === 'Google GenAI' ? 'GEMINI' : providerDef.id.toUpperCase()} KEY</span>
                      </button>
                    </div>
                  </div>

                  {/* Nested Connections List */}
                  <div className="p-3 space-y-2.5 bg-[#070C18]/60">
                    {providerConns.length === 0 ? (
                      <div className="p-4 rounded-lg border border-dashed border-[#1E293B] text-center space-y-2">
                        <p className="text-xs text-slate-400">
                          No active connections configured for {providerDef.name}.
                        </p>
                        <button
                          onClick={() => handleStartAddForProvider(providerDef.id)}
                          className="px-3 py-1 rounded bg-slate-900 hover:bg-[#111726] border border-slate-700 hover:border-[#00F0FF] text-slate-300 hover:text-[#00F0FF] text-[10px] inline-flex items-center gap-1 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add API Key to Configure</span>
                        </button>
                      </div>
                    ) : (
                      providerConns.map((conn) => {
                        const isActive = conn.id === activeConnection.id;
                        const testRes = testResults[conn.id];
                        const isTestingThis = testingId === conn.id;
                        const isRefreshingCatalog = refreshingCatalogId === conn.id;

                        // Connection Status (Connected / Failed / Untested)
                        const isOnline = conn.status === 'online';
                        const isFailed = conn.status === 'degraded';
                        const isCooldown = conn.status === 'cooldown';
                        const isUntested = conn.status === 'untested';
                        const isDisabled = !conn.isEnabled;

                        const connStatusBadge = isDisabled
                          ? { label: 'DISABLED', color: 'text-slate-500', bg: 'bg-slate-900 border-slate-800' }
                          : !conn.hasKey && conn.provider !== 'Ollama'
                          ? { label: 'UNCONFIGURED', color: 'text-slate-400', bg: 'bg-slate-900 border-slate-800' }
                          : isOnline
                          ? { label: 'CONNECTED', color: 'text-[#10B981]', bg: 'bg-[#10B981]/15 border-[#10B981]/40' }
                          : isCooldown
                          ? { label: 'COOLDOWN', color: 'text-[#FB7185]', bg: 'bg-[#FB7185]/15 border-[#FB7185]/40' }
                          : isFailed
                          ? { label: 'FAILED', color: 'text-[#FB7185]', bg: 'bg-[#FB7185]/15 border-[#FB7185]/40' }
                          : { label: 'UNTESTED', color: 'text-[#EAB308]', bg: 'bg-[#EAB308]/15 border-[#EAB308]/40' };

                        // Model Status (Verified / Rate-limited / Unavailable / Untested)
                        const modelStatus = conn.modelStatus || (isOnline ? 'verified' : 'untested');
                        const modelBadge = modelStatus === 'verified'
                          ? { label: 'VERIFIED', color: 'text-[#10B981]', bg: 'bg-[#10B981]/10 border-[#10B981]/30' }
                          : modelStatus === 'rate_limited'
                          ? { label: 'RATE-LIMITED', color: 'text-[#FB7185]', bg: 'bg-[#FB7185]/10 border-[#FB7185]/30' }
                          : modelStatus === 'unavailable'
                          ? { label: 'UNAVAILABLE', color: 'text-[#FB7185]', bg: 'bg-[#FB7185]/10 border-[#FB7185]/30' }
                          : { label: 'UNTESTED', color: 'text-[#EAB308]', bg: 'bg-[#EAB308]/10 border-[#EAB308]/30' };

                        // Catalog Status (Loaded / Refresh required / Failed)
                        const catalogStatus = conn.catalogStatus || (conn.discoveredModels && conn.discoveredModels.length > 0 ? 'loaded' : 'untested');

                        return (
                          <div
                            key={conn.id}
                            className={`p-3 rounded-lg border transition-all ${
                              isActive
                                ? 'bg-[#0B0F19] border-[#00F0FF]/80 shadow-[0_0_16px_rgba(0,240,255,0.12)]'
                                : 'bg-[#0B0F19]/70 border-[#1E293B] hover:border-[#334155]'
                            }`}
                          >
                            {/* Card Top Row: Active Radio, Label, Unique ID, Status */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#1E293B]/60">
                              <div className="flex items-center gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => setActiveConnectionId(conn.id)}
                                  className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                                    isActive
                                      ? 'border-[#00F0FF] bg-[#00F0FF]/20 text-[#00F0FF]'
                                      : 'border-slate-600 hover:border-slate-400'
                                  }`}
                                  title="Click to set this connection as active routing node for the workspace"
                                >
                                  {isActive && <div className="w-2 h-2 rounded-full bg-[#00F0FF]" />}
                                </button>

                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-bold text-xs text-white">
                                    {conn.name}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 font-mono">
                                    ID: {conn.id}
                                  </span>
                                  {isActive && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-[#00F0FF]/15 border border-[#00F0FF]/40 text-[#00F0FF]">
                                      ACTIVE ROUTE
                                    </span>
                                  )}
                                  {conn.isDefault && (
                                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700">
                                      BASELINE
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${connStatusBadge.bg} ${connStatusBadge.color} flex items-center gap-1`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#10B981] animate-pulse' : isFailed ? 'bg-[#FB7185]' : 'bg-[#EAB308]'}`} />
                                  {connStatusBadge.label}
                                </span>

                                <button
                                  onClick={() => toggleProviderConnection(conn.id)}
                                  className={`text-[9px] px-2 py-0.5 rounded border transition-colors ${
                                    conn.isEnabled
                                      ? 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                                      : 'bg-[#FB7185]/10 border-[#FB7185]/30 text-[#FB7185]'
                                  }`}
                                >
                                  {conn.isEnabled ? 'Disable' : 'Enable'}
                                </button>
                              </div>
                            </div>

                            {/* Card Middle Grid: Model, Key, Quota, Catalog */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-[10px]">
                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Selected Model:</span>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className="text-slate-200 font-mono truncate font-medium">{conn.modelId}</span>
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <span className={`text-[8px] px-1 py-0.1 rounded border font-semibold ${modelBadge.bg} ${modelBadge.color}`}>
                                    {modelBadge.label}
                                  </span>
                                  {conn.pricing && (
                                    <span className={`text-[8px] px-1 py-0.1 rounded border ${
                                      conn.pricing.pricingTier === 'free'
                                        ? 'bg-[#10B981]/15 border-[#10B981]/40 text-[#10B981]'
                                        : conn.pricing.pricingTier === 'paid'
                                        ? 'bg-slate-900 border-slate-700 text-slate-300'
                                        : 'bg-amber-950/30 border-amber-800 text-amber-400'
                                    }`}>
                                      {conn.pricing.pricingTier === 'free' ? 'FREE ($0.00)' : conn.pricing.pricingTier === 'paid' ? 'PAID' : 'UNKNOWN PRICING'}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Masked Credential:</span>
                                <span className={`font-mono block truncate mt-0.5 ${conn.hasKey ? 'text-[#10B981]' : 'text-[#FB7185]'}`}>
                                  {conn.maskedKey || (conn.hasKey ? 'Configured' : 'No key set')}
                                </span>
                                <span className="text-[9px] text-slate-500">
                                  {conn.hasKey ? 'Protected on server' : 'Required for requests'}
                                </span>
                              </div>

                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Model Catalog:</span>
                                <span className="text-slate-300 block truncate mt-0.5">
                                  {catalogStatus === 'loaded'
                                    ? `Loaded (${conn.discoveredModels?.length || 'Live'} models)`
                                    : catalogStatus === 'refresh_required'
                                    ? 'Refresh required'
                                    : 'Catalog Untested'}
                                </span>
                                <span className="text-[9px] text-slate-500 block truncate">
                                  {conn.catalogFetchedAt ? new Date(conn.catalogFetchedAt).toLocaleTimeString() : 'Not refreshed'}
                                </span>
                              </div>

                              <div>
                                <span className="text-slate-500 block text-[9px] uppercase">Quota Pool:</span>
                                <span className="text-slate-300 block truncate mt-0.5" title={conn.quotaPool}>
                                  {conn.quotaPool}
                                </span>
                                <span className="text-[9px] text-slate-500 truncate block">
                                  {conn.accountLimits?.rawDetails || 'Independent pool'}
                                </span>
                              </div>
                            </div>

                            {/* Test Result / Diagnostic Banner */}
                            {(testRes || conn.lastTestError) && (
                              <div className={`mt-2 p-2 rounded border text-[10px] ${
                                testRes?.success || conn.lastTestStatus === 'success'
                                  ? 'bg-[#10B981]/10 border-[#10B981]/40 text-[#10B981]'
                                  : 'bg-[#FB7185]/10 border-[#FB7185]/40 text-[#FB7185]'
                              }`}>
                                {testRes?.success ? (
                                  <div className="flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      Live request verified in {testRes.latencyMs}ms ({testRes.model})
                                    </span>
                                    <span className="font-bold">STATUS: CONNECTED</span>
                                  </div>
                                ) : (
                                  <div className="flex items-start gap-1.5">
                                    <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                      <span className="font-bold block">
                                        Test Failed [{testRes?.errorCategory || 'DIAGNOSTIC'}]:
                                      </span>
                                      <span className="text-slate-300 break-words">
                                        {testRes?.error || conn.lastTestError}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Action Toolbar: Test, Edit, Refresh Models, Browse Models, Remove */}
                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 mt-2 border-t border-[#1E293B]/40">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {/* 1. Test Action */}
                                <button
                                  type="button"
                                  onClick={() => handleTest(conn.id)}
                                  disabled={isTestingThis || !conn.hasKey}
                                  className={`px-2 py-1 rounded border text-[10px] font-semibold flex items-center gap-1 transition-all ${
                                    !conn.hasKey
                                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                      : 'bg-[#0B0F19] hover:bg-[#00F0FF]/15 border-[#1E293B] hover:border-[#00F0FF]/50 text-slate-300 hover:text-[#00F0FF]'
                                  }`}
                                  title="Send live test request through this connection"
                                >
                                  <Zap className={`w-3 h-3 ${isTestingThis ? 'animate-spin text-[#00F0FF]' : 'text-[#FFE600]'}`} />
                                  <span>{isTestingThis ? 'TESTING...' : 'TEST'}</span>
                                </button>

                                {/* 2. Edit Action */}
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(conn)}
                                  className="px-2 py-1 rounded bg-[#0B0F19] hover:bg-slate-800 border border-[#1E293B] text-slate-300 hover:text-white text-[10px] flex items-center gap-1 transition-colors"
                                  title="Edit connection name, key, or configuration"
                                >
                                  <Edit3 className="w-3 h-3 text-slate-400" />
                                  <span>EDIT</span>
                                </button>

                                {/* 3. Refresh Models Action */}
                                <button
                                  type="button"
                                  onClick={() => handleRefreshConnectionCatalog(conn.id)}
                                  disabled={isRefreshingCatalog || !conn.hasKey}
                                  className={`px-2 py-1 rounded border text-[10px] flex items-center gap-1 transition-colors ${
                                    !conn.hasKey
                                      ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                                      : 'bg-[#0B0F19] hover:bg-slate-800 border-[#1E293B] text-slate-300 hover:text-white'
                                  }`}
                                  title="Refresh model catalog from live provider API"
                                >
                                  <RefreshCw className={`w-3 h-3 ${isRefreshingCatalog ? 'animate-spin text-[#00F0FF]' : 'text-slate-400'}`} />
                                  <span>{isRefreshingCatalog ? 'REFRESHING...' : 'REFRESH MODELS'}</span>
                                </button>

                                {/* 4. Browse Models Action */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenModelDiscovery({
                                    connectionId: conn.id,
                                    provider: conn.provider,
                                    currentModelId: conn.modelId,
                                    isFormTarget: false,
                                    apiKey: conn.hasKey ? undefined : '',
                                    baseUrl: conn.baseUrl,
                                  })}
                                  className="px-2 py-1 rounded bg-[#0B0F19] hover:bg-[#00F0FF]/10 border border-[#1E293B] hover:border-[#00F0FF]/40 text-[#00F0FF] text-[10px] flex items-center gap-1 transition-colors"
                                  title="Open dynamic model catalog browser"
                                >
                                  <SlidersHorizontal className="w-3 h-3" />
                                  <span>BROWSE MODELS</span>
                                </button>
                              </div>

                              {/* 5. Remove Action */}
                              {!conn.isDefault && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(conn)}
                                  className="text-slate-500 hover:text-[#FB7185] p-1 rounded transition-colors text-[10px] flex items-center gap-1"
                                  title={isActive ? 'Delete active connection (switches active routing to fallback)' : 'Remove connection'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="hidden sm:inline">REMOVE</span>
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Testing Notice Disclaimer */}
          <div className="p-2.5 rounded bg-[#030712] border border-[#1E293B] text-[10px] text-slate-500 flex items-start gap-2">
            <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Provider Management Notice:</strong> A successful connection test confirms credential authenticity, model entitlement, and network availability. Models in rate-limit cooldown remain connected on the provider layer. Multiple keys for the same provider operate as isolated independent connections.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-[#1E293B] bg-[#0B0F19] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Globe className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>Active Workspace Route: <strong className="text-white">{activeConnection.name}</strong> ({activeConnection.provider} // {activeConnection.modelId})</span>
          </div>

          <button
            onClick={() => setIsProviderModalOpen(false)}
            className="px-4 py-1.5 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF] text-[#00F0FF] text-xs font-semibold transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
          >
            Done
          </button>
        </div>
      </div>

      {/* DYNAMIC MODEL BROWSER DRAWER / MODAL */}
      {modelBrowserOpen && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
          <div className="w-full max-w-3xl bg-[#0B0F19] border border-[#00F0FF]/60 rounded-xl shadow-[0_10px_50px_rgba(0,240,255,0.2)] flex flex-col max-h-[85vh] overflow-hidden font-mono">
            {/* Header */}
            <div className="px-4 py-3 border-b border-[#1E293B] bg-[#070C18] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#00F0FF]" />
                <h4 className="text-xs font-bold text-white tracking-wider">
                  MODEL CATALOG — {modelBrowserTarget?.provider.toUpperCase()}
                </h4>
                <span className={`text-[9px] px-1.5 py-0.2 rounded border ${
                  discoverySource === 'live_api'
                    ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                    : 'bg-amber-950/40 border-amber-800 text-amber-400'
                }`}>
                  {discoverySource === 'live_api' ? 'LIVE API' : 'CACHED CATALOG'}
                </span>
              </div>
              <button
                onClick={() => setModelBrowserOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-3 bg-[#070C18]/80 border-b border-[#1E293B] space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-500" />
                  <input
                    type="text"
                    value={browserSearch}
                    onChange={(e) => setBrowserSearch(e.target.value)}
                    placeholder="Search by exact model ID or name..."
                    className="w-full pl-8 pr-3 py-1.5 rounded bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF]"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => modelBrowserTarget && handleOpenModelDiscovery(modelBrowserTarget)}
                  disabled={isDiscoveringModels}
                  className="px-2.5 py-1.5 rounded bg-slate-900 hover:bg-[#111726] border border-slate-700 text-slate-300 text-xs flex items-center gap-1 transition-colors"
                  title="Query provider catalog endpoint"
                >
                  <RefreshCw className={`w-3 h-3 ${isDiscoveringModels ? 'animate-spin text-[#00F0FF]' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 text-[10px]">
                <button
                  onClick={() => setBrowserFilter('all')}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    browserFilter === 'all'
                      ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({browserModels.length})
                </button>
                <button
                  onClick={() => setBrowserFilter('text')}
                  className={`px-2 py-0.5 rounded border transition-colors ${
                    browserFilter === 'text'
                      ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  Text Generation
                </button>
                {modelBrowserTarget?.provider === 'OpenRouter' && (
                  <>
                    <button
                      onClick={() => setBrowserFilter('free')}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        browserFilter === 'free'
                          ? 'bg-[#10B981]/20 border-[#10B981] text-[#10B981]'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Zero-Priced / Free
                    </button>
                    <button
                      onClick={() => setBrowserFilter('paid')}
                      className={`px-2 py-0.5 rounded border transition-colors ${
                        browserFilter === 'paid'
                          ? 'bg-slate-800 border-slate-600 text-slate-200'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      Paid
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Model List View */}
            <div className="p-3 overflow-y-auto space-y-2 flex-1">
              {isDiscoveringModels ? (
                <div className="py-12 text-center space-y-2">
                  <RefreshCw className="w-5 h-5 text-[#00F0FF] animate-spin mx-auto" />
                  <p className="text-xs text-slate-400">{discoveryStatusMessage}</p>
                </div>
              ) : filteredBrowserModels.length === 0 ? (
                <div className="py-8 text-center space-y-2 border border-dashed border-[#1E293B] rounded-lg">
                  <p className="text-xs text-slate-400">No models found matching "{browserSearch}".</p>
                  <p className="text-[10px] text-slate-500">You can enter a manual model ID below.</p>
                </div>
              ) : (
                filteredBrowserModels.map((m) => {
                  const isSelected = modelBrowserTarget?.currentModelId === m.id;
                  const modality = m.compatibility?.primaryModality || (m.capabilities.supportsText ? 'text' : 'other');
                  const isCompatible = m.compatibility ? m.compatibility.isTextGenerationCapable : m.capabilities.supportsText;

                  return (
                    <div
                      key={m.id}
                      className={`p-2.5 rounded-lg border flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition-all ${
                        isSelected
                          ? 'bg-[#00F0FF]/15 border-[#00F0FF]'
                          : 'bg-[#030712] border-[#1E293B] hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-white font-mono">{m.id}</span>
                          <span className="text-[10px] text-slate-400">({m.displayName})</span>
                          {/* Modality Badge */}
                          <span className={`text-[8px] px-1 py-0.2 rounded border uppercase ${
                            modality === 'text' || modality === 'multimodal'
                              ? 'bg-[#00F0FF]/10 border-[#00F0FF]/30 text-[#00F0FF]'
                              : modality === 'image'
                              ? 'bg-purple-950/40 border-purple-800 text-purple-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400'
                          }`}>
                            {modality}
                          </span>
                          {/* Pricing Badge */}
                          {m.pricing && (
                            <span className={`text-[8px] px-1 py-0.2 rounded border font-semibold ${
                              m.pricing.pricingTier === 'free' || m.pricing.isZeroPriced
                                ? 'bg-[#10B981]/20 border-[#10B981]/50 text-[#10B981]'
                                : m.pricing.pricingTier === 'paid'
                                ? 'bg-slate-900 border-slate-700 text-slate-300'
                                : 'bg-amber-950/30 border-amber-800 text-amber-400'
                            }`}>
                              {m.pricing.pricingTier === 'free' || m.pricing.isZeroPriced ? 'ZERO-PRICED' : m.pricing.pricingNote || 'PAID'}
                            </span>
                          )}
                          {m.contextLength && (
                            <span className="text-[8px] px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-500">
                              {Math.round(m.contextLength / 1000)}k ctx
                            </span>
                          )}
                        </div>
                        {m.description && (
                          <p className="text-[10px] text-slate-400 line-clamp-1">
                            {m.description}
                          </p>
                        )}
                        {!isCompatible && m.compatibility?.reason && (
                          <p className="text-[9px] text-amber-400/90 flex items-center gap-1">
                            <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                            <span>{m.compatibility.reason}</span>
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSelectDiscoveredModel(m)}
                        className={`px-3 py-1 rounded text-[10px] font-bold transition-all shrink-0 ${
                          isSelected
                            ? 'bg-[#00F0FF] text-black shadow-[0_0_8px_rgba(0,240,255,0.3)]'
                            : 'bg-slate-900 hover:bg-[#00F0FF]/20 border border-slate-700 hover:border-[#00F0FF] text-slate-300 hover:text-[#00F0FF]'
                        }`}
                      >
                        {isSelected ? 'SELECTED' : 'SELECT'}
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            {/* Manual Model-ID Fallback Entry */}
            <div className="p-3 bg-[#070C18] border-t border-[#1E293B] space-y-1.5">
              <label className="text-[10px] text-slate-400 block uppercase font-semibold">
                Manual Model Identifier Fallback:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customModelInput}
                  onChange={(e) => setCustomModelInput(e.target.value)}
                  placeholder="e.g. meta-llama/llama-3.3-70b-instruct, qwen/qwen3.8-27b"
                  className="flex-1 px-2.5 py-1.5 rounded bg-[#030712] border border-[#1E293B] text-white text-xs font-mono focus:outline-none focus:border-[#00F0FF]"
                />
                <button
                  type="button"
                  onClick={handleSelectCustomModel}
                  disabled={!customModelInput.trim()}
                  className="px-3 py-1.5 rounded bg-slate-800 hover:bg-[#00F0FF]/20 border border-slate-700 hover:border-[#00F0FF] text-slate-200 hover:text-[#00F0FF] text-xs font-semibold disabled:opacity-40"
                >
                  Use Custom ID
                </button>
              </div>
              <p className="text-[9px] text-slate-500">
                Manual model IDs remain Untested until validated by a connection test.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {connectionPendingDelete && (
        <div className="fixed inset-0 z-70 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-[#0D1322] border border-[#FB7185] rounded-xl p-5 shadow-[0_0_30px_rgba(251,113,133,0.3)] space-y-4 font-mono">
            <div className="flex items-center gap-2.5 text-[#FB7185]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h4 className="text-sm font-bold tracking-wider">CONFIRM CONNECTION REMOVAL</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              {connectionPendingDelete.id === activeConnection.id ? (
                <span>
                  Connection <strong className="text-white font-bold">"{connectionPendingDelete.name}"</strong> ({connectionPendingDelete.provider}) is currently <span className="text-[#00F0FF] font-semibold">ACTIVE</span> for this workspace session.
                  <br /><br />
                  Removing it will safely re-route generation requests to <strong className="text-white">"{connections.find(c => c.id !== connectionPendingDelete.id && c.isEnabled)?.name || 'Default'}"</strong>.
                </span>
              ) : (
                <span>
                  Are you sure you want to remove connection <strong className="text-white">"{connectionPendingDelete.name}"</strong> ({connectionPendingDelete.provider})? This action cannot be undone.
                </span>
              )}
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={() => setConnectionPendingDelete(null)}
                className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white border border-slate-700 hover:border-slate-500 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded bg-[#FB7185] hover:bg-[#FB7185]/90 text-black text-xs font-bold transition-all shadow-[0_0_12px_rgba(251,113,133,0.4)]"
              >
                Confirm Removal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
