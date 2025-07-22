import React, { useEffect, useState } from 'react';
import {
  XMarkIcon,
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../utils/cn';
import type { AppError } from '../../types';
import { ErrorType } from '../../types';

interface ErrorNotificationProps {
  error: AppError;
  onDismiss: () => void;
  autoHide?: boolean;
  autoHideDelay?: number;
}

export const ErrorNotification: React.FC<ErrorNotificationProps> = ({
  error,
  onDismiss,
  autoHide = true,
  autoHideDelay = 5000,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoHide && error.type !== ErrorType.EXECUTION_ERROR) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300); // Wait for fade out animation
      }, autoHideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, autoHideDelay, error.type, onDismiss]);

  const getIcon = () => {
    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case ErrorType.EXECUTION_ERROR:
        return <ExclamationCircleIcon className="w-5 h-5" />;
      case ErrorType.NETWORK_ERROR:
        return <ExclamationTriangleIcon className="w-5 h-5" />;
      case ErrorType.FILE_ERROR:
        return <ExclamationCircleIcon className="w-5 h-5" />;
      case ErrorType.DATA_ERROR:
        return <InformationCircleIcon className="w-5 h-5" />;
      default:
        return <ExclamationCircleIcon className="w-5 h-5" />;
    }
  };

  const getColorClasses = () => {
    switch (error.type) {
      case ErrorType.VALIDATION_ERROR:
        return 'bg-yellow-900/90 border-yellow-500 text-yellow-100';
      case ErrorType.EXECUTION_ERROR:
        return 'bg-red-900/90 border-red-500 text-red-100';
      case ErrorType.NETWORK_ERROR:
        return 'bg-orange-900/90 border-orange-500 text-orange-100';
      case ErrorType.FILE_ERROR:
        return 'bg-red-900/90 border-red-500 text-red-100';
      case ErrorType.DATA_ERROR:
        return 'bg-blue-900/90 border-blue-500 text-blue-100';
      default:
        return 'bg-gray-900/90 border-gray-500 text-gray-100';
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(onDismiss, 300);
  };

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg border backdrop-blur-sm shadow-lg transition-all duration-300',
        getColorClasses(),
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
      )}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-sm font-medium">
              {error.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </h4>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 ml-2 p-1 rounded-md hover:bg-white/10 transition-colors"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-sm opacity-90">
            {error.message}
          </p>
          
          {error.nodeId && (
            <p className="text-xs opacity-70 mt-1">
              Node: {error.nodeId}
            </p>
          )}
          
          {error.code && (
            <p className="text-xs opacity-70 mt-1">
              Code: {error.code}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

interface ErrorNotificationContainerProps {
  errors: AppError[];
  onDismissError: (errorId: string) => void;
}

export const ErrorNotificationContainer: React.FC<ErrorNotificationContainerProps> = ({
  errors,
  onDismissError,
}) => {
  const generateErrorId = (error: AppError) => 
    `${error.timestamp.getTime()}-${error.type}-${error.nodeId || 'global'}`;

  return (
    <>
      {errors.map((error) => {
        const errorId = generateErrorId(error);
        return (
          <ErrorNotification
            key={errorId}
            error={error}
            onDismiss={() => onDismissError(errorId)}
          />
        );
      })}
    </>
  );
};