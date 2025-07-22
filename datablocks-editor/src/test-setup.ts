import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock URL.createObjectURL and URL.revokeObjectURL for file export tests
Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'mock-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
});

// Mock document.createElement for file export tests
const originalCreateElement = document.createElement;
document.createElement = vi.fn().mockImplementation((tagName) => {
  if (tagName === 'a') {
    return {
      href: '',
      download: '',
      click: vi.fn(),
    };
  }
  return originalCreateElement.call(document, tagName);
});