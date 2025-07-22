import { useState, useRef, useEffect, useCallback } from 'react';

export interface UseWebWorkerReturn {
  isLoading: boolean;
  error: string | null;
  data: any;
  postMessage: (message: any) => void;
  reset: () => void;
}

export const useWebWorker = (workerUrl: string): UseWebWorkerReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    try {
      workerRef.current = new Worker(workerUrl);

      // Handle worker messages
      workerRef.current.addEventListener('message', (event) => {
        const { type, result, error: workerError } = event.data;
        
        if (type === 'result') {
          setData(result);
          setIsLoading(false);
          setError(null);
        } else if (type === 'error') {
          setError(workerError);
          setIsLoading(false);
          setData(null);
        }
      });

      // Handle worker errors
      workerRef.current.addEventListener('error', (event) => {
        setError(event.message || 'Worker failed');
        setIsLoading(false);
      });

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create worker');
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, [workerUrl]);

  // Post message to worker
  const postMessage = useCallback((message: any) => {
    if (workerRef.current) {
      setIsLoading(true);
      setError(null);
      workerRef.current.postMessage(message);
    }
  }, []);

  // Reset state
  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
  }, []);

  return {
    isLoading,
    error,
    data,
    postMessage,
    reset
  };
};