import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DataSampler,
  DataExporter,
  DataValidator,
  PerformanceMonitor,
  DataUtilities,
} from '../DataUtils';
import type { Dataset, DataSchema } from '../../types';

describe('DataUtils', () => {
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
        ['Frank', 29, 'Chicago', 72000],
        ['Grace', 31, 'New York', 78000],
        ['Henry', 27, 'Los Angeles', 68000],
      ],
      metadata: {
        rowCount: 8,
        columnCount: 4,
        types: { name: 'string', age: 'number', city: 'string', salary: 'number' },
        nullable: { name: false, age: false, city: false, salary: false },
        unique: { name: true, age: true, city: false, salary: true },
        created: new Date(),
        modified: new Date(),
      },
    };
  });

  describe('DataSampler', () => {
    describe('randomSample', () => {
      it('should return sample of specified size', () => {
        const sample = DataSampler.randomSample(sampleDataset, 3);
        
        expect(sample.rows).toHaveLength(3);
        expect(sample.columns).toEqual(sampleDataset.columns);
        expect(sample.metadata.rowCount).toBe(3);
      });

      it('should return full dataset if sample size >= dataset size', () => {
        const sample = DataSampler.randomSample(sampleDataset, 10);
        
        expect(sample.rows).toHaveLength(8);
        expect(sample).toEqual(sampleDataset);
      });

      it('should produce reproducible results with seed', () => {
        const sample1 = DataSampler.randomSample(sampleDataset, 3, 12345);
        const sample2 = DataSampler.randomSample(sampleDataset, 3, 12345);
        
        expect(sample1.rows).toEqual(sample2.rows);
      });

      it('should produce different results with different seeds', () => {
        const sample1 = DataSampler.randomSample(sampleDataset, 3, 12345);
        const sample2 = DataSampler.randomSample(sampleDataset, 3, 54321);
        
        expect(sample1.rows).not.toEqual(sample2.rows);
      });
    });

    describe('stratifiedSample', () => {
      it('should maintain proportions from original dataset', () => {
        const sample = DataSampler.stratifiedSample(sampleDataset, 'city', 6, 12345);
        
        expect(sample.rows).toHaveLength(6);
        
        // Count cities in sample
        const cityCounts = new Map<string, number>();
        sample.rows.forEach(row => {
          const city = row[2];
          cityCounts.set(city, (cityCounts.get(city) || 0) + 1);
        });
        
        // Should have representation from each city
        expect(cityCounts.size).toBeGreaterThan(1);
      });

      it('should throw error for non-existent column', () => {
        expect(() => {
          DataSampler.stratifiedSample(sampleDataset, 'non_existent', 3);
        }).toThrow('Column "non_existent" not found');
      });
    });

    describe('systematicSample', () => {
      it('should sample every nth row', () => {
        const sample = DataSampler.systematicSample(sampleDataset, 2, 0);
        
        expect(sample.rows).toHaveLength(4);
        expect(sample.rows[0]).toEqual(sampleDataset.rows[0]); // index 0
        expect(sample.rows[1]).toEqual(sampleDataset.rows[2]); // index 2
        expect(sample.rows[2]).toEqual(sampleDataset.rows[4]); // index 4
        expect(sample.rows[3]).toEqual(sampleDataset.rows[6]); // index 6
      });

      it('should start from specified index', () => {
        const sample = DataSampler.systematicSample(sampleDataset, 3, 1);
        
        expect(sample.rows[0]).toEqual(sampleDataset.rows[1]); // index 1
        expect(sample.rows[1]).toEqual(sampleDataset.rows[4]); // index 4
        expect(sample.rows[2]).toEqual(sampleDataset.rows[7]); // index 7
      });
    });
  });

  describe('DataExporter', () => {
    describe('toCSV', () => {
      it('should export dataset to CSV format', () => {
        const csv = DataExporter.toCSV(sampleDataset);
        
        const lines = csv.split('\n');
        expect(lines[0]).toBe('name,age,city,salary');
        expect(lines[1]).toBe('Alice,30,New York,75000');
        expect(lines.length).toBe(9); // header + 8 data rows
      });

      it('should handle custom delimiter', () => {
        const csv = DataExporter.toCSV(sampleDataset, { delimiter: ';' });
        
        const lines = csv.split('\n');
        expect(lines[0]).toBe('name;age;city;salary');
        expect(lines[1]).toBe('Alice;30;New York;75000');
      });

      it('should exclude headers when specified', () => {
        const csv = DataExporter.toCSV(sampleDataset, { includeHeaders: false });
        
        const lines = csv.split('\n');
        expect(lines[0]).toBe('Alice,30,New York,75000');
        expect(lines.length).toBe(8); // only data rows
      });

      it('should handle null values', () => {
        const datasetWithNulls: Dataset = {
          ...sampleDataset,
          rows: [['Alice', null, 'New York', 75000]],
          metadata: { ...sampleDataset.metadata, rowCount: 1 },
        };

        const csv = DataExporter.toCSV(datasetWithNulls, { nullValue: 'NULL' });
        
        const lines = csv.split('\n');
        expect(lines[1]).toBe('Alice,NULL,New York,75000');
      });

      it('should escape values containing delimiter', () => {
        const datasetWithCommas: Dataset = {
          columns: ['name', 'description'],
          rows: [['Alice', 'Lives in New York, NY']],
          metadata: {
            rowCount: 1,
            columnCount: 2,
            types: { name: 'string', description: 'string' },
            nullable: { name: false, description: false },
            unique: { name: true, description: true },
            created: new Date(),
            modified: new Date(),
          },
        };

        const csv = DataExporter.toCSV(datasetWithCommas);
        
        const lines = csv.split('\n');
        expect(lines[1]).toBe('Alice,"Lives in New York, NY"');
      });
    });

    describe('toJSON', () => {
      it('should export dataset as array of objects', () => {
        const json = DataExporter.toJSON(sampleDataset, 'objects');
        const parsed = JSON.parse(json);
        
        expect(Array.isArray(parsed)).toBe(true);
        expect(parsed).toHaveLength(8);
        expect(parsed[0]).toEqual({
          name: 'Alice',
          age: 30,
          city: 'New York',
          salary: 75000,
        });
      });

      it('should export dataset as array format', () => {
        const json = DataExporter.toJSON(sampleDataset, 'array');
        const parsed = JSON.parse(json);
        
        expect(parsed.columns).toEqual(sampleDataset.columns);
        expect(parsed.rows).toEqual(sampleDataset.rows);
        expect(parsed.metadata).toBeDefined();
      });
    });

    describe('toTSV', () => {
      it('should export dataset to TSV format', () => {
        const tsv = DataExporter.toTSV(sampleDataset);
        
        const lines = tsv.split('\n');
        expect(lines[0]).toBe('name\tage\tcity\tsalary');
        expect(lines[1]).toBe('Alice\t30\tNew York\t75000');
      });
    });

    describe('createDownloadBlob', () => {
      it('should create CSV blob', () => {
        const blob = DataExporter.createDownloadBlob(sampleDataset, 'csv');
        
        expect(blob.type).toBe('text/csv');
        expect(blob.size).toBeGreaterThan(0);
      });

      it('should create JSON blob', () => {
        const blob = DataExporter.createDownloadBlob(sampleDataset, 'json');
        
        expect(blob.type).toBe('application/json');
        expect(blob.size).toBeGreaterThan(0);
      });

      it('should create TSV blob', () => {
        const blob = DataExporter.createDownloadBlob(sampleDataset, 'tsv');
        
        expect(blob.type).toBe('text/tab-separated-values');
        expect(blob.size).toBeGreaterThan(0);
      });

      it('should throw error for unsupported format', () => {
        expect(() => {
          DataExporter.createDownloadBlob(sampleDataset, 'xml' as any);
        }).toThrow('Unsupported export format: xml');
      });
    });
  });

  describe('DataValidator', () => {
    describe('validateSchema', () => {
      it('should validate dataset against schema successfully', () => {
        const schema: DataSchema = {
          requiredColumns: ['name', 'age'],
          columnTypes: { name: 'string', age: 'number' },
          minRows: 1,
          maxRows: 100,
        };

        const result = DataValidator.validateSchema(sampleDataset, schema);
        
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should detect missing required columns', () => {
        const schema: DataSchema = {
          requiredColumns: ['name', 'age', 'missing_column'],
        };

        const result = DataValidator.validateSchema(sampleDataset, schema);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].message).toContain('missing_column');
        expect(result.errors[0].code).toBe('MISSING_COLUMNS');
      });

      it('should detect insufficient rows', () => {
        const schema: DataSchema = {
          minRows: 10,
        };

        const result = DataValidator.validateSchema(sampleDataset, schema);
        
        expect(result.valid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].code).toBe('INSUFFICIENT_ROWS');
      });

      it('should warn about excessive rows', () => {
        const schema: DataSchema = {
          maxRows: 5,
        };

        const result = DataValidator.validateSchema(sampleDataset, schema);
        
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings![0].code).toBe('EXCESSIVE_ROWS');
      });

      it('should warn about type mismatches', () => {
        const schema: DataSchema = {
          columnTypes: { age: 'string' }, // age is actually number
        };

        const result = DataValidator.validateSchema(sampleDataset, schema);
        
        expect(result.valid).toBe(true);
        expect(result.warnings).toHaveLength(1);
        expect(result.warnings![0].code).toBe('TYPE_MISMATCH');
      });
    });

    describe('checkDataQuality', () => {
      it('should detect empty dataset', () => {
        const emptyDataset: Dataset = {
          columns: ['name'],
          rows: [],
          metadata: {
            rowCount: 0,
            columnCount: 1,
            types: {},
            nullable: {},
            unique: {},
            created: new Date(),
            modified: new Date(),
          },
        };

        const report = DataValidator.checkDataQuality(emptyDataset);
        
        expect(report.score).toBe(0);
        expect(report.issues).toHaveLength(1);
        expect(report.issues[0].type).toBe('empty_dataset');
        expect(report.issues[0].severity).toBe('error');
      });

      it('should detect high missing values', () => {
        const datasetWithMissing: Dataset = {
          columns: ['name', 'value'],
          rows: [
            ['Alice', 100],
            ['Bob', null],
            ['Charlie', null],
            ['Diana', null],
          ],
          metadata: {
            rowCount: 4,
            columnCount: 2,
            types: { name: 'string', value: 'number' },
            nullable: { name: false, value: true },
            unique: { name: true, value: false },
            created: new Date(),
            modified: new Date(),
          },
        };

        const report = DataValidator.checkDataQuality(datasetWithMissing);
        
        expect(report.issues.some(i => i.type === 'high_missing_values')).toBe(true);
        expect(report.score).toBeLessThan(100);
      });

      it('should detect duplicate rows', () => {
        const datasetWithDuplicates: Dataset = {
          columns: ['name', 'value'],
          rows: [
            ['Alice', 100],
            ['Bob', 200],
            ['Alice', 100], // duplicate
          ],
          metadata: {
            rowCount: 3,
            columnCount: 2,
            types: { name: 'string', value: 'number' },
            nullable: { name: false, value: false },
            unique: { name: false, value: false },
            created: new Date(),
            modified: new Date(),
          },
        };

        const report = DataValidator.checkDataQuality(datasetWithDuplicates);
        
        expect(report.issues.some(i => i.type === 'duplicate_rows')).toBe(true);
        expect(report.score).toBeLessThan(100);
      });

      it('should return high score for clean data', () => {
        const report = DataValidator.checkDataQuality(sampleDataset);
        
        expect(report.score).toBeGreaterThan(90);
        expect(report.issues.filter(i => i.severity === 'error')).toHaveLength(0);
      });
    });
  });

  describe('PerformanceMonitor', () => {
    beforeEach(() => {
      PerformanceMonitor.clearMetrics();
    });

    describe('timer functionality', () => {
      it('should measure operation duration', () => {
        const operationId = 'test-operation';
        
        PerformanceMonitor.startTimer(operationId);
        
        // Simulate some work
        const start = performance.now();
        while (performance.now() - start < 10) {
          // busy wait for ~10ms
        }
        
        const metric = PerformanceMonitor.endTimer(operationId);
        
        expect(metric.operationId).toBe(operationId);
        expect(metric.duration).toBeGreaterThan(5);
        expect(metric.timestamp).toBeInstanceOf(Date);
      });

      it('should throw error for non-existent timer', () => {
        expect(() => {
          PerformanceMonitor.endTimer('non-existent');
        }).toThrow('Timer not found for operation: non-existent');
      });

      it('should store metadata with metrics', () => {
        const operationId = 'test-with-metadata';
        const metadata = { rows: 1000, operation: 'filter' };
        
        PerformanceMonitor.startTimer(operationId);
        const metric = PerformanceMonitor.endTimer(operationId, metadata);
        
        expect(metric.metadata).toEqual(metadata);
      });
    });

    describe('metrics management', () => {
      it('should store and retrieve metrics', () => {
        PerformanceMonitor.startTimer('op1');
        PerformanceMonitor.endTimer('op1');
        
        PerformanceMonitor.startTimer('op2');
        PerformanceMonitor.endTimer('op2');
        
        const metrics = PerformanceMonitor.getMetrics();
        expect(metrics).toHaveLength(2);
        expect(metrics.map(m => m.operationId)).toContain('op1');
        expect(metrics.map(m => m.operationId)).toContain('op2');
      });

      it('should clear all metrics', () => {
        PerformanceMonitor.startTimer('op1');
        PerformanceMonitor.endTimer('op1');
        
        expect(PerformanceMonitor.getMetrics()).toHaveLength(1);
        
        PerformanceMonitor.clearMetrics();
        expect(PerformanceMonitor.getMetrics()).toHaveLength(0);
      });
    });

    describe('memory measurement', () => {
      it('should measure dataset memory usage', () => {
        const usage = PerformanceMonitor.measureDatasetMemory(sampleDataset);
        
        expect(usage.bytes).toBeGreaterThan(0);
        expect(usage.kilobytes).toBe(usage.bytes / 1024);
        expect(usage.megabytes).toBe(usage.bytes / (1024 * 1024));
        expect(usage.rowCount).toBe(sampleDataset.rows.length);
        expect(usage.columnCount).toBe(sampleDataset.columns.length);
      });

      it('should handle different data types in memory calculation', () => {
        const mixedDataset: Dataset = {
          columns: ['string', 'number', 'boolean', 'date'],
          rows: [
            ['hello', 42, true, new Date()],
            ['world', 3.14, false, new Date()],
          ],
          metadata: {
            rowCount: 2,
            columnCount: 4,
            types: { string: 'string', number: 'number', boolean: 'boolean', date: 'date' },
            nullable: { string: false, number: false, boolean: false, date: false },
            unique: { string: true, number: true, boolean: false, date: false },
            created: new Date(),
            modified: new Date(),
          },
        };

        const usage = PerformanceMonitor.measureDatasetMemory(mixedDataset);
        expect(usage.bytes).toBeGreaterThan(0);
      });
    });
  });

  describe('DataUtilities', () => {
    it('should provide access to all utility classes', () => {
      expect(DataUtilities.sampler).toBe(DataSampler);
      expect(DataUtilities.exporter).toBe(DataExporter);
      expect(DataUtilities.validator).toBe(DataValidator);
      expect(DataUtilities.performance).toBe(PerformanceMonitor);
    });

    it('should allow using utilities through the main export', () => {
      const sample = DataUtilities.sampler.randomSample(sampleDataset, 3);
      expect(sample.rows).toHaveLength(3);

      const csv = DataUtilities.exporter.toCSV(sampleDataset);
      expect(csv).toContain('name,age,city,salary');

      const report = DataUtilities.validator.checkDataQuality(sampleDataset);
      expect(report.score).toBeGreaterThan(0);

      const usage = DataUtilities.performance.measureDatasetMemory(sampleDataset);
      expect(usage.bytes).toBeGreaterThan(0);
    });
  });
});