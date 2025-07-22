import { describe, it, expect, vi } from 'vitest';
import { ExecutionEngine } from '../../engines/ExecutionEngine';
import { DataProcessor } from '../../engines/DataProcessor';
import { ErrorHandler } from '../../services/errorHandler';
import type { Dataset, NodeInstance } from '../../types';
import { createMockDataset, createMockNode } from '../testUtils';

describe('Quality Assurance Tests', () => {
  describe('Data Integrity', () => {
    it('should preserve data types through transformations', async () => {
      const typedDataset: Dataset = {
        columns: ['name', 'age', 'active', 'score', 'created'],
        rows: [
          ['Alice', 25, true, 95.5, new Date('2023-01-01')],
          ['Bob', 30, false, 87.2, new Date('2023-01-02')],
          ['Charlie', 35, true, 92.8, new Date('2023-01-03')],
        ],
      };

      const executionEngine = new ExecutionEngine();
      
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
            label: 'Filter Active',
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

      expect(result.rows).toHaveLength(2); // Alice and Charlie
      
      // Verify data types are preserved
      result.rows.forEach(row => {
        expect(typeof row[0]).toBe('string'); // name
        expect(typeof row[1]).toBe('number'); // age
        expect(typeof row[2]).toBe('boolean'); // active
        expect(typeof row[3]).toBe('number'); // score
        expect(row[4]).toBeInstanceOf(Date); // created
      });
    });

    it('should handle null and undefined values correctly', async () => {
      const datasetWithNulls: Dataset = {
        columns: ['name', 'age', 'city'],
        rows: [
          ['Alice', 25, 'New York'],
          ['Bob', null, 'London'],
          ['Charlie', 35, null],
          [null, 30, 'Tokyo'],
        ],
      };

      const executionEngine = new ExecutionEngine();
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Data with Nulls',
            config: { dataset: datasetWithNulls },
          },
        },
        {
          id: 'filter-1',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {
            label: 'Filter Non-null Age',
            config: {
              conditions: [
                { column: 'age', operator: '!=', value: null },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
      ];

      const result = await executionEngine.executeGraph(nodes, edges);

      expect(result.rows).toHaveLength(3); // Exclude Bob (null age)
      expect(result.rows.some(row => row[1] === null)).toBe(false);
    });

    it('should maintain referential integrity in complex transformations', async () => {
      const dataset = createMockDataset({
        columns: ['id', 'name', 'department_id', 'salary'],
        rows: [
          [1, 'Alice', 101, 50000],
          [2, 'Bob', 102, 60000],
          [3, 'Charlie', 101, 70000],
          [4, 'Diana', 103, 55000],
        ],
      });

      const executionEngine = new ExecutionEngine();
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Employee Data',
            config: { dataset },
          },
        },
        {
          id: 'group-1',
          type: 'group',
          position: { x: 200, y: 0 },
          data: {
            label: 'Group by Department',
            config: {
              groupColumns: ['department_id'],
              aggregations: [
                { column: 'salary', operation: 'avg', alias: 'avg_salary' },
                { column: 'id', operation: 'count', alias: 'employee_count' },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'group-1' },
      ];

      const result = await executionEngine.executeGraph(nodes, edges);

      // Verify grouping maintains referential integrity
      expect(result.rows).toHaveLength(3); // 3 departments
      
      const dept101 = result.rows.find(row => row[0] === 101);
      expect(dept101).toBeDefined();
      expect(dept101![2]).toBe(2); // 2 employees in dept 101
      expect(dept101![1]).toBe(60000); // Average salary (50000 + 70000) / 2
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should provide meaningful error messages for invalid configurations', async () => {
      const executionEngine = new ExecutionEngine();
      const dataset = createMockDataset();

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
        .rejects.toThrow(/column.*not found/i);
    });

    it('should handle network errors gracefully in HTTP nodes', async () => {
      // Mock fetch to simulate network error
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const executionEngine = new ExecutionEngine();

      const nodes: NodeInstance[] = [
        {
          id: 'http-1',
          type: 'httpRequest',
          position: { x: 0, y: 0 },
          data: {
            label: 'HTTP Request',
            config: {
              url: 'https://api.example.com/data',
              method: 'GET',
            },
          },
        },
      ];

      await expect(executionEngine.executeGraph(nodes, []))
        .rejects.toThrow(/network error/i);
    });

    it('should recover from JavaScript execution errors', async () => {
      const executionEngine = new ExecutionEngine();
      const dataset = createMockDataset();

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
          id: 'js-1',
          type: 'javascript',
          position: { x: 200, y: 0 },
          data: {
            label: 'Invalid JavaScript',
            config: {
              code: 'throw new Error("Intentional error");',
              timeout: 5000,
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'js-1' },
      ];

      await expect(executionEngine.executeGraph(nodes, edges))
        .rejects.toThrow(/intentional error/i);
    });

    it('should handle timeout scenarios', async () => {
      const executionEngine = new ExecutionEngine();
      const dataset = createMockDataset();

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
          id: 'js-1',
          type: 'javascript',
          position: { x: 200, y: 0 },
          data: {
            label: 'Timeout JavaScript',
            config: {
              code: 'while(true) { /* infinite loop */ }',
              timeout: 100, // Very short timeout
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'js-1' },
      ];

      await expect(executionEngine.executeGraph(nodes, edges))
        .rejects.toThrow(/timeout/i);
    }, 10000);
  });

  describe('Security and Validation', () => {
    it('should sanitize user input in JavaScript nodes', async () => {
      const executionEngine = new ExecutionEngine();
      const dataset = createMockDataset();

      const maliciousCode = `
        // Attempt to access global objects
        global.process.exit(1);
        return data;
      `;

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
          id: 'js-1',
          type: 'javascript',
          position: { x: 200, y: 0 },
          data: {
            label: 'Malicious JavaScript',
            config: {
              code: maliciousCode,
              timeout: 5000,
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'js-1' },
      ];

      // Should either execute safely or throw a security error
      await expect(executionEngine.executeGraph(nodes, edges))
        .rejects.toThrow();
    });

    it('should validate node configurations before execution', async () => {
      const executionEngine = new ExecutionEngine();

      const invalidNode: NodeInstance = {
        id: 'invalid-1',
        type: 'filter',
        position: { x: 0, y: 0 },
        data: {
          label: 'Invalid Filter',
          config: {
            conditions: [], // Empty conditions should be invalid
          },
        },
      };

      await expect(executionEngine.executeGraph([invalidNode], []))
        .rejects.toThrow(/invalid.*configuration/i);
    });

    it('should prevent SQL injection in filter conditions', async () => {
      const executionEngine = new ExecutionEngine();
      const dataset = createMockDataset();

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
            label: 'SQL Injection Attempt',
            config: {
              conditions: [
                { 
                  column: 'name', 
                  operator: '=', 
                  value: "'; DROP TABLE users; --" 
                },
              ],
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'filter-1' },
      ];

      // Should handle the malicious input safely
      const result = await executionEngine.executeGraph(nodes, edges);
      expect(result.rows).toHaveLength(0); // No matches expected
    });
  });

  describe('Accessibility and Usability', () => {
    it('should provide clear progress indicators for long operations', async () => {
      const executionEngine = new ExecutionEngine();
      const largeDataset = {
        columns: ['id', 'value'],
        rows: Array.from({ length: 50000 }, (_, i) => [i, Math.random()]),
      };

      const progressCallback = vi.fn();
      
      const nodes: NodeInstance[] = [
        {
          id: 'input-1',
          type: 'exampleData',
          position: { x: 0, y: 0 },
          data: {
            label: 'Large Input',
            config: { dataset: largeDataset },
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

      await executionEngine.executeGraph(nodes, edges, { 
        onProgress: progressCallback 
      });

      // Progress callback should have been called
      expect(progressCallback).toHaveBeenCalled();
    });

    it('should provide helpful error messages for common mistakes', async () => {
      const executionEngine = new ExecutionEngine();
      const dataset = createMockDataset();

      // Common mistake: trying to sort by non-existent column
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
            label: 'Sort by Wrong Column',
            config: {
              column: 'salary', // This column doesn't exist in mock dataset
              direction: 'asc',
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'sort-1' },
      ];

      try {
        await executionEngine.executeGraph(nodes, edges);
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error.message).toMatch(/column.*salary.*not found/i);
        expect(error.message).toMatch(/available columns/i);
      }
    });
  });

  describe('Consistency and Reliability', () => {
    it('should produce consistent results across multiple executions', async () => {
      const executionEngine = new ExecutionEngine();
      const dataset = createMockDataset();

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
              column: 'name',
              direction: 'asc',
            },
          },
        },
      ];

      const edges = [
        { id: 'e1', source: 'input-1', target: 'sort-1' },
      ];

      // Execute multiple times
      const results = await Promise.all([
        executionEngine.executeGraph(nodes, edges),
        executionEngine.executeGraph(nodes, edges),
        executionEngine.executeGraph(nodes, edges),
      ]);

      // All results should be identical
      const firstResult = JSON.stringify(results[0]);
      results.forEach(result => {
        expect(JSON.stringify(result)).toBe(firstResult);
      });
    });

    it('should handle edge cases gracefully', async () => {
      const executionEngine = new ExecutionEngine();

      // Edge case: empty dataset
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
            label: 'Empty Input',
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

      expect(result.columns).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(0);
    });
  });
});