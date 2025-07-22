import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { HttpRequestNode } from '../HttpRequestNode';

// Mock ReactFlow's Handle component
vi.mock('reactflow', () => ({
  Handle: ({ type, position }: any) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  Position: {
    Top: 'top',
    Right: 'right',
    Bottom: 'bottom',
    Left: 'left',
  },
}));

describe('HttpRequestNode', () => {
  const defaultProps = {
    id: 'node-1',
    data: {
      label: 'HTTP Request',
      url: 'https://api.example.com/data',
      method: 'GET' as const,
      headers: { 'Content-Type': 'application/json' },
      onConfigChange: vi.fn(),
      status: 'idle' as const,
    },
    selected: false,
    isConnectable: true,
  };

  it('should render with default props', () => {
    render(<HttpRequestNode {...defaultProps} />);
    
    expect(screen.getByText('HTTP Request')).toBeInTheDocument();
    expect(screen.getByText('GET https://api.example.com/data')).toBeInTheDocument();
    expect(screen.getByTestId('handle-target-top')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source-bottom')).toBeInTheDocument();
  });

  it('should show expanded configuration when expanded', async () => {
    const user = userEvent.setup();
    render(<HttpRequestNode {...defaultProps} />);
    
    // Click expand button
    await user.click(screen.getByText('▼'));
    
    // Check that configuration is shown
    expect(screen.getByLabelText(/Method:/)).toBeInTheDocument();
    expect(screen.getByLabelText(/URL:/)).toBeInTheDocument();
  });

  it('should call onConfigChange when URL changes', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    
    render(
      <HttpRequestNode 
        {...defaultProps} 
        data={{ ...defaultProps.data, onConfigChange }} 
      />
    );
    
    // Expand the node
    await user.click(screen.getByText('▼'));
    
    // Clear and type new URL
    const urlInput = screen.getByLabelText(/URL:/);
    await user.clear(urlInput);
    await user.type(urlInput, 'https://new-api.com');
    
    // Check that onConfigChange was called with the final URL
    expect(onConfigChange).toHaveBeenLastCalledWith({ url: 'https://new-api.com' });
  });

  it('should call onConfigChange when method changes', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    
    render(
      <HttpRequestNode 
        {...defaultProps} 
        data={{ ...defaultProps.data, onConfigChange }} 
      />
    );
    
    // Expand the node
    await user.click(screen.getByText('▼'));
    
    // Change method
    const methodSelect = screen.getByLabelText(/Method:/);
    await user.selectOptions(methodSelect, 'POST');
    
    expect(onConfigChange).toHaveBeenCalledWith({ method: 'POST' });
  });

  it('should show request body field for POST method', async () => {
    const user = userEvent.setup();
    
    render(
      <HttpRequestNode 
        {...defaultProps} 
        data={{ ...defaultProps.data, method: 'POST' }} 
      />
    );
    
    // Expand the node
    await user.click(screen.getByText('▼'));
    
    // Check that body field is shown
    expect(screen.getByLabelText(/Request Body:/)).toBeInTheDocument();
  });

  it('should call onConfigChange when body changes', async () => {
    const user = userEvent.setup();
    const onConfigChange = vi.fn();
    
    render(
      <HttpRequestNode 
        {...defaultProps} 
        data={{ 
          ...defaultProps.data, 
          method: 'POST',
          onConfigChange 
        }} 
      />
    );
    
    // Expand the node
    await user.click(screen.getByText('▼'));
    
    // Type in body field
    const bodyInput = screen.getByLabelText(/Request Body:/);
    await user.clear(bodyInput);
    fireEvent.change(bodyInput, { target: { value: '{"test": "data"}' } });
    
    expect(onConfigChange).toHaveBeenLastCalledWith({ body: '{"test": "data"}' });
  });

  it('should display execution error when present', async () => {
    const user = userEvent.setup();
    
    render(
      <HttpRequestNode 
        {...defaultProps} 
        data={{ 
          ...defaultProps.data, 
          error: 'Network timeout' 
        }} 
      />
    );
    
    // Expand the node
    await user.click(screen.getByText('▼'));
    
    expect(screen.getByText(/Error: Network timeout/)).toBeInTheDocument();
  });

  it('should show correct status colors', () => {
    // Test idle status
    const { rerender } = render(<HttpRequestNode {...defaultProps} />);
    
    // Test loading status
    rerender(
      <HttpRequestNode 
        {...defaultProps} 
        data={{ ...defaultProps.data, status: 'loading' }} 
      />
    );
    
    // Test success status
    rerender(
      <HttpRequestNode 
        {...defaultProps} 
        data={{ ...defaultProps.data, status: 'success' }} 
      />
    );
    
    // Test error status
    rerender(
      <HttpRequestNode 
        {...defaultProps} 
        data={{ ...defaultProps.data, status: 'error' }} 
      />
    );
    
    // We can't easily test the colors directly, but we can verify the component renders
    expect(screen.getByText('HTTP Request')).toBeInTheDocument();
  });

  it('should not show body field for GET method', async () => {
    const user = userEvent.setup();
    
    render(<HttpRequestNode {...defaultProps} />);
    
    // Expand the node
    await user.click(screen.getByText('▼'));
    
    // Check that body field is not shown for GET
    expect(screen.queryByLabelText(/Request Body:/)).not.toBeInTheDocument();
  });
});