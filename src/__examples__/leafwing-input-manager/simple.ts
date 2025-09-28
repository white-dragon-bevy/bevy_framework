/**
 * Leafwing Input Manager 示例
 * 演示如何使用输入管理器处理玩家输入
 * 对应 Rust leafwing-input-manager 示例
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { RobloxRunnerPlugin } from "../../bevy_app";
import { listInputManagers } from "../../leafwing-input-manager/plugin/context-helpers";
import { RunService } from "@rbxts/services";
import {
	InputMap,
	ActionState,
	Actionlike,
	InputControlKind,
	KeyCode,
	MouseButton,
	InputManagerPlugin,
	InputMapComponent,
	ActionStateComponent,
	InputEnabled,
	LocalPlayer,
	isJustPressed,
	isJustReleased,
} from "../../leafwing-input-manager";
import { component, type World } from "@rbxts/matter";
import { getInputInstanceManager } from "../../leafwing-input-manager/plugin/context-helpers";
import { Context } from "../../bevy_ecs";

/**
 * 玩家动作枚举
 * 定义游戏中的所有可能动作
 */
class PlayerAction implements Actionlike {
	static readonly Jump = new PlayerAction("Jump", InputControlKind.Button);
	static readonly Shoot = new PlayerAction("Shoot", InputControlKind.Button);

	// 添加类名属性供 InputManager 使用
	static readonly name = "PlayerAction";

	constructor(
		private readonly actionName: string,
		private readonly controlKind: InputControlKind,
	) {}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}

	hash(): string {
		return `PlayerAction_${this.actionName}`;
	}

	equals(other: Actionlike): boolean {
		return other instanceof PlayerAction && other.actionName === this.actionName;
	}

	toString(): string {
		return this.actionName;
	}
}

/**
 * Player组件 - 标识玩家实体
 */
const Player = component<{ name: string }>("Player");

/**
 * 在启动时生成玩家实体
 * @param world - Matter World实例
 */
function spawnPlayer(world: World, context:Context): void {
	const isServer = RunService.IsServer();
	const isClient = RunService.IsClient();

	// 服务端不生成本地玩家
	if (isServer) {
		return;
	}

	print(`[spawnPlayer] Starting on CLIENT...`);

	// 检查是否已存在玩家
	for (const [_entity, _player] of world.query(Player)) {
		print("[spawnPlayer] Player already exists, skipping");
		return; // 玩家已存在
	}

	// 创建输入映射
	const inputMap = new InputMap<PlayerAction>();
	inputMap.insert(PlayerAction.Jump, KeyCode.Space);
	inputMap.insert(PlayerAction.Shoot, MouseButton.left());

	// 创建动作状态
	const actionState = new ActionState<PlayerAction>();
	actionState.registerAction(PlayerAction.Jump);
	actionState.registerAction(PlayerAction.Shoot);

	// 生成玩家实体 - 仅使用组件作为标记，实际实例存储在 InstanceManager
	const entity = world.spawn(
		Player({ name: "Player1" }),
		InputMapComponent({} as unknown as InputMap<PlayerAction>), // 空占位符
		ActionStateComponent({} as unknown as ActionState<PlayerAction>), // 空占位符
		InputEnabled({ enabled: true }),
		LocalPlayer({ playerId: 1 }),
	);

	// 通过 Context 获取 InputManager 并注册实例
	// InputManager 现在在服务端和客户端都可用
		print("[spawnPlayer] Got context");

		// 调试：列出所有已注册的扩展
		const allExtensions = context.listExtensions();
		print("[spawnPlayer] All registered extensions:");
		for (const ext of allExtensions) {
			print(`  - ${ext}`);
		}

		const instanceManager = getInputInstanceManager(context, PlayerAction);
		if (instanceManager) {
			print("[spawnPlayer] Got InputInstanceManager successfully");
			instanceManager.registerInputMap(entity, inputMap);
			print("[spawnPlayer] Registered InputMap");
			instanceManager.registerActionState(entity, actionState);
			print("[spawnPlayer] Registered ActionState");
			print("[spawnPlayer] All input instances registered successfully");
		} else {
			print("[spawnPlayer] ERROR: Could not get InputInstanceManager for PlayerAction");
			print(`[spawnPlayer] Looking for key: input-manager:${PlayerAction.name}`);
		}
	

	print("========================================");
	print("Leafwing Input Manager Example");
	print("Controls:");
	print("  Space - Jump");
	print("  Left Mouse Button - Shoot");
	print("========================================");
}

/**
 * 全局 App 实例
 */
let globalApp: App | undefined;

/**
 * 调试计数器
 */
let debugCounter = 0;

/**
 * 处理玩家动作
 * 响应玩家的输入动作
 * @param world - Matter World实例
 */
function handlePlayerActions(world: World,context:Context): void {
	const isServer = RunService.IsServer();
	const isClient = RunService.IsClient();

	// 服务端不处理本地输入（除非通过网络同步）
	if (isServer) {
		return;
	}

	// 从 globalApp 获取 context
	if (!globalApp) {
		print("[handlePlayerActions] ERROR: globalApp is undefined!");
		return;
	}

	debugCounter++

	// 每60帧（约1秒）输出一次调试信息
	if (debugCounter % 60 === 0) {
		print(`[handlePlayerActions] ======== Debug Info (${isServer ? "SERVER" : "CLIENT"}) ========`);

		// 列出所有 InputManager
		const inputManagers = listInputManagers(context);
		print(`[handlePlayerActions] Registered InputManagers: ${inputManagers.join(", ") || "NONE"}`);
	}

	// 使用 helper 函数获取 InputInstanceManager
	const instanceManager = getInputInstanceManager(context, PlayerAction);
	if (!instanceManager) {
		if (debugCounter % 60 === 0) {
			print("[handlePlayerActions] ERROR: Could not get InputInstanceManager");
			print(`[handlePlayerActions] Looking for key: input-manager:${PlayerAction.name}`);
		}
		return;
	}

	let foundPlayers = 0;
	for (const [entity, player] of world.query(Player)) {
		foundPlayers++;

		if (debugCounter % 60 === 0) {
			print(`[handlePlayerActions] Processing player: ${player.name} (entity: ${entity})`);
		}

		// 从 InstanceManager 获取实际的 ActionState 实例
		const state = instanceManager.getActionState(entity) as ActionState<PlayerAction> | undefined;
		if (!state) {
			if (debugCounter % 60 === 0) {
				print(`[handlePlayerActions] ERROR: No ActionState for entity ${entity}`);
			}
			continue;
		}

		if (debugCounter % 60 === 0) {
			print(`[handlePlayerActions] Got ActionState for player ${player.name}`);
		}


		// 使用包装函数安全地调用 ActionState 方法
		// 注意：在服务端，输入状态不会更新（除非通过网络同步）
		// 处理跳跃
		if (isJustPressed(state, PlayerAction.Jump)) {
			print(`[${isServer ? "SERVER" : "CLIENT"}] ${player.name} jumped!`);
		}
		if (isJustReleased(state, PlayerAction.Jump)) {
			print(`[${isServer ? "SERVER" : "CLIENT"}] ${player.name} stopped jumping`);
		}

		// 处理射击
		if (isJustPressed(state, PlayerAction.Shoot)) {
			print(`[${isServer ? "SERVER" : "CLIENT"}] ${player.name} started shooting!`);
		}
		if (isJustReleased(state, PlayerAction.Shoot)) {
			print(`[${isServer ? "SERVER" : "CLIENT"}] ${player.name} stopped shooting`);
		}
	}

	if (debugCounter % 60 === 0 && foundPlayers === 0) {
		print("[handlePlayerActions] WARNING: No players found in query!");
	}
}

/**
 * 主函数
 * 创建应用并设置输入管理系统
 */
export function main(): App {
	const app = App.create();
	globalApp = app; // 保存 App 实例以供系统使用

	// 添加默认插件组（包含 RobloxRunnerPlugin）
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加 InputManagerPlugin - 像 Rust 版本一样简洁
	app.addPlugin(
		new InputManagerPlugin<PlayerAction>({
			actionType: PlayerAction,
		}),
	);

	// 添加系统 - 不再需要包装器
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);
	app.addSystems(MainScheduleLabel.UPDATE, handlePlayerActions);

	return app;
}

// 创建并运行应用
const app = main();
app.run();
