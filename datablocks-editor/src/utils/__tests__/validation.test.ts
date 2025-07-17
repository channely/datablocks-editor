import { describe, it, expect } from 'vitest';
import {
  isValidDataType,
  isDataset,
  validateDataset,
  validateNodeConfig,
  inferPrimitiveType,
  inferDatasetTypes,
} from '../validation';
import { Dataset, NodeConfigSchema } from '../../types';

describe('Validation Utils', () => {
  describe('isValidDataType', () => {
    it('should validate dataset type', () => {
      const dataset: Dataset = {
        columns: ['name', 'age'],
        rows: [['John', 30], ['Jane', 25]],
        metadata: {
          rowCount: 2,
          columnCount: 2,
          types: { name: 'string', age: 'number' },
          nullable: { name: false, age: false },
          unique: { name: true, age: true },
          created: new Date(),
          modified: new Date(),
        },
      };

      expect(isValidDataType(dataset, 'dataset')).toBe(true);
      expect(isValidDataType('not a dataset', 'dataset')).toBe(false);
    });

    it('should validate primitive types', () => {
      expect(isValidDataType(42, 'number')).toBe(true);
      expect(isValidDataType('hello', 'string')).toBe(true);
      expect(isValidDataType(true, 'boolean')).toBe(true);
      expect(isValidDataType([1, 2, 3], 'array')).toBe(true);
      expect(isValidDataType({ key: 'value' }, 'object')).toBe(true);
      expect(isValidDataType('anything', 'any')).toBe(true);
    });
  });

  describe('inferPrimitiveType', () => {
    it('should infer correct primitive types', () => {
      expect(inferPrimitiveType('hello')).toBe('string');
      expect(inferPrimitiveType(42)).toBe('number');
      expect(inferPrimitiveType(true)).toBe('boolean');
      expect(inferPrimitiveType(null)).toBe('null');
      expect(inferPrimitiveType('2023-01-01')).toBe('date');
    });
  });

  describe('validateDataset', () => {
    it('should validate correct dataset', () => {
      const dataset: Dataset = {
        columns: ['name', 'age'],
        rows: [['John', 30], ['Jane', 25]],
        metadata: {
          rowCount: 2,
          columnCount: 2,
          types: { name: 'string', age: 'number' },
          nullable: { name: false, age: false },
          unique: { name: true, age: true },
          created: new Date(),
          modified: new Date(),
        },
      };

      const result = validateDataset(dataset);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid dataset structure', () => {
      const result = validateDataset('not a dataset');
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('INVALID_DATASET');
    });

    it('should detect empty columns', () => {
      const dataset = {
        columns: [],
        rows: [],
        metadata: {
          rowCount: 0,
          columnCount: 0,
          types: {},
          nullable: {},
          unique: {},
          created: new Date(),
          modified: new Date(),
        },
      };

      const result = validateDataset(dataset);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('NO_COLUMNS');
    });
  });

  describe('validateNodeConfig', () => {
    it('should validate correct configuration', () => {
      const config = {
        name: 'Test Node',
        threshold: 10,
        enabled: true,
      };

      const schema: NodeConfigSchema = {
        name: {
          type: 'string',
          label: 'Name',
          required: true,
        },
        threshold: {
          type: 'number',
          label: 'Threshold',
          required: true,
        },
        enabled: {
          type: 'boolean',
          label: 'Enabled',
          defaultValue: false,
        },
      };

      const result = validateNodeConfig(config, schema);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const config = {
        threshold: 10,
      };

      const schema: NodeConfigSchema = {
        name: {
          type: 'string',
          label: 'Name',
          required: true,
        },
        threshold: {
          type: 'number',
          label: 'Threshold',
          required: true,
        },
      };

      const result = validateNodeConfig(config, schema);
      expect(result.valid).toBe(false);
      expect(result.errors[0].code).toBe('REQUIRED_FIELD');
      expect(result.errors[0].field).toBe('name');
    });
  });
});