import type { NodeInstance, Connection } from '../types';

// Base command interface
export interface Command {
  execute(): void;
  undo(): void;
  canUndo(): boolean;
  description: string;
}

// Command manager for undo/redo functionality
export class CommandManager {
  private undoStack: Command[] = [];
  private redoStack: Command[] = [];
  private maxHistorySize: number = 50;

  executeCommand(command: Command): void {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = []; // Clear redo stack when new command is executed
    
    // Limit history size
    if (this.undoStack.length > this.maxHistorySize) {
      this.undoStack.shift();
    }
  }

  undo(): boolean {
    const command = this.undoStack.pop();
    if (command && command.canUndo()) {
      command.undo();
      this.redoStack.push(command);
      return true;
    }
    return false;
  }

  redo(): boolean {
    const command = this.redoStack.pop();
    if (command) {
      command.execute();
      this.undoStack.push(command);
      return true;
    }
    return false;
  }

  canUndo(): boolean {
    return this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1].canUndo();
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  getUndoDescription(): string | null {
    const command = this.undoStack[this.undoStack.length - 1];
    return command ? command.description : null;
  }

  getRedoDescription(): string | null {
    const command = this.redoStack[this.redoStack.length - 1];
    return command ? command.description : null;
  }

  clear(): void {
    this.undoStack = [];
    this.redoStack = [];
  }

  getHistorySize(): number {
    return this.undoStack.length;
  }
}

// Store operations interface
export interface StoreOperations {
  addNode: (node: NodeInstance) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<NodeInstance>) => void;
  duplicateNode: (nodeId: string) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
  updateConnection: (connectionId: string, updates: Partial<Connection>) => void;
  getNodeById: (nodeId: string) => NodeInstance | undefined;
  getConnectionById: (connectionId: string) => Connection | undefined;
  selectNode: (nodeId: string, multiSelect?: boolean) => void;
  clearSelection: () => void;
  getSelectedNodes: () => NodeInstance[];
  getSelectedConnections: () => Connection[];
}

// Add Node Command
export class AddNodeCommand implements Command {
  description: string;
  private node: NodeInstance;
  private store: StoreOperations;

  constructor(node: NodeInstance, store: StoreOperations) {
    this.node = node;
    this.store = store;
    this.description = `Add ${node.type} node`;
  }

  execute(): void {
    this.store.addNode(this.node);
  }

  undo(): void {
    this.store.removeNode(this.node.id);
  }

  canUndo(): boolean {
    return true;
  }
}

// Remove Node Command
export class RemoveNodeCommand implements Command {
  description: string;
  private nodeId: string;
  private node: NodeInstance | null = null;
  private relatedConnections: Connection[] = [];
  private store: StoreOperations;

  constructor(nodeId: string, store: StoreOperations) {
    this.nodeId = nodeId;
    this.store = store;
    this.description = `Remove node`;
  }

  execute(): void {
    // Store the node data before removing
    this.node = this.store.getNodeById(this.nodeId) || null;
    if (this.node) {
      this.description = `Remove ${this.node.type} node`;
    }
    
    // TODO: Store related connections before removing
    // This would require access to the connections array from the store
    
    this.store.removeNode(this.nodeId);
  }

  undo(): void {
    if (this.node) {
      this.store.addNode(this.node);
      
      // Restore related connections
      this.relatedConnections.forEach(connection => {
        this.store.addConnection(connection);
      });
    }
  }

  canUndo(): boolean {
    return this.node !== null;
  }
}

// Update Node Command
export class UpdateNodeCommand implements Command {
  description: string;
  private nodeId: string;
  private newData: Partial<NodeInstance>;
  private oldData: Partial<NodeInstance> | null = null;
  private store: StoreOperations;

  constructor(nodeId: string, newData: Partial<NodeInstance>, store: StoreOperations) {
    this.nodeId = nodeId;
    this.newData = newData;
    this.store = store;
    this.description = `Update node`;
  }

  execute(): void {
    // Store the old data before updating
    const node = this.store.getNodeById(this.nodeId);
    if (node) {
      this.oldData = {};
      Object.keys(this.newData).forEach(key => {
        if (this.oldData && key in node) {
          (this.oldData as any)[key] = (node as any)[key];
        }
      });
      this.description = `Update ${node.type} node`;
    }
    
    this.store.updateNode(this.nodeId, this.newData);
  }

  undo(): void {
    if (this.oldData) {
      this.store.updateNode(this.nodeId, this.oldData);
    }
  }

  canUndo(): boolean {
    return this.oldData !== null;
  }
}

// Move Node Command
export class MoveNodeCommand implements Command {
  description: string;
  private nodeId: string;
  private newPosition: { x: number; y: number };
  private oldPosition: { x: number; y: number } | null = null;
  private store: StoreOperations;

  constructor(nodeId: string, newPosition: { x: number; y: number }, store: StoreOperations) {
    this.nodeId = nodeId;
    this.newPosition = newPosition;
    this.store = store;
    this.description = `Move node`;
  }

  execute(): void {
    // Store the old position before moving
    const node = this.store.getNodeById(this.nodeId);
    if (node) {
      this.oldPosition = { ...node.position };
      this.description = `Move ${node.type} node`;
    }
    
    this.store.updateNode(this.nodeId, { position: this.newPosition });
  }

  undo(): void {
    if (this.oldPosition) {
      this.store.updateNode(this.nodeId, { position: this.oldPosition });
    }
  }

  canUndo(): boolean {
    return this.oldPosition !== null;
  }
}

// Add Connection Command
export class AddConnectionCommand implements Command {
  description: string;
  private connection: Connection;
  private store: StoreOperations;

  constructor(connection: Connection, store: StoreOperations) {
    this.connection = connection;
    this.store = store;
    this.description = `Add connection`;
  }

  execute(): void {
    this.store.addConnection(this.connection);
  }

  undo(): void {
    this.store.removeConnection(this.connection.id);
  }

  canUndo(): boolean {
    return true;
  }
}

// Remove Connection Command
export class RemoveConnectionCommand implements Command {
  description: string;
  private connectionId: string;
  private connection: Connection | null = null;
  private store: StoreOperations;

  constructor(connectionId: string, store: StoreOperations) {
    this.connectionId = connectionId;
    this.store = store;
    this.description = `Remove connection`;
  }

  execute(): void {
    // Store the connection data before removing
    this.connection = this.store.getConnectionById(this.connectionId) || null;
    this.store.removeConnection(this.connectionId);
  }

  undo(): void {
    if (this.connection) {
      this.store.addConnection(this.connection);
    }
  }

  canUndo(): boolean {
    return this.connection !== null;
  }
}

// Duplicate Node Command
export class DuplicateNodeCommand implements Command {
  description: string;
  private originalNodeId: string;
  private duplicatedNode: NodeInstance | null = null;
  private store: StoreOperations;

  constructor(nodeId: string, store: StoreOperations) {
    this.originalNodeId = nodeId;
    this.store = store;
    this.description = `Duplicate node`;
  }

  execute(): void {
    const originalNode = this.store.getNodeById(this.originalNodeId);
    if (originalNode) {
      this.description = `Duplicate ${originalNode.type} node`;
      // Store reference to the duplicated node for undo
      this.store.duplicateNode(this.originalNodeId);
      // We would need to get the duplicated node ID from the store
      // This is a simplified implementation
    }
  }

  undo(): void {
    if (this.duplicatedNode) {
      this.store.removeNode(this.duplicatedNode.id);
    }
  }

  canUndo(): boolean {
    return this.duplicatedNode !== null;
  }
}

// Delete Selected Command
export class DeleteSelectedCommand implements Command {
  description: string;
  private deletedNodes: NodeInstance[] = [];
  private deletedConnections: Connection[] = [];
  private store: StoreOperations;

  constructor(store: StoreOperations) {
    this.store = store;
    this.description = `Delete selected items`;
  }

  execute(): void {
    // Store selected items before deletion
    this.deletedNodes = this.store.getSelectedNodes();
    this.deletedConnections = this.store.getSelectedConnections();

    // Delete connections first
    this.deletedConnections.forEach(connection => {
      this.store.removeConnection(connection.id);
    });

    // Then delete nodes
    this.deletedNodes.forEach(node => {
      this.store.removeNode(node.id);
    });

    this.description = `Delete ${this.deletedNodes.length} node(s) and ${this.deletedConnections.length} connection(s)`;
  }

  undo(): void {
    // Restore nodes first
    this.deletedNodes.forEach(node => {
      this.store.addNode(node);
    });

    // Then restore connections
    this.deletedConnections.forEach(connection => {
      this.store.addConnection(connection);
    });

    // Restore selection
    this.deletedNodes.forEach(node => {
      this.store.selectNode(node.id, true);
    });
  }

  canUndo(): boolean {
    return this.deletedNodes.length > 0 || this.deletedConnections.length > 0;
  }
}

// Select All Command
export class SelectAllCommand implements Command {
  description: string = 'Select all items';
  private previousSelection: {
    nodes: string[];
    connections: string[];
  } = { nodes: [], connections: [] };
  private store: StoreOperations;

  constructor(store: StoreOperations) {
    this.store = store;
  }

  execute(): void {
    // Store previous selection
    this.previousSelection.nodes = this.store.getSelectedNodes().map(n => n.id);
    this.previousSelection.connections = this.store.getSelectedConnections().map(c => c.id);

    // Select all (this would need to be implemented in the store)
    // For now, we'll just clear selection as a placeholder
    this.store.clearSelection();
  }

  undo(): void {
    // Restore previous selection
    this.store.clearSelection();
    this.previousSelection.nodes.forEach(nodeId => {
      this.store.selectNode(nodeId, true);
    });
    // Connection selection would need similar implementation
  }

  canUndo(): boolean {
    return true;
  }
}

// Clear Selection Command
export class ClearSelectionCommand implements Command {
  description: string = 'Clear selection';
  private previousSelection: {
    nodes: string[];
    connections: string[];
  } = { nodes: [], connections: [] };
  private store: StoreOperations;

  constructor(store: StoreOperations) {
    this.store = store;
  }

  execute(): void {
    // Store previous selection
    this.previousSelection.nodes = this.store.getSelectedNodes().map(n => n.id);
    this.previousSelection.connections = this.store.getSelectedConnections().map(c => c.id);

    this.store.clearSelection();
  }

  undo(): void {
    // Restore previous selection
    this.previousSelection.nodes.forEach(nodeId => {
      this.store.selectNode(nodeId, true);
    });
    // Connection selection would need similar implementation
  }

  canUndo(): boolean {
    return this.previousSelection.nodes.length > 0 || this.previousSelection.connections.length > 0;
  }
}

// Batch Command for multiple operations
export class BatchCommand implements Command {
  description: string;
  private commands: Command[];

  constructor(commands: Command[], description: string) {
    this.commands = commands;
    this.description = description;
  }

  execute(): void {
    this.commands.forEach(command => command.execute());
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  canUndo(): boolean {
    return this.commands.every(command => command.canUndo());
  }
}

// Macro Command for recording and replaying sequences
export class MacroCommand implements Command {
  description: string;
  private commands: Command[] = [];
  private isRecording: boolean = false;

  constructor(description: string) {
    this.description = description;
  }

  startRecording(): void {
    this.isRecording = true;
    this.commands = [];
  }

  stopRecording(): void {
    this.isRecording = false;
  }

  addCommand(command: Command): void {
    if (this.isRecording) {
      this.commands.push(command);
    }
  }

  execute(): void {
    this.commands.forEach(command => command.execute());
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }

  canUndo(): boolean {
    return this.commands.length > 0 && this.commands.every(command => command.canUndo());
  }

  getCommandCount(): number {
    return this.commands.length;
  }
}