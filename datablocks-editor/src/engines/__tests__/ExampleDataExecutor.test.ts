import { describe, it, expect, beforeEach } from 'vitest';
import { ExampleDataExecutor } from '../executors/BaseExecutors';
import type { ExecutionContext } from '../../types';

describe('ExampleDataExecutor', () => {
  let executor: ExampleDataExecutor;

  beforeEach(() => {
    executor = new ExampleDataExecutor();
  });

  describe('execute', () => {
    it('should generate sample dataset by default', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {},
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['id', 'name', 'age', 'city']);
      expect(result.output.rows).toHaveLength(5);
      expect(result.output.rows[0]).toEqual([1, 'Alice', 25, 'New York']);
      expect(result.output.metadata.rowCount).toBe(5);
      expect(result.output.metadata.columnCount).toBe(4);
    });

    it('should generate sales dataset when specified', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'sales',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['date', 'product', 'quantity', 'revenue']);
      expect(result.output.rows).toHaveLength(7);
      expect(result.output.rows[0]).toEqual(['2024-01-01', 'Widget A', 10, 100]);
      expect(result.output.metadata.rowCount).toBe(7);
      expect(result.output.metadata.columnCount).toBe(4);
    });

    it('should generate employees dataset when specified', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'employees',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['id', 'name', 'department', 'salary']);
      expect(result.output.rows).toHaveLength(6);
      expect(result.output.rows[0]).toEqual([1, '张三', '技术部', 8000]);
      expect(result.output.metadata.rowCount).toBe(6);
      expect(result.output.metadata.columnCount).toBe(4);
    });

    it('should generate products dataset when specified', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'products',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['id', 'name', 'category', 'price', 'stock']);
      expect(result.output.rows).toHaveLength(6);
      expect(result.output.rows[0]).toEqual([1, '笔记本电脑', '电子产品', 5999, 50]);
      expect(result.output.metadata.rowCount).toBe(6);
      expect(result.output.metadata.columnCount).toBe(5);
    });

    it('should fallback to sample dataset for unknown dataset name', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'unknown',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['id', 'name', 'age', 'city']);
      expect(result.output.rows).toHaveLength(5);
    });

    it('should infer correct data types', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'sample',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.metadata.types.id).toBe('number');
      expect(result.output.metadata.types.name).toBe('string');
      expect(result.output.metadata.types.age).toBe('number');
      expect(result.output.metadata.types.city).toBe('string');
    });

    it('should calculate nullable columns correctly', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'sample',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      // All columns in sample data should be non-nullable
      expect(result.output.metadata.nullable.id).toBe(false);
      expect(result.output.metadata.nullable.name).toBe(false);
      expect(result.output.metadata.nullable.age).toBe(false);
      expect(result.output.metadata.nullable.city).toBe(false);
    });

    it('should calculate unique columns correctly', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'sample',
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      // ID should be unique, others may not be
      expect(result.output.metadata.unique.id).toBe(true);
      expect(result.output.metadata.unique.name).toBe(true);
      expect(result.output.metadata.unique.age).toBe(true);
      expect(result.output.metadata.unique.city).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate successfully with valid dataset selection', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'sales',
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

    it('should return error for missing dataset selection', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {},
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('dataset');
      expect(result.errors[0].message).toBe('Dataset selection is required');
    });

    it('should validate successfully even with unknown dataset name', () => {
      // The executor should handle unknown dataset names gracefully by falling back to default
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataset: 'unknown',
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
  });

  describe('dataset content validation', () => {
    it('should have consistent data structure for all datasets', async () => {
      const datasets = ['sample', 'sales', 'employees', 'products'];

      for (const datasetName of datasets) {
        const context: ExecutionContext = {
          nodeId: 'test-node',
          inputs: {},
          config: { dataset: datasetName },
          metadata: {
            executionId: 'test-exec',
            startTime: new Date(),
          },
        };

        const result = await executor.execute(context);

        expect(result.success).toBe(true);
        expect(result.output.columns).toBeDefined();
        expect(result.output.rows).toBeDefined();
        expect(result.output.metadata).toBeDefined();
        expect(result.output.metadata.rowCount).toBe(result.output.rows.length);
        expect(result.output.metadata.columnCount).toBe(result.output.columns.length);
        expect(result.output.metadata.types).toBeDefined();
        expect(result.output.metadata.nullable).toBeDefined();
        expect(result.output.metadata.unique).toBeDefined();
        expect(result.output.metadata.created).toBeInstanceOf(Date);
        expect(result.output.metadata.modified).toBeInstanceOf(Date);

        // Ensure all rows have the same number of columns
        result.output.rows.forEach((row, index) => {
          expect(row).toHaveLength(result.output.columns.length);
        });
      }
    });

    it('should have non-empty datasets', async () => {
      const datasets = ['sample', 'sales', 'employees', 'products'];

      for (const datasetName of datasets) {
        const context: ExecutionContext = {
          nodeId: 'test-node',
          inputs: {},
          config: { dataset: datasetName },
          metadata: {
            executionId: 'test-exec',
            startTime: new Date(),
          },
        };

        const result = await executor.execute(context);

        expect(result.success).toBe(true);
        expect(result.output.columns.length).toBeGreaterThan(0);
        expect(result.output.rows.length).toBeGreaterThan(0);
        expect(result.output.metadata.rowCount).toBeGreaterThan(0);
        expect(result.output.metadata.columnCount).toBeGreaterThan(0);
      }
    });
  });
});