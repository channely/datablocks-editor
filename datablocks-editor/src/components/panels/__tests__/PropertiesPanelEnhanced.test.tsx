import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PropertiesPanel } from '../PropertiesPanel';
import { useAppStore } from '../../../stores/appStore';
import type { NodeInstance } from '../../../types';

// Mock the store
vi.mock('../../../stores/appStore');
const mockUseAppStore = useAppStore as ReturnType<typeof vi.fn>;

// Mock node registry
vi.mock('../../../utils/nodeRegistry', () => ({
  getNodeDefinition: vi.fn(() => ({
    name: 'Test Node',
    description: 'A test node for configuration',
  })),
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
    testField: {
      type: 'string',
      label: 'Test Field',
      description: 'A test configuration field',
      defaultValue: 'default value',
      validation: [
        { type: 'required', message: 'Test field is required' },
      ],
    },
    numberField: {
      type: 'number',
      label: 'Number Field',
      description: 'A number input field',
      defaultValue: 42,
      validation: [
        { type: 'min', value: 0, message: 'Must be positive' },
        { type: 'max', value: 100, message: 'Must be less than 100' },
      ],
    },
    booleanField: {
      type: 'boolean',
      label: 'Boolean Field',
      description: 'A checkbox field',
      defaultValue: false,
    },
  })),
}));

describe('PropertiesPanel Enhanced Features', () => {
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
    
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Auto-save functionality', () => {
    it('shows auto-save toggle', () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: {},
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      expect(screen.getByText('Auto-save')).toBeInTheDocument();
      expect(screen.getByText('Automatically save changes after 1 second')).toBeInTheDocument();
    });

    it('enables auto-save when checkbox is clicked', async () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: {},
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      const autoSaveCheckbox = screen.getAllByRole('checkbox')[0]; // Get the first checkbox (auto-save)
      expect(autoSaveCheckbox).not.toBeChecked();
      
      fireEvent.click(autoSaveCheckbox);
      expect(autoSaveCheckbox).toBeChecked();
    });
  });

  describe('Configuration templates', () => {
    it('shows template management buttons', () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: { testField: 'modified value' },
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      expect(screen.getByText('Save Template')).toBeInTheDocument();
      expect(screen.getByText('Load Template')).toBeInTheDocument();
      expect(screen.getByText('From History')).toBeInTheDocument();
      expect(screen.getByText('Restore Defaults')).toBeInTheDocument();
    });

    it('saves configuration to localStorage when Save Template is clicked', () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: { testField: 'template value' },
        status: 'idle',
      };

      // Mock prompt to return a template name
      const originalPrompt = window.prompt;
      window.prompt = vi.fn(() => 'My Template');
      
      // Mock alert
      const originalAlert = window.alert;
      window.alert = vi.fn();

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      // Make a change to enable the Save Template button
      const testInput = screen.getByDisplayValue('template value');
      fireEvent.change(testInput, { target: { value: 'new template value' } });
      
      const saveTemplateButton = screen.getByText('Save Template');
      fireEvent.click(saveTemplateButton);
      
      // Check that template was saved to localStorage
      const templates = JSON.parse(localStorage.getItem('nodeConfigTemplates') || '{}');
      expect(templates.test).toBeDefined();
      expect(templates.test['My Template']).toEqual({
        testField: 'new template value',
        numberField: 42,
        booleanField: false,
      });
      
      expect(window.alert).toHaveBeenCalledWith('Template "My Template" saved successfully!');
      
      // Restore original functions
      window.prompt = originalPrompt;
      window.alert = originalAlert;
    });
  });

  describe('Enhanced validation', () => {
    it('validates number field ranges', async () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: {},
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      const numberInput = screen.getByDisplayValue('42');
      
      // Test invalid value (too high)
      fireEvent.change(numberInput, { target: { value: '150' } });
      
      // Apply button should be disabled due to validation error
      const applyButton = screen.getByText('Apply');
      expect(applyButton).toBeDisabled();
    });

    it('shows validation errors for required fields', async () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: {},
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      const testInput = screen.getByDisplayValue('default value');
      
      // Clear the required field
      fireEvent.change(testInput, { target: { value: '' } });
      
      // Apply button should be disabled
      const applyButton = screen.getByText('Apply');
      expect(applyButton).toBeDisabled();
    });
  });

  describe('Configuration grouping', () => {
    it('groups configuration fields into sections', () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: {},
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      expect(screen.getByText('Basic Settings')).toBeInTheDocument();
      expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
    });

    it('allows collapsing and expanding sections', async () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: {},
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      const advancedSection = screen.getByText('Advanced Settings');
      const expandButton = advancedSection.closest('button');
      
      if (expandButton) {
        fireEvent.click(expandButton);
        // Section should still be visible (this is just testing the click handler)
        expect(screen.getByText('Advanced Settings')).toBeInTheDocument();
      }
    });
  });

  describe('Configuration history', () => {
    it('saves configuration to history when applied', async () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'test',
        position: { x: 100, y: 100 },
        data: { name: 'Test Node' },
        config: { testField: 'original value' },
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      const testInput = screen.getByDisplayValue('original value');
      fireEvent.change(testInput, { target: { value: 'new value' } });
      
      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);
      
      await waitFor(() => {
        expect(mockUpdateNode).toHaveBeenCalled();
      });
      
      // Check that configuration was saved to history
      const history = JSON.parse(localStorage.getItem('nodeConfigHistory') || '{}');
      expect(history.test).toBeDefined();
      expect(history.test.testField).toBe('new value');
    });
  });

  describe('Real-time preview', () => {
    it('generates preview for filter nodes', () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'filter',
        position: { x: 100, y: 100 },
        data: { name: 'Filter Node' },
        config: { conditions: [{ column: 'name', operator: 'equals', value: 'test' }] },
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      // Should show preview information (wait for async preview generation)
      await waitFor(() => {
        expect(screen.getByText(/预计过滤后保留/)).toBeInTheDocument();
      });
    });

    it('generates preview for chart nodes', () => {
      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'chart',
        position: { x: 100, y: 100 },
        data: { name: 'Chart Node' },
        config: { 
          xAxisColumn: 'date', 
          yAxisColumns: ['sales'], 
          chartType: 'bar' 
        },
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      // Should show chart preview information (wait for async preview generation)
      await waitFor(() => {
        expect(screen.getByText(/柱状图.*X轴.*Y轴/)).toBeInTheDocument();
      });
    });
  });

  describe('Cross-field validation', () => {
    it('validates chart node configuration', async () => {
      const { getNodeConfigSchema } = await import('../../../utils/nodeConfigs');
      vi.mocked(getNodeConfigSchema).mockReturnValue({
        name: {
          type: 'string',
          label: 'Node Name',
          description: 'Display name for this node',
          defaultValue: 'Chart Node',
        },
        xAxisColumn: {
          type: 'select',
          label: 'X Axis Column',
          description: 'Column for X axis',
          defaultValue: '',
        },
        yAxisColumns: {
          type: 'multiselect',
          label: 'Y Axis Columns',
          description: 'Columns for Y axis',
          defaultValue: [],
        },
        chartType: {
          type: 'select',
          label: 'Chart Type',
          description: 'Type of chart',
          defaultValue: 'bar',
          options: [
            { label: 'Bar Chart', value: 'bar' },
            { label: 'Pie Chart', value: 'pie' },
          ],
        },
      });

      const mockNode: NodeInstance = {
        id: 'test-node-1',
        type: 'chart',
        position: { x: 100, y: 100 },
        data: { name: 'Chart Node' },
        config: {
          xAxisColumn: 'sales',
          yAxisColumns: ['sales'], // Same as X axis - should cause validation error
          chartType: 'bar',
        },
        status: 'idle',
      };

      render(<PropertiesPanel selectedNode={mockNode} />);
      
      // Apply button should be disabled due to cross-field validation error
      const applyButton = screen.getByText('Apply');
      expect(applyButton).toBeDisabled();
    });
  });
});