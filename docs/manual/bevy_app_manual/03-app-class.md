# App 类详解

## 概述

`App` 类是 Bevy 框架的核心，负责管理整个应用程序的生命周期、插件、资源和系统。

## 创建 App

### 标准创建

```typescript
import { App } from "@white-dragon-bevy/bevy-framework";

// 创建带默认配置的 App
const app = App.create();
```

### 空 App 创建

```typescript
// 创建不含默认调度的空 App
const app = App.empty();
```

## 核心方法

### 运行应用

```typescript
// 运行应用（阻塞直到退出）
const exitCode = app.run();
```

### 自定义运行器

```typescript
// 设置自定义运行器
app.setRunner((app: App) => {
    // 自定义运行逻辑
    while (shouldContinue) {
        app.update();
    }
    return AppExit.success();
});
```

### 手动更新

```typescript
// 手动执行一次更新（用于自定义运行循环）
app.update();
```

## 插件管理

### 添加单个插件

```typescript
import { Plugin } from "@white-dragon-bevy/bevy-framework";

class MyPlugin implements Plugin {
    build(app: App): void {
        // 插件逻辑
    }
    name(): string { return "MyPlugin"; }
    isUnique(): boolean { return true; }
}

app.addPlugin(new MyPlugin());
```

### 添加多个插件

```typescript
app.addPlugins(
    new PhysicsPlugin(),
    new RenderPlugin(),
    new AudioPlugin()
);
```

### 添加插件组

```typescript
import { PluginGroup, PluginGroupBuilder } from "@white-dragon-bevy/bevy-framework";

class DefaultPlugins implements PluginGroup {
    build(): PluginGroupBuilder {
        return new PluginGroupBuilder()
            .add(new CorePlugin())
            .add(new InputPlugin())
            .add(new RenderPlugin());
    }
    name(): string { return "DefaultPlugins"; }
}

app.addPlugins(new DefaultPlugins());
```

### 检查插件状态

```typescript
// 检查特定插件是否已添加
if (app.isPluginAdded(MyPlugin)) {
    print("MyPlugin is loaded");
}

// 获取已添加的插件实例
const plugins = app.getAddedPlugins(MyPlugin);

// 获取插件状态
const state = app.getPluginState();
// 可能的值: Adding, Ready, Finished, Cleaned
```

## 系统管理

### 添加系统到调度

```typescript
import { BuiltinSchedules } from "@white-dragon-bevy/bevy-framework";

// 添加单个系统
function mySystem(world: World, context: Context): void {
    // 系统逻辑
}

app.addSystems(BuiltinSchedules.UPDATE, mySystem);
```

### 添加多个系统

```typescript
app.addSystems(
    BuiltinSchedules.UPDATE,
    systemA,
    systemB,
    systemC
);
```

### 配置系统执行顺序

```typescript
// 使用系统配置
app.addSystems(
    BuiltinSchedules.UPDATE,
    systemA,
    systemB.after(systemA),
    systemC.before(systemB)
);
```

### 平台特定系统

```typescript
// 仅在服务端运行
app.addServerSystems(BuiltinSchedules.UPDATE, serverSystem);

// 仅在客户端运行
app.addClientSystems(BuiltinSchedules.UPDATE, clientSystem);
```

## 资源管理

### 插入资源

```typescript
class GameConfig {
    maxPlayers = 10;
}

// 方式 1：直接插入实例
app.insertResource(new GameConfig());

// 方式 2：使用类型和实例
app.insertResource(GameConfig, new GameConfig());
```

### 初始化资源

```typescript
// 使用工厂函数初始化资源
app.initResource(() => {
    const config = new GameConfig();
    config.maxPlayers = 20;
    return config;
});
```

### 获取资源

```typescript
const config = app.getResource<GameConfig>();
if (config) {
    print(`Max players: ${config.maxPlayers}`);
}
```

## 调度管理

### 添加调度

```typescript
import { Schedule } from "@white-dragon-bevy/bevy-framework";

const customSchedule = new Schedule("CustomSchedule");
app.addSchedule(customSchedule);
```

### 初始化调度

```typescript
// 初始化内置或自定义调度
app.initSchedule("CustomSchedule");
```

### 获取调度

```typescript
const schedule = app.getSchedule(BuiltinSchedules.UPDATE);
if (schedule) {
    // 使用调度
}
```

### 编辑调度

```typescript
app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
    // 修改调度配置
    schedule.configureSet({
        name: "MySystemSet",
    });
});
```

## 子应用管理

### 创建子应用

```typescript
import { SubApp, AppLabel } from "@white-dragon-bevy/bevy-framework";

const renderApp = new SubApp();
const renderLabel: AppLabel = { name: "RenderApp" };

app.insertSubApp(renderLabel, renderApp);
```

### 访问子应用

```typescript
// 获取子应用（如果不存在会报错）
const renderApp = app.subApp(renderLabel);

// 安全获取子应用
const maybeRenderApp = app.getSubApp(renderLabel);
if (maybeRenderApp) {
    // 使用子应用
}
```

### 移除子应用

```typescript
const removedApp = app.removeSubApp(renderLabel);
```

## 错误处理

### 设置错误处理器

```typescript
app.setErrorHandler((error: unknown) => {
    warn(`Application error: ${error}`);
    // 自定义错误处理逻辑
    // 例如：发送到日志服务
});
```

### 获取错误处理器

```typescript
const handler = app.getErrorHandler();
```

## 获取核心对象

### 获取 World

```typescript
// 获取 WorldContainer
const worldContainer = app.world();

// 获取 BevyWorld 实例
const world = app.getWorld();
```

### 获取主 SubApp

```typescript
const mainApp = app.main();
```

### 获取 Context

```typescript
const context = app.getContext();

// 使用 context 访问核心功能
const resources = context.resources;
const commands = context.commands;
const events = context.events;
```

## 生命周期控制

### 完成插件设置

```typescript
// 调用所有插件的 finish() 方法
app.finish();
```

### 清理插件

```typescript
// 调用所有插件的 cleanup() 方法
app.cleanup();
```

### 检查退出状态

```typescript
const exitStatus = app.shouldExit();
if (exitStatus) {
    print(`Exiting with code: ${exitStatus.code}`);
}
```

## 完整示例

```typescript
import {
    App,
    Plugin,
    BuiltinSchedules,
    Resource,
    Context,
    World
} from "@white-dragon-bevy/bevy-framework";

// 定义资源
class GameState implements Resource {
    score = 0;
    level = 1;
}

// 定义系统
function updateGame(world: World, context: Context): void {
    const state = context.resources.getResource<GameState>();
    if (state) {
        state.score += 1;
    }
}

function renderGame(world: World, context: Context): void {
    const state = context.resources.getResource<GameState>();
    if (state) {
        print(`Score: ${state.score}, Level: ${state.level}`);
    }
}

// 定义插件
class GamePlugin implements Plugin {
    build(app: App): void {
        app.insertResource(new GameState());
        app.addSystems(BuiltinSchedules.UPDATE, updateGame);
        app.addSystems(BuiltinSchedules.POST_UPDATE, renderGame);
    }

    name(): string { return "GamePlugin"; }
    isUnique(): boolean { return true; }
}

// 创建和配置应用
function main(): void {
    const app = App.create();

    // 设置错误处理
    app.setErrorHandler((error) => {
        warn(`Game error: ${error}`);
    });

    // 添加插件
    app.addPlugin(new GamePlugin());

    // 运行应用
    const exitCode = app.run();
    print(`Game exited with code: ${exitCode.code}`);
}

main();
```

## 最佳实践

1. **尽早添加插件** - 在调用 `run()` 之前添加所有插件
2. **使用插件组织功能** - 避免在主函数中直接添加大量系统
3. **合理使用资源** - 资源适合存储全局状态
4. **设置错误处理器** - 总是设置错误处理器以捕获运行时错误
5. **避免在运行时修改插件** - 插件应该在启动时完成配置