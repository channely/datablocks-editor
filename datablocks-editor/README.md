# DataBlocks Editor

一个强大的可视化数据处理和分析工具，支持拖拽式节点编辑、实时数据处理和多种数据可视化功能。

## 🚀 功能特性

### 核心功能
- **可视化节点编辑器**: 基于React Flow的直观拖拽界面
- **实时数据处理**: 支持多种数据源和实时数据转换
- **丰富的节点类型**: 输入、转换、可视化和自定义节点
- **数据可视化**: 内置多种图表类型（柱状图、折线图、散点图等）
- **JavaScript执行**: 支持自定义JavaScript代码处理数据

### 数据源支持
- **文件输入**: CSV、JSON、Excel文件上传
- **粘贴输入**: 直接粘贴表格数据或JSON数据
- **HTTP请求**: 从API获取数据
- **示例数据**: 内置示例数据集用于快速开始

### 数据处理
- **过滤**: 基于条件的数据筛选
- **排序**: 单列或多列排序
- **分组**: 数据分组和聚合计算
- **自定义处理**: JavaScript代码自定义数据处理逻辑

## 📦 安装和运行

### 环境要求
- Node.js >= 20.19.0
- npm >= 10.0.0

### 开发环境设置

```bash
# 克隆项目
git clone <repository-url>
cd datablocks-editor

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 运行测试
npm run test

# 构建生产版本
npm run build
```

### 生产环境部署

```bash
# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

## 🎯 快速开始

### 1. 创建第一个数据流

1. **添加数据源节点**
   - 从左侧节点面板拖拽"文件输入"节点到画布
   - 上传CSV或JSON文件，或使用示例数据

2. **添加数据处理节点**
   - 拖拽"过滤"节点到画布
   - 连接数据源节点到过滤节点
   - 配置过滤条件

3. **添加可视化节点**
   - 拖拽"图表"节点到画布
   - 连接处理后的数据到图表节点
   - 选择图表类型和配置轴

4. **执行数据流**
   - 点击执行按钮运行整个数据流
   - 在数据预览面板查看结果

### 2. 使用JavaScript节点

```javascript
// 示例：计算数据统计信息
function process(data) {
  const result = {
    totalRows: data.rows.length,
    columns: data.columns,
    summary: {}
  };
  
  // 计算数值列的统计信息
  data.columns.forEach((col, index) => {
    const values = data.rows
      .map(row => row[index])
      .filter(val => typeof val === 'number');
    
    if (values.length > 0) {
      result.summary[col] = {
        min: Math.min(...values),
        max: Math.max(...values),
        avg: values.reduce((a, b) => a + b, 0) / values.length
      };
    }
  });
  
  return result;
}
```

## 📚 用户指南

### 节点类型详解

#### 输入节点
- **文件输入**: 支持CSV、JSON、Excel文件上传
- **粘贴输入**: 直接粘贴表格数据，自动识别格式
- **HTTP请求**: 从REST API获取数据
- **示例数据**: 预置的示例数据集

#### 处理节点
- **过滤**: 基于条件筛选数据行
- **排序**: 按指定列排序数据
- **分组**: 数据分组和聚合计算
- **JavaScript**: 自定义JavaScript处理逻辑

#### 输出节点
- **图表**: 多种图表类型可视化
- **表格**: 表格形式展示数据
- **导出**: 导出处理后的数据

### 界面布局

- **节点面板**: 左侧面板包含所有可用节点类型
- **画布区域**: 中央区域用于构建数据流
- **属性面板**: 右侧面板显示选中节点的配置选项
- **数据预览**: 底部面板显示数据处理结果

### 快捷键

- `Ctrl/Cmd + Z`: 撤销操作
- `Ctrl/Cmd + Y`: 重做操作
- `Delete`: 删除选中的节点或连接
- `Ctrl/Cmd + S`: 保存项目
- `Space`: 平移画布模式

## 🔧 配置选项

### 项目设置
- **自动保存**: 自动保存项目更改
- **执行模式**: 手动执行或自动执行
- **数据缓存**: 启用数据缓存以提高性能

### 性能优化
- **虚拟滚动**: 大数据集的虚拟化显示
- **Web Workers**: 后台数据处理
- **内存管理**: 自动清理未使用的数据

## 🛠️ 故障排除

### 常见问题

**Q: 文件上传失败**
A: 检查文件格式是否支持，文件大小是否超过限制（默认10MB）

**Q: JavaScript节点执行错误**
A: 检查代码语法，确保返回正确的数据格式

**Q: 图表显示异常**
A: 确认数据类型匹配图表要求，检查轴配置

**Q: 性能问题**
A: 启用数据缓存，使用数据采样，优化JavaScript代码

### 错误代码

- `DATA_001`: 数据格式错误
- `EXEC_001`: 执行超时
- `CONN_001`: 连接错误
- `FILE_001`: 文件读取错误

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

## 🤝 贡献

欢迎提交Issue和Pull Request！请阅读 [CONTRIBUTING.md](CONTRIBUTING.md) 了解贡献指南。

## 📞 支持

- 文档: [用户指南](docs/user-guide.md)
- API文档: [开发者文档](docs/developer-guide.md)
- 问题反馈: [GitHub Issues](https://github.com/your-repo/datablocks-editor/issues)