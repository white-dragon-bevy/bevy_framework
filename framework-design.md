# Roblox-TS + Matter-TS 游戏框架插件系统设计

## 概述

基于 Bevy 的插件系统，为 roblox-ts 和 matter-ts 设计一个模块化的游戏框架，使用插件来组织项目结构和功能。

## 核心架构

### 1. 框架核心接口

```typescript
// 框架应用的核心接口
interface GameApp {
    // Matter World 实例
    readonly world: World;

    // RunService 连接管理
    readonly connections: RBXScriptConnection[];

    // 插件管理器
    readonly pluginManager: PluginManager;

    // 调度器（类似 Bevy 的 Schedule）
    readonly scheduler: SystemScheduler;

    // 资源管理器
    readonly resources: ResourceManager;

    // 添加插件
    addPlugin<T extends Plugin>(plugin: T): this;

    // 添加插件组
    addPluginGroup<T extends PluginGroup>(group: T): this;

    // 启动应用
    start(): void;

    // 停止应用
    stop(): void;
}
```

### 2. 插件接口

```typescript
// 插件基础接口
interface Plugin {
    // 插件名称（用于去重和调试）
    readonly name: string;

    // 是否允许重复添加
    readonly isUnique: boolean;

    // 构建阶段：配置系统、组件、资源等
    build(app: GameApp): void;

    // 就绪检查：异步依赖是否完成
    ready?(app: GameApp): boolean;

    // 完成阶段：所有插件就绪后执行
    finish?(app: GameApp): void;

    // 清理阶段：应用启动前的最后清理
    cleanup?(app: GameApp): void;
}

// 函数式插件支持
type FunctionPlugin = (app: GameApp) => void;
```

### 3. 插件组

```typescript
// 插件组接口
interface PluginGroup {
    readonly name: string;
    build(): PluginGroupBuilder;
}

// 插件组构建器
class PluginGroupBuilder {
    private plugins: Map<string, Plugin> = new Map();

    // 添加插件到组
    add<T extends Plugin>(plugin: T): this;

    // 替换组中的插件
    set<T extends Plugin>(plugin: T): this;

    // 禁用组中的插件
    disable(pluginName: string): this;

    // 启用组中的插件
    enable(pluginName: string): this;

    // 构建最终的插件列表
    finish(): Plugin[];
}
```

### 4. 系统调度器

```typescript
// 系统调度阶段
enum SystemStage {
    PreUpdate = "PreUpdate",
    Update = "Update",
    PostUpdate = "PostUpdate",
    PreRender = "PreRender",
    Render = "Render",
    PostRender = "PostRender"
}

// 系统接口
type System = (world: World, dt: number) => void;

// 系统调度器
interface SystemScheduler {
    // 添加系统到指定阶段
    addSystem(stage: SystemStage, system: System): void;

    // 添加系统到指定阶段（带标签）
    addSystemWithLabel(stage: SystemStage, label: string, system: System): void;

    // 在指定系统之前运行
    addSystemBefore(targetLabel: string, system: System): void;

    // 在指定系统之后运行
    addSystemAfter(targetLabel: string, system: System): void;

    // 运行指定阶段的所有系统
    runStage(stage: SystemStage, world: World, dt: number): void;

    // 运行所有阶段
    runAll(world: World, dt: number): void;
}
```

### 5. 资源管理器

```typescript
// 全局资源管理
interface ResourceManager {
    // 插入资源
    insert<T>(resource: T): void;

    // 获取资源
    get<T>(constructor: new (...args: any[]) => T): T | undefined;

    // 获取资源（必须存在）
    getRequired<T>(constructor: new (...args: any[]) => T): T;

    // 检查资源是否存在
    has<T>(constructor: new (...args: any[]) => T): boolean;

    // 移除资源
    remove<T>(constructor: new (...args: any[]) => T): T | undefined;
}
```

## 插件系统生命周期

1. **Adding Phase**:
   - 调用所有插件的 `build()` 方法
   - 注册系统、组件和资源

2. **Ready Phase**:
   - 检查所有插件的 `ready()` 方法
   - 等待异步依赖完成

3. **Finish Phase**:
   - 调用所有插件的 `finish()` 方法
   - 执行跨插件的配置

4. **Cleanup Phase**:
   - 调用所有插件的 `cleanup()` 方法
   - 最终清理和优化

5. **Running Phase**:
   - 启动系统调度器
   - 开始游戏循环

## 与 Roblox 服务集成

### RunService 集成
```typescript
// 自动管理 RunService 连接
class RunServicePlugin implements Plugin {
    readonly name = "RunServicePlugin";
    readonly isUnique = true;

    build(app: GameApp): void {
        const runService = game.GetService("RunService");

        // 根据环境选择合适的事件
        const updateEvent = runService.IsClient()
            ? runService.Heartbeat
            : runService.PostSimulation;

        const connection = updateEvent.Connect((dt) => {
            app.scheduler.runStage(SystemStage.PreUpdate, app.world, dt);
            app.scheduler.runStage(SystemStage.Update, app.world, dt);
            app.scheduler.runStage(SystemStage.PostUpdate, app.world, dt);
        });

        app.connections.push(connection);
    }
}
```

### ReplicatedStorage 集成
```typescript
class ReplicationPlugin implements Plugin {
    readonly name = "ReplicationPlugin";
    readonly isUnique = true;

    build(app: GameApp): void {
        if (runService.IsServer()) {
            app.scheduler.addSystem(SystemStage.PostUpdate, this.serverReplicationSystem);
        } else {
            app.scheduler.addSystem(SystemStage.PreUpdate, this.clientReplicationSystem);
        }
    }

    private serverReplicationSystem = (world: World, dt: number) => {
        // 服务器同步逻辑
    };

    private clientReplicationSystem = (world: World, dt: number) => {
        // 客户端同步逻辑
    };
}
```

## 示例插件

### 1. 物理插件
```typescript
class PhysicsPlugin implements Plugin {
    readonly name = "PhysicsPlugin";
    readonly isUnique = true;

    build(app: GameApp): void {
        // 注册物理相关组件
        app.world.registerComponent(Transform);
        app.world.registerComponent(Velocity);
        app.world.registerComponent(RigidBody);

        // 添加物理系统
        app.scheduler.addSystemWithLabel(
            SystemStage.Update,
            "physics_movement",
            this.movementSystem
        );

        app.scheduler.addSystemAfter(
            "physics_movement",
            this.collisionSystem
        );
    }

    private movementSystem = (world: World, dt: number) => {
        // 物理移动逻辑
        const transforms = world.query(Transform, Velocity);
        // ... 实现细节
    };

    private collisionSystem = (world: World, dt: number) => {
        // 碰撞检测逻辑
        // ... 实现细节
    };
}
```

### 2. 渲染插件
```typescript
class RenderPlugin implements Plugin {
    readonly name = "RenderPlugin";
    readonly isUnique = true;

    build(app: GameApp): void {
        // 仅在客户端运行
        if (!runService.IsClient()) return;

        app.world.registerComponent(Mesh);
        app.world.registerComponent(Material);

        app.scheduler.addSystem(SystemStage.Render, this.renderSystem);
    }

    private renderSystem = (world: World, dt: number) => {
        // 渲染系统逻辑
        // ... 实现细节
    };
}
```

### 3. 输入插件
```typescript
class InputPlugin implements Plugin {
    readonly name = "InputPlugin";
    readonly isUnique = true;

    build(app: GameApp): void {
        if (!runService.IsClient()) return;

        const userInputService = game.GetService("UserInputService");

        // 插入输入资源
        app.resources.insert(new InputState());

        // 添加输入处理系统
        app.scheduler.addSystem(SystemStage.PreUpdate, this.inputSystem);

        // 监听输入事件
        const connection = userInputService.InputBegan.Connect((input) => {
            const inputState = app.resources.getRequired(InputState);
            inputState.processInput(input);
        });

        app.connections.push(connection);
    }

    private inputSystem = (world: World, dt: number) => {
        // 处理输入状态更新
        // ... 实现细节
    };
}
```

## 使用示例

```typescript
// 创建应用
const app = new GameApp();

// 添加核心插件组
app.addPluginGroup(new CorePluginGroup());

// 添加游戏特定插件
app.addPlugin(new PhysicsPlugin());
app.addPlugin(new RenderPlugin());
app.addPlugin(new InputPlugin());

// 添加自定义插件
app.addPlugin((app) => {
    // 函数式插件
    app.scheduler.addSystem(SystemStage.Update, (world, dt) => {
        // 自定义游戏逻辑
    });
});

// 启动应用
app.start();
```

## 优势

1. **模块化**: 功能通过插件清晰分离
2. **可重用**: 插件可在不同项目间共享
3. **可配置**: 插件组提供灵活的功能组合
4. **类型安全**: 完整的 TypeScript 类型支持
5. **Roblox 优化**: 针对 Roblox 环境的特殊优化
6. **ECS 集成**: 与 matter-ts 的无缝集成

## 扩展性

1. **自定义插件组**: 为特定游戏类型创建专用插件组
2. **条件插件**: 根据运行环境动态启用/禁用插件
3. **热重载**: 支持开发时的插件热重载
4. **插件市场**: 社区插件的分享和发布机制