/**
 * Action State Resource Example
 *
 * Oftentimes your input actions can be handled globally and are
 * best represented as a Resource.
 *
 * This example demonstrates how to create a simple Actionlike
 * and include it as a resource in a bevy app.
 *
 * Ported from: bevy-origin-packages/leafwing-input-manager/examples/action_state_resource.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs";
import {
	Actionlike,
	ActionState,
	InputManagerPlugin,
	InputMap,
	InputManagerExtension,
	KeyCode,
} from "../../leafwing-input-manager";
import { VirtualDPad } from "../../leafwing-input-manager/user-input/virtual-controls";

// =====================================
// 定义游戏动作
// =====================================

/**
 * 玩家动作枚举
 */
enum PlayerAction {
	Move,
	Jump,
}

/**
 * PlayerAction 的 Actionlike 实现
 */
class PlayerActionlike implements Actionlike {
	constructor(public readonly action: PlayerAction) {}

	/**
	 * Generates a unique hash for this action
	 * @returns A string hash that uniquely identifies this action
	 */
	hash(): string {
		return `PlayerAction:${this.action}`;
	}

	/**
	 * Checks equality with another action
	 * @param other - The other action to compare with
	 * @returns True if the actions are equal
	 */
	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	/**
	 * Gets the display name for this action
	 * @returns A human-readable name for the action
	 */
	toString(): string {
		return PlayerAction[this.action];
	}
}

// =====================================
// 辅助函数
// =====================================

/**
 * 创建默认的鼠标键盘输入映射
 *
 * Exhaustively match PlayerAction and define the default bindings to the input
 * @returns 输入映射
 */
function createMkbInputMap(): InputMap<PlayerActionlike> {
	const inputMap = new InputMap<PlayerActionlike>();

	// Jump action - 绑定到空格键
	inputMap.insert(new PlayerActionlike(PlayerAction.Jump), KeyCode.Space);

	// Move action - 使用 WASD 虚拟方向键
	inputMap.insert(new PlayerActionlike(PlayerAction.Move), VirtualDPad.wasd());

	return inputMap;
}

// =====================================
// 系统定义
// =====================================

/**
 * 处理玩家移动的系统
 *
 * action_state is stored as a resource
 * @param world - Bevy 世界
 * @param context - 应用上下文
 */
function movePlayer(world: BevyWorld, context: Context): void {
	// 从资源中获取 ActionState
	const actionState = world.resources.getResource<ActionState<PlayerActionlike>>();

	if (!actionState) {
		return;
	}

	// 获取移动的轴向数据
	const moveAction = new PlayerActionlike(PlayerAction.Move);
	const axisPair = actionState.axisPair(moveAction);

	print(`Move: (${string.format("%.2f", axisPair.x)}, ${string.format("%.2f", axisPair.y)})`);

	// 检查跳跃动作
	const jumpAction = new PlayerActionlike(PlayerAction.Jump);

	if (actionState.pressed(jumpAction)) {
		print("Jumping!");
	}
}

// =====================================
// 应用程序设置
// =====================================

/**
 * 创建应用实例
 * @returns App 实例
 */
export function createApp(): App {
	const app = new App();

	// 添加默认插件组
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加 InputManagerPlugin
	const inputPlugin = InputManagerPlugin.create<PlayerActionlike>({
		actionTypeName: "PlayerAction",
	});
	const typedApp = app.addPlugin(inputPlugin);

	// 初始化 ActionState 资源
	// init_resource::<ActionState<PlayerAction>>()
	const actionState = new ActionState<PlayerActionlike>();
	actionState.registerAction(new PlayerActionlike(PlayerAction.Move));
	actionState.registerAction(new PlayerActionlike(PlayerAction.Jump));
	typedApp.insertResource<ActionState<PlayerActionlike>>(actionState);

	// 插入 InputMap 资源
	// insert_resource(PlayerAction::mkb_input_map())
	const inputMap = createMkbInputMap();
	typedApp.insertResource<InputMap<PlayerActionlike>>(inputMap);

	// 添加系统
	typedApp.addSystems(MainScheduleLabel.UPDATE, movePlayer);

	return typedApp;
}

// =====================================
// 入口点
// =====================================

if (game.GetService("RunService").IsServer()) {
	print("[Server] Starting Action State Resource Example");
	const app = createApp();
	app.run();
} else if (game.GetService("RunService").IsClient()) {
	print("[Client] Starting Action State Resource Example");
	print("========================================");
	print("Action State Resource Example");
	print("Controls:");
	print("  Space - Jump");
	print("  WASD - Move");
	print("========================================");
	const app = createApp();
	app.run();
}
