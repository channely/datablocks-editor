import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  parseCSV,
  parseJSON,
  parseExcel,
  parseFile,
  validateFile,
  type ParseOptions,
} from '../fileParser';

// Mock File.prototype.text for testing
Object.defineProperty(File.prototype, 'text', {
  value: function() {
    return Promise.resolve(this.content || '');
  },
  writable: true,
});

// Helper to create a file with content
const createFileWithContent = (content: string, name: string, type: string) => {
  const file = new File([content], name, { type });
  (file as any).content = content;
  return file;
};

describe('File Parser', () => {
  describe('validateFile', () => {
    it('should validate supported file types', () => {
      const csvFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      const jsonFile = new File(['{}'], 'test.json', { type: 'application/json' });
      const xlsxFile = new File(['test'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      expect(validateFile(csvFile)).toEqual({ valid: true });
      expect(validateFile(jsonFile)).toEqual({ valid: true });
      expect(validateFile(xlsxFile)).toEqual({ valid: true });
    });

    it('should reject unsupported file types', () => {
      const txtFile = new File(['test'], 'test.txt', { type: 'text/plain' });
      const result = validateFile(txtFile);
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });

    it('should reject files that are too large', () => {
      // Create a mock file that appears to be over 50MB
      const largeFile = new File(['test'], 'test.csv', { type: 'text/csv' });
      Object.defineProperty(largeFile, 'size', { value: 60 * 1024 * 1024 });
      
      const result = validateFile(largeFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File size exceeds 50MB limit');
    });
  });

  describe('parseCSV', () => {
    it('should parse simple CSV with headers', async () => {
      const csvContent = 'name,age,city\nJohn,25,NYC\nJane,30,LA';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset).toBeDefined();
      expect(result.dataset!.columns).toEqual(['name', 'age', 'city']);
      expect(result.dataset!.rows).toHaveLength(2);
      expect(result.dataset!.rows[0]).toEqual(['John', 25, 'NYC']);
      expect(result.dataset!.rows[1]).toEqual(['Jane', 30, 'LA']);
    });

    it('should parse CSV without headers', async () => {
      const csvContent = 'John,25,NYC\nJane,30,LA';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file, { hasHeader: false });
      
      expect(result.success).toBe(true);
      expect(result.dataset!.columns).toEqual(['Column 1', 'Column 2', 'Column 3']);
      expect(result.dataset!.rows).toHaveLength(2);
    });

    it('should handle custom delimiter', async () => {
      const csvContent = 'name;age;city\nJohn;25;NYC\nJane;30;LA';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file, { delimiter: ';' });
      
      expect(result.success).toBe(true);
      expect(result.dataset!.columns).toEqual(['name', 'age', 'city']);
      expect(result.dataset!.rows[0]).toEqual(['John', 25, 'NYC']);
    });

    it('should limit rows when maxRows is specified', async () => {
      const csvContent = 'name,age\nJohn,25\nJane,30\nBob,35';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file, { maxRows: 2 });
      
      expect(result.success).toBe(true);
      expect(result.dataset!.rows).toHaveLength(2);
    });

    it('should handle empty CSV', async () => {
      const csvContent = '';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('CSV parsing failed');
    });

    it('should skip empty lines', async () => {
      const csvContent = 'name,age\nJohn,25\n\nJane,30\n';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file, { skipEmptyLines: true });
      
      expect(result.success).toBe(true);
      expect(result.dataset!.rows).toHaveLength(2);
    });
  });

  describe('parseJSON', () => {
    it('should parse array of objects', async () => {
      const jsonContent = JSON.stringify([
        { name: 'John', age: 25, city: 'NYC' },
        { name: 'Jane', age: 30, city: 'LA' }
      ]);
      const file = createFileWithContent(jsonContent, 'test.json', 'application/json');
      
      const result = await parseJSON(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset!.columns).toEqual(['name', 'age', 'city']);
      expect(result.dataset!.rows).toHaveLength(2);
      expect(result.dataset!.rows[0]).toEqual(['John', 25, 'NYC']);
    });

    it('should parse object with array property', async () => {
      const jsonContent = JSON.stringify({
        data: [
          { name: 'John', age: 25 },
          { name: 'Jane', age: 30 }
        ],
        metadata: { count: 2 }
      });
      const file = createFileWithContent(jsonContent, 'test.json', 'application/json');
      
      const result = await parseJSON(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset!.rows).toHaveLength(2);
    });

    it('should parse single object as array', async () => {
      const jsonContent = JSON.stringify({ name: 'John', age: 25 });
      const file = createFileWithContent(jsonContent, 'test.json', 'application/json');
      
      const result = await parseJSON(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset!.rows).toHaveLength(1);
      expect(result.dataset!.rows[0]).toEqual(['John', 25]);
    });

    it('should limit rows when maxRows is specified', async () => {
      const jsonContent = JSON.stringify([
        { name: 'John', age: 25 },
        { name: 'Jane', age: 30 },
        { name: 'Bob', age: 35 }
      ]);
      const file = createFileWithContent(jsonContent, 'test.json', 'application/json');
      
      const result = await parseJSON(file, { maxRows: 2 });
      
      expect(result.success).toBe(true);
      expect(result.dataset!.rows).toHaveLength(2);
    });

    it('should handle invalid JSON', async () => {
      const jsonContent = '{ invalid json }';
      const file = createFileWithContent(jsonContent, 'test.json', 'application/json');
      
      const result = await parseJSON(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse JSON');
    });

    it('should handle empty JSON array', async () => {
      const jsonContent = '[]';
      const file = createFileWithContent(jsonContent, 'test.json', 'application/json');
      
      const result = await parseJSON(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('No data found');
    });
  });

  describe('parseFile', () => {
    it('should auto-detect CSV files', async () => {
      const csvContent = 'name,age\nJohn,25';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseFile(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset!.columns).toEqual(['name', 'age']);
    });

    it('should auto-detect JSON files', async () => {
      const jsonContent = JSON.stringify([{ name: 'John', age: 25 }]);
      const file = createFileWithContent(jsonContent, 'test.json', 'application/json');
      
      const result = await parseFile(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset!.columns).toEqual(['name', 'age']);
    });

    it('should reject unsupported file extensions', async () => {
      const file = new File(['test'], 'test.txt', { type: 'text/plain' });
      
      const result = await parseFile(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unsupported file format');
    });
  });

  describe('parseExcel', () => {
    // Note: Testing Excel parsing requires actual Excel file content
    // For now, we'll test the error cases
    
    it('should handle invalid Excel content', async () => {
      const invalidContent = 'not excel content';
      const file = new File([invalidContent], 'test.xlsx', { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      
      const result = await parseExcel(file);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to parse Excel file');
    });
  });

  describe('type inference', () => {
    it('should infer correct data types from CSV', async () => {
      const csvContent = 'name,age,active,date\nJohn,25,true,2023-01-01\nJane,30,false,2023-01-02';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset!.metadata.types.name).toBe('string');
      expect(result.dataset!.metadata.types.age).toBe('number');
      expect(result.dataset!.metadata.types.active).toBe('boolean');
    });

    it('should calculate nullable columns correctly', async () => {
      const csvContent = 'name,age,city\nJohn,25,NYC\nJane,,LA\nBob,35,';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset!.metadata.nullable.name).toBe(false);
      expect(result.dataset!.metadata.nullable.age).toBe(true);
      expect(result.dataset!.metadata.nullable.city).toBe(true);
    });

    it('should calculate unique columns correctly', async () => {
      const csvContent = 'id,name,category\n1,John,A\n2,Jane,B\n3,Bob,A';
      const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
      
      const result = await parseCSV(file);
      
      expect(result.success).toBe(true);
      expect(result.dataset!.metadata.unique.id).toBe(true);
      expect(result.dataset!.metadata.unique.name).toBe(true);
      expect(result.dataset!.metadata.unique.category).toBe(false);
    });
  });
});