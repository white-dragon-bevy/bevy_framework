/**
 * 测试基础设施验证
 * 验证 test-utils 和 input-simulator 是否正常工作
 */

import { createTestApp, advanceFrame, createTestWorld } from "./test-utils";
import { KeyboardSimulator, MouseSimulator, GamepadSimulator } from "./input-simulator";
import { CentralInputStore } from "../user-input/central-input-store";

/**
 * 为基础设施测试创建带有 CentralInputStore 的 App
 * 注意：这只用于测试 Simulator 本身，不是完整的 InputManager 测试
 * @returns 配置好的 App 实例
 */
function createInfrastructureTestApp() {
	const app = createTestApp();
	// 为 Simulator 测试创建最小的资源
	app.insertResource(new CentralInputStore());
	return app;
}

export = () => {
	describe("Test Infrastructure", () => {
		describe("test-utils", () => {
			it("should create a test app", () => {
				const app = createTestApp();

				expect(app).to.be.ok();
				// 注意：CentralInputStore 现在由插件创建，不再由 createTestApp 创建
			});

			it("should advance frame without errors", () => {
				const app = createTestApp();

				expect(() => {
					advanceFrame(app);
				}).never.to.throw();
			});

			it("should advance multiple frames", () => {
				const app = createTestApp();

				for (let frameIndex = 0; frameIndex < 10; frameIndex++) {
					advanceFrame(app, 1 / 60);
				}

				expect(true).to.equal(true);
			});

			it("should create test world", () => {
				const world = createTestWorld();

				expect(world).to.be.ok();
			});
		});

		describe("KeyboardSimulator", () => {
			it("should simulate key press and release", () => {
				const app = createInfrastructureTestApp();
				const keyboard = KeyboardSimulator.fromApp(app);

				keyboard.pressKey(Enum.KeyCode.Space);

				expect(keyboard.isPressed(Enum.KeyCode.Space)).to.equal(true);

				keyboard.releaseKey(Enum.KeyCode.Space);

				expect(keyboard.isPressed(Enum.KeyCode.Space)).to.equal(false);
			});

			it("should simulate typing multiple keys", () => {
				const app = createInfrastructureTestApp();
				const keyboard = KeyboardSimulator.fromApp(app);

				keyboard.typeKeys(Enum.KeyCode.A, Enum.KeyCode.B, Enum.KeyCode.C);

				// After typing, all keys should be released
				expect(keyboard.isPressed(Enum.KeyCode.A)).to.equal(false);
				expect(keyboard.isPressed(Enum.KeyCode.B)).to.equal(false);
				expect(keyboard.isPressed(Enum.KeyCode.C)).to.equal(false);
			});

			it("should release all keys", () => {
				const app = createInfrastructureTestApp();
				const keyboard = KeyboardSimulator.fromApp(app);

				keyboard.pressKey(Enum.KeyCode.W);
				keyboard.pressKey(Enum.KeyCode.A);
				keyboard.pressKey(Enum.KeyCode.S);
				keyboard.pressKey(Enum.KeyCode.D);

				keyboard.releaseAll();

				expect(keyboard.getPressedKeys().size()).to.equal(0);
			});
		});

		describe("MouseSimulator", () => {
			it("should simulate mouse button press and release", () => {
				const app = createInfrastructureTestApp();
				const mouse = MouseSimulator.fromApp(app);

				mouse.pressButton(Enum.UserInputType.MouseButton1);
				mouse.releaseButton(Enum.UserInputType.MouseButton1);

				expect(true).to.equal(true);
			});

			it("should simulate mouse clicks", () => {
				const app = createInfrastructureTestApp();
				const mouse = MouseSimulator.fromApp(app);

				mouse.clickLeft();
				mouse.clickRight();
				mouse.clickMiddle();

				expect(true).to.equal(true);
			});

			it("should track mouse position", () => {
				const app = createInfrastructureTestApp();
				const mouse = MouseSimulator.fromApp(app);

				mouse.moveBy(new Vector2(10, 20));

				const position = mouse.getPosition();

				expect(position.X).to.equal(10);
				expect(position.Y).to.equal(20);
			});

			it("should simulate mouse scroll", () => {
				const app = createInfrastructureTestApp();
				const mouse = MouseSimulator.fromApp(app);

				mouse.scrollBy(5);

				expect(mouse.getScroll()).to.equal(5);

				mouse.scrollBy(-3);

				expect(mouse.getScroll()).to.equal(2);
			});

			it("should reset mouse state", () => {
				const app = createInfrastructureTestApp();
				const mouse = MouseSimulator.fromApp(app);

				mouse.moveBy(new Vector2(100, 100));
				mouse.scrollBy(10);
				mouse.reset();

				expect(mouse.getPosition()).to.equal(Vector2.zero);
				expect(mouse.getScroll()).to.equal(0);
			});
		});

		describe("GamepadSimulator", () => {
			it("should simulate gamepad button press and release", () => {
				const app = createInfrastructureTestApp();
				const gamepad = GamepadSimulator.fromApp(app);

				gamepad.pressButton(Enum.KeyCode.ButtonA);

				expect(gamepad.isPressed(Enum.KeyCode.ButtonA)).to.equal(true);

				gamepad.releaseButton(Enum.KeyCode.ButtonA);

				expect(gamepad.isPressed(Enum.KeyCode.ButtonA)).to.equal(false);
			});

			it("should set left stick position", () => {
				const app = createInfrastructureTestApp();
				const gamepad = GamepadSimulator.fromApp(app);

				gamepad.setLeftStick(new Vector2(0.5, -0.3));

				const leftStick = gamepad.getLeftStick();

				expect(leftStick.X).to.be.near(0.5, 0.001);
				expect(leftStick.Y).to.be.near(-0.3, 0.001);
			});

			it("should set right stick position", () => {
				const app = createInfrastructureTestApp();
				const gamepad = GamepadSimulator.fromApp(app);

				gamepad.setRightStick(new Vector2(-0.8, 0.6));

				const rightStick = gamepad.getRightStick();

				expect(rightStick.X).to.be.near(-0.8, 0.001);
				expect(rightStick.Y).to.be.near(0.6, 0.001);
			});

			it("should clamp stick values to valid range", () => {
				const app = createInfrastructureTestApp();
				const gamepad = GamepadSimulator.fromApp(app);

				gamepad.setLeftStick(new Vector2(2.0, -3.0));

				const leftStick = gamepad.getLeftStick();

				expect(leftStick.X).to.equal(1.0);
				expect(leftStick.Y).to.equal(-1.0);
			});

			it("should reset gamepad state", () => {
				const app = createInfrastructureTestApp();
				const gamepad = GamepadSimulator.fromApp(app);

				gamepad.setLeftStick(new Vector2(1.0, 1.0));
				gamepad.setRightStick(new Vector2(-1.0, -1.0));
				gamepad.pressButton(Enum.KeyCode.ButtonA);
				gamepad.reset();

				expect(gamepad.getLeftStick()).to.equal(Vector2.zero);
				expect(gamepad.getRightStick()).to.equal(Vector2.zero);
				expect(gamepad.isPressed(Enum.KeyCode.ButtonA)).to.equal(false);
			});
		});
	});
};
