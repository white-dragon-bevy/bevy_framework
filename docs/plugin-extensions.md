# 插件扩展系统

本文档介绍如何在 Bevy Framework 中创建和使用插件扩展系统，实现类型安全的插件功能扩展。

> **注意**：本文档基于函数式插件 API。class plugin 已完全弃用，请使用 `plugin<E>()` 函数创建插件。

## 概述

插件扩展系统允许插件向 `App.context` 添加类型安全的方法，这些方法可以在应用程序中直接访问，享受完整的 TypeScript 类型检查和 IDE 代码提示。

## 核心特性

- ✅ **类型安全**：完整的 TypeScript 类型推导和检查
- ✅ **直接访问**：可以直接通过 `app.context.methodName()` 调用
- ✅ **工厂模式**：避免 roblox-ts 的 `this` 指针问题
- ✅ **类型累积**：多个插件的扩展会自动合并
- ✅ **代码提示**：IDE 中有完整的智能提示

## 创建插件扩展

### 1. 定义扩展工厂接口

```typescript
import type { ExtensionFactory } from "../bevy_app/app";
import type { World } from "../bevy_ecs";
import type { AppContext } from "../bevy_app/context";

/**
 * 你的插件扩展工厂接口
 */
export interface MyPluginExtensionFactories {
    /**
     * 获取管理器的工厂函数
     */
    getManager: ExtensionFactory<() => MyManager | undefined>;
    
    /**
     * 获取配置的工厂函数
     */
    getConfig: ExtensionFactory<() => MyConfig>;
    
    /**
     * 执行操作的工厂函数
     */
    doSomething: ExtensionFactory<(param: string) => void>;
}
```

### 2. 在插件中实现扩展

```typescript
import { plugin } from "../bevy_app/plugin";

export interface MyPluginConfig {
    someOption?: string;
}

export function createMyPlugin(config?: MyPluginConfig) {
    const myConfig = { ...defaultConfig, ...config };
    const manager = new MyManager(myConfig);

    return plugin<MyPluginExtensionFactories>({
        name: "MyPlugin",
        build: (app) => {
            // 插件的构建逻辑...
        },
        extension: {
            getManager: (world, context, plugin) => {
                // 返回获取管理器的函数
                return () => manager;
            },

            getConfig: (world, context, plugin) => {
                return () => myConfig;
            },

            doSomething: (world, context, plugin) => {
                // 可以访问 world, context 和 plugin 实例
                return (param: string) => {
                    print(`Doing something with: ${param}`);
                    // 可以访问 world 中的资源
                    const someResource = world.getResource(SomeResource);
                    // 执行具体逻辑...
                };
            },
        },
        unique: true, // 可选，默认为 true
    });
}
```

### 3. 扩展工厂函数签名

```typescript
type ExtensionFactory<T extends (...args: any[]) => any> = 
    (world: World, context: AppContext, plugin: any) => T;
```

**参数说明：**
- `world`: Matter World 实例，可以访问 ECS 资源
- `context`: App 上下文，可以访问其他扩展
- `plugin`: 插件实例，避免 `this` 指针问题

## 使用插件扩展

### 方式1：直接访问（推荐）

```typescript
import { App } from "../bevy_app/app";
import { createMyPlugin } from "./my-plugin";

// 创建 App 并添加插件
const app = App.create()
    .addPlugin(createMyPlugin({ someConfig: "value" }));

// 直接访问扩展方法，享受类型安全和代码提示！
const manager = app.context.getManager();      // ✅ 有类型提示
const config = app.context.getConfig();        // ✅ 有类型提示
app.context.doSomething("hello world");        // ✅ 有类型提示
```

### 方式2：使用辅助函数

```typescript
import { getContextWithExtensions } from "../bevy_app/app";
import { createMyPlugin } from "./my-plugin";

const app = App.create().addPlugin(createMyPlugin());

// 使用辅助函数获取带扩展的 context
// 注意：传入的类型是扩展接口类型
const context = getContextWithExtensions<MyPluginExtensionFactories>(app);

const manager = context.getManager();
const config = context.getConfig();
context.doSomething("hello world");
```

## 多插件扩展

### 链式调用

```typescript
import { createLogPlugin } from "@white-dragon-bevy/bevy_log";
import { createMyPlugin } from "./my-plugin";
import { createAnotherPlugin } from "./another-plugin";

const app = App.create()
    .addPlugin(createLogPlugin())           // 添加日志扩展
    .addPlugin(createMyPlugin())            // 添加自定义扩展
    .addPlugin(createAnotherPlugin());      // 添加另一个扩展

// 现在 app.context 包含所有插件的扩展方法
const logLevel = app.context.getLogLevel();      // 来自 LogPlugin
const manager = app.context.getManager();        // 来自 MyPlugin
const data = app.context.getAnotherData();       // 来自 AnotherPlugin
```

### 类型合并

```typescript
import type { LogPluginExtension } from "@white-dragon-bevy/bevy_log";
import type { MyPluginExtensionFactories } from "./my-plugin";
import type { AnotherPluginExtension } from "./another-plugin";

// 如果需要显式类型声明，可以创建联合类型
type MyExtensions = LogPluginExtension & MyPluginExtensionFactories & AnotherPluginExtension;

const context = getContextWithExtensions<MyExtensions>(app);
// context 现在有所有插件的扩展方法
```

## 实际示例

### LogPlugin 扩展实现

```typescript
// src/bevy_log/lib.ts
import { plugin } from "../bevy_app/plugin";
import type { ExtensionFactory } from "../bevy_app/app";

export interface LogPluginExtensionFactories {
    getLogManager: ExtensionFactory<() => LogSubscriber | undefined>;
    getLogLevel: ExtensionFactory<() => Level>;
}

export interface LogPluginConfig {
    level?: Level;
}

export function createLogPlugin(config?: LogPluginConfig) {
    const level = config?.level ?? Level.INFO;

    return plugin<LogPluginExtensionFactories>({
        name: "LogPlugin",
        build: (app) => {
            // 初始化日志系统
            const subscriber = new LogSubscriber();
            app.insertResource(subscriber);
        },
        extension: {
            getLogManager: (world, context, plugin) => {
                return () => LogSubscriber.getGlobal();
            },

            getLogLevel: (world, context, plugin) => {
                return () => level;
            },
        },
        unique: true,
    });
}
```

### 使用示例

```typescript
import { createLogPlugin } from "@white-dragon-bevy/bevy_log";

// 在你的应用中
const app = App.create()
    .addPlugin(createLogPlugin({ level: Level.DEBUG }));

// 直接使用，有完整的类型安全！
const currentLevel = app.context.getLogLevel();
const logManager = app.context.getLogManager();

print("Current log level:", Level[currentLevel]);
```

## 最佳实践

### 1. 命名约定

- 扩展接口以 `PluginExtensionFactories` 结尾
- 方法名使用动词开头，如 `getManager`, `setConfig`, `doAction`
- 避免与现有 AppContext 方法冲突

### 2. 错误处理

```typescript
getManager: (world: World, context: AppContext, plugin: MyPlugin) => {
    return () => {
        const manager = plugin.getManagerInstance();
        if (!manager) {
            error("Manager not initialized. Did you call plugin.build()?");
        }
        return manager;
    };
},
```

### 3. 资源访问

```typescript
getData: (world: World, context: AppContext, plugin: MyPlugin) => {
    return () => {
        // 访问 ECS 资源
        const resource = world.getResource(MyResource);
        if (!resource) {
            warn("MyResource not found in world");
            return undefined;
        }
        return resource.getData();
    };
},
```

### 4. 类型导出

```typescript
// 在插件模块中导出扩展接口，方便用户使用
export type { MyPluginExtensionFactories };
```

## 类型系统详解

### 核心类型

```typescript
// 扩展工厂函数类型
type ExtensionFactory<T> = (world: World, context: AppContext, plugin: any) => T;

// 从插件提取扩展
type ExtractPluginExtensions<P> = P extends { extension: infer E } ? E : {};

// 从工厂提取实际函数类型
type ExtractExtensionTypes<F> = {
    [K in keyof F]: F[K] extends ExtensionFactory<infer T> ? T : never;
};

// 带扩展的 Context 类型
type ContextWithExtensions<E> = AppContext & ExtractExtensionTypes<ExtractPluginExtensions<E>>;
```

### 类型推导流程

1. 插件定义 `extension: MyPluginExtensionFactories`
2. `addPlugin` 提取插件的扩展类型
3. 工厂函数转换为实际函数类型
4. 合并到 App 的 context 类型中
5. 运行时调用工厂函数，将实际函数绑定到 context

## 故障排除

### 常见问题

**Q: 为什么扩展方法没有类型提示？**

A: 确保：
1. 插件正确实现了 `extension` 属性
2. 扩展接口正确定义了工厂函数类型
3. 使用了正确的插件类型参数

**Q: 运行时扩展方法未定义？**

A: 检查：
1. 插件是否正确添加到 App
2. 工厂函数是否正确返回了函数
3. 插件的 `build` 方法是否被调用

**Q: roblox-ts 编译错误？**

A: 确保：
1. 工厂函数使用 `plugin` 参数而不是 `this`
2. 所有类型都正确导入
3. 避免在工厂函数中使用箭头函数的 `this`

## 总结

插件扩展系统提供了一种类型安全、易用的方式来扩展 App 功能。通过工厂模式和 TypeScript 的类型推导，你可以创建强大的插件，同时享受完整的开发体验。

关键要点：
- 使用工厂模式避免 `this` 问题
- 享受完整的类型安全和代码提示
- 可以直接通过 `app.context.methodName()` 访问
- 支持多插件扩展的自动合并
