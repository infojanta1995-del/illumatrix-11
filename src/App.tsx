import React, { useEffect } from 'react';
import { WorkflowProvider, useWorkflow } from './context/WorkflowContext';
import { TopStatusBar } from './components/layout/TopStatusBar';
import { WorkflowStepper } from './components/layout/WorkflowStepper';
import { TaskWorkspace } from './components/layout/TaskWorkspace';
import { ControlCenter } from './components/layout/ControlCenter';
import { ActivityTerminal } from './components/layout/ActivityTerminal';
import { Modals } from './components/layout/Modals';
import { WORKFLOW_STAGES } from './data/registries';

const HUDAppShell: React.FC = () => {
  const { 
    isControlCenterOpen, 
    requestStageNavigation, 
    showToast,
    isActivityDrawerOpen,
    setIsActivityDrawerOpen,
    isProjectModalOpen,
    setIsProjectModalOpen
  } = useWorkflow();

  // Keyboard Navigation Shortcuts (Page 18 accessibility)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes open overlays
      if (e.key === 'Escape') {
        if (isActivityDrawerOpen) setIsActivityDrawerOpen(false);
        if (isProjectModalOpen) setIsProjectModalOpen(false);
        return;
      }

      // Alt + 1-7 for fast stage navigation
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const num = parseInt(e.key, 10);
        if (num >= 1 && num <= 7) {
          e.preventDefault();
          const targetStage = WORKFLOW_STAGES[num - 1].id;
          requestStageNavigation(targetStage);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isActivityDrawerOpen, 
    isProjectModalOpen, 
    setIsActivityDrawerOpen, 
    setIsProjectModalOpen, 
    requestStageNavigation
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-[#030712] text-slate-200 overflow-hidden select-none">
      {/* 1. Top Status Bar */}
      <TopStatusBar />

      {/* 2. Responsive 3-Zone Workspace Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: 7-Stage Workflow Stepper */}
        <WorkflowStepper />

        {/* Center: Primary Task Workspace Canvas */}
        <TaskWorkspace />

        {/* Right: Collapsible Control Center & Quota Monitor */}
        {isControlCenterOpen ? <ControlCenter /> : null}
      </div>

      {/* 3. Terminal Activity Console Drawer */}
      <ActivityTerminal />

      {/* 4. Modals and Toast Overlay */}
      <Modals />
    </div>
  );
};

export default function App() {
  return (
    <WorkflowProvider>
      <HUDAppShell />
    </WorkflowProvider>
  );
}
