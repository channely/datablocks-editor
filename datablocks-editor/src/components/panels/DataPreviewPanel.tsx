import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Select } from '../ui/Select';

interface DataPreviewPanelProps {
  selectedNode?: any;
  data?: {
    columns: string[];
    rows: any[][];
    metadata?: {
      rowCount: number;
      columnCount: number;
    };
  };
}

export const DataPreviewPanel: React.FC<DataPreviewPanelProps> = ({ 
  selectedNode, 
  data 
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Mock data for demonstration
  const mockData = {
    columns: ['Name', 'Age', 'City', 'Salary', 'Department'],
    rows: Array.from({ length: 100 }, (_, i) => [
      `Person ${i + 1}`,
      20 + Math.floor(Math.random() * 40),
      ['New York', 'London', 'Tokyo', 'Paris'][Math.floor(Math.random() * 4)],
      30000 + Math.floor(Math.random() * 70000),
      ['Engineering', 'Marketing', 'Sales', 'HR'][Math.floor(Math.random() * 4)]
    ]),
    metadata: {
      rowCount: 100,
      columnCount: 5
    }
  };

  const displayData = data || (selectedNode ? mockData : null);
  
  if (!displayData) {
    return (
      <div className="h-full flex flex-col p-4">
        <h2 className="text-lg font-medium mb-4 text-gray-100">Data Preview</h2>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-400 text-center">
            Select a node to preview its data
          </p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(displayData.rows.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, displayData.rows.length);
  const currentRows = displayData.rows.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-medium text-gray-100">Data Preview</h2>
          {selectedNode && (
            <p className="text-sm text-gray-400">
              {selectedNode.type} node • {displayData.metadata?.rowCount || displayData.rows.length} rows
            </p>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <Select
            options={[
              { value: '25', label: '25 rows' },
              { value: '50', label: '50 rows' },
              { value: '100', label: '100 rows' }
            ]}
            value={pageSize.toString()}
            onChange={(value) => {
              setPageSize(parseInt(value));
              setCurrentPage(1);
            }}
            className="w-32"
          />
          <Button variant="outline" size="sm">
            Export
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto border border-gray-700 rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-750 sticky top-0">
            <tr>
              {displayData.columns.map((column, index) => (
                <th
                  key={index}
                  className="px-4 py-3 text-left font-medium text-gray-200 border-b border-gray-700"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentRows.map((row, rowIndex) => (
              <tr
                key={startIndex + rowIndex}
                className="hover:bg-gray-750 border-b border-gray-800"
              >
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className="px-4 py-3 text-gray-100"
                  >
                    {cell?.toString() || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-700">
          <div className="text-sm text-gray-400">
            Showing {startIndex + 1}-{endIndex} of {displayData.rows.length} rows
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = i + 1;
                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(page)}
                    className="w-8 h-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
              {totalPages > 5 && (
                <>
                  <span className="text-gray-400">...</span>
                  <Button
                    variant={currentPage === totalPages ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handlePageChange(totalPages)}
                    className="w-8 h-8 p-0"
                  >
                    {totalPages}
                  </Button>
                </>
              )}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};