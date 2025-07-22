// Web Worker for heavy data processing operations
import type { Dataset, FilterCondition, SortConfig, GroupConfig } from '../types';

export interface WorkerMessage {
  id: string;
  type: 'filter' | 'sort' | 'group' | 'transform' | 'aggregate';
  payload: any;
}

export interface WorkerResponse {
  id: string;
  type: 'success' | 'error' | 'progress';
  payload: any;
}

// Helper function to send progress updates
const sendProgress = (id: string, progress: number, message?: string) => {
  self.postMessage({
    id,
    type: 'progress',
    payload: { progress, message }
  } as WorkerResponse);
};

// Filter dataset
const filterDataset = (dataset: Dataset, conditions: FilterCondition[], id: string): Dataset => {
  const { columns, rows } = dataset;
  const totalRows = rows.length;
  let processedRows = 0;
  
  const filteredRows = rows.filter((row, index) => {
    // Send progress updates every 1000 rows
    if (index % 1000 === 0) {
      processedRows = index;
      sendProgress(id, (processedRows / totalRows) * 100, `Filtering row ${index + 1}/${totalRows}`);
    }
    
    return conditions.every(condition => {
      const columnIndex = columns.indexOf(condition.column);
      if (columnIndex === -1) return true;
      
      const cellValue = row[columnIndex];
      const { operator, value } = condition;
      
      switch (operator) {
        case 'equals':
          return cellValue === value;
        case 'not_equals':
          return cellValue !== value;
        case 'contains':
          return String(cellValue).toLowerCase().includes(String(value).toLowerCase());
        case 'not_contains':
          return !String(cellValue).toLowerCase().includes(String(value).toLowerCase());
        case 'starts_with':
          return String(cellValue).toLowerCase().startsWith(String(value).toLowerCase());
        case 'ends_with':
          return String(cellValue).toLowerCase().endsWith(String(value).toLowerCase());
        case 'greater_than':
          return Number(cellValue) > Number(value);
        case 'less_than':
          return Number(cellValue) < Number(value);
        case 'greater_equal':
          return Number(cellValue) >= Number(value);
        case 'less_equal':
          return Number(cellValue) <= Number(value);
        case 'is_null':
          return cellValue == null;
        case 'is_not_null':
          return cellValue != null;
        default:
          return true;
      }
    });
  });
  
  sendProgress(id, 100, 'Filtering complete');
  
  return {
    ...dataset,
    rows: filteredRows,
    metadata: {
      ...dataset.metadata,
      rowCount: filteredRows.length,
      modified: new Date()
    }
  };
};

// Sort dataset
const sortDataset = (dataset: Dataset, sortConfig: SortConfig, id: string): Dataset => {
  const { columns, rows } = dataset;
  const columnIndex = columns.indexOf(sortConfig.column);
  
  if (columnIndex === -1) {
    throw new Error(`Column "${sortConfig.column}" not found`);
  }
  
  sendProgress(id, 10, 'Starting sort operation');
  
  const sortedRows = [...rows].sort((a, b) => {
    const aValue = a[columnIndex];
    const bValue = b[columnIndex];
    
    // Handle null/undefined values
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
    if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;
    
    // Type-aware comparison
    let comparison = 0;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    } else {
      comparison = String(aValue).localeCompare(String(bValue));
    }
    
    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
  
  sendProgress(id, 100, 'Sort complete');
  
  return {
    ...dataset,
    rows: sortedRows,
    metadata: {
      ...dataset.metadata,
      modified: new Date()
    }
  };
};

// Group dataset
const groupDataset = (dataset: Dataset, groupConfig: GroupConfig, id: string): Dataset => {
  const { columns, rows } = dataset;
  const groupColumns = groupConfig.columns;
  const aggregations = groupConfig.aggregations || [];
  
  sendProgress(id, 10, 'Starting grouping operation');
  
  // Create group key for each row
  const groups = new Map<string, any[]>();
  
  rows.forEach((row, index) => {
    if (index % 1000 === 0) {
      sendProgress(id, 10 + (index / rows.length) * 60, `Processing row ${index + 1}/${rows.length}`);
    }
    
    const groupKey = groupColumns.map(col => {
      const colIndex = columns.indexOf(col);
      return colIndex !== -1 ? row[colIndex] : null;
    }).join('|');
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(row);
  });
  
  sendProgress(id, 70, 'Calculating aggregations');
  
  // Calculate aggregations
  const resultColumns = [...groupColumns];
  const resultRows: any[][] = [];
  
  // Add aggregation columns
  aggregations.forEach(agg => {
    resultColumns.push(`${agg.function}(${agg.column})`);
  });
  
  let groupIndex = 0;
  groups.forEach((groupRows, groupKey) => {
    if (groupIndex % 100 === 0) {
      sendProgress(id, 70 + (groupIndex / groups.size) * 25, `Processing group ${groupIndex + 1}/${groups.size}`);
    }
    
    const groupValues = groupKey.split('|');
    const resultRow = [...groupValues];
    
    // Calculate aggregations for this group
    aggregations.forEach(agg => {
      const colIndex = columns.indexOf(agg.column);
      if (colIndex === -1) {
        resultRow.push(null);
        return;
      }
      
      const values = groupRows.map(row => row[colIndex]).filter(val => val != null);
      
      switch (agg.function) {
        case 'count':
          resultRow.push(groupRows.length);
          break;
        case 'sum':
          resultRow.push(values.reduce((sum, val) => sum + Number(val), 0));
          break;
        case 'avg':
          resultRow.push(values.length > 0 ? values.reduce((sum, val) => sum + Number(val), 0) / values.length : null);
          break;
        case 'min':
          resultRow.push(values.length > 0 ? Math.min(...values.map(Number)) : null);
          break;
        case 'max':
          resultRow.push(values.length > 0 ? Math.max(...values.map(Number)) : null);
          break;
        case 'first':
          resultRow.push(values.length > 0 ? values[0] : null);
          break;
        case 'last':
          resultRow.push(values.length > 0 ? values[values.length - 1] : null);
          break;
        default:
          resultRow.push(null);
      }
    });
    
    resultRows.push(resultRow);
    groupIndex++;
  });
  
  sendProgress(id, 100, 'Grouping complete');
  
  return {
    columns: resultColumns,
    rows: resultRows,
    metadata: {
      rowCount: resultRows.length,
      columnCount: resultColumns.length,
      types: {},
      nullable: {},
      unique: {},
      created: new Date(),
      modified: new Date()
    }
  };
};

// Transform dataset (apply multiple operations)
const transformDataset = (dataset: Dataset, operations: any[], id: string): Dataset => {
  let result = dataset;
  const totalOps = operations.length;
  
  operations.forEach((operation, index) => {
    sendProgress(id, (index / totalOps) * 100, `Applying operation ${index + 1}/${totalOps}: ${operation.type}`);
    
    switch (operation.type) {
      case 'filter':
        result = filterDataset(result, operation.conditions, `${id}-filter-${index}`);
        break;
      case 'sort':
        result = sortDataset(result, operation.config, `${id}-sort-${index}`);
        break;
      case 'group':
        result = groupDataset(result, operation.config, `${id}-group-${index}`);
        break;
      // Add more transformation types as needed
    }
  });
  
  sendProgress(id, 100, 'All transformations complete');
  return result;
};

// Calculate dataset statistics
const calculateStatistics = (dataset: Dataset, id: string) => {
  const { columns, rows } = dataset;
  const stats: Record<string, any> = {};
  
  columns.forEach((column, colIndex) => {
    sendProgress(id, (colIndex / columns.length) * 100, `Analyzing column: ${column}`);
    
    const values = rows.map(row => row[colIndex]).filter(val => val != null);
    const numericValues = values.filter(val => !isNaN(Number(val))).map(Number);
    
    stats[column] = {
      count: values.length,
      nullCount: rows.length - values.length,
      uniqueCount: new Set(values).size,
      dataType: numericValues.length === values.length ? 'number' : 'string'
    };
    
    if (numericValues.length > 0) {
      stats[column].min = Math.min(...numericValues);
      stats[column].max = Math.max(...numericValues);
      stats[column].mean = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      stats[column].median = numericValues.sort((a, b) => a - b)[Math.floor(numericValues.length / 2)];
    }
  });
  
  sendProgress(id, 100, 'Statistics calculation complete');
  return stats;
};

// Main message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { id, type, payload } = event.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'filter':
        result = filterDataset(payload.dataset, payload.conditions, id);
        break;
      case 'sort':
        result = sortDataset(payload.dataset, payload.config, id);
        break;
      case 'group':
        result = groupDataset(payload.dataset, payload.config, id);
        break;
      case 'transform':
        result = transformDataset(payload.dataset, payload.operations, id);
        break;
      case 'aggregate':
        result = calculateStatistics(payload.dataset, id);
        break;
      default:
        throw new Error(`Unknown operation type: ${type}`);
    }
    
    self.postMessage({
      id,
      type: 'success',
      payload: result
    } as WorkerResponse);
    
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      payload: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    } as WorkerResponse);
  }
};

// Export types for TypeScript
export type { Dataset, FilterCondition, SortConfig, GroupConfig };