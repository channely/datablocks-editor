import { describe, it, expect, beforeEach } from 'vitest';
import { ChartExecutor } from '../executors/ChartExecutor';
import type { ExecutionContext, Dataset } from '../../types';

describe('ChartExecutor', () => {
  let executor: ChartExecutor;
  let sampleDataset: Dataset;

  beforeEach(() => {
    executor = new ChartExecutor();
    
    // Create sample dataset
    sampleDataset = {
      columns: ['month', 'sales', 'profit', 'quantity'],
      rows: [
        ['Jan', 1000, 200, 50],
        ['Feb', 1200, 250, 60],
        ['Mar', 1100, 220, 55],
        ['Apr', 1300, 280, 65],
        ['May', 1400, 300, 70],
      ],
      metadata: {
        rowCount: 5,
        columnCount: 4,
        types: {
          month: 'string',
          sales: 'number',
          profit: 'number',
          quantity: 'number',
        },
        nullable: {
          month: false,
          sales: false,
          profit: false,
          quantity: false,
        },
        unique: {
          month: true,
          sales: true,
          profit: true,
          quantity: true,
        },
        created: new Date(),
        modified: new Date(),
      },
    };
  });

  describe('execute', () => {
    it('should create a basic bar chart configuration', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-1',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
          chartTitle: 'Monthly Sales',
          colorTheme: 'default',
          showLegend: true,
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output).toBeDefined();
      expect(result.output.type).toBe('bar');
      expect(result.output.data).toBeDefined();
      expect(result.output.data.labels).toEqual(['Jan', 'Feb', 'Mar', 'Apr', 'May']);
      expect(result.output.data.datasets).toHaveLength(1);
      expect(result.output.data.datasets[0].label).toBe('sales');
      expect(result.output.data.datasets[0].data).toEqual([1000, 1200, 1100, 1300, 1400]);
      expect(result.output.options.plugins.title.text).toBe('Monthly Sales');
      expect(result.output.options.plugins.legend.display).toBe(true);
      // Check bar-specific properties
      expect(result.output.data.datasets[0].borderRadius).toBe(4);
      expect(result.output.data.datasets[0].barThickness).toBe('auto');
      expect(result.output.data.datasets[0].maxBarThickness).toBe(40);
    });

    it('should create a bar chart with custom styling', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-styled',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
          chartTitle: 'Styled Bar Chart',
          colorTheme: 'warm',
          showLegend: true,
          barBorderRadius: 8,
          barThickness: 25,
          maxBarThickness: 50,
          showDataLabels: true,
          chartHeight: 400,
        },
        metadata: {
          executionId: 'exec-styled',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.data.datasets[0].borderRadius).toBe(8);
      expect(result.output.data.datasets[0].barThickness).toBe(25);
      expect(result.output.data.datasets[0].maxBarThickness).toBe(50);
      expect(result.output.data.datasets[0].datalabels.display).toBe(true);
      // Check warm color theme
      expect(result.output.data.datasets[0].backgroundColor).toBe('rgba(255, 99, 132, 0.8)');
    });

    it('should create a bar chart with enhanced styling options', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-enhanced',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales', 'profit'],
          chartTitle: 'Enhanced Bar Chart',
          colorTheme: 'blue',
          showLegend: true,
          barBorderRadius: 6,
          barThickness: 'flex',
          maxBarThickness: 45,
          showDataLabels: true,
          chartHeight: 350,
          barBorderWidth: 3,
          barBorderSkipped: false,
          barCategoryPercentage: 0.9,
          barPercentage: 0.8,
          barIndexAxis: 'x',
          barStacked: false,
        },
        metadata: {
          executionId: 'exec-enhanced',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.type).toBe('bar');
      expect(result.output.data.datasets).toHaveLength(2);
      
      // Check enhanced bar styling
      expect(result.output.data.datasets[0].borderRadius).toBe(6);
      expect(result.output.data.datasets[0].barThickness).toBe('flex');
      expect(result.output.data.datasets[0].maxBarThickness).toBe(45);
      expect(result.output.data.datasets[0].borderWidth).toBe(3);
      expect(result.output.data.datasets[0].borderSkipped).toBe(false);
      expect(result.output.data.datasets[0].datalabels.display).toBe(true);
      
      // Check enhanced chart options
      expect(result.output.options.indexAxis).toBe('x');
      expect(result.output.options.datasets.bar.categoryPercentage).toBe(0.9);
      expect(result.output.options.datasets.bar.barPercentage).toBe(0.8);
      expect(result.output.options.scales.x.stacked).toBe(false);
      expect(result.output.options.scales.y.stacked).toBe(false);
    });

    it('should create a horizontal stacked bar chart', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-horizontal-stacked',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales', 'profit'],
          chartTitle: 'Horizontal Stacked Bar Chart',
          colorTheme: 'green',
          showLegend: true,
          barIndexAxis: 'y',
          barStacked: true,
          barBorderRadius: 4,
          barBorderWidth: 2,
          showDataLabels: false,
        },
        metadata: {
          executionId: 'exec-horizontal-stacked',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.type).toBe('bar');
      expect(result.output.data.datasets).toHaveLength(2);
      
      // Check horizontal stacked configuration
      expect(result.output.options.indexAxis).toBe('y');
      expect(result.output.options.scales.x.stacked).toBe(true);
      expect(result.output.options.scales.y.stacked).toBe(true);
      
      // Check data labels are disabled
      expect(result.output.data.datasets[0].datalabels.display).toBe(false);
      expect(result.output.data.datasets[1].datalabels.display).toBe(false);
    });

    it('should create a multi-series line chart', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-2',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'line',
          xAxisColumn: 'month',
          yAxisColumns: ['sales', 'profit'],
          chartTitle: 'Sales vs Profit',
          colorTheme: 'blue',
          showLegend: true,
        },
        metadata: {
          executionId: 'exec-2',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.type).toBe('line');
      expect(result.output.data.datasets).toHaveLength(2);
      expect(result.output.data.datasets[0].label).toBe('sales');
      expect(result.output.data.datasets[1].label).toBe('profit');
      expect(result.output.data.datasets[0].data).toEqual([1000, 1200, 1100, 1300, 1400]);
      expect(result.output.data.datasets[1].data).toEqual([200, 250, 220, 280, 300]);
      // Check line-specific properties
      expect(result.output.data.datasets[0].tension).toBe(0.4);
      expect(result.output.data.datasets[0].pointRadius).toBe(4);
      expect(result.output.data.datasets[0].pointHoverRadius).toBe(6);
    });

    it('should create a line chart with custom styling', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-line-styled',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'line',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
          chartTitle: 'Styled Line Chart',
          colorTheme: 'green',
          showLegend: true,
          lineTension: 0.8,
          pointRadius: 8,
          pointHoverRadius: 12,
          showLine: true,
          fill: true,
        },
        metadata: {
          executionId: 'exec-line-styled',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.data.datasets[0].tension).toBe(0.8);
      expect(result.output.data.datasets[0].pointRadius).toBe(8);
      expect(result.output.data.datasets[0].pointHoverRadius).toBe(12);
      expect(result.output.data.datasets[0].showLine).toBe(true);
      expect(result.output.data.datasets[0].fill).toBe('rgba(75, 192, 192, 0.8)'); // Green theme
    });

    it('should handle scatter chart type', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-3',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'scatter',
          xAxisColumn: 'month',
          yAxisColumns: ['quantity'],
          showLegend: false,
        },
        metadata: {
          executionId: 'exec-3',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.type).toBe('scatter');
      expect(result.output.options.plugins.legend.display).toBe(false);
      // Check scatter-specific properties
      expect(result.output.data.datasets[0].showLine).toBe(false);
      expect(result.output.data.datasets[0].pointRadius).toBe(5);
      expect(result.output.data.datasets[0].pointHoverRadius).toBe(8);
    });

    it('should create a scatter chart with custom styling', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-scatter-styled',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'scatter',
          xAxisColumn: 'sales',
          yAxisColumns: ['profit'],
          chartTitle: 'Sales vs Profit Scatter',
          colorTheme: 'warm',
          showLegend: true,
          scatterPointRadius: 10,
          scatterPointHoverRadius: 15,
          enableZoom: true,
          enablePan: true,
        },
        metadata: {
          executionId: 'exec-scatter-styled',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.data.datasets[0].pointRadius).toBe(10);
      expect(result.output.data.datasets[0].pointHoverRadius).toBe(15);
      expect(result.output.data.datasets[0].showLine).toBe(false);
      // Check warm color theme
      expect(result.output.data.datasets[0].pointBackgroundColor).toBe('rgba(255, 99, 132, 0.8)');
    });

    it('should handle missing input dataset', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-4',
        inputs: {},
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-4',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('No input dataset provided');
    });

    it('should handle missing X-axis column', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-5',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-5',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('X-axis column is required');
    });

    it('should handle invalid column names', async () => {
      const context: ExecutionContext = {
        nodeId: 'chart-6',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'invalid_column',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-6',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain("X-axis column 'invalid_column' not found in dataset");
    });

    it('should convert non-numeric Y-axis values to numbers', async () => {
      const mixedDataset: Dataset = {
        ...sampleDataset,
        rows: [
          ['Jan', '1000', 200, 50],
          ['Feb', '1200', '250', 60],
          ['Mar', 'invalid', 220, 55],
        ],
      };

      const context: ExecutionContext = {
        nodeId: 'chart-7',
        inputs: { data: mixedDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-7',
          startTime: new Date(),
        },
      };

      const result = await executor.execute(context);

      expect(result.success).toBe(true);
      expect(result.output.data.datasets[0].data).toEqual([1000, 1200, 0]); // 'invalid' becomes 0
    });
  });

  describe('validate', () => {
    it('should validate a correct configuration', () => {
      const context: ExecutionContext = {
        nodeId: 'chart-1',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject missing input dataset', () => {
      const context: ExecutionContext = {
        nodeId: 'chart-1',
        inputs: {},
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe('input');
      expect(result.errors[0].code).toBe('REQUIRED_INPUT');
    });

    it('should reject invalid chart type', () => {
      const context: ExecutionContext = {
        nodeId: 'chart-1',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'invalid_type',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'chartType')).toBe(true);
    });

    it('should reject missing X-axis column', () => {
      const context: ExecutionContext = {
        nodeId: 'chart-1',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'xAxisColumn')).toBe(true);
    });

    it('should reject empty Y-axis columns', () => {
      const context: ExecutionContext = {
        nodeId: 'chart-1',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: [],
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'yAxisColumns')).toBe(true);
    });

    it('should reject invalid column names', () => {
      const context: ExecutionContext = {
        nodeId: 'chart-1',
        inputs: { data: sampleDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'invalid_x',
          yAxisColumns: ['invalid_y'],
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'xAxisColumn')).toBe(true);
      expect(result.errors.some(e => e.field === 'yAxisColumns[0]')).toBe(true);
    });

    it('should provide warnings for non-numeric Y-axis data', () => {
      const mixedDataset: Dataset = {
        ...sampleDataset,
        rows: [
          ['Jan', 'text_value', 200, 50],
          ['Feb', 1200, 250, 60],
        ],
      };

      const context: ExecutionContext = {
        nodeId: 'chart-1',
        inputs: { data: mixedDataset },
        config: {
          chartType: 'bar',
          xAxisColumn: 'month',
          yAxisColumns: ['sales'],
        },
        metadata: {
          executionId: 'exec-1',
          startTime: new Date(),
        },
      };

      const result = executor.validate(context);

      expect(result.valid).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(result.warnings?.length).toBeGreaterThan(0);
      expect(result.warnings?.[0].code).toBe('NON_NUMERIC_DATA');
    });
  });
});