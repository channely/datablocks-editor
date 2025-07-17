import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import type {
  AppState,
  NodeInstance,
  Connection,
  NodeStatus,
  AppError,
} from '../types';

// Enable Map and Set support in Immer
enableMapSet();

// Define the store interface with actions
interface AppStore extends AppState {
  // Node operations
  addNode: (node: NodeInstance) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<NodeInstance>) => void;
  duplicateNode: (nodeId: string) => void;

  // Connection operations
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
  updateConnection: (
    connectionId: string,
    updates: Partial<Connection>
  ) => void;

  // Selection operations
  selectNode: (nodeId: string, multiSelect?: boolean) => void;
  selectConnection: (connectionId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // UI state operations
  setSidebarCollapsed: (collapsed: boolean) => void;
  setPreviewPanelHeight: (height: number) => void;
  setCanvasViewport: (viewport: { x: number; y: number; zoom: number }) => void;

  // Execution state operations
  setNodeOutput: (nodeId: string, output: any) => void;
  setNodeStatus: (nodeId: string, status: NodeStatus) => void;
  setExecuting: (executing: boolean) => void;
  clearNodeOutput: (nodeId: string) => void;

  // Error operations
  addError: (error: AppError) => void;
  removeError: (errorId: string) => void;
  clearErrors: () => void;

  // Project operations
  setProjectName: (name: string) => void;
  setProjectId: (id: string) => void;
  markDirty: () => void;
  markClean: () => void;

  // Utility operations
  reset: () => void;
  getNodeById: (nodeId: string) => NodeInstance | undefined;
  getConnectionById: (connectionId: string) => Connection | undefined;
  getSelectedNodes: () => NodeInstance[];
  getSelectedConnections: () => Connection[];
}

// Initial state
const initialState: AppState = {
  nodes: [],
  connections: [],
  selectedNodes: [],
  selectedConnections: [],
  sidebarCollapsed: false,
  previewPanelHeight: 300,
  canvasViewport: { x: 0, y: 0, zoom: 1 },
  nodeOutputs: new Map(),
  executionStatus: new Map(),
  isExecuting: false,
  errors: [],
  isDirty: false,
};

// Generate unique IDs
const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

// Create the store with persistence
export const useAppStore = create<AppStore>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Node operations
      addNode: (node: NodeInstance) => {
        set(state => {
          const newNode = {
            ...node,
            id: node.id || generateId(),
          };
          state.nodes.push(newNode);
          state.isDirty = true;
        });
      },

      removeNode: (nodeId: string) => {
        set(state => {
          // Remove the node
          state.nodes = state.nodes.filter(node => node.id !== nodeId);

          // Remove connections related to this node
          state.connections = state.connections.filter(
            conn => conn.source !== nodeId && conn.target !== nodeId
          );

          // Remove from selection
          state.selectedNodes = state.selectedNodes.filter(id => id !== nodeId);

          // Clear node output and status
          state.nodeOutputs.delete(nodeId);
          state.executionStatus.delete(nodeId);

          state.isDirty = true;
        });
      },

      updateNode: (nodeId: string, updates: Partial<NodeInstance>) => {
        set(state => {
          const nodeIndex = state.nodes.findIndex(node => node.id === nodeId);
          if (nodeIndex !== -1) {
            state.nodes[nodeIndex] = { ...state.nodes[nodeIndex], ...updates };
            state.isDirty = true;
          }
        });
      },

      duplicateNode: (nodeId: string) => {
        set(state => {
          const originalNode = state.nodes.find(node => node.id === nodeId);
          if (originalNode) {
            const duplicatedNode: NodeInstance = {
              ...originalNode,
              id: generateId(),
              position: {
                x: originalNode.position.x + 50,
                y: originalNode.position.y + 50,
              },
              selected: false,
            };
            state.nodes.push(duplicatedNode);
            state.isDirty = true;
          }
        });
      },

      // Connection operations
      addConnection: (connection: Connection) => {
        set(state => {
          const newConnection = {
            ...connection,
            id: connection.id || generateId(),
          };

          // Check if connection already exists
          const exists = state.connections.some(
            conn =>
              conn.source === newConnection.source &&
              conn.sourceHandle === newConnection.sourceHandle &&
              conn.target === newConnection.target &&
              conn.targetHandle === newConnection.targetHandle
          );

          if (!exists) {
            state.connections.push(newConnection);
            state.isDirty = true;
          }
        });
      },

      removeConnection: (connectionId: string) => {
        set(state => {
          state.connections = state.connections.filter(
            conn => conn.id !== connectionId
          );
          state.selectedConnections = state.selectedConnections.filter(
            id => id !== connectionId
          );
          state.isDirty = true;
        });
      },

      updateConnection: (
        connectionId: string,
        updates: Partial<Connection>
      ) => {
        set(state => {
          const connIndex = state.connections.findIndex(
            conn => conn.id === connectionId
          );
          if (connIndex !== -1) {
            state.connections[connIndex] = {
              ...state.connections[connIndex],
              ...updates,
            };
            state.isDirty = true;
          }
        });
      },

      // Selection operations
      selectNode: (nodeId: string, multiSelect = false) => {
        set(state => {
          if (multiSelect) {
            if (state.selectedNodes.includes(nodeId)) {
              state.selectedNodes = state.selectedNodes.filter(
                id => id !== nodeId
              );
            } else {
              state.selectedNodes.push(nodeId);
            }
          } else {
            state.selectedNodes = [nodeId];
          }

          // Update node selection state
          state.nodes.forEach(node => {
            node.selected = state.selectedNodes.includes(node.id);
          });
        });
      },

      selectConnection: (connectionId: string, multiSelect = false) => {
        set(state => {
          if (multiSelect) {
            if (state.selectedConnections.includes(connectionId)) {
              state.selectedConnections = state.selectedConnections.filter(
                id => id !== connectionId
              );
            } else {
              state.selectedConnections.push(connectionId);
            }
          } else {
            state.selectedConnections = [connectionId];
          }
        });
      },

      clearSelection: () => {
        set(state => {
          state.selectedNodes = [];
          state.selectedConnections = [];

          // Update node selection state
          state.nodes.forEach(node => {
            node.selected = false;
          });
        });
      },

      selectAll: () => {
        set(state => {
          state.selectedNodes = state.nodes.map(node => node.id);
          state.selectedConnections = state.connections.map(conn => conn.id);

          // Update node selection state
          state.nodes.forEach(node => {
            node.selected = true;
          });
        });
      },

      // UI state operations
      setSidebarCollapsed: (collapsed: boolean) => {
        set(state => {
          state.sidebarCollapsed = collapsed;
        });
      },

      setPreviewPanelHeight: (height: number) => {
        set(state => {
          state.previewPanelHeight = Math.max(100, Math.min(800, height));
        });
      },

      setCanvasViewport: (viewport: { x: number; y: number; zoom: number }) => {
        set(state => {
          state.canvasViewport = viewport;
        });
      },

      // Execution state operations
      setNodeOutput: (nodeId: string, output: any) => {
        set(state => {
          state.nodeOutputs.set(nodeId, output);
        });
      },

      setNodeStatus: (nodeId: string, status: NodeStatus) => {
        set(state => {
          state.executionStatus.set(nodeId, status);

          // Update node status
          const node = state.nodes.find(n => n.id === nodeId);
          if (node) {
            node.status = status;
          }
        });
      },

      setExecuting: (executing: boolean) => {
        set(state => {
          state.isExecuting = executing;
        });
      },

      clearNodeOutput: (nodeId: string) => {
        set(state => {
          state.nodeOutputs.delete(nodeId);
          state.executionStatus.delete(nodeId);
        });
      },

      // Error operations
      addError: (error: AppError) => {
        set(state => {
          state.errors.push(error);
        });
      },

      removeError: (errorId: string) => {
        set(state => {
          state.errors = state.errors.filter(
            error => `${error.timestamp.getTime()}-${error.type}` !== errorId
          );
        });
      },

      clearErrors: () => {
        set(state => {
          state.errors = [];
        });
      },

      // Project operations
      setProjectName: (name: string) => {
        set(state => {
          state.projectName = name;
          state.isDirty = true;
        });
      },

      setProjectId: (id: string) => {
        set(state => {
          state.projectId = id;
        });
      },

      markDirty: () => {
        set(state => {
          state.isDirty = true;
        });
      },

      markClean: () => {
        set(state => {
          state.isDirty = false;
          state.lastSaved = new Date();
        });
      },

      // Utility operations
      reset: () => {
        set(() => ({
          ...initialState,
          nodeOutputs: new Map(),
          executionStatus: new Map(),
        }));
      },

      getNodeById: (nodeId: string) => {
        return get().nodes.find(node => node.id === nodeId);
      },

      getConnectionById: (connectionId: string) => {
        return get().connections.find(conn => conn.id === connectionId);
      },

      getSelectedNodes: () => {
        const state = get();
        return state.nodes.filter(node =>
          state.selectedNodes.includes(node.id)
        );
      },

      getSelectedConnections: () => {
        const state = get();
        return state.connections.filter(conn =>
          state.selectedConnections.includes(conn.id)
        );
      },
    })),
    {
      name: 'datablocks-app-state',
      storage: createJSONStorage(() => localStorage),
      partialize: state => ({
        // Only persist certain parts of the state (Maps are not persisted)
        nodes: state.nodes,
        connections: state.connections,
        sidebarCollapsed: state.sidebarCollapsed,
        previewPanelHeight: state.previewPanelHeight,
        canvasViewport: state.canvasViewport,
        projectName: state.projectName,
        projectId: state.projectId,
        lastSaved: state.lastSaved,
      }),
    }
  )
);
