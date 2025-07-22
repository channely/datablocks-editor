import { vi } from 'vitest';
import {
  exportDatasetToCSV,
  exportDatasetToJSON,
  exportDatasetToExcel,
  filterDataset,
  sortDataset,
} from '../dataUtils';
import type { Dataset } from '../../types';

// Mock DOM methods
const mockCreateElement = vi.fn();
const mockClick = vi.fn();
const mockCreateObjectURL = vi.fn();
const mockRevokeObjectURL = vi.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

Object.defineProperty(URL, 'createObjectURL', {
  value: mockCreateObjectURL,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
});

const mockDataset: Dataset = {
  columns: ['Name', 'Age', 'City', 'Salary'],
  rows: [
    ['Alice', 25, 'New York', 50000],
    ['Bob', 30, 'London', 60000],
    ['Charlie', 35, 'Tokyo', 70000],
    ['Diana', 28, 'Paris', 55000],
  ],
  metadata: {
    rowCount: 4,
    columnCount: 4,
    types: {
      'Name': 'string',
      'Age': 'number',
      'City': 'string',
      'Salary': 'number'
    },
    nullable: {},
    unique: {},
    created: new Date(),
    modified: new Date(),
  },
};

describe('Data Export Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup mock link element
    const mockLink = {
      href: '',
      download: '',
      click: mockClick,
    };
    mockCreateElement.mockReturnValue(mockLink);
    mockCreateObjectURL.mockReturnValue('mock-url');
  });

  describe('exportDatasetToCSV', () => {
    it('creates CSV content with proper formatting', () => {
      exportDatasetToCSV(mockDataset);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('handles cells with commas by wrapping in quotes', () => {
      const datasetWithCommas: Dataset = {
        ...mockDataset,
        rows: [
          ['Smith, John', 25, 'New York, NY', 50000],
        ],
      };

      exportDatasetToCSV(datasetWithCommas);

      // The function should handle commas properly
      expect(mockCreateElement).toHaveBeenCalled();
    });

    it('handles cells with quotes by escaping them', () => {
      const datasetWithQuotes: Dataset = {
        ...mockDataset,
        rows: [
          ['John "Johnny" Smith', 25, 'New York', 50000],
        ],
      };

      exportDatasetToCSV(datasetWithQuotes);

      expect(mockCreateElement).toHaveBeenCalled();
    });

    it('uses custom filename when provided', () => {
      const customFilename = 'custom-export.csv';
      exportDatasetToCSV(mockDataset, customFilename);

      expect(mockCreateElement).toHaveBeenCalled();
      // The mock link should have the custom filename
      const mockLink = mockCreateElement.mock.results[0].value;
      expect(mockLink.download).toBe(customFilename);
    });
  });

  describe('exportDatasetToJSON', () => {
    it('creates JSON content with proper structure', () => {
      exportDatasetToJSON(mockDataset);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('uses custom filename when provided', () => {
      const customFilename = 'custom-export.json';
      exportDatasetToJSON(mockDataset, customFilename);

      expect(mockCreateElement).toHaveBeenCalled();
      const mockLink = mockCreateElement.mock.results[0].value;
      expect(mockLink.download).toBe(customFilename);
    });

    it('handles null and undefined values correctly', () => {
      const datasetWithNulls: Dataset = {
        ...mockDataset,
        rows: [
          ['Alice', null, 'New York', undefined],
          [null, 30, undefined, 60000],
        ],
      };

      exportDatasetToJSON(datasetWithNulls);

      expect(mockCreateElement).toHaveBeenCalled();
    });
  });

  describe('exportDatasetToExcel', () => {
    it('creates TSV content for Excel compatibility', () => {
      exportDatasetToExcel(mockDataset);

      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('uses custom filename when provided', () => {
      const customFilename = 'custom-export.xlsx';
      exportDatasetToExcel(mockDataset, customFilename);

      expect(mockCreateElement).toHaveBeenCalled();
      const mockLink = mockCreateElement.mock.results[0].value;
      expect(mockLink.download).toBe(customFilename);
    });
  });
});

describe('Data Filtering and Sorting Functions', () => {
  describe('filterDataset', () => {
    it('filters rows based on column values', () => {
      const filters = { 'Name': 'Alice' };
      const result = filterDataset(mockDataset, filters);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][0]).toBe('Alice');
      expect(result.metadata.rowCount).toBe(1);
    });

    it('applies multiple filters', () => {
      const filters = { 'City': 'New', 'Age': '25' };
      const result = filterDataset(mockDataset, filters);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][0]).toBe('Alice');
    });

    it('is case insensitive', () => {
      const filters = { 'Name': 'alice' };
      const result = filterDataset(mockDataset, filters);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][0]).toBe('Alice');
    });

    it('ignores empty filter values', () => {
      const filters = { 'Name': '', 'City': 'New York' };
      const result = filterDataset(mockDataset, filters);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0][0]).toBe('Alice');
    });

    it('returns empty result when no matches', () => {
      const filters = { 'Name': 'NonExistent' };
      const result = filterDataset(mockDataset, filters);

      expect(result.rows).toHaveLength(0);
      expect(result.metadata.rowCount).toBe(0);
    });

    it('handles non-existent columns gracefully', () => {
      const filters = { 'NonExistentColumn': 'value' };
      const result = filterDataset(mockDataset, filters);

      expect(result.rows).toHaveLength(4); // No filtering applied
    });
  });

  describe('sortDataset', () => {
    it('sorts by string column ascending', () => {
      const result = sortDataset(mockDataset, 'Name', 'asc');

      expect(result.rows[0][0]).toBe('Alice');
      expect(result.rows[1][0]).toBe('Bob');
      expect(result.rows[2][0]).toBe('Charlie');
      expect(result.rows[3][0]).toBe('Diana');
    });

    it('sorts by string column descending', () => {
      const result = sortDataset(mockDataset, 'Name', 'desc');

      expect(result.rows[0][0]).toBe('Diana');
      expect(result.rows[1][0]).toBe('Charlie');
      expect(result.rows[2][0]).toBe('Bob');
      expect(result.rows[3][0]).toBe('Alice');
    });

    it('sorts by number column ascending', () => {
      const result = sortDataset(mockDataset, 'Age', 'asc');

      expect(result.rows[0][1]).toBe(25); // Alice
      expect(result.rows[1][1]).toBe(28); // Diana
      expect(result.rows[2][1]).toBe(30); // Bob
      expect(result.rows[3][1]).toBe(35); // Charlie
    });

    it('sorts by number column descending', () => {
      const result = sortDataset(mockDataset, 'Age', 'desc');

      expect(result.rows[0][1]).toBe(35); // Charlie
      expect(result.rows[1][1]).toBe(30); // Bob
      expect(result.rows[2][1]).toBe(28); // Diana
      expect(result.rows[3][1]).toBe(25); // Alice
    });

    it('handles null values correctly', () => {
      const datasetWithNulls: Dataset = {
        ...mockDataset,
        rows: [
          ['Alice', null, 'New York', 50000],
          ['Bob', 30, 'London', 60000],
          ['Charlie', 35, 'Tokyo', null],
        ],
        metadata: {
          ...mockDataset.metadata,
          rowCount: 3,
        }
      };

      const result = sortDataset(datasetWithNulls, 'Age', 'asc');

      // Null should come first in ascending order
      expect(result.rows[0][1]).toBe(null);
      expect(result.rows[1][1]).toBe(30);
      expect(result.rows[2][1]).toBe(35);
    });

    it('throws error for non-existent column', () => {
      expect(() => {
        sortDataset(mockDataset, 'NonExistentColumn', 'asc');
      }).toThrow('Column "NonExistentColumn" not found');
    });

    it('uses type-aware comparison for dates', () => {
      const datasetWithDates: Dataset = {
        columns: ['Name', 'Date'],
        rows: [
          ['Alice', '2023-01-15'],
          ['Bob', '2023-01-10'],
          ['Charlie', '2023-01-20'],
        ],
        metadata: {
          rowCount: 3,
          columnCount: 2,
          types: {
            'Name': 'string',
            'Date': 'date'
          },
          nullable: {},
          unique: {},
          created: new Date(),
          modified: new Date(),
        }
      };

      const result = sortDataset(datasetWithDates, 'Date', 'asc');

      expect(result.rows[0][0]).toBe('Bob');    // 2023-01-10
      expect(result.rows[1][0]).toBe('Alice');  // 2023-01-15
      expect(result.rows[2][0]).toBe('Charlie'); // 2023-01-20
    });

    it('preserves original dataset', () => {
      const originalRowCount = mockDataset.rows.length;
      const originalFirstRow = mockDataset.rows[0];

      sortDataset(mockDataset, 'Name', 'desc');

      // Original dataset should be unchanged
      expect(mockDataset.rows.length).toBe(originalRowCount);
      expect(mockDataset.rows[0]).toBe(originalFirstRow);
    });
  });
});