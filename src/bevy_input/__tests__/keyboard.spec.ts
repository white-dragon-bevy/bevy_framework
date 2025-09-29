/**
 * 键盘输入模块单元测试
 */

import { World } from "../../bevy_ecs";
import { MessageRegistry } from "../../bevy_ecs/message";
import {
	Key,
	KeyboardFocusLost,
	KeyboardInput,
	keyboardInputSystem,
	characterKey,
	deadKey,
	isCharacterKey,
	isDeadKey,
	isNamedKey,
	getKeyDisplayString,
	getLogicalKey,
} from "../keyboard";
import { ButtonState } from "../mouse-events";
import { ButtonInput } from "../button-input";
import { getKeyboardInput, getKeyInput } from "../plugin";

export = () => {
	describe("KeyboardInput 事件", () => {
		it("应该创建带有所有属性的键盘输入事件", () => {
			const event = new KeyboardInput(Enum.KeyCode.A, characterKey("a"), ButtonState.Pressed, "a", false);

			expect(event.keyCode).to.equal(Enum.KeyCode.A);
			expect(event.key).to.be.ok();
			if (isCharacterKey(event.key)) {
				expect(event.key.Character).to.equal("a");
			}
			expect(event.state).to.equal(ButtonState.Pressed);
			expect(event.textValue).to.equal("a");
			expect(event.isRepeat).to.equal(false);
		});

		it("应该创建带有默认 isRepeat 的事件", () => {
			const event = new KeyboardInput(Enum.KeyCode.B, characterKey("b"), ButtonState.Released);

			expect(event.isRepeat).to.equal(false);
		});

		it("应该支持重复按键标志", () => {
			const event = new KeyboardInput(Enum.KeyCode.C, characterKey("c"), ButtonState.Pressed, "c", true);

			expect(event.isRepeat).to.equal(true);
		});

		it("应该支持命名键", () => {
			const event = new KeyboardInput(Enum.KeyCode.Return, "Enter", ButtonState.Pressed);

			expect(event.key).to.equal("Enter");
			expect(isNamedKey(event.key)).to.equal(true);
		});

		it("应该支持字符键", () => {
			const charKey = characterKey("x");
			const event = new KeyboardInput(Enum.KeyCode.X, charKey, ButtonState.Pressed);

			expect(isCharacterKey(event.key)).to.equal(true);
			if (isCharacterKey(event.key)) {
				expect(event.key.Character).to.equal("x");
			}
		});

		it("应该支持死键", () => {
			const deadKeyValue = deadKey("´");
			const event = new KeyboardInput(Enum.KeyCode.Quote, deadKeyValue, ButtonState.Pressed);

			expect(isDeadKey(event.key)).to.equal(true);
			if (isDeadKey(event.key)) {
				expect(event.key.Dead).to.equal("´");
			}
		});
	});

	describe("Key 类型安全", () => {
		it("应该正确识别字符键", () => {
			const charKey = characterKey("Hello");
			expect(isCharacterKey(charKey)).to.equal(true);
			expect(isDeadKey(charKey)).to.equal(false);
			expect(isNamedKey(charKey)).to.equal(false);
		});

		it("应该正确识别死键", () => {
			const deadKeyValue = deadKey("¨");
			expect(isDeadKey(deadKeyValue)).to.equal(true);
			expect(isCharacterKey(deadKeyValue)).to.equal(false);
			expect(isNamedKey(deadKeyValue)).to.equal(false);
		});

		it("应该正确识别命名键", () => {
			const namedKey: Key = "Enter";
			expect(isNamedKey(namedKey)).to.equal(true);
			expect(isCharacterKey(namedKey)).to.equal(false);
			expect(isDeadKey(namedKey)).to.equal(false);
		});

		it("应该正确生成显示字符串", () => {
			expect(getKeyDisplayString(characterKey("a"))).to.equal("a");
			expect(getKeyDisplayString(deadKey("´"))).to.equal("Dead(´)");
			expect(getKeyDisplayString(deadKey())).to.equal("Dead");
			expect(getKeyDisplayString("Enter")).to.equal("Enter");
		});
	});

	describe("KeyCode 到 Key 映射", () => {
		it("应该正确映射功能键", () => {
			expect(getLogicalKey(Enum.KeyCode.Return)).to.equal("Enter");
			expect(getLogicalKey(Enum.KeyCode.Tab)).to.equal("Tab");
			expect(getLogicalKey(Enum.KeyCode.Escape)).to.equal("Escape");
			expect(getLogicalKey(Enum.KeyCode.Space)).to.equal("Space");
		});

		it("应该正确映射箭头键", () => {
			expect(getLogicalKey(Enum.KeyCode.Up)).to.equal("ArrowUp");
			expect(getLogicalKey(Enum.KeyCode.Down)).to.equal("ArrowDown");
			expect(getLogicalKey(Enum.KeyCode.Left)).to.equal("ArrowLeft");
			expect(getLogicalKey(Enum.KeyCode.Right)).to.equal("ArrowRight");
		});

		it("应该正确映射修饰键", () => {
			expect(getLogicalKey(Enum.KeyCode.LeftShift)).to.equal("ShiftLeft");
			expect(getLogicalKey(Enum.KeyCode.RightShift)).to.equal("ShiftRight");
			expect(getLogicalKey(Enum.KeyCode.LeftControl)).to.equal("ControlLeft");
			expect(getLogicalKey(Enum.KeyCode.RightControl)).to.equal("ControlRight");
		});

		it("应该正确映射字母键为字符键", () => {
			const aKey = getLogicalKey(Enum.KeyCode.A);
			expect(isCharacterKey(aKey)).to.equal(true);
			if (isCharacterKey(aKey)) {
				expect(aKey.Character).to.equal("a");
			}

			const zKey = getLogicalKey(Enum.KeyCode.Z);
			expect(isCharacterKey(zKey)).to.equal(true);
			if (isCharacterKey(zKey)) {
				expect(zKey.Character).to.equal("z");
			}
		});

		it("应该正确映射数字键为字符键", () => {
			const zeroKey = getLogicalKey(Enum.KeyCode.Zero);
			expect(isCharacterKey(zeroKey)).to.equal(true);
			if (isCharacterKey(zeroKey)) {
				expect(zeroKey.Character).to.equal("0");
			}

			const nineKey = getLogicalKey(Enum.KeyCode.Nine);
			expect(isCharacterKey(nineKey)).to.equal(true);
			if (isCharacterKey(nineKey)) {
				expect(nineKey.Character).to.equal("9");
			}
		});

		it("应该优先使用文本输入创建字符键", () => {
			const key = getLogicalKey(Enum.KeyCode.A, "A");
			expect(isCharacterKey(key)).to.equal(true);
			if (isCharacterKey(key)) {
				expect(key.Character).to.equal("A");
			}
		});

		it("应该将未知键码映射为 Unidentified", () => {
			// 使用一个不存在的键码进行测试
			const unknownKey = getLogicalKey((-1 as unknown) as Enum.KeyCode);
			expect(unknownKey).to.equal("Unidentified");
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
			const keyInput = new ButtonInput<Key>();
			world.resources.insertResource(keyCodeInput);
			world.resources.insertResource(keyInput);
		});

		it("应该处理按键按下事件", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();
			const focusWriter = messageRegistry.createWriter<KeyboardFocusLost>();

			const aKey = characterKey("a");
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, aKey, ButtonState.Pressed));

			const keyboardReader = messageRegistry.createReader<KeyboardInput>();
			const focusReader = messageRegistry.createReader<KeyboardFocusLost>();

			keyboardInputSystem(world, keyboardReader, focusReader);

			const keyCodeInput = getKeyboardInput(world);
			const keyInput = getKeyInput(world);

			expect(keyCodeInput).to.be.ok();
			expect(keyInput).to.be.ok();

			if (keyCodeInput && keyInput) {
				expect(keyCodeInput.isPressed(Enum.KeyCode.A)).to.equal(true);
				expect(keyCodeInput.justPressed(Enum.KeyCode.A)).to.equal(true);
				expect(keyInput.isPressed(aKey)).to.equal(true);
				expect(keyInput.justPressed(aKey)).to.equal(true);
			}
		});

		it("应该处理按键释放事件", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();
			const focusWriter = messageRegistry.createWriter<KeyboardFocusLost>();

			const aKey = characterKey("a");

			// 先按下
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, aKey, ButtonState.Pressed));

			const reader1 = messageRegistry.createReader<KeyboardInput>();
			const focusReader1 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader1, focusReader1);

			// 清空事件
			messageRegistry.updateAll();

			// 再释放
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, aKey, ButtonState.Released));

			const reader2 = messageRegistry.createReader<KeyboardInput>();
			const focusReader2 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader2, focusReader2);

			const keyCodeInput = getKeyboardInput(world);
			const keyInput = getKeyInput(world);

			expect(keyCodeInput).to.be.ok();
			expect(keyInput).to.be.ok();

			if (keyCodeInput && keyInput) {
				expect(keyCodeInput.isPressed(Enum.KeyCode.A)).to.equal(false);
				expect(keyCodeInput.justReleased(Enum.KeyCode.A)).to.equal(true);
				expect(keyInput.isPressed(aKey)).to.equal(false);
				expect(keyInput.justReleased(aKey)).to.equal(true);
			}
		});

		it("应该处理多个按键", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();

			const aKey = characterKey("a");
			const bKey = characterKey("b");
			const cKey = characterKey("c");

			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, aKey, ButtonState.Pressed));
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.B, bKey, ButtonState.Pressed));
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.C, cKey, ButtonState.Pressed));

			const keyboardReader = messageRegistry.createReader<KeyboardInput>();
			const focusReader = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, keyboardReader, focusReader);

			const keyCodeInput = getKeyboardInput(world);

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

			const aKey = characterKey("a");
			const bKey = characterKey("b");

			// 按下多个按键
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, aKey, ButtonState.Pressed));
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.B, bKey, ButtonState.Pressed));

			const reader1 = messageRegistry.createReader<KeyboardInput>();
			const focusReader1 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader1, focusReader1);

			// 清空并触发焦点丢失
			messageRegistry.updateAll();
			focusWriter.write(new KeyboardFocusLost());

			const reader2 = messageRegistry.createReader<KeyboardInput>();
			const focusReader2 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader2, focusReader2);

			const keyCodeInput = getKeyboardInput(world);
			const keyInput = getKeyInput(world);

			expect(keyCodeInput).to.be.ok();
			expect(keyInput).to.be.ok();

			if (keyCodeInput && keyInput) {
				expect(keyCodeInput.isPressed(Enum.KeyCode.A)).to.equal(false);
				expect(keyCodeInput.isPressed(Enum.KeyCode.B)).to.equal(false);
				expect(keyInput.isPressed(aKey)).to.equal(false);
				expect(keyInput.isPressed(bKey)).to.equal(false);
			}
		});

		it("应该清除上一帧的 just 状态", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();

			const aKey = characterKey("a");

			// 第一帧 - 按下
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, aKey, ButtonState.Pressed));

			const reader1 = messageRegistry.createReader<KeyboardInput>();
			const focusReader1 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader1, focusReader1);

			const keyCodeInput1 = getKeyboardInput(world);

			expect(keyCodeInput1).to.be.ok();

			if (keyCodeInput1) {
				expect(keyCodeInput1.justPressed(Enum.KeyCode.A)).to.equal(true);
			}

			// 第二帧 - 无事件
			messageRegistry.updateAll();

			const reader2 = messageRegistry.createReader<KeyboardInput>();
			const focusReader2 = messageRegistry.createReader<KeyboardFocusLost>();
			keyboardInputSystem(world, reader2, focusReader2);

			const keyCodeInput2 = getKeyboardInput(world);

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

			const aKey = characterKey("a");
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, aKey, ButtonState.Pressed));

			const keyboardReader = emptyRegistry.createReader<KeyboardInput>();
			const focusReader = emptyRegistry.createReader<KeyboardFocusLost>();

			expect(() => {
				keyboardInputSystem(emptyWorld, keyboardReader, focusReader);
			}).never.to.throw();
		});

		it("应该正确处理带有 textValue 的键盘输入事件", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();
			const focusWriter = messageRegistry.createWriter<KeyboardFocusLost>();

			// 创建一个带有 textValue 的键盘输入事件（模拟文本输入）
			const aKey = characterKey("a");
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.A, aKey, ButtonState.Pressed, "a"));

			const keyboardReader = messageRegistry.createReader<KeyboardInput>();
			const focusReader = messageRegistry.createReader<KeyboardFocusLost>();

			keyboardInputSystem(world, keyboardReader, focusReader);

			const keyCodeInput = getKeyboardInput(world);
			const keyInput = getKeyInput(world);

			expect(keyCodeInput).to.be.ok();
			expect(keyInput).to.be.ok();

			if (keyCodeInput && keyInput) {
				expect(keyCodeInput.isPressed(Enum.KeyCode.A)).to.equal(true);
				expect(keyCodeInput.justPressed(Enum.KeyCode.A)).to.equal(true);
				expect(keyInput.isPressed(aKey)).to.equal(true);
				expect(keyInput.justPressed(aKey)).to.equal(true);
			}

			// 验证事件的 textValue 属性
			const events = keyboardReader.read();
			expect(events.size() > 0).to.equal(true);

			// 查找带有 textValue 的事件
			let foundTextEvent = false;
			for (const event of events) {
				if (event.textValue === "a") {
					foundTextEvent = true;
					expect(event.keyCode).to.equal(Enum.KeyCode.A);
					expect(isCharacterKey(event.key)).to.equal(true);
					if (isCharacterKey(event.key)) {
						expect(event.key.Character).to.equal("a");
					}
					break;
				}
			}
			expect(foundTextEvent).to.equal(true);
		});

		it("应该正确处理特殊字符的 textValue", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();

			// 测试特殊字符输入（如 Shift + 1 = !）
			const exclamationKey = characterKey("!");
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.One, exclamationKey, ButtonState.Pressed, "!"));

			const keyboardReader = messageRegistry.createReader<KeyboardInput>();
			const focusReader = messageRegistry.createReader<KeyboardFocusLost>();

			keyboardInputSystem(world, keyboardReader, focusReader);

			// 验证事件的 textValue 属性
			const events = keyboardReader.read();
			let foundSpecialCharEvent = false;
			for (const event of events) {
				if (event.textValue === "!") {
					foundSpecialCharEvent = true;
					expect(event.keyCode).to.equal(Enum.KeyCode.One);
					expect(isCharacterKey(event.key)).to.equal(true);
					if (isCharacterKey(event.key)) {
						expect(event.key.Character).to.equal("!");
					}
					break;
				}
			}
			expect(foundSpecialCharEvent).to.equal(true);
		});

		it("应该处理没有 textValue 的按键", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();

			// 功能键不应该有 textValue
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.Return, "Enter", ButtonState.Pressed));

			const keyboardReader = messageRegistry.createReader<KeyboardInput>();
			const focusReader = messageRegistry.createReader<KeyboardFocusLost>();

			keyboardInputSystem(world, keyboardReader, focusReader);

			const events = keyboardReader.read();
			for (const event of events) {
				if (event.keyCode === Enum.KeyCode.Return) {
					expect(event.textValue).to.equal(undefined);
					expect(event.key).to.equal("Enter");
					break;
				}
			}
		});

		it("应该处理多字符文本输入", () => {
			const keyboardWriter = messageRegistry.createWriter<KeyboardInput>();

			// 测试多字符输入（如某些语言的复合字符）
			const multiCharText = "你好";
			keyboardWriter.write(new KeyboardInput(Enum.KeyCode.Unknown, characterKey(multiCharText), ButtonState.Pressed, multiCharText));

			const keyboardReader = messageRegistry.createReader<KeyboardInput>();
			const focusReader = messageRegistry.createReader<KeyboardFocusLost>();

			keyboardInputSystem(world, keyboardReader, focusReader);

			const events = keyboardReader.read();
			let foundMultiCharEvent = false;
			for (const event of events) {
				if (event.textValue === multiCharText) {
					foundMultiCharEvent = true;
					expect(event.keyCode).to.equal(Enum.KeyCode.Unknown);
					expect(isCharacterKey(event.key)).to.equal(true);
					if (isCharacterKey(event.key)) {
						expect(event.key.Character).to.equal(multiCharText);
					}
					break;
				}
			}
			expect(foundMultiCharEvent).to.equal(true);
		});
	});
};