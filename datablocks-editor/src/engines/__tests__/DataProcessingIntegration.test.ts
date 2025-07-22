import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutionEngine } from '../ExecutionEngine';
import { DataPipeline } from '../DataPipeline';
import { DataProcessor } from '../DataProcessor';
import type { Dataset, NodeInstance } from '../../types';

describe('Data Processing Engine Integration', () => {
  let executionEngine: ExecutionEngine;
  let dataPipeline: DataPipeline;
  let dataProcessor: DataProcessor;

  const sampleDataset: Dataset = {
    columns: ['name', 'age', 'city', 'salary'],
    rows: [
      ['Alice', 25, 'New York', 50000],
      ['Bob', 30, 'London', 60000],
      ['Charlie', 35, 'Tokyo', 70000],
      ['Diana', 28, 'Paris', 55000],
      ['Eve', 32, 'Berlin', 65000],
    ],
  };

  beforeEach(() => {
    executionEngine = new ExecutionEngine();
    dataPipeline = new DataPipeline();
    dataProcessor = new DataProcessor();
  });

  describe('End-to-End Data Processing Pipeline', () => {
    it('should process data through multiple transformation nodes', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Sample Data',
            config: { dataset: sampleDataset },
          },
        },
        {
          id: 'filter-1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {
            label: 'Age Filter',
            config: {
              conditions: [
                { column: 'age', operator: '>', value: 28 },
              ],
            },
          },
        },
        {
          id: 'sort-1',
          type: 'sort',
          position: { x: 400, y: 0 },
          data: {
            label: 'Sort by Salary',
            config: {
              column: 'salary',
              direction: 'desc',
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
        { id: 'e2', source: 'filter-1', target: 'sort-1' },
      ];

      const result = await executionEngine.executeGraph(nodes, edges);

      expect(result).toBeDefined();
      expect(result.columns).toEqual(['name', 'age', 'city', 'salary']);
      expect(result.rows).toHaveLength(3); // Alice (25) and Diana (28) filtered out
      expect(result.rows[0][3]).toBe(70000); // Charlie should be first (highest salary)
      expect(result.rows[1][3]).toBe(65000); // Eve should be second
      expect(result.rows[2][3]).toBe(60000); // Bob should be third
    });

    it('should handle complex data transformations', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Sample Data',
            config: { dataset: sampleDataset },
          },
        },
        {
          id: 'group-1',
          type: 'group',
          position: { x: 200, y: 0 },
          data: {
            label: 'Group by City',
            config: {
              groupColumns: ['city'],
              aggregations: [
                { column: 'salary', operation: 'avg', alias: 'avg_salary' },
                { column: 'age', operation: 'count', alias: 'count' },
              ],
            },
          },
        },
        {
          id: 'filter-1',
          type: 'filter',
          position: { x: 400, y: 0 },
          data: {
            label: 'Filter High Salary Cities',
            config: {
              conditions: [
                { column: 'avg_salary', operator: '>', value: 55000 },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'group-1' },
        { id: 'e2', source: 'group-1', target: 'filter-1' },
      ];

      const result = await executionEngine.executeGraph(nodes, edges);

      expect(result).toBeDefined();
      expect(result.columns).toContain('city');
      expect(result.columns).toContain('avg_salary');
      expect(result.columns).toContain('count');
      expect(result.rows.length).toBeGreaterThan(0);
    });

    it('should handle JavaScript transformation nodes', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Sample Data',
            config: { dataset: sampleDataset },
          },
        },
        {
          id: 'js-1',
          type: 'javascript',
          position: { x: 200, y: 0 },
          data: {
            label: 'Calculate Bonus',
            config: {
              code: `
                return data.map(row => ({
                  ...row,
                  bonus: row.salary * 0.1
                }));
              `,
              timeout: 5000,
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'js-1' },
      ];

      const result = await executionEngine.executeGraph(nodes, edges);

      expect(result).toBeDefined();
      expect(result.columns).toContain('bonus');
      expect(result.rows[0]).toHaveProperty('bonus');
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle invalid node configurations gracefully', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Sample Data',
            config: { dataset: sampleDataset },
          },
        },
        {
          id: 'filter-1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {
            label: 'Invalid Filter',
            config: {
              conditions: [
                { column: 'nonexistent_column', operator: '>', value: 100 },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
      ];

      await expect(executionEngine.executeGraph(nodes, edges))
        .rejects.toThrow();
    });

    it('should handle circular dependencies', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'node-1',
          type: 'filter',
          position: { x: 0, y: 0 },
          data: {
            label: 'Filter 1',
            config: { conditions: [] },
          },
        },
        {
          id: 'node-2',
          type: 'sort',
          position: { x: 200, y: 0 },
          data: {
            label: 'Sort 1',
            config: { column: 'name', direction: 'asc' },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'node-1', target: 'node-2' },
        { id: 'e2', source: 'node-2', target: 'node-1' }, // Circular dependency
      ];

      await expect(executionEngine.executeGraph(nodes, edges))
        .rejects.toThrow(/circular/i);
    });

    it('should handle empty datasets', async () => {
      const emptyDataset: Dataset = {
        columns: ['name', 'age'],
        rows: [],
      };

      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Empty Data',
            config: { dataset: emptyDataset },
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
                { column: 'age', operator: '>', value: 18 },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
      ];

      const result = await executionEngine.executeGraph(nodes, edges);

      expect(result).toBeDefined();
      expect(result.columns).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(0);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large datasets efficiently', async () => {
      const largeDataset: Dataset = {
        columns: ['id', 'value', 'category'],
        rows: Array.from({ length: 10000 }, (_, i) => [
          i,
          Math.random() * 1000,
          `category_${i % 10}`,
        ]),
      };

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
            label: 'Value Filter',
            config: {
              conditions: [
                { column: 'value', operator: '>', value: 500 },
              ],
            },
          },
        },
        {
          id: 'group-1',
          type: 'group',
          position: { x: 400, y: 0 },
          data: {
            label: 'Group by Category',
            config: {
              groupColumns: ['category'],
              aggregations: [
                { column: 'value', operation: 'avg', alias: 'avg_value' },
                { column: 'id', operation: 'count', alias: 'count' },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
        { id: 'e2', source: 'filter-1', target: 'group-1' },
      ];

      const startTime = Date.now();
      const result = await executionEngine.executeGraph(nodes, edges);
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.rows.length).toBeLessThanOrEqual(10); // 10 categories
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should handle concurrent executions', async () => {
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Sample Data',
            config: { dataset: sampleDataset },
          },
        },
        {
          id: 'sort-1',
          type: 'sort',
          position: { x: 200, y: 0 },
          data: {
            label: 'Sort by Name',
            config: {
              column: 'name',
              direction: 'asc',
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'sort-1' },
      ];

      // Execute multiple pipelines concurrently
      const promises = Array.from({ length: 5 }, () =>
        executionEngine.executeGraph(nodes, edges)
      );

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.rows).toHaveLength(5);
        expect(result.rows[0][0]).toBe('Alice'); // First alphabetically
      });
    });
  });

  describe('Data Type Handling', () => {
    it('should preserve data types through transformations', async () => {
      const typedDataset: Dataset = {
        columns: ['name', 'age', 'active', 'score'],
        rows: [
          ['Alice', 25, true, 95.5],
          ['Bob', 30, false, 87.2],
          ['Charlie', 35, true, 92.8],
        ],
      };

      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Typed Data',
            config: { dataset: typedDataset },
          },
        },
        {
          id: 'filter-1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {
            label: 'Active Users',
            config: {
              conditions: [
                { column: 'active', operator: '=', value: true },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
      ];

      const result = await executionEngine.executeGraph(nodes, edges);

      expect(result).toBeDefined();
      expect(result.rows).toHaveLength(2); // Alice and Charlie
      expect(typeof result.rows[0][1]).toBe('number'); // age
      expect(typeof result.rows[0][2]).toBe('boolean'); // active
      expect(typeof result.rows[0][3]).toBe('number'); // score
    });
  });
});