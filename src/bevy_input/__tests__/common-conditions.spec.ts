/**
 * 输入条件函数单元测试
 */

import {World} from "../../bevy_ecs";

import { ButtonInput } from "../button-input";
import {
	allInputPressed,
	andConditions,
	anyInputPressed,
	inputJustPressed,
	inputJustReleased,
	inputPressed,
	inputToggleActive,
	notCondition,
	orConditions,
} from "../common-conditions";
import * as ResourceStorage from "../resource-storage";

export = () => {
	describe("inputPressed 条件", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该在按键按下时返回 true", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
			}

			const condition = inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(true);
		});

		it("应该在按键未按下时返回 false", () => {
			const condition = inputPressed(Enum.KeyCode.B, "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(false);
		});

		it("应该在资源不存在时返回 false", () => {
			const emptyWorld = new World();
			const condition = inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>");

			expect(condition(emptyWorld)).to.equal(false);
		});
	});

	describe("inputJustPressed 条件", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该在按键刚按下时返回 true", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
			}

			const condition = inputJustPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(true);
		});

		it("应该在按键持续按下时返回 false", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
				keyboardInput.clear();
			}

			const condition = inputJustPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(false);
		});

		it("应该在资源不存在时返回 false", () => {
			const emptyWorld = new World();
			const condition = inputJustPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>");

			expect(condition(emptyWorld)).to.equal(false);
		});
	});

	describe("inputJustReleased 条件", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该在按键刚释放时返回 true", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
				keyboardInput.release(Enum.KeyCode.A);
			}

			const condition = inputJustReleased(Enum.KeyCode.A, "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(true);
		});

		it("应该在按键未释放时返回 false", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
			}

			const condition = inputJustReleased(Enum.KeyCode.A, "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(false);
		});

		it("应该在资源不存在时返回 false", () => {
			const emptyWorld = new World();
			const condition = inputJustReleased(Enum.KeyCode.A, "ButtonInput<KeyCode>");

			expect(condition(emptyWorld)).to.equal(false);
		});
	});

	describe("anyInputPressed 条件", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该在任意按键按下时返回 true", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
			}

			const condition = anyInputPressed([Enum.KeyCode.A, Enum.KeyCode.B], "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(true);
		});

		it("应该在没有按键按下时返回 false", () => {
			const condition = anyInputPressed([Enum.KeyCode.A, Enum.KeyCode.B], "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(false);
		});

		it("应该在资源不存在时返回 false", () => {
			const emptyWorld = new World();
			const condition = anyInputPressed([Enum.KeyCode.A], "ButtonInput<KeyCode>");

			expect(condition(emptyWorld)).to.equal(false);
		});
	});

	describe("allInputPressed 条件", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该在所有按键按下时返回 true", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
				keyboardInput.press(Enum.KeyCode.B);
			}

			const condition = allInputPressed([Enum.KeyCode.A, Enum.KeyCode.B], "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(true);
		});

		it("应该在部分按键按下时返回 false", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
			}

			const condition = allInputPressed([Enum.KeyCode.A, Enum.KeyCode.B], "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(false);
		});

		it("应该对空数组返回 true", () => {
			const condition = allInputPressed([], "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(true);
		});

		it("应该在资源不存在时返回 false", () => {
			const emptyWorld = new World();
			const condition = allInputPressed([Enum.KeyCode.A], "ButtonInput<KeyCode>");

			expect(condition(emptyWorld)).to.equal(false);
		});
	});

	describe("andConditions 组合", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该在所有条件满足时返回 true", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
				keyboardInput.press(Enum.KeyCode.B);
			}

			const condition = andConditions(
				inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>"),
				inputPressed(Enum.KeyCode.B, "ButtonInput<KeyCode>"),
			);

			expect(condition(world)).to.equal(true);
		});

		it("应该在任意条件不满足时返回 false", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
			}

			const condition = andConditions(
				inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>"),
				inputPressed(Enum.KeyCode.B, "ButtonInput<KeyCode>"),
			);

			expect(condition(world)).to.equal(false);
		});

		it("应该对空条件列表返回 true", () => {
			const condition = andConditions();

			expect(condition(world)).to.equal(true);
		});
	});

	describe("orConditions 组合", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该在任意条件满足时返回 true", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
			}

			const condition = orConditions(
				inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>"),
				inputPressed(Enum.KeyCode.B, "ButtonInput<KeyCode>"),
			);

			expect(condition(world)).to.equal(true);
		});

		it("应该在所有条件不满足时返回 false", () => {
			const condition = orConditions(
				inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>"),
				inputPressed(Enum.KeyCode.B, "ButtonInput<KeyCode>"),
			);

			expect(condition(world)).to.equal(false);
		});

		it("应该对空条件列表返回 false", () => {
			const condition = orConditions();

			expect(condition(world)).to.equal(false);
		});
	});

	describe("notCondition 反转", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该反转条件结果为 false", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
			}

			const condition = notCondition(inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>"));

			expect(condition(world)).to.equal(false);
		});

		it("应该反转条件结果为 true", () => {
			const condition = notCondition(inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>"));

			expect(condition(world)).to.equal(true);
		});
	});

	describe("inputToggleActive 切换", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该在按键按下时切换状态", () => {
			const condition = inputToggleActive(false, Enum.KeyCode.T, "ButtonInput<KeyCode>");

			// 初始状态 false
			expect(condition(world)).to.equal(false);

			// 按下切换键
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.T);
			}

			expect(condition(world)).to.equal(true);

			// 清除 just pressed
			if (keyboardInput) {
				keyboardInput.clear();
			}

			// 持续按下不应再次切换
			expect(condition(world)).to.equal(true);

			// 释放并清除
			if (keyboardInput) {
				keyboardInput.release(Enum.KeyCode.T);
				keyboardInput.clear();
			}

			// 再次按下应该切换回 false
			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.T);
			}

			expect(condition(world)).to.equal(false);
		});

		it("应该支持默认状态为 true", () => {
			const condition = inputToggleActive(true, Enum.KeyCode.T, "ButtonInput<KeyCode>");

			expect(condition(world)).to.equal(true);

			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.T);
			}

			expect(condition(world)).to.equal(false);
		});

		it("应该在资源不存在时保持状态", () => {
			const emptyWorld = new World();
			const condition = inputToggleActive(true, Enum.KeyCode.T, "ButtonInput<KeyCode>");

			expect(condition(emptyWorld)).to.equal(true);
			expect(condition(emptyWorld)).to.equal(true);
		});
	});

	describe("复杂条件组合", () => {
		let world: World;

		beforeEach(() => {
			world = new World();

			const keyboardInput = new ButtonInput<Enum.KeyCode>();
			ResourceStorage.setKeyboardInput(world, keyboardInput);
		});

		it("应该支持复杂的 AND/OR/NOT 组合", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
				keyboardInput.press(Enum.KeyCode.C);
			}

			// (A AND NOT B) OR C
			const condition = orConditions(
				andConditions(
					inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>"),
					notCondition(inputPressed(Enum.KeyCode.B, "ButtonInput<KeyCode>")),
				),
				inputPressed(Enum.KeyCode.C, "ButtonInput<KeyCode>"),
			);

			expect(condition(world)).to.equal(true);
		});

		it("应该支持多级嵌套条件", () => {
			const keyboardInput = ResourceStorage.getKeyboardInput(world);

			if (keyboardInput) {
				keyboardInput.press(Enum.KeyCode.A);
				keyboardInput.press(Enum.KeyCode.B);
			}

			// (A AND B) AND NOT (C OR D)
			const condition = andConditions(
				andConditions(
					inputPressed(Enum.KeyCode.A, "ButtonInput<KeyCode>"),
					inputPressed(Enum.KeyCode.B, "ButtonInput<KeyCode>"),
				),
				notCondition(
					orConditions(
						inputPressed(Enum.KeyCode.C, "ButtonInput<KeyCode>"),
						inputPressed(Enum.KeyCode.D, "ButtonInput<KeyCode>"),
					),
				),
			);

			expect(condition(world)).to.equal(true);
		});
	});
};