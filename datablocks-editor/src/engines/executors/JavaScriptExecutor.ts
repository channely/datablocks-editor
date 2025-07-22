import type { Dataset, ValidationResult, ValidationError, PrimitiveType } from '../../types';

/**
 * Safe JavaScript Code Executor
 * Executes user-provided JavaScript code in a controlled environment
 */
export class JavaScriptExecutor {
  private static readonly ALLOWED_GLOBALS = [
    'Array', 'Object', 'String', 'Number', 'Boolean', 'Date', 'Math', 'JSON',
    'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'encodeURIComponent', 'decodeURIComponent'
  ];

  private static readonly FORBIDDEN_PATTERNS = [
    /\beval\s*\(/g,
    /\bnew\s+Function\s*\(/g,
    /\bsetTimeout\s*\(/g,
    /\bsetInterval\s*\(/g,
    /\bsetImmediate\s*\(/g,
    /\brequire\s*\(/g,
    /\bimport\s+/g,
    /\bexport\s+/g,
    /\bprocess\s*\./g, // Only block process.something, not function process()
    /\bglobal\s*\./g,
    /\bwindow\s*\./g,
    /\bdocument\s*\./g,
    /\blocation\s*\./g,
    /\bnavigator\s*\./g,
    /\bfetch\s*\(/g,
    /\bnew\s+XMLHttpRequest\s*\(/g,
    /\bnew\s+WebSocket\s*\(/g,
    /\bnew\s+Worker\s*\(/g,
    /\bnew\s+SharedWorker\s*\(/g,
    /\bnew\s+ServiceWorker\s*\(/g,
  ];

  /**
   * Execute JavaScript code with input data
   */
  static async execute(
    code: string,
    inputData: Dataset | null,
    config: {
      timeout?: number;
      allowConsole?: boolean;
      strictMode?: boolean;
    } = {}
  ): Promise<Dataset> {
    const {
      timeout = 5000,
      allowConsole = true,
      strictMode = true,
    } = config;

    // Validate code safety
    this.validateCodeSafety(code);

    // Prepare execution context
    const context = this.createExecutionContext(inputData, allowConsole);
    
    // Wrap code in strict mode if enabled
    const wrappedCode = strictMode ? `"use strict";\n${code}` : code;

    // Create execution function
    const executionFunction = this.createExecutionFunction(wrappedCode, context);

    // Execute with timeout
    return this.executeWithTimeout(executionFunction, timeout);
  }

  /**
   * Validate that the code doesn't contain forbidden patterns
   */
  private static validateCodeSafety(code: string): void {
    const errors: string[] = [];

    // Check for forbidden patterns
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(code)) {
        errors.push(`Forbidden pattern detected: ${pattern.source}`);
      }
    }

    // Check for potential infinite loops (basic detection)
    const whileLoops = (code.match(/\bwhile\s*\(/g) || []).length;
    const forLoops = (code.match(/\bfor\s*\(/g) || []).length;
    if (whileLoops > 5 || forLoops > 10) {
      errors.push('Too many loop constructs detected - potential infinite loop risk');
    }

    if (errors.length > 0) {
      throw new Error(`Code safety validation failed: ${errors.join(', ')}`);
    }
  }

  /**
   * Create a safe execution context
   */
  private static createExecutionContext(
    inputData: Dataset | null,
    allowConsole: boolean
  ): Record<string, any> {
    const context: Record<string, any> = {
      data: inputData,
    };

    // Add allowed global functions
    this.ALLOWED_GLOBALS.forEach(name => {
      if (typeof (globalThis as any)[name] !== 'undefined') {
        context[name] = (globalThis as any)[name];
      }
    });

    // Add console if allowed
    if (allowConsole) {
      const consoleOutput: string[] = [];
      context.console = {
        log: (...args: any[]) => {
          consoleOutput.push(args.map(arg => String(arg)).join(' '));
        },
        warn: (...args: any[]) => {
          consoleOutput.push(`WARN: ${args.map(arg => String(arg)).join(' ')}`);
        },
        error: (...args: any[]) => {
          consoleOutput.push(`ERROR: ${args.map(arg => String(arg)).join(' ')}`);
        },
        getOutput: () => consoleOutput,
      };
    }

    return context;
  }

  /**
   * Create a function that executes the user code in the safe context
   */
  private static createExecutionFunction(
    code: string,
    context: Record<string, any>
  ): () => any {
    // Extract context keys and values
    const contextKeys = Object.keys(context);
    const contextValues = Object.values(context);

    // Create function that executes in isolated scope
    const functionBody = `
      ${code}
      
      // If there's a process function, call it with the data
      if (typeof process === 'function') {
        return process(data);
      }
      
      // If there's a main function, call it with the data
      if (typeof main === 'function') {
        return main(data);
      }
      
      // Otherwise, return the data as-is
      return data;
    `;

    try {
      // Create function with restricted scope
      const func = new Function(...contextKeys, functionBody);
      
      return () => func(...contextValues);
    } catch (error) {
      throw new Error(`Code compilation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Execute function with timeout protection
   */
  private static async executeWithTimeout(
    executionFunction: () => any,
    timeout: number
  ): Promise<Dataset> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Code execution timed out after ${timeout}ms`));
      }, timeout);

      try {
        const result = executionFunction();
        clearTimeout(timeoutId);

        // Convert result to Dataset format
        const dataset = this.convertResultToDataset(result);
        resolve(dataset);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(new Error(`Code execution failed: ${error instanceof Error ? error.message : String(error)}`));
      }
    });
  }

  /**
   * Convert execution result to Dataset format
   */
  private static convertResultToDataset(result: any): Dataset {
    if (!result) {
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

    // If result is already a Dataset, return it
    if (result.columns && result.rows && result.metadata) {
      return result;
    }

    // If result is an array of objects, convert to Dataset
    if (Array.isArray(result) && result.length > 0 && typeof result[0] === 'object') {
      const columns = Object.keys(result[0]);
      const rows = result.map(item => columns.map(col => item[col]));
      
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
    }

    // If result is a simple array, treat as single column
    if (Array.isArray(result)) {
      return {
        columns: ['value'],
        rows: result.map(item => [item]),
        metadata: {
          rowCount: result.length,
          columnCount: 1,
          types: { value: this.inferType(result[0]) },
          nullable: { value: result.some(item => item == null) },
          unique: { value: new Set(result).size === result.length },
          created: new Date(),
          modified: new Date(),
        },
      };
    }

    // For other types, wrap in single cell
    return {
      columns: ['result'],
      rows: [[result]],
      metadata: {
        rowCount: 1,
        columnCount: 1,
        types: { result: this.inferType(result) },
        nullable: { result: result == null },
        unique: { result: true },
        created: new Date(),
        modified: new Date(),
      },
    };
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
      if (typeof firstValue === 'number') {
        types[col] = 'number';
      } else if (typeof firstValue === 'boolean') {
        types[col] = 'boolean';
      } else if (firstValue instanceof Date) {
        types[col] = 'date';
      } else {
        types[col] = 'string';
      }
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
    if (value instanceof Date) return 'date';
    return 'string';
  }

  /**
   * Validate JavaScript node configuration
   */
  static validate(
    _inputs: Record<string, any>,
    config: Record<string, any>
  ): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate code
    if (!config.code || typeof config.code !== 'string') {
      errors.push({
        field: 'code',
        message: 'JavaScript code is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      try {
        this.validateCodeSafety(config.code);
      } catch (error) {
        errors.push({
          field: 'code',
          message: error instanceof Error ? error.message : 'Code validation failed',
          code: 'INVALID_CODE',
        });
      }
    }

    // Validate timeout
    if (config.timeout !== undefined) {
      if (typeof config.timeout !== 'number' || config.timeout < 100 || config.timeout > 30000) {
        errors.push({
          field: 'timeout',
          message: 'Timeout must be between 100 and 30000 milliseconds',
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