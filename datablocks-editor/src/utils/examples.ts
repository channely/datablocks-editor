import type { NodeDefinition, Dataset, ValidationResult } from '../types';
import { NodeCategory } from '../types';
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
    execute: async (_inputs, config) => {
      // Mock file loading - in real implementation this would handle file upload
      const mockData = [
        ['Name', 'Age', 'City'],
        ['张三', 25, '北京'],
        ['李四', 30, '上海'],
        ['王五', 28, '广州'],
      ];

      const hasHeader = config.hasHeader ?? true;
      const columns = hasHeader ? (mockData[0] as string[]) : undefined;
      const rows = hasHeader ? mockData.slice(1) : mockData;

      return createDatasetFromArray(rows, columns);
    },
    validate: (_inputs, config): ValidationResult => {
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

      if (
        config.value === undefined ||
        config.value === null ||
        config.value === ''
      ) {
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

// Additional node definitions for comprehensive library

// Paste Input Node
export const pasteInputNodeDefinition: NodeDefinition = {
  id: 'paste-input-v1',
  type: 'paste-input',
  category: NodeCategory.INPUT,
  name: '粘贴数据',
  description: '粘贴表格数据或 JSON 数据',
  version: '1.0.0',
  inputs: [],
  outputs: [
    {
      id: 'data',
      name: '数据',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '粘贴的数据集',
    },
  ],
  configSchema: {
    dataType: {
      type: 'select',
      label: '数据类型',
      description: '选择粘贴数据的格式',
      required: true,
      defaultValue: 'table',
      options: [
        { label: '表格数据', value: 'table' },
        { label: 'JSON 数据', value: 'json' },
        { label: 'CSV 数据', value: 'csv' },
      ],
    },
    data: {
      type: 'string',
      label: '数据内容',
      description: '粘贴您的数据',
      required: true,
    },
  },
  processor: {
    execute: async (inputs, config) => {
      const { dataType, data } = config;

      if (dataType === 'json') {
        const jsonData = JSON.parse(data);
        if (Array.isArray(jsonData) && jsonData.length > 0) {
          const columns = Object.keys(jsonData[0]);
          const rows = jsonData.map(item => columns.map(col => item[col]));
          return createDatasetFromArray(rows, columns);
        }
      }

      // Mock table data parsing
      const lines = data.split('\n').filter(line => line.trim());
      const rows = lines.map(line => line.split('\t'));
      return createDatasetFromArray(rows.slice(1), rows[0]);
    },
    validate: (_inputs, config): ValidationResult => {
      const errors = [];
      if (!config.data?.trim()) {
        errors.push({
          field: 'data',
          message: '请粘贴数据内容',
          code: 'REQUIRED_FIELD',
        });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  icon: '📋',
  color: '#3b82f6',
  tags: ['input', 'paste', 'data'],
};

// HTTP Request Node
export const httpRequestNodeDefinition: NodeDefinition = {
  id: 'http-request-v1',
  type: 'http-request',
  category: NodeCategory.INPUT,
  name: 'HTTP 请求',
  description: '从 API 获取数据',
  version: '1.0.0',
  inputs: [],
  outputs: [
    {
      id: 'data',
      name: '响应数据',
      type: 'dataset',
      required: false,
      multiple: false,
      description: 'API 响应的数据',
    },
  ],
  configSchema: {
    url: {
      type: 'string',
      label: 'API URL',
      description: '请求的 API 地址',
      required: true,
    },
    method: {
      type: 'select',
      label: '请求方法',
      description: 'HTTP 请求方法',
      required: true,
      defaultValue: 'GET',
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
      ],
    },
  },
  processor: {
    execute: async (_inputs, _config) => {
      // Mock API response
      const mockApiData = [
        { id: 1, name: '产品A', price: 100, category: '电子' },
        { id: 2, name: '产品B', price: 200, category: '服装' },
        { id: 3, name: '产品C', price: 150, category: '电子' },
      ];

      const columns = Object.keys(mockApiData[0]);
      const rows = mockApiData.map(item => columns.map(col => item[col]));
      return createDatasetFromArray(rows, columns);
    },
    validate: (_inputs, config): ValidationResult => {
      const errors = [];
      if (!config.url?.trim()) {
        errors.push({
          field: 'url',
          message: '请输入 API URL',
          code: 'REQUIRED_FIELD',
        });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  icon: '🌐',
  color: '#3b82f6',
  tags: ['input', 'http', 'api'],
};

// Example Data Node
export const exampleDataNodeDefinition: NodeDefinition = {
  id: 'example-data-v1',
  type: 'example-data',
  category: NodeCategory.INPUT,
  name: '示例数据',
  description: '使用预设的示例数据集',
  version: '1.0.0',
  inputs: [],
  outputs: [
    {
      id: 'data',
      name: '示例数据',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '选择的示例数据集',
    },
  ],
  configSchema: {
    dataset: {
      type: 'select',
      label: '数据集',
      description: '选择示例数据集',
      required: true,
      defaultValue: 'sales',
      options: [
        { label: '销售数据', value: 'sales' },
        { label: '用户数据', value: 'users' },
        { label: '产品数据', value: 'products' },
      ],
    },
  },
  processor: {
    execute: async (inputs, config) => {
      const datasets = {
        sales: [
          ['日期', '销售额', '地区', '产品'],
          ['2024-01-01', 1000, '北京', '产品A'],
          ['2024-01-02', 1500, '上海', '产品B'],
          ['2024-01-03', 800, '广州', '产品A'],
        ],
        users: [
          ['姓名', '年龄', '城市', '职业'],
          ['张三', 25, '北京', '工程师'],
          ['李四', 30, '上海', '设计师'],
          ['王五', 28, '广州', '产品经理'],
        ],
        products: [
          ['产品名', '价格', '类别', '库存'],
          ['笔记本电脑', 5000, '电子产品', 50],
          ['智能手机', 3000, '电子产品', 100],
          ['运动鞋', 500, '服装', 200],
        ],
      };

      const selectedData = datasets[config.dataset] || datasets.sales;
      return createDatasetFromArray(selectedData.slice(1), selectedData[0]);
    },
    validate: (_inputs, _config): ValidationResult => {
      return { valid: true, errors: [] };
    },
  },
  icon: '📊',
  color: '#3b82f6',
  tags: ['input', 'example', 'sample'],
};

// Sort Node
export const sortNodeDefinition: NodeDefinition = {
  id: 'sort-v1',
  type: 'sort',
  category: NodeCategory.TRANSFORM,
  name: '数据排序',
  description: '按指定列排序数据',
  version: '1.0.0',
  inputs: [
    {
      id: 'data',
      name: '输入数据',
      type: 'dataset',
      required: true,
      multiple: false,
      description: '要排序的数据集',
    },
  ],
  outputs: [
    {
      id: 'sorted',
      name: '排序结果',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '排序后的数据集',
    },
  ],
  configSchema: {
    column: {
      type: 'string',
      label: '排序列',
      description: '要排序的列名',
      required: true,
    },
    direction: {
      type: 'select',
      label: '排序方向',
      description: '升序或降序',
      required: true,
      defaultValue: 'asc',
      options: [
        { label: '升序', value: 'asc' },
        { label: '降序', value: 'desc' },
      ],
    },
  },
  processor: {
    execute: async (inputs, config) => {
      const dataset = inputs.data as Dataset;
      const { column, direction } = config;

      const columnIndex = dataset.columns.indexOf(column);
      if (columnIndex === -1) {
        throw new Error(`列 "${column}" 不存在`);
      }

      const sortedRows = [...dataset.rows].sort((a, b) => {
        const aVal = a[columnIndex];
        const bVal = b[columnIndex];

        let comparison = 0;
        if (aVal < bVal) comparison = -1;
        if (aVal > bVal) comparison = 1;

        return direction === 'desc' ? -comparison : comparison;
      });

      return {
        ...dataset,
        rows: sortedRows,
        metadata: {
          ...dataset.metadata,
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
          message: '请选择排序列',
          code: 'REQUIRED_FIELD',
        });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  icon: '🔢',
  color: '#10b981',
  tags: ['transform', 'sort', 'order'],
};

// Group Node
export const groupNodeDefinition: NodeDefinition = {
  id: 'group-v1',
  type: 'group',
  category: NodeCategory.TRANSFORM,
  name: '数据分组',
  description: '按列分组并聚合数据',
  version: '1.0.0',
  inputs: [
    {
      id: 'data',
      name: '输入数据',
      type: 'dataset',
      required: true,
      multiple: false,
      description: '要分组的数据集',
    },
  ],
  outputs: [
    {
      id: 'grouped',
      name: '分组结果',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '分组聚合后的数据集',
    },
  ],
  configSchema: {
    groupBy: {
      type: 'string',
      label: '分组列',
      description: '按此列进行分组',
      required: true,
    },
    aggregateColumn: {
      type: 'string',
      label: '聚合列',
      description: '要聚合的列名',
      required: true,
    },
    aggregateFunction: {
      type: 'select',
      label: '聚合函数',
      description: '聚合计算方式',
      required: true,
      defaultValue: 'sum',
      options: [
        { label: '求和', value: 'sum' },
        { label: '计数', value: 'count' },
        { label: '平均值', value: 'avg' },
        { label: '最大值', value: 'max' },
        { label: '最小值', value: 'min' },
      ],
    },
  },
  processor: {
    execute: async (_inputs, _config) => {
      // Mock grouping logic - in real implementation would use inputs.data and config
      const mockResult = [
        ['分组', '聚合结果'],
        ['组A', 100],
        ['组B', 200],
        ['组C', 150],
      ];

      return createDatasetFromArray(mockResult.slice(1), mockResult[0]);
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
      if (!config.groupBy) {
        errors.push({
          field: 'groupBy',
          message: '请选择分组列',
          code: 'REQUIRED_FIELD',
        });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  icon: '📊',
  color: '#10b981',
  tags: ['transform', 'group', 'aggregate'],
};

// Chart Node
export const chartNodeDefinition: NodeDefinition = {
  id: 'chart-v1',
  type: 'chart',
  category: NodeCategory.VISUALIZATION,
  name: '图表',
  description: '创建柱状图、折线图、散点图等',
  version: '1.0.0',
  inputs: [
    {
      id: 'data',
      name: '输入数据',
      type: 'dataset',
      required: true,
      multiple: false,
      description: '要可视化的数据集',
    },
  ],
  outputs: [
    {
      id: 'chart',
      name: '图表',
      type: 'object',
      required: false,
      multiple: false,
      description: '生成的图表对象',
    },
  ],
  configSchema: {
    chartType: {
      type: 'select',
      label: '图表类型',
      description: '选择图表类型',
      required: true,
      defaultValue: 'bar',
      options: [
        { label: '柱状图', value: 'bar' },
        { label: '折线图', value: 'line' },
        { label: '散点图', value: 'scatter' },
        { label: '饼图', value: 'pie' },
      ],
    },
    xColumn: {
      type: 'string',
      label: 'X 轴列',
      description: 'X 轴数据列',
      required: true,
    },
    yColumn: {
      type: 'string',
      label: 'Y 轴列',
      description: 'Y 轴数据列',
      required: true,
    },
  },
  processor: {
    execute: async (inputs, config) => {
      const dataset = inputs.data as Dataset;
      const { chartType, xColumn, yColumn } = config;

      return {
        type: chartType,
        data: {
          labels: dataset.rows.map(
            row => row[dataset.columns.indexOf(xColumn)]
          ),
          datasets: [
            {
              label: yColumn,
              data: dataset.rows.map(
                row => row[dataset.columns.indexOf(yColumn)]
              ),
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: `${chartType} 图表`,
            },
          },
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
      if (!config.xColumn) {
        errors.push({
          field: 'xColumn',
          message: '请选择 X 轴列',
          code: 'REQUIRED_FIELD',
        });
      }
      if (!config.yColumn) {
        errors.push({
          field: 'yColumn',
          message: '请选择 Y 轴列',
          code: 'REQUIRED_FIELD',
        });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  icon: '📈',
  color: '#f59e0b',
  tags: ['visualization', 'chart', 'graph'],
};

// Table Node
export const tableNodeDefinition: NodeDefinition = {
  id: 'table-v1',
  type: 'table',
  category: NodeCategory.VISUALIZATION,
  name: '表格',
  description: '以表格形式显示数据',
  version: '1.0.0',
  inputs: [
    {
      id: 'data',
      name: '输入数据',
      type: 'dataset',
      required: true,
      multiple: false,
      description: '要显示的数据集',
    },
  ],
  outputs: [
    {
      id: 'table',
      name: '表格',
      type: 'object',
      required: false,
      multiple: false,
      description: '格式化的表格对象',
    },
  ],
  configSchema: {
    pageSize: {
      type: 'number',
      label: '每页行数',
      description: '表格每页显示的行数',
      defaultValue: 10,
    },
    sortable: {
      type: 'boolean',
      label: '允许排序',
      description: '是否允许点击列标题排序',
      defaultValue: true,
    },
  },
  processor: {
    execute: async (inputs, config) => {
      const dataset = inputs.data as Dataset;
      return {
        columns: dataset.columns,
        rows: dataset.rows,
        pageSize: config.pageSize || 10,
        sortable: config.sortable !== false,
        totalRows: dataset.metadata.rowCount,
      };
    },
    validate: (inputs, _config): ValidationResult => {
      const errors = [];
      if (!inputs.data) {
        errors.push({
          field: 'data',
          message: '需要输入数据',
          code: 'REQUIRED_INPUT',
        });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  icon: '📋',
  color: '#f59e0b',
  tags: ['visualization', 'table', 'display'],
};

// JavaScript Node
export const javascriptNodeDefinition: NodeDefinition = {
  id: 'javascript-v1',
  type: 'javascript',
  category: NodeCategory.ADVANCED,
  name: 'JavaScript',
  description: '执行自定义 JavaScript 代码',
  version: '1.0.0',
  inputs: [
    {
      id: 'data',
      name: '输入数据',
      type: 'any',
      required: false,
      multiple: false,
      description: '传入的数据',
    },
  ],
  outputs: [
    {
      id: 'result',
      name: '执行结果',
      type: 'any',
      required: false,
      multiple: false,
      description: '代码执行结果',
    },
  ],
  configSchema: {
    code: {
      type: 'string',
      label: 'JavaScript 代码',
      description: '要执行的 JavaScript 代码',
      required: true,
    },
  },
  processor: {
    execute: async (inputs, config) => {
      // Mock JavaScript execution
      const { code } = config;
      const inputData = inputs.data;

      // In a real implementation, this would use a safe JavaScript execution environment
      try {
        // Simple mock execution
        if (code.includes('return')) {
          return { result: '代码执行成功', input: inputData };
        }
        return { message: '代码已执行', input: inputData };
      } catch (error) {
        throw new Error(`JavaScript 执行错误: ${error.message}`);
      }
    },
    validate: (inputs, config): ValidationResult => {
      const errors = [];
      if (!config.code?.trim()) {
        errors.push({
          field: 'code',
          message: '请输入 JavaScript 代码',
          code: 'REQUIRED_FIELD',
        });
      }
      return { valid: errors.length === 0, errors };
    },
  },
  icon: '⚡',
  color: '#8b5cf6',
  tags: ['advanced', 'javascript', 'custom'],
};

// Register all example nodes
export const registerExampleNodes = (): void => {
  nodeRegistry.register(fileInputNodeDefinition);
  nodeRegistry.register(pasteInputNodeDefinition);
  nodeRegistry.register(httpRequestNodeDefinition);
  nodeRegistry.register(exampleDataNodeDefinition);
  nodeRegistry.register(filterNodeDefinition);
  nodeRegistry.register(sortNodeDefinition);
  nodeRegistry.register(groupNodeDefinition);
  nodeRegistry.register(chartNodeDefinition);
  nodeRegistry.register(tableNodeDefinition);
  nodeRegistry.register(javascriptNodeDefinition);
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

  console.log(
    `  输入节点 (${inputNodes.length}):`,
    inputNodes.map(n => n.name)
  );
  console.log(
    `  转换节点 (${transformNodes.length}):`,
    transformNodes.map(n => n.name)
  );

  // Search nodes
  console.log('\n3. 搜索节点:');
  const searchResults = nodeRegistry.search('数据');
  console.log(
    `  搜索 "数据" 的结果:`,
    searchResults.map(n => n.name)
  );

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
