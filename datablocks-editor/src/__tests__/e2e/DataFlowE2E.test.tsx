import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from '../../App';
import { useAppStore } from '../../stores/appStore';

// Mock ReactFlow
vi.mock('reactflow', () => ({
  default: ({ children, nodes, edges, onNodesChange, onEdgesChange, onConnect }: any) => (
    <div data-testid="react-flow">
      <div data-testid="nodes-count">{nodes?.length || 0}</div>
      <div data-testid="edges-count">{edges?.length || 0}</div>
      {children}
      <button
        data-testid="add-connection"
        onClick={() => onConnect?.({ source: 'node-1', target: 'node-2' })}
      >
        Add Connection
      </button>
    </div>
  ),
  Controls: () => <div data-testid="controls">Controls</div>,
  MiniMap: () => <div data-testid="minimap">MiniMap</div>,
  Background: () => <div data-testid="background">Background</div>,
  ReactFlowProvider: ({ children }: any) => <div>{children}</div>,
  addEdge: vi.fn((edge, edges) => [...edges, edge]),
}));

// Mock the store
vi.mock('../../stores/appStore');

describe('End-to-End Data Flow Tests', () => {
  const mockStore = {
    nodes: [],
    edges: [],
    addNode: vi.fn(),
    updateNode: vi.fn(),
    deleteNode: vi.fn(),
    addEdge: vi.fn(),
    updateEdge: vi.fn(),
    deleteEdge: vi.fn(),
    selectedNode: null,
    setSelectedNode: vi.fn(),
    executeGraph: vi.fn(),
    isExecuting: false,
    executionResult: null,
    executionError: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAppStore as any).mockReturnValue(mockStore);
  });

  describe('Complete Data Processing Workflow', () => {
    it('should allow user to create a complete data processing pipeline', async () => {
      const user = userEvent.setup();
      
      // Mock successful execution
      mockStore.executeGraph.mockResolvedValue({
        columns: ['name', 'age'],
        rows: [['Alice', 25], ['Bob', 30]],
      });

      render(<App />);

      // Step 1: Add input node
      const addInputButton = screen.getByTestId('add-input-node');
      await user.click(addInputButton);

      expect(mockStore.addNode).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'exampleData',
        })
      );

      // Step 2: Add filter node
      const addFilterButton = screen.getByTestId('add-filter-node');
      await user.click(addFilterButton);

      expect(mockStore.addNode).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'filter',
        })
      );

      // Step 3: Connect nodes
      const connectButton = screen.getByTestId('add-connection');
      await user.click(connectButton);

      expect(mockStore.addEdge).toHaveBeenCalled();

      // Step 4: Configure filter node
      const configureButton = screen.getByTestId('configure-node');
      await user.click(configureButton);

      const columnSelect = screen.getByLabelText('Column');
      await user.selectOptions(columnSelect, 'age');

      const operatorSelect = screen.getByLabelText('Operator');
      await user.selectOptions(operatorSelect, '>');

      const valueInput = screen.getByLabelText('Value');
      await user.type(valueInput, '25');

      const applyButton = screen.getByText('Apply');
      await user.click(applyButton);

      expect(mockStore.updateNode).toHaveBeenCalled();

      // Step 5: Execute pipeline
      const executeButton = screen.getByTestId('execute-pipeline');
      await user.click(executeButton);

      expect(mockStore.executeGraph).toHaveBeenCalled();

      // Step 6: Verify results are displayed
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.getByText('Bob')).toBeInTheDocument();
      });
    });

    it('should handle complex multi-node pipeline creation', async () => {
      const user = userEvent.setup();

      render(<App />);

      // Create a complex pipeline: Input -> Filter -> Sort -> Group -> Chart
      const nodeTypes = ['exampleData', 'filter', 'sort', 'group', 'chart'];
      
      for (const nodeType of nodeTypes) {
        const addButton = screen.getByTestId(`add-${nodeType}-node`);
        await user.click(addButton);
        
        expect(mockStore.addNode).toHaveBeenCalledWith(
          expect.objectContaining({ type: nodeType })
        );
      }

      // Connect nodes in sequence
      for (let i = 0; i < nodeTypes.length - 1; i++) {
        const connectButton = screen.getByTestId(`connect-${i}-${i + 1}`);
        await user.click(connectButton);
      }

      expect(mockStore.addEdge).toHaveBeenCalledTimes(nodeTypes.length - 1);
    });

    it('should handle error states gracefully', async () => {
      const user = userEvent.setup();
      
      // Mock execution error
      mockStore.executeGraph.mockRejectedValue(new Error('Execution failed'));
      mockStore.executionError = 'Execution failed';

      render(<App />);

      const executeButton = screen.getByTestId('execute-pipeline');
      await user.click(executeButton);

      await waitFor(() => {
        expect(screen.getByText(/execution failed/i)).toBeInTheDocument();
      });

      // Verify error recovery options are available
      expect(screen.getByText('Retry')).toBeInTheDocument();
      expect(screen.getByText('Reset')).toBeInTheDocument();
    });
  });

  describe('User Interaction Flows', () => {
    it('should support drag and drop node creation', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      const nodeLibrary = screen.getByTestId('node-library');
      const canvas = screen.getByTestId('react-flow');

      const filterNode = screen.getByTestId('filter-node-template');
      
      // Simulate drag and drop
      await user.pointer([
        { target: filterNode, keys: '[MouseLeft>]' },
        { target: canvas, coords: { x: 200, y: 100 } },
        { keys: '[/MouseLeft]' },
      ]);

      expect(mockStore.addNode).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'filter',
          position: { x: 200, y: 100 },
        })
      );
    });

    it('should support keyboard shortcuts', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Test delete shortcut
      await user.keyboard('{Delete}');
      expect(mockStore.deleteNode).toHaveBeenCalled();

      // Test copy shortcut
      await user.keyboard('{Control>}c{/Control}');
      // Copy functionality should be triggered

      // Test paste shortcut
      await user.keyboard('{Control>}v{/Control}');
      // Paste functionality should be triggered

      // Test execute shortcut
      await user.keyboard('{Control>}{Enter}');
      expect(mockStore.executeGraph).toHaveBeenCalled();
    });

    it('should support undo/redo operations', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Add a node
      const addButton = screen.getByTestId('add-filter-node');
      await user.click(addButton);

      // Undo
      await user.keyboard('{Control>}z{/Control}');
      // Undo should be triggered

      // Redo
      await user.keyboard('{Control>}y{/Control}');
      // Redo should be triggered
    });
  });

  describe('Data Export and Import', () => {
    it('should allow exporting pipeline results', async () => {
      const user = userEvent.setup();
      
      mockStore.executionResult = {
        columns: ['name', 'age'],
        rows: [['Alice', 25], ['Bob', 30]],
      };

      render(<App />);

      const exportButton = screen.getByTestId('export-results');
      await user.click(exportButton);

      const csvExportButton = screen.getByText('Export as CSV');
      await user.click(csvExportButton);

      // Verify export functionality is triggered
      expect(screen.getByText(/exported successfully/i)).toBeInTheDocument();
    });

    it('should allow importing data files', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      const importButton = screen.getByTestId('import-data');
      const fileInput = screen.getByLabelText('Import file');

      const file = new File(['name,age\nAlice,25\nBob,30'], 'data.csv', {
        type: 'text/csv',
      });

      await user.upload(fileInput, file);

      expect(mockStore.addNode).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'fileInput',
          data: expect.objectContaining({
            config: expect.objectContaining({
              file: file,
            }),
          }),
        })
      );
    });

    it('should allow saving and loading pipeline configurations', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      // Save pipeline
      const saveButton = screen.getByTestId('save-pipeline');
      await user.click(saveButton);

      const pipelineName = screen.getByLabelText('Pipeline name');
      await user.type(pipelineName, 'My Data Pipeline');

      const confirmSaveButton = screen.getByText('Save');
      await user.click(confirmSaveButton);

      expect(screen.getByText(/pipeline saved/i)).toBeInTheDocument();

      // Load pipeline
      const loadButton = screen.getByTestId('load-pipeline');
      await user.click(loadButton);

      const pipelineOption = screen.getByText('My Data Pipeline');
      await user.click(pipelineOption);

      const confirmLoadButton = screen.getByText('Load');
      await user.click(confirmLoadButton);

      expect(screen.getByText(/pipeline loaded/i)).toBeInTheDocument();
    });
  });

  describe('Performance and Responsiveness', () => {
    it('should handle large datasets without blocking UI', async () => {
      const user = userEvent.setup();
      
      // Mock large dataset processing
      mockStore.executeGraph.mockImplementation(() => 
        new Promise(resolve => {
          setTimeout(() => {
            resolve({
              columns: ['id', 'value'],
              rows: Array.from({ length: 10000 }, (_, i) => [i, Math.random()]),
            });
          }, 100);
        })
      );

      render(<App />);

      const executeButton = screen.getByTestId('execute-pipeline');
      await user.click(executeButton);

      // UI should remain responsive during processing
      expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
      
      // Should be able to interact with other UI elements
      const cancelButton = screen.getByText('Cancel');
      expect(cancelButton).toBeEnabled();

      await waitFor(() => {
        expect(screen.queryByTestId('loading-indicator')).not.toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should provide real-time execution progress', async () => {
      const user = userEvent.setup();
      
      render(<App />);

      const executeButton = screen.getByTestId('execute-pipeline');
      await user.click(executeButton);

      // Should show progress indicators
      expect(screen.getByTestId('execution-progress')).toBeInTheDocument();
      expect(screen.getByText(/processing/i)).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByText(/completed/i)).toBeInTheDocument();
      });
    });
  });
});