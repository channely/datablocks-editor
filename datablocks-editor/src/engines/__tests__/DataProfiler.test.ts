import { describe, it, expect } from 'vitest';
import { DataProfiler } from '../DataProfiler';
import type { Dataset } from '../../types';

describe('DataProfiler', () => {
  const sampleDataset: Dataset = {
    columns: ['name', 'age', 'salary', 'active'],
    rows: [
      ['Alice', 25, 50000, true],
      ['Bob', 30, 60000, false],
      ['Charlie', 35, 70000, true],
      ['Diana', 28, 55000, true],
      ['Eve', 32, 65000, false],
      ['Frank', null, 45000, true],
      ['Grace', 27, null, true],
    ],
    metadata: {
      rowCount: 7,
      columnCount: 4,
      types: {
        name: 'string',
        age: 'number',
        salary: 'number',
        active: 'boolean',
      },
      nullable: {},
      unique: {},
      created: new Date(),
      modified: new Date(),
    },
  };

  describe('profile', () => {
    it('generates a comprehensive data profile', () => {
      const profile = DataProfiler.profile(sampleDataset);

      expect(profile).toHaveProperty('overview');
      expect(profile).toHaveProperty('columns');
      expect(profile).toHaveProperty('quality');
      expect(profile).toHaveProperty('relationships');
      expect(profile).toHaveProperty('recommendations');

      // Check overview
      expect(profile.overview.rowCount).toBe(7);
      expect(profile.overview.columnCount).toBe(4);
      expect(profile.overview.memoryUsage).toBeGreaterThan(0);

      // Check columns
      expect(Object.keys(profile.columns)).toEqual(['name', 'age', 'salary', 'active']);
      
      // Check name column
      const nameColumn = profile.columns.name;
      expect(nameColumn.type).toBe('string');
      expect(nameColumn.nullCount).toBe(0);
      expect(nameColumn.uniqueCount).toBe(7);

      // Check age column (has null values)
      const ageColumn = profile.columns.age;
      expect(ageColumn.type).toBe('number');
      expect(ageColumn.nullCount).toBe(1);
      expect(ageColumn.nullPercentage).toBeCloseTo(14.29, 1);

      // Check quality assessment
      expect(profile.quality.overallScore).toBeGreaterThan(0);
      expect(profile.quality.completeness).toHaveProperty('score');
      expect(profile.quality.consistency).toHaveProperty('score');
      expect(profile.quality.accuracy).toHaveProperty('score');
      expect(profile.quality.uniqueness).toHaveProperty('score');
    });

    it('handles empty dataset', () => {
      const emptyDataset: Dataset = {
        columns: ['name', 'age'],
        rows: [],
        metadata: {
          rowCount: 0,
          columnCount: 2,
          types: {},
          nullable: {},
          unique: {},
          created: new Date(),
          modified: new Date(),
        },
      };

      const profile = DataProfiler.profile(emptyDataset);

      expect(profile.overview.rowCount).toBe(0);
      expect(profile.overview.columnCount).toBe(2);
      expect(Object.keys(profile.columns)).toEqual(['name', 'age']);
    });
  });

  describe('inferEnhancedType', () => {
    it('infers string type correctly', () => {
      const values = ['Alice', 'Bob', 'Charlie'];
      const typeInfo = DataProfiler.inferEnhancedType(values);

      expect(typeInfo.type).toBe('string');
      expect(typeInfo.confidence).toBeGreaterThan(0);
      expect(typeInfo.patterns).toBeInstanceOf(Array);
    });

    it('infers number type correctly', () => {
      const values = [25, 30, 35];
      const typeInfo = DataProfiler.inferEnhancedType(values);

      expect(typeInfo.type).toBe('number');
      expect(typeInfo.confidence).toBeGreaterThan(0);
    });

    it('infers boolean type correctly', () => {
      const values = [true, false, true];
      const typeInfo = DataProfiler.inferEnhancedType(values);

      expect(typeInfo.type).toBe('boolean');
      expect(typeInfo.confidence).toBeGreaterThan(0);
    });

    it('detects email patterns', () => {
      const values = ['user@example.com', 'test@domain.org', 'invalid-email'];
      const typeInfo = DataProfiler.inferEnhancedType(values);

      expect(typeInfo.patterns.some(p => p.type === 'email')).toBe(true);
    });

    it('handles null values', () => {
      const values = [null, undefined, null];
      const typeInfo = DataProfiler.inferEnhancedType(values);

      expect(typeInfo.type).toBe('null');
      expect(typeInfo.confidence).toBe(1.0);
    });
  });

  describe('assessDataQuality', () => {
    it('assesses data quality correctly', () => {
      const quality = DataProfiler.assessDataQuality(sampleDataset);

      expect(quality.overallScore).toBeGreaterThan(0);
      expect(quality.overallScore).toBeLessThanOrEqual(100);
      
      expect(quality.completeness.score).toBeGreaterThan(0);
      expect(quality.consistency.score).toBeGreaterThan(0);
      expect(quality.accuracy.score).toBeGreaterThan(0);
      expect(quality.uniqueness.score).toBeGreaterThan(0);

      expect(quality.issues).toBeInstanceOf(Array);
    });

    it('identifies completeness issues', () => {
      const incompleteDataset: Dataset = {
        columns: ['name', 'age'],
        rows: [
          ['Alice', null],
          [null, 25],
          ['Bob', null],
        ],
        metadata: {
          rowCount: 3,
          columnCount: 2,
          types: {},
          nullable: {},
          unique: {},
          created: new Date(),
          modified: new Date(),
        },
      };

      const quality = DataProfiler.assessDataQuality(incompleteDataset);
      expect(quality.completeness.score).toBeLessThan(90);
      expect(quality.completeness.issues.length).toBeGreaterThan(0);
    });
  });
});