/**
 * 游戏手柄输入模块单元测试
 */

import {
	AxisSettings,
	ButtonAxisSettings,
	ButtonSettings,
	GamepadAxis,
	GamepadAxisChangedEvent,
	GamepadButton,
	GamepadButtonChangedEvent,
	GamepadButtonStateChangedEvent,
	GamepadConnection,
	GamepadConnectionEvent,
	GamepadManager,
	GamepadRumbleRequest,
	GamepadSettings,
	GamepadState,
	RawGamepadAxisChangedEvent,
	RawGamepadButtonChangedEvent,
} from "../gamepad";
import { ButtonState } from "../mouse-events";

const testGamepadId = Enum.UserInputType.Gamepad1;

export = () => {
	describe("GamepadButton 枚举", () => {
		it("应该包含所有标准按钮", () => {
			expect(GamepadButton.South).to.equal("ButtonA");
			expect(GamepadButton.East).to.equal("ButtonB");
			expect(GamepadButton.North).to.equal("ButtonY");
			expect(GamepadButton.West).to.equal("ButtonX");
			expect(GamepadButton.LeftShoulder).to.equal("ButtonL1");
			expect(GamepadButton.RightShoulder).to.equal("ButtonR1");
		});

		it("应该包含十字键按钮", () => {
			expect(GamepadButton.DPadUp).to.equal("DPadUp");
			expect(GamepadButton.DPadDown).to.equal("DPadDown");
			expect(GamepadButton.DPadLeft).to.equal("DPadLeft");
			expect(GamepadButton.DPadRight).to.equal("DPadRight");
		});
	});

	describe("GamepadAxis 枚举", () => {
		it("应该包含所有标准轴", () => {
			expect(GamepadAxis.LeftStickX).to.equal("LeftThumbstickX");
			expect(GamepadAxis.LeftStickY).to.equal("LeftThumbstickY");
			expect(GamepadAxis.RightStickX).to.equal("RightThumbstickX");
			expect(GamepadAxis.RightStickY).to.equal("RightThumbstickY");
		});
	});

	describe("GamepadConnectionEvent 事件", () => {
		it("应该创建连接事件", () => {
			const event = new GamepadConnectionEvent(testGamepadId, GamepadConnection.Connected);

			expect(event.gamepad).to.equal(testGamepadId);
			expect(event.connection).to.equal(GamepadConnection.Connected);
		});

		it("connected 方法应该正确判断", () => {
			const connectedEvent = new GamepadConnectionEvent(testGamepadId, GamepadConnection.Connected);
			const disconnectedEvent = new GamepadConnectionEvent(testGamepadId, GamepadConnection.Disconnected);

			expect(connectedEvent.connected()).to.equal(true);
			expect(disconnectedEvent.connected()).to.equal(false);
		});

		it("disconnected 方法应该正确判断", () => {
			const connectedEvent = new GamepadConnectionEvent(testGamepadId, GamepadConnection.Connected);
			const disconnectedEvent = new GamepadConnectionEvent(testGamepadId, GamepadConnection.Disconnected);

			expect(connectedEvent.disconnected()).to.equal(false);
			expect(disconnectedEvent.disconnected()).to.equal(true);
		});
	});

	describe("RawGamepadButtonChangedEvent 事件", () => {
		it("应该创建原始按钮变化事件", () => {
			const event = new RawGamepadButtonChangedEvent(testGamepadId, GamepadButton.South, 0.8);

			expect(event.gamepad).to.equal(testGamepadId);
			expect(event.button).to.equal(GamepadButton.South);
			expect(event.value).to.equal(0.8);
		});
	});

	describe("RawGamepadAxisChangedEvent 事件", () => {
		it("应该创建原始轴变化事件", () => {
			const event = new RawGamepadAxisChangedEvent(testGamepadId, GamepadAxis.LeftStickX, 0.5);

			expect(event.gamepad).to.equal(testGamepadId);
			expect(event.axis).to.equal(GamepadAxis.LeftStickX);
			expect(event.value).to.equal(0.5);
		});
	});

	describe("GamepadButtonStateChangedEvent 事件", () => {
		it("应该创建按钮状态变化事件", () => {
			const event = new GamepadButtonStateChangedEvent(
				testGamepadId,
				GamepadButton.South,
				ButtonState.Pressed,
			);

			expect(event.gamepad).to.equal(testGamepadId);
			expect(event.button).to.equal(GamepadButton.South);
			expect(event.state).to.equal(ButtonState.Pressed);
		});
	});

	describe("GamepadButtonChangedEvent 事件", () => {
		it("应该创建按钮变化事件", () => {
			const event = new GamepadButtonChangedEvent(
				testGamepadId,
				GamepadButton.South,
				ButtonState.Pressed,
				0.8,
			);

			expect(event.gamepad).to.equal(testGamepadId);
			expect(event.button).to.equal(GamepadButton.South);
			expect(event.state).to.equal(ButtonState.Pressed);
			expect(event.value).to.equal(0.8);
		});
	});

	describe("GamepadAxisChangedEvent 事件", () => {
		it("应该创建轴变化事件", () => {
			const event = new GamepadAxisChangedEvent(testGamepadId, GamepadAxis.LeftStickX, 0.5);

			expect(event.gamepad).to.equal(testGamepadId);
			expect(event.axis).to.equal(GamepadAxis.LeftStickX);
			expect(event.value).to.equal(0.5);
		});
	});

	describe("GamepadRumbleRequest 事件", () => {
		it("应该创建震动请求", () => {
			const request = new GamepadRumbleRequest(testGamepadId, 0.8, 1.5);

			expect(request.gamepad).to.equal(testGamepadId);
			expect(request.intensity).to.equal(0.8);
			expect(request.duration).to.equal(1.5);
		});
	});

	describe("ButtonSettings 类", () => {
		it("应该使用默认值创建", () => {
			const settings = new ButtonSettings();

			expect(settings.pressThreshold).to.equal(0.75);
			expect(settings.releaseThreshold).to.equal(0.65);
		});

		it("应该使用自定义值创建", () => {
			const settings = new ButtonSettings(0.8, 0.6);

			expect(settings.pressThreshold).to.equal(0.8);
			expect(settings.releaseThreshold).to.equal(0.6);
		});

		it("应该在无效阈值时抛出错误", () => {
			expect(() => {
				new ButtonSettings(1.5, 0.5);
			}).to.throw();

			expect(() => {
				new ButtonSettings(0.5, 1.5);
			}).to.throw();

			expect(() => {
				new ButtonSettings(0.5, 0.8);
			}).to.throw();
		});

		it("isPressed 应该正确判断", () => {
			const settings = new ButtonSettings(0.75, 0.65);

			expect(settings.isPressed(0.8)).to.equal(true);
			expect(settings.isPressed(0.75)).to.equal(true);
			expect(settings.isPressed(0.7)).to.equal(false);
		});

		it("isReleased 应该正确判断", () => {
			const settings = new ButtonSettings(0.75, 0.65);

			expect(settings.isReleased(0.6)).to.equal(true);
			expect(settings.isReleased(0.65)).to.equal(true);
			expect(settings.isReleased(0.7)).to.equal(false);
		});
	});

	describe("AxisSettings 类", () => {
		it("应该使用默认值创建", () => {
			const settings = new AxisSettings();

			expect(settings.deadzoneLowerBound).to.equal(-0.1);
			expect(settings.deadzoneUpperBound).to.equal(0.1);
			expect(settings.livezoneLowerBound).to.equal(-0.95);
			expect(settings.livezoneUpperBound).to.equal(0.95);
			expect(settings.threshold).to.equal(0.01);
		});

		it("应该在无效参数时抛出错误", () => {
			expect(() => {
				new AxisSettings(0.1, 0.1, -0.95, 0.95, 0.01);
			}).to.throw();

			expect(() => {
				new AxisSettings(-0.1, 0.1, -0.1, 0.95, 0.01);
			}).to.throw();
		});

		it("filter 应该应用死区", () => {
			const settings = new AxisSettings();

			expect(settings.filter(0.05)).to.equal(0);
			expect(settings.filter(-0.05)).to.equal(0);
			// 0.11 在死区外，应该被缩放: (0.11 - 0.1) / (0.95 - 0.1) = 0.01 / 0.85
			expect(settings.filter(0.11)).to.be.near(0.01176, 0.001);
		});

		it("filter 应该应用活动区限制", () => {
			const settings = new AxisSettings();

			expect(settings.filter(1.0)).to.equal(1);
			expect(settings.filter(-1.0)).to.equal(-1);
			expect(settings.filter(0.96)).to.equal(1);
			expect(settings.filter(-0.96)).to.equal(-1);
		});

		it("filter 应该检查阈值", () => {
			const settings = new AxisSettings(-0.1, 0.1, -0.95, 0.95, 0.05);

			expect(settings.filter(0.2, 0.19)).to.equal(undefined);
			// 0.2 在死区外，应该被缩放: (0.2 - 0.1) / (0.95 - 0.1) = 0.1 / 0.85
			expect(settings.filter(0.2, 0.1)).to.be.near(0.11765, 0.001);
		});
	});

	describe("ButtonAxisSettings 类", () => {
		it("应该使用默认值创建", () => {
			const settings = new ButtonAxisSettings();

			expect(settings.threshold).to.equal(0.01);
		});

		it("应该在无效阈值时抛出错误", () => {
			expect(() => {
				new ButtonAxisSettings(3.0);
			}).to.throw();
		});

		it("filter 应该检查阈值", () => {
			const settings = new ButtonAxisSettings(0.05);

			expect(settings.filter(0.5, 0.49)).to.equal(undefined);
			expect(settings.filter(0.5, 0.4)).to.equal(0.5);
			expect(settings.filter(0.5)).to.equal(0.5);
		});
	});

	describe("GamepadSettings 类", () => {
		it("应该初始化默认设置", () => {
			const settings = new GamepadSettings();

			expect(settings.defaultButtonSettings).to.be.ok();
			expect(settings.defaultAxisSettings).to.be.ok();
			expect(settings.defaultButtonAxisSettings).to.be.ok();
		});

		it("getButtonSettings 应该返回默认或自定义设置", () => {
			const settings = new GamepadSettings();
			const customSettings = new ButtonSettings(0.8, 0.6);

			settings.buttonSettings.set(GamepadButton.South, customSettings);

			expect(settings.getButtonSettings(GamepadButton.South)).to.equal(customSettings);
			expect(settings.getButtonSettings(GamepadButton.East)).to.equal(settings.defaultButtonSettings);
		});

		it("getAxisSettings 应该返回默认或自定义设置", () => {
			const settings = new GamepadSettings();
			const customSettings = new AxisSettings();

			settings.axisSettings.set(GamepadAxis.LeftStickX, customSettings);

			expect(settings.getAxisSettings(GamepadAxis.LeftStickX)).to.equal(customSettings);
			expect(settings.getAxisSettings(GamepadAxis.RightStickX)).to.equal(settings.defaultAxisSettings);
		});

		it("getButtonAxisSettings 应该返回默认或自定义设置", () => {
			const settings = new GamepadSettings();
			const customSettings = new ButtonAxisSettings(0.05);

			settings.buttonAxisSettings.set(GamepadButton.LeftTrigger, customSettings);

			expect(settings.getButtonAxisSettings(GamepadButton.LeftTrigger)).to.equal(customSettings);
			expect(settings.getButtonAxisSettings(GamepadButton.RightTrigger)).to.equal(
				settings.defaultButtonAxisSettings,
			);
		});
	});

	describe("GamepadState 类", () => {
		it("应该创建游戏手柄状态", () => {
			const state = new GamepadState(testGamepadId, "Test Gamepad");

			expect(state.id).to.equal(testGamepadId);
			expect(state.name).to.equal("Test Gamepad");
			expect(state.buttons).to.be.ok();
			expect(state.axes).to.be.ok();
			expect(state.buttonValues).to.be.ok();
		});

		it("应该使用默认名称创建", () => {
			const state = new GamepadState(testGamepadId);

			expect(state.name).to.equal("Unknown Gamepad");
		});

		it("getAxis 应该返回轴值或默认值", () => {
			const state = new GamepadState(testGamepadId);

			expect(state.getAxis(GamepadAxis.LeftStickX)).to.equal(0);

			state.setAxis(GamepadAxis.LeftStickX, 0.5);

			expect(state.getAxis(GamepadAxis.LeftStickX)).to.equal(0.5);
		});

		it("getButtonValue 应该返回按钮值或默认值", () => {
			const state = new GamepadState(testGamepadId);

			expect(state.getButtonValue(GamepadButton.South)).to.equal(0);

			state.setButtonValue(GamepadButton.South, 0.8);

			expect(state.getButtonValue(GamepadButton.South)).to.equal(0.8);
		});

		it("leftStick 应该返回左摇杆向量", () => {
			const state = new GamepadState(testGamepadId);

			state.setAxis(GamepadAxis.LeftStickX, 0.5);
			state.setAxis(GamepadAxis.LeftStickY, -0.3);

			const stick = state.leftStick();

			expect(stick.X).to.be.near(0.5);
			expect(stick.Y).to.be.near(-0.3);
		});

		it("rightStick 应该返回右摇杆向量", () => {
			const state = new GamepadState(testGamepadId);

			state.setAxis(GamepadAxis.RightStickX, -0.2);
			state.setAxis(GamepadAxis.RightStickY, 0.7);

			const stick = state.rightStick();

			expect(stick.X).to.be.near(-0.2);
			expect(stick.Y).to.be.near(0.7);
		});

		it("dpad 应该返回十字键向量", () => {
			const state = new GamepadState(testGamepadId);

			state.setButtonValue(GamepadButton.DPadRight, 1);
			state.setButtonValue(GamepadButton.DPadUp, 1);

			const dpad = state.dpad();

			expect(dpad.X).to.equal(1);
			expect(dpad.Y).to.equal(1);
		});

		it("pressed/justPressed/justReleased 应该正确工作", () => {
			const state = new GamepadState(testGamepadId);

			state.buttons.press(GamepadButton.South);

			expect(state.pressed(GamepadButton.South)).to.equal(true);
			expect(state.justPressed(GamepadButton.South)).to.equal(true);

			state.clear();

			expect(state.pressed(GamepadButton.South)).to.equal(true);
			expect(state.justPressed(GamepadButton.South)).to.equal(false);

			state.buttons.release(GamepadButton.South);

			expect(state.pressed(GamepadButton.South)).to.equal(false);
			expect(state.justReleased(GamepadButton.South)).to.equal(true);
		});
	});

	describe("GamepadManager 类", () => {
		it("应该创建管理器", () => {
			const manager = new GamepadManager();

			expect(manager.settings).to.be.ok();
		});

		it("add 应该添加游戏手柄", () => {
			const manager = new GamepadManager();

			manager.add(testGamepadId, "Test Gamepad");

			expect(manager.has(testGamepadId)).to.equal(true);
		});

		it("add 不应该重复添加", () => {
			const manager = new GamepadManager();

			manager.add(testGamepadId, "Test Gamepad 1");
			manager.add(testGamepadId, "Test Gamepad 2");

			const state = manager.get(testGamepadId);

			expect(state).to.be.ok();

			if (state) {
				expect(state.name).to.equal("Test Gamepad 1");
			}
		});

		it("remove 应该移除游戏手柄", () => {
			const manager = new GamepadManager();

			manager.add(testGamepadId);
			manager.remove(testGamepadId);

			expect(manager.has(testGamepadId)).to.equal(false);
		});

		it("get 应该返回游戏手柄状态", () => {
			const manager = new GamepadManager();

			manager.add(testGamepadId, "Test Gamepad");

			const state = manager.get(testGamepadId);

			expect(state).to.be.ok();

			if (state) {
				expect(state.id).to.equal(testGamepadId);
				expect(state.name).to.equal("Test Gamepad");
			}
		});

		it("getAll 应该返回所有游戏手柄", () => {
			const manager = new GamepadManager();

			manager.add(Enum.UserInputType.Gamepad1);
			manager.add(Enum.UserInputType.Gamepad2);
			manager.add(Enum.UserInputType.Gamepad3);

			const all = manager.getAll();

			expect(all.size()).to.equal(3);
		});

		it("clearAll 应该清除所有游戏手柄的输入状态", () => {
			const manager = new GamepadManager();

			manager.add(testGamepadId);

			const state = manager.get(testGamepadId);

			if (state) {
				state.buttons.press(GamepadButton.South);

				expect(state.justPressed(GamepadButton.South)).to.equal(true);

				manager.clearAll();

				expect(state.pressed(GamepadButton.South)).to.equal(true);
				expect(state.justPressed(GamepadButton.South)).to.equal(false);
			}
		});
	});
};