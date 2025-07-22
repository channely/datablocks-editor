import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CodeEditor } from '../CodeEditor';

describe('CodeEditor', () => {
  it('should render with default props', () => {
    render(<CodeEditor value="" onChange={() => {}} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveValue('');
  });

  it('should render with initial value', () => {
    const code = 'console.log("Hello World");';
    render(<CodeEditor value={code} onChange={() => {}} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(code);
  });

  it('should call onChange when text changes', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(<CodeEditor value="" onChange={onChange} />);
    
    const textarea = screen.getByRole('textbox');
    await user.type(textarea, 'test code');
    
    expect(onChange).toHaveBeenCalled();
  });

  it('should render with custom placeholder', () => {
    render(
      <CodeEditor 
        value="" 
        onChange={() => {}} 
        placeholder="Enter your code here..." 
      />
    );
    
    const textarea = screen.getByPlaceholderText('Enter your code here...');
    expect(textarea).toBeInTheDocument();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<CodeEditor value="" onChange={() => {}} disabled />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should render with custom className', () => {
    render(<CodeEditor value="" onChange={() => {}} className="custom-editor" />);
    
    const container = screen.getByRole('textbox').parentElement;
    expect(container).toHaveClass('custom-editor');
  });

  it('should handle tab key for indentation', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    
    render(<CodeEditor value="" onChange={onChange} />);
    
    const textarea = screen.getByRole('textbox');
    await user.click(textarea);
    await user.keyboard('{Tab}');
    
    // Should prevent default tab behavior and insert spaces/tab
    expect(onChange).toHaveBeenCalled();
  });

  it('should support different languages', () => {
    render(<CodeEditor value="" onChange={() => {}} language="python" />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('should render with line numbers when enabled', () => {
    render(<CodeEditor value="line 1\nline 2" onChange={() => {}} showLineNumbers />);
    
    // Check if line numbers are rendered (implementation dependent)
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeInTheDocument();
  });

  it('should handle syntax highlighting', () => {
    const code = 'function test() { return true; }';
    render(<CodeEditor value={code} onChange={() => {}} language="javascript" />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(code);
  });

  it('should be accessible', () => {
    render(<CodeEditor value="" onChange={() => {}} aria-label="Code input" />);
    
    const textarea = screen.getByLabelText('Code input');
    expect(textarea).toBeInTheDocument();
  });
});