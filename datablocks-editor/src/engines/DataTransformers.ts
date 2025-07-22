import type { Dataset, PrimitiveType } from '../types';

/**
 * Advanced data transformation utilities
 */
export class DataTransformers {
  /**
   * Pivot dataset - transform rows to columns
   */
  static pivot(
    dataset: Dataset,
    indexColumn: string,
    pivotColumn: string,
    valueColumn: string,
    aggregationFunction: 'sum' | 'avg' | 'count' | 'min' | 'max' = 'sum'
  ): Dataset {
    const indexColIdx = dataset.columns.indexOf(indexColumn);
    const pivotColIdx = dataset.columns.indexOf(pivotColumn);
    const valueColIdx = dataset.columns.indexOf(valueColumn);

    if (indexColIdx === -1 || pivotColIdx === -1 || valueColIdx === -1) {
      throw new Error('One or more specified columns not found');
    }

    // Get unique values for pivot column
    const pivotValues = Array.from(
      new Set(dataset.rows.map(row => row[pivotColIdx]))
    ).sort();

    // Group data by index column
    const groups = new Map<any, any[][]>();
    dataset.rows.forEach(row => {
      const indexValue = row[indexColIdx];
      if (!groups.has(indexValue)) {
        groups.set(indexValue, []);
      }
      groups.get(indexValue)!.push(row);
    });

    // Build result columns
    const resultColumns = [indexColumn, ...pivotValues.map(String)];
    const resultRows: any[][] = [];

    // Process each group
    groups.forEach((groupRows, indexValue) => {
      const resultRow = [indexValue];
      
      // For each pivot value, calculate aggregation
      pivotValues.forEach(pivotValue => {
        const matchingRows = groupRows.filter(row => row[pivotColIdx] === pivotValue);
        const values = matchingRows.map(row => row[valueColIdx]).filter(v => v != null);
        
        let aggregatedValue = null;
        if (values.length > 0) {
          switch (aggregationFunction) {
            case 'sum':
              aggregatedValue = values.reduce((sum, val) => sum + (Number(val) || 0), 0);
              break;
            case 'avg':
              aggregatedValue = values.reduce((sum, val) => sum + (Number(val) || 0), 0) / values.length;
              break;
            case 'count':
              aggregatedValue = values.length;
              break;
            case 'min':
              aggregatedValue = Math.min(...values.map(v => Number(v)).filter(v => !isNaN(v)));
              break;
            case 'max':
              aggregatedValue = Math.max(...values.map(v => Number(v)).filter(v => !isNaN(v)));
              break;
          }
        }
        
        resultRow.push(aggregatedValue);
      });
      
      resultRows.push(resultRow);
    });

    return this.createDataset(resultColumns, resultRows);
  }

  /**
   * Unpivot dataset - transform columns to rows
   */
  static unpivot(
    dataset: Dataset,
    idColumns: string[],
    valueColumns: string[],
    variableName: string = 'variable',
    valueName: string = 'value'
  ): Dataset {
    const idColIndices = idColumns.map(col => dataset.columns.indexOf(col));
    const valueColIndices = valueColumns.map(col => dataset.columns.indexOf(col));

    if (idColIndices.some(idx => idx === -1) || valueColIndices.some(idx => idx === -1)) {
      throw new Error('One or more specified columns not found');
    }

    const resultColumns = [...idColumns, variableName, valueName];
    const resultRows: any[][] = [];

    dataset.rows.forEach(row => {
      const idValues = idColIndices.map(idx => row[idx]);
      
      valueColumns.forEach((valueCol, valueIdx) => {
        const valueColIdx = valueColIndices[valueIdx];
        const value = row[valueColIdx];
        
        resultRows.push([...idValues, valueCol, value]);
      });
    });

    return this.createDataset(resultColumns, resultRows);
  }

  /**
   * Transpose dataset - swap rows and columns
   */
  static transpose(dataset: Dataset, useFirstColumnAsHeaders: boolean = false): Dataset {
    if (dataset.rows.length === 0) {
      return this.createDataset([], []);
    }

    let resultColumns: string[];
    let resultRows: any[][];

    if (useFirstColumnAsHeaders) {
      // Use first column values as new column headers
      resultColumns = ['column', ...dataset.rows.map(row => String(row[0]))];
      resultRows = [];
      
      // Skip first column, transpose the rest
      for (let colIdx = 1; colIdx < dataset.columns.length; colIdx++) {
        const row = [dataset.columns[colIdx]];
        for (let rowIdx = 0; rowIdx < dataset.rows.length; rowIdx++) {
          row.push(dataset.rows[rowIdx][colIdx]);
        }
        resultRows.push(row);
      }
    } else {
      // Use row indices as column headers
      resultColumns = ['column', ...dataset.rows.map((_, idx) => `row_${idx}`)];
      resultRows = [];
      
      for (let colIdx = 0; colIdx < dataset.columns.length; colIdx++) {
        const row = [dataset.columns[colIdx]];
        for (let rowIdx = 0; rowIdx < dataset.rows.length; rowIdx++) {
          row.push(dataset.rows[rowIdx][colIdx]);
        }
        resultRows.push(row);
      }
    }

    return this.createDataset(resultColumns, resultRows);
  }

  /**
   * Fill missing values with specified strategy
   */
  static fillMissing(
    dataset: Dataset,
    strategy: 'forward' | 'backward' | 'mean' | 'median' | 'mode' | 'constant',
    constantValue?: any,
    columns?: string[]
  ): Dataset {
    const targetColumns = columns || dataset.columns;
    const targetIndices = targetColumns.map(col => dataset.columns.indexOf(col));
    
    const newRows = dataset.rows.map(row => [...row]);

    targetIndices.forEach(colIdx => {
      if (colIdx === -1) return;

      const columnValues = newRows.map(row => row[colIdx]);
      const nonNullValues = columnValues.filter(v => v != null);

      switch (strategy) {
        case 'forward':
          this.fillForward(newRows, colIdx);
          break;
        case 'backward':
          this.fillBackward(newRows, colIdx);
          break;
        case 'mean':
          if (nonNullValues.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
            const mean = nonNullValues.reduce((sum, val) => sum + Number(val), 0) / nonNullValues.length;
            this.fillConstant(newRows, colIdx, mean);
          }
          break;
        case 'median':
          if (nonNullValues.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
            const sorted = nonNullValues.map(v => Number(v)).sort((a, b) => a - b);
            const median = sorted.length % 2 === 0
              ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
              : sorted[Math.floor(sorted.length / 2)];
            this.fillConstant(newRows, colIdx, median);
          }
          break;
        case 'mode':
          const mode = this.calculateMode(nonNullValues);
          this.fillConstant(newRows, colIdx, mode);
          break;
        case 'constant':
          this.fillConstant(newRows, colIdx, constantValue);
          break;
      }
    });

    return {
      ...dataset,
      rows: newRows,
      metadata: {
        ...dataset.metadata,
        modified: new Date(),
      },
    };
  }

  /**
   * Detect and remove outliers using IQR method
   */
  static removeOutliers(
    dataset: Dataset,
    column: string,
    method: 'iqr' | 'zscore' = 'iqr',
    threshold: number = 1.5
  ): Dataset {
    const colIdx = dataset.columns.indexOf(column);
    if (colIdx === -1) {
      throw new Error(`Column "${column}" not found`);
    }

    const values = dataset.rows
      .map(row => row[colIdx])
      .filter(v => v != null && !isNaN(Number(v)))
      .map(v => Number(v));

    if (values.length === 0) {
      return dataset;
    }

    let isOutlier: (value: number) => boolean;

    if (method === 'iqr') {
      const sorted = [...values].sort((a, b) => a - b);
      const q1 = this.percentile(sorted, 25);
      const q3 = this.percentile(sorted, 75);
      const iqr = q3 - q1;
      const lowerBound = q1 - threshold * iqr;
      const upperBound = q3 + threshold * iqr;
      
      isOutlier = (value: number) => value < lowerBound || value > upperBound;
    } else {
      // Z-score method
      const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
      const stdDev = Math.sqrt(
        values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
      );
      
      isOutlier = (value: number) => Math.abs((value - mean) / stdDev) > threshold;
    }

    const filteredRows = dataset.rows.filter(row => {
      const value = row[colIdx];
      if (value == null || isNaN(Number(value))) {
        return true; // Keep non-numeric values
      }
      return !isOutlier(Number(value));
    });

    return {
      ...dataset,
      rows: filteredRows,
      metadata: {
        ...dataset.metadata,
        rowCount: filteredRows.length,
        modified: new Date(),
      },
    };
  }

  /**
   * Normalize numeric columns
   */
  static normalize(
    dataset: Dataset,
    columns: string[],
    method: 'minmax' | 'zscore' | 'robust' = 'minmax'
  ): Dataset {
    const newRows = dataset.rows.map(row => [...row]);
    
    columns.forEach(column => {
      const colIdx = dataset.columns.indexOf(column);
      if (colIdx === -1) return;

      const values = newRows
        .map(row => row[colIdx])
        .filter(v => v != null && !isNaN(Number(v)))
        .map(v => Number(v));

      if (values.length === 0) return;

      let normalizeValue: (value: number) => number;

      switch (method) {
        case 'minmax':
          const min = Math.min(...values);
          const max = Math.max(...values);
          const range = max - min;
          normalizeValue = (value: number) => range === 0 ? 0 : (value - min) / range;
          break;
        
        case 'zscore':
          const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
          const stdDev = Math.sqrt(
            values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
          );
          normalizeValue = (value: number) => stdDev === 0 ? 0 : (value - mean) / stdDev;
          break;
        
        case 'robust':
          const sorted = [...values].sort((a, b) => a - b);
          const median = this.percentile(sorted, 50);
          const mad = this.medianAbsoluteDeviation(values, median);
          normalizeValue = (value: number) => mad === 0 ? 0 : (value - median) / mad;
          break;
      }

      newRows.forEach(row => {
        if (row[colIdx] != null && !isNaN(Number(row[colIdx]))) {
          row[colIdx] = normalizeValue(Number(row[colIdx]));
        }
      });
    });

    return {
      ...dataset,
      rows: newRows,
      metadata: {
        ...dataset.metadata,
        modified: new Date(),
      },
    };
  }

  // Helper methods
  private static fillForward(rows: any[][], colIdx: number): void {
    let lastValue = null;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][colIdx] != null) {
        lastValue = rows[i][colIdx];
      } else if (lastValue != null) {
        rows[i][colIdx] = lastValue;
      }
    }
  }

  private static fillBackward(rows: any[][], colIdx: number): void {
    let nextValue = null;
    for (let i = rows.length - 1; i >= 0; i--) {
      if (rows[i][colIdx] != null) {
        nextValue = rows[i][colIdx];
      } else if (nextValue != null) {
        rows[i][colIdx] = nextValue;
      }
    }
  }

  private static fillConstant(rows: any[][], colIdx: number, value: any): void {
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][colIdx] == null) {
        rows[i][colIdx] = value;
      }
    }
  }

  private static calculateMode(values: any[]): any {
    const frequency = new Map<any, number>();
    values.forEach(value => {
      frequency.set(value, (frequency.get(value) || 0) + 1);
    });

    let maxFreq = 0;
    let mode = null;
    frequency.forEach((freq, value) => {
      if (freq > maxFreq) {
        maxFreq = freq;
        mode = value;
      }
    });

    return mode;
  }

  private static percentile(sortedValues: number[], percentile: number): number {
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index % 1;

    if (upper >= sortedValues.length) {
      return sortedValues[sortedValues.length - 1];
    }

    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private static medianAbsoluteDeviation(values: number[], median: number): number {
    const deviations = values.map(value => Math.abs(value - median));
    const sortedDeviations = deviations.sort((a, b) => a - b);
    return this.percentile(sortedDeviations, 50);
  }

  private static createDataset(columns: string[], rows: any[][]): Dataset {
    return {
      columns,
      rows,
      metadata: {
        rowCount: rows.length,
        columnCount: columns.length,
        types: {},
        nullable: {},
        unique: {},
        created: new Date(),
        modified: new Date(),
      },
    };
  }
}

// Export utility functions for common transformations
export const DataTransformUtils = {
  pivot: DataTransformers.pivot.bind(DataTransformers),
  unpivot: DataTransformers.unpivot.bind(DataTransformers),
  transpose: DataTransformers.transpose.bind(DataTransformers),
  fillMissing: DataTransformers.fillMissing.bind(DataTransformers),
  removeOutliers: DataTransformers.removeOutliers.bind(DataTransformers),
  normalize: DataTransformers.normalize.bind(DataTransformers),
};