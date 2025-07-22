import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionEngine } from '../ExecutionEngine';
import { nodeExecutorRegistry } from '../NodeExecutor';
import { ExampleDataExecutor, FilterExecutor, SortExecutor } from '../executors/BaseExecutors';
import { registerExampleNodes } from '../../utils/examples';
import type { NodeInstance, Connection } from '../../types';

describe('ExecutionEngine', () => {
  let engine: ExecutionEngine;

  beforeEach(() => {
    engine = new ExecutionEngine();
    
    // Register example nodes for testing
    registerExampleNodes();
    
    // Register test executors
    nodeExecutorRegistry.clear();
    nodeExecutorRegistry.register('example-data', new ExampleDataExecutor());
    nodeExecutorRegistry.register('filter', new FilterExecutor());
    nodeExecutorRegistry.register('sort', new SortExecutor());
  });

  describe('executeGraph', () => {
    it('should execute a simple graph with one node', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'node1',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: { dataset: 'sample' },
          status: 'idle',
        },
      ];

      const connections: Connection[] = [];

      const result = await engine.executeGraph(nodes, connections);

      expect(result.success).toBe(true);
      expect(result.stats.totalNodes).toBe(1);
      expect(result.stats.completedNodes).toBe(1);
      expect(result.stats.failedNodes).toBe(0);

      const output = engine.getNodeOutput('node1');
      expect(output).toBeDefined();
      expect(output.columns).toEqual(['id', 'name', 'age', 'city']);
      expect(output.rows).toHaveLength(5);
    });

    it('should execute a graph with dependencies', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'source',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: { dataset: 'sample' },
          status: 'idle',
        },
        {
          id: 'filter',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {},
          config: { 
            column: 'age', 
            operator: 'greater_than', 
            value: 30 
          },
          status: 'idle',
        },
      ];

      const connections: Connection[] = [
        {
          id: 'conn1',
          source: 'source',
          sourceHandle: 'output',
          target: 'filter',
          targetHandle: 'input',
        },
      ];

      const result = await engine.executeGraph(nodes, connections);

      expect(result.success).toBe(true);
      expect(result.stats.completedNodes).toBe(2);

      const sourceOutput = engine.getNodeOutput('source');
      const filterOutput = engine.getNodeOutput('filter');

      expect(sourceOutput.rows).toHaveLength(5);
      expect(filterOutput.rows.length).toBeLessThan(sourceOutput.rows.length);
    });

    it('should handle execution errors gracefully', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'invalid',
          type: 'nonexistent-type',
          position: { x: 0, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
      ];

      const connections: Connection[] = [];

      await expect(engine.executeGraph(nodes, connections)).rejects.toThrow();
    });

    it('should detect circular dependencies', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'node1',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: { dataset: 'sample' },
          status: 'idle',
        },
        {
          id: 'node2',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {},
          config: { column: 'age', operator: 'greater_than', value: 30 },
          status: 'idle',
        },
      ];

      const connections: Connection[] = [
        {
          id: 'conn1',
          source: 'node1',
          sourceHandle: 'output',
          target: 'node2',
          targetHandle: 'input',
        },
        {
          id: 'conn2',
          source: 'node2',
          sourceHandle: 'output',
          target: 'node1',
          targetHandle: 'input',
        },
      ];

      await expect(engine.executeGraph(nodes, connections)).rejects.toThrow('Circular dependencies');
    });
  });

  describe('executeNode', () => {
    it('should execute a single node', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'test-node',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: { dataset: 'sample' },
          status: 'idle',
        },
      ];

      const result = await engine.executeNode('test-node', nodes, []);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output.columns).toEqual(['id', 'name', 'age', 'city']);
    });

    it('should throw error for non-existent node', async () => {
      await expect(engine.executeNode('nonexistent', [], [])).rejects.toThrow('Node nonexistent not found');
    });
  });

  describe('status tracking', () => {
    it('should track node statuses during execution', async () => {
      const statusChanges: Array<{ nodeId: string; status: string }> = [];

      engine.setCallbacks({
        onNodeStatusChange: (nodeId, status) => {
          statusChanges.push({ nodeId, status });
        },
      });

      const nodes: NodeInstance[] = [
        {
          id: 'node1',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: { dataset: 'sample' },
          status: 'idle',
        },
      ];

      await engine.executeGraph(nodes, []);

      expect(statusChanges).toContainEqual({ nodeId: 'node1', status: 'processing' });
      expect(statusChanges).toContainEqual({ nodeId: 'node1', status: 'success' });
    });
  });

  describe('configuration', () => {
    it('should allow configuration of execution settings', () => {
      engine.configure({
        maxConcurrentExecutions: 2,
        executionTimeout: 5000,
      });

      // Configuration is applied internally, we can't directly test it
      // but we can verify it doesn't throw errors
      expect(() => engine.configure({ maxConcurrentExecutions: 0 })).not.toThrow();
    });
  });

  describe('abort functionality', () => {
    it('should allow aborting execution', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'node1',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: { dataset: 'sample' },
          status: 'idle',
        },
      ];

      // Start execution and immediately abort
      const executionPromise = engine.executeGraph(nodes, []);
      engine.abort();

      // The execution might complete before abort takes effect,
      // so we don't assert on the result, just that it doesn't hang
      try {
        await executionPromise;
      } catch (error) {
        // Abort might cause an error, which is expected
      }
    });
  });

  describe('getExecutionStatus', () => {
    it('should return current execution status', () => {
      const status = engine.getExecutionStatus();

      expect(status).toHaveProperty('isExecuting');
      expect(status).toHaveProperty('stats');
      expect(status).toHaveProperty('nodeStatuses');
      expect(status).toHaveProperty('nodeOutputs');
      expect(status.isExecuting).toBe(false);
    });
  });

  describe('invalidateNode', () => {
    it('should clear node output and reset status', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'node1',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: { dataset: 'sample' },
          status: 'idle',
        },
      ];

      await engine.executeGraph(nodes, []);

      expect(engine.getNodeOutput('node1')).toBeDefined();
      expect(engine.getNodeStatus('node1')).toBe('success');

      engine.invalidateNode('node1');

      expect(engine.getNodeOutput('node1')).toBeUndefined();
      expect(engine.getNodeStatus('node1')).toBe('idle');
    });
  });
});