/**
 * Single Player Example - 单人游戏示例
 *
 * 演示完整的单人游戏输入系统:
 * - 创建玩家实体并附加 InputMap 和 ActionState 组件
 * - 支持键盘和手柄多种输入方式
 * - 实现技能施放和移动系统
 * - 展示方向输入的高级处理
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/single_player.rs
 */

import { createTestApp, advanceFrame, cleanupTestApp } from "../test-utils";
import { KeyboardSimulator, GamepadSimulator } from "../input-simulator";
import { InputMap } from "../../input-map/input-map";
import { ActionState } from "../../action-state/action-state";
import { ActionlikeEnum } from "../../actionlike";
import { InputControlKind } from "../../input-control-kind";
import { KeyCode } from "../../user-input/keyboard";
import { createInputManagerPlugin } from "../../plugin/input-manager-plugin";
import { MainScheduleLabel } from "../../../bevy_app";
import { BevyWorld } from "../../../bevy_ecs/types";

/**
 * ARPG 风格的动作枚举
 * 对应 Rust 的 ArpgAction enum
 */
class ArpgAction extends ActionlikeEnum {
	// 移动方向
	static readonly Up = new ArpgAction("Up");
	static readonly Down = new ArpgAction("Down");
	static readonly Left = new ArpgAction("Left");
	static readonly Right = new ArpgAction("Right");

	// 技能
	static readonly Ability1 = new ArpgAction("Ability1");
	static readonly Ability2 = new ArpgAction("Ability2");
	static readonly Ability3 = new ArpgAction("Ability3");
	static readonly Ability4 = new ArpgAction("Ability4");
	static readonly Ultimate = new ArpgAction("Ultimate");

	// 方向动作列表 (对应 Rust 的 DIRECTIONS 常量)
	static readonly DIRECTIONS = [
		ArpgAction.Up,
		ArpgAction.Down,
		ArpgAction.Left,
		ArpgAction.Right,
	] as const;

	private constructor(value: string) {
		super(value);
	}

	hash(): string {
		return `ArpgAction:${this.value}`;
	}

	getInputControlKind(): InputControlKind {
		return InputControlKind.Button;
	}

	/**
	 * 获取动作对应的方向向量
	 * 对应 Rust 的 direction 方法
	 */
	direction(): Vector2 | undefined {
		switch (this) {
			case ArpgAction.Up:
				return new Vector2(0, 1);
			case ArpgAction.Down:
				return new Vector2(0, -1);
			case ArpgAction.Left:
				return new Vector2(-1, 0);
			case ArpgAction.Right:
				return new Vector2(1, 0);
			default:
				return undefined;
		}
	}

	/**
	 * 创建默认输入映射
	 * 对应 Rust 的 Player::default_input_map
	 */
	static createDefaultInputMap(): InputMap<ArpgAction> {
		const inputMap = new InputMap<ArpgAction>();

		// 移动绑定 - 箭头键
		inputMap.insert(ArpgAction.Up, KeyCode.from(Enum.KeyCode.Up));
		inputMap.insert(ArpgAction.Down, KeyCode.from(Enum.KeyCode.Down));
		inputMap.insert(ArpgAction.Left, KeyCode.from(Enum.KeyCode.Left));
		inputMap.insert(ArpgAction.Right, KeyCode.from(Enum.KeyCode.Right));

		// 技能绑定
		inputMap.insert(ArpgAction.Ability1, KeyCode.from(Enum.KeyCode.Q));
		inputMap.insert(ArpgAction.Ability2, KeyCode.from(Enum.KeyCode.W));
		inputMap.insert(ArpgAction.Ability3, KeyCode.from(Enum.KeyCode.E));
		inputMap.insert(ArpgAction.Ability4, KeyCode.from(Enum.KeyCode.Space));
		inputMap.insert(ArpgAction.Ultimate, KeyCode.from(Enum.KeyCode.R));

		return inputMap;
	}
}

export = () => {
	describe("Single Player Example", () => {
		it("should cast fireball when Ability1 is pressed", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = createInputManagerPlugin<ArpgAction>({
				actionTypeName: "ArpgAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			// 创建玩家实体 (对应 spawn_player 系统)
			const playerEntity = world.spawn();
			const inputMap = ArpgAction.createDefaultInputMap();
			const actionState = new ActionState<ArpgAction>();

			// 注册所有动作
			actionState.registerAction(ArpgAction.Ability1);
			components.insert(world, playerEntity, inputMap, actionState);

			// 添加施放火球系统 (对应 cast_fireball 系统)
			let fireballCast = false;
			app.addSystems(MainScheduleLabel.UPDATE, (currentWorld: BevyWorld) => {
				for (const [entityId, data] of components.query(currentWorld)) {
					if (data.actionState && data.actionState.justPressed(ArpgAction.Ability1)) {
						print("Fwoosh!"); // 对应 Rust 的 println!
						fireballCast = true;
					}
				}
			});

			// 模拟按下 Q 键 (Ability1)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.Q);

			// 推进一帧
			advanceFrame(app);

			// 验证火球施放
			expect(fireballCast).to.equal(true);

			// 清理
			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle player dash with directional input", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<ArpgAction>({
				actionTypeName: "ArpgAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			// 创建玩家
			const playerEntity = world.spawn();
			const inputMap = ArpgAction.createDefaultInputMap();
			const actionState = new ActionState<ArpgAction>();

			// 注册动作
			for (const action of ArpgAction.DIRECTIONS) {
				actionState.registerAction(action);
			}

			actionState.registerAction(ArpgAction.Ability4);
			components.insert(world, playerEntity, inputMap, actionState);

			// 添加冲刺系统 (对应 player_dash 系统)
			let dashDirection: Vector2 | undefined;
			app.addSystems(MainScheduleLabel.UPDATE, (currentWorld: BevyWorld) => {
				for (const [entityId, data] of components.query(currentWorld)) {
					if (data.actionState && data.actionState.justPressed(ArpgAction.Ability4)) {
						let directionVector = Vector2.zero;

						// 累加所有方向输入 (对应 Rust 的方向求和)
						for (const directionAction of ArpgAction.DIRECTIONS) {
							if (data.actionState.pressed(directionAction)) {
								const direction = directionAction.direction();

								if (direction) {
									directionVector = directionVector.add(direction);
								}
							}
						}

						// 归一化方向向量
						if (directionVector.Magnitude > 0) {
							dashDirection = directionVector.Unit;
							print(`Dashing in direction: (${dashDirection.X}, ${dashDirection.Y})`);
						}
					}
				}
			});

			// 模拟同时按下右和上方向键,然后按空格冲刺
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.Right);
			keyboard.pressKey(Enum.KeyCode.Up);
			keyboard.pressKey(Enum.KeyCode.Space); // Ability4 触发冲刺

			advanceFrame(app);

			// 验证冲刺方向 (应该是右上方)
			expect(dashDirection).to.be.ok();

			if (dashDirection) {
				expect(dashDirection.X > 0).to.equal(true); // 向右
				expect(dashDirection.Y > 0).to.equal(true); // 向上
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle continuous walking input", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<ArpgAction>({
				actionTypeName: "ArpgAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			// 创建玩家
			const playerEntity = world.spawn();
			const inputMap = ArpgAction.createDefaultInputMap();
			const actionState = new ActionState<ArpgAction>();

			for (const action of ArpgAction.DIRECTIONS) {
				actionState.registerAction(action);
			}

			components.insert(world, playerEntity, inputMap, actionState);

			// 添加行走系统 (对应 player_walks 系统)
			const walkDirections: Array<Vector2> = [];
			app.addSystems(MainScheduleLabel.UPDATE, (currentWorld: BevyWorld) => {
				for (const [entityId, data] of components.query(currentWorld)) {
					if (!data.actionState) {
						continue;
					}

					let directionVector = Vector2.zero;

					for (const directionAction of ArpgAction.DIRECTIONS) {
						if (data.actionState.pressed(directionAction)) {
							const direction = directionAction.direction();

							if (direction) {
								directionVector = directionVector.add(direction);
							}
						}
					}

					// 记录移动方向
					if (directionVector.Magnitude > 0) {
						const netDirection = directionVector.Unit;
						walkDirections.push(netDirection);
					}
				}
			});

			// 模拟多帧移动输入
			const keyboard = KeyboardSimulator.fromApp(app);

			// 第一帧: 向右移动
			keyboard.pressKey(Enum.KeyCode.Right);
			advanceFrame(app);

			// 第二帧: 继续向右
			advanceFrame(app);

			// 第三帧: 改为向上移动
			keyboard.releaseKey(Enum.KeyCode.Right);
			keyboard.pressKey(Enum.KeyCode.Up);
			advanceFrame(app);

			// 验证记录了移动方向
			expect(walkDirections.size() > 0).to.equal(true);

			// 第一次移动应该是向右
			if (walkDirections[0]) {
				expect(walkDirections[0].X > 0).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle multiple abilities simultaneously", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<ArpgAction>({
				actionTypeName: "ArpgAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			const playerEntity = world.spawn();
			const inputMap = ArpgAction.createDefaultInputMap();
			const actionState = new ActionState<ArpgAction>();

			// 注册所有技能
			actionState.registerAction(ArpgAction.Ability1);
			actionState.registerAction(ArpgAction.Ability2);
			actionState.registerAction(ArpgAction.Ability3);
			actionState.registerAction(ArpgAction.Ultimate);

			components.insert(world, playerEntity, inputMap, actionState);

			// 快速连续按下多个技能
			const keyboard = KeyboardSimulator.fromApp(app);

			keyboard.pressKey(Enum.KeyCode.Q);
			advanceFrame(app);
			keyboard.releaseKey(Enum.KeyCode.Q);

			keyboard.pressKey(Enum.KeyCode.W);
			advanceFrame(app);
			keyboard.releaseKey(Enum.KeyCode.W);

			keyboard.pressKey(Enum.KeyCode.R); // Ultimate
			advanceFrame(app);

			// 验证最后一个技能被触发
			const data = components.get(world, playerEntity);

			if (data && data.actionState) {
				expect(data.actionState.pressed(ArpgAction.Ultimate)).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should support diagonal movement with arrow keys", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<ArpgAction>({
				actionTypeName: "ArpgAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			const playerEntity = world.spawn();
			const inputMap = ArpgAction.createDefaultInputMap();
			const actionState = new ActionState<ArpgAction>();

			for (const action of ArpgAction.DIRECTIONS) {
				actionState.registerAction(action);
			}

			components.insert(world, playerEntity, inputMap, actionState);

			// 同时按下上和右
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.Up);
			keyboard.pressKey(Enum.KeyCode.Right);

			advanceFrame(app);

			// 验证两个方向都被检测到
			const data = components.get(world, playerEntity);

			if (data && data.actionState) {
				expect(data.actionState.pressed(ArpgAction.Up)).to.equal(true);
				expect(data.actionState.pressed(ArpgAction.Right)).to.equal(true);

				// 计算合成方向
				let resultVector = Vector2.zero;

				for (const directionAction of ArpgAction.DIRECTIONS) {
					if (data.actionState.pressed(directionAction)) {
						const direction = directionAction.direction();

						if (direction) {
							resultVector = resultVector.add(direction);
						}
					}
				}

				// 应该是右上方向
				expect(resultVector.X > 0).to.equal(true);
				expect(resultVector.Y > 0).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});
	});
};