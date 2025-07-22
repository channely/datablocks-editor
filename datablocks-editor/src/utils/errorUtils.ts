/**
 * Utility functions for consistent error handling across the application
 */

export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
}

export class ErrorHandler {
  static createError(code: string, message: string, details?: any): AppError {
    return {
      code,
      message,
      details,
      timestamp: new Date()
    };
  }

  static handleUnknownError(error: unknown, context: string = 'Unknown'): AppError {
    if (error instanceof Error) {
      return this.createError('UNKNOWN_ERROR', error.message, { context, stack: error.stack });
    }
    
    if (typeof error === 'string') {
      return this.createError('UNKNOWN_ERROR', error, { context });
    }
    
    return this.createError('UNKNOWN_ERROR', 'An unknown error occurred', { context, error });
  }

  static isAppError(error: any): error is AppError {
    return error && typeof error === 'object' && 'code' in error && 'message' in error && 'timestamp' in error;
  }

  static formatErrorMessage(error: AppError): string {
    return `[${error.code}] ${error.message}`;
  }

  static logError(error: AppError, context?: string): void {
    console.error(`Error in ${context || 'Application'}:`, {
      code: error.code,
      message: error.message,
      details: error.details,
      timestamp: error.timestamp
    });
  }
}

// Common error codes
export const ERROR_CODES = {
  // Data processing errors
  DATA_INVALID_FORMAT: 'DATA_001',
  DATA_PROCESSING_FAILED: 'DATA_002',
  DATA_VALIDATION_FAILED: 'DATA_003',
  
  // Execution errors
  EXECUTION_TIMEOUT: 'EXEC_001',
  EXECUTION_FAILED: 'EXEC_002',
  NODE_NOT_FOUND: 'EXEC_003',
  
  // Network errors
  NETWORK_REQUEST_FAILED: 'NET_001',
  NETWORK_TIMEOUT: 'NET_002',
  
  // File errors
  FILE_READ_ERROR: 'FILE_001',
  FILE_PARSE_ERROR: 'FILE_002',
  FILE_TOO_LARGE: 'FILE_003',
  
  // System errors
  MEMORY_LIMIT_EXCEEDED: 'SYS_001',
  BROWSER_NOT_SUPPORTED: 'SYS_002'
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];