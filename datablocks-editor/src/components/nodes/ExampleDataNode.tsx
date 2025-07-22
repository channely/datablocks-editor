import React, { useCallback, useState, useEffect } from 'react';
import type { NodeInstance } from '../../types';

interface ExampleDataNodeProps {
  node: NodeInstance;
  onConfigChange: (config: Record<string, any>) => void;
}

// Available example datasets
const EXAMPLE_DATASETS = [
  {
    value: 'sample',
    label: '用户数据',
    description: '包含用户ID、姓名、年龄、城市的示例数据',
    preview: [
      ['id', 'name', 'age', 'city'],
      ['1', 'Alice', '25', 'New York'],
      ['2', 'Bob', '30', 'San Francisco'],
      ['3', 'Charlie', '35', 'Chicago'],
    ],
  },
  {
    value: 'sales',
    label: '销售数据',
    description: '包含日期、产品、数量、收入的销售数据',
    preview: [
      ['date', 'product', 'quantity', 'revenue'],
      ['2024-01-01', 'Widget A', '10', '100'],
      ['2024-01-02', 'Widget B', '15', '225'],
      ['2024-01-03', 'Widget A', '8', '80'],
    ],
  },
  {
    value: 'employees',
    label: '员工数据',
    description: '包含员工信息和部门数据',
    preview: [
      ['id', 'name', 'department', 'salary'],
      ['1', '张三', '技术部', '8000'],
      ['2', '李四', '市场部', '7500'],
      ['3', '王五', '人事部', '6500'],
    ],
  },
  {
    value: 'products',
    label: '产品数据',
    description: '包含产品信息和库存数据',
    preview: [
      ['id', 'name', 'category', 'price', 'stock'],
      ['1', '笔记本电脑', '电子产品', '5999', '50'],
      ['2', '无线鼠标', '电子产品', '99', '200'],
      ['3', '办公椅', '办公用品', '299', '30'],
    ],
  },
];

export const ExampleDataNode: React.FC<ExampleDataNodeProps> = ({
  node,
  onConfigChange,
}) => {
  const [selectedDataset, setSelectedDataset] = useState<string>(
    node.config.dataset || 'sample'
  );
  const [previewData, setPreviewData] = useState<string[][]>([]);

  const handleConfigChange = useCallback((key: string, value: any) => {
    onConfigChange({
      ...node.config,
      [key]: value,
    });
  }, [node.config, onConfigChange]);

  const handleDatasetChange = useCallback((dataset: string) => {
    setSelectedDataset(dataset);
    handleConfigChange('dataset', dataset);
    
    // Update preview data
    const datasetInfo = EXAMPLE_DATASETS.find(d => d.value === dataset);
    if (datasetInfo) {
      setPreviewData(datasetInfo.preview);
    }
  }, [handleConfigChange]);

  // Initialize preview data
  useEffect(() => {
    const datasetInfo = EXAMPLE_DATASETS.find(d => d.value === selectedDataset);
    if (datasetInfo) {
      setPreviewData(datasetInfo.preview);
    }
  }, [selectedDataset]);

  const currentDataset = EXAMPLE_DATASETS.find(d => d.value === selectedDataset);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[300px]">
      {/* Node Header */}
      <div className="flex items-center gap-2 p-3 bg-blue-50 border-b border-gray-200 rounded-t-lg">
        <span className="text-lg">📊</span>
        <span className="font-medium text-gray-900">示例数据</span>
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

      {/* Dataset Selection */}
      <div className="p-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择数据集
            </label>
            <select
              value={selectedDataset}
              onChange={(e) => handleDatasetChange(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            >
              {EXAMPLE_DATASETS.map((dataset) => (
                <option key={dataset.value} value={dataset.value}>
                  {dataset.label}
                </option>
              ))}
            </select>
          </div>

          {/* Dataset Description */}
          {currentDataset && (
            <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
              <div className="font-medium mb-1">{currentDataset.label}</div>
              <div>{currentDataset.description}</div>
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
      {previewData.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <div className="text-sm font-medium text-gray-700 mb-2">数据预览</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border border-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  {previewData[0]?.map((header, index) => (
                    <th key={index} className="px-2 py-1 text-left font-medium text-gray-700 border-r border-gray-200">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.slice(1).map((row, rowIndex) => (
                  <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
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
          <div className="text-xs text-gray-500 mt-2">
            显示前 {Math.min(3, previewData.length - 1)} 行数据预览
          </div>
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