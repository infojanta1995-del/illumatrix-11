import React, { useState, useEffect, useRef } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { SourceStory, SourceType } from '../../types/hud';
import { 
  FileText, 
  Plus, 
  Save, 
  Copy, 
  Archive, 
  ArchiveRestore,
  Trash2, 
  Check, 
  AlertTriangle, 
  ArrowRight,
  Search,
  Filter,
  Download,
  Upload,
  Clock,
  Sparkles,
  ShieldCheck,
  FileCode,
  Tag
} from 'lucide-react';

const SOURCE_TYPES: { id: SourceType; label: string; description: string }[] = [
  { id: 'article', label: 'News / Magazine Article', description: 'Published article or journalistic report' },
  { id: 'research_notes', label: 'Research Notes', description: 'Technical whitepapers, lab findings, or scientific bullet points' },
  { id: 'raw_transcript', label: 'Raw Audio/Video Transcript', description: 'Verbatim spoken dialogue or interview notes' },
  { id: 'news_dispatch', label: 'Breaking News Dispatch', description: 'Urgent confirmed bulletins and wires' },
  { id: 'creative_story', label: 'Creative Narrative', description: 'Original prose, fiction, or conceptual pitch' },
];

const MAX_SAFE_CHAR_LIMIT = 100000; // Safe capacity buffer preventing browser truncation

export const SourcesWorkspace: React.FC = () => {
  const { 
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
    hasUnsavedSourceEdits,
    setHasUnsavedSourceEdits,
    navigateToNextStage, 
    showToast 
  } = useWorkflow();

  // Local Editor State
  const [editingTitle, setEditingTitle] = useState<string>(selectedStory.title);
  const [editingText, setEditingText] = useState<string>(selectedStory.rawText);
  const [editingNotes, setEditingNotes] = useState<string>(selectedStory.notes || '');
  const [editingType, setEditingType] = useState<SourceType>(selectedStory.sourceType);
  const [isNotesOpen, setIsNotesOpen] = useState<boolean>(Boolean(selectedStory.notes));

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // File Import input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync editor when active selected story changes externally
  useEffect(() => {
    setEditingTitle(selectedStory.title);
    setEditingText(selectedStory.rawText);
    setEditingNotes(selectedStory.notes || '');
    setEditingType(selectedStory.sourceType);
    setIsNotesOpen(Boolean(selectedStory.notes));
    setHasUnsavedSourceEdits(false);
  }, [selectedStoryId, selectedStory, setHasUnsavedSourceEdits]);

  // Handle Text changes and dirty tracking
  const handleTextChange = (text: string) => {
    setEditingText(text);
    setHasUnsavedSourceEdits(true);
  };

  const handleTitleChange = (title: string) => {
    setEditingTitle(title);
    setHasUnsavedSourceEdits(true);
  };

  const handleNotesChange = (notes: string) => {
    setEditingNotes(notes);
    setHasUnsavedSourceEdits(true);
  };

  const handleTypeChange = (type: SourceType) => {
    setEditingType(type);
    setHasUnsavedSourceEdits(true);
  };

  // Safe Save Handler
  const handleSave = () => {
    if (editingText.length > MAX_SAFE_CHAR_LIMIT) {
      showToast(`Warning: Source text exceeds safe limit of ${MAX_SAFE_CHAR_LIMIT.toLocaleString()} characters.`);
      return;
    }

    saveStory({
      id: selectedStory.id,
      title: editingTitle,
      rawText: editingText,
      notes: editingNotes,
      sourceType: editingType,
    });
  };

  // Handle Switching Story with Unsaved Warning Guard
  const handleStoryCardClick = (story: SourceStory) => {
    if (story.id === selectedStoryId) return;

    if (hasUnsavedSourceEdits) {
      if (confirm('You have unsaved edits in the current story. Discard changes and switch story?')) {
        setHasUnsavedSourceEdits(false);
        selectStory(story.id);
      }
    } else {
      selectStory(story.id);
    }
  };

  // Filtered stories list
  const filteredStories = stories.filter(s => {
    if (!showArchived && s.isArchived) return false;
    if (showArchived && !s.isArchived) return false;
    if (typeFilter !== 'ALL' && s.sourceType !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return s.title.toLowerCase().includes(q) || s.rawText.toLowerCase().includes(q) || (s.notes && s.notes.toLowerCase().includes(q));
    }
    return true;
  });

  // Calculate live text metrics
  const wordsCount = editingText.trim() ? editingText.trim().split(/\s+/).length : 0;
  const charsCount = editingText.length;
  const paragraphCount = editingText.split(/\n\s*\n/).filter(p => p.trim().length > 0).length;
  const lineBreaksCount = (editingText.match(/\n/g) || []).length;
  const isNearLimit = charsCount > MAX_SAFE_CHAR_LIMIT * 0.8;

  // Handle Export Stories
  const handleExportJson = () => {
    const dataStr = exportStoriesData();
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `illum_source_library_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showToast('Source library exported to JSON.');
  };

  // Handle Import Stories
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importStoriesData(content);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6 font-mono">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#1E293B] gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#00F0FF] mb-1">
            <FileText className="w-4 h-4 text-[#00F0FF]" />
            <span className="font-bold tracking-wider">STAGE 02 // SOURCE STORY LIBRARY</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-wide">
            Ground-Truth Input Articles & Reference Material
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Input source stories are saved byte-for-byte with exact line breaks, paragraphs, and punctuation preserved. Downstream script generation explicitly links to the selected story version.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Library Export / Import */}
          <button
            onClick={handleExportJson}
            className="p-2 rounded-lg bg-[#0B0F19] hover:bg-slate-900 border border-[#1E293B] text-slate-400 hover:text-white text-xs transition-colors"
            title="Export Source Stories to JSON"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-2 rounded-lg bg-[#0B0F19] hover:bg-slate-900 border border-[#1E293B] text-slate-400 hover:text-white text-xs transition-colors"
            title="Import Source Stories from JSON"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImportJson} 
            accept=".json" 
            className="hidden" 
          />

          <button
            onClick={navigateToNextStage}
            className="px-4 py-2 rounded-lg bg-[#FFE600] hover:bg-[#FFE600]/90 text-black font-bold text-xs flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,230,0,0.3)] shrink-0"
          >
            <span>STAGE 03: SCRIPT STUDIO</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Saved Stories Manager & Filter */}
        <div className="p-4 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-3.5">
          {/* Header & Create Action */}
          <div className="flex items-center justify-between pb-2 border-b border-[#1E293B]">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-bold uppercase tracking-wider">
                STORIES ({stories.length})
              </span>
              {showArchived && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#FFE600]/10 text-[#FFE600] border border-[#FFE600]/30">
                  ARCHIVED
                </span>
              )}
            </div>

            <button
              onClick={createBlankStory}
              className="px-2.5 py-1 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF]/40 text-[#00F0FF] text-[11px] font-bold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>NEW STORY</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search stories by keyword..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF] placeholder:text-slate-600 transition-colors"
            />
          </div>

          {/* Type Filter & Archive Toggle Bar */}
          <div className="flex items-center justify-between text-[10px] text-slate-500">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-[#030712] border border-[#1E293B] rounded px-2 py-1 text-slate-300 focus:outline-none focus:border-[#00F0FF]"
            >
              <option value="ALL">All Types</option>
              {SOURCE_TYPES.map(t => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>

            <button
              onClick={() => setShowArchived(!showArchived)}
              className={`hover:text-slate-300 transition-colors ${showArchived ? 'text-[#FFE600]' : 'text-slate-500'}`}
            >
              {showArchived ? 'View Active' : 'View Archived'}
            </button>
          </div>

          {/* Stories Scrollable List */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {filteredStories.length === 0 ? (
              <div className="p-6 text-center text-slate-600 text-xs border border-dashed border-[#1E293B] rounded-lg">
                No source stories found matching search criteria.
              </div>
            ) : (
              filteredStories.map((story) => {
                const isSelected = story.id === selectedStoryId;

                return (
                  <div
                    key={story.id}
                    onClick={() => handleStoryCardClick(story)}
                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#00F0FF]/10 border-[#00F0FF] shadow-[0_0_12px_rgba(0,240,255,0.15)] text-white'
                        : story.isArchived
                        ? 'bg-[#030712]/50 border-dashed border-[#1E293B] opacity-70 text-slate-500'
                        : 'bg-[#030712] border-[#1E293B] hover:border-[#334155] text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs truncate max-w-[170px]">
                        {story.title}
                      </span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-slate-900 border border-slate-800 text-slate-400 tabular-nums">
                        v{story.version}
                      </span>
                    </div>

                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed mb-2">
                      {story.rawText}
                    </p>

                    <div className="flex items-center justify-between text-[9px] text-slate-500 border-t border-[#1E293B]/60 pt-1.5">
                      <span>{story.wordCount} words · {story.charCount} chars</span>
                      {isSelected ? (
                        <span className="text-[#00F0FF] font-bold flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> SELECTED
                        </span>
                      ) : story.isArchived ? (
                        <span className="text-[#FFE600]">ARCHIVED</span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (2 cols): Dedicated Plain-Text Editor */}
        <div className="lg:col-span-2 p-5 rounded-xl bg-[#0B0F19] border border-[#1E293B] space-y-4">
          {/* Top Bar with Title, Type and Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={editingTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                className="w-full text-base font-bold text-white bg-transparent border-b border-transparent hover:border-[#334155] focus:border-[#00F0FF] focus:outline-none transition-colors"
                placeholder="Ground-Truth Story Title..."
              />
              
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-500 mt-1">
                <span className="text-[#00F0FF] font-semibold">Version v{selectedStory.version}</span>
                <span>•</span>
                <span>Updated: {new Date(selectedStory.updatedAt).toLocaleTimeString()}</span>
                <span>•</span>
                <span className="capitalize">{editingType.replace('_', ' ')}</span>
                {hasUnsavedSourceEdits && (
                  <>
                    <span>•</span>
                    <span className="text-[#FFE600] flex items-center gap-1 font-semibold">
                      <AlertTriangle className="w-3 h-3" /> Unsaved edits
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => duplicateStory(selectedStory.id)}
                className="px-2.5 py-1.5 rounded bg-[#030712] hover:bg-slate-900 border border-[#1E293B] text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
                title="Duplicate this source story"
              >
                <Copy className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">DUPLICATE</span>
              </button>

              {selectedStory.isArchived ? (
                <button
                  onClick={() => unarchiveStory(selectedStory.id)}
                  className="px-2.5 py-1.5 rounded bg-[#030712] hover:bg-[#10B981]/15 border border-[#1E293B] hover:border-[#10B981]/40 text-slate-300 hover:text-[#10B981] text-xs flex items-center gap-1.5 transition-colors"
                  title="Restore archived story"
                >
                  <ArchiveRestore className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">RESTORE</span>
                </button>
              ) : (
                <button
                  onClick={() => archiveStory(selectedStory.id)}
                  className="px-2.5 py-1.5 rounded bg-[#030712] hover:bg-[#FB7185]/15 border border-[#1E293B] hover:border-[#FB7185]/40 text-slate-400 hover:text-[#FB7185] text-xs flex items-center gap-1.5 transition-colors"
                  title="Soft-delete (archive) story while preserving downstream dependencies"
                >
                  <Archive className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">ARCHIVE</span>
                </button>
              )}

              <button
                onClick={handleSave}
                className={`px-3.5 py-1.5 rounded text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)] ${
                  hasUnsavedSourceEdits 
                    ? 'bg-[#00F0FF] text-black hover:bg-[#00F0FF]/90' 
                    : 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                }`}
              >
                <Save className="w-3.5 h-3.5" />
                <span>SAVE STORY</span>
              </button>
            </div>
          </div>

          {/* Source Type Selector & Fact-Check Notes Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-[#030712] p-2.5 rounded-lg border border-[#1E293B]">
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] text-slate-400 uppercase">SOURCE TYPE:</span>
              <select
                value={editingType}
                onChange={(e) => handleTypeChange(e.target.value as SourceType)}
                className="bg-[#0B0F19] border border-[#1E293B] rounded px-2 py-0.5 text-xs text-white focus:outline-none focus:border-[#00F0FF]"
              >
                {SOURCE_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setIsNotesOpen(!isNotesOpen)}
              className="text-[11px] text-[#00F0FF] hover:underline flex items-center gap-1"
            >
              <span>{isNotesOpen ? '− Hide Fact-Check Notes' : '+ Add Fact-Check / Provenance Notes'}</span>
            </button>
          </div>

          {/* Optional Notes Field */}
          {isNotesOpen && (
            <div className="space-y-1 text-xs">
              <label className="block text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                Fact-Check & Provenance Notes (Optional):
              </label>
              <input
                type="text"
                value={editingNotes}
                onChange={(e) => handleNotesChange(e.target.value)}
                placeholder="e.g. Telemetry verified by NASA Oct 2026; peer-reviewed preprint available."
                className="w-full px-3 py-1.5 rounded bg-[#030712] border border-[#1E293B] text-slate-200 text-xs focus:outline-none focus:border-[#00F0FF]"
              />
            </div>
          )}

          {/* Ground-Truth Plain-Text Editor Area */}
          <div>
            <textarea
              value={editingText}
              onChange={(e) => handleTextChange(e.target.value)}
              rows={14}
              className="w-full p-4 rounded-lg bg-[#030712] border border-[#1E293B] text-slate-200 text-xs leading-relaxed focus:outline-none focus:border-[#00F0FF]/70 transition-colors font-mono resize-y"
              placeholder="Paste or write your ground-truth source text here. All paragraphs and blank lines will be preserved line-by-line..."
            />
          </div>

          {/* Telemetry and Preservation Inspector */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 pt-2 border-t border-[#1E293B] gap-2">
            <div className="flex flex-wrap items-center gap-3 text-[11px]">
              <span><strong className="text-white tabular-nums">{wordsCount}</strong> words</span>
              <span>•</span>
              <span className={isNearLimit ? 'text-[#FFE600]' : ''}>
                <strong className="text-white tabular-nums">{charsCount}</strong> / {MAX_SAFE_CHAR_LIMIT.toLocaleString()} chars
              </span>
              <span>•</span>
              <span><strong className="text-white tabular-nums">{paragraphCount}</strong> paragraphs</span>
              <span>•</span>
              <span className="text-[#10B981] flex items-center gap-1">
                <Check className="w-3 h-3" /> Exact line breaks ({lineBreaksCount} returns)
              </span>
            </div>

            <div className="text-[10px] text-slate-500">
              Active Downstream Target: <span className="text-[#00F0FF] font-bold">{selectedStory.title} (v{selectedStory.version})</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
