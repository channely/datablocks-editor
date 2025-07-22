import { describe, it, expect, beforeEach } from 'vitest';
import { DataProcessor } from '../DataProcessor';
import type { Dataset, FilterCondition, SortConfig, GroupConfig, JoinConfig } from '../../types';

describe('DataProcessor', () => {
  let processor: DataProcessor;
  let sampleDataset: Dataset;

  beforeEach(() => {
    processor = new DataProcessor();
    sampleDataset = {
      columns: ['name', 'age', 'city', 'salary'],
      rows: [
        ['Alice', 30, 'New York', 75000],
        ['Bob', 25, 'Los Angeles', 65000],
        ['Charlie', 35, 'Chicago', 80000],
        ['Diana', 28, 'New York', 70000],
        ['Eve', 32, 'Los Angeles', 85000],
      ],
      metadata: {
        rowCount: 5,
        columnCount: 4,
        types: { name: 'string', age: 'number', city: 'string', salary: 'number' },
        nullable: { name: false, age: false, city: false, salary: false },
        unique: { name: true, age: true, city: false, salary: true },
        created: new Date(),
        modified: new Date(),
      },
    };
  });

  describe('filter', () => {
    it('should filter rows based on simple condition', () => {
      const condition: FilterCondition = {
        column: 'age',
        operator: 'greater_than',
        value: 30,
        type: 'number',
      };

      const result = processor.filter(sampleDataset, condition);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][0]).toBe('Charlie'); // age 35
      expect(result.rows[1][0]).toBe('Eve'); // age 32
    });

    it('should filter rows with string contains condition', () => {
      const condition: FilterCondition = {
        column: 'city',
        operator: 'contains',
        value: 'Los',
        type: 'string',
      };

      const result = processor.filter(sampleDataset, condition);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][0]).toBe('Bob');
      expect(result.rows[1][0]).toBe('Eve');
    });

    it('should handle compound filter conditions', () => {
      const condition = {
        operator: 'and' as const,
        conditions: [
          {
            column: 'age',
            operator: 'greater_than' as const,
            value: 25,
            type: 'number' as const,
          },
          {
            column: 'salary',
            operator: 'less_than' as const,
            value: 80000,
            type: 'number' as const,
          },
        ],
      };

      const result = processor.filter(sampleDataset, condition);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][0]).toBe('Alice'); // age 30, salary 75000
      expect(result.rows[1][0]).toBe('Diana'); // age 28, salary 70000
    });
  });

  describe('sort', () => {
    it('should sort by single column ascending', () => {
      const sortConfig: SortConfig[] = [
        { column: 'age', direction: 'asc', type: 'number' },
      ];

      const result = processor.sort(sampleDataset, sortConfig);

      expect(result.rows[0][0]).toBe('Bob'); // age 25
      expect(result.rows[1][0]).toBe('Diana'); // age 28
      expect(result.rows[2][0]).toBe('Alice'); // age 30
      expect(result.rows[3][0]).toBe('Eve'); // age 32
      expect(result.rows[4][0]).toBe('Charlie'); // age 35
    });

    it('should sort by single column descending', () => {
      const sortConfig: SortConfig[] = [
        { column: 'salary', direction: 'desc', type: 'number' },
      ];

      const result = processor.sort(sampleDataset, sortConfig);

      expect(result.rows[0][0]).toBe('Eve'); // salary 85000
      expect(result.rows[1][0]).toBe('Charlie'); // salary 80000
      expect(result.rows[2][0]).toBe('Alice'); // salary 75000
    });

    it('should sort by multiple columns', () => {
      const sortConfig: SortConfig[] = [
        { column: 'city', direction: 'asc', type: 'string' },
        { column: 'age', direction: 'desc', type: 'number' },
      ];

      const result = processor.sort(sampleDataset, sortConfig);

      // First by city (Chicago, Los Angeles, New York)
      // Then by age descending within each city
      expect(result.rows[0][0]).toBe('Charlie'); // Chicago
      expect(result.rows[1][0]).toBe('Eve'); // Los Angeles, age 32
      expect(result.rows[2][0]).toBe('Bob'); // Los Angeles, age 25
      expect(result.rows[3][0]).toBe('Alice'); // New York, age 30
      expect(result.rows[4][0]).toBe('Diana'); // New York, age 28
    });
  });

  describe('group', () => {
    it('should group by single column with count aggregation', () => {
      const config: GroupConfig = {
        columns: ['city'],
        aggregations: [
          { column: 'name', function: 'count', alias: 'count' },
        ],
      };

      const result = processor.group(sampleDataset, config);

      expect(result.columns).toEqual(['city', 'count']);
      expect(result.rows).toHaveLength(3);
      
      // Find New York row
      const nyRow = result.rows.find(row => row[0] === 'New York');
      expect(nyRow?.[1]).toBe(2);
    });

    it('should group with multiple aggregations', () => {
      const config: GroupConfig = {
        columns: ['city'],
        aggregations: [
          { column: 'salary', function: 'avg', alias: 'avg_salary' },
          { column: 'age', function: 'max', alias: 'max_age' },
          { column: 'name', function: 'count', alias: 'count' },
        ],
      };

      const result = processor.group(sampleDataset, config);

      expect(result.columns).toEqual(['city', 'avg_salary', 'max_age', 'count']);
      
      // Find Los Angeles row
      const laRow = result.rows.find(row => row[0] === 'Los Angeles');
      expect(laRow?.[1]).toBe(75000); // avg salary (65000 + 85000) / 2
      expect(laRow?.[2]).toBe(32); // max age
      expect(laRow?.[3]).toBe(2); // count
    });
  });

  describe('join', () => {
    let rightDataset: Dataset;

    beforeEach(() => {
      rightDataset = {
        columns: ['city', 'state', 'population'],
        rows: [
          ['New York', 'NY', 8000000],
          ['Los Angeles', 'CA', 4000000],
          ['Chicago', 'IL', 2700000],
          ['Houston', 'TX', 2300000], // Not in left dataset
        ],
        metadata: {
          rowCount: 4,
          columnCount: 3,
          types: { city: 'string', state: 'string', population: 'number' },
          nullable: { city: false, state: false, population: false },
          unique: { city: true, state: true, population: true },
          created: new Date(),
          modified: new Date(),
        },
      };
    });

    it('should perform inner join', () => {
      const config: JoinConfig = {
        type: 'inner',
        leftKey: 'city',
        rightKey: 'city',
      };

      const result = processor.join(sampleDataset, rightDataset, config);

      expect(result.rows).toHaveLength(5); // All left rows have matching cities
      expect(result.columns).toEqual(['name', 'age', 'city', 'salary', 'state', 'population']);
      
      // Check first row
      expect(result.rows[0]).toEqual(['Alice', 30, 'New York', 75000, 'NY', 8000000]);
    });

    it('should perform left join', () => {
      const config: JoinConfig = {
        type: 'left',
        leftKey: 'city',
        rightKey: 'city',
      };

      const result = processor.join(sampleDataset, rightDataset, config);

      expect(result.rows).toHaveLength(5); // All left rows preserved
      expect(result.columns).toEqual(['name', 'age', 'city', 'salary', 'state', 'population']);
    });
  });

  describe('slice', () => {
    it('should slice dataset with start and end', () => {
      const result = processor.slice(sampleDataset, 1, 3);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][0]).toBe('Bob');
      expect(result.rows[1][0]).toBe('Charlie');
    });

    it('should slice dataset with only start', () => {
      const result = processor.slice(sampleDataset, 3);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0][0]).toBe('Diana');
      expect(result.rows[1][0]).toBe('Eve');
    });
  });

  describe('renameColumns', () => {
    it('should rename columns correctly', () => {
      const mapping = {
        name: 'full_name',
        age: 'years_old',
      };

      const result = processor.renameColumns(sampleDataset, mapping);

      expect(result.columns).toEqual(['full_name', 'years_old', 'city', 'salary']);
      expect(result.metadata.types.full_name).toBe('string');
      expect(result.metadata.types.years_old).toBe('number');
      expect(result.metadata.types.name).toBeUndefined();
      expect(result.metadata.types.age).toBeUndefined();
    });

    it('should throw error for duplicate column names', () => {
      const mapping = {
        name: 'city', // This would create duplicate 'city' column
      };

      expect(() => processor.renameColumns(sampleDataset, mapping)).toThrow(
        'Duplicate column names after rename: city'
      );
    });
  });

  describe('addColumn', () => {
    it('should add computed column', () => {
      const result = processor.addColumn(
        sampleDataset,
        'age_category',
        (row) => {
          const age = row[1]; // age column
          return age < 30 ? 'Young' : 'Senior';
        }
      );

      expect(result.columns).toEqual(['name', 'age', 'city', 'salary', 'age_category']);
      expect(result.rows[0][4]).toBe('Senior'); // Alice, age 30
      expect(result.rows[1][4]).toBe('Young'); // Bob, age 25
    });

    it('should insert column at specific index', () => {
      const result = processor.addColumn(
        sampleDataset,
        'full_info',
        (row) => `${row[0]} (${row[1]})`,
        1 // Insert after name column
      );

      expect(result.columns).toEqual(['name', 'full_info', 'age', 'city', 'salary']);
      expect(result.rows[0][1]).toBe('Alice (30)');
    });
  });

  describe('removeColumns', () => {
    it('should remove specified columns', () => {
      const result = processor.removeColumns(sampleDataset, ['age', 'salary']);

      expect(result.columns).toEqual(['name', 'city']);
      expect(result.rows[0]).toEqual(['Alice', 'New York']);
    });
  });

  describe('getUniqueValues', () => {
    it('should return unique values from column', () => {
      const uniqueCities = processor.getUniqueValues(sampleDataset, 'city');

      expect(uniqueCities).toHaveLength(3);
      expect(uniqueCities).toContain('New York');
      expect(uniqueCities).toContain('Los Angeles');
      expect(uniqueCities).toContain('Chicago');
    });
  });

  describe('getColumnStats', () => {
    it('should calculate column statistics', () => {
      const stats = processor.getColumnStats(sampleDataset, 'age');

      expect(stats.count).toBe(5);
      expect(stats.nullCount).toBe(0);
      expect(stats.uniqueCount).toBe(5);
      expect(stats.min).toBe(25);
      expect(stats.max).toBe(35);
      expect(stats.avg).toBe(30); // (30+25+35+28+32)/5 = 30
      expect(stats.sum).toBe(150);
    });

    it('should handle non-numeric columns', () => {
      const stats = processor.getColumnStats(sampleDataset, 'name');

      expect(stats.count).toBe(5);
      expect(stats.nullCount).toBe(0);
      expect(stats.uniqueCount).toBe(5);
      expect(stats.avg).toBeUndefined();
      expect(stats.sum).toBeUndefined();
    });
  });

  describe('error handling', () => {
    it('should throw error for non-existent column in filter', () => {
      const condition: FilterCondition = {
        column: 'non_existent',
        operator: 'equals',
        value: 'test',
        type: 'string',
      };

      // Should not throw, but should return all rows (condition evaluates to true for missing columns)
      const result = processor.filter(sampleDataset, condition);
      expect(result.rows).toHaveLength(5);
    });

    it('should throw error for non-existent group column', () => {
      const config: GroupConfig = {
        columns: ['non_existent'],
        aggregations: [{ column: 'age', function: 'avg' }],
      };

      expect(() => processor.group(sampleDataset, config)).toThrow(
        'Group columns not found: non_existent'
      );
    });

    it('should throw error for non-existent join key', () => {
      const rightDataset: Dataset = {
        columns: ['other_column'],
        rows: [['value']],
        metadata: {
          rowCount: 1,
          columnCount: 1,
          types: { other_column: 'string' },
          nullable: { other_column: false },
          unique: { other_column: true },
          created: new Date(),
          modified: new Date(),
        },
      };

      const config: JoinConfig = {
        type: 'inner',
        leftKey: 'non_existent',
        rightKey: 'other_column',
      };

      expect(() => processor.join(sampleDataset, rightDataset, config)).toThrow(
        "Left join key 'non_existent' not found"
      );
    });
  });
});