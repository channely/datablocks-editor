import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataProcessingService } from '../dataProcessingService';
import type { Dataset } from '../../types';

// Mock the web worker
vi.mock('../../workers/dataProcessor.worker.ts', () => ({
  default: vi.fn().mockImplementation(() => ({
    postMessage: vi.fn(),
    terminate: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
}));

describe('DataProcessingService', () => {
  let service: DataProcessingService;
  let mockWorker: any;

  beforeEach(() => {
    service = new DataProcessingService();
    mockWorker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    
    // Mock Worker constructor
    global.Worker = vi.fn().mockImplementation(() => mockWorker);
  });

  describe('processData', () => {
    it('should process data using web worker', async () => {
      const mockData: Dataset = {
        columns: ['name', 'age'],
        rows: [['Alice', 25], ['Bob', 30]],
      };

      const mockResult: Dataset = {
        columns: ['name', 'age'],
        rows: [['Alice', 25]],
      };

      // Mock worker response
      mockWorker.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'message') {
          setTimeout(() => {
            callback({
              data: {
                type: 'result',
                result: mockResult,
              },
            });
          }, 0);
        }
      });

      const result = await service.processData(mockData, {
        operation: 'filter',
        config: { column: 'age', operator: '>', value: 20 },
      });

      expect(result).toEqual(mockResult);
      expect(mockWorker.postMessage).toHaveBeenCalledWith({
        type: 'process',
        data: mockData,
        config: {
          operation: 'filter',
          config: { column: 'age', operator: '>', value: 20 },
        },
      });
    });

    it('should handle worker errors', async () => {
      const mockData: Dataset = {
        columns: ['name', 'age'],
        rows: [['Alice', 25]],
      };

      // Mock worker error
      mockWorker.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'error') {
          setTimeout(() => {
            callback(new Error('Worker error'));
          }, 0);
        }
      });

      await expect(
        service.processData(mockData, {
          operation: 'filter',
          config: { column: 'age', operator: '>', value: 20 },
        })
      ).rejects.toThrow('Worker error');
    });

    it('should handle worker message errors', async () => {
      const mockData: Dataset = {
        columns: ['name', 'age'],
        rows: [['Alice', 25]],
      };

      // Mock worker message error
      mockWorker.addEventListener.mockImplementation((event: string, callback: Function) => {
        if (event === 'message') {
          setTimeout(() => {
            callback({
              data: {
                type: 'error',
                error: 'Processing failed',
              },
            });
          }, 0);
        }
      });

      await expect(
        service.processData(mockData, {
          operation: 'filter',
          config: { column: 'age', operator: '>', value: 20 },
        })
      ).rejects.toThrow('Processing failed');
    });
  });

  describe('terminate', () => {
    it('should terminate the worker', () => {
      service.terminate();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  describe('isProcessing', () => {
    it('should return false initially', () => {
      expect(service.isProcessing()).toBe(false);
    });

    it('should return true during processing', async () => {
      const mockData: Dataset = {
        columns: ['name', 'age'],
        rows: [['Alice', 25]],
      };

      // Don't resolve the promise immediately
      mockWorker.addEventListener.mockImplementation((event: string, callback: Function) => {
        // Don't call callback to simulate ongoing processing
      });

      const promise = service.processData(mockData, {
        operation: 'filter',
        config: { column: 'age', operator: '>', value: 20 },
      });

      expect(service.isProcessing()).toBe(true);

      // Clean up
      service.terminate();
    });
  });
});