import type { Dataset, PrimitiveType } from '../types';

/**
 * Additional data processing utilities to complement the core engine
 */

// ============================================================================
// DATA SAMPLING UTILITIES
// ============================================================================

export class DataSampler {
  /**
   * Random sampling from dataset
   */
  static randomSample(dataset: Dataset, sampleSize: number, seed?: number): Dataset {
    if (sampleSize >= dataset.rows.length) {
      return { ...dataset };
    }

    // Simple seeded random number generator for reproducible results
    let random = seed ? this.seededRandom(seed) : Math.random;

    const indices = Array.from({ length: dataset.rows.length }, (_, i) => i);
    
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const sampledRows = indices
      .slice(0, sampleSize)
      .sort((a, b) => a - b) // Maintain original order
      .map(i => dataset.rows[i]);

    return {
      ...dataset,
      rows: sampledRows,
      metadata: {
        ...dataset.metadata,
        rowCount: sampledRows.length,
        modified: new Date(),
      },
    };
  }

  /**
   * Stratified sampling based on a column
   */
  static stratifiedSample(
    dataset: Dataset,
    stratifyColumn: string,
    sampleSize: number,
    seed?: number
  ): Dataset {
    const columnIndex = dataset.columns.indexOf(stratifyColumn);
    if (columnIndex === -1) {
      throw new Error(`Column "${stratifyColumn}" not found`);
    }

    // Group rows by stratify column values
    const groups = new Map<any, number[]>();
    dataset.rows.forEach((row, index) => {
      const value = row[columnIndex];
      if (!groups.has(value)) {
        groups.set(value, []);
      }
      groups.get(value)!.push(index);
    });

    // Calculate sample size per group
    const totalRows = dataset.rows.length;
    const sampledIndices: number[] = [];

    groups.forEach((indices, value) => {
      const groupSize = indices.length;
      const groupSampleSize = Math.round((groupSize / totalRows) * sampleSize);
      
      if (groupSampleSize > 0) {
        const groupSample = this.randomSample(
          {
            columns: ['index'],
            rows: indices.map(i => [i]),
            metadata: {
              rowCount: indices.length,
              columnCount: 1,
              types: { index: 'number' },
              nullable: { index: false },
              unique: { index: true },
              created: new Date(),
              modified: new Date(),
            },
          },
          Math.min(groupSampleSize, groupSize),
          seed
        );
        
        sampledIndices.push(...groupSample.rows.map(row => row[0]));
      }
    });

    const sampledRows = sampledIndices
      .sort((a, b) => a - b)
      .map(i => dataset.rows[i]);

    return {
      ...dataset,
      rows: sampledRows,
      metadata: {
        ...dataset.metadata,
        rowCount: sampledRows.length,
        modified: new Date(),
      },
    };
  }

  /**
   * Systematic sampling (every nth row)
   */
  static systematicSample(dataset: Dataset, interval: number, start: number = 0): Dataset {
    const sampledRows: any[][] = [];
    
    for (let i = start; i < dataset.rows.length; i += interval) {
      sampledRows.push(dataset.rows[i]);
    }

    return {
      ...dataset,
      rows: sampledRows,
      metadata: {
        ...dataset.metadata,
        rowCount: sampledRows.length,
        modified: new Date(),
      },
    };
  }

  private static seededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }
}

// ============================================================================
// DATA EXPORT UTILITIES
// ============================================================================

export class DataExporter {
  /**
   * Export dataset to CSV format
   */
  static toCSV(dataset: Dataset, options: CSVExportOptions = {}): string {
    const {
      delimiter = ',',
      quote = '"',
      includeHeaders = true,
      nullValue = '',
    } = options;

    const lines: string[] = [];

    // Add headers
    if (includeHeaders) {
      const headerLine = dataset.columns
        .map(col => this.escapeCSVValue(col, delimiter, quote))
        .join(delimiter);
      lines.push(headerLine);
    }

    // Add data rows
    dataset.rows.forEach(row => {
      const line = row
        .map(cell => {
          if (cell == null) return nullValue;
          return this.escapeCSVValue(String(cell), delimiter, quote);
        })
        .join(delimiter);
      lines.push(line);
    });

    return lines.join('\n');
  }

  /**
   * Export dataset to JSON format
   */
  static toJSON(dataset: Dataset, format: 'array' | 'objects' = 'objects'): string {
    if (format === 'objects') {
      const objects = dataset.rows.map(row => {
        const obj: Record<string, any> = {};
        dataset.columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });
      return JSON.stringify(objects, null, 2);
    } else {
      return JSON.stringify({
        columns: dataset.columns,
        rows: dataset.rows,
        metadata: dataset.metadata,
      }, null, 2);
    }
  }

  /**
   * Export dataset to TSV format
   */
  static toTSV(dataset: Dataset, options: Omit<CSVExportOptions, 'delimiter'> = {}): string {
    return this.toCSV(dataset, { ...options, delimiter: '\t' });
  }

  /**
   * Create downloadable blob from dataset
   */
  static createDownloadBlob(
    dataset: Dataset,
    format: 'csv' | 'json' | 'tsv',
    options?: CSVExportOptions
  ): Blob {
    let content: string;
    let mimeType: string;

    switch (format) {
      case 'csv':
        content = this.toCSV(dataset, options);
        mimeType = 'text/csv';
        break;
      case 'tsv':
        content = this.toTSV(dataset, options);
        mimeType = 'text/tab-separated-values';
        break;
      case 'json':
        content = this.toJSON(dataset);
        mimeType = 'application/json';
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    return new Blob([content], { type: mimeType });
  }

  private static escapeCSVValue(value: string, delimiter: string, quote: string): string {
    // Check if escaping is needed
    if (
      value.includes(delimiter) ||
      value.includes(quote) ||
      value.includes('\n') ||
      value.includes('\r')
    ) {
      // Escape quotes by doubling them
      const escapedValue = value.replace(new RegExp(quote, 'g'), quote + quote);
      return quote + escapedValue + quote;
    }
    return value;
  }
}

// ============================================================================
// DATA VALIDATION UTILITIES
// ============================================================================

export class DataValidator {
  /**
   * Validate dataset against schema
   */
  static validateSchema(dataset: Dataset, schema: DataSchema): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // Check column count
    if (schema.requiredColumns && dataset.columns.length < schema.requiredColumns.length) {
      errors.push({
        field: 'columns',
        message: `Expected at least ${schema.requiredColumns.length} columns, got ${dataset.columns.length}`,
        code: 'INSUFFICIENT_COLUMNS',
      });
    }

    // Check required columns
    if (schema.requiredColumns) {
      const missingColumns = schema.requiredColumns.filter(
        col => !dataset.columns.includes(col)
      );
      if (missingColumns.length > 0) {
        errors.push({
          field: 'columns',
          message: `Missing required columns: ${missingColumns.join(', ')}`,
          code: 'MISSING_COLUMNS',
        });
      }
    }

    // Validate column types
    if (schema.columnTypes) {
      Object.entries(schema.columnTypes).forEach(([column, expectedType]) => {
        if (dataset.columns.includes(column)) {
          const actualType = dataset.metadata.types[column];
          if (actualType && actualType !== expectedType) {
            warnings.push({
              field: column,
              message: `Expected type ${expectedType}, got ${actualType}`,
              code: 'TYPE_MISMATCH',
            });
          }
        }
      });
    }

    // Check row count constraints
    if (schema.minRows && dataset.rows.length < schema.minRows) {
      errors.push({
        field: 'rows',
        message: `Expected at least ${schema.minRows} rows, got ${dataset.rows.length}`,
        code: 'INSUFFICIENT_ROWS',
      });
    }

    if (schema.maxRows && dataset.rows.length > schema.maxRows) {
      warnings.push({
        field: 'rows',
        message: `Dataset has ${dataset.rows.length} rows, which exceeds recommended maximum of ${schema.maxRows}`,
        code: 'EXCESSIVE_ROWS',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Check data quality issues
   */
  static checkDataQuality(dataset: Dataset): DataQualityReport {
    const issues: DataQualityIssue[] = [];

    // Check for empty dataset
    if (dataset.rows.length === 0) {
      issues.push({
        type: 'empty_dataset',
        severity: 'error',
        message: 'Dataset is empty',
        affectedRows: [],
        affectedColumns: [],
      });
      return { issues, score: 0 };
    }

    // Check for missing values
    dataset.columns.forEach((column, colIndex) => {
      const nullCount = dataset.rows.filter(row => row[colIndex] == null).length;
      const nullPercentage = (nullCount / dataset.rows.length) * 100;

      if (nullPercentage > 50) {
        issues.push({
          type: 'high_missing_values',
          severity: 'error',
          message: `Column "${column}" has ${nullPercentage.toFixed(1)}% missing values`,
          affectedColumns: [column],
          affectedRows: [],
        });
      } else if (nullPercentage > 20) {
        issues.push({
          type: 'moderate_missing_values',
          severity: 'warning',
          message: `Column "${column}" has ${nullPercentage.toFixed(1)}% missing values`,
          affectedColumns: [column],
          affectedRows: [],
        });
      }
    });

    // Check for duplicate rows
    const rowStrings = dataset.rows.map(row => JSON.stringify(row));
    const duplicateCount = rowStrings.length - new Set(rowStrings).size;
    if (duplicateCount > 0) {
      issues.push({
        type: 'duplicate_rows',
        severity: 'warning',
        message: `Found ${duplicateCount} duplicate rows`,
        affectedRows: [],
        affectedColumns: [],
      });
    }

    // Calculate overall quality score
    const errorCount = issues.filter(i => i.severity === 'error').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    const score = Math.max(0, 100 - (errorCount * 20) - (warningCount * 5));

    return { issues, score };
  }
}

// ============================================================================
// PERFORMANCE MONITORING UTILITIES
// ============================================================================

export class PerformanceMonitor {
  private static timers = new Map<string, number>();
  private static metrics = new Map<string, PerformanceMetric>();

  /**
   * Start timing an operation
   */
  static startTimer(operationId: string): void {
    this.timers.set(operationId, performance.now());
  }

  /**
   * End timing and record metric
   */
  static endTimer(operationId: string, metadata?: Record<string, any>): PerformanceMetric {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      throw new Error(`Timer not found for operation: ${operationId}`);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    const metric: PerformanceMetric = {
      operationId,
      duration,
      timestamp: new Date(),
      metadata: metadata || {},
    };

    this.metrics.set(operationId, metric);
    this.timers.delete(operationId);

    return metric;
  }

  /**
   * Get performance metrics
   */
  static getMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Clear all metrics
   */
  static clearMetrics(): void {
    this.metrics.clear();
    this.timers.clear();
  }

  /**
   * Measure memory usage of a dataset
   */
  static measureDatasetMemory(dataset: Dataset): MemoryUsage {
    let totalBytes = 0;

    // Estimate memory usage
    dataset.rows.forEach(row => {
      row.forEach(cell => {
        if (typeof cell === 'string') {
          totalBytes += cell.length * 2; // UTF-16
        } else if (typeof cell === 'number') {
          totalBytes += 8; // 64-bit number
        } else if (typeof cell === 'boolean') {
          totalBytes += 1;
        } else if (cell instanceof Date) {
          totalBytes += 8;
        } else {
          totalBytes += 8; // rough estimate
        }
      });
    });

    // Add overhead for arrays and objects
    totalBytes += dataset.rows.length * 8; // array overhead
    totalBytes += dataset.columns.length * 20; // string overhead

    return {
      bytes: totalBytes,
      kilobytes: totalBytes / 1024,
      megabytes: totalBytes / (1024 * 1024),
      rowCount: dataset.rows.length,
      columnCount: dataset.columns.length,
    };
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface CSVExportOptions {
  delimiter?: string;
  quote?: string;
  includeHeaders?: boolean;
  nullValue?: string;
}

export interface DataSchema {
  requiredColumns?: string[];
  columnTypes?: Record<string, PrimitiveType>;
  minRows?: number;
  maxRows?: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings?: ValidationWarning[];
}

export interface ValidationError {
  field?: string;
  message: string;
  code?: string;
}

export interface ValidationWarning {
  field?: string;
  message: string;
  code?: string;
}

export interface DataQualityReport {
  issues: DataQualityIssue[];
  score: number;
}

export interface DataQualityIssue {
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  affectedRows: number[];
  affectedColumns: string[];
}

export interface PerformanceMetric {
  operationId: string;
  duration: number;
  timestamp: Date;
  metadata: Record<string, any>;
}

export interface MemoryUsage {
  bytes: number;
  kilobytes: number;
  megabytes: number;
  rowCount: number;
  columnCount: number;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export const DataUtilities = {
  sampler: DataSampler,
  exporter: DataExporter,
  validator: DataValidator,
  performance: PerformanceMonitor,
};