# Leafwing Input Manager 操作手册

## 📋 目录

- [模块概述](#模块概述)
- [核心概念](#核心概念)
- [快速开始](#快速开始)
- [核心 API](#核心-api)
- [输入处理流程](#输入处理流程)
- [实战示例](#实战示例)
- [网络同步](#网络同步)
- [最佳实践](#最佳实践)
- [性能优化](#性能优化)
- [故障排除](#故障排除)

---

## 模块概述

Leafwing Input Manager 是一个强大的输入管理系统,从 Bevy 的 leafwing-input-manager 移植到 Roblox 平台。它提供了一套完整的输入抽象层,让游戏逻辑与具体输入设备解耦。

### 核心特性

- ✅ **输入抽象**: 将物理输入映射到游戏动作,支持动态重绑定
- ✅ **多设备支持**: 统一处理键盘、鼠标、手柄输入
- ✅ **类型安全**: 利用 TypeScript 类型系统确保代码正确性
- ✅ **状态管理**: 完善的按钮状态跟踪 (pressed, justPressed, justReleased)
- ✅ **时间追踪**: 精确记录按键持续时间,支持长按检测
- ✅ **网络同步**: 内置客户端-服务器输入同步机制
- ✅ **固定时间步长**: 支持物理模拟的固定更新循环

### 架构设计

```
┌─────────────────────────────────────────────────────────┐
│                  游戏逻辑层                                │
│          (只关心动作,不关心具体输入设备)                     │
└────────────────┬────────────────────────────────────────┘
                 │
         ┌───────▼────────┐
         │  ActionState   │  动作状态管理
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │   InputMap     │  输入映射系统
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼───┐  ┌────▼────┐  ┌────▼─────┐
│Keyboard│  │  Mouse  │  │ Gamepad  │  物理输入设备
└────────┘  └─────────┘  └──────────┘
```

---

## 核心概念

### 1. Action (动作)

**Action** 是游戏逻辑中的抽象行为,与具体输入设备无关。

```typescript
class PlayerAction extends ActionlikeEnum {
	// 按钮动作
	static readonly Jump = new PlayerAction("Jump", InputControlKind.Button);
	static readonly Attack = new PlayerAction("Attack", InputControlKind.Button);

	// 轴输入动作
	static readonly LookVertical = new PlayerAction("LookVertical", InputControlKind.Axis);

	// 双轴输入动作 (如方向)
	static readonly Move = new PlayerAction("Move", InputControlKind.DualAxis);
}
```

**Action 类型**:
- `Button`: 开关状态 (0.0 或 1.0)
- `Axis`: 单轴连续值 (-1.0 到 1.0)
- `DualAxis`: 双轴向量 (Vector2)
- `TripleAxis`: 三轴向量 (Vector3)

### 2. ActionState (动作状态)

**ActionState** 存储所有动作的当前和历史状态。

```typescript
// 创建动作状态
const actionState = new ActionState<PlayerAction>();

// 查询状态
actionState.pressed(PlayerAction.Jump);          // 是否按下
actionState.justPressed(PlayerAction.Jump);      // 是否刚按下
actionState.justReleased(PlayerAction.Jump);     // 是否刚释放
actionState.getCurrentDuration(PlayerAction.Jump); // 按住多久
```

**核心查询方法**:

| 方法 | 返回类型 | 说明 |
|------|---------|------|
| `pressed(action)` | `boolean` | 当前是否按下 |
| `released(action)` | `boolean` | 当前是否释放 |
| `justPressed(action)` | `boolean` | 本帧是否刚按下 |
| `justReleased(action)` | `boolean` | 本帧是否刚释放 |
| `value(action)` | `number` | 当前值 (0.0-1.0 或 -1.0-1.0) |
| `axisPair(action)` | `{x, y}` | 双轴值 |
| `getCurrentDuration(action)` | `number` | 当前按住时长 (秒) |
| `getPreviousDuration(action)` | `number` | 上一次按住时长 (秒) |

### 3. InputMap (输入映射)

**InputMap** 定义动作到物理输入的映射关系。

```typescript
const inputMap = new InputMap<PlayerAction>();

// 绑定单个输入
inputMap.insert(PlayerAction.Jump, KeyCode.Space);

// 绑定多个输入 (可以用多种方式触发同一动作)
inputMap.insert(PlayerAction.Jump, GamepadButton.ButtonA);

// 移除绑定
inputMap.remove(PlayerAction.Jump, KeyCode.Space);

// 清除动作的所有绑定
inputMap.clearAction(PlayerAction.Jump);
```

### 4. CentralInputStore (中央输入存储)

**CentralInputStore** 统一管理所有输入设备的状态。

```typescript
const inputStore = new CentralInputStore();

// 每帧更新
inputStore.clear();
inputStore.syncFromBevyInput(keyboardInput, mouseInput, mouseMotion, mouseWheel);

// 查询输入
inputStore.pressed("keyboard_Space");
inputStore.buttonValue("keyboard_W");
inputStore.dualAxisValue("gamepad_LeftStick");
```

### 5. Axislike (轴输入)

**AxisDirection** 表示轴的方向:

```typescript
enum AxisDirection {
	Negative = -1,  // 负方向 (左/下)
	Positive = 1,   // 正方向 (右/上)
}

// 检查值是否在特定方向激活
AxisDirection.isActive(AxisDirection.Positive, 0.6, 0.5); // true
AxisDirection.isActive(AxisDirection.Negative, 0.3, 0.5); // false

// 从值转换为方向
AxisDirection.fromValue(0.7);  // AxisDirection.Positive
AxisDirection.fromValue(-0.3); // AxisDirection.Negative
```

**DualAxisDirection** 表示双轴系统中的四个方向:

```typescript
enum DualAxisDirection {
	Up,    // Y轴正方向
	Down,  // Y轴负方向
	Left,  // X轴负方向
	Right, // X轴正方向
}

// 检查向量是否在特定方向
const vector = new Vector2(0.8, 0.3);
DualAxisDirection.isActive(DualAxisDirection.Right, vector); // true

// 获取最显著的方向
DualAxisDirection.fromVector(new Vector2(0.2, 0.9)); // Up
```

---

## 快速开始

### 步骤 1: 定义游戏动作

```typescript
import { ActionlikeEnum, InputControlKind } from "@/leafwing-input-manager";

class PlayerAction extends ActionlikeEnum {
	// 移动
	static readonly MoveForward = new PlayerAction("MoveForward", InputControlKind.Button);
	static readonly MoveBackward = new PlayerAction("MoveBackward", InputControlKind.Button);
	static readonly MoveLeft = new PlayerAction("MoveLeft", InputControlKind.Button);
	static readonly MoveRight = new PlayerAction("MoveRight", InputControlKind.Button);
	static readonly Move = new PlayerAction("Move", InputControlKind.DualAxis);

	// 战斗
	static readonly Attack = new PlayerAction("Attack", InputControlKind.Button);
	static readonly Block = new PlayerAction("Block", InputControlKind.Button);

	// 交互
	static readonly Interact = new PlayerAction("Interact", InputControlKind.Button);
}
```

### 步骤 2: 创建输入映射

```typescript
import { InputMap, KeyCode, MouseButton, GamepadButton, VirtualDPad } from "@/leafwing-input-manager";

const inputMap = new InputMap<PlayerAction>();

// 方向键移动
inputMap.insert(PlayerAction.MoveForward, KeyCode.W);
inputMap.insert(PlayerAction.MoveBackward, KeyCode.S);
inputMap.insert(PlayerAction.MoveLeft, KeyCode.A);
inputMap.insert(PlayerAction.MoveRight, KeyCode.D);

// 虚拟方向盘 (将 WASD 转换为双轴输入)
const movementDpad = new VirtualDPad(KeyCode.W, KeyCode.S, KeyCode.A, KeyCode.D);
inputMap.insert(PlayerAction.Move, movementDpad);

// 鼠标和手柄攻击
inputMap.insert(PlayerAction.Attack, MouseButton.left());
inputMap.insert(PlayerAction.Attack, GamepadButton.ButtonR2);

// 交互键
inputMap.insert(PlayerAction.Interact, KeyCode.E);
inputMap.insert(PlayerAction.Interact, GamepadButton.ButtonX);
```

### 步骤 3: 集成到 Bevy App

```typescript
import { App } from "@/bevy_app";
import { InputManagerPlugin } from "@/leafwing-input-manager";

const app = new App();

// 添加输入管理器插件
const inputPlugin = new InputManagerPlugin({
	actionType: PlayerAction,
	defaultInputMap: inputMap,
	networkSync: {
		enabled: true,
		syncRate: 30,
	},
});

app.addPlugins(inputPlugin);
```

### 步骤 4: 创建玩家实体

```typescript
import { World } from "@rbxts/matter";
import { InputMapComponent, ActionStateComponent } from "@/leafwing-input-manager";

const world = app.getWorld();

// 创建玩家实体
const playerId = world.spawn(
	InputMapComponent(inputMap),
	ActionStateComponent(new ActionState<PlayerAction>()),
);
```

### 步骤 5: 在系统中使用

```typescript
import { MainScheduleLabel } from "@/bevy_app";

app.addSystems(MainScheduleLabel.UPDATE, (world: World) => {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		// 检查跳跃
		if (actionState.justPressed(PlayerAction.Attack)) {
			print("玩家攻击!");
		}

		// 获取移动输入
		const movement = actionState.axisPair(PlayerAction.Move);
		if (movement.x !== 0 || movement.y !== 0) {
			print(`移动: X=${movement.x}, Y=${movement.y}`);
		}

		// 检测长按
		if (actionState.pressed(PlayerAction.Block)) {
			const holdTime = actionState.getCurrentDuration(PlayerAction.Block);
			if (holdTime > 2.0) {
				print("触发强力格挡!");
			}
		}
	}
});
```

---

## 核心 API

### ActionState API

#### 状态查询

```typescript
// 基础状态
actionState.pressed(action: Action): boolean
actionState.released(action: Action): boolean
actionState.justPressed(action: Action): boolean
actionState.justReleased(action: Action): boolean

// 值查询
actionState.value(action: Action): number
actionState.axisPair(action: Action): { x: number; y: number }

// 时间查询
actionState.getCurrentDuration(action: Action): number
actionState.getPreviousDuration(action: Action): number
actionState.whenPressed(action: Action): Instant | undefined
```

#### 手动控制

```typescript
// 手动设置状态
actionState.press(action: Action, value?: number): void
actionState.release(action: Action): void

// 设置轴值
actionState.setAxisValue(action: Action, value: number): void
actionState.setAxisPair(action: Action, axisPair: Vector2): void
```

#### 生命周期

```typescript
// 推进到下一帧
actionState.tick(deltaTime?: number): void
actionState.tickWithInstants(currentInstant: Instant, previousInstant: Instant): void
actionState.tickFixed(fixedDeltaTime: number): void

// 状态切换 (用于固定更新)
actionState.swapToFixedUpdateState(): void
actionState.swapToUpdateState(): void
```

#### 启用/禁用

```typescript
// 禁用特定动作
actionState.disable(action: Action): void
actionState.enable(action: Action): void

// 禁用所有动作
actionState.disableAll(): void
actionState.enableAll(): void

// 检查状态
actionState.isDisabled(action: Action): boolean
actionState.isDisabledAll(): boolean
```

### InputMap API

#### 添加/移除绑定

```typescript
// 单个绑定
inputMap.insert(action: Action, input: UserInput): InputMap<Action>
inputMap.insertMultiple(action: Action, inputs: Array<UserInput>): InputMap<Action>

// 移除绑定
inputMap.remove(action: Action, input: UserInput): boolean
inputMap.clearAction(action: Action): boolean
inputMap.clear(): void
```

#### 查询

```typescript
// 获取绑定
inputMap.getInputs(action: Action): Array<UserInput>
inputMap.getActions(): Array<string>
inputMap.hasAction(action: Action): boolean

// 统计
inputMap.size(): number
```

#### 处理输入

```typescript
// 处理所有输入,生成动作状态
inputMap.processActions(
	inputStore: CentralInputStore,
	previousActions?: HashMap<string, ProcessedActionState>
): UpdatedActions<Action>
```

### 输入类型 API

#### KeyCode (键盘)

```typescript
// 常用按键
KeyCode.W, KeyCode.A, KeyCode.S, KeyCode.D
KeyCode.Space, KeyCode.Tab, KeyCode.Return
KeyCode.LeftShift, KeyCode.LeftControl, KeyCode.LeftAlt

// 自定义按键
KeyCode.from(Enum.KeyCode.F)

// 查询
keyCode.pressed(inputStore: CentralInputStore): boolean
keyCode.value(inputStore: CentralInputStore): number
```

#### MouseButton (鼠标按钮)

```typescript
// 创建
MouseButton.left()
MouseButton.right()
MouseButton.middle()

// 查询
mouseButton.pressed(inputStore: CentralInputStore): boolean
```

#### GamepadButton (手柄按钮)

```typescript
// 创建
GamepadButton.south()       // Xbox A / PlayStation X
GamepadButton.east()        // Xbox B / PlayStation O
GamepadButton.west()        // Xbox X / PlayStation □
GamepadButton.north()       // Xbox Y / PlayStation △
GamepadButton.leftTrigger()
GamepadButton.rightTrigger()

// 查询
gamepadButton.pressed(inputStore: CentralInputStore, gamepadId?: number): boolean
```

#### ModifierKey (修饰键)

```typescript
// 创建 (自动检测左右键)
ModifierKey.shift()
ModifierKey.control()
ModifierKey.alt()

// 查询
modifierKey.pressed(inputStore: CentralInputStore): boolean
```

#### VirtualDPad (虚拟方向盘)

```typescript
// 将四个按键组合成双轴输入
const dpad = new VirtualDPad(
	KeyCode.W,  // 上
	KeyCode.S,  // 下
	KeyCode.A,  // 左
	KeyCode.D,  // 右
);

// 查询双轴值
dpad.axisPair(inputStore: CentralInputStore): Vector2
```

#### InputChord (组合键)

```typescript
// 创建组合键
const ctrlS = InputChord.ctrl(KeyCode.S);
const shiftClick = InputChord.shiftClick();

// 自定义组合
const customChord = new InputChord([
	ModifierKey.control(),
	ModifierKey.shift(),
	KeyCode.S,
]);

// 查询
chord.pressed(inputStore: CentralInputStore): boolean
```

---

## 输入处理流程

### 完整的输入处理循环

```
┌─────────────────────────────────────────────────────────────┐
│  1. PreUpdate 阶段                                           │
│     - tick_action_state: 清除 justPressed/justReleased     │
│     - update_action_state: 更新动作状态                      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│  2. Update 阶段                                              │
│     - 游戏逻辑查询 actionState                               │
│     - 系统处理移动、战斗等逻辑                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│  3. PostUpdate 阶段                                          │
│     - release_on_input_map_removed: 清理移除的映射          │
└─────────────────────────────────────────────────────────────┘
```

### 固定时间步长支持

```typescript
// 在 FixedUpdate 前切换到固定更新状态
app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, (world: World) => {
	// 切换到固定更新状态
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		actionState.swapToFixedUpdateState();
	}
});

// 固定更新中 tick 动作状态
app.addSystems(BuiltinSchedules.FIXED_PRE_UPDATE, (world: World) => {
	const fixedDelta = 1 / 50; // 50Hz
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		actionState.tickFixed(fixedDelta);
	}
});

// 固定更新后切换回常规状态
app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		actionState.swapToUpdateState();
	}
});
```

### 输入更新系统实现

```typescript
import { MainScheduleLabel } from "@/bevy_app";
import { getInputManager } from "@/leafwing-input-manager";

app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
	const inputManager = getInputManager(PlayerAction);
	if (!inputManager) return;

	const instanceManager = inputManager.getInstanceManager();
	if (!instanceManager) return;

	// 更新所有实体的输入
	for (const [entity] of world.query(ActionStateComponent, InputMapComponent)) {
		const actionState = instanceManager.getActionState(entity);
		const inputMap = instanceManager.getInputMap(entity);

		if (actionState && inputMap) {
			// 处理输入并更新动作状态
			const updatedActions = inputMap.processActions(centralStore);
			actionState.updateFromUpdatedActions(updatedActions);
		}
	}
});
```

---

## 实战示例

### 示例 1: 角色移动系统

```typescript
import { World } from "@rbxts/matter";
import { ActionStateComponent } from "@/leafwing-input-manager";

// 定义移动动作
class MovementAction extends ActionlikeEnum {
	static readonly Move = new MovementAction("Move", InputControlKind.DualAxis);
	static readonly Sprint = new MovementAction("Sprint", InputControlKind.Button);
	static readonly Jump = new MovementAction("Jump", InputControlKind.Button);
}

// 移动系统
function movementSystem(world: World): void {
	for (const [entity, actionState, character] of world.query(
		ActionStateComponent,
		CharacterComponent,
	)) {
		// 获取移动输入
		const moveInput = actionState.axisPair(MovementAction.Move);

		// 检查冲刺
		const isSprinting = actionState.pressed(MovementAction.Sprint);
		const speedMultiplier = isSprinting ? 2.0 : 1.0;

		// 应用移动
		if (moveInput.x !== 0 || moveInput.y !== 0) {
			const moveDirection = new Vector3(moveInput.x, 0, moveInput.y).Unit;
			character.velocity = moveDirection.mul(character.baseSpeed * speedMultiplier);
		}

		// 处理跳跃
		if (actionState.justPressed(MovementAction.Jump) && character.isGrounded) {
			character.velocity = character.velocity.add(new Vector3(0, character.jumpForce, 0));
		}
	}
}
```

### 示例 2: 技能系统 (长按/短按)

```typescript
class SkillAction extends ActionlikeEnum {
	static readonly PrimaryAttack = new SkillAction("PrimaryAttack", InputControlKind.Button);
	static readonly SecondaryAttack = new SkillAction("SecondaryAttack", InputControlKind.Button);
	static readonly UltimateAbility = new SkillAction("UltimateAbility", InputControlKind.Button);
}

function skillSystem(world: World): void {
	for (const [entity, actionState, skillController] of world.query(
		ActionStateComponent,
		SkillControllerComponent,
	)) {
		// 短按 = 快速攻击
		if (actionState.justReleased(SkillAction.PrimaryAttack)) {
			const holdDuration = actionState.getPreviousDuration(SkillAction.PrimaryAttack);

			if (holdDuration < 0.2) {
				// 快速点击攻击
				skillController.executeQuickAttack();
			} else if (holdDuration < 1.0) {
				// 普通攻击
				skillController.executeNormalAttack();
			} else {
				// 蓄力攻击
				const chargeLevel = math.min(holdDuration / 3.0, 1.0);
				skillController.executeChargedAttack(chargeLevel);
			}
		}

		// 长按蓄力提示
		if (actionState.pressed(SkillAction.PrimaryAttack)) {
			const currentDuration = actionState.getCurrentDuration(SkillAction.PrimaryAttack);
			if (currentDuration > 0.5) {
				skillController.showChargeEffect(currentDuration);
			}
		}

		// 大招 (双键组合)
		if (
			actionState.pressed(SkillAction.SecondaryAttack) &&
			actionState.justPressed(SkillAction.UltimateAbility)
		) {
			if (skillController.canUseUltimate()) {
				skillController.executeUltimate();
			}
		}
	}
}
```

### 示例 3: 连击系统

```typescript
class ComboAction extends ActionlikeEnum {
	static readonly LightAttack = new ComboAction("LightAttack", InputControlKind.Button);
	static readonly HeavyAttack = new ComboAction("HeavyAttack", InputControlKind.Button);
}

interface ComboState {
	comboCount: number;
	lastAttackTime: number;
	comboWindow: number; // 连击窗口期 (秒)
}

function comboSystem(world: World, currentTime: number): void {
	for (const [entity, actionState, comboState] of world.query(
		ActionStateComponent,
		ComboStateComponent,
	)) {
		// 检查连击是否超时
		if (currentTime - comboState.lastAttackTime > comboState.comboWindow) {
			comboState.comboCount = 0;
		}

		// 轻攻击
		if (actionState.justPressed(ComboAction.LightAttack)) {
			comboState.comboCount++;
			comboState.lastAttackTime = currentTime;

			// 根据连击数执行不同动作
			if (comboState.comboCount === 1) {
				performLightAttack1(entity);
			} else if (comboState.comboCount === 2) {
				performLightAttack2(entity);
			} else if (comboState.comboCount === 3) {
				performLightAttackFinisher(entity);
				comboState.comboCount = 0; // 重置
			}
		}

		// 重攻击可以打断连招
		if (actionState.justPressed(ComboAction.HeavyAttack)) {
			if (comboState.comboCount >= 2) {
				// 连击中释放重击 = 特殊技能
				performComboHeavyAttack(entity, comboState.comboCount);
			} else {
				performNormalHeavyAttack(entity);
			}
			comboState.comboCount = 0;
		}
	}
}
```

### 示例 4: 上下文敏感输入

```typescript
class ContextualAction extends ActionlikeEnum {
	static readonly Interact = new ContextualAction("Interact", InputControlKind.Button);
	static readonly Use = new ContextualAction("Use", InputControlKind.Button);
}

enum PlayerContext {
	Default,
	NearDoor,
	NearNPC,
	InVehicle,
	InCombat,
}

function contextualInputSystem(world: World): void {
	for (const [entity, actionState, player] of world.query(
		ActionStateComponent,
		PlayerComponent,
	)) {
		// 根据上下文决定交互行为
		if (actionState.justPressed(ContextualAction.Interact)) {
			switch (player.currentContext) {
				case PlayerContext.NearDoor:
					openDoor(player.nearbyDoor);
					break;
				case PlayerContext.NearNPC:
					startDialogue(player.nearbyNPC);
					break;
				case PlayerContext.InVehicle:
					exitVehicle(player);
					break;
				case PlayerContext.Default:
					// 搜索附近可交互对象
					const interactable = findNearestInteractable(player.position);
					if (interactable) {
						interact(interactable);
					}
					break;
			}
		}

		// 使用物品
		if (actionState.justPressed(ContextualAction.Use)) {
			if (player.currentContext === PlayerContext.InCombat) {
				// 战斗中使用 = 使用快捷栏物品
				useQuickSlotItem(player);
			} else {
				// 非战斗中使用 = 打开背包
				openInventory(player);
			}
		}
	}
}
```

### 示例 5: 双摇杆控制 (第三人称射击)

```typescript
class ShooterAction extends ActionlikeEnum {
	static readonly Move = new ShooterAction("Move", InputControlKind.DualAxis);
	static readonly Look = new ShooterAction("Look", InputControlKind.DualAxis);
	static readonly Shoot = new ShooterAction("Shoot", InputControlKind.Button);
	static readonly Aim = new ShooterAction("Aim", InputControlKind.Button);
}

// 配置输入映射
function setupShooterInput(): InputMap<ShooterAction> {
	const inputMap = new InputMap<ShooterAction>();

	// 移动 - WASD 或左摇杆
	const wasdDPad = new VirtualDPad(KeyCode.W, KeyCode.S, KeyCode.A, KeyCode.D);
	inputMap.insert(ShooterAction.Move, wasdDPad);
	inputMap.insert(ShooterAction.Move, GamepadStick.left());

	// 视角 - 鼠标或右摇杆
	inputMap.insert(ShooterAction.Look, MouseMove.instance());
	inputMap.insert(ShooterAction.Look, GamepadStick.right());

	// 射击
	inputMap.insert(ShooterAction.Shoot, MouseButton.left());
	inputMap.insert(ShooterAction.Shoot, GamepadButton.ButtonR2);

	// 瞄准
	inputMap.insert(ShooterAction.Aim, MouseButton.right());
	inputMap.insert(ShooterAction.Aim, GamepadButton.ButtonL2);

	return inputMap;
}

// 射击游戏系统
function shooterSystem(world: World, deltaTime: number): void {
	for (const [entity, actionState, character, camera] of world.query(
		ActionStateComponent,
		CharacterComponent,
		CameraComponent,
	)) {
		// 移动
		const moveInput = actionState.axisPair(ShooterAction.Move);
		if (moveInput.x !== 0 || moveInput.y !== 0) {
			const moveDir = camera.transform.rotation
				.mul(new Vector3(moveInput.x, 0, -moveInput.y))
				.Unit;
			character.move(moveDir);
		}

		// 视角旋转
		const lookInput = actionState.axisPair(ShooterAction.Look);
		if (lookInput.x !== 0 || lookInput.y !== 0) {
			// 应用灵敏度
			const sensitivity = 0.1;
			camera.yaw += lookInput.x * sensitivity;
			camera.pitch -= lookInput.y * sensitivity;
			camera.pitch = math.clamp(camera.pitch, -80, 80);
		}

		// 瞄准
		const isAiming = actionState.pressed(ShooterAction.Aim);
		camera.fieldOfView = isAiming ? 40 : 70; // 瞄准时缩小视野

		// 射击
		if (actionState.pressed(ShooterAction.Shoot)) {
			if (isAiming) {
				// 瞄准射击 = 精确
				character.fireWeapon(camera.getLookDirection(), 0.01);
			} else {
				// 腰射 = 散射
				character.fireWeapon(camera.getLookDirection(), 0.1);
			}
		}
	}
}
```

---

## 网络同步

### 客户端-服务器架构

```typescript
// 客户端插件配置
const clientPlugin = new InputManagerPlugin({
	actionType: PlayerAction,
	networkSync: {
		enabled: true,
		syncRate: 30,        // 30Hz 同步频率
		authority: "client", // 客户端权威
	},
});

// 服务器插件配置
const serverPlugin = new InputManagerPlugin({
	actionType: PlayerAction,
	networkSync: {
		enabled: true,
		syncRate: 30,
		authority: "server", // 服务器权威
	},
});
```

### 同步原理

```
客户端                              服务器
   │                                   │
   │  1. 捕获本地输入                   │
   │  ┌─────────────┐                  │
   │  │ ActionState │                  │
   │  └─────────────┘                  │
   │         │                         │
   │  2. 序列化动作状态                 │
   │         │                         │
   │  ┌──────▼──────┐                  │
   │  │ 网络数据包   │──────────────────>│  3. 接收并验证
   │  └─────────────┘                  │
   │                                   │  ┌─────────────┐
   │                                   │  │ 反作弊检测   │
   │                                   │  └─────────────┘
   │                                   │         │
   │                                   │  4. 应用到服务器 ActionState
   │                                   │  ┌─────────────┐
   │                                   │  │ ActionState │
   │                                   │  └─────────────┘
   │                                   │         │
   │  6. 接收服务器状态                 │  5. 广播给其他玩家
   │ <──────────────────────────────────
   │  ┌─────────────┐                  │
   │  │ 预测校正     │                  │
   │  └─────────────┘                  │
```

### 实现网络同步组件

```typescript
import { component } from "@rbxts/matter";
import { Players, ReplicatedStorage } from "@rbxts/services";

// 网络同步组件
export const NetworkedInputComponent = component<{
	playerId: number;
	lastSyncTime: number;
	inputBuffer: Array<SerializedActionState>;
}>("NetworkedInput");

// 序列化动作状态
interface SerializedActionState {
	timestamp: number;
	actions: Map<string, {
		pressed: boolean;
		value: number;
		axisPairX?: number;
		axisPairY?: number;
	}>;
}

function serializeActionState<A extends Actionlike>(
	actionState: ActionState<A>,
): SerializedActionState {
	const actionData = actionState.getActionDataMap();
	const serialized = new Map();

	for (const [actionHash, data] of actionData) {
		serialized.set(actionHash, {
			pressed: data.pressed,
			value: data.value,
			axisPairX: data.axisPairX,
			axisPairY: data.axisPairY,
		});
	}

	return {
		timestamp: os.clock(),
		actions: serialized,
	};
}

// 客户端同步系统
function clientSyncSystem(world: World): void {
	const syncRate = 1 / 30; // 30Hz
	const currentTime = os.clock();

	for (const [entity, actionState, networked] of world.query(
		ActionStateComponent,
		NetworkedInputComponent,
	)) {
		// 检查是否需要同步
		if (currentTime - networked.lastSyncTime < syncRate) {
			continue;
		}

		// 序列化并发送到服务器
		const serialized = serializeActionState(actionState);
		sendToServer(serialized);

		networked.lastSyncTime = currentTime;
	}
}

// 服务器接收系统
function serverReceiveSystem(world: World): void {
	// 从网络获取输入数据
	const inputPackets = receiveFromClients();

	for (const packet of inputPackets) {
		const playerEntity = getEntityByPlayerId(packet.playerId);
		if (!playerEntity) continue;

		const actionState = world.get(playerEntity, ActionStateComponent);
		if (!actionState) continue;

		// 验证输入 (反作弊)
		if (!validateInput(packet)) {
			warn(`Invalid input from player ${packet.playerId}`);
			continue;
		}

		// 应用输入到服务器动作状态
		applySerializedState(actionState, packet.data);
	}
}

// 输入验证
function validateInput(packet: InputPacket): boolean {
	// 检查时间戳
	const timeDiff = os.clock() - packet.timestamp;
	if (timeDiff < 0 || timeDiff > 1.0) {
		return false; // 时间戳异常
	}

	// 检查值范围
	for (const [, data] of packet.data.actions) {
		if (data.value < 0 || data.value > 1) {
			return false; // 值超出范围
		}
		if (data.axisPairX && math.abs(data.axisPairX) > 1) {
			return false;
		}
		if (data.axisPairY && math.abs(data.axisPairY) > 1) {
			return false;
		}
	}

	return true;
}
```

### 客户端预测与校正

```typescript
// 客户端预测组件
export const PredictionComponent = component<{
	predictedPosition: Vector3;
	predictedVelocity: Vector3;
	serverPosition: Vector3;
	reconciliationThreshold: number;
}>("Prediction");

function clientPredictionSystem(world: World): void {
	for (const [entity, actionState, prediction, transform] of world.query(
		ActionStateComponent,
		PredictionComponent,
		TransformComponent,
	)) {
		// 本地预测移动
		const moveInput = actionState.axisPair(PlayerAction.Move);
		prediction.predictedVelocity = new Vector3(moveInput.x, 0, moveInput.y)
			.mul(10);
		prediction.predictedPosition = transform.position
			.add(prediction.predictedVelocity.mul(1 / 60));

		// 应用预测
		transform.position = prediction.predictedPosition;
	}
}

function clientReconciliationSystem(world: World): void {
	for (const [entity, prediction, transform] of world.query(
		PredictionComponent,
		TransformComponent,
	)) {
		// 检查与服务器位置的差异
		const error = prediction.serverPosition.sub(transform.position);

		if (error.Magnitude > prediction.reconciliationThreshold) {
			// 误差过大,进行校正
			const correctionSpeed = 0.1;
			transform.position = transform.position.add(error.mul(correctionSpeed));
		}
	}
}
```

---

## 最佳实践

### 1. 动作设计原则

```typescript
// ✅ 好的做法: 使用语义化的动作名称
class PlayerAction extends ActionlikeEnum {
	static readonly Jump = new PlayerAction("Jump");
	static readonly Interact = new PlayerAction("Interact");
	static readonly OpenInventory = new PlayerAction("OpenInventory");
}

// ❌ 避免: 使用物理输入名称作为动作
class PlayerAction extends ActionlikeEnum {
	static readonly SpaceKey = new PlayerAction("SpaceKey"); // 不好
	static readonly EKey = new PlayerAction("EKey");         // 不好
}
```

### 2. 输入映射组织

```typescript
// ✅ 使用配置文件或构建器模式
function createDefaultInputMap(): InputMap<PlayerAction> {
	return new InputMap<PlayerAction>()
		// 移动
		.insert(PlayerAction.MoveForward, KeyCode.W)
		.insert(PlayerAction.MoveBackward, KeyCode.S)
		// 动作
		.insert(PlayerAction.Jump, KeyCode.Space)
		.insert(PlayerAction.Jump, GamepadButton.ButtonA);
}

// ✅ 分组管理
const movementBindings = [
	[PlayerAction.MoveForward, KeyCode.W],
	[PlayerAction.MoveBackward, KeyCode.S],
	[PlayerAction.MoveLeft, KeyCode.A],
	[PlayerAction.MoveRight, KeyCode.D],
] as const;

const combatBindings = [
	[PlayerAction.Attack, MouseButton.left()],
	[PlayerAction.Block, MouseButton.right()],
] as const;

function setupInputMap(map: InputMap<PlayerAction>): void {
	for (const [action, input] of movementBindings) {
		map.insert(action, input);
	}
	for (const [action, input] of combatBindings) {
		map.insert(action, input);
	}
}
```

### 3. 状态查询优化

```typescript
// ✅ 缓存常用查询结果
function optimizedMovementSystem(world: World): void {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		// 一次获取所有需要的状态
		const movement = actionState.axisPair(PlayerAction.Move);
		const isSprinting = actionState.pressed(PlayerAction.Sprint);
		const justJumped = actionState.justPressed(PlayerAction.Jump);

		// 使用缓存的结果
		if (movement.x !== 0 || movement.y !== 0) {
			applyMovement(entity, movement, isSprinting);
		}

		if (justJumped) {
			applyJump(entity);
		}
	}
}

// ❌ 避免: 多次查询相同状态
function inefficientSystem(world: World): void {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		if (actionState.pressed(PlayerAction.Sprint)) {
			// ... 第一次查询
		}

		if (actionState.pressed(PlayerAction.Sprint)) {
			// ... 第二次查询相同状态 (浪费)
		}
	}
}
```

### 4. 时间精度选择

```typescript
// ✅ 对精度要求高的游戏使用 Instant
function preciseTimingSystem(world: World): void {
	const currentInstant = Instant.now();
	const previousInstant = getPreviousInstant();

	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		actionState.tickWithInstants(currentInstant, previousInstant);

		// 精确的时间追踪
		const duration = actionState.getCurrentDuration(PlayerAction.Charge);
	}

	storePreviousInstant(currentInstant);
}

// ✅ 简单游戏使用 deltaTime
function simpleTimingSystem(world: World, deltaTime: number): void {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		actionState.tick(deltaTime);
	}
}
```

### 5. 输入禁用策略

```typescript
// ✅ 在 UI 打开时禁用游戏输入
function uiSystem(world: World, uiState: UIState): void {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		if (uiState.isInventoryOpen) {
			// 禁用移动和战斗
			actionState.disable(PlayerAction.Move);
			actionState.disable(PlayerAction.Attack);

			// 保持 UI 相关输入启用
			actionState.enable(PlayerAction.CloseInventory);
		} else {
			// 恢复游戏输入
			actionState.enableAll();
		}
	}
}

// ✅ 在过场动画中禁用所有输入
function cutsceneSystem(world: World, cutscene: Cutscene): void {
	if (cutscene.isPlaying) {
		for (const [entity, actionState] of world.query(ActionStateComponent)) {
			actionState.disableAll();
		}
	}
}
```

### 6. 死区和灵敏度处理

```typescript
// ✅ 应用死区避免摇杆漂移
function applyDeadzone(input: Vector2, deadzone: number): Vector2 {
	if (input.Magnitude < deadzone) {
		return new Vector2(0, 0);
	}

	// 重新映射到 [0, 1] 范围
	const adjustedMagnitude = (input.Magnitude - deadzone) / (1 - deadzone);
	return input.Unit.mul(adjustedMagnitude);
}

// ✅ 应用灵敏度曲线
function applySensitivityCurve(value: number, curve: number): number {
	// curve > 1 = 加速曲线 (大动作更灵敏)
	// curve < 1 = 减速曲线 (小动作更精确)
	const sign = math.sign(value);
	const magnitude = math.abs(value);
	return sign * math.pow(magnitude, curve);
}

function processGamepadInput(world: World): void {
	for (const [entity, actionState, settings] of world.query(
		ActionStateComponent,
		InputSettingsComponent,
	)) {
		let lookInput = actionState.axisPair(PlayerAction.Look);

		// 应用死区
		lookInput = applyDeadzone(lookInput, settings.lookDeadzone);

		// 应用灵敏度
		lookInput = new Vector2(
			applySensitivityCurve(lookInput.x, settings.lookSensitivityCurve),
			applySensitivityCurve(lookInput.y, settings.lookSensitivityCurve),
		);

		// 使用处理后的输入
		applyLookRotation(entity, lookInput);
	}
}
```

---

## 性能优化

### 1. 减少不必要的查询

```typescript
// ✅ 只查询活跃的玩家
const ActivePlayerComponent = component<{ isActive: boolean }>("ActivePlayer");

function efficientInputSystem(world: World): void {
	// 使用额外组件筛选
	for (const [entity, actionState, activePlayer] of world.query(
		ActionStateComponent,
		ActivePlayerComponent,
	)) {
		if (!activePlayer.isActive) continue;

		// 处理输入
	}
}
```

### 2. 批量更新

```typescript
// ✅ 批量处理输入更新
function batchInputUpdate(world: World): void {
	const entitiesToUpdate: number[] = [];

	// 收集需要更新的实体
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		if (shouldUpdate(entity)) {
			entitiesToUpdate.push(entity);
		}
	}

	// 批量更新
	for (const entity of entitiesToUpdate) {
		updateEntity(world, entity);
	}
}
```

### 3. 输入事件订阅

```typescript
// ✅ 使用事件系统避免轮询
const InputEventComponent = component<{
	onPressed: Map<string, Array<() => void>>;
	onReleased: Map<string, Array<() => void>>;
}>("InputEvent");

function eventDrivenInputSystem(world: World): void {
	for (const [entity, actionState, events] of world.query(
		ActionStateComponent,
		InputEventComponent,
	)) {
		// 只在状态变化时触发回调
		for (const [actionHash, callbacks] of events.onPressed) {
			const action = actionState.getActionByHash(actionHash);
			if (action && actionState.justPressed(action)) {
				for (const callback of callbacks) {
					callback();
				}
			}
		}
	}
}
```

### 4. 输入缓冲优化

```typescript
// ✅ 输入缓冲区避免丢失快速输入
interface InputBuffer {
	bufferedActions: Map<string, number>; // actionHash -> timestamp
	bufferWindow: number; // 缓冲窗口 (秒)
}

function inputBufferSystem(world: World, currentTime: number): void {
	for (const [entity, actionState, buffer] of world.query(
		ActionStateComponent,
		InputBufferComponent,
	)) {
		// 清理过期的缓冲输入
		for (const [actionHash, timestamp] of buffer.bufferedActions) {
			if (currentTime - timestamp > buffer.bufferWindow) {
				buffer.bufferedActions.delete(actionHash);
			}
		}

		// 检查新的输入并加入缓冲
		for (const action of getAllActions()) {
			if (actionState.justPressed(action)) {
				buffer.bufferedActions.set(action.hash(), currentTime);
			}
		}

		// 消费缓冲输入
		for (const [actionHash, timestamp] of buffer.bufferedActions) {
			const action = actionState.getActionByHash(actionHash);
			if (action && canExecuteAction(entity, action)) {
				executeAction(entity, action);
				buffer.bufferedActions.delete(actionHash);
			}
		}
	}
}
```

---

## 故障排除

### 常见问题 1: 输入无响应

**症状**: `actionState.pressed()` 始终返回 `false`

**可能原因**:
1. InputMap 未正确注册
2. CentralInputStore 未更新
3. InputManagerPlugin 未添加到 App

**解决方法**:
```typescript
// 检查 1: 确认 InputMap 已添加到实体
const inputMap = world.get(entity, InputMapComponent);
if (!inputMap) {
	print("错误: 实体缺少 InputMapComponent");
}

// 检查 2: 确认 CentralInputStore 正在更新
const inputStore = getCentralInputStore();
const spacePressed = inputStore.pressed("keyboard_Space");
print(`CentralInputStore Space 状态: ${spacePressed}`);

// 检查 3: 确认插件已添加
const plugin = app.getResource<InputManagerPluginResource<PlayerAction>>();
if (!plugin) {
	print("错误: InputManagerPlugin 未注册");
}
```

### 常见问题 2: justPressed 触发多次

**症状**: `justPressed()` 在单次按键时触发多次

**可能原因**:
1. `tick()` 未在每帧调用
2. 多个系统同时查询同一动作

**解决方法**:
```typescript
// 确保 tick 只在 PreUpdate 调用一次
app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		actionState.tick(deltaTime);
	}
});

// 使用标志位避免重复处理
const ProcessedInputComponent = component<{ processedThisFrame: boolean }>();

function inputProcessingSystem(world: World): void {
	for (const [entity, actionState, processed] of world.query(
		ActionStateComponent,
		ProcessedInputComponent,
	)) {
		if (processed.processedThisFrame) continue;

		if (actionState.justPressed(PlayerAction.Attack)) {
			handleAttack(entity);
		}

		processed.processedThisFrame = true;
	}
}
```

### 常见问题 3: 网络同步延迟

**症状**: 客户端输入在服务器上响应慢

**可能原因**:
1. 同步频率过低
2. 网络延迟高
3. 缺少客户端预测

**解决方法**:
```typescript
// 增加同步频率
const plugin = new InputManagerPlugin({
	actionType: PlayerAction,
	networkSync: {
		enabled: true,
		syncRate: 60, // 提高到 60Hz
	},
});

// 添加客户端预测
function clientPredictionSystem(world: World, deltaTime: number): void {
	if (RunService.IsServer()) return;

	for (const [entity, actionState, transform] of world.query(
		ActionStateComponent,
		TransformComponent,
	)) {
		// 立即应用本地预测
		const movement = actionState.axisPair(PlayerAction.Move);
		transform.position = transform.position.add(
			new Vector3(movement.x, 0, movement.y).mul(deltaTime * 10)
		);
	}
}
```

### 常见问题 4: 固定更新中输入丢失

**症状**: 在 FixedUpdate 中输入检测不到

**可能原因**:
1. 未调用 `swapToFixedUpdateState()`
2. 固定更新频率与输入更新不匹配

**解决方法**:
```typescript
// 确保状态切换系统已添加
app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, (world: World) => {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		actionState.swapToFixedUpdateState();
	}
});

app.addSystems(BuiltinSchedules.FIXED_UPDATE, (world: World) => {
	// 在这里使用输入
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		if (actionState.pressed(PlayerAction.Jump)) {
			// 正常工作
		}
	}
});

app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		actionState.swapToUpdateState();
	}
});
```

### 调试技巧

```typescript
// 启用详细日志
function debugInputSystem(world: World): void {
	for (const [entity, actionState] of world.query(ActionStateComponent)) {
		const activeActions = actionState.getActiveActions();
		if (activeActions.size() > 0) {
			print(`实体 ${entity} 激活的动作: ${activeActions}`);
		}

		// 打印特定动作的详细信息
		const jumpPressed = actionState.pressed(PlayerAction.Jump);
		const jumpJustPressed = actionState.justPressed(PlayerAction.Jump);
		const jumpDuration = actionState.getCurrentDuration(PlayerAction.Jump);

		print(`Jump 状态: pressed=${jumpPressed}, just=${jumpJustPressed}, duration=${jumpDuration}`);
	}
}

// 可视化输入状态
function visualizeInput(world: World): void {
	for (const [entity, actionState, debug] of world.query(
		ActionStateComponent,
		DebugVisualizationComponent,
	)) {
		// 在屏幕上显示当前输入
		const movement = actionState.axisPair(PlayerAction.Move);
		debug.drawArrow(
			entity.position,
			entity.position.add(new Vector3(movement.x, 0, movement.y).mul(5)),
			Color3.fromRGB(0, 255, 0),
		);
	}
}
```

---

## 参考资源

### 相关文档
- [bevy_input 模块手册](./bevy_input.md) - 底层输入系统
- [bevy_ecs 模块手册](./bevy_ecs.md) - ECS 系统基础
- [bevy_app 模块手册](./bevy_app.md) - 应用程序架构

### 外部资源
- [原始 Rust 实现](https://github.com/Leafwing-Studios/leafwing-input-manager) - Bevy 版本
- [Roblox Input API](https://create.roblox.com/docs/reference/engine/classes/UserInputService) - 底层输入服务
- [Matter ECS 文档](https://matter-ecs.github.io/matter/) - ECS 框架

### 示例项目
- `src/leafwing-input-manager/examples/` - 官方示例代码
- `src/leafwing-input-manager/__examples__/` - 完整游戏示例

---

## 版本历史

### v1.0.0 (当前)
- ✅ 核心动作系统
- ✅ 输入映射系统
- ✅ 动作状态管理
- ✅ 多设备支持 (键盘、鼠标、手柄)
- ✅ 时间追踪系统
- ✅ 固定时间步长支持
- ✅ 网络同步基础设施
- ✅ Plugin 系统集成

### 未来计划
- 🔄 输入处理管线 (死区、灵敏度调整)
- 🔄 输入冲突解决策略
- 🔄 输入录制与回放
- 🔄 触摸屏输入支持
- 🔄 自定义输入设备扩展

---

## 许可证

本模块是 bevy_framework 的一部分,遵循项目主许可证。

原始 Rust 实现由 Leafwing Studios 开发,遵循 MIT 或 Apache-2.0 许可证。