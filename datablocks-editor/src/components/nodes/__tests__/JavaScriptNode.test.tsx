import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JavaScriptNode } from '../JavaScriptNode';
import type { NodeProps } from 'reactflow';

// Mock ReactFlow components
vi.mock('reactflow', () => ({
  Handle: ({ type, position, id }: any) => (
    <div data-testid={`handle-${type}-${position}-${id}`} />
  ),
  Position: {
    Left: 'left',
    Right: 'right',
    Top: 'top',
    Bottom: 'bottom',
  },
}));

// Mock the CodeEditor component
vi.mock('../../ui/CodeEditor', () => ({
  CodeEditor: ({ value, onChange, onError }: any) => (
    <div data-testid="code-editor">
      <textarea
        data-testid="code-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        data-testid="trigger-error"
        onClick={() => onError(['Test error'])}
      >
        Trigger Error
      </button>
    </div>
  ),
}));

describe('JavaScriptNode', () => {
  const defaultProps: NodeProps<any> = {
    id: 'test-node',
    data: {
      name: 'Test JavaScript Node',
      code: 'function process(data) { return data; }',
      timeout: 5000,
      allowConsole: true,
      strictMode: true,
      status: 'idle',
      onConfigChange: vi.fn(),
    },
    selected: false,
    type: 'javascript',
    position: { x: 0, y: 0 },
    positionAbsolute: { x: 0, y: 0 },
    dragging: false,
    isConnectable: true,
    zIndex: 1,
    width: 300,
    height: 200,
  };

  it('should render with default props', () => {
    render(<JavaScriptNode {...defaultProps} />);
    
    expect(screen.getByText('Test JavaScript Node')).toBeInTheDocument();
    expect(screen.getByTestId('code-editor')).toBeInTheDocument();
  });

  it('should show expanded configuration when expanded', () => {
    render(<JavaScriptNode {...defaultProps} />);
    
    // Click expand button
    const expandButton = screen.getByText('+');
    fireEvent.click(expandButton);
    
    expect(screen.getByText('Timeout (ms)')).toBeInTheDocument();
    expect(screen.getByText('Allow Console Output')).toBeInTheDocument();
    expect(screen.getByText('Strict Mode')).toBeInTheDocument();
  });

  it('should call onConfigChange when code changes', () => {
    const mockOnConfigChange = vi.fn();
    const props = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        onConfigChange: mockOnConfigChange,
      },
    };

    render(<JavaScriptNode {...props} />);
    
    const codeTextarea = screen.getByTestId('code-textarea');
    fireEvent.change(codeTextarea, { target: { value: 'new code' } });
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({ code: 'new code' });
  });

  it('should call onConfigChange when timeout changes', () => {
    const mockOnConfigChange = vi.fn();
    const props = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        onConfigChange: mockOnConfigChange,
      },
    };

    render(<JavaScriptNode {...props} />);
    
    // Expand to show timeout input
    const expandButton = screen.getByText('+');
    fireEvent.click(expandButton);
    
    const timeoutInput = screen.getByDisplayValue('5000');
    fireEvent.change(timeoutInput, { target: { value: '10000' } });
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({ timeout: 10000 });
  });

  it('should call onConfigChange when console option changes', () => {
    const mockOnConfigChange = vi.fn();
    const props = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        onConfigChange: mockOnConfigChange,
      },
    };

    render(<JavaScriptNode {...props} />);
    
    // Expand to show options
    const expandButton = screen.getByText('+');
    fireEvent.click(expandButton);
    
    const consoleCheckbox = screen.getByLabelText('Allow Console Output');
    fireEvent.click(consoleCheckbox);
    
    expect(mockOnConfigChange).toHaveBeenCalledWith({ allowConsole: false });
  });

  it('should display execution error when present', () => {
    const propsWithError = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        status: 'error' as const,
        error: 'Test execution error',
      },
    };

    render(<JavaScriptNode {...propsWithError} />);
    
    expect(screen.getByText('Execution Error:')).toBeInTheDocument();
    expect(screen.getByText('Test execution error')).toBeInTheDocument();
  });

  it('should display syntax errors when present', () => {
    render(<JavaScriptNode {...defaultProps} />);
    
    // Trigger syntax error
    const triggerErrorButton = screen.getByTestId('trigger-error');
    fireEvent.click(triggerErrorButton);
    
    expect(screen.getByText('Syntax Issues:')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
  });

  it('should show correct status colors', () => {
    const statusTests = [
      { status: 'processing', expectedClass: 'border-yellow-500' },
      { status: 'success', expectedClass: 'border-green-500' },
      { status: 'error', expectedClass: 'border-red-500' },
      { status: 'idle', expectedClass: 'border-gray-300' },
    ];

    statusTests.forEach(({ status, expectedClass }) => {
      const props = {
        ...defaultProps,
        data: {
          ...defaultProps.data,
          status: status as any,
        },
      };

      const { container } = render(<JavaScriptNode {...props} />);
      const nodeElement = container.querySelector('.min-w-\\[300px\\]');
      expect(nodeElement).toHaveClass(expectedClass);
    });
  });

  it('should show execution info when available', () => {
    const lastExecuted = new Date('2023-01-01T12:00:00Z');
    const propsWithExecution = {
      ...defaultProps,
      data: {
        ...defaultProps.data,
        lastExecuted,
        executionTime: 150,
      },
    };

    render(<JavaScriptNode {...propsWithExecution} />);
    
    expect(screen.getByText(/Last executed:/)).toBeInTheDocument();
    expect(screen.getByText(/150ms/)).toBeInTheDocument();
  });
});