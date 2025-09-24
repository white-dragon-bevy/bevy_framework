/**
 * Leafwing Input Manager 示例
 * 演示如何使用输入管理器处理玩家输入
 * 对应 Rust leafwing-input-manager 示例
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import {
	InputMap,
	ActionState,
	ActionlikeEnum,
	InputControlKind,
	KeyCode,
	MouseButton,
	InputManagerPlugin,
	InputManagerPluginResource,
	InputMapComponent,
	ActionStateComponent,
	InputEnabled,
	LocalPlayer,
	isJustPressed,
	isJustReleased,
} from "../../leafwing-input-manager";
import { component, type World } from "@rbxts/matter";

/**
 * 玩家动作枚举
 * 定义游戏中的所有可能动作
 */
class PlayerAction extends ActionlikeEnum {
	static readonly Jump = new PlayerAction("Jump");
	static readonly Shoot = new PlayerAction("Shoot");

	constructor(name: string) {
		super(name, InputControlKind.Button);
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
function spawnPlayer(world: World): void {
	// 检查是否已存在玩家
	for (const [_entity, _player] of world.query(Player)) {
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
		InputMapComponent({} as unknown as InputMap<ActionlikeEnum>), // 空占位符
		ActionStateComponent({} as unknown as ActionState<ActionlikeEnum>), // 空占位符
		InputEnabled({ enabled: true }),
		LocalPlayer({ playerId: 1 }),
	);

	// 手动注册实例到 InstanceManager
	const resource = getInputManagerResource();
	if (resource) {
		const instanceManager = resource.plugin.getInstanceManager();
		if (instanceManager) {
			instanceManager.registerInputMap(entity, inputMap);
			instanceManager.registerActionState(entity, actionState);
		}
	}

	print("========================================");
	print("Leafwing Input Manager Example");
	print("Controls:");
	print("  Space - Jump");
	print("  Left Mouse Button - Shoot");
	print("========================================");
}

/**
 * 获取 InputManagerPlugin 资源
 */
let globalApp: App | undefined;

function getInputManagerResource(): InputManagerPluginResource<PlayerAction> | undefined {
	// 使用全局存储的 App 实例
	if (!globalApp) {
		return undefined;
	}
	return globalApp.getResource(InputManagerPluginResource<PlayerAction>);
}

/**
 * 处理玩家动作
 * 响应玩家的输入动作
 * @param world - Matter World实例
 */
function handlePlayerActions(world: World): void {
	const resource = getInputManagerResource();
	if (!resource) {
		return;
	}

	const instanceManager = resource.plugin.getInstanceManager();
	if (!instanceManager) {
		return;
	}

	for (const [entity, player] of world.query(Player)) {
		// 从 InstanceManager 获取实际的 ActionState 实例
		const state = instanceManager.getActionState(entity) as ActionState<PlayerAction> | undefined;
		if (!state) {
			continue;
		}

		// 使用包装函数安全地调用 ActionState 方法
		// 处理跳跃
		if (isJustPressed(state, PlayerAction.Jump)) {
			print(`${player.name} jumped!`);
		}
		if (isJustReleased(state, PlayerAction.Jump)) {
			print(`${player.name} stopped jumping`);
		}

		// 处理射击
		if (isJustPressed(state, PlayerAction.Shoot)) {
			print(`${player.name} started shooting!`);
		}
		if (isJustReleased(state, PlayerAction.Shoot)) {
			print(`${player.name} stopped shooting`);
		}
	}
}

/**
 * 主函数
 * 创建应用并设置输入管理系统
 */
export function main(): App {
	const app = App.create();
	globalApp = app; // 保存 App 实例以供系统使用

	// 添加默认插件组
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加 InputManagerPlugin - 像 Rust 版本一样简洁
	app.addPlugin(
		new InputManagerPlugin<PlayerAction>({
			actionType: PlayerAction as unknown as new () => PlayerAction,
		}),
	);

	// 添加系统 - 不再需要包装器
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);
	app.addSystems(MainScheduleLabel.UPDATE, handlePlayerActions);

	return app;
}

// 运行应用
main().run();