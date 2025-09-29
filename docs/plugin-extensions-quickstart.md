# 插件扩展快速开始

5分钟学会创建和使用插件扩展！

## 🚀 快速使用

```typescript
import { App } from "../bevy_app/app";
import { LogPlugin } from "../bevy_log/lib";

// 1. 创建 App 并添加插件
const app = App.create()
    .addPlugin(new LogPlugin());

// 2. 直接使用扩展方法 - 有完整的类型提示！
const logLevel = app.context.getLogLevel();    // ✅ 类型安全
const logManager = app.context.getLogManager(); // ✅ 代码提示
```

## 📝 创建插件扩展

### 1. 定义扩展接口

```typescript
// my-plugin.ts
import type { ExtensionFactory } from "../bevy_app/app";

export interface MyPluginExtensionFactories {
    getManager: ExtensionFactory<() => MyManager>;
    doSomething: ExtensionFactory<(param: string) => void>;
}
```

### 2. 实现插件

```typescript
export class MyPlugin extends BasePlugin {
    extension: MyPluginExtensionFactories;
    
    constructor() {
        super();
        
        // 关键：使用工厂模式，避免 this 问题
        this.extension = {
            getManager: (world, context, plugin: MyPlugin) => {
                return () => plugin.manager; // 使用 plugin 而不是 this
            },
            
            doSomething: (world, context, plugin: MyPlugin) => {
                return (param: string) => {
                    print(`Hello ${param}!`);
                };
            },
        };
    }
}
```

### 3. 使用扩展

```typescript
const app = App.create()
    .addPlugin(new MyPlugin());

// 直接访问，享受类型安全！
const manager = app.context.getManager();
app.context.doSomething("World");
```

## 🔧 核心概念

### 扩展工厂函数

```typescript
// 工厂函数签名
(world: World, context: AppContext, plugin: PluginInstance) => ActualFunction
```

- `world`: ECS World，访问游戏数据
- `context`: App 上下文，访问其他扩展
- `plugin`: 插件实例，避免 `this` 问题

### 类型推导

```typescript
// TypeScript 自动推导类型链：
MyPlugin.extension -> MyPluginExtensionFactories -> 实际函数类型 -> app.context
```

## 📖 更多信息

查看完整文档：[plugin-extensions.md](./plugin-extensions.md)
