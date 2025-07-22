import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionEngine } from '../../engines/ExecutionEngine';
import { DataProcessor } from '../../engines/DataProcessor';
import type { Dataset, NodeInstance } from '../../types';
import { generateLargeDataset, measurePerformance } from '../testUtils';

describe('Performance Tests', () => {
  let executionEngine: ExecutionEngine;
  let dataProcessor: DataProcessor;

  beforeEach(() => {
    executionEngine = new ExecutionEngine();
    dataProcessor = new DataProcessor();
  });

  describe('Large Dataset Processing', () => {
    it('should process 10k rows within acceptable time', async () => {
      const largeDataset = generateLargeDataset(10000);
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Large Dataset',
            config: { dataset: largeDataset },
          },
        },
        {
          id: 'filter-1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {
            label: 'Filter',
            config: {
              conditions: [
                { column: 'value', operator: '>', value: 500 },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
      ];

      const { result, duration } = await measurePerformance(() =>
        executionEngine.executeGraph(nodes, edges)
      );

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle 100k rows for simple operations', async () => {
      const veryLargeDataset = generateLargeDataset(100000);
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Very Large Dataset',
            config: { dataset: veryLargeDataset },
          },
        },
        {
          id: 'sort-1',
          type: 'sort',
          position: { x: 200, y: 0 },
          data: {
            label: 'Sort',
            config: {
              column: 'value',
              direction: 'asc',
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'sort-1' },
      ];

      const { result, duration } = await measurePerformance(() =>
        executionEngine.executeGraph(nodes, edges)
      );

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(100000);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain memory efficiency with large datasets', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const largeDataset = generateLargeDataset(50000);
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Memory Test Dataset',
            config: { dataset: largeDataset },
          },
        },
        {
          id: 'group-1',
          type: 'group',
          position: { x: 200, y: 0 },
          data: {
            label: 'Group',
            config: {
              groupColumns: ['category'],
              aggregations: [
                { column: 'value', operation: 'avg', alias: 'avg_value' },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'group-1' },
      ];

      await executionEngine.executeGraph(nodes, edges);
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 100MB for this test)
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
    });
  });

  describe('Complex Pipeline Performance', () => {
    it('should handle multi-stage pipelines efficiently', async () => {
      const dataset = generateLargeDataset(5000);
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Input',
            config: { dataset },
          },
        },
        {
          id: 'filter-1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {
            label: 'Filter 1',
            config: {
              conditions: [
                { column: 'value', operator: '>', value: 200 },
              ],
            },
          },
        },
        {
          id: 'sort-1',
          type: 'sort',
          position: { x: 400, y: 0 },
          data: {
            label: 'Sort',
            config: {
              column: 'value',
              direction: 'desc',
            },
          },
        },
        {
          id: 'group-1',
          type: 'group',
          position: { x: 600, y: 0 },
          data: {
            label: 'Group',
            config: {
              groupColumns: ['category'],
              aggregations: [
                { column: 'value', operation: 'sum', alias: 'total_value' },
                { column: 'id', operation: 'count', alias: 'count' },
              ],
            },
          },
        },
        {
          id: 'filter-2',
          type: 'filter',
          position: { x: 800, y: 0 },
          data: {
            label: 'Filter 2',
            config: {
              conditions: [
                { column: 'count', operator: '>', value: 10 },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
        { id: 'e2', source: 'filter-1', target: 'sort-1' },
        { id: 'e3', source: 'sort-1', target: 'group-1' },
        { id: 'e4', source: 'group-1', target: 'filter-2' },
      ];

      const { result, duration } = await measurePerformance(() =>
        executionEngine.executeGraph(nodes, edges)
      );

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(3000); // Complex pipeline should complete within 3 seconds
    });

    it('should handle concurrent pipeline executions', async () => {
      const dataset = generateLargeDataset(1000);
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Input',
            config: { dataset },
          },
        },
        {
          id: 'sort-1',
          type: 'sort',
          position: { x: 200, y: 0 },
          data: {
            label: 'Sort',
            config: {
              column: 'value',
              direction: 'asc',
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'sort-1' },
      ];

      // Execute multiple pipelines concurrently
      const concurrentExecutions = 5;
      const promises = Array.from({ length: concurrentExecutions }, () =>
        measurePerformance(() => executionEngine.executeGraph(nodes, edges))
      );

      const results = await Promise.all(promises);

      // All executions should complete successfully
      results.forEach(({ result, duration }) => {
        expect(result).toBeDefined();
        expect(result.rows).toHaveLength(1000);
        expect(duration).toBeLessThan(2000);
      });

      // Average execution time should be reasonable
      const avgDuration = results.reduce((sum, { duration }) => sum + duration, 0) / results.length;
      expect(avgDuration).toBeLessThan(1500);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory during repeated executions', async () => {
      const dataset = generateLargeDataset(1000);
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Input',
            config: { dataset },
          },
        },
        {
          id: 'filter-1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {
            label: 'Filter',
            config: {
              conditions: [
                { column: 'value', operator: '>', value: 500 },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
      ];

      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute pipeline multiple times
      for (let i = 0; i < 10; i++) {
        await executionEngine.executeGraph(nodes, edges);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be minimal after repeated executions
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // Less than 50MB
    });
  });

  describe('Scalability Tests', () => {
    it('should scale linearly with data size', async () => {
      const sizes = [1000, 2000, 4000];
      const durations: number[] = [];

      for (const size of sizes) {
        const dataset = generateLargeDataset(size);
        
        const nodes: NodeInstance[] = [
          {
            id: 'input-1',
            type: 'exampleData',
            position: { x: 0, y: 0 },
            data: {
              label: 'Input',
              config: { dataset },
            },
          },
          {
            id: 'sort-1',
            type: 'sort',
            position: { x: 200, y: 0 },
            data: {
              label: 'Sort',
              config: {
                column: 'value',
                direction: 'asc',
              },
            },
          },
        ];

        const edges = [
          { id: 'e1', source: 'input-1', target: 'sort-1' },
        ];

        const { duration } = await measurePerformance(() =>
          executionEngine.executeGraph(nodes, edges)
        );

        durations.push(duration);
      }

      // Performance should scale reasonably (not exponentially)
      const ratio1 = durations[1] / durations[0]; // 2x data
      const ratio2 = durations[2] / durations[1]; // 2x data again

      // Ratios should be reasonable (less than 3x for 2x data)
      expect(ratio1).toBeLessThan(3);
      expect(ratio2).toBeLessThan(3);
    });
  });
});