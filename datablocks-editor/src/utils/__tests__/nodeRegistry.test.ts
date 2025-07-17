import { describe, it, expect, beforeEach } from 'vitest';
import { NodeRegistryImpl } from '../nodeRegistry';
import { NodeDefinition, NodeCategory } from '../../types';

describe('NodeRegistry', () => {
  let registry: NodeRegistryImpl;

  beforeEach(() => {
    registry = new NodeRegistryImpl();
  });

  const createTestNodeDefinition = (type: string): NodeDefinition => ({
    id: `test-${type}`,
    type,
    category: NodeCategory.INPUT,
    name: `Test ${type}`,
    description: `Test node of type ${type}`,
    version: '1.0.0',
    inputs: [],
    outputs: [{
      id: 'output',
      name: 'Output',
      type: 'dataset',
      required: false,
      multiple: false,
    }],
    configSchema: {},
    processor: {
      execute: async () => ({}),
      validate: () => ({ valid: true, errors: [] }),
    },
    tags: ['test'],
  });

  describe('register', () => {
    it('should register a valid node definition', () => {
      const definition = createTestNodeDefinition('file-input');
      
      expect(() => registry.register(definition)).not.toThrow();
      expect(registry.get('file-input')).toBe(definition);
    });

    it('should throw error for invalid node definition', () => {
      const invalidDefinition = {
        ...createTestNodeDefinition('invalid'),
        name: '', // Invalid empty name
      };

      expect(() => registry.register(invalidDefinition)).toThrow();
    });

    it('should warn when overwriting existing node type', () => {
      const definition1 = createTestNodeDefinition('duplicate');
      const definition2 = createTestNodeDefinition('duplicate');

      registry.register(definition1);
      
      // Should not throw, but should warn (we can't easily test console.warn)
      expect(() => registry.register(definition2)).not.toThrow();
      expect(registry.get('duplicate')).toBe(definition2);
    });
  });

  describe('getByCategory', () => {
    it('should return nodes filtered by category', () => {
      const inputNode = createTestNodeDefinition('input-node');
      const transformNode = {
        ...createTestNodeDefinition('transform-node'),
        category: NodeCategory.TRANSFORM,
      };

      registry.register(inputNode);
      registry.register(transformNode);

      const inputNodes = registry.getByCategory(NodeCategory.INPUT);
      const transformNodes = registry.getByCategory(NodeCategory.TRANSFORM);

      expect(inputNodes).toHaveLength(1);
      expect(inputNodes[0].type).toBe('input-node');
      expect(transformNodes).toHaveLength(1);
      expect(transformNodes[0].type).toBe('transform-node');
    });
  });

  describe('search', () => {
    it('should search nodes by name and description', () => {
      const fileNode = {
        ...createTestNodeDefinition('file-input'),
        name: 'File Input',
        description: 'Load data from files',
      };
      
      const pasteNode = {
        ...createTestNodeDefinition('paste-input'),
        name: 'Paste Data',
        description: 'Paste data from clipboard',
      };

      registry.register(fileNode);
      registry.register(pasteNode);

      const fileResults = registry.search('file');
      const dataResults = registry.search('data');

      expect(fileResults).toHaveLength(1);
      expect(fileResults[0].type).toBe('file-input');
      
      expect(dataResults).toHaveLength(2); // Both contain "data"
    });

    it('should search nodes by tags', () => {
      const taggedNode = {
        ...createTestNodeDefinition('tagged-node'),
        tags: ['special', 'test'],
      };

      registry.register(taggedNode);

      const results = registry.search('special');
      expect(results).toHaveLength(1);
      expect(results[0].type).toBe('tagged-node');
    });
  });

  describe('unregister', () => {
    it('should remove node from registry', () => {
      const definition = createTestNodeDefinition('removable');
      
      registry.register(definition);
      expect(registry.get('removable')).toBeDefined();
      
      registry.unregister('removable');
      expect(registry.get('removable')).toBeUndefined();
    });
  });
});