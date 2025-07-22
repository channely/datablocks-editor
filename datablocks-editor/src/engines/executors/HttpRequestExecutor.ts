import type { Dataset, ValidationResult, ValidationError, PrimitiveType } from '../../types';

/**
 * HTTP Request Executor
 * Handles API requests and converts responses to Dataset format
 */
export class HttpRequestExecutor {
  /**
   * Execute HTTP request and return response as Dataset
   */
  static async execute(
    config: {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: Record<string, string>;
      body?: string;
      timeout?: number;
    }
  ): Promise<Dataset> {
    const {
      url,
      method = 'GET',
      headers = {},
      body,
      timeout = 10000,
    } = config;

    // Validate URL
    if (!this.isValidUrl(url)) {
      throw new Error('Invalid URL format');
    }

    // Prepare request options
    const requestOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      signal: AbortSignal.timeout(timeout),
    };

    // Add body for POST/PUT requests
    if ((method === 'POST' || method === 'PUT') && body) {
      requestOptions.body = body;
    }

    try {
      const startTime = Date.now();
      const response = await fetch(url, requestOptions);
      const executionTime = Date.now() - startTime;

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Get response content type
      const contentType = response.headers.get('content-type') || '';
      const responseSize = parseInt(response.headers.get('content-length') || '0');

      // Parse response based on content type
      let responseData: any;
      if (contentType.includes('application/json')) {
        responseData = await response.json();
      } else if (contentType.includes('text/csv')) {
        const csvText = await response.text();
        responseData = this.parseCsvToArray(csvText);
      } else if (contentType.includes('text/')) {
        responseData = await response.text();
      } else {
        // Try to parse as JSON first, fallback to text
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch {
          responseData = text;
        }
      }

      // Convert response to Dataset
      const dataset = this.convertResponseToDataset(responseData);
      
      // Add execution metadata
      dataset.metadata.executionTime = executionTime;
      dataset.metadata.responseSize = responseSize;
      dataset.metadata.url = url;
      dataset.metadata.method = method;

      return dataset;
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error(`Request timed out after ${timeout}ms`);
        }
        throw new Error(`Request failed: ${error.message}`);
      }
      throw new Error('Unknown request error');
    }
  }

  /**
   * Validate URL format
   */
  private static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Parse CSV text to array of objects
   */
  private static parseCsvToArray(csvText: string): any[] {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj: any = {};
      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });
      return obj;
    });

    return rows;
  }

  /**
   * Convert API response to Dataset format
   */
  private static convertResponseToDataset(responseData: any): Dataset {
    if (!responseData) {
      return {
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
      };
    }

    // If response is an array of objects (most common API format)
    if (Array.isArray(responseData) && responseData.length > 0) {
      const firstItem = responseData[0];
      
      if (typeof firstItem === 'object' && firstItem !== null) {
        // Array of objects - convert to tabular format
        const columns = Object.keys(firstItem);
        const rows = responseData.map(item => 
          columns.map(col => this.normalizeValue(item[col]))
        );

        return {
          columns,
          rows,
          metadata: {
            rowCount: rows.length,
            columnCount: columns.length,
            types: this.inferColumnTypes(rows, columns),
            nullable: this.checkNullable(rows, columns),
            unique: this.checkUnique(rows, columns),
            created: new Date(),
            modified: new Date(),
          },
        };
      } else {
        // Array of primitives
        return {
          columns: ['value'],
          rows: responseData.map(item => [this.normalizeValue(item)]),
          metadata: {
            rowCount: responseData.length,
            columnCount: 1,
            types: { value: this.inferType(responseData[0]) },
            nullable: { value: responseData.some(item => item == null) },
            unique: { value: new Set(responseData).size === responseData.length },
            created: new Date(),
            modified: new Date(),
          },
        };
      }
    }

    // If response is a single object
    if (typeof responseData === 'object' && responseData !== null) {
      // Check if it has a data property (common API pattern)
      if (responseData.data && Array.isArray(responseData.data)) {
        return this.convertResponseToDataset(responseData.data);
      }

      // Convert object properties to rows
      const entries = Object.entries(responseData);
      const columns = ['key', 'value'];
      const rows = entries.map(([key, value]) => [
        key,
        this.normalizeValue(value)
      ]);

      return {
        columns,
        rows,
        metadata: {
          rowCount: rows.length,
          columnCount: 2,
          types: {
            key: 'string',
            value: this.inferType(entries[0]?.[1])
          },
          nullable: {
            key: false,
            value: entries.some(([, value]) => value == null)
          },
          unique: {
            key: true,
            value: new Set(entries.map(([, value]) => value)).size === entries.length
          },
          created: new Date(),
          modified: new Date(),
        },
      };
    }

    // For primitive responses, wrap in single cell
    return {
      columns: ['response'],
      rows: [[this.normalizeValue(responseData)]],
      metadata: {
        rowCount: 1,
        columnCount: 1,
        types: { response: this.inferType(responseData) },
        nullable: { response: responseData == null },
        unique: { response: true },
        created: new Date(),
        modified: new Date(),
      },
    };
  }

  /**
   * Normalize value for dataset storage
   */
  private static normalizeValue(value: any): any {
    if (value === null || value === undefined) {
      return null;
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return value;
  }

  /**
   * Infer column types from data
   */
  private static inferColumnTypes(rows: any[][], columns: string[]): Record<string, PrimitiveType> {
    const types: Record<string, PrimitiveType> = {};
    
    columns.forEach((col, index) => {
      const values = rows.map(row => row[index]).filter(val => val != null);
      if (values.length === 0) {
        types[col] = 'null';
        return;
      }

      const firstValue = values[0];
      types[col] = this.inferType(firstValue);
    });

    return types;
  }

  /**
   * Check which columns can contain null values
   */
  private static checkNullable(rows: any[][], columns: string[]): Record<string, boolean> {
    const nullable: Record<string, boolean> = {};
    
    columns.forEach((col, index) => {
      nullable[col] = rows.some(row => row[index] == null);
    });

    return nullable;
  }

  /**
   * Check which columns have unique values
   */
  private static checkUnique(rows: any[][], columns: string[]): Record<string, boolean> {
    const unique: Record<string, boolean> = {};
    
    columns.forEach((col, index) => {
      const values = rows.map(row => row[index]);
      unique[col] = new Set(values).size === values.length;
    });

    return unique;
  }

  /**
   * Infer type of a single value
   */
  private static inferType(value: any): PrimitiveType {
    if (value == null) return 'null';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'string') {
      // Check if it's a date string
      if (/^\d{4}-\d{2}-\d{2}/.test(value) && !isNaN(Date.parse(value))) {
        return 'date';
      }
      return 'string';
    }
    return 'string';
  }

  /**
   * Validate HTTP request configuration
   */
  static validate(
    _inputs: Record<string, any>,
    config: Record<string, any>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate URL
    if (!config.url || typeof config.url !== 'string') {
      errors.push({
        field: 'url',
        message: 'URL is required',
        code: 'REQUIRED_FIELD',
      });
    } else if (!this.isValidUrl(config.url)) {
      errors.push({
        field: 'url',
        message: 'Invalid URL format. Must start with http:// or https://',
        code: 'INVALID_URL',
      });
    }

    // Validate method
    if (config.method && !['GET', 'POST', 'PUT', 'DELETE'].includes(config.method)) {
      errors.push({
        field: 'method',
        message: 'Invalid HTTP method',
        code: 'INVALID_METHOD',
      });
    }

    // Validate headers
    if (config.headers && typeof config.headers !== 'object') {
      errors.push({
        field: 'headers',
        message: 'Headers must be an object',
        code: 'INVALID_HEADERS',
      });
    }

    // Validate body for POST/PUT requests
    if ((config.method === 'POST' || config.method === 'PUT') && config.body) {
      if (typeof config.body !== 'string') {
        errors.push({
          field: 'body',
          message: 'Request body must be a string',
          code: 'INVALID_BODY',
        });
      } else {
        // Try to parse as JSON if content-type suggests JSON
        const contentType = config.headers?.['Content-Type'] || config.headers?.['content-type'] || '';
        if (contentType.includes('application/json')) {
          try {
            JSON.parse(config.body);
          } catch {
            errors.push({
              field: 'body',
              message: 'Invalid JSON in request body',
              code: 'INVALID_JSON',
            });
          }
        }
      }
    }

    // Validate timeout
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout < 1000 || config.timeout > 60000) {
        errors.push({
          field: 'timeout',
          message: 'Timeout must be between 1000 and 60000 milliseconds',
          code: 'INVALID_TIMEOUT',
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}