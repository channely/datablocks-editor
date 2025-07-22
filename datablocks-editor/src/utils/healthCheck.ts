/**
 * Application health check and diagnostics
 */

import { nodeRegistry } from './nodeRegistry';
import { performanceMonitor } from './performance';

export interface HealthCheckResult {
  status: 'healthy' | 'warning' | 'error';
  checks: {
    nodeRegistry: boolean;
    performance: boolean;
    memory: boolean;
    localStorage: boolean;
    webWorkers: boolean;
  };
  details: {
    registeredNodes: number;
    memoryUsage?: { used: number; total: number };
    performanceMetrics: Record<string, any>;
    errors: string[];
    warnings: string[];
  };
  timestamp: Date;
}

export class HealthChecker {
  async runHealthCheck(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'healthy',
      checks: {
        nodeRegistry: false,
        performance: false,
        memory: false,
        localStorage: false,
        webWorkers: false,
      },
      details: {
        registeredNodes: 0,
        performanceMetrics: {},
        errors: [],
        warnings: [],
      },
      timestamp: new Date(),
    };

    // Check node registry
    try {
      const nodes = nodeRegistry.getAll();
      result.checks.nodeRegistry = nodes.length > 0;
      result.details.registeredNodes = nodes.length;
      
      if (nodes.length === 0) {
        result.details.warnings.push('No nodes registered in node registry');
      }
    } catch (error) {
      result.checks.nodeRegistry = false;
      result.details.errors.push(`Node registry error: ${error.message}`);
    }

    // Check performance monitoring
    try {
      const metrics = performanceMonitor.getAllMetrics();
      result.checks.performance = true;
      result.details.performanceMetrics = metrics;
    } catch (error) {
      result.checks.performance = false;
      result.details.errors.push(`Performance monitoring error: ${error.message}`);
    }

    // Check memory usage
    try {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        result.details.memoryUsage = {
          used: memory.usedJSHeapSize,
          total: memory.totalJSHeapSize,
        };
        result.checks.memory = true;

        // Warning if memory usage is high
        const usagePercent = (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100;
        if (usagePercent > 80) {
          result.details.warnings.push(`High memory usage: ${usagePercent.toFixed(1)}%`);
        }
      } else {
        result.checks.memory = false;
        result.details.warnings.push('Memory monitoring not available in this browser');
      }
    } catch (error) {
      result.checks.memory = false;
      result.details.errors.push(`Memory check error: ${error.message}`);
    }

    // Check localStorage
    try {
      const testKey = '__health_check_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      result.checks.localStorage = true;
    } catch (error) {
      result.checks.localStorage = false;
      result.details.errors.push(`localStorage not available: ${error.message}`);
    }

    // Check Web Workers support
    try {
      result.checks.webWorkers = typeof Worker !== 'undefined';
      if (!result.checks.webWorkers) {
        result.details.warnings.push('Web Workers not supported in this environment');
      }
    } catch (error) {
      result.checks.webWorkers = false;
      result.details.errors.push(`Web Workers check error: ${error.message}`);
    }

    // Determine overall status
    const hasErrors = result.details.errors.length > 0;
    const hasWarnings = result.details.warnings.length > 0;
    const criticalChecks = [result.checks.nodeRegistry, result.checks.localStorage];
    const hasCriticalFailures = criticalChecks.some(check => !check);

    if (hasErrors || hasCriticalFailures) {
      result.status = 'error';
    } else if (hasWarnings) {
      result.status = 'warning';
    } else {
      result.status = 'healthy';
    }

    return result;
  }

  async runPerformanceTest(): Promise<{
    dataProcessing: number;
    rendering: number;
    memory: { before: number; after: number; leaked: number };
  }> {
    const startMemory = this.getMemoryUsage();

    // Test data processing performance
    const dataProcessingStart = performance.now();
    const testData = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      value: Math.random() * 1000,
    }));
    
    // Simulate data processing
    const processed = testData
      .filter(item => item.value > 500)
      .sort((a, b) => b.value - a.value)
      .slice(0, 100);
    
    const dataProcessingTime = performance.now() - dataProcessingStart;

    // Test rendering performance
    const renderingStart = performance.now();
    const div = document.createElement('div');
    for (let i = 0; i < 1000; i++) {
      const child = document.createElement('div');
      child.textContent = `Item ${i}`;
      div.appendChild(child);
    }
    document.body.appendChild(div);
    document.body.removeChild(div);
    const renderingTime = performance.now() - renderingStart;

    // Force garbage collection if available
    if ('gc' in window) {
      (window as any).gc();
    }

    const endMemory = this.getMemoryUsage();
    const memoryLeaked = endMemory - startMemory;

    return {
      dataProcessing: dataProcessingTime,
      rendering: renderingTime,
      memory: {
        before: startMemory,
        after: endMemory,
        leaked: memoryLeaked,
      },
    };
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  generateHealthReport(healthCheck: HealthCheckResult): string {
    const lines: string[] = [];
    
    lines.push('=== DataBlocks Editor Health Report ===');
    lines.push(`Status: ${healthCheck.status.toUpperCase()}`);
    lines.push(`Timestamp: ${healthCheck.timestamp.toISOString()}`);
    lines.push('');

    lines.push('System Checks:');
    Object.entries(healthCheck.checks).forEach(([check, passed]) => {
      lines.push(`  ${check}: ${passed ? '✓' : '✗'}`);
    });
    lines.push('');

    if (healthCheck.details.registeredNodes > 0) {
      lines.push(`Registered Nodes: ${healthCheck.details.registeredNodes}`);
    }

    if (healthCheck.details.memoryUsage) {
      const { used, total } = healthCheck.details.memoryUsage;
      const usagePercent = ((used / total) * 100).toFixed(1);
      lines.push(`Memory Usage: ${(used / 1024 / 1024).toFixed(1)} MB / ${(total / 1024 / 1024).toFixed(1)} MB (${usagePercent}%)`);
    }

    if (Object.keys(healthCheck.details.performanceMetrics).length > 0) {
      lines.push('');
      lines.push('Performance Metrics:');
      Object.entries(healthCheck.details.performanceMetrics).forEach(([operation, metrics]) => {
        lines.push(`  ${operation}: avg ${metrics.avg.toFixed(2)}ms (${metrics.count} samples)`);
      });
    }

    if (healthCheck.details.warnings.length > 0) {
      lines.push('');
      lines.push('Warnings:');
      healthCheck.details.warnings.forEach(warning => {
        lines.push(`  ⚠ ${warning}`);
      });
    }

    if (healthCheck.details.errors.length > 0) {
      lines.push('');
      lines.push('Errors:');
      healthCheck.details.errors.forEach(error => {
        lines.push(`  ✗ ${error}`);
      });
    }

    return lines.join('\n');
  }
}

export const healthChecker = new HealthChecker();