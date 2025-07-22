/**
 * Performance optimization utilities for DataBlocks Editor
 */

// Performance monitoring
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, number[]> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTiming(operation: string): () => number {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(operation, duration);
      return duration;
    };
  }

  recordMetric(operation: string, duration: number): void {
    if (!this.metrics.has(operation)) {
      this.metrics.set(operation, []);
    }
    this.metrics.get(operation)!.push(duration);
  }

  getMetrics(operation: string): { avg: number; min: number; max: number; count: number } | null {
    const values = this.metrics.get(operation);
    if (!values || values.length === 0) return null;

    return {
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    };
  }

  getAllMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    for (const [operation, values] of this.metrics.entries()) {
      if (values.length > 0) {
        result[operation] = {
          avg: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    }
    return result;
  }

  clearMetrics(): void {
    this.metrics.clear();
  }
}

// Memory usage monitoring
export const getMemoryUsage = (): { used: number; total: number } | null => {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize
    };
  }
  return null;
};

// Debounce utility for performance optimization
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance optimization
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Batch processing utility
export class BatchProcessor<T> {
  private batch: T[] = [];
  private batchSize: number;
  private processor: (items: T[]) => Promise<void>;
  private timeout: NodeJS.Timeout | null = null;
  private flushDelay: number;

  constructor(
    processor: (items: T[]) => Promise<void>,
    batchSize: number = 100,
    flushDelay: number = 1000
  ) {
    this.processor = processor;
    this.batchSize = batchSize;
    this.flushDelay = flushDelay;
  }

  add(item: T): void {
    this.batch.push(item);
    
    if (this.batch.length >= this.batchSize) {
      this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  private scheduleFlush(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(() => this.flush(), this.flushDelay);
  }

  async flush(): Promise<void> {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    if (this.batch.length === 0) return;

    const items = [...this.batch];
    this.batch = [];
    
    try {
      await this.processor(items);
    } catch (error) {
      console.error('Batch processing error:', error);
    }
  }
}

// Virtual scrolling utility for large datasets
export class VirtualScrollManager {
  private containerHeight: number;
  private itemHeight: number;
  private totalItems: number;
  private scrollTop: number = 0;

  constructor(containerHeight: number, itemHeight: number, totalItems: number) {
    this.containerHeight = containerHeight;
    this.itemHeight = itemHeight;
    this.totalItems = totalItems;
  }

  getVisibleRange(): { start: number; end: number; offset: number } {
    const visibleCount = Math.ceil(this.containerHeight / this.itemHeight);
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(start + visibleCount + 1, this.totalItems);
    const offset = start * this.itemHeight;

    return { start, end, offset };
  }

  updateScroll(scrollTop: number): void {
    this.scrollTop = scrollTop;
  }

  getTotalHeight(): number {
    return this.totalItems * this.itemHeight;
  }
}

// Lazy loading utility
export class LazyLoader<T> {
  private cache: Map<string, T> = new Map();
  private loader: (key: string) => Promise<T>;
  private loading: Set<string> = new Set();

  constructor(loader: (key: string) => Promise<T>) {
    this.loader = loader;
  }

  async get(key: string): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    if (this.loading.has(key)) {
      // Wait for existing load to complete
      while (this.loading.has(key)) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return this.cache.get(key)!;
    }

    this.loading.add(key);
    try {
      const value = await this.loader(key);
      this.cache.set(key, value);
      return value;
    } finally {
      this.loading.delete(key);
    }
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
    this.loading.clear();
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance();