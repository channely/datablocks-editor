import { describe, it, expect } from 'vitest';
import { Canvas } from '../Canvas';

describe('Canvas', () => {
  it('should be importable', () => {
    expect(Canvas).toBeDefined();
    expect(typeof Canvas).toBe('function');
  });
});