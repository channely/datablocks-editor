import React, { useCallback, useState, useEffect } from 'react';
import type { NodeInstance, SortConfig } from '../../types';

interface SortNodeProps {
  node: NodeInstance;
  onConfigChange: (config: Record<string, any>) => void;
}

interface SortConfigItemProps {
  sortConfig: SortConfig;
  availableColumns: string[];
  onUpdate: (config: SortConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
  index: number;
}

const SortConfigItem: React.FC<SortConfigItemProps> = ({
  sortConfig,
  availableColumns,
  onUpdate,
  onRemove,
  canRemove,
  index,
}) => {
  return (
    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded border">
      <span className="text-sm text-gray-500 min-w-[20px]">
        {index + 1}.
      </span>

      {/* 列选择 */}
      <select
        value={sortConfig.column || ''}
        onChange={(e) => onUpdate({ ...sortConfig, column: e.target.value })}
        className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 flex-1"
      >
        <option value="">选择列</option>
        {availableColumns.map(column => (
          <option key={column} value={column}>{column}</option>
        ))}
      </select>

      {/* 排序方向选择 */}
      <select
        value={sortConfig.direction || 'asc'}
        onChange={(e) => onUpdate({ ...sortConfig, direction: e.target.value as 'asc' | 'desc' })}
        className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
      >
        <option value="asc">升序 ↑</option>
        <option value="desc">降序 ↓</option>
      </select>

      {/* 删除按钮 */}
      {canRemove && (
        <button
          onClick={onRemove}
          className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
          title="删除排序条件"
        >
          ✕
        </button>
      )}
    </div>
  );
};

export const SortNode: React.FC<SortNodeProps> = ({
  node,
  onConfigChange,
}) => {
  const [sortConfigs, setSortConfigs] = useState<SortConfig[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);

  const handleConfigChange = useCallback((key: string, value: any) => {
    onConfigChange({
      ...node.config,
      [key]: value,
    });
  }, [node.config, onConfigChange]);

  // 初始化排序配置
  useEffect(() => {
    if (node.config.sortConfigs && Array.isArray(node.config.sortConfigs)) {
      setSortConfigs(node.config.sortConfigs);
    } else if (node.config.column && node.config.direction) {
      // 兼容旧的单列排序格式
      setSortConfigs([{
        column: node.config.column,
        direction: node.config.direction,
      }]);
    } else if (sortConfigs.length === 0) {
      // 默认添加一个空配置
      setSortConfigs([{
        column: '',
        direction: 'asc',
      }]);
    }
  }, [node.config]);

  // 更新配置
  useEffect(() => {
    handleConfigChange('sortConfigs', sortConfigs);
    
    // 为了向后兼容，也设置单列格式
    if (sortConfigs.length > 0 && sortConfigs[0].column) {
      handleConfigChange('column', sortConfigs[0].column);
      handleConfigChange('direction', sortConfigs[0].direction);
    }
  }, [sortConfigs, handleConfigChange]);

  // 从输入数据中提取可用列
  useEffect(() => {
    // 这里应该从输入数据中获取列信息
    // 暂时使用示例列
    const mockColumns = ['id', 'name', 'age', 'city', 'salary', 'department', 'date'];
    setAvailableColumns(mockColumns);
  }, []);

  const addSortConfig = useCallback(() => {
    setSortConfigs(prev => [...prev, {
      column: '',
      direction: 'asc',
    }]);
  }, []);

  const updateSortConfig = useCallback((index: number, config: SortConfig) => {
    setSortConfigs(prev => prev.map((c, i) => i === index ? config : c));
  }, []);

  const removeSortConfig = useCallback((index: number) => {
    setSortConfigs(prev => prev.filter((_, i) => i !== index));
  }, []);

  const hasValidConfigs = sortConfigs.some(c => c.column);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[350px]">
      {/* Node Header */}
      <div className="flex items-center gap-2 p-3 bg-purple-50 border-b border-gray-200 rounded-t-lg">
        <span className="text-lg">🔢</span>
        <span className="font-medium text-gray-900">数据排序</span>
        {node.status === 'processing' && (
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-purple-600"></div>
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

      {/* Input Port */}
      <div className="flex justify-start p-2">
        <div 
          className="w-3 h-3 bg-gray-400 rounded-full border-2 border-white shadow-sm"
          title="数据集输入"
        />
      </div>

      {/* Sort Configuration */}
      <div className="p-4 space-y-4">
        {/* 排序配置列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              排序条件
            </label>
            <button
              onClick={addSortConfig}
              className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            >
              + 添加排序
            </button>
          </div>

          {sortConfigs.map((config, index) => (
            <SortConfigItem
              key={index}
              sortConfig={config}
              availableColumns={availableColumns}
              onUpdate={(updatedConfig) => updateSortConfig(index, updatedConfig)}
              onRemove={() => removeSortConfig(index)}
              canRemove={sortConfigs.length > 1}
              index={index}
            />
          ))}
        </div>

        {/* 排序说明 */}
        {sortConfigs.length > 1 && hasValidConfigs && (
          <div className="bg-blue-50 p-3 rounded border">
            <div className="text-sm font-medium text-blue-800">多列排序说明</div>
            <div className="text-sm text-blue-600">
              数据将按照从上到下的顺序依次排序。当前面的列值相同时，会按照后面的列进行排序。
            </div>
          </div>
        )}

        {/* 预览信息 */}
        {hasValidConfigs && (
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm font-medium text-gray-700">排序预览</div>
            <div className="text-sm text-gray-600">
              {sortConfigs
                .filter(c => c.column)
                .map((config, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-gray-500">{index + 1}.</span>
                    <span className="font-medium">{config.column}</span>
                    <span className="text-gray-500">
                      {config.direction === 'asc' ? '升序 ↑' : '降序 ↓'}
                    </span>
                  </div>
                ))
              }
            </div>
          </div>
        )}

        {/* 错误信息 */}
        {node.error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {node.error.message}
          </div>
        )}
      </div>

      {/* Output Port */}
      <div className="flex justify-end p-2">
        <div 
          className="w-3 h-3 bg-purple-500 rounded-full border-2 border-white shadow-sm"
          title="排序后数据集输出"
        />
      </div>
    </div>
  );
};