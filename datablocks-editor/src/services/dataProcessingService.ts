import type { Dataset } from '../types';

export interface ProcessingOptions {
  chunkSize?: number;
  timeout?: number;
  onProgress?: (progress: number, message?: string) => void;
}

export class DataProcessingService {
  private worker: Worker | null = null;
  private isProcessingFlag = false;
  private currentOperation: string | null = null;

  constructor() {
    this.initializeWorker();
  }

  private initializeWorker() {
    try {
      // Create a simple inline worker for data processing
      const workerCode = `
        self.onmessage = function(e) {
          const { type, data, options } = e.data;
          
          try {
            switch (type) {
              case 'process':
                // Simulate data processing
                const result = processData(data, options);
                self.postMessage({ type: 'success', result });
                break;
              default:
                self.postMessage({ type: 'error', error: 'Unknown operation type' });
            }
          } catch (error) {
            self.postMessage({ type: 'error', error: error.message });
          }
        };
        
        function processData(data, options) {
          // Simple data processing simulation
          if (!data || !data.rows) {
            throw new Error('Invalid data format');
          }
          
          return {
            ...data,
            metadata: {
              ...data.metadata,
              processed: true,
              processedAt: new Date().toISOString()
            }
          };
        }
      `;

      const blob = new Blob([workerCode], { type: 'application/javascript' });
      this.worker = new Worker(URL.createObjectURL(blob));

      this.worker.onmessage = (event) => {
        const { type, error } = event.data;
        this.isProcessingFlag = false;
        this.currentOperation = null;

        if (type === 'success') {
          // Handle success - this would typically be handled by callbacks
        } else if (type === 'error') {
          console.error('Worker processing error:', error);
        }
      };

      this.worker.onerror = (error) => {
        console.error('Worker error:', error);
        this.isProcessingFlag = false;
        this.currentOperation = null;
      };

    } catch (error) {
      console.error('Failed to initialize worker:', error);
    }
  }

  async processData(
    data: Dataset,
    options: ProcessingOptions = {}
  ): Promise<Dataset> {
    if (!this.worker) {
      throw new Error('Worker not initialized');
    }

    if (this.isProcessingFlag) {
      throw new Error('Another operation is already in progress');
    }

    // Store reference to worker to avoid null check issues
    const worker = this.worker;

    return new Promise((resolve, reject) => {
      this.isProcessingFlag = true;
      this.currentOperation = 'process';

      const timeout = options.timeout || 30000;
      const timeoutId = setTimeout(() => {
        this.isProcessingFlag = false;
        this.currentOperation = null;
        reject(new Error('Processing timeout'));
      }, timeout);

      const messageHandler = (event: MessageEvent) => {
        const { type, result, error } = event.data;

        clearTimeout(timeoutId);
        worker.removeEventListener('message', messageHandler);
        this.isProcessingFlag = false;
        this.currentOperation = null;

        if (type === 'success') {
          resolve(result);
        } else if (type === 'error') {
          reject(new Error(error));
        }
      };

      worker.addEventListener('message', messageHandler);
      worker.postMessage({
        type: 'process',
        data,
        options
      });
    });
  }

  isProcessing(): boolean {
    return this.isProcessingFlag;
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isProcessingFlag = false;
    this.currentOperation = null;
  }

  getCurrentOperation(): string | null {
    return this.currentOperation;
  }
}

// Export singleton instance
export const dataProcessingService = new DataProcessingService();