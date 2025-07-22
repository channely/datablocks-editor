import type {
  ExecutionContext,
  ExecutionResult,
  AppError,
  ValidationResult,
} from '../types';
import { ErrorType } from '../types';

/**
 * Abstract base class for node executors
 * Each node type should extend this class to implement its specific execution logic
 */
export abstract class NodeExecutor {
  protected nodeType: string;

  constructor(nodeType: string) {
    this.nodeType = nodeType;
  }

  /**
   * Execute the node with given inputs and configuration
   */
  abstract execute(context: ExecutionContext): Promise<ExecutionResult>;

  /**
   * Validate inputs and configuration before execution
   */
  abstract validate(context: ExecutionContext): ValidationResult;

  /**
   * Get the expected output schema based on inputs and config
   */
  getOutputSchema?(context: ExecutionContext): any;

  /**
   * Cleanup resources after execution
   */
  cleanup?(context: ExecutionContext): Promise<void>;

  /**
   * Check if the node can be executed with current inputs
   */
  canExecute(context: ExecutionContext): boolean {
    const validation = this.validate(context);
    return validation.valid;
  }

  /**
   * Create a standardized execution result
   */
  protected createResult(
    success: boolean,
    output?: any,
    error?: AppError,
    executionTime: number = 0,
    metadata?: Record<string, any>
  ): ExecutionResult {
    return {
      success,
      output,
      error,
      executionTime,
      metadata,
    };
  }

  /**
   * Create a standardized error
   */
  protected createError(
    type: ErrorType,
    message: string,
    nodeId: string,
    details?: Record<string, any>
  ): AppError {
    return {
      type,
      message,
      nodeId,
      details,
      timestamp: new Date(),
      stack: new Error().stack,
    };
  }

  /**
   * Wrap execution with error handling and timing
   */
  protected async safeExecute(
    context: ExecutionContext,
    executor: () => Promise<any>
  ): Promise<ExecutionResult> {
    const startTime = performance.now();

    try {
      const output = await executor();
      const executionTime = performance.now() - startTime;

      return this.createResult(true, output, undefined, executionTime);
    } catch (error) {
      const executionTime = performance.now() - startTime;
      const appError = this.createError(
        ErrorType.EXECUTION_ERROR,
        error instanceof Error ? error.message : 'Unknown execution error',
        context.nodeId,
        {
          originalError: error,
          inputs: context.inputs,
          config: context.config,
        }
      );

      return this.createResult(false, undefined, appError, executionTime);
    }
  }
}

/**
 * Registry for node executors
 */
export class NodeExecutorRegistry {
  private executors = new Map<string, NodeExecutor>();

  /**
   * Register a node executor
   */
  register(nodeType: string, executor: NodeExecutor): void {
    this.executors.set(nodeType, executor);
  }

  /**
   * Unregister a node executor
   */
  unregister(nodeType: string): void {
    this.executors.delete(nodeType);
  }

  /**
   * Get executor for a node type
   */
  get(nodeType: string): NodeExecutor | undefined {
    return this.executors.get(nodeType);
  }

  /**
   * Check if executor exists for a node type
   */
  has(nodeType: string): boolean {
    return this.executors.has(nodeType);
  }

  /**
   * Get all registered node types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.executors.keys());
  }

  /**
   * Clear all executors
   */
  clear(): void {
    this.executors.clear();
  }
}

// Global executor registry instance
export const nodeExecutorRegistry = new NodeExecutorRegistry();