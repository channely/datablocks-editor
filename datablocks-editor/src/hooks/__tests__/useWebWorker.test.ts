import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebWorker } from '../useWebWorker';

// Mock Worker
const mockWorker = {
  postMessage: vi.fn(),
  terminate: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
};

global.Worker = vi.fn().mockImplementation(() => mockWorker);

describe('useWebWorker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useWebWorker('/test-worker.js'));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('should post message to worker', () => {
    const { result } = renderHook(() => useWebWorker('/test-worker.js'));

    act(() => {
      result.current.postMessage({ type: 'test', data: 'hello' });
    });

    expect(mockWorker.postMessage).toHaveBeenCalledWith({
      type: 'test',
      data: 'hello',
    });
    expect(result.current.isLoading).toBe(true);
  });

  it('should handle worker message', () => {
    const { result } = renderHook(() => useWebWorker('/test-worker.js'));

    // Simulate worker message
    act(() => {
      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1];
      
      if (messageHandler) {
        messageHandler({
          data: { type: 'result', result: 'processed data' },
        });
      }
    });

    expect(result.current.data).toBe('processed data');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should handle worker error message', () => {
    const { result } = renderHook(() => useWebWorker('/test-worker.js'));

    // Simulate worker error message
    act(() => {
      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1];
      
      if (messageHandler) {
        messageHandler({
          data: { type: 'error', error: 'Processing failed' },
        });
      }
    });

    expect(result.current.error).toBe('Processing failed');
    expect(result.current.isLoading).toBe(false);
    expect(result.current.data).toBeNull();
  });

  it('should handle worker error event', () => {
    const { result } = renderHook(() => useWebWorker('/test-worker.js'));

    // Simulate worker error event
    act(() => {
      const errorHandler = mockWorker.addEventListener.mock.calls.find(
        (call) => call[0] === 'error'
      )?.[1];
      
      if (errorHandler) {
        errorHandler(new Error('Worker failed'));
      }
    });

    expect(result.current.error).toBe('Worker failed');
    expect(result.current.isLoading).toBe(false);
  });

  it('should terminate worker on unmount', () => {
    const { unmount } = renderHook(() => useWebWorker('/test-worker.js'));

    unmount();

    expect(mockWorker.terminate).toHaveBeenCalled();
  });

  it('should reset state', () => {
    const { result } = renderHook(() => useWebWorker('/test-worker.js'));

    // Set some state
    act(() => {
      const messageHandler = mockWorker.addEventListener.mock.calls.find(
        (call) => call[0] === 'message'
      )?.[1];
      
      if (messageHandler) {
        messageHandler({
          data: { type: 'result', result: 'test data' },
        });
      }
    });

    expect(result.current.data).toBe('test data');

    // Reset state
    act(() => {
      result.current.reset();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });
});