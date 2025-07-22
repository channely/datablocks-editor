import React, { useEffect } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NodeLibraryPanel } from './components/panels/NodeLibraryPanel';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { BottomPanel } from './components/panels/BottomPanel';
import { CanvasWithProvider } from './components/canvas/Canvas';
import { ErrorBoundary } from './components/error/ErrorBoundary';
import { ErrorNotificationContainer } from './components/error/ErrorNotification';
import { ErrorRecoveryPanel, useErrorRecovery } from './components/error/ErrorRecoveryPanel';
import { useAppStore } from './stores/appStore';
import { errorHandler } from './services/errorHandler';
import { projectManager } from './services/projectManager';

function App() {
  // Get selected node from store
  const { selectedNodes, getNodeById, errors, addError, removeError } = useAppStore();
  const selectedNode = selectedNodes.length > 0 ? getNodeById(selectedNodes[0]) : null;
  
  // Error recovery hook
  const { recoverableErrors, dismissError } = useErrorRecovery();

  // Set up error handler integration
  useEffect(() => {
    const unsubscribe = errorHandler.addErrorListener((error) => {
      addError(error);
    });

    return unsubscribe;
  }, [addError]);

  // Initialize project manager
  useEffect(() => {
    // Project manager is already initialized as singleton
    // Auto-save is started automatically
    return () => {
      // Cleanup on unmount
      projectManager.destroy();
    };
  }, []);

  // Generate error ID for removal
  const generateErrorId = (error: any) => 
    `${error.timestamp.getTime()}-${error.type}-${error.nodeId || 'global'}`;

  return (
    <ErrorBoundary onError={addError}>
      <MainLayout
        sidebar={<NodeLibraryPanel />}
        rightPanel={<PropertiesPanel selectedNode={selectedNode} />}
        bottomPanel={<BottomPanel selectedNode={selectedNode} />}
      >
        <CanvasWithProvider className="absolute inset-0" />
      </MainLayout>

      {/* Global error notifications */}
      <ErrorNotificationContainer
        errors={errors}
        onDismissError={(errorId) => removeError(errorId)}
      />

      {/* Error recovery panels */}
      <div className="fixed bottom-4 right-4 space-y-2 z-40">
        {recoverableErrors.map((error, index) => (
          <ErrorRecoveryPanel
            key={`${error.timestamp.getTime()}-${index}`}
            error={error}
            onRecoveryAttempt={(success) => {
              if (success) {
                dismissError(error);
              }
            }}
            onDismiss={() => dismissError(error)}
            className="w-80"
          />
        ))}
      </div>
    </ErrorBoundary>
  );
}

export default App;
