# Bevy Input

白龙 Bevy 的输入处理模块，提供完整的输入系统支持，包括键盘、鼠标、游戏手柄和触摸输入。

## 模块概述

`bevy_input` 是一个全功能的输入处理系统，为 Roblox 平台提供了与 Bevy 引擎相似的输入 API。该模块通过 Roblox 的 UserInputService 实现底层输入捕获，并提供统一的、易于使用的高级接口。

### 核心特性

- **统一的输入抽象**: 通过 `ButtonInput<T>` 提供通用的按键状态管理
- **多种输入类型支持**: 键盘、鼠标、游戏手柄、触摸屏
- **事件驱动架构**: 基于事件系统处理输入变化
- **帧级状态追踪**: 区分"刚刚按下"、"持续按下"、"刚刚释放"等状态
- **运行条件函数**: 提供便捷的条件检查函数用于系统调度
- **Roblox 深度集成**: 完整适配 Roblox 的输入系统

## 安装

```typescript
import { App } from "@rbxts/bevy-app";
import { InputPlugin } from "@rbxts/bevy-input";

const app = new App()
    .addPlugin(new InputPlugin())
    .run();
```

## 核心概念

### ButtonInput<T>

`ButtonInput<T>` 是一个通用的按键状态管理器，可用于任何类型的按键输入：

```typescript
class ButtonInput<T> {
    // 检查按键是否被按下
    isPressed(input: T): boolean

    // 检查按键是否刚刚被按下（本帧）
    justPressed(input: T): boolean

    // 检查按键是否刚刚被释放（本帧）
    justReleased(input: T): boolean

    // 记录按键按下
    press(input: T): void

    // 记录按键释放
    release(input: T): void

    // 清除帧级状态（每帧调用）
    clear(): void
}
```

### Axis<T>

`Axis<T>` 用于管理模拟输入轴，如游戏手柄摇杆：

```typescript
class Axis<T> {
    // 设置轴值
    set(axis: T, value: number): void

    // 获取轴值
    get(axis: T): number | undefined

    // 移除轴
    remove(axis: T): boolean
}
```

### 输入事件

所有输入都通过事件系统传递，确保输入处理的一致性和可扩展性。

## 使用示例

### 键盘输入

```typescript
import { App } from "@rbxts/bevy-app";
import { InputPlugin, KeyCode, ButtonInput } from "@rbxts/bevy-input";

const app = new App()
    .addPlugin(new InputPlugin())
    .addSystem((world) => {
        const keyboard = world.getResource(ButtonInput<KeyCode>);
        if (!keyboard) return;

        // 检查空格键是否刚刚被按下
        if (keyboard.justPressed(KeyCode.Space)) {
            print("Jump!");
        }

        // 检查 W 键是否持续按下
        if (keyboard.isPressed(KeyCode.KeyW)) {
            print("Moving forward...");
        }

        // 检查 Escape 键是否刚刚被释放
        if (keyboard.justReleased(KeyCode.Escape)) {
            print("Menu closed");
        }
    })
    .run();
```

### 鼠标输入

```typescript
import { MouseButton, MouseMotion, AccumulatedMouseMotion } from "@rbxts/bevy-input";

app.addSystem((world) => {
    const mouse = world.getResource(ButtonInput<MouseButton>);
    if (!mouse) return;

    // 检查鼠标左键
    if (mouse.justPressed(MouseButton.Left)) {
        print("Left click!");
    }

    // 检查鼠标右键
    if (mouse.isPressed(MouseButton.Right)) {
        print("Right button held");
    }
});

// 处理鼠标移动
app.addSystem((world) => {
    const motion = world.getResource(AccumulatedMouseMotion);
    if (!motion || motion.delta.Magnitude === 0) return;

    print(`Mouse moved: ${motion.delta.X}, ${motion.delta.Y}`);
});
```

### 游戏手柄输入

```typescript
import { GamepadButton, GamepadAxis, Axis } from "@rbxts/bevy-input";

app.addSystem((world) => {
    // 获取玩家 1 的游戏手柄按钮
    const gamepads = world.getResource(Map<number, ButtonInput<GamepadButton>>);
    if (!gamepads) return;

    const gamepad1 = gamepads.get(1);
    if (!gamepad1) return;

    // 检查 A 按钮
    if (gamepad1.justPressed(GamepadButton.ButtonA)) {
        print("A button pressed!");
    }

    // 检查左摇杆
    const axes = world.getResource(Map<number, Axis<GamepadAxis>>);
    if (!axes) return;

    const gamepad1Axes = axes.get(1);
    if (!gamepad1Axes) return;

    const leftX = gamepad1Axes.get(GamepadAxis.LeftStickX) || 0;
    const leftY = gamepad1Axes.get(GamepadAxis.LeftStickY) || 0;

    if (math.abs(leftX) > 0.1 || math.abs(leftY) > 0.1) {
        print(`Left stick: ${leftX}, ${leftY}`);
    }
});
```

### 触摸输入

```typescript
import { Touches, TouchPhase } from "@rbxts/bevy-input";

app.addSystem((world) => {
    const touches = world.getResource(Touches);
    if (!touches) return;

    // 遍历所有触摸点
    for (const touch of touches.iter()) {
        switch (touch.phase) {
            case TouchPhase.Started:
                print(`Touch started at ${touch.position.X}, ${touch.position.Y}`);
                break;
            case TouchPhase.Moved:
                print(`Touch moved to ${touch.position.X}, ${touch.position.Y}`);
                break;
            case TouchPhase.Ended:
                print(`Touch ended at ${touch.position.X}, ${touch.position.Y}`);
                break;
        }
    }

    // 检查是否刚刚开始触摸
    if (touches.justPressed.size() > 0) {
        print(`New touches: ${touches.justPressed.size()}`);
    }
});
```

### 使用运行条件

```typescript
import { inputJustPressed, inputPressed, anyPressed } from "@rbxts/bevy-input";

// 仅在按下空格键时运行系统
app.addSystemWithCondition(
    inputJustPressed(KeyCode.Space),
    (world) => {
        print("Space pressed - running special system!");
    }
);

// 在按住 Shift 键时运行
app.addSystemWithCondition(
    inputPressed(KeyCode.ShiftLeft),
    (world) => {
        print("Shift held - sprint mode active");
    }
);

// 在按下任意键时运行
app.addSystemWithCondition(
    anyPressed([KeyCode.KeyW, KeyCode.KeyA, KeyCode.KeyS, KeyCode.KeyD]),
    (world) => {
        print("Movement key pressed");
    }
);
```

## API 参考

### 核心类型

#### ButtonInput<T>
通用按键状态管理器，用于追踪任意类型按键的状态。

#### Axis<T>
模拟输入轴管理器，用于游戏手柄摇杆等模拟输入。

### 键盘输入

#### KeyCode
键盘按键代码枚举，包含所有标准键盘按键。

#### Key
逻辑按键枚举，表示按键的语义含义。

#### KeyboardInput
键盘输入事件。

#### KeyboardFocusLost
键盘焦点丢失事件。

### 鼠标输入

#### MouseButton
鼠标按钮枚举（Left、Right、Middle、Back、Forward、Other）。

#### MouseButtonInput
鼠标按钮输入事件。

#### MouseMotion
鼠标移动事件。

#### MouseWheel
鼠标滚轮事件。

#### AccumulatedMouseMotion
累积的鼠标移动数据资源。

#### AccumulatedMouseScroll
累积的鼠标滚动数据资源。

### 游戏手柄输入

#### GamepadButton
游戏手柄按钮枚举。

#### GamepadAxis
游戏手柄轴枚举（摇杆、扳机等）。

#### GamepadEvent
游戏手柄事件基类。

#### GamepadConnectionEvent
游戏手柄连接/断开事件。

#### GamepadSettings
游戏手柄设置资源（死区、灵敏度等）。

### 触摸输入

#### TouchPhase
触摸阶段枚举（Started、Moved、Ended、Cancelled）。

#### Touch
单个触摸点信息。

#### Touches
所有活动触摸点的容器资源。

### 条件函数

#### inputJustPressed(key: KeyCode)
创建一个条件函数，检查按键是否刚刚被按下。

#### inputPressed(key: KeyCode)
创建一个条件函数，检查按键是否被按下。

#### inputJustReleased(key: KeyCode)
创建一个条件函数，检查按键是否刚刚被释放。

#### anyPressed(keys: KeyCode[])
创建一个条件函数，检查是否有任意指定按键被按下。

#### allPressed(keys: KeyCode[])
创建一个条件函数，检查是否所有指定按键都被按下。

## 与原版 Bevy 的差异

### 主要差异

1. **平台适配**: 完全基于 Roblox 的 UserInputService，而非原生输入 API
2. **类型系统**: 使用 TypeScript 的类型系统替代 Rust 的类型系统
3. **资源管理**: 使用 Matter ECS 的资源系统
4. **事件系统**: 适配了本项目的事件管理器实现

### 功能对应

| Bevy 功能 | 本模块实现 | 说明 |
|---------|----------|-----|
| Input<KeyCode> | ButtonInput<KeyCode> | 功能完全一致 |
| Input<MouseButton> | ButtonInput<MouseButton> | 功能完全一致 |
| Axis<GamepadAxis> | Axis<GamepadAxis> | 功能完全一致 |
| Touch | Touch/Touches | 适配 Roblox 触摸 API |
| GamepadRumble | GamepadRumbleRequest | 通过事件系统实现 |

### 移植注意事项

从 Bevy 代码移植时需要注意：

1. 使用 `ButtonInput` 替代 `Input`
2. 键码映射可能略有不同（参考 KeyCode 枚举）
3. 游戏手柄编号从 1 开始（Roblox 约定）
4. 触摸坐标使用 Vector2 而非元组

## Roblox 特定注意事项

### 输入上下文

- 服务端无法接收输入事件（仅客户端）
- GUI 输入可能会被 Roblox UI 拦截
- 移动设备的虚拟按键需要特殊处理

### 性能优化

- 输入状态每帧自动清理
- 事件使用对象池减少垃圾回收
- 累积数据（鼠标移动等）批量处理

### 最佳实践

1. **始终检查资源存在性**: 在访问输入资源前检查是否存在
2. **使用条件函数**: 对于简单的输入检查，使用条件函数可以提高代码可读性
3. **处理多输入方案**: 同时支持键盘、游戏手柄和触摸，提供最佳用户体验
4. **考虑输入缓冲**: 对于需要精确输入的游戏，考虑实现输入缓冲系统

## 示例项目

完整的示例可以在以下位置找到：

- `src/__examples__/input/keyboard_input.ts` - 键盘输入示例
- `src/__examples__/input/mouse_input.ts` - 鼠标输入示例
- `src/__examples__/input/gamepad_input.ts` - 游戏手柄示例
- `src/__examples__/input/touch_input.ts` - 触摸输入示例

## 贡献指南

欢迎贡献代码！请确保：

1. 遵循现有的代码风格
2. 添加适当的类型注解
3. 为新功能编写测试
4. 更新相关文档

## 许可证

本模块遵循与主项目相同的许可证。