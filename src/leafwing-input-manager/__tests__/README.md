# Leafwing Input Manager 测试基础设施

本目录包含 leafwing-input-manager 的测试工具和测试用例。

## 测试基础设施文件

### test-utils.ts

提供创建测试环境的工具函数:

#### 核心函数

- **`createTestApp()`**: 创建预配置的测试 App 实例
  - 自动插入 `CentralInputStore` 资源
  - 自动插入 `ClashStrategyResource` 资源
  - 启用静默错误模式

- **`advanceFrame(app, deltaTime?)`**: 推进一帧
  - 默认帧时间: 1/60 秒 (16.67ms)
  - 执行一次完整的更新循环

- **`advanceFrames(app, frameCount, deltaTime?)`**: 推进多帧
  - 连续执行多次更新

- **`createTestWorld()`**: 创建独立的 Matter World 实例

#### 调度相关函数

- **`runStartupSchedules(app)`**: 手动运行启动调度
  - PreStartup → Startup → PostStartup

- **`runUpdateSchedules(app)`**: 手动运行更新调度
  - PreUpdate → Update → PostUpdate

#### 工具函数

- **`getInputStore(app)`**: 获取 CentralInputStore 资源
- **`cleanupTestApp(app)`**: 清理测试 App

### input-simulator.ts

提供输入模拟器,用于测试输入处理逻辑:

#### KeyboardSimulator

键盘输入模拟器:

```typescript
const keyboard = KeyboardSimulator.fromApp(app);

// 按下按键
keyboard.pressKey(Enum.KeyCode.Space);

// 释放按键
keyboard.releaseKey(Enum.KeyCode.Space);

// 模拟打字
keyboard.typeKeys(Enum.KeyCode.H, Enum.KeyCode.I);

// 检查状态
const isPressed = keyboard.isPressed(Enum.KeyCode.Space);

// 释放所有按键
keyboard.releaseAll();
```

#### MouseSimulator

鼠标输入模拟器:

```typescript
const mouse = MouseSimulator.fromApp(app);

// 按下/释放鼠标按钮
mouse.pressButton(Enum.UserInputType.MouseButton1);
mouse.releaseButton(Enum.UserInputType.MouseButton1);

// 快捷点击方法
mouse.clickLeft();
mouse.clickRight();
mouse.clickMiddle();

// 移动鼠标(相对移动)
mouse.moveBy(new Vector2(10, 20));

// 移动到指定位置(绝对位置)
mouse.moveTo(new Vector2(100, 100));

// 滚动滚轮
mouse.scrollBy(5); // 正值向上

// 获取状态
const position = mouse.getPosition();
const scroll = mouse.getScroll();

// 重置状态
mouse.reset();
```

#### GamepadSimulator

手柄输入模拟器:

```typescript
const gamepad = GamepadSimulator.fromApp(app);

// 按下/释放按钮
gamepad.pressButton(Enum.KeyCode.ButtonA);
gamepad.releaseButton(Enum.KeyCode.ButtonA);

// 设置摇杆位置 (值范围: -1.0 到 1.0)
gamepad.setLeftStick(new Vector2(0.5, -0.3));
gamepad.setRightStick(new Vector2(-0.8, 0.6));

// 设置轴值
gamepad.setAxisValue(Enum.KeyCode.Thumbstick1, 0.7);

// 获取状态
const leftStick = gamepad.getLeftStick();
const rightStick = gamepad.getRightStick();
const isPressed = gamepad.isPressed(Enum.KeyCode.ButtonA);

// 重置状态
gamepad.reset();
```

## 使用示例

### 基本测试结构

```typescript
import { createTestApp, advanceFrame } from "./test-utils";
import { KeyboardSimulator } from "./input-simulator";
import { ActionState } from "../action-state/action-state";
import { InputMap } from "../input-map/input-map";

export = () => {
	describe("My Input Test", () => {
		it("should handle jump input", () => {
			// 创建测试环境
			const app = createTestApp();
			const keyboard = KeyboardSimulator.fromApp(app);

			// 设置输入映射
			const actionState = new ActionState<MyAction>();
			const inputMap = new InputMap<MyAction>();
			inputMap.insert(MyAction.Jump, KeyCode.Space);

			// 插入到 app 资源
			app.insertResource(actionState);
			app.insertResource(inputMap);

			// 模拟按键
			keyboard.pressKey(Enum.KeyCode.Space);

			// 推进帧更新
			advanceFrame(app);

			// 验证结果
			expect(actionState.pressed(MyAction.Jump)).to.equal(true);
		});
	});
};
```

### 多帧测试

```typescript
it("should accumulate input over multiple frames", () => {
	const app = createTestApp();
	const keyboard = KeyboardSimulator.fromApp(app);

	keyboard.pressKey(Enum.KeyCode.W);

	// 连续推进多帧
	for (let frame = 0; frame < 10; frame++) {
		advanceFrame(app, 1/60);
		// 在每帧检查状态...
	}

	keyboard.releaseKey(Enum.KeyCode.W);
});
```

### 组合输入测试

```typescript
it("should handle key combinations", () => {
	const app = createTestApp();
	const keyboard = KeyboardSimulator.fromApp(app);

	// 模拟 Ctrl+S
	keyboard.pressKey(Enum.KeyCode.LeftControl);
	keyboard.pressKey(Enum.KeyCode.S);

	advanceFrame(app);

	// 验证组合键...

	keyboard.releaseAll();
});
```

## 测试最佳实践

1. **使用 `beforeEach` 创建干净的测试环境**
   ```typescript
   let app: App;
   let keyboard: KeyboardSimulator;

   beforeEach(() => {
       app = createTestApp();
       keyboard = KeyboardSimulator.fromApp(app);
   });
   ```

2. **在 `afterEach` 中清理状态**
   ```typescript
   afterEach(() => {
       keyboard.releaseAll();
   });
   ```

3. **每个测试保持独立**
   - 不依赖其他测试的状态
   - 不修改全局状态

4. **使用描述性的测试名称**
   ```typescript
   it("should register jump action when space is pressed", () => {
       // ...
   });
   ```

5. **测试边界情况**
   - 空输入
   - 极限值
   - 并发输入
   - 状态转换

## 已有测试文件

- **fixed-update.spec.ts**: 固定更新状态管理测试
- **input-debug.test.ts**: 基础输入调试测试
- **input-manager.spec.ts**: 输入管理器测试
- **network-sync.spec.ts**: 网络同步测试
- **systems.spec.ts**: 系统模块测试
- **timing.test.ts**: 时间相关测试
- **test-infrastructure.spec.ts**: 基础设施验证测试

## 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test test-infrastructure
npm test fixed-update
```

## 注意事项

1. **输入状态管理**
   - 输入模拟器修改 `CentralInputStore` 的状态
   - 需要通过 `advanceFrame()` 推进更新才能处理输入

2. **帧时间**
   - 默认使用 1/60 秒 (约 16.67ms)
   - 可以自定义 deltaTime 测试不同帧率

3. **资源清理**
   - 测试结束后应释放所有输入
   - 使用 `releaseAll()` 或 `reset()` 方法

4. **Matter World**
   - `createTestWorld()` 创建独立的 World
   - 如果需要完整的 App 环境,使用 `createTestApp()`
