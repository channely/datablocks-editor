import React from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NodeLibraryPanel } from './components/panels/NodeLibraryPanel';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { DataPreviewPanel } from './components/panels/DataPreviewPanel';
import { CanvasWithProvider } from './components/canvas/Canvas';
import { useAppStore } from './stores/appStore';

function App() {
  // Get selected node from store
  const { selectedNodes, getNodeById } = useAppStore();
  const selectedNode = selectedNodes.length > 0 ? getNodeById(selectedNodes[0]) : null;

  return (
    <MainLayout
      sidebar={<NodeLibraryPanel />}
      rightPanel={<PropertiesPanel selectedNode={selectedNode} />}
      bottomPanel={<DataPreviewPanel selectedNode={selectedNode} />}
    >
      <CanvasWithProvider className="absolute inset-0" />
    </MainLayout>
  );
}

export default App;
