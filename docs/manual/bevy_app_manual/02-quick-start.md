# 快速开始

## 安装

```bash
npm install @white-dragon-bevy/bevy-framework
# 或
pnpm add @white-dragon-bevy/bevy-framework
```

## 创建第一个应用

### 步骤 1：创建基本应用

```typescript
import { App, BuiltinSchedules } from "@white-dragon-bevy/bevy-framework";

// 创建应用
const app = App.create();

// 添加一个简单的系统
function helloSystem(): void {
    print("Hello, Bevy!");
}

app.addSystems(BuiltinSchedules.UPDATE, helloSystem);

// 运行应用
app.run();
```

### 步骤 2：添加资源

```typescript
import { App, BuiltinSchedules, Resource } from "@white-dragon-bevy/bevy-framework";

// 定义资源
class GameTime implements Resource {
    elapsed = 0;
    deltaTime = 0;
}

const app = App.create();

// 插入资源
app.insertResource(new GameTime());

// 使用资源的系统
function updateTime(world: World, context: Context): void {
    const time = context.getResource(GameTime);
    if (time) {
        time.elapsed += time.deltaTime;
        print(`Game time: ${time.elapsed}`);
    }
}

app.addSystems(BuiltinSchedules.UPDATE, updateTime);
app.run();
```

### 步骤 3：创建插件

```typescript
import { App, Plugin, BuiltinSchedules } from "@white-dragon-bevy/bevy-framework";

// 定义插件
class TimePlugin implements Plugin {
    build(app: App): void {
        // 添加资源
        app.insertResource(new GameTime());

        // 添加系统
        app.addSystems(BuiltinSchedules.UPDATE, updateTime);
    }

    name(): string {
        return "TimePlugin";
    }

    isUnique(): boolean {
        return true;
    }
}

// 使用插件
const app = App.create();
app.addPlugin(new TimePlugin());
app.run();
```

## 完整示例：简单的计数器

```typescript
import {
    App,
    Plugin,
    BuiltinSchedules,
    Resource,
    Context,
    World
} from "@white-dragon-bevy/bevy-framework";

// 资源定义
class Counter implements Resource {
    value = 0;
}

class CounterConfig implements Resource {
    increment = 1;
    maxValue = 100;
}

// 系统定义
function incrementCounter(world: World, context: Context): void {
    const counter = context.getResource(Counter);
    const config = context.getResource(CounterConfig);

    if (counter && config) {
        counter.value = math.min(
            counter.value + config.increment,
            config.maxValue
        );
    }
}

function printCounter(world: World, context: Context): void {
    const counter = context.getResource(Counter);
    if (counter) {
        print(`Counter: ${counter.value}`);
    }
}

// 插件定义
class CounterPlugin implements Plugin {
    build(app: App): void {
        app.insertResource(new Counter());
        app.insertResource(new CounterConfig());

        // 系统执行顺序：increment -> print
        app.addSystems(
            BuiltinSchedules.UPDATE,
            incrementCounter,
            printCounter
        );
    }

    name(): string {
        return "CounterPlugin";
    }

    isUnique(): boolean {
        return true;
    }
}

// 创建并运行应用
function main(): void {
    const app = App.create();
    app.addPlugin(new CounterPlugin());
    app.run();
}

main();
```

## Roblox 特定功能

### 使用 RunService 驱动

```typescript
import { RunService } from "@rbxts/services";
import { App, RobloxRunnerPlugin } from "@white-dragon-bevy/bevy-framework";

const app = App.create();

// 添加 Roblox 运行器插件
app.addPlugin(new RobloxRunnerPlugin());

// 设置自定义运行器
app.setRunner((app) => {
    const connection = RunService.Heartbeat.Connect((dt) => {
        app.update();
    });

    // 返回退出状态
    return { code: 0 };
});

app.run();
```

### 客户端/服务端分离

```typescript
import { App, BuiltinSchedules, RobloxContext } from "@white-dragon-bevy/bevy-framework";

const app = App.create();

// 服务端系统
function serverSystem(): void {
    print("Running on server");
}

// 客户端系统
function clientSystem(): void {
    print("Running on client");
}

// 根据环境添加系统
app.addServerSystems(BuiltinSchedules.UPDATE, serverSystem);
app.addClientSystems(BuiltinSchedules.UPDATE, clientSystem);

app.run();
```

## 调试技巧

### 1. 查看应用状态

```typescript
// 获取插件状态
const state = app.getPluginState();
print(`Plugin state: ${state}`);

// 获取资源
const resource = app.getResource(MyResource);
if (resource) {
    print(`Resource value: ${resource.value}`);
}
```

### 2. 使用错误处理器

```typescript
app.setErrorHandler((error) => {
    warn(`[App Error]: ${error}`);
    // 记录错误或发送到监控服务
});
```

### 3. 调试系统执行

```typescript
function debugSystem(world: World, context: Context): void {
    print(`System executing at ${os.clock()}`);
    // 系统逻辑
}

// 添加带名称的系统，方便调试
app.addSystems(BuiltinSchedules.UPDATE, {
    system: debugSystem,
    name: "DebugSystem"
});
```

## 下一步

- 阅读 [App 类详解](./03-app-class.md) 了解更多 App 功能
- 学习 [插件系统](./04-plugin-system.md) 创建可复用的模块
- 探索 [调度系统](./05-schedule-system.md) 控制系统执行时机