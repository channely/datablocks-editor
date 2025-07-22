import type { NodeDefinition, Dataset, ValidationResult } from '../types';
import { NodeCategory } from '../types';
import { nodeRegistry } from './nodeRegistry';
import { createDatasetFromArray } from './dataUtils';
import { HttpRequestExecutor } from '../engines/executors/HttpRequestExecutor';

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
    file: {
      type: 'object',
      label: '文件',
      description: '要上传的文件',
      required: true,
    },
    hasHeader: {
      type: 'boolean',
      label: '包含标题行',
      description: '文件第一行是否为列标题',
      defaultValue: true,
    },
    skipEmptyLines: {
      type: 'boolean',
      label: '跳过空行',
      description: '是否跳过空白行',
      defaultValue: true,
    },
    delimiter: {
      type: 'string',
      label: 'CSV 分隔符',
      description: 'CSV 文件的分隔符（留空自动检测）',
      defaultValue: '',
    },
    maxRows: {
      type: 'number',
      label: '最大行数',
      description: '限制导入的最大行数',
    },
  },
  processor: {
    execute: async (_inputs, config) => {
      // This will be handled by the FileInputExecutor
      // The actual file processing is done in the executor
      const file = config.file as File;
      if (!file) {
        throw new Error('No file provided');
      }

      // Import and use the file parser
      const { parseFile } = await import('./fileParser');
      const parseOptions = {
        hasHeader: config.hasHeader !== false,
        delimiter: config.delimiter || '',
        skipEmptyLines: config.skipEmptyLines !== false,
        maxRows: config.maxRows ? parseInt(config.maxRows) : undefined,
      };

      const result = await parseFile(file, parseOptions);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to parse file');
      }

      return result.dataset!;
    },
    validate: (_inputs, config): ValidationResult => {
      const errors = [];

      if (!config.file) {
        errors.push({
          field: 'file',
          message: 'File is required',
          code: 'REQUIRED_FIELD',
        });
      }

      if (config.maxRows) {
        const maxRows = parseInt(config.maxRows);
        if (isNaN(maxRows) || maxRows <= 0) {
          errors.push({
            field: 'maxRows',
            message: 'Max rows must be a positive number',
            code: 'INVALID_VALUE',
          });
        }
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
    hasHeader: {
      type: 'boolean',
      label: '包含标题行',
      description: '数据第一行是否为列标题',
      defaultValue: true,
    },
  },
  processor: {
    execute: async (_inputs, config) => {
      // This will be handled by the PasteInputExecutor
      const { dataType, data, hasHeader } = config;

      if (!data || !data.trim()) {
        throw new Error('No data provided');
      }

      // Import the createDatasetFromArray function
      const { createDatasetFromArray } = await import('./dataUtils');

      switch (dataType) {
        case 'json': {
          const jsonData = JSON.parse(data);
          if (!Array.isArray(jsonData)) {
            throw new Error('JSON data must be an array');
          }
          if (jsonData.length === 0) {
            throw new Error('JSON array cannot be empty');
          }
          return createDatasetFromArray(jsonData);
        }
        case 'csv': {
          const lines = data.trim().split('\n').filter(line => line.trim());
          const rows = lines.map(line => line.split(',').map(cell => cell.trim()));
          
          if (hasHeader !== false) {
            return createDatasetFromArray(rows.slice(1), rows[0]);
          } else {
            const maxColumns = Math.max(...rows.map(row => row.length));
            const columns = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
            return createDatasetFromArray(rows, columns);
          }
        }
        case 'table':
        default: {
          const lines = data.trim().split('\n').filter(line => line.trim());
          const rows = lines.map(line => line.split('\t').map(cell => cell.trim()));
          
          if (hasHeader !== false) {
            return createDatasetFromArray(rows.slice(1), rows[0]);
          } else {
            const maxColumns = Math.max(...rows.map(row => row.length));
            const columns = Array.from({ length: maxColumns }, (_, i) => `Column ${i + 1}`);
            return createDatasetFromArray(rows, columns);
          }
        }
      }
    },
    validate: (_inputs, config): ValidationResult => {
      const errors = [];
      
      if (!config.data?.trim()) {
        errors.push({
          field: 'data',
          message: 'Data content is required',
          code: 'REQUIRED_FIELD',
        });
      } else {
        const { dataType, data } = config;
        
        // Validate JSON format if dataType is json
        if (dataType === 'json') {
          try {
            const jsonData = JSON.parse(data);
            if (!Array.isArray(jsonData)) {
              errors.push({
                field: 'data',
                message: 'JSON data must be an array',
                code: 'INVALID_JSON',
              });
            }
          } catch {
            errors.push({
              field: 'data',
              message: 'Invalid JSON format',
              code: 'INVALID_JSON',
            });
          }
        }
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
        { label: 'PUT', value: 'PUT' },
        { label: 'DELETE', value: 'DELETE' },
      ],
    },
    headers: {
      type: 'object',
      label: '请求头',
      description: 'HTTP 请求头',
      required: false,
    },
    body: {
      type: 'string',
      label: '请求体',
      description: 'HTTP 请求体 (JSON格式)',
      required: false,
    },
    timeout: {
      type: 'number',
      label: '超时时间 (ms)',
      description: '请求超时时间',
      required: false,
      defaultValue: 10000,
    },
  },
  processor: {
    execute: async (_inputs, config) => {
      return await HttpRequestExecutor.execute({
        url: config.url,
        method: config.method || 'GET',
        headers: config.headers || {},
        body: config.body,
        timeout: config.timeout || 10000,
      });
    },
    validate: (_inputs, config): ValidationResult => {
      return HttpRequestExecutor.validate(_inputs, config);
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
      defaultValue: 'sample',
      options: [
        { label: '用户数据', value: 'sample' },
        { label: '销售数据', value: 'sales' },
        { label: '员工数据', value: 'employees' },
        { label: '产品数据', value: 'products' },
      ],
    },
  },
  processor: {
    execute: async (_inputs, config) => {
      // This will be handled by the ExampleDataExecutor
      const datasetName = config.dataset || 'sample';
      
      // Import the ExampleDataExecutor
      const { ExampleDataExecutor } = await import('../engines/executors/BaseExecutors');
      const executor = new ExampleDataExecutor();
      
      const context = {
        nodeId: 'example-data-node',
        inputs: {},
        config,
        metadata: {
          executionId: 'example-exec',
          startTime: new Date(),
        },
      };
      
      const result = await executor.execute(context);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to generate example data');
      }
      
      return result.output;
    },
    validate: (_inputs, config): ValidationResult => {
      const errors = [];
      
      if (!config.dataset) {
        errors.push({
          field: 'dataset',
          message: 'Dataset selection is required',
          code: 'REQUIRED_FIELD',
        });
      }
      
      return { valid: errors.length === 0, errors };
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
    execute: async (inputs, config) => {
      // Use the actual GroupExecutor
      const { GroupExecutor } = await import('../engines/executors/BaseExecutors');
      const executor = new GroupExecutor();
      
      const context = {
        nodeId: 'group-node',
        inputs,
        config: {
          groupColumns: config.groupBy ? [config.groupBy] : [],
          aggregations: [{
            column: config.aggregateColumn || '',
            function: config.aggregateFunction || 'count',
          }],
        },
        metadata: {
          executionId: 'group-exec',
          startTime: new Date(),
        },
      };
      
      const result = await executor.execute(context);
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to group data');
      }
      
      return result.output;
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
  description: '创建柱状图、折线图、散点图等数据可视化',
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
      description: '生成的图表配置对象',
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
      ],
    },
    xAxisColumn: {
      type: 'string',
      label: 'X轴字段',
      description: 'X轴数据字段',
      required: true,
    },
    yAxisColumns: {
      type: 'multiselect',
      label: 'Y轴字段',
      description: 'Y轴数据字段（可多选）',
      required: true,
    },
    chartTitle: {
      type: 'string',
      label: '图表标题',
      description: '图表标题（可选）',
      required: false,
      defaultValue: '',
    },
    colorTheme: {
      type: 'select',
      label: '颜色主题',
      description: '图表颜色主题',
      required: false,
      defaultValue: 'default',
      options: [
        { label: '默认', value: 'default' },
        { label: '蓝色系', value: 'blue' },
        { label: '绿色系', value: 'green' },
      ],
    },
    showLegend: {
      type: 'boolean',
      label: '显示图例',
      description: '是否显示图例',
      required: false,
      defaultValue: true,
    },
  },
  processor: {
    execute: async (inputs, config) => {
      // This will be handled by ChartExecutor
      const dataset = inputs.data as Dataset;
      const { 
        chartType = 'bar', 
        xAxisColumn, 
        yAxisColumns = [], 
        chartTitle = '',
        colorTheme = 'default',
        showLegend = true 
      } = config;

      if (!xAxisColumn || !yAxisColumns.length) {
        throw new Error('X轴和Y轴字段都是必需的');
      }

      // Basic chart data generation for compatibility
      const xColumnIndex = dataset.columns.indexOf(xAxisColumn);
      const labels = dataset.rows.map(row => String(row[xColumnIndex]));

      const datasets = yAxisColumns.map((yColumn: string, index: number) => {
        const yColumnIndex = dataset.columns.indexOf(yColumn);
        const data = dataset.rows.map(row => {
          const value = row[yColumnIndex];
          return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
        });

        const colors = [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ];

        return {
          label: yColumn,
          data,
          backgroundColor: colors[index % colors.length],
          borderColor: colors[index % colors.length].replace('0.8', '1'),
          borderWidth: 2,
        };
      });

      return {
        type: chartType,
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: showLegend },
            title: { display: !!chartTitle, text: chartTitle },
          },
          scales: {
            x: { title: { display: true, text: xAxisColumn } },
            y: { title: { display: true, text: yAxisColumns.length === 1 ? yAxisColumns[0] : '数值' } },
          },
        },
        metadata: {
          rowCount: dataset.rows.length,
          xAxisColumn,
          yAxisColumns,
          chartType,
          generated: new Date(),
        },
      };
    },
    validate: (inputs, config): ValidationResult => {
      const errors = [];
      
      if (!inputs.data) {
        errors.push({
          field: 'data',
          message: '需要输入数据集',
          code: 'REQUIRED_INPUT',
        });
      }
      
      if (!config.xAxisColumn) {
        errors.push({
          field: 'xAxisColumn',
          message: '请选择X轴字段',
          code: 'REQUIRED_FIELD',
        });
      }
      
      if (!config.yAxisColumns || !Array.isArray(config.yAxisColumns) || config.yAxisColumns.length === 0) {
        errors.push({
          field: 'yAxisColumns',
          message: '请至少选择一个Y轴字段',
          code: 'REQUIRED_FIELD',
        });
      }
      
      return { valid: errors.length === 0, errors };
    },
  },
  icon: '📊',
  color: '#f59e0b',
  tags: ['visualization', 'chart', 'graph', 'bar', 'line', 'scatter'],
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
  description: '执行自定义 JavaScript 代码处理数据',
  version: '1.0.0',
  inputs: [
    {
      id: 'data',
      name: '输入数据',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '传入的数据集',
    },
  ],
  outputs: [
    {
      id: 'result',
      name: '执行结果',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '代码执行结果',
    },
  ],
  configSchema: {
    name: {
      type: 'string',
      label: '节点名称',
      description: '节点显示名称',
      defaultValue: 'JavaScript',
    },
    code: {
      type: 'object',
      label: 'JavaScript 代码',
      description: '要执行的 JavaScript 代码',
      required: true,
      defaultValue: '// Process input data\nfunction process(data) {\n  // Your code here\n  return data;\n}',
    },
    timeout: {
      type: 'number',
      label: '执行超时 (ms)',
      description: '代码执行的最大时间',
      defaultValue: 5000,
    },
    allowConsole: {
      type: 'boolean',
      label: '允许控制台输出',
      description: '允许在代码中使用 console.log',
      defaultValue: true,
    },
    strictMode: {
      type: 'boolean',
      label: '严格模式',
      description: '在严格模式下执行 JavaScript',
      defaultValue: true,
    },
  },
  processor: {
    execute: async (inputs, config) => {
      // Use the JavaScriptExecutor
      const { JavaScriptExecutor } = await import('../engines/executors/JavaScriptExecutor');
      
      const inputData = inputs.data || null;
      const { code, timeout, allowConsole, strictMode } = config;

      try {
        const result = await JavaScriptExecutor.execute(code, inputData, {
          timeout: timeout || 5000,
          allowConsole: allowConsole !== false,
          strictMode: strictMode !== false,
        });
        
        return result;
      } catch (error) {
        throw new Error(`JavaScript 执行错误: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
    validate: (inputs, config): ValidationResult => {
      // Use the JavaScriptExecutor validation
      const { JavaScriptExecutor } = require('../engines/executors/JavaScriptExecutor');
      return JavaScriptExecutor.validate(inputs, config);
    },
  },
  icon: '⚡',
  color: '#8b5cf6',
  tags: ['advanced', 'javascript', 'custom', 'code'],
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
