import React, { useCallback, useState, useEffect } from 'react';
import type { NodeInstance, GroupConfig, AggregationConfig, AggregationFunction } from '../../types';

interface GroupNodeProps {
  node: NodeInstance;
  onConfigChange: (config: Record<string, any>) => void;
}

// 可用的聚合函数
const AGGREGATION_FUNCTIONS: Array<{ value: AggregationFunction; label: string; description: string }> = [
  { value: 'count', label: '计数', description: '统计行数' },
  { value: 'sum', label: '求和', description: '数值求和' },
  { value: 'avg', label: '平均值', description: '数值平均' },
  { value: 'min', label: '最小值', description: '最小数值' },
  { value: 'max', label: '最大值', description: '最大数值' },
  { value: 'first', label: '第一个', description: '第一个值' },
  { value: 'last', label: '最后一个', description: '最后一个值' },
];

interface AggregationConfigProps {
  aggregation: AggregationConfig;
  availableColumns: string[];
  onUpdate: (aggregation: AggregationConfig) => void;
  onRemove: () => void;
  canRemove: boolean;
  errors?: string[];
}

const AggregationConfigComponent: React.FC<AggregationConfigProps> = ({
  aggregation,
  availableColumns,
  onUpdate,
  onRemove,
  canRemove,
  errors = [],
}) => {
  const hasErrors = errors.length > 0;
  const selectedFunction = AGGREGATION_FUNCTIONS.find(fn => fn.value === aggregation.function);

  return (
    <div className={`p-3 rounded border ${hasErrors ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2">
        {/* 列选择 */}
        <select
          value={aggregation.column || ''}
          onChange={(e) => onUpdate({ ...aggregation, column: e.target.value })}
          className={`px-2 py-1 text-sm border rounded focus:ring-blue-500 focus:border-blue-500 flex-1 ${
            !aggregation.column && hasErrors ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">选择列</option>
          {availableColumns.map(column => (
            <option key={column} value={column}>{column}</option>
          ))}
        </select>

        {/* 聚合函数选择 */}
        <select
          value={aggregation.function || ''}
          onChange={(e) => onUpdate({ ...aggregation, function: e.target.value as AggregationFunction })}
          className={`px-2 py-1 text-sm border rounded focus:ring-blue-500 focus:border-blue-500 ${
            !aggregation.function && hasErrors ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">选择函数</option>
          {AGGREGATION_FUNCTIONS.map(fn => (
            <option key={fn.value} value={fn.value} title={fn.description}>
              {fn.label}
            </option>
          ))}
        </select>

        {/* 别名输入 */}
        <input
          type="text"
          value={aggregation.alias || ''}
          onChange={(e) => onUpdate({ ...aggregation, alias: e.target.value })}
          placeholder="别名（可选）"
          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 flex-1"
        />

        {/* 删除按钮 */}
        {canRemove && (
          <button
            onClick={onRemove}
            className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="删除聚合"
          >
            ✕
          </button>
        )}
      </div>

      {/* 错误信息 */}
      {hasErrors && (
        <div className="mt-2 text-xs text-red-600">
          {errors.map((error, index) => (
            <div key={index}>• {error}</div>
          ))}
        </div>
      )}

      {/* 函数说明 */}
      {selectedFunction && (
        <div className="mt-2 text-xs text-gray-500">
          💡 {selectedFunction.description}
        </div>
      )}
    </div>
  );
};

export const GroupNode: React.FC<GroupNodeProps> = ({
  node,
  onConfigChange,
}) => {
  const [groupColumns, setGroupColumns] = useState<string[]>([]);
  const [aggregations, setAggregations] = useState<AggregationConfig[]>([]);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [previewGroups, setPreviewGroups] = useState<number | null>(null);

  const handleConfigChange = useCallback((key: string, value: any) => {
    onConfigChange({
      ...node.config,
      [key]: value,
    });
  }, [node.config, onConfigChange]);

  // 初始化配置
  useEffect(() => {
    if (node.config.groupColumns && Array.isArray(node.config.groupColumns)) {
      setGroupColumns(node.config.groupColumns);
    }

    if (node.config.aggregations && Array.isArray(node.config.aggregations)) {
      setAggregations(node.config.aggregations);
    } else if (aggregations.length === 0) {
      // 默认添加一个空聚合配置
      setAggregations([{
        column: '',
        function: 'count',
      }]);
    }
  }, [node.config]);

  // 更新配置
  useEffect(() => {
    const groupConfig: GroupConfig = {
      columns: groupColumns,
      aggregations: aggregations,
    };
    
    handleConfigChange('groupColumns', groupColumns);
    handleConfigChange('aggregations', aggregations);
    handleConfigChange('groupConfig', groupConfig);
  }, [groupColumns, aggregations, handleConfigChange]);

  // 从输入数据中提取可用列
  useEffect(() => {
    // 尝试从节点的输入数据中获取列信息
    if (node.data && node.data.inputData && node.data.inputData.columns) {
      setAvailableColumns(node.data.inputData.columns);
    } else {
      // 使用示例列作为后备
      const mockColumns = ['id', 'name', 'age', 'city', 'salary', 'department', 'category', 'date'];
      setAvailableColumns(mockColumns);
    }
  }, [node.data]);

  const addGroupColumn = useCallback((column: string) => {
    if (column && !groupColumns.includes(column)) {
      setGroupColumns(prev => [...prev, column]);
    }
  }, [groupColumns]);

  const removeGroupColumn = useCallback((column: string) => {
    setGroupColumns(prev => prev.filter(col => col !== column));
  }, []);

  const addAggregation = useCallback(() => {
    setAggregations(prev => [...prev, {
      column: '',
      function: 'count',
    }]);
  }, []);

  const updateAggregation = useCallback((index: number, aggregation: AggregationConfig) => {
    setAggregations(prev => prev.map((agg, i) => i === index ? aggregation : agg));
  }, []);

  const removeAggregation = useCallback((index: number) => {
    setAggregations(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 验证聚合配置
  const validateAggregation = useCallback((aggregation: AggregationConfig): string[] => {
    const errors: string[] = [];
    
    if (!aggregation.column) {
      errors.push('请选择列');
    }
    
    if (!aggregation.function) {
      errors.push('请选择聚合函数');
    }
    
    return errors;
  }, []);

  // 计算预览结果
  const calculatePreview = useCallback(() => {
    if (groupColumns.length > 0) {
      // 模拟基于分组列数量的分组结果
      const baseCount = 100;
      const groupFactor = Math.pow(0.3, groupColumns.length - 1);
      const estimatedGroups = Math.max(1, Math.floor(baseCount * groupFactor));
      setPreviewGroups(estimatedGroups);
    } else {
      setPreviewGroups(null);
    }
  }, [groupColumns]);

  useEffect(() => {
    calculatePreview();
  }, [calculatePreview]);

  const hasValidConfig = groupColumns.length > 0 && aggregations.some(agg => agg.column && agg.function);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[450px]">
      {/* Node Header */}
      <div className="flex items-center gap-2 p-3 bg-orange-50 border-b border-gray-200 rounded-t-lg">
        <span className="text-lg">📊</span>
        <span className="font-medium text-gray-900">数据分组</span>
        {node.status === 'processing' && (
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
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

      {/* Group Configuration */}
      <div className="p-4 space-y-4">
        {/* 分组列选择 */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            分组列
          </label>
          
          {/* 已选择的分组列 */}
          {groupColumns.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {groupColumns.map(column => (
                <div
                  key={column}
                  className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                >
                  <span>{column}</span>
                  <button
                    onClick={() => removeGroupColumn(column)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 添加分组列 */}
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) {
                addGroupColumn(e.target.value);
                e.target.value = '';
              }
            }}
            className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500 w-full"
          >
            <option value="">+ 添加分组列</option>
            {availableColumns
              .filter(col => !groupColumns.includes(col))
              .map(column => (
                <option key={column} value={column}>{column}</option>
              ))}
          </select>
        </div>

        {/* 聚合配置列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              聚合函数
            </label>
            <button
              onClick={addAggregation}
              className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            >
              + 添加聚合
            </button>
          </div>

          {aggregations.map((aggregation, index) => {
            const aggregationErrors = validateAggregation(aggregation);
            return (
              <AggregationConfigComponent
                key={index}
                aggregation={aggregation}
                availableColumns={availableColumns}
                onUpdate={(updatedAggregation) => updateAggregation(index, updatedAggregation)}
                onRemove={() => removeAggregation(index)}
                canRemove={aggregations.length > 1}
                errors={aggregationErrors}
              />
            );
          })}
        </div>

        {/* 预览结果 */}
        {hasValidConfig && previewGroups !== null && (
          <div className="bg-blue-50 p-3 rounded border">
            <div className="text-sm font-medium text-blue-800">预览结果</div>
            <div className="text-sm text-blue-600">
              预计将生成 {previewGroups} 个分组
            </div>
            <div className="text-xs text-blue-500 mt-1">
              分组列：{groupColumns.join(', ')}
            </div>
          </div>
        )}

        {/* 配置说明 */}
        {groupColumns.length > 0 && (
          <div className="bg-gray-50 p-3 rounded border">
            <div className="text-sm font-medium text-gray-700">分组说明</div>
            <div className="text-sm text-gray-600">
              数据将按照 <strong>{groupColumns.join(' + ')}</strong> 进行分组，
              每个分组将应用指定的聚合函数计算结果。
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
          className="w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-sm"
          title="分组后数据集输出"
        />
      </div>
    </div>
  );
};