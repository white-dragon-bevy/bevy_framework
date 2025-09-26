# 插件系统

## 概述

插件是 Bevy 框架中组织和复用代码的核心机制。每个插件封装特定的功能，可以轻松地在不同项目间共享。

## Plugin 接口

```typescript
interface Plugin {
    // 必需方法
    build(app: App): void;      // 配置应用
    name(): string;              // 插件名称
    isUnique(): boolean;         // 是否唯一

    // 可选方法
    ready?(app: App): boolean;   // 检查是否就绪
    finish?(app: App): void;     // 完成设置
    cleanup?(app: App): void;    // 清理资源

    // Roblox 特定
    robloxContext?: RobloxContext; // 运行环境
}
```

## 创建插件

### 基础插件

```typescript
import { App, Plugin, BuiltinSchedules } from "@white-dragon-bevy/bevy-framework";

export class HelloPlugin implements Plugin {
    build(app: App): void {
        app.addSystems(BuiltinSchedules.STARTUP, () => {
            print("Hello from plugin!");
        });
    }

    name(): string {
        return "HelloPlugin";
    }

    isUnique(): boolean {
        return true; // 只能添加一次
    }
}
```

### 使用 BasePlugin

```typescript
import { BasePlugin, App } from "@white-dragon-bevy/bevy-framework";

export class MyPlugin extends BasePlugin {
    build(app: App): void {
        // 插件逻辑
    }

    name(): string {
        return "MyPlugin";
    }
}
```

### 带配置的插件

```typescript
interface PluginConfig {
    enabled: boolean;
    debugMode: boolean;
}

export class ConfigurablePlugin implements Plugin {
    constructor(private config: PluginConfig) {}

    build(app: App): void {
        if (!this.config.enabled) return;

        if (this.config.debugMode) {
            app.addSystems(BuiltinSchedules.UPDATE, this.debugSystem);
        }

        app.addSystems(BuiltinSchedules.UPDATE, this.mainSystem);
    }

    private mainSystem(): void {
        // 主逻辑
    }

    private debugSystem(): void {
        print("[Debug] Plugin running");
    }

    name(): string {
        return "ConfigurablePlugin";
    }

    isUnique(): boolean {
        return false; // 可以添加多次（不同配置）
    }
}

// 使用
app.addPlugin(new ConfigurablePlugin({
    enabled: true,
    debugMode: true
}));
```

## 插件生命周期

### 完整生命周期示例

```typescript
export class LifecyclePlugin implements Plugin {
    private initialized = false;

    build(app: App): void {
        print("1. Build: 配置应用");
        app.insertResource(new MyResource());
        app.addSystems(BuiltinSchedules.UPDATE, mySystem);
    }

    ready(app: App): boolean {
        print("2. Ready: 检查依赖");
        // 检查所需资源是否存在
        const resource = app.getResource<RequiredResource>();
        this.initialized = resource !== undefined;
        return this.initialized;
    }

    finish(app: App): void {
        print("3. Finish: 完成设置");
        // 最终配置，例如启动网络连接
        const network = app.getResource<NetworkService>();
        network?.connect();
    }

    cleanup(app: App): void {
        print("4. Cleanup: 清理资源");
        // 断开连接，释放资源
        const network = app.getResource<NetworkService>();
        network?.disconnect();
    }

    name(): string { return "LifecyclePlugin"; }
    isUnique(): boolean { return true; }
}
```

## 函数式插件

### 使用 createPlugin

```typescript
import { createPlugin } from "@white-dragon-bevy/bevy-framework";

const simplePlugin = createPlugin((app) => {
    app.addSystems(BuiltinSchedules.UPDATE, () => {
        print("Simple plugin system");
    });
}, "SimplePlugin");

app.addPlugin(simplePlugin);
```

## 插件组

### 创建插件组

```typescript
import { PluginGroup, PluginGroupBuilder } from "@white-dragon-bevy/bevy-framework";

export class GamePlugins implements PluginGroup {
    build(): PluginGroupBuilder {
        return new PluginGroupBuilder()
            .add(new PhysicsPlugin())
            .add(new RenderingPlugin())
            .add(new AudioPlugin())
            .add(new UIPlugin());
    }

    name(): string {
        return "GamePlugins";
    }
}

// 使用
app.addPlugins(new GamePlugins());
```

### 配置插件组

```typescript
export class ConfigurablePluginGroup implements PluginGroup {
    constructor(private config: GameConfig) {}

    build(): PluginGroupBuilder {
        const builder = new PluginGroupBuilder()
            .add(new CorePlugin());

        if (this.config.enablePhysics) {
            builder.add(new PhysicsPlugin());
        }

        if (this.config.enableAudio) {
            builder.add(new AudioPlugin());
        }

        // 控制插件顺序
        if (this.config.debugMode) {
            builder.addBefore(PhysicsPlugin, new DebugPlugin());
        }

        return builder;
    }

    name(): string { return "ConfigurablePluginGroup"; }
}
```

### 禁用插件组中的插件

```typescript
class CustomPlugins implements PluginGroup {
    build(): PluginGroupBuilder {
        return new PluginGroupBuilder()
            .add(new DefaultPlugins())
            .disable(AudioPlugin); // 禁用音频插件
    }

    name(): string { return "CustomPlugins"; }
}
```

## 平台特定插件

### 服务端插件

```typescript
import { RobloxContext } from "@white-dragon-bevy/bevy-framework";

export class ServerPlugin implements Plugin {
    robloxContext = RobloxContext.Server;

    build(app: App): void {
        // 仅在服务端执行
        app.addSystems(BuiltinSchedules.UPDATE, () => {
            print("Server-only logic");
        });
    }

    name(): string { return "ServerPlugin"; }
    isUnique(): boolean { return true; }
}
```

### 客户端插件

```typescript
export class ClientPlugin implements Plugin {
    robloxContext = RobloxContext.Client;

    build(app: App): void {
        // 仅在客户端执行
        app.addSystems(BuiltinSchedules.UPDATE, () => {
            print("Client-only rendering");
        });
    }

    name(): string { return "ClientPlugin"; }
    isUnique(): boolean { return true; }
}
```

## 插件间依赖

### 检查依赖插件

```typescript
export class DependentPlugin implements Plugin {
    build(app: App): void {
        // 检查必需的插件
        if (!app.isPluginAdded(RequiredPlugin)) {
            error("DependentPlugin requires RequiredPlugin");
        }

        // 添加系统
        app.addSystems(BuiltinSchedules.UPDATE, this.mySystem);
    }

    ready(app: App): boolean {
        // 等待依赖插件就绪
        return app.isPluginAdded(RequiredPlugin);
    }

    private mySystem(): void {
        // 系统逻辑
    }

    name(): string { return "DependentPlugin"; }
    isUnique(): boolean { return true; }
}
```

## 插件扩展系统

### 使用 Context 扩展

```typescript
import { BasePlugin, ExtensionRegistry } from "@white-dragon-bevy/bevy-framework";

interface CustomService {
    doSomething(): void;
}

export class ExtensionPlugin extends BasePlugin {
    build(app: App): void {
        // 注册扩展
        this.registerExtension(app, "customService", {
            doSomething() {
                print("Doing something!");
            }
        } as CustomService);
    }

    name(): string { return "ExtensionPlugin"; }
}

// 在系统中使用扩展
function useExtension(world: World, context: Context): void {
    const service = context.get<CustomService>("customService");
    service.doSomething();
}
```

## 最佳实践

### 1. 插件职责单一

```typescript
// ✅ 好的设计：单一职责
class InputPlugin implements Plugin {
    build(app: App): void {
        app.insertResource(new InputState());
        app.addSystems(BuiltinSchedules.PRE_UPDATE, updateInput);
    }
    // ...
}

// ❌ 不好的设计：职责过多
class EverythingPlugin implements Plugin {
    build(app: App): void {
        // 输入、渲染、音频、网络都在一个插件
    }
    // ...
}
```

### 2. 提供配置选项

```typescript
interface PluginOptions {
    enableDebug?: boolean;
    maxConnections?: number;
}

export class NetworkPlugin implements Plugin {
    constructor(private options: PluginOptions = {}) {
        this.options.enableDebug ??= false;
        this.options.maxConnections ??= 10;
    }

    build(app: App): void {
        // 使用配置
    }
    // ...
}
```

### 3. 文档化插件

```typescript
/**
 * 物理插件 - 提供碰撞检测和刚体模拟
 *
 * 依赖：
 * - TransformPlugin
 *
 * 提供的资源：
 * - PhysicsWorld
 * - PhysicsConfig
 *
 * 添加的系统：
 * - updatePhysics (Update)
 * - resolveCollisions (PostUpdate)
 */
export class PhysicsPlugin implements Plugin {
    // ...
}
```

### 4. 错误处理

```typescript
export class SafePlugin implements Plugin {
    build(app: App): void {
        try {
            this.setupPlugin(app);
        } catch (error) {
            warn(`Failed to setup ${this.name()}: ${error}`);
            // 提供降级方案
            this.setupFallback(app);
        }
    }

    private setupPlugin(app: App): void {
        // 可能失败的设置
    }

    private setupFallback(app: App): void {
        // 降级方案
    }

    name(): string { return "SafePlugin"; }
    isUnique(): boolean { return true; }
}
```

## 插件示例：完整的输入系统

```typescript
import {
    App,
    Plugin,
    Resource,
    BuiltinSchedules,
    World,
    Context
} from "@white-dragon-bevy/bevy-framework";
import { UserInputService } from "@rbxts/services";

// 输入状态资源
class InputState implements Resource {
    keys = new Map<Enum.KeyCode, boolean>();
    mousePosition = Vector2.zero;
    mouseDown = false;
}

// 输入事件
class KeyPressEvent {
    constructor(public keyCode: Enum.KeyCode) {}
}

// 输入插件
export class InputPlugin implements Plugin {
    private connections: RBXScriptConnection[] = [];

    build(app: App): void {
        const inputState = new InputState();
        app.insertResource(inputState);

        // 连接 Roblox 输入事件
        this.connections.push(
            UserInputService.InputBegan.Connect((input) => {
                if (input.UserInputType === Enum.UserInputType.Keyboard) {
                    inputState.keys.set(input.KeyCode, true);
                }
            })
        );

        this.connections.push(
            UserInputService.InputEnded.Connect((input) => {
                if (input.UserInputType === Enum.UserInputType.Keyboard) {
                    inputState.keys.set(input.KeyCode, false);
                }
            })
        );

        // 添加输入处理系统
        app.addSystems(BuiltinSchedules.PRE_UPDATE, this.updateInput);
    }

    private updateInput(world: World, context: Context): void {
        const input = context.resources.getResource<InputState>();
        if (!input) return;

        // 更新鼠标位置
        const mouse = UserInputService.GetMouseLocation();
        input.mousePosition = new Vector2(mouse.X, mouse.Y);
    }

    cleanup(app: App): void {
        // 断开所有连接
        for (const connection of this.connections) {
            connection.Disconnect();
        }
        this.connections.clear();
    }

    name(): string { return "InputPlugin"; }
    isUnique(): boolean { return true; }
}
```