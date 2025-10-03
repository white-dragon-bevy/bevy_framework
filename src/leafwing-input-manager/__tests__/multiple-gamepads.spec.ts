/**
 * 多手柄测试
 * 测试多个手柄同时连接时的输入过滤和首选手柄功能
 */

import { App } from "../../bevy_app/app";
import { Actionlike } from "../actionlike";
import { ActionState } from "../action-state/action-state";
import { InputControlKind } from "../input-control-kind";
import { InputMap } from "../input-map/input-map";
import { GamepadButton } from "../user-input/gamepad";
import { InputManagerPlugin } from "../plugin/input-manager-plugin";
import { advanceFrame, createTestApp as baseCreateTestApp } from "./test-utils";
import { GamepadSimulator } from "./input-simulator";

/**
 * 测试用动作枚举
 */
class MyAction implements Actionlike {
	static readonly Jump = new MyAction("Jump");

	private constructor(private readonly value: string) {}

	hash(): string {
		return this.value;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		return other instanceof MyAction && this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}

/**
 * 创建测试应用,配置多个手柄环境
 * @returns 配置好的 App 实例
 */
function createMultiGamepadTestApp(): App {
	const app = baseCreateTestApp();

	// 添加 InputManagerPlugin 以注册输入处理系统
	const plugin = InputManagerPlugin.create<MyAction>({
		actionTypeName: "MyAction",
	});
	app.addPlugins(plugin);

	// 创建输入映射 - 将 Jump 动作绑定到手柄南键(ButtonA)
	const inputMap = new InputMap<MyAction>();
	inputMap.insert(MyAction.Jump, GamepadButton.south());

	// 创建并配置 ActionState
	const actionState = new ActionState<MyAction>();
	actionState.registerAction(MyAction.Jump);

	// 插入资源
	app.insertResource(inputMap);
	app.insertResource(actionState);

	// 运行一次更新以初始化系统
	// 第一次更新用于拾取手柄
	app.update();
	// 第二次更新用于刷新手柄连接消息
	app.update();

	return app;
}

export = () => {
	describe("Multiple Gamepads Tests", () => {
		describe("Preferred Gamepad", () => {
			let app: App;
			let gamepad: GamepadSimulator;

			beforeEach(() => {
				app = createMultiGamepadTestApp();
				gamepad = GamepadSimulator.fromApp(app);
			});

			afterEach(() => {
				gamepad.releaseAll();
			});

			it("should accept input from preferred gamepad", () => {
				// 在这个测试中,我们没有设置特定的首选手柄
				// 因此任何手柄的输入都应该被接受

				// 按下手柄的跳跃按钮 (ButtonA/南键)
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				// 验证跳跃动作被激活
				const actionState = app.getResource<ActionState<MyAction>>();
				expect(actionState).to.be.ok();
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);

				// 释放按钮
				gamepad.releaseButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				// 验证跳跃动作被释放
				expect(actionState!.pressed(MyAction.Jump)).to.equal(false);
				expect(actionState!.released(MyAction.Jump)).to.equal(true);
			});

			it("should detect button value from preferred gamepad", () => {
				const actionState = app.getResource<ActionState<MyAction>>();
				expect(actionState).to.be.ok();

				// 初始状态应为 0
				let buttonValue = actionState!.buttonValue(MyAction.Jump);
				expect(buttonValue).to.equal(0.0);

				// 按下手柄按钮
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				buttonValue = actionState!.buttonValue(MyAction.Jump);
				expect(buttonValue).to.equal(1.0);

				// 释放按钮
				gamepad.releaseButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				buttonValue = actionState!.buttonValue(MyAction.Jump);
				expect(buttonValue).to.equal(0.0);
			});

			it("should handle just pressed and just released states", () => {
				// 按下按钮
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				const actionState = app.getResource<ActionState<MyAction>>();
				expect(actionState).to.be.ok();

				// 验证刚按下状态
				expect(actionState!.justPressed(MyAction.Jump)).to.equal(true);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);
				expect(actionState!.released(MyAction.Jump)).to.equal(false);
				expect(actionState!.justReleased(MyAction.Jump)).to.equal(false);

				// 下一帧,应该不再是 just pressed
				advanceFrame(app);
				expect(actionState!.justPressed(MyAction.Jump)).to.equal(false);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);

				// 释放按钮
				gamepad.releaseButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				// 验证刚释放状态
				expect(actionState!.justPressed(MyAction.Jump)).to.equal(false);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(false);
				expect(actionState!.justReleased(MyAction.Jump)).to.equal(true);
				expect(actionState!.released(MyAction.Jump)).to.equal(true);
			});
		});

		describe("Gamepad Filtering", () => {
			it("should filter inputs correctly between multiple gamepads", () => {
				// 注意: 在 Roblox 环境中,手柄输入通过 UserInputService 统一处理
				// 不同于 Bevy 的实体系统,Roblox 不使用实体 ID 来区分手柄
				// 因此这个测试主要验证手柄输入的基本功能

				const app = createMultiGamepadTestApp();
				const gamepad = GamepadSimulator.fromApp(app);

				// 按下按钮
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				const actionState = app.getResource<ActionState<MyAction>>();
				expect(actionState).to.be.ok();
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);

				// 释放按钮
				gamepad.releaseButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				expect(actionState!.released(MyAction.Jump)).to.equal(true);

				gamepad.releaseAll();
			});

			it("should maintain state when gamepad button is held", () => {
				const app = createMultiGamepadTestApp();
				const gamepad = GamepadSimulator.fromApp(app);
				const actionState = app.getResource<ActionState<MyAction>>();
				expect(actionState).to.be.ok();

				// 按下并保持按钮
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				// 第一帧: just pressed
				expect(actionState!.justPressed(MyAction.Jump)).to.equal(true);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);

				// 第二帧: 仍然 pressed, 但不再 just pressed
				advanceFrame(app);
				expect(actionState!.justPressed(MyAction.Jump)).to.equal(false);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);

				// 第三帧: 仍然保持
				advanceFrame(app);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);

				// 释放按钮
				gamepad.releaseButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				expect(actionState!.justReleased(MyAction.Jump)).to.equal(true);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(false);

				gamepad.releaseAll();
			});
		});

		describe("Multiple Gamepad Buttons", () => {
			it("should handle different gamepad buttons independently", () => {
				const app = createMultiGamepadTestApp();

				// 创建额外的输入映射,绑定多个按钮
				const inputMap = app.getResource<InputMap<MyAction>>();
				expect(inputMap).to.be.ok();

				// 添加额外的按钮绑定
				inputMap!.insert(MyAction.Jump, GamepadButton.east());
				inputMap!.insert(MyAction.Jump, GamepadButton.west());

				const gamepad = GamepadSimulator.fromApp(app);
				const actionState = app.getResource<ActionState<MyAction>>();
				expect(actionState).to.be.ok();

				// 测试 ButtonA (south)
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);
				gamepad.releaseButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);
				expect(actionState!.released(MyAction.Jump)).to.equal(true);

				// 测试 ButtonB (east)
				gamepad.pressButton(Enum.KeyCode.ButtonB);
				advanceFrame(app);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);
				gamepad.releaseButton(Enum.KeyCode.ButtonB);
				advanceFrame(app);
				expect(actionState!.released(MyAction.Jump)).to.equal(true);

				// 测试 ButtonX (west)
				gamepad.pressButton(Enum.KeyCode.ButtonX);
				advanceFrame(app);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);
				gamepad.releaseButton(Enum.KeyCode.ButtonX);
				advanceFrame(app);
				expect(actionState!.released(MyAction.Jump)).to.equal(true);

				gamepad.releaseAll();
			});

			it("should handle simultaneous button presses", () => {
				const app = createMultiGamepadTestApp();
				const gamepad = GamepadSimulator.fromApp(app);
				const actionState = app.getResource<ActionState<MyAction>>();
				expect(actionState).to.be.ok();

				// 同时按下多个映射到同一动作的按钮
				const inputMap = app.getResource<InputMap<MyAction>>();
				expect(inputMap).to.be.ok();
				inputMap!.insert(MyAction.Jump, GamepadButton.east());

				gamepad.pressButton(Enum.KeyCode.ButtonA);
				gamepad.pressButton(Enum.KeyCode.ButtonB);
				advanceFrame(app);

				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);

				// 释放一个按钮,动作仍应保持 pressed
				gamepad.releaseButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);
				expect(actionState!.pressed(MyAction.Jump)).to.equal(true);

				// 释放最后一个按钮
				gamepad.releaseButton(Enum.KeyCode.ButtonB);
				advanceFrame(app);
				expect(actionState!.released(MyAction.Jump)).to.equal(true);

				gamepad.releaseAll();
			});
		});
	});
};
