import type {
  NodeInstance,
  Connection,
  ExecutionGraph,
  ExecutionContext,
  ExecutionResult,
  AppError,
  NodeStatus,
} from '../types';
import { ErrorType } from '../types';
import { ExecutionGraphBuilder } from './ExecutionGraph';
import { nodeExecutorRegistry } from './NodeExecutor';
import { nodeRegistry } from '../utils/nodeRegistry';

/**
 * Execution queue item
 */
interface ExecutionQueueItem {
  nodeId: string;
  priority: number;
  dependencies: string[];
  retryCount: number;
  maxRetries: number;
}

/**
 * Execution statistics
 */
interface ExecutionStats {
  totalNodes: number;
  completedNodes: number;
  failedNodes: number;
  startTime: Date;
  endTime?: Date;
  totalExecutionTime: number;
}

/**
 * Main execution engine that orchestrates node execution
 */
export class ExecutionEngine {
  private graphBuilder = new ExecutionGraphBuilder();
  private executionQueue: ExecutionQueueItem[] = [];
  private executingNodes = new Set<string>();
  private completedNodes = new Set<string>();
  private failedNodes = new Set<string>();
  private nodeOutputs = new Map<string, any>();
  private nodeStatuses = new Map<string, NodeStatus>();
  private executionStats: ExecutionStats | null = null;
  private maxConcurrentExecutions = 4;
  private executionTimeout = 30000; // 30 seconds default timeout
  private isExecuting = false;
  private abortController: AbortController | null = null;

  // Event callbacks
  private onNodeStatusChange?: (nodeId: string, status: NodeStatus, error?: AppError) => void;
  private onExecutionProgress?: (stats: ExecutionStats) => void;
  private onExecutionComplete?: (success: boolean, stats: ExecutionStats) => void;

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: {
    onNodeStatusChange?: (nodeId: string, status: NodeStatus, error?: AppError) => void;
    onExecutionProgress?: (stats: ExecutionStats) => void;
    onExecutionComplete?: (success: boolean, stats: ExecutionStats) => void;
  }): void {
    this.onNodeStatusChange = callbacks.onNodeStatusChange;
    this.onExecutionProgress = callbacks.onExecutionProgress;
    this.onExecutionComplete = callbacks.onExecutionComplete;
  }

  /**
   * Configure execution settings
   */
  configure(settings: {
    maxConcurrentExecutions?: number;
    executionTimeout?: number;
  }): void {
    if (settings.maxConcurrentExecutions !== undefined) {
      this.maxConcurrentExecutions = Math.max(1, settings.maxConcurrentExecutions);
    }
    if (settings.executionTimeout !== undefined) {
      this.executionTimeout = Math.max(1000, settings.executionTimeout);
    }
  }

  /**
   * Execute the entire graph
   */
  async executeGraph(
    nodes: NodeInstance[],
    connections: Connection[]
  ): Promise<{ success: boolean; stats: ExecutionStats }> {
    if (this.isExecuting) {
      throw this.createError(
        ErrorType.EXECUTION_ERROR,
        'Execution already in progress'
      );
    }

    this.isExecuting = true;
    this.abortController = new AbortController();

    try {
      // Reset state
      this.resetExecutionState();

      // Build execution graph
      const graph = this.graphBuilder.buildGraph(nodes, connections);

      // Initialize execution stats
      this.executionStats = {
        totalNodes: nodes.length,
        completedNodes: 0,
        failedNodes: 0,
        startTime: new Date(),
        totalExecutionTime: 0,
      };

      // Populate graph with node definitions
      this.populateGraphDefinitions(graph);

      // Build execution queue
      this.buildExecutionQueue(graph);

      // Execute nodes
      await this.executeQueue(graph);

      // Finalize stats
      this.executionStats.endTime = new Date();
      this.executionStats.totalExecutionTime = 
        this.executionStats.endTime.getTime() - this.executionStats.startTime.getTime();

      const success = this.failedNodes.size === 0;
      
      this.onExecutionComplete?.(success, this.executionStats);

      return { success, stats: this.executionStats };
    } catch (error) {
      // Check if it's already an AppError (like from circular dependency detection)
      if (error && typeof error === 'object' && 'type' in error && 'timestamp' in error) {
        // Re-throw AppError as-is
        throw error;
      }

      const appError = this.createError(
        ErrorType.EXECUTION_ERROR,
        error instanceof Error ? error.message : 'Unknown execution error',
        undefined,
        { originalError: error }
      );

      if (this.executionStats) {
        this.executionStats.endTime = new Date();
        this.executionStats.totalExecutionTime = 
          this.executionStats.endTime.getTime() - this.executionStats.startTime.getTime();
        this.onExecutionComplete?.(false, this.executionStats);
      }

      throw appError;
    } finally {
      this.isExecuting = false;
      this.abortController = null;
    }
  }

  /**
   * Execute a single node
   */
  async executeNode(
    nodeId: string,
    nodes: NodeInstance[],
    connections: Connection[]
  ): Promise<ExecutionResult> {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) {
      throw this.createError(
        ErrorType.EXECUTION_ERROR,
        `Node ${nodeId} not found`
      );
    }

    // Build minimal graph for dependencies
    const graph = this.graphBuilder.buildGraph(nodes, connections);
    this.populateGraphDefinitions(graph);

    // Get node inputs
    const inputs = this.getNodeInputs(nodeId, graph, connections);

    // Execute the node
    return await this.executeSingleNode(node, inputs, graph);
  }

  /**
   * Abort current execution
   */
  abort(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Get execution status
   */
  getExecutionStatus(): {
    isExecuting: boolean;
    stats: ExecutionStats | null;
    nodeStatuses: Map<string, NodeStatus>;
    nodeOutputs: Map<string, any>;
  } {
    return {
      isExecuting: this.isExecuting,
      stats: this.executionStats,
      nodeStatuses: new Map(this.nodeStatuses),
      nodeOutputs: new Map(this.nodeOutputs),
    };
  }

  /**
   * Get output for a specific node
   */
  getNodeOutput(nodeId: string): any {
    return this.nodeOutputs.get(nodeId);
  }

  /**
   * Get status for a specific node
   */
  getNodeStatus(nodeId: string): NodeStatus {
    return this.nodeStatuses.get(nodeId) || 'idle';
  }

  /**
   * Clear cached outputs and reset node statuses
   */
  invalidateNode(nodeId: string): void {
    this.nodeOutputs.delete(nodeId);
    this.nodeStatuses.set(nodeId, 'idle');
    
    // Also invalidate dependent nodes
    // This would require the graph, so we'll implement it when needed
  }

  /**
   * Reset execution state
   */
  private resetExecutionState(): void {
    this.executionQueue = [];
    this.executingNodes.clear();
    this.completedNodes.clear();
    this.failedNodes.clear();
    this.nodeStatuses.clear();
    this.executionStats = null;
  }

  /**
   * Populate graph with node definitions
   */
  private populateGraphDefinitions(graph: ExecutionGraph): void {
    for (const [nodeId, graphNode] of graph.nodes) {
      const definition = nodeRegistry.get(graphNode.instance.type);
      if (!definition) {
        throw this.createError(
          ErrorType.CONFIGURATION_ERROR,
          `Node definition not found for type: ${graphNode.instance.type}`,
          nodeId
        );
      }
      graphNode.definition = definition;
    }
  }

  /**
   * Build execution queue from graph
   */
  private buildExecutionQueue(graph: ExecutionGraph): void {
    this.executionQueue = [];

    for (const nodeId of graph.executionOrder) {
      const graphNode = graph.nodes.get(nodeId);
      if (!graphNode) continue;

      const queueItem: ExecutionQueueItem = {
        nodeId,
        priority: graphNode.level,
        dependencies: [...graphNode.dependencies],
        retryCount: 0,
        maxRetries: 2,
      };

      this.executionQueue.push(queueItem);
      this.nodeStatuses.set(nodeId, 'idle');
    }
  }

  /**
   * Execute the queue with concurrency control
   */
  private async executeQueue(graph: ExecutionGraph): Promise<void> {
    const activePromises = new Set<Promise<void>>();

    while (this.executionQueue.length > 0 || activePromises.size > 0) {
      // Check for abort signal
      if (this.abortController?.signal.aborted) {
        throw this.createError(ErrorType.EXECUTION_ERROR, 'Execution aborted');
      }

      // Start new executions if we have capacity
      while (
        activePromises.size < this.maxConcurrentExecutions &&
        this.executionQueue.length > 0
      ) {
        const executableItem = this.findExecutableItem();
        if (!executableItem) break;

        // Remove from queue
        const index = this.executionQueue.indexOf(executableItem);
        this.executionQueue.splice(index, 1);

        // Start execution
        const promise = this.executeQueueItem(executableItem, graph);
        activePromises.add(promise);

        // Clean up when done
        promise.finally(() => {
          activePromises.delete(promise);
        });
      }

      // Wait for at least one execution to complete
      if (activePromises.size > 0) {
        await Promise.race(activePromises);
      }

      // Update progress
      if (this.executionStats) {
        this.executionStats.completedNodes = this.completedNodes.size;
        this.executionStats.failedNodes = this.failedNodes.size;
        this.onExecutionProgress?.(this.executionStats);
      }
    }
  }

  /**
   * Find an executable item from the queue
   */
  private findExecutableItem(): ExecutionQueueItem | null {
    return this.executionQueue.find(item => 
      item.dependencies.every(depId => this.completedNodes.has(depId))
    ) || null;
  }

  /**
   * Execute a single queue item
   */
  private async executeQueueItem(
    item: ExecutionQueueItem,
    graph: ExecutionGraph
  ): Promise<void> {
    const { nodeId } = item;
    const graphNode = graph.nodes.get(nodeId);
    
    if (!graphNode) {
      throw this.createError(
        ErrorType.EXECUTION_ERROR,
        `Graph node not found: ${nodeId}`
      );
    }

    try {
      this.executingNodes.add(nodeId);
      this.updateNodeStatus(nodeId, 'processing');

      // Get node inputs
      const inputs = this.getNodeInputs(nodeId, graph, []);

      // Execute the node
      const result = await this.executeSingleNode(
        graphNode.instance,
        inputs,
        graph
      );

      if (result.success) {
        this.nodeOutputs.set(nodeId, result.output);
        this.completedNodes.add(nodeId);
        this.updateNodeStatus(nodeId, 'success');
      } else {
        this.failedNodes.add(nodeId);
        this.updateNodeStatus(nodeId, 'error', result.error);
        
        // Optionally retry
        if (item.retryCount < item.maxRetries) {
          item.retryCount++;
          this.executionQueue.push(item);
          this.failedNodes.delete(nodeId);
        }
      }
    } catch (error) {
      this.failedNodes.add(nodeId);
      const appError = this.createError(
        ErrorType.EXECUTION_ERROR,
        error instanceof Error ? error.message : 'Unknown execution error',
        nodeId,
        { originalError: error }
      );
      this.updateNodeStatus(nodeId, 'error', appError);
    } finally {
      this.executingNodes.delete(nodeId);
    }
  }

  /**
   * Execute a single node
   */
  private async executeSingleNode(
    node: NodeInstance,
    inputs: Record<string, any>,
    graph: ExecutionGraph
  ): Promise<ExecutionResult> {
    const executor = nodeExecutorRegistry.get(node.type);
    if (!executor) {
      throw this.createError(
        ErrorType.CONFIGURATION_ERROR,
        `No executor found for node type: ${node.type}`,
        node.id
      );
    }

    const context: ExecutionContext = {
      nodeId: node.id,
      inputs,
      config: node.config,
      metadata: {
        executionId: `exec_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        startTime: new Date(),
        timeout: this.executionTimeout,
      },
    };

    // Create timeout promise
    const timeoutPromise = new Promise<ExecutionResult>((_, reject) => {
      setTimeout(() => {
        reject(this.createError(
          ErrorType.EXECUTION_ERROR,
          `Node execution timeout after ${this.executionTimeout}ms`,
          node.id
        ));
      }, this.executionTimeout);
    });

    // Race between execution and timeout
    return await Promise.race([
      executor.execute(context),
      timeoutPromise,
    ]);
  }

  /**
   * Get inputs for a node from connected outputs
   */
  private getNodeInputs(
    nodeId: string,
    graph: ExecutionGraph,
    connections: Connection[]
  ): Record<string, any> {
    const inputs: Record<string, any> = {};
    const graphNode = graph.nodes.get(nodeId);
    
    if (!graphNode) return inputs;

    // Get inputs from dependencies
    for (const depId of graphNode.dependencies) {
      const output = this.nodeOutputs.get(depId);
      if (output !== undefined) {
        // For now, use a simple mapping - in a real implementation,
        // we'd need to map specific output ports to input ports
        inputs[depId] = output;
      }
    }

    return inputs;
  }

  /**
   * Update node status and notify listeners
   */
  private updateNodeStatus(nodeId: string, status: NodeStatus, error?: AppError): void {
    this.nodeStatuses.set(nodeId, status);
    this.onNodeStatusChange?.(nodeId, status, error);
  }

  /**
   * Create a standardized error
   */
  private createError(
    type: ErrorType,
    message: string,
    nodeId?: string,
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
}

// Export singleton instance
export const executionEngine = new ExecutionEngine();