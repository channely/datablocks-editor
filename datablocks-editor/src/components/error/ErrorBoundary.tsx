import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { ErrorType } from '../../types';
import type { AppError } from '../../types';
import { errorHandler } from '../../services/errorHandler';

interface Props {
  children: ReactNode;
  onError?: (error: AppError) => void;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });

    // Create AppError and report it
    const appError: AppError = {
      type: ErrorType.EXECUTION_ERROR,
      message: error.message,
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      },
      timestamp: new Date(),
      stack: error.stack,
    };

    // Use global error handler
    errorHandler.handleError(appError);

    // Call the error handler if provided
    if (this.props.onError) {
      this.props.onError(appError);
    }
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-900 text-white">
          <ExclamationTriangleIcon className="w-16 h-16 text-red-400 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-gray-400 text-center mb-4">
            An unexpected error occurred. Please refresh the page or contact support if the problem persists.
          </p>
          
          {/* Error details (only in development) */}
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 p-4 bg-gray-800 rounded-lg border border-gray-700 max-w-2xl">
              <summary className="cursor-pointer text-sm font-medium text-gray-300 mb-2">
                Error Details (Development)
              </summary>
              <div className="text-xs text-gray-400 font-mono">
                <div className="mb-2">
                  <strong>Error:</strong> {this.state.error.message}
                </div>
                {this.state.error.stack && (
                  <div className="mb-2">
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.error.stack}</pre>
                  </div>
                )}
                {this.state.errorInfo?.componentStack && (
                  <div>
                    <strong>Component Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
                  </div>
                )}
              </div>
            </details>
          )}

          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}