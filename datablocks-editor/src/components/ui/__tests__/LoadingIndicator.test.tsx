import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingIndicator } from '../LoadingIndicator';

describe('LoadingIndicator', () => {
  it('should render with default props', () => {
    render(<LoadingIndicator />);
    
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<LoadingIndicator message="Processing data..." />);
    
    expect(screen.getByText('Processing data...')).toBeInTheDocument();
  });

  it('should render with small size', () => {
    render(<LoadingIndicator size="small" />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('text-sm');
  });

  it('should render with large size', () => {
    render(<LoadingIndicator size="large" />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('text-lg');
  });

  it('should render with custom className', () => {
    render(<LoadingIndicator className="custom-class" />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('custom-class');
  });

  it('should render spinner animation', () => {
    render(<LoadingIndicator />);
    
    const spinner = screen.getByRole('status').querySelector('svg');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('animate-spin');
  });

  it('should be accessible', () => {
    render(<LoadingIndicator />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label', 'Loading');
  });

  it('should render without message when showMessage is false', () => {
    render(<LoadingIndicator showMessage={false} />);
    
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});