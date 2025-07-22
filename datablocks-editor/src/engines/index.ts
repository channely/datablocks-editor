// Export all engine components
export { ExecutionEngine, executionEngine } from './ExecutionEngine';
export { ExecutionGraphBuilder, executionGraphBuilder } from './ExecutionGraph';
export { NodeExecutor, NodeExecutorRegistry, nodeExecutorRegistry } from './NodeExecutor';

// Export data processing engines
export { DataProcessor, dataProcessor } from './DataProcessor';
export { DataTransformers, DataTransformUtils } from './DataTransformers';
export { DataPipeline, PipelineBuilder, PipelineUtils, ExecutablePipeline } from './DataPipeline';
export { DataProfiler } from './DataProfiler';
export {
  DataSampler,
  DataExporter,
  DataValidator,
  PerformanceMonitor,
  DataUtilities,
} from './DataUtils';
export type {
  DataProfile,
  DatasetOverview,
  ColumnProfile,
  EnhancedTypeInfo,
  PatternInfo,
  DataQualityAssessment,
  QualityDimension,
  ColumnRelationship,
  ColumnStatistics,
} from './DataProfiler';
export type {
  CSVExportOptions,
  DataSchema,
  ValidationResult,
  ValidationError,
  ValidationWarning,
  DataQualityReport,
  DataQualityIssue,
  PerformanceMetric,
  MemoryUsage,
} from './DataUtils';

// Export executors
export {
  ExampleDataExecutor,
  FilterExecutor,
  SortExecutor,
  GroupExecutor,
} from './executors/BaseExecutors';
export { FileInputExecutor } from './executors/FileInputExecutor';
export { PasteInputExecutor } from './executors/PasteInputExecutor';
export { ChartExecutor } from './executors/ChartExecutor';

// Initialize executors
import { nodeExecutorRegistry } from './NodeExecutor';
import {
  ExampleDataExecutor,
  FilterExecutor,
  SortExecutor,
  GroupExecutor,
} from './executors/BaseExecutors';
import { FileInputExecutor } from './executors/FileInputExecutor';
import { PasteInputExecutor } from './executors/PasteInputExecutor';
import { ChartExecutor } from './executors/ChartExecutor';

/**
 * Initialize all node executors
 */
export function initializeExecutors(): void {
  // Register input executors
  nodeExecutorRegistry.register('file-input', new FileInputExecutor());
  nodeExecutorRegistry.register('paste-input', new PasteInputExecutor());
  
  // Register base executors
  nodeExecutorRegistry.register('example-data', new ExampleDataExecutor());
  nodeExecutorRegistry.register('filter', new FilterExecutor());
  nodeExecutorRegistry.register('sort', new SortExecutor());
  nodeExecutorRegistry.register('group', new GroupExecutor());
  
  // Register visualization executors
  nodeExecutorRegistry.register('chart', new ChartExecutor());
}

// Auto-initialize when module is imported
initializeExecutors();