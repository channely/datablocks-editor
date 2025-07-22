import type {
  ExecutionContext,
  ExecutionResult,
  ValidationResult,
  Dataset,
} from '../../types';
import { NodeExecutor } from '../NodeExecutor';
import { createDatasetFromArray } from '../../utils/dataUtils';

/**
 * Paste Input node executor
 * Handles parsing of pasted table data, CSV data, and JSON data
 */
export class PasteInputExecutor extends NodeExecutor {
  constructor() {
    super('paste-input');
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.safeExecute(context, async () => {
      const { config } = context;
      
      const data = config.data as string;
      if (!data || !data.trim()) {
        throw new Error('No data provided');
      }

      const dataType = config.dataType || 'table';
      const hasHeader = config.hasHeader !== false; // Default to true

      let dataset: Dataset;

      switch (dataType) {
        case 'json':
          dataset = await this.parseJSONData(data, hasHeader);
          break;
        case 'csv':
          dataset = await this.parseCSVData(data, hasHeader, ',');
          break;
        case 'table':
        default:
          dataset = await this.parseTableData(data, hasHeader, '\t');
          break;
      }

      // Add metadata about the source
      dataset.metadata = {
        ...dataset.metadata,
        source: {
          type: 'paste',
          dataType: dataType,
          hasHeader: hasHeader,
          originalLength: data.length
        },
        created: new Date(),
        modified: new Date()
      };

      return dataset;
    });
  }

  validate(context: ExecutionContext): ValidationResult {
    const { config } = context;
    const errors = [];
    const warnings = [];

    // Check if data is provided
    if (!config.data || !config.data.trim()) {
      errors.push({
        field: 'data',
        message: 'Data content is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      const data = config.data as string;
      const dataType = config.dataType || 'table';

      // Validate data format
      try {
        if (dataType === 'json') {
          const jsonData = JSON.parse(data);
          if (!Array.isArray(jsonData)) {
            errors.push({
              field: 'data',
              message: 'JSON data must be an array',
              code: 'INVALID_JSON',
            });
          }
        } else {
          // For table/CSV data, check if it has at least one line
          const lines = data.trim().split('\n').filter(line => line.trim());
          if (lines.length === 0) {
            errors.push({
              field: 'data',
              message: 'Data must contain at least one row',
              code: 'INVALID_DATA',
            });
          }
        }
      } catch (error) {
        if (dataType === 'json') {
          errors.push({
            field: 'data',
            message: 'Invalid JSON format',
            code: 'INVALID_JSON',
          });
        }
      }

      // Check data size
      if (data.length > 1024 * 1024) { // 1MB limit
        warnings.push({
          field: 'data',
          message: 'Large data size may impact performance',
          code: 'PERFORMANCE_WARNING',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  private async parseJSONData(data: string, hasHeader: boolean): Promise<Dataset> {
    try {
      const jsonData = JSON.parse(data);

      if (!Array.isArray(jsonData)) {
        throw new Error('JSON data must be an array');
      }

      if (jsonData.length === 0) {
        throw new Error('JSON array cannot be empty');
      }

      // Check if all items are objects
      if (!jsonData.every(item => typeof item === 'object' && item !== null && !Array.isArray(item))) {
        throw new Error('JSON array must contain objects');
      }

      return createDatasetFromArray(jsonData);
    } catch (error) {
      throw new Error(`Failed to parse JSON data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseCSVData(data: string, hasHeader: boolean, delimiter: string): Promise<Dataset> {
    try {
      const lines = data.trim().split('\n').filter(line => line.trim());
      
      if (lines.length === 0) {
        throw new Error('No data rows found');
      }

      // Parse CSV rows
      const rows = lines.map(line => this.parseCSVLine(line, delimiter));

      // Filter out empty rows
      const nonEmptyRows = rows.filter(row => row.some(cell => cell.trim() !== ''));

      if (nonEmptyRows.length === 0) {
        throw new Error('No valid data rows found');
      }

      if (hasHeader) {
        const columns = nonEmptyRows[0].map(col => col.trim() || 'Unnamed');
        const dataRows = nonEmptyRows.slice(1);
        return createDatasetFromArray(dataRows, columns);
      } else {
        const maxColumns = Math.max(...nonEmptyRows.map(row => row.length));
        const columns = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
        return createDatasetFromArray(nonEmptyRows, columns);
      }
    } catch (error) {
      throw new Error(`Failed to parse CSV data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async parseTableData(data: string, hasHeader: boolean, delimiter: string): Promise<Dataset> {
    return this.parseCSVData(data, hasHeader, delimiter);
  }

  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;

    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote
          current += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === delimiter && !inQuotes) {
        // Field separator
        result.push(current);
        current = '';
        i++;
      } else {
        // Regular character
        current += char;
        i++;
      }
    }

    // Add the last field
    result.push(current);

    return result;
  }
}