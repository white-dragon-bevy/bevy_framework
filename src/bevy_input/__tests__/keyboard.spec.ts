/**
 * 键盘输入模块单元测试
 */

import { World } from "@rbxts/matter";
import { MessageRegistry } from "../../bevy_ecs/message";
import { KeyboardFocusLost, KeyboardInput, keyboardInputSystem } from "../keyboard";
import { ButtonState } from "../mouse-events";
import * as ResourceStorage from "../resource-storage";
import { ButtonInput } from "../button-input";

export = () => {
	describe("KeyboardInput 事件", () => {
		it("应该创建带有所有属性的键盘输入事件", () => {
			const event = new KeyboardInput(Enum.KeyCode.A, "a", ButtonState.Pressed, "a", false);

			expect(event.keyCode).to.equal(Enum.KeyCode.A);
			expect(event.logicalKey).to.equal("a");
			expect(event.state).to.equal(ButtonState.Pressed);
			expect(event.textValue).to.equal("a");
			expect(event.repeatFlag).to.equal(false);
		});

		it("应该创建带有默认 repeatFlag 的事件", () => {
			const event = new KeyboardInput(Enum.KeyCode.B, "b", ButtonState.Released);

			expect(event.repeatFlag).to.equal(false);
		});

		it("应该支持重复按键标志", () => {
			const event = new KeyboardInput(Enum.KeyCode.C, "c", ButtonState.Pressed, "c", true);

			expect(event.repeatFlag).to.equal(true);
		});
	});

	describe("KeyboardFocusLost 事件", () => {
		it("应该创建焦点丢失事件", () => {
			const event = new KeyboardFocusLost();

			expect(event).to.be.ok();
		});
	});

	describe("keyboardInputSystem 系统", () => {
		let world: World;
		let messageRegistry: MessageRegistry;

		beforeEach(() => {
			world = new World();
			messageRegistry = new MessageRegistry(world);

			// 初始化资源
			const keyCodeInput = new ButtonInput<Enum.KeyCode>();
			const keyInput = new ButtonInput<string>();
			ResourceStorage.setKeyboardInput(world, keyCodeInput);
			ResourceStorage.setKeyInput(world, keyInput);
		});

		it("应该处理按键按下事件", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();
			const focusWriter = messageRegistry.createWriter<KeyboardFocusLost>();

			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, "a", ButtonState.Pressed));

			const keyboardReader = messageRegistry.createReader<KeyboardInput>();
			const focusReader = messageRegistry.createReader<KeyboardFocusLost>();

			keyboardInputSystem(world, keyboardReader, focusReader);

			const keyCodeInput = ResourceStorage.getKeyboardInput(world);
			const keyInput = ResourceStorage.getKeyInput(world);

			expect(keyCodeInput).to.be.ok();
			expect(keyInput).to.be.ok();

			if (keyCodeInput && keyInput) {
				expect(keyCodeInput.isPressed(Enum.KeyCode.A)).to.equal(true);
				expect(keyCodeInput.justPressed(Enum.KeyCode.A)).to.equal(true);
				expect(keyInput.isPressed("a")).to.equal(true);
				expect(keyInput.justPressed("a")).to.equal(true);
			}
		});

		it("应该处理按键释放事件", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();
			const focusWriter = messageRegistry.createWriter<KeyboardFocusLost>();

			// 先按下
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, "a", ButtonState.Pressed));

			const reader1 = messageRegistry.createReader<KeyboardInput>();
			const focusReader1 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader1, focusReader1);

			// 清空事件
			messageRegistry.updateAll();

			// 再释放
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, "a", ButtonState.Released));

			const reader2 = messageRegistry.createReader<KeyboardInput>();
			const focusReader2 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader2, focusReader2);

			const keyCodeInput = ResourceStorage.getKeyboardInput(world);
			const keyInput = ResourceStorage.getKeyInput(world);

			expect(keyCodeInput).to.be.ok();
			expect(keyInput).to.be.ok();

			if (keyCodeInput && keyInput) {
				expect(keyCodeInput.isPressed(Enum.KeyCode.A)).to.equal(false);
				expect(keyCodeInput.justReleased(Enum.KeyCode.A)).to.equal(true);
				expect(keyInput.isPressed("a")).to.equal(false);
				expect(keyInput.justReleased("a")).to.equal(true);
			}
		});

		it("应该处理多个按键", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();

			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, "a", ButtonState.Pressed));
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.B, "b", ButtonState.Pressed));
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.C, "c", ButtonState.Pressed));

			const keyboardReader = messageRegistry.createReader<KeyboardInput>();
			const focusReader = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, keyboardReader, focusReader);

			const keyCodeInput = ResourceStorage.getKeyboardInput(world);

			expect(keyCodeInput).to.be.ok();

			if (keyCodeInput) {
				expect(keyCodeInput.isPressed(Enum.KeyCode.A)).to.equal(true);
				expect(keyCodeInput.isPressed(Enum.KeyCode.B)).to.equal(true);
				expect(keyCodeInput.isPressed(Enum.KeyCode.C)).to.equal(true);
			}
		});

		it("应该在焦点丢失时释放所有按键", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();
			const focusWriter = messageRegistry.createWriter<KeyboardFocusLost>();

			// 按下多个按键
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, "a", ButtonState.Pressed));
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.B, "b", ButtonState.Pressed));

			const reader1 = messageRegistry.createReader<KeyboardInput>();
			const focusReader1 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader1, focusReader1);

			// 清空并触发焦点丢失
			messageRegistry.updateAll();
			focusWriter.write(new KeyboardFocusLost());

			const reader2 = messageRegistry.createReader<KeyboardInput>();
			const focusReader2 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader2, focusReader2);

			const keyCodeInput = ResourceStorage.getKeyboardInput(world);
			const keyInput = ResourceStorage.getKeyInput(world);

			expect(keyCodeInput).to.be.ok();
			expect(keyInput).to.be.ok();

			if (keyCodeInput && keyInput) {
				expect(keyCodeInput.isPressed(Enum.KeyCode.A)).to.equal(false);
				expect(keyCodeInput.isPressed(Enum.KeyCode.B)).to.equal(false);
				expect(keyInput.isPressed("a")).to.equal(false);
				expect(keyInput.isPressed("b")).to.equal(false);
			}
		});

		it("应该清除上一帧的 just 状态", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();

			// 第一帧 - 按下
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, "a", ButtonState.Pressed));

			const reader1 = messageRegistry.createReader<KeyboardInput>();
			const focusReader1 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader1, focusReader1);

			const keyCodeInput1 = ResourceStorage.getKeyboardInput(world);

			expect(keyCodeInput1).to.be.ok();

			if (keyCodeInput1) {
				expect(keyCodeInput1.justPressed(Enum.KeyCode.A)).to.equal(true);
			}

			// 第二帧 - 无事件
			messageRegistry.updateAll();

			const reader2 = messageRegistry.createReader<KeyboardInput>();
			const focusReader2 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader2, focusReader2);

			const keyCodeInput2 = ResourceStorage.getKeyboardInput(world);

			expect(keyCodeInput2).to.be.ok();

			if (keyCodeInput2) {
				expect(keyCodeInput2.isPressed(Enum.KeyCode.A)).to.equal(true);
				expect(keyCodeInput2.justPressed(Enum.KeyCode.A)).to.equal(false);
			}
		});

		it("应该在资源不存在时安全返回", () => {
			const emptyWorld = new World();
			const emptyRegistry = new MessageRegistry(emptyWorld);
			const keyboardWriter = emptyRegistry.createWriter<KeyboardInput>();

			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, "a", ButtonState.Pressed));

			const keyboardReader = emptyRegistry.createReader<KeyboardInput>();
			const focusReader = emptyRegistry.createReader<KeyboardFocusLost>();

			expect(() => {
				keyboardInputSystem(emptyWorld, keyboardReader, focusReader);
			}).never.to.throw();
		});
	});
};