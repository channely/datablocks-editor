import { describe, it, expect, beforeEach } from 'vitest';
import { FilterExecutor } from '../executors/BaseExecutors';
import type { ExecutionContext, Dataset } from '../../types';

describe('FilterExecutor', () => {
  let executor: FilterExecutor;
  let sampleDataset: Dataset;

  beforeEach(() => {
    executor = new FilterExecutor();
    sampleDataset = {
      columns: ['id', 'name', 'age', 'city', 'salary'],
      rows: [
        [1, 'Alice', 25, 'New York', 5000],
        [2, 'Bob', 30, 'San Francisco', 6000],
        [3, 'Charlie', 35, 'Chicago', 7000],
        [4, 'Diana', 28, 'Boston', 5500],
        [5, 'Eve', 32, 'Seattle', 6500],
        [6, 'Frank', null, 'Miami', null],
      ],
      metadata: {
        rowCount: 6,
        columnCount: 5,
        types: { id: 'number', name: 'string', age: 'number', city: 'string', salary: 'number' },
        nullable: { id: false, name: false, age: true, city: false, salary: true },
        unique: { id: true, name: true, age: true, city: true, salary: true },
        created: new Date(),
        modified: new Date(),
      },
    };
  });

  describe('execute - single condition (legacy format)', () => {
    it('should filter with equals operator', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'city',
          operator: 'equals',
          value: 'New York',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(1);
      expect(result.output.rows[0]).toEqual([1, 'Alice', 25, 'New York', 5000]);
    });

    it('should filter with greater_than operator', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          operator: 'greater_than',
          value: 30,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(2);
      expect(result.output.rows.map(row => row[2])).toEqual([35, 32]);
    });

    it('should filter with contains operator', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'name',
          operator: 'contains',
          value: 'a',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(4); // Alice, Charlie, Diana, Frank (Frank contains 'a' in 'Frank')
      expect(result.output.rows.map(row => row[1])).toEqual(['Alice', 'Charlie', 'Diana', 'Frank']);
    });

    it('should filter with is_null operator', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          operator: 'is_null',
          value: null,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(1);
      expect(result.output.rows[0][1]).toBe('Frank');
    });

    it('should filter with is_not_null operator', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          operator: 'is_not_null',
          value: null,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(5);
      expect(result.output.rows.every(row => row[2] != null)).toBe(true);
    });
  });

  describe('execute - multiple conditions', () => {
    it('should filter with multiple AND conditions', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          conditions: [
            { column: 'age', operator: 'greater_than', value: 25, type: 'number' },
            { column: 'salary', operator: 'less_than', value: 6500, type: 'number' },
          ],
          logicalOperator: 'and',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(2); // Bob (30, 6000) and Diana (28, 5500)
      expect(result.output.rows.map(row => row[1])).toEqual(['Bob', 'Diana']);
    });

    it('should filter with multiple OR conditions', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          conditions: [
            { column: 'city', operator: 'equals', value: 'New York', type: 'string' },
            { column: 'city', operator: 'equals', value: 'Seattle', type: 'string' },
          ],
          logicalOperator: 'or',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(2); // Alice and Eve
      expect(result.output.rows.map(row => row[1])).toEqual(['Alice', 'Eve']);
    });

    it('should filter with complex mixed conditions', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          conditions: [
            { column: 'age', operator: 'greater_than', value: 30, type: 'number' },
            { column: 'name', operator: 'contains', value: 'e', type: 'string' },
          ],
          logicalOperator: 'and',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(2); // Charlie and Eve
      expect(result.output.rows.map(row => row[1])).toEqual(['Charlie', 'Eve']);
    });

    it('should handle empty conditions array', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          conditions: [],
          logicalOperator: 'and',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(6); // All rows should pass
    });
  });

  describe('execute - advanced operators', () => {
    it('should filter with in operator (string)', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'city',
          operator: 'in',
          value: 'New York,Seattle,Miami',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(3); // Alice, Eve, Frank
      expect(result.output.rows.map(row => row[1])).toEqual(['Alice', 'Eve', 'Frank']);
    });

    it('should filter with not_in operator', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'city',
          operator: 'not_in',
          value: 'New York,Seattle',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(4); // Bob, Charlie, Diana, Frank
      expect(result.output.rows.map(row => row[3])).toEqual(['San Francisco', 'Chicago', 'Boston', 'Miami']);
    });

    it('should filter with starts_with operator', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'name',
          operator: 'starts_with',
          value: 'A',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(1); // Alice
      expect(result.output.rows[0][1]).toBe('Alice');
    });

    it('should filter with ends_with operator', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'name',
          operator: 'ends_with',
          value: 'e',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(3); // Alice, Charlie, Eve
      expect(result.output.rows.map(row => row[1])).toEqual(['Alice', 'Charlie', 'Eve']);
    });
  });

  describe('validate', () => {
    it('should validate successfully with single condition', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          operator: 'greater_than',
          value: 25,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate successfully with multiple conditions', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          conditions: [
            { column: 'age', operator: 'greater_than', value: 25, type: 'number' },
            { column: 'city', operator: 'equals', value: 'New York', type: 'string' },
          ],
          logicalOperator: 'and',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for missing input dataset', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          column: 'age',
          operator: 'greater_than',
          value: 25,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Input dataset is required');
    });

    it('should return error for missing column in single condition', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          operator: 'greater_than',
          value: 25,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message === 'Column selection is required')).toBe(true);
    });

    it('should return error for missing operator in single condition', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          value: 25,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message === 'Filter operator is required')).toBe(true);
    });

    it('should return error for missing value when required', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          operator: 'greater_than',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message === 'Filter value is required')).toBe(true);
    });

    it('should not require value for is_null operator', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          operator: 'is_null',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return error for empty conditions array', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          conditions: [],
          logicalOperator: 'and',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message === 'At least one filter condition is required')).toBe(true);
    });

    it('should return errors for invalid conditions', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          conditions: [
            { operator: 'greater_than', value: 25, type: 'number' }, // missing column
            { column: 'age', value: 25, type: 'number' }, // missing operator
            { column: 'age', operator: 'greater_than', type: 'number' }, // missing value
          ],
          logicalOperator: 'and',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors.some(e => e.message.includes('Column selection is required'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('Filter operator is required'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('Filter value is required'))).toBe(true);
    });

    it('should return error for invalid logical operator', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          conditions: [
            { column: 'age', operator: 'greater_than', value: 25, type: 'number' },
            { column: 'city', operator: 'equals', value: 'New York', type: 'string' },
          ],
          logicalOperator: 'invalid',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message === 'Logical operator must be "and" or "or"')).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error for missing input dataset', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          column: 'age',
          operator: 'greater_than',
          value: 25,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('No input dataset provided');
    });

    it('should handle non-existent column gracefully', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'non_existent_column',
          operator: 'equals',
          value: 'test',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(6); // All rows should pass when column doesn't exist
    });
  });
});