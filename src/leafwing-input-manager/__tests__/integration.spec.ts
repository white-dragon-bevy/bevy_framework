/**
 * 集成测试
 * 测试 leafwing-input-manager 的端到端功能
 */

import { World, component } from "@rbxts/matter";
import { App } from "../../bevy_app/app";
import { Context } from "../../bevy_ecs/types";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { Actionlike } from "../actionlike";
import { ActionState } from "../action-state/action-state";
import { InputControlKind } from "../input-control-kind";
import { InputMap } from "../input-map/input-map";
import { Resource } from "../../bevy_ecs";
import { advanceFrame, createTestApp } from "./test-utils";
import { KeyboardSimulator } from "./input-simulator";
import { KeyCode } from "../user-input/keyboard";

/**
 * 测试用动作
 */
class Action implements Actionlike {
	static readonly PayRespects = new Action("PayRespects");

	private constructor(private readonly value: string) {}

	hash(): string {
		return this.value;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	equals(other: Actionlike): boolean {
		return other instanceof Action && this.value === other.value;
	}

	toString(): string {
		return this.value;
	}
}

/**
 * 玩家组件
 */
const Player = component<{}>("Player");

/**
 * 敬意资源
 * 表示是否已经致敬
 */
class Respect implements Resource {
	constructor(public value: boolean = false) {}
}

/**
 * 致敬系统
 * 当玩家按下 PayRespects 动作时,设置敬意为 true
 */
function payRespectsSystem(world: World, context: Context, app: App): void {
	const actionState = app.getResource<ActionState<Action>>();

	if (actionState !== undefined && actionState.pressed(Action.PayRespects)) {
		const respect = app.getResource<Respect>();

		if (respect !== undefined) {
			respect.value = true;
		}
	}

	// 也检查玩家实体的 ActionState
	for (const [entityId, playerRecord] of world.query(Player)) {
		// 注意:在实际实现中,ActionState 应该作为组件存储
		// 这里简化处理,只使用全局资源
	}
}

/**
 * 敬意衰减系统
 * 每帧将敬意重置为 false
 */
function respectFadesSystem(world: World, context: Context, app: App): void {
	const respect = app.getResource<Respect>();

	if (respect !== undefined) {
		respect.value = false;
	}
}

export = () => {
	describe("Integration Tests", () => {
		describe("Disable Input", () => {
			let app: App;
			let keyboard: KeyboardSimulator;

			beforeEach(() => {
				app = createTestApp();

				// 设置输入映射
				const inputMap = new InputMap<Action>();
				inputMap.insert(Action.PayRespects, KeyCode.F);
				app.insertResource(inputMap);

				// 设置动作状态
				const actionState = new ActionState<Action>();
				app.insertResource(actionState);

				// 设置敬意资源
				const respect = new Respect(false);
				app.insertResource(respect);

				// 添加系统
				app.addSystems(BuiltinSchedules.PRE_UPDATE, (world: World, context: Context) => {
					respectFadesSystem(world, context, app);
				});
				app.addSystems(BuiltinSchedules.UPDATE, (world: World, context: Context) => {
					payRespectsSystem(world, context, app);
				});

				keyboard = KeyboardSimulator.fromApp(app);

				// 初始化更新
				app.update();
			});

			afterEach(() => {
				keyboard.releaseAll();
			});

			it("should pay respects when F is pressed", () => {
				// 按下 F 键致敬
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);

				const respect = app.getResource<Respect>();
				expect(respect).to.be.ok();
				expect(respect!.value).to.equal(true);
			});

			it("should disable input when disableAll is called", () => {
				// 按下 F 键
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);

				let respect = app.getResource<Respect>();
				expect(respect!.value).to.equal(true);

				// 禁用所有动作
				const actionState = app.getResource<ActionState<Action>>();
				expect(actionState).to.be.ok();
				actionState!.disableAll();

				// 再次更新,敬意应该消失
				advanceFrame(app);
				respect = app.getResource<Respect>();
				expect(respect!.value).to.equal(false);

				// 即使按住 F,敬意也不会回来
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);
				respect = app.getResource<Respect>();
				expect(respect!.value).to.equal(false);
			});

			it("should re-enable input when enableAll is called", () => {
				const actionState = app.getResource<ActionState<Action>>();
				expect(actionState).to.be.ok();

				// 禁用所有动作
				actionState!.disableAll();

				// 按 F 无效
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);

				let respect = app.getResource<Respect>();
				expect(respect!.value).to.equal(false);

				// 重新启用所有动作
				actionState!.enableAll();

				// 现在按 F 应该有效
				advanceFrame(app);
				respect = app.getResource<Respect>();
				expect(respect!.value).to.equal(true);
			});

			it("should disable specific action", () => {
				const actionState = app.getResource<ActionState<Action>>();
				expect(actionState).to.be.ok();

				// 禁用特定动作
				actionState!.disable(Action.PayRespects);

				// 按 F 无效
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);

				const respect = app.getResource<Respect>();
				expect(respect!.value).to.equal(false);
			});

			it("should re-enable specific action", () => {
				const actionState = app.getResource<ActionState<Action>>();
				expect(actionState).to.be.ok();

				// 禁用特定动作
				actionState!.disable(Action.PayRespects);

				// 按 F 无效
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);
				let respect = app.getResource<Respect>();
				expect(respect!.value).to.equal(false);

				// 重新启用特定动作
				actionState!.enable(Action.PayRespects);

				// 现在按 F 应该有效
				advanceFrame(app);
				respect = app.getResource<Respect>();
				expect(respect!.value).to.equal(true);
			});
		});

		describe("Action State Queries", () => {
			let app: App;
			let keyboard: KeyboardSimulator;

			beforeEach(() => {
				app = createTestApp();

				const inputMap = new InputMap<Action>();
				inputMap.insert(Action.PayRespects, KeyCode.F);
				app.insertResource(inputMap);

				const actionState = new ActionState<Action>();
				app.insertResource(actionState);

				keyboard = KeyboardSimulator.fromApp(app);
				app.update();
			});

			afterEach(() => {
				keyboard.releaseAll();
			});

			it("should detect pressed state", () => {
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);

				const actionState = app.getResource<ActionState<Action>>();
				expect(actionState).to.be.ok();
				expect(actionState!.pressed(Action.PayRespects)).to.equal(true);
				expect(actionState!.released(Action.PayRespects)).to.equal(false);
			});

			it("should detect just pressed state", () => {
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);

				const actionState = app.getResource<ActionState<Action>>();
				expect(actionState).to.be.ok();
				expect(actionState!.justPressed(Action.PayRespects)).to.equal(true);

				// 下一帧不应该再是 just pressed
				advanceFrame(app);
				expect(actionState!.justPressed(Action.PayRespects)).to.equal(false);
				expect(actionState!.pressed(Action.PayRespects)).to.equal(true);
			});

			it("should detect just released state", () => {
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);

				const actionState = app.getResource<ActionState<Action>>();
				expect(actionState).to.be.ok();
				expect(actionState!.justPressed(Action.PayRespects)).to.equal(true);

				keyboard.releaseKey(KeyCode.F.getKeyCode());
				advanceFrame(app);

				expect(actionState!.justReleased(Action.PayRespects)).to.equal(true);
				expect(actionState!.released(Action.PayRespects)).to.equal(true);
			});

			it("should track button value", () => {
				const actionState = app.getResource<ActionState<Action>>();
				expect(actionState).to.be.ok();

				// 初始值应为 0
				expect(actionState!.buttonValue(Action.PayRespects)).to.equal(0.0);

				// 按下后应为 1
				keyboard.pressKey(KeyCode.F.getKeyCode());
				advanceFrame(app);
				expect(actionState!.buttonValue(Action.PayRespects)).to.equal(1.0);

				// 释放后应为 0
				keyboard.releaseKey(KeyCode.F.getKeyCode());
				advanceFrame(app);
				expect(actionState!.buttonValue(Action.PayRespects)).to.equal(0.0);
			});
		});

		describe("Manual Action State Updates", () => {
			let actionState: ActionState<Action>;

			beforeEach(() => {
				actionState = new ActionState<Action>();
			});

			afterEach(() => {
				actionState.resetAll();
			});

			it("should manually press action", () => {
				actionState.press(Action.PayRespects);
				expect(actionState.pressed(Action.PayRespects)).to.equal(true);
				expect(actionState.justPressed(Action.PayRespects)).to.equal(true);
			});

			it("should manually release action", () => {
				actionState.press(Action.PayRespects);
				expect(actionState.pressed(Action.PayRespects)).to.equal(true);

				actionState.release(Action.PayRespects);
				expect(actionState.released(Action.PayRespects)).to.equal(true);
				expect(actionState.justReleased(Action.PayRespects)).to.equal(true);
			});

			it("should consume action", () => {
				actionState.press(Action.PayRespects);
				expect(actionState.pressed(Action.PayRespects)).to.equal(true);

				// 消费动作
				actionState.consume(Action.PayRespects);
				expect(actionState.pressed(Action.PayRespects)).to.equal(false);
			});

			it("should reset action state", () => {
				actionState.press(Action.PayRespects);
				expect(actionState.pressed(Action.PayRespects)).to.equal(true);

				// 重置所有动作
				actionState.resetAll();
				expect(actionState.pressed(Action.PayRespects)).to.equal(false);
			});

			it("should tick action state", () => {
				actionState.press(Action.PayRespects);
				expect(actionState.justPressed(Action.PayRespects)).to.equal(true);

				// Tick 应该清除 just pressed 状态
				actionState.tick();
				expect(actionState.justPressed(Action.PayRespects)).to.equal(false);
				expect(actionState.pressed(Action.PayRespects)).to.equal(true);
			});
		});
	});
};