/**
 * Multiplayer Example - 多人游戏示例
 *
 * 演示如何在多人游戏中隔离不同玩家的输入:
 * - 为每个玩家创建独立的 InputMap
 * - 玩家1 使用 WASD, 玩家2 使用箭头键
 * - 支持每个玩家绑定独立的手柄
 * - 查询多个玩家的动作状态
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/multiplayer.rs
 */

import { createTestApp, advanceFrame, cleanupTestApp } from "../test-utils";
import { KeyboardSimulator, GamepadSimulator } from "../input-simulator";
import { InputMap } from "../../input-map/input-map";
import { ActionState } from "../../action-state/action-state";
import { ActionlikeEnum } from "../../actionlike";
import { InputControlKind } from "../../input-control-kind";
import { KeyCode } from "../../user-input/keyboard";
import { InputManagerPlugin } from "../../plugin/input-manager-plugin";
import { MainScheduleLabel } from "../../../bevy_app";
import { BevyWorld } from "../../../bevy_ecs";
import { InputManagerExtension } from "leafwing-input-manager";

/**
 * 多人游戏动作枚举
 * 对应 Rust 的 Action enum
 */
class Action extends ActionlikeEnum {
	static readonly Left = new Action("Left");
	static readonly Right = new Action("Right");
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
 * 玩家组件
 * 对应 Rust 的 Player enum
 */
enum PlayerEnum {
	One = "One",
	Two = "Two",
}

interface PlayerComponent {
	readonly player: PlayerEnum;
}

/**
 * 创建玩家输入映射
 * 对应 Rust 的 Player::input_map 方法
 */
function createPlayerInputMap(player: PlayerEnum): InputMap<Action> {
	const inputMap = new InputMap<Action>();

	if (player === PlayerEnum.One) {
		// 玩家1: WASD 控制
		inputMap.insert(Action.Left, KeyCode.from(Enum.KeyCode.A));
		inputMap.insert(Action.Right, KeyCode.from(Enum.KeyCode.D));
		inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.W));
	} else {
		// 玩家2: 箭头键控制
		inputMap.insert(Action.Left, KeyCode.from(Enum.KeyCode.Left));
		inputMap.insert(Action.Right, KeyCode.from(Enum.KeyCode.Right));
		inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.Up));
	}

	return inputMap;
}

export = () => {
	describe("Multiplayer Example", () => {
		it("should handle two players with separate keyboard controls", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = InputManagerPlugin.create<Action>({
				
			});
			app.addPlugins(plugin);

			const components = app.context.getExtension<InputManagerExtension<Action>>().getComponents();
			const world = app.getWorld();

			// 创建玩家1 (WASD)
			const player1Entity = world.spawn();
			const player1InputMap = createPlayerInputMap(PlayerEnum.One);
			const player1ActionState = new ActionState<Action>();
			player1ActionState.registerAction(Action.Left);
			player1ActionState.registerAction(Action.Right);
			player1ActionState.registerAction(Action.Jump);
			components.insert(world, player1Entity, player1InputMap, player1ActionState);

			// 创建玩家2 (箭头键)
			const player2Entity = world.spawn();
			const player2InputMap = createPlayerInputMap(PlayerEnum.Two);
			const player2ActionState = new ActionState<Action>();
			player2ActionState.registerAction(Action.Left);
			player2ActionState.registerAction(Action.Right);
			player2ActionState.registerAction(Action.Jump);
			components.insert(world, player2Entity, player2InputMap, player2ActionState);

			// 模拟玩家1按下 W (Jump)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W);

			advanceFrame(app);

			// 验证玩家1跳跃被触发
			const p1Data = components.get(world, player1Entity);
			const p2Data = components.get(world, player2Entity);

			if (p1Data && p1Data.actionState) {
				expect(p1Data.actionState.justPressed(Action.Jump)).to.equal(true);
			}

			// 玩家2不应该受影响
			if (p2Data && p2Data.actionState) {
				expect(p2Data.actionState.justPressed(Action.Jump)).to.equal(false);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle player 2 arrow key input independently", () => {
			const app = createTestApp();

			const plugin = InputManagerPlugin.create<Action>({
				
			});
			app.addPlugins(plugin);

			const components = app.context.getExtension<InputManagerExtension<Action>>().getComponents();
			const world = app.getWorld();

			// 创建两个玩家
			const player1Entity = world.spawn();
			const player1InputMap = createPlayerInputMap(PlayerEnum.One);
			const player1ActionState = new ActionState<Action>();
			player1ActionState.registerAction(Action.Jump);
			components.insert(world, player1Entity, player1InputMap, player1ActionState);

			const player2Entity = world.spawn();
			const player2InputMap = createPlayerInputMap(PlayerEnum.Two);
			const player2ActionState = new ActionState<Action>();
			player2ActionState.registerAction(Action.Jump);
			components.insert(world, player2Entity, player2InputMap, player2ActionState);

			// 模拟玩家2按下上箭头 (Jump)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.Up);

			advanceFrame(app);

			// 验证只有玩家2跳跃
			const p1Data = components.get(world, player1Entity);
			const p2Data = components.get(world, player2Entity);

			if (p1Data && p1Data.actionState) {
				expect(p1Data.actionState.justPressed(Action.Jump)).to.equal(false);
			}

			if (p2Data && p2Data.actionState) {
				expect(p2Data.actionState.justPressed(Action.Jump)).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle simultaneous input from both players", () => {
			const app = createTestApp();

			const plugin = InputManagerPlugin.create<Action>({
				
			});
			app.addPlugins(plugin);

			const components = app.context.getExtension<InputManagerExtension<Action>>().getComponents();
			const world = app.getWorld();

			// 创建两个玩家
			const player1Entity = world.spawn();
			const player1InputMap = createPlayerInputMap(PlayerEnum.One);
			const player1ActionState = new ActionState<Action>();
			player1ActionState.registerAction(Action.Left);
			player1ActionState.registerAction(Action.Right);
			components.insert(world, player1Entity, player1InputMap, player1ActionState);

			const player2Entity = world.spawn();
			const player2InputMap = createPlayerInputMap(PlayerEnum.Two);
			const player2ActionState = new ActionState<Action>();
			player2ActionState.registerAction(Action.Left);
			player2ActionState.registerAction(Action.Right);
			components.insert(world, player2Entity, player2InputMap, player2ActionState);

			// 同时模拟两个玩家的输入
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.A); // 玩家1向左
			keyboard.pressKey(Enum.KeyCode.Right); // 玩家2向右

			advanceFrame(app);

			// 验证两个玩家都收到了各自的输入
			const p1Data = components.get(world, player1Entity);
			const p2Data = components.get(world, player2Entity);

			if (p1Data && p1Data.actionState) {
				expect(p1Data.actionState.pressed(Action.Left)).to.equal(true);
				expect(p1Data.actionState.pressed(Action.Right)).to.equal(false);
			}

			if (p2Data && p2Data.actionState) {
				expect(p2Data.actionState.pressed(Action.Left)).to.equal(false);
				expect(p2Data.actionState.pressed(Action.Right)).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should support querying multiple players in a system", () => {
			const app = createTestApp();

			const plugin = InputManagerPlugin.create<Action>({
				
			});
			app.addPlugins(plugin);

			const components = app.context.getExtension<InputManagerExtension<Action>>().getComponents();
			const world = app.getWorld();

			// 创建两个玩家
			const player1Entity = world.spawn();
			const player1InputMap = createPlayerInputMap(PlayerEnum.One);
			const player1ActionState = new ActionState<Action>();
			player1ActionState.registerAction(Action.Jump);
			components.insert(world, player1Entity, player1InputMap, player1ActionState);

			const player2Entity = world.spawn();
			const player2InputMap = createPlayerInputMap(PlayerEnum.Two);
			const player2ActionState = new ActionState<Action>();
			player2ActionState.registerAction(Action.Jump);
			components.insert(world, player2Entity, player2InputMap, player2ActionState);

			// 添加移动玩家系统 (对应 move_players 系统)
			const actionsPerformed: Array<{ entity: number; actions: Array<string> }> = [];

			app.addSystems(MainScheduleLabel.UPDATE, (currentWorld: BevyWorld) => {
				// 查询所有玩家 (对应 Query<(&Player, &ActionState<Action>)>)
				for (const [entityId, data] of components.query(currentWorld)) {
					if (!data.actionState) {
						continue;
					}

					const justPressedActions: Array<string> = [];

					// 检查所有刚按下的动作
					if (data.actionState.justPressed(Action.Left)) {
						justPressedActions.push("Left");
					}

					if (data.actionState.justPressed(Action.Right)) {
						justPressedActions.push("Right");
					}

					if (data.actionState.justPressed(Action.Jump)) {
						justPressedActions.push("Jump");
					}

					if (justPressedActions.size() > 0) {
						actionsPerformed.push({
							entity: entityId,
							actions: justPressedActions,
						});
						print(`Entity ${entityId} performed actions: ${justPressedActions.join(", ")}`);
					}
				}
			});

			// 模拟输入
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W); // 玩家1跳跃
			keyboard.pressKey(Enum.KeyCode.Right); // 玩家2向右

			advanceFrame(app);

			// 验证系统记录了两个玩家的动作
			expect(actionsPerformed.size()).to.equal(2);

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle player movement with continuous input", () => {
			const app = createTestApp();

			const plugin = InputManagerPlugin.create<Action>({
				
			});
			app.addPlugins(plugin);

			const components = app.context.getExtension<InputManagerExtension<Action>>().getComponents();
			const world = app.getWorld();

			// 创建玩家1
			const player1Entity = world.spawn();
			const player1InputMap = createPlayerInputMap(PlayerEnum.One);
			const player1ActionState = new ActionState<Action>();
			player1ActionState.registerAction(Action.Right);
			components.insert(world, player1Entity, player1InputMap, player1ActionState);

			// 模拟持续向右移动
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.D);

			// 第一帧: justPressed 应该为 true
			advanceFrame(app);
			const frame1Data = components.get(world, player1Entity);

			if (frame1Data && frame1Data.actionState) {
				expect(frame1Data.actionState.justPressed(Action.Right)).to.equal(true);
				expect(frame1Data.actionState.pressed(Action.Right)).to.equal(true);
			}

			// 第二帧: justPressed 应该为 false, 但 pressed 仍为 true
			advanceFrame(app);
			const frame2Data = components.get(world, player1Entity);

			if (frame2Data && frame2Data.actionState) {
				expect(frame2Data.actionState.justPressed(Action.Right)).to.equal(false);
				expect(frame2Data.actionState.pressed(Action.Right)).to.equal(true);
			}

			// 第三帧: 继续持续按住
			advanceFrame(app);
			const frame3Data = components.get(world, player1Entity);

			if (frame3Data && frame3Data.actionState) {
				expect(frame3Data.actionState.pressed(Action.Right)).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});
	});
};