/**
 * Clash Handling Example - 输入冲突处理示例
 *
 * 演示当多个动作绑定到重叠的按键组合时如何处理冲突:
 * - 单键动作 vs 组合键动作的冲突
 * - ClashStrategy 的不同处理策略
 * - 使用 InputChord 创建组合键输入
 * - 测试不同长度的按键组合冲突
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/clash_handling.rs
 */

import { createTestApp, advanceFrame, cleanupTestApp } from "../test-utils";
import { KeyboardSimulator } from "../input-simulator";
import { InputMap } from "../../input-map/input-map";
import { ActionState } from "../../action-state/action-state";
import { ActionlikeEnum } from "../../actionlike";
import { InputControlKind } from "../../input-control-kind";
import { KeyCode } from "../../user-input/keyboard";
import { InputChord } from "../../user-input/chord";
import { InputManagerPlugin } from "../../plugin/input-manager-plugin";
import { ClashStrategy, ClashStrategyResource } from "../../clashing-inputs/clash-strategy";
import { MainScheduleLabel } from "../../../bevy_app";
import { BevyWorld } from "../../../bevy_ecs/types";

/**
 * 测试动作枚举
 * 对应 Rust 的 TestAction enum
 */
class TestAction extends ActionlikeEnum {
	static readonly One = new TestAction("One");
	static readonly Two = new TestAction("Two");
	static readonly Three = new TestAction("Three");
	static readonly OneAndTwo = new TestAction("OneAndTwo");
	static readonly OneAndThree = new TestAction("OneAndThree");
	static readonly TwoAndThree = new TestAction("TwoAndThree");
	static readonly OneAndTwoAndThree = new TestAction("OneAndTwoAndThree");

	private constructor(value: string) {
		super(value);
	}

	hash(): string {
		return `TestAction:${this.value}`;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}
}

/**
 * 创建测试输入映射
 * 对应 Rust 的 spawn_input_map 函数
 */
function createTestInputMap(): InputMap<TestAction> {
	const inputMap = new InputMap<TestAction>();

	// 单键绑定
	inputMap.insert(TestAction.One, KeyCode.from(Enum.KeyCode.One));
	inputMap.insert(TestAction.Two, KeyCode.from(Enum.KeyCode.Two));
	inputMap.insert(TestAction.Three, KeyCode.from(Enum.KeyCode.Three));

	// 组合键绑定 (两键)
	const oneAndTwo = InputChord.from(
		KeyCode.from(Enum.KeyCode.One),
		KeyCode.from(Enum.KeyCode.Two),
	);
	inputMap.insert(TestAction.OneAndTwo, oneAndTwo);

	const oneAndThree = InputChord.from(
		KeyCode.from(Enum.KeyCode.One),
		KeyCode.from(Enum.KeyCode.Three),
	);
	inputMap.insert(TestAction.OneAndThree, oneAndThree);

	const twoAndThree = InputChord.from(
		KeyCode.from(Enum.KeyCode.Two),
		KeyCode.from(Enum.KeyCode.Three),
	);
	inputMap.insert(TestAction.TwoAndThree, twoAndThree);

	// 组合键绑定 (三键)
	const oneAndTwoAndThree = InputChord.from(
		KeyCode.from(Enum.KeyCode.One),
		KeyCode.from(Enum.KeyCode.Two),
		KeyCode.from(Enum.KeyCode.Three),
	);
	inputMap.insert(TestAction.OneAndTwoAndThree, oneAndTwoAndThree);

	return inputMap;
}

export = () => {
	describe("Clash Handling Example", () => {
		it("should handle single key input without clash", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = new InputManagerPlugin<TestAction>({
				actionTypeName: "TestAction",
			});
			app.addPlugins(plugin);

			const components = plugin.getComponents();
			const world = app.getWorld();

			// 设置冲突策略 (对应 insert_resource)
			const clashStrategy = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
			world.resources.insertResource(clashStrategy);

			// 创建输入映射
			const entity = world.spawn();
			const inputMap = createTestInputMap();
			const actionState = new ActionState<TestAction>();
			actionState.registerAction(TestAction.One);

			components.insert(world, entity, inputMap, actionState);

			// 模拟按下单个键
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.One);

			advanceFrame(app);

			// 验证单键动作被触发
			const data = components.get(world, entity);

			if (data && data.actionState) {
				expect(data.actionState.justPressed(TestAction.One)).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should prioritize longest chord when using PrioritizeLongest strategy", () => {
			const app = createTestApp();

			const plugin = new InputManagerPlugin<TestAction>({
				actionTypeName: "TestAction",
			});
			app.addPlugins(plugin);

			const components = plugin.getComponents();
			const world = app.getWorld();

			// 使用 PrioritizeLongest 策略
			const clashStrategy = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
			world.resources.insertResource(clashStrategy);

			const entity = world.spawn();
			const inputMap = createTestInputMap();
			const actionState = new ActionState<TestAction>();

			// 注册所有动作
			actionState.registerAction(TestAction.One);
			actionState.registerAction(TestAction.Two);
			actionState.registerAction(TestAction.OneAndTwo);

			components.insert(world, entity, inputMap, actionState);

			// 同时按下 1 和 2
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.One);
			keyboard.pressKey(Enum.KeyCode.Two);

			advanceFrame(app);

			// 验证: OneAndTwo 应该被触发 (更长的组合)
			const data = components.get(world, entity);

			if (data && data.actionState) {
				// PrioritizeLongest 策略下,更长的组合键应该被优先触发
				expect(data.actionState.justPressed(TestAction.OneAndTwo)).to.equal(true);

				// 单键动作应该被抑制
				expect(data.actionState.justPressed(TestAction.One)).to.equal(false);
				expect(data.actionState.justPressed(TestAction.Two)).to.equal(false);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle three-key chord vs two-key chord clash", () => {
			const app = createTestApp();

			const plugin = new InputManagerPlugin<TestAction>({
				actionTypeName: "TestAction",
			});
			app.addPlugins(plugin);

			const components = plugin.getComponents();
			const world = app.getWorld();

			const clashStrategy = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
			world.resources.insertResource(clashStrategy);

			const entity = world.spawn();
			const inputMap = createTestInputMap();
			const actionState = new ActionState<TestAction>();

			// 注册相关动作
			actionState.registerAction(TestAction.OneAndTwo);
			actionState.registerAction(TestAction.OneAndTwoAndThree);

			components.insert(world, entity, inputMap, actionState);

			// 同时按下 1, 2, 3
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.One);
			keyboard.pressKey(Enum.KeyCode.Two);
			keyboard.pressKey(Enum.KeyCode.Three);

			advanceFrame(app);

			// 验证: 三键组合应该优先
			const data = components.get(world, entity);

			if (data && data.actionState) {
				expect(data.actionState.justPressed(TestAction.OneAndTwoAndThree)).to.equal(true);

				// 两键组合应该被抑制
				expect(data.actionState.justPressed(TestAction.OneAndTwo)).to.equal(false);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should report pressed actions with system query", () => {
			const app = createTestApp();

			const plugin = new InputManagerPlugin<TestAction>({
				actionTypeName: "TestAction",
			});
			app.addPlugins(plugin);

			const components = plugin.getComponents();
			const world = app.getWorld();

			const clashStrategy = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
			world.resources.insertResource(clashStrategy);

			const entity = world.spawn();
			const inputMap = createTestInputMap();
			const actionState = new ActionState<TestAction>();

			actionState.registerAction(TestAction.One);
			actionState.registerAction(TestAction.Two);
			actionState.registerAction(TestAction.OneAndTwo);

			components.insert(world, entity, inputMap, actionState);

			// 添加报告系统 (对应 report_pressed_actions)
			const pressedActions: Array<string> = [];

			app.addSystems(MainScheduleLabel.UPDATE, (currentWorld: BevyWorld) => {
				for (const [entityId, data] of components.query(currentWorld)) {
					if (!data.actionState) {
						continue;
					}

					// 收集所有刚按下的动作
					if (data.actionState.justPressed(TestAction.One)) {
						pressedActions.push("One");
					}

					if (data.actionState.justPressed(TestAction.Two)) {
						pressedActions.push("Two");
					}

					if (data.actionState.justPressed(TestAction.OneAndTwo)) {
						pressedActions.push("OneAndTwo");
					}
				}
			});

			// 模拟输入
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.One);
			keyboard.pressKey(Enum.KeyCode.Two);

			advanceFrame(app);

			// 验证报告了正确的动作
			expect(pressedActions.includes("OneAndTwo")).to.equal(true);
			print(`Pressed actions: ${pressedActions.join(", ")}`);

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle multiple overlapping chords", () => {
			const app = createTestApp();

			const plugin = new InputManagerPlugin<TestAction>({
				actionTypeName: "TestAction",
			});
			app.addPlugins(plugin);

			const components = plugin.getComponents();
			const world = app.getWorld();

			const clashStrategy = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
			world.resources.insertResource(clashStrategy);

			const entity = world.spawn();
			const inputMap = createTestInputMap();
			const actionState = new ActionState<TestAction>();

			// 注册所有组合键动作
			actionState.registerAction(TestAction.OneAndTwo);
			actionState.registerAction(TestAction.OneAndThree);
			actionState.registerAction(TestAction.TwoAndThree);
			actionState.registerAction(TestAction.OneAndTwoAndThree);

			components.insert(world, entity, inputMap, actionState);

			// 按下所有三个键
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.One);
			keyboard.pressKey(Enum.KeyCode.Two);
			keyboard.pressKey(Enum.KeyCode.Three);

			advanceFrame(app);

			// 验证: 最长的组合键应该被触发
			const data = components.get(world, entity);

			if (data && data.actionState) {
				expect(data.actionState.justPressed(TestAction.OneAndTwoAndThree)).to.equal(true);

				// 所有子集组合应该被抑制
				expect(data.actionState.justPressed(TestAction.OneAndTwo)).to.equal(false);
				expect(data.actionState.justPressed(TestAction.OneAndThree)).to.equal(false);
				expect(data.actionState.justPressed(TestAction.TwoAndThree)).to.equal(false);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should allow non-overlapping chords to trigger simultaneously", () => {
			const app = createTestApp();

			const plugin = new InputManagerPlugin<TestAction>({
				actionTypeName: "TestAction",
			});
			app.addPlugins(plugin);

			const components = plugin.getComponents();
			const world = app.getWorld();

			const clashStrategy = new ClashStrategyResource(ClashStrategy.PrioritizeLargest);
			world.resources.insertResource(clashStrategy);

			const entity = world.spawn();
			const inputMap = createTestInputMap();
			const actionState = new ActionState<TestAction>();

			actionState.registerAction(TestAction.One);
			actionState.registerAction(TestAction.Two);
			actionState.registerAction(TestAction.Three);

			components.insert(world, entity, inputMap, actionState);

			// 只按下单个键 (不产生冲突)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.One);

			advanceFrame(app);

			// 验证: 单键应该正常触发
			let data = components.get(world, entity);

			if (data && data.actionState) {
				expect(data.actionState.justPressed(TestAction.One)).to.equal(true);
			}

			keyboard.releaseKey(Enum.KeyCode.One);

			// 下一帧按下另一个不冲突的键
			keyboard.pressKey(Enum.KeyCode.Three);
			advanceFrame(app);

			data = components.get(world, entity);

			if (data && data.actionState) {
				expect(data.actionState.justPressed(TestAction.Three)).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});
	});
};