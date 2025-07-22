import { describe, it, expect, beforeEach } from 'vitest';
import { DataTransformers, DataTransformUtils } from '../DataTransformers';
import type { Dataset } from '../../types';

describe('DataTransformers', () => {
  let sampleDataset: Dataset;

  beforeEach(() => {
    sampleDataset = {
      columns: ['name', 'month', 'sales', 'region'],
      rows: [
        ['Alice', 'Jan', 100, 'North'],
        ['Alice', 'Feb', 150, 'North'],
        ['Bob', 'Jan', 200, 'South'],
        ['Bob', 'Feb', 180, 'South'],
        ['Charlie', 'Jan', 120, 'North'],
        ['Charlie', 'Feb', 140, 'North'],
      ],
      metadata: {
        rowCount: 6,
        columnCount: 4,
        types: { name: 'string', month: 'string', sales: 'number', region: 'string' },
        nullable: { name: false, month: false, sales: false, region: false },
        unique: { name: false, month: false, sales: true, region: false },
        created: new Date(),
        modified: new Date(),
      },
    };
  });

  describe('pivot', () => {
    it('should pivot data correctly with sum aggregation', () => {
      const result = DataTransformers.pivot(
        sampleDataset,
        'name',      // index column
        'month',     // pivot column
        'sales',     // value column
        'sum'        // aggregation
      );

      expect(result.columns).toEqual(['name', 'Feb', 'Jan']);
      expect(result.rows).toHaveLength(3); // Alice, Bob, Charlie
      
      // Find Alice's row
      const aliceRow = result.rows.find(row => row[0] === 'Alice');
      expect(aliceRow).toBeDefined();
      expect(aliceRow![1]).toBe(150); // Feb sales
      expect(aliceRow![2]).toBe(100); // Jan sales
    });

    it('should pivot with different aggregation functions', () => {
      // Add duplicate data to test aggregation
      const dataWithDuplicates = {
        ...sampleDataset,
        rows: [
          ...sampleDataset.rows,
          ['Alice', 'Jan', 50, 'North'], // Duplicate for Alice Jan
        ],
      };

      const result = DataTransformers.pivot(
        dataWithDuplicates,
        'name',
        'month',
        'sales',
        'avg'
      );

      // Alice Jan should be average of 100 and 50 = 75
      const aliceRow = result.rows.find(row => row[0] === 'Alice');
      expect(aliceRow![2]).toBe(75); // Jan average
    });
  });

  describe('unpivot', () => {
    it('should unpivot data correctly', () => {
      const pivotedData: Dataset = {
        columns: ['name', 'Jan', 'Feb'],
        rows: [
          ['Alice', 100, 150],
          ['Bob', 200, 180],
        ],
        metadata: {
          rowCount: 2,
          columnCount: 3,
          types: { name: 'string', Jan: 'number', Feb: 'number' },
          nullable: { name: false, Jan: false, Feb: false },
          unique: { name: true, Jan: true, Feb: true },
          created: new Date(),
          modified: new Date(),
        },
      };

      const result = DataTransformers.unpivot(
        pivotedData,
        ['name'],           // id columns
        ['Jan', 'Feb'],     // value columns
        'month',            // variable name
        'sales'             // value name
      );

      expect(result.columns).toEqual(['name', 'month', 'sales']);
      expect(result.rows).toHaveLength(4); // 2 people × 2 months
      
      // Check first row
      expect(result.rows[0]).toEqual(['Alice', 'Jan', 100]);
      expect(result.rows[1]).toEqual(['Alice', 'Feb', 150]);
    });
  });

  describe('transpose', () => {
    it('should transpose data without using first column as headers', () => {
      const simpleData: Dataset = {
        columns: ['A', 'B', 'C'],
        rows: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        metadata: {
          rowCount: 2,
          columnCount: 3,
          types: { A: 'number', B: 'number', C: 'number' },
          nullable: { A: false, B: false, C: false },
          unique: { A: true, B: true, C: true },
          created: new Date(),
          modified: new Date(),
        },
      };

      const result = DataTransformers.transpose(simpleData, false);

      expect(result.columns).toEqual(['column', 'row_0', 'row_1']);
      expect(result.rows).toEqual([
        ['A', 1, 4],
        ['B', 2, 5],
        ['C', 3, 6],
      ]);
    });

    it('should transpose using first column as headers', () => {
      const result = DataTransformers.transpose(sampleDataset, true);

      expect(result.columns[0]).toBe('column');
      expect(result.columns).toHaveLength(7); // 'column' + 6 data rows
      expect(result.rows).toHaveLength(3); // month, sales, region columns (skipping name)
    });
  });

  describe('fillMissing', () => {
    let dataWithMissing: Dataset;

    beforeEach(() => {
      dataWithMissing = {
        columns: ['name', 'value1', 'value2'],
        rows: [
          ['A', 10, null],
          ['B', null, 20],
          ['C', 30, 25],
          ['D', null, null],
          ['E', 50, 35],
        ],
        metadata: {
          rowCount: 5,
          columnCount: 3,
          types: { name: 'string', value1: 'number', value2: 'number' },
          nullable: { name: false, value1: true, value2: true },
          unique: { name: true, value1: false, value2: false },
          created: new Date(),
          modified: new Date(),
        },
      };
    });

    it('should fill missing values with forward fill', () => {
      const result = DataTransformers.fillMissing(
        dataWithMissing,
        'forward',
        undefined,
        ['value1']
      );

      expect(result.rows[1][1]).toBe(10); // B should get A's value
      expect(result.rows[3][1]).toBe(30); // D should get C's value
    });

    it('should fill missing values with mean', () => {
      const result = DataTransformers.fillMissing(
        dataWithMissing,
        'mean',
        undefined,
        ['value1']
      );

      // Mean of [10, 30, 50] = 30
      expect(result.rows[1][1]).toBe(30); // B
      expect(result.rows[3][1]).toBe(30); // D
    });

    it('should fill missing values with constant', () => {
      const result = DataTransformers.fillMissing(
        dataWithMissing,
        'constant',
        999,
        ['value1', 'value2']
      );

      expect(result.rows[1][1]).toBe(999); // B value1
      expect(result.rows[0][2]).toBe(999); // A value2
      expect(result.rows[3][2]).toBe(999); // D value2
    });
  });

  describe('removeOutliers', () => {
    let dataWithOutliers: Dataset;

    beforeEach(() => {
      dataWithOutliers = {
        columns: ['name', 'value'],
        rows: [
          ['A', 10],
          ['B', 12],
          ['C', 11],
          ['D', 13],
          ['E', 100], // Outlier
          ['F', 9],
          ['G', 14],
        ],
        metadata: {
          rowCount: 7,
          columnCount: 2,
          types: { name: 'string', value: 'number' },
          nullable: { name: false, value: false },
          unique: { name: true, value: true },
          created: new Date(),
          modified: new Date(),
        },
      };
    });

    it('should remove outliers using IQR method', () => {
      const result = DataTransformers.removeOutliers(
        dataWithOutliers,
        'value',
        'iqr',
        1.5
      );

      expect(result.rows).toHaveLength(6); // Should remove the outlier (100)
      expect(result.rows.every(row => row[1] < 50)).toBe(true);
    });

    it('should remove outliers using Z-score method', () => {
      const result = DataTransformers.removeOutliers(
        dataWithOutliers,
        'value',
        'zscore',
        2
      );

      expect(result.rows.length).toBeLessThan(dataWithOutliers.rows.length);
    });
  });

  describe('normalize', () => {
    let numericData: Dataset;

    beforeEach(() => {
      numericData = {
        columns: ['name', 'value1', 'value2'],
        rows: [
          ['A', 10, 100],
          ['B', 20, 200],
          ['C', 30, 300],
          ['D', 40, 400],
        ],
        metadata: {
          rowCount: 4,
          columnCount: 3,
          types: { name: 'string', value1: 'number', value2: 'number' },
          nullable: { name: false, value1: false, value2: false },
          unique: { name: true, value1: true, value2: true },
          created: new Date(),
          modified: new Date(),
        },
      };
    });

    it('should normalize using min-max scaling', () => {
      const result = DataTransformers.normalize(
        numericData,
        ['value1'],
        'minmax'
      );

      // Min-max normalization: (value - min) / (max - min)
      // For value1: min=10, max=40, range=30
      expect(result.rows[0][1]).toBe(0);    // (10-10)/30 = 0
      expect(result.rows[1][1]).toBeCloseTo(0.333, 2); // (20-10)/30 = 0.333
      expect(result.rows[2][1]).toBeCloseTo(0.667, 2); // (30-10)/30 = 0.667
      expect(result.rows[3][1]).toBe(1);    // (40-10)/30 = 1
    });

    it('should normalize using z-score', () => {
      const result = DataTransformers.normalize(
        numericData,
        ['value1'],
        'zscore'
      );

      // Z-score normalization: (value - mean) / stddev
      // Mean = 25, values should be centered around 0
      const values = result.rows.map(row => row[1]);
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      expect(Math.abs(mean)).toBeLessThan(0.001); // Should be close to 0
    });
  });

  describe('DataTransformUtils', () => {
    it('should provide utility functions', () => {
      expect(typeof DataTransformUtils.pivot).toBe('function');
      expect(typeof DataTransformUtils.unpivot).toBe('function');
      expect(typeof DataTransformUtils.transpose).toBe('function');
      expect(typeof DataTransformUtils.fillMissing).toBe('function');
      expect(typeof DataTransformUtils.removeOutliers).toBe('function');
      expect(typeof DataTransformUtils.normalize).toBe('function');
    });

    it('should work the same as class methods', () => {
      const classResult = DataTransformers.pivot(
        sampleDataset,
        'name',
        'month',
        'sales',
        'sum'
      );

      const utilResult = DataTransformUtils.pivot(
        sampleDataset,
        'name',
        'month',
        'sales',
        'sum'
      );

      expect(utilResult).toEqual(classResult);
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent columns in pivot', () => {
      expect(() => {
        DataTransformers.pivot(
          sampleDataset,
          'non_existent',
          'month',
          'sales',
          'sum'
        );
      }).toThrow('One or more specified columns not found');
    });

    it('should throw error for non-existent columns in unpivot', () => {
      expect(() => {
        DataTransformers.unpivot(
          sampleDataset,
          ['non_existent'],
          ['month'],
          'variable',
          'value'
        );
      }).toThrow('One or more specified columns not found');
    });

    it('should throw error for non-existent column in removeOutliers', () => {
      expect(() => {
        DataTransformers.removeOutliers(sampleDataset, 'non_existent');
      }).toThrow('Column "non_existent" not found');
    });
  });
});