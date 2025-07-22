import type {
  NodeInstance,
  Connection,
  GraphNode,
  ExecutionGraph,
  AppError,
} from '../types';
import { ErrorType } from '../types';

/**
 * Builds and manages the execution graph for nodes
 */
export class ExecutionGraphBuilder {
  /**
   * Build execution graph from nodes and connections
   */
  buildGraph(
    nodes: NodeInstance[],
    connections: Connection[]
  ): ExecutionGraph {
    const graph: ExecutionGraph = {
      nodes: new Map(),
      executionOrder: [],
      cycles: [],
    };

    // Create graph nodes
    for (const node of nodes) {
      const graphNode: GraphNode = {
        instance: node,
        definition: null as any, // Will be populated by the execution engine
        dependencies: [],
        dependents: [],
        level: 0,
      };
      graph.nodes.set(node.id, graphNode);
    }

    // Build dependency relationships
    for (const connection of connections) {
      const sourceNode = graph.nodes.get(connection.source);
      const targetNode = graph.nodes.get(connection.target);

      if (sourceNode && targetNode) {
        // Source node is a dependency of target node
        targetNode.dependencies.push(connection.source);
        // Target node is a dependent of source node
        sourceNode.dependents.push(connection.target);
      }
    }

    // Detect cycles
    graph.cycles = this.detectCycles(graph);

    if (graph.cycles.length > 0) {
      throw this.createError(
        ErrorType.DEPENDENCY_ERROR,
        'Circular dependencies detected in the graph',
        undefined,
        { cycles: graph.cycles }
      );
    }

    // Calculate execution levels and order
    this.calculateLevels(graph);
    graph.executionOrder = this.getExecutionOrder(graph);

    return graph;
  }

  /**
   * Detect cycles in the graph using DFS
   */
  private detectCycles(graph: ExecutionGraph): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const currentPath: string[] = [];

    const dfs = (nodeId: string): void => {
      if (recursionStack.has(nodeId)) {
        // Found a cycle
        const cycleStart = currentPath.indexOf(nodeId);
        if (cycleStart !== -1) {
          cycles.push([...currentPath.slice(cycleStart), nodeId]);
        }
        return;
      }

      if (visited.has(nodeId)) {
        return;
      }

      visited.add(nodeId);
      recursionStack.add(nodeId);
      currentPath.push(nodeId);

      const node = graph.nodes.get(nodeId);
      if (node) {
        for (const dependentId of node.dependents) {
          dfs(dependentId);
        }
      }

      recursionStack.delete(nodeId);
      currentPath.pop();
    };

    for (const nodeId of graph.nodes.keys()) {
      if (!visited.has(nodeId)) {
        dfs(nodeId);
      }
    }

    return cycles;
  }

  /**
   * Calculate execution levels for each node
   */
  private calculateLevels(graph: ExecutionGraph): void {
    const visited = new Set<string>();

    const calculateLevel = (nodeId: string): number => {
      if (visited.has(nodeId)) {
        const node = graph.nodes.get(nodeId);
        return node?.level ?? 0;
      }

      visited.add(nodeId);
      const node = graph.nodes.get(nodeId);
      if (!node) return 0;

      let maxDependencyLevel = -1;
      for (const depId of node.dependencies) {
        const depLevel = calculateLevel(depId);
        maxDependencyLevel = Math.max(maxDependencyLevel, depLevel);
      }

      node.level = maxDependencyLevel + 1;
      return node.level;
    };

    for (const nodeId of graph.nodes.keys()) {
      calculateLevel(nodeId);
    }
  }

  /**
   * Get execution order based on dependency levels
   */
  private getExecutionOrder(graph: ExecutionGraph): string[] {
    const nodesByLevel = new Map<number, string[]>();

    // Group nodes by level
    for (const [nodeId, node] of graph.nodes) {
      const level = node.level;
      if (!nodesByLevel.has(level)) {
        nodesByLevel.set(level, []);
      }
      nodesByLevel.get(level)!.push(nodeId);
    }

    // Sort levels and flatten
    const sortedLevels = Array.from(nodesByLevel.keys()).sort((a, b) => a - b);
    const executionOrder: string[] = [];

    for (const level of sortedLevels) {
      const nodesAtLevel = nodesByLevel.get(level) || [];
      // Sort nodes at the same level by ID for deterministic execution
      nodesAtLevel.sort();
      executionOrder.push(...nodesAtLevel);
    }

    return executionOrder;
  }

  /**
   * Get nodes that can be executed in parallel at a given level
   */
  getParallelExecutableNodes(
    graph: ExecutionGraph,
    level: number
  ): string[] {
    const nodes: string[] = [];

    for (const [nodeId, node] of graph.nodes) {
      if (node.level === level) {
        nodes.push(nodeId);
      }
    }

    return nodes.sort(); // Sort for deterministic order
  }

  /**
   * Get all dependency levels in the graph
   */
  getDependencyLevels(graph: ExecutionGraph): number[] {
    const levels = new Set<number>();

    for (const node of graph.nodes.values()) {
      levels.add(node.level);
    }

    return Array.from(levels).sort((a, b) => a - b);
  }

  /**
   * Check if a node can be executed (all dependencies are satisfied)
   */
  canExecuteNode(
    graph: ExecutionGraph,
    nodeId: string,
    completedNodes: Set<string>
  ): boolean {
    const node = graph.nodes.get(nodeId);
    if (!node) return false;

    // Check if all dependencies are completed
    for (const depId of node.dependencies) {
      if (!completedNodes.has(depId)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get nodes that become executable after completing a node
   */
  getNewlyExecutableNodes(
    graph: ExecutionGraph,
    completedNodeId: string,
    completedNodes: Set<string>
  ): string[] {
    const newlyExecutable: string[] = [];
    const completedNode = graph.nodes.get(completedNodeId);

    if (!completedNode) return newlyExecutable;

    // Check each dependent to see if it can now be executed
    for (const dependentId of completedNode.dependents) {
      if (!completedNodes.has(dependentId) && 
          this.canExecuteNode(graph, dependentId, completedNodes)) {
        newlyExecutable.push(dependentId);
      }
    }

    return newlyExecutable;
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
export const executionGraphBuilder = new ExecutionGraphBuilder();