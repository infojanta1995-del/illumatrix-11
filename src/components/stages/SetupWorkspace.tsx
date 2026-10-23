import React from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { CONTENT_MODES, VISUAL_STYLES } from '../../data/registries';
import { VideoFormat, ShortsDuration, LongFormDuration, Language } from '../../types/hud';
import { 
  Sliders, 
  Smartphone, 
  Monitor, 
  Clock, 
  Globe2, 
  Palette, 
  BookOpen, 
  ArrowRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';

export const SetupWorkspace: React.FC = () => {
  const { project, updateProject, navigateToNextStage, showToast } = useWorkflow();

  const handleFormatChange = (newFormat: VideoFormat) => {
    updateProject({ format: newFormat });
    showToast(`Format updated: ${newFormat === '9:16_SHORTS' ? '9:16 Vertical Shorts' : '16:9 Horizontal Long-Form'}`);
  };

  const handleShortsDurationChange = (dur: ShortsDuration) => {
    updateProject({ shortsDuration: dur });
    showToast(`Shorts duration set to ${dur}s (${dur / 8} scenes)`);
  };

  const handleLongFormDurationChange = (dur: LongFormDuration) => {
    updateProject({ longFormDurationMinutes: dur });
    showToast(`Long-form duration set to ${dur} min`);
  };

  const handleModeChange = (modeId: string) => {
    updateProject({ modeId });
  };

  const handleLanguageChange = (lang: Language) => {
    updateProject({ language: lang });
    showToast(`Language set to ${lang === 'hi' ? 'Hindi (हिंदी)' : 'English'}`);
  };

  const handleStyleChange = (styleId: string) => {
    updateProject({ visualStyleId: styleId });
  };

  const currentMode = CONTENT_MODES.find(m => m.id === project.modeId) || CONTENT_MODES[0];
  const currentStyle = VISUAL_STYLES.find(s => s.id === project.visualStyleId) || VISUAL_STYLES[0];

  return (
    <div className="space-y-6 font-mono">
      {/* Stage Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E293B] gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#00F0FF] mb-1">
            <Sliders className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-bold tracking-wider">STAGE 01 // SETUP & PROJECT INVARIANTS</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Video Format, Pacing & Mode Definition
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Configure the baseline parameters for this content package. Every downstream stage strictly obeys the selected format, scene pacing, and language.
          </p>
        </div>

        <button
          onClick={navigateToNextStage}
          className="self-start sm:self-auto px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)] shrink-0"
        >
          <span>STAGE 02: SOURCES</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Configuration Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column: Format, Duration & Language */}
        <div className="space-y-5">
          {/* Main Video Format Selector */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#00F0FF]" />
                MAIN VIDEO FORMAT
              </span>
              <span className="text-[10px] text-slate-500 uppercase">Aspect Ratio Constraint</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleFormatChange('9:16_SHORTS')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  project.format === '9:16_SHORTS'
                    ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.15)] text-white'
                    : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">9:16 Vertical</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[#00F0FF]">
                    SHORTS
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Fixed 8-second scenes. strictly 24, 32, 40, or 48 seconds.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleFormatChange('16:9_LONG_FORM')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  project.format === '16:9_LONG_FORM'
                    ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.15)] text-white'
                    : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155]'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-xs">16:9 Horizontal</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[#FFE600]">
                    LONG-FORM
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Multi-minute narrative beats, structured sections, and chapter markers.
                </p>
              </button>
            </div>
          </div>

          {/* Duration Selector (Dynamic per format) */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FFE600]" />
                DURATION & SCENE PACING
              </span>
              <span className="text-[10px] text-slate-500">
                {project.format === '9:16_SHORTS' ? 'Exact 8s Scenes' : 'Configurable Duration'}
              </span>
            </div>

            {project.format === '9:16_SHORTS' ? (
              <div className="space-y-3">
                <div className="grid grid-cols-4 gap-2">
                  {([24, 32, 40, 48] as ShortsDuration[]).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => handleShortsDurationChange(dur)}
                      className={`py-2 px-1 rounded-lg border text-center transition-all ${
                        project.shortsDuration === dur
                          ? 'bg-[#FFE600]/15 border-[#FFE600] text-[#FFE600] font-bold shadow-[0_0_10px_rgba(255,230,0,0.2)]'
                          : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155]'
                      }`}
                    >
                      <div className="text-sm font-bold">{dur}s</div>
                      <div className="text-[9px] text-slate-500">{dur / 8} scenes</div>
                    </button>
                  ))}
                </div>

                {/* Shorts Functional Breakdown Preview */}
                <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] text-xs space-y-1.5">
                  <div className="text-[10px] text-slate-500 uppercase tracking-wider">
                    {project.shortsDuration}-Second Scene Structure:
                  </div>
                  {project.shortsDuration === 24 && (
                    <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                      <div className="p-1 rounded bg-[#0B0F19] border border-[#00F0FF]/30 text-[#00F0FF]">
                        <span className="block font-bold">0–8s</span> Hook
                      </div>
                      <div className="p-1 rounded bg-[#0B0F19] border border-[#FFE600]/30 text-[#FFE600]">
                        <span className="block font-bold">8–16s</span> Main Idea
                      </div>
                      <div className="p-1 rounded bg-[#0B0F19] border border-[#10B981]/30 text-[#10B981]">
                        <span className="block font-bold">16–24s</span> Ending/Payoff
                      </div>
                    </div>
                  )}
                  {project.shortsDuration === 32 && (
                    <div className="grid grid-cols-4 gap-1 text-center text-[9px]">
                      <div className="p-1 rounded bg-[#0B0F19] border border-[#1E293B]">0–8s Hook</div>
                      <div className="p-1 rounded bg-[#0B0F19] border border-[#1E293B]">8–16s Setup</div>
                      <div className="p-1 rounded bg-[#0B0F19] border border-[#1E293B]">16–24s Reveal</div>
                      <div className="p-1 rounded bg-[#0B0F19] border border-[#1E293B]">24–32s Payoff</div>
                    </div>
                  )}
                  {project.shortsDuration >= 40 && (
                    <div className="text-[10px] text-slate-400">
                      Pacing: Hook $\rightarrow$ Context $\rightarrow$ Deep Development $\rightarrow$ Key Reveal $\rightarrow$ Payoff/CTA ({project.shortsDuration / 8} scenes @ 8s each).
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-5 gap-2">
                  {([3, 4, 5, 8, 10] as LongFormDuration[]).map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => handleLongFormDurationChange(dur)}
                      className={`py-2 px-1 rounded-lg border text-center transition-all ${
                        project.longFormDurationMinutes === dur
                          ? 'bg-[#FFE600]/15 border-[#FFE600] text-[#FFE600] font-bold shadow-[0_0_10px_rgba(255,230,0,0.2)]'
                          : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155]'
                      }`}
                    >
                      <div className="text-sm font-bold">{dur}m</div>
                      <div className="text-[9px] text-slate-500">Target</div>
                    </button>
                  ))}
                </div>

                <div className="p-2.5 rounded bg-[#030712] border border-[#FFE600]/30 text-[10px] text-slate-400 space-y-1.5">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#FFE600] shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[#FFE600] font-bold block">Unresolved Blueprint Minimum:</span>
                      Page 3 mentions 4-minute minimum, Page 9 mentions 3-minute minimum. Kept configurable as an open product setting ({project.longFormDurationMinutes}m selected).
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-500 pl-6 border-t border-[#1E293B] pt-1">
                    <strong className="text-slate-400">Scene Pacing Decision (Page 25):</strong> Long-form uses ~30s pacing blocks ({project.longFormDurationMinutes * 2} scenes). Whether to force 8s clips onto long-form is pending owner confirmation.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Storage & Persistence Transparency Banner */}
          <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] text-[10px] text-slate-400 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-[#00F0FF] shrink-0 mt-0.5" />
            <div>
              <span className="text-[#00F0FF] font-bold block">Persistence Architecture (Blueprint Page 19 & 25):</span>
              Active project data persists in browser localStorage with structured JSON and Markdown backup exports available in Stage 07. Durable cloud database backend is not yet provisioned.
            </div>
          </div>

          {/* Language Selector */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-[#00F0FF]" />
                SCRIPT & NARRATION LANGUAGE
              </span>
              <span className="text-[10px] text-slate-500">Bilingual Support</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleLanguageChange('en')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  project.language === 'en'
                    ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-white shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                    : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155]'
                }`}
              >
                <div className="font-bold text-xs mb-0.5">English</div>
                <div className="text-[10px] text-slate-400">Natural English voice-over & script phrasing</div>
              </button>

              <button
                type="button"
                onClick={() => handleLanguageChange('hi')}
                className={`p-3 rounded-lg border text-left transition-all ${
                  project.language === 'hi'
                    ? 'bg-[#FFE600]/15 border-[#FFE600] text-white shadow-[0_0_10px_rgba(255,230,0,0.15)]'
                    : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155]'
                }`}
              >
                <div className="font-bold text-xs mb-0.5">Hindi (हिंदी)</div>
                <div className="text-[10px] text-slate-400">Idiomatic Devanagari Hindi text & narration</div>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Content Mode & Visual Style */}
        <div className="space-y-5">
          {/* Content Mode Selector */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#10B981]" />
                CONTENT MODE REGISTRY
              </span>
              <span className="text-[10px] text-slate-500">{CONTENT_MODES.length} Core Modes</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CONTENT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeChange(mode.id)}
                  className={`p-2 rounded-lg border text-left transition-all ${
                    project.modeId === mode.id
                      ? 'bg-[#10B981]/15 border-[#10B981] text-white shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                      : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155]'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{mode.name}</div>
                  <div className="text-[9px] text-slate-500 truncate">{mode.tagline}</div>
                </button>
              ))}
            </div>

            {/* Active Mode Description Box */}
            <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1 text-xs">
              <div className="flex items-center justify-between text-slate-300 font-semibold text-[11px]">
                <span className="text-[#10B981]">{currentMode.name} Rules</span>
                <span className="text-slate-500 text-[9px]">{currentMode.pacing}</span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {currentMode.rules}
              </p>
            </div>
          </div>

          {/* Visual Style Engine Selector */}
          <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-bold flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#00F0FF]" />
                DEFAULT VISUAL STYLE
              </span>
              <span className="text-[10px] text-slate-500">13 Blueprint Styles</span>
            </div>

            <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5">
              {VISUAL_STYLES.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  onClick={() => handleStyleChange(style.id)}
                  className={`w-full p-2.5 rounded-lg border text-left transition-all flex items-center justify-between text-xs ${
                    project.visualStyleId === style.id
                      ? 'bg-[#00F0FF]/15 border-[#00F0FF] text-white shadow-[0_0_10px_rgba(0,240,255,0.15)]'
                      : 'bg-[#030712] border-[#1E293B] text-slate-400 hover:border-[#334155]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-1.5 h-1.5 rounded-full ${project.visualStyleId === style.id ? 'bg-[#00F0FF]' : 'bg-slate-700'}`} />
                    <span className="font-semibold truncate">{style.name}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 shrink-0 ml-2">
                    {style.category}
                  </span>
                </button>
              ))}
            </div>

            {/* Active Style Prompt Treatment Preview */}
            <div className="p-3 rounded-lg bg-[#030712] border border-[#1E293B] space-y-1 text-xs">
              <div className="flex items-center justify-between text-[11px] text-slate-300 font-semibold">
                <span className="text-[#00F0FF] flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  Prompt Treatment: {currentStyle.name}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                {currentStyle.promptTreatment}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
