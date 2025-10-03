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

White Dragon Bevy 提供两种扩展机制：**标准扩展**（ExtensionFactory 模式）和**泛型扩展**（直接对象模式）。

### 标准扩展规范（ExtensionFactory 模式）

**适用场景**：简单的工具函数、状态查询、无需泛型参数的插件。

#### 定义扩展工厂接口

**必须**：
- 定义扩展接口，所有方法使用 `ExtensionFactory<T>` 类型
- 工厂函数签名为 `(world: World, context: Context, plugin: PluginType) => 实际函数`

```typescript
import { ExtensionFactory } from "@white-dragon-bevy/bevy_app";
import type { World } from "@rbxts/matter";
import type { Context } from "@white-dragon-bevy/bevy_app";

/**
 * LogPlugin 扩展工厂接口
 * 标准扩展：所有方法都是 ExtensionFactory 类型
 */
export interface LogPluginExtensionFactories {
    /**
     * 获取日志管理器工厂
     */
    getLogManager: ExtensionFactory<() => LogSubscriber | undefined>;

    /**
     * 获取当前日志级别工厂
     */
    getLogLevel: ExtensionFactory<() => Level>;
}
```

**为什么**：`ExtensionFactory` 是一个工厂函数，接收 `(world, context, plugin)` 参数，返回实际的扩展函数。

#### 实现标准扩展

**必须**：
- 在插件 `constructor` 中初始化 `extension` 属性
- 每个工厂函数返回实际的扩展函数
- 使用 `plugin` 参数访问插件状态（避免 `this` 指针问题）

```typescript
export class LogPlugin extends BasePlugin {
    /** 日志级别配置 */
    level: Level;

    /** 插件扩展工厂 */
    extension: LogPluginExtensionFactories;

    constructor(config?: Partial<LogPlugin>) {
        super();
        this.level = config?.level ?? Level.INFO;

        // ✅ 在 constructor 中初始化扩展工厂
        this.extension = {
            // 工厂函数接收 (world, context, plugin) 参数
            getLogManager: (world: World, context: Context, plugin: LogPlugin) => {
                // 返回实际的扩展函数
                return () => LogSubscriber.getGlobal();
            },

            getLogLevel: (world: World, context: Context, plugin: LogPlugin) => {
                // 使用 plugin 参数获取插件状态，避免 this 指针问题
                const currentLevel = plugin.level;
                // 返回获取日志级别的函数
                return () => currentLevel;
            },
        };
    }

    build(app: App): void {
        // 在 build 中配置插件
        const subscriber = new LogSubscriber();
        app.insertResource(subscriber);
    }

    name(): string {
        return "LogPlugin";
    }
}
```

**为什么**：
1. 在 constructor 初始化扩展，确保扩展在 build 前可用
2. 使用 `plugin` 参数而非 `this`，避免 roblox-ts 的 this 指针转换问题
3. App 会自动调用工厂函数，将返回的实际函数注入到 context

#### 使用标准扩展

标准扩展会被 App 自动处理并注入到 context，使用时需要类型断言：

```typescript
import { Context } from "@white-dragon-bevy/bevy_ecs";
import { World } from "@rbxts/matter";

function mySystem(world: World, context: Context): void {
    // 方式1：直接类型断言
    const ctx = context as Context & {
        getLogManager: () => LogSubscriber | undefined;
        getLogLevel: () => Level;
    };

    const manager = ctx.getLogManager(); // ✅ 自动完成
    const level = ctx.getLogLevel();     // ✅ 类型安全

    // 方式2：使用 getContextWithExtensions 辅助函数
    import { getContextWithExtensions } from "@white-dragon-bevy/bevy_app";
    const typedCtx = getContextWithExtensions<LogPlugin>(app);
    const logLevel = typedCtx.getLogLevel(); // ✅ 完整类型提示
}
```

**为什么**：App 会自动调用扩展工厂，将返回的函数注入到 context 上，使用时需要类型断言。

### 泛型扩展规范（直接对象模式）

**适用场景**：需要泛型参数的插件（如 `InputManagerPlugin<A>`）、复杂的组件系统。

**关键区别**：泛型扩展**不使用** `ExtensionFactory` 类型，extension 属性直接是扩展对象。

#### 定义泛型扩展接口

**必须**：
- 定义扩展接口，方法直接是实际函数签名
- **不使用** `ExtensionFactory<T>` 包装

```typescript
/**
 * 输入管理器扩展接口 - 泛型扩展
 * 注意：不使用 ExtensionFactory 包装
 */
export interface InputManagerExtension<A extends Actionlike> {
    /**
     * 获取组件定义 - 直接的方法签名
     */
    getComponents(): ComponentDefinition<A>;

    /**
     * 创建带有输入组件的实体
     */
    spawnWithInput(
        world: BevyWorld,
        inputMap: InputMap<A>,
        actionState?: ActionState<A>
    ): number;

    /**
     * 获取实体的输入数据
     */
    getEntityInputData(
        world: BevyWorld,
        entityId: number
    ): EntityInputData<A> | undefined;

    /**
     * 查询所有具有输入组件的实体
     */
    queryInputEntities(world: BevyWorld): IterableIterator<[number, EntityInputData<A>]>;
}
```

**为什么**：泛型扩展不通过工厂转换，extension 属性直接存储实际的扩展对象。

#### 实现泛型扩展

**必须**：
- 在 `constructor` 中创建扩展对象（不是工厂函数）
- extension 属性类型是扩展接口类型（不是 ExtensionFactory）

```typescript
/**
 * 创建扩展对象的辅助函数
 */
function createExtensionObject<A extends Actionlike>(
    components: ComponentDefinition<A>
): InputManagerExtension<A> {
    // ✅ 直接返回扩展对象，不是工厂函数
    return {
        getComponents() {
            return components;
        },

        spawnWithInput(world: BevyWorld, inputMap: InputMap<A>, actionState?: ActionState<A>) {
            return components.spawn(world, inputMap, actionState);
        },

        getEntityInputData(world: BevyWorld, entityId: number) {
            return components.get(world, entityId);
        },

        queryInputEntities(world: BevyWorld) {
            return components.query(world);
        },
    };
}

/**
 * 输入管理器插件 - 泛型扩展示例
 */
export class InputManagerPlugin<A extends Actionlike> implements Plugin {
    private components: ComponentDefinition<A>;

    /**
     * 扩展对象 - 注意：不是 ExtensionFactory 类型
     */
    readonly extension: InputManagerExtension<A>;

    constructor(config: InputManagerPluginConfig<A>) {
        this.components = createActionComponents<A>(config.actionTypeName);

        // ✅ 在 constructor 中创建扩展对象
        this.extension = createExtensionObject<A>(this.components);
    }

    build(app: App): void {
        // 注册系统
        app.addSystems(MainScheduleLabel.UPDATE, this.updateSystem);
    }

    name(): string {
        return `InputManagerPlugin<${this.config.actionTypeName}>`;
    }

    isUnique(): boolean {
        return false; // 允许多个不同泛型参数的实例
    }
}
```

**为什么**：泛型扩展不需要工厂转换，直接将扩展对象赋值给 extension 属性。

#### 使用泛型扩展

**重要**：泛型扩展**不会自动注入到 context**，需要通过辅助函数手动获取。

**问题**：泛型扩展无法在 IDE 中直接获得代码提示，需要手动类型断言。

```typescript
/**
 * 获取泛型扩展的辅助函数
 * 提供完整的类型提示
 */
export function getInputExtension<A extends Actionlike>(
    context: Context,
    namespace: string
): InputManagerExtension<A> {
    return (context as unknown as Record<string, unknown>)[namespace] as InputManagerExtension<A>;
}

// 在系统中使用
function playerMovementSystem(world: BevyWorld, context: Context): void {
    // ✅ 使用辅助函数获得类型提示
    const playerInput = getInputExtension<PlayerAction>(context, "playerInput");
    //    ^^^^^^^^^^^ 类型: InputManagerExtension<PlayerAction>

    // 查询所有玩家实体
    for (const [entityId, data] of playerInput.queryInputEntities(world)) {
        //                          ^^^^^^^^^^^^^^^^^^^ 完整的类型提示和自动补全
        if (data.actionState?.pressed(PlayerAction.Jump)) {
            print(`Player ${entityId} is jumping!`);
        }
    }

    // 创建新实体
    const inputMap = new InputMap<PlayerAction>().insert(PlayerAction.Jump, KeyCode.Space);
    const playerId = playerInput.spawnWithInput(world, inputMap);
    //               ^^^^^^^^^^^ 完整的类型提示
}
```

**为什么**：泛型扩展的类型信息需要通过辅助函数传递，才能获得 IDE 代码提示。

### 标准扩展 vs 泛型扩展对比

| 特性 | 标准扩展 | 泛型扩展 |
|-----|---------|---------|
| **使用场景** | 简单工具函数、状态查询 | 泛型插件、复杂组件系统 |
| **类型定义** | `ExtensionFactory<T>` | 直接函数签名 |
| **实现位置** | constructor 中初始化工厂 | constructor 中创建对象 |
| **App 处理** | 自动调用工厂函数并注入 context | 不自动处理，直接存储 |
| **使用方式** | `context.method()` | 辅助函数 + 手动类型断言 |
| **代码提示** | 需要类型断言 | 需要辅助函数 |
| **典型示例** | LogPlugin, TimePlugin | InputManagerPlugin |

### 扩展命名规范

**必须**：
- 使用 camelCase 命名扩展方法
- 使用动词开头：`get*`、`set*`、`is*`、`has*`、`add*`、`remove*`

```typescript
// ✅ 良好的命名
getDeltaSeconds()    // 获取值
setTimeScale()       // 设置值
isPaused()           // 布尔检查
hasComponent()       // 存在性检查
spawnWithInput()     // 创建操作
removeEntity()       // 移除操作

// ❌ 不好的命名
deltaSeconds()       // 不清晰是获取还是属性
timeScaleUpdate()    // 动词位置不对
pausedCheck()        // 应该用 isPaused
```

**为什么**：一致的命名约定让 API 更易于学习和使用。

### 类型安全要求

**必须**：
- 为所有扩展方法提供完整的类型签名
- 使用 TypeScript 严格模式
- 避免使用 `any` 类型

```typescript
// ✅ 正确：完整类型
export interface LogPluginExtensionFactories {
    getLogManager: ExtensionFactory<() => LogSubscriber | undefined>;
    getLogLevel: ExtensionFactory<() => Level>;
}

// ✅ 正确：泛型类型
export interface InputManagerExtension<A extends Actionlike> {
    spawnWithInput(world: BevyWorld, inputMap: InputMap<A>): number;
    queryInputEntities(world: BevyWorld): IterableIterator<[number, EntityInputData<A>]>;
}

// ❌ 错误：缺少类型
export interface BadExtensions {
    calculate: ExtensionFactory<(input: any) => any>; // 避免 any
    process: Function; // 太宽泛
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
export interface ConfigPluginExtensions {
    getMaxPlayers: ExtensionFactory<() => number>;
}

export class ConfigPlugin extends BasePlugin {
    extension: ConfigPluginExtensions;

    build(app: App): void {
        const config = new GameConfig(4, Vector3.zero, 1);
        app.insertResource(config);

        this.extension = {
            getMaxPlayers: (world, context, plugin) => {
                return () => config.maxPlayers;
            }
        };
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
            const ctx = getContextWithExtensions<TimePlugin>(app);
            const deltaTime = ctx.getDeltaSeconds();
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
            try {
                const ctx = getContextWithExtensions<DiagnosticsPlugin>(app);
                ctx.updateDiagnostic("my_metric", 42);
            } catch {
                // DiagnosticsPlugin 未安装，跳过
            }
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
            const ctx = getContextWithExtensions<MyPlugin>(app);

            expect(ctx.myExtensionMethod).to.be.ok();
            expect(ctx.myExtensionMethod()).to.equal("expected value");
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

### 标准扩展示例

```typescript
import { BasePlugin, App } from "@white-dragon-bevy/bevy_app";

/**
 * 使用标准扩展的插件
 */
export class StandardExtensionPlugin extends BasePlugin {
    private data: Map<string, unknown> = new Map();

	/** 插件扩展 */
	extension = {
		getLogManager: (world: World, context: Context, plugin: LogPlugin) => {
			// 返回获取日志管理器的函数，使用 plugin 参数而不是 this
			return () => LogSubscriber.getGlobal();
		},
		getLogLevel: (world: World, context: Context, plugin: LogPlugin) => {
			// 使用 plugin 参数获取 level 值，避免 this 指针问题
			const currentLevel = plugin.level;
			// 返回获取日志级别的函数
			return () => currentLevel;
		},
	};

    build(app: App): void {
       
    }

    name(): string {
        return "StandardExtensionPlugin";
    }
}
```

### 泛型扩展示例

```typescript
import { BasePlugin, App, ExtensionFactory } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_app";

/**
 * 状态管理插件扩展工厂
 */
export interface StatePluginExtensionFactories {
    getState: ExtensionFactory<() => string>;
    setState: ExtensionFactory<(newState: string) => void>;
    isInState: ExtensionFactory<(state: string) => boolean>;
    transitionTo: ExtensionFactory<(state: string) => boolean>;
}

/**
 * 使用泛型扩展的状态管理插件
 */
export class StatePlugin extends BasePlugin {
    extension: StatePluginExtensionFactories;
    private currentState: string = "idle";
    private validTransitions: Map<string, Set<string>> = new Map();

    constructor() {
        super();
        this.extension = {} as StatePluginExtensionFactories;

        // 定义状态转换规则
        this.validTransitions.set("idle", new Set(["running", "jumping"]));
        this.validTransitions.set("running", new Set(["idle", "jumping"]));
        this.validTransitions.set("jumping", new Set(["idle", "running"]));
    }

    build(app: App): void {
        // 初始化扩展工厂
        this.extension = {
            getState: (world: World, context: Context, plugin: StatePlugin) => {
                return () => this.currentState;
            },

            setState: (world: World, context: Context, plugin: StatePlugin) => {
                return (newState: string) => {
                    this.currentState = newState;
                };
            },

            isInState: (world: World, context: Context, plugin: StatePlugin) => {
                return (state: string) => this.currentState === state;
            },

            transitionTo: (world: World, context: Context, plugin: StatePlugin) => {
                return (newState: string) => {
                    const currentTransitions = this.validTransitions.get(this.currentState);
                    if (currentTransitions && currentTransitions.has(newState)) {
                        this.currentState = newState;
                        return true;
                    }
                    return false;
                };
            }
        };

        // 添加状态管理系统
        app.addSystems(BuiltinSchedules.UPDATE, (world, context) => {
            // 状态更新逻辑
        });
    }

    name(): string {
        return "StatePlugin";
    }
}

// 使用示例
function gameSystem(world: World, context: Context): void {
    const ctx = getContextWithExtensions<StatePlugin>(app);

    if (ctx.isInState("idle")) {
        if (/* jump input */) {
            ctx.transitionTo("jumping");
        }
    }
}
```

### 完整插件示例

```typescript
import { BasePlugin, App, ExtensionFactory, BuiltinSchedules } from "@white-dragon-bevy/bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "@white-dragon-bevy/bevy_ecs";
import { TypeDescriptor } from "@white-dragon-bevy/bevy_core";
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
export interface ScorePluginExtensionFactories {
    addPlayerScore: ExtensionFactory<(player: Player, points: number) => void>;
    getPlayerScore: ExtensionFactory<(player: Player) => number>;
    getLeaderboard: ExtensionFactory<(limit?: number) => Array<[string, number]>>;
    resetScores: ExtensionFactory<() => void>;
    getScoreMultiplier: ExtensionFactory<() => number>;
    setScoreMultiplier: ExtensionFactory<(multiplier: number) => void>;
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
export class ScorePlugin extends BasePlugin {
    extension: ScorePluginExtensionFactories;
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
        this.extension = {} as ScorePluginExtensionFactories;
    }

    build(app: App): void {
        // 插入资源
        app.insertResource(this.scoreboard);

        // 初始化扩展
        this.initializeExtensions(app);

        // 注册系统
        this.registerSystems(app);

        // 设置事件监听
        this.setupEventListeners(app);

        print(`[${this.name()}] Plugin initialized with config:`, this.config);
    }

    private initializeExtensions(app: App): void {
        this.extension = {
            addPlayerScore: (world: World, context: Context, plugin: ScorePlugin) => {
                return (player: Player, points: number) => {
                    const actualPoints = points * this.currentMultiplier;
                    this.scoreboard.addScore(player.UserId, actualPoints);
                    hookDebugPrint(`Added ${actualPoints} points to ${player.Name}`);
                };
            },

            getPlayerScore: (world: World, context: Context, plugin: ScorePlugin) => {
                return (player: Player) => {
                    return this.scoreboard.getScore(player.UserId);
                };
            },

            getLeaderboard: (world: World, context: Context, plugin: ScorePlugin) => {
                return (limit?: number) => {
                    return this.scoreboard.getTopScores(limit ?? this.config.leaderboardSize);
                };
            },

            resetScores: (world: World, context: Context, plugin: ScorePlugin) => {
                return () => {
                    this.scoreboard.reset();
                    this.currentMultiplier = this.config.initialMultiplier;
                    print(`[${this.name()}] Scores reset`);
                };
            },

            getScoreMultiplier: (world: World, context: Context, plugin: ScorePlugin) => {
                return () => this.currentMultiplier;
            },

            setScoreMultiplier: (world: World, context: Context, plugin: ScorePlugin) => {
                return (multiplier: number) => {
                    this.currentMultiplier = math.clamp(
                        multiplier,
                        1,
                        this.config.maxMultiplier
                    );
                };
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

// 在系统中使用
function gameplaySystem(world: World, context: Context): void {
    const ctx = getContextWithExtensions<ScorePlugin>(app);

    // 添加分数
    for (const player of Players.GetPlayers()) {
        ctx.addPlayerScore(player, 10);
    }

    // 获取排行榜
    const leaderboard = ctx.getLeaderboard(5);
    for (const [playerId, score] of leaderboard) {
        print(`Player ${playerId}: ${score} points`);
    }
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
- [ ] 扩展工厂接口使用 `ExtensionFactory<T>`
- [ ] 工厂函数接收 `(world, context, plugin)` 参数
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