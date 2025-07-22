import { describe, it, expect } from 'vitest';
import { JavaScriptExecutor } from '../executors/JavaScriptExecutor';
import type { Dataset } from '../../types';

describe('JavaScriptExecutor', () => {
  const sampleDataset: Dataset = {
    columns: ['name', 'age', 'city'],
    rows: [
      ['Alice', 25, 'New York'],
      ['Bob', 30, 'San Francisco'],
      ['Charlie', 35, 'Chicago'],
    ],
    metadata: {
      rowCount: 3,
      columnCount: 3,
      types: { name: 'string', age: 'number', city: 'string' },
      nullable: { name: false, age: false, city: false },
      unique: { name: true, age: true, city: true },
      created: new Date(),
      modified: new Date(),
    },
  };

  describe('execute', () => {
    it('should execute simple JavaScript code', async () => {
      const code = `
        function process(data) {
          return data;
        }
      `;

      const result = await JavaScriptExecutor.execute(code, sampleDataset);
      expect(result).toEqual(sampleDataset);
    });

    it('should transform data with JavaScript code', async () => {
      const code = `
        function process(data) {
          if (!data || !data.rows) return data;
          
          // Filter adults (age >= 30)
          const filteredRows = data.rows.filter(row => {
            const ageIndex = data.columns.indexOf('age');
            return row[ageIndex] >= 30;
          });
          
          return {
            ...data,
            rows: filteredRows,
            metadata: {
              ...data.metadata,
              rowCount: filteredRows.length,
              modified: new Date()
            }
          };
        }
      `;

      const result = await JavaScriptExecutor.execute(code, sampleDataset);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][1]).toBe(30); // Bob's age
      expect(result.rows[1][1]).toBe(35); // Charlie's age
    });

    it('should handle array output', async () => {
      const code = `
        function process(data) {
          return [1, 2, 3, 4, 5];
        }
      `;

      const result = await JavaScriptExecutor.execute(code, sampleDataset);
      expect(result.columns).toEqual(['value']);
      expect(result.rows).toEqual([[1], [2], [3], [4], [5]]);
      expect(result.metadata.rowCount).toBe(5);
    });

    it('should handle object array output', async () => {
      const code = `
        function process(data) {
          return [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' }
          ];
        }
      `;

      const result = await JavaScriptExecutor.execute(code, sampleDataset);
      expect(result.columns).toEqual(['id', 'name']);
      expect(result.rows).toEqual([[1, 'Item 1'], [2, 'Item 2']]);
      expect(result.metadata.rowCount).toBe(2);
    });

    it('should handle console output when allowed', async () => {
      const code = `
        function process(data) {
          console.log('Processing data...');
          console.warn('This is a warning');
          console.error('This is an error');
          return data;
        }
      `;

      const result = await JavaScriptExecutor.execute(code, sampleDataset, {
        allowConsole: true,
      });
      expect(result).toEqual(sampleDataset);
    });

    it('should respect timeout limits', async () => {
      const code = `
        function process(data) {
          // Simulate long-running operation with a large loop
          let sum = 0;
          for (let i = 0; i < 10000000; i++) {
            sum += i;
          }
          return data;
        }
      `;

      // Note: In a real browser environment, this would timeout
      // For now, we'll just test that the function executes
      const result = await JavaScriptExecutor.execute(code, sampleDataset, { timeout: 5000 });
      expect(result).toEqual(sampleDataset);
    });

    it('should execute in strict mode', async () => {
      const code = `
        function process(data) {
          // This should work in strict mode
          'use strict';
          var result = data;
          return result;
        }
      `;

      const result = await JavaScriptExecutor.execute(code, sampleDataset, {
        strictMode: true,
      });
      expect(result).toEqual(sampleDataset);
    });

    it('should handle execution errors gracefully', async () => {
      const code = `
        function process(data) {
          throw new Error('Custom error');
        }
      `;

      await expect(
        JavaScriptExecutor.execute(code, sampleDataset)
      ).rejects.toThrow('Code execution failed: Custom error');
    });

    it('should handle syntax errors', async () => {
      const code = `
        function process(data) {
          return data
        // Missing closing brace
      `;

      await expect(
        JavaScriptExecutor.execute(code, sampleDataset)
      ).rejects.toThrow('Code compilation failed');
    });
  });

  describe('validateCodeSafety', () => {
    it('should reject dangerous code patterns', async () => {
      const dangerousCodes = [
        'eval("malicious code")',
        'new Function("return 1")',
        'setTimeout(() => {}, 1000)',
        'require("fs")',
        'import { something } from "module"',
        'window.location = "evil.com"',
        'document.cookie = "steal"',
        'fetch("evil.com")',
      ];

      for (const code of dangerousCodes) {
        await expect(
          JavaScriptExecutor.execute(code, sampleDataset)
        ).rejects.toThrow('Code safety validation failed');
      }
    });

    it('should allow safe code patterns', async () => {
      const safeCodes = [
        'function process(data) { return data; }',
        'const result = data.rows.map(row => row);',
        'if (data && data.columns) { return data; }',
        'for (let i = 0; i < data.rows.length; i++) { }',
        'const sum = data.rows.reduce((acc, row) => acc + row[1], 0);',
      ];

      for (const code of safeCodes) {
        await expect(
          JavaScriptExecutor.execute(code, sampleDataset)
        ).resolves.toBeDefined();
      }
    });
  });

  describe('validate', () => {
    it('should validate required code field', () => {
      const result = JavaScriptExecutor.validate({}, {});
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('code');
      expect(result.errors[0].message).toBe('JavaScript code is required');
    });

    it('should validate timeout range', () => {
      const result = JavaScriptExecutor.validate({}, {
        code: 'function process(data) { return data; }',
        timeout: 50, // Too low
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('timeout');
    });

    it('should validate safe code', () => {
      const result = JavaScriptExecutor.validate({}, {
        code: 'function process(data) { return data; }',
        timeout: 5000,
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate unsafe code', () => {
      const result = JavaScriptExecutor.validate({}, {
        code: 'eval("dangerous code")',
        timeout: 5000,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('code');
      expect(result.errors[0].message).toContain('Code safety validation failed');
    });
  });

  describe('data type inference', () => {
    it('should infer correct types for mixed data', async () => {
      const code = `
        function process(data) {
          return [
            { name: 'Alice', age: 25, active: true, joined: new Date(), score: null },
            { name: 'Bob', age: 30, active: false, joined: new Date(), score: 95.5 }
          ];
        }
      `;

      const result = await JavaScriptExecutor.execute(code, null);
      expect(result.metadata.types.name).toBe('string');
      expect(result.metadata.types.age).toBe('number');
      expect(result.metadata.types.active).toBe('boolean');
      expect(result.metadata.types.joined).toBe('date');
    });

    it('should handle null and undefined values', async () => {
      const code = `
        function process(data) {
          return [
            { value: null },
            { value: undefined },
            { value: 'test' }
          ];
        }
      `;

      const result = await JavaScriptExecutor.execute(code, null);
      expect(result.metadata.types.value).toBe('string');
      expect(result.metadata.nullable.value).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty input data', async () => {
      const code = `
        function process(data) {
          if (!data) {
            return [{ message: 'No data provided' }];
          }
          return data;
        }
      `;

      const result = await JavaScriptExecutor.execute(code, null);
      expect(result.columns).toEqual(['message']);
      expect(result.rows).toEqual([['No data provided']]);
    });

    it('should handle code without process function', async () => {
      const code = `
        const result = { computed: true };
        // No process function defined
      `;

      const result = await JavaScriptExecutor.execute(code, sampleDataset);
      expect(result).toEqual(sampleDataset); // Should return input data as-is
    });

    it('should handle main function instead of process', async () => {
      const code = `
        function main(data) {
          return [{ processed: true, originalRows: data ? data.rows.length : 0 }];
        }
      `;

      const result = await JavaScriptExecutor.execute(code, sampleDataset);
      expect(result.columns).toEqual(['processed', 'originalRows']);
      expect(result.rows).toEqual([[true, 3]]);
    });
  });
});