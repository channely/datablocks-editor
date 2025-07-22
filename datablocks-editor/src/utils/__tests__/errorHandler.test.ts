import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler } from '../../services/errorHandler';
import { ErrorType } from '../../types';
import type { AppError } from '../../types';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let mockOnError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnError = vi.fn();
    // Get the singleton instance and clear its state
    errorHandler = ErrorHandler.getInstance();
    errorHandler.clearErrorHistory();
    
    // Add our mock listener
    errorHandler.addErrorListener(mockOnError);
  });

  describe('Error Handling', () => {
    it('should handle basic errors', () => {
      const error: AppError = {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Test validation error',
        timestamp: new Date(),
      };

      errorHandler.handleError(error);

      expect(mockOnError).toHaveBeenCalledWith(error);
      expect(errorHandler.getErrorHistory()).toHaveLength(1);
    });

    it('should track error frequency', () => {
      const error: AppError = {
        type: ErrorType.DATA_ERROR,
        message: 'Duplicate error',
        timestamp: new Date(),
      };

      errorHandler.handleError(error);
      errorHandler.handleError(error);
      errorHandler.handleError(error);

      expect(errorHandler.getErrorFrequency(error)).toBe(3);
    });

    it('should identify critical errors', () => {
      const criticalError: AppError = {
        type: ErrorType.EXECUTION_ERROR,
        message: 'Maximum call stack exceeded',
        timestamp: new Date(),
      };

      const normalError: AppError = {
        type: ErrorType.VALIDATION_ERROR,
        message: 'Field is required',
        timestamp: new Date(),
      };

      expect(errorHandler.isCriticalError(criticalError)).toBe(true);
      expect(errorHandler.isCriticalError(normalError)).toBe(false);
    });

    it('should provide error statistics', () => {
      const errors: AppError[] = [
        {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Error 1',
          nodeId: 'node1',
          timestamp: new Date(),
        },
        {
          type: ErrorType.VALIDATION_ERROR,
          message: 'Error 2',
          nodeId: 'node1',
          timestamp: new Date(),
        },
        {
          type: ErrorType.DATA_ERROR,
          message: 'Error 3',
          nodeId: 'node2',
          timestamp: new Date(),
        },
      ];

      errors.forEach(error => errorHandler.handleError(error));

      const stats = errorHandler.getErrorStats();
      expect(stats.total).toBe(3);
      expect(stats.byType[ErrorType.VALIDATION_ERROR]).toBe(2);
      expect(stats.byType[ErrorType.DATA_ERROR]).toBe(1);
      expect(stats.byNode['node1']).toBe(2);
      expect(stats.byNode['node2']).toBe(1);
    });
  });

  describe('Error Listeners', () => {
    it('should add and remove error listeners', () => {
      const listener = vi.fn();
      const unsubscribe = errorHandler.addErrorListener(listener);

      const error: AppError = {
        type: ErrorType.NETWORK_ERROR,
        message: 'Network error',
        timestamp: new Date(),
      };

      errorHandler.handleError(error);
      expect(listener).toHaveBeenCalledWith(error);

      unsubscribe();
      errorHandler.handleError(error);
      expect(listener).toHaveBeenCalledTimes(1); // Should not be called again
    });
  });

  describe('Convenience Methods', () => {
    it('should handle validation errors', () => {
      errorHandler.handleValidationError('Field is required', 'email', 'node1');

      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(ErrorType.VALIDATION_ERROR);
      expect(history[0].message).toBe('Field is required');
      expect(history[0].field).toBe('email');
      expect(history[0].nodeId).toBe('node1');
    });

    it('should handle execution errors', () => {
      errorHandler.handleExecutionError('Runtime error', 'node2', { code: 500 });

      const history = errorHandler.getErrorHistory();
      expect(history).toHaveLength(1);
      expect(history[0].type).toBe(ErrorType.EXECUTION_ERROR);
      expect(history[0].message).toBe('Runtime error');
      expect(history[0].nodeId).toBe('node2');
      expect(history[0].details).toEqual({ code: 500 });
    });
  });

  describe('Error Creation', () => {
    it('should create error from exception', () => {
      const exception = new Error('Test exception');
      exception.stack = 'Error stack trace';

      const appError = errorHandler.createErrorFromException(
        exception,
        ErrorType.EXECUTION_ERROR,
        'node1'
      );

      expect(appError.type).toBe(ErrorType.EXECUTION_ERROR);
      expect(appError.message).toBe('Test exception');
      expect(appError.nodeId).toBe('node1');
      expect(appError.stack).toBe('Error stack trace');
    });

    it('should handle non-Error exceptions', () => {
      const appError = errorHandler.createErrorFromException(
        'String error',
        ErrorType.DATA_ERROR
      );

      expect(appError.type).toBe(ErrorType.DATA_ERROR);
      expect(appError.message).toBe('String error');
      expect(appError.stack).toBeUndefined();
    });
  });
});