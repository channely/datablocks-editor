import React, { useState } from 'react';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import { ErrorType } from '../../types';
import type { AppError } from '../../types';
import { errorHandler } from '../../services/errorHandler';

interface NodeErrorIndicatorProps {
  error: AppError;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showTooltip?: boolean;
  showActions?: boolean;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const NodeErrorIndicator: React.FC<NodeErrorIndicatorProps> = ({
  error,
  className,
  size = 'md',
  showTooltip = true,
  showActions = false,
  onRetry,
  onDismiss,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const getIcon = () => {
    const iconClass = cn(
      size === 'sm' && 'w-3 h-3',
      size === 'md' && 'w-4 h-4',
      size === 'lg' && 'w-5 h-5'
    );

    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        return <ExclamationTriangleIcon className={cn(iconClass, 'text-yellow-400')} />;
      case ErrorType.EXECUTION_ERROR:
        return <ExclamationCircleIcon className={cn(iconClass, 'text-red-400')} />;
      case ErrorType.CONFIGURATION_ERROR:
        return <ExclamationTriangleIcon className={cn(iconClass, 'text-orange-400')} />;
      case ErrorType.DATA_ERROR:
        return <InformationCircleIcon className={cn(iconClass, 'text-blue-400')} />;
      case ErrorType.DEPENDENCY_ERROR:
        return <ExclamationCircleIcon className={cn(iconClass, 'text-purple-400')} />;
      default:
        return <ExclamationCircleIcon className={cn(iconClass, 'text-red-400')} />;
    }
  };

  const getBackgroundColor = () => {
    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        return 'bg-yellow-500/20 border-yellow-500/50';
      case ErrorType.EXECUTION_ERROR:
        return 'bg-red-500/20 border-red-500/50';
      case ErrorType.CONFIGURATION_ERROR:
        return 'bg-orange-500/20 border-orange-500/50';
      case ErrorType.DATA_ERROR:
        return 'bg-blue-500/20 border-blue-500/50';
      case ErrorType.DEPENDENCY_ERROR:
        return 'bg-purple-500/20 border-purple-500/50';
      default:
        return 'bg-red-500/20 border-red-500/50';
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(timestamp);
  };

  const errorFrequency = errorHandler.getErrorFrequency(error);
  const isCritical = errorHandler.isCriticalError(error);

  return (
    <div className="relative group">
      <div
        className={cn(
          'relative inline-flex items-center justify-center rounded-full border cursor-pointer',
          getBackgroundColor(),
          size === 'sm' && 'p-1',
          size === 'md' && 'p-1.5',
          size === 'lg' && 'p-2',
          isCritical && 'animate-pulse',
          className
        )}
        title={showTooltip ? `${error.type.replace('_', ' ').toUpperCase()}: ${error.message}` : undefined}
        onClick={() => setShowDetails(!showDetails)}
      >
        {getIcon()}
        
        {/* Frequency indicator */}
        {errorFrequency > 1 && (
          <div className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {errorFrequency > 9 ? '9+' : errorFrequency}
          </div>
        )}
      </div>
      
      {/* Enhanced tooltip with actions */}
      {showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg border border-gray-700 z-50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap min-w-max">
          <div className="font-medium mb-1 flex items-center space-x-2">
            <span>{error.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
            {isCritical && <span className="text-red-400 text-xs">(Critical)</span>}
          </div>
          <div className="text-gray-300 mb-1 max-w-xs truncate">{error.message}</div>
          <div className="text-gray-500 text-xs">
            {formatTimestamp(error.timestamp)}
          </div>
          {error.field && (
            <div className="text-gray-500 text-xs">
              Field: {error.field}
            </div>
          )}
          {errorFrequency > 1 && (
            <div className="text-yellow-400 text-xs">
              Occurred {errorFrequency} times
            </div>
          )}
          
          {/* Action buttons */}
          {showActions && (
            <div className="flex items-center space-x-2 mt-2 pointer-events-auto">
              {onRetry && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                  className="flex items-center space-x-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs transition-colors"
                >
                  <ArrowPathIcon className="w-3 h-3" />
                  <span>Retry</span>
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss();
                  }}
                  className="flex items-center space-x-1 px-2 py-1 bg-gray-600 hover:bg-gray-700 rounded text-xs transition-colors"
                >
                  <XMarkIcon className="w-3 h-3" />
                  <span>Dismiss</span>
                </button>
              )}
            </div>
          )}
          
          {/* Tooltip arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      )}

      {/* Detailed error popup */}
      {showDetails && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowDetails(false)}>
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl max-h-96 overflow-y-auto border border-gray-700" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
                {getIcon()}
                <span>Error Details</span>
              </h3>
              <button
                onClick={() => setShowDetails(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div>
                <span className="text-gray-400 font-medium">Type:</span>
                <span className="text-white ml-2">{error.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
              </div>
              
              <div>
                <span className="text-gray-400 font-medium">Message:</span>
                <p className="text-white mt-1">{error.message}</p>
              </div>
              
              {error.code && (
                <div>
                  <span className="text-gray-400 font-medium">Code:</span>
                  <span className="text-white ml-2">{error.code}</span>
                </div>
              )}
              
              {error.field && (
                <div>
                  <span className="text-gray-400 font-medium">Field:</span>
                  <span className="text-white ml-2">{error.field}</span>
                </div>
              )}
              
              <div>
                <span className="text-gray-400 font-medium">Timestamp:</span>
                <span className="text-white ml-2">{error.timestamp.toLocaleString()}</span>
              </div>
              
              {errorFrequency > 1 && (
                <div>
                  <span className="text-gray-400 font-medium">Frequency:</span>
                  <span className="text-yellow-400 ml-2">{errorFrequency} occurrences</span>
                </div>
              )}
              
              {error.details && (
                <div>
                  <span className="text-gray-400 font-medium">Details:</span>
                  <pre className="text-xs text-gray-300 mt-1 bg-gray-900 p-2 rounded overflow-x-auto">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                </div>
              )}
              
              {error.stack && process.env.NODE_ENV === 'development' && (
                <div>
                  <span className="text-gray-400 font-medium">Stack Trace:</span>
                  <pre className="text-xs text-gray-300 mt-1 bg-gray-900 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
            
            {/* Action buttons in detail view */}
            <div className="flex items-center justify-end space-x-2 mt-6">
              {onRetry && (
                <button
                  onClick={() => {
                    onRetry();
                    setShowDetails(false);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Retry</span>
                </button>
              )}
              {onDismiss && (
                <button
                  onClick={() => {
                    onDismiss();
                    setShowDetails(false);
                  }}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                >
                  <XMarkIcon className="w-4 h-4" />
                  <span>Dismiss</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface NodeErrorBadgeProps {
  errors: AppError[];
  className?: string;
  maxVisible?: number;
}

export const NodeErrorBadge: React.FC<NodeErrorBadgeProps> = ({
  errors,
  className,
  maxVisible = 3,
}) => {
  if (errors.length === 0) return null;

  const visibleErrors = errors.slice(0, maxVisible);
  const remainingCount = errors.length - maxVisible;

  return (
    <div className={cn('flex items-center space-x-1', className)}>
      {visibleErrors.map((error, index) => (
        <NodeErrorIndicator
          key={`${error.timestamp.getTime()}-${index}`}
          error={error}
          size="sm"
          showTooltip={true}
        />
      ))}
      
      {remainingCount > 0 && (
        <div className="flex items-center justify-center w-5 h-5 bg-gray-600 text-white text-xs rounded-full">
          +{remainingCount}
        </div>
      )}
    </div>
  );
};