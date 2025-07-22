import React from 'react';
import { cn } from '../../utils/cn';

interface LoadingIndicatorProps {
  size?: 'sm' | 'md' | 'lg' | 'small' | 'large';
  message?: string;
  showMessage?: boolean;
  className?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  size = 'md',
  message = 'Loading...',
  showMessage = true,
  className,
}) => {
  // Normalize size values
  const normalizedSize = size === 'small' ? 'sm' : size === 'large' ? 'lg' : size;
  
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  const containerSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div 
      className={cn(
        'flex flex-col items-center gap-2',
        containerSizeClasses[normalizedSize],
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <svg
        className={cn(
          'animate-spin text-blue-500',
          sizeClasses[normalizedSize]
        )}
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      {showMessage && (
        <span className={cn('text-gray-600', textSizeClasses[normalizedSize])}>
          {message}
        </span>
      )}
    </div>
  );
};