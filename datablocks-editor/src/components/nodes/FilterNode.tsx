import React, { useCallback, useState, useEffect } from 'react';
import type { NodeInstance, FilterCondition } from '../../types';

interface FilterNodeProps {
  node: NodeInstance;
  onConfigChange: (config: Record<string, any>) => void;
}

// 可用的过滤操作符
const FILTER_OPERATORS = [
  { value: 'equals', label: '等于', needsValue: true, category: 'comparison' },
  { value: 'not_equals', label: '不等于', needsValue: true, category: 'comparison' },
  { value: 'greater_than', label: '大于', needsValue: true, category: 'comparison' },
  { value: 'greater_than_or_equal', label: '大于等于', needsValue: true, category: 'comparison' },
  { value: 'less_than', label: '小于', needsValue: true, category: 'comparison' },
  { value: 'less_than_or_equal', label: '小于等于', needsValue: true, category: 'comparison' },
  { value: 'contains', label: '包含', needsValue: true, category: 'text' },
  { value: 'not_contains', label: '不包含', needsValue: true, category: 'text' },
  { value: 'starts_with', label: '开始于', needsValue: true, category: 'text' },
  { value: 'ends_with', label: '结束于', needsValue: true, category: 'text' },
  { value: 'in', label: '在列表中', needsValue: true, category: 'list' },
  { value: 'not_in', label: '不在列表中', needsValue: true, category: 'list' },
  { value: 'is_null', label: '为空', needsValue: false, category: 'null' },
  { value: 'is_not_null', label: '不为空', needsValue: false, category: 'null' },
];

// 逻辑操作符
const LOGICAL_OPERATORS = [
  { value: 'and', label: '且 (AND)' },
  { value: 'or', label: '或 (OR)' },
];

interface FilterConditionProps {
  condition: FilterCondition;
  availableColumns: string[];
  onUpdate: (condition: FilterCondition) => void;
  onRemove: () => void;
  canRemove: boolean;
  errors?: string[];
}

const FilterConditionComponent: React.FC<FilterConditionProps> = ({
  condition,
  availableColumns,
  onUpdate,
  onRemove,
  canRemove,
  errors = [],
}) => {
  const selectedOperator = FILTER_OPERATORS.find(op => op.value === condition.operator);
  const needsValue = selectedOperator?.needsValue ?? true;
  const hasErrors = errors.length > 0;

  // 根据操作符类型提供不同的输入提示
  const getValuePlaceholder = () => {
    if (!selectedOperator) return '输入值';
    
    switch (selectedOperator.category) {
      case 'list':
        return '输入值，用逗号分隔（如：值1,值2,值3）';
      case 'comparison':
        return '输入数值或文本';
      case 'text':
        return '输入文本';
      default:
        return '输入值';
    }
  };

  return (
    <div className={`p-3 rounded border ${hasErrors ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
      <div className="flex items-center gap-2">
        {/* 列选择 */}
        <select
          value={condition.column || ''}
          onChange={(e) => onUpdate({ ...condition, column: e.target.value })}
          className={`px-2 py-1 text-sm border rounded focus:ring-blue-500 focus:border-blue-500 ${
            !condition.column && hasErrors ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">选择列</option>
          {availableColumns.map(column => (
            <option key={column} value={column}>{column}</option>
          ))}
        </select>

        {/* 操作符选择 */}
        <select
          value={condition.operator || ''}
          onChange={(e) => onUpdate({ ...condition, operator: e.target.value as any })}
          className={`px-2 py-1 text-sm border rounded focus:ring-blue-500 focus:border-blue-500 ${
            !condition.operator && hasErrors ? 'border-red-300' : 'border-gray-300'
          }`}
        >
          <option value="">选择操作</option>
          {FILTER_OPERATORS.map(op => (
            <option key={op.value} value={op.value}>{op.label}</option>
          ))}
        </select>

        {/* 值输入 */}
        {needsValue && (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => onUpdate({ ...condition, value: e.target.value })}
            placeholder={getValuePlaceholder()}
            className={`px-2 py-1 text-sm border rounded focus:ring-blue-500 focus:border-blue-500 flex-1 ${
              needsValue && !condition.value && hasErrors ? 'border-red-300' : 'border-gray-300'
            }`}
          />
        )}

        {/* 删除按钮 */}
        {canRemove && (
          <button
            onClick={onRemove}
            className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
            title="删除条件"
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

      {/* 操作符说明 */}
      {selectedOperator && selectedOperator.category === 'list' && (
        <div className="mt-2 text-xs text-gray-500">
          💡 提示：使用逗号分隔多个值，例如：北京,上海,广州
        </div>
      )}
    </div>
  );
};

export const FilterNode: React.FC<FilterNodeProps> = ({
  node,
  onConfigChange,
}) => {
  const [conditions, setConditions] = useState<FilterCondition[]>([]);
  const [logicalOperator, setLogicalOperator] = useState<'and' | 'or'>('and');
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [previewCount, setPreviewCount] = useState<number | null>(null);

  const handleConfigChange = useCallback((key: string, value: any) => {
    onConfigChange({
      ...node.config,
      [key]: value,
    });
  }, [node.config, onConfigChange]);

  // 初始化条件
  useEffect(() => {
    if (node.config.conditions && Array.isArray(node.config.conditions)) {
      setConditions(node.config.conditions);
    } else if (node.config.column && node.config.operator) {
      // 兼容旧的单条件格式
      setConditions([{
        column: node.config.column,
        operator: node.config.operator,
        value: node.config.value,
        type: 'string',
      }]);
    } else if (conditions.length === 0) {
      // 默认添加一个空条件
      setConditions([{
        column: '',
        operator: 'equals',
        value: '',
        type: 'string',
      }]);
    }

    if (node.config.logicalOperator) {
      setLogicalOperator(node.config.logicalOperator);
    }
  }, [node.config]);

  // 更新配置
  useEffect(() => {
    handleConfigChange('conditions', conditions);
    handleConfigChange('logicalOperator', logicalOperator);
  }, [conditions, logicalOperator, handleConfigChange]);

  // 从输入数据中提取可用列
  useEffect(() => {
    // 尝试从节点的输入数据中获取列信息
    if (node.data && node.data.inputData && node.data.inputData.columns) {
      setAvailableColumns(node.data.inputData.columns);
    } else {
      // 使用示例列作为后备
      const mockColumns = ['id', 'name', 'age', 'city', 'salary', 'department'];
      setAvailableColumns(mockColumns);
    }
  }, [node.data]);

  const addCondition = useCallback(() => {
    setConditions(prev => [...prev, {
      column: '',
      operator: 'equals',
      value: '',
      type: 'string',
    }]);
  }, []);

  const updateCondition = useCallback((index: number, condition: FilterCondition) => {
    setConditions(prev => prev.map((c, i) => i === index ? condition : c));
  }, []);

  const removeCondition = useCallback((index: number) => {
    setConditions(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 验证条件
  const validateCondition = useCallback((condition: FilterCondition): string[] => {
    const errors: string[] = [];
    
    if (!condition.column) {
      errors.push('请选择列');
    }
    
    if (!condition.operator) {
      errors.push('请选择操作符');
    }
    
    const selectedOperator = FILTER_OPERATORS.find(op => op.value === condition.operator);
    if (selectedOperator?.needsValue && (!condition.value && condition.value !== 0)) {
      errors.push('请输入值');
    }
    
    // 验证列表操作符的值格式
    if ((condition.operator === 'in' || condition.operator === 'not_in') && condition.value) {
      const values = condition.value.toString().split(',').map((v: string) => v.trim());
      if (values.length === 0 || values.every((v: string) => !v)) {
        errors.push('请输入有效的值列表（用逗号分隔）');
      }
    }
    
    return errors;
  }, []);

  // 计算预览结果
  const calculatePreview = useCallback(() => {
    const validConditions = conditions.filter(c => {
      const errors = validateCondition(c);
      return errors.length === 0;
    });
    
    if (validConditions.length > 0) {
      // 模拟基于条件复杂度的过滤结果
      const baseCount = 100;
      const filterFactor = Math.max(0.1, 1 - (validConditions.length * 0.2));
      const estimatedCount = Math.floor(baseCount * filterFactor);
      setPreviewCount(estimatedCount);
    } else {
      setPreviewCount(null);
    }
  }, [conditions, validateCondition]);

  useEffect(() => {
    calculatePreview();
  }, [calculatePreview]);

  const hasValidConditions = conditions.some(c => c.column && c.operator);

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[400px]">
      {/* Node Header */}
      <div className="flex items-center gap-2 p-3 bg-green-50 border-b border-gray-200 rounded-t-lg">
        <span className="text-lg">🔍</span>
        <span className="font-medium text-gray-900">数据过滤</span>
        {node.status === 'processing' && (
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
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

      {/* Filter Configuration */}
      <div className="p-4 space-y-4">
        {/* 多条件逻辑操作符 */}
        {conditions.length > 1 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              条件关系
            </label>
            <select
              value={logicalOperator}
              onChange={(e) => setLogicalOperator(e.target.value as 'and' | 'or')}
              className="px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
            >
              {LOGICAL_OPERATORS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
          </div>
        )}

        {/* 过滤条件列表 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              过滤条件
            </label>
            <button
              onClick={addCondition}
              className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
            >
              + 添加条件
            </button>
          </div>

          {conditions.map((condition, index) => {
            const conditionErrors = validateCondition(condition);
            return (
              <div key={index}>
                {index > 0 && (
                  <div className="text-center py-1">
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {logicalOperator === 'and' ? '且' : '或'}
                    </span>
                  </div>
                )}
                <FilterConditionComponent
                  condition={condition}
                  availableColumns={availableColumns}
                  onUpdate={(updatedCondition) => updateCondition(index, updatedCondition)}
                  onRemove={() => removeCondition(index)}
                  canRemove={conditions.length > 1}
                  errors={conditionErrors}
                />
              </div>
            );
          })}
        </div>

        {/* 预览结果 */}
        {hasValidConditions && previewCount !== null && (
          <div className="bg-blue-50 p-3 rounded border">
            <div className="text-sm font-medium text-blue-800">预览结果</div>
            <div className="text-sm text-blue-600">
              预计过滤后将保留 {previewCount} 行数据
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
          className="w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"
          title="过滤后数据集输出"
        />
      </div>
    </div>
  );
};