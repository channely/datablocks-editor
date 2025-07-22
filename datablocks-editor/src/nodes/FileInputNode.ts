import type { NodeDefinition } from '../types';
import { NodeCategory } from '../types';
import { FileInputExecutor } from '../engines/executors/FileInputExecutor';

/**
 * File Input Node Definition
 * Allows users to upload and parse CSV, JSON, and Excel files
 */
export const fileInputNodeDefinition: NodeDefinition = {
  id: 'file-input',
  type: 'file-input',
  category: NodeCategory.INPUT,
  name: '文件输入',
  description: '上传并解析 CSV、JSON 或 Excel 文件',
  version: '1.0.0',
  
  inputs: [],
  
  outputs: [
    {
      id: 'output',
      name: '数据集',
      type: 'dataset',
      required: false,
      multiple: false,
      description: '解析后的数据集',
    },
  ],
  
  configSchema: {
    file: {
      type: 'object',
      label: '选择文件',
      description: '支持 CSV、JSON、Excel (.xlsx, .xls) 格式',
      required: true,
    },
    hasHeader: {
      type: 'boolean',
      label: '包含标题行',
      description: '文件第一行是否为列标题',
      defaultValue: true,
      required: false,
    },
    delimiter: {
      type: 'string',
      label: 'CSV 分隔符',
      description: 'CSV 文件的字段分隔符（留空自动检测）',
      defaultValue: '',
      required: false,
    },
    skipEmptyLines: {
      type: 'boolean',
      label: '跳过空行',
      description: '是否跳过文件中的空行',
      defaultValue: true,
      required: false,
    },
    maxRows: {
      type: 'number',
      label: '最大行数',
      description: '限制导入的最大行数（留空导入全部）',
      required: false,
      validation: [
        {
          type: 'min',
          value: 1,
          message: '最大行数必须大于 0',
        },
        {
          type: 'max',
          value: 1000000,
          message: '最大行数不能超过 1,000,000',
        },
      ],
    },
  },
  
  processor: new FileInputExecutor(),
  
  icon: '📁',
  color: '#3b82f6',
  tags: ['input', 'file', 'csv', 'json', 'excel', 'upload'],
};