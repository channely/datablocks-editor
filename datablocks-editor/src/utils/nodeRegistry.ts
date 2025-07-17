import {
  NodeDefinition,
  NodeRegistry,
  NodeCategory,
  NodeCategoryInfo,
} from '../types';

/**
 * Node Registry Implementation
 * Manages registration and retrieval of node definitions
 */
export class NodeRegistryImpl implements NodeRegistry {
  private nodes = new Map<string, NodeDefinition>();
  private categories = new Map<NodeCategory, NodeCategoryInfo>();

  constructor() {
    this.initializeCategories();
  }

  private initializeCategories(): void {
    this.categories.set(NodeCategory.INPUT, {
      id: NodeCategory.INPUT,
      name: '输入',
      description: '数据输入节点',
      icon: '📥',
      color: '#3b82f6',
    });

    this.categories.set(NodeCategory.TRANSFORM, {
      id: NodeCategory.TRANSFORM,
      name: '转换',
      description: '数据转换和处理节点',
      icon: '🔄',
      color: '#10b981',
    });

    this.categories.set(NodeCategory.VISUALIZATION, {
      id: NodeCategory.VISUALIZATION,
      name: '可视化',
      description: '数据可视化节点',
      icon: '📊',
      color: '#f59e0b',
    });

    this.categories.set(NodeCategory.ADVANCED, {
      id: NodeCategory.ADVANCED,
      name: '高级',
      description: '高级功能节点',
      icon: '⚡',
      color: '#8b5cf6',
    });
  }

  register(definition: NodeDefinition): void {
    if (!definition.id || !definition.type) {
      throw new Error('Node definition must have id and type');
    }

    if (this.nodes.has(definition.type)) {
      console.warn(`Node type "${definition.type}" is already registered. Overwriting.`);
    }

    // Validate the definition
    this.validateDefinition(definition);

    this.nodes.set(definition.type, definition);
  }

  unregister(nodeType: string): void {
    this.nodes.delete(nodeType);
  }

  get(nodeType: string): NodeDefinition | undefined {
    return this.nodes.get(nodeType);
  }

  getAll(): NodeDefinition[] {
    return Array.from(this.nodes.values());
  }

  getByCategory(category: NodeCategory): NodeDefinition[] {
    return Array.from(this.nodes.values()).filter(
      (node) => node.category === category
    );
  }

  search(query: string): NodeDefinition[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.nodes.values()).filter((node) => {
      return (
        node.name.toLowerCase().includes(lowerQuery) ||
        node.description.toLowerCase().includes(lowerQuery) ||
        node.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    });
  }

  getCategories(): NodeCategoryInfo[] {
    return Array.from(this.categories.values());
  }

  getCategoryInfo(category: NodeCategory): NodeCategoryInfo | undefined {
    return this.categories.get(category);
  }

  private validateDefinition(definition: NodeDefinition): void {
    const errors: string[] = [];

    // Validate basic fields
    if (!definition.name.trim()) {
      errors.push('Node name cannot be empty');
    }

    if (!definition.description.trim()) {
      errors.push('Node description cannot be empty');
    }

    if (!definition.version.trim()) {
      errors.push('Node version cannot be empty');
    }

    // Validate ports
    const inputIds = new Set<string>();
    const outputIds = new Set<string>();

    definition.inputs.forEach((input, index) => {
      if (!input.id.trim()) {
        errors.push(`Input port ${index} must have an id`);
      }
      if (inputIds.has(input.id)) {
        errors.push(`Duplicate input port id: ${input.id}`);
      }
      inputIds.add(input.id);

      if (!input.name.trim()) {
        errors.push(`Input port ${input.id} must have a name`);
      }
    });

    definition.outputs.forEach((output, index) => {
      if (!output.id.trim()) {
        errors.push(`Output port ${index} must have an id`);
      }
      if (outputIds.has(output.id)) {
        errors.push(`Duplicate output port id: ${output.id}`);
      }
      outputIds.add(output.id);

      if (!output.name.trim()) {
        errors.push(`Output port ${output.id} must have a name`);
      }
    });

    // Validate processor
    if (!definition.processor) {
      errors.push('Node must have a processor');
    } else {
      if (typeof definition.processor.execute !== 'function') {
        errors.push('Node processor must have an execute function');
      }
      if (typeof definition.processor.validate !== 'function') {
        errors.push('Node processor must have a validate function');
      }
    }

    if (errors.length > 0) {
      throw new Error(`Invalid node definition: ${errors.join(', ')}`);
    }
  }
}

// Global registry instance
export const nodeRegistry = new NodeRegistryImpl();

// Helper functions for working with the registry
export const registerNode = (definition: NodeDefinition): void => {
  nodeRegistry.register(definition);
};

export const getNodeDefinition = (nodeType: string): NodeDefinition | undefined => {
  return nodeRegistry.get(nodeType);
};

export const getAllNodes = (): NodeDefinition[] => {
  return nodeRegistry.getAll();
};

export const getNodesByCategory = (category: NodeCategory): NodeDefinition[] => {
  return nodeRegistry.getByCategory(category);
};

export const searchNodes = (query: string): NodeDefinition[] => {
  return nodeRegistry.search(query);
};