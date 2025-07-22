import { describe, it, expect, beforeEach } from 'vitest';
import { SortExecutor } from '../executors/BaseExecutors';
import type { ExecutionContext, Dataset } from '../../types';

describe('SortExecutor', () => {
  let executor: SortExecutor;
  let sampleDataset: Dataset;

  beforeEach(() => {
    executor = new SortExecutor();
    sampleDataset = {
      columns: ['id', 'name', 'age', 'city', 'salary'],
      rows: [
        [3, 'Charlie', 35, 'Chicago', 7000],
        [1, 'Alice', 25, 'New York', 5000],
        [5, 'Eve', 32, 'Seattle', 6500],
        [2, 'Bob', 30, 'San Francisco', 6000],
        [4, 'Diana', 28, 'Boston', 5500],
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

  describe('execute - single column (legacy format)', () => {
    it('should sort by numeric column ascending', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          direction: 'asc',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(6);
      // Should be sorted by age ascending, with null values first
      expect(result.output.rows.map(row => row[2])).toEqual([null, 25, 28, 30, 32, 35]);
      expect(result.output.rows.map(row => row[1])).toEqual(['Frank', 'Alice', 'Diana', 'Bob', 'Eve', 'Charlie']);
    });

    it('should sort by numeric column descending', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          direction: 'desc',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(6);
      // Should be sorted by age descending, with null values last
      expect(result.output.rows.map(row => row[2])).toEqual([35, 32, 30, 28, 25, null]);
      expect(result.output.rows.map(row => row[1])).toEqual(['Charlie', 'Eve', 'Bob', 'Diana', 'Alice', 'Frank']);
    });

    it('should sort by string column ascending', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'name',
          direction: 'asc',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(6);
      // Should be sorted by name ascending (case-insensitive)
      expect(result.output.rows.map(row => row[1])).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']);
    });

    it('should sort by string column descending', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'name',
          direction: 'desc',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(6);
      // Should be sorted by name descending (case-insensitive)
      expect(result.output.rows.map(row => row[1])).toEqual(['Frank', 'Eve', 'Diana', 'Charlie', 'Bob', 'Alice']);
    });

    it('should default to ascending direction when not specified', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'id',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows.map(row => row[0])).toEqual([1, 2, 3, 4, 5, 6]);
    });
  });

  describe('execute - multiple columns', () => {
    it('should sort by multiple columns with different directions', async () => {
      // Add more data to test multi-column sorting
      const testDataset: Dataset = {
        ...sampleDataset,
        rows: [
          [1, 'Alice', 25, 'New York', 5000],
          [2, 'Bob', 25, 'San Francisco', 6000],
          [3, 'Charlie', 30, 'Chicago', 7000],
          [4, 'Diana', 30, 'Boston', 5500],
          [5, 'Eve', 25, 'Seattle', 6500],
        ],
      };

      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: testDataset },
        config: {
          sortConfigs: [
            { column: 'age', direction: 'asc' },
            { column: 'salary', direction: 'desc' },
          ],
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(5);
      
      // Should be sorted first by age (asc), then by salary (desc) within same age groups
      const sortedData = result.output.rows.map(row => ({ name: row[1], age: row[2], salary: row[4] }));
      
      expect(sortedData).toEqual([
        { name: 'Eve', age: 25, salary: 6500 },    // age 25, highest salary
        { name: 'Bob', age: 25, salary: 6000 },    // age 25, middle salary
        { name: 'Alice', age: 25, salary: 5000 },  // age 25, lowest salary
        { name: 'Charlie', age: 30, salary: 7000 }, // age 30, highest salary
        { name: 'Diana', age: 30, salary: 5500 },   // age 30, lowest salary
      ]);
    });

    it('should sort by three columns', async () => {
      const testDataset: Dataset = {
        ...sampleDataset,
        columns: ['id', 'name', 'age', 'city', 'salary', 'department'],
        rows: [
          [1, 'Alice', 25, 'New York', 5000, 'Engineering'],
          [2, 'Bob', 25, 'New York', 5000, 'Marketing'],
          [3, 'Charlie', 25, 'New York', 5000, 'Engineering'],
          [4, 'Diana', 30, 'Boston', 5500, 'Sales'],
        ],
      };

      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: testDataset },
        config: {
          sortConfigs: [
            { column: 'age', direction: 'asc' },
            { column: 'city', direction: 'asc' },
            { column: 'name', direction: 'asc' },
          ],
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(4);
      
      // Should be sorted by age, then city, then name
      const sortedData = result.output.rows.map(row => ({ name: row[1], age: row[2], city: row[3] }));
      
      expect(sortedData).toEqual([
        { name: 'Alice', age: 25, city: 'New York' },
        { name: 'Bob', age: 25, city: 'New York' },
        { name: 'Charlie', age: 25, city: 'New York' },
        { name: 'Diana', age: 30, city: 'Boston' },
      ]);
    });

    it('should handle empty sortConfigs array', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          sortConfigs: [],
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('No valid sort configurations provided');
    });

    it('should filter out invalid sort configs', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          sortConfigs: [
            { column: '', direction: 'asc' }, // Invalid - no column
            { column: 'name', direction: 'asc' }, // Valid
            { direction: 'desc' }, // Invalid - no column
          ],
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      // Should only use the valid config (name, asc)
      expect(result.output.rows.map(row => row[1])).toEqual(['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank']);
    });
  });

  describe('validate', () => {
    it('should validate successfully with single column config', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          direction: 'asc',
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

    it('should validate successfully with multiple column configs', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          sortConfigs: [
            { column: 'age', direction: 'asc' },
            { column: 'name', direction: 'desc' },
          ],
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
          direction: 'asc',
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

    it('should return error for missing column in single config', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          direction: 'asc',
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

    it('should return error for invalid direction in single config', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'age',
          direction: 'invalid',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message === 'Direction must be "asc" or "desc"')).toBe(true);
    });

    it('should return error for empty sortConfigs array', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          sortConfigs: [],
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message === 'At least one sort configuration is required')).toBe(true);
    });

    it('should return errors for invalid sort configs', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          sortConfigs: [
            { direction: 'asc' }, // Missing column
            { column: 'age', direction: 'invalid' }, // Invalid direction
          ],
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors.some(e => e.message.includes('Column selection is required'))).toBe(true);
      expect(result.errors.some(e => e.message.includes('Direction must be "asc" or "desc"'))).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw error for missing input dataset', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          column: 'age',
          direction: 'asc',
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

    it('should throw error for non-existent column', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          column: 'non_existent_column',
          direction: 'asc',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Column 'non_existent_column' not found in dataset");
    });

    it('should throw error for missing column in legacy format', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          direction: 'asc',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('No sort column specified');
    });

    it('should throw error for non-existent column in multi-column format', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: sampleDataset },
        config: {
          sortConfigs: [
            { column: 'age', direction: 'asc' },
            { column: 'non_existent', direction: 'desc' },
          ],
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe("Column 'non_existent' not found in dataset");
    });
  });

  describe('compareValues method', () => {
    it('should handle null values correctly', async () => {
      const testDataset: Dataset = {
        ...sampleDataset,
        rows: [
          [1, 'Alice', 25, 'New York', 5000],
          [2, 'Bob', null, 'San Francisco', 6000],
          [3, 'Charlie', 30, 'Chicago', null],
          [4, 'Diana', null, 'Boston', null],
        ],
      };

      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: testDataset },
        config: {
          column: 'age',
          direction: 'asc',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      // Null values should come first in ascending order
      expect(result.output.rows.map(row => row[2])).toEqual([null, null, 25, 30]);
    });

    it('should handle mixed data types correctly', async () => {
      const testDataset: Dataset = {
        ...sampleDataset,
        rows: [
          [1, 'Alice', 25, 'New York', 5000],
          [2, 'bob', 30, 'san francisco', 6000], // lowercase
          [3, 'CHARLIE', 35, 'CHICAGO', 7000], // uppercase
        ],
      };

      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: { data: testDataset },
        config: {
          column: 'name',
          direction: 'asc',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      // Should be case-insensitive sorting
      expect(result.output.rows.map(row => row[1])).toEqual(['Alice', 'bob', 'CHARLIE']);
    });
  });
});