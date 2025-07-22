import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DataPipeline, PipelineBuilder, PipelineUtils } from '../DataPipeline';
import type { Dataset, FilterCondition } from '../../types';

describe('DataPipeline', () => {
  let sampleDataset: Dataset;

  beforeEach(() => {
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

  describe('DataPipeline', () => {
    it('should chain multiple operations', () => {
      const pipeline = new DataPipeline()
        .filter({
          column: 'age',
          operator: 'greater_than',
          value: 27,
          type: 'number',
        })
        .sort([{ column: 'salary', direction: 'desc', type: 'number' }])
        .slice(0, 2);

      const result = pipeline.execute(sampleDataset);

      expect(result.rows).toHaveLength(2);
      // Should be filtered (age > 27), sorted by salary desc, then sliced to first 2
      expect(result.rows[0][0]).toBe('Eve'); // highest salary among filtered
      expect(result.rows[1][0]).toBe('Charlie'); // second highest
    });

    it('should handle empty pipeline', () => {
      const pipeline = new DataPipeline();
      const result = pipeline.execute(sampleDataset);

      expect(result).toEqual(sampleDataset);
    });

    it('should support async execution with progress tracking', async () => {
      const progressCallback = vi.fn();

      const pipeline = new DataPipeline()
        .filter({
          column: 'age',
          operator: 'greater_than',
          value: 25,
          type: 'number',
        })
        .sort([{ column: 'name', direction: 'asc', type: 'string' }]);

      const result = await pipeline.executeAsync(sampleDataset, progressCallback);

      expect(result.rows).toHaveLength(4); // 4 people with age > 25
      expect(progressCallback).toHaveBeenCalledWith(0, 2, 'filter');
      expect(progressCallback).toHaveBeenCalledWith(1, 2, 'sort');
      expect(progressCallback).toHaveBeenCalledWith(2, 2, 'completed');
    });

    it('should clone pipeline correctly', () => {
      const original = new DataPipeline()
        .filter({
          column: 'age',
          operator: 'greater_than',
          value: 30,
          type: 'number',
        })
        .sort([{ column: 'name', direction: 'asc', type: 'string' }]);

      const cloned = original.clone();

      // Modify original
      original.slice(0, 1);

      // Cloned should not be affected
      const originalOps = original.getOperations();
      const clonedOps = cloned.getOperations();

      expect(originalOps).toHaveLength(3); // filter, sort, slice
      expect(clonedOps).toHaveLength(2); // filter, sort only
    });

    it('should clear operations', () => {
      const pipeline = new DataPipeline()
        .filter({
          column: 'age',
          operator: 'greater_than',
          value: 30,
          type: 'number',
        })
        .sort([{ column: 'name', direction: 'asc', type: 'string' }]);

      expect(pipeline.getOperations()).toHaveLength(2);

      pipeline.clear();
      expect(pipeline.getOperations()).toHaveLength(0);
    });

    it('should estimate execution time', () => {
      const pipeline = new DataPipeline()
        .filter({
          column: 'age',
          operator: 'greater_than',
          value: 30,
          type: 'number',
        })
        .sort([{ column: 'name', direction: 'asc', type: 'string' }])
        .group({
          columns: ['city'],
          aggregations: [{ column: 'salary', function: 'avg' }],
        });

      const estimate = pipeline.estimateExecutionTime(1000);
      expect(estimate).toBeGreaterThan(0);
    });
  });

  describe('PipelineBuilder', () => {
    it('should create new pipeline', () => {
      const pipeline = PipelineBuilder.create();
      expect(pipeline).toBeInstanceOf(DataPipeline);
      expect(pipeline.getOperations()).toHaveLength(0);
    });

    it('should create executable pipeline from dataset', () => {
      const pipeline = PipelineBuilder.from(sampleDataset)
        .filter({
          column: 'city',
          operator: 'equals',
          value: 'New York',
          type: 'string',
        });

      const result = pipeline.execute(sampleDataset);
      expect(result.rows).toHaveLength(2); // Alice and Diana
    });

    it('should support async execution from dataset', async () => {
      const progressCallback = vi.fn();

      const pipeline = PipelineBuilder.from(sampleDataset)
        .filter({
          column: 'city',
          operator: 'equals',
          value: 'Los Angeles',
          type: 'string',
        });

      const result = await pipeline.executeAsync(sampleDataset, progressCallback);
      expect(result.rows).toHaveLength(2); // Bob and Eve
      expect(progressCallback).toHaveBeenCalled();
    });
  });

  describe('PipelineUtils', () => {
    it('should create filter pipeline', () => {
      const condition: FilterCondition = {
        column: 'age',
        operator: 'greater_than',
        value: 30,
        type: 'number',
      };

      const pipeline = PipelineUtils.createFilterPipeline(condition);
      const result = pipeline.execute(sampleDataset);

      expect(result.rows).toHaveLength(2); // Charlie and Eve
    });

    it('should create sort pipeline', () => {
      const pipeline = PipelineUtils.createSortPipeline('age', 'desc');
      const result = pipeline.execute(sampleDataset);

      expect(result.rows[0][0]).toBe('Charlie'); // age 35, highest
      expect(result.rows[4][0]).toBe('Bob'); // age 25, lowest
    });

    it('should create group pipeline', () => {
      const pipeline = PipelineUtils.createGroupPipeline(
        ['city'],
        [{ column: 'salary', function: 'avg', alias: 'avg_salary' }]
      );

      const result = pipeline.execute(sampleDataset);

      expect(result.columns).toEqual(['city', 'avg_salary']);
      expect(result.rows).toHaveLength(3); // 3 unique cities
    });
  });

  describe('Complex pipeline operations', () => {
    it('should handle complex data transformation pipeline', () => {
      const pipeline = new DataPipeline()
        // Filter out people under 28
        .filter({
          column: 'age',
          operator: 'greater_than_or_equal',
          value: 28,
          type: 'number',
        })
        // Add age category column
        .addColumn('age_category', (row) => {
          const age = row[1];
          return age >= 30 ? 'Senior' : 'Junior';
        })
        // Group by age category and calculate average salary
        .group({
          columns: ['age_category'],
          aggregations: [
            { column: 'salary', function: 'avg', alias: 'avg_salary' },
            { column: 'name', function: 'count', alias: 'count' },
          ],
        })
        // Sort by average salary descending
        .sort([{ column: 'avg_salary', direction: 'desc', type: 'number' }]);

      const result = pipeline.execute(sampleDataset);

      expect(result.columns).toEqual(['age_category', 'avg_salary', 'count']);
      expect(result.rows).toHaveLength(2); // Senior and Junior categories

      // Senior category should have higher average salary
      expect(result.rows[0][0]).toBe('Senior');
      expect(result.rows[0][1]).toBeGreaterThan(result.rows[1][1]);
    });

    it('should handle pipeline with column operations', () => {
      const pipeline = new DataPipeline()
        // Add full name column
        .addColumn('full_info', (row) => `${row[0]} (${row[2]})`, 1)
        // Remove original name column
        .removeColumns(['name'])
        // Rename columns
        .renameColumns({
          full_info: 'person_info',
          age: 'years',
        })
        // Filter and sort
        .filter({
          column: 'years',
          operator: 'greater_than',
          value: 25,
          type: 'number',
        })
        .sort([{ column: 'salary', direction: 'asc', type: 'number' }]);

      const result = pipeline.execute(sampleDataset);

      expect(result.columns).toEqual(['person_info', 'years', 'city', 'salary']);

      // After filtering (age > 25), we should have: Alice (30, 75000), Charlie (35, 80000), Diana (28, 70000), Eve (32, 85000)
      // After sorting by salary asc: Diana (70000), Alice (75000), Charlie (80000), Eve (85000)
      expect(result.rows[0][0]).toBe('Diana (New York)'); // Lowest salary among filtered
      expect(result.rows[result.rows.length - 1][0]).toBe('Eve (Los Angeles)'); // Highest salary
    });
  });

  describe('Error handling', () => {
    it('should handle errors in pipeline execution', () => {
      const pipeline = new DataPipeline()
        .group({
          columns: ['non_existent_column'],
          aggregations: [{ column: 'salary', function: 'avg' }],
        });

      expect(() => pipeline.execute(sampleDataset)).toThrow();
    });

    it('should handle invalid operations gracefully', () => {
      const pipeline = new DataPipeline()
        .group({
          columns: ['non_existent_column'],
          aggregations: [{ column: 'salary', function: 'avg' }],
        });

      expect(() => pipeline.execute(sampleDataset)).toThrow();
    });
  });
});