/**
 * Register Gamepads Example - 本地多人游戏手柄注册示例
 *
 * 演示如何在本地多人游戏模式下注册游戏手柄：
 * - 玩家按下两个扳机键（L+R）加入游戏
 * - 每个玩家使用独立的游戏手柄
 * - 玩家可以跳跃和断开连接
 * - 使用 HashMap 追踪已加入的玩家
 *
 * 对应源文件: bevy-origin-packages/leafwing-input-manager/examples/register_gamepads.rs
 */

import { App } from "../../bevy_app/app";
import { MainScheduleLabel } from "../../bevy_app/main-schedule";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld } from "../../bevy_ecs";
import { component } from "@rbxts/matter";
import { UserInputService } from "@rbxts/services";

// 导入输入管理器相关类型
import {
	InputManagerPlugin,
	InputMap,
	ActionState,
	ActionlikeEnum,
	InputControlKind,
} from "../../leafwing-input-manager";

import { GamepadButton } from "../../leafwing-input-manager/user-input/gamepad";

// =====================================
// 定义动作枚举
// =====================================

/**
 * 游戏中可以执行的动作列表
 * 对应 Rust 的 Action enum
 */
class Action extends ActionlikeEnum {
	static readonly Jump = new Action("Jump");
	static readonly Disconnect = new Action("Disconnect");

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

// =====================================
// 资源定义
// =====================================

/**
 * 追踪已加入的玩家
 * 映射游戏手柄 ID 到玩家实体 ID
 * 对应 Rust 的 JoinedPlayers resource
 */
class JoinedPlayers {
	/**
	 * 游戏手柄 ID 到玩家实体的映射
	 * Key: 游戏手柄 UserInputType
	 * Value: 玩家实体 ID
	 */
	readonly players: Map<Enum.UserInputType, number>;

	constructor() {
		this.players = new Map();
	}

	/**
	 * 检查游戏手柄是否已加入
	 * @param gamepadId - 游戏手柄 ID
	 * @returns 是否已加入
	 */
	hasGamepad(gamepadId: Enum.UserInputType): boolean {
		return this.players.has(gamepadId);
	}

	/**
	 * 添加玩家
	 * @param gamepadId - 游戏手柄 ID
	 * @param entityId - 玩家实体 ID
	 */
	addPlayer(gamepadId: Enum.UserInputType, entityId: number): void {
		this.players.set(gamepadId, entityId);
	}

	/**
	 * 移除玩家
	 * @param gamepadId - 游戏手柄 ID
	 * @returns 被移除的玩家实体 ID
	 */
	removePlayer(gamepadId: Enum.UserInputType): number | undefined {
		const entityId = this.players.get(gamepadId);
		this.players.delete(gamepadId);
		return entityId;
	}

	/**
	 * 获取玩家实体 ID
	 * @param gamepadId - 游戏手柄 ID
	 * @returns 玩家实体 ID
	 */
	getPlayer(gamepadId: Enum.UserInputType): number | undefined {
		return this.players.get(gamepadId);
	}
}

// =====================================
// 定义组件
// =====================================

/**
 * Player 组件
 * 存储玩家关联的游戏手柄 ID
 * 对应 Rust 的 Player component
 */
const Player = component<{
	/**
	 * 玩家使用的游戏手柄 ID
	 */
	readonly gamepadId: Enum.UserInputType;
}>("Player");

// =====================================
// 系统定义
// =====================================

/**
 * 处理玩家加入游戏
 * 当玩家按下左右扳机键时加入游戏
 * 对应 Rust 的 join 函数
 *
 * @param world - ECS 世界
 */
function joinSystem(world: BevyWorld): void {
	// 获取已加入玩家的资源
	const joinedPlayers = world.resources.getResource<JoinedPlayers>();

	if (!joinedPlayers) {
		return;
	}

	// 获取插件组件工厂
	const components = inputPlugin.extension!.getComponents();

	// 检测所有可用的游戏手柄
	const connectedGamepads = UserInputService.GetConnectedGamepads();

	for (const gamepadId of connectedGamepads) {
		// 检查左右扳机是否同时按下
		const leftTriggerPressed = UserInputService.IsKeyDown(Enum.KeyCode.ButtonL2);
		const rightTriggerPressed = UserInputService.IsKeyDown(Enum.KeyCode.ButtonR2);

		if (leftTriggerPressed && rightTriggerPressed) {
			// 确保玩家不会重复加入
			if (!joinedPlayers.hasGamepad(gamepadId)) {
				print(`Player ${gamepadId.Name} has joined the game!`);

				// 创建输入映射
				// 对应 Rust: InputMap::new([(Action::Jump, GamepadButton::South), (Action::Disconnect, GamepadButton::Select)])
				const inputMap = new InputMap<Action>();
				inputMap.insert(Action.Jump, GamepadButton.south());
				inputMap.insert(Action.Disconnect, GamepadButton.select());

				// 创建动作状态
				const actionState = new ActionState<Action>();
				actionState.registerAction(Action.Jump);
				actionState.registerAction(Action.Disconnect);

				// 生成玩家实体
				// 对应 Rust: commands.spawn(input_map).insert(Player { gamepad: gamepad_entity })
				const entity = world.spawn();
				components.insert(world, entity, inputMap, actionState);
				world.insert(entity as any, Player({ gamepadId: gamepadId }));

				// 添加到已加入玩家列表
				joinedPlayers.addPlayer(gamepadId, entity);
			}
		}
	}
}

/**
 * 处理玩家跳跃动作
 * 对应 Rust 的 jump 函数
 *
 * @param world - ECS 世界
 */
function jumpSystem(world: BevyWorld): void {
	// 获取插件组件工厂
	const components = inputPlugin.extension!.getComponents();

	// 查询所有玩家实体
	// 对应 Rust: action_query: Query<(&ActionState<Action>, &Player)>
	for (const [entityId, inputData] of components.query(world)) {
		// 检查是否是玩家实体
		const playerData = world.get(entityId as any, Player);

		if (!playerData || !inputData.actionState) {
			continue;
		}

		// 检查跳跃动作是否刚被按下
		// 对应 Rust: if action_state.just_pressed(&Action::Jump)
		if (inputData.actionState.justPressed(Action.Jump)) {
			print(`Player ${playerData.gamepadId.Name} jumped!`);
		}
	}
}

/**
 * 处理玩家断开连接
 * 对应 Rust 的 disconnect 函数
 *
 * @param world - ECS 世界
 */
function disconnectSystem(world: BevyWorld): void {
	// 获取已加入玩家的资源
	const joinedPlayers = world.resources.getResource<JoinedPlayers>();

	if (!joinedPlayers) {
		return;
	}

	// 获取插件组件工厂
	const components = inputPlugin.extension!.getComponents();

	// 需要断开的玩家列表
	const toDisconnect: Array<{ entityId: number; gamepadId: Enum.UserInputType }> = [];

	// 查询所有玩家实体
	for (const [entityId, inputData] of components.query(world)) {
		const playerData = world.get(entityId as any, Player);

		if (!playerData || !inputData.actionState) {
			continue;
		}

		// 检查断开连接动作是否被按下
		// 对应 Rust: if action_state.pressed(&Action::Disconnect)
		if (inputData.actionState.pressed(Action.Disconnect)) {
			toDisconnect.push({ entityId: entityId, gamepadId: playerData.gamepadId });
		}
	}

	// 执行断开连接
	for (const { entityId, gamepadId } of toDisconnect) {
		// 从已加入玩家列表中移除
		// 对应 Rust: joined_players.0.remove(&player.gamepad)
		joinedPlayers.removePlayer(gamepadId);

		// 销毁实体
		// 对应 Rust: commands.entity(player_entity).despawn()
		world.despawn(entityId as any);

		print(`Player ${gamepadId.Name} has disconnected!`);
	}
}

// =====================================
// 应用程序设置
// =====================================

// 保存插件实例供系统使用
let inputPlugin: ReturnType<typeof InputManagerPlugin.create<Action>>;

/**
 * 创建并配置应用程序
 * 对应 Rust 的 main 函数
 *
 * @returns 配置好的 App 实例
 */
export function createApp(): App {
	const app = new App();

	// 添加默认插件组
	// 对应 Rust: .add_plugins(DefaultPlugins)
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 创建并添加输入管理器插件
	// 对应 Rust: .add_plugins(InputManagerPlugin::<Action>::default())
	inputPlugin = InputManagerPlugin.create<Action>({
		actionTypeName: "Action",
	});
	app.addPlugin(inputPlugin);

	// 初始化 JoinedPlayers 资源
	// 对应 Rust: .init_resource::<JoinedPlayers>()
	app.insertResource<JoinedPlayers>(new JoinedPlayers());

	// 添加更新系统
	// 对应 Rust: .add_systems(Update, (join, jump, disconnect))
	app.addSystems(MainScheduleLabel.UPDATE, joinSystem, jumpSystem, disconnectSystem);

	print("========================================");
	print("Register Gamepads Example - Started");
	print("Controls:");
	print("  L2 + R2 - Join game");
	print("  South Button (A/Cross) - Jump");
	print("  Select Button - Disconnect");
	print("========================================");

	return app;
}

// =====================================
// 入口点
// =====================================

const RunService = game.GetService("RunService");

if (RunService.IsServer()) {
	print("[Server] Starting Register Gamepads Example");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] Starting Register Gamepads Example");
	const app = createApp();
	app.run();
}
