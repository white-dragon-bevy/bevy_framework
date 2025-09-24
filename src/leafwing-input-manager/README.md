# Leafwing Input Manager for Roblox

一个强大的输入管理系统，从 Bevy 的 leafwing-input-manager 移植到 Roblox 平台。该系统提供了输入抽象层，让游戏逻辑与具体的输入设备解耦，实现灵活的输入映射和处理。

## 📋 模块概述

Leafwing Input Manager 是一个专为游戏开发设计的输入管理框架，它将物理输入（键盘、鼠标、手柄）抽象为游戏动作（Action），使得游戏逻辑不需要关心具体的输入来源。

### 核心理念

- **动作抽象**：将输入设备映射到游戏动作，而非直接处理按键
- **类型安全**：使用 TypeScript 的强类型系统确保输入处理的正确性
- **设备无关**：同一个动作可以映射到多个不同的输入源
- **统一接口**：所有输入类型都实现相同的接口，便于统一处理

## ✨ 核心功能

### 已实现功能

1. **输入抽象系统 (Actionlike)**
   - 定义游戏动作的统一接口
   - 支持按钮、轴、双轴和三轴输入类型
   - 提供动作枚举基类 `ActionlikeEnum`

2. **输入类型支持**
   - **键盘输入** (`KeyCode`)：支持所有标准键盘按键
   - **鼠标输入** (`MouseButton`, `MouseMove`, `MouseScroll`)：鼠标按钮和移动
   - **手柄输入** (`GamepadButton`, `GamepadStick`)：游戏手柄按钮和摇杆

3. **中央输入存储 (CentralInputStore)**
   - 统一管理所有输入状态
   - 每帧更新一次，避免重复计算
   - 提供查询接口获取输入值

4. **输入特征系统 (Input Traits)**
   - `Buttonlike`：按钮类输入（开关状态）
   - `Axislike`：单轴输入（-1 到 1）
   - `DualAxislike`：双轴输入（Vector2）
   - `TripleAxislike`：三轴输入（Vector3）

### 待实现功能

- [ ] InputMap：输入映射系统
- [ ] ActionState：动作状态管理
- [ ] 输入冲突检测
- [ ] 输入处理管线
- [ ] 网络同步支持
- [ ] 时间相关功能（按压时长、连击等）

## 📦 安装与设置

### 前置要求

- roblox-ts 编译器
- @rbxts/matter ECS 框架
- @rbxts/services

### 导入模块

```typescript
import {
	// 核心类型
	Actionlike,
	ActionlikeEnum,
	InputControlKind,
	CentralInputStore,

	// 输入类型
	KeyCode,
	ModifierKey,
	MouseButton,
	MouseMove,
	GamepadButton,
	GamepadStick,

	// 更新函数
	updateKeyboardInput,
	updateMouseInput,
} from "@/leafwing-input-manager";
```

## 🎮 使用示例

### 1. 定义游戏动作

```typescript
import { ActionlikeEnum, InputControlKind } from "@/leafwing-input-manager";

// 定义游戏动作枚举
class PlayerAction extends ActionlikeEnum {
	static readonly Jump = new PlayerAction("Jump", InputControlKind.Button);
	static readonly Move = new PlayerAction("Move", InputControlKind.DualAxis);
	static readonly Attack = new PlayerAction("Attack", InputControlKind.Button);
	static readonly Interact = new PlayerAction("Interact", InputControlKind.Button);
	static readonly Sprint = new PlayerAction("Sprint", InputControlKind.Button);
}
```

### 2. 创建输入映射

```typescript
import { KeyCode, MouseButton, GamepadButton } from "@/leafwing-input-manager";

// 创建输入映射（注：InputMap 功能尚未完全实现）
const inputMappings = new Map([
	// 跳跃可以用空格键或手柄A按钮
	[PlayerAction.Jump, [
		KeyCode.from(Enum.KeyCode.Space),
		GamepadButton.south(),  // Xbox A / PlayStation X
	]],

	// 攻击可以用鼠标左键或手柄RT
	[PlayerAction.Attack, [
		MouseButton.left(),
		GamepadButton.rightTrigger(),
	]],

	// 交互用E键或手柄X按钮
	[PlayerAction.Interact, [
		KeyCode.from(Enum.KeyCode.E),
		GamepadButton.west(),  // Xbox X / PlayStation Square
	]],
]);
```

### 3. 初始化输入系统

```typescript
import { CentralInputStore, updateKeyboardInput, updateMouseInput } from "@/leafwing-input-manager";
import { RunService } from "@rbxts/services";

// 创建中央输入存储
const inputStore = new CentralInputStore();

// 在游戏循环中更新输入
RunService.Heartbeat.Connect((deltaTime) => {
	// 清除上一帧的输入状态
	inputStore.clear();

	// 更新各种输入设备的状态
	updateKeyboardInput(inputStore);
	updateMouseInput(inputStore);
	// updateGamepadInput(inputStore); // 如果使用手柄
});
```

### 4. 检查输入状态

```typescript
// 在游戏系统中检查输入
function playerMovementSystem(inputStore: CentralInputStore) {
	// 检查跳跃按键
	const jumpKey = KeyCode.from(Enum.KeyCode.Space);
	if (jumpKey.pressed(inputStore)) {
		// 执行跳跃逻辑
		player.jump();
	}

	// 获取移动输入值（用于模拟摇杆）
	const moveValue = inputStore.dualAxisValue("Movement");
	if (moveValue.Magnitude > 0.1) {
		player.move(moveValue);
	}

	// 检查冲刺是否按住
	const sprintKey = KeyCode.from(Enum.KeyCode.LeftShift);
	const sprintValue = sprintKey.value(inputStore); // 0.0 到 1.0
	player.speedMultiplier = 1 + sprintValue * 0.5; // 按住时速度提升50%
}
```

### 5. 使用修饰键

```typescript
import { ModifierKey } from "@/leafwing-input-manager";

// 创建修饰键（会检查左右两个键）
const shiftKey = ModifierKey.shift();
const ctrlKey = ModifierKey.control();
const altKey = ModifierKey.alt();

// 检查组合键
if (ctrlKey.pressed(inputStore) && KeyCode.from(Enum.KeyCode.S).pressed(inputStore)) {
	// Ctrl+S 被按下，执行保存
	saveGame();
}
```

## 📚 API 参考

### 核心接口

#### `Actionlike`
游戏动作的基础接口。

```typescript
interface Actionlike {
	getInputControlKind(): InputControlKind;
	equals(other: Actionlike): boolean;
	hash(): string;
	toString(): string;
}
```

#### `ActionlikeEnum`
用于创建动作枚举的基类。

```typescript
class ActionlikeEnum implements Actionlike {
	constructor(name: string, controlKind?: InputControlKind);
}
```

### 输入类型

#### `KeyCode`
键盘按键的封装。

```typescript
class KeyCode implements Buttonlike {
	static from(keyCode: Enum.KeyCode): KeyCode;
	pressed(inputStore: CentralInputStore): boolean;
	value(inputStore: CentralInputStore): number; // 0.0 或 1.0
}
```

#### `MouseButton`
鼠标按钮的封装。

```typescript
class MouseButton implements Buttonlike {
	static left(): MouseButton;
	static right(): MouseButton;
	static middle(): MouseButton;
}
```

#### `GamepadButton`
手柄按钮的封装。

```typescript
class GamepadButton implements Buttonlike {
	static south(): GamepadButton;    // A/X
	static east(): GamepadButton;     // B/O
	static north(): GamepadButton;    // Y/△
	static west(): GamepadButton;     // X/□
}
```

### 中央输入存储

#### `CentralInputStore`
管理所有输入状态的中心存储。

```typescript
class CentralInputStore {
	clear(): void;  // 清除所有输入状态

	// 按钮输入
	updateButtonlike(key: string, value: ButtonValue): void;
	pressed(key: string): boolean | undefined;
	buttonValue(key: string): number;

	// 轴输入
	updateAxislike(key: string, value: number): void;
	axisValue(key: string): number;

	// 双轴输入
	updateDualAxislike(key: string, value: Vector2): void;
	dualAxisValue(key: string): Vector2;

	// 三轴输入
	updateTripleAxislike(key: string, value: Vector3): void;
	tripleAxisValue(key: string): Vector3;
}
```

## 📊 实现状态

### ✅ 已完成
- 核心输入抽象层（Actionlike）
- 输入特征系统（Traits）
- 中央输入存储（CentralInputStore）
- 键盘输入支持（KeyCode, ModifierKey）
- 鼠标输入支持（MouseButton, MouseMove, MouseScroll）
- 手柄输入支持（GamepadButton, GamepadStick）
- 基础输入更新函数

### 🚧 进行中
- InputMap 输入映射系统
- ActionState 动作状态管理
- 输入冲突检测系统

### 📅 计划中
- 输入处理管线（死区、灵敏度等）
- 网络同步支持
- 时间相关功能（双击、长按、连击）
- 输入录制与回放
- 自定义输入设备支持

## 🙏 致谢

本项目是 Rust [Bevy](https://bevyengine.org/) 游戏引擎的 [leafwing-input-manager](https://github.com/Leafwing-Studios/leafwing-input-manager) 插件的 Roblox TypeScript 移植版本。

原始项目由 Leafwing Studios 开发，提供了优秀的输入管理架构设计。

## 📄 许可证

本项目遵循与原始 leafwing-input-manager 相同的开源许可证。

## 🤝 贡献

欢迎提交问题报告和功能请求。如果您想要贡献代码，请：

1. Fork 本仓库
2. 创建您的功能分支
3. 提交您的更改
4. 推送到分支
5. 创建 Pull Request

## 📧 联系方式

如有问题或建议，请通过项目 Issues 页面联系我们。