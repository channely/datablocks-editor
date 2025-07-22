import { describe, it, expect, beforeEach } from 'vitest';
import { NodeExecutor, NodeExecutorRegistry } from '../NodeExecutor';
import { ExampleDataExecutor, FilterExecutor, SortExecutor } from '../executors/BaseExecutors';
import type { ExecutionContext, ExecutionResult, ValidationResult } from '../../types';
import { ErrorType } from '../../types';

// Test executor for testing base functionality
class TestExecutor extends NodeExecutor {
  constructor() {
    super('test-node');
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.safeExecute(context, async () => {
      if (context.config.shouldFail) {
        throw new Error('Test error');
      }
      return { message: 'Test output', input: context.inputs };
    });
  }

  validate(context: ExecutionContext): ValidationResult {
    const errors = [];
    
    if (context.config.required && !context.config.value) {
      errors.push({
        field: 'value',
        message: 'Value is required',
        code: 'REQUIRED_FIELD',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

describe('NodeExecutor', () => {
  let executor: TestExecutor;

  beforeEach(() => {
    executor = new TestExecutor();
  });

  describe('execute', () => {
    it('should execute successfully with valid inputs', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node-1',
        inputs: { data: 'test input' },
        config: {},
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output).toEqual({
        message: 'Test output',
        input: { data: 'test input' },
      });
      expect(result.error).toBeUndefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle execution errors gracefully', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node-1',
        inputs: {},
        config: { shouldFail: true },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.output).toBeUndefined();
      expect(result.error).toBeDefined();
      expect(result.error?.type).toBe(ErrorType.EXECUTION_ERROR);
      expect(result.error?.message).toBe('Test error');
      expect(result.error?.nodeId).toBe('test-node-1');
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should validate successfully with valid config', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node-1',
        inputs: {},
        config: { required: true, value: 'test' },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should return validation errors for invalid config', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node-1',
        inputs: {},
        config: { required: true }, // missing value
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        field: 'value',
        message: 'Value is required',
        code: 'REQUIRED_FIELD',
      });
    });
  });

  describe('canExecute', () => {
    it('should return true for valid context', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node-1',
        inputs: {},
        config: { required: true, value: 'test' },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      expect(executor.canExecute(context)).toBe(true);
    });

    it('should return false for invalid context', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node-1',
        inputs: {},
        config: { required: true }, // missing value
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      expect(executor.canExecute(context)).toBe(false);
    });
  });
});

describe('NodeExecutorRegistry', () => {
  let registry: NodeExecutorRegistry;

  beforeEach(() => {
    registry = new NodeExecutorRegistry();
  });

  describe('register', () => {
    it('should register an executor', () => {
      const executor = new TestExecutor();
      registry.register('test-node', executor);

      expect(registry.has('test-node')).toBe(true);
      expect(registry.get('test-node')).toBe(executor);
    });
  });

  describe('unregister', () => {
    it('should unregister an executor', () => {
      const executor = new TestExecutor();
      registry.register('test-node', executor);
      
      expect(registry.has('test-node')).toBe(true);
      
      registry.unregister('test-node');
      
      expect(registry.has('test-node')).toBe(false);
      expect(registry.get('test-node')).toBeUndefined();
    });
  });

  describe('getRegisteredTypes', () => {
    it('should return all registered types', () => {
      registry.register('type1', new TestExecutor());
      registry.register('type2', new TestExecutor());

      const types = registry.getRegisteredTypes();
      expect(types.sort()).toEqual(['type1', 'type2']);
    });
  });

  describe('clear', () => {
    it('should clear all executors', () => {
      registry.register('type1', new TestExecutor());
      registry.register('type2', new TestExecutor());

      expect(registry.getRegisteredTypes()).toHaveLength(2);

      registry.clear();

      expect(registry.getRegisteredTypes()).toHaveLength(0);
    });
  });
});

describe('BaseExecutors', () => {
  describe('ExampleDataExecutor', () => {
    let executor: ExampleDataExecutor;

    beforeEach(() => {
      executor = new ExampleDataExecutor();
    });

    it('should generate sample dataset', async () => {
      const context: ExecutionContext = {
        nodeId: 'example-1',
        inputs: {},
        config: { dataset: 'sample' },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output.columns).toEqual(['id', 'name', 'age', 'city']);
      expect(result.output.rows).toHaveLength(5);
      expect(result.output.metadata.rowCount).toBe(5);
      expect(result.output.metadata.columnCount).toBe(4);
    });

    it('should validate configuration', () => {
      const validContext: ExecutionContext = {
        nodeId: 'example-1',
        inputs: {},
        config: { dataset: 'sample' },
        metadata: { executionId: 'exec-1', startTime: new Date() },
      };

      const invalidContext: ExecutionContext = {
        nodeId: 'example-1',
        inputs: {},
        config: {},
        metadata: { executionId: 'exec-1', startTime: new Date() },
      };

      expect(executor.validate(validContext).valid).toBe(true);
      expect(executor.validate(invalidContext).valid).toBe(false);
    });
  });

  describe('FilterExecutor', () => {
    let executor: FilterExecutor;

    beforeEach(() => {
      executor = new FilterExecutor();
    });

    it('should filter dataset correctly', async () => {
      const inputDataset = {
        columns: ['id', 'name', 'age'],
        rows: [
          [1, 'Alice', 25],
          [2, 'Bob', 30],
          [3, 'Charlie', 35],
        ],
        metadata: {
          rowCount: 3,
          columnCount: 3,
          types: { id: 'number' as const, name: 'string' as const, age: 'number' as const },
          nullable: { id: false, name: false, age: false },
          unique: { id: true, name: true, age: true },
          created: new Date(),
          modified: new Date(),
        },
      };

      const context: ExecutionContext = {
        nodeId: 'filter-1',
        inputs: { input: inputDataset },
        config: {
          column: 'age',
          operator: 'greater_than',
          value: 30,
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(1);
      expect(result.output.rows[0]).toEqual([3, 'Charlie', 35]);
    });

    it('should validate inputs and configuration', () => {
      const validContext: ExecutionContext = {
        nodeId: 'filter-1',
        inputs: { input: { columns: ['age'], rows: [[25]] } },
        config: { column: 'age', operator: 'greater_than', value: 20 },
        metadata: { executionId: 'exec-1', startTime: new Date() },
      };

      const invalidContext: ExecutionContext = {
        nodeId: 'filter-1',
        inputs: {},
        config: {},
        metadata: { executionId: 'exec-1', startTime: new Date() },
      };

      expect(executor.validate(validContext).valid).toBe(true);
      expect(executor.validate(invalidContext).valid).toBe(false);
    });
  });

  describe('SortExecutor', () => {
    let executor: SortExecutor;

    beforeEach(() => {
      executor = new SortExecutor();
    });

    it('should sort dataset correctly', async () => {
      const inputDataset = {
        columns: ['id', 'name', 'age'],
        rows: [
          [3, 'Charlie', 35],
          [1, 'Alice', 25],
          [2, 'Bob', 30],
        ],
        metadata: {
          rowCount: 3,
          columnCount: 3,
          types: { id: 'number' as const, name: 'string' as const, age: 'number' as const },
          nullable: { id: false, name: false, age: false },
          unique: { id: true, name: true, age: true },
          created: new Date(),
          modified: new Date(),
        },
      };

      const context: ExecutionContext = {
        nodeId: 'sort-1',
        inputs: { input: inputDataset },
        config: {
          column: 'age',
          direction: 'asc',
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toEqual([
        [1, 'Alice', 25],
        [2, 'Bob', 30],
        [3, 'Charlie', 35],
      ]);
    });

    it('should validate inputs and configuration', () => {
      const validContext: ExecutionContext = {
        nodeId: 'sort-1',
        inputs: { input: { columns: ['age'], rows: [[25]] } },
        config: { column: 'age', direction: 'asc' },
        metadata: { executionId: 'exec-1', startTime: new Date() },
      };

      const invalidContext: ExecutionContext = {
        nodeId: 'sort-1',
        inputs: {},
        config: {},
        metadata: { executionId: 'exec-1', startTime: new Date() },
      };

      expect(executor.validate(validContext).valid).toBe(true);
      expect(executor.validate(invalidContext).valid).toBe(false);
    });
  });
});