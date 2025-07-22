import type { NodeInstance, Dataset, Connection } from '../../types';

export class NodeBuilder {
  private node: Partial<NodeInstance> = {
    position: { x: 0, y: 0 },
    data: { label: 'Node' },
    config: {},
    status: 'idle'
  };

  static create(): NodeBuilder {
    return new NodeBuilder();
  }

  id(id: string): NodeBuilder {
    this.node.id = id;
    return this;
  }

  type(type: string): NodeBuilder {
    this.node.type = type;
    return this;
  }

  position(x: number, y: number): NodeBuilder {
    this.node.position = { x, y };
    return this;
  }

  label(label: string): NodeBuilder {
    if (!this.node.data) this.node.data = {};
    this.node.data.label = label;
    return this;
  }

  config(config: Record<string, any>): NodeBuilder {
    this.node.config = { ...this.node.config, ...config };
    return this;
  }

  // Specific node type builders
  exampleData(dataset: Dataset): NodeBuilder {
    return this.type('exampleData').config({ dataset });
  }

  filter(conditions: Array<{ column: string; operator: string; value: any }>): NodeBuilder {
    return this.type('filter').config({ conditions });
  }

  sort(column: string, direction: 'asc' | 'desc' = 'asc'): NodeBuilder {
    return this.type('sort').config({ column, direction });
  }

  group(groupColumns: string[], aggregations: Array<{ column: string; operation: string; alias: string }>): NodeBuilder {
    return this.type('group').config({ groupColumns, aggregations });
  }

  javascript(code: string, timeout: number = 5000): NodeBuilder {
    return this.type('javascript').config({ code, timeout });
  }

  httpRequest(url: string, method: string = 'GET', headers: Record<string, string> = {}): NodeBuilder {
    return this.type('httpRequest').config({ url, method, headers });
  }

  build(): NodeInstance {
    if (!this.node.id) {
      throw new Error('Node ID is required');
    }
    if (!this.node.type) {
      throw new Error('Node type is required');
    }
    return this.node as NodeInstance;
  }
}

export class ConnectionBuilder {
  private connection: Partial<Connection> = {
    sourceHandle: 'output',
    targetHandle: 'input'
  };

  static create(): ConnectionBuilder {
    return new ConnectionBuilder();
  }

  id(id: string): ConnectionBuilder {
    this.connection.id = id;
    return this;
  }

  from(source: string, handle: string = 'output'): ConnectionBuilder {
    this.connection.source = source;
    this.connection.sourceHandle = handle;
    return this;
  }

  to(target: string, handle: string = 'input'): ConnectionBuilder {
    this.connection.target = target;
    this.connection.targetHandle = handle;
    return this;
  }

  build(): Connection {
    if (!this.connection.id) {
      this.connection.id = `${this.connection.source}-${this.connection.target}`;
    }
    return this.connection as Connection;
  }
}