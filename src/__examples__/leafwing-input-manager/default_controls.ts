/**
 * Default Controls Example - 默认控制方案示例
 *
 * 演示如何为 Actionlike 创建默认控制方案并添加到 InputMap
 *
 * Ported from: bevy-origin-packages/leafwing-input-manager/examples/default_controls.rs
 *
 * 主要特性:
 * - 为 PlayerAction 定义默认输入映射
 * - 支持键盘和手柄双重控制方案
 * - 使用 VirtualDPad 实现 WASD 移动
 * - 展示双轴输入和按钮输入的处理
 *
 * @example
 * ```typescript
 * // 运行示例
 * import { runDefaultControlsExample } from "./default_controls";
 * runDefaultControlsExample();
 * ```
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app/main-schedule";
import { BevyWorld } from "../../bevy_ecs/types";
import { RobloxRunnerPlugin } from "../../bevy_app/roblox-adapters";
import { ActionlikeEnum } from "../../leafwing-input-manager/actionlike";
import { InputControlKind } from "../../leafwing-input-manager/input-control-kind";
import { InputMap } from "../../leafwing-input-manager/input-map/input-map";
import { ActionState } from "../../leafwing-input-manager/action-state/action-state";
import { KeyCode } from "../../leafwing-input-manager/user-input/keyboard";
import { MouseButton } from "../../leafwing-input-manager/user-input/mouse";
import { VirtualDPad } from "../../leafwing-input-manager/user-input/virtual-controls";
import { GamepadButton, GamepadStick } from "../../leafwing-input-manager/user-input/gamepad";
import { createInputManagerPlugin } from "../../leafwing-input-manager/plugin/input-manager-plugin";

/**
 * Player action enum
 * 玩家动作枚举
 *
 * Corresponds to Rust's PlayerAction enum with Actionlike derive
 */
class PlayerAction extends ActionlikeEnum {
	/**
	 * Run action - dual axis movement
	 * 奔跑动作 - 双轴移动
	 */
	static readonly Run = new PlayerAction("Run");

	/**
	 * Jump action - button press
	 * 跳跃动作 - 按钮按下
	 */
	static readonly Jump = new PlayerAction("Jump");

	/**
	 * UseItem action - button press
	 * 使用物品动作 - 按钮按下
	 */
	static readonly UseItem = new PlayerAction("UseItem");

	private constructor(value: string) {
		super(value);
	}

	/**
	 * Get unique hash for this action
	 * 获取动作的唯一哈希值
	 * @returns Action hash string
	 */
	hash(): string {
		return `PlayerAction:${this.value}`;
	}

	/**
	 * Get input control kind for this action
	 * 获取该动作的输入控制类型
	 * @returns Input control kind
	 */
	getInputControlKind(): InputControlKind {
		// Run is dual axis (2D movement), others are buttons
		if (this.value === "Run") {
			return InputControlKind.DualAxis;
		}

		return InputControlKind.Button;
	}

	/**
	 * Define the default bindings to the input
	 * 定义默认输入绑定
	 *
	 * Corresponds to Rust's default_input_map() implementation method
	 *
	 * @returns Default InputMap for PlayerAction
	 */
	static defaultInputMap(): InputMap<PlayerAction> {
		const inputMap = new InputMap<PlayerAction>();

		// Default gamepad input bindings
		// 默认手柄输入绑定
		inputMap.insert(PlayerAction.Run, GamepadStick.left());
		inputMap.insert(PlayerAction.Jump, GamepadButton.south());
		inputMap.insert(PlayerAction.UseItem, GamepadButton.rightTrigger());

		// Default keyboard and mouse input bindings
		// 默认键盘和鼠标输入绑定
		inputMap.insert(PlayerAction.Run, VirtualDPad.wasd());
		inputMap.insert(PlayerAction.Jump, KeyCode.from(Enum.KeyCode.Space));
		inputMap.insert(PlayerAction.UseItem, MouseButton.left());

		return inputMap;
	}
}

/**
 * Spawn player system
 * 生成玩家系统
 *
 * Corresponds to Rust's spawn_player() system
 *
 * @param world - Bevy world
 */
function spawnPlayer(world: BevyWorld): void {
	// Get the InputManager plugin extension to access components
	// 获取 InputManager 插件扩展以访问组件
	const plugin = createInputManagerPlugin<PlayerAction>({
		actionTypeName: "PlayerAction",
	});

	const extension = plugin.extension;

	if (!extension) {
		warn("InputManagerPlugin extension not found");
		return;
	}

	const components = extension.getComponents();

	// Spawn the player with the default input_map
	// 使用默认输入映射生成玩家
	const playerEntity = world.spawn();

	// Create default input map
	const inputMap = PlayerAction.defaultInputMap();

	// Create action state and register all actions
	const actionState = new ActionState<PlayerAction>();
	actionState.registerAction(PlayerAction.Run);
	actionState.registerAction(PlayerAction.Jump);
	actionState.registerAction(PlayerAction.UseItem);

	// Insert components to the entity
	components.insert(world, playerEntity, inputMap, actionState);

	print("[DefaultControls] Player spawned with default controls");
}

/**
 * Use actions system
 * 使用动作系统
 *
 * Corresponds to Rust's use_actions() system
 *
 * @param world - Bevy world
 */
function useActions(world: BevyWorld): void {
	const plugin = createInputManagerPlugin<PlayerAction>({
		actionTypeName: "PlayerAction",
	});

	const extension = plugin.extension;

	if (!extension) {
		return;
	}

	const components = extension.getComponents();

	// Query all entities with PlayerAction components
	// 查询所有拥有 PlayerAction 组件的实体
	for (const [entityId, data] of components.query(world)) {
		if (!data.actionState) {
			continue;
		}

		const actionState = data.actionState;

		// Check for movement input
		// 检查移动输入
		const axisPair = actionState.axisPair(PlayerAction.Run);

		if (axisPair.x !== 0 || axisPair.y !== 0) {
			// Calculate normalized movement direction
			const magnitude = math.sqrt(axisPair.x * axisPair.x + axisPair.y * axisPair.y);
			const normalizedX = magnitude > 0 ? axisPair.x / magnitude : 0;
			const normalizedY = magnitude > 0 ? axisPair.y / magnitude : 0;
			print(`Moving in direction (${normalizedX}, ${normalizedY})`);
		}

		// Check for jump input
		// 检查跳跃输入
		if (actionState.justPressed(PlayerAction.Jump)) {
			print("Jumped!");
		}

		// Check for item use input
		// 检查物品使用输入
		if (actionState.justPressed(PlayerAction.UseItem)) {
			print("Used an Item!");
		}
	}
}

/**
 * Run the default controls example
 * 运行默认控制方案示例
 *
 * Main entry point that corresponds to Rust's main() function
 */
export function runDefaultControlsExample(): void {
	print("=== Default Controls Example ===");

	// Create app with Roblox runner plugin
	// 创建应用并添加 Roblox 运行器插件
	const app = App.create().addPlugins(new RobloxRunnerPlugin());

	// Add InputManager plugin
	// 添加 InputManager 插件
	app.addPlugins(
		createInputManagerPlugin<PlayerAction>({
			actionTypeName: "PlayerAction",
		}),
	);

	// Add startup system to spawn player
	// 添加启动系统来生成玩家
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);

	// Add update system to handle actions
	// 添加更新系统来处理动作
	app.addSystems(MainScheduleLabel.UPDATE, useActions);

	// Run the app
	// 运行应用
	app.run();

	print("=== Default Controls Example Started ===");
	print("Controls:");
	print("  Move: WASD or Left Stick");
	print("  Jump: Space or South Button (A/X)");
	print("  Use Item: Left Mouse Button or Right Trigger");
}

/**
 * Export for testing
 * 导出供测试使用
 */
export { PlayerAction };
