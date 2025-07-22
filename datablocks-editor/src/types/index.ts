// ============================================================================
// CORE DATA TYPES
// ============================================================================

export type DataType =
  | 'dataset'
  | 'number'
  | 'string'
  | 'boolean'
  | 'object'
  | 'array'
  | 'any';

export type PrimitiveType = 'string' | 'number' | 'boolean' | 'date' | 'null';

// Dataset structure with enhanced metadata
export interface Dataset {
  columns: string[];
  rows: any[][];
  metadata: {
    rowCount: number;
    columnCount: number;
    types: Record<string, PrimitiveType>;
    nullable: Record<string, boolean>;
    unique: Record<string, boolean>;
    created: Date;
    modified: Date;
    source?: {
      type: string;
      dataType?: string;
      hasHeader?: boolean;
      originalLength?: number;
      [key: string]: any;
    };
  };
}

// ============================================================================
// NODE SYSTEM TYPES
// ============================================================================

// Port definition for node inputs/outputs
export interface PortDefinition {
  id: string;
  name: string;
  type: DataType;
  required: boolean;
  multiple: boolean;
  description?: string;
  defaultValue?: any;
}

// Node configuration schema
export interface NodeConfigSchema {
  [key: string]: {
    type: 'string' | 'number' | 'boolean' | 'select' | 'multiselect' | 'object';
    label: string;
    description?: string;
    required?: boolean;
    defaultValue?: any;
    options?: Array<{ label: string; value: any }>;
    validation?: ValidationRule[];
  };
}

// Validation rules for configuration
export interface ValidationRule {
  type: 'required' | 'min' | 'max' | 'pattern' | 'custom';
  value?: any;
  message: string;
  validator?: (value: any) => boolean;
}

// Node processor interface
export interface NodeProcessor {
  execute: (
    inputs: Record<string, any>,
    config: Record<string, any>
  ) => Promise<any>;
  validate: (
    inputs: Record<string, any>,
    config: Record<string, any>
  ) => ValidationResult;
  getOutputSchema?: (
    inputs: Record<string, any>,
    config: Record<string, any>
  ) => PortDefinition[];
}

// Validation result
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

// Complete node definition
export interface NodeDefinition {
  id: string;
  type: string;
  category: NodeCategory;
  name: string;
  description: string;
  version: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  configSchema: NodeConfigSchema;
  processor: NodeProcessor;
  icon?: string;
  color?: string;
  tags?: string[];
}

// Node instance (runtime)
export interface NodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, any>;
  config: Record<string, any>;
  status: NodeStatus;
  error?: AppError;
  lastExecuted?: Date;
  executionTime?: number;
  selected?: boolean;
  dragging?: boolean;
}

export type NodeStatus =
  | 'idle'
  | 'processing'
  | 'success'
  | 'error'
  | 'warning';

// ============================================================================
// CONNECTION TYPES
// ============================================================================

export interface Connection {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  animated?: boolean;
  style?: Record<string, any>;
}

// ============================================================================
// NODE CATEGORIES AND REGISTRY
// ============================================================================

export enum NodeCategory {
  INPUT = 'INPUT',
  TRANSFORM = 'TRANSFORM',
  VISUALIZATION = 'VISUALIZATION',
  ADVANCED = 'ADVANCED',
}

export interface NodeCategoryInfo {
  id: NodeCategory;
  name: string;
  description: string;
  icon?: string;
  color?: string;
}

// Node registry interface
export interface NodeRegistry {
  register(definition: NodeDefinition): void;
  unregister(nodeType: string): void;
  get(nodeType: string): NodeDefinition | undefined;
  getAll(): NodeDefinition[];
  getByCategory(category: NodeCategory): NodeDefinition[];
  search(query: string): NodeDefinition[];
}

// ============================================================================
// EXECUTION AND GRAPH TYPES
// ============================================================================

export interface ExecutionContext {
  nodeId: string;
  inputs: Record<string, any>;
  config: Record<string, any>;
  metadata: {
    executionId: string;
    startTime: Date;
    timeout?: number;
  };
}

export interface ExecutionResult {
  success: boolean;
  output?: any;
  error?: AppError;
  executionTime: number;
  metadata?: Record<string, any>;
}

export interface GraphNode {
  instance: NodeInstance;
  definition: NodeDefinition;
  dependencies: string[];
  dependents: string[];
  level: number;
}

export interface ExecutionGraph {
  nodes: Map<string, GraphNode>;
  executionOrder: string[];
  cycles: string[][];
}

// ============================================================================
// DATA PROCESSING TYPES
// ============================================================================

// Filter conditions
export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: any;
  type: PrimitiveType;
}

export type FilterOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'greater_than_or_equal'
  | 'less_than'
  | 'less_than_or_equal'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'is_null'
  | 'is_not_null'
  | 'in'
  | 'not_in';

export interface CompoundFilterCondition {
  operator: 'and' | 'or';
  conditions: (FilterCondition | CompoundFilterCondition)[];
}

// Sort configuration
export interface SortConfig {
  column: string;
  direction: 'asc' | 'desc';
  type?: PrimitiveType;
}

// Group configuration
export interface GroupConfig {
  columns: string[];
  aggregations: AggregationConfig[];
}

export interface AggregationConfig {
  column: string;
  function: AggregationFunction;
  alias?: string;
}

export type AggregationFunction =
  | 'count'
  | 'sum'
  | 'avg'
  | 'min'
  | 'max'
  | 'first'
  | 'last';

// Join configuration
export interface JoinConfig {
  type: JoinType;
  leftKey: string;
  rightKey: string;
  suffix?: string;
}

export type JoinType = 'inner' | 'left' | 'right' | 'outer';

// ============================================================================
// ERROR HANDLING
// ============================================================================

export enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  EXECUTION_ERROR = 'execution_error',
  DATA_ERROR = 'data_error',
  NETWORK_ERROR = 'network_error',
  FILE_ERROR = 'file_error',
  CONFIGURATION_ERROR = 'configuration_error',
  DEPENDENCY_ERROR = 'dependency_error',
}

export interface AppError {
  type: ErrorType;
  message: string;
  code?: string;
  nodeId?: string;
  field?: string;
  details?: Record<string, any>;
  timestamp: Date;
  stack?: string;
}

// ============================================================================
// APPLICATION STATE TYPES
// ============================================================================

export interface AppState {
  // Graph state
  nodes: NodeInstance[];
  connections: Connection[];

  // Selection state
  selectedNodes: string[];
  selectedConnections: string[];

  // UI state
  sidebarCollapsed: boolean;
  previewPanelHeight: number;
  canvasViewport: { x: number; y: number; zoom: number };

  // Execution state
  nodeOutputs: Map<string, any>;
  executionStatus: Map<string, NodeStatus>;
  isExecuting: boolean;

  // Error state
  errors: AppError[];

  // Project state
  projectName?: string;
  projectId?: string;
  lastSaved?: Date;
  isDirty: boolean;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Event types for the event system
export interface NodeEvent {
  type: 'node_added' | 'node_removed' | 'node_updated' | 'node_executed';
  nodeId: string;
  data?: any;
  timestamp: Date;
}

export interface ConnectionEvent {
  type: 'connection_added' | 'connection_removed';
  connectionId: string;
  data?: Connection;
  timestamp: Date;
}

export interface DataEvent {
  type: 'data_updated' | 'data_invalidated';
  nodeId: string;
  data?: any;
  timestamp: Date;
}
