# 游戏手柄摇杆输入实现

本文档描述了 bevy_framework 中游戏手柄摇杆输入的完整实现。

## 概述

我们已经完善了游戏手柄摇杆输入系统，替代了之前硬编码的 `Vector2.zero` 实现。新系统提供了：

- ✅ 实时摇杆输入监听（通过 `UserInputService.InputChanged`）
- ✅ 死区和灵敏度处理
- ✅ 多手柄支持（Gamepad1-4）
- ✅ 向后兼容的API
- ✅ 自动资源管理
- ✅ 完整的单元测试

## 核心功能

### 1. 事件驱动的输入处理

```typescript
// 自动初始化事件监听器
inputStore.initializeGamepadListeners();

// UserInputService.InputChanged 事件会自动处理摇杆输入
// 支持 Thumbstick1 (左摇杆) 和 Thumbstick2 (右摇杆)
```

### 2. 死区和灵敏度控制

```typescript
// 配置摇杆参数
const config: GamepadConfig = {
    deadZone: 0.15,      // 死区半径 (0.0 - 1.0)
    sensitivity: 1.2,    // 灵敏度倍数
};

inputStore.setGamepadConfig(config);
```

**死区处理算法：**
- 如果输入幅度 < 死区 → 返回 `Vector2.zero`
- 否则 → 重新映射到 `[0, 1]` 范围并应用灵敏度

### 3. 多手柄支持

系统自动区分不同的游戏手柄：

```typescript
// 自动生成的键名格式：
"GamepadStick:Left:1"   // Gamepad1 左摇杆
"GamepadStick:Left:2"   // Gamepad2 左摇杆
"GamepadStick:Right:1"  // Gamepad1 右摇杆
"GamepadStick:Right:2"  // Gamepad2 右摇杆
```

## API 使用方法

### 基本用法

```typescript
import { GamepadStick, CentralInputStore } from "./leafwing-input-manager";

const inputStore = new CentralInputStore();
const leftStick = GamepadStick.left();
const rightStick = GamepadStick.right();

// 读取摇杆输入
const movementVector = leftStick.axisPair(inputStore);
const cameraVector = rightStick.axisPair(inputStore);

console.log(`Movement: (${movementVector.X}, ${movementVector.Y})`);
console.log(`Camera: (${cameraVector.X}, ${cameraVector.Y})`);
```

### 单独访问轴

```typescript
import { GamepadControlAxis } from "./leafwing-input-manager";

const leftX = GamepadControlAxis.leftX();
const leftY = GamepadControlAxis.leftY();
const rightX = GamepadControlAxis.rightX();
const rightY = GamepadControlAxis.rightY();

// 读取单轴值
const horizontalInput = leftX.value(inputStore);
const verticalInput = leftY.value(inputStore);
```

### 配置预设

```typescript
import { GAMEPAD_CONFIG_PRESETS } from "./leafwing-input-manager/__examples__/gamepad-stick-example";

// 精确控制（策略游戏）
inputStore.setGamepadConfig(GAMEPAD_CONFIG_PRESETS.PRECISE);

// 响应式控制（射击游戏）
inputStore.setGamepadConfig(GAMEPAD_CONFIG_PRESETS.RESPONSIVE);

// 无障碍控制
inputStore.setGamepadConfig(GAMEPAD_CONFIG_PRESETS.ACCESSIBILITY);
```

## 在 InputManagerPlugin 中的集成

`InputManagerPlugin` 已自动集成了摇杆输入处理：

```typescript
// 插件会自动：
// 1. 在客户端初始化摇杆监听器
// 2. 在清理时断开事件连接
// 3. 处理所有摇杆输入事件

// 无需手动配置，开箱即用！
```

## 向后兼容性

旧的 API 仍然可用：

```typescript
// 传统方式 (仍然有效)
const leftStickValue = inputStore.dualAxisValue("gamepad_stick_left");
const rightStickValue = inputStore.dualAxisValue("gamepad_stick_right");

// 传统的更新方法 (仍然有效)
inputStore.updateGamepadStickLeft(new Vector3(x, y, 0));
inputStore.updateGamepadStickRight(new Vector3(x, y, 0));
```

## 实际游戏示例

### 玩家移动控制

```typescript
function updatePlayerMovement(inputStore: CentralInputStore, deltaTime: number) {
    const leftStick = GamepadStick.left();
    const movementInput = leftStick.axisPair(inputStore);

    if (movementInput.Magnitude > 0.1) {
        const speed = 10; // 单位/秒
        const movement = movementInput.mul(speed * deltaTime);

        // 移动玩家
        player.Position = player.Position.add(new Vector3(movement.X, 0, movement.Y));
    }
}
```

### 摄像机控制

```typescript
function updateCamera(inputStore: CentralInputStore, deltaTime: number) {
    const rightStick = GamepadStick.right();
    const cameraInput = rightStick.axisPair(inputStore);

    if (cameraInput.Magnitude > 0.1) {
        const sensitivity = 100; // 度/秒
        const rotation = cameraInput.mul(sensitivity * deltaTime);

        // 旋转摄像机
        camera.CFrame = camera.CFrame.mul(CFrame.Angles(
            math.rad(-rotation.Y), // 俯仰
            math.rad(-rotation.X), // 偏航
            0
        ));
    }
}
```

## 性能优化

- **事件驱动**：只有在摇杆移动时才更新值
- **死区过滤**：自动忽略小幅度的噪音输入
- **一次性初始化**：监听器只创建一次，避免重复设置
- **自动清理**：插件卸载时自动断开连接

## 调试和测试

### 启用调试日志

在 `CentralInputStore` 中已包含调试输出：

```typescript
// 初始化时会打印：
// "[CentralInputStore] Initializing gamepad listeners"

// 配置更新时会打印：
// "[CentralInputStore] Updated gamepad config: deadZone=0.15, sensitivity=1.2"
```

### 单元测试

运行摇杆输入测试：

```bash
npm test -- -p "ReplicatedStorage/src/leafwing-input-manager/user-input/__tests__/gamepad-input.test"
```

测试覆盖：
- 死区处理
- 灵敏度应用
- 多手柄支持
- API 兼容性
- 资源清理

## 文件结构

```
src/leafwing-input-manager/
├── user-input/
│   ├── central-input-store.ts      # 核心输入存储（已更新）
│   ├── gamepad.ts                  # 摇杆和按钮类（已更新）
│   └── __tests__/
│       └── gamepad-input.test.ts   # 摇杆输入测试（新增）
├── plugin/
│   └── input-manager-plugin.ts     # 插件集成（已更新）
└── __examples__/
    └── gamepad-stick-example.ts    # 使用示例（新增）
```

## 实现细节

### 事件处理流程

1. **初始化**：`initializeGamepadListeners()` 设置 `UserInputService.InputChanged` 监听器
2. **事件触发**：当摇杆移动时，Roblox 触发 `InputChanged` 事件
3. **输入过滤**：`isGamepadInputType()` 验证输入来源
4. **处理输入**：`processGamepadStickInput()` 应用死区和灵敏度
5. **存储更新**：同时更新新格式键名和传统键名
6. **应用读取**：游戏逻辑通过 `GamepadStick` API 读取处理后的值

### 键名映射

```typescript
// 新格式（多手柄支持）
"GamepadStick:Left:1"   // getGamepadStickKey() 生成
"GamepadStick:Right:1"

// 传统格式（向后兼容）
"gamepad_stick_left"    // 硬编码兼容
"gamepad_stick_right"
```

### 死区算法

```typescript
function processGamepadStickInput(rawInput: Vector2): Vector2 {
    const magnitude = rawInput.Magnitude;

    // 死区检查
    if (magnitude < deadZone) {
        return Vector2.zero;
    }

    // 重新映射和灵敏度应用
    const normalized = rawInput.Unit;
    const adjustedMagnitude = math.min(
        (magnitude - deadZone) / (1 - deadZone) * sensitivity,
        1.0
    );

    return normalized.mul(adjustedMagnitude);
}
```

## 故障排除

### 常见问题

**问题**：摇杆输入没有响应
**解决**：确保调用了 `initializeGamepadListeners()`

**问题**：摇杆过于敏感或迟钝
**解决**：调整 `deadZone` 和 `sensitivity` 配置

**问题**：多手柄识别错误
**解决**：检查 `UserInputType` 是否正确传递

### 调试步骤

1. 检查 `isGamepadListenerActive` 状态
2. 验证 `UserInputService.InputChanged` 事件触发
3. 确认 `handleGamepadInputChanged()` 处理逻辑
4. 查看死区和灵敏度配置
5. 测试键名生成逻辑

## 未来改进

- [ ] 手柄连接/断开事件处理
- [ ] 每手柄独立配置
- [ ] 输入历史记录和回放
- [ ] 高级过滤算法（如低通滤波）
- [ ] 热插拔支持
- [ ] 输入映射配置UI

## 总结

新的摇杆输入系统提供了完整的、生产就绪的游戏手柄支持。通过事件驱动的架构、灵活的配置选项和向后兼容的API，开发者可以轻松实现高质量的游戏手柄控制体验。