import React, { useCallback, useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import type { ChartOptions, ChartData } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import type { NodeInstance, Dataset } from '../../types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface ChartNodeProps {
  node: NodeInstance;
  onConfigChange: (config: Record<string, any>) => void;
}

// 可用的图表类型
const CHART_TYPES = [
  { value: 'bar', label: '柱状图', icon: '📊' },
  { value: 'line', label: '折线图', icon: '📈' },
  { value: 'scatter', label: '散点图', icon: '⚪' },
];

// 图表颜色主题
const COLOR_THEMES = [
  {
    name: 'default',
    label: '默认',
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
  {
    name: 'blue',
    label: '蓝色系',
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
  {
    name: 'green',
    label: '绿色系',
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
  {
    name: 'warm',
    label: '暖色系',
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
];

// 柱状图特定配置选项
const BAR_CHART_OPTIONS = {
  borderRadius: [0, 2, 4, 6, 8],
  borderSkipped: ['start', 'end', 'middle', 'bottom', 'top', 'left', 'right'],
  barThickness: ['auto', 'flex', 10, 15, 20, 25, 30],
  maxBarThickness: [20, 30, 40, 50, 60],
};

export const ChartNode: React.FC<ChartNodeProps> = ({
  node,
  onConfigChange,
}) => {
  const [chartType, setChartType] = useState<string>('bar');
  const [xAxisColumn, setXAxisColumn] = useState<string>('');
  const [yAxisColumns, setYAxisColumns] = useState<string[]>([]);
  const [colorTheme, setColorTheme] = useState<string>('default');
  const [chartTitle, setChartTitle] = useState<string>('');
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [inputData, setInputData] = useState<Dataset | null>(null);
  const chartRef = useRef<any>(null);
  
  // 柱状图特定配置
  const [barBorderRadius, setBarBorderRadius] = useState<number>(4);
  const [barThickness, setBarThickness] = useState<string | number>('auto');
  const [maxBarThickness, setMaxBarThickness] = useState<number>(40);
  const [showDataLabels, setShowDataLabels] = useState<boolean>(false);
  const [chartHeight, setChartHeight] = useState<number>(300);
  const [barBorderWidth, setBarBorderWidth] = useState<number>(2);
  const [barBorderSkipped, setBarBorderSkipped] = useState<boolean>(false);
  const [barCategoryPercentage, setBarCategoryPercentage] = useState<number>(0.8);
  const [barPercentage, setBarPercentage] = useState<number>(0.9);
  const [barIndexAxis, setBarIndexAxis] = useState<string>('x');
  const [barStacked, setBarStacked] = useState<boolean>(false);
  
  // 折线图特定配置
  const [lineTension, setLineTension] = useState<number>(0.4);
  const [pointRadius, setPointRadius] = useState<number>(4);
  const [pointHoverRadius, setPointHoverRadius] = useState<number>(6);
  const [showLine, setShowLine] = useState<boolean>(true);
  const [fill, setFill] = useState<boolean>(false);
  
  // 散点图特定配置
  const [scatterPointRadius, setScatterPointRadius] = useState<number>(5);
  const [scatterPointHoverRadius, setScatterPointHoverRadius] = useState<number>(8);
  const [enableZoom, setEnableZoom] = useState<boolean>(true);
  const [enablePan, setEnablePan] = useState<boolean>(true);

  const handleConfigChange = useCallback((key: string, value: any) => {
    onConfigChange({
      ...node.config,
      [key]: value,
    });
  }, [node.config, onConfigChange]);

  // 初始化配置
  useEffect(() => {
    if (node.config.chartType) setChartType(node.config.chartType);
    if (node.config.xAxisColumn) setXAxisColumn(node.config.xAxisColumn);
    if (node.config.yAxisColumns) setYAxisColumns(node.config.yAxisColumns);
    if (node.config.colorTheme) setColorTheme(node.config.colorTheme);
    if (node.config.chartTitle) setChartTitle(node.config.chartTitle);
    if (node.config.showLegend !== undefined) setShowLegend(node.config.showLegend);
    if (node.config.barBorderRadius !== undefined) setBarBorderRadius(node.config.barBorderRadius);
    if (node.config.barThickness !== undefined) setBarThickness(node.config.barThickness);
    if (node.config.maxBarThickness !== undefined) setMaxBarThickness(node.config.maxBarThickness);
    if (node.config.showDataLabels !== undefined) setShowDataLabels(node.config.showDataLabels);
    if (node.config.chartHeight !== undefined) setChartHeight(node.config.chartHeight);
    if (node.config.barBorderWidth !== undefined) setBarBorderWidth(node.config.barBorderWidth);
    if (node.config.barBorderSkipped !== undefined) setBarBorderSkipped(node.config.barBorderSkipped);
    if (node.config.barCategoryPercentage !== undefined) setBarCategoryPercentage(node.config.barCategoryPercentage);
    if (node.config.barPercentage !== undefined) setBarPercentage(node.config.barPercentage);
    if (node.config.barIndexAxis !== undefined) setBarIndexAxis(node.config.barIndexAxis);
    if (node.config.barStacked !== undefined) setBarStacked(node.config.barStacked);
    // 折线图配置
    if (node.config.lineTension !== undefined) setLineTension(node.config.lineTension);
    if (node.config.pointRadius !== undefined) setPointRadius(node.config.pointRadius);
    if (node.config.pointHoverRadius !== undefined) setPointHoverRadius(node.config.pointHoverRadius);
    if (node.config.showLine !== undefined) setShowLine(node.config.showLine);
    if (node.config.fill !== undefined) setFill(node.config.fill);
    // 散点图配置
    if (node.config.scatterPointRadius !== undefined) setScatterPointRadius(node.config.scatterPointRadius);
    if (node.config.scatterPointHoverRadius !== undefined) setScatterPointHoverRadius(node.config.scatterPointHoverRadius);
    if (node.config.enableZoom !== undefined) setEnableZoom(node.config.enableZoom);
    if (node.config.enablePan !== undefined) setEnablePan(node.config.enablePan);
  }, [node.config]);

  // 更新配置
  useEffect(() => {
    handleConfigChange('chartType', chartType);
    handleConfigChange('xAxisColumn', xAxisColumn);
    handleConfigChange('yAxisColumns', yAxisColumns);
    handleConfigChange('colorTheme', colorTheme);
    handleConfigChange('chartTitle', chartTitle);
    handleConfigChange('showLegend', showLegend);
    handleConfigChange('barBorderRadius', barBorderRadius);
    handleConfigChange('barThickness', barThickness);
    handleConfigChange('maxBarThickness', maxBarThickness);
    handleConfigChange('showDataLabels', showDataLabels);
    handleConfigChange('chartHeight', chartHeight);
    handleConfigChange('barBorderWidth', barBorderWidth);
    handleConfigChange('barBorderSkipped', barBorderSkipped);
    handleConfigChange('barCategoryPercentage', barCategoryPercentage);
    handleConfigChange('barPercentage', barPercentage);
    handleConfigChange('barIndexAxis', barIndexAxis);
    handleConfigChange('barStacked', barStacked);
    // 折线图配置
    handleConfigChange('lineTension', lineTension);
    handleConfigChange('pointRadius', pointRadius);
    handleConfigChange('pointHoverRadius', pointHoverRadius);
    handleConfigChange('showLine', showLine);
    handleConfigChange('fill', fill);
    // 散点图配置
    handleConfigChange('scatterPointRadius', scatterPointRadius);
    handleConfigChange('scatterPointHoverRadius', scatterPointHoverRadius);
    handleConfigChange('enableZoom', enableZoom);
    handleConfigChange('enablePan', enablePan);
  }, [
    chartType, xAxisColumn, yAxisColumns, colorTheme, chartTitle, showLegend, 
    barBorderRadius, barThickness, maxBarThickness, showDataLabels, chartHeight,
    barBorderWidth, barBorderSkipped, barCategoryPercentage, barPercentage, barIndexAxis, barStacked,
    lineTension, pointRadius, pointHoverRadius, showLine, fill,
    scatterPointRadius, scatterPointHoverRadius, enableZoom, enablePan,
    handleConfigChange
  ]);

  // 从输入数据中提取可用列
  useEffect(() => {
    if (node.data && node.data.inputData && node.data.inputData.columns) {
      const dataset = node.data.inputData as Dataset;
      setInputData(dataset);
      setAvailableColumns(dataset.columns);
    } else {
      // 使用示例列作为后备
      const mockColumns = ['date', 'product', 'sales', 'quantity', 'revenue'];
      setAvailableColumns(mockColumns);
      setInputData(null);
    }
  }, [node.data]);

  // 添加Y轴列
  const addYAxisColumn = useCallback(() => {
    if (availableColumns.length > 0) {
      const availableColumn = availableColumns.find(col => 
        col !== xAxisColumn && !yAxisColumns.includes(col)
      );
      if (availableColumn) {
        setYAxisColumns(prev => [...prev, availableColumn]);
      }
    }
  }, [availableColumns, xAxisColumn, yAxisColumns]);

  // 移除Y轴列
  const removeYAxisColumn = useCallback((index: number) => {
    setYAxisColumns(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 更新Y轴列
  const updateYAxisColumn = useCallback((index: number, column: string) => {
    setYAxisColumns(prev => prev.map((col, i) => i === index ? column : col));
  }, []);

  // 生成图表数据
  const generateChartData = useCallback((): ChartData<'bar'> | ChartData<'line'> | null => {
    if (!inputData || !xAxisColumn || yAxisColumns.length === 0) {
      return null;
    }

    const xColumnIndex = inputData.columns.indexOf(xAxisColumn);
    if (xColumnIndex === -1) return null;

    // 获取X轴标签
    const labels = inputData.rows.map(row => String(row[xColumnIndex]));

    // 获取颜色主题
    const theme = COLOR_THEMES.find(t => t.name === colorTheme) || COLOR_THEMES[0];

    // 生成数据集
    const datasets = yAxisColumns.map((yColumn, index) => {
      const yColumnIndex = inputData.columns.indexOf(yColumn);
      if (yColumnIndex === -1) return null;

      const data = inputData.rows.map(row => {
        const value = row[yColumnIndex];
        return typeof value === 'number' ? value : parseFloat(value) || 0;
      });

      const baseDataset = {
        label: yColumn,
        data,
        backgroundColor: theme.colors[index % theme.colors.length],
        borderColor: theme.borderColors[index % theme.borderColors.length],
        borderWidth: 2,
        tension: chartType === 'line' ? lineTension : 0,
      };

      // 为柱状图添加特定样式配置
      if (chartType === 'bar') {
        return {
          ...baseDataset,
          borderRadius: barBorderRadius,
          borderSkipped: false,
          barThickness: barThickness === 'auto' || barThickness === 'flex' ? barThickness : Number(barThickness),
          maxBarThickness: maxBarThickness,
          // 数据标签配置
          datalabels: showDataLabels ? {
            display: true,
            anchor: 'end',
            align: 'top',
            formatter: (value: number) => value.toLocaleString(),
            font: {
              size: 10,
              weight: 'bold',
            },
            color: theme.borderColors[index % theme.borderColors.length],
          } : {
            display: false,
          },
        };
      }

      // 为折线图添加特定样式配置
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

      // 为散点图添加特定样式配置
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
    }).filter(Boolean);

    return {
      labels,
      datasets: datasets as any[],
    };
  }, [inputData, xAxisColumn, yAxisColumns, colorTheme, chartType, barBorderRadius, barThickness, maxBarThickness, showDataLabels]);

  // 生成图表选项
  const generateChartOptions = useCallback((): ChartOptions<'bar' | 'line'> => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: showLegend,
          position: 'top' as const,
        },
        title: {
          display: !!chartTitle,
          text: chartTitle,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: xAxisColumn,
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: yAxisColumns.length === 1 ? yAxisColumns[0] : '数值',
          },
          beginAtZero: true,
        },
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false,
      },
    };
  }, [showLegend, chartTitle, xAxisColumn, yAxisColumns]);

  const chartData = generateChartData();
  const chartOptions = generateChartOptions();

  // 渲染图表组件
  const renderChart = () => {
    if (!chartData) {
      return (
        <div className="h-64 flex items-center justify-center text-gray-500 bg-gray-50 rounded border-2 border-dashed border-gray-300">
          <div className="text-center">
            <div className="text-2xl mb-2">📊</div>
            <div>请配置图表参数</div>
            <div className="text-sm">选择X轴和Y轴字段</div>
          </div>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return <Bar ref={chartRef} data={chartData as ChartData<'bar'>} options={chartOptions as ChartOptions<'bar'>} />;
      case 'line':
        return <Line ref={chartRef} data={chartData as ChartData<'line'>} options={chartOptions as ChartOptions<'line'>} />;
      case 'scatter':
        return <Line 
          ref={chartRef} 
          data={chartData as ChartData<'line'>} 
          options={{
            ...chartOptions,
            elements: {
              line: {
                tension: 0,
              },
              point: {
                radius: 5,
              },
            },
            showLine: false,
          } as ChartOptions<'line'>} 
        />;
      default:
        return <Bar ref={chartRef} data={chartData as ChartData<'bar'>} options={chartOptions as ChartOptions<'bar'>} />;
    }
  };

  const hasValidConfig = xAxisColumn && yAxisColumns.length > 0;

  return (
    <div className="bg-white border-2 border-gray-200 rounded-lg shadow-sm min-w-[500px]">
      {/* Node Header */}
      <div className="flex items-center gap-2 p-3 bg-yellow-50 border-b border-gray-200 rounded-t-lg">
        <span className="text-lg">📊</span>
        <span className="font-medium text-gray-900">图表</span>
        {node.status === 'processing' && (
          <div className="ml-auto">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-600"></div>
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

      {/* Chart Configuration */}
      <div className="p-4 space-y-4">
        {/* 图表类型选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            图表类型
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CHART_TYPES.map(type => (
              <button
                key={type.value}
                onClick={() => setChartType(type.value)}
                className={`p-2 text-sm border rounded text-center transition-colors ${
                  chartType === type.value
                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="text-lg mb-1">{type.icon}</div>
                <div>{type.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* X轴字段选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            X轴字段
          </label>
          <select
            value={xAxisColumn}
            onChange={(e) => setXAxisColumn(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">选择X轴字段</option>
            {availableColumns.map(column => (
              <option key={column} value={column}>{column}</option>
            ))}
          </select>
        </div>

        {/* Y轴字段选择 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">
              Y轴字段
            </label>
            <button
              onClick={addYAxisColumn}
              disabled={yAxisColumns.length >= availableColumns.length - 1}
              className="px-2 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded disabled:text-gray-400 disabled:hover:bg-transparent"
            >
              + 添加字段
            </button>
          </div>

          {yAxisColumns.length === 0 ? (
            <div className="p-3 text-sm text-gray-500 bg-gray-50 rounded border-2 border-dashed border-gray-300 text-center">
              点击"添加字段"选择Y轴数据
            </div>
          ) : (
            <div className="space-y-2">
              {yAxisColumns.map((column, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={column}
                    onChange={(e) => updateYAxisColumn(index, e.target.value)}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">选择字段</option>
                    {availableColumns
                      .filter(col => col !== xAxisColumn)
                      .map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                  </select>
                  <button
                    onClick={() => removeYAxisColumn(index)}
                    className="px-2 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                    title="删除字段"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 图表标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            图表标题
          </label>
          <input
            type="text"
            value={chartTitle}
            onChange={(e) => setChartTitle(e.target.value)}
            placeholder="输入图表标题（可选）"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* 颜色主题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            颜色主题
          </label>
          <select
            value={colorTheme}
            onChange={(e) => setColorTheme(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
          >
            {COLOR_THEMES.map(theme => (
              <option key={theme.name} value={theme.name}>{theme.label}</option>
            ))}
          </select>
        </div>

        {/* 柱状图特定配置 */}
        {chartType === 'bar' && (
          <div className="space-y-4 p-3 bg-blue-50 rounded border border-blue-200">
            <h4 className="text-sm font-medium text-blue-800">柱状图样式配置</h4>
            
            {/* 柱子圆角 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                柱子圆角 ({barBorderRadius}px)
              </label>
              <input
                type="range"
                min="0"
                max="8"
                step="1"
                value={barBorderRadius}
                onChange={(e) => setBarBorderRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0px</span>
                <span>8px</span>
              </div>
            </div>

            {/* 柱子厚度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                柱子厚度
              </label>
              <select
                value={barThickness}
                onChange={(e) => setBarThickness(e.target.value === 'auto' || e.target.value === 'flex' ? e.target.value : Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="auto">自动</option>
                <option value="flex">弹性</option>
                {BAR_CHART_OPTIONS.barThickness.filter(t => typeof t === 'number').map(thickness => (
                  <option key={thickness} value={thickness}>{thickness}px</option>
                ))}
              </select>
            </div>

            {/* 最大柱子厚度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                最大柱子厚度 ({maxBarThickness}px)
              </label>
              <input
                type="range"
                min="20"
                max="60"
                step="10"
                value={maxBarThickness}
                onChange={(e) => setMaxBarThickness(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>20px</span>
                <span>60px</span>
              </div>
            </div>

            {/* 显示数据标签 */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={showDataLabels}
                  onChange={(e) => setShowDataLabels(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">显示数据标签</span>
              </label>
            </div>

            {/* 柱子边框宽度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                柱子边框宽度 ({barBorderWidth}px)
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="1"
                value={barBorderWidth}
                onChange={(e) => setBarBorderWidth(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0px</span>
                <span>5px</span>
              </div>
            </div>

            {/* 柱子间距配置 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                类别间距 ({(barCategoryPercentage * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.1"
                value={barCategoryPercentage}
                onChange={(e) => setBarCategoryPercentage(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                柱子间距 ({(barPercentage * 100).toFixed(0)}%)
              </label>
              <input
                type="range"
                min="0.5"
                max="1"
                step="0.1"
                value={barPercentage}
                onChange={(e) => setBarPercentage(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>50%</span>
                <span>100%</span>
              </div>
            </div>

            {/* 柱状图方向 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                柱状图方向
              </label>
              <select
                value={barIndexAxis}
                onChange={(e) => setBarIndexAxis(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="x">垂直柱状图</option>
                <option value="y">水平柱状图</option>
              </select>
            </div>

            {/* 堆叠选项 */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={barStacked}
                  onChange={(e) => setBarStacked(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">堆叠柱状图</span>
              </label>
            </div>

            {/* 边框跳过选项 */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={barBorderSkipped}
                  onChange={(e) => setBarBorderSkipped(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">跳过底部边框</span>
              </label>
            </div>
          </div>
        )}

        {/* 折线图特定配置 */}
        {chartType === 'line' && (
          <div className="space-y-4 p-3 bg-green-50 rounded border border-green-200">
            <h4 className="text-sm font-medium text-green-800">折线图样式配置</h4>
            
            {/* 线条平滑度 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                线条平滑度 ({lineTension.toFixed(1)})
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={lineTension}
                onChange={(e) => setLineTension(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>直线</span>
                <span>平滑</span>
              </div>
            </div>

            {/* 数据点大小 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                数据点大小 ({pointRadius}px)
              </label>
              <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={pointRadius}
                onChange={(e) => setPointRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>0px</span>
                <span>10px</span>
              </div>
            </div>

            {/* 悬停时数据点大小 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                悬停时数据点大小 ({pointHoverRadius}px)
              </label>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={pointHoverRadius}
                onChange={(e) => setPointHoverRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>2px</span>
                <span>15px</span>
              </div>
            </div>

            {/* 填充区域 */}
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={fill}
                  onChange={(e) => setFill(e.target.checked)}
                  className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">填充线条下方区域</span>
              </label>
            </div>
          </div>
        )}

        {/* 散点图特定配置 */}
        {chartType === 'scatter' && (
          <div className="space-y-4 p-3 bg-purple-50 rounded border border-purple-200">
            <h4 className="text-sm font-medium text-purple-800">散点图样式配置</h4>
            
            {/* 散点大小 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                散点大小 ({scatterPointRadius}px)
              </label>
              <input
                type="range"
                min="2"
                max="15"
                step="1"
                value={scatterPointRadius}
                onChange={(e) => setScatterPointRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>2px</span>
                <span>15px</span>
              </div>
            </div>

            {/* 悬停时散点大小 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                悬停时散点大小 ({scatterPointHoverRadius}px)
              </label>
              <input
                type="range"
                min="4"
                max="20"
                step="1"
                value={scatterPointHoverRadius}
                onChange={(e) => setScatterPointHoverRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>4px</span>
                <span>20px</span>
              </div>
            </div>

            {/* 交互功能 */}
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enableZoom}
                  onChange={(e) => setEnableZoom(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">启用缩放功能</span>
              </label>
              
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={enablePan}
                  onChange={(e) => setEnablePan(e.target.checked)}
                  className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-700">启用平移功能</span>
              </label>
            </div>
          </div>
        )}

        {/* 图表高度配置 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            图表高度 ({chartHeight}px)
          </label>
          <input
            type="range"
            min="200"
            max="600"
            step="50"
            value={chartHeight}
            onChange={(e) => setChartHeight(Number(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>200px</span>
            <span>600px</span>
          </div>
        </div>

        {/* 显示选项 */}
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showLegend}
              onChange={(e) => setShowLegend(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">显示图例</span>
          </label>
        </div>

        {/* 图表预览 */}
        {hasValidConfig && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              图表预览
            </label>
            <div 
              className="border border-gray-300 rounded bg-white p-2"
              style={{ height: `${chartHeight}px` }}
            >
              {renderChart()}
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
          className="w-3 h-3 bg-yellow-500 rounded-full border-2 border-white shadow-sm"
          title="图表输出"
        />
      </div>
    </div>
  );
};