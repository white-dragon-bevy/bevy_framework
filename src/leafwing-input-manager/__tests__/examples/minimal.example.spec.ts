/**
 * Minimal Example - 最小示例
 *
 * 演示 leafwing-input-manager 的基本用法:
 * - 定义 Action 枚举
 * - 创建 InputMap 绑定按键
 * - 在系统中查询 ActionState
 * - 检测 justPressed 状态
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/minimal.rs
 */

import { createTestApp, advanceFrame, cleanupTestApp } from "../test-utils";
import { KeyboardSimulator } from "../input-simulator";
import { InputMap } from "../../input-map/input-map";
import { ActionState } from "../../action-state/action-state";
import { Actionlike, ActionlikeEnum } from "../../actionlike";
import { InputControlKind } from "../../input-control-kind";
import { KeyCode } from "../../user-input/keyboard";
import { InputManagerPlugin } from "../../plugin/input-manager-plugin";
import { MainScheduleLabel } from "../../../bevy_app";
import { BevyWorld } from "../../../bevy_ecs";
import { InputManagerExtension } from "leafwing-input-manager";

/**
 * 定义游戏动作枚举
 * 对应 Rust 的 Action enum
 */
class Action extends ActionlikeEnum {
	static readonly Run = new Action("Run");
	static readonly Jump = new Action("Jump");

	private constructor(value: string) {
		super(value);
	}

	hash(): string {
		return `Action:${this.value}`;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}
}

/**
 * Player 组件标记
 * 对应 Rust 的 Player component
 */
interface PlayerComponent {
	readonly tag: "Player";
}

export = () => {
	describe("Minimal Example", () => {
		it("should handle jump action when Space is pressed", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = InputManagerPlugin.create<Action>({
				actionTypeName: "Action",
			});
			app.addPlugins(plugin);

			// 获取组件定义
			const components = app.context.getExtension<InputManagerExtension<Action>>().getComponents();

			// Setup: 创建玩家实体和输入映射 (对应 spawn_player 系统)
			const world = app.getWorld();
			const playerEntity = world.spawn();

			const inputMap = new InputMap<Action>();
			inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.Space));

			const actionState = new ActionState<Action>();
			actionState.registerAction(Action.Jump);

			components.insert(world, playerEntity, inputMap, actionState);

			// 创建键盘模拟器
			const keyboard = KeyboardSimulator.fromApp(app);

			// 模拟按下空格键
			keyboard.pressKey(Enum.KeyCode.Space);

			// 推进一帧 (触发输入处理)
			advanceFrame(app);

			// 验证: 检查 jump 动作是否被触发 (对应 jump 系统)
			const entityData = components.get(world, playerEntity);

			expect(entityData).to.be.ok();

			if (entityData && entityData.actionState) {
				const isJumping = entityData.actionState.justPressed(Action.Jump);
				expect(isJumping).to.equal(true);
				print("I'm jumping!"); // 对应 Rust 的 println!
			}

			// 释放按键
			keyboard.releaseKey(Enum.KeyCode.Space);

			// 再推进一帧
			advanceFrame(app);

			// 验证: justPressed 应该变为 false
			const entityDataAfter = components.get(world, playerEntity);

			if (entityDataAfter && entityDataAfter.actionState) {
				const isStillJustPressed = entityDataAfter.actionState.justPressed(Action.Jump);
				expect(isStillJustPressed).to.equal(false);
			}

			// 清理
			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle continuous jump input across multiple frames", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = InputManagerPlugin.create<Action>({
				actionTypeName: "Action",
			});
			app.addPlugins(plugin);

			const components = app.context.getExtension<InputManagerExtension<Action>>().getComponents();
			const world = app.getWorld();
			const playerEntity = world.spawn();

			const inputMap = new InputMap<Action>();
			inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.Space));

			const actionState = new ActionState<Action>();
			actionState.registerAction(Action.Jump);

			components.insert(world, playerEntity, inputMap, actionState);

			const keyboard = KeyboardSimulator.fromApp(app);

			// 测试按住空格键多帧
			keyboard.pressKey(Enum.KeyCode.Space);

			// 第一帧: justPressed 应该为 true
			advanceFrame(app);
			const frame1Data = components.get(world, playerEntity);

			if (frame1Data && frame1Data.actionState) {
				expect(frame1Data.actionState.justPressed(Action.Jump)).to.equal(true);
				expect(frame1Data.actionState.pressed(Action.Jump)).to.equal(true);
			}

			// 第二帧: justPressed 应该为 false, 但 pressed 仍为 true
			advanceFrame(app);
			const frame2Data = components.get(world, playerEntity);

			if (frame2Data && frame2Data.actionState) {
				expect(frame2Data.actionState.justPressed(Action.Jump)).to.equal(false);
				expect(frame2Data.actionState.pressed(Action.Jump)).to.equal(true);
			}

			// 释放按键
			keyboard.releaseKey(Enum.KeyCode.Space);
			advanceFrame(app);
			const frame3Data = components.get(world, playerEntity);

			if (frame3Data && frame3Data.actionState) {
				expect(frame3Data.actionState.justReleased(Action.Jump)).to.equal(true);
				expect(frame3Data.actionState.pressed(Action.Jump)).to.equal(false);
			}

			// 清理
			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should work with system-based action checking", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = InputManagerPlugin.create<Action>({
				actionTypeName: "Action",
			});
			app.addPlugins(plugin);

			const components = app.context.getExtension<InputManagerExtension<Action>>().getComponents();

			// 创建玩家实体
			const world = app.getWorld();
			const playerEntity = world.spawn();

			const inputMap = new InputMap<Action>();
			inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.Space));

			const actionState = new ActionState<Action>();
			actionState.registerAction(Action.Jump);

			components.insert(world, playerEntity, inputMap, actionState);

			// 添加游戏逻辑系统 (对应 Rust 的 jump 系统)
			let jumpDetected = false;
			app.addSystems(MainScheduleLabel.UPDATE, (currentWorld: BevyWorld) => {
				// 查询所有有 ActionState 的实体
				for (const [entityId, data] of components.query(currentWorld)) {
					if (data.actionState && data.actionState.justPressed(Action.Jump)) {
						jumpDetected = true;
					}
				}
			});

			// 模拟输入
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.Space);

			// 运行一帧
			advanceFrame(app);

			// 验证系统检测到跳跃
			expect(jumpDetected).to.equal(true);

			// 清理
			keyboard.releaseAll();
			cleanupTestApp(app);
		});
	});
};