# DataBlocks 节点编辑器设计文档

## 概述

DataBlocks 是一个基于 Web 的节点式数据处理和可视化编辑器。采用纯前端架构，使用现代 Web 技术栈构建，支持实时数据处理和可视化。应用采用模块化设计，核心包括节点引擎、数据处理引擎、可视化引擎和用户界面层。

## 架构

### 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户界面层 (UI Layer)                      │
├─────────────────────────────────────────────────────────────┤
│  画布组件  │  节点库面板  │  属性面板  │  数据预览面板        │
├─────────────────────────────────────────────────────────────┤
│                   应用逻辑层 (App Logic)                     │
├─────────────────────────────────────────────────────────────┤
│  节点管理器  │  连接管理器  │  数据流引擎  │  状态管理        │
├─────────────────────────────────────────────────────────────┤
│                   核心引擎层 (Core Engine)                   │
├─────────────────────────────────────────────────────────────┤
│  节点执行引擎  │  数据处理引擎  │  可视化引擎  │  存储引擎     │
├─────────────────────────────────────────────────────────────┤
│                   基础设施层 (Infrastructure)                │
├─────────────────────────────────────────────────────────────┤
│  事件系统  │  工具函数  │  类型定义  │  配置管理             │
└─────────────────────────────────────────────────────────────┘
```

### 技术栈选择

- **前端框架**: React 18 + TypeScript
- **状态管理**: Zustand (轻量级状态管理)
- **画布渲染**: React Flow (节点编辑器库)
- **数据处理**: 自定义数据处理引擎 + Lodash
- **可视化**: Chart.js / D3.js
- **样式**: Tailwind CSS + CSS Modules
- **构建工具**: Vite
- **数据存储**: IndexedDB (通过 Dexie.js)

## 组件和接口

### 核心数据结构

```typescript
// 节点定义
interface NodeDefinition {
  id: string;
  type: string;
  category: string;
  name: string;
  description: string;
  inputs: PortDefinition[];
  outputs: PortDefinition[];
  config: NodeConfig;
  processor: NodeProcessor;
}

// 端口定义
interface PortDefinition {
  id: string;
  name: string;
  type: DataType;
  required: boolean;
  multiple: boolean;
}

// 节点实例
interface NodeInstance {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: any;
  config: Record<string, any>;
  status: 'idle' | 'processing' | 'success' | 'error';
  error?: string;
}

// 连接定义
interface Connection {
  id: string;
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
}

// 数据类型
type DataType = 'dataset' | 'number' | 'string' | 'boolean' | 'object' | 'array';

// 数据集
interface Dataset {
  columns: string[];
  rows: any[][];
  metadata: {
    rowCount: number;
    columnCount: number;
    types: Record<string, string>;
  };
}
```

### 主要组件

#### 1. 应用主组件 (App)
```typescript
interface AppProps {}

const App: React.FC<AppProps> = () => {
  // 主应用容器，管理整体布局和全局状态
}
```

#### 2. 画布组件 (Canvas)
```typescript
interface CanvasProps {
  nodes: NodeInstance[];
  connections: Connection[];
  onNodesChange: (changes: NodeChange[]) => void;
  onConnectionsChange: (changes: ConnectionChange[]) => void;
  onConnect: (connection: Connection) => void;
}

const Canvas: React.FC<CanvasProps> = (props) => {
  // 基于 React Flow 的节点编辑画布
}
```

#### 3. 节点库面板 (NodeLibrary)
```typescript
interface NodeLibraryProps {
  categories: NodeCategory[];
  onNodeDrag: (nodeType: string) => void;
}

const NodeLibrary: React.FC<NodeLibraryProps> = (props) => {
  // 可折叠的节点分类列表，支持搜索和拖拽
}
```

#### 4. 节点组件 (Node)
```typescript
interface NodeProps {
  data: NodeInstance;
  selected: boolean;
  onConfigChange: (config: any) => void;
}

const Node: React.FC<NodeProps> = (props) => {
  // 单个节点的渲染组件，包含输入输出端口
}
```

#### 5. 数据预览面板 (DataPreview)
```typescript
interface DataPreviewProps {
  selectedNode?: NodeInstance;
  data?: Dataset;
}

const DataPreview: React.FC<DataPreviewProps> = (props) => {
  // 表格形式显示节点数据，支持分页
}
```

### 核心引擎接口

#### 1. 节点执行引擎
```typescript
interface NodeExecutor {
  execute(node: NodeInstance, inputs: Record<string, any>): Promise<any>;
  validate(node: NodeInstance, inputs: Record<string, any>): ValidationResult;
}

class NodeExecutionEngine {
  private executors: Map<string, NodeExecutor> = new Map();
  
  registerExecutor(nodeType: string, executor: NodeExecutor): void;
  executeNode(nodeId: string): Promise<void>;
  executeGraph(): Promise<void>;
}
```

#### 2. 数据流引擎
```typescript
interface DataFlowEngine {
  buildExecutionGraph(nodes: NodeInstance[], connections: Connection[]): ExecutionGraph;
  executeGraph(graph: ExecutionGraph): Promise<void>;
  getNodeOutput(nodeId: string): any;
  invalidateNode(nodeId: string): void;
}

class ExecutionGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private dependencies: Map<string, string[]> = new Map();
  
  addNode(node: NodeInstance): void;
  addDependency(from: string, to: string): void;
  getExecutionOrder(): string[];
}
```

#### 3. 数据处理引擎
```typescript
interface DataProcessor {
  filter(dataset: Dataset, condition: FilterCondition): Dataset;
  sort(dataset: Dataset, column: string, direction: 'asc' | 'desc'): Dataset;
  group(dataset: Dataset, columns: string[], aggregations: Aggregation[]): Dataset;
  merge(datasets: Dataset[], joinType: JoinType, keys: string[]): Dataset;
  slice(dataset: Dataset, start: number, end: number): Dataset;
  renameColumns(dataset: Dataset, mapping: Record<string, string>): Dataset;
}
```

## 数据模型

### 节点类型定义

#### 输入节点
- **File**: 文件上传节点，支持 CSV、JSON、Excel
- **Paste**: 数据粘贴节点，支持表格和 JSON 格式
- **HTTP Request**: API 数据获取节点
- **Example Data**: 预设示例数据节点

#### 转换节点
- **Filter**: 数据过滤节点，支持多种条件组合
- **Sort**: 数据排序节点，支持多列排序
- **Group**: 数据分组聚合节点
- **Merge**: 数据合并节点，支持多种连接类型
- **Slice**: 数据切片节点
- **Rename Columns**: 列重命名节点

#### 可视化节点
- **Chart**: 图表节点，支持柱状图、折线图、散点图等
- **Table**: 表格显示节点

#### 高级节点
- **Javascript**: 自定义 JavaScript 代码执行节点

### 状态管理

使用 Zustand 管理应用状态：

```typescript
interface AppState {
  // 节点和连接
  nodes: NodeInstance[];
  connections: Connection[];
  
  // 选择状态
  selectedNodes: string[];
  selectedConnections: string[];
  
  // UI 状态
  sidebarCollapsed: boolean;
  previewPanelHeight: number;
  
  // 数据状态
  nodeOutputs: Map<string, any>;
  executionStatus: Map<string, ExecutionStatus>;
  
  // 操作方法
  addNode: (node: NodeInstance) => void;
  removeNode: (nodeId: string) => void;
  updateNode: (nodeId: string, updates: Partial<NodeInstance>) => void;
  addConnection: (connection: Connection) => void;
  removeConnection: (connectionId: string) => void;
  executeGraph: () => Promise<void>;
}
```

## 错误处理

### 错误类型定义
```typescript
enum ErrorType {
  VALIDATION_ERROR = 'validation_error',
  EXECUTION_ERROR = 'execution_error',
  DATA_ERROR = 'data_error',
  NETWORK_ERROR = 'network_error',
  FILE_ERROR = 'file_error'
}

interface AppError {
  type: ErrorType;
  message: string;
  nodeId?: string;
  details?: any;
  timestamp: Date;
}
```

### 错误处理策略
1. **节点级错误**: 在节点上显示错误状态，不影响其他节点
2. **数据流错误**: 中断下游节点执行，显示错误传播路径
3. **全局错误**: 显示错误通知，记录到错误日志
4. **用户输入错误**: 实时验证，显示内联错误提示

## 测试策略

### 单元测试
- 数据处理函数测试
- 节点执行器测试
- 工具函数测试
- 组件逻辑测试

### 集成测试
- 数据流执行测试
- 节点连接测试
- 文件导入导出测试
- 状态管理测试

### 端到端测试
- 完整工作流测试
- 用户交互测试
- 性能测试
- 兼容性测试

### 测试工具
- **单元测试**: Jest + React Testing Library
- **端到端测试**: Playwright
- **性能测试**: Lighthouse CI
- **类型检查**: TypeScript strict mode

## 性能优化

### 渲染优化
1. **虚拟化**: 大数据集使用虚拟滚动
2. **懒加载**: 节点组件按需加载
3. **缓存**: 计算结果缓存，避免重复计算
4. **防抖**: 用户输入防抖处理

### 数据处理优化
1. **Web Workers**: 大数据量处理使用 Web Workers
2. **流式处理**: 支持数据流式处理
3. **内存管理**: 及时清理不需要的数据
4. **增量更新**: 支持增量数据更新

### 网络优化
1. **代码分割**: 按路由和功能分割代码
2. **资源压缩**: 静态资源压缩和缓存
3. **预加载**: 关键资源预加载
4. **CDN**: 静态资源使用 CDN

## 部署和构建

### 构建配置
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          charts: ['chart.js', 'd3'],
          flow: ['reactflow']
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
});
```

### 部署策略
1. **静态部署**: 支持 Netlify、Vercel、GitHub Pages
2. **PWA**: 支持离线使用和安装
3. **CDN**: 静态资源分发
4. **缓存策略**: 合理的缓存配置

## 扩展性设计

### 插件系统
```typescript
interface Plugin {
  name: string;
  version: string;
  nodes?: NodeDefinition[];
  processors?: Record<string, NodeProcessor>;
  components?: Record<string, React.ComponentType>;
}

class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  
  registerPlugin(plugin: Plugin): void;
  unregisterPlugin(name: string): void;
  getAvailableNodes(): NodeDefinition[];
}
```

### 自定义节点
支持用户创建自定义节点类型，包括：
1. 可视化配置界面
2. JavaScript 代码编辑器
3. 节点模板系统
4. 节点分享机制