import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { HttpRequestExecutor } from '../executors/HttpRequestExecutor';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('HttpRequestExecutor', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('execute', () => {
    it('should execute GET request successfully', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['content-type', 'application/json'],
          ['content-length', '100'],
        ]),
        json: async () => [
          { id: 1, name: 'Item 1', value: 100 },
          { id: 2, name: 'Item 2', value: 200 },
        ],
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await HttpRequestExecutor.execute({
        url: 'https://api.example.com/data',
        method: 'GET',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })
      );

      expect(result.columns).toEqual(['id', 'name', 'value']);
      expect(result.rows).toEqual([
        [1, 'Item 1', 100],
        [2, 'Item 2', 200],
      ]);
      expect(result.metadata.rowCount).toBe(2);
      expect(result.metadata.columnCount).toBe(3);
    });

    it('should execute POST request with body', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        headers: new Map([
          ['content-type', 'application/json'],
        ]),
        json: async () => ({ id: 3, name: 'New Item', value: 300 }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const requestBody = JSON.stringify({ name: 'New Item', value: 300 });
      const result = await HttpRequestExecutor.execute({
        url: 'https://api.example.com/data',
        method: 'POST',
        body: requestBody,
        headers: { 'Authorization': 'Bearer token123' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.example.com/data',
        expect.objectContaining({
          method: 'POST',
          body: requestBody,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer token123',
          },
        })
      );

      expect(result.columns).toEqual(['key', 'value']);
      expect(result.rows).toEqual([
        ['id', 3],
        ['name', 'New Item'],
        ['value', 300],
      ]);
    });

    it('should handle CSV response', async () => {
      const csvData = 'name,age,city\nJohn,25,NYC\nJane,30,LA';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['content-type', 'text/csv'],
        ]),
        text: async () => csvData,
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await HttpRequestExecutor.execute({
        url: 'https://api.example.com/data.csv',
        method: 'GET',
      });

      expect(result.columns).toEqual(['name', 'age', 'city']);
      expect(result.rows).toEqual([
        ['John', '25', 'NYC'],
        ['Jane', '30', 'LA'],
      ]);
    });

    it('should handle text response', async () => {
      const textData = 'Hello, World!';
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['content-type', 'text/plain'],
        ]),
        text: async () => textData,
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await HttpRequestExecutor.execute({
        url: 'https://api.example.com/message',
        method: 'GET',
      });

      expect(result.columns).toEqual(['response']);
      expect(result.rows).toEqual([['Hello, World!']]);
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: new Map(),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      await expect(
        HttpRequestExecutor.execute({
          url: 'https://api.example.com/notfound',
          method: 'GET',
        })
      ).rejects.toThrow('HTTP 404: Not Found');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        HttpRequestExecutor.execute({
          url: 'https://api.example.com/data',
          method: 'GET',
        })
      ).rejects.toThrow('Request failed: Network error');
    });

    it('should handle timeout', async () => {
      // Mock AbortSignal.timeout
      const mockAbortSignal = {
        aborted: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      
      vi.spyOn(AbortSignal, 'timeout').mockReturnValue(mockAbortSignal as any);
      
      const timeoutError = new Error('Timeout');
      timeoutError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(timeoutError);

      await expect(
        HttpRequestExecutor.execute({
          url: 'https://api.example.com/slow',
          method: 'GET',
          timeout: 1000,
        })
      ).rejects.toThrow('Request timed out after 1000ms');
    });

    it('should handle array of primitives', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['content-type', 'application/json'],
        ]),
        json: async () => [1, 2, 3, 4, 5],
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await HttpRequestExecutor.execute({
        url: 'https://api.example.com/numbers',
        method: 'GET',
      });

      expect(result.columns).toEqual(['value']);
      expect(result.rows).toEqual([[1], [2], [3], [4], [5]]);
    });

    it('should handle nested object response', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Map([
          ['content-type', 'application/json'],
        ]),
        json: async () => ({
          data: [
            { id: 1, name: 'Item 1' },
            { id: 2, name: 'Item 2' },
          ],
          meta: { total: 2 },
        }),
      };

      mockFetch.mockResolvedValueOnce(mockResponse);

      const result = await HttpRequestExecutor.execute({
        url: 'https://api.example.com/data',
        method: 'GET',
      });

      // Should extract the data array
      expect(result.columns).toEqual(['id', 'name']);
      expect(result.rows).toEqual([
        [1, 'Item 1'],
        [2, 'Item 2'],
      ]);
    });
  });

  describe('validate', () => {
    it('should validate required URL', () => {
      const result = HttpRequestExecutor.validate({}, {});
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('url');
      expect(result.errors[0].code).toBe('REQUIRED_FIELD');
    });

    it('should validate URL format', () => {
      const result = HttpRequestExecutor.validate({}, { url: 'invalid-url' });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('url');
      expect(result.errors[0].code).toBe('INVALID_URL');
    });

    it('should validate HTTP method', () => {
      const result = HttpRequestExecutor.validate({}, {
        url: 'https://api.example.com',
        method: 'INVALID',
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('method');
      expect(result.errors[0].code).toBe('INVALID_METHOD');
    });

    it('should validate headers format', () => {
      const result = HttpRequestExecutor.validate({}, {
        url: 'https://api.example.com',
        headers: 'invalid-headers',
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('headers');
      expect(result.errors[0].code).toBe('INVALID_HEADERS');
    });

    it('should validate JSON body for POST requests', () => {
      const result = HttpRequestExecutor.validate({}, {
        url: 'https://api.example.com',
        method: 'POST',
        body: 'invalid-json',
        headers: { 'Content-Type': 'application/json' },
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('body');
      expect(result.errors[0].code).toBe('INVALID_JSON');
    });

    it('should validate timeout range', () => {
      const result = HttpRequestExecutor.validate({}, {
        url: 'https://api.example.com',
        timeout: 500, // Too low
      });
      
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('timeout');
      expect(result.errors[0].code).toBe('INVALID_TIMEOUT');
    });

    it('should pass validation for valid config', () => {
      const result = HttpRequestExecutor.validate({}, {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: { 'Authorization': 'Bearer token' },
        timeout: 5000,
      });
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });
});