import {
  NodeDefinition,
  NodeCategory,
  Dataset,
  ValidationResult,
} from '../types';
import { nodeRegistry } from './nodeRegistry';
import { createDatasetFromArray } from './dataUtils';

/**
 * Example node definitions and usage demonstrations
 */

// Example: File Input Node Definition
export const fileInputNodeDefinition: NodeDefinition = {
  id: 'file-input-v1',
  type: 'file-input',
  category: NodeCategory.INPUT,
  name: '文件输入',
  description: '从文件加载数据（支持 CSV、JSON、Excel）',
  version: '1.0.0',
  inputs: [],
  outputs: [
    {
      id: 'data',
      name: '数据',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '加载的数据集',
    },
  ],
  configSchema: {
    fileType: {
      type: 'select',
      label: '文件类型',
      description: '选择要加载的文件类型',
      required: true,
      defaultValue: 'csv',
      options: [
        { label: 'CSV', value: 'csv' },
        { label: 'JSON', value: 'json' },
        { label: 'Excel', value: 'excel' },
      ],
    },
    hasHeader: {
      type: 'boolean',
      label: '包含标题行',
      description: '文件第一行是否为列标题',
      defaultValue: true,
    },
    delimiter: {
      type: 'string',
      label: '分隔符',
      description: 'CSV 文件的分隔符',
      defaultValue: ',',
      validation: [
        {
          type: 'required',
          message: '分隔符不能为空',
        },
      ],
    },
  },
  processor: {
    execute: async (inputs, config) => {
      // Mock file loading - in real implementation this would handle file upload
      const mockData = [
        ['Name', 'Age', 'City'],
        ['张三', 25, '北京'],
        ['李四', 30, '上海'],
        ['王五', 28, '广州'],
      ];

      const hasHeader = config.hasHeader ?? true;
      const columns = hasHeader ? mockData[0] as string[] : undefined;
      const rows = hasHeader ? mockData.slice(1) : mockData;

      return createDatasetFromArray(rows, columns);
    },
    validate: (inputs, config): ValidationResult => {
      const errors = [];

      if (!config.fileType) {
        errors.push({
          field: 'fileType',
          message: '请选择文件类型',
          code: 'REQUIRED_FIELD',
        });
      }

      if (config.fileType === 'csv' && !config.delimiter) {
        errors.push({
          field: 'delimiter',
          message: 'CSV 文件需要指定分隔符',
          code: 'REQUIRED_FIELD',
        });
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },
  },
  icon: '📁',
  color: '#3b82f6',
  tags: ['input', 'file', 'data'],
};

// Example: Filter Node Definition
export const filterNodeDefinition: NodeDefinition = {
  id: 'filter-v1',
  type: 'filter',
  category: NodeCategory.TRANSFORM,
  name: '数据过滤',
  description: '根据条件过滤数据行',
  version: '1.0.0',
  inputs: [
    {
      id: 'data',
      name: '输入数据',
      type: 'dataset',
      required: true,
      multiple: false,
      description: '要过滤的数据集',
    },
  ],
  outputs: [
    {
      id: 'filtered',
      name: '过滤结果',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '过滤后的数据集',
    },
  ],
  configSchema: {
    column: {
      type: 'string',
      label: '过滤列',
      description: '要应用过滤条件的列名',
      required: true,
    },
    operator: {
      type: 'select',
      label: '操作符',
      description: '过滤条件操作符',
      required: true,
      defaultValue: 'equals',
      options: [
        { label: '等于', value: 'equals' },
        { label: '不等于', value: 'not_equals' },
        { label: '大于', value: 'greater_than' },
        { label: '小于', value: 'less_than' },
        { label: '包含', value: 'contains' },
      ],
    },
    value: {
      type: 'string',
      label: '过滤值',
      description: '过滤条件的值',
      required: true,
    },
  },
  processor: {
    execute: async (inputs, config) => {
      const dataset = inputs.data as Dataset;
      const { column, operator, value } = config;

      const columnIndex = dataset.columns.indexOf(column);
      if (columnIndex === -1) {
        throw new Error(`列 "${column}" 不存在`);
      }

      const filteredRows = dataset.rows.filter(row => {
        const cellValue = row[columnIndex];
        
        switch (operator) {
          case 'equals':
            return cellValue == value;
          case 'not_equals':
            return cellValue != value;
          case 'greater_than':
            return Number(cellValue) > Number(value);
          case 'less_than':
            return Number(cellValue) < Number(value);
          case 'contains':
            return String(cellValue).includes(String(value));
          default:
            return true;
        }
      });

      return {
        ...dataset,
        rows: filteredRows,
        metadata: {
          ...dataset.metadata,
          rowCount: filteredRows.length,
          modified: new Date(),
        },
      };
    },
    validate: (inputs, config): ValidationResult => {
      const errors = [];

      if (!inputs.data) {
        errors.push({
          field: 'data',
          message: '需要输入数据',
          code: 'REQUIRED_INPUT',
        });
      }

      if (!config.column) {
        errors.push({
          field: 'column',
          message: '请选择过滤列',
          code: 'REQUIRED_FIELD',
        });
      }

      if (!config.operator) {
        errors.push({
          field: 'operator',
          message: '请选择操作符',
          code: 'REQUIRED_FIELD',
        });
      }

      if (config.value === undefined || config.value === null || config.value === '') {
        errors.push({
          field: 'value',
          message: '请输入过滤值',
          code: 'REQUIRED_FIELD',
        });
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    },
  },
  icon: '🔍',
  color: '#10b981',
  tags: ['transform', 'filter', 'condition'],
};

// Register example nodes
export const registerExampleNodes = (): void => {
  nodeRegistry.register(fileInputNodeDefinition);
  nodeRegistry.register(filterNodeDefinition);
};

// Example usage demonstration
export const demonstrateUsage = async (): Promise<void> => {
  console.log('=== DataBlocks Core Types Demo ===');

  // Register example nodes
  registerExampleNodes();

  // Show registered nodes
  console.log('\n1. 已注册的节点:');
  const allNodes = nodeRegistry.getAll();
  allNodes.forEach(node => {
    console.log(`  - ${node.name} (${node.type}): ${node.description}`);
  });

  // Show nodes by category
  console.log('\n2. 按类别分组的节点:');
  const inputNodes = nodeRegistry.getByCategory(NodeCategory.INPUT);
  const transformNodes = nodeRegistry.getByCategory(NodeCategory.TRANSFORM);
  
  console.log(`  输入节点 (${inputNodes.length}):`, inputNodes.map(n => n.name));
  console.log(`  转换节点 (${transformNodes.length}):`, transformNodes.map(n => n.name));

  // Search nodes
  console.log('\n3. 搜索节点:');
  const searchResults = nodeRegistry.search('数据');
  console.log(`  搜索 "数据" 的结果:`, searchResults.map(n => n.name));

  // Demonstrate node execution
  console.log('\n4. 节点执行演示:');
  
  // Execute file input node
  const fileNode = nodeRegistry.get('file-input');
  if (fileNode) {
    const fileConfig = {
      fileType: 'csv',
      hasHeader: true,
      delimiter: ',',
    };
    
    const fileResult = await fileNode.processor.execute({}, fileConfig);
    console.log('  文件输入节点输出:', {
      columns: fileResult.columns,
      rowCount: fileResult.metadata.rowCount,
    });

    // Execute filter node
    const filterNode = nodeRegistry.get('filter');
    if (filterNode) {
      const filterConfig = {
        column: 'Age',
        operator: 'greater_than',
        value: '26',
      };

      const filterResult = await filterNode.processor.execute(
        { data: fileResult },
        filterConfig
      );
      
      console.log('  过滤节点输出:', {
        columns: filterResult.columns,
        rowCount: filterResult.metadata.rowCount,
        rows: filterResult.rows,
      });
    }
  }

  console.log('\n=== Demo 完成 ===');
};

// Export for use in other parts of the application
export { nodeRegistry };