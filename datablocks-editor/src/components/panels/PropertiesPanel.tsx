import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Checkbox } from '../ui/Checkbox';
import { Textarea } from '../ui/Textarea';
import { useAppStore } from '../../stores/appStore';
import { getNodeDefinition } from '../../utils/nodeRegistry';
import { getNodeConfigSchema } from '../../utils/nodeConfigs';
import type { 
  NodeInstance, 
  NodeConfigSchema, 
  ValidationResult, 
  ValidationError,
  ValidationRule,
  Dataset 
} from '../../types';

interface PropertiesPanelProps {
  selectedNode?: NodeInstance;
}

interface ConfigFieldProps {
  fieldKey: string;
  fieldSchema: NodeConfigSchema[string];
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
  availableColumns?: string[];
  inputData?: Dataset | null;
}

interface ConfigSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

// 配置节组件
const ConfigSection: React.FC<ConfigSectionProps> = ({
  title,
  description,
  children,
  collapsible = false,
  defaultExpanded = true,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (!collapsible) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-gray-100">{title}</h3>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <div className="space-y-3">{children}</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div>
          <h3 className="text-sm font-medium text-gray-100">{title}</h3>
          {description && (
            <p className="text-xs text-gray-400 mt-1">{description}</p>
          )}
        </div>
        <span className="text-gray-400">
          {expanded ? '▼' : '▶'}
        </span>
      </button>
      {expanded && (
        <div className="space-y-3 pl-2 border-l border-gray-600">
          {children}
        </div>
      )}
    </div>
  );
};

// 配置字段组件
const ConfigField: React.FC<ConfigFieldProps> = ({
  fieldKey,
  fieldSchema,
  value,
  onChange,
  error,
  disabled = false,
  availableColumns = [],
  inputData,
}) => {
  const { type, label, description, options, defaultValue } = fieldSchema;

  // 动态生成选项（如果字段需要列选择）
  const getFieldOptions = useCallback(() => {
    if (options) return options;
    
    // 如果字段名包含 'column' 或 'field'，自动提供列选项
    if (fieldKey.toLowerCase().includes('column') || fieldKey.toLowerCase().includes('field')) {
      return availableColumns.map(col => ({ label: col, value: col }));
    }
    
    return [];
  }, [options, fieldKey, availableColumns]);

  const renderField = () => {
    switch (type) {
      case 'string':
        return (
          <Input
            label={label}
            value={value || defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={description}
            disabled={disabled}
            error={error}
          />
        );

      case 'number':
        return (
          <Input
            label={label}
            type="number"
            value={value !== undefined ? value : (defaultValue || '')}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={description}
            disabled={disabled}
            error={error}
          />
        );

      case 'boolean':
        return (
          <Checkbox
            label={label}
            checked={value !== undefined ? value : (defaultValue || false)}
            onChange={onChange}
            disabled={disabled}
            description={description}
          />
        );

      case 'select':
        const selectOptions = getFieldOptions();
        return (
          <Select
            label={label}
            value={value || defaultValue || ''}
            onChange={onChange}
            options={selectOptions}
            placeholder={description}
            disabled={disabled}
            error={error}
          />
        );

      case 'multiselect':
        const multiselectOptions = getFieldOptions();
        return (
          <div>
            <label className="block text-sm font-medium text-gray-100 mb-2">
              {label}
            </label>
            {description && (
              <p className="text-xs text-gray-400 mb-2">{description}</p>
            )}
            <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-600 rounded p-2 bg-gray-800">
              {multiselectOptions.map((option) => (
                <Checkbox
                  key={option.value}
                  label={option.label}
                  checked={(value || []).includes(option.value)}
                  onChange={(checked) => {
                    const currentValues = value || [];
                    if (checked) {
                      onChange([...currentValues, option.value]);
                    } else {
                      onChange(currentValues.filter((v: any) => v !== option.value));
                    }
                  }}
                  disabled={disabled}
                />
              ))}
            </div>
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>
        );

      case 'object':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-100 mb-2">
              {label}
            </label>
            {description && (
              <p className="text-xs text-gray-400 mb-2">{description}</p>
            )}
            <Textarea
              value={JSON.stringify(value || defaultValue || {}, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  onChange(parsed);
                } catch {
                  // 保持原值，不更新 - 可以考虑显示解析错误
                  console.warn(`Invalid JSON for field ${fieldKey}:`, e.target.value);
                }
              }}
              placeholder={inputData ? "基于输入数据配置JSON对象" : "输入有效的JSON对象"}
              rows={4}
              disabled={disabled}
            />
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
          </div>
        );

      default:
        return (
          <Input
            label={label}
            value={value || defaultValue || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder={description}
            disabled={disabled}
            error={error}
          />
        );
    }
  };

  return (
    <div className="space-y-1">
      {renderField()}
    </div>
  );
};

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  selectedNode,
}) => {
  const { updateNode, nodeOutputs } = useAppStore();
  const [nodeConfig, setNodeConfig] = useState<Record<string, any>>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [inputData, setInputData] = useState<Dataset | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(false);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // 获取节点定义
  const nodeDefinition = useMemo(() => {
    if (!selectedNode) return null;
    return getNodeDefinition(selectedNode.type);
  }, [selectedNode]);

  // 获取配置模式
  const configSchema = useMemo(() => {
    return nodeDefinition?.configSchema || getNodeConfigSchema(selectedNode?.type || '');
  }, [nodeDefinition, selectedNode?.type]);

  // 获取输入数据和可用列
  useEffect(() => {
    if (selectedNode) {
      // 尝试从节点输出中获取输入数据
      const inputNodeIds = selectedNode.data?.inputConnections || [];
      if (inputNodeIds.length > 0) {
        const firstInputData = nodeOutputs.get(inputNodeIds[0]);
        if (firstInputData && firstInputData.columns) {
          setInputData(firstInputData);
          setAvailableColumns(firstInputData.columns);
        }
      } else {
        // 使用示例列作为后备
        const mockColumns = getDefaultColumns(selectedNode.type);
        setAvailableColumns(mockColumns);
        setInputData(null);
      }
    }
  }, [selectedNode, nodeOutputs]);

  // 验证单个字段
  const validateField = useCallback((
    fieldKey: string, 
    value: any, 
    rules: ValidationRule[]
  ): string | null => {
    for (const rule of rules) {
      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            return rule.message || `${fieldKey} is required`;
          }
          // 对于数组类型，检查是否为空数组
          if (Array.isArray(value) && value.length === 0) {
            return rule.message || `${fieldKey} must have at least one item`;
          }
          break;
        case 'min':
          if (typeof value === 'number' && value < rule.value) {
            return rule.message || `${fieldKey} must be at least ${rule.value}`;
          }
          if (typeof value === 'string' && value.length < rule.value) {
            return rule.message || `${fieldKey} must be at least ${rule.value} characters`;
          }
          if (Array.isArray(value) && value.length < rule.value) {
            return rule.message || `${fieldKey} must have at least ${rule.value} items`;
          }
          break;
        case 'max':
          if (typeof value === 'number' && value > rule.value) {
            return rule.message || `${fieldKey} must be at most ${rule.value}`;
          }
          if (typeof value === 'string' && value.length > rule.value) {
            return rule.message || `${fieldKey} must be at most ${rule.value} characters`;
          }
          if (Array.isArray(value) && value.length > rule.value) {
            return rule.message || `${fieldKey} must have at most ${rule.value} items`;
          }
          break;
        case 'pattern':
          if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
            return rule.message || `${fieldKey} format is invalid`;
          }
          break;
        case 'custom':
          if (rule.validator && !rule.validator(value)) {
            return rule.message || `${fieldKey} validation failed`;
          }
          break;
      }
    }
    return null;
  }, []);

  // 验证所有配置
  const validateConfig = useCallback((config: Record<string, any>): ValidationResult => {
    const errors: ValidationError[] = [];
    const fieldErrors: Record<string, string> = {};

    // 单字段验证
    Object.entries(configSchema).forEach(([fieldKey, fieldSchema]) => {
      if (fieldSchema.validation) {
        const error = validateField(fieldKey, config[fieldKey], fieldSchema.validation);
        if (error) {
          errors.push({ field: fieldKey, message: error });
          fieldErrors[fieldKey] = error;
        }
      }
    });

    // 跨字段验证
    if (selectedNode) {
      switch (selectedNode.type) {
        case 'chart':
          // 图表节点特殊验证
          if (config.xAxisColumn && config.yAxisColumns?.includes(config.xAxisColumn)) {
            const error = 'X-axis column cannot be the same as Y-axis column';
            errors.push({ field: 'xAxisColumn', message: error });
            fieldErrors['xAxisColumn'] = error;
          }
          
          if (config.chartType === 'pie' && config.yAxisColumns?.length > 1) {
            const error = 'Pie chart can only have one Y-axis column';
            errors.push({ field: 'yAxisColumns', message: error });
            fieldErrors['yAxisColumns'] = error;
          }
          break;
          
        case 'filter':
          // 过滤节点验证
          if (config.conditions && Array.isArray(config.conditions)) {
            const duplicateColumns = config.conditions
              .map((c: any) => c.column)
              .filter((col: string, index: number, arr: string[]) => 
                col && arr.indexOf(col) !== index
              );
            
            if (duplicateColumns.length > 0) {
              const error = `Duplicate filter conditions for columns: ${duplicateColumns.join(', ')}`;
              errors.push({ field: 'conditions', message: error });
              fieldErrors['conditions'] = error;
            }
          }
          break;
          
        case 'group':
          // 分组节点验证
          if (config.groupColumns && config.aggregations) {
            const groupCols = config.groupColumns || [];
            const aggCols = (config.aggregations || []).map((agg: any) => agg.column);
            const overlap = groupCols.filter((col: string) => aggCols.includes(col));
            
            if (overlap.length > 0) {
              const error = `Columns cannot be both grouped and aggregated: ${overlap.join(', ')}`;
              errors.push({ field: 'aggregations', message: error });
              fieldErrors['aggregations'] = error;
            }
          }
          break;
      }
    }

    setValidationErrors(fieldErrors);
    return { valid: errors.length === 0, errors };
  }, [configSchema, validateField, selectedNode]);

  // 生成预览数据
  const generatePreview = useCallback((config: Record<string, any>) => {
    if (!selectedNode) return;

    try {
      // 根据节点类型生成预览
      switch (selectedNode.type) {
        case 'filter':
          if (config.conditions && config.conditions.length > 0) {
            const validConditions = config.conditions.filter((c: any) => c.column && c.operator);
            if (validConditions.length > 0) {
              // 模拟过滤结果
              const baseCount = inputData?.rows.length || 100;
              const filterComplexity = validConditions.length;
              const estimatedRows = Math.max(1, Math.floor(baseCount * (0.8 - filterComplexity * 0.1)));
              setPreviewData({
                type: 'count',
                message: `预计过滤后保留 ${estimatedRows} 行数据`,
                originalCount: baseCount,
                filteredCount: estimatedRows,
              });
            }
          } else {
            setPreviewData({
              type: 'info',
              message: '请添加过滤条件以查看预览',
            });
          }
          break;
        case 'sort':
          if (config.column) {
            setPreviewData({
              type: 'info',
              message: `将按 ${config.column} 列进行${config.direction === 'desc' ? '降序' : '升序'}排序`,
            });
          } else {
            setPreviewData({
              type: 'info',
              message: '请选择排序列以查看预览',
            });
          }
          break;
        case 'chart':
          if (config.xAxisColumn && config.yAxisColumns?.length > 0) {
            const chartTypeLabel = config.chartType === 'bar' ? '柱状图' : 
                                 config.chartType === 'line' ? '折线图' : 
                                 config.chartType === 'scatter' ? '散点图' : '图表';
            setPreviewData({
              type: 'info',
              message: `${chartTypeLabel}: X轴=${config.xAxisColumn}, Y轴=${config.yAxisColumns.join(', ')}`,
            });
          } else {
            setPreviewData({
              type: 'info',
              message: '请配置X轴和Y轴字段以查看预览',
            });
          }
          break;
        case 'group':
          if (config.groupColumns?.length > 0) {
            const groupCount = Math.ceil((inputData?.rows.length || 100) / 5);
            setPreviewData({
              type: 'count',
              message: `预计生成 ${groupCount} 个分组`,
              originalCount: inputData?.rows.length || 100,
              filteredCount: groupCount,
            });
          } else {
            setPreviewData({
              type: 'info',
              message: '请选择分组列以查看预览',
            });
          }
          break;
        default:
          // 对于其他节点类型，显示基本配置信息
          const configuredFields = Object.entries(config).filter(([key, value]) => 
            key !== 'name' && value !== undefined && value !== '' && value !== null
          ).length;
          
          if (configuredFields > 0) {
            setPreviewData({
              type: 'info',
              message: `已配置 ${configuredFields} 个参数`,
            });
          } else {
            setPreviewData(null);
          }
      }
    } catch (error) {
      console.error('Preview generation error:', error);
      setPreviewData({
        type: 'error',
        message: '预览生成失败',
      });
    }
  }, [selectedNode, inputData]);

  // 处理配置变更
  const handleConfigChange = useCallback((key: string, value: any) => {
    const newConfig = { ...nodeConfig, [key]: value };
    setNodeConfig(newConfig);
    setHasUnsavedChanges(true);

    // 实时验证
    if (configSchema[key]?.validation) {
      const error = validateField(key, value, configSchema[key].validation);
      setValidationErrors(prev => ({
        ...prev,
        [key]: error || '',
      }));
    }

    // 实时预览（如果支持）
    generatePreview(newConfig);

    // 自动保存（如果启用且没有验证错误）
    if (autoSaveEnabled && selectedNode) {
      const validation = validateConfig(newConfig);
      if (validation.valid) {
        setTimeout(() => {
          const { name, ...config } = newConfig;
          updateNode(selectedNode.id, {
            data: { ...selectedNode.data, name },
            config,
          });
          setLastAutoSave(new Date());
          setHasUnsavedChanges(false);
        }, 1000); // 1秒延迟自动保存
      }
    }
  }, [nodeConfig, configSchema, validateField, generatePreview, autoSaveEnabled, selectedNode, validateConfig, updateNode]);

  // 更新本地配置当选中节点改变时
  useEffect(() => {
    if (selectedNode) {
      const initialConfig = {
        name: selectedNode.data?.name || '',
        ...selectedNode.config,
      };
      
      // 应用默认值
      Object.entries(configSchema).forEach(([key, schema]) => {
        if ((initialConfig as any)[key] === undefined && schema.defaultValue !== undefined) {
          (initialConfig as any)[key] = schema.defaultValue;
        }
      });
      
      setNodeConfig(initialConfig);
      setHasUnsavedChanges(false);
      setValidationErrors({});
    } else {
      setNodeConfig({});
      setValidationErrors({});
      setHasUnsavedChanges(false);
    }
  }, [selectedNode, configSchema]);

  // 应用配置
  const applyConfig = useCallback(() => {
    if (!selectedNode) return;

    setIsValidating(true);
    const validation = validateConfig(nodeConfig);
    
    if (validation.valid) {
      const { name, ...config } = nodeConfig;
      
      updateNode(selectedNode.id, {
        data: { ...selectedNode.data, name },
        config,
      });
      
      setHasUnsavedChanges(false);
      setValidationErrors({});
      
      // 保存配置历史记录到localStorage
      try {
        const configHistory = JSON.parse(localStorage.getItem('nodeConfigHistory') || '{}');
        configHistory[selectedNode.type] = { ...config, name };
        localStorage.setItem('nodeConfigHistory', JSON.stringify(configHistory));
      } catch (error) {
        console.warn('Failed to save config history:', error);
      }
    }
    
    setIsValidating(false);
  }, [selectedNode, nodeConfig, validateConfig, updateNode]);

  // 重置配置
  const resetConfig = useCallback(() => {
    if (selectedNode) {
      const resetConfig = {
        name: selectedNode.data?.name || '',
        ...selectedNode.config,
      };
      setNodeConfig(resetConfig);
      setHasUnsavedChanges(false);
      setValidationErrors({});
      setPreviewData(null);
    }
  }, [selectedNode]);

  // 恢复默认值
  const restoreDefaults = useCallback(() => {
    const defaultConfig: Record<string, any> = { name: selectedNode?.data?.name || '' };
    
    Object.entries(configSchema).forEach(([key, schema]) => {
      if (schema.defaultValue !== undefined) {
        defaultConfig[key] = schema.defaultValue;
      }
    });
    
    setNodeConfig(defaultConfig);
    setHasUnsavedChanges(true);
    setValidationErrors({});
    setPreviewData(null);
  }, [selectedNode, configSchema]);

  // 从历史记录恢复配置
  const restoreFromHistory = useCallback(() => {
    if (!selectedNode) return;
    
    try {
      const configHistory = JSON.parse(localStorage.getItem('nodeConfigHistory') || '{}');
      const historicalConfig = configHistory[selectedNode.type];
      
      if (historicalConfig) {
        setNodeConfig({ name: selectedNode.data?.name || '', ...historicalConfig });
        setHasUnsavedChanges(true);
        setValidationErrors({});
        setPreviewData(null);
      }
    } catch (error) {
      console.warn('Failed to restore config from history:', error);
    }
  }, [selectedNode]);

  // 保存配置为模板
  const saveAsTemplate = useCallback(() => {
    if (!selectedNode) return;
    
    const templateName = prompt('Enter template name:');
    if (!templateName) return;
    
    try {
      const templates = JSON.parse(localStorage.getItem('nodeConfigTemplates') || '{}');
      if (!templates[selectedNode.type]) {
        templates[selectedNode.type] = {};
      }
      
      const { name, ...config } = nodeConfig;
      templates[selectedNode.type][templateName] = config;
      localStorage.setItem('nodeConfigTemplates', JSON.stringify(templates));
      
      alert(`Template "${templateName}" saved successfully!`);
    } catch (error) {
      console.warn('Failed to save template:', error);
      alert('Failed to save template');
    }
  }, [selectedNode, nodeConfig]);

  // 加载配置模板
  const loadTemplate = useCallback(() => {
    if (!selectedNode) return;
    
    try {
      const templates = JSON.parse(localStorage.getItem('nodeConfigTemplates') || '{}');
      const nodeTemplates = templates[selectedNode.type];
      
      if (!nodeTemplates || Object.keys(nodeTemplates).length === 0) {
        alert('No templates found for this node type');
        return;
      }
      
      const templateNames = Object.keys(nodeTemplates);
      const selectedTemplate = prompt(`Select template:\n${templateNames.map((name, i) => `${i + 1}. ${name}`).join('\n')}\n\nEnter template name:`);
      
      if (selectedTemplate && nodeTemplates[selectedTemplate]) {
        setNodeConfig({ name: selectedNode.data?.name || '', ...nodeTemplates[selectedTemplate] });
        setHasUnsavedChanges(true);
        setValidationErrors({});
        setPreviewData(null);
      }
    } catch (error) {
      console.warn('Failed to load template:', error);
      alert('Failed to load template');
    }
  }, [selectedNode]);

  // 渲染配置字段
  const renderConfigFields = () => {
    const configEntries = Object.entries(configSchema);
    
    if (configEntries.length === 0) {
      return (
        <div className="text-sm text-gray-400 text-center py-8">
          <div className="text-2xl mb-2">⚙️</div>
          <div>此节点类型暂无可配置属性</div>
        </div>
      );
    }

    // 按类别分组配置字段
    const groupedFields = groupConfigFields(configEntries);
    
    return (
      <div className="space-y-6">
        {Object.entries(groupedFields).map(([groupName, fields]) => (
          <ConfigSection
            key={groupName}
            title={getGroupTitle(groupName)}
            description={getGroupDescription(groupName)}
            collapsible={groupName !== 'basic'}
            defaultExpanded={groupName === 'basic' || fields.length <= 3}
          >
            {fields.map(([fieldKey, fieldSchema]) => (
              <ConfigField
                key={fieldKey}
                fieldKey={fieldKey}
                fieldSchema={fieldSchema}
                value={nodeConfig[fieldKey]}
                onChange={(value) => handleConfigChange(fieldKey, value)}
                error={validationErrors[fieldKey]}
                disabled={isValidating}
                availableColumns={availableColumns}
                inputData={inputData}
              />
            ))}
          </ConfigSection>
        ))}
      </div>
    );
  };

  if (!selectedNode) {
    return (
      <div className="h-full flex flex-col p-4">
        <h2 className="text-lg font-medium mb-4 text-gray-100">Properties</h2>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-4xl mb-3">⚙️</div>
            <p>Select a node to configure its properties</p>
          </div>
        </div>
      </div>
    );
  }

  const hasErrors = Object.values(validationErrors).some(error => error);
  const canApply = hasUnsavedChanges && !hasErrors;

  return (
    <div className="h-full flex flex-col p-4">
      {/* Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-100">Properties</h2>
            <p className="text-sm text-gray-400 mt-1">
              {nodeDefinition?.name || selectedNode.type} node
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastAutoSave && autoSaveEnabled && (
              <div className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                Auto-saved {lastAutoSave.toLocaleTimeString()}
              </div>
            )}
            {hasUnsavedChanges && !autoSaveEnabled && (
              <div className="text-xs text-yellow-400 bg-yellow-400/10 px-2 py-1 rounded">
                Unsaved changes
              </div>
            )}
          </div>
        </div>
        
        {/* Auto-save toggle */}
        <div className="flex items-center justify-between mt-2 p-2 bg-gray-800 rounded">
          <div>
            <span className="text-sm text-gray-300">Auto-save</span>
            <p className="text-xs text-gray-500">Automatically save changes after 1 second</p>
          </div>
          <Checkbox
            checked={autoSaveEnabled}
            onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            label=""
          />
        </div>
        
        {nodeDefinition?.description && (
          <p className="text-xs text-gray-500 mt-2 p-2 bg-gray-800 rounded">
            {nodeDefinition.description}
          </p>
        )}
      </div>

      {/* Configuration Fields */}
      <div className="flex-1 overflow-y-auto">
        {renderConfigFields()}
      </div>

      {/* Preview Section */}
      {previewData && (
        <div className="mt-4 p-3 rounded border border-gray-600">
          <div className="flex items-start gap-2">
            <span className="text-sm">
              {previewData.type === 'error' ? '❌' : 
               previewData.type === 'count' ? '📊' : 'ℹ️'}
            </span>
            <div className="flex-1">
              <div className={`text-sm ${
                previewData.type === 'error' ? 'text-red-400' :
                previewData.type === 'count' ? 'text-blue-400' : 'text-gray-300'
              }`}>
                {previewData.message}
              </div>
              {previewData.type === 'count' && (
                <div className="text-xs text-gray-500 mt-1">
                  {previewData.originalCount} → {previewData.filteredCount} rows
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {hasErrors && (
        <div className="mt-4 p-3 bg-red-900/20 border border-red-700 rounded">
          <div className="text-sm text-red-400 font-medium mb-2">Configuration Errors:</div>
          <div className="space-y-1">
            {Object.entries(validationErrors)
              .filter(([, error]) => error)
              .map(([field, error]) => (
                <div key={field} className="text-xs text-red-300">
                  • {field}: {error}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex gap-2">
          <Button 
            variant="primary" 
            size="sm" 
            className="flex-1"
            onClick={applyConfig}
            disabled={!canApply || isValidating}
          >
            {isValidating ? 'Applying...' : 'Apply'}
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            className="flex-1"
            onClick={resetConfig}
            disabled={!hasUnsavedChanges || isValidating}
          >
            Reset
          </Button>
        </div>
        
        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button 
            variant="secondary" 
            size="sm"
            onClick={restoreDefaults}
            disabled={isValidating}
          >
            Restore Defaults
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={restoreFromHistory}
            disabled={isValidating}
            title="Restore configuration from previous similar node"
          >
            From History
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={saveAsTemplate}
            disabled={isValidating || !hasUnsavedChanges}
            title="Save current configuration as template"
          >
            Save Template
          </Button>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={loadTemplate}
            disabled={isValidating}
            title="Load configuration from saved template"
          >
            Load Template
          </Button>
        </div>
      </div>
    </div>
  );
};

// Helper functions for configuration management
const getDefaultColumns = (nodeType?: string): string[] => {
  switch (nodeType) {
    case 'chart':
      return ['date', 'product', 'sales', 'quantity', 'revenue'];
    case 'filter':
    case 'sort':
    case 'group':
      return ['id', 'name', 'age', 'city', 'salary', 'department'];
    default:
      return ['column1', 'column2', 'column3'];
  }
};

const groupConfigFields = (configEntries: [string, NodeConfigSchema[string]][]): Record<string, [string, NodeConfigSchema[string]][]> => {
  const groups: Record<string, [string, NodeConfigSchema[string]][]> = {
    basic: [],
    data: [],
    display: [],
    advanced: [],
  };

  configEntries.forEach(([key, schema]) => {
    if (key === 'name') {
      groups.basic.push([key, schema]);
    } else if (key.includes('column') || key.includes('field') || key.includes('condition')) {
      groups.data.push([key, schema]);
    } else if (key.includes('title') || key.includes('legend') || key.includes('color') || key.includes('theme')) {
      groups.display.push([key, schema]);
    } else {
      groups.advanced.push([key, schema]);
    }
  });

  // Remove empty groups
  Object.keys(groups).forEach(groupName => {
    if (groups[groupName].length === 0) {
      delete groups[groupName];
    }
  });

  return groups;
};

const getGroupTitle = (groupName: string): string => {
  switch (groupName) {
    case 'basic': return 'Basic Settings';
    case 'data': return 'Data Configuration';
    case 'display': return 'Display Options';
    case 'advanced': return 'Advanced Settings';
    default: return groupName;
  }
};

const getGroupDescription = (groupName: string): string => {
  switch (groupName) {
    case 'basic': return 'Essential node configuration';
    case 'data': return 'Data processing and field selection';
    case 'display': return 'Visual appearance and styling';
    case 'advanced': return 'Advanced configuration options';
    default: return '';
  }
};