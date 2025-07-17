import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAppStore } from '../appStore';
import type { NodeInstance, Connection, NodeStatus } from '../../types';
import { ErrorType } from '../../types';

// Mock localStorage for testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('AppStore', () => {
  beforeEach(() => {
    // Reset the store before each test
    useAppStore.getState().reset();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
  });

  describe('Node Operations', () => {
    it('should add a node', () => {
      const store = useAppStore.getState();
      const node: NodeInstance = {
        id: 'test-node-1',
        type: 'input-file',
        position: { x: 100, y: 100 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      };

      store.addNode(node);
      
      const state = useAppStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0]).toEqual(expect.objectContaining(node));
      expect(state.isDirty).toBe(true);
    });

    it('should generate ID if not provided', () => {
      const store = useAppStore.getState();
      const node: Omit<NodeInstance, 'id'> & { id?: string } = {
        type: 'input-file',
        position: { x: 100, y: 100 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      };

      store.addNode(node as NodeInstance);
      
      const state = useAppStore.getState();
      expect(state.nodes[0].id).toBeDefined();
      expect(typeof state.nodes[0].id).toBe('string');
    });

    it('should remove a node and its connections', () => {
      const store = useAppStore.getState();
      
      // Add nodes
      const node1: NodeInstance = {
        id: 'node-1',
        type: 'input-file',
        position: { x: 100, y: 100 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      };
      
      const node2: NodeInstance = {
        id: 'node-2',
        type: 'transform-filter',
        position: { x: 200, y: 200 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      };

      store.addNode(node1);
      store.addNode(node2);

      // Add connection
      const connection: Connection = {
        id: 'conn-1',
        source: 'node-1',
        sourceHandle: 'output',
        target: 'node-2',
        targetHandle: 'input',
      };
      
      store.addConnection(connection);

      // Remove node
      store.removeNode('node-1');

      const state = useAppStore.getState();
      expect(state.nodes).toHaveLength(1);
      expect(state.nodes[0].id).toBe('node-2');
      expect(state.connections).toHaveLength(0);
    });

    it('should update a node', () => {
      const store = useAppStore.getState();
      const node: NodeInstance = {
        id: 'test-node',
        type: 'input-file',
        position: { x: 100, y: 100 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      };

      store.addNode(node);
      store.updateNode('test-node', { 
        position: { x: 200, y: 200 },
        status: 'processing' as NodeStatus 
      });

      const state = useAppStore.getState();
      expect(state.nodes[0].position).toEqual({ x: 200, y: 200 });
      expect(state.nodes[0].status).toBe('processing');
    });

    it('should duplicate a node', () => {
      const store = useAppStore.getState();
      const node: NodeInstance = {
        id: 'original-node',
        type: 'input-file',
        position: { x: 100, y: 100 },
        data: { test: 'data' },
        config: { setting: 'value' },
        status: 'idle' as NodeStatus,
      };

      store.addNode(node);
      store.duplicateNode('original-node');

      const state = useAppStore.getState();
      expect(state.nodes).toHaveLength(2);
      
      const duplicated = state.nodes[1];
      expect(duplicated.id).not.toBe('original-node');
      expect(duplicated.type).toBe('input-file');
      expect(duplicated.position).toEqual({ x: 150, y: 150 });
      expect(duplicated.data).toEqual({ test: 'data' });
      expect(duplicated.config).toEqual({ setting: 'value' });
    });
  });

  describe('Connection Operations', () => {
    it('should add a connection', () => {
      const store = useAppStore.getState();
      const connection: Connection = {
        id: 'test-conn',
        source: 'node-1',
        sourceHandle: 'output',
        target: 'node-2',
        targetHandle: 'input',
      };

      store.addConnection(connection);

      const state = useAppStore.getState();
      expect(state.connections).toHaveLength(1);
      expect(state.connections[0]).toEqual(connection);
      expect(state.isDirty).toBe(true);
    });

    it('should not add duplicate connections', () => {
      const store = useAppStore.getState();
      const connection: Connection = {
        id: 'test-conn',
        source: 'node-1',
        sourceHandle: 'output',
        target: 'node-2',
        targetHandle: 'input',
      };

      store.addConnection(connection);
      store.addConnection({ ...connection, id: 'different-id' });

      const state = useAppStore.getState();
      expect(state.connections).toHaveLength(1);
    });

    it('should remove a connection', () => {
      const store = useAppStore.getState();
      const connection: Connection = {
        id: 'test-conn',
        source: 'node-1',
        sourceHandle: 'output',
        target: 'node-2',
        targetHandle: 'input',
      };

      store.addConnection(connection);
      store.removeConnection('test-conn');

      const state = useAppStore.getState();
      expect(state.connections).toHaveLength(0);
    });

    it('should update a connection', () => {
      const store = useAppStore.getState();
      const connection: Connection = {
        id: 'test-conn',
        source: 'node-1',
        sourceHandle: 'output',
        target: 'node-2',
        targetHandle: 'input',
      };

      store.addConnection(connection);
      store.updateConnection('test-conn', { animated: true });

      const state = useAppStore.getState();
      expect(state.connections[0].animated).toBe(true);
    });
  });

  describe('Selection Operations', () => {
    beforeEach(() => {
      const store = useAppStore.getState();
      
      // Add test nodes
      store.addNode({
        id: 'node-1',
        type: 'input-file',
        position: { x: 100, y: 100 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      });
      
      store.addNode({
        id: 'node-2',
        type: 'transform-filter',
        position: { x: 200, y: 200 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      });
    });

    it('should select a single node', () => {
      const store = useAppStore.getState();
      store.selectNode('node-1');

      const state = useAppStore.getState();
      expect(state.selectedNodes).toEqual(['node-1']);
      expect(state.nodes[0].selected).toBe(true);
      expect(state.nodes[1].selected).toBe(false);
    });

    it('should support multi-select', () => {
      const store = useAppStore.getState();
      store.selectNode('node-1');
      store.selectNode('node-2', true);

      const state = useAppStore.getState();
      expect(state.selectedNodes).toEqual(['node-1', 'node-2']);
      expect(state.nodes[0].selected).toBe(true);
      expect(state.nodes[1].selected).toBe(true);
    });

    it('should deselect when multi-selecting already selected node', () => {
      const store = useAppStore.getState();
      store.selectNode('node-1');
      store.selectNode('node-1', true);

      const state = useAppStore.getState();
      expect(state.selectedNodes).toEqual([]);
      expect(state.nodes[0].selected).toBe(false);
    });

    it('should clear selection', () => {
      const store = useAppStore.getState();
      store.selectNode('node-1');
      store.selectNode('node-2', true);
      store.clearSelection();

      const state = useAppStore.getState();
      expect(state.selectedNodes).toEqual([]);
      expect(state.nodes[0].selected).toBe(false);
      expect(state.nodes[1].selected).toBe(false);
    });

    it('should select all nodes', () => {
      const store = useAppStore.getState();
      store.selectAll();

      const state = useAppStore.getState();
      expect(state.selectedNodes).toEqual(['node-1', 'node-2']);
      expect(state.nodes[0].selected).toBe(true);
      expect(state.nodes[1].selected).toBe(true);
    });
  });

  describe('UI State Operations', () => {
    it('should toggle sidebar collapsed state', () => {
      const store = useAppStore.getState();
      
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
      
      store.setSidebarCollapsed(true);
      expect(useAppStore.getState().sidebarCollapsed).toBe(true);
      
      store.setSidebarCollapsed(false);
      expect(useAppStore.getState().sidebarCollapsed).toBe(false);
    });

    it('should set preview panel height with bounds', () => {
      const store = useAppStore.getState();
      
      store.setPreviewPanelHeight(200);
      expect(useAppStore.getState().previewPanelHeight).toBe(200);
      
      // Test minimum bound
      store.setPreviewPanelHeight(50);
      expect(useAppStore.getState().previewPanelHeight).toBe(100);
      
      // Test maximum bound
      store.setPreviewPanelHeight(1000);
      expect(useAppStore.getState().previewPanelHeight).toBe(800);
    });

    it('should set canvas viewport', () => {
      const store = useAppStore.getState();
      const viewport = { x: 100, y: 200, zoom: 1.5 };
      
      store.setCanvasViewport(viewport);
      expect(useAppStore.getState().canvasViewport).toEqual(viewport);
    });
  });

  describe('Execution State Operations', () => {
    it('should set node output', () => {
      const store = useAppStore.getState();
      const output = { data: [1, 2, 3] };
      
      store.setNodeOutput('node-1', output);
      
      const state = useAppStore.getState();
      expect(state.nodeOutputs.get('node-1')).toEqual(output);
    });

    it('should set node status', () => {
      const store = useAppStore.getState();
      
      // Add a node first
      store.addNode({
        id: 'node-1',
        type: 'input-file',
        position: { x: 100, y: 100 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      });
      
      store.setNodeStatus('node-1', 'processing');
      
      const state = useAppStore.getState();
      expect(state.executionStatus.get('node-1')).toBe('processing');
      expect(state.nodes[0].status).toBe('processing');
    });

    it('should set execution state', () => {
      const store = useAppStore.getState();
      
      store.setExecuting(true);
      expect(useAppStore.getState().isExecuting).toBe(true);
      
      store.setExecuting(false);
      expect(useAppStore.getState().isExecuting).toBe(false);
    });

    it('should clear node output', () => {
      const store = useAppStore.getState();
      
      store.setNodeOutput('node-1', { data: 'test' });
      store.setNodeStatus('node-1', 'success');
      
      store.clearNodeOutput('node-1');
      
      const state = useAppStore.getState();
      expect(state.nodeOutputs.has('node-1')).toBe(false);
      expect(state.executionStatus.has('node-1')).toBe(false);
    });
  });

  describe('Error Operations', () => {
    it('should add an error', () => {
      const store = useAppStore.getState();
      const error = {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Test error',
        nodeId: 'node-1',
        timestamp: new Date(),
      };
      
      store.addError(error);
      
      const state = useAppStore.getState();
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toEqual(error);
    });

    it('should remove an error', () => {
      const store = useAppStore.getState();
      const error = {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Test error',
        timestamp: new Date(),
      };
      
      store.addError(error);
      const errorId = `${error.timestamp.getTime()}-${error.type}`;
      store.removeError(errorId);
      
      const state = useAppStore.getState();
      expect(state.errors).toHaveLength(0);
    });

    it('should clear all errors', () => {
      const store = useAppStore.getState();
      
      store.addError({
        type: ErrorType.VALIDATION_ERROR,
        message: 'Error 1',
        timestamp: new Date(),
      });
      
      store.addError({
        type: ErrorType.EXECUTION_ERROR,
        message: 'Error 2',
        timestamp: new Date(),
      });
      
      store.clearErrors();
      
      const state = useAppStore.getState();
      expect(state.errors).toHaveLength(0);
    });
  });

  describe('Project Operations', () => {
    it('should set project name and mark dirty', () => {
      const store = useAppStore.getState();
      
      store.setProjectName('My Project');
      
      const state = useAppStore.getState();
      expect(state.projectName).toBe('My Project');
      expect(state.isDirty).toBe(true);
    });

    it('should set project ID', () => {
      const store = useAppStore.getState();
      
      store.setProjectId('project-123');
      
      const state = useAppStore.getState();
      expect(state.projectId).toBe('project-123');
    });

    it('should mark dirty and clean', () => {
      const store = useAppStore.getState();
      
      store.markDirty();
      expect(useAppStore.getState().isDirty).toBe(true);
      
      store.markClean();
      const state = useAppStore.getState();
      expect(state.isDirty).toBe(false);
      expect(state.lastSaved).toBeInstanceOf(Date);
    });
  });

  describe('Utility Operations', () => {
    beforeEach(() => {
      const store = useAppStore.getState();
      
      // Add test data
      store.addNode({
        id: 'node-1',
        type: 'input-file',
        position: { x: 100, y: 100 },
        data: {},
        config: {},
        status: 'idle' as NodeStatus,
      });
      
      store.addConnection({
        id: 'conn-1',
        source: 'node-1',
        sourceHandle: 'output',
        target: 'node-2',
        targetHandle: 'input',
      });
      
      store.selectNode('node-1');
    });

    it('should get node by ID', () => {
      const store = useAppStore.getState();
      const node = store.getNodeById('node-1');
      
      expect(node).toBeDefined();
      expect(node?.id).toBe('node-1');
      expect(node?.type).toBe('input-file');
    });

    it('should return undefined for non-existent node', () => {
      const store = useAppStore.getState();
      const node = store.getNodeById('non-existent');
      
      expect(node).toBeUndefined();
    });

    it('should get connection by ID', () => {
      const store = useAppStore.getState();
      const connection = store.getConnectionById('conn-1');
      
      expect(connection).toBeDefined();
      expect(connection?.id).toBe('conn-1');
    });

    it('should get selected nodes', () => {
      const store = useAppStore.getState();
      const selectedNodes = store.getSelectedNodes();
      
      expect(selectedNodes).toHaveLength(1);
      expect(selectedNodes[0].id).toBe('node-1');
    });

    it('should get selected connections', () => {
      const store = useAppStore.getState();
      store.selectConnection('conn-1');
      
      const selectedConnections = store.getSelectedConnections();
      
      expect(selectedConnections).toHaveLength(1);
      expect(selectedConnections[0].id).toBe('conn-1');
    });

    it('should reset store to initial state', () => {
      const store = useAppStore.getState();
      
      // Verify we have data
      expect(store.nodes).toHaveLength(1);
      expect(store.connections).toHaveLength(1);
      expect(store.selectedNodes).toHaveLength(1);
      
      store.reset();
      
      const state = useAppStore.getState();
      expect(state.nodes).toHaveLength(0);
      expect(state.connections).toHaveLength(0);
      expect(state.selectedNodes).toHaveLength(0);
      expect(state.nodeOutputs.size).toBe(0);
      expect(state.executionStatus.size).toBe(0);
    });
  });
});