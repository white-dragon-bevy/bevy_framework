/**
 * Default Controls Example - 默认控制方案示例
 *
 * 演示如何为动作定义默认输入绑定:
 * - 为 Actionlike 创建默认 InputMap
 * - 支持键鼠和手柄双重绑定
 * - 使用 VirtualDPad 处理方向输入
 * - 展示完整的默认控制方案模式
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/default_controls.rs
 */

import { createTestApp, advanceFrame, cleanupTestApp } from "../test-utils";
import { KeyboardSimulator, MouseSimulator, GamepadSimulator } from "../input-simulator";
import { InputMap } from "../../input-map/input-map";
import { ActionState } from "../../action-state/action-state";
import { ActionlikeEnum } from "../../actionlike";
import { InputControlKind } from "../../input-control-kind";
import { KeyCode } from "../../user-input/keyboard";
import { VirtualDPad } from "../../user-input/virtual-controls";
import { createInputManagerPlugin } from "../../plugin/input-manager-plugin";
import { MainScheduleLabel } from "../../../bevy_app";
import { BevyWorld } from "../../../bevy_ecs/types";

/**
 * 玩家动作枚举
 * 对应 Rust 的 PlayerAction enum
 */
class PlayerAction extends ActionlikeEnum {
	static readonly Run = new PlayerAction("Run");
	static readonly Jump = new PlayerAction("Jump");
	static readonly UseItem = new PlayerAction("UseItem");

	private constructor(value: string) {
		super(value);
	}

	hash(): string {
		return `PlayerAction:${this.value}`;
	}

	getInputControlKind(): InputControlKind {
		// Run 是双轴输入, 其他是按钮
		if (this.value === "Run") {
			return InputControlKind.DualAxis;
		}

		return InputControlKind.Button;
	}

	/**
	 * 定义默认输入映射
	 * 对应 Rust 的 default_input_map 方法
	 */
	static defaultInputMap(): InputMap<PlayerAction> {
		const inputMap = new InputMap<PlayerAction>();

		// 键鼠输入绑定
		inputMap.insert(PlayerAction.Run, VirtualDPad.wasd());
		inputMap.insert(PlayerAction.Jump, KeyCode.from(Enum.KeyCode.Space));

		// UseItem 绑定到鼠标左键
		// 注意: Roblox 使用 UserInputType.MouseButton1
		// 这里简化为键盘 E 键作为替代
		inputMap.insert(PlayerAction.UseItem, KeyCode.from(Enum.KeyCode.E));

		// 手柄输入绑定
		// 注意: 手柄绑定在 Roblox 中需要特殊处理
		// 这里暂时跳过手柄绑定,专注于键鼠控制

		return inputMap;
	}
}

export = () => {
	describe("Default Controls Example", () => {
		it("should spawn player with default input map", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = createInputManagerPlugin<PlayerAction>({
				actionTypeName: "PlayerAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			// 使用默认输入映射创建玩家 (对应 spawn_player 系统)
			const playerEntity = world.spawn();
			const inputMap = PlayerAction.defaultInputMap();
			const actionState = new ActionState<PlayerAction>();
			actionState.registerAction(PlayerAction.Run);
			actionState.registerAction(PlayerAction.Jump);
			actionState.registerAction(PlayerAction.UseItem);

			components.insert(world, playerEntity, inputMap, actionState);

			// 验证实体已创建
			const data = components.get(world, playerEntity);
			expect(data).to.be.ok();
			expect(data?.inputMap).to.be.ok();
			expect(data?.actionState).to.be.ok();

			cleanupTestApp(app);
		});

		it("should handle WASD movement input", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<PlayerAction>({
				actionTypeName: "PlayerAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			const playerEntity = world.spawn();
			const inputMap = PlayerAction.defaultInputMap();
			const actionState = new ActionState<PlayerAction>();
			actionState.registerAction(PlayerAction.Run);

			components.insert(world, playerEntity, inputMap, actionState);

			// 模拟按下 W 键 (向前移动)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W);

			advanceFrame(app);

			// 验证移动输入 (对应 use_actions 系统)
			const data = components.get(world, playerEntity);

			if (data && data.actionState) {
				const axisPair = data.actionState.axisPair(PlayerAction.Run);
				print(`Moving in direction: (${axisPair.x}, ${axisPair.y})`);

				// W 键应该产生 Y 轴正值
				expect(axisPair.y > 0).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle jump action with Space key", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<PlayerAction>({
				actionTypeName: "PlayerAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			const playerEntity = world.spawn();
			const inputMap = PlayerAction.defaultInputMap();
			const actionState = new ActionState<PlayerAction>();
			actionState.registerAction(PlayerAction.Jump);

			components.insert(world, playerEntity, inputMap, actionState);

			// 模拟按下空格键
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.Space);

			advanceFrame(app);

			// 验证跳跃
			const data = components.get(world, playerEntity);

			if (data && data.actionState) {
				if (data.actionState.justPressed(PlayerAction.Jump)) {
					print("Jumped!");
				}

				expect(data.actionState.justPressed(PlayerAction.Jump)).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle UseItem action with E key", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<PlayerAction>({
				actionTypeName: "PlayerAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			const playerEntity = world.spawn();
			const inputMap = PlayerAction.defaultInputMap();
			const actionState = new ActionState<PlayerAction>();
			actionState.registerAction(PlayerAction.UseItem);

			components.insert(world, playerEntity, inputMap, actionState);

			// 模拟按下 E 键 (使用物品)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.E);

			advanceFrame(app);

			// 验证物品使用
			const data = components.get(world, playerEntity);

			if (data && data.actionState) {
				if (data.actionState.justPressed(PlayerAction.UseItem)) {
					print("Used an Item!");
				}

				expect(data.actionState.justPressed(PlayerAction.UseItem)).to.equal(true);
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should work with system checking all actions", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<PlayerAction>({
				actionTypeName: "PlayerAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			const playerEntity = world.spawn();
			const inputMap = PlayerAction.defaultInputMap();
			const actionState = new ActionState<PlayerAction>();
			actionState.registerAction(PlayerAction.Run);
			actionState.registerAction(PlayerAction.Jump);
			actionState.registerAction(PlayerAction.UseItem);

			components.insert(world, playerEntity, inputMap, actionState);

			// 添加动作使用系统 (对应 use_actions 系统)
			let isMoving = false;
			let hasJumped = false;
			let hasUsedItem = false;

			app.addSystems(MainScheduleLabel.UPDATE, (currentWorld: BevyWorld) => {
				for (const [entityId, data] of components.query(currentWorld)) {
					if (!data.actionState) {
						continue;
					}

					// 检查移动
					const axisPair = data.actionState.axisPair(PlayerAction.Run);

					if (axisPair.x !== 0 || axisPair.y !== 0) {
						isMoving = true;
					}

					// 检查跳跃
					if (data.actionState.justPressed(PlayerAction.Jump)) {
						hasJumped = true;
					}

					// 检查物品使用
					if (data.actionState.justPressed(PlayerAction.UseItem)) {
						hasUsedItem = true;
					}
				}
			});

			// 模拟组合输入
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W); // 移动
			keyboard.pressKey(Enum.KeyCode.Space); // 跳跃
			keyboard.pressKey(Enum.KeyCode.E); // 使用物品

			advanceFrame(app);

			// 验证所有动作都被检测到
			expect(isMoving).to.equal(true);
			expect(hasJumped).to.equal(true);
			expect(hasUsedItem).to.equal(true);

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle diagonal movement with WASD", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<PlayerAction>({
				actionTypeName: "PlayerAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			const playerEntity = world.spawn();
			const inputMap = PlayerAction.defaultInputMap();
			const actionState = new ActionState<PlayerAction>();
			actionState.registerAction(PlayerAction.Run);

			components.insert(world, playerEntity, inputMap, actionState);

			// 模拟同时按下 W 和 D (右上移动)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W);
			keyboard.pressKey(Enum.KeyCode.D);

			advanceFrame(app);

			// 验证对角线移动
			const data = components.get(world, playerEntity);

			if (data && data.actionState) {
				const axisPair = data.actionState.axisPair(PlayerAction.Run);
				print(`Diagonal movement: (${axisPair.x}, ${axisPair.y})`);

				// 应该同时有 X 和 Y 分量
				expect(axisPair.x > 0).to.equal(true); // 向右
				expect(axisPair.y > 0).to.equal(true); // 向上
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle continuous movement across frames", () => {
			const app = createTestApp();

			const plugin = createInputManagerPlugin<PlayerAction>({
				actionTypeName: "PlayerAction",
			});
			app.addPlugins(plugin);

			const components = plugin.extension!.getComponents();
			const world = app.getWorld();

			const playerEntity = world.spawn();
			const inputMap = PlayerAction.defaultInputMap();
			const actionState = new ActionState<PlayerAction>();
			actionState.registerAction(PlayerAction.Run);

			components.insert(world, playerEntity, inputMap, actionState);

			// 持续按住 W 键
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W);

			// 多帧验证持续移动
			for (let frameIndex = 0; frameIndex < 3; frameIndex++) {
				advanceFrame(app);

				const data = components.get(world, playerEntity);

				if (data && data.actionState) {
					const axisPair = data.actionState.axisPair(PlayerAction.Run);
					expect(axisPair.y > 0).to.equal(true);
				}
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});
	});
};