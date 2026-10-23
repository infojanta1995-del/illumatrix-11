import React, { useState } from 'react';
import { useWorkflow } from '../../context/WorkflowContext';
import { X, FolderGit2, Check, AlertTriangle, AlertOctagon } from 'lucide-react';
import { ProviderManagerModal } from './ProviderManagerModal';

export const Modals: React.FC = () => {
  const { 
    isProjectModalOpen, 
    setIsProjectModalOpen, 
    project, 
    updateProject,
    toastMessage,
    addActivityEvent,
    unsavedModalState,
    closeUnsavedModal
  } = useWorkflow();

  const [projectNameInput, setProjectNameInput] = useState(project.name);

  const handleSaveProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectNameInput.trim()) {
      updateProject({ name: projectNameInput.trim() });
      addActivityEvent('CONFIG', `Project renamed to "${projectNameInput.trim()}".`, 'info');
      setIsProjectModalOpen(false);
    }
  };

  return (
    <>
      {/* Toast Notification Container */}
      {toastMessage ? (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className="px-4 py-2.5 rounded-lg bg-[#0B0F19] border border-[#00F0FF]/60 text-white font-mono text-xs shadow-[0_0_20px_rgba(0,240,255,0.25)] flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#00F0FF] animate-ping" />
            <span>{toastMessage}</span>
          </div>
        </div>
      ) : null}

      {/* Project Settings Modal */}
      {isProjectModalOpen ? (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B0F19] border border-[#1E293B] rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden font-mono">
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-[#1E293B] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#00F0FF]" />
                <span className="text-sm font-bold text-white tracking-wider">
                  PROJECT CONFIGURATION
                </span>
              </div>
              <button
                onClick={() => setIsProjectModalOpen(false)}
                className="text-slate-500 hover:text-white p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSaveProject} className="p-4 space-y-4">
              <div>
                <label className="block text-[11px] text-slate-400 uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={projectNameInput}
                  onChange={(e) => setProjectNameInput(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#030712] border border-[#1E293B] text-white text-xs focus:outline-none focus:border-[#00F0FF] transition-colors"
                  placeholder="e.g. Quantum Horizons"
                />
              </div>

              <div className="p-3 rounded bg-[#030712] border border-[#1E293B] space-y-1.5 text-xs text-slate-400">
                <div className="flex justify-between">
                  <span className="text-slate-500">Project ID:</span>
                  <span className="text-slate-300 font-mono text-[11px]">{project.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Created:</span>
                  <span className="text-slate-300 text-[11px]">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Active Format:</span>
                  <span className="text-[#00F0FF] text-[11px] font-bold">
                    {project.format === '9:16_SHORTS' ? '9:16 Shorts' : '16:9 Long-Form'}
                  </span>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => setIsProjectModalOpen(false)}
                  className="px-3 py-1.5 rounded text-xs text-slate-400 hover:text-slate-200 border border-transparent hover:border-[#1E293B]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 border border-[#00F0FF] text-[#00F0FF] text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(0,240,255,0.2)]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Unsaved Changes Guard Modal (Page 7 Requirement) */}
      {unsavedModalState.isOpen ? (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0B0F19] border border-[#FFE600]/50 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.85)] overflow-hidden font-mono p-5 space-y-4">
            <div className="flex items-center gap-2.5 text-[#FFE600] pb-2 border-b border-[#1E293B]">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-bold text-sm text-white">UNSAVED SOURCE EDITS</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You have modified the ground-truth source story but have not saved your edits. Moving to another stage or story will discard these changes.
            </p>

            <div className="p-3 rounded bg-[#030712] border border-[#1E293B] text-[11px] text-slate-400 space-y-1">
              <span className="text-[#FFE600] font-bold block text-[10px] uppercase">Page 7 Data Safety Invariant:</span>
              <span>All story modifications must be explicitly saved or confirmed to protect creative source text.</span>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-end gap-2 pt-2 border-t border-[#1E293B]">
              <button
                type="button"
                onClick={closeUnsavedModal}
                className="w-full sm:w-auto px-3 py-1.5 rounded text-xs text-slate-400 hover:text-white border border-[#1E293B] hover:bg-slate-900"
              >
                Cancel (Stay Here)
              </button>

              <button
                type="button"
                onClick={unsavedModalState.onConfirmDiscard}
                className="w-full sm:w-auto px-3 py-1.5 rounded text-xs text-[#FB7185] hover:bg-[#FB7185]/15 border border-[#FB7185]/30 font-semibold"
              >
                Discard & Leave
              </button>

              <button
                type="button"
                onClick={unsavedModalState.onConfirmSave}
                className="w-full sm:w-auto px-3.5 py-1.5 rounded bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black text-xs font-bold shadow-[0_0_10px_rgba(0,240,255,0.2)]"
              >
                Save & Proceed
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* AI Provider Manager Modal */}
      <ProviderManagerModal />
    </>
  );
};
