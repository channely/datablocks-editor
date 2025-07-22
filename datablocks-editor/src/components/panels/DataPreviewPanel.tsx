import React, { useState, useMemo } from 'react';
import type { Dataset } from '../../types';
import { exportDatasetToCSV, exportDatasetToJSON, exportDatasetToExcel } from '../../utils/dataUtils';

interface DataPreviewPanelProps {
  data: Dataset;
}

export const DataPreviewPanel: React.FC<DataPreviewPanelProps> = ({ data }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Filter and sort data
  const processedData = useMemo(() => {
    let filteredRows = data.rows;

    // Apply filters
    Object.entries(filters).forEach(([column, filterValue]) => {
      if (filterValue) {
        const columnIndex = data.columns.indexOf(column);
        if (columnIndex !== -1) {
          filteredRows = filteredRows.filter(row => 
            String(row[columnIndex]).toLowerCase().includes(filterValue.toLowerCase())
          );
        }
      }
    });

    // Apply sorting
    if (sortColumn) {
      const columnIndex = data.columns.indexOf(sortColumn);
      if (columnIndex !== -1) {
        filteredRows = [...filteredRows].sort((a, b) => {
          const aVal = a[columnIndex];
          const bVal = b[columnIndex];
          
          if (aVal === null || aVal === undefined) return 1;
          if (bVal === null || bVal === undefined) return -1;
          
          let comparison = 0;
          if (typeof aVal === 'number' && typeof bVal === 'number') {
            comparison = aVal - bVal;
          } else {
            comparison = String(aVal).localeCompare(String(bVal));
          }
          
          return sortDirection === 'asc' ? comparison : -comparison;
        });
      }
    }

    return filteredRows;
  }, [data, filters, sortColumn, sortDirection]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const startIndex = currentPage * pageSize;
    return processedData.slice(startIndex, startIndex + pageSize);
  }, [processedData, currentPage, pageSize]);

  const totalPages = Math.ceil(processedData.length / pageSize);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleFilter = (column: string, value: string) => {
    setFilters(prev => ({ ...prev, [column]: value }));
    setCurrentPage(0); // Reset to first page when filtering
  };

  const handleExport = async (format: 'csv' | 'json' | 'excel') => {
    const exportData: Dataset = { 
      columns: data.columns, 
      rows: processedData,
      metadata: {
        ...data.metadata,
        rowCount: processedData.length,
        modified: new Date(),
      }
    };
    
    try {
      switch (format) {
        case 'csv':
          await exportDatasetToCSV(exportData);
          break;
        case 'json':
          await exportDatasetToJSON(exportData);
          break;
        case 'excel':
          await exportDatasetToExcel(exportData);
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
    
    setShowExportMenu(false);
  };

  if (!data || !data.columns || !data.rows) {
    return <div>No data available</div>;
  }

  return (
    <div className="data-preview-panel p-4">
      {/* Header with stats and export */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600">
          {processedData.length} rows, {data.columns.length} columns
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowExportMenu(!showExportMenu)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Export ▼
          </button>
          
          {showExportMenu && (
            <div className="absolute right-0 mt-1 bg-white border rounded shadow-lg z-10">
              <button
                onClick={() => handleExport('csv')}
                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                Export JSON
              </button>
              <button
                onClick={() => handleExport('excel')}
                className="block w-full px-4 py-2 text-left hover:bg-gray-100"
              >
                Export Excel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4">
        <div className="grid grid-cols-4 gap-2">
          {data.columns.map(column => (
            <input
              key={column}
              type="text"
              placeholder={`Filter ${column}`}
              value={filters[column] || ''}
              onChange={(e) => handleFilter(column, e.target.value)}
              className="px-2 py-1 border rounded text-sm"
            />
          ))}
        </div>
      </div>

      {/* Data table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border">
          <thead>
            <tr>
              {data.columns.map(column => (
                <th
                  key={column}
                  role="columnheader"
                  tabIndex={0}
                  onClick={() => handleSort(column)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleSort(column);
                    }
                  }}
                  className="border p-2 bg-gray-100 cursor-pointer hover:bg-gray-200 text-left"
                >
                  {column}
                  {sortColumn === column && (
                    <span className="ml-1">
                      {sortDirection === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={data.columns.length} className="border p-4 text-center text-gray-500">
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border p-2">
                      {cell === null || cell === undefined ? '' : String(cell)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mt-4">
        <div className="flex items-center gap-2">
          <span className="text-sm">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(0);
            }}
            className="border rounded px-2 py-1"
          >
            <option value={10}>10 rows</option>
            <option value={25}>25 rows</option>
            <option value={50}>50 rows</option>
            <option value={100}>100 rows</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Previous
          </button>
          
          <span className="text-sm">
            Page {currentPage + 1} of {Math.max(1, totalPages)}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-1 border rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};