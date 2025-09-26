# Custom Loop 示例

这个示例演示了如何在 Bevy 中创建自定义运行器来手动控制应用程序的更新循环。

## 原始 Rust 示例

原始的 Rust 示例从标准输入读取用户输入，并在 ECS 系统中打印这些输入。当用户输入 "exit" 时，应用程序退出。

## Roblox TypeScript 适配

由于 Roblox 环境没有标准输入，我们提供了两种实现方式：

1. **模拟输入队列**：使用预定义的输入序列来演示功能
2. **Roblox 集成**：可扩展为使用 Roblox 的聊天系统或 GUI 输入

## 核心概念

### 自定义运行器

```typescript
function myRunner(app: App): AppExit {
    // 完成插件构建
    app.finish();
    app.cleanup();

    // 自定义更新循环
    while (hasInput()) {
        // 更新资源
        app.insertResource(Input, new Input(line));

        // 运行一次更新
        app.update();

        // 检查退出条件
        const shouldExit = app.shouldExit();
        if (shouldExit !== undefined) {
            return shouldExit;
        }
    }

    return AppExit.success();
}
```

### 资源系统

使用 `@Resource` 装饰器定义资源类：

```typescript
@Resource
class Input implements Resource {
    constructor(public value: string = "") {}
}
```

### 系统函数

系统函数接收 `BevyWorld` 和 `AppContext` 参数：

```typescript
function printSystem(world: BevyWorld, context: AppContext): void {
    const resources = context.resources;
    const inputResource = resources.getResource<Input>();

    if (inputResource) {
        print(`You typed: ${inputResource.value}`);
    }
}
```

## 运行示例

```typescript
import customLoop from "./index";

// 运行基础示例
const exitCode = customLoop.runExample();

// 运行时会输出：
// Type stuff into the console (simulated input):
// You typed: Hello World
// You typed: Testing custom runner
// You typed: Another input
// Exit command received - application will terminate
```

## 扩展到实际 Roblox 输入

要集成实际的 Roblox 输入源，可以修改 `createRobloxInputRunner` 函数：

```typescript
// 集成聊天系统
game.GetService("Players").PlayerChatted.Connect((player, message) => {
    inputSimulator.addInput(message);
});

// 或集成 GUI 输入
const textBox = gui.FindFirstChild("InputTextBox") as TextBox;
textBox.FocusLost.Connect((enterPressed) => {
    if (enterPressed) {
        inputSimulator.addInput(textBox.Text);
    }
});
```

## 与 Bevy 的差异

1. **输入源**：Roblox 使用事件驱动的输入系统，而非阻塞式的标准输入
2. **运行循环**：Roblox 的 RunService 提供了内置的更新循环，可以与自定义运行器集成
3. **退出机制**：Roblox 环境中的"退出"通常意味着停止更新循环，而非终止进程

## 学习要点

- 如何创建和使用自定义运行器
- 如何手动控制应用程序的更新循环
- 如何在系统之间共享数据（通过资源）
- 如何适配不同平台的输入机制