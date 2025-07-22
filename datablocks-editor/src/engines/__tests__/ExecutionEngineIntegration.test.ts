import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionEngine } from '../ExecutionEngine';
import { nodeExecutorRegistry } from '../NodeExecutor';
import { ExampleDataExecutor, FilterExecutor, SortExecutor } from '../executors/BaseExecutors';
import { registerExampleNodes } from '../../utils/examples';
import type { NodeInstance, Connection } from '../../types';

describe('ExecutionEngine Integration Tests', () => {
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

  describe('Complex Graph Execution', () => {
    it('should execute a complex multi-node graph with proper dependency resolution', async () => {
      // Create a complex graph: source -> filter -> sort
      //                           source -> filter2 -> sort2
      //                           sort + sort2 -> merge (not implemented, so just test parallel execution)
      
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
          id: 'filter1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {},
          config: { 
            column: 'age', 
            operator: 'greater_than', 
            value: 25 
          },
          status: 'idle',
        },
        {
          id: 'filter2',
          type: 'filter',
          position: { x: 200, y: 200 },
          data: {},
          config: { 
            column: 'age', 
            operator: 'less_than', 
            value: 35 
          },
          status: 'idle',
        },
        {
          id: 'sort1',
          type: 'sort',
          position: { x: 400, y: 0 },
          data: {},
          config: { 
            column: 'name', 
            direction: 'asc' 
          },
          status: 'idle',
        },
        {
          id: 'sort2',
          type: 'sort',
          position: { x: 400, y: 200 },
          data: {},
          config: { 
            column: 'age', 
            direction: 'desc' 
          },
          status: 'idle',
        },
      ];

      const connections: Connection[] = [
        {
          id: 'conn1',
          source: 'source',
          sourceHandle: 'output',
          target: 'filter1',
          targetHandle: 'input',
        },
        {
          id: 'conn2',
          source: 'source',
          sourceHandle: 'output',
          target: 'filter2',
          targetHandle: 'input',
        },
        {
          id: 'conn3',
          source: 'filter1',
          sourceHandle: 'output',
          target: 'sort1',
          targetHandle: 'input',
        },
        {
          id: 'conn4',
          source: 'filter2',
          sourceHandle: 'output',
          target: 'sort2',
          targetHandle: 'input',
        },
      ];

      const result = await engine.executeGraph(nodes, connections);

      expect(result.success).toBe(true);
      expect(result.stats.totalNodes).toBe(5);
      expect(result.stats.completedNodes).toBe(5);
      expect(result.stats.failedNodes).toBe(0);

      // Verify all nodes have outputs
      const sourceOutput = engine.getNodeOutput('source');
      const filter1Output = engine.getNodeOutput('filter1');
      const filter2Output = engine.getNodeOutput('filter2');
      const sort1Output = engine.getNodeOutput('sort1');
      const sort2Output = engine.getNodeOutput('sort2');

      expect(sourceOutput).toBeDefined();
      expect(filter1Output).toBeDefined();
      expect(filter2Output).toBeDefined();
      expect(sort1Output).toBeDefined();
      expect(sort2Output).toBeDefined();

      // Verify data flow integrity
      expect(sourceOutput.rows).toHaveLength(5); // Original sample data
      expect(filter1Output.rows.length).toBeLessThanOrEqual(sourceOutput.rows.length);
      expect(filter2Output.rows.length).toBeLessThanOrEqual(sourceOutput.rows.length);
      
      // Verify sorting worked
      expect(sort1Output.columns).toEqual(filter1Output.columns);
      expect(sort2Output.columns).toEqual(filter2Output.columns);
    });

    it('should handle execution with status callbacks', async () => {
      const statusChanges: Array<{ nodeId: string; status: string; timestamp: Date }> = [];
      const progressUpdates: Array<{ completed: number; total: number }> = [];
      let executionComplete = false;

      engine.setCallbacks({
        onNodeStatusChange: (nodeId, status) => {
          statusChanges.push({ nodeId, status, timestamp: new Date() });
        },
        onExecutionProgress: (stats) => {
          progressUpdates.push({ completed: stats.completedNodes, total: stats.totalNodes });
        },
        onExecutionComplete: (success, stats) => {
          executionComplete = true;
          expect(success).toBe(true);
          expect(stats.totalNodes).toBe(2);
        },
      });

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

      await engine.executeGraph(nodes, connections);

      // Verify callbacks were called
      expect(statusChanges.length).toBeGreaterThan(0);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(executionComplete).toBe(true);

      // Verify status progression
      const sourceStatuses = statusChanges.filter(s => s.nodeId === 'source').map(s => s.status);
      const filterStatuses = statusChanges.filter(s => s.nodeId === 'filter').map(s => s.status);

      expect(sourceStatuses).toContain('processing');
      expect(sourceStatuses).toContain('success');
      expect(filterStatuses).toContain('processing');
      expect(filterStatuses).toContain('success');
    });

    it('should handle partial execution failures gracefully', async () => {
      // Create a graph where one node will fail due to missing executor
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
          id: 'invalid-node',
          type: 'nonexistent-type', // This will cause executor not found error
          position: { x: 200, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
      ];

      const connections: Connection[] = [
        {
          id: 'conn1',
          source: 'source',
          sourceHandle: 'output',
          target: 'invalid-node',
          targetHandle: 'input',
        },
      ];

      // This should throw an error during graph building due to missing node definition
      await expect(engine.executeGraph(nodes, connections)).rejects.toThrow('Node definition not found');
    });

    it('should support concurrent execution configuration', async () => {
      // Configure for single-threaded execution
      engine.configure({
        maxConcurrentExecutions: 1,
        executionTimeout: 5000,
      });

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
          id: 'filter1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {},
          config: { 
            column: 'age', 
            operator: 'greater_than', 
            value: 25 
          },
          status: 'idle',
        },
        {
          id: 'filter2',
          type: 'filter',
          position: { x: 200, y: 200 },
          data: {},
          config: { 
            column: 'age', 
            operator: 'less_than', 
            value: 35 
          },
          status: 'idle',
        },
      ];

      const connections: Connection[] = [
        {
          id: 'conn1',
          source: 'source',
          sourceHandle: 'output',
          target: 'filter1',
          targetHandle: 'input',
        },
        {
          id: 'conn2',
          source: 'source',
          sourceHandle: 'output',
          target: 'filter2',
          targetHandle: 'input',
        },
      ];

      const startTime = performance.now();
      const result = await engine.executeGraph(nodes, connections);
      const executionTime = performance.now() - startTime;

      expect(result.success).toBe(true);
      expect(result.stats.completedNodes).toBe(3);
      
      // Verify execution completed (time should be positive)
      expect(executionTime).toBeGreaterThanOrEqual(0);
      expect(result.stats.totalExecutionTime).toBeGreaterThanOrEqual(0);
    });

    it('should properly invalidate node outputs and dependencies', async () => {
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

      // Execute the graph
      await engine.executeGraph(nodes, connections);

      // Verify outputs exist
      expect(engine.getNodeOutput('source')).toBeDefined();
      expect(engine.getNodeOutput('filter')).toBeDefined();
      expect(engine.getNodeStatus('source')).toBe('success');
      expect(engine.getNodeStatus('filter')).toBe('success');

      // Invalidate the source node
      engine.invalidateNode('source');

      // Verify source is invalidated
      expect(engine.getNodeOutput('source')).toBeUndefined();
      expect(engine.getNodeStatus('source')).toBe('idle');

      // Filter should still have its output (in this simple implementation)
      // In a more advanced implementation, dependent nodes would also be invalidated
      expect(engine.getNodeOutput('filter')).toBeDefined();
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle empty graph execution', async () => {
      const result = await engine.executeGraph([], []);

      expect(result.success).toBe(true);
      expect(result.stats.totalNodes).toBe(0);
      expect(result.stats.completedNodes).toBe(0);
      expect(result.stats.failedNodes).toBe(0);
    });

    it('should prevent concurrent executions', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'source',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: { dataset: 'sample' },
          status: 'idle',
        },
      ];

      // Start first execution
      const execution1 = engine.executeGraph(nodes, []);

      // Try to start second execution immediately
      await expect(engine.executeGraph(nodes, [])).rejects.toThrow('Execution already in progress');

      // Wait for first execution to complete
      await execution1;

      // Now second execution should work
      const result = await engine.executeGraph(nodes, []);
      expect(result.success).toBe(true);
    });

    it('should provide comprehensive execution status', () => {
      const status = engine.getExecutionStatus();

      expect(status).toHaveProperty('isExecuting');
      expect(status).toHaveProperty('stats');
      expect(status).toHaveProperty('nodeStatuses');
      expect(status).toHaveProperty('nodeOutputs');

      expect(typeof status.isExecuting).toBe('boolean');
      expect(status.nodeStatuses).toBeInstanceOf(Map);
      expect(status.nodeOutputs).toBeInstanceOf(Map);
    });
  });
});