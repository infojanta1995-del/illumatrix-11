import React from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { 
  Activity, 
  Cpu, 
  ShieldCheck, 
  AlertOctagon, 
  Play, 
  RotateCcw, 
  XSquare, 
  Radio, 
  Clock, 
  CheckCircle, 
  Layers,
  Key
} from 'lucide-react';

export const ControlCenter: React.FC = () => {
  const { 
    connections, 
    activeConnection, 
    setActiveConnectionId, 
    setIsProviderModalOpen,
    simulateRateLimitTest, 
    simulateQuotaExhaustedTest, 
    jobs, 
    activeJob, 
    triggerJobSimulation, 
    cancelActiveJob, 
    retryJob, 
    staleMatrix,
    activeStageId,
    markArtifactStale,
    clearArtifactStale,
  } = useWorkflow();

  const activeStatusLabel = !activeConnection.isEnabled
    ? 'DISABLED'
    : !activeConnection.hasKey
    ? 'UNCONFIGURED'
    : activeConnection.status === 'online'
    ? 'ONLINE'
    : activeConnection.status === 'cooldown'
    ? 'COOLDOWN'
    : activeConnection.status === 'degraded'
    ? 'DEGRADED'
    : 'UNTESTED';

  const activeStatusColor = !activeConnection.isEnabled || !activeConnection.hasKey
    ? 'text-slate-400'
    : activeConnection.status === 'online'
    ? 'text-[#10B981]'
    : activeConnection.status === 'cooldown'
    ? 'text-[#FB7185]'
    : activeConnection.status === 'degraded'
    ? 'text-[#FB7185]'
    : 'text-[#EAB308]';

  return (
    <aside className="w-80 border-l border-[#1E293B] bg-[#070C18]/95 flex flex-col justify-between shrink-0 select-none overflow-y-auto">
      <div className="p-3.5 space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#FFE600]" />
            <span className="text-xs font-mono font-bold text-white tracking-wider">
              CONTROL CENTER
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            TELEMETRY & QUEUE
          </span>
        </div>

        {/* Provider Connection & Quota Truth Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              AI PROVIDER CONNECTIONS
            </span>
            <span className={`text-[10px] font-mono flex items-center gap-1 ${activeStatusColor}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                activeStatusLabel === 'ONLINE' ? 'bg-[#10B981] animate-pulse' :
                activeStatusLabel === 'COOLDOWN' ? 'bg-[#FB7185] animate-ping' :
                activeStatusLabel === 'DEGRADED' ? 'bg-[#FB7185]' :
                activeStatusLabel === 'UNTESTED' ? 'bg-[#EAB308]' : 'bg-slate-500'
              }`} />
              {activeStatusLabel}
            </span>
          </div>

          <button
            onClick={() => setIsProviderModalOpen(true)}
            className="w-full py-1.5 px-2.5 rounded bg-[#0B0F19] hover:bg-[#00F0FF]/15 border border-[#1E293B] hover:border-[#00F0FF]/50 text-xs font-mono text-slate-300 hover:text-[#00F0FF] transition-all flex items-center justify-center gap-1.5 shadow-[0_0_10px_rgba(0,240,255,0.05)]"
          >
            <Key className="w-3.5 h-3.5 text-[#00F0FF]" />
            <span>MANAGE PROVIDERS & KEYS</span>
          </button>

          <div className="space-y-1.5">
            {connections.map((conn) => {
              const isSelected = conn.id === activeConnection.id;
              const isCooldown = conn.status === 'cooldown';
              const isOnline = conn.status === 'online';
              const isDegraded = conn.status === 'degraded';
              const isUntested = conn.status === 'untested';

              return (
                <div
                  key={conn.id}
                  onClick={() => setActiveConnectionId(conn.id)}
                  className={`p-2.5 rounded-lg border text-xs font-mono transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#0B0F19] border-[#00F0FF]/60 shadow-[0_0_10px_rgba(0,240,255,0.1)]'
                      : isCooldown
                      ? 'bg-[#FB7185]/5 border-[#FB7185]/40 text-[#FB7185]'
                      : !conn.isEnabled
                      ? 'bg-[#0B0F19]/40 border-[#1E293B] opacity-60 text-slate-500'
                      : 'bg-[#0B0F19]/60 border-[#1E293B] hover:border-[#334155] text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        !conn.isEnabled ? 'bg-slate-500' :
                        isOnline ? 'bg-[#10B981]' :
                        isCooldown ? 'bg-[#FB7185] animate-ping' :
                        isDegraded ? 'bg-[#FB7185]' :
                        isUntested ? 'bg-[#EAB308]' : 'bg-slate-500'
                      }`} />
                      <span className={`font-semibold text-[11px] truncate ${isSelected ? 'text-white' : 'text-slate-300'}`}>
                        {conn.name}
                      </span>
                    </div>
                    {isSelected ? (
                      <span className="text-[9px] bg-[#00F0FF]/15 text-[#00F0FF] px-1 py-0.2 rounded border border-[#00F0FF]/30 shrink-0 ml-1">
                        ACTIVE
                      </span>
                    ) : (
                      <span className="text-[9px] text-slate-500 bg-slate-900 px-1 py-0.2 rounded border border-slate-800 shrink-0 ml-1">
                        {conn.provider}
                      </span>
                    )}
                  </div>

                  <div className="text-[10px] text-slate-500 flex items-center justify-between">
                    <span className="truncate max-w-[140px]">Model: {conn.modelId}</span>
                    <span className="text-slate-400">Calls: {conn.observedCallsCount}</span>
                  </div>

                  <div className="text-[9px] text-slate-500 mt-1 flex items-center justify-between border-t border-[#1E293B]/60 pt-1">
                    <span className="truncate max-w-[140px]">Pool: {conn.quotaPool}</span>
                    <span>{conn.reportedLatencyMs !== null ? `${conn.reportedLatencyMs}ms` : isOnline ? 'Online' : 'Untested'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quota Truth Notice (Page 3 & 16 invariant) */}
          <div className="p-2.5 rounded bg-[#030712] border border-[#1E293B] text-[10px] font-mono text-slate-400 space-y-1">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-[#FFE600]" />
                QUOTA TRUTH
              </span>
              <span className="text-slate-500 text-[9px]">GCP RUNTIME</span>
            </div>
            <p className="text-[9px] leading-tight text-slate-500">
              Provider API: <span className="text-slate-400">Not reported</span> (GCP GenAI does not return remaining quota headers). Observed calls tracked locally. Keys in same GCP project share quota pool.
            </p>
          </div>

          {/* Simulation & Test Controls */}
          <div className="grid grid-cols-2 gap-1.5 pt-1">
            <button
              onClick={simulateRateLimitTest}
              className="px-2 py-1.5 rounded bg-[#0B0F19] hover:bg-[#FB7185]/15 border border-[#1E293B] hover:border-[#FB7185]/40 text-[10px] font-mono text-slate-300 hover:text-[#FB7185] transition-colors flex items-center justify-center gap-1"
              title="Test bounded failure classification and rate-limit cooldown"
            >
              <AlertOctagon className="w-3 h-3" />
              <span>TEST 429 LIMIT</span>
            </button>

            <button
              onClick={simulateQuotaExhaustedTest}
              className="px-2 py-1.5 rounded bg-[#0B0F19] hover:bg-[#FFE600]/15 border border-[#1E293B] hover:border-[#FFE600]/40 text-[10px] font-mono text-slate-300 hover:text-[#FFE600] transition-colors flex items-center justify-center gap-1"
              title="Audit shared project quota behavior"
            >
              <Radio className="w-3 h-3" />
              <span>AUDIT POOL</span>
            </button>
          </div>
        </div>

        {/* Real Job Queue Section */}
        <div className="space-y-2 pt-2 border-t border-[#1E293B]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              AI JOB QUEUE
            </span>
            {activeJob ? (
              <span className="text-[10px] font-mono text-[#00F0FF] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F0FF] animate-ping" />
                RUNNING ({activeJob.progressPercent}%)
              </span>
            ) : (
              <span className="text-[10px] font-mono text-slate-500">IDLE</span>
            )}
          </div>

          {/* Active Job or Queue Trigger */}
          {activeJob ? (
            <div className="p-2.5 rounded-lg border border-[#00F0FF]/40 bg-[#00F0FF]/5 text-xs font-mono space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-[11px] truncate">
                  {activeJob.taskType}
                </span>
                <span className="text-[9px] text-[#00F0FF] font-bold">
                  ATTEMPT {activeJob.attemptCount}/{activeJob.maxAttempts}
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-900 h-1.5 rounded overflow-hidden">
                <div 
                  className="bg-[#00F0FF] h-full transition-all duration-300"
                  style={{ width: `${activeJob.progressPercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-400">Status: {activeJob.status.toUpperCase()}</span>
                <button
                  onClick={cancelActiveJob}
                  className="text-[#FB7185] hover:underline flex items-center gap-1"
                >
                  <XSquare className="w-3 h-3" />
                  <span>CANCEL</span>
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => triggerJobSimulation('TEST_PIPELINE_EXECUTION', activeStageId)}
              className="w-full py-2 px-3 rounded-lg bg-[#0B0F19] hover:bg-[#00F0FF]/10 border border-[#1E293B] hover:border-[#00F0FF]/50 text-xs font-mono text-slate-300 hover:text-[#00F0FF] transition-all flex items-center justify-center gap-2 group"
            >
              <Play className="w-3.5 h-3.5 text-[#00F0FF] group-hover:scale-110 transition-transform" />
              <span>SIMULATE TASK JOB</span>
            </button>
          )}

          {/* Recent Jobs History */}
          <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
            {jobs.slice(0, 4).map((j) => (
              <div 
                key={j.id} 
                className="p-1.5 rounded bg-[#030712] border border-[#1E293B] text-[10px] font-mono flex items-center justify-between"
              >
                <div className="flex items-center gap-1.5 truncate">
                  {j.status === 'succeeded' ? (
                    <CheckCircle className="w-3 h-3 text-[#10B981] shrink-0" />
                  ) : j.status === 'failed' ? (
                    <AlertOctagon className="w-3 h-3 text-[#FB7185] shrink-0" />
                  ) : (
                    <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                  )}
                  <span className="text-slate-300 truncate">{j.taskType}</span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <span className={`text-[9px] ${j.status === 'succeeded' ? 'text-[#10B981]' : j.status === 'failed' ? 'text-[#FB7185]' : 'text-slate-400'}`}>
                    {j.status}
                  </span>
                  {j.status === 'failed' ? (
                    <button 
                      onClick={() => retryJob(j.id)}
                      className="text-slate-400 hover:text-white"
                      title="Retry job"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Stale Dependency Graph */}
        <div className="space-y-2 pt-2 border-t border-[#1E293B]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#00F0FF]" />
              STALE STATE TRACKER
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
            <div className={`p-1.5 rounded border ${staleMatrix.scriptStale ? 'bg-[#FFE600]/10 border-[#FFE600]/40 text-[#FFE600]' : 'bg-[#030712] border-[#1E293B] text-slate-400'}`}>
              <div className="flex items-center justify-between">
                <span>Script Draft</span>
                <span className="text-[9px]">{staleMatrix.scriptStale ? 'STALE' : 'FRESH'}</span>
              </div>
            </div>

            <div className={`p-1.5 rounded border ${staleMatrix.promptsStale ? 'bg-[#FFE600]/10 border-[#FFE600]/40 text-[#FFE600]' : 'bg-[#030712] border-[#1E293B] text-slate-400'}`}>
              <div className="flex items-center justify-between">
                <span>Prompts</span>
                <span className="text-[9px]">{staleMatrix.promptsStale ? 'STALE' : 'FRESH'}</span>
              </div>
            </div>

            <div className={`p-1.5 rounded border ${staleMatrix.thumbnailsStale ? 'bg-[#FFE600]/10 border-[#FFE600]/40 text-[#FFE600]' : 'bg-[#030712] border-[#1E293B] text-slate-400'}`}>
              <div className="flex items-center justify-between">
                <span>Thumbnails</span>
                <span className="text-[9px]">{staleMatrix.thumbnailsStale ? 'STALE' : 'FRESH'}</span>
              </div>
            </div>

            <div className={`p-1.5 rounded border ${staleMatrix.seoStale ? 'bg-[#FFE600]/10 border-[#FFE600]/40 text-[#FFE600]' : 'bg-[#030712] border-[#1E293B] text-slate-400'}`}>
              <div className="flex items-center justify-between">
                <span>SEO Pkg</span>
                <span className="text-[9px]">{staleMatrix.seoStale ? 'STALE' : 'FRESH'}</span>
              </div>
            </div>
          </div>

          {staleMatrix.scriptStale || staleMatrix.promptsStale ? (
            <button
              onClick={() => {
                clearArtifactStale('scriptStale');
                clearArtifactStale('promptsStale');
                clearArtifactStale('thumbnailsStale');
                clearArtifactStale('seoStale');
              }}
              className="w-full py-1 rounded bg-[#FFE600]/10 hover:bg-[#FFE600]/20 border border-[#FFE600]/30 text-[10px] font-mono text-[#FFE600] flex items-center justify-center gap-1"
            >
              <span>SYNC & CLEAR STALE MARKS</span>
            </button>
          ) : (
            <button
              onClick={() => markArtifactStale('scriptStale', 'Simulated manual script edit')}
              className="w-full py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono text-slate-400 hover:text-slate-200"
            >
              <span>SIMULATE UPSTREAM CHANGE</span>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
};
