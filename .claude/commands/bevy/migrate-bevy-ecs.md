# 迁移 bevy_ecs 模块到 roblox-ts

## 任务描述

将 Bevy 引擎的 `bevy_ecs` 模块迁移到 roblox-ts 生态，实现 ECS 模式和适配层，基于 `@rbxts/matter` 构建。

## 输入目录
- `bevy-origin/crates/bevy_ecs/` - Bevy 原始 ECS 系统代码

## 输出目录
- `src/bevy_ecs/` - 迁移后的 roblox-ts ECS 系统

## 任务要求

### 1. 核心功能迁移
- 实现 `CommandBuffer` 指令缓冲系统
- 实现单例组件模式 (Singleton Components)
- 建立 Matter ECS 的适配层
- 实现系统调度和执行管理
- 支持延迟执行和状态同步

### 2. 架构设计
```typescript
// 指令缓冲系统
class CommandBuffer {
    spawn(components: Array<Component>): EntityId;
    despawn(entity: EntityId): void;
    addComponent(entity: EntityId, component: Component): void;
    removeComponent(entity: EntityId, componentType: ComponentType): void;
    flush(world: World): void;
}

// 单例组件模式
class SingletonManager {
    getResource<T>(resourceType: ComponentConstructor<T>): T | undefined;
    insertResource<T>(resource: T): void;
    removeResource<T>(resourceType: ComponentConstructor<T>): void;
}

// 系统调度器
class SystemScheduler {
    addSystem(system: SystemFunction): void;
    run(world: World): void;
    setOrder(systems: Array<SystemFunction>): void;
}
```

### 3. Matter 集成
- 使用 `@rbxts/matter-hooks` 进行状态管理
- 适配 Matter 的组件和系统模式
- 处理 Matter 的查询和过滤机制
- 实现 Bevy 风格的系统参数

### 4. 编码规范
严格遵循 `.claude/agents/roblox-ts-pro.md` 中的编码规范：
- 避免在系统中使用会导致 yield 的函数
- 使用 `os.clock()` 替代 `RunService.Heartbeat.Wait()`
- 所有导出函数必须有 JSDoc 注释
- 使用显式返回类型
- 文件末尾必须以换行符结束

### 5. 单元测试
使用 `@rbxts/testez` 编写完整的单元测试：
- 测试指令缓冲的正确性
- 测试单例组件的生命周期
- 测试系统调度的顺序
- 测试 Matter 集成的稳定性
- 测试错误处理和边界情况

### 6. 特殊考虑
- Roblox 单线程执行模型的适配
- 避免使用会 yield 的操作
- 优化性能，减少垃圾回收
- 支持热重载和开发模式
- 与其他 bevy 模块的集成接口

## 文件结构
```
crates/bevy_ecs/
├── src/
│   ├── index.ts                 # 主要导出
│   ├── command-buffer.ts        # 指令缓冲系统
│   ├── singleton.ts             # 单例组件管理
│   ├── system-scheduler.ts      # 系统调度器
│   ├── matter-adapter.ts        # Matter 适配层
│   ├── query.ts                 # 查询系统
│   └── world-extensions.ts      # World 扩展
├── tests/
│   ├── command-buffer.spec.ts   # 指令缓冲测试
│   ├── singleton.spec.ts        # 单例组件测试
│   ├── scheduler.spec.ts        # 调度器测试
│   ├── matter-integration.spec.ts # Matter 集成测试
│   └── performance.spec.ts      # 性能测试
├── package.json
└── tsconfig.json
```

## 依赖要求
- `@rbxts/matter` - 核心 ECS 系统
- `@rbxts/matter-hooks` - 状态管理 hooks
- `@rbxts/sift` - 数据操作工具

## 预期产出
1. 完整的 ECS 适配层实现
2. 高性能的指令缓冲系统
3. 灵活的单例组件管理
4. 稳定的系统调度机制
5. 全面的单元测试覆盖
6. 详细的 JSDoc 文档

## 验证标准
- 所有测试通过
- ESLint 检查无错误
- TypeScript 编译无错误
- 符合 roblox-ts-pro 编码规范
- 与 Matter 无缝集成
- 性能满足游戏需求