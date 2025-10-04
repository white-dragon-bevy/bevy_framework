# 插件扩展系统

本文档介绍如何在 Bevy Framework 中创建和使用插件扩展系统，实现类型安全的插件功能扩展。

## 概述

插件扩展系统允许插件通过资源系统提供类型安全的扩展方法，这些方法可以在应用程序中通过 `context.getExtension<T>()` 或 `app.getResource<T>()` 访问，享受完整的 TypeScript 类型检查和 IDE 代码提示。

## 核心特性

- ✅ **类型安全**：完整的 TypeScript 类型推导和检查
- ✅ **便捷访问**：通过 `context.getExtension<T>()` 快捷获取
- ✅ **资源化管理**：扩展作为资源存储，统一管理
- ✅ **类型明确**：通过泛型参数 `Plugin<T>` 显式声明
- ✅ **代码提示**：IDE 中有完整的智能提示
- ✅ **代码简洁**：相比工厂模式减少大量样板代码

## 创建插件扩展

### 1. 定义扩展接口

创建独立的扩展接口文件，定义插件提供的扩展方法：

```typescript
// my-plugin/extension.ts
/**
 * MyPlugin 扩展接口
 * 提供数据管理的扩展方法
 */
export interface MyPluginExtension {
    /**
     * 获取管理器实例
     * @returns 管理器实例或 undefined
     */
    getManager: () => MyManager | undefined;

    /**
     * 获取配置
     * @returns 配置对象
     */
    getConfig: () => MyConfig;

    /**
     * 执行操作
     * @param param - 操作参数
     */
    doSomething: (param: string) => void;
}
```

**关键要点**：
- 直接定义方法签名，不使用 `ExtensionFactory` 包装
- 使用 JSDoc 注释说明每个方法的用途
- 接口命名遵循 `PluginNameExtension` 格式

### 2. 实现插件扩展

在插件类中实现扩展功能：

```typescript
// my-plugin/plugin.ts
import { Plugin, App } from "../bevy_app";
import { ___getTypeDescriptor } from "bevy_core";
import { MyPluginExtension } from "./extension";

export class MyPlugin implements Plugin<MyPluginExtension> {
    /** 扩展类型描述符 */
    extensionDescriptor = ___getTypeDescriptor<MyPluginExtension>()!;

    private config: MyConfig;
    private manager: MyManager;

    constructor(config?: Partial<MyConfig>) {
        this.config = { ...defaultConfig, ...config };
        this.manager = new MyManager();
    }

    /**
     * 获取插件扩展
     * 在插件加载时由 App 调用一次
     * @param app - App 实例
     * @returns 扩展对象
     */
    getExtension(app: App): MyPluginExtension {
        return {
            getManager: () => this.manager,
            getConfig: () => this.config,
            doSomething: (param: string) => {
                print(`Doing something with: ${param}`);
                // 可以直接访问 this 成员
                this.manager.process(param);
            },
        };
    }

    build(app: App): void {
        // 插件配置逻辑...
        print(`${this.name()} initialized`);
    }

    name(): string {
        return "MyPlugin";
    }
}
```

**实现要点**：
1. 实现 `Plugin<MyPluginExtension>` 泛型接口
2. 定义 `extensionDescriptor` 属性用于类型识别
3. 实现 `getExtension(app: App)` 方法返回扩展对象
4. 扩展方法可以直接引用 `this` 成员，无需闭包捕获

### 3. 导出扩展接口

在插件模块的 `index.ts` 中导出扩展接口：

```typescript
// my-plugin/index.ts
export { MyPlugin } from "./plugin";
export type { MyPluginExtension } from "./extension";
export { MyComponent } from "./components";
```

## 使用插件扩展

### 方式1：context 快捷方式（推荐）

在系统函数中，直接使用 `context.getExtension<T>()` 获取扩展：

```typescript
import { World } from "@rbxts/matter";
import { Context } from "../bevy_ecs";
import { MyPluginExtension } from "./my-plugin";

function mySystem(world: World, context: Context): void {
    // 使用 context 快捷方式获取扩展
    const myExt = context.getExtension<MyPluginExtension>();

    if (myExt) {
        const manager = myExt.getManager();     // ✅ 有类型提示
        const config = myExt.getConfig();       // ✅ 有类型提示
        myExt.doSomething("hello world");       // ✅ 有类型提示
    }
}
```

**为什么推荐 context 快捷方式？**
- 代码更简洁，无需传递 `app` 参数
- 在系统函数中 `context` 总是可用
- 与系统函数签名保持一致性

### 方式2：App 资源访问

在非系统上下文中（如插件内部、测试代码），使用 `app.getResource<T>()`：

```typescript
import { App } from "../bevy_app/app";
import { MyPlugin, MyPluginExtension } from "./my-plugin";

// 创建 App 并添加插件
const app = App.create()
    .addPlugin(new MyPlugin({ someConfig: "value" }));

// 通过 app 获取扩展资源
const myExt = app.getResource<MyPluginExtension>();

if (myExt) {
    const manager = myExt.getManager();
    myExt.doSomething("test");
}
```

**何时使用 App 资源访问？**
- 在插件的生命周期方法中（ready、finish、cleanup）
- 在测试代码中
- 在没有 context 的场景

### 访问方式对比

| 方式 | 使用场景 | 优势 | 示例 |
|-----|---------|------|------|
| `context.getExtension<T>()` | 系统函数中 | 简洁、无需 app 参数 | `context.getExtension<MyExt>()` |
| `app.getResource<T>()` | 插件方法、测试 | 明确、可在任何地方使用 | `app.getResource<MyExt>()` |

### 空值检查

**重要**：扩展可能不存在，必须进行检查：

```typescript
function safeSystem(world: World, context: Context): void {
    const myExt = context.getExtension<MyPluginExtension>();

    // ✅ 正确：检查扩展是否存在
    if (myExt) {
        myExt.doSomething("safe");
    }

    // ✅ 正确：使用可选链
    const config = context.getExtension<MyPluginExtension>()?.getConfig();

    // ✅ 正确：提前返回
    const ext = context.getExtension<MyPluginExtension>();
    if (!ext) return;

    ext.doSomething("work");

    // ❌ 错误：假设扩展存在
    const manager = context.getExtension<MyPluginExtension>()!.getManager(); // 危险！
}
```

## 多插件扩展

### 独立访问

每个插件的扩展独立存储为资源，按类型访问：

```typescript
const app = App.create()
    .addPlugin(new LogPlugin())           // 添加日志扩展
    .addPlugin(new TimePlugin())          // 添加时间扩展
    .addPlugin(new DiagnosticsPlugin());  // 添加诊断扩展

function multiExtensionSystem(world: World, context: Context): void {
    // 分别获取不同插件的扩展
    const logExt = context.getExtension<LogPluginExtension>();
    const timeExt = context.getExtension<TimePluginExtension>();
    const diagExt = context.getExtension<DiagnosticsPluginExtension>();

    if (logExt && timeExt) {
        const level = logExt.logLevel;
        const deltaTime = timeExt.getDeltaSeconds();
        print(`[${level}] Delta: ${deltaTime}`);
    }
}
```

### 扩展组合使用

```typescript
function combinedSystem(world: World, context: Context): void {
    const timeExt = context.getExtension<TimePluginExtension>();
    const diagExt = context.getExtension<DiagnosticsPluginExtension>();

    // 组合使用多个扩展
    if (timeExt && diagExt) {
        const fps = 1 / timeExt.getDeltaSeconds();
        diagExt.addMeasurement("fps", fps);
    }
}
```

## 实际示例

### LogPlugin 扩展实现

完整展示新模式的实现：

```typescript
// src/bevy_log/extension.ts
/**
 * LogPlugin 扩展接口
 * 提供日志管理和配置的扩展方法
 */
export interface LogPluginExtension {
    /** 全局日志管理器 */
    logManager: LogSubscriber;

    /** 当前日志级别 */
    logLevel: Level;
}
```

```typescript
// src/bevy_log/lib.ts
import { Plugin, App } from "../bevy_app";
import { ___getTypeDescriptor } from "bevy_core";
import { LogPluginExtension } from "./extension";

export class LogPlugin implements Plugin<LogPluginExtension> {
    /** 扩展类型描述符 */
    extensionDescriptor = ___getTypeDescriptor<LogPluginExtension>()!;

    private readonly logLevel: Level;

    constructor(config?: LogPluginConfig) {
        this.logLevel = config?.level ?? Level.INFO;
    }

    /**
     * 获取扩展对象
     * 返回包含日志管理器和配置的扩展
     */
    getExtension(app: App): LogPluginExtension {
        return {
            logManager: LogSubscriber.getGlobal()!,
            logLevel: this.logLevel
        };
    }

    build(app: App): void {
        // 初始化日志订阅器
        const subscriber = new LogSubscriber();
        const envFilter = EnvFilter.tryFromDefaultEnv(defaultFilter);
        const robloxLayer = new RobloxLayer(envFilter);
        subscriber.addLayer(robloxLayer);
        LogSubscriber.setGlobalDefault(subscriber);
    }

    name(): string {
        return "LogPlugin";
    }
}
```

### 使用 LogPlugin 扩展

```typescript
import { World } from "@rbxts/matter";
import { Context } from "../bevy_ecs";
import { LogPluginExtension, Level } from "../bevy_log";

// 在系统中使用
function loggingSystem(world: World, context: Context): void {
    const logExt = context.getExtension<LogPluginExtension>();

    if (logExt) {
        // 访问日志管理器
        const manager = logExt.logManager;

        // 获取当前级别
        const level = logExt.logLevel;

        print(`Current log level: ${Level[level]}`);
    }
}

// 在应用中配置
const app = App.create()
    .addPlugin(new LogPlugin({ level: Level.DEBUG }));

// 非系统上下文访问
const logExt = app.getResource<LogPluginExtension>();
print(`Log level: ${logExt?.logLevel}`);
```

## 最佳实践

### 1. 扩展接口命名

- 接口以 `Extension` 结尾
- 方法名使用动词开头
- 导出接口类型供外部使用

```typescript
// ✅ 正确命名
export interface TimePluginExtension { }
export interface DiagnosticsPluginExtension { }

// ❌ 旧命名（不再使用）
export interface TimePluginExtensionFactories { }
```

### 2. 空值处理

总是假设扩展可能不存在：

```typescript
function robustSystem(world: World, context: Context): void {
    // ✅ 方式1：if 检查
    const timeExt = context.getExtension<TimePluginExtension>();
    if (timeExt) {
        const deltaTime = timeExt.getDeltaSeconds();
    }

    // ✅ 方式2：可选链
    const deltaTime = context.getExtension<TimePluginExtension>()?.getDeltaSeconds() ?? 0;

    // ✅ 方式3：提前返回
    const diagExt = context.getExtension<DiagnosticsPluginExtension>();
    if (!diagExt) return;

    diagExt.addMeasurement("metric", 42);
}
```

### 3. 类型导出

在插件模块的 `index.ts` 中导出扩展接口：

```typescript
// index.ts
export { MyPlugin } from "./plugin";
export type { MyPluginExtension } from "./extension";  // 导出类型
export { MyComponent } from "./components";
```

### 4. 扩展对象构造

getExtension() 方法可以直接访问插件成员，无需闭包捕获：

```typescript
class MyPlugin implements Plugin<MyPluginExtension> {
    private manager: MyManager;
    private config: MyConfig;

    getExtension(app: App): MyPluginExtension {
        return {
            // ✅ 直接引用 this 成员
            getManager: () => this.manager,
            getConfig: () => this.config,

            // ✅ 可以访问 app 参数
            getWorld: () => app.getWorld(),

            // ✅ 可以调用插件方法
            reset: () => this.resetState(),
        };
    }

    private resetState(): void {
        this.manager.clear();
    }
}
```

### 5. 扩展依赖其他扩展

在 getExtension 中可以访问其他扩展：

```typescript
class AdvancedPlugin implements Plugin<AdvancedPluginExtension> {
    extensionDescriptor = ___getTypeDescriptor<AdvancedPluginExtension>()!;

    getExtension(app: App): AdvancedPluginExtension {
        // 获取依赖的扩展
        const timeExt = app.getResource<TimePluginExtension>();
        const logExt = app.getResource<LogPluginExtension>();

        return {
            doAdvancedWork: () => {
                if (timeExt && logExt) {
                    const dt = timeExt.getDeltaSeconds();
                    logExt.logManager.logEvent({
                        level: Level.INFO,
                        message: `Processing with dt=${dt}`,
                        timestamp: os.time()
                    });
                }
            }
        };
    }
}
```

### 6. 方法命名约定

使用一致的动词前缀：

```typescript
export interface MyPluginExtension {
    // Getters - 获取值
    getManager: () => Manager;
    getConfig: () => Config;
    getCurrent: () => State;

    // Setters - 设置值
    setConfig: (config: Config) => void;
    setTimeout: (timeout: number) => void;

    // Boolean checks - 布尔检查
    isPaused: () => boolean;
    hasFeature: (name: string) => boolean;

    // Actions - 操作
    doWork: () => void;
    reset: () => void;
    update: (data: Data) => void;
}
```

## 类型系统详解

### 核心类型

```typescript
// 插件泛型接口
interface Plugin<T = undefined> {
    readonly extensionDescriptor?: TypeDescriptor<T>;
    getExtension?(app: App): T;
    build(app: App): void;
    // ...其他方法
}

// 类型描述符（运行时类型标识）
import { ___getTypeDescriptor } from "bevy_core";
const descriptor = ___getTypeDescriptor<MyExtension>()!;

// Context 扩展获取方法
interface Context {
    getExtension<T>(): T | undefined;
    // ...其他方法
}
```

### 类型工作流程

1. **定义扩展接口**
   ```typescript
   export interface MyExtension {
       doSomething: () => void;
   }
   ```

2. **插件声明扩展类型**
   ```typescript
   class MyPlugin implements Plugin<MyExtension> {
       extensionDescriptor = ___getTypeDescriptor<MyExtension>()!;
   }
   ```

3. **App 注册扩展为资源**
   ```typescript
   // App 内部逻辑（伪代码）
   if (plugin.extensionDescriptor && plugin.getExtension) {
       const extension = plugin.getExtension(app);
       app.insertResource(extension);  // 存储为资源
   }
   ```

4. **用户通过类型获取**
   ```typescript
   const ext = context.getExtension<MyExtension>();
   // 或
   const ext = app.getResource<MyExtension>();
   ```

### TypeDescriptor 作用

- 提供运行时类型标识
- 用于资源系统的类型查找
- 支持反射和序列化

```typescript
// TypeDescriptor 使用示例
class MyExtension {
    static TYPE_ID = new TypeDescriptor("MyExtension");
}

// App 使用 TypeDescriptor 存储和检索
app.insertResource(extension);  // 内部使用 extensionDescriptor
context.getExtension<MyExtension>();  // 内部使用类型查找
```

## 故障排除

### 常见问题

**Q: 为什么扩展方法没有类型提示？**

A: 确保：
1. 插件正确实现了 `Plugin<ExtensionType>` 接口
2. 定义了 `extensionDescriptor` 属性
3. 导出了扩展接口类型
4. 使用了正确的类型参数

**Q: 运行时扩展为 undefined？**

A: 检查：
1. 插件是否正确添加到 App
2. `getExtension()` 方法是否正确实现
3. 插件的 `build()` 方法是否被调用
4. 类型参数是否正确

**Q: 如何在插件间共享扩展？**

A: 方法：
1. 在 `getExtension()` 中使用 `app.getResource<OtherExtension>()`
2. 通过依赖注入模式传递扩展引用
3. 使用资源系统共享数据

## 总结

插件扩展系统提供了一种类型安全、易用的方式来扩展 App 功能。关键要点：

- **两种访问方式**：`context.getExtension<T>()` 用于系统，`app.getResource<T>()` 用于其他场景
- **类型安全**：通过泛型参数和 TypeDescriptor 确保类型正确
- **资源化管理**：扩展作为资源存储，统一管理
- **代码简洁**：相比工厂模式减少大量样板代码
- **空值检查**：总是假设扩展可能不存在
