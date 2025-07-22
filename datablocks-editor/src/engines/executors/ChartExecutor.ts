import type {
  ExecutionContext,
  ExecutionResult,
  ValidationResult,
  Dataset,
} from '../../types';

import { NodeExecutor } from '../NodeExecutor';

/**
 * Chart node executor
 * Processes dataset and generates chart configuration
 */
export class ChartExecutor extends NodeExecutor {
  constructor() {
    super('chart');
  }

  async execute(context: ExecutionContext): Promise<ExecutionResult> {
    return this.safeExecute(context, async () => {
      const { inputs, config } = context;
      
      // Get input dataset
      const inputDataset = this.getInputDataset(inputs);
      if (!inputDataset) {
        throw new Error('No input dataset provided');
      }

      const {
        chartType = 'bar',
        xAxisColumn,
        yAxisColumns = [],
        colorTheme = 'default',
        chartTitle = '',
        showLegend = true,
        barBorderRadius = 4,
        barThickness = 'auto',
        maxBarThickness = 40,
        showDataLabels = false,
        chartHeight = 300,
        // 柱状图特定配置
        barBorderWidth = 2,
        barBorderSkipped = false,
        barCategoryPercentage = 0.8,
        barPercentage = 0.9,
        barIndexAxis = 'x',
        barStacked = false,
        // 折线图配置
        lineTension = 0.4,
        pointRadius = 4,
        pointHoverRadius = 6,
        showLine = true,
        fill = false,
        // 散点图配置
        scatterPointRadius = 5,
        scatterPointHoverRadius = 8,
        enableZoom = true,
        enablePan = true,
      } = config;

      // Validate required fields
      if (!xAxisColumn) {
        throw new Error('X-axis column is required');
      }

      if (!yAxisColumns || yAxisColumns.length === 0) {
        throw new Error('At least one Y-axis column is required');
      }

      // Validate columns exist in dataset
      const xColumnIndex = inputDataset.columns.indexOf(xAxisColumn);
      if (xColumnIndex === -1) {
        throw new Error(`X-axis column '${xAxisColumn}' not found in dataset`);
      }

      const yColumnIndices: number[] = [];
      for (const yColumn of yAxisColumns) {
        const yColumnIndex = inputDataset.columns.indexOf(yColumn);
        if (yColumnIndex === -1) {
          throw new Error(`Y-axis column '${yColumn}' not found in dataset`);
        }
        yColumnIndices.push(yColumnIndex);
      }

      // Process data for chart
      const chartData = this.processChartData(
        inputDataset,
        xColumnIndex,
        yColumnIndices,
        yAxisColumns,
        chartType,
        colorTheme,
        barBorderRadius,
        barThickness,
        maxBarThickness,
        showDataLabels,
        barBorderWidth,
        barBorderSkipped,
        lineTension,
        pointRadius,
        pointHoverRadius,
        showLine,
        fill,
        scatterPointRadius,
        scatterPointHoverRadius
      );

      // Generate chart configuration
      const chartConfig = {
        type: chartType,
        data: chartData,
        options: this.generateChartOptions(
          chartTitle,
          showLegend,
          xAxisColumn,
          yAxisColumns,
          chartType,
          chartHeight,
          barCategoryPercentage,
          barPercentage,
          barIndexAxis,
          barStacked
        ),
        theme: colorTheme,
        metadata: {
          rowCount: inputDataset.rows.length,
          xAxisColumn,
          yAxisColumns,
          chartType,
          generated: new Date(),
        },
      };

      return chartConfig;
    });
  }

  validate(context: ExecutionContext): ValidationResult {
    const { inputs, config } = context;
    const errors = [];

    // Check for input dataset
    const inputDataset = this.getInputDataset(inputs);
    if (!inputDataset) {
      errors.push({
        field: 'input',
        message: 'Input dataset is required',
        code: 'REQUIRED_INPUT',
      });
      return { valid: false, errors };
    }

    // Validate chart type
    const validChartTypes = ['bar', 'line', 'scatter'];
    if (config.chartType && !validChartTypes.includes(config.chartType)) {
      errors.push({
        field: 'chartType',
        message: `Invalid chart type. Must be one of: ${validChartTypes.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }

    // Validate X-axis column
    if (!config.xAxisColumn) {
      errors.push({
        field: 'xAxisColumn',
        message: 'X-axis column selection is required',
        code: 'REQUIRED_FIELD',
      });
    } else if (!inputDataset.columns.includes(config.xAxisColumn)) {
      errors.push({
        field: 'xAxisColumn',
        message: `X-axis column '${config.xAxisColumn}' not found in dataset`,
        code: 'INVALID_COLUMN',
      });
    }

    // Validate Y-axis columns
    if (!config.yAxisColumns || !Array.isArray(config.yAxisColumns)) {
      errors.push({
        field: 'yAxisColumns',
        message: 'Y-axis columns must be an array',
        code: 'INVALID_TYPE',
      });
    } else if (config.yAxisColumns.length === 0) {
      errors.push({
        field: 'yAxisColumns',
        message: 'At least one Y-axis column is required',
        code: 'REQUIRED_FIELD',
      });
    } else {
      config.yAxisColumns.forEach((column: string, index: number) => {
        if (!column) {
          errors.push({
            field: `yAxisColumns[${index}]`,
            message: `Y-axis column ${index + 1} cannot be empty`,
            code: 'REQUIRED_FIELD',
          });
        } else if (!inputDataset.columns.includes(column)) {
          errors.push({
            field: `yAxisColumns[${index}]`,
            message: `Y-axis column '${column}' not found in dataset`,
            code: 'INVALID_COLUMN',
          });
        }
      });
    }

    // Validate color theme
    const validThemes = ['default', 'blue', 'green'];
    if (config.colorTheme && !validThemes.includes(config.colorTheme)) {
      errors.push({
        field: 'colorTheme',
        message: `Invalid color theme. Must be one of: ${validThemes.join(', ')}`,
        code: 'INVALID_VALUE',
      });
    }

    // Check for numeric data in Y-axis columns (warning)
    const warnings = [];
    if (config.yAxisColumns && Array.isArray(config.yAxisColumns)) {
      config.yAxisColumns.forEach((column: string) => {
        if (inputDataset.columns.includes(column)) {
          const columnIndex = inputDataset.columns.indexOf(column);
          const hasNonNumericData = inputDataset.rows.some(row => {
            const value = row[columnIndex];
            return value != null && isNaN(Number(value));
          });

          if (hasNonNumericData) {
            warnings.push({
              field: column,
              message: `Column '${column}' contains non-numeric data which may affect chart display`,
              code: 'NON_NUMERIC_DATA',
            });
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  private getInputDataset(inputs: Record<string, any>): Dataset | null {
    // Find the first dataset input
    for (const input of Object.values(inputs)) {
      if (input && typeof input === 'object' && 'columns' in input && 'rows' in input) {
        return input as Dataset;
      }
    }
    return null;
  }

  private processChartData(
    dataset: Dataset,
    xColumnIndex: number,
    yColumnIndices: number[],
    yAxisColumns: string[],
    chartType: string = 'bar',
    colorTheme: string = 'default',
    barBorderRadius: number = 4,
    barThickness: string | number = 'auto',
    maxBarThickness: number = 40,
    showDataLabels: boolean = false,
    barBorderWidth: number = 2,
    barBorderSkipped: boolean = false,
    lineTension: number = 0.4,
    pointRadius: number = 4,
    pointHoverRadius: number = 6,
    showLine: boolean = true,
    fill: boolean = false,
    scatterPointRadius: number = 5,
    scatterPointHoverRadius: number = 8
  ) {
    // Extract labels from X-axis column
    const labels = dataset.rows.map(row => {
      const value = row[xColumnIndex];
      return value != null ? String(value) : '';
    });

    // Color themes
    const colorThemes = {
      default: {
        colors: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
          'rgba(255, 159, 64, 0.8)',
        ],
        borderColors: [
          'rgba(54, 162, 235, 1)',
          'rgba(255, 99, 132, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 159, 64, 1)',
        ],
      },
      blue: {
        colors: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(30, 144, 255, 0.8)',
          'rgba(70, 130, 180, 0.8)',
          'rgba(100, 149, 237, 0.8)',
          'rgba(135, 206, 250, 0.8)',
        ],
        borderColors: [
          'rgba(54, 162, 235, 1)',
          'rgba(30, 144, 255, 1)',
          'rgba(70, 130, 180, 1)',
          'rgba(100, 149, 237, 1)',
          'rgba(135, 206, 250, 1)',
        ],
      },
      green: {
        colors: [
          'rgba(75, 192, 192, 0.8)',
          'rgba(34, 139, 34, 0.8)',
          'rgba(50, 205, 50, 0.8)',
          'rgba(144, 238, 144, 0.8)',
          'rgba(152, 251, 152, 0.8)',
        ],
        borderColors: [
          'rgba(75, 192, 192, 1)',
          'rgba(34, 139, 34, 1)',
          'rgba(50, 205, 50, 1)',
          'rgba(144, 238, 144, 1)',
          'rgba(152, 251, 152, 1)',
        ],
      },
      warm: {
        colors: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(255, 159, 64, 0.8)',
          'rgba(255, 205, 86, 0.8)',
          'rgba(255, 99, 71, 0.8)',
          'rgba(255, 140, 0, 0.8)',
        ],
        borderColors: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(255, 205, 86, 1)',
          'rgba(255, 99, 71, 1)',
          'rgba(255, 140, 0, 1)',
        ],
      },
    };

    // Get the selected theme or default
    const theme = colorThemes[colorTheme as keyof typeof colorThemes] || colorThemes.default;

    // Generate datasets for each Y-axis column
    const datasets = yColumnIndices.map((yColumnIndex, index) => {
      const data = dataset.rows.map(row => {
        const value = row[yColumnIndex];
        return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      });

      const baseDataset = {
        label: yAxisColumns[index],
        data,
        backgroundColor: theme.colors[index % theme.colors.length],
        borderColor: theme.borderColors[index % theme.borderColors.length],
        borderWidth: 2,
        tension: chartType === 'line' ? 0.4 : 0,
      };

      // Add bar-specific configurations
      if (chartType === 'bar') {
        return {
          ...baseDataset,
          borderWidth: barBorderWidth,
          borderRadius: barBorderRadius,
          borderSkipped: barBorderSkipped,
          barThickness: barThickness === 'auto' || barThickness === 'flex' ? barThickness : Number(barThickness),
          maxBarThickness: maxBarThickness,
          // Enhanced bar styling
          hoverBackgroundColor: theme.borderColors[index % theme.borderColors.length],
          hoverBorderColor: theme.borderColors[index % theme.borderColors.length],
          hoverBorderWidth: barBorderWidth + 1,
          // Data labels configuration (if supported by Chart.js plugins)
          datalabels: showDataLabels ? {
            display: true,
            anchor: 'end' as const,
            align: 'top' as const,
            formatter: (value: number) => value.toLocaleString(),
            font: {
              size: 10,
              weight: 'bold' as const,
            },
            color: theme.borderColors[index % theme.borderColors.length],
            backgroundColor: 'rgba(255, 255, 255, 0.8)',
            borderColor: theme.borderColors[index % theme.borderColors.length],
            borderRadius: 4,
            borderWidth: 1,
            padding: 4,
          } : {
            display: false,
          },
        };
      }

      // Add line-specific configurations
      if (chartType === 'line') {
        return {
          ...baseDataset,
          tension: lineTension,
          pointRadius: pointRadius,
          pointHoverRadius: pointHoverRadius,
          pointBackgroundColor: theme.borderColors[index % theme.borderColors.length],
          pointBorderColor: theme.borderColors[index % theme.borderColors.length],
          pointBorderWidth: 2,
          fill: fill ? theme.colors[index % theme.colors.length] : false,
          showLine: showLine,
        };
      }

      // Add scatter-specific configurations
      if (chartType === 'scatter') {
        return {
          ...baseDataset,
          showLine: false,
          pointRadius: scatterPointRadius,
          pointHoverRadius: scatterPointHoverRadius,
          pointBackgroundColor: theme.colors[index % theme.colors.length],
          pointBorderColor: theme.borderColors[index % theme.borderColors.length],
          pointBorderWidth: 2,
        };
      }

      return baseDataset;
    });

    return {
      labels,
      datasets,
    };
  }

  private generateChartOptions(
    title: string,
    showLegend: boolean,
    xAxisColumn: string,
    yAxisColumns: string[],
    chartType: string = 'bar',
    chartHeight: number = 300,
    barCategoryPercentage: number = 0.8,
    barPercentage: number = 0.9,
    barIndexAxis: string = 'x',
    barStacked: boolean = false
  ) {
    const baseOptions = {
      responsive: true,
      maintainAspectRatio: false,
      resizeDelay: 100,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top' as const,
          labels: {
            usePointStyle: true,
            padding: 20,
            font: {
              size: 12,
            },
          },
        },
        title: {
          display: !!title,
          text: title,
          font: {
            size: 16,
            weight: 'bold' as const,
          },
          padding: {
            top: 10,
            bottom: 30,
          },
        },
        tooltip: {
          mode: chartType === 'bar' ? 'index' : 'nearest',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: 'white',
          bodyColor: 'white',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            label: function(context: any) {
              const label = context.dataset.label || '';
              const value = typeof context.parsed.y !== 'undefined' ? context.parsed.y : context.parsed;
              return `${label}: ${Number(value).toLocaleString()}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: xAxisColumn,
            font: {
              size: 14,
              weight: 'bold' as const,
            },
          },
          grid: {
            display: chartType === 'bar',
            color: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
            font: {
              size: 11,
            },
            maxRotation: 45,
            minRotation: 0,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: yAxisColumns.length === 1 ? yAxisColumns[0] : '数值',
            font: {
              size: 14,
              weight: 'bold' as const,
            },
          },
          beginAtZero: true,
          grid: {
            display: true,
            color: 'rgba(0, 0, 0, 0.1)',
          },
          ticks: {
            font: {
              size: 11,
            },
            callback: function(value: any) {
              return Number(value).toLocaleString();
            },
          },
        },
      },
      interaction: {
        mode: chartType === 'bar' ? 'index' : 'nearest',
        axis: 'x',
        intersect: false,
      },
      animation: {
        duration: 750,
        easing: 'easeInOutQuart' as const,
      },
      layout: {
        padding: {
          top: 10,
          right: 10,
          bottom: 10,
          left: 10,
        },
      },
    };

    // Add bar-specific options
    if (chartType === 'bar') {
      return {
        ...baseOptions,
        indexAxis: barIndexAxis as 'x' | 'y',
        datasets: {
          bar: {
            categoryPercentage: barCategoryPercentage,
            barPercentage: barPercentage,
          },
        },
        scales: {
          ...baseOptions.scales,
          x: {
            ...baseOptions.scales.x,
            stacked: barStacked,
            grid: {
              display: barIndexAxis === 'y',
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
          y: {
            ...baseOptions.scales.y,
            stacked: barStacked,
            grid: {
              display: barIndexAxis === 'x',
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
        elements: {
          bar: {
            borderWidth: 2,
            borderRadius: 4,
            borderSkipped: false,
          },
        },
      };
    }

    // Add line-specific options
    if (chartType === 'line') {
      return {
        ...baseOptions,
        elements: {
          line: {
            tension: 0.4,
            borderWidth: 3,
            fill: false,
          },
          point: {
            radius: 4,
            hoverRadius: 6,
            borderWidth: 2,
          },
        },
        scales: {
          ...baseOptions.scales,
          x: {
            ...baseOptions.scales.x,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.05)',
            },
          },
          y: {
            ...baseOptions.scales.y,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
      };
    }

    // Add scatter-specific options
    if (chartType === 'scatter') {
      return {
        ...baseOptions,
        elements: {
          point: {
            radius: 5,
            hoverRadius: 8,
            borderWidth: 2,
          },
        },
        scales: {
          ...baseOptions.scales,
          x: {
            ...baseOptions.scales.x,
            type: 'linear' as const,
            position: 'bottom' as const,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
          y: {
            ...baseOptions.scales.y,
            grid: {
              display: true,
              color: 'rgba(0, 0, 0, 0.1)',
            },
          },
        },
      };
    }

    return baseOptions;
  }
}