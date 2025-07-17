import React, { useState } from 'react';
import { MainLayout } from './components/layout/MainLayout';
import { NodeLibraryPanel } from './components/panels/NodeLibraryPanel';
import { PropertiesPanel } from './components/panels/PropertiesPanel';
import { DataPreviewPanel } from './components/panels/DataPreviewPanel';

function App() {
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [bottomPanelHeight, setBottomPanelHeight] = useState(256);

  // Mock selected node for demonstration
  React.useEffect(() => {
    // Simulate selecting a filter node after 2 seconds
    const timer = setTimeout(() => {
      setSelectedNode({
        id: 'filter-1',
        type: 'filter',
        name: 'Filter Node'
      });
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <MainLayout
      sidebar={<NodeLibraryPanel />}
      rightPanel={<PropertiesPanel selectedNode={selectedNode} />}
      bottomPanel={<DataPreviewPanel selectedNode={selectedNode} />}
      onSidebarToggle={setSidebarCollapsed}
      onBottomPanelResize={setBottomPanelHeight}
    >
      {/* Canvas area - React Flow will be integrated here */}
      <div className="absolute inset-0 flex items-center justify-center text-gray-500">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-2">Canvas Area</h2>
          <p className="text-gray-400">React Flow will be integrated here</p>
          <p className="text-sm text-gray-500 mt-4">
            Sidebar collapsed: {sidebarCollapsed ? 'Yes' : 'No'} | 
            Bottom panel height: {bottomPanelHeight}px
          </p>
        </div>
      </div>
    </MainLayout>
  );
}

export default App;
