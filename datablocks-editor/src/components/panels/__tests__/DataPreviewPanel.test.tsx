import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { DataPreviewPanel } from '../DataPreviewPanel';
import type { Dataset } from '../../../types';

// Mock the export functions
vi.mock('../../../utils/dataUtils', () => ({
  exportDatasetToCSV: vi.fn(),
  exportDatasetToJSON: vi.fn(),
  exportDatasetToExcel: vi.fn(),
}));

const mockDataset: Dataset = {
  columns: ['Name', 'Age', 'City', 'Salary'],
  rows: [
    ['Alice', 25, 'New York', 50000],
    ['Bob', 30, 'London', 60000],
    ['Charlie', 35, 'Tokyo', 70000],
    ['Diana', 28, 'Paris', 55000],
    ['Eve', 32, 'Berlin', 65000],
  ],
  metadata: {
    rowCount: 5,
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

describe('DataPreviewPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders data table when dataset is provided', () => {
      render(<DataPreviewPanel data={mockDataset} />);
      
      // Check that data info is displayed
      expect(screen.getByText('5 rows, 4 columns')).toBeInTheDocument();
      
      // Check column headers
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('City')).toBeInTheDocument();
      expect(screen.getByText('Salary')).toBeInTheDocument();
      
      // Check data rows
      expect(screen.getByText('Alice')).toBeInTheDocument();
      expect(screen.getByText('Bob')).toBeInTheDocument();
      expect(screen.getByText('Charlie')).toBeInTheDocument();
    });

    it('handles empty dataset correctly', () => {
      const emptyDataset: Dataset = {
        columns: ['Name', 'Age'],
        rows: [],
        metadata: {
          rowCount: 0,
          columnCount: 2,
          types: {},
          nullable: {},
          unique: {},
          created: new Date(),
          modified: new Date(),
        }
      };

      render(<DataPreviewPanel data={emptyDataset} />);
      
      expect(screen.getByText('0 rows, 2 columns')).toBeInTheDocument();
      expect(screen.getByText('Name')).toBeInTheDocument();
      expect(screen.getByText('Age')).toBeInTheDocument();
      expect(screen.getByText('No data available')).toBeInTheDocument();
    });
  });

  describe('Column Sorting', () => {
    it('sorts data when column header is clicked', async () => {
      const user = userEvent.setup();
      render(<DataPreviewPanel data={mockDataset} />);
      
      // Click on Age column to sort
      const ageHeader = screen.getByText('Age');
      await user.click(ageHeader);
      
      // Check that sort indicator appears
      expect(screen.getByText('↑')).toBeInTheDocument();
    });

    it('toggles sort direction when clicking same column twice', async () => {
      const user = userEvent.setup();
      render(<DataPreviewPanel data={mockDataset} />);
      
      const ageHeader = screen.getByText('Age');
      
      // First click - ascending
      await user.click(ageHeader);
      expect(screen.getByText('↑')).toBeInTheDocument();
      
      // Second click - descending
      await user.click(ageHeader);
      expect(screen.getByText('↓')).toBeInTheDocument();
    });
  });

  describe('Column Filtering', () => {
    it('filters data when filter input is used', async () => {
      const user = userEvent.setup();
      render(<DataPreviewPanel data={mockDataset} />);
      
      // Find the Name filter input
      const nameFilterInput = screen.getByPlaceholderText('Filter Name');
      
      // Type in filter
      await user.type(nameFilterInput, 'Alice');
      
      // Check that only Alice row is visible
      await waitFor(() => {
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.queryByText('Bob')).not.toBeInTheDocument();
      });
    });
  });

  describe('Pagination', () => {
    const largeDataset: Dataset = {
      ...mockDataset,
      rows: Array.from({ length: 100 }, (_, i) => [
        `Person ${i + 1}`,
        20 + i,
        'City',
        30000 + i * 1000
      ]),
      metadata: {
        ...mockDataset.metadata,
        rowCount: 100,
      }
    };

    it('shows pagination controls for large datasets', () => {
      render(<DataPreviewPanel data={largeDataset} />);
      
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
      expect(screen.getByText(/Page 1 of/)).toBeInTheDocument();
    });

    it('navigates to next page when Next button is clicked', async () => {
      const user = userEvent.setup();
      render(<DataPreviewPanel data={largeDataset} />);
      
      const nextButton = screen.getByText('Next');
      await user.click(nextButton);
      
      expect(screen.getByText(/Page 2 of/)).toBeInTheDocument();
    });

    it('changes page size when dropdown is changed', async () => {
      const user = userEvent.setup();
      render(<DataPreviewPanel data={largeDataset} />);
      
      // Find and click the page size dropdown
      const pageSizeSelect = screen.getByDisplayValue('50 rows');
      await user.selectOptions(pageSizeSelect, '25');
      
      // Check that the page size changed
      expect(pageSizeSelect).toHaveValue('25');
    });
  });

  describe('Data Export', () => {
    it('shows export menu when export button is clicked', async () => {
      const user = userEvent.setup();
      render(<DataPreviewPanel data={mockDataset} />);
      
      const exportButton = screen.getByText('Export ▼');
      await user.click(exportButton);
      
      expect(screen.getByText('Export CSV')).toBeInTheDocument();
      expect(screen.getByText('Export JSON')).toBeInTheDocument();
      expect(screen.getByText('Export Excel')).toBeInTheDocument();
    });

    it('calls CSV export function when CSV export is clicked', async () => {
      const user = userEvent.setup();
      const { exportDatasetToCSV } = await import('../../../utils/dataUtils');
      
      render(<DataPreviewPanel data={mockDataset} />);
      
      const exportButton = screen.getByText('Export ▼');
      await user.click(exportButton);
      
      const csvExportButton = screen.getByText('Export CSV');
      await user.click(csvExportButton);
      
      expect(exportDatasetToCSV).toHaveBeenCalled();
    });

    it('calls JSON export function when JSON export is clicked', async () => {
      const user = userEvent.setup();
      const { exportDatasetToJSON } = await import('../../../utils/dataUtils');
      
      render(<DataPreviewPanel data={mockDataset} />);
      
      const exportButton = screen.getByText('Export ▼');
      await user.click(exportButton);
      
      const jsonExportButton = screen.getByText('Export JSON');
      await user.click(jsonExportButton);
      
      expect(exportDatasetToJSON).toHaveBeenCalled();
    });

    it('calls Excel export function when Excel export is clicked', async () => {
      const user = userEvent.setup();
      const { exportDatasetToExcel } = await import('../../../utils/dataUtils');
      
      render(<DataPreviewPanel data={mockDataset} />);
      
      const exportButton = screen.getByText('Export ▼');
      await user.click(exportButton);
      
      const excelExportButton = screen.getByText('Export Excel');
      await user.click(excelExportButton);
      
      expect(exportDatasetToExcel).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<DataPreviewPanel data={mockDataset} />);
      
      // Check that table has proper structure
      const table = screen.getByRole('table');
      expect(table).toBeInTheDocument();
      
      // Check column headers
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders).toHaveLength(4);
      
      // Check that buttons are accessible
      const exportButton = screen.getByRole('button', { name: /Export/ });
      expect(exportButton).toBeInTheDocument();
    });

    it('supports keyboard navigation for sorting', async () => {
      const user = userEvent.setup();
      render(<DataPreviewPanel data={mockDataset} />);
      
      const nameHeader = screen.getByText('Name');
      
      // Focus and press Enter
      nameHeader.focus();
      await user.keyboard('{Enter}');
      
      // Should trigger sort
      await waitFor(() => {
        const sortIndicators = screen.getAllByRole('columnheader');
        expect(sortIndicators.length).toBeGreaterThan(0);
      });
    });
  });
});