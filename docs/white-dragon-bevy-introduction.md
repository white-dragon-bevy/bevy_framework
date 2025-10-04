# White Dragon Bevy 框架介绍

## 目录

1. [框架概述](#框架概述)
2. [核心概念](#核心概念)
3. [架构说明](#架构说明)
4. [快速开始](#快速开始)
5. [Roblox 特性](#roblox-特性)
6. [进阶主题](#进阶主题)

## 框架概述

### White Dragon Bevy 是什么？

White Dragon Bevy 是一个将 Rust Bevy 游戏引擎框架移植到 Roblox 平台的 TypeScript 框架。它提供了一套完整的 ECS（实体组件系统）架构、插件系统和生命周期管理，让开发者能够在 Roblox 平台上使用现代化的游戏开发模式。

### 为什么创建这个框架？

1. **现代化架构**：将 Bevy 的先进设计理念带入 Roblox 开发
2. **模块化开发**：通过插件系统实现功能的高度模块化和复用
3. **类型安全**：利用 TypeScript 的类型系统提供编译时保障
4. **性能优化**：基于 @rbxts/matter ECS 框架，提供高效的实体管理
5. **跨平台概念**：让熟悉 Bevy 的开发者能够快速上手 Roblox 开发

### 与 Rust Bevy 的关系

White Dragon Bevy 是 Rust Bevy 框架的精神继承者，核心设计理念包括：

- **相同的架构模式**：App、Plugin、Schedule、System 等核心概念保持一致
- **相似的 API 设计**：尽可能保持与 Rust Bevy 相似的 API 接口
- **适应性改造**：针对 Roblox 平台特性和 TypeScript 语言特性进行优化

主要差异：
- 使用 @rbxts/matter 替代 Rust 的 ECS 实现
- 使用 TypeScript 的类型系统替代 Rust 的泛型系统
- 针对 Roblox 的客户端/服务端架构进行特殊优化

## 核心概念

### App（应用程序）

`App` 是整个框架的核心，负责管理应用的生命周期、插件、系统和资源。

```typescript
import { App } from "@white-dragon-bevy/bevy_app";

const app = App.create()
    .addPlugin(myPlugin)
    .addSystems(BuiltinSchedules.UPDATE, mySystem)
    .run();
```

**主要职责**：
- 管理插件的加载和初始化
- 控制系统的执行调度
- 维护全局资源和状态
- 提供扩展机制

### Plugin（插件）

插件是功能模块化的载体，每个插件封装了一组相关的功能。框架提供了丰富的内置插件：

```typescript
import { TimePlugin } from "@white-dragon-bevy/bevy_time";
import { DiagnosticsPlugin } from "@white-dragon-bevy/bevy_diagnostic";
import { InputPlugin } from "@white-dragon-bevy/bevy_input";
import { StatePlugin } from "@white-dragon-bevy/bevy_state";

// 添加插件到应用
app.addPlugin(new TimePlugin());        // 时间管理
app.addPlugin(new DiagnosticsPlugin()); // 性能诊断
app.addPlugin(new InputPlugin());       // 输入处理
app.addPlugin(new StatePlugin());       // 状态管理
```

**插件特点**：
- 高度封装和可复用
- 支持生命周期钩子（build、ready、finish、cleanup）
- 可以提供扩展方法给 App Context
- 支持依赖其他插件
- 可以指定运行环境（客户端/服务端）

### World（ECS 世界）

`World` 是 ECS 系统的核心，管理所有的实体（Entity）和组件（Component）。基于 @rbxts/matter 实现。

```typescript
import { World } from "@rbxts/matter";

function mySystem(world: World, context: Context): void {
    // 查询具有特定组件的实体
    for (const [id, position, velocity] of world.query(Position, Velocity)) {
        // 处理实体
    }
}
```

**World 功能**：
- 创建和销毁实体
- 添加和移除组件
- 查询实体和组件
- 管理组件变更追踪

### Schedule（调度）

调度系统控制系统的执行顺序和时机，框架提供了多个内置调度阶段。

```typescript
import { BuiltinSchedules } from "@white-dragon-bevy/bevy_app";

// 内置调度阶段（按执行顺序）
BuiltinSchedules.FIRST        // 第一阶段
BuiltinSchedules.PRE_STARTUP  // 启动前
BuiltinSchedules.STARTUP      // 启动阶段（仅执行一次）
BuiltinSchedules.POST_STARTUP // 启动后
BuiltinSchedules.PRE_UPDATE   // 更新前
BuiltinSchedules.UPDATE       // 主更新阶段
BuiltinSchedules.POST_UPDATE  // 更新后
BuiltinSchedules.LAST         // 最后阶段
```

### System（系统）

系统是处理游戏逻辑的函数，接收 World 和 Context 参数。

```typescript
function movementSystem(world: World, context: Context): void {
    const deltaTime = context.getDeltaSeconds();

    for (const [id, position, velocity] of world.query(Position, Velocity)) {
        position.x += velocity.x * deltaTime;
        position.y += velocity.y * deltaTime;
    }
}
```

**系统特性**：
- 纯函数设计，无副作用
- 通过 World 访问实体和组件
- 通过 Context 访问应用级功能
- 自动错误捕捉，不会崩溃应用

### Resource（资源）

资源是全局共享的单例数据，通过 App 管理。

```typescript
import { TypeDescriptor } from "@white-dragon-bevy/bevy_core";

// 定义资源类
class GameConfig {
    static readonly TYPE_ID = new TypeDescriptor("GameConfig");

    constructor(
        public difficulty: number,
        public maxPlayers: number
    ) {}
}

// 插入资源
app.insertResource(new GameConfig(1, 4));

// 获取资源
const config = app.getResource<GameConfig>();
```

### Context（上下文）

Context 提供了系统访问应用级功能的接口，支持插件扩展。

```typescript
function mySystem(world: World, context: Context): void {
    // 基础功能
    const deltaTime = context.deltaTime;

    // 插件扩展功能（类型安全）
    const time = context.getDeltaSeconds();  // TimePlugin 扩展
    const diagnostic = context.getDiagnostic("fps"); // DiagnosticsPlugin 扩展
}
```

## 架构说明

### 整体架构图

```
┌─────────────────────────────────────────────────────────┐
│                        App (应用程序)                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Plugins    │  │   Schedule   │  │   Resources  │  │
│  │  (插件系统)   │  │   (调度器)    │  │   (资源)     │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │                 Context (上下文)                    │ │
│  │  - Base Methods (基础方法)                          │ │
│  │  - Plugin Extensions (插件扩展)                     │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │              World (ECS 世界)                       │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐        │ │
│  │  │ Entities │  │Components│  │ Systems  │        │ │
│  │  └──────────┘  └──────────┘  └──────────┘        │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 生命周期流程

```
应用启动
    ↓
插件注册 (addPlugin)
    ↓
插件构建 (plugin.build)
    ↓
系统注册 (addSystems)
    ↓
启动调度执行 (STARTUP)
    ↓
主循环开始
    ├─→ FIRST
    ├─→ PRE_UPDATE
    ├─→ UPDATE
    ├─→ POST_UPDATE
    └─→ LAST
    ↑   ↓
    └───┘ (循环)
```

### 调度执行顺序

每一帧的执行顺序：

1. **First 阶段**：帧开始的准备工作
   - 时间更新
   - 输入采集

2. **PreUpdate 阶段**：更新前的准备
   - 事件清理
   - 状态同步

3. **Update 阶段**：主要游戏逻辑
   - 玩家控制
   - 物理模拟
   - AI 逻辑

4. **PostUpdate 阶段**：更新后的处理
   - 渲染准备
   - 网络同步

5. **Last 阶段**：帧结束的清理工作
   - 诊断统计
   - 资源清理

### 插件系统工作原理

插件系统采用组合模式，支持嵌套和依赖：

```typescript
// 插件加载流程
App.addPlugin(plugin)
    ↓
检查 robloxContext（客户端/服务端）
    ↓
检查 isUnique（防止重复添加）
    ↓
调用 plugin.build(app)
    ↓
等待 plugin.ready()
    ↓
调用 plugin.finish()
```

插件可以：
- 添加其他插件（依赖管理）
- 注册系统到各个调度阶段
- 插入全局资源
- 扩展 Context 功能

## 快速开始

### 创建第一个应用

```typescript
import { App } from "@white-dragon-bevy/bevy_app";
import { RobloxDefaultPlugins } from "@white-dragon-bevy/bevy_app";
import { BuiltinSchedules } from "@white-dragon-bevy/bevy_app";

// 创建应用
const app = App.create();

// 添加默认插件组
app.addPlugins(RobloxDefaultPlugins.create().build());

// 添加自定义系统
app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
    print("Hello, White Dragon Bevy!");
});

// 运行应用
app.run();
```

### 添加插件到应用

```typescript
import { App } from "@white-dragon-bevy/bevy_app";
import { TimePlugin } from "@white-dragon-bevy/bevy_time";
import { DiagnosticsPlugin } from "@white-dragon-bevy/bevy_diagnostic";
import { RobloxDefaultPlugins } from "@white-dragon-bevy/bevy_app";

// 创建应用并添加插件
const app = App.create();

// 1. 添加单个插件
app.addPlugin(new TimePlugin());

// 2. 添加多个插件
app.addPlugins(
    new TimePlugin(),
    new DiagnosticsPlugin()
);

// 3. 添加插件组
app.addPlugins(RobloxDefaultPlugins.create().build());

// 运行应用
app.run();
```

### 使用插件扩展

```typescript
import { App } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";
import { TimePlugin, TimePluginExtension } from "@white-dragon-bevy/bevy_time";
import { DiagnosticsPlugin } from "@white-dragon-bevy/bevy_diagnostic";

// 创建应用并添加插件
const app = App.create()
    .addPlugin(new TimePlugin())
    .addPlugin(new DiagnosticsPlugin());

// 在系统中使用扩展 - context 快捷方式（推荐）
function gameSystem(world: World, context: Context): void {
    // 使用类型安全的扩展方法
    const timeExt = context.getExtension<TimePluginExtension>();
    if (timeExt) {
        const deltaSeconds = timeExt.getDeltaSeconds();
        const isPaused = timeExt.isPaused();

        if (!isPaused) {
            // 游戏逻辑
        }
    }
}
```

### 完整示例：弹跳球

```typescript
import { App, BuiltinSchedules } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";
import { TimePlugin, TimePluginExtension } from "@white-dragon-bevy/bevy_time";
import { RobloxDefaultPlugins } from "@white-dragon-bevy/bevy_app";

// 组件定义
interface Ball {}
interface Position { x: number; y: number; }
interface Velocity { x: number; y: number; }

// 弹跳系统
function bounceSystem(world: World, context: Context): void {
    const bounds = { width: 100, height: 100 };

    for (const [id, ball, pos, vel] of world.query(Ball, Position, Velocity)) {
        // 边界检测和反弹
        if (pos.x <= 0 || pos.x >= bounds.width) {
            vel.x = -vel.x;
        }
        if (pos.y <= 0 || pos.y >= bounds.height) {
            vel.y = -vel.y;
        }
    }
}

// 移动系统
function movementSystem(world: World, context: Context): void {
    const timeExt = context.getExtension<TimePluginExtension>();
    if (!timeExt) return;

    const deltaTime = timeExt.getDeltaSeconds();

    for (const [id, pos, vel] of world.query(Position, Velocity)) {
        pos.x += vel.x * deltaTime;
        pos.y += vel.y * deltaTime;
    }
}

// 初始化系统
function setupSystem(world: World, context: Context): void {
    // 创建弹跳球
    world.spawn(
        {} as Ball,
        { x: 50, y: 50 } as Position,
        { x: 30, y: 20 } as Velocity
    );
}

// 创建和运行应用
const app = App.create()
    .addPlugins(RobloxDefaultPlugins.create().build())
    .addPlugin(new TimePlugin())
    .addSystems(BuiltinSchedules.STARTUP, setupSystem)
    .addSystems(BuiltinSchedules.UPDATE, bounceSystem, movementSystem)
    .run();
```

## Roblox 特性

### 客户端/服务端区分

框架支持自动区分客户端和服务端环境。插件可以指定运行环境，只在匹配的环境中加载：

```typescript
import { RobloxContext } from "@white-dragon-bevy/bevy_app";
import { RunService } from "@rbxts/services";

// 检查运行环境
if (RunService.IsServer()) {
    // 添加服务端专用插件
    app.addPlugin(new ServerPlugin());
}

if (RunService.IsClient()) {
    // 添加客户端专用插件
    app.addPlugin(new ClientPlugin());
}

// 或者使用通用插件，在系统中判断环境
function serverOnlySystem(world: World, context: Context): void {
    if (!RunService.IsServer()) return;

    // 服务端逻辑
}

function clientOnlySystem(world: World, context: Context): void {
    if (!RunService.IsClient()) return;

    // 客户端逻辑
}
```

### RunService 集成

框架与 Roblox RunService 深度集成：

```typescript
import { RobloxRunnerPlugin } from "@white-dragon-bevy/bevy_app";

// RobloxRunnerPlugin 提供三种运行模式
app.addPlugin(new RobloxRunnerPlugin({
    mode: "Heartbeat"     // 默认：每帧执行
    // mode: "Stepped"    // 物理步进前
    // mode: "RenderStepped" // 渲染前（仅客户端）
}));
```

### Matter ECS 使用

框架基于 @rbxts/matter 构建，提供高性能的 ECS 实现：

```typescript
import { World } from "@rbxts/matter";
import { useEvent } from "@rbxts/matter-hooks";

function inputSystem(world: World, context: Context): void {
    // 使用 Matter hooks
    for (const player of useEvent(Players, "PlayerAdded")) {
        // 处理玩家加入
        world.spawn(
            { player: player } as PlayerComponent
        );
    }
}
```

### 性能考虑

1. **系统批处理**：相同调度阶段的系统会批量执行，减少开销

2. **查询缓存**：Matter 自动缓存查询结果，提高查询性能

3. **防抖打印**：使用 hook-debug-print 避免每帧输出刷屏
```typescript
import { hookDebugPrint } from "@white-dragon-bevy/utils";

function debugSystem(world: World, context: Context): void {
    hookDebugPrint("System running"); // 自动防抖
}
```

4. **错误隔离**：系统错误自动捕捉，不会导致整个应用崩溃

5. **资源池化**：框架内部使用对象池减少 GC 压力

## 进阶主题

### 插件扩展系统

插件可以通过扩展系统提供类型安全的方法。框架使用 TypeScript 的类型推导确保扩展方法的类型安全：

```typescript
import { App } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";
import { TimePlugin, TimePluginExtension } from "@white-dragon-bevy/bevy_time";
import { DiagnosticsPlugin, DiagnosticsPluginExtension } from "@white-dragon-bevy/bevy_diagnostic";

// 添加带扩展的插件
const app = App.create()
    .addPlugin(new TimePlugin())
    .addPlugin(new DiagnosticsPlugin());

// 在系统中使用类型安全的扩展方法 - context 快捷方式（推荐）
function gameSystem(world: World, context: Context): void {
    // 获取 TimePlugin 的扩展
    const timeExt = context.getExtension<TimePluginExtension>();
    if (timeExt) {
        const deltaSeconds = timeExt.getDeltaSeconds();
        const elapsedSeconds = timeExt.getElapsedSeconds();
        const isPaused = timeExt.isPaused();

        // 使用扩展功能
        if (!isPaused) {
            // 游戏逻辑
            const speed = 100 * deltaSeconds;
        }
    }

    // 获取 DiagnosticsPlugin 的扩展
    const diagExt = context.getExtension<DiagnosticsPluginExtension>();
    if (diagExt) {
        const fpsDiagnostic = diagExt.getDiagnostic("fps");
        diagExt.updateDiagnostic("custom_metric", 42);
    }
}

// 扩展方法也可以在系统外使用 - app 资源访问
const timeExt = app.getResource<TimePluginExtension>();
if (timeExt) {
    timeExt.pause();  // 暂停时间
    timeExt.setTimeScale(0.5);  // 设置时间缩放
    timeExt.resume();  // 恢复时间
}
```

**扩展系统的优势**：
- **类型安全**：编译时检查方法是否存在
- **自动补全**：IDE 提供完整的代码提示
- **零开销**：扩展方法在运行时直接调用，无额外性能损耗
- **模块化**：每个插件可以独立提供自己的扩展方法

### 事件系统

框架提供了强大的事件系统：

```typescript
import { Message, MessageWriter, MessageReader } from "@white-dragon-bevy/bevy_ecs";

// 定义事件
class PlayerJoinedEvent extends Message {
    constructor(public playerId: string) {
        super();
    }
}

// 发送事件
function sendEventSystem(world: World, context: Context): void {
    const writer = new MessageWriter<PlayerJoinedEvent>(world);
    writer.send(new PlayerJoinedEvent("player123"));
}

// 接收事件
function receiveEventSystem(world: World, context: Context): void {
    const reader = new MessageReader<PlayerJoinedEvent>(world);

    for (const event of reader.read()) {
        print(`Player joined: ${event.playerId}`);
    }
}
```

### 状态管理

使用 StatePlugin 管理游戏状态：

```typescript
import { StatePlugin, State, NextState } from "@white-dragon-bevy/bevy_state";

// 定义状态枚举
enum GameState {
    Menu,
    Playing,
    Paused,
    GameOver
}

// 配置状态插件
app.addPlugin(new StatePlugin(GameState.Menu));

// 状态转换系统
function stateTransitionSystem(world: World, context: Context): void {
    const currentState = app.getResource<State<GameState>>();

    if (/* 某个条件 */) {
        app.insertResource(new NextState(GameState.Playing));
    }
}

// 状态相关系统
app.addSystems(
    BuiltinSchedules.UPDATE.runIf(inState(GameState.Playing)),
    gameplaySystem
);
```

### 调试和诊断

框架提供丰富的调试工具：

```typescript
import { DiagnosticsPlugin } from "@white-dragon-bevy/bevy_diagnostic";
import { LogDiagnosticsPlugin } from "@white-dragon-bevy/bevy_diagnostic";
import { DebuggerPlugin } from "@white-dragon-bevy/bevy_ecs_debugger";

// 添加诊断插件
app.addPlugin(new DiagnosticsPlugin())
   .addPlugin(new LogDiagnosticsPlugin({
       interval: 1.0,  // 每秒输出一次
       filter: ["fps", "frame_time"]
   }));

// 添加调试器插件
app.addPlugin(new DebuggerPlugin({
    enabled: true,
    showEntityCount: true,
    showSystemTiming: true
}));

// 自定义诊断
function customDiagnostic(world: World, context: Context): void {
    const diagExt = context.getExtension<DiagnosticsPluginExtension>();

    if (diagExt) {
        // 更新自定义诊断值
        diagExt.updateDiagnostic("custom_metric", performanceValue);
    }
}
```

## 最佳实践

### 1. 系统编写规范

- **纯函数设计**：避免全局状态和副作用
- **批量处理**：在一个系统中处理同类逻辑
- **错误处理**：系统错误会自动捕捉，但仍需合理处理异常情况
- **性能优先**：避免在热路径上进行复杂计算

### 2. 资源管理

- **类型标识**：为每个资源类定义 TYPE_ID
- **检查存在性**：获取资源后总是检查是否存在
- **生命周期管理**：在适当的时机创建和销毁资源

### 3. 调试技巧

- 使用防抖打印避免日志刷屏
- 启用诊断插件监控性能
- 使用调试器插件可视化 ECS 状态
- 检查系统执行顺序和依赖关系

## 总结

White Dragon Bevy 为 Roblox 开发带来了现代化的架构和开发体验。通过插件系统、ECS 架构和类型安全的设计，开发者可以构建可维护、可扩展的大型游戏项目。

框架的设计理念是：
- **模块化**：通过插件实现功能解耦
- **类型安全**：充分利用 TypeScript 类型系统
- **性能优化**：基于高效的 ECS 实现
- **开发体验**：提供清晰的 API 和丰富的工具

无论是小型原型还是大型商业项目，White Dragon Bevy 都能提供坚实的技术基础。