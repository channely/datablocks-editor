import React, { useCallback, useState } from 'react';
import type { NodeInstance } from '../../types';

interface PasteInputNodeProps {
  node: NodeInstance;
  onConfigChange: (config: Record<string, any>) => void;
}

export const PasteInputNode: React.FC<PasteInputNodeProps> = ({
  node,
  onConfigChange,
}) => {
  const [previewData, setPreviewData] = useState<string[][] | null>(null);

  const handleConfigChange = useCallback((key: string, value: any) => {
    onConfigChange({
      ...node.config,
      [key]: value,
    });
  }, [node.config, onConfigChange]);

  const handleDataChange = useCallback((data: string) => {
    handleConfigChange('data', data);
    
    // Auto-detect data format and show preview
    if (data.trim()) {
      try {
        // Try to parse as JSON first
        const jsonData = JSON.parse(data);
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          const columns = Object.keys(jsonData[0]);
          const rows = jsonData.slice(0, 3).map(item => columns.map(col => String(item[col] || '')));
          setPreviewData([columns, ...rows]);
          handleConfigChange('dataType', 'json');
          return;
        }
      } catch {
        // Not JSON, continue with other formats
      }

      // Try to parse as table data (tab or comma separated)
      const lines = data.trim().split('\n').filter(line => line.trim());
      if (lines.length > 0) {
        // Detect delimiter
        const firstLine = lines[0];
        const tabCount = (firstLine.match(/\t/g) || []).length;
        const commaCount = (firstLine.match(/,/g) || []).length;
        
        const delimiter = tabCount > commaCount ? '\t' : ',';
        const rows = lines.slice(0, 4).map(line => line.split(delimiter).map(cell => cell.trim()));
        
        setPreviewData(rows);
        handleConfigChange('dataType', delimiter === '\t' ? 'table' : 'csv');
        handleConfigChange('delimiter', delimiter);
      }
    } else {
      setPreviewData(null);
    }
  }, [handleConfigChange]);

  const hasData = node.config.data && node.config.data.trim();

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[320px]">
      {/* Node Header */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 border-b border-gray-200 rounded-t-lg">
        <span className="text-lg">📋</span>
        <span className="font-medium text-gray-900">粘贴数据</span>
        {node.status === 'processing' && (
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        )}
        {node.status === 'error' && (
          <div className="ml-auto text-red-500">
            <span className="text-sm">❌</span>
          </div>
        )}
        {node.status === 'success' && (
          <div className="ml-auto text-green-500">
            <span className="text-sm">✅</span>
          </div>
        )}
      </div>

      {/* Data Input Area */}
      <div className="p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数据类型
            </label>
            <select
              value={node.config.dataType || 'table'}
              onChange={(e) => handleConfigChange('dataType', e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="table">表格数据 (制表符分隔)</option>
              <option value="csv">CSV 数据 (逗号分隔)</option>
              <option value="json">JSON 数据</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              数据内容
            </label>
            <textarea
              value={node.config.data || ''}
              onChange={(e) => handleDataChange(e.target.value)}
              placeholder={getPlaceholderText(node.config.dataType || 'table')}
              className="w-full h-32 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 font-mono"
              style={{ resize: 'vertical' }}
            />
          </div>

          {hasData && (
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">
                包含标题行
              </label>
              <input
                type="checkbox"
                checked={node.config.hasHeader !== false}
                onChange={(e) => handleConfigChange('hasHeader', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        {node.error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
            {node.error.message}
          </div>
        )}
      </div>

      {/* Data Preview */}
      {previewData && (
        <div className="border-t border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">数据预览</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200">
              <tbody>
                {previewData.map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex === 0 ? 'bg-gray-50 font-medium' : ''}>
                    {row.map((cell, cellIndex) => (
                      <td key={cellIndex} className="px-2 py-1 border-r border-gray-200 truncate max-w-20">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {previewData.length > 4 && (
            <div className="text-xs text-gray-500 mt-1">
              显示前 {Math.min(4, previewData.length)} 行...
            </div>
          )}
        </div>
      )}

      {/* Output Port */}
      <div className="flex justify-end p-2">
        <div 
          className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-sm"
          title="数据集输出"
        />
      </div>
    </div>
  );
};

// Helper function to get placeholder text based on data type
const getPlaceholderText = (dataType: string): string => {
  switch (dataType) {
    case 'json':
      return `[
  {"name": "张三", "age": 25, "city": "北京"},
  {"name": "李四", "age": 30, "city": "上海"}
]`;
    case 'csv':
      return `name,age,city
张三,25,北京
李四,30,上海`;
    case 'table':
    default:
      return `name	age	city
张三	25	北京
李四	30	上海`;
  }
};