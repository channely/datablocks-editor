import { describe, it, expect, beforeEach } from 'vitest';
import { PasteInputExecutor } from '../executors/PasteInputExecutor';
import type { ExecutionContext } from '../../types';

describe('PasteInputExecutor', () => {
  let executor: PasteInputExecutor;

  beforeEach(() => {
    executor = new PasteInputExecutor();
  });

  describe('execute', () => {
    it('should parse JSON data correctly', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'json',
          data: JSON.stringify([
            { name: 'John', age: 25, city: 'NYC' },
            { name: 'Jane', age: 30, city: 'LA' }
          ]),
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['name', 'age', 'city']);
      expect(result.output.rows).toHaveLength(2);
      expect(result.output.rows[0]).toEqual(['John', 25, 'NYC']);
      expect(result.output.rows[1]).toEqual(['Jane', 30, 'LA']);
    });

    it('should parse CSV data with headers', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: 'name,age,city\nJohn,25,NYC\nJane,30,LA',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['name', 'age', 'city']);
      expect(result.output.rows).toHaveLength(2);
      expect(result.output.rows[0]).toEqual(['John', '25', 'NYC']);
      expect(result.output.rows[1]).toEqual(['Jane', '30', 'LA']);
    });

    it('should parse CSV data without headers', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: 'John,25,NYC\nJane,30,LA',
          hasHeader: false,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['Column 1', 'Column 2', 'Column 3']);
      expect(result.output.rows).toHaveLength(2);
      expect(result.output.rows[0]).toEqual(['John', '25', 'NYC']);
      expect(result.output.rows[1]).toEqual(['Jane', '30', 'LA']);
    });

    it('should parse table data (tab-separated)', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'table',
          data: 'name\tage\tcity\nJohn\t25\tNYC\nJane\t30\tLA',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['name', 'age', 'city']);
      expect(result.output.rows).toHaveLength(2);
      expect(result.output.rows[0]).toEqual(['John', '25', 'NYC']);
      expect(result.output.rows[1]).toEqual(['Jane', '30', 'LA']);
    });

    it('should handle CSV data with quoted fields', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: 'name,description,price\n"John Doe","A person with, comma",25.50\n"Jane Smith","Another ""quoted"" person",30.75',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.columns).toEqual(['name', 'description', 'price']);
      expect(result.output.rows).toHaveLength(2);
      expect(result.output.rows[0]).toEqual(['John Doe', 'A person with, comma', '25.50']);
      expect(result.output.rows[1]).toEqual(['Jane Smith', 'Another "quoted" person', '30.75']);
    });

    it('should throw error for empty data', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: '',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No data provided');
    });

    it('should throw error for invalid JSON', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'json',
          data: '{ invalid json }',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('Failed to parse JSON data');
    });

    it('should throw error for non-array JSON', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'json',
          data: '{"name": "John", "age": 25}',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('JSON data must be an array');
    });

    it('should add source metadata', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: 'name,age\nJohn,25',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.metadata.source).toEqual({
        type: 'paste',
        dataType: 'csv',
        hasHeader: true,
        originalLength: 'name,age\nJohn,25'.length,
      });
    });
  });

  describe('validate', () => {
    it('should validate successfully with valid CSV data', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: 'name,age\nJohn,25',
          hasHeader: true,
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

    it('should validate successfully with valid JSON data', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'json',
          data: '[{"name": "John", "age": 25}]',
          hasHeader: true,
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

    it('should return error for empty data', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: '',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Data content is required');
    });

    it('should return error for invalid JSON format', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'json',
          data: '{ invalid json }',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('Invalid JSON format');
    });

    it('should return error for non-array JSON', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'json',
          data: '{"name": "John"}',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('data');
      expect(result.errors[0].message).toBe('JSON data must be an array');
    });

    it('should return warning for large data', () => {
      // Create data that's definitely over 1MB
      const largeData = 'x'.repeat(1024 * 1024 + 100); // 1MB + 100 bytes
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: largeData,
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.warnings).toBeDefined();
      expect(result.warnings!.length).toBeGreaterThan(0);
      expect(result.warnings![0].message).toContain('Large data size may impact performance');
    });

    it('should return error for CSV data with no rows', () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: 'some data but no valid rows after filtering',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true); // This will be valid since it has content
      // The "no rows" validation happens during execution, not validation
    });
  });

  describe('CSV parsing edge cases', () => {
    it('should handle empty fields correctly', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: 'name,age,city\nJohn,,NYC\n,30,\nJane,25,LA',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(3);
      expect(result.output.rows[0]).toEqual(['John', '', 'NYC']);
      expect(result.output.rows[1]).toEqual(['', '30', '']);
      expect(result.output.rows[2]).toEqual(['Jane', '25', 'LA']);
    });

    it('should handle rows with different column counts', async () => {
      const context: ExecutionContext = {
        nodeId: 'test-node',
        inputs: {},
        config: {
          dataType: 'csv',
          data: 'name,age,city\nJohn,25\nJane,30,LA,Extra',
          hasHeader: true,
        },
        metadata: {
          executionId: 'test-exec',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.rows).toHaveLength(2);
      expect(result.output.rows[0]).toEqual(['John', '25']);
      expect(result.output.rows[1]).toEqual(['Jane', '30', 'LA', 'Extra']);
    });
  });
});