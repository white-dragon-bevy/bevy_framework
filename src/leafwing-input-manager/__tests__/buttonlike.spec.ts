/**
 * Buttonlike 输入测试
 * 测试按钮输入(键盘、鼠标、手柄)的基本功能
 */

import { Actionlike } from "../actionlike";
import { ActionState } from "../action-state/action-state";
import { InputControlKind } from "../input-control-kind";
import { InputMap } from "../input-map/input-map";
import { advanceFrame, createTestApp } from "./test-utils";
import { GamepadSimulator, KeyboardSimulator, MouseSimulator } from "./input-simulator";
import { App } from "../../bevy_app/app";
import { KeyCode } from "../user-input/keyboard";
import { MouseButton } from "../user-input/mouse";
import { GamepadButton } from "../user-input/gamepad";
import { InputManagerPlugin } from "../plugin/input-manager-plugin";

/**
 * 测试用动作枚举
 */
class TestAction implements Actionlike {
	static readonly Throttle = new TestAction("Throttle");

	private constructor(private readonly value: string) {}

	hash(): string {
		return this.value;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		return other instanceof TestAction && this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}

/**
 * 创建测试 App 并配置输入映射
 * @returns 配置好的 App 实例
 */
function createButtonTestApp(): App {
	const app = createTestApp();

	// 添加 InputManagerPlugin 以注册输入处理系统
	const plugin = InputManagerPlugin.create<TestAction>({
		
	});
	app.addPlugins(plugin);

	// 创建输入映射
	const inputMap = new InputMap<TestAction>();
	inputMap.insert(TestAction.Throttle, KeyCode.Space);
	inputMap.insert(TestAction.Throttle, MouseButton.left());
	inputMap.insert(TestAction.Throttle, GamepadButton.south());
	inputMap.insert(TestAction.Throttle, GamepadButton.rightTrigger());

	// 创建并配置 ActionState
	const actionState = new ActionState<TestAction>();
	actionState.registerAction(TestAction.Throttle);

	// 插入资源
	app.insertResource(inputMap);
	app.insertResource(actionState);

	// 运行一次更新以初始化系统
	app.update();

	return app;
}

export = () => {
	describe("Buttonlike Input Tests", () => {
		let app: App;
		let keyboard: KeyboardSimulator;
		let mouse: MouseSimulator;
		let gamepad: GamepadSimulator;

		beforeEach(() => {
			app = createButtonTestApp();
			keyboard = KeyboardSimulator.fromApp(app);
			mouse = MouseSimulator.fromApp(app);
			gamepad = GamepadSimulator.fromApp(app);
		});

		afterEach(() => {
			keyboard.releaseAll();
			mouse.releaseAll();
			gamepad.releaseAll();
		});

		describe("Keyboard Button Input", () => {
			it("should update central input store when key pressed", () => {
				// 按下空格键
				keyboard.pressKey(KeyCode.Space.getKeyCode());
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 验证按键值
				const buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(1.0);

				// 验证按下状态
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);
			});

			it("should detect button value correctly", () => {
				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 初始状态应为 0
				let buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(0.0);

				// 按下按键
				keyboard.pressKey(KeyCode.Space.getKeyCode());
				advanceFrame(app);

				buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(1.0);
			});

			it("should handle press and release states", () => {
				// 按下按键
				keyboard.pressKey(KeyCode.Space.getKeyCode());
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 验证刚按下状态
				expect(actionState!.justPressed(TestAction.Throttle)).to.equal(true);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);
				expect(actionState!.released(TestAction.Throttle)).to.equal(false);
				expect(actionState!.justReleased(TestAction.Throttle)).to.equal(false);

				// 释放按键
				keyboard.releaseKey(KeyCode.Space.getKeyCode());
				advanceFrame(app);

				// 验证刚释放状态
				expect(actionState!.justPressed(TestAction.Throttle)).to.equal(false);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(false);
				expect(actionState!.justReleased(TestAction.Throttle)).to.equal(true);
				expect(actionState!.released(TestAction.Throttle)).to.equal(true);
			});
		});

		describe("Mouse Button Input", () => {
			it("should update central input store when mouse button pressed", () => {
				// 按下鼠标左键
				mouse.pressButton(Enum.UserInputType.MouseButton1);
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 验证按键值
				const buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(1.0);

				// 验证按下状态
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);
			});

			it("should detect mouse button value correctly", () => {
				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 初始状态应为 0
				let buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(0.0);

				// 按下鼠标按钮
				mouse.pressButton(Enum.UserInputType.MouseButton1);
				advanceFrame(app);

				buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(1.0);
			});

			it("should handle mouse press and release states", () => {
				// 按下鼠标按钮
				mouse.pressButton(Enum.UserInputType.MouseButton1);
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 验证刚按下状态
				expect(actionState!.justPressed(TestAction.Throttle)).to.equal(true);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);
				expect(actionState!.released(TestAction.Throttle)).to.equal(false);
				expect(actionState!.justReleased(TestAction.Throttle)).to.equal(false);

				// 释放鼠标按钮
				mouse.releaseButton(Enum.UserInputType.MouseButton1);
				advanceFrame(app);

				// 验证刚释放状态
				expect(actionState!.justPressed(TestAction.Throttle)).to.equal(false);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(false);
				expect(actionState!.justReleased(TestAction.Throttle)).to.equal(true);
				expect(actionState!.released(TestAction.Throttle)).to.equal(true);
			});
		});

		describe("Gamepad Button Input", () => {
			it("should detect gamepad button value correctly", () => {
				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 初始状态应为 0
				let buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(0.0);

				// 按下手柄按钮
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(1.0);
			});

			it("should handle gamepad button press and release", () => {
				// 按下手柄按钮
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 验证刚按下状态
				expect(actionState!.justPressed(TestAction.Throttle)).to.equal(true);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);
				expect(actionState!.released(TestAction.Throttle)).to.equal(false);
				expect(actionState!.justReleased(TestAction.Throttle)).to.equal(false);

				// 释放手柄按钮
				gamepad.releaseButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);

				// 验证刚释放状态
				expect(actionState!.justPressed(TestAction.Throttle)).to.equal(false);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(false);
				expect(actionState!.justReleased(TestAction.Throttle)).to.equal(true);
				expect(actionState!.released(TestAction.Throttle)).to.equal(true);
			});

			it("should handle gamepad trigger with button value", () => {
				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 初始状态应为 0
				let buttonValue = actionState!.buttonValue(TestAction.Throttle);
				expect(buttonValue).to.equal(0.0);

				// 设置扳机值为 0.7
				gamepad.setAxisValue(Enum.KeyCode.ButtonR2, 0.7);
				advanceFrame(app);

				// Roblox 的扳机按钮通常作为按钮处理
				// 如果按下,值应该反映出来
				buttonValue = actionState!.buttonValue(TestAction.Throttle);

				// 注意:在某些实现中,扳机可能返回模拟值或二进制值
				// 这里我们检查它是否大于 0
				expect(buttonValue > 0).to.equal(true);
			});
		});

		describe("Button Value State Transitions", () => {
			it("should handle button set to full value", () => {
				// 设置按钮值为 1.0
				gamepad.setAxisValue(Enum.KeyCode.ButtonR2, 1.0);
				advanceFrame(app);

				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 验证刚按下
				expect(actionState!.justPressed(TestAction.Throttle)).to.equal(true);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);
				expect(actionState!.released(TestAction.Throttle)).to.equal(false);
				expect(actionState!.justReleased(TestAction.Throttle)).to.equal(false);

				// 设置按钮值为 0.0
				gamepad.setAxisValue(Enum.KeyCode.ButtonR2, 0.0);
				advanceFrame(app);

				// 验证刚释放
				expect(actionState!.justPressed(TestAction.Throttle)).to.equal(false);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(false);
				expect(actionState!.justReleased(TestAction.Throttle)).to.equal(true);
				expect(actionState!.released(TestAction.Throttle)).to.equal(true);
			});
		});

		describe("Multiple Input Sources", () => {
			it("should activate action from any bound input", () => {
				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 测试键盘激活
				keyboard.pressKey(KeyCode.Space.getKeyCode());
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);

				// 释放键盘
				keyboard.releaseKey(KeyCode.Space.getKeyCode());
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(false);

				// 测试鼠标激活
				mouse.pressButton(Enum.UserInputType.MouseButton1);
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);

				// 释放鼠标
				mouse.releaseButton(Enum.UserInputType.MouseButton1);
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(false);

				// 测试手柄激活
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);
			});

			it("should maintain pressed state when multiple inputs held", () => {
				const actionState = app.getResource<ActionState<TestAction>>();
				expect(actionState).to.be.ok();

				// 按下键盘
				keyboard.pressKey(KeyCode.Space.getKeyCode());
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);

				// 同时按下鼠标
				mouse.pressButton(Enum.UserInputType.MouseButton1);
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);

				// 释放键盘,但鼠标仍按下
				keyboard.releaseKey(KeyCode.Space.getKeyCode());
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(true);

				// 释放鼠标
				mouse.releaseButton(Enum.UserInputType.MouseButton1);
				advanceFrame(app);
				expect(actionState!.pressed(TestAction.Throttle)).to.equal(false);
			});
		});
	});
};