import type {
  Dataset,
  FilterCondition,
  CompoundFilterCondition,
  SortConfig,
  GroupConfig,
  JoinConfig,
} from '../types';

import { DataProcessor } from './DataProcessor';

/**
 * Data processing pipeline for chaining operations
 */
export class DataPipeline {
  private operations: PipelineOperation[] = [];
  private processor: DataProcessor;

  constructor(processor?: DataProcessor) {
    this.processor = processor || new DataProcessor();
  }

  /**
   * Add filter operation to pipeline
   */
  filter(condition: FilterCondition | CompoundFilterCondition): DataPipeline {
    this.operations.push({
      type: 'filter',
      params: { condition },
    });
    return this;
  }

  /**
   * Add sort operation to pipeline
   */
  sort(sortConfigs: SortConfig[]): DataPipeline {
    this.operations.push({
      type: 'sort',
      params: { sortConfigs },
    });
    return this;
  }

  /**
   * Add group operation to pipeline
   */
  group(config: GroupConfig): DataPipeline {
    this.operations.push({
      type: 'group',
      params: { config },
    });
    return this;
  }

  /**
   * Add join operation to pipeline
   */
  join(rightDataset: Dataset, config: JoinConfig): DataPipeline {
    this.operations.push({
      type: 'join',
      params: { rightDataset, config },
    });
    return this;
  }

  /**
   * Add slice operation to pipeline
   */
  slice(start: number, end?: number): DataPipeline {
    this.operations.push({
      type: 'slice',
      params: { start, end },
    });
    return this;
  }

  /**
   * Add rename columns operation to pipeline
   */
  renameColumns(mapping: Record<string, string>): DataPipeline {
    this.operations.push({
      type: 'renameColumns',
      params: { mapping },
    });
    return this;
  }

  /**
   * Add computed column operation to pipeline
   */
  addColumn(
    columnName: string,
    computeFn: (row: any[], rowIndex: number) => any,
    index?: number
  ): DataPipeline {
    this.operations.push({
      type: 'addColumn',
      params: { columnName, computeFn, index },
    });
    return this;
  }

  /**
   * Add remove columns operation to pipeline
   */
  removeColumns(columnsToRemove: string[]): DataPipeline {
    this.operations.push({
      type: 'removeColumns',
      params: { columnsToRemove },
    });
    return this;
  }

  /**
   * Execute the pipeline on a dataset
   */
  execute(dataset: Dataset): Dataset {
    let result = dataset;

    for (const operation of this.operations) {
      result = this.executeOperation(result, operation);
    }

    return result;
  }

  /**
   * Execute the pipeline asynchronously with progress tracking
   */
  async executeAsync(
    dataset: Dataset,
    onProgress?: (step: number, total: number, operation: string) => void
  ): Promise<Dataset> {
    let result = dataset;
    const total = this.operations.length;

    for (let i = 0; i < this.operations.length; i++) {
      const operation = this.operations[i];
      
      if (onProgress) {
        onProgress(i, total, operation.type);
      }

      result = this.executeOperation(result, operation);
      
      // Allow other tasks to run
      await new Promise(resolve => setTimeout(resolve, 0));
    }

    if (onProgress) {
      onProgress(total, total, 'completed');
    }

    return result;
  }

  /**
   * Get pipeline operations for inspection
   */
  getOperations(): PipelineOperation[] {
    return [...this.operations];
  }

  /**
   * Clear all operations
   */
  clear(): DataPipeline {
    this.operations = [];
    return this;
  }

  /**
   * Clone the pipeline
   */
  clone(): DataPipeline {
    const cloned = new DataPipeline(this.processor);
    cloned.operations = [...this.operations];
    return cloned;
  }

  /**
   * Get estimated execution time (in milliseconds)
   */
  estimateExecutionTime(datasetSize: number): number {
    let estimate = 0;

    for (const operation of this.operations) {
      switch (operation.type) {
        case 'filter':
          estimate += datasetSize * 0.001; // 1ms per 1000 rows
          break;
        case 'sort':
          estimate += datasetSize * Math.log2(datasetSize) * 0.001; // O(n log n)
          break;
        case 'group':
          estimate += datasetSize * 0.002; // 2ms per 1000 rows
          break;
        case 'join':
          estimate += datasetSize * 0.005; // 5ms per 1000 rows
          break;
        case 'slice':
          estimate += 1; // Constant time
          break;
        case 'renameColumns':
          estimate += 1; // Constant time
          break;
        case 'addColumn':
          estimate += datasetSize * 0.001; // 1ms per 1000 rows
          break;
        case 'removeColumns':
          estimate += datasetSize * 0.001; // 1ms per 1000 rows
          break;
      }
    }

    return Math.max(estimate, 1); // Minimum 1ms
  }

  private executeOperation(dataset: Dataset, operation: PipelineOperation): Dataset {
    switch (operation.type) {
      case 'filter':
        return this.processor.filter(dataset, operation.params.condition);
      
      case 'sort':
        return this.processor.sort(dataset, operation.params.sortConfigs);
      
      case 'group':
        return this.processor.group(dataset, operation.params.config);
      
      case 'join':
        return this.processor.join(
          dataset,
          operation.params.rightDataset,
          operation.params.config
        );
      
      case 'slice':
        return this.processor.slice(
          dataset,
          operation.params.start,
          operation.params.end
        );
      
      case 'renameColumns':
        return this.processor.renameColumns(dataset, operation.params.mapping);
      
      case 'addColumn':
        return this.processor.addColumn(
          dataset,
          operation.params.columnName,
          operation.params.computeFn,
          operation.params.index
        );
      
      case 'removeColumns':
        return this.processor.removeColumns(dataset, operation.params.columnsToRemove);
      
      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }
}

/**
 * Pipeline operation definition
 */
interface PipelineOperation {
  type: 'filter' | 'sort' | 'group' | 'join' | 'slice' | 'renameColumns' | 'addColumn' | 'removeColumns';
  params: any;
}

/**
 * Pipeline builder for fluent API
 */
export class PipelineBuilder {
  static create(): DataPipeline {
    return new DataPipeline();
  }

  static from(dataset: Dataset): ExecutablePipeline {
    return new ExecutablePipeline(dataset);
  }
}

/**
 * Executable pipeline that starts with a dataset
 */
export class ExecutablePipeline extends DataPipeline {
  constructor(private sourceDataset: Dataset) {
    super();
  }

  /**
   * Execute the pipeline and return the result
   */
  run(): Dataset {
    return this.execute(this.sourceDataset);
  }

  /**
   * Execute the pipeline asynchronously
   */
  async runAsync(
    onProgress?: (step: number, total: number, operation: string) => void
  ): Promise<Dataset> {
    return this.executeAsync(this.sourceDataset, onProgress);
  }
}

/**
 * Utility functions for common pipeline patterns
 */
export const PipelineUtils = {
  /**
   * Create a simple filter pipeline
   */
  createFilterPipeline(condition: FilterCondition | CompoundFilterCondition): DataPipeline {
    return PipelineBuilder.create().filter(condition);
  },

  /**
   * Create a sort pipeline
   */
  createSortPipeline(column: string, direction: 'asc' | 'desc' = 'asc'): DataPipeline {
    return PipelineBuilder.create().sort([{ column, direction }]);
  },

  /**
   * Create a group and aggregate pipeline
   */
  createGroupPipeline(groupColumns: string[], aggregations: GroupConfig['aggregations']): DataPipeline {
    return PipelineBuilder.create().group({ columns: groupColumns, aggregations });
  },

  /**
   * Create a data cleaning pipeline
   */
  createCleaningPipeline(options: {
    removeNulls?: boolean;
    trimStrings?: boolean;
    removeEmptyRows?: boolean;
  }): DataPipeline {
    const pipeline = PipelineBuilder.create();

    if (options.removeNulls) {
      pipeline.filter({
        operator: 'and',
        conditions: [], // Will be populated based on dataset columns
      });
    }

    if (options.trimStrings) {
      // This would need to be implemented as a custom transformation
    }

    if (options.removeEmptyRows) {
      // Filter out rows where all values are null/empty
    }

    return pipeline;
  },
};