# bevy_input 模块操作手册

## 1. 模块概述

`bevy_input` 是一个轻量级输入管理系统，基于 Bevy 设计理念，适配 Roblox 平台。该模块提供了统一的输入抽象层，支持多种输入设备和手势识别。

### 1.1 核心特性

- **统一输入接口**: 为键盘、鼠标、游戏手柄和触摸提供一致的 API
- **三态输入管理**: 支持 `pressed`、`just_pressed`、`just_released` 三种状态
- **事件驱动架构**: 基于 ECS 事件系统，解耦输入处理逻辑
- **手势识别**: 内置双指捏合、旋转、平移、双击、长按等手势支持
- **条件系统**: 提供声明式输入条件，用于系统运行控制
- **自动状态管理**: 自动清理每帧的临时状态，防止状态泄漏

### 1.2 支持的输入设备

- **键盘**: 物理键码和逻辑键（考虑键盘布局）
- **鼠标**: 按钮、移动、滚轮、位置跟踪
- **游戏手柄**: 按钮、摇杆轴、扳机、十字键
- **触摸屏**: 多点触摸、手势识别

### 1.3 模块结构

```
bevy_input/
├── plugin.ts              # 输入插件，集成到 App
├── button-input.ts        # 通用按钮输入状态管理
├── keyboard.ts            # 键盘输入
├── mouse.ts               # 鼠标输入（状态累积器）
├── mouse-events.ts        # 鼠标事件定义
├── gamepad.ts             # 游戏手柄输入
├── touch.ts               # 触摸输入
├── gestures.ts            # 手势识别系统
├── common-conditions.ts   # 输入条件函数
├── axis.ts                # 轴输入抽象
└── resource-storage.ts    # 资源存储辅助函数
```

---

## 2. 输入系统架构

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                      InputPlugin                             │
│  (监听 Roblox UserInputService 事件)                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─► KeyboardInput      → ButtonInput<KeyCode>
                 ├─► MouseButtonInput   → ButtonInput<MouseButton>
                 ├─► GamepadInput       → GamepadManager
                 ├─► TouchInput         → Touches
                 └─► GestureEvents      → GestureManager
                             │
                             ▼
                   ┌─────────────────────┐
                   │   Event System      │
                   │  (MessageRegistry)  │
                   └─────────────────────┘
                             │
                             ▼
                   ┌─────────────────────┐
                   │  User Systems       │
                   │  (读取输入状态)    │
                   └─────────────────────┘
```

### 2.2 三态状态机

每个输入都维护三个状态：

```
┌──────────────┐   press()    ┌──────────────┐
│   Released   │─────────────►│   Pressed    │
│              │              │ just_pressed │
└──────────────┘              └──────────────┘
       ▲                             │
       │                             │ clear()
       │                             ▼
       │                      ┌──────────────┐
       │                      │   Pressed    │
       │                      │   (持续)     │
       │                      └──────────────┘
       │                             │
       │        release()            │
       └─────────────────────────────┘
            just_released
```

### 2.3 资源管理

所有输入资源通过 `ResourceStorage` 存储在 `World` 中：

```typescript
// 键盘输入
const keyboard = getKeyboardInput(world);
if (keyboard?.isPressed(Enum.KeyCode.W)) { /* ... */ }

// 鼠标输入
const mouse = getMouseInput(world);
if (mouse?.justPressed(Enum.UserInputType.MouseButton1)) { /* ... */ }

// 游戏手柄
const gamepadManager = getGamepadManager(world);
const gamepad = gamepadManager?.get(Enum.UserInputType.Gamepad1);
```

---

## 3. API 详解

### 3.1 插件初始化

```typescript
import { App } from "@white-dragon-bevy/bevy-framework/bevy_app";
import { InputPlugin } from "@white-dragon-bevy/bevy-framework/bevy_input";

const app = new App();
app.addPlugin(new InputPlugin());
```

**说明**:
- `InputPlugin` 只在客户端运行（服务端自动跳过）
- 自动注册所有输入资源到 World
- 自动设置 Roblox `UserInputService` 事件监听器
- 在 `PreUpdate` 阶段自动清理上一帧的 `just_*` 状态

### 3.2 ButtonInput<T> - 通用按钮状态管理

`ButtonInput<T>` 是所有按钮输入的基础类，提供三态状态管理。

#### 核心方法

```typescript
class ButtonInput<T> {
	// 状态查询
	isPressed(input: T): boolean;           // 是否正在按下
	justPressed(input: T): boolean;         // 是否刚按下（本帧）
	justReleased(input: T): boolean;        // 是否刚释放（本帧）

	// 批量查询
	anyPressed(inputs: Array<T>): boolean;      // 任意一个按下
	allPressed(inputs: Array<T>): boolean;      // 全部按下
	anyJustPressed(inputs: Array<T>): boolean;  // 任意一个刚按下
	allJustPressed(inputs: Array<T>): boolean;  // 全部刚按下
	anyJustReleased(inputs: Array<T>): boolean; // 任意一个刚释放
	allJustReleased(inputs: Array<T>): boolean; // 全部刚释放

	// 状态修改（通常由插件内部调用）
	press(input: T): void;          // 注册按下事件
	release(input: T): void;        // 注册释放事件
	releaseAll(): void;             // 释放所有按键

	// 状态清理
	clear(): void;                  // 清除 just_* 状态
	reset(input: T): void;          // 重置特定输入的所有状态
	resetAll(): void;               // 重置所有输入状态
}
```

#### 使用示例

```typescript
import { getKeyboardInput } from "@white-dragon-bevy/bevy-framework/bevy_input";

function movementSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (!keyboard) return;

	// 持续移动（按住时）
	if (keyboard.isPressed(Enum.KeyCode.W)) {
		moveForward();
	}

	// 跳跃（按下时触发一次）
	if (keyboard.justPressed(Enum.KeyCode.Space)) {
		jump();
	}

	// 组合键检测
	if (keyboard.allPressed([Enum.KeyCode.LeftControl, Enum.KeyCode.S])) {
		quickSave();
	}
}
```

### 3.3 键盘输入

#### 资源访问

```typescript
import {
	getKeyboardInput,  // ButtonInput<KeyCode> - 物理键码
	getKeyInput        // ButtonInput<Key> - 逻辑键（字符）
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function keyboardSystem(world: World) {
	const keyboard = getKeyboardInput(world);  // 物理键
	const keyInput = getKeyInput(world);       // 逻辑键

	// 物理键检测（不考虑键盘布局）
	if (keyboard?.isPressed(Enum.KeyCode.W)) {
		// WASD 键盘上的 W 键，无论什么语言布局
	}

	// 逻辑键检测（考虑键盘布局）
	if (keyInput?.isPressed("a")) {
		// 实际输入的 "a" 字符
	}
}
```

#### 事件系统

```typescript
import {
	KeyboardInput,      // 键盘输入事件
	KeyboardFocusLost   // 焦点丢失事件
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function keyEventSystem(world: World, events: MessageReader<KeyboardInput>) {
	for (const event of events.read()) {
		print(`按键: ${event.keyCode.Name}`);
		print(`逻辑键: ${event.logicalKey}`);
		print(`状态: ${event.state === ButtonState.Pressed ? "按下" : "释放"}`);
		print(`文本: ${event.textValue}`);
		print(`重复: ${event.repeatFlag}`);
	}
}
```

#### 条件函数（快捷方式）

```typescript
import { KeyboardConditions } from "@white-dragon-bevy/bevy-framework/bevy_input";

app.addSystems(
	MainScheduleLabel.UPDATE,
	movementSystem.runIf(
		KeyboardConditions.pressed(Enum.KeyCode.W)
	)
);

app.addSystems(
	MainScheduleLabel.UPDATE,
	toggleDebugMode.runIf(
		KeyboardConditions.justPressed(Enum.KeyCode.F3)
	)
);
```

### 3.4 鼠标输入

#### 按钮状态

```typescript
import { getMouseInput } from "@white-dragon-bevy/bevy-framework/bevy_input";

function mouseButtonSystem(world: World) {
	const mouse = getMouseInput(world);
	if (!mouse) return;

	// 左键
	if (mouse.justPressed(Enum.UserInputType.MouseButton1)) {
		shoot();
	}

	// 右键
	if (mouse.isPressed(Enum.UserInputType.MouseButton2)) {
		aim();
	}

	// 中键
	if (mouse.justReleased(Enum.UserInputType.MouseButton3)) {
		resetCamera();
	}
}
```

#### 鼠标移动累积器

```typescript
import {
	getMouseMotion,
	AccumulatedMouseMotion
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function cameraControlSystem(world: World) {
	const mouseMotion = getMouseMotion(world);
	if (!mouseMotion) return;

	// 获取并消费累积的移动数据
	const delta = mouseMotion.consume();
	if (delta) {
		const [deltaX, deltaY] = delta;
		rotateCamera(deltaX, deltaY);
	}

	// 或者只查看不消费
	const [peekX, peekY] = mouseMotion.peek();
	if (mouseMotion.hasData()) {
		print(`鼠标移动: (${peekX}, ${peekY})`);
	}
}
```

#### 鼠标位置跟踪

```typescript
import { getMousePosition } from "@white-dragon-bevy/bevy-framework/bevy_input";

function cursorSystem(world: World) {
	const mousePos = getMousePosition(world);
	if (!mousePos) return;

	const current = mousePos.getPosition();      // 当前位置
	const last = mousePos.getLastPosition();     // 上一帧位置
	const delta = mousePos.getDelta();           // 移动增量

	updateCursor(current);
}
```

#### 鼠标滚轮

```typescript
import { getMouseWheel } from "@white-dragon-bevy/bevy-framework/bevy_input";

function zoomSystem(world: World) {
	const mouseWheel = getMouseWheel(world);
	if (!mouseWheel) return;

	const scrollDelta = mouseWheel.consume();
	if (scrollDelta !== undefined) {
		if (scrollDelta > 0) {
			zoomIn(scrollDelta);
		} else {
			zoomOut(-scrollDelta);
		}
	}
}
```

#### 鼠标事件

```typescript
import {
	MouseButtonInput,  // 鼠标按钮事件
	MouseMotion,       // 鼠标移动事件
	MouseWheel,        // 鼠标滚轮事件
	CursorMoved        // 光标移动事件
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function mouseEventSystem(
	world: World,
	buttonEvents: MessageReader<MouseButtonInput>,
	motionEvents: MessageReader<MouseMotion>,
	wheelEvents: MessageReader<MouseWheel>,
	cursorEvents: MessageReader<CursorMoved>
) {
	// 按钮事件
	for (const event of buttonEvents.read()) {
		print(`鼠标按钮: ${event.button}, 状态: ${event.state}`);
	}

	// 移动事件
	for (const event of motionEvents.read()) {
		print(`鼠标移动: (${event.deltaX}, ${event.deltaY})`);
	}

	// 滚轮事件
	for (const event of wheelEvents.read()) {
		print(`滚轮: ${event.deltaY}`);
	}

	// 光标事件
	for (const event of cursorEvents.read()) {
		print(`光标位置: ${event.position}, 增量: ${event.delta}`);
	}
}
```

### 3.5 游戏手柄输入

#### 游戏手柄管理

```typescript
import {
	getGamepadManager,
	GamepadButton,
	GamepadAxis
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function gamepadSystem(world: World) {
	const gamepadManager = getGamepadManager(world);
	if (!gamepadManager) return;

	// 获取特定游戏手柄
	const gamepad = gamepadManager.get(Enum.UserInputType.Gamepad1);
	if (!gamepad) return;

	// 按钮检测
	if (gamepad.pressed(GamepadButton.South)) {
		jump();
	}

	if (gamepad.justPressed(GamepadButton.Start)) {
		pauseGame();
	}

	// 摇杆输入
	const leftStick = gamepad.leftStick();
	if (leftStick.Magnitude > 0.1) {
		move(leftStick);
	}

	const rightStick = gamepad.rightStick();
	if (rightStick.Magnitude > 0.1) {
		rotateCamera(rightStick);
	}

	// 轴值读取
	const leftTrigger = gamepad.getAxis(GamepadAxis.LeftTriggerAxis);
	if (leftTrigger > 0.5) {
		brake(leftTrigger);
	}

	// 十字键
	const dpad = gamepad.dpad();
	if (dpad.Y > 0) {
		selectUp();
	}
}
```

#### 遍历所有游戏手柄

```typescript
function multiPlayerSystem(world: World) {
	const gamepadManager = getGamepadManager(world);
	if (!gamepadManager) return;

	const allGamepads = gamepadManager.getAll();
	for (const gamepad of allGamepads) {
		print(`游戏手柄 ${gamepad.id.Name}: ${gamepad.name}`);

		if (gamepad.justPressed(GamepadButton.South)) {
			playerJump(gamepad.id);
		}
	}
}
```

#### 游戏手柄事件

```typescript
import {
	GamepadConnectionEvent,           // 连接/断开事件
	GamepadButtonChangedEvent,        // 按钮变化事件
	GamepadAxisChangedEvent,          // 轴变化事件
	GamepadConnection
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function gamepadEventSystem(
	world: World,
	connectionEvents: MessageReader<GamepadConnectionEvent>,
	buttonEvents: MessageReader<GamepadButtonChangedEvent>,
	axisEvents: MessageReader<GamepadAxisChangedEvent>
) {
	// 连接事件
	for (const event of connectionEvents.read()) {
		if (event.connection === GamepadConnection.Connected) {
			print(`游戏手柄已连接: ${event.gamepad.Name}`);
		} else {
			print(`游戏手柄已断开: ${event.gamepad.Name}`);
		}
	}

	// 按钮事件
	for (const event of buttonEvents.read()) {
		print(`按钮 ${event.button} 值: ${event.value}`);
	}

	// 轴事件
	for (const event of axisEvents.read()) {
		print(`轴 ${event.axis} 值: ${event.value}`);
	}
}
```

#### 自定义游戏手柄设置

```typescript
import {
	GamepadSettings,
	ButtonSettings,
	AxisSettings
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function setupGamepad(world: World) {
	const gamepadManager = getGamepadManager(world);
	if (!gamepadManager) return;

	// 自定义按钮阈值
	const customButtonSettings = new ButtonSettings(
		0.8,  // pressThreshold - 按下阈值
		0.7   // releaseThreshold - 释放阈值
	);

	gamepadManager.settings.buttonSettings.set(
		GamepadButton.LeftTrigger,
		customButtonSettings
	);

	// 自定义轴设置（死区、活动区）
	const customAxisSettings = new AxisSettings(
		-0.15,  // deadzoneLowerBound
		0.15,   // deadzoneUpperBound
		-0.9,   // livezoneLowerBound
		0.9,    // livezoneUpperBound
		0.02    // threshold
	);

	gamepadManager.settings.axisSettings.set(
		GamepadAxis.LeftStickX,
		customAxisSettings
	);
}
```

### 3.6 手势识别

#### 手势管理器

```typescript
import {
	getGestureManager,
	PinchGesture,
	RotationGesture,
	PanGesture,
	DoubleTapGesture,
	LongPressGesture,
	GestureState
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function gestureSystem(
	world: World,
	pinchEvents: MessageReader<PinchGesture>,
	rotationEvents: MessageReader<RotationGesture>,
	panEvents: MessageReader<PanGesture>,
	doubleTapEvents: MessageReader<DoubleTapGesture>,
	longPressEvents: MessageReader<LongPressGesture>
) {
	// 双指捏合（缩放）
	for (const gesture of pinchEvents.read()) {
		if (gesture.state === GestureState.Changed) {
			zoom(gesture.scale);
		}
	}

	// 双指旋转
	for (const gesture of rotationEvents.read()) {
		if (gesture.state === GestureState.Changed) {
			rotate(gesture.rotation);
		}
	}

	// 平移
	for (const gesture of panEvents.read()) {
		if (gesture.state === GestureState.Changed) {
			pan(gesture.delta);
		}
	}

	// 双击
	for (const gesture of doubleTapEvents.read()) {
		print(`双击位置: ${gesture.position}`);
		handleDoubleTap(gesture.position);
	}

	// 长按
	for (const gesture of longPressEvents.read()) {
		if (gesture.state === GestureState.Started) {
			showContextMenu(gesture.position);
		}
	}
}
```

#### 自定义手势配置

```typescript
import {
	GestureManager,
	DEFAULT_GESTURE_CONFIG
} from "@white-dragon-bevy/bevy-framework/bevy_input";

const customConfig = {
	...DEFAULT_GESTURE_CONFIG,
	doubleTapMaxInterval: 0.2,      // 双击最大间隔（秒）
	doubleTapMaxDistance: 30,       // 双击最大距离（像素）
	enablePinch: true,              // 启用捏合
	enableRotation: true,           // 启用旋转
	enablePan: true,                // 启用平移
	enableDoubleTap: true,          // 启用双击
	enableLongPress: false          // 禁用长按
};

const gestureManager = new GestureManager(customConfig);
```

### 3.7 条件系统

条件系统提供声明式的输入检测，用于控制系统运行。

#### 基础条件函数

```typescript
import {
	inputPressed,
	inputJustPressed,
	inputJustReleased,
	inputToggleActive,
	anyInputPressed,
	allInputPressed,
	InputResources
} from "@white-dragon-bevy/bevy-framework/bevy_input";

// 检测是否正在按下
const wPressed = inputPressed(
	Enum.KeyCode.W,
	InputResources.Keyboard
);

// 检测是否刚按下
const spaceJustPressed = inputJustPressed(
	Enum.KeyCode.Space,
	InputResources.Keyboard
);

// 检测是否刚释放
const escJustReleased = inputJustReleased(
	Enum.KeyCode.Escape,
	InputResources.Keyboard
);

// 切换状态（每次按下切换）
const debugModeToggle = inputToggleActive(
	false,  // 默认关闭
	Enum.KeyCode.F3,
	InputResources.Keyboard
);

// 任意一个按下
const movementKeys = anyInputPressed(
	[Enum.KeyCode.W, Enum.KeyCode.A, Enum.KeyCode.S, Enum.KeyCode.D],
	InputResources.Keyboard
);

// 全部按下
const ctrlS = allInputPressed(
	[Enum.KeyCode.LeftControl, Enum.KeyCode.S],
	InputResources.Keyboard
);
```

#### 条件组合

```typescript
import {
	andConditions,
	orConditions,
	notCondition
} from "@white-dragon-bevy/bevy-framework/bevy_input";

// AND: 所有条件都满足
const runCondition = andConditions(
	inputPressed(Enum.KeyCode.W, InputResources.Keyboard),
	inputPressed(Enum.KeyCode.LeftShift, InputResources.Keyboard)
);

// OR: 任意条件满足
const jumpCondition = orConditions(
	inputJustPressed(Enum.KeyCode.Space, InputResources.Keyboard),
	inputJustPressed(GamepadButton.South, InputResources.Gamepad)
);

// NOT: 条件取反
const notPaused = notCondition(
	inputPressed(Enum.KeyCode.Escape, InputResources.Keyboard)
);
```

#### 在系统中使用条件

```typescript
import { MainScheduleLabel } from "@white-dragon-bevy/bevy-framework/bevy_app";
import { KeyboardConditions, MouseConditions } from "@white-dragon-bevy/bevy-framework/bevy_input";

// 仅在按 W 键时运行
app.addSystems(
	MainScheduleLabel.UPDATE,
	moveForwardSystem.runIf(
		KeyboardConditions.pressed(Enum.KeyCode.W)
	)
);

// 仅在按空格键时运行一次
app.addSystems(
	MainScheduleLabel.UPDATE,
	jumpSystem.runIf(
		KeyboardConditions.justPressed(Enum.KeyCode.Space)
	)
);

// 仅在按住鼠标右键时运行
app.addSystems(
	MainScheduleLabel.UPDATE,
	aimSystem.runIf(
		MouseConditions.pressed(Enum.UserInputType.MouseButton2)
	)
);

// 切换调试模式（每次按 F3 切换）
app.addSystems(
	MainScheduleLabel.UPDATE,
	debugOverlaySystem.runIf(
		KeyboardConditions.toggleActive(false, Enum.KeyCode.F3)
	)
);
```

---

## 4. 实战示例

### 4.1 第一人称角色移动

```typescript
import { World } from "@rbxts/matter";
import {
	getKeyboardInput,
	getMouseMotion,
	MouseConditions
} from "@white-dragon-bevy/bevy-framework/bevy_input";

// WASD 移动
function movementSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (!keyboard) return;

	let moveDirection = new Vector3(0, 0, 0);

	if (keyboard.isPressed(Enum.KeyCode.W)) {
		moveDirection = moveDirection.add(new Vector3(0, 0, -1));
	}
	if (keyboard.isPressed(Enum.KeyCode.S)) {
		moveDirection = moveDirection.add(new Vector3(0, 0, 1));
	}
	if (keyboard.isPressed(Enum.KeyCode.A)) {
		moveDirection = moveDirection.add(new Vector3(-1, 0, 0));
	}
	if (keyboard.isPressed(Enum.KeyCode.D)) {
		moveDirection = moveDirection.add(new Vector3(1, 0, 0));
	}

	if (moveDirection.Magnitude > 0) {
		const normalized = moveDirection.Unit;
		const speed = keyboard.isPressed(Enum.KeyCode.LeftShift) ? 16 : 8;
		moveCharacter(normalized.mul(speed));
	}
}

// 鼠标视角控制
function cameraRotationSystem(world: World) {
	const mouseMotion = getMouseMotion(world);
	if (!mouseMotion) return;

	const delta = mouseMotion.consume();
	if (delta) {
		const [deltaX, deltaY] = delta;
		const sensitivity = 0.002;

		rotateCamera(
			deltaX * sensitivity,
			deltaY * sensitivity
		);
	}
}

// 仅在按住右键时旋转相机
app.addSystems(
	MainScheduleLabel.UPDATE,
	cameraRotationSystem.runIf(
		MouseConditions.pressed(Enum.UserInputType.MouseButton2)
	)
);
```

### 4.2 按键检测与交互

```typescript
import { World } from "@rbxts/matter";
import {
	getKeyboardInput,
	KeyboardConditions
} from "@white-dragon-bevy/bevy-framework/bevy_input";

// 跳跃（单次触发）
function jumpSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (!keyboard) return;

	if (keyboard.justPressed(Enum.KeyCode.Space)) {
		playerJump();
	}
}

// 交互（按 E 键）
function interactSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (!keyboard) return;

	if (keyboard.justPressed(Enum.KeyCode.E)) {
		const target = getInteractTarget();
		if (target) {
			interact(target);
		}
	}
}

// 组合键：Ctrl+S 保存
function saveSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (!keyboard) return;

	if (
		keyboard.isPressed(Enum.KeyCode.LeftControl) &&
		keyboard.justPressed(Enum.KeyCode.S)
	) {
		saveGame();
	}
}

// 使用条件运行
app.addSystems(
	MainScheduleLabel.UPDATE,
	saveSystem.runIf(
		KeyboardConditions.allPressed([
			Enum.KeyCode.LeftControl,
			Enum.KeyCode.S
		])
	)
);
```

### 4.3 鼠标瞄准与射击

```typescript
import { World } from "@rbxts/matter";
import {
	getMouseInput,
	getMousePosition,
	MouseConditions
} from "@white-dragon-bevy/bevy-framework/bevy_input";

// 瞄准系统（按住右键）
function aimSystem(world: World) {
	const mousePos = getMousePosition(world);
	if (!mousePos) return;

	const screenPos = mousePos.getPosition();
	const worldPos = screenToWorld(screenPos);

	aimAtTarget(worldPos);
	showCrosshair(screenPos);
}

// 射击系统（点击左键）
function shootSystem(world: World) {
	const mouse = getMouseInput(world);
	const mousePos = getMousePosition(world);
	if (!mouse || !mousePos) return;

	if (mouse.justPressed(Enum.UserInputType.MouseButton1)) {
		const target = mousePos.getPosition();
		shoot(target);
	}
}

// 仅在瞄准时运行射击系统
app.addSystems(
	MainScheduleLabel.UPDATE,
	aimSystem.runIf(
		MouseConditions.pressed(Enum.UserInputType.MouseButton2)
	)
);

app.addSystems(
	MainScheduleLabel.UPDATE,
	shootSystem.runIf(
		MouseConditions.justPressed(Enum.UserInputType.MouseButton1)
	)
);
```

### 4.4 滚轮缩放

```typescript
import { World } from "@rbxts/matter";
import { getMouseWheel } from "@white-dragon-bevy/bevy-framework/bevy_input";

let currentZoom = 10;
const minZoom = 5;
const maxZoom = 50;

function zoomSystem(world: World) {
	const mouseWheel = getMouseWheel(world);
	if (!mouseWheel) return;

	const scrollDelta = mouseWheel.consume();
	if (scrollDelta !== undefined) {
		// 正值 = 放大，负值 = 缩小
		const zoomSpeed = 2;
		currentZoom = math.clamp(
			currentZoom - scrollDelta * zoomSpeed,
			minZoom,
			maxZoom
		);

		setCameraDistance(currentZoom);
	}
}
```

### 4.5 游戏手柄支持

```typescript
import { World } from "@rbxts/matter";
import {
	getGamepadManager,
	GamepadButton,
	GamepadAxis
} from "@white-dragon-bevy/bevy-framework/bevy_input";

function gamepadMovementSystem(world: World) {
	const gamepadManager = getGamepadManager(world);
	if (!gamepadManager) return;

	// 支持多个手柄
	const allGamepads = gamepadManager.getAll();
	for (const gamepad of allGamepads) {
		// 左摇杆移动
		const leftStick = gamepad.leftStick();
		if (leftStick.Magnitude > 0.1) {
			const direction = new Vector3(leftStick.X, 0, -leftStick.Y);
			moveCharacter(direction.mul(16));
		}

		// 右摇杆旋转视角
		const rightStick = gamepad.rightStick();
		if (rightStick.Magnitude > 0.1) {
			rotateCamera(rightStick.X * 0.05, rightStick.Y * 0.05);
		}

		// A 键跳跃
		if (gamepad.justPressed(GamepadButton.South)) {
			playerJump();
		}

		// 左扳机刹车
		const leftTrigger = gamepad.getAxis(GamepadAxis.LeftTriggerAxis);
		if (leftTrigger > 0.1) {
			brake(leftTrigger);
		}

		// 右扳机加速
		const rightTrigger = gamepad.getAxis(GamepadAxis.RightTriggerAxis);
		if (rightTrigger > 0.1) {
			accelerate(rightTrigger);
		}
	}
}
```

### 4.6 触摸手势识别

```typescript
import { World } from "@rbxts/matter";
import {
	PinchGesture,
	RotationGesture,
	PanGesture,
	DoubleTapGesture,
	GestureState
} from "@white-dragon-bevy/bevy-framework/bevy_input";
import { MessageReader } from "@white-dragon-bevy/bevy-framework/bevy_ecs";

function touchGestureSystem(
	world: World,
	pinchEvents: MessageReader<PinchGesture>,
	rotationEvents: MessageReader<RotationGesture>,
	panEvents: MessageReader<PanGesture>,
	doubleTapEvents: MessageReader<DoubleTapGesture>
) {
	// 双指捏合缩放
	for (const gesture of pinchEvents.read()) {
		if (gesture.state === GestureState.Changed) {
			const zoomFactor = 1 + gesture.delta;
			scaleObject(zoomFactor);
		}
	}

	// 双指旋转
	for (const gesture of rotationEvents.read()) {
		if (gesture.state === GestureState.Changed) {
			rotateObject(gesture.delta);
		}
	}

	// 平移
	for (const gesture of panEvents.read()) {
		if (gesture.state === GestureState.Changed) {
			moveObject(gesture.delta);
		}

		if (gesture.state === GestureState.Ended) {
			// 应用惯性
			applyInertia(gesture.velocity);
		}
	}

	// 双击重置
	for (const gesture of doubleTapEvents.read()) {
		resetObjectTransform();
	}
}
```

### 4.7 输入绑定系统

创建一个可配置的输入绑定系统：

```typescript
import { World } from "@rbxts/matter";
import {
	getKeyboardInput,
	getGamepadManager,
	GamepadButton
} from "@white-dragon-bevy/bevy-framework/bevy_input";

interface InputAction {
	name: string;
	keyboardKeys: Array<Enum.KeyCode>;
	gamepadButtons: Array<GamepadButton>;
}

class InputBindings {
	private actions: Map<string, InputAction> = new Map();

	public register(action: InputAction): void {
		this.actions.set(action.name, action);
	}

	public isPressed(world: World, actionName: string): boolean {
		const action = this.actions.get(actionName);
		if (!action) return false;

		// 检查键盘
		const keyboard = getKeyboardInput(world);
		if (keyboard) {
			for (const key of action.keyboardKeys) {
				if (keyboard.isPressed(key)) {
					return true;
				}
			}
		}

		// 检查游戏手柄
		const gamepadManager = getGamepadManager(world);
		if (gamepadManager) {
			for (const gamepad of gamepadManager.getAll()) {
				for (const button of action.gamepadButtons) {
					if (gamepad.pressed(button)) {
						return true;
					}
				}
			}
		}

		return false;
	}

	public justPressed(world: World, actionName: string): boolean {
		const action = this.actions.get(actionName);
		if (!action) return false;

		// 检查键盘
		const keyboard = getKeyboardInput(world);
		if (keyboard) {
			for (const key of action.keyboardKeys) {
				if (keyboard.justPressed(key)) {
					return true;
				}
			}
		}

		// 检查游戏手柄
		const gamepadManager = getGamepadManager(world);
		if (gamepadManager) {
			for (const gamepad of gamepadManager.getAll()) {
				for (const button of action.gamepadButtons) {
					if (gamepad.justPressed(button)) {
						return true;
					}
				}
			}
		}

		return false;
	}
}

// 使用示例
const bindings = new InputBindings();

bindings.register({
	name: "Jump",
	keyboardKeys: [Enum.KeyCode.Space],
	gamepadButtons: [GamepadButton.South]
});

bindings.register({
	name: "Attack",
	keyboardKeys: [Enum.KeyCode.LeftControl],
	gamepadButtons: [GamepadButton.West]
});

function actionSystem(world: World) {
	if (bindings.justPressed(world, "Jump")) {
		playerJump();
	}

	if (bindings.isPressed(world, "Attack")) {
		playerAttack();
	}
}
```

---

## 5. 最佳实践

### 5.1 状态管理

#### ✅ 正确的状态检测

```typescript
// 持续动作：使用 isPressed()
if (keyboard.isPressed(Enum.KeyCode.W)) {
	moveForward();  // 每帧执行
}

// 触发动作：使用 justPressed()
if (keyboard.justPressed(Enum.KeyCode.Space)) {
	jump();  // 只执行一次
}

// 释放动作：使用 justReleased()
if (keyboard.justReleased(Enum.KeyCode.R)) {
	stopReloading();  // 松开时执行
}
```

#### ❌ 避免的错误

```typescript
// 错误：使用 justPressed() 进行持续动作
if (keyboard.justPressed(Enum.KeyCode.W)) {
	moveForward();  // 只会执行一帧！
}

// 错误：使用 isPressed() 进行触发动作
if (keyboard.isPressed(Enum.KeyCode.Space)) {
	jump();  // 会连续跳跃！
}
```

### 5.2 性能优化

#### 资源缓存

```typescript
// ✅ 好的做法：缓存资源引用
class PlayerController {
	private keyboard?: ButtonInput<Enum.KeyCode>;
	private mouse?: ButtonInput<Enum.UserInputType>;

	public initialize(world: World): void {
		this.keyboard = getKeyboardInput(world);
		this.mouse = getMouseInput(world);
	}

	public update(): void {
		if (this.keyboard?.isPressed(Enum.KeyCode.W)) {
			this.moveForward();
		}
	}
}

// ❌ 避免：每帧重复查询
function playerSystem(world: World) {
	// 不要每次都调用 getKeyboardInput()
	const keyboard = getKeyboardInput(world);  // 重复查询！
	if (keyboard?.isPressed(Enum.KeyCode.W)) {
		moveForward();
	}
}
```

#### 条件系统

```typescript
// ✅ 使用条件系统避免不必要的系统执行
app.addSystems(
	MainScheduleLabel.UPDATE,
	expensiveSystem.runIf(
		KeyboardConditions.pressed(Enum.KeyCode.F1)
	)
);

// ❌ 避免：在系统内部检查
function expensiveSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (!keyboard?.isPressed(Enum.KeyCode.F1)) {
		return;  // 系统还是会执行！
	}

	// 昂贵的操作...
}
```

### 5.3 事件处理

#### 事件 vs 状态

```typescript
// ✅ 使用状态进行游戏逻辑
function movementSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (keyboard?.isPressed(Enum.KeyCode.W)) {
		moveForward();  // 简单直接
	}
}

// ✅ 使用事件进行日志或 UI 反馈
function inputLoggingSystem(
	world: World,
	events: MessageReader<KeyboardInput>
) {
	for (const event of events.read()) {
		logInputEvent(event);  // 记录所有输入
		updateInputDisplay(event);  // 更新 UI
	}
}

// ❌ 不要混用：用事件做游戏逻辑
function badMovementSystem(
	world: World,
	events: MessageReader<KeyboardInput>
) {
	for (const event of events.read()) {
		if (event.keyCode === Enum.KeyCode.W && event.state === ButtonState.Pressed) {
			moveForward();  // 复杂且容易出错
		}
	}
}
```

### 5.4 跨平台支持

#### 统一输入抽象

```typescript
// ✅ 创建平台无关的输入接口
interface GameInput {
	getMoveDirection(): Vector2;
	getCameraRotation(): Vector2;
	isJumpPressed(): boolean;
	isAttackPressed(): boolean;
}

class KeyboardMouseInput implements GameInput {
	public getMoveDirection(): Vector2 {
		const keyboard = getKeyboardInput(this.world);
		if (!keyboard) return new Vector2(0, 0);

		let x = 0, y = 0;
		if (keyboard.isPressed(Enum.KeyCode.W)) y += 1;
		if (keyboard.isPressed(Enum.KeyCode.S)) y -= 1;
		if (keyboard.isPressed(Enum.KeyCode.A)) x -= 1;
		if (keyboard.isPressed(Enum.KeyCode.D)) x += 1;

		return new Vector2(x, y);
	}

	public getCameraRotation(): Vector2 {
		const motion = getMouseMotion(this.world);
		const delta = motion?.consume();
		return delta ? new Vector2(delta[0], delta[1]) : new Vector2(0, 0);
	}

	public isJumpPressed(): boolean {
		const keyboard = getKeyboardInput(this.world);
		return keyboard?.justPressed(Enum.KeyCode.Space) ?? false;
	}

	public isAttackPressed(): boolean {
		const mouse = getMouseInput(this.world);
		return mouse?.justPressed(Enum.UserInputType.MouseButton1) ?? false;
	}
}

class GamepadInput implements GameInput {
	public getMoveDirection(): Vector2 {
		const manager = getGamepadManager(this.world);
		const gamepad = manager?.get(Enum.UserInputType.Gamepad1);
		return gamepad?.leftStick() ?? new Vector2(0, 0);
	}

	public getCameraRotation(): Vector2 {
		const manager = getGamepadManager(this.world);
		const gamepad = manager?.get(Enum.UserInputType.Gamepad1);
		return gamepad?.rightStick() ?? new Vector2(0, 0);
	}

	public isJumpPressed(): boolean {
		const manager = getGamepadManager(this.world);
		const gamepad = manager?.get(Enum.UserInputType.Gamepad1);
		return gamepad?.justPressed(GamepadButton.South) ?? false;
	}

	public isAttackPressed(): boolean {
		const manager = getGamepadManager(this.world);
		const gamepad = manager?.get(Enum.UserInputType.Gamepad1);
		return gamepad?.justPressed(GamepadButton.West) ?? false;
	}
}

// 使用统一接口
function gameplaySystem(input: GameInput) {
	const moveDir = input.getMoveDirection();
	if (moveDir.Magnitude > 0) {
		moveCharacter(moveDir);
	}

	if (input.isJumpPressed()) {
		playerJump();
	}
}
```

### 5.5 调试技巧

#### 输入日志系统

```typescript
function inputDebugSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	const mouse = getMouseInput(world);
	const mousePos = getMousePosition(world);

	// 显示所有按下的键
	const pressedKeys = keyboard?.getPressed();
	if (pressedKeys && pressedKeys.size() > 0) {
		const keys: Array<string> = [];
		for (const key of pressedKeys) {
			keys.push(key.Name);
		}
		print(`按下的键: ${keys.join(", ")}`);
	}

	// 显示鼠标状态
	const mouseButtons = mouse?.getPressed();
	if (mouseButtons && mouseButtons.size() > 0) {
		print(`按下的鼠标按钮: ${mouseButtons.size()}`);
	}

	// 显示鼠标位置
	if (mousePos) {
		const pos = mousePos.getPosition();
		print(`鼠标位置: (${pos.X}, ${pos.Y})`);
	}
}

// 仅在调试模式启用
app.addSystems(
	MainScheduleLabel.UPDATE,
	inputDebugSystem.runIf(
		KeyboardConditions.toggleActive(false, Enum.KeyCode.F12)
	)
);
```

#### 可视化输入状态

```typescript
function inputVisualizerSystem(world: World) {
	const gamepadManager = getGamepadManager(world);
	if (!gamepadManager) return;

	const gamepad = gamepadManager.get(Enum.UserInputType.Gamepad1);
	if (!gamepad) return;

	// 绘制摇杆状态
	const leftStick = gamepad.leftStick();
	drawStickVisualizer("Left Stick", leftStick, new Vector2(100, 100));

	const rightStick = gamepad.rightStick();
	drawStickVisualizer("Right Stick", rightStick, new Vector2(300, 100));

	// 显示按钮状态
	const buttons = [
		GamepadButton.South,
		GamepadButton.East,
		GamepadButton.West,
		GamepadButton.North
	];

	for (let index = 0; index < buttons.size(); index++) {
		const button = buttons[index];
		const pressed = gamepad.pressed(button);
		const value = gamepad.getButtonValue(button);
		drawButtonState(button, pressed, value, index);
	}
}
```

### 5.6 安全检查

```typescript
// ✅ 始终检查资源是否存在
function safeInputSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (!keyboard) {
		warn("Keyboard input not available");
		return;
	}

	if (keyboard.isPressed(Enum.KeyCode.W)) {
		moveForward();
	}
}

// ✅ 检查游戏手柄连接
function gamepadSystem(world: World) {
	const manager = getGamepadManager(world);
	if (!manager) return;

	const gamepad = manager.get(Enum.UserInputType.Gamepad1);
	if (!gamepad) {
		// 游戏手柄未连接
		showGamepadPrompt();
		return;
	}

	// 处理游戏手柄输入...
}

// ✅ 处理可选值
function mouseWheelSystem(world: World) {
	const wheel = getMouseWheel(world);
	if (!wheel) return;

	const delta = wheel.consume();
	if (delta !== undefined) {
		// 有滚轮输入
		zoom(delta);
	}
}
```

### 5.7 避免常见错误

#### 错误 1: 忘记清理状态

```typescript
// ❌ 错误：手动管理输入状态
class BadInputManager {
	private jumpPressed = false;

	public update(world: World): void {
		const keyboard = getKeyboardInput(world);
		if (keyboard?.justPressed(Enum.KeyCode.Space)) {
			this.jumpPressed = true;
		}

		if (this.jumpPressed) {
			jump();
			// 忘记重置！会一直跳！
		}
	}
}

// ✅ 正确：使用 ButtonInput 的状态管理
function goodJumpSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	if (keyboard?.justPressed(Enum.KeyCode.Space)) {
		jump();  // justPressed 会自动清理
	}
}
```

#### 错误 2: 混淆物理键和逻辑键

```typescript
// ✅ 使用物理键进行游戏控制
function movementSystem(world: World) {
	const keyboard = getKeyboardInput(world);
	// WASD 布局，无论键盘语言
	if (keyboard?.isPressed(Enum.KeyCode.W)) {
		moveForward();
	}
}

// ✅ 使用逻辑键进行文本输入
function chatSystem(world: World) {
	const keyInput = getKeyInput(world);
	// 获取实际字符
	if (keyInput?.justPressed("a")) {
		addCharToChat("a");
	}
}
```

#### 错误 3: 在错误的调度阶段处理输入

```typescript
// ❌ 错误：在 PreUpdate 之前读取输入
app.addSystems(
	MainScheduleLabel.FIRST,
	earlyInputSystem  // 此时输入可能未更新！
);

// ✅ 正确：在 Update 阶段读取输入
app.addSystems(
	MainScheduleLabel.UPDATE,
	inputSystem  // 输入已准备好
);
```

---

## 6. 高级用法

### 6.1 自定义输入事件

```typescript
import { Message } from "@white-dragon-bevy/bevy-framework/bevy_ecs";

class ComboInputEvent implements Message {
	readonly timestamp?: number;

	constructor(
		public readonly comboName: string,
		public readonly keys: ReadonlyArray<Enum.KeyCode>
	) {}
}

function comboDetectionSystem(
	world: World,
	writer: MessageWriter<ComboInputEvent>
) {
	const keyboard = getKeyboardInput(world);
	if (!keyboard) return;

	// 检测 Ctrl+Shift+T 组合
	if (
		keyboard.isPressed(Enum.KeyCode.LeftControl) &&
		keyboard.isPressed(Enum.KeyCode.LeftShift) &&
		keyboard.justPressed(Enum.KeyCode.T)
	) {
		writer.write(new ComboInputEvent("TeleportCombo", [
			Enum.KeyCode.LeftControl,
			Enum.KeyCode.LeftShift,
			Enum.KeyCode.T
		]));
	}
}
```

### 6.2 输入录制与回放

```typescript
interface InputFrame {
	frame: number;
	keys: Array<Enum.KeyCode>;
	mouseButtons: Array<Enum.UserInputType>;
	mousePosition: Vector2;
}

class InputRecorder {
	private recording: Array<InputFrame> = [];
	private currentFrame = 0;
	private isRecording = false;

	public startRecording(): void {
		this.recording = [];
		this.currentFrame = 0;
		this.isRecording = true;
	}

	public stopRecording(): Array<InputFrame> {
		this.isRecording = false;
		return this.recording;
	}

	public record(world: World): void {
		if (!this.isRecording) return;

		const keyboard = getKeyboardInput(world);
		const mouse = getMouseInput(world);
		const mousePos = getMousePosition(world);

		const frame: InputFrame = {
			frame: this.currentFrame++,
			keys: keyboard ? [...keyboard.getPressed()] : [],
			mouseButtons: mouse ? [...mouse.getPressed()] : [],
			mousePosition: mousePos?.getPosition() ?? new Vector2(0, 0)
		};

		this.recording.push(frame);
	}
}
```

### 6.3 输入缓冲系统

```typescript
class InputBuffer {
	private buffer: Array<{ key: Enum.KeyCode; timestamp: number }> = [];
	private bufferTime = 0.2;  // 200ms 缓冲窗口

	public update(world: World): void {
		const keyboard = getKeyboardInput(world);
		if (!keyboard) return;

		const currentTime = os.clock();

		// 清理过期输入
		this.buffer = this.buffer.filter(
			entry => currentTime - entry.timestamp < this.bufferTime
		);

		// 记录新输入
		for (const key of keyboard.getJustPressed()) {
			this.buffer.push({ key, timestamp: currentTime });
		}
	}

	public consumeInput(key: Enum.KeyCode): boolean {
		const index = this.buffer.findIndex(entry => entry.key === key);
		if (index !== -1) {
			this.buffer.splice(index, 1);
			return true;
		}
		return false;
	}
}

// 使用缓冲系统实现宽松的输入检测
function jumpSystem(world: World, inputBuffer: InputBuffer) {
	if (isOnGround() && inputBuffer.consumeInput(Enum.KeyCode.Space)) {
		jump();  // 即使按键稍早也能触发
	}
}
```

---

## 7. 故障排查

### 7.1 常见问题

#### 问题 1: 输入没有响应

**症状**: 按键或鼠标点击没有反应

**可能原因**:
1. 忘记添加 `InputPlugin`
2. 代码运行在服务端（输入只在客户端可用）
3. 输入被 UI 拦截（`gameProcessed` 参数）

**解决方案**:
```typescript
// 确保添加了插件
app.addPlugin(new InputPlugin());

// 确认运行环境
import { RunService } from "@rbxts/services";
if (RunService.IsClient()) {
	// 客户端代码
}

// 检查资源是否初始化
const keyboard = getKeyboardInput(world);
if (!keyboard) {
	warn("Keyboard input not initialized!");
}
```

#### 问题 2: justPressed 触发多次

**症状**: `justPressed()` 在一次按键时触发多次

**可能原因**:
1. 系统被多次调用（检查系统注册）
2. 没有使用 `clear()` 清理状态
3. 事件处理和状态检查混用

**解决方案**:
```typescript
// 使用 justPressed 而不是事件
if (keyboard.justPressed(Enum.KeyCode.Space)) {
	jump();  // 只触发一次
}

// 不要手动调用 clear()（由插件自动管理）
// keyboard.clear(); // 不需要！
```

#### 问题 3: 游戏手柄未检测到

**症状**: 游戏手柄输入无效

**可能原因**:
1. 游戏手柄未连接
2. Roblox Studio 的游戏手柄模拟未启用
3. 游戏手柄 ID 错误

**解决方案**:
```typescript
// 监听连接事件
function gamepadConnectionSystem(
	world: World,
	events: MessageReader<GamepadConnectionEvent>
) {
	for (const event of events.read()) {
		if (event.connected()) {
			print(`游戏手柄已连接: ${event.gamepad.Name}`);
		}
	}
}

// 检查所有连接的手柄
const manager = getGamepadManager(world);
const allGamepads = manager?.getAll();
print(`已连接 ${allGamepads?.size() ?? 0} 个游戏手柄`);
```

#### 问题 4: 鼠标移动不平滑

**症状**: 鼠标输入有延迟或跳跃

**可能原因**:
1. 忘记消费 `AccumulatedMouseMotion`
2. 在多个系统中重复读取鼠标移动
3. 灵敏度设置不当

**解决方案**:
```typescript
// 只在一个系统中消费鼠标移动
function cameraSystem(world: World) {
	const motion = getMouseMotion(world);
	const delta = motion?.consume();  // 消费后清空
	if (delta) {
		const [x, y] = delta;
		rotateCamera(x, y);
	}
}

// 其他系统使用 peek() 而不消费
function debugSystem(world: World) {
	const motion = getMouseMotion(world);
	const [x, y] = motion?.peek() ?? [0, 0];  // 只查看
	print(`鼠标移动: (${x}, ${y})`);
}
```

### 7.2 性能问题

#### 问题: 输入系统消耗过多 CPU

**优化建议**:

1. **使用条件系统**:
```typescript
// 避免不必要的系统执行
app.addSystems(
	MainScheduleLabel.UPDATE,
	debugSystem.runIf(
		KeyboardConditions.pressed(Enum.KeyCode.F3)
	)
);
```

2. **缓存资源引用**:
```typescript
class InputController {
	private keyboard?: ButtonInput<Enum.KeyCode>;

	public init(world: World): void {
		this.keyboard = getKeyboardInput(world);  // 只查询一次
	}
}
```

3. **减少事件订阅**:
```typescript
// 只订阅需要的事件
function specificEventSystem(
	world: World,
	keyboardEvents: MessageReader<KeyboardInput>
) {
	// 不要订阅不使用的事件类型
}
```

---

## 8. 参考资料

### 8.1 API 索引

#### 核心类型
- `ButtonInput<T>` - 通用按钮输入状态管理器
- `InputPlugin` - 输入系统插件

#### 键盘
- `getKeyboardInput()` - 获取键盘输入资源 (KeyCode)
- `getKeyInput()` - 获取逻辑键输入资源 (Key)
- `KeyboardInput` - 键盘输入事件
- `KeyboardFocusLost` - 焦点丢失事件
- `KeyboardConditions` - 键盘条件函数命名空间

#### 鼠标
- `getMouseInput()` - 获取鼠标按钮输入资源
- `getMouseMotion()` - 获取鼠标移动累积器
- `getMousePosition()` - 获取鼠标位置跟踪器
- `getMouseWheel()` - 获取滚轮累积器
- `AccumulatedMouseMotion` - 鼠标移动累积器
- `AccumulatedMouseWheel` - 滚轮累积器
- `MousePosition` - 鼠标位置跟踪器
- `MouseButton` - 鼠标按钮枚举
- `MouseButtonInput` - 鼠标按钮事件
- `MouseMotion` - 鼠标移动事件
- `MouseWheel` - 滚轮事件
- `CursorMoved` - 光标移动事件
- `MouseConditions` - 鼠标条件函数命名空间

#### 游戏手柄
- `getGamepadManager()` - 获取游戏手柄管理器
- `GamepadManager` - 游戏手柄管理器
- `GamepadState` - 单个游戏手柄状态
- `GamepadSettings` - 游戏手柄设置
- `GamepadButton` - 游戏手柄按钮枚举
- `GamepadAxis` - 游戏手柄轴枚举
- `GamepadConnectionEvent` - 连接/断开事件
- `GamepadButtonChangedEvent` - 按钮变化事件
- `GamepadAxisChangedEvent` - 轴变化事件
- `ButtonSettings` - 按钮设置（阈值）
- `AxisSettings` - 轴设置（死区、活动区）

#### 手势
- `getGestureManager()` - 获取手势管理器
- `GestureManager` - 手势管理器
- `PinchGesture` - 双指捏合手势
- `RotationGesture` - 双指旋转手势
- `PanGesture` - 平移手势
- `DoubleTapGesture` - 双击手势
- `LongPressGesture` - 长按手势
- `GestureState` - 手势状态枚举

#### 条件系统
- `inputPressed()` - 检测输入是否按下
- `inputJustPressed()` - 检测输入是否刚按下
- `inputJustReleased()` - 检测输入是否刚释放
- `inputToggleActive()` - 切换状态条件
- `anyInputPressed()` - 任意输入按下
- `allInputPressed()` - 全部输入按下
- `andConditions()` - AND 条件组合
- `orConditions()` - OR 条件组合
- `notCondition()` - NOT 条件取反

### 8.2 相关文档

- [bevy_app 模块](./bevy_app.md) - 应用程序和插件系统
- [bevy_ecs 模块](./bevy_ecs.md) - ECS 核心功能
- [Roblox UserInputService API](https://create.roblox.com/docs/reference/engine/classes/UserInputService)

### 8.3 示例项目

查看 `src/bevy_input/__tests__` 目录获取更多测试示例：
- `keyboard.spec.ts` - 键盘输入测试
- `mouse.spec.ts` - 鼠标输入测试
- `gamepad.spec.ts` - 游戏手柄测试
- `gestures.spec.ts` - 手势识别测试
- `button-input.spec.ts` - ButtonInput 测试
- `common-conditions.spec.ts` - 条件系统测试

---

**版本**: 1.0.0
**最后更新**: 2025-09
**维护者**: White Dragon Bevy Framework Team