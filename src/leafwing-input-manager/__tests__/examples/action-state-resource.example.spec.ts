/**
 * Action State Resource Example - 动作状态资源示例
 *
 * 演示如何使用全局 ActionState 资源而非组件:
 * - 将 InputMap 和 ActionState 作为资源存储
 * - 在系统中直接访问全局动作状态
 * - 适用于单人游戏或全局输入处理
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/action_state_resource.rs
 */

import { createTestApp, advanceFrame, cleanupTestApp } from "../test-utils";
import { KeyboardSimulator, GamepadSimulator } from "../input-simulator";
import { InputMap } from "../../input-map/input-map";
import { ActionState } from "../../action-state/action-state";
import { ActionlikeEnum } from "../../actionlike";
import { InputControlKind } from "../../input-control-kind";
import { KeyCode } from "../../user-input/keyboard";
import { VirtualDPad } from "../../user-input/virtual-controls";
import { InputManagerPlugin } from "../../plugin/input-manager-plugin";
import { MainScheduleLabel } from "../../../bevy_app";
import { BevyWorld } from "../../../bevy_ecs";

/**
 * 玩家动作枚举
 * 对应 Rust 的 PlayerAction enum
 */
class PlayerAction extends ActionlikeEnum {
	static readonly Move = new PlayerAction("Move");
	static readonly Jump = new PlayerAction("Jump");

	private constructor(value: string) {
		super(value);
	}

	hash(): string {
		return `PlayerAction:${this.value}`;
	}

	getInputControlKind(): InputControlKind {
		// Move 是双轴输入, Jump 是按钮
		if (this.value === "Move") {
			return InputControlKind.DualAxis;
		}

		return InputControlKind.Button;
	}

	/**
	 * 创建键鼠输入映射
	 * 对应 Rust 的 mkb_input_map 方法
	 */
	static createKeyboardMouseInputMap(): InputMap<PlayerAction> {
		const inputMap = new InputMap<PlayerAction>();

		// Jump 绑定空格键
		inputMap.insert(PlayerAction.Jump, KeyCode.from(Enum.KeyCode.Space));

		// Move 绑定 WASD 虚拟方向键
		inputMap.insert(PlayerAction.Move, VirtualDPad.wasd());

		return inputMap;
	}
}

export = () => {
	describe("Action State Resource Example", () => {
		it("should use global ActionState resource for input handling", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = InputManagerPlugin.create<PlayerAction>({
				
			});
			app.addPlugins(plugin);

			const world = app.getWorld();

			// 初始化全局 ActionState 资源 (对应 init_resource)
			const globalActionState = new ActionState<PlayerAction>();
			globalActionState.registerAction(PlayerAction.Jump);
			globalActionState.registerAction(PlayerAction.Move);
			world.resources.insertResource(globalActionState);

			// 插入全局 InputMap 资源 (对应 insert_resource)
			const globalInputMap = PlayerAction.createKeyboardMouseInputMap();
			world.resources.insertResource(globalInputMap);

			// 模拟输入
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.Space);

			// 推进一帧
			advanceFrame(app);

			// 验证: 从资源中读取全局 ActionState
			const actionState = world.resources.getResource<ActionState<PlayerAction>>();
			expect(actionState).to.be.ok();

			if (actionState) {
				expect(actionState.pressed(PlayerAction.Jump)).to.equal(true);
				print("Jumping!"); // 对应 Rust 的 println!
			}

			// 清理
			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle dual-axis Move action with WASD", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = InputManagerPlugin.create<PlayerAction>({
				
			});
			app.addPlugins(plugin);

			const world = app.getWorld();

			// 初始化全局资源
			const globalActionState = new ActionState<PlayerAction>();
			globalActionState.registerAction(PlayerAction.Move);
			world.resources.insertResource(globalActionState);

			const globalInputMap = PlayerAction.createKeyboardMouseInputMap();
			world.resources.insertResource(globalInputMap);

			// 模拟按下 W 键 (向上移动)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W);

			// 推进一帧
			advanceFrame(app);

			// 验证: 获取轴对值
			const actionState = world.resources.getResource<ActionState<PlayerAction>>();

			if (actionState) {
				const axisPair = actionState.axisPair(PlayerAction.Move);
				print(`Move: (${axisPair.x}, ${axisPair.y})`); // 对应 Rust 的 println!

				// WASD 中 W 对应 Y 轴正值
				expect(axisPair.y).to.be.near(1.0, 0.01);
				expect(axisPair.x).to.be.near(0.0, 0.01);
			}

			// 清理
			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle diagonal movement with WASD", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = InputManagerPlugin.create<PlayerAction>({
				
			});
			app.addPluginTest(plugin);

			const world = app.getWorld();

			// 初始化全局资源
			const globalActionState = new ActionState<PlayerAction>();
			globalActionState.registerAction(PlayerAction.Move);
			world.resources.insertResource(globalActionState);

			const globalInputMap = PlayerAction.createKeyboardMouseInputMap();
			world.resources.insertResource(globalInputMap);

			// 模拟同时按下 W 和 D (右上方移动)
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W);
			keyboard.pressKey(Enum.KeyCode.D);

			// 推进一帧
			advanceFrame(app);

			// 验证: 获取对角线移动
			const actionState = world.resources.getResource<ActionState<PlayerAction>>();

			if (actionState) {
				const axisPair = actionState.axisPair(PlayerAction.Move);
				print(`Diagonal Move: (${axisPair.x}, ${axisPair.y})`);

				// W + D 应该产生右上方移动
				expect(axisPair.x > 0).to.equal(true);
				expect(axisPair.y > 0).to.equal(true);
			}

			// 清理
			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should work with system accessing global resource", () => {
			const app = createTestApp();

			// 添加 InputManagerPlugin
			const plugin = InputManagerPlugin.create<PlayerAction>({
				
			});
			app.addPlugins(plugin);

			const world = app.getWorld();

			// 初始化全局资源
			const globalActionState = new ActionState<PlayerAction>();
			globalActionState.registerAction(PlayerAction.Jump);
			globalActionState.registerAction(PlayerAction.Move);
			world.resources.insertResource(globalActionState);

			const globalInputMap = PlayerAction.createKeyboardMouseInputMap();
			world.resources.insertResource(globalInputMap);

			// 添加移动玩家系统 (对应 Rust 的 move_player 系统)
			let moveX = 0;
			let moveY = 0;
			let isJumping = false;

			app.addSystems(MainScheduleLabel.UPDATE, (currentWorld: BevyWorld) => {
				// 从资源读取 ActionState (对应 Res<ActionState<PlayerAction>>)
				const actionState = currentWorld.resources.getResource<ActionState<PlayerAction>>();

				if (actionState) {
					// 获取移动轴对
					const axisPair = actionState.axisPair(PlayerAction.Move);
					moveX = axisPair.x;
					moveY = axisPair.y;

					// 检查跳跃
					isJumping = actionState.pressed(PlayerAction.Jump);
				}
			});

			// 模拟输入
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W);
			keyboard.pressKey(Enum.KeyCode.Space);

			// 运行一帧
			advanceFrame(app);

			// 验证系统逻辑
			expect(moveY > 0).to.equal(true);
			expect(isJumping).to.equal(true);

			// 清理
			keyboard.releaseAll();
			cleanupTestApp(app);
		});

		it("should handle multiple actions simultaneously", () => {
			const app = createTestApp();

			const plugin = InputManagerPlugin.create<PlayerAction>({
			});
			app.addPlugins(plugin);

			const world = app.getWorld();

			const globalActionState = new ActionState<PlayerAction>();
			globalActionState.registerAction(PlayerAction.Jump);
			globalActionState.registerAction(PlayerAction.Move);
			world.resources.insertResource(globalActionState);

			const globalInputMap = PlayerAction.createKeyboardMouseInputMap();
			world.resources.insertResource(globalInputMap);

			// 同时按下多个键
			const keyboard = KeyboardSimulator.fromApp(app);
			keyboard.pressKey(Enum.KeyCode.W);
			keyboard.pressKey(Enum.KeyCode.A);
			keyboard.pressKey(Enum.KeyCode.Space);

			advanceFrame(app);

			const actionState = world.resources.getResource<ActionState<PlayerAction>>();

			if (actionState) {
				// 验证跳跃
				expect(actionState.pressed(PlayerAction.Jump)).to.equal(true);

				// 验证移动 (W+A 应该是左上方)
				const axisPair = actionState.axisPair(PlayerAction.Move);
				expect(axisPair.x < 0).to.equal(true); // A 键向左
				expect(axisPair.y > 0).to.equal(true); // W 键向上
			}

			keyboard.releaseAll();
			cleanupTestApp(app);
		});
	});
};