# 开发规范与常见错误预防

本文档包含在DataBlocks Editor项目开发过程中需要遵循的规范和常见错误的预防规则。

## React Flow 相关规范

### 版本兼容性规则

**当前使用版本**: React Flow v11.11.4

#### 导入规范
```typescript
// ✅ 正确的导入方式 (v11+)
import ReactFlow, {
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  EdgeChange,
  NodeChange,
  ReactFlowProvider,
  ReactFlowInstance,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  OnInit,
  Panel,
  type Connection, // 注意：Connection需要使用type导入
} from 'reactflow';

// ❌ 错误的导入方式
import { Connection } from 'reactflow'; // 会导致运行时错误
```

#### 关键变更点
- `Connection` 类型在v11中需要使用 `type Connection` 导入
- 事件处理器类型名称保持不变，但实现可能有差异
- 确保所有类型导入使用正确的语法

## TypeScript 导入规范

### 严格模式兼容性

当启用 `verbatimModuleSyntax` 时，必须区分类型导入和值导入：

```typescript
// ✅ 正确的类型导入
import type { 
  Node, 
  Edge, 
  EdgeChange, 
  NodeChange, 
  ReactFlowInstance,
  OnConnect,
  OnNodesChange,
  OnEdgesChange,
  OnInit,
  Connection 
} from 'reactflow';

// ✅ 正确的值导入
import ReactFlow, { 
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  Panel
} from 'reactflow';
```

### 模块路径检查规则

#### 组件导入验证
在导入自定义组件前，确保：

1. **文件存在性检查**
   ```typescript
   // 导入前确认文件路径正确
   import { CustomNode } from '../nodes/CustomNode'; // 确保文件存在
   ```

2. **相对路径规范**
   - 使用相对路径时，从当前文件位置计算
   - 避免使用过深的相对路径（超过3级）
   - 优先使用绝对路径或路径别名

3. **导出检查**
   ```typescript
   // 确保被导入的组件正确导出
   export const CustomNode = () => { /* ... */ }; // 命名导出
   // 或
   export default CustomNode; // 默认导出
   ```

## 事件处理器规范

### React Flow 事件处理

```typescript
// ✅ 正确的viewport变更处理
const handleViewportChange = useCallback(
  (event: MouseEvent | TouchEvent, viewport: { x: number; y: number; zoom: number }) => {
    setCanvasViewport(viewport);
  },
  [setCanvasViewport]
);

// ❌ 错误的参数类型
const handleViewportChange = useCallback(
  (viewport: { x: number; y: number; zoom: number }) => {
    // 这会导致类型错误
  },
  []
);
```

## 常见错误预防清单

### 开发前检查
- [ ] 确认所有依赖版本兼容性
- [ ] 检查TypeScript配置中的严格模式设置
- [ ] 验证所有导入路径的文件存在性

### 代码编写时
- [ ] 区分类型导入和值导入
- [ ] 使用正确的React Flow API版本
- [ ] 确保事件处理器参数类型正确
- [ ] 移除未使用的导入和变量

### 提交前验证
- [ ] 运行类型检查：`npm run type-check`
- [ ] 运行linting：`npm run lint`
- [ ] 确保没有编译错误
- [ ] 测试关键功能正常工作

## 版本升级注意事项

### React Flow 升级
- 查阅官方迁移指南
- 重点关注类型导入变更
- 测试所有交互功能
- 更新相关文档

### 依赖更新流程
1. 检查breaking changes
2. 更新导入语句
3. 修复类型错误
4. 运行完整测试
5. 更新此文档

## 调试技巧

### 常见错误排查
1. **模块导入错误**
   - 检查文件路径
   - 确认导出方式
   - 验证文件扩展名

2. **类型错误**
   - 使用正确的type导入
   - 检查API版本兼容性
   - 查看TypeScript编译器提示

3. **运行时错误**
   - 检查浏览器控制台
   - 确认依赖版本
   - 验证配置文件

---

**最后更新**: 2025年1月17日
**适用版本**: React Flow v11.11.4, TypeScript 5.8.3