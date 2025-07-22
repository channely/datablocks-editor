import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { PropertiesPanel } from '../PropertiesPanel';
import { useAppStore } from '../../../stores/appStore';
import type { NodeInstance } from '../../../types';

// Mock the store
vi.mock('../../../stores/appStore');
const mockUseAppStore = useAppStore as ReturnType<typeof vi.fn>;

// Mock node registry
vi.mock('../../../utils/nodeRegistry', () => ({
  getNodeDefinition: vi.fn(() => null),
}));

// Mock node configs
vi.mock('../../../utils/nodeConfigs', () => ({
  getNodeConfigSchema: vi.fn(() => ({
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'Test Node',
    },
  })),
}));

describe('PropertiesPanel', () => {
  const mockUpdateNode = vi.fn();
  const mockNodeOutputs = new Map();

  beforeEach(() => {
    mockUseAppStore.mockReturnValue({
      updateNode: mockUpdateNode,
      nodeOutputs: mockNodeOutputs,
      nodes: [],
      connections: [],
      selectedNodes: [],
      selectedConnections: [],
      sidebarCollapsed: false,
      previewPanelHeight: 300,
      canvasViewport: { x: 0, y: 0, zoom: 1 },
      executionStatus: new Map(),
      isExecuting: false,
      errors: [],
      projectName: undefined,
      projectId: undefined,
      lastSaved: undefined,
      isDirty: false,
      addNode: vi.fn(),
      removeNode: vi.fn(),
      addConnection: vi.fn(),
      removeConnection: vi.fn(),
      selectNode: vi.fn(),
      selectConnection: vi.fn(),
      clearSelection: vi.fn(),
      setSidebarCollapsed: vi.fn(),
      setPreviewPanelHeight: vi.fn(),
      setCanvasViewport: vi.fn(),
      executeGraph: vi.fn(),
      setNodeOutput: vi.fn(),
      clearNodeOutput: vi.fn(),
      setExecutionStatus: vi.fn(),
      addError: vi.fn(),
      clearErrors: vi.fn(),
      setProjectInfo: vi.fn(),
      markDirty: vi.fn(),
      markClean: vi.fn(),
    });
    
    vi.clearAllMocks();
  });

  it('renders empty state when no node is selected', () => {
    render(<PropertiesPanel />);
    
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('Select a node to configure its properties')).toBeInTheDocument();
  });

  it('renders node properties when a node is selected', () => {
    const mockNode: NodeInstance = {
      id: 'test-node-1',
      type: 'filter',
      position: { x: 100, y: 100 },
      data: { name: 'Test Filter' },
      config: {},
      status: 'idle',
    };

    render(<PropertiesPanel selectedNode={mockNode} />);
    
    expect(screen.getByText('Properties')).toBeInTheDocument();
    expect(screen.getByText('filter node')).toBeInTheDocument();
  });

  it('displays unsaved changes indicator', async () => {
    const mockNode: NodeInstance = {
      id: 'test-node-1',
      type: 'filter',
      position: { x: 100, y: 100 },
      data: { name: 'Test Filter' },
      config: { name: 'Original Name' },
      status: 'idle',
    };

    render(<PropertiesPanel selectedNode={mockNode} />);
    
    const nameInput = screen.getByDisplayValue('Original Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    
    await waitFor(() => {
      expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
    });
  });

  it('applies configuration changes', async () => {
    const mockNode: NodeInstance = {
      id: 'test-node-1',
      type: 'filter',
      position: { x: 100, y: 100 },
      data: { name: 'Test Filter' },
      config: { name: 'Original Name' },
      status: 'idle',
    };

    render(<PropertiesPanel selectedNode={mockNode} />);
    
    const nameInput = screen.getByDisplayValue('Original Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    
    const applyButton = screen.getByText('Apply');
    fireEvent.click(applyButton);
    
    await waitFor(() => {
      expect(mockUpdateNode).toHaveBeenCalledWith('test-node-1', {
        data: { name: 'New Name' },
        config: {},
      });
    });
  });

  it('resets configuration changes', async () => {
    const mockNode: NodeInstance = {
      id: 'test-node-1',
      type: 'filter',
      position: { x: 100, y: 100 },
      data: { name: 'Test Filter' },
      config: { name: 'Original Name' },
      status: 'idle',
    };

    render(<PropertiesPanel selectedNode={mockNode} />);
    
    const nameInput = screen.getByDisplayValue('Original Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    
    const resetButton = screen.getByText('Reset');
    fireEvent.click(resetButton);
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('Original Name')).toBeInTheDocument();
      expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument();
    });
  });

  it('validates required fields', async () => {
    const mockNode: NodeInstance = {
      id: 'test-node-1',
      type: 'chart',
      position: { x: 100, y: 100 },
      data: { name: 'Test Chart' },
      config: {},
      status: 'idle',
    };

    // Mock schema with required field
    const nodeConfigs = await import('../../../utils/nodeConfigs');
    vi.mocked(nodeConfigs.getNodeConfigSchema).mockReturnValue({
      name: {
        type: 'string',
        label: 'Node Name',
        description: 'Display name for this node',
        defaultValue: 'Test Chart',
      },
      xAxisColumn: {
        type: 'select',
        label: 'X Axis Column',
        description: 'Column for X axis',
        defaultValue: '',
        validation: [
          { type: 'required', message: 'Please select X axis column' },
        ],
      },
    });

    render(<PropertiesPanel selectedNode={mockNode} />);
    
    // The Apply button should be disabled when there are validation errors
    const applyButton = screen.getByText('Apply');
    expect(applyButton).toBeDisabled();
    
    // Check that validation errors are not displayed until we try to apply
    expect(screen.queryByText('Configuration Errors:')).not.toBeInTheDocument();
  });

  it('handles different field types correctly', async () => {
    const mockNode: NodeInstance = {
      id: 'test-node-1',
      type: 'test',
      position: { x: 100, y: 100 },
      data: { name: 'Test Node' },
      config: {
        stringField: 'test value',
        numberField: 42,
        booleanField: true,
      },
      status: 'idle',
    };

    // Mock schema with different field types
    const nodeConfigs = await import('../../../utils/nodeConfigs');
    vi.mocked(nodeConfigs.getNodeConfigSchema).mockReturnValue({
      stringField: {
        type: 'string',
        label: 'String Field',
        description: 'A string input',
        defaultValue: '',
      },
      numberField: {
        type: 'number',
        label: 'Number Field',
        description: 'A number input',
        defaultValue: 0,
      },
      booleanField: {
        type: 'boolean',
        label: 'Boolean Field',
        description: 'A checkbox input',
        defaultValue: false,
      },
    });

    render(<PropertiesPanel selectedNode={mockNode} />);
    
    expect(screen.getByDisplayValue('test value')).toBeInTheDocument();
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { checked: true })).toBeInTheDocument();
  });
});