# @white-dragon-bull/app

Bevy App系统的Roblox-TS移植版本，提供应用程序生命周期管理和插件系统。

## 功能特性

- 🚀 **应用程序生命周期管理** - 完整的App启动、更新、退出流程
- 🔌 **插件系统** - 模块化的功能扩展机制
- ⏰ **调度系统** - 精确控制系统执行顺序
- 🎮 **Roblox集成** - 深度集成Roblox服务和事件
- 🔄 **ECS支持** - 基于Matter的实体组件系统
- 🌐 **网络同步** - 内置客户端-服务端通信支持

## 快速开始

### 基础使用

```typescript
import { App, BuiltinSchedules, RobloxDefaultPlugins } from "@white-dragon-bull/app";
import { World } from "@rbxts/matter";

// 创建应用程序
const app = App.new()
  .addPlugins(...RobloxDefaultPlugins.create().build())
  .addSystems(BuiltinSchedules.Update, gameUpdateSystem)
  .run();

function gameUpdateSystem(world: World, deltaTime?: number) {
  // 游戏更新逻辑
  print(`Game update: ${deltaTime}`);
}
```

### 自定义插件

```typescript
import { BasePlugin, App, BuiltinSchedules } from "@white-dragon-bull/app";

class MyGamePlugin extends BasePlugin {
  build(app: App): void {
    // 添加资源
    app.insertResource(new GameConfig());

    // 添加系统
    app.addSystems(
      BuiltinSchedules.Update,
      playerMovementSystem,
      enemyAISystem
    );
  }

  name(): string {
    return "MyGamePlugin";
  }
}

// 使用自定义插件
App.new()
  .addPlugin(new MyGamePlugin())
  .run();
```

### 客户端-服务端应用

```typescript
import { App, RobloxEnvironment } from "@white-dragon-bull/app";

if (RobloxEnvironment.isServer()) {
  // 服务端应用
  App.new()
    .addPlugin(new ServerPlugin())
    .addSystems(BuiltinSchedules.Update, serverLogicSystem)
    .run();
} else {
  // 客户端应用
  App.new()
    .addPlugin(new ClientPlugin())
    .addSystems(BuiltinSchedules.Update, clientLogicSystem)
    .run();
}
```

## 核心概念

### App (应用程序)

`App` 是整个应用程序的核心，管理着所有的插件、系统和资源。

```typescript
const app = App.new()
  .addPlugin(new MyPlugin())
  .addSystems(BuiltinSchedules.Update, mySystem)
  .insertResource(new MyResource())
  .run();
```

### Plugin (插件)

插件是模块化功能的载体，可以向App添加系统、资源和其他插件。

```typescript
class MyPlugin extends BasePlugin {
  build(app: App): void {
    // 配置插件逻辑
  }
}
```

### Schedule (调度)

调度控制系统的执行顺序和时机。

```typescript
// 使用内置调度
app.addSystems(BuiltinSchedules.Update, mySystem);

// 创建自定义调度
const mySchedule = createScheduleLabel("MySchedule");
app.addSystems(mySchedule, mySystem);
```

### System (系统)

系统是处理游戏逻辑的函数，接收World和可选的deltaTime参数。

```typescript
function mySystem(world: World, deltaTime?: number) {
  // 系统逻辑
}
```

## 内置调度

- `First` - 每帧最先执行
- `PreStartup` - 启动前执行
- `Startup` - 启动时执行
- `PostStartup` - 启动后执行
- `PreUpdate` - 更新前执行
- `Update` - 主要更新逻辑
- `PostUpdate` - 更新后执行
- `Last` - 每帧最后执行

## Roblox集成

### 运行器

```typescript
import { RobloxRunnerPlugin } from "@white-dragon-bull/app";

// 使用Heartbeat驱动（默认）
app.addPlugin(new RobloxRunnerPlugin(true, false, false));

// 使用Stepped驱动（物理）
app.addPlugin(new RobloxRunnerPlugin(false, true, false));

// 使用RenderStepped驱动（渲染，仅客户端）
app.addPlugin(new RobloxRunnerPlugin(false, false, true));
```

### 玩家管理

```typescript
import { RobloxPlayerPlugin } from "@white-dragon-bull/app";

app.addPlugin(new RobloxPlayerPlugin());
```

### 环境检测

```typescript
import { RobloxEnvironment } from "@white-dragon-bull/app";

if (RobloxEnvironment.isServer()) {
  // 服务端逻辑
}

if (RobloxEnvironment.isClient()) {
  // 客户端逻辑
}
```

## API参考

### 核心类型

- `App` - 主应用程序类
- `Plugin` - 插件接口
- `Schedule` - 调度类
- `SubApp` - 子应用程序

### 工具函数

- `createAppLabel(name)` - 创建应用标签
- `createScheduleLabel(name)` - 创建调度标签
- `createPlugin(buildFn, name?)` - 创建函数式插件

## 许可证

ISC License

## 贡献

欢迎提交Issue和Pull Request来改进这个项目。