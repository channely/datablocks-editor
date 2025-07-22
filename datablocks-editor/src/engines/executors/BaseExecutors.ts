import type {
  ExecutionContext,
  ExecutionResult,
  ValidationResult,
  Dataset,
  PrimitiveType,
} from '../../types';

import { NodeExecutor } from '../NodeExecutor';

/**
 * Example Data node executor
 */
export class ExampleDataExecutor extends NodeExecutor {
  constructor() {
    super('example-data');
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.safeExecute(context, async () => {
      const { config } = context;
      const datasetName = config.dataset || 'sample';

      // Generate sample dataset based on configuration
      const dataset = this.generateSampleDataset(datasetName);
      
      return dataset;
    });
  }

  validate(context: ExecutionContext): ValidationResult {
    const { config } = context;
    const errors = [];

    if (!config.dataset) {
      errors.push({
        field: 'dataset',
        message: 'Dataset selection is required',
        code: 'REQUIRED_FIELD',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private generateSampleDataset(datasetName: string): Dataset {
    const datasets = {
      sample: {
        columns: ['id', 'name', 'age', 'city'],
        rows: [
          [1, 'Alice', 25, 'New York'],
          [2, 'Bob', 30, 'San Francisco'],
          [3, 'Charlie', 35, 'Chicago'],
          [4, 'Diana', 28, 'Boston'],
          [5, 'Eve', 32, 'Seattle'],
        ],
      },
      sales: {
        columns: ['date', 'product', 'quantity', 'revenue'],
        rows: [
          ['2024-01-01', 'Widget A', 10, 100],
          ['2024-01-02', 'Widget B', 15, 225],
          ['2024-01-03', 'Widget A', 8, 80],
          ['2024-01-04', 'Widget C', 20, 400],
          ['2024-01-05', 'Widget B', 12, 180],
          ['2024-01-06', 'Widget A', 25, 250],
          ['2024-01-07', 'Widget C', 18, 360],
        ],
      },
      employees: {
        columns: ['id', 'name', 'department', 'salary'],
        rows: [
          [1, '张三', '技术部', 8000],
          [2, '李四', '市场部', 7500],
          [3, '王五', '人事部', 6500],
          [4, '赵六', '技术部', 9000],
          [5, '孙七', '财务部', 7000],
          [6, '周八', '市场部', 8500],
        ],
      },
      products: {
        columns: ['id', 'name', 'category', 'price', 'stock'],
        rows: [
          [1, '笔记本电脑', '电子产品', 5999, 50],
          [2, '无线鼠标', '电子产品', 99, 200],
          [3, '办公椅', '办公用品', 299, 30],
          [4, '机械键盘', '电子产品', 399, 80],
          [5, '显示器', '电子产品', 1299, 25],
          [6, '文件柜', '办公用品', 599, 15],
        ],
      },
    };

    const data = datasets[datasetName as keyof typeof datasets] || datasets.sample;

    return {
      columns: data.columns,
      rows: data.rows,
      metadata: {
        rowCount: data.rows.length,
        columnCount: data.columns.length,
        types: this.inferTypes(data.columns, data.rows),
        nullable: this.checkNullable(data.columns, data.rows),
        unique: this.checkUnique(data.columns, data.rows),
        created: new Date(),
        modified: new Date(),
      },
    };
  }

  private inferTypes(columns: string[], rows: any[][]): Record<string, PrimitiveType> {
    const types: Record<string, PrimitiveType> = {};

    columns.forEach((column, index) => {
      const values = rows.map(row => row[index]).filter(v => v != null);
      
      if (values.length === 0) {
        types[column] = 'string';
        return;
      }

      const firstValue = values[0];
      if (typeof firstValue === 'number') {
        types[column] = 'number';
      } else if (typeof firstValue === 'boolean') {
        types[column] = 'boolean';
      } else if (firstValue instanceof Date) {
        types[column] = 'date';
      } else {
        types[column] = 'string';
      }
    });

    return types;
  }

  private checkNullable(columns: string[], rows: any[][]): Record<string, boolean> {
    const nullable: Record<string, boolean> = {};

    columns.forEach((column, index) => {
      const hasNull = rows.some(row => row[index] == null);
      nullable[column] = hasNull;
    });

    return nullable;
  }

  private checkUnique(columns: string[], rows: any[][]): Record<string, boolean> {
    const unique: Record<string, boolean> = {};

    columns.forEach((column, index) => {
      const values = rows.map(row => row[index]);
      const uniqueValues = new Set(values);
      unique[column] = uniqueValues.size === values.length;
    });

    return unique;
  }
}

/**
 * Filter node executor
 */
export class FilterExecutor extends NodeExecutor {
  constructor() {
    super('filter');
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.safeExecute(context, async () => {
      const { inputs, config } = context;
      
      // Get input dataset
      const inputDataset = this.getInputDataset(inputs);
      if (!inputDataset) {
        throw new Error('No input dataset provided');
      }

      // Support both new multi-condition format and legacy single condition format
      let filteredRows: any[];
      
      if (config.conditions && Array.isArray(config.conditions)) {
        // New multi-condition format
        const { conditions, logicalOperator = 'and' } = config;
        filteredRows = inputDataset.rows.filter(row => 
          this.evaluateMultipleConditions(row, inputDataset.columns, conditions, logicalOperator)
        );
      } else {
        // Legacy single condition format
        const { column, operator, value } = config;
        filteredRows = inputDataset.rows.filter(row => {
          const columnIndex = inputDataset.columns.indexOf(column);
          if (columnIndex === -1) return true;
          
          const cellValue = row[columnIndex];
          return this.evaluateCondition(cellValue, operator, value);
        });
      }

      // Create filtered dataset
      const filteredDataset: Dataset = {
        ...inputDataset,
        rows: filteredRows,
        metadata: {
          ...inputDataset.metadata,
          rowCount: filteredRows.length,
          modified: new Date(),
        },
      };

      return filteredDataset;
    });
  }

  validate(context: ExecutionContext): ValidationResult {
    const { inputs, config } = context;
    const errors = [];

    // Check for input dataset
    const inputDataset = this.getInputDataset(inputs);
    if (!inputDataset) {
      errors.push({
        field: 'input',
        message: 'Input dataset is required',
        code: 'REQUIRED_INPUT',
      });
    }

    // Validate configuration - support both new and legacy formats
    if (config.conditions && Array.isArray(config.conditions)) {
      // New multi-condition format validation
      if (config.conditions.length === 0) {
        errors.push({
          field: 'conditions',
          message: 'At least one filter condition is required',
          code: 'REQUIRED_FIELD',
        });
      } else {
        config.conditions.forEach((condition: any, index: number) => {
          if (!condition.column) {
            errors.push({
              field: `conditions[${index}].column`,
              message: `Column selection is required for condition ${index + 1}`,
              code: 'REQUIRED_FIELD',
            });
          }

          if (!condition.operator) {
            errors.push({
              field: `conditions[${index}].operator`,
              message: `Filter operator is required for condition ${index + 1}`,
              code: 'REQUIRED_FIELD',
            });
          }

          // Check if value is required for this operator
          const operatorsNotNeedingValue = ['is_null', 'is_not_null'];
          if (!operatorsNotNeedingValue.includes(condition.operator) && 
              (condition.value === undefined || condition.value === null || condition.value === '')) {
            errors.push({
              field: `conditions[${index}].value`,
              message: `Filter value is required for condition ${index + 1}`,
              code: 'REQUIRED_FIELD',
            });
          }
        });
      }

      // Validate logical operator
      if (config.conditions.length > 1 && config.logicalOperator && 
          !['and', 'or'].includes(config.logicalOperator)) {
        errors.push({
          field: 'logicalOperator',
          message: 'Logical operator must be "and" or "or"',
          code: 'INVALID_VALUE',
        });
      }
    } else {
      // Legacy single condition format validation
      if (!config.column) {
        errors.push({
          field: 'column',
          message: 'Column selection is required',
          code: 'REQUIRED_FIELD',
        });
      }

      if (!config.operator) {
        errors.push({
          field: 'operator',
          message: 'Filter operator is required',
          code: 'REQUIRED_FIELD',
        });
      }

      // Check if value is required for this operator
      const operatorsNotNeedingValue = ['is_null', 'is_not_null'];
      if (!operatorsNotNeedingValue.includes(config.operator) && 
          (config.value === undefined || config.value === null || config.value === '')) {
        errors.push({
          field: 'value',
          message: 'Filter value is required',
          code: 'REQUIRED_FIELD',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getInputDataset(inputs: Record<string, any>): Dataset | null {
    // Find the first dataset input
    for (const input of Object.values(inputs)) {
      if (input && typeof input === 'object' && 'columns' in input && 'rows' in input) {
        return input as Dataset;
      }
    }
    return null;
  }

  private evaluateCondition(cellValue: any, operator: string, filterValue: any): boolean {
    switch (operator) {
      case 'equals':
        return cellValue === filterValue;
      case 'not_equals':
        return cellValue !== filterValue;
      case 'greater_than':
        return Number(cellValue) > Number(filterValue);
      case 'greater_than_or_equal':
        return Number(cellValue) >= Number(filterValue);
      case 'less_than':
        return Number(cellValue) < Number(filterValue);
      case 'less_than_or_equal':
        return Number(cellValue) <= Number(filterValue);
      case 'contains':
        return String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'not_contains':
        return !String(cellValue).toLowerCase().includes(String(filterValue).toLowerCase());
      case 'starts_with':
        return String(cellValue).toLowerCase().startsWith(String(filterValue).toLowerCase());
      case 'ends_with':
        return String(cellValue).toLowerCase().endsWith(String(filterValue).toLowerCase());
      case 'is_null':
        return cellValue == null;
      case 'is_not_null':
        return cellValue != null;
      case 'in':
        if (Array.isArray(filterValue)) {
          return filterValue.includes(cellValue);
        }
        return String(filterValue).split(',').map(v => v.trim()).includes(String(cellValue));
      case 'not_in':
        if (Array.isArray(filterValue)) {
          return !filterValue.includes(cellValue);
        }
        return !String(filterValue).split(',').map(v => v.trim()).includes(String(cellValue));
      default:
        return true;
    }
  }

  private evaluateMultipleConditions(
    row: any[], 
    columns: string[], 
    conditions: any[], 
    logicalOperator: 'and' | 'or' = 'and'
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    const results = conditions.map(condition => {
      const columnIndex = columns.indexOf(condition.column);
      if (columnIndex === -1) return true;
      
      const cellValue = row[columnIndex];
      return this.evaluateCondition(cellValue, condition.operator, condition.value);
    });

    return logicalOperator === 'and' 
      ? results.every(result => result)
      : results.some(result => result);
  }
}

/**
 * Group node executor
 */
export class GroupExecutor extends NodeExecutor {
  constructor() {
    super('group');
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.safeExecute(context, async () => {
      const { inputs, config } = context;
      
      // Get input dataset
      const inputDataset = this.getInputDataset(inputs);
      if (!inputDataset) {
        throw new Error('No input dataset provided');
      }

      // Get group configuration
      const groupColumns = config.groupColumns || [];
      const aggregations = config.aggregations || [];

      if (groupColumns.length === 0) {
        throw new Error('At least one group column is required');
      }

      if (aggregations.length === 0) {
        throw new Error('At least one aggregation is required');
      }

      // Validate all group columns exist
      for (const column of groupColumns) {
        const columnIndex = inputDataset.columns.indexOf(column);
        if (columnIndex === -1) {
          throw new Error(`Group column '${column}' not found in dataset`);
        }
      }

      // Validate all aggregation columns exist
      for (const aggregation of aggregations) {
        if (aggregation.column) {
          const columnIndex = inputDataset.columns.indexOf(aggregation.column);
          if (columnIndex === -1) {
            throw new Error(`Aggregation column '${aggregation.column}' not found in dataset`);
          }
        }
      }

      // Group data by specified columns
      const groups = this.groupData(inputDataset, groupColumns);

      // Apply aggregations to each group
      const resultColumns = [...groupColumns];
      const aggregationColumns: string[] = [];

      // Build result column names
      aggregations.forEach(agg => {
        const columnName = agg.alias || `${agg.function}_${agg.column}`;
        aggregationColumns.push(columnName);
        resultColumns.push(columnName);
      });

      const resultRows: any[][] = [];

      // Process each group
      groups.forEach((groupRows, groupKey) => {
        const resultRow = [...groupKey]; // Start with group column values

        // Apply each aggregation
        aggregations.forEach(agg => {
          const aggregatedValue = this.applyAggregation(
            groupRows,
            inputDataset.columns,
            agg.column,
            agg.function
          );
          resultRow.push(aggregatedValue);
        });

        resultRows.push(resultRow);
      });

      // Create grouped dataset
      const groupedDataset: Dataset = {
        columns: resultColumns,
        rows: resultRows,
        metadata: {
          rowCount: resultRows.length,
          columnCount: resultColumns.length,
          types: this.inferTypes(resultColumns, resultRows),
          nullable: this.checkNullable(resultColumns, resultRows),
          unique: this.checkUnique(resultColumns, resultRows),
          created: new Date(),
          modified: new Date(),
        },
      };

      return groupedDataset;
    });
  }

  validate(context: ExecutionContext): ValidationResult {
    const { inputs, config } = context;
    const errors = [];

    // Check for input dataset
    const inputDataset = this.getInputDataset(inputs);
    if (!inputDataset) {
      errors.push({
        field: 'input',
        message: 'Input dataset is required',
        code: 'REQUIRED_INPUT',
      });
    }

    // Validate group columns
    const groupColumns = config.groupColumns || [];
    if (groupColumns.length === 0) {
      errors.push({
        field: 'groupColumns',
        message: 'At least one group column is required',
        code: 'REQUIRED_FIELD',
      });
    }

    // Validate aggregations
    const aggregations = config.aggregations || [];
    if (aggregations.length === 0) {
      errors.push({
        field: 'aggregations',
        message: 'At least one aggregation is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      aggregations.forEach((agg: any, index: number) => {
        if (!agg.column && agg.function !== 'count') {
          errors.push({
            field: `aggregations[${index}].column`,
            message: `Column selection is required for aggregation ${index + 1}`,
            code: 'REQUIRED_FIELD',
          });
        }

        if (!agg.function) {
          errors.push({
            field: `aggregations[${index}].function`,
            message: `Aggregation function is required for aggregation ${index + 1}`,
            code: 'REQUIRED_FIELD',
          });
        }

        // Validate function type
        const validFunctions = ['count', 'sum', 'avg', 'min', 'max', 'first', 'last'];
        if (agg.function && !validFunctions.includes(agg.function)) {
          errors.push({
            field: `aggregations[${index}].function`,
            message: `Invalid aggregation function: ${agg.function}`,
            code: 'INVALID_VALUE',
          });
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getInputDataset(inputs: Record<string, any>): Dataset | null {
    // Find the first dataset input
    for (const input of Object.values(inputs)) {
      if (input && typeof input === 'object' && 'columns' in input && 'rows' in input) {
        return input as Dataset;
      }
    }
    return null;
  }

  private groupData(dataset: Dataset, groupColumns: string[]): Map<any[], any[][]> {
    const groups = new Map<string, { key: any[], rows: any[][] }>();
    const groupColumnIndices = groupColumns.map(col => dataset.columns.indexOf(col));

    dataset.rows.forEach(row => {
      // Extract group key values
      const groupKey = groupColumnIndices.map(idx => row[idx]);
      const groupKeyString = JSON.stringify(groupKey);

      if (!groups.has(groupKeyString)) {
        groups.set(groupKeyString, { key: groupKey, rows: [] });
      }

      groups.get(groupKeyString)!.rows.push(row);
    });

    // Convert to Map with actual key arrays
    const result = new Map<any[], any[][]>();
    groups.forEach(({ key, rows }) => {
      result.set(key, rows);
    });

    return result;
  }

  private applyAggregation(
    groupRows: any[][],
    columns: string[],
    column: string,
    aggregationFunction: string
  ): any {
    if (aggregationFunction === 'count') {
      return groupRows.length;
    }

    const columnIndex = columns.indexOf(column);
    if (columnIndex === -1) {
      return null;
    }

    const values = groupRows
      .map(row => row[columnIndex])
      .filter(value => value != null);

    if (values.length === 0) {
      return null;
    }

    switch (aggregationFunction) {
      case 'sum':
        return values
          .filter(v => !isNaN(Number(v)))
          .reduce((sum, val) => sum + Number(val), 0);

      case 'avg':
        const numericValues = values.filter(v => !isNaN(Number(v))).map(v => Number(v));
        return numericValues.length > 0
          ? numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length
          : null;

      case 'min':
        const minValues = values.filter(v => !isNaN(Number(v))).map(v => Number(v));
        return minValues.length > 0 ? Math.min(...minValues) : null;

      case 'max':
        const maxValues = values.filter(v => !isNaN(Number(v))).map(v => Number(v));
        return maxValues.length > 0 ? Math.max(...maxValues) : null;

      case 'first':
        return values[0];

      case 'last':
        return values[values.length - 1];

      default:
        return null;
    }
  }

  private inferTypes(columns: string[], rows: any[][]): Record<string, PrimitiveType> {
    const types: Record<string, PrimitiveType> = {};

    columns.forEach((column, index) => {
      const values = rows.map(row => row[index]).filter(v => v != null);
      
      if (values.length === 0) {
        types[column] = 'string';
        return;
      }

      const firstValue = values[0];
      if (typeof firstValue === 'number') {
        types[column] = 'number';
      } else if (typeof firstValue === 'boolean') {
        types[column] = 'boolean';
      } else if (firstValue instanceof Date) {
        types[column] = 'date';
      } else {
        types[column] = 'string';
      }
    });

    return types;
  }

  private checkNullable(columns: string[], rows: any[][]): Record<string, boolean> {
    const nullable: Record<string, boolean> = {};

    columns.forEach((column, index) => {
      const hasNull = rows.some(row => row[index] == null);
      nullable[column] = hasNull;
    });

    return nullable;
  }

  private checkUnique(columns: string[], rows: any[][]): Record<string, boolean> {
    const unique: Record<string, boolean> = {};

    columns.forEach((column, index) => {
      const values = rows.map(row => row[index]);
      const uniqueValues = new Set(values);
      unique[column] = uniqueValues.size === values.length;
    });

    return unique;
  }
}

/**
 * Sort node executor
 */
export class SortExecutor extends NodeExecutor {
  constructor() {
    super('sort');
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.safeExecute(context, async () => {
      const { inputs, config } = context;
      
      // Get input dataset
      const inputDataset = this.getInputDataset(inputs);
      if (!inputDataset) {
        throw new Error('No input dataset provided');
      }

      // Support both new multi-column format and legacy single column format
      let sortConfigs: any[];
      
      if (config.sortConfigs && Array.isArray(config.sortConfigs)) {
        // New multi-column format
        sortConfigs = config.sortConfigs.filter((sc: any) => sc.column);
      } else {
        // Legacy single column format
        const { column, direction = 'asc' } = config;
        if (!column) {
          throw new Error('No sort column specified');
        }
        sortConfigs = [{ column, direction }];
      }

      if (sortConfigs.length === 0) {
        throw new Error('No valid sort configurations provided');
      }

      // Validate all columns exist
      for (const sortConfig of sortConfigs) {
        const columnIndex = inputDataset.columns.indexOf(sortConfig.column);
        if (columnIndex === -1) {
          throw new Error(`Column '${sortConfig.column}' not found in dataset`);
        }
      }

      // Sort rows with multi-column support
      const sortedRows = [...inputDataset.rows].sort((a, b) => {
        for (const sortConfig of sortConfigs) {
          const columnIndex = inputDataset.columns.indexOf(sortConfig.column);
          const aValue = a[columnIndex];
          const bValue = b[columnIndex];
          
          let comparison = this.compareValues(aValue, bValue);
          
          if (comparison !== 0) {
            return sortConfig.direction === 'desc' ? -comparison : comparison;
          }
          // If values are equal, continue to next sort criteria
        }
        return 0; // All sort criteria are equal
      });

      // Create sorted dataset
      const sortedDataset: Dataset = {
        ...inputDataset,
        rows: sortedRows,
        metadata: {
          ...inputDataset.metadata,
          modified: new Date(),
        },
      };

      return sortedDataset;
    });
  }

  validate(context: ExecutionContext): ValidationResult {
    const { inputs, config } = context;
    const errors = [];

    // Check for input dataset
    const inputDataset = this.getInputDataset(inputs);
    if (!inputDataset) {
      errors.push({
        field: 'input',
        message: 'Input dataset is required',
        code: 'REQUIRED_INPUT',
      });
    }

    // Validate configuration - support both new and legacy formats
    if (config.sortConfigs && Array.isArray(config.sortConfigs)) {
      // New multi-column format validation
      if (config.sortConfigs.length === 0) {
        errors.push({
          field: 'sortConfigs',
          message: 'At least one sort configuration is required',
          code: 'REQUIRED_FIELD',
        });
      } else {
        config.sortConfigs.forEach((sortConfig: any, index: number) => {
          if (!sortConfig.column) {
            errors.push({
              field: `sortConfigs[${index}].column`,
              message: `Column selection is required for sort ${index + 1}`,
              code: 'REQUIRED_FIELD',
            });
          }

          if (sortConfig.direction && !['asc', 'desc'].includes(sortConfig.direction)) {
            errors.push({
              field: `sortConfigs[${index}].direction`,
              message: `Direction must be "asc" or "desc" for sort ${index + 1}`,
              code: 'INVALID_VALUE',
            });
          }
        });
      }
    } else {
      // Legacy single column format validation
      if (!config.column) {
        errors.push({
          field: 'column',
          message: 'Column selection is required',
          code: 'REQUIRED_FIELD',
        });
      }

      if (config.direction && !['asc', 'desc'].includes(config.direction)) {
        errors.push({
          field: 'direction',
          message: 'Direction must be "asc" or "desc"',
          code: 'INVALID_VALUE',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  private getInputDataset(inputs: Record<string, any>): Dataset | null {
    // Find the first dataset input
    for (const input of Object.values(inputs)) {
      if (input && typeof input === 'object' && 'columns' in input && 'rows' in input) {
        return input as Dataset;
      }
    }
    return null;
  }

  private compareValues(a: any, b: any): number {
    // Handle null/undefined values
    if (a == null && b == null) return 0;
    if (a == null) return -1;
    if (b == null) return 1;

    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }

    // Handle strings (case-insensitive)
    const aStr = String(a).toLowerCase();
    const bStr = String(b).toLowerCase();
    
    if (aStr < bStr) return -1;
    if (aStr > bStr) return 1;
    return 0;
  }
}