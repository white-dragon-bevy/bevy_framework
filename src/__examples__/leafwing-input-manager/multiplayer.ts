/**
 * Multiplayer Example - 多人游戏输入管理示例
 *
 * 展示如何为多个玩家设置独立的输入映射
 * 核心功能：
 * - 定义玩家特定的输入映射
 * - 每个玩家使用不同的键盘按键
 * - 支持多个手柄输入
 * - 查询和处理每个玩家的动作状态
 *
 * 对应源文件: bevy-origin-packages/leafwing-input-manager/examples/multiplayer.rs
 */

import { App } from "../../bevy_app/app";
import { MainScheduleLabel } from "../../bevy_app/main-schedule";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld } from "../../bevy_ecs";
import { component } from "@rbxts/matter";

// 导入输入管理器相关类型
import {
	InputManagerPlugin,
	InputMap,
	ActionState,
	KeyCode,
	ActionlikeEnum,
	InputControlKind,
	GamepadButton,
} from "../../leafwing-input-manager";

// =====================================
// 定义动作枚举
// =====================================

/**
 * 游戏中可以执行的动作列表
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

// =====================================
// 定义组件
// =====================================

/**
 * 玩家枚举
 * 对应 Rust 的 Player enum
 */
enum PlayerType {
	One = "One",
	Two = "Two",
}

/**
 * Player 组件
 * 对应 Rust 的 #[derive(Component)] enum Player
 */
const Player = component<{
	readonly playerType: PlayerType;
}>("Player");

// =====================================
// 输入映射创建函数
// =====================================

/**
 * 为指定玩家创建输入映射
 * 对应 Rust 的 Player::input_map 方法
 *
 * @param playerType - 玩家类型（玩家一或玩家二）
 * @param gamepad0 - 第一个手柄的实体ID（可选）
 * @param gamepad1 - 第二个手柄的实体ID（可选）
 * @returns 配置好的输入映射
 */
function createPlayerInputMap(
	playerType: PlayerType,
	gamepad0?: number,
	gamepad1?: number,
): InputMap<Action> {
	let inputMap: InputMap<Action>;

	// 根据玩家类型创建不同的键盘映射
	if (playerType === PlayerType.One) {
		// 玩家一: WASD 控制
		inputMap = new InputMap<Action>(gamepad0);
		inputMap.insert(Action.Left, KeyCode.from(Enum.KeyCode.A));
		inputMap.insert(Action.Right, KeyCode.from(Enum.KeyCode.D));
		inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.W));
	} else {
		// 玩家二: 方向键控制
		inputMap = new InputMap<Action>(gamepad1);
		inputMap.insert(Action.Left, KeyCode.from(Enum.KeyCode.Left));
		inputMap.insert(Action.Right, KeyCode.from(Enum.KeyCode.Right));
		inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.Up));
	}

	// 添加通用的手柄控制
	// 每个玩家使用相同的手柄按钮，但是在不同的手柄上
	inputMap.insertMultiple(Action.Left, [GamepadButton.dPadLeft()]);
	inputMap.insertMultiple(Action.Right, [GamepadButton.dPadRight()]);
	inputMap.insertMultiple(Action.Jump, [
		GamepadButton.dPadUp(),
		GamepadButton.south(), // A/Cross 按钮
	]);

	return inputMap;
}

// =====================================
// 系统定义
// =====================================

/**
 * 生成玩家实体并设置输入映射
 * 对应 Rust 的 spawn_players 函数
 *
 * @param world - ECS 世界
 */
function spawnPlayers(world: BevyWorld): void {
	// 获取插件组件工厂
	const components = inputPlugin.extension!.getComponents();

	// 创建手柄实体（简化实现，实际项目中应该使用 Gamepads 资源）
	// 对应 Rust: commands.spawn(()).id()
	const gamepad0Entity = world.spawn();
	const gamepad1Entity = world.spawn();

	// 创建玩家一
	{
		const inputMap = createPlayerInputMap(PlayerType.One, gamepad0Entity, gamepad1Entity);
		const actionState = new ActionState<Action>();
		actionState.registerAction(Action.Left);
		actionState.registerAction(Action.Right);
		actionState.registerAction(Action.Jump);

		const entity = world.spawn();
		components.insert(world, entity, inputMap, actionState);
		world.insert(entity as any, Player({ playerType: PlayerType.One }));
	}

	// 创建玩家二
	{
		const inputMap = createPlayerInputMap(PlayerType.Two, gamepad0Entity, gamepad1Entity);
		const actionState = new ActionState<Action>();
		actionState.registerAction(Action.Left);
		actionState.registerAction(Action.Right);
		actionState.registerAction(Action.Jump);

		const entity = world.spawn();
		components.insert(world, entity, inputMap, actionState);
		world.insert(entity as any, Player({ playerType: PlayerType.Two }));
	}

	print("========================================");
	print("Multiplayer Example - Players Spawned");
	print("");
	print("Player One Controls:");
	print("  A - Move Left");
	print("  D - Move Right");
	print("  W - Jump");
	print("");
	print("Player Two Controls:");
	print("  Left Arrow - Move Left");
	print("  Right Arrow - Move Right");
	print("  Up Arrow - Jump");
	print("");
	print("Both players can also use gamepad controls");
	print("========================================");
}

/**
 * 处理玩家移动
 * 对应 Rust 的 move_players 函数
 *
 * @param world - ECS 世界
 */
function movePlayers(world: BevyWorld): void {
	// 获取插件组件工厂
	const components = inputPlugin.extension!.getComponents();

	// 查询所有具有 Player 和 ActionState 的实体
	// 对应 Rust: player_query: Query<(&Player, &ActionState<Action>)>
	for (const [entityId, inputData] of components.query(world)) {
		// 检查是否是玩家实体
		const player = world.get(entityId as any, Player);

		if (!player || !inputData.actionState) {
			continue;
		}

		// 收集刚刚按下的动作
		// 对应 Rust: action_state.get_just_pressed()
		const justPressedActions: Array<string> = [];

		if (inputData.actionState.justPressed(Action.Left)) {
			justPressedActions.push("Left");
		}

		if (inputData.actionState.justPressed(Action.Right)) {
			justPressedActions.push("Right");
		}

		if (inputData.actionState.justPressed(Action.Jump)) {
			justPressedActions.push("Jump");
		}

		// 如果有动作被触发，打印日志
		// 对应 Rust: if !actions.is_empty()
		if (justPressedActions.size() > 0) {
			const actionsStr = justPressedActions.join(", ");
			print(`Player ${player.playerType} performed actions: ${actionsStr}`);
		}
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

	// 添加启动系统 - 生成玩家
	// 对应 Rust: .add_systems(Startup, spawn_players)
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayers);

	// 添加更新系统 - 处理玩家移动
	// 对应 Rust: .add_systems(Update, move_players)
	app.addSystems(MainScheduleLabel.UPDATE, movePlayers);

	return app;
}

// =====================================
// 入口点
// =====================================

const RunService = game.GetService("RunService");

if (RunService.IsServer()) {
	print("[Server] Starting Multiplayer Example");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] Starting Multiplayer Example");
	const app = createApp();
	app.run();
}
