import React, { useState, useMemo } from 'react';
import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  TrashIcon,
  ClockIcon,
  XMarkIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import type { AppError } from '../../types';
import { ErrorType } from '../../types';
import { useAppStore } from '../../stores/appStore';
import { errorHandler } from '../../services/errorHandler';

interface ErrorLogPanelProps {
  className?: string;
}

export const ErrorLogPanel: React.FC<ErrorLogPanelProps> = ({ className }) => {
  const { errors, removeError, clearErrors } = useAppStore();
  const [selectedErrorType, setSelectedErrorType] = useState<ErrorType | 'all'>('all');
  const [selectedError, setSelectedError] = useState<AppError | null>(null);
  const [showStats, setShowStats] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'timestamp' | 'type' | 'frequency'>('timestamp');

  // Filter and sort errors
  const filteredErrors = useMemo(() => {
    let filtered = errors;

    // Filter by type
    if (selectedErrorType !== 'all') {
      filtered = filtered.filter(error => error.type === selectedErrorType);
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(error => 
        error.message.toLowerCase().includes(term) ||
        error.type.toLowerCase().includes(term) ||
        (error.nodeId && error.nodeId.toLowerCase().includes(term)) ||
        (error.field && error.field.toLowerCase().includes(term))
      );
    }

    // Sort errors
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'timestamp':
          return b.timestamp.getTime() - a.timestamp.getTime();
        case 'type':
          return a.type.localeCompare(b.type);
        case 'frequency':
          const freqA = errorHandler.getErrorFrequency(a);
          const freqB = errorHandler.getErrorFrequency(b);
          return freqB - freqA;
        default:
          return 0;
      }
    });

    return filtered;
  }, [errors, selectedErrorType, searchTerm, sortBy]);

  // Get unique error types for filter
  const errorTypes = useMemo(() => {
    const types = new Set(errors.map(error => error.type));
    return Array.from(types);
  }, [errors]);

  // Get error statistics
  const errorStats = useMemo(() => {
    return errorHandler.getErrorStats();
  }, [errors]);

  const getErrorIcon = (type: ErrorType) => {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return <ExclamationTriangleIcon className="w-4 h-4 text-yellow-400" />;
      case ErrorType.EXECUTION_ERROR:
        return <ExclamationCircleIcon className="w-4 h-4 text-red-400" />;
      case ErrorType.NETWORK_ERROR:
        return <ExclamationTriangleIcon className="w-4 h-4 text-orange-400" />;
      case ErrorType.FILE_ERROR:
        return <ExclamationCircleIcon className="w-4 h-4 text-red-400" />;
      case ErrorType.DATA_ERROR:
        return <InformationCircleIcon className="w-4 h-4 text-blue-400" />;
      default:
        return <ExclamationCircleIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getErrorTypeColor = (type: ErrorType) => {
    switch (type) {
      case ErrorType.VALIDATION_ERROR:
        return 'text-yellow-400 bg-yellow-400/10';
      case ErrorType.EXECUTION_ERROR:
        return 'text-red-400 bg-red-400/10';
      case ErrorType.NETWORK_ERROR:
        return 'text-orange-400 bg-orange-400/10';
      case ErrorType.FILE_ERROR:
        return 'text-red-400 bg-red-400/10';
      case ErrorType.DATA_ERROR:
        return 'text-blue-400 bg-blue-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
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

  const generateErrorId = (error: AppError) => 
    `${error.timestamp.getTime()}-${error.type}-${error.nodeId || 'global'}`;

  const handleRemoveError = (error: AppError) => {
    const errorId = generateErrorId(error);
    removeError(errorId);
    if (selectedError === error) {
      setSelectedError(null);
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-gray-900 text-white', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold">Error Log</h3>
          <span className="text-sm text-gray-400">({filteredErrors.length})</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-32"
            />
          </div>

          {/* Filter dropdown */}
          <div className="relative">
            <select
              value={selectedErrorType}
              onChange={(e) => setSelectedErrorType(e.target.value as ErrorType | 'all')}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {errorTypes.map(type => (
                <option key={type} value={type}>
                  {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Sort dropdown */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'timestamp' | 'type' | 'frequency')}
              className="bg-gray-800 border border-gray-600 rounded px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="timestamp">Sort by Time</option>
              <option value="type">Sort by Type</option>
              <option value="frequency">Sort by Frequency</option>
            </select>
          </div>

          {/* Stats toggle */}
          <button
            onClick={() => setShowStats(!showStats)}
            className={cn(
              "p-2 transition-colors",
              showStats ? "text-blue-400" : "text-gray-400 hover:text-blue-400"
            )}
            title="Show error statistics"
          >
            <ChartBarIcon className="w-4 h-4" />
          </button>
          
          {/* Clear all button */}
          <button
            onClick={clearErrors}
            disabled={errors.length === 0}
            className="p-2 text-gray-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Clear all errors"
          >
            <TrashIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Error statistics */}
      {showStats && (
        <div className="p-4 bg-gray-800 border-b border-gray-700">
          <h4 className="text-sm font-medium text-white mb-3">Error Statistics</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{errorStats.total}</div>
              <div className="text-gray-400">Total Errors</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{errorStats.byType[ErrorType.EXECUTION_ERROR] || 0}</div>
              <div className="text-gray-400">Execution</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">{errorStats.byType[ErrorType.VALIDATION_ERROR] || 0}</div>
              <div className="text-gray-400">Validation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-400">{errorStats.byType[ErrorType.DATA_ERROR] || 0}</div>
              <div className="text-gray-400">Data</div>
            </div>
          </div>
          
          {/* Top error nodes */}
          {Object.keys(errorStats.byNode).length > 0 && (
            <div className="mt-4">
              <h5 className="text-xs font-medium text-gray-400 mb-2">Most Error-Prone Nodes</h5>
              <div className="space-y-1">
                {Object.entries(errorStats.byNode)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 3)
                  .map(([nodeId, count]) => (
                    <div key={nodeId} className="flex justify-between text-xs">
                      <span className="text-gray-300 truncate">{nodeId}</span>
                      <span className="text-red-400">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Error list */}
      <div className="flex-1 overflow-hidden">
        {filteredErrors.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <ExclamationCircleIcon className="w-12 h-12 mb-2 opacity-50" />
            <p>No errors to display</p>
            {selectedErrorType !== 'all' && (
              <p className="text-sm mt-1">Try changing the filter</p>
            )}
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {filteredErrors.map((error, index) => (
              <div
                key={`${error.timestamp.getTime()}-${index}`}
                className={cn(
                  'p-3 border-b border-gray-800 cursor-pointer hover:bg-gray-800/50 transition-colors',
                  selectedError === error && 'bg-gray-800'
                )}
                onClick={() => setSelectedError(selectedError === error ? null : error)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className="flex-shrink-0 mt-0.5">
                      {getErrorIcon(error.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          getErrorTypeColor(error.type)
                        )}>
                          {error.type.replace('_', ' ').toUpperCase()}
                        </span>
                        
                        <div className="flex items-center text-xs text-gray-500">
                          <ClockIcon className="w-3 h-3 mr-1" />
                          {formatTimestamp(error.timestamp)}
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-200 truncate">
                        {error.message}
                      </p>
                      
                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          {error.nodeId && (
                            <span>Node: {error.nodeId}</span>
                          )}
                          {errorHandler.getErrorFrequency(error) > 1 && (
                            <span className="text-yellow-400">
                              ({errorHandler.getErrorFrequency(error)}x)
                            </span>
                          )}
                          {errorHandler.isCriticalError(error) && (
                            <span className="text-red-400 font-medium">CRITICAL</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveError(error);
                    }}
                    className="flex-shrink-0 p-1 text-gray-500 hover:text-red-400 transition-colors"
                    title="Remove error"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Expanded error details */}
                {selectedError === error && (
                  <div className="mt-3 p-3 bg-gray-800/50 rounded border border-gray-700">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-gray-400 font-medium">Message:</span>
                        <p className="text-gray-200 mt-1">{error.message}</p>
                      </div>
                      
                      {error.code && (
                        <div>
                          <span className="text-gray-400 font-medium">Code:</span>
                          <p className="text-gray-200 mt-1">{error.code}</p>
                        </div>
                      )}
                      
                      {error.field && (
                        <div>
                          <span className="text-gray-400 font-medium">Field:</span>
                          <p className="text-gray-200 mt-1">{error.field}</p>
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
                      
                      <div>
                        <span className="text-gray-400 font-medium">Timestamp:</span>
                        <p className="text-gray-200 mt-1">{error.timestamp.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};