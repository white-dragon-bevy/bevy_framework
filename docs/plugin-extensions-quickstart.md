# 插件扩展快速开始

5分钟学会创建和使用插件扩展！

## 🚀 快速使用

```typescript
import { App } from "../bevy_app/app";
import { World } from "@rbxts/matter";
import { Context } from "../bevy_ecs";
import { LogPlugin, LogPluginExtension } from "../bevy_log";

// 1. 创建 App 并添加插件
const app = App.create()
    .addPlugin(new LogPlugin());

// 2. 在系统中使用扩展 - context 快捷方式（推荐）
function mySystem(world: World, context: Context): void {
    const logExt = context.getExtension<LogPluginExtension>();

    if (logExt) {
        const level = logExt.logLevel;           // ✅ 类型安全
        const manager = logExt.logManager;        // ✅ 代码提示
        print(`Log level: ${level}`);
    }
}

// 3. 或在非系统上下文使用 - app 资源访问
const logExt = app.getResource<LogPluginExtension>();
print(`Current level: ${logExt?.logLevel}`);
```

## 📝 创建插件扩展

### 1. 定义扩展接口

```typescript
// my-plugin/extension.ts
/**
 * MyPlugin 扩展接口
 * 直接定义方法签名，不使用 ExtensionFactory 包装
 */
export interface MyPluginExtension {
    getManager: () => MyManager;
    doSomething: (param: string) => void;
}
```

### 2. 实现插件

```typescript
// my-plugin/plugin.ts
import { Plugin, App } from "../bevy_app";
import { ___getTypeDescriptor } from "bevy_core";
import { MyPluginExtension } from "./extension";

export class MyPlugin implements Plugin<MyPluginExtension> {
    // 类型描述符
    extensionDescriptor = ___getTypeDescriptor<MyPluginExtension>()!;

    private manager: MyManager;

    constructor() {
        this.manager = new MyManager();
    }

    // 获取扩展对象
    getExtension(app: App): MyPluginExtension {
        return {
            // 直接引用插件成员
            getManager: () => this.manager,
            doSomething: (param: string) => {
                print(`Hello ${param}!`);
            },
        };
    }

    build(app: App): void {
        // 插件配置...
    }

    name(): string {
        return "MyPlugin";
    }
}
```

### 3. 使用扩展

```typescript
import { World } from "@rbxts/matter";
import { Context } from "../bevy_ecs";
import { MyPluginExtension } from "./my-plugin/extension";

function gameSystem(world: World, context: Context): void {
    // 使用 context 快捷方式（推荐）
    const myExt = context.getExtension<MyPluginExtension>();

    if (myExt) {
        const manager = myExt.getManager();    // ✅ 类型安全
        myExt.doSomething("World");            // ✅ 自动补全
    }
}
```

## 🔧 核心概念

### 扩展类型声明

```typescript
// 通过泛型参数声明扩展类型
class MyPlugin implements Plugin<MyPluginExtension> {
    extensionDescriptor = ___getTypeDescriptor<MyPluginExtension>()!;
    //                                        ^^^^^^^^^^^^^^^^^^
    //                                        扩展类型
}
```

### 两种访问方式

```typescript
// 方式1: context 快捷方式（系统中推荐）
function system(world: World, context: Context): void {
    const ext = context.getExtension<T>();
}

// 方式2: app 资源访问（非系统上下文）
const ext = app.getResource<T>();
```

| 方式 | 使用场景 | 优势 |
|-----|---------|------|
| `context.getExtension<T>()` | 系统函数中 | 简洁、无需 app 参数 |
| `app.getResource<T>()` | 插件方法、测试 | 明确、可在任何地方使用 |

### getExtension() 方法

- 在插件加载时由 App 调用一次
- 返回的扩展对象作为资源存储
- 可以访问 `this` 和 `app` 参数

```typescript
getExtension(app: App): MyExtension {
    return {
        method: () => this.doWork(),  // 引用插件成员
    };
}
```

### 空值检查

```typescript
// ✅ 总是检查扩展是否存在
const ext = context.getExtension<MyExtension>();
if (ext) {
    ext.doWork();
}

// ✅ 使用可选链
const result = context.getExtension<MyExtension>()?.doWork();

// ❌ 避免：假设扩展存在
const ext = context.getExtension<MyExtension>()!;  // 危险！
```

## 📖 更多信息

查看完整文档：[plugin-extensions.md](./plugin-extensions.md)
