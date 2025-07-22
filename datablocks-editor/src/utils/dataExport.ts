import type { Dataset } from '../types';

/**
 * Export dataset to CSV format
 */
export const exportDatasetToCSV = (dataset: Dataset, filename?: string): void => {
  const csvContent = convertDatasetToCSV(dataset);
  downloadFile(csvContent, filename || 'data.csv', 'text/csv');
};

/**
 * Export dataset to JSON format
 */
export const exportDatasetToJSON = (dataset: Dataset, filename?: string): void => {
  const jsonContent = convertDatasetToJSON(dataset);
  downloadFile(jsonContent, filename || 'data.json', 'application/json');
};

/**
 * Export dataset to Excel-compatible TSV format
 */
export const exportDatasetToExcel = (dataset: Dataset, filename?: string): void => {
  const tsvContent = convertDatasetToTSV(dataset);
  downloadFile(tsvContent, filename || 'data.tsv', 'text/tab-separated-values');
};

/**
 * Convert dataset to CSV format
 */
const convertDatasetToCSV = (dataset: Dataset): string => {
  const { columns, rows } = dataset;
  
  // Helper function to escape CSV values
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    const stringValue = String(value);
    
    // If the value contains comma, quote, or newline, wrap in quotes and escape quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };
  
  // Create CSV content
  const csvRows = [
    // Header row
    columns.map(escapeCSVValue).join(','),
    // Data rows
    ...rows.map(row => row.map(escapeCSVValue).join(','))
  ];
  
  return csvRows.join('\n');
};

/**
 * Convert dataset to JSON format
 */
const convertDatasetToJSON = (dataset: Dataset): string => {
  const { columns, rows } = dataset;
  
  // Convert rows to objects
  const objects = rows.map(row => {
    const obj: Record<string, any> = {};
    columns.forEach((column, index) => {
      obj[column] = row[index];
    });
    return obj;
  });
  
  return JSON.stringify(objects, null, 2);
};

/**
 * Convert dataset to TSV format (Tab-separated values)
 */
const convertDatasetToTSV = (dataset: Dataset): string => {
  const { columns, rows } = dataset;
  
  // Helper function to escape TSV values
  const escapeTSVValue = (value: any): string => {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Replace tabs and newlines with spaces
    return String(value).replace(/[\t\n\r]/g, ' ');
  };
  
  // Create TSV content
  const tsvRows = [
    // Header row
    columns.map(escapeTSVValue).join('\t'),
    // Data rows
    ...rows.map(row => row.map(escapeTSVValue).join('\t'))
  ];
  
  return tsvRows.join('\n');
};

/**
 * Download file with given content
 */
const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL
  URL.revokeObjectURL(url);
};

/**
 * Filter dataset based on column filters
 */
export const filterDataset = (
  dataset: Dataset,
  filters: Record<string, string>
): Dataset => {
  const { columns, rows } = dataset;
  
  // Get active filters (non-empty values)
  const activeFilters = Object.entries(filters).filter(([_, value]) => value.trim() !== '');
  
  if (activeFilters.length === 0) {
    return dataset;
  }
  
  // Filter rows
  const filteredRows = rows.filter(row => {
    return activeFilters.every(([columnName, filterValue]) => {
      const columnIndex = columns.indexOf(columnName);
      if (columnIndex === -1) return true; // Skip non-existent columns
      
      const cellValue = row[columnIndex];
      if (cellValue === null || cellValue === undefined) return false;
      
      // Case-insensitive partial match
      return String(cellValue).toLowerCase().includes(filterValue.toLowerCase());
    });
  });
  
  return {
    ...dataset,
    rows: filteredRows,
    metadata: {
      ...dataset.metadata,
      rowCount: filteredRows.length
    }
  };
};

/**
 * Sort dataset by column
 */
export const sortDataset = (
  dataset: Dataset,
  columnName: string,
  direction: 'asc' | 'desc' = 'asc'
): Dataset => {
  const { columns, rows } = dataset;
  
  const columnIndex = columns.indexOf(columnName);
  if (columnIndex === -1) {
    throw new Error(`Column "${columnName}" not found`);
  }
  
  // Create a copy of rows to avoid mutating original
  const sortedRows = [...rows].sort((a, b) => {
    const aValue = a[columnIndex];
    const bValue = b[columnIndex];
    
    // Handle null/undefined values (put them at the end)
    if (aValue === null || aValue === undefined) {
      if (bValue === null || bValue === undefined) return 0;
      return direction === 'asc' ? -1 : 1;
    }
    if (bValue === null || bValue === undefined) {
      return direction === 'asc' ? 1 : -1;
    }
    
    // Type-aware comparison
    let comparison = 0;
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      comparison = aValue - bValue;
    } else if (aValue instanceof Date && bValue instanceof Date) {
      comparison = aValue.getTime() - bValue.getTime();
    } else {
      // String comparison
      comparison = String(aValue).localeCompare(String(bValue));
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
  
  return {
    ...dataset,
    rows: sortedRows
  };
};