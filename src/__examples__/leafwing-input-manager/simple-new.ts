/**
 * 简单的 Leafwing Input Manager 示例 - 使用新的组件架构
 *
 * 展示如何：
 * 1. 创建 InputManagerPlugin 并添加到 App
 * 2. 为实体设置 InputMap 和 ActionState
 * 3. 在系统中处理输入
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs/types";
import { component } from "@rbxts/matter";

// 导入输入管理器相关类型
import {
	createInputManagerPlugin,
	InputMap,
	ActionState,
	KeyCode,
	MouseButton,
	Actionlike,
	spawnWithInput,
	queryInputEntities,
	InputManagerExtension,
} from "../../leafwing-input-manager";

// =====================================
// 定义游戏动作
// =====================================

enum PlayerAction {
	Jump,
	Shoot,
}

class PlayerActionlike implements Actionlike {
	constructor(public readonly action: PlayerAction) {}

	hash(): string {
		return `PlayerAction:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return PlayerAction[this.action];
	}
}

// =====================================
// 类型扩展声明 - 让 IDE 识别 context.playerInput
// =====================================
declare module "../../bevy_app/context" {
	interface AppContext {
		playerInput: InputManagerExtension<PlayerActionlike>;
	}
}

// =====================================
// 定义组件
// =====================================

const Player = component<{
	name: string;
}>("Player");

// =====================================
// 系统定义
// =====================================

// 保存插件实例供系统使用
let inputPlugin: ReturnType<typeof createInputManagerPlugin<PlayerActionlike>>;

/**
 * 生成玩家实体并设置输入映射
 */
function spawnPlayer(world: BevyWorld, context: Context): void {
	print("========================================");
	print("Spawning player with new component architecture");

	// 创建输入映射
	const inputMap = new InputMap<PlayerActionlike>()
		.insert(new PlayerActionlike(PlayerAction.Jump), KeyCode.Space)
		.insert(new PlayerActionlike(PlayerAction.Shoot), MouseButton.left());

	// 创建动作状态
	const actionState = new ActionState<PlayerActionlike>();

	// 注册动作到 ActionState
	actionState.registerAction(new PlayerActionlike(PlayerAction.Jump));
	actionState.registerAction(new PlayerActionlike(PlayerAction.Shoot));

	// 使用插件扩展创建带有输入组件的实体
	const entity = inputPlugin.extension!.spawnWithInput(world, inputMap, actionState);

	// 添加其他游戏组件
	world.insert(entity as any, Player({ name: "Player1" }));

	print(`Player spawned with entity ID: ${entity}`);
	print("========================================");
	print("Leafwing Input Manager Example (New Architecture)");
	print("Controls:");
	print("  Space - Jump");
	print("  Left Mouse Button - Shoot");
	print("========================================");
}

/**
 * 处理玩家动作的系统
 */
function handlePlayerActions(world: BevyWorld, context: Context): void {
	// 使用新的查询方法遍历所有具有输入组件的实体
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		// 检查实体是否也是玩家
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) continue;

		// 获取玩家数据 - Matter 组件直接返回数据对象
		const playerName = (player as unknown as { name: string }).name;

		// 检查跳跃动作
		const jumpAction = new PlayerActionlike(PlayerAction.Jump);
		if (actionState.justPressed(jumpAction)) {
			print(`[${playerName}] Jump! (Entity ${entityId})`);
		}

		// 检查射击动作
		const shootAction = new PlayerActionlike(PlayerAction.Shoot);
		if (actionState.justPressed(shootAction)) {
			print(`[${playerName}] Shoot! (Entity ${entityId})`);
		}

		// 显示按住状态
		if (actionState.pressed(jumpAction)) {
			// 简单地显示按住状态，不访问私有方法
			print(`[${playerName}] Holding jump...`);
		}
	}
}

// =====================================
// 应用程序设置
// =====================================

export function createApp() {
	const app = new App();

	// 添加默认插件组
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 创建并添加 InputManagerPlugin
	inputPlugin = createInputManagerPlugin<PlayerActionlike>(
		{
			actionTypeName: "PlayerAction",
		}
	);

	// 添加 InputManagerPlugin - 链式调用保持类型
	const typedApp = app.addPlugin(inputPlugin);


	// ✅ 现在 typedApp.context.playerInput 有完整的类型提示
	typedApp.context.playerInput.getComponents()


	// 添加系统
	typedApp.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);
	typedApp.addSystems(MainScheduleLabel.UPDATE, handlePlayerActions);

	typedApp.context.playerInput.getComponents()

	return typedApp;
}

// =====================================
// 入口点
// =====================================

if (game.GetService("RunService").IsServer()) {
	print("[Server] Starting Leafwing Input Manager Example (New Architecture)");
	const app = createApp();
	app.run();
} else if (game.GetService("RunService").IsClient()) {
	print("[Client] Starting Leafwing Input Manager Example (New Architecture)");
	const app = createApp();
	app.run();
}