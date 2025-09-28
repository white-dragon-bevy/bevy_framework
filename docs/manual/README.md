# Bevy-Roblox 框架操作手册

欢迎使用 Bevy-Roblox 框架！这是一套将 Rust Bevy 游戏引擎架构移植到 Roblox 平台的 TypeScript 框架。本文档集合提供了框架的完整使用指南和 API 参考。

## 📚 文档导航

### 🚀 入门必读

| 文档 | 说明 | 适合人群 |
|-----|------|---------|
| [**框架概述与入门指南**](./overview.md) | 框架介绍、快速入门、完整示例 | 所有开发者 |
| [**bevy_app 模块**](./bevy_app.md) | 应用生命周期管理、插件系统 | 初学者 |
| [**bevy_ecs 模块**](./bevy_ecs.md) | ECS 架构核心、系统与组件 | 初学者 |

### 🎮 核心功能模块

| 模块 | 功能描述 | 重要性 |
|-----|---------|--------|
| [**bevy_transform**](./bevy_transform.md) | 变换系统、层级管理、位置旋转缩放 | ⭐⭐⭐⭐⭐ |
| [**bevy_state**](./bevy_state.md) | 游戏状态管理、场景切换 | ⭐⭐⭐⭐⭐ |
| [**bevy_time**](./bevy_time.md) | 时间管理、定时器、固定时间步 | ⭐⭐⭐⭐⭐ |
| [**bevy_input**](./bevy_input.md) | 键盘鼠标输入、游戏手柄支持 | ⭐⭐⭐⭐ |
| [**bevy_render**](./bevy_render.md) | 可见性控制、Roblox 实例同步 | ⭐⭐⭐⭐ |

### 🛠️ 开发工具模块

| 模块 | 功能描述 | 使用场景 |
|-----|---------|---------|
| [**bevy_diagnostic**](./bevy_diagnostic.md) | 性能诊断、FPS 监控、自定义指标 | 性能优化 |
| [**bevy_log**](./bevy_log.md) | 日志系统、过滤器、格式化输出 | 调试开发 |
| [**bevy_ecs_debugger**](./bevy_ecs_debugger.md) | ECS 调试器、实体检查、系统监控 | 深度调试 |
| [**bevy_core**](./bevy_core.md) | 类型反射、核心组件定义 | 框架扩展 |

### 🎯 高级功能模块

| 模块 | 功能描述 | 适用项目 |
|-----|---------|---------|
| [**leafwing-input-manager**](./leafwing-input-manager.md) | 高级输入管理、动作映射、连击系统 | 复杂交互游戏 |
| [**roblox_rvo**](./roblox_rvo.md) | 群体避障、智能寻路、编队移动 | RTS/群体游戏 |
| [**bevy_replicon**](./bevy_replicon.md) | 网络复制系统（规划中） | 多人游戏 |

## 📖 阅读顺序建议

### 初学者路径
1. **overview.md** - 了解框架整体
2. **bevy_app.md** - 学习应用结构
3. **bevy_ecs.md** - 理解 ECS 概念
4. **bevy_transform.md** - 掌握基础操作
5. **bevy_input.md** - 实现交互功能

### 进阶开发路径
1. **bevy_state.md** - 管理游戏状态
2. **bevy_time.md** - 精确时间控制
3. **leafwing-input-manager.md** - 高级输入处理
4. **bevy_diagnostic.md** - 性能分析
5. **bevy_log.md** - 调试技巧

### 多人游戏路径
1. **bevy_replicon.md** - 网络架构（规划中）
2. **roblox_rvo.md** - 群体控制
3. **bevy_state.md** - 同步状态管理

## 🔍 快速查找

### 按功能查找

**玩家控制相关**
- 基础输入 → [bevy_input](./bevy_input.md)
- 高级动作映射 → [leafwing-input-manager](./leafwing-input-manager.md)
- 角色移动 → [bevy_transform](./bevy_transform.md)

**游戏逻辑相关**
- 游戏循环 → [bevy_app](./bevy_app.md)
- 状态机 → [bevy_state](./bevy_state.md)
- 定时器 → [bevy_time](./bevy_time.md)

**性能优化相关**
- FPS 监控 → [bevy_diagnostic](./bevy_diagnostic.md)
- 日志分析 → [bevy_log](./bevy_log.md)
- ECS 调试 → [bevy_ecs_debugger](./bevy_ecs_debugger.md)

**AI 和物理相关**
- 群体避障 → [roblox_rvo](./roblox_rvo.md)
- 实体变换 → [bevy_transform](./bevy_transform.md)

## 💡 最佳实践速查

### 常用代码模板

```typescript
// 创建基础应用
import { App } from "@rbxts/bevy-framework/bevy_app";
import { DefaultPlugins } from "@rbxts/bevy-framework/bevy_internal";

const app = new App();
app.addPlugins(DefaultPlugins);
app.run();
```

```typescript
// 定义系统
function mySystem(context: SystemContext) {
    const { world, resources, deltaTime } = context;
    // 系统逻辑
}
```

```typescript
// 查询实体
for (const [entity, transform, name] of world.query(Transform, Name)) {
    // 处理实体
}
```

### 性能优化要点

1. **使用 queryChanged** 避免不必要的更新
2. **批量处理 Commands** 减少内存分配
3. **缓存查询结果** 提高查询性能
4. **合理设置固定时间步** 优化物理计算
5. **使用 LOD 系统** 管理远距离对象

## 📊 模块依赖关系

```
bevy_app (核心)
    ├── bevy_ecs (ECS系统)
    ├── bevy_time (时间)
    ├── bevy_state (状态)
    └── 所有其他模块

bevy_transform
    └── bevy_render (可见性)

bevy_input
    └── leafwing-input-manager (高级输入)

bevy_diagnostic
    └── bevy_log (日志输出)
```

## 🔧 开发工具

- **构建**: `pnpm build`
- **监视**: `pnpm watch`
- **测试**: `npm test`
- **调试**: 使用 bevy_ecs_debugger

## 📝 文档维护

这些文档会随着框架的发展持续更新。如果您发现任何问题或有改进建议，请提交 Issue 或 Pull Request。

## 🎯 下一步

1. 阅读[框架概述](./overview.md)了解整体架构
2. 跟随入门指南创建第一个项目
3. 深入学习感兴趣的模块
4. 参考示例代码实践

---

*最后更新: 2025年9月*

**Happy Coding with Bevy-Roblox! 🚀**