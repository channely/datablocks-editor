import React, { useState, useEffect } from 'react';
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XMarkIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import type { AppError } from '../../types';
import { errorHandler } from '../../services/errorHandler';

interface ErrorRecoveryPanelProps {
  error: AppError;
  onRecoveryAttempt?: (success: boolean) => void;
  onDismiss?: () => void;
  className?: string;
}

interface RecoveryAttempt {
  strategy: string;
  timestamp: Date;
  success: boolean;
  error?: string;
}

export const ErrorRecoveryPanel: React.FC<ErrorRecoveryPanelProps> = ({
  error,
  onRecoveryAttempt,
  onDismiss,
  className,
}) => {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryAttempts, setRecoveryAttempts] = useState<RecoveryAttempt[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  // Check if error is recoverable
  const isRecoverable = error.type !== 'execution_error' || 
                       !errorHandler.isCriticalError(error);

  const handleRecoveryAttempt = async () => {
    if (isRecovering) return;

    setIsRecovering(true);
    const startTime = Date.now();

    try {
      // This would attempt actual recovery based on error type
      const success = await attemptRecovery(error);
      
      const attempt: RecoveryAttempt = {
        strategy: getRecoveryStrategy(error),
        timestamp: new Date(),
        success,
      };

      setRecoveryAttempts(prev => [attempt, ...prev]);
      
      if (onRecoveryAttempt) {
        onRecoveryAttempt(success);
      }

      if (success && onDismiss) {
        setTimeout(onDismiss, 1000); // Auto-dismiss after successful recovery
      }
    } catch (recoveryError) {
      const attempt: RecoveryAttempt = {
        strategy: getRecoveryStrategy(error),
        timestamp: new Date(),
        success: false,
        error: recoveryError instanceof Error ? recoveryError.message : 'Unknown error',
      };

      setRecoveryAttempts(prev => [attempt, ...prev]);
      
      if (onRecoveryAttempt) {
        onRecoveryAttempt(false);
      }
    } finally {
      setIsRecovering(false);
    }
  };

  const attemptRecovery = async (error: AppError): Promise<boolean> => {
    // Simulate recovery attempt
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Mock recovery success rate based on error type
    const successRate = getRecoverySuccessRate(error);
    return Math.random() < successRate;
  };

  const getRecoveryStrategy = (error: AppError): string => {
    switch (error.type) {
      case 'file_error':
        return 'Alternative file format parsing';
      case 'network_error':
        return 'Retry with exponential backoff';
      case 'data_error':
        return 'Data type coercion';
      case 'validation_error':
        return 'Default value substitution';
      case 'configuration_error':
        return 'Reset to default configuration';
      default:
        return 'Generic error recovery';
    }
  };

  const getRecoverySuccessRate = (error: AppError): number => {
    switch (error.type) {
      case 'network_error':
        return 0.7;
      case 'file_error':
        return 0.5;
      case 'data_error':
        return 0.6;
      case 'validation_error':
        return 0.8;
      case 'configuration_error':
        return 0.9;
      default:
        return 0.3;
    }
  };

  const getStatusIcon = (attempt: RecoveryAttempt) => {
    if (attempt.success) {
      return <CheckCircleIcon className="w-4 h-4 text-green-400" />;
    } else {
      return <XMarkIcon className="w-4 h-4 text-red-400" />;
    }
  };

  return (
    <div className={cn(
      'bg-gray-800 border border-gray-700 rounded-lg p-4',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-yellow-400" />
          <h3 className="text-sm font-medium text-white">Error Recovery</h3>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error summary */}
      <div className="mb-4">
        <div className="text-sm text-gray-300 mb-1">
          {error.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Error
        </div>
        <div className="text-xs text-gray-400 truncate">
          {error.message}
        </div>
        {error.nodeId && (
          <div className="text-xs text-gray-500 mt-1">
            Node: {error.nodeId}
          </div>
        )}
      </div>

      {/* Recovery status */}
      {isRecoverable ? (
        <div className="space-y-3">
          {/* Recovery button */}
          <button
            onClick={handleRecoveryAttempt}
            disabled={isRecovering}
            className={cn(
              'w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
              isRecovering
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            )}
          >
            {isRecovering ? (
              <>
                <ClockIcon className="w-4 h-4 animate-spin" />
                <span>Attempting Recovery...</span>
              </>
            ) : (
              <>
                <ArrowPathIcon className="w-4 h-4" />
                <span>Attempt Recovery</span>
              </>
            )}
          </button>

          {/* Recovery strategy info */}
          <div className="text-xs text-gray-400 text-center">
            Strategy: {getRecoveryStrategy(error)}
          </div>

          {/* Recovery attempts history */}
          {recoveryAttempts.length > 0 && (
            <div className="border-t border-gray-700 pt-3">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-400 hover:text-white transition-colors mb-2"
              >
                {showDetails ? 'Hide' : 'Show'} Recovery History ({recoveryAttempts.length})
              </button>

              {showDetails && (
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {recoveryAttempts.map((attempt, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-xs bg-gray-900 p-2 rounded"
                    >
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(attempt)}
                        <span className="text-gray-300">
                          {attempt.strategy}
                        </span>
                      </div>
                      <div className="text-gray-500">
                        {attempt.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-4">
          <XMarkIcon className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <div className="text-sm text-gray-400">
            This error cannot be automatically recovered
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Manual intervention required
          </div>
        </div>
      )}
    </div>
  );
};

// Hook for managing error recovery
export const useErrorRecovery = () => {
  const [recoverableErrors, setRecoverableErrors] = useState<AppError[]>([]);

  useEffect(() => {
    const unsubscribe = errorHandler.addErrorListener((error) => {
      // Only add recoverable errors
      if (!errorHandler.isCriticalError(error)) {
        setRecoverableErrors(prev => {
          // Avoid duplicates
          const exists = prev.some(e => 
            e.type === error.type && 
            e.message === error.message && 
            e.nodeId === error.nodeId
          );
          
          if (!exists) {
            return [error, ...prev.slice(0, 4)]; // Keep only last 5 recoverable errors
          }
          return prev;
        });
      }
    });

    return unsubscribe;
  }, []);

  const dismissError = (error: AppError) => {
    setRecoverableErrors(prev => 
      prev.filter(e => 
        !(e.type === error.type && 
          e.message === error.message && 
          e.nodeId === error.nodeId)
      )
    );
  };

  const clearRecoverableErrors = () => {
    setRecoverableErrors([]);
  };

  return {
    recoverableErrors,
    dismissError,
    clearRecoverableErrors,
  };
};