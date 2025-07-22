import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import type { Dataset, NodeInstance } from '../types';

// Mock ReactFlow Provider for testing
export const ReactFlowTestProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return React.createElement('div', { 'data-testid': 'react-flow-provider' }, children);
};

// Test utilities for creating mock data
export const createMockDataset = (overrides?: Partial<Dataset>): Dataset => ({
  columns: ['name', 'age', 'city'],
  rows: [
    ['Alice', 25, 'New York'],
    ['Bob', 30, 'London'],
    ['Charlie', 35, 'Tokyo'],
  ],
  metadata: {
    rowCount: 3,
    columnCount: 3,
    types: { name: 'string', age: 'number', city: 'string' },
    nullable: { name: false, age: false, city: false },
    unique: { name: true, age: false, city: false },
    created: new Date(),
    modified: new Date(),
  },
  ...overrides,
});

export const createMockNode = (overrides?: Partial<NodeInstance>): NodeInstance => ({
  id: 'test-node-1',
  type: 'filter',
  position: { x: 100, y: 100 },
  data: {
    label: 'Test Node',
  },
  config: {},
  status: 'idle' as const,
  selected: false,
  dragging: false,
  ...overrides,
});

// Mock store factory
export const createMockStore = (overrides?: any) => ({
  nodes: [],
  edges: [],
  addNode: vi.fn(),
  updateNode: vi.fn(),
  deleteNode: vi.fn(),
  addEdge: vi.fn(),
  updateEdge: vi.fn(),
  deleteEdge: vi.fn(),
  selectedNode: null,
  setSelectedNode: vi.fn(),
  executeGraph: vi.fn(),
  isExecuting: false,
  executionResult: null,
  executionError: null,
  ...overrides,
});

// Custom render function with providers
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => 
    React.createElement(ReactFlowTestProvider, null, children);

  return render(ui, { wrapper: Wrapper, ...options });
};

// Mock worker for testing
export class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  
  constructor(public url: string) {}
  
  postMessage(message: any) {
    // Simulate async response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage(new MessageEvent('message', { 
          data: { type: 'result', result: 'processed' } 
        }));
      }
    }, 0);
  }
  
  terminate() {}
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
}

// Mock fetch for HTTP requests
export const mockFetch = (response: any, ok = true) => {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: () => Promise.resolve(response),
    text: () => Promise.resolve(JSON.stringify(response)),
  });
};

// Test data generators
export const generateLargeDataset = (rows: number): Dataset => ({
  columns: ['id', 'value', 'category'],
  rows: Array.from({ length: rows }, (_, i) => [
    i,
    Math.random() * 1000,
    `category_${i % 10}`,
  ]),
  metadata: {
    rowCount: rows,
    columnCount: 3,
    types: { id: 'number', value: 'number', category: 'string' },
    nullable: { id: false, value: false, category: false },
    unique: { id: true, value: false, category: false },
    created: new Date(),
    modified: new Date(),
  },
});

// Performance testing utilities
export const measurePerformance = async (fn: () => Promise<any>) => {
  const start = performance.now();
  const result = await fn();
  const end = performance.now();
  return {
    result,
    duration: end - start,
  };
};

// Async testing utilities
export const waitForCondition = async (
  condition: () => boolean,
  timeout = 5000,
  interval = 100
): Promise<void> => {
  const start = Date.now();
  
  while (!condition() && Date.now() - start < timeout) {
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  if (!condition()) {
    throw new Error(`Condition not met within ${timeout}ms`);
  }
};

// Error simulation utilities
export const simulateError = (message: string) => {
  throw new Error(message);
};

export const simulateAsyncError = async (message: string) => {
  await new Promise(resolve => setTimeout(resolve, 0));
  throw new Error(message);
};

// Re-export testing library utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';