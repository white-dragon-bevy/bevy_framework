# bevy_app 模块

`bevy_app` 是 Bevy 框架在 Roblox TypeScript 上的核心应用程序管理模块。它提供了应用程序生命周期管理、插件系统、调度系统和 Roblox 平台集成。

## 公共 API

### 核心类

#### `App`
应用程序的主类，管理整个应用的生命周期。

```typescript
import { App } from "bevy_app";

const app = App.create()
    .addPlugins(plugin1, plugin2)
    .addSystems(BuiltinSchedules.UPDATE, mySystem)
    .run();
```

**主要方法：**
- `static create()` - 创建新的 App 实例
- `static empty()` - 创建空的 App 实例（不包含默认调度）
- `addPlugin(plugin: Plugin)` - 添加单个插件
- `addPlugins(...plugins: Plugin[])` - 添加多个插件
- `addSystems(schedule: ScheduleLabel, ...systems: SystemFunction[])` - 添加系统到指定调度
- `insertResource<T extends Resource>(resource: T)` - 插入资源
- `initResource<T extends Resource>(constructor: ResourceConstructor<T>)` - 初始化资源
- `run()` - 运行应用程序
- `update()` - 手动更新应用程序（运行一次所有调度）

#### `SubApp`
子应用程序，用于模块化和隔离不同的应用程序部分。

```typescript
const subApp = new SubApp();
subApp.addSystems(BuiltinSchedules.UPDATE, mySystem);
```

### 插件系统

#### `Plugin` 接口
插件的核心接口，所有插件都必须实现此接口。

```typescript
interface Plugin {
    build(app: App): void;      // 配置App
    ready?(app: App): boolean;   // 插件是否准备完成
    finish?(app: App): void;     // 完成插件设置
    cleanup?(app: App): void;    // 清理插件资源
    name(): string;              // 插件名称
    isUnique(): boolean;         // 插件是否唯一
}
```

#### `BasePlugin` 抽象类
提供 Plugin 接口的基础实现。

```typescript
import { BasePlugin, App } from "bevy_app";

export class MyPlugin extends BasePlugin {
    build(app: App): void {
        // 添加系统、资源等
        app.addSystems(BuiltinSchedules.UPDATE, mySystem);
    }

    name(): string {
        return "MyPlugin";
    }
}
```

#### `FunctionPlugin`
用于将函数转换为插件。

```typescript
const plugin = new FunctionPlugin("MyPlugin", (app: App) => {
    app.addSystems(BuiltinSchedules.UPDATE, mySystem);
});
```

#### `createPlugin` 辅助函数
快速创建插件的便捷函数。

```typescript
const plugin = createPlugin("MyPlugin", (app: App) => {
    app.addSystems(BuiltinSchedules.UPDATE, mySystem);
});
```

#### `PluginGroup` 接口
插件组接口，用于批量添加相关插件。

```typescript
interface PluginGroup {
    build(): PluginGroupBuilder;
}
```

#### `PluginGroupBuilder`
构建插件组的构建器类。

```typescript
const builder = new PluginGroupBuilder()
    .add(plugin1)
    .add(plugin2)
    .disable(disabledPlugin);
```

### 调度系统

#### `BuiltinSchedules`
内置的调度阶段常量。

```typescript
export const BuiltinSchedules = {
    // 启动阶段（只运行一次）
    PRE_STARTUP: "PreStartup",
    STARTUP: "Startup",
    POST_STARTUP: "PostStartup",

    // 主循环阶段
    FIRST: "First",
    PRE_UPDATE: "PreUpdate",
    UPDATE: "Update",
    POST_UPDATE: "PostUpdate",
    LAST: "Last",

    // 主调度器
    MAIN: "Main",

    // 固定更新（尚未完全实现）
    FIXED_UPDATE: "FixedUpdate",
    // ...
};
```

#### `CoreSystemSet`
内置的系统集，用于组织和排序系统。

```typescript
export const CoreSystemSet = {
    CORE: "Core",
    INPUT: "Input",
    PHYSICS: "Physics",
    TRANSFORM: "Transform",
    ANIMATION: "Animation",
    AUDIO: "Audio",
    NETWORKING: "Networking",
    UI: "UI",
    RENDERING: "Rendering",
    DIAGNOSTICS: "Diagnostics",
    EVENTS: "Events",
    TIME: "Time",
    APP: "App",
};
```

#### `MainScheduleOrder`
管理主调度序列的类。

```typescript
const scheduleOrder = new MainScheduleOrder();
scheduleOrder.insertAfter(BuiltinSchedules.UPDATE, "MyCustomSchedule");
```

### Roblox 适配器

#### `RobloxRunnerPlugin`
集成 Roblox RunService 来驱动应用更新。

```typescript
const plugin = new RobloxRunnerPlugin(
    true,  // useHeartbeat
    false, // useStepped
    false  // useRenderStepped
);
```

#### `RobloxNetworkPlugin`
处理 Roblox 网络通信。

```typescript
const plugin = new RobloxNetworkPlugin();
```

#### `RobloxPlayerPlugin`
管理 Roblox 玩家。

```typescript
const plugin = new RobloxPlayerPlugin();
```

#### `RobloxAssetPlugin`
处理 Roblox 资源加载。

```typescript
const plugin = new RobloxAssetPlugin();
```

#### `RobloxInputPlugin`
处理 Roblox 输入事件。

```typescript
const plugin = new RobloxInputPlugin();
```

#### `RobloxDefaultPlugins`
Roblox 平台的默认插件组。

```typescript
const app = App.create()
    .addPlugins(...RobloxDefaultPlugins.create().build())
    .run();
```

#### `RobloxEnvironment`
检测和管理 Roblox 环境（客户端/服务端）。

```typescript
if (RobloxEnvironment.isServer()) {
    // 服务端代码
} else if (RobloxEnvironment.isClient()) {
    // 客户端代码
}
```

### 类型定义

#### `AppLabel`
标识不同 App 实例的标签。

```typescript
const label = createAppLabel("MyApp");
```

#### `AppExit`
表示应用程序退出状态。

```typescript
const exit = AppExit.success();
const errorExit = AppExit.error(1);
```

#### `ScheduleLabel`
调度标签类型。

```typescript
type ScheduleLabel = string;
```

#### `Message`
事件/消息接口。

```typescript
interface Message {
    readonly __brand: "Message";
}
```

#### `ErrorHandler`
错误处理器类型。

```typescript
type ErrorHandler = (error: unknown) => void;
```

#### `Resource`
资源接口（从 bevy_ecs 导出）。

```typescript
interface Resource {
    readonly __brand: "Resource";
}
```

### Prelude 模块

为了方便使用，`bevy_app` 提供了一个 prelude 模块，包含最常用的导出：

```typescript
import * as prelude from "bevy_app/prelude";
// 或
import { App, Plugin, BuiltinSchedules } from "bevy_app/prelude";
```

## 使用示例

### 基础应用程序

```typescript
import { App, BuiltinSchedules } from "bevy_app";
import { World } from "@rbxts/matter";

function gameSystem(world: World, deltaTime: number) {
    // 游戏逻辑
}

const app = App.create()
    .addSystems(BuiltinSchedules.UPDATE, gameSystem)
    .run();
```

### 创建自定义插件

```typescript
import { BasePlugin, App, BuiltinSchedules } from "bevy_app";

export class MyGamePlugin extends BasePlugin {
    build(app: App): void {
        // 添加资源
        app.insertResource(new GameConfig());

        // 添加系统
        app.addSystems(BuiltinSchedules.STARTUP, initGame)
           .addSystems(BuiltinSchedules.UPDATE, updateGame);
    }

    name(): string {
        return "MyGamePlugin";
    }

    isUnique(): boolean {
        return true; // 只能添加一次
    }
}
```

### 使用插件组

```typescript
import { BasePluginGroup, PluginGroupBuilder } from "bevy_app";

export class MyPluginGroup extends BasePluginGroup {
    build(): PluginGroupBuilder {
        return new PluginGroupBuilder()
            .add(new RenderPlugin())
            .add(new PhysicsPlugin())
            .add(new AudioPlugin());
    }
}

// 使用
const app = App.create()
    .addPlugins(...new MyPluginGroup().build().build())
    .run();
```

### Roblox 集成

```typescript
import { App, RobloxDefaultPlugins } from "bevy_app";

const app = App.create()
    .addPlugins(...RobloxDefaultPlugins.create()
        .disable(RobloxNetworkPlugin) // 禁用网络插件
        .build())
    .run();
```

## 设计原则

1. **模块化**：通过插件系统实现功能模块化
2. **可扩展**：易于添加新的插件和系统
3. **类型安全**：充分利用 TypeScript 类型系统
4. **Roblox 优化**：针对 Roblox 平台特性进行优化
5. **Bevy 兼容**：尽可能保持与原始 Rust Bevy 的 API 兼容性

## 注意事项

- 所有系统函数都接收 `(world: World, deltaTime: number)` 参数
- 插件应该在 `build` 方法中完成所有配置
- 使用 `BuiltinSchedules` 常量而不是硬编码字符串
- 资源必须实现 `Resource` 接口
- 启动调度（STARTUP 等）只运行一次

## 版本兼容性

- roblox-ts: ^2.0.0
- @rbxts/matter: ^0.7.0
- Roblox Studio: 最新版本