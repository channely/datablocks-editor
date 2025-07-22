import type { NodeConfigSchema } from '../types';

/**
 * Node Configuration Schemas
 * Defines the configuration interface for each node type
 */

export const NODE_CONFIG_SCHEMAS: Record<string, NodeConfigSchema> = {
  // Input Nodes
  file: {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'File Input',
    },
    hasHeader: {
      type: 'boolean',
      label: 'Has Header Row',
      description: 'First row contains column headers',
      defaultValue: true,
    },
    skipEmptyLines: {
      type: 'boolean',
      label: 'Skip Empty Lines',
      description: 'Ignore empty rows in the file',
      defaultValue: true,
    },
    delimiter: {
      type: 'string',
      label: 'CSV Delimiter',
      description: 'Character used to separate values (leave empty for auto-detection)',
      defaultValue: '',
    },
    maxRows: {
      type: 'number',
      label: 'Max Rows to Import',
      description: 'Maximum number of rows to import (0 = unlimited)',
      defaultValue: 0,
      validation: [
        { type: 'min', value: 0, message: 'Must be 0 or positive number' },
        { type: 'max', value: 1000000, message: 'Cannot exceed 1 million rows' },
      ],
    },
    encoding: {
      type: 'select',
      label: 'File Encoding',
      description: 'Character encoding of the file',
      options: [
        { label: 'UTF-8', value: 'utf-8' },
        { label: 'UTF-16', value: 'utf-16' },
        { label: 'ISO-8859-1', value: 'iso-8859-1' },
        { label: 'Windows-1252', value: 'windows-1252' },
      ],
      defaultValue: 'utf-8',
    },
  },

  paste: {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'Paste Input',
    },
    autoDetectFormat: {
      type: 'boolean',
      label: 'Auto-detect Format',
      description: 'Automatically detect data format (CSV, JSON, etc.)',
      defaultValue: true,
    },
    delimiter: {
      type: 'string',
      label: 'Delimiter',
      description: 'Character used to separate values (for CSV data)',
      defaultValue: ',',
    },
    hasHeader: {
      type: 'boolean',
      label: 'Has Header Row',
      description: 'First row contains column headers',
      defaultValue: true,
    },
    trimWhitespace: {
      type: 'boolean',
      label: 'Trim Whitespace',
      description: 'Remove leading and trailing whitespace from values',
      defaultValue: true,
    },
  },

  exampleData: {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'Example Data',
    },
    dataset: {
      type: 'select',
      label: 'Example Dataset',
      description: 'Choose a predefined dataset',
      options: [
        { label: 'Sales Data', value: 'sales' },
        { label: 'Employee Data', value: 'employees' },
        { label: 'Product Data', value: 'products' },
        { label: 'Customer Data', value: 'customers' },
        { label: 'Financial Data', value: 'financial' },
      ],
      defaultValue: 'sales',
      validation: [
        { type: 'required', message: 'Please select a dataset' },
      ],
    },
    rowCount: {
      type: 'number',
      label: 'Number of Rows',
      description: 'Number of sample rows to generate',
      defaultValue: 100,
      validation: [
        { type: 'min', value: 1, message: 'Must generate at least 1 row' },
        { type: 'max', value: 10000, message: 'Cannot generate more than 10,000 rows' },
      ],
    },
  },

  // Transform Nodes
  filter: {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'Filter',
    },
    conditions: {
      type: 'object',
      label: 'Filter Conditions',
      description: 'Conditions to filter data rows',
      defaultValue: [],
    },
    logicalOperator: {
      type: 'select',
      label: 'Logical Operator',
      description: 'How to combine multiple conditions',
      options: [
        { label: 'AND (all conditions must be true)', value: 'and' },
        { label: 'OR (any condition can be true)', value: 'or' },
      ],
      defaultValue: 'and',
    },
    caseSensitive: {
      type: 'boolean',
      label: 'Case Sensitive',
      description: 'Make text comparisons case sensitive',
      defaultValue: false,
    },
    preserveOrder: {
      type: 'boolean',
      label: 'Preserve Row Order',
      description: 'Keep original row order in filtered results',
      defaultValue: true,
    },
  },

  sort: {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'Sort',
    },
    column: {
      type: 'select',
      label: 'Sort Column',
      description: 'Column to sort by',
      defaultValue: '',
      validation: [
        { type: 'required', message: 'Please select a column to sort by' },
      ],
    },
    direction: {
      type: 'select',
      label: 'Sort Direction',
      description: 'Sort order',
      options: [
        { label: 'Ascending (A-Z, 1-9)', value: 'asc' },
        { label: 'Descending (Z-A, 9-1)', value: 'desc' },
      ],
      defaultValue: 'asc',
    },
    dataType: {
      type: 'select',
      label: 'Data Type',
      description: 'How to interpret the column values for sorting',
      options: [
        { label: 'Auto-detect', value: 'auto' },
        { label: 'Text', value: 'string' },
        { label: 'Number', value: 'number' },
        { label: 'Date', value: 'date' },
      ],
      defaultValue: 'auto',
    },
    nullsLast: {
      type: 'boolean',
      label: 'Nulls Last',
      description: 'Place null/empty values at the end',
      defaultValue: true,
    },
  },

  group: {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'Group',
    },
    groupColumns: {
      type: 'multiselect',
      label: 'Group By Columns',
      description: 'Columns to group data by',
      defaultValue: [],
      validation: [
        { type: 'required', message: 'Please select at least one column to group by' },
      ],
    },
    aggregations: {
      type: 'object',
      label: 'Aggregations',
      description: 'Aggregation functions to apply to other columns',
      defaultValue: [],
    },
    includeCount: {
      type: 'boolean',
      label: 'Include Row Count',
      description: 'Add a column showing the count of rows in each group',
      defaultValue: true,
    },
    sortGroups: {
      type: 'select',
      label: 'Sort Groups',
      description: 'How to sort the grouped results',
      options: [
        { label: 'No sorting', value: 'none' },
        { label: 'By group key (ascending)', value: 'key_asc' },
        { label: 'By group key (descending)', value: 'key_desc' },
        { label: 'By count (ascending)', value: 'count_asc' },
        { label: 'By count (descending)', value: 'count_desc' },
      ],
      defaultValue: 'key_asc',
    },
  },

  // Visualization Nodes
  chart: {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'Chart',
    },
    chartType: {
      type: 'select',
      label: 'Chart Type',
      description: 'Type of chart to display',
      options: [
        { label: 'Bar Chart', value: 'bar' },
        { label: 'Line Chart', value: 'line' },
        { label: 'Scatter Plot', value: 'scatter' },
        { label: 'Pie Chart', value: 'pie' },
        { label: 'Area Chart', value: 'area' },
      ],
      defaultValue: 'bar',
      validation: [
        { type: 'required', message: 'Please select a chart type' },
      ],
    },
    xAxisColumn: {
      type: 'select',
      label: 'X Axis Column',
      description: 'Column for X axis (categories/labels)',
      defaultValue: '',
      validation: [
        { type: 'required', message: 'Please select X axis column' },
      ],
    },
    yAxisColumns: {
      type: 'multiselect',
      label: 'Y Axis Columns',
      description: 'Columns for Y axis data (values)',
      defaultValue: [],
      validation: [
        { type: 'required', message: 'Please select at least one Y axis column' },
      ],
    },
    chartTitle: {
      type: 'string',
      label: 'Chart Title',
      description: 'Title to display above the chart',
      defaultValue: '',
    },
    xAxisTitle: {
      type: 'string',
      label: 'X Axis Title',
      description: 'Label for the X axis',
      defaultValue: '',
    },
    yAxisTitle: {
      type: 'string',
      label: 'Y Axis Title',
      description: 'Label for the Y axis',
      defaultValue: '',
    },
    showLegend: {
      type: 'boolean',
      label: 'Show Legend',
      description: 'Display chart legend',
      defaultValue: true,
    },
    showGrid: {
      type: 'boolean',
      label: 'Show Grid Lines',
      description: 'Display grid lines on the chart',
      defaultValue: true,
    },
    colorTheme: {
      type: 'select',
      label: 'Color Theme',
      description: 'Color scheme for the chart',
      options: [
        { label: 'Default', value: 'default' },
        { label: 'Blue Theme', value: 'blue' },
        { label: 'Green Theme', value: 'green' },
        { label: 'Warm Colors', value: 'warm' },
        { label: 'Cool Colors', value: 'cool' },
      ],
      defaultValue: 'default',
    },
    chartHeight: {
      type: 'number',
      label: 'Chart Height (px)',
      description: 'Height of the chart in pixels',
      defaultValue: 400,
      validation: [
        { type: 'min', value: 200, message: 'Chart height must be at least 200px' },
        { type: 'max', value: 1000, message: 'Chart height cannot exceed 1000px' },
      ],
    },
    animationDuration: {
      type: 'number',
      label: 'Animation Duration (ms)',
      description: 'Duration of chart animations in milliseconds',
      defaultValue: 1000,
      validation: [
        { type: 'min', value: 0, message: 'Animation duration cannot be negative' },
        { type: 'max', value: 5000, message: 'Animation duration cannot exceed 5 seconds' },
      ],
    },
  },

  // Advanced Nodes
  javascript: {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: 'JavaScript',
    },
    code: {
      type: 'object',
      label: 'JavaScript Code',
      description: 'Custom JavaScript code to process the data',
      defaultValue: '// Process input data\nfunction process(data) {\n  // Your code here\n  return data;\n}',
    },
    timeout: {
      type: 'number',
      label: 'Execution Timeout (ms)',
      description: 'Maximum time allowed for code execution',
      defaultValue: 5000,
      validation: [
        { type: 'min', value: 100, message: 'Timeout must be at least 100ms' },
        { type: 'max', value: 30000, message: 'Timeout cannot exceed 30 seconds' },
      ],
    },
    allowConsole: {
      type: 'boolean',
      label: 'Allow Console Output',
      description: 'Allow console.log statements in the code',
      defaultValue: true,
    },
    strictMode: {
      type: 'boolean',
      label: 'Strict Mode',
      description: 'Execute code in JavaScript strict mode',
      defaultValue: true,
    },
  },
};

/**
 * Get configuration schema for a specific node type
 */
export const getNodeConfigSchema = (nodeType: string): NodeConfigSchema => {
  return NODE_CONFIG_SCHEMAS[nodeType] || {
    name: {
      type: 'string',
      label: 'Node Name',
      description: 'Display name for this node',
      defaultValue: nodeType,
    },
  };
};

/**
 * Get default configuration values for a node type
 */
export const getDefaultNodeConfig = (nodeType: string): Record<string, any> => {
  const schema = getNodeConfigSchema(nodeType);
  const config: Record<string, any> = {};
  
  Object.entries(schema).forEach(([key, fieldSchema]) => {
    if (fieldSchema.defaultValue !== undefined) {
      config[key] = fieldSchema.defaultValue;
    }
  });
  
  return config;
};

/**
 * Validate node configuration against schema
 */
export const validateNodeConfig = (
  nodeType: string, 
  config: Record<string, any>
): { valid: boolean; errors: string[] } => {
  const schema = getNodeConfigSchema(nodeType);
  const errors: string[] = [];
  
  Object.entries(schema).forEach(([key, fieldSchema]) => {
    const value = config[key];
    
    if (fieldSchema.validation) {
      fieldSchema.validation.forEach(rule => {
        switch (rule.type) {
          case 'required':
            if (value === undefined || value === null || value === '') {
              errors.push(`${fieldSchema.label}: ${rule.message}`);
            }
            break;
          case 'min':
            if (typeof value === 'number' && value < rule.value) {
              errors.push(`${fieldSchema.label}: ${rule.message}`);
            }
            if (typeof value === 'string' && value.length < rule.value) {
              errors.push(`${fieldSchema.label}: ${rule.message}`);
            }
            break;
          case 'max':
            if (typeof value === 'number' && value > rule.value) {
              errors.push(`${fieldSchema.label}: ${rule.message}`);
            }
            if (typeof value === 'string' && value.length > rule.value) {
              errors.push(`${fieldSchema.label}: ${rule.message}`);
            }
            break;
          case 'pattern':
            if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
              errors.push(`${fieldSchema.label}: ${rule.message}`);
            }
            break;
          case 'custom':
            if (rule.validator && !rule.validator(value)) {
              errors.push(`${fieldSchema.label}: ${rule.message}`);
            }
            break;
        }
      });
    }
  });
  
  return {
    valid: errors.length === 0,
    errors,
  };
};