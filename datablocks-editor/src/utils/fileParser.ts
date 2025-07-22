import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { Dataset, PrimitiveType } from '../types';
import { createDatasetFromArray } from './dataUtils';

/**
 * File parsing utilities for different file formats
 */

export interface ParseResult {
  success: boolean;
  dataset?: Dataset;
  error?: string;
  warnings?: string[];
}

export interface ParseOptions {
  hasHeader?: boolean;
  delimiter?: string;
  encoding?: string;
  skipEmptyLines?: boolean;
  maxRows?: number;
}

/**
 * Parse CSV file using Papa Parse
 */
export const parseCSV = async (
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> => {
  try {
    const {
      hasHeader = true,
      delimiter = '',
      skipEmptyLines = true,
      maxRows,
    } = options;

    return new Promise((resolve) => {
      Papa.parse(file, {
        header: hasHeader,
        delimiter: delimiter || undefined,
        skipEmptyLines,
        dynamicTyping: true,
        transformHeader: (header: string) => header.trim(),
        complete: (results) => {
          try {
            if (results.errors.length > 0) {
              const criticalErrors = results.errors.filter(
                (error) => error.type === 'Delimiter' || error.type === 'Quotes'
              );
              
              if (criticalErrors.length > 0) {
                resolve({
                  success: false,
                  error: `CSV parsing failed: ${criticalErrors[0].message}`,
                });
                return;
              }
            }

            let data = results.data;
            
            // Limit rows if specified
            if (maxRows && data.length > maxRows) {
              data = data.slice(0, maxRows);
            }

            // Filter out empty rows
            data = data.filter((row: any) => {
              if (Array.isArray(row)) {
                return row.some(cell => cell !== null && cell !== undefined && cell !== '');
              } else if (typeof row === 'object' && row !== null) {
                return Object.values(row).some(cell => cell !== null && cell !== undefined && cell !== '');
              }
              return false;
            });

            // When hasHeader is false, Papa Parse returns array of arrays
            // We need to convert it to the right format for createDatasetFromArray
            if (!hasHeader && data.length > 0 && Array.isArray(data[0])) {
              // Generate column names
              const columnCount = Math.max(...data.map((row: any[]) => row.length));
              const columns = Array.from({ length: columnCount }, (_, i) => `Column ${i + 1}`);
              
              const dataset = createDatasetFromArray(data, columns);
              
              resolve({
                success: true,
                dataset,
                warnings: results.errors.length > 0 ? [`${results.errors.length} parsing warnings encountered`] : undefined,
              });
              return;
            }

            if (data.length === 0) {
              resolve({
                success: false,
                error: 'No valid data found in CSV file',
              });
              return;
            }

            const dataset = createDatasetFromArray(data);
            
            const warnings: string[] = [];
            if (results.errors.length > 0) {
              warnings.push(`${results.errors.length} parsing warnings encountered`);
            }

            resolve({
              success: true,
              dataset,
              warnings: warnings.length > 0 ? warnings : undefined,
            });
          } catch (error) {
            resolve({
              success: false,
              error: `Failed to create dataset: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        },
        error: (error) => {
          resolve({
            success: false,
            error: `CSV parsing failed: ${error.message}`,
          });
        },
      });
    });
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Parse JSON file
 */
export const parseJSON = async (
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> => {
  try {
    const text = await file.text();
    const data = JSON.parse(text);

    const { maxRows } = options;

    // Handle different JSON structures
    let arrayData: any[];

    if (Array.isArray(data)) {
      arrayData = data;
    } else if (typeof data === 'object' && data !== null) {
      // If it's an object, try to find an array property
      const arrayKeys = Object.keys(data).filter(key => Array.isArray(data[key]));
      
      if (arrayKeys.length === 1) {
        arrayData = data[arrayKeys[0]];
      } else if (arrayKeys.length > 1) {
        // Multiple arrays found, use the largest one
        arrayData = arrayKeys.reduce((largest, key) => 
          data[key].length > largest.length ? data[key] : largest, 
          []
        );
      } else {
        // Convert single object to array
        arrayData = [data];
      }
    } else {
      return {
        success: false,
        error: 'JSON file must contain an array or object with array properties',
      };
    }

    if (arrayData.length === 0) {
      return {
        success: false,
        error: 'No data found in JSON file',
      };
    }

    // Limit rows if specified
    if (maxRows && arrayData.length > maxRows) {
      arrayData = arrayData.slice(0, maxRows);
    }

    const dataset = createDatasetFromArray(arrayData);

    return {
      success: true,
      dataset,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Invalid JSON format'}`,
    };
  }
};

/**
 * Parse Excel file using SheetJS
 */
export const parseExcel = async (
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> => {
  try {
    const { maxRows } = options;
    
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get the first worksheet
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return {
        success: false,
        error: 'No worksheets found in Excel file',
      };
    }

    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: null,
      blankrows: false,
    }) as any[][];

    if (jsonData.length === 0) {
      return {
        success: false,
        error: 'No data found in Excel file',
      };
    }

    // Assume first row is header
    const headers = jsonData[0]?.map((header: any) => 
      header ? String(header).trim() : `Column ${jsonData[0].indexOf(header) + 1}`
    );
    
    let dataRows = jsonData.slice(1);

    // Filter out completely empty rows
    dataRows = dataRows.filter(row => 
      row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

    if (dataRows.length === 0) {
      return {
        success: false,
        error: 'No data rows found in Excel file',
      };
    }

    // Limit rows if specified
    if (maxRows && dataRows.length > maxRows) {
      dataRows = dataRows.slice(0, maxRows);
    }

    // Ensure all rows have the same length as headers
    const normalizedRows = dataRows.map(row => {
      const normalizedRow = [...row];
      while (normalizedRow.length < headers.length) {
        normalizedRow.push(null);
      }
      return normalizedRow.slice(0, headers.length);
    });

    const dataset: Dataset = {
      columns: headers,
      rows: normalizedRows,
      metadata: {
        rowCount: normalizedRows.length,
        columnCount: headers.length,
        types: inferTypesFromRows(headers, normalizedRows),
        nullable: calculateNullableFromRows(headers, normalizedRows),
        unique: calculateUniqueFromRows(headers, normalizedRows),
        created: new Date(),
        modified: new Date(),
      },
    };

    const warnings: string[] = [];
    if (workbook.SheetNames.length > 1) {
      warnings.push(`File contains ${workbook.SheetNames.length} sheets. Only the first sheet "${sheetName}" was imported.`);
    }

    return {
      success: true,
      dataset,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
};

/**
 * Auto-detect file format and parse accordingly
 */
export const parseFile = async (
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> => {
  const extension = file.name.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'csv':
      return parseCSV(file, options);
    case 'json':
      return parseJSON(file, options);
    case 'xlsx':
    case 'xls':
      return parseExcel(file, options);
    default:
      return {
        success: false,
        error: `Unsupported file format: ${extension}. Supported formats: CSV, JSON, Excel (.xlsx, .xls)`,
      };
  }
};

/**
 * Validate file before parsing
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const supportedExtensions = ['csv', 'json', 'xlsx', 'xls'];
  
  if (file.size > maxSize) {
    return {
      valid: false,
      error: 'File size exceeds 50MB limit',
    };
  }

  const extension = file.name.toLowerCase().split('.').pop();
  if (!extension || !supportedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: ${supportedExtensions.join(', ')}`,
    };
  }

  return { valid: true };
};

// Helper functions for type inference
const inferTypesFromRows = (columns: string[], rows: any[][]): Record<string, PrimitiveType> => {
  const types: Record<string, PrimitiveType> = {};

  columns.forEach((column, colIndex) => {
    const values = rows.map(row => row[colIndex]).filter(v => v != null);
    
    if (values.length === 0) {
      types[column] = 'string';
      return;
    }

    // Check for numbers
    if (values.every(v => typeof v === 'number' || (!isNaN(Number(v)) && v !== ''))) {
      types[column] = 'number';
      return;
    }

    // Check for booleans
    if (values.every(v => typeof v === 'boolean' || v === 'true' || v === 'false' || v === 1 || v === 0)) {
      types[column] = 'boolean';
      return;
    }

    // Check for dates
    if (values.every(v => !isNaN(Date.parse(v)))) {
      types[column] = 'date';
      return;
    }

    // Default to string
    types[column] = 'string';
  });

  return types;
};

const calculateNullableFromRows = (columns: string[], rows: any[][]): Record<string, boolean> => {
  const nullable: Record<string, boolean> = {};

  columns.forEach((column, colIndex) => {
    const hasNull = rows.some(row => row[colIndex] == null);
    nullable[column] = hasNull;
  });

  return nullable;
};

const calculateUniqueFromRows = (columns: string[], rows: any[][]): Record<string, boolean> => {
  const unique: Record<string, boolean> = {};

  columns.forEach((column, colIndex) => {
    const values = rows.map(row => row[colIndex]);
    const uniqueValues = new Set(values);
    unique[column] = uniqueValues.size === values.length;
  });

  return unique;
};