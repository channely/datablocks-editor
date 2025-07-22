import type { AppError } from '../types';
import { ErrorType } from '../types';

export interface ErrorHandlerOptions {
  onError?: (error: AppError) => void;
  enableConsoleLogging?: boolean;
  enableNotifications?: boolean;
  maxErrorHistory?: number;
  enableErrorRecovery?: boolean;
}

export interface ErrorRecoveryStrategy {
  canRecover: (error: AppError) => boolean;
  recover: (error: AppError) => Promise<boolean>;
  description: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private options: ErrorHandlerOptions;
  private errorListeners: Array<(error: AppError) => void> = [];
  private errorHistory: AppError[] = [];
  private recoveryStrategies: Map<ErrorType, ErrorRecoveryStrategy[]> = new Map();
  private errorCounts: Map<string, number> = new Map();

  private constructor(options: ErrorHandlerOptions = {}) {
    this.options = {
      enableConsoleLogging: true,
      enableNotifications: true,
      maxErrorHistory: 100,
      enableErrorRecovery: true,
      ...options,
    };

    // Set up global error handlers
    this.setupGlobalHandlers();
    this.setupRecoveryStrategies();
  }

  static getInstance(options?: ErrorHandlerOptions): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler(options);
    }
    return ErrorHandler.instance;
  }

  private setupGlobalHandlers(): void {
    // Handle unhandled JavaScript errors
    window.addEventListener('error', (event) => {
      const error: AppError = {
        type: ErrorType.EXECUTION_ERROR,
        message: event.message || 'Unknown error occurred',
        details: {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        },
        timestamp: new Date(),
        stack: event.error?.stack,
      };
      this.handleError(error);
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error: AppError = {
        type: ErrorType.EXECUTION_ERROR,
        message: event.reason?.message || 'Unhandled promise rejection',
        details: {
          reason: event.reason,
          stack: event.reason?.stack,
        },
        timestamp: new Date(),
        stack: event.reason?.stack,
      };
      this.handleError(error);
    });
  }

  handleError(error: AppError): void {
    // Add to error history
    this.addToHistory(error);

    // Track error frequency
    this.trackErrorFrequency(error);

    // Console logging
    if (this.options.enableConsoleLogging) {
      console.error('ErrorHandler:', error);
    }

    // Attempt recovery if enabled
    if (this.options.enableErrorRecovery) {
      this.attemptRecovery(error);
    }

    // Call the main error handler if provided
    if (this.options.onError) {
      this.options.onError(error);
    }

    // Notify all listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (listenerError) {
        console.error('Error in error listener:', listenerError);
      }
    });
  }

  addErrorListener(listener: (error: AppError) => void): () => void {
    this.errorListeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.errorListeners.indexOf(listener);
      if (index > -1) {
        this.errorListeners.splice(index, 1);
      }
    };
  }

  // Convenience methods for different error types
  handleValidationError(message: string, field?: string, nodeId?: string, details?: any): void {
    this.handleError({
      type: ErrorType.VALIDATION_ERROR,
      message,
      field,
      nodeId,
      details,
      timestamp: new Date(),
    });
  }

  handleExecutionError(message: string, nodeId?: string, details?: any, stack?: string): void {
    this.handleError({
      type: ErrorType.EXECUTION_ERROR,
      message,
      nodeId,
      details,
      timestamp: new Date(),
      stack,
    });
  }

  handleDataError(message: string, nodeId?: string, details?: any): void {
    this.handleError({
      type: ErrorType.DATA_ERROR,
      message,
      nodeId,
      details,
      timestamp: new Date(),
    });
  }

  handleNetworkError(message: string, details?: any): void {
    this.handleError({
      type: ErrorType.NETWORK_ERROR,
      message,
      details,
      timestamp: new Date(),
    });
  }

  handleFileError(message: string, details?: any): void {
    this.handleError({
      type: ErrorType.FILE_ERROR,
      message,
      details,
      timestamp: new Date(),
    });
  }

  handleConfigurationError(message: string, nodeId?: string, field?: string, details?: any): void {
    this.handleError({
      type: ErrorType.CONFIGURATION_ERROR,
      message,
      nodeId,
      field,
      details,
      timestamp: new Date(),
    });
  }

  handleDependencyError(message: string, nodeId?: string, details?: any): void {
    this.handleError({
      type: ErrorType.DEPENDENCY_ERROR,
      message,
      nodeId,
      details,
      timestamp: new Date(),
    });
  }

  // Create error from caught exception
  createErrorFromException(
    exception: Error | unknown,
    type: ErrorType = ErrorType.EXECUTION_ERROR,
    nodeId?: string
  ): AppError {
    if (exception instanceof Error) {
      return {
        type,
        message: exception.message,
        nodeId,
        details: {
          name: exception.name,
        },
        timestamp: new Date(),
        stack: exception.stack,
      };
    }

    return {
      type,
      message: String(exception),
      nodeId,
      timestamp: new Date(),
    };
  }

  // Wrap async functions with error handling
  wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    nodeId?: string
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args);
      } catch (error) {
        const appError = this.createErrorFromException(error, ErrorType.EXECUTION_ERROR, nodeId);
        this.handleError(appError);
        throw error; // Re-throw to maintain original behavior
      }
    };
  }

  // Wrap sync functions with error handling
  wrapSync<T extends any[], R>(
    fn: (...args: T) => R,
    nodeId?: string
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args);
      } catch (error) {
        const appError = this.createErrorFromException(error, ErrorType.EXECUTION_ERROR, nodeId);
        this.handleError(appError);
        throw error; // Re-throw to maintain original behavior
      }
    };
  }

  // Error history management
  private addToHistory(error: AppError): void {
    this.errorHistory.unshift(error);
    
    // Limit history size
    if (this.options.maxErrorHistory && this.errorHistory.length > this.options.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(0, this.options.maxErrorHistory);
    }
  }

  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
    this.errorCounts.clear();
  }

  // Error frequency tracking
  private trackErrorFrequency(error: AppError): void {
    const key = `${error.type}-${error.message}`;
    const count = this.errorCounts.get(key) || 0;
    this.errorCounts.set(key, count + 1);
  }

  getErrorFrequency(error: AppError): number {
    const key = `${error.type}-${error.message}`;
    return this.errorCounts.get(key) || 0;
  }

  // Recovery strategies
  private setupRecoveryStrategies(): void {
    // File error recovery
    this.addRecoveryStrategy(ErrorType.FILE_ERROR, {
      canRecover: (error) => error.details?.filename && error.message.includes('format'),
      recover: async (error) => {
        // Attempt to parse with different formats
        console.log('Attempting file format recovery for:', error.details?.filename);
        return false; // Would implement actual recovery logic
      },
      description: 'Try alternative file formats'
    });

    // Network error recovery
    this.addRecoveryStrategy(ErrorType.NETWORK_ERROR, {
      canRecover: (error) => error.message.includes('timeout') || error.message.includes('network'),
      recover: async (error) => {
        // Attempt retry with exponential backoff
        console.log('Attempting network retry for:', error.message);
        return false; // Would implement actual retry logic
      },
      description: 'Retry network request'
    });

    // Data error recovery
    this.addRecoveryStrategy(ErrorType.DATA_ERROR, {
      canRecover: (error) => error.message.includes('column') || error.message.includes('type'),
      recover: async (error) => {
        // Attempt data type coercion or column mapping
        console.log('Attempting data recovery for:', error.message);
        return false; // Would implement actual data recovery logic
      },
      description: 'Attempt data type conversion'
    });
  }

  addRecoveryStrategy(errorType: ErrorType, strategy: ErrorRecoveryStrategy): void {
    if (!this.recoveryStrategies.has(errorType)) {
      this.recoveryStrategies.set(errorType, []);
    }
    this.recoveryStrategies.get(errorType)!.push(strategy);
  }

  private async attemptRecovery(error: AppError): Promise<boolean> {
    const strategies = this.recoveryStrategies.get(error.type) || [];
    
    for (const strategy of strategies) {
      if (strategy.canRecover(error)) {
        try {
          const recovered = await strategy.recover(error);
          if (recovered) {
            console.log(`Successfully recovered from error using strategy: ${strategy.description}`);
            return true;
          }
        } catch (recoveryError) {
          console.warn(`Recovery strategy failed: ${strategy.description}`, recoveryError);
        }
      }
    }
    
    return false;
  }

  // Error analysis
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    byNode: Record<string, number>;
    recent: AppError[];
  } {
    const stats = {
      total: this.errorHistory.length,
      byType: {} as Record<ErrorType, number>,
      byNode: {} as Record<string, number>,
      recent: this.errorHistory.slice(0, 10),
    };

    // Count by type
    Object.values(ErrorType).forEach(type => {
      stats.byType[type] = 0;
    });

    this.errorHistory.forEach(error => {
      stats.byType[error.type]++;
      
      if (error.nodeId) {
        stats.byNode[error.nodeId] = (stats.byNode[error.nodeId] || 0) + 1;
      }
    });

    return stats;
  }

  // Check if error is critical (should stop execution)
  isCriticalError(error: AppError): boolean {
    const criticalTypes = [
      ErrorType.EXECUTION_ERROR,
      ErrorType.DEPENDENCY_ERROR,
    ];

    const criticalMessages = [
      'out of memory',
      'stack overflow',
      'maximum call stack',
      'circular dependency',
    ];

    return criticalTypes.includes(error.type) || 
           criticalMessages.some(msg => error.message.toLowerCase().includes(msg));
  }

  // Batch error handling for multiple errors
  handleErrors(errors: AppError[]): void {
    errors.forEach(error => this.handleError(error));
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions
export const handleError = (error: AppError) => errorHandler.handleError(error);
export const handleValidationError = (message: string, field?: string, nodeId?: string, details?: any) =>
  errorHandler.handleValidationError(message, field, nodeId, details);
export const handleExecutionError = (message: string, nodeId?: string, details?: any, stack?: string) =>
  errorHandler.handleExecutionError(message, nodeId, details, stack);
export const handleDataError = (message: string, nodeId?: string, details?: any) =>
  errorHandler.handleDataError(message, nodeId, details);
export const handleNetworkError = (message: string, details?: any) =>
  errorHandler.handleNetworkError(message, details);
export const handleFileError = (message: string, details?: any) =>
  errorHandler.handleFileError(message, details);
export const handleConfigurationError = (message: string, nodeId?: string, field?: string, details?: any) =>
  errorHandler.handleConfigurationError(message, nodeId, field, details);
export const handleDependencyError = (message: string, nodeId?: string, details?: any) =>
  errorHandler.handleDependencyError(message, nodeId, details);