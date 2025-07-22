import { describe, it, expect } from 'vitest';
import { ExecutionGraphBuilder } from '../ExecutionGraph';
import type { NodeInstance, Connection } from '../../types';

describe('ExecutionGraphBuilder', () => {
  let builder: ExecutionGraphBuilder;

  beforeEach(() => {
    builder = new ExecutionGraphBuilder();
  });

  describe('buildGraph', () => {
    it('should build a simple graph with no connections', () => {
      const nodes: NodeInstance[] = [
        {
          id: 'node1',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
        {
          id: 'node2',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
      ];

      const connections: Connection[] = [];

      const graph = builder.buildGraph(nodes, connections);

      expect(graph.nodes.size).toBe(2);
      expect(graph.executionOrder).toHaveLength(2);
      expect(graph.cycles).toHaveLength(0);

      const node1 = graph.nodes.get('node1');
      const node2 = graph.nodes.get('node2');

      expect(node1?.dependencies).toHaveLength(0);
      expect(node1?.dependents).toHaveLength(0);
      expect(node1?.level).toBe(0);

      expect(node2?.dependencies).toHaveLength(0);
      expect(node2?.dependents).toHaveLength(0);
      expect(node2?.level).toBe(0);
    });

    it('should build a graph with dependencies', () => {
      const nodes: NodeInstance[] = [
        {
          id: 'source',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
        {
          id: 'filter',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
        {
          id: 'sort',
          type: 'sort',
          position: { x: 400, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
      ];

      const connections: Connection[] = [
        {
          id: 'conn1',
          source: 'source',
          sourceHandle: 'output',
          target: 'filter',
          targetHandle: 'input',
        },
        {
          id: 'conn2',
          source: 'filter',
          sourceHandle: 'output',
          target: 'sort',
          targetHandle: 'input',
        },
      ];

      const graph = builder.buildGraph(nodes, connections);

      expect(graph.nodes.size).toBe(3);
      expect(graph.cycles).toHaveLength(0);

      const sourceNode = graph.nodes.get('source');
      const filterNode = graph.nodes.get('filter');
      const sortNode = graph.nodes.get('sort');

      expect(sourceNode?.level).toBe(0);
      expect(filterNode?.level).toBe(1);
      expect(sortNode?.level).toBe(2);

      expect(sourceNode?.dependencies).toHaveLength(0);
      expect(sourceNode?.dependents).toEqual(['filter']);

      expect(filterNode?.dependencies).toEqual(['source']);
      expect(filterNode?.dependents).toEqual(['sort']);

      expect(sortNode?.dependencies).toEqual(['filter']);
      expect(sortNode?.dependents).toHaveLength(0);

      expect(graph.executionOrder).toEqual(['source', 'filter', 'sort']);
    });

    it('should detect circular dependencies', () => {
      const nodes: NodeInstance[] = [
        {
          id: 'node1',
          type: 'example-data',
          position: { x: 0, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
        {
          id: 'node2',
          type: 'filter',
          position: { x: 200, y: 0 },
          data: {},
          config: {},
          status: 'idle',
        },
      ];

      const connections: Connection[] = [
        {
          id: 'conn1',
          source: 'node1',
          sourceHandle: 'output',
          target: 'node2',
          targetHandle: 'input',
        },
        {
          id: 'conn2',
          source: 'node2',
          sourceHandle: 'output',
          target: 'node1',
          targetHandle: 'input',
        },
      ];

      expect(() => builder.buildGraph(nodes, connections)).toThrow('Circular dependencies');
    });

    it('should handle complex dependency graph', () => {
      const nodes: NodeInstance[] = [
        { id: 'a', type: 'example-data', position: { x: 0, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'b', type: 'filter', position: { x: 100, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'c', type: 'filter', position: { x: 200, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'd', type: 'sort', position: { x: 300, y: 0 }, data: {}, config: {}, status: 'idle' },
      ];

      const connections: Connection[] = [
        { id: 'conn1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' },
        { id: 'conn2', source: 'a', sourceHandle: 'out', target: 'c', targetHandle: 'in' },
        { id: 'conn3', source: 'b', sourceHandle: 'out', target: 'd', targetHandle: 'in' },
        { id: 'conn4', source: 'c', sourceHandle: 'out', target: 'd', targetHandle: 'in' },
      ];

      const graph = builder.buildGraph(nodes, connections);

      expect(graph.cycles).toHaveLength(0);

      const nodeA = graph.nodes.get('a');
      const nodeB = graph.nodes.get('b');
      const nodeC = graph.nodes.get('c');
      const nodeD = graph.nodes.get('d');

      expect(nodeA?.level).toBe(0);
      expect(nodeB?.level).toBe(1);
      expect(nodeC?.level).toBe(1);
      expect(nodeD?.level).toBe(2);

      // Execution order should respect dependencies
      const executionOrder = graph.executionOrder;
      expect(executionOrder.indexOf('a')).toBeLessThan(executionOrder.indexOf('b'));
      expect(executionOrder.indexOf('a')).toBeLessThan(executionOrder.indexOf('c'));
      expect(executionOrder.indexOf('b')).toBeLessThan(executionOrder.indexOf('d'));
      expect(executionOrder.indexOf('c')).toBeLessThan(executionOrder.indexOf('d'));
    });
  });

  describe('getParallelExecutableNodes', () => {
    it('should return nodes that can be executed in parallel', () => {
      const nodes: NodeInstance[] = [
        { id: 'a', type: 'example-data', position: { x: 0, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'b', type: 'filter', position: { x: 100, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'c', type: 'filter', position: { x: 200, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'd', type: 'sort', position: { x: 300, y: 0 }, data: {}, config: {}, status: 'idle' },
      ];

      const connections: Connection[] = [
        { id: 'conn1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' },
        { id: 'conn2', source: 'a', sourceHandle: 'out', target: 'c', targetHandle: 'in' },
        { id: 'conn3', source: 'b', sourceHandle: 'out', target: 'd', targetHandle: 'in' },
        { id: 'conn4', source: 'c', sourceHandle: 'out', target: 'd', targetHandle: 'in' },
      ];

      const graph = builder.buildGraph(nodes, connections);

      const level0Nodes = builder.getParallelExecutableNodes(graph, 0);
      const level1Nodes = builder.getParallelExecutableNodes(graph, 1);
      const level2Nodes = builder.getParallelExecutableNodes(graph, 2);

      expect(level0Nodes).toEqual(['a']);
      expect(level1Nodes.sort()).toEqual(['b', 'c']);
      expect(level2Nodes).toEqual(['d']);
    });
  });

  describe('canExecuteNode', () => {
    it('should determine if a node can be executed', () => {
      const nodes: NodeInstance[] = [
        { id: 'a', type: 'example-data', position: { x: 0, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'b', type: 'filter', position: { x: 100, y: 0 }, data: {}, config: {}, status: 'idle' },
      ];

      const connections: Connection[] = [
        { id: 'conn1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' },
      ];

      const graph = builder.buildGraph(nodes, connections);
      const completedNodes = new Set<string>();

      expect(builder.canExecuteNode(graph, 'a', completedNodes)).toBe(true);
      expect(builder.canExecuteNode(graph, 'b', completedNodes)).toBe(false);

      completedNodes.add('a');
      expect(builder.canExecuteNode(graph, 'b', completedNodes)).toBe(true);
    });
  });

  describe('getNewlyExecutableNodes', () => {
    it('should return nodes that become executable after completing a node', () => {
      const nodes: NodeInstance[] = [
        { id: 'a', type: 'example-data', position: { x: 0, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'b', type: 'filter', position: { x: 100, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'c', type: 'filter', position: { x: 200, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'd', type: 'sort', position: { x: 300, y: 0 }, data: {}, config: {}, status: 'idle' },
      ];

      const connections: Connection[] = [
        { id: 'conn1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' },
        { id: 'conn2', source: 'a', sourceHandle: 'out', target: 'c', targetHandle: 'in' },
        { id: 'conn3', source: 'b', sourceHandle: 'out', target: 'd', targetHandle: 'in' },
        { id: 'conn4', source: 'c', sourceHandle: 'out', target: 'd', targetHandle: 'in' },
      ];

      const graph = builder.buildGraph(nodes, connections);
      let completedNodes = new Set<string>();

      // After completing 'a', both 'b' and 'c' should become executable
      completedNodes.add('a');
      const newlyExecutable1 = builder.getNewlyExecutableNodes(graph, 'a', completedNodes);
      expect(newlyExecutable1.sort()).toEqual(['b', 'c']);

      // After completing 'b', 'd' should not be executable yet (needs 'c' too)
      completedNodes.add('b');
      const newlyExecutable2 = builder.getNewlyExecutableNodes(graph, 'b', completedNodes);
      expect(newlyExecutable2).toEqual([]);

      // After completing 'c', 'd' should become executable
      completedNodes.add('c');
      const newlyExecutable3 = builder.getNewlyExecutableNodes(graph, 'c', completedNodes);
      expect(newlyExecutable3).toEqual(['d']);
    });
  });

  describe('getDependencyLevels', () => {
    it('should return all dependency levels in the graph', () => {
      const nodes: NodeInstance[] = [
        { id: 'a', type: 'example-data', position: { x: 0, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'b', type: 'filter', position: { x: 100, y: 0 }, data: {}, config: {}, status: 'idle' },
        { id: 'c', type: 'sort', position: { x: 200, y: 0 }, data: {}, config: {}, status: 'idle' },
      ];

      const connections: Connection[] = [
        { id: 'conn1', source: 'a', sourceHandle: 'out', target: 'b', targetHandle: 'in' },
        { id: 'conn2', source: 'b', sourceHandle: 'out', target: 'c', targetHandle: 'in' },
      ];

      const graph = builder.buildGraph(nodes, connections);
      const levels = builder.getDependencyLevels(graph);

      expect(levels).toEqual([0, 1, 2]);
    });
  });
});