import type {
  Dataset,
  NodeInstance,
  Connection,
  ExecutionGraph,
  GraphNode,
} from '../types';
import { inferDatasetTypes } from './validation';

/**
 * Data manipulation and utility functions
 */

// ============================================================================
// DATASET UTILITIES
// ============================================================================

export const createEmptyDataset = (): Dataset => ({
  columns: [],
  rows: [],
  metadata: {
    rowCount: 0,
    columnCount: 0,
    types: {},
    nullable: {},
    unique: {},
    created: new Date(),
    modified: new Date(),
  },
});

export const createDatasetFromArray = (
  data: any[],
  columns?: string[]
): Dataset => {
  if (data.length === 0) {
    return createEmptyDataset();
  }

  // If data is array of objects, extract columns and convert to rows
  if (
    typeof data[0] === 'object' &&
    data[0] !== null &&
    !Array.isArray(data[0])
  ) {
    const inferredColumns = columns || Object.keys(data[0]);
    const rows = data.map(obj => inferredColumns.map(col => obj[col] ?? null));

    const dataset: Dataset = {
      columns: inferredColumns,
      rows,
      metadata: {
        rowCount: rows.length,
        columnCount: inferredColumns.length,
        types: {},
        nullable: {},
        unique: {},
        created: new Date(),
        modified: new Date(),
      },
    };

    // Infer types and metadata
    dataset.metadata.types = inferDatasetTypes(dataset);
    dataset.metadata.nullable = calculateNullable(dataset);
    dataset.metadata.unique = calculateUnique(dataset);

    return dataset;
  }

  // If data is array of arrays, use provided columns or generate them
  if (Array.isArray(data[0])) {
    const inferredColumns = columns || data[0].map((_, i) => `Column ${i + 1}`);
    const rows = data.slice(columns ? 0 : 1); // Skip first row if no columns provided

    const dataset: Dataset = {
      columns: inferredColumns,
      rows,
      metadata: {
        rowCount: rows.length,
        columnCount: inferredColumns.length,
        types: {},
        nullable: {},
        unique: {},
        created: new Date(),
        modified: new Date(),
      },
    };

    dataset.metadata.types = inferDatasetTypes(dataset);
    dataset.metadata.nullable = calculateNullable(dataset);
    dataset.metadata.unique = calculateUnique(dataset);

    return dataset;
  }

  throw new Error('Invalid data format for dataset creation');
};

export const cloneDataset = (dataset: Dataset): Dataset => ({
  columns: [...dataset.columns],
  rows: dataset.rows.map(row => [...row]),
  metadata: {
    ...dataset.metadata,
    types: { ...dataset.metadata.types },
    nullable: { ...dataset.metadata.nullable },
    unique: { ...dataset.metadata.unique },
    modified: new Date(),
  },
});

export const getColumnIndex = (
  dataset: Dataset,
  columnName: string
): number => {
  return dataset.columns.indexOf(columnName);
};

export const getColumnValues = (
  dataset: Dataset,
  columnName: string
): any[] => {
  const index = getColumnIndex(dataset, columnName);
  if (index === -1) {
    throw new Error(`Column "${columnName}" not found`);
  }
  return dataset.rows.map(row => row[index]);
};

export const addColumn = (
  dataset: Dataset,
  columnName: string,
  values: any[],
  index?: number
): Dataset => {
  const newDataset = cloneDataset(dataset);

  if (values.length !== dataset.rows.length) {
    throw new Error('Column values length must match number of rows');
  }

  const insertIndex = index ?? newDataset.columns.length;
  newDataset.columns.splice(insertIndex, 0, columnName);

  newDataset.rows.forEach((row, rowIndex) => {
    row.splice(insertIndex, 0, values[rowIndex]);
  });

  newDataset.metadata.columnCount = newDataset.columns.length;
  newDataset.metadata.types = inferDatasetTypes(newDataset);
  newDataset.metadata.nullable = calculateNullable(newDataset);
  newDataset.metadata.unique = calculateUnique(newDataset);

  return newDataset;
};

export const removeColumn = (dataset: Dataset, columnName: string): Dataset => {
  const index = getColumnIndex(dataset, columnName);
  if (index === -1) {
    throw new Error(`Column "${columnName}" not found`);
  }

  const newDataset = cloneDataset(dataset);
  newDataset.columns.splice(index, 1);
  newDataset.rows.forEach(row => row.splice(index, 1));

  newDataset.metadata.columnCount = newDataset.columns.length;
  delete newDataset.metadata.types[columnName];
  delete newDataset.metadata.nullable[columnName];
  delete newDataset.metadata.unique[columnName];

  return newDataset;
};

export const renameColumn = (
  dataset: Dataset,
  oldName: string,
  newName: string
): Dataset => {
  const index = getColumnIndex(dataset, oldName);
  if (index === -1) {
    throw new Error(`Column "${oldName}" not found`);
  }

  const newDataset = cloneDataset(dataset);
  newDataset.columns[index] = newName;

  // Update metadata
  newDataset.metadata.types[newName] = newDataset.metadata.types[oldName];
  newDataset.metadata.nullable[newName] = newDataset.metadata.nullable[oldName];
  newDataset.metadata.unique[newName] = newDataset.metadata.unique[oldName];

  delete newDataset.metadata.types[oldName];
  delete newDataset.metadata.nullable[oldName];
  delete newDataset.metadata.unique[oldName];

  return newDataset;
};

// ============================================================================
// METADATA CALCULATION
// ============================================================================

const calculateNullable = (dataset: Dataset): Record<string, boolean> => {
  const nullable: Record<string, boolean> = {};

  dataset.columns.forEach((column, colIndex) => {
    const hasNull = dataset.rows.some(
      row => row[colIndex] === null || row[colIndex] === undefined
    );
    nullable[column] = hasNull;
  });

  return nullable;
};

const calculateUnique = (dataset: Dataset): Record<string, boolean> => {
  const unique: Record<string, boolean> = {};

  dataset.columns.forEach((column, colIndex) => {
    const values = dataset.rows.map(row => row[colIndex]);
    const uniqueValues = new Set(values);
    unique[column] = uniqueValues.size === values.length;
  });

  return unique;
};

// ============================================================================
// GRAPH UTILITIES
// ============================================================================

export const buildExecutionGraph = (
  nodes: NodeInstance[],
  connections: Connection[]
): ExecutionGraph => {
  const graphNodes = new Map<string, GraphNode>();

  // Initialize graph nodes
  nodes.forEach(node => {
    graphNodes.set(node.id, {
      instance: node,
      definition: null as any, // Will be filled by the execution engine
      dependencies: [],
      dependents: [],
      level: 0,
    });
  });

  // Build dependency relationships
  connections.forEach(connection => {
    const sourceNode = graphNodes.get(connection.source);
    const targetNode = graphNodes.get(connection.target);

    if (sourceNode && targetNode) {
      sourceNode.dependents.push(connection.target);
      targetNode.dependencies.push(connection.source);
    }
  });

  // Calculate execution levels (topological sort)
  const executionOrder = topologicalSort(graphNodes);
  const cycles = detectCycles(graphNodes);

  return {
    nodes: graphNodes,
    executionOrder,
    cycles,
  };
};

const topologicalSort = (nodes: Map<string, GraphNode>): string[] => {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];

  const visit = (nodeId: string): void => {
    if (visiting.has(nodeId)) {
      throw new Error(`Circular dependency detected involving node ${nodeId}`);
    }

    if (visited.has(nodeId)) {
      return;
    }

    visiting.add(nodeId);

    const node = nodes.get(nodeId);
    if (node) {
      node.dependencies.forEach(depId => visit(depId));
      node.level = Math.max(
        0,
        ...node.dependencies.map(depId => (nodes.get(depId)?.level ?? 0) + 1)
      );
    }

    visiting.delete(nodeId);
    visited.add(nodeId);
    result.push(nodeId);
  };

  Array.from(nodes.keys()).forEach(nodeId => {
    if (!visited.has(nodeId)) {
      visit(nodeId);
    }
  });

  return result;
};

const detectCycles = (nodes: Map<string, GraphNode>): string[][] => {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const dfs = (nodeId: string, path: string[]): void => {
    if (recursionStack.has(nodeId)) {
      // Found a cycle
      const cycleStart = path.indexOf(nodeId);
      cycles.push(path.slice(cycleStart));
      return;
    }

    if (visited.has(nodeId)) {
      return;
    }

    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);

    const node = nodes.get(nodeId);
    if (node) {
      node.dependents.forEach(depId => dfs(depId, [...path]));
    }

    recursionStack.delete(nodeId);
  };

  Array.from(nodes.keys()).forEach(nodeId => {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  });

  return cycles;
};

// ============================================================================
// ID GENERATION
// ============================================================================

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const generateNodeId = (type: string): string => {
  return `${type}-${generateId()}`;
};

export const generateConnectionId = (
  source: string,
  target: string
): string => {
  return `${source}-${target}-${generateId()}`;
};

// ============================================================================
// TYPE GUARDS
// ============================================================================

export const isNodeInstance = (obj: any): obj is NodeInstance => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.type === 'string' &&
    typeof obj.position === 'object' &&
    typeof obj.position.x === 'number' &&
    typeof obj.position.y === 'number'
  );
};

export const isConnection = (obj: any): obj is Connection => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    typeof obj.id === 'string' &&
    typeof obj.source === 'string' &&
    typeof obj.target === 'string' &&
    typeof obj.sourceHandle === 'string' &&
    typeof obj.targetHandle === 'string'
  );
};
