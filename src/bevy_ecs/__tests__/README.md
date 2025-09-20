# Bevy ECS 单元测试

这个目录包含了 Bevy ECS 系统的完整单元测试套件，使用 `@rbxts/testez` 框架编写。

## 测试文件结构

```
__tests__/
├── index.spec.ts           # 测试套件入口文件
├── events.spec.ts          # 事件系统测试
├── singleton.spec.ts       # 资源管理器测试
├── command-buffer.spec.ts  # 命令缓冲器测试
├── query.spec.ts           # 查询系统测试
├── system-scheduler.spec.ts # 系统调度器测试
├── matter-adapter.spec.ts  # Matter适配器测试
└── README.md              # 本文档
```

## 运行测试

### 运行所有测试
```typescript
// 在你的测试入口文件中导入并运行
import bevyEcsTests from "./src/bevy_ecs/__tests__/index.spec";

// 使用 TestEZ 运行
TestService:Run(bevyEcsTests);
```

### 运行单个模块测试
```typescript
// 只运行事件系统测试
import eventTests from "./src/bevy_ecs/__tests__/events.spec";
TestService:Run(eventTests);
```

## 测试覆盖范围

### 事件系统 (events.spec.ts)
- ✅ EventWriter 和 EventReader 基本功能
- ✅ 事件时间戳自动添加
- ✅ 多个读取器独立工作
- ✅ EventManager 统计信息
- ✅ 预定义事件类型 (EntitySpawned, ComponentAdded 等)
- ✅ 错误处理和边界情况

### 资源管理器 (singleton.spec.ts)
- ✅ 基本资源增删改查操作
- ✅ 多种资源类型并存
- ✅ 资源元数据管理
- ✅ 全局资源访问 API
- ✅ Resource 装饰器功能
- ✅ 复杂使用场景和条件访问

### 命令缓冲器 (command-buffer.spec.ts)
- ✅ 基本命令队列操作
- ✅ 实体生成、销毁、组件添加移除
- ✅ 资源插入和移除命令
- ✅ 批量命令执行和刷新
- ✅ 临时实体ID映射
- ✅ 错误处理和命令执行结果
- ✅ 复杂实体生命周期管理

### 查询系统 (query.spec.ts)
- ✅ QueryBuilder 链式API
- ✅ 复杂查询条件 (with, without, optional)
- ✅ 变更检测查询 (changed, added)
- ✅ 自定义过滤器和条件
- ✅ 查询选项 (limit, skip, offset)
- ✅ 结果迭代和映射
- ✅ QueryFactory 便捷方法
- ✅ QueryHelpers 辅助函数

### 系统调度器 (system-scheduler.spec.ts)
- ✅ 系统注册、移除、启用禁用
- ✅ 优先级排序执行
- ✅ 系统运行条件和依赖关系
- ✅ 错误处理和隔离
- ✅ 性能统计和监控
- ✅ 复杂系统网络调度
- ✅ 命令缓冲区集成

### Matter适配器 (matter-adapter.spec.ts)
- ✅ 基本组件查询操作
- ✅ 实体组件检查和获取
- ✅ 查询结果过滤
- ✅ 查询选项支持
- ✅ 类型安全保证
- ✅ Matter World 集成
- ✅ 性能优化验证

## 测试特点

### roblox-ts 兼容性
- 🎯 完全符合 roblox-ts 语法规范
- 🎯 类型安全的测试用例
- 🎯 避免 Lua 特定语法
- 🎯 正确的模块导入导出

### 最佳实践
- 📋 清晰的测试组织结构
- 📋 完整的 describe 和 it 块
- 📋 适当的 beforeEach/afterEach 清理
- 📋 边界情况和错误处理测试
- 📋 复杂集成场景覆盖

### 测试数据
- 🧪 真实的组件类定义
- 🧪 模拟的系统函数
- 🧪 完整的集成测试场景
- 🧪 性能基准测试

## 使用建议

1. **持续集成**: 在 CI/CD 流程中自动运行这些测试
2. **开发测试**: 在修改 ECS 代码后运行相关测试
3. **回归测试**: 定期运行完整测试套件确保稳定性
4. **性能监控**: 关注系统调度器和查询系统的性能测试结果

## 扩展测试

如果需要添加新的测试用例：

1. 在对应的 `*.spec.ts` 文件中添加新的测试
2. 遵循现有的命名和组织约定
3. 确保包含适当的清理逻辑
4. 添加边界情况和错误处理测试
5. 更新这个 README 文件

## 故障排除

如果测试失败：

1. 检查 `@rbxts/testez` 依赖是否正确安装
2. 确认 `@rbxts/matter` 版本兼容性
3. 验证 roblox-ts 编译配置
4. 查看具体的错误消息和堆栈跟踪
5. 检查测试数据和模拟对象的正确性