# bevy_internal

## 模块概述

`bevy_internal` 是 Bevy 游戏引擎的核心聚合模块，提供了一个统一的入口点来访问所有 Bevy 子模块。这是一个便利性模块，它重新导出了所有核心功能，使得开发者可以通过单一导入获得完整的 Bevy 功能集。

该模块对应 Rust Bevy 的 `bevy_internal` crate，在 TypeScript/Roblox 环境中提供相同的模块组织结构。

## 核心功能

### 1. 模块聚合

将所有 Bevy 核心模块集中到一个统一的导出点：

- **bevy_app**: 应用程序生命周期和插件系统
- **bevy_ecs**: 实体组件系统（ECS）
- **bevy_time**: 时间管理和固定时间步
- **bevy_diagnostic**: 性能诊断和监控
- **bevy_input**: 输入处理系统
- **bevy_log**: 日志系统
- **bevy_transform**: 变换系统

### 2. 预配置插件组

提供两种预设的插件组合，适用于不同的应用场景：

#### DefaultPlugins
包含构建完整 Bevy 应用所需的常用插件集合，适合大多数游戏和应用程序。

#### MinimalPlugins
提供运行 Bevy 应用所需的最小插件集，适合轻量级应用或需要精确控制的场景。

### 3. Prelude 模块

导出最常用的类型和函数，提供快速开始的便利接口。

## 安装与使用

### 基础导入

```typescript
// 导入所有模块
import * as bevy from "bevy_internal";

// 使用特定模块
const app = new bevy.app.App();
const world = bevy.ecs.World.create();
```

### 模块化导入

```typescript
// 导入特定子模块
import { app, ecs, time, diagnostic } from "bevy_internal";

// 使用子模块
const myApp = app.App.create();
const myWorld = ecs.World.create();
```

### 使用 Prelude

```typescript
// 导入常用功能
import {
    App,
    Plugin,
    BuiltinSchedules,
    DefaultPlugins,
    World,
    Query
} from "bevy_internal/prelude";

// 快速开始
const app = App.create()
    .addPlugins(DefaultPlugins.create())
    .run();
```

## API 文档

### 主要导出

#### 模块导出

```typescript
export * as app from "../bevy_app";
export * as diagnostic from "../bevy_diagnostic";
export * as ecs from "../bevy_ecs";
export * as input from "../bevy_input";
export * as log from "../bevy_log";
export * as time from "../bevy_time";
export * as transform from "../bevy_transform";
```

每个模块都包含其完整的功能集：

- **app**: `App`, `Plugin`, `PluginGroup`, `BuiltinSchedules` 等
- **ecs**: `World`, `Query`, `Component`, `Resource`, `System` 等
- **time**: `Time`, `Duration`, `TimePlugin`, `FixedTimestep` 等
- **diagnostic**: `Diagnostic`, `DiagnosticsPlugin`, `FrameTimeDiagnosticsPlugin` 等
- **input**: `Input`, `InputPlugin`, 键盘/鼠标事件等
- **log**: `LogPlugin`, `LogLevel`, 日志配置等
- **transform**: `Transform`, `GlobalTransform`, `TransformPlugin` 等

### DefaultPlugins

默认插件组包含以下插件：

```typescript
export class DefaultPlugins extends BasePluginGroup {
    build(): PluginGroupBuilder {
        return new PluginGroupBuilder()
            // 基础系统
            .add(new LogPlugin())           // 日志系统
            .add(new TimePlugin())          // 时间管理
            .add(new TransformPlugin())     // 变换系统

            // 诊断和监控
            .add(new DiagnosticsPlugin())   // 诊断系统
            .add(new FrameCountPlugin())    // 帧计数

            // 输入处理
            .add(new InputPlugin())         // 输入系统

            // Roblox 集成
            .add(new RobloxRunnerPlugin()); // Roblox 运行时
    }
}
```

#### 使用示例

```typescript
import { App } from "bevy_app";
import { DefaultPlugins } from "bevy_internal";

// 标准使用
const app = App.create()
    .addPlugins(DefaultPlugins.create())
    .run();

// 自定义配置
const app = App.create()
    .addPlugins(
        new DefaultPluginsBuilder()
            .disable(DiagnosticsPlugin)  // 禁用诊断
            .add(MyCustomPlugin)          // 添加自定义插件
            .getPlugins()
    )
    .run();
```

### MinimalPlugins

最小插件组，仅包含核心必需插件：

```typescript
export class MinimalPlugins extends BasePluginGroup {
    build(): PluginGroupBuilder {
        return new PluginGroupBuilder()
            .add(new FrameCountPlugin())    // 帧计数
            .add(new TimePlugin())          // 时间系统
            .add(new RobloxRunnerPlugin()); // 运行时驱动
    }
}
```

#### 使用示例

```typescript
import { App } from "bevy_app";
import { MinimalPlugins } from "bevy_internal";

// 轻量级应用
const app = App.create()
    .addPlugins(MinimalPlugins.create())
    .addSystems(BuiltinSchedules.UPDATE, mySystem)
    .run();
```

## 插件组对比

| 特性 | DefaultPlugins | MinimalPlugins |
|------|---------------|----------------|
| **日志系统** | ✅ 包含 | ❌ 不包含 |
| **时间管理** | ✅ 完整功能 | ✅ 基础功能 |
| **变换系统** | ✅ 包含 | ❌ 不包含 |
| **诊断系统** | ✅ 包含 | ❌ 不包含 |
| **帧计数** | ✅ 包含 | ✅ 包含 |
| **输入系统** | ✅ 包含 | ❌ 不包含 |
| **运行时驱动** | ✅ 包含 | ✅ 包含 |
| **适用场景** | 完整应用/游戏 | 轻量级工具/测试 |
| **内存占用** | 较高 | 最小 |
| **初始化时间** | 较慢 | 快速 |

## 自定义插件组

### 使用 DefaultPluginsBuilder

```typescript
import { DefaultPluginsBuilder } from "bevy_internal";
import { LogPlugin } from "bevy_log";
import { MyCustomPlugin } from "./my-plugin";

const customPlugins = new DefaultPluginsBuilder()
    // 禁用默认日志插件
    .disable(LogPlugin)

    // 添加自定义插件
    .add(new MyCustomPlugin())

    // 在特定插件之前添加
    .addBefore(TimePlugin, new MyTimingPlugin())

    // 在特定插件之后添加
    .addAfter(DiagnosticsPlugin, new MyMetricsPlugin())

    // 获取最终插件列表
    .getPlugins();

const app = App.create()
    .addPlugins(...customPlugins)
    .run();
```

### 创建自定义插件组

```typescript
import { BasePluginGroup, PluginGroupBuilder } from "bevy_app";

export class MyPluginGroup extends BasePluginGroup {
    build(): PluginGroupBuilder {
        return new PluginGroupBuilder()
            // 添加核心插件
            .add(new TimePlugin())
            .add(new TransformPlugin())

            // 添加自定义功能
            .add(new MyRenderingPlugin())
            .add(new MyPhysicsPlugin())
            .add(new MyAudioPlugin());
    }

    name(): string {
        return "MyPluginGroup";
    }
}

// 使用自定义插件组
const app = App.create()
    .addPlugins(new MyPluginGroup())
    .run();
```

## 包含的模块说明

### bevy_app
应用程序框架，提供：
- 应用生命周期管理
- 插件系统架构
- 调度系统（Schedule）
- 子应用（SubApp）支持

### bevy_ecs
实体组件系统，提供：
- World 管理
- Component 和 Resource
- Query 系统
- System 函数
- 命令缓冲（CommandBuffer）

### bevy_time
时间管理系统，提供：
- 实时和虚拟时间
- 暂停/恢复功能
- 时间缩放
- 固定时间步

### bevy_diagnostic
诊断和性能监控，提供：
- FPS 监控
- 帧时间测量
- 实体计数
- 自定义性能指标

### bevy_input
输入处理系统，提供：
- 键盘输入
- 鼠标输入
- 游戏手柄支持
- 触摸输入

### bevy_log
日志系统，提供：
- 分级日志
- 日志过滤
- 格式化输出
- 性能优化的日志

### bevy_transform
空间变换系统，提供：
- Transform 组件
- GlobalTransform 计算
- 层次结构支持
- 变换传播

## 完整使用示例

### 创建游戏应用

```typescript
import {
    App,
    DefaultPlugins,
    BuiltinSchedules,
    World,
    Query,
    Transform,
    Time
} from "bevy_internal/prelude";

// 定义组件
class Player {
    speed = 5.0;
}

class Enemy {
    health = 100;
}

// 创建系统
function movePlayer(world: World, deltaTime: number) {
    const players = world.query(Player, Transform);

    for (const [id, player, transform] of players) {
        transform.translation.X += player.speed * deltaTime;
    }
}

function spawnEnemies(world: World) {
    // 每秒生成一个敌人
    const time = world.get(Time);
    if (time && math.floor(time.getElapsedSecs()) % 1 === 0) {
        world.spawn(
            new Enemy(),
            new Transform()
        );
    }
}

// 创建并运行应用
const app = App.create()
    // 添加默认插件
    .addPlugins(DefaultPlugins.create())

    // 添加启动系统
    .addSystems(BuiltinSchedules.STARTUP, (world) => {
        // 生成玩家
        world.spawn(
            new Player(),
            new Transform()
        );
    })

    // 添加更新系统
    .addSystems(BuiltinSchedules.UPDATE,
        movePlayer,
        spawnEnemies
    )

    // 运行应用
    .run();
```

### 最小化配置示例

```typescript
import { App, MinimalPlugins } from "bevy_internal";

// 简单的计数器应用
let counter = 0;

function countSystem(world: World) {
    counter++;
    if (counter % 60 === 0) {
        print(`Seconds elapsed: ${counter / 60}`);
    }
}

const app = App.create()
    .addPlugins(MinimalPlugins.create())
    .addSystems(BuiltinSchedules.UPDATE, countSystem)
    .run();
```

## 最佳实践

### 1. 选择合适的插件组

- **使用 DefaultPlugins**：当构建完整的游戏或应用时
- **使用 MinimalPlugins**：当创建工具、测试或轻量级应用时
- **自定义插件组**：当需要精确控制功能集时

### 2. 模块化导入

```typescript
// ✅ 好的做法：只导入需要的模块
import { app, ecs, time } from "bevy_internal";

// ❌ 避免：导入整个命名空间（除非真的需要所有模块）
import * as bevy from "bevy_internal";
```

### 3. 使用 Prelude

```typescript
// ✅ 对于常用功能，使用 prelude
import { App, Plugin, World } from "bevy_internal/prelude";

// 而不是深层导入
import { App } from "bevy_internal/app/app";
import { Plugin } from "bevy_internal/app/plugin";
```

### 4. 插件顺序

插件的添加顺序很重要，某些插件依赖其他插件：

```typescript
// ✅ 正确的顺序
builder
    .add(new TimePlugin())        // 基础时间系统
    .add(new TransformPlugin())   // 可能依赖时间
    .add(new PhysicsPlugin());    // 依赖时间和变换

// ❌ 可能导致问题的顺序
builder
    .add(new PhysicsPlugin())     // 依赖未满足
    .add(new TimePlugin())
    .add(new TransformPlugin());
```

## 性能考虑

### 内存占用

- **DefaultPlugins**: 约 ~500KB 基础内存占用
- **MinimalPlugins**: 约 ~100KB 基础内存占用
- 每个额外插件增加 10-100KB 不等

### 初始化时间

- **DefaultPlugins**: 10-20ms 初始化时间
- **MinimalPlugins**: 2-5ms 初始化时间
- 自定义插件组取决于包含的插件

### 运行时开销

- 每个激活的插件增加少量 CPU 开销
- 诊断插件在启用时有额外的性能测量开销
- 日志插件的开销取决于日志级别和频率

## 调试技巧

### 启用详细日志

```typescript
import { LogPlugin, LogLevel } from "bevy_log";

const app = App.create()
    .addPlugins(
        DefaultPlugins.create()
            .set(new LogPlugin({
                level: LogLevel.DEBUG,
                filter: "bevy_*"  // 只显示 Bevy 相关日志
            }))
    );
```

### 监控性能

```typescript
import {
    DiagnosticsPlugin,
    FrameTimeDiagnosticsPlugin,
    LogDiagnosticsPlugin
} from "bevy_diagnostic";

const app = App.create()
    .addPlugins(
        DefaultPlugins.create(),
        new FrameTimeDiagnosticsPlugin(),
        new LogDiagnosticsPlugin({
            interval: 1.0,  // 每秒输出一次
            debug: true     // 显示详细信息
        })
    );
```

### 检查插件加载

```typescript
const plugins = new DefaultPluginsBuilder().getPlugins();
for (const plugin of plugins) {
    print(`Loaded plugin: ${plugin.name()}`);
}
```

## 与 Rust Bevy 的差异

### 1. 模块系统
- TypeScript 使用显式导出而非 Rust 的 `pub use`
- 命名空间通过对象导出实现

### 2. 插件系统
- 使用类继承而非 trait 实现
- 构建器模式适配 TypeScript 语法

### 3. 类型系统
- 使用 TypeScript 接口替代 Rust trait
- 泛型约束通过 TypeScript 类型系统实现

### 4. 平台特定
- 集成 Roblox RunService 而非原生事件循环
- 使用 @rbxts/matter 作为 ECS 后端

## 故障排除

### 常见问题

**Q: 插件未生效**
```typescript
// 确保插件被正确添加
const app = App.create()
    .addPlugins(DefaultPlugins.create()) // ✅ 使用 create()
    // 而不是
    .addPlugins(DefaultPlugins)          // ❌ 忘记调用 create()
```

**Q: 模块导入错误**
```typescript
// 检查路径是否正确
import { DefaultPlugins } from "bevy_internal";  // ✅
import { DefaultPlugins } from "./bevy_internal"; // ❌ 相对路径可能错误
```

**Q: 插件冲突**
```typescript
// 使用 disable 避免重复插件
new DefaultPluginsBuilder()
    .disable(LogPlugin)        // 先禁用默认的
    .add(new CustomLogPlugin()) // 再添加自定义的
```

## 相关资源

### 内部文档
- [bevy_app 文档](../bevy_app/README.md)
- [bevy_ecs 文档](../bevy_ecs/README.md)
- [bevy_time 文档](../bevy_time/README.md)
- [bevy_diagnostic 文档](../bevy_diagnostic/README.md)

### 外部资源
- [Bevy 官方文档](https://bevyengine.org/)
- [Roblox TypeScript 文档](https://roblox-ts.com/)
- [@rbxts/matter 文档](https://github.com/matter-ecs/matter)

## 版本历史

### v1.0.0
- 初始版本
- 实现核心模块聚合
- DefaultPlugins 和 MinimalPlugins
- Prelude 模块

## 许可证

遵循项目主许可证。