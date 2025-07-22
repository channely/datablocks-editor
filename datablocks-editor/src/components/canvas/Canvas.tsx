import React, { useCallback, useRef, useEffect, useMemo } from 'react';
import ReactFlow, {
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  Panel,
} from 'reactflow';
import type {
  Node,
  Edge,
  EdgeChange,
  NodeChange,
  ReactFlowInstance,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  OnInit,
  Connection,
  OnMove,
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useAppStore } from '../../stores/appStore';
import { CustomNode } from '../nodes/CustomNode';
import { cn } from '../../utils/cn';

// Define custom node types outside component to prevent React Flow warnings
const nodeTypes = {
  custom: CustomNode,
};

// Custom edge styles
const defaultEdgeOptions = {
  animated: false,
  style: {
    stroke: '#6366f1',
    strokeWidth: 2,
  },
};

interface CanvasProps {
  className?: string;
}

export const Canvas: React.FC<CanvasProps> = ({ className }) => {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);

  // Get state and actions from store
  const {
    nodes: storeNodes,
    connections: storeConnections,
    selectedNodes,
    selectedConnections,
    canvasViewport,
    addNode,
    removeNode,
    updateNode,
    duplicateNode,
    addConnection,
    removeConnection,
    selectNode,
    selectConnection,
    clearSelection,
    selectAll,
    setCanvasViewport,
  } = useAppStore();

  // Convert store nodes to React Flow nodes - memoized to prevent React Flow warnings
  const reactFlowNodes: Node[] = useMemo(() => storeNodes.map(node => ({
    id: node.id,
    type: 'custom',
    position: node.position,
    data: {
      ...node.data,
      type: node.type,
      config: node.config,
      status: node.status,
      error: node.error,
      selected: node.selected,
    },
    selected: node.selected,
    dragging: node.dragging,
  })), [storeNodes]);

  // Convert store connections to React Flow edges - memoized to prevent React Flow warnings
  const reactFlowEdges: Edge[] = useMemo(() => storeConnections.map(connection => ({
    id: connection.id,
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle,
    targetHandle: connection.targetHandle,
    animated: connection.animated || false,
    style: connection.style || defaultEdgeOptions.style,
  })), [storeConnections]);

  // Use React Flow state management for local updates
  const [nodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  // Sync React Flow nodes with store nodes
  React.useEffect(() => {
    setNodes(reactFlowNodes);
  }, [storeNodes, setNodes]);

  // Sync React Flow edges with store connections
  React.useEffect(() => {
    setEdges(reactFlowEdges);
  }, [storeConnections, setEdges]);

  // Handle node changes (position, selection, etc.)
  const handleNodesChange: OnNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);

      changes.forEach(change => {
        switch (change.type) {
          case 'position':
            if (change.position && change.dragging !== undefined) {
              updateNode(change.id, {
                position: change.position,
                dragging: change.dragging,
              });
            }
            break;
          case 'select':
            if (change.selected !== undefined) {
              if (change.selected) {
                selectNode(change.id);
              }
            }
            break;
          case 'remove':
            removeNode(change.id);
            break;
        }
      });
    },
    [onNodesChange, updateNode, selectNode, removeNode]
  );

  // Handle edge changes (selection, removal, etc.)
  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);

      changes.forEach(change => {
        switch (change.type) {
          case 'remove':
            removeConnection(change.id);
            break;
        }
      });
    },
    [onEdgesChange, removeConnection]
  );

  // Handle new connections
  const handleConnect: OnConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        const newConnection = {
          id: `${connection.source}-${connection.sourceHandle}-${connection.target}-${connection.targetHandle}`,
          source: connection.source,
          sourceHandle: connection.sourceHandle || 'output',
          target: connection.target,
          targetHandle: connection.targetHandle || 'input',
        };

        addConnection(newConnection);
        setEdges(eds => addEdge(connection, eds));
      }
    },
    [addConnection, setEdges]
  );

  // Handle React Flow initialization
  const handleInit: OnInit = useCallback(
    (instance: ReactFlowInstance) => {
      setReactFlowInstance(instance);
      
      // Set initial viewport if available
      if (canvasViewport && (canvasViewport.x !== 0 || canvasViewport.y !== 0 || canvasViewport.zoom !== 1)) {
        instance.setViewport(canvasViewport);
      }
    },
    [canvasViewport]
  );

  // Handle viewport changes
  const handleViewportChange = useCallback<OnMove>(
    (event, viewport) => {
      setCanvasViewport(viewport);
    },
    [setCanvasViewport]
  );

  // Handle canvas click (clear selection)
  const handlePaneClick = useCallback(() => {
    clearSelection();
  }, [clearSelection]);

  // Handle selection changes
  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: Node[]; edges: Edge[] }) => {
      // Update store with selected nodes
      selectedNodes.forEach(node => {
        selectNode(node.id, true);
      });

      // Update store with selected edges
      selectedEdges.forEach(edge => {
        selectConnection(edge.id, true);
      });
    },
    [selectNode, selectConnection]
  );

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default behavior when canvas is focused
      if (!reactFlowWrapper.current?.contains(document.activeElement)) {
        return;
      }

      switch (event.key) {
        case 'a':
        case 'A':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            selectAll();
          }
          break;
        case 'Escape':
          event.preventDefault();
          clearSelection();
          break;
        case 'd':
        case 'D':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            // Duplicate selected nodes
            selectedNodes.forEach(nodeId => {
              duplicateNode(nodeId);
            });
          }
          break;
        case 'Delete':
        case 'Backspace':
          event.preventDefault();
          // Delete selected nodes and connections
          selectedNodes.forEach(nodeId => {
            removeNode(nodeId);
          });
          selectedConnections.forEach(connectionId => {
            removeConnection(connectionId);
          });
          break;
        case 'f':
        case 'F':
          if (event.metaKey || event.ctrlKey) {
            event.preventDefault();
            // Fit view to show all nodes
            if (reactFlowInstance && nodes.length > 0) {
              reactFlowInstance.fitView({ padding: 0.1 });
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    selectedNodes,
    selectedConnections,
    selectAll,
    clearSelection,
    duplicateNode,
    removeNode,
    removeConnection,
    reactFlowInstance,
    nodes,
  ]);

  // Handle drag over for node dropping
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop for adding new nodes
  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const nodeType = event.dataTransfer.getData('application/reactflow');

      if (nodeType && reactFlowBounds && reactFlowInstance) {
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });

        const newNode = {
          id: `${nodeType}-${Date.now()}`,
          type: nodeType,
          position,
          data: {
            type: nodeType,
            name: nodeType.charAt(0).toUpperCase() + nodeType.slice(1),
          },
          config: {},
          status: 'idle' as const,
        };

        addNode(newNode);
      }
    },
    [reactFlowInstance, addNode]
  );

  return (
    <div className={cn('w-full h-full', className)} ref={reactFlowWrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={handleSelectionChange}
        onInit={handleInit}
        onMove={handleViewportChange}
        onMoveEnd={handleViewportChange}
        onPaneClick={handlePaneClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        attributionPosition="bottom-left"
        className="bg-gray-950"
        minZoom={0.1}
        maxZoom={2}
        snapToGrid
        snapGrid={[15, 15]}
        deleteKeyCode={['Backspace', 'Delete']}
        multiSelectionKeyCode={['Meta', 'Ctrl']}
        selectionKeyCode={['Shift']}

      >
        <Controls 
          className="bg-gray-800 border-gray-700"
          showZoom
          showFitView
          showInteractive
        />
        <MiniMap 
          className="bg-gray-800 border-gray-700"
          nodeColor="#6366f1"
          maskColor="rgba(0, 0, 0, 0.2)"
          pannable
          zoomable
        />
        <Background 
          variant={BackgroundVariant.Dots} 
          gap={20} 
          size={1}
          color="#374151"
        />
        <Panel position="top-left" className="text-white text-sm bg-gray-800 px-3 py-2 rounded-md border border-gray-700">
          Nodes: {nodes.length} | Connections: {edges.length}
        </Panel>
      </ReactFlow>
    </div>
  );
};

// Wrapper component with ReactFlowProvider
export const CanvasWithProvider: React.FC<CanvasProps> = (props) => {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
};