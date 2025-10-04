# White Dragon Bevy 插件开发规范

## 目录

1. [插件规范总则](#插件规范总则)
2. [插件结构规范](#插件结构规范)
3. [扩展系统规范](#扩展系统规范)
4. [系统注册规范](#系统注册规范)
5. [资源管理规范](#资源管理规范)
6. [插件依赖规范](#插件依赖规范)
7. [错误处理规范](#错误处理规范)
8. [测试规范](#测试规范)
9. [代码示例](#代码示例)
10. [检查清单](#检查清单)

## 插件规范总则

### 命名规范

#### 文件命名
- **必须**：使用 kebab-case 命名文件：`my-plugin.ts`、`diagnostic-plugin.ts`
- **必须**：测试文件使用 `.spec.ts` 后缀：`my-plugin.spec.ts`
- **必须**：主入口文件命名为 `index.ts`
- **禁止**：使用下划线或大写字母：`my_plugin.ts` ❌、`MyPlugin.ts` ❌

**为什么**：保持与 Node.js 生态系统的一致性，避免跨平台文件系统问题。

#### 类命名
- **必须**：插件类使用 PascalCase + Plugin 后缀：`TimePlugin`、`DiagnosticsPlugin`
- **必须**：资源类使用 PascalCase + Resource 后缀：`TimeResource`、`ConfigResource`
- **必须**：组件接口使用 PascalCase：`Position`、`Velocity`
- **应该**：系统函数使用 camelCase + System 后缀：`movementSystem`、`renderSystem`

**为什么**：清晰的命名约定让代码意图一目了然，后缀标识类型用途。

#### 变量命名
- **必须**：使用完整的描述性名称
- **禁止**：单字母变量名（除了明确的数学公式）
- **禁止**：缩写（除了广泛认可的术语如 API、URL）

```typescript
// ✅ 正确
for (let index = 0; index < items.size(); index++)
for (let rowIndex = 0; rowIndex < rows; rowIndex++)
const maximumValue = 100;
const currentTime = os.clock();

// ❌ 错误
for (let i = 0; i < items.size(); i++)
const maxVal = 100;
const t = os.clock();
```

**为什么**：描述性名称提高代码可读性，减少理解成本。

### 导入规范

#### 模块导入路径
- **必须**：使用 `@white-dragon-bevy/模块名` 格式导入框架模块
- **禁止**：使用相对路径导入框架模块

```typescript
// ✅ 正确
import { BasePlugin, App } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";

// ❌ 错误
import { BasePlugin } from "../bevy_app/plugin";
import { World } from "../../node_modules/@rbxts/matter";
```

**为什么**：绝对路径导入确保模块解析的一致性，避免重构时的路径问题。

#### 导入顺序
- **必须**：按以下顺序组织导入语句：
  1. 外部包（@rbxts/*, @flamework/* 等）
  2. 框架模块（@white-dragon-bevy/*）
  3. 项目内部模块（相对路径）
  4. 类型导入（使用 `import type`）

```typescript
// ✅ 正确顺序
import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";

import { BasePlugin, App } from "@white-dragon-bevy/bevy_app";
import { Context } from "@white-dragon-bevy/bevy_ecs";

import { MyComponent } from "./components/my-component";
import { helperFunction } from "./utils/helpers";

import type { Config } from "./types/config";
import type { UserData } from "./types/user-data";
```

**为什么**：统一的导入顺序提高代码的可维护性和可读性。

### 目录组织规范

#### bevy 迁移插件目录结构
如果是 `bevy 迁移插件`, 则应当与其源码**保持高度的结构一致性**.

#### 自定义插件目录结构
- **必须**：每个插件独立目录，位于 `src/` 下
- **应该**：包含以下标准文件结构：

```
src/
└── my-plugin/
    ├── index.ts           # 导出入口
    ├── plugin.ts          # 插件主类
    ├── systems/           # 系统函数目录
    │   ├── index.ts
    │   └── my-system.ts
    ├── components/        # 组件定义目录
    │   ├── index.ts
    │   └── my-component.ts
    ├── resources/         # 资源定义目录
    │   ├── index.ts
    │   └── my-resource.ts
    └── __tests__/         # 测试目录
        └── plugin.spec.ts
```

**为什么**：标准化的目录结构便于导航和维护，职责分离清晰。

### 导出规范

#### 模块导出
- **必须**：在 `index.ts` 中导出所有公共 API
- **应该**：使用具名导出而非默认导出
- **可以**：为常用组合提供便捷导出

```typescript
// index.ts
// ✅ 正确
export { MyPlugin } from "./plugin";
export { MyComponent, MyOtherComponent } from "./components";
export type { MyConfig } from "./types";

// 便捷导出
export * as Systems from "./systems";

// ❌ 避免默认导出
export default MyPlugin; // 不推荐
```

**为什么**：具名导出提供更好的 IDE 支持和树摇优化。

## 插件结构规范

### 必须实现的接口方法

所有插件**必须**继承 `BasePlugin` 并实现以下方法：

```typescript
import { BasePlugin, App } from "@white-dragon-bevy/bevy_app";

export class MyPlugin extends BasePlugin {
    /**
     * 构建插件 - 必须实现
     * @param app - 应用实例
     */
    build(app: App): void {
        // 插件配置逻辑
    }

    /**
     * 返回插件名称 - 必须重写
     * @returns 插件的唯一标识名称
     */
    name(): string {
        return "MyPlugin"; // 必须返回唯一名称
    }
}
```

**为什么**：`build` 方法是插件的核心，`name` 方法用于调试和错误报告。

### 生命周期方法使用规范

插件支持四个生命周期方法，使用规范如下：

#### build() - 构建阶段
- **必须**：在此方法中完成所有配置
- **可以**：添加系统、资源、其他插件
- **禁止**：执行异步操作或 yield 操作

```typescript
build(app: App): void {
    // ✅ 正确：同步配置
    app.addSystems(BuiltinSchedules.UPDATE, mySystem);
    app.insertResource(new MyResource());
    app.addPlugin(new DependencyPlugin());

    // ❌ 错误：异步操作
    task.wait(1); // 禁止
    RunService.Heartbeat.Wait(); // 禁止
}
```

**为什么**：build 必须是同步的，确保插件加载的可预测性。

#### ready() - 就绪检查
- **可选**：实现此方法进行就绪检查
- **应该**：返回 boolean 表示插件是否准备完成
- **用途**：等待外部资源加载完成

```typescript
ready(app: App): boolean {
    const resource = app.getResource<ExternalResource>();
    return resource !== undefined && resource.isLoaded();
}
```

**为什么**：某些插件可能依赖异步加载的资源，ready 提供了等待机制。

#### finish() - 完成阶段
- **可选**：在所有插件 ready 后执行
- **用途**：执行依赖其他插件的最终配置

```typescript
finish(app: App): void {
    // 所有插件都已加载，可以安全访问其他插件的资源
    const otherResource = app.getResource<OtherPluginResource>();
    if (otherResource) {
        this.configureFinalSetup(otherResource);
    }
}
```

**为什么**：finish 保证所有插件都已初始化，适合处理插件间依赖。

#### cleanup() - 清理阶段
- **可选**：应用关闭时执行
- **应该**：清理所有外部资源、连接、监听器

```typescript
cleanup(app: App): void {
    // 清理资源
    this.connections.forEach(conn => conn.Disconnect());
    this.timers.forEach(timer => timer.destroy());
}
```

**为什么**：防止资源泄露，确保优雅关闭。

### 插件唯一性规范

#### isUnique() 方法
- **默认**：返回 `true`（只能添加一次）
- **可以**：重写返回 `false` 允许多次添加

```typescript
class SingletonPlugin extends BasePlugin {
    isUnique(): boolean {
        return true; // 默认行为，只能添加一次
    }
}

class MultiInstancePlugin extends BasePlugin {
    isUnique(): boolean {
        return false; // 允许多次添加
    }
}
```

**为什么**：防止关键插件被意外重复添加，同时为特殊场景提供灵活性。

### Roblox 上下文规范

#### 环境过滤
- **可选**：设置 `robloxContext` 属性限制运行环境
- **值域**：`RobloxContext.Server`、`RobloxContext.Client`、`undefined`（两端都运行）

```typescript
import { RobloxContext } from "@white-dragon-bevy/bevy_app";

// 仅服务端插件
export class ServerPlugin extends BasePlugin {
    robloxContext = RobloxContext.Server;

    build(app: App): void {
        // 仅在服务端执行
    }
}

// 仅客户端插件
export class ClientPlugin extends BasePlugin {
    robloxContext = RobloxContext.Client;

    build(app: App): void {
        // 仅在客户端执行
    }
}

// 通用插件（默认）
export class UniversalPlugin extends BasePlugin {
    // 不设置 robloxContext，两端都运行
}
```

**为什么**：Roblox 的客户端/服务端架构需要明确的环境隔离。

## 扩展系统规范

White Dragon Bevy 使用 **getExtension() 方法模式**提供类型安全的插件扩展功能。

### 扩展系统概述

**核心理念**：
- 扩展对象通过 `getExtension()` 方法创建
- 作为资源存储在 App 的资源系统中
- 通过 `context.getExtension<T>()` 或 `app.getResource<T>()` 访问
- 使用 `TypeDescriptor` 进行类型标识

### 定义扩展接口

**必须**：
- 定义扩展接口，方法直接是实际函数签名
- **不使用** `ExtensionFactory<T>` 包装
- 接口命名使用 `PluginNameExtension` 格式

```typescript
/**
 * TimePlugin 扩展接口
 * 提供时间管理的扩展方法
 */
export interface TimePluginExtension {
    /**
     * 获取当前虚拟时间
     */
    getCurrent: () => Time<Virtual>;

    /**
     * 获取增量时间（秒）
     */
    getDeltaSeconds: () => number;

    /**
     * 暂停时间
     */
    pause: () => void;

    /**
     * 恢复时间
     */
    resume: () => void;
}
```

**为什么不用 ExtensionFactory**：
- 减少嵌套层级，代码更简洁
- 类型推导更直接
- 无需工厂函数转换

### 实现扩展

**必须**：
1. 插件实现 `Plugin<ExtensionType>` 泛型接口
2. 定义 `extensionDescriptor` 属性
3. 实现 `getExtension(app: App)` 方法

```typescript
import { Plugin, App } from "@white-dragon-bevy/bevy_app";
import { ___getTypeDescriptor } from "bevy_core";
import { TimePluginExtension } from "./extension";

export class TimePlugin implements Plugin<TimePluginExtension> {
    /**
     * 扩展类型描述符
     * 用于资源系统的类型识别
     */
    extensionDescriptor = ___getTypeDescriptor<TimePluginExtension>()!;

    private statsManager: TimeStatsManager;

    /**
     * 获取扩展对象
     * 在插件加载时由 App 调用一次
     * @param app - App 实例
     * @returns 扩展对象
     */
    getExtension(app: App): TimePluginExtension {
        return {
            getCurrent: () => this.statsManager.getCurrent(),
            getDeltaSeconds: () => this.statsManager.getDeltaSeconds(),
            pause: () => this.statsManager.pause(),
            resume: () => this.statsManager.resume(),
        };
    }

    build(app: App): void {
        // 初始化 statsManager
        this.statsManager = new TimeStatsManager();
        // 其他配置...
    }

    name(): string {
        return "TimePlugin";
    }
}
```

**关键要点**：
- `getExtension()` 返回的对象直接引用 `this` 成员
- 无需闭包捕获，代码更直观
- 可以访问 `app` 参数获取其他资源

### 使用扩展

**方式1：context 快捷方式（推荐）**

在系统函数中，使用 `context.getExtension<T>()`：

```typescript
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";
import { TimePluginExtension } from "@white-dragon-bevy/bevy_time";

function movementSystem(world: World, context: Context): void {
    // ✅ 使用 context 快捷方式
    const timeExt = context.getExtension<TimePluginExtension>();

    if (!timeExt) return;  // 防御性检查

    const deltaTime = timeExt.getDeltaSeconds();

    // 移动实体...
    for (const [id, pos, vel] of world.query(Position, Velocity)) {
        world.insert(id, Position({
            x: pos.x + vel.x * deltaTime,
            y: pos.y + vel.y * deltaTime
        }));
    }
}
```

**方式2：App 资源访问**

在非系统上下文（插件方法、测试等），使用 `app.getResource<T>()`：

```typescript
import { App } from "@white-dragon-bevy/bevy_app";
import { TimePluginExtension } from "@white-dragon-bevy/bevy_time";

// 在插件的 finish 方法中
class MyPlugin implements Plugin {
    finish(app: App): void {
        const timeExt = app.getResource<TimePluginExtension>();

        if (timeExt) {
            print(`Time initialized: ${timeExt.getCurrent()}`);
        }
    }
}

// 在测试中
describe("TimePlugin", () => {
    it("should provide extensions", () => {
        const app = App.create().addPlugin(new TimePlugin());
        const timeExt = app.getResource<TimePluginExtension>();

        expect(timeExt).to.be.ok();
        expect(timeExt?.getDeltaSeconds).to.be.ok();
    });
});
```

### 访问方式对比

| 方式 | 使用场景 | 优势 | 示例 |
|-----|---------|------|------|
| `context.getExtension<T>()` | 系统函数中 | 简洁、无需 app 参数 | `context.getExtension<TimeExt>()` |
| `app.getResource<T>()` | 插件方法、测试 | 明确、可在任何地方使用 | `app.getResource<TimeExt>()` |

### 扩展依赖其他扩展

在 `getExtension()` 中可以组合其他扩展：

```typescript
class DiagnosticsPlugin implements Plugin<DiagnosticsPluginExtension> {
    extensionDescriptor = ___getTypeDescriptor<DiagnosticsPluginExtension>()!;

    private store: DiagnosticsStore;

    getExtension(app: App): DiagnosticsPluginExtension {
        // 获取时间扩展
        const timeExt = app.getResource<TimePluginExtension>();

        return {
            addMeasurement: (path: string, value: number) => {
                // 添加时间戳
                const timestamp = timeExt?.getCurrent().getElapsed().asSecsF64() ?? 0;
                this.store.addMeasurement(path, value, timestamp);
            },

            getDiagnostic: (path: string) => {
                return this.store.get(path);
            }
        };
    }
}
```

### 扩展命名规范

**必须**：
- 接口名称：`PluginNameExtension`（不再用 `PluginNameExtensionFactories`）
- 方法名称：camelCase，动词开头
- 类型导出：在 `index.ts` 中导出扩展接口

```typescript
// ✅ 正确命名
export interface TimePluginExtension { }
export interface LogPluginExtension { }
export interface DiagnosticsPluginExtension { }

// ❌ 旧命名（不再使用）
export interface TimePluginExtensionFactories { }
export interface LogPluginExtensionFactories { }
```

**方法命名约定**：
```typescript
export interface PluginExtension {
    // Getters
    getManager: () => Manager;
    getConfig: () => Config;
    getCurrent: () => State;

    // Setters
    setConfig: (config: Config) => void;
    setTimeout: (timeout: number) => void;

    // Boolean checks
    isPaused: () => boolean;
    hasFeature: (name: string) => boolean;

    // Actions
    doWork: () => void;
    reset: () => void;
    update: (data: Data) => void;
}
```

### 类型安全要求

**必须**：
- 为所有扩展方法提供完整的类型签名
- 避免使用 `any` 类型
- 使用 TypeScript 严格模式

```typescript
// ✅ 正确：完整类型
export interface TimePluginExtension {
    getCurrent: () => Time<Virtual>;
    getDeltaSeconds: () => number;
    pause: () => void;
}

// ❌ 错误：缺少类型
export interface BadExtension {
    getData: () => any;  // 避免 any
    process: Function;   // 太宽泛
}
```

**为什么**：类型安全是框架的核心价值，防止运行时错误。

## 系统注册规范

### 调度阶段选择规范

选择合适的调度阶段注册系统：

| 调度阶段 | 用途 | 示例系统 |
|---------|-----|---------|
| `FIRST` | 帧开始的准备工作 | 时间更新、输入采集 |
| `PRE_STARTUP` | 启动前准备 | 配置加载、环境检测 |
| `STARTUP` | 初始化（仅执行一次） | 创建初始实体、加载资源 |
| `POST_STARTUP` | 启动后处理 | 验证初始化、发送就绪事件 |
| `PRE_UPDATE` | 更新前准备 | 事件清理、状态同步 |
| `UPDATE` | 主要游戏逻辑 | 移动、碰撞、AI |
| `POST_UPDATE` | 更新后处理 | 渲染准备、网络同步 |
| `LAST` | 帧结束清理 | 诊断统计、缓存清理 |

```typescript
build(app: App): void {
    // 初始化系统 - 只运行一次
    app.addSystems(BuiltinSchedules.STARTUP, initSystem);

    // 主逻辑系统 - 每帧运行
    app.addSystems(BuiltinSchedules.UPDATE, [
        inputSystem,
        movementSystem,
        collisionSystem
    ]);

    // 清理系统 - 帧末尾
    app.addSystems(BuiltinSchedules.LAST, cleanupSystem);
}
```

**为什么**：正确的调度阶段确保系统按预期顺序执行。

### 系统命名规范

- **必须**：使用描述性的 camelCase + System 后缀
- **应该**：名称反映系统的主要功能

```typescript
// ✅ 良好的命名
function playerMovementSystem(world: World, context: Context): void { }
function enemyAISystem(world: World, context: Context): void { }
function particleRenderSystem(world: World, context: Context): void { }

// ❌ 不好的命名
function system1(world: World, context: Context): void { } // 无意义
function update(world: World, context: Context): void { }  // 太通用
function doStuff(world: World, context: Context): void { } // 不描述功能
```

**为什么**：清晰的系统名称便于调试和维护。

### 系统配置规范

#### 系统参数
- **必须**：系统函数签名为 `(world: World, context: Context) => void`
- **可以**：通过闭包传递额外配置

```typescript
// 标准系统
function standardSystem(world: World, context: Context): void {
    // 系统逻辑
}

// 配置化系统（通过闭包）
function createConfigurableSystem(config: SystemConfig) {
    return (world: World, context: Context): void => {
        // 使用 config
    };
}

// 注册
app.addSystems(
    BuiltinSchedules.UPDATE,
    createConfigurableSystem({ speed: 10 })
);
```

**为什么**：闭包模式允许系统配置，同时保持标准签名。

### 依赖顺序规范

#### 系统执行顺序
- **重要**：同一调度阶段的系统按添加顺序执行
- **可以**：使用数组批量添加保证顺序

```typescript
// 顺序执行：input → movement → collision
app.addSystems(BuiltinSchedules.UPDATE, [
    inputSystem,       // 1. 首先处理输入
    movementSystem,    // 2. 然后移动实体
    collisionSystem    // 3. 最后检测碰撞
]);

// 分别添加也保持顺序
app.addSystems(BuiltinSchedules.UPDATE, inputSystem);
app.addSystems(BuiltinSchedules.UPDATE, movementSystem);
app.addSystems(BuiltinSchedules.UPDATE, collisionSystem);
```

**为什么**：明确的执行顺序避免了系统间的竞态条件。

## 资源管理规范

### 资源定义规范

- **必须**：为每个资源类定义静态 `TYPE_ID`
- **应该**：资源类名使用 PascalCase
- **可以**：实现序列化/反序列化方法

```typescript
import { TypeDescriptor } from "@white-dragon-bevy/bevy_core";

/**
 * 游戏配置资源
 */
export class GameConfig {
    // 必须：类型标识符
    static readonly TYPE_ID = new TypeDescriptor("GameConfig");

    constructor(
        public readonly maxPlayers: number,
        public readonly mapSize: Vector3,
        public difficulty: number
    ) {}

    // 可选：序列化支持
    serialize(): string {
        return HttpService.JSONEncode({
            maxPlayers: this.maxPlayers,
            mapSize: [this.mapSize.X, this.mapSize.Y, this.mapSize.Z],
            difficulty: this.difficulty
        });
    }

    static deserialize(json: string): GameConfig {
        const data = HttpService.JSONDecode(json) as any;
        return new GameConfig(
            data.maxPlayers,
            new Vector3(...data.mapSize),
            data.difficulty
        );
    }
}
```

**为什么**：TYPE_ID 用于资源的类型安全访问和调试。

### 资源注册规范

- **时机**：在插件的 `build()` 方法中注册
- **方式**：使用 `app.insertResource()`
- **更新**：资源是可变的，直接修改或重新插入

```typescript
build(app: App): void {
    // 初始注册
    const config = new GameConfig(4, new Vector3(100, 50, 100), 1);
    app.insertResource(config);

    // 系统中更新资源
    app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
        const config = app.getResource<GameConfig>();
        if (config && someCondition) {
            config.difficulty = 2; // 直接修改

            // 或重新插入新实例
            app.insertResource(new GameConfig(
                config.maxPlayers,
                config.mapSize,
                2
            ));
        }
    });
}
```

**为什么**：资源提供了全局状态管理，避免了参数传递的复杂性。

### 资源访问规范

- **必须**：检查资源是否存在
- **应该**：通过插件扩展提供类型安全的访问
- **禁止**：假设资源一定存在

```typescript
// ✅ 正确：检查资源存在性
function systemWithResource(world: World, context: Context): void {
    const config = app.getResource<GameConfig>();
    if (config) {
        // 使用资源
        print(`Max players: ${config.maxPlayers}`);
    }
}

// ✅ 更好：通过扩展提供安全访问
export interface ConfigPluginExtension {
    getMaxPlayers: () => number;
}

export class ConfigPlugin extends BasePlugin implements Plugin<ConfigPluginExtension> {
    extensionDescriptor = ___getTypeDescriptor<ConfigPluginExtension>()!;
    private config: GameConfig;

    constructor() {
        super();
        this.config = new GameConfig(4, Vector3.zero, 1);
    }

    getExtension(app: App): ConfigPluginExtension {
        return {
            getMaxPlayers: () => this.config.maxPlayers
        };
    }

    build(app: App): void {
        app.insertResource(this.config);
    }
}

// ❌ 错误：假设资源存在
function badSystem(world: World, context: Context): void {
    const config = app.getResource<GameConfig>()!; // 危险！
    print(config.maxPlayers); // 可能崩溃
}
```

**为什么**：防御性编程避免运行时错误。

### TypeDescriptor 使用规范

- **用途**：提供运行时类型信息
- **必须**：每个资源类型使用唯一的描述符
- **可以**：用于类型注册和反射

```typescript
// 定义类型描述符
class PlayerData {
    static readonly TYPE_ID = new TypeDescriptor("PlayerData");
}

class EnemyData {
    static readonly TYPE_ID = new TypeDescriptor("EnemyData");
}

// 类型注册表（高级用法）
class TypeRegistry {
    private types = new Map<string, TypeDescriptor>();

    register<T>(type: { TYPE_ID: TypeDescriptor }): void {
        this.types.set(type.TYPE_ID.name, type.TYPE_ID);
    }

    get(name: string): TypeDescriptor | undefined {
        return this.types.get(name);
    }
}
```

**为什么**：TypeDescriptor 支持高级特性如序列化和类型检查。

## 插件依赖规范

### 依赖声明方式

#### 直接依赖
- **方式**：在 `build()` 中添加依赖插件
- **顺序**：依赖插件会先于当前插件初始化

```typescript
export class GamePlugin extends BasePlugin {
    build(app: App): void {
        // 声明依赖
        app.addPlugin(new TimePlugin());
        app.addPlugin(new InputPlugin());

        // 现在可以安全使用依赖插件的功能
        app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
            const timeExt = context.getExtension<TimePluginExtension>();
            if (timeExt) {
                const deltaTime = timeExt.getDeltaSeconds();
            }
        });
    }
}
```

**为什么**：显式依赖声明确保初始化顺序正确。

#### 可选依赖
- **方式**：检查资源或扩展是否存在
- **用途**：提供增强功能但不强制依赖

```typescript
export class EnhancedPlugin extends BasePlugin {
    build(app: App): void {
        // 可选依赖检查
        app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
            // 尝试使用可选的诊断功能
            const diagExt = context.getExtension<DiagnosticsPluginExtension>();
            if (diagExt) {
                diagExt.updateDiagnostic("my_metric", 42);
            }
            // DiagnosticsPlugin 未安装时 diagExt 为 undefined，安全跳过
        });
    }

    finish(app: App): void {
        // 在 finish 中检查可选依赖
        const timeResource = app.getResource<TimeResource>();
        if (timeResource) {
            // 使用时间功能
            this.setupTimeBasedFeatures(timeResource);
        }
    }
}
```

**为什么**：可选依赖提供了灵活性，允许插件在不同配置下工作。

### 插件添加顺序影响

**重要事实**：
1. 插件的 `build()` 方法按添加顺序执行
2. 同一调度阶段的系统按注册顺序执行
3. 依赖插件应该先添加

```typescript
// 顺序很重要的例子
const app = App.create();

// 1. 基础插件先添加
app.addPlugin(new TimePlugin());      // 提供时间功能
app.addPlugin(new InputPlugin());     // 提供输入功能

// 2. 依赖基础插件的插件
app.addPlugin(new PlayerPlugin());    // 使用时间和输入
app.addPlugin(new GamePlugin());      // 使用所有上述功能

// 错误示例：顺序错误
const badApp = App.create();
badApp.addPlugin(new GamePlugin());   // ❌ 依赖还未加载
badApp.addPlugin(new TimePlugin());   // 太晚了
```

**为什么**：正确的加载顺序避免了初始化时的依赖问题。

### 插件重复添加处理

#### 唯一插件（默认）
- **行为**：`isUnique()` 返回 `true`
- **结果**：重复添加抛出 `DuplicatePluginError`

```typescript
class SingletonPlugin extends BasePlugin {
    isUnique(): boolean {
        return true; // 默认值
    }
}

const app = App.create();
app.addPlugin(new SingletonPlugin()); // ✅ 成功
app.addPlugin(new SingletonPlugin()); // ❌ 抛出 DuplicatePluginError
```

#### 可重复插件
- **行为**：`isUnique()` 返回 `false`
- **用途**：允许多个实例（如多个输入设备）

```typescript
class MultiDevicePlugin extends BasePlugin {
    constructor(private deviceId: string) {
        super();
    }

    isUnique(): boolean {
        return false; // 允许多个实例
    }

    name(): string {
        return `MultiDevicePlugin_${this.deviceId}`;
    }
}

const app = App.create();
app.addPlugin(new MultiDevicePlugin("keyboard")); // ✅
app.addPlugin(new MultiDevicePlugin("gamepad"));  // ✅
```

**为什么**：唯一性控制防止了意外的重复配置。

### 循环依赖避免

**禁止**：插件间的循环依赖

```typescript
// ❌ 错误：循环依赖
class PluginA extends BasePlugin {
    build(app: App): void {
        app.addPlugin(new PluginB()); // A 依赖 B
    }
}

class PluginB extends BasePlugin {
    build(app: App): void {
        app.addPlugin(new PluginA()); // B 依赖 A - 循环！
    }
}
```

**解决方案**：
1. 提取公共功能到第三个插件
2. 使用事件系统解耦
3. 在 `finish()` 阶段处理交叉引用

```typescript
// ✅ 正确：提取公共依赖
class CommonPlugin extends BasePlugin {
    // 公共功能
}

class PluginA extends BasePlugin {
    build(app: App): void {
        app.addPlugin(new CommonPlugin());
        // A 的功能
    }
}

class PluginB extends BasePlugin {
    build(app: App): void {
        app.addPlugin(new CommonPlugin());
        // B 的功能
    }
}
```

**为什么**：循环依赖会导致栈溢出和初始化死锁。

## 错误处理规范

### 系统级错误自动处理说明

**重要**：ECS 系统运行时的错误会被框架自动捕捉，不会导致应用崩溃。

```typescript
function riskySystem(world: World, context: Context): void {
    // 即使出错也不会崩溃整个应用
    const value = someRiskyOperation();
    if (!value) {
        error("Operation failed"); // 错误被捕捉并记录
    }
}

// 框架内部的错误处理（简化示例）
try {
    system(world, context);
} catch (e) {
    warn(`System error: ${e}`);
    // 继续执行下一个系统
}
```

**为什么**：错误隔离确保单个系统的问题不会影响整体稳定性。

### build() 方法错误处理

插件的 `build()` 方法中的错误需要谨慎处理：

```typescript
export class SafePlugin extends BasePlugin {
    build(app: App): void {
        // ✅ 验证前置条件
        const requiredResource = app.getResource<RequiredResource>();
        if (!requiredResource) {
            error("SafePlugin requires RequiredResource to be present");
        }

        // ✅ 使用 try-catch 处理可能的错误
        try {
            this.loadConfiguration();
        } catch (e) {
            warn(`Failed to load configuration: ${e}`);
            // 使用默认配置继续
            this.useDefaultConfiguration();
        }

        // ❌ 避免静默失败
        // if (!this.initialize()) {
        //     return; // 不好：静默失败
        // }
    }

    private loadConfiguration(): void {
        // 可能抛出错误的操作
    }
}
```

**为什么**：build 阶段的错误会阻止插件初始化，需要明确处理。

### 日志使用规范

使用适当级别的日志：

```typescript
// 日志级别指南
print("Normal information");        // 一般信息
warn("Warning: non-critical issue"); // 警告
error("Error: critical problem");    // 错误（会抛出）

export class LoggingPlugin extends BasePlugin {
    build(app: App): void {
        // 开发阶段日志
        if (this.debugMode) {
            print(`[${this.name()}] Initializing with config:`, this.config);
        }

        // 重要事件
        print(`[${this.name()}] Plugin loaded successfully`);

        // 警告
        if (this.deprecatedFeatureUsed) {
            warn(`[${this.name()}] Using deprecated feature X, please migrate to Y`);
        }

        // 错误
        if (!this.criticalResource) {
            error(`[${this.name()}] Critical resource missing`);
        }
    }
}
```

**为什么**：适当的日志级别帮助调试和监控。

### 防抖打印使用

在系统中避免每帧打印，使用防抖功能：

```typescript
import { hookDebugPrint } from "@white-dragon-bevy/utils/hooks";

function debugSystem(world: World, context: Context): void {
    // ✅ 使用防抖打印
    hookDebugPrint(`Entities: ${world.size()}`); // 自动限制频率

    // ❌ 避免直接打印
    // print(`Entities: ${world.size()}`); // 每帧都会输出

    // 条件打印（手动防抖）
    if (context.frameCount % 60 === 0) { // 每60帧打印一次
        print(`FPS: ${60 / context.deltaTime}`);
    }
}
```

**为什么**：防抖避免日志刷屏，提高调试效率。

## 测试规范

### 单元测试结构

使用 `@rbxts/testez` 编写测试：

```typescript
// my-plugin.spec.ts
import { App } from "@white-dragon-bevy/bevy_app";
import { MyPlugin } from "./my-plugin";

export = () => {
    describe("MyPlugin", () => {
        let app: App;

        beforeEach(() => {
            // 每个测试前创建新应用
            app = App.create();
        });

        afterEach(() => {
            // 清理
            app.cleanup();
        });

        it("should register successfully", () => {
            expect(() => {
                app.addPlugin(new MyPlugin());
            }).never.to.throw();
        });

        it("should add required systems", () => {
            app.addPlugin(new MyPlugin());

            const systems = app.getSystemsInSchedule(BuiltinSchedules.UPDATE);
            expect(systems.size()).to.be.greaterThan(0);
        });

        it("should provide extensions", () => {
            app.addPlugin(new MyPlugin());
            const myExt = app.getResource<MyPluginExtension>();

            expect(myExt).to.be.ok();
            expect(myExt?.myExtensionMethod).to.be.ok();
            expect(myExt?.myExtensionMethod()).to.equal("expected value");
        });
    });
};
```

**注意**：必须使用 `export =` 导出测试套件。

**为什么**：标准化的测试结构确保测试的可维护性。

### 测试文件组织

```
src/
└── my-plugin/
    ├── __tests__/
    │   ├── plugin.spec.ts       # 插件主测试
    │   ├── systems.spec.ts      # 系统测试
    │   └── integration.spec.ts  # 集成测试
    └── plugin.ts
```

### 必须测试的内容

1. **插件注册**：确保插件能成功添加
2. **系统注册**：验证系统被正确注册到调度
3. **资源创建**：检查资源是否正确初始化
4. **扩展功能**：测试所有公开的扩展方法
5. **错误处理**：验证错误情况的处理
6. **环境兼容**：测试客户端/服务端行为

```typescript
describe("comprehensive plugin test", () => {
    it("should handle all lifecycle methods", () => {
        const plugin = new MyPlugin();
        const app = App.create();

        // 测试 build
        expect(() => plugin.build(app)).never.to.throw();

        // 测试 ready
        expect(plugin.ready(app)).to.equal(true);

        // 测试 finish
        if (plugin.finish) {
            expect(() => plugin.finish(app)).never.to.throw();
        }

        // 测试 cleanup
        if (plugin.cleanup) {
            expect(() => plugin.cleanup(app)).never.to.throw();
        }
    });
});
```

**为什么**：全面的测试覆盖确保插件的可靠性。

## 代码示例

### 最小插件示例

```typescript
import { BasePlugin, App } from "@white-dragon-bevy/bevy_app";

/**
 * 最小可行插件
 */
export class MinimalPlugin extends BasePlugin {
    build(app: App): void {
        // 最少需要的配置
        print(`${this.name()} initialized`);
    }

    name(): string {
        return "MinimalPlugin";
    }
}
```

### 数据管理插件示例

```typescript
import { Plugin, App } from "@white-dragon-bevy/bevy_app";
import { ___getTypeDescriptor } from "bevy_core";

/**
 * 数据插件扩展接口
 */
export interface DataPluginExtension {
    get: (key: string) => unknown | undefined;
    set: (key: string, value: unknown) => void;
    has: (key: string) => boolean;
    clear: () => void;
}

/**
 * 数据管理插件
 */
export class DataPlugin implements Plugin<DataPluginExtension> {
    extensionDescriptor = ___getTypeDescriptor<DataPluginExtension>()!;

    private data: Map<string, unknown> = new Map();

    getExtension(app: App): DataPluginExtension {
        return {
            get: (key) => this.data.get(key),
            set: (key, value) => this.data.set(key, value),
            has: (key) => this.data.has(key),
            clear: () => this.data.clear(),
        };
    }

    build(app: App): void {
        print(`${this.name()} initialized`);
    }

    name(): string {
        return "DataPlugin";
    }

    isUnique(): boolean {
        return true;
    }
}

// 使用示例
function dataSystem(world: World, context: Context): void {
    const dataExt = context.getExtension<DataPluginExtension>();

    if (dataExt) {
        dataExt.set("player_score", 100);
        const score = dataExt.get("player_score");
        print(`Score: ${score}`);
    }
}
```

### 状态管理插件示例

```typescript
import { Plugin, App } from "@white-dragon-bevy/bevy_app";
import { ___getTypeDescriptor } from "bevy_core";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_app";

/**
 * 状态管理插件扩展接口
 */
export interface StatePluginExtension {
    getState: () => string;
    setState: (newState: string) => void;
    isInState: (state: string) => boolean;
    transitionTo: (state: string) => boolean;
}

/**
 * 状态管理插件
 */
export class StatePlugin implements Plugin<StatePluginExtension> {
    extensionDescriptor = ___getTypeDescriptor<StatePluginExtension>()!;

    private currentState: string = "idle";
    private validTransitions: Map<string, Set<string>> = new Map();

    constructor() {
        // 定义状态转换规则
        this.validTransitions.set("idle", new Set(["running", "jumping"]));
        this.validTransitions.set("running", new Set(["idle", "jumping"]));
        this.validTransitions.set("jumping", new Set(["idle", "running"]));
    }

    getExtension(app: App): StatePluginExtension {
        return {
            getState: () => this.currentState,

            setState: (newState: string) => {
                this.currentState = newState;
            },

            isInState: (state: string) => this.currentState === state,

            transitionTo: (newState: string) => {
                const currentTransitions = this.validTransitions.get(this.currentState);
                if (currentTransitions && currentTransitions.has(newState)) {
                    this.currentState = newState;
                    return true;
                }
                return false;
            }
        };
    }

    build(app: App): void {
        // 添加状态管理系统
        app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
            // 状态更新逻辑
        });
    }

    name(): string {
        return "StatePlugin";
    }

    isUnique(): boolean {
        return true;
    }
}

// 使用示例
function gameSystem(world: World, context: Context): void {
    const stateExt = context.getExtension<StatePluginExtension>();

    if (stateExt && stateExt.isInState("idle")) {
        // 检测跳跃输入
        if (/* jump input */) {
            stateExt.transitionTo("jumping");
        }
    }
}
```

### 完整插件示例

```typescript
import { BasePlugin, App, Plugin, BuiltinSchedules } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";
import { TypeDescriptor, ___getTypeDescriptor } from "@white-dragon-bevy/bevy_core";
import { RobloxContext } from "@white-dragon-bevy/bevy_app";
import { RunService, Players } from "@rbxts/services";
import { hookDebugPrint } from "@white-dragon-bevy/utils/hooks";

// ============ 组件定义 ============
interface Player {
    player: Player;
    joinTime: number;
}

interface Score {
    value: number;
    multiplier: number;
}

// ============ 资源定义 ============
class ScoreboardResource {
    static readonly TYPE_ID = new TypeDescriptor("ScoreboardResource");

    private scores: Map<string, number> = new Map();

    addScore(playerId: string, points: number): void {
        const current = this.scores.get(playerId) || 0;
        this.scores.set(playerId, current + points);
    }

    getScore(playerId: string): number {
        return this.scores.get(playerId) || 0;
    }

    getTopScores(limit: number): Array<[string, number]> {
        const sorted = [...this.scores.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit);
        return sorted;
    }

    reset(): void {
        this.scores.clear();
    }
}

// ============ 扩展接口 ============
export interface ScorePluginExtension {
    addPlayerScore: (player: Player, points: number) => void;
    getPlayerScore: (player: Player) => number;
    getLeaderboard: (limit?: number) => Array<[string, number]>;
    resetScores: () => void;
    getScoreMultiplier: () => number;
    setScoreMultiplier: (multiplier: number) => void;
}

// ============ 插件配置 ============
export interface ScorePluginConfig {
    initialMultiplier?: number;
    maxMultiplier?: number;
    leaderboardSize?: number;
    autoSave?: boolean;
    saveInterval?: number;
}

// ============ 主插件类 ============
/**
 * 分数管理插件
 * 提供玩家分数追踪、排行榜和倍数系统
 */
export class ScorePlugin extends BasePlugin implements Plugin<ScorePluginExtension> {
    extensionDescriptor = ___getTypeDescriptor<ScorePluginExtension>()!;
    robloxContext = RobloxContext.Server; // 仅服务端运行

    private config: Required<ScorePluginConfig>;
    private scoreboard: ScoreboardResource;
    private currentMultiplier: number;
    private lastSaveTime: number = 0;

    constructor(config: ScorePluginConfig = {}) {
        super();

        // 合并默认配置
        this.config = {
            initialMultiplier: config.initialMultiplier ?? 1,
            maxMultiplier: config.maxMultiplier ?? 10,
            leaderboardSize: config.leaderboardSize ?? 10,
            autoSave: config.autoSave ?? true,
            saveInterval: config.saveInterval ?? 60
        };

        this.currentMultiplier = this.config.initialMultiplier;
        this.scoreboard = new ScoreboardResource();
    }

    build(app: App): void {
        // 插入资源
        app.insertResource(this.scoreboard);

        // 注册系统
        this.registerSystems(app);

        // 设置事件监听
        this.setupEventListeners(app);

        print(`[${this.name()}] Plugin initialized with config:`, this.config);
    }

    getExtension(app: App): ScorePluginExtension {
        return {
            addPlayerScore: (player: Player, points: number) => {
                const actualPoints = points * this.currentMultiplier;
                this.scoreboard.addScore(player.UserId, actualPoints);
                hookDebugPrint(`Added ${actualPoints} points to ${player.Name}`);
            },

            getPlayerScore: (player: Player) => {
                return this.scoreboard.getScore(player.UserId);
            },

            getLeaderboard: (limit?: number) => {
                return this.scoreboard.getTopScores(limit ?? this.config.leaderboardSize);
            },

            resetScores: () => {
                this.scoreboard.reset();
                this.currentMultiplier = this.config.initialMultiplier;
                print(`[${this.name()}] Scores reset`);
            },

            getScoreMultiplier: () => this.currentMultiplier,

            setScoreMultiplier: (multiplier: number) => {
                this.currentMultiplier = math.clamp(
                    multiplier,
                    1,
                    this.config.maxMultiplier
                );
            }
        };
    }

    private registerSystems(app: App): void {
        // 初始化系统
        app.addSystems(BuiltinSchedules.STARTUP, (world, context) => {
            this.initializeScoreboard(world);
        });

        // 分数更新系统
        app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
            this.updateScoresSystem(world, context);
        });

        // 自动保存系统
        if (this.config.autoSave) {
            app.addSystems(BuiltinSchedules.LAST, (world, context) => {
                this.autoSaveSystem(world, context);
            });
        }
    }

    private setupEventListeners(app: App): void {
        // 玩家加入事件
        app.addSystems(BuiltinSchedules.PRE_UPDATE, (world, context) => {
            for (const player of world.useEvent(Players, "PlayerAdded")) {
                world.spawn(
                    { player: player, joinTime: os.clock() } as Player,
                    { value: 0, multiplier: 1 } as Score
                );
                print(`[${this.name()}] Player ${player.Name} joined`);
            }
        });

        // 玩家离开事件
        app.addSystems(BuiltinSchedules.PRE_UPDATE, (world, context) => {
            for (const player of world.useEvent(Players, "PlayerRemoving")) {
                // 保存玩家分数
                this.savePlayerScore(player);

                // 移除实体
                for (const [id, playerComp] of world.query(Player)) {
                    if (playerComp.player === player) {
                        world.despawn(id);
                        break;
                    }
                }
            }
        });
    }

    private initializeScoreboard(world: World): void {
        // 从数据存储加载分数
        // 这里是示例，实际需要实现数据持久化
        print(`[${this.name()}] Scoreboard initialized`);
    }

    private updateScoresSystem(world: World, context: Context): void {
        // 更新玩家分数组件
        for (const [id, player, score] of world.query(Player, Score)) {
            const currentScore = this.scoreboard.getScore(player.player.UserId);
            if (score.value !== currentScore) {
                world.insert(id, {
                    value: currentScore,
                    multiplier: this.currentMultiplier
                } as Score);
            }
        }
    }

    private autoSaveSystem(world: World, context: Context): void {
        const now = os.clock();
        if (now - this.lastSaveTime >= this.config.saveInterval) {
            this.saveAllScores();
            this.lastSaveTime = now;
            hookDebugPrint(`[${this.name()}] Auto-saved scores`);
        }
    }

    private savePlayerScore(player: Player): void {
        const score = this.scoreboard.getScore(player.UserId);
        // 实现数据持久化逻辑
        print(`[${this.name()}] Saved score for ${player.Name}: ${score}`);
    }

    private saveAllScores(): void {
        // 批量保存所有分数
        // 实现数据持久化逻辑
    }

    ready(app: App): boolean {
        // 检查数据存储服务是否就绪
        return true;
    }

    finish(app: App): void {
        // 完成初始化后的设置
        print(`[${this.name()}] Plugin setup complete`);
    }

    cleanup(app: App): void {
        // 清理资源
        this.saveAllScores();
        print(`[${this.name()}] Plugin cleaned up`);
    }

    name(): string {
        return "ScorePlugin";
    }

    isUnique(): boolean {
        return true; // 只允许一个实例
    }
}

// ============ 使用示例 ============
/*
const app = App.create()
    .addPlugin(new ScorePlugin({
        initialMultiplier: 1,
        maxMultiplier: 5,
        autoSave: true
    }));

// 在系统中使用 - context 快捷方式（推荐）
function gameplaySystem(world: World, context: Context): void {
    const scoreExt = context.getExtension<ScorePluginExtension>();

    if (scoreExt) {
        // 添加分数
        for (const player of Players.GetPlayers()) {
            scoreExt.addPlayerScore(player, 10);
        }

        // 获取排行榜
        const leaderboard = scoreExt.getLeaderboard(5);
        for (const [playerId, score] of leaderboard) {
            print(`Player ${playerId}: ${score} points`);
        }
    }
}

// 或在非系统上下文使用 - app 资源访问
const scoreExt = app.getResource<ScorePluginExtension>();
if (scoreExt) {
    scoreExt.setScoreMultiplier(2.0);
    print(`Current multiplier: ${scoreExt.getScoreMultiplier()}`);
}
*/
```

## 检查清单

### 插件发布前必须检查的项目

#### 代码质量
- [ ] 所有公共 API 都有 JSDoc 注释
- [ ] 使用正确的导入路径（@white-dragon-bevy/*）
- [ ] 文件以换行符结束
- [ ] 使用 Tab 缩进
- [ ] 无 ESLint 错误
- [ ] 无 TypeScript 编译错误

#### 插件结构
- [ ] 继承自 `BasePlugin`
- [ ] 实现 `build()` 和 `name()` 方法
- [ ] 正确设置 `robloxContext`（如需要）
- [ ] `isUnique()` 返回正确的值
- [ ] 生命周期方法不包含 yield 操作

#### 扩展系统
- [ ] 实现 `Plugin<ExtensionType>` 接口
- [ ] 定义了 `extensionDescriptor` 属性
- [ ] 实现了 `getExtension(app: App)` 方法
- [ ] 扩展接口直接声明方法签名（不使用工厂）
- [ ] 扩展方法有完整的类型签名
- [ ] 扩展命名遵循约定（get*、set*、is* 等）

#### 系统注册
- [ ] 系统注册到正确的调度阶段
- [ ] 系统函数签名正确 `(world: World, context: Context) => void`
- [ ] 系统命名使用 camelCase + System 后缀
- [ ] 考虑了系统执行顺序

#### 资源管理
- [ ] 资源类定义了 `TYPE_ID`
- [ ] 资源访问进行了存在性检查
- [ ] 通过扩展提供了类型安全的访问

#### 错误处理
- [ ] `build()` 方法中的错误被适当处理
- [ ] 使用了正确级别的日志
- [ ] 系统中使用防抖打印
- [ ] 没有假设资源一定存在

#### 测试
- [ ] 有单元测试覆盖
- [ ] 测试了插件注册
- [ ] 测试了系统注册
- [ ] 测试了扩展功能
- [ ] 测试了错误情况

#### 文档
- [ ] README 文件完整
- [ ] 有使用示例
- [ ] 列出了依赖项
- [ ] 说明了配置选项

### 代码审查要点

#### 性能
- [ ] 避免在热路径上进行复杂计算
- [ ] 合理使用查询缓存
- [ ] 没有不必要的组件复制
- [ ] 批量处理相似操作

#### 安全性
- [ ] 输入验证充分
- [ ] 没有硬编码的凭据
- [ ] 客户端/服务端逻辑正确分离
- [ ] 防止了潜在的拒绝服务攻击

#### 可维护性
- [ ] 代码结构清晰
- [ ] 职责单一
- [ ] 依赖关系明确
- [ ] 易于扩展和修改

#### 兼容性
- [ ] 与其他常用插件兼容
- [ ] 支持热重载（如适用）
- [ ] 版本要求明确
- [ ] 降级策略合理

## 总结

本规范文档定义了 White Dragon Bevy 插件开发的标准和最佳实践。遵循这些规范可以：

1. **提高代码质量**：通过统一的标准减少错误
2. **增强可维护性**：清晰的结构和命名便于理解
3. **确保类型安全**：充分利用 TypeScript 的类型系统
4. **优化性能**：遵循最佳实践避免性能陷阱
5. **促进协作**：统一的规范便于团队合作

记住核心原则：
- **类型安全优先**：充分利用 TypeScript 和泛型扩展
- **明确胜于隐含**：清晰的命名和结构
- **防御性编程**：总是检查和验证
- **模块化设计**：高内聚低耦合
- **文档完善**：代码即文档，文档即规范

遵循本规范，你将能够开发出高质量、可维护、类型安全的 White Dragon Bevy 插件。