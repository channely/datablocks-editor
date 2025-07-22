import { useCallback, useEffect, useRef } from 'react';
import { CommandManager } from '../utils/commands';
import type { StoreOperations } from '../utils/commands';
import { useAppStore } from '../stores/appStore';

export const useCommandManager = () => {
  const commandManagerRef = useRef<CommandManager>(new CommandManager());
  const store = useAppStore();

  // Create store operations interface
  const storeOperations: StoreOperations = {
    addNode: store.addNode,
    removeNode: store.removeNode,
    updateNode: store.updateNode,
    duplicateNode: store.duplicateNode,
    addConnection: store.addConnection,
    removeConnection: store.removeConnection,
    updateConnection: store.updateConnection,
    getNodeById: store.getNodeById,
    getConnectionById: store.getConnectionById,
    selectNode: store.selectNode,
    clearSelection: store.clearSelection,
    getSelectedNodes: store.getSelectedNodes,
    getSelectedConnections: store.getSelectedConnections,
  };

  const executeCommand = useCallback((command: any) => {
    commandManagerRef.current.executeCommand(command);
  }, []);

  const undo = useCallback(() => {
    return commandManagerRef.current.undo();
  }, []);

  const redo = useCallback(() => {
    return commandManagerRef.current.redo();
  }, []);

  const canUndo = useCallback(() => {
    return commandManagerRef.current.canUndo();
  }, []);

  const canRedo = useCallback(() => {
    return commandManagerRef.current.canRedo();
  }, []);

  const getUndoDescription = useCallback(() => {
    return commandManagerRef.current.getUndoDescription();
  }, []);

  const getRedoDescription = useCallback(() => {
    return commandManagerRef.current.getRedoDescription();
  }, []);

  const clearHistory = useCallback(() => {
    commandManagerRef.current.clear();
  }, []);

  // Set up keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Skip if user is typing in an input field
      if (event.target instanceof HTMLInputElement || 
          event.target instanceof HTMLTextAreaElement ||
          event.target instanceof HTMLSelectElement) {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      if (isCtrlOrCmd && !event.shiftKey && event.key === 'z') {
        event.preventDefault();
        undo();
      } else if (
        (isCtrlOrCmd && event.shiftKey && event.key === 'Z') ||
        (isCtrlOrCmd && event.key === 'y')
      ) {
        event.preventDefault();
        redo();
      } else if (isCtrlOrCmd && event.key === 'a') {
        event.preventDefault();
        // Select all command would be executed here
        console.log('Select all shortcut');
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        // Delete selected items
        event.preventDefault();
        console.log('Delete selected shortcut');
      } else if (isCtrlOrCmd && event.key === 'd') {
        event.preventDefault();
        // Duplicate selected items
        console.log('Duplicate shortcut');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const getHistorySize = useCallback(() => {
    return commandManagerRef.current.getHistorySize();
  }, []);

  const createBatchCommand = useCallback((commands: any[], description: string) => {
    const { BatchCommand } = require('../utils/commands');
    return new BatchCommand(commands, description);
  }, []);

  const createMacroCommand = useCallback((description: string) => {
    const { MacroCommand } = require('../utils/commands');
    return new MacroCommand(description);
  }, []);

  return {
    executeCommand,
    undo,
    redo,
    canUndo,
    canRedo,
    getUndoDescription,
    getRedoDescription,
    clearHistory,
    getHistorySize,
    createBatchCommand,
    createMacroCommand,
    storeOperations,
    commandManager: commandManagerRef.current,
  };
};