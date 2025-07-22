import type {
  Dataset,
  FilterCondition,
  CompoundFilterCondition,
  SortConfig,
  GroupConfig,
  JoinConfig,
  JoinType,
  AggregationFunction,
  PrimitiveType,
} from '../types';

/**
 * Core data processing engine for DataBlocks
 * Provides comprehensive data manipulation capabilities
 */
export class DataProcessor {
  /**
   * Filter dataset based on conditions
   */
  filter(
    dataset: Dataset,
    condition: FilterCondition | CompoundFilterCondition
  ): Dataset {
    const filteredRows = dataset.rows.filter(row =>
      this.evaluateFilterCondition(row, dataset.columns, condition)
    );

    return this.createDerivedDataset(dataset, filteredRows);
  }

  /**
   * Sort dataset by one or more columns
   */
  sort(dataset: Dataset, sortConfigs: SortConfig[]): Dataset {
    const sortedRows = [...dataset.rows].sort((a, b) => {
      for (const config of sortConfigs) {
        const columnIndex = dataset.columns.indexOf(config.column);
        if (columnIndex === -1) continue;

        const aValue = a[columnIndex];
        const bValue = b[columnIndex];
        
        const comparison = this.compareValues(aValue, bValue, config.type);
        if (comparison !== 0) {
          return config.direction === 'desc' ? -comparison : comparison;
        }
      }
      return 0;
    });

    return this.createDerivedDataset(dataset, sortedRows);
  }

  /**
   * Group dataset and apply aggregations
   */
  group(dataset: Dataset, config: GroupConfig): Dataset {
    const { columns: groupColumns, aggregations } = config;
    
    // Validate group columns exist
    const missingColumns = groupColumns.filter(col => !dataset.columns.includes(col));
    if (missingColumns.length > 0) {
      throw new Error(`Group columns not found: ${missingColumns.join(', ')}`);
    }

    // Group rows by specified columns
    const groups = new Map<string, any[][]>();
    
    dataset.rows.forEach(row => {
      const groupKey = groupColumns.map(col => {
        const index = dataset.columns.indexOf(col);
        return row[index];
      }).join('|');
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(row);
    });

    // Build result columns and rows
    const resultColumns = [...groupColumns];
    const aggregationColumns: string[] = [];
    
    aggregations.forEach(agg => {
      const columnName = agg.alias || `${agg.function}_${agg.column}`;
      resultColumns.push(columnName);
      aggregationColumns.push(columnName);
    });

    const resultRows: any[][] = [];
    
    groups.forEach((groupRows, groupKey) => {
      const groupValues = groupKey.split('|');
      const row = [...groupValues];
      
      // Calculate aggregations
      aggregations.forEach(agg => {
        const columnIndex = dataset.columns.indexOf(agg.column);
        const values = groupRows.map(r => r[columnIndex]).filter(v => v != null);
        
        const aggregatedValue = this.calculateAggregation(values, agg.function);
        row.push(aggregatedValue);
      });
      
      resultRows.push(row);
    });

    return this.createNewDataset(resultColumns, resultRows);
  }

  /**
   * Join two datasets
   */
  join(
    leftDataset: Dataset,
    rightDataset: Dataset,
    config: JoinConfig
  ): Dataset {
    const { type, leftKey, rightKey, suffix = '_right' } = config;
    
    // Validate join keys exist
    if (!leftDataset.columns.includes(leftKey)) {
      throw new Error(`Left join key '${leftKey}' not found`);
    }
    if (!rightDataset.columns.includes(rightKey)) {
      throw new Error(`Right join key '${rightKey}' not found`);
    }

    const leftKeyIndex = leftDataset.columns.indexOf(leftKey);
    const rightKeyIndex = rightDataset.columns.indexOf(rightKey);

    // Build result columns
    const resultColumns = [...leftDataset.columns];
    rightDataset.columns.forEach(col => {
      if (col !== rightKey) {
        const columnName = leftDataset.columns.includes(col) ? `${col}${suffix}` : col;
        resultColumns.push(columnName);
      }
    });

    // Create lookup map for right dataset
    const rightLookup = new Map<any, any[][]>();
    rightDataset.rows.forEach(row => {
      const key = row[rightKeyIndex];
      if (!rightLookup.has(key)) {
        rightLookup.set(key, []);
      }
      rightLookup.get(key)!.push(row);
    });

    const resultRows: any[][] = [];

    // Process left dataset rows
    leftDataset.rows.forEach(leftRow => {
      const leftKeyValue = leftRow[leftKeyIndex];
      const rightMatches = rightLookup.get(leftKeyValue) || [];

      if (rightMatches.length > 0) {
        // Inner/Left join: add matched rows
        rightMatches.forEach(rightRow => {
          const resultRow = [...leftRow];
          rightRow.forEach((value, index) => {
            if (index !== rightKeyIndex) {
              resultRow.push(value);
            }
          });
          resultRows.push(resultRow);
        });
      } else if (type === 'left' || type === 'outer') {
        // Left/Outer join: add left row with nulls for right columns
        const resultRow = [...leftRow];
        rightDataset.columns.forEach((col, index) => {
          if (index !== rightKeyIndex) {
            resultRow.push(null);
          }
        });
        resultRows.push(resultRow);
      }
    });

    // For right/outer join, add unmatched right rows
    if (type === 'right' || type === 'outer') {
      const leftKeys = new Set(leftDataset.rows.map(row => row[leftKeyIndex]));
      
      rightDataset.rows.forEach(rightRow => {
        const rightKeyValue = rightRow[rightKeyIndex];
        if (!leftKeys.has(rightKeyValue)) {
          const resultRow = new Array(leftDataset.columns.length).fill(null);
          resultRow[leftKeyIndex] = rightKeyValue;
          
          rightRow.forEach((value, index) => {
            if (index !== rightKeyIndex) {
              resultRow.push(value);
            }
          });
          resultRows.push(resultRow);
        }
      });
    }

    return this.createNewDataset(resultColumns, resultRows);
  }

  /**
   * Slice dataset to get specific rows
   */
  slice(dataset: Dataset, start: number, end?: number): Dataset {
    const actualEnd = end ?? dataset.rows.length;
    const slicedRows = dataset.rows.slice(start, actualEnd);
    
    return this.createDerivedDataset(dataset, slicedRows);
  }

  /**
   * Rename columns in dataset
   */
  renameColumns(dataset: Dataset, mapping: Record<string, string>): Dataset {
    const newColumns = dataset.columns.map(col => mapping[col] || col);
    
    // Check for duplicate column names
    const duplicates = newColumns.filter((col, index) => newColumns.indexOf(col) !== index);
    if (duplicates.length > 0) {
      throw new Error(`Duplicate column names after rename: ${duplicates.join(', ')}`);
    }

    const newDataset: Dataset = {
      columns: newColumns,
      rows: dataset.rows.map(row => [...row]),
      metadata: {
        ...dataset.metadata,
        modified: new Date(),
        types: this.remapMetadata(dataset.metadata.types, mapping),
        nullable: this.remapMetadata(dataset.metadata.nullable, mapping),
        unique: this.remapMetadata(dataset.metadata.unique, mapping),
      },
    };

    return newDataset;
  }

  /**
   * Add computed column to dataset
   */
  addColumn(
    dataset: Dataset,
    columnName: string,
    computeFn: (row: any[], rowIndex: number) => any,
    index?: number
  ): Dataset {
    if (dataset.columns.includes(columnName)) {
      throw new Error(`Column '${columnName}' already exists`);
    }

    const newValues = dataset.rows.map((row, rowIndex) => computeFn(row, rowIndex));
    const insertIndex = index ?? dataset.columns.length;
    
    const newColumns = [...dataset.columns];
    newColumns.splice(insertIndex, 0, columnName);
    
    const newRows = dataset.rows.map((row, rowIndex) => {
      const newRow = [...row];
      newRow.splice(insertIndex, 0, newValues[rowIndex]);
      return newRow;
    });

    return this.createNewDataset(newColumns, newRows);
  }

  /**
   * Remove columns from dataset
   */
  removeColumns(dataset: Dataset, columnsToRemove: string[]): Dataset {
    const indicesToRemove = columnsToRemove
      .map(col => dataset.columns.indexOf(col))
      .filter(index => index !== -1)
      .sort((a, b) => b - a); // Sort in descending order for safe removal

    const newColumns = dataset.columns.filter(col => !columnsToRemove.includes(col));
    const newRows = dataset.rows.map(row => {
      const newRow = [...row];
      indicesToRemove.forEach(index => newRow.splice(index, 1));
      return newRow;
    });

    return this.createNewDataset(newColumns, newRows);
  }

  /**
   * Get unique values from a column
   */
  getUniqueValues(dataset: Dataset, columnName: string): any[] {
    const columnIndex = dataset.columns.indexOf(columnName);
    if (columnIndex === -1) {
      throw new Error(`Column '${columnName}' not found`);
    }

    const values = dataset.rows.map(row => row[columnIndex]);
    return Array.from(new Set(values));
  }

  /**
   * Get column statistics
   */
  getColumnStats(dataset: Dataset, columnName: string): {
    count: number;
    nullCount: number;
    uniqueCount: number;
    min?: any;
    max?: any;
    avg?: number;
    sum?: number;
  } {
    const columnIndex = dataset.columns.indexOf(columnName);
    if (columnIndex === -1) {
      throw new Error(`Column '${columnName}' not found`);
    }

    const values = dataset.rows.map(row => row[columnIndex]);
    const nonNullValues = values.filter(v => v != null);
    const numericValues = nonNullValues.filter(v => typeof v === 'number');

    const stats = {
      count: values.length,
      nullCount: values.length - nonNullValues.length,
      uniqueCount: new Set(values).size,
      min: nonNullValues.length > 0 ? Math.min(...nonNullValues) : undefined,
      max: nonNullValues.length > 0 ? Math.max(...nonNullValues) : undefined,
      avg: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) / numericValues.length : undefined,
      sum: numericValues.length > 0 ? numericValues.reduce((a, b) => a + b, 0) : undefined,
    };

    return stats;
  }

  // Private helper methods

  private evaluateFilterCondition(
    row: any[],
    columns: string[],
    condition: FilterCondition | CompoundFilterCondition
  ): boolean {
    if ('column' in condition) {
      // Simple condition
      const filterCondition = condition as FilterCondition;
      const columnIndex = columns.indexOf(filterCondition.column);
      if (columnIndex === -1) return true;

      const cellValue = row[columnIndex];
      return this.evaluateSimpleCondition(cellValue, filterCondition);
    } else {
      // Compound condition
      const compoundCondition = condition as CompoundFilterCondition;
      const results = compoundCondition.conditions.map(cond =>
        this.evaluateFilterCondition(row, columns, cond)
      );

      return compoundCondition.operator === 'and'
        ? results.every(Boolean)
        : results.some(Boolean);
    }
  }

  private evaluateSimpleCondition(cellValue: any, condition: FilterCondition): boolean {
    const { operator, value } = condition;

    switch (operator) {
      case 'equals':
        return cellValue === value;
      case 'not_equals':
        return cellValue !== value;
      case 'greater_than':
        return cellValue > value;
      case 'greater_than_or_equal':
        return cellValue >= value;
      case 'less_than':
        return cellValue < value;
      case 'less_than_or_equal':
        return cellValue <= value;
      case 'contains':
        return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
      case 'not_contains':
        return !String(cellValue).toLowerCase().includes(String(value).toLowerCase());
      case 'starts_with':
        return String(cellValue).toLowerCase().startsWith(String(value).toLowerCase());
      case 'ends_with':
        return String(cellValue).toLowerCase().endsWith(String(value).toLowerCase());
      case 'is_null':
        return cellValue == null;
      case 'is_not_null':
        return cellValue != null;
      case 'in':
        return Array.isArray(value) && value.includes(cellValue);
      case 'not_in':
        return Array.isArray(value) && !value.includes(cellValue);
      default:
        return true;
    }
  }

  private compareValues(a: any, b: any, type?: PrimitiveType): number {
    // Handle null values
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    // Type-specific comparison
    switch (type) {
      case 'number':
        return Number(a) - Number(b);
      case 'date':
        return new Date(a).getTime() - new Date(b).getTime();
      case 'boolean':
        return Number(a) - Number(b);
      default:
        return String(a).localeCompare(String(b));
    }
  }

  private calculateAggregation(values: any[], func: AggregationFunction): any {
    if (values.length === 0) return null;

    switch (func) {
      case 'count':
        return values.length;
      case 'sum':
        return values.reduce((sum, val) => sum + (Number(val) || 0), 0);
      case 'avg':
        const numericValues = values.filter(v => typeof v === 'number' || !isNaN(Number(v)));
        return numericValues.length > 0
          ? numericValues.reduce((sum, val) => sum + Number(val), 0) / numericValues.length
          : null;
      case 'min':
        return Math.min(...values.map(v => Number(v)).filter(v => !isNaN(v)));
      case 'max':
        return Math.max(...values.map(v => Number(v)).filter(v => !isNaN(v)));
      case 'first':
        return values[0];
      case 'last':
        return values[values.length - 1];
      default:
        return null;
    }
  }

  private createDerivedDataset(originalDataset: Dataset, newRows: any[][]): Dataset {
    return {
      ...originalDataset,
      rows: newRows,
      metadata: {
        ...originalDataset.metadata,
        rowCount: newRows.length,
        modified: new Date(),
      },
    };
  }

  private createNewDataset(columns: string[], rows: any[][]): Dataset {
    const dataset: Dataset = {
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

    // Infer metadata
    dataset.metadata.types = this.inferColumnTypes(dataset);
    dataset.metadata.nullable = this.calculateNullable(dataset);
    dataset.metadata.unique = this.calculateUnique(dataset);

    return dataset;
  }

  private inferColumnTypes(dataset: Dataset): Record<string, PrimitiveType> {
    const types: Record<string, PrimitiveType> = {};

    dataset.columns.forEach((column, index) => {
      const values = dataset.rows.map(row => row[index]).filter(v => v != null);
      
      if (values.length === 0) {
        types[column] = 'string';
        return;
      }

      // Check for date patterns
      if (values.some(v => v instanceof Date || this.isDateString(v))) {
        types[column] = 'date';
        return;
      }

      // Check for numbers
      if (values.every(v => typeof v === 'number' || !isNaN(Number(v)))) {
        types[column] = 'number';
        return;
      }

      // Check for booleans
      if (values.every(v => typeof v === 'boolean' || v === 'true' || v === 'false')) {
        types[column] = 'boolean';
        return;
      }

      // Default to string
      types[column] = 'string';
    });

    return types;
  }

  private isDateString(value: any): boolean {
    if (typeof value !== 'string') return false;
    const date = new Date(value);
    return !isNaN(date.getTime()) && Boolean(value.match(/\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}/));
  }

  private calculateNullable(dataset: Dataset): Record<string, boolean> {
    const nullable: Record<string, boolean> = {};

    dataset.columns.forEach((column, index) => {
      const hasNull = dataset.rows.some(row => row[index] == null);
      nullable[column] = hasNull;
    });

    return nullable;
  }

  private calculateUnique(dataset: Dataset): Record<string, boolean> {
    const unique: Record<string, boolean> = {};

    dataset.columns.forEach((column, index) => {
      const values = dataset.rows.map(row => row[index]);
      const uniqueValues = new Set(values);
      unique[column] = uniqueValues.size === values.length;
    });

    return unique;
  }

  private remapMetadata<T>(
    metadata: Record<string, T>,
    mapping: Record<string, string>
  ): Record<string, T> {
    const remapped: Record<string, T> = {};
    
    Object.entries(metadata).forEach(([key, value]) => {
      const newKey = mapping[key] || key;
      remapped[newKey] = value;
    });

    return remapped;
  }
}

// Export singleton instance
export const dataProcessor = new DataProcessor();