/**
 * Minimal Example - 最小化输入管理示例
 *
 * 这是从 Rust Bevy 迁移的最简单的 leafwing-input-manager 示例
 * 展示核心功能：
 * - 定义动作枚举
 * - 创建输入映射
 * - 在系统中查询动作状态
 * - 检测按键触发
 *
 * 对应源文件: bevy-origin-packages/leafwing-input-manager/examples/minimal.rs
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
	InputManagerExtension,
} from "../../leafwing-input-manager";

// =====================================
// 定义动作枚举
// =====================================

/**
 * 游戏中可以执行的动作列表
 * 对应 Rust 的 Action enum
 */
class Action extends ActionlikeEnum {
	static readonly Run = new Action("Run");
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
 * Player 组件标记
 * 对应 Rust 的 #[derive(Component)] struct Player
 */
const Player = component<{
	readonly tag: "Player";
}>("Player");

// =====================================
// 系统定义
// =====================================

/**
 * 生成玩家实体并设置输入映射
 * 对应 Rust 的 spawn_player 函数
 *
 * @param world - ECS 世界
 */
function spawnPlayer(world: BevyWorld): void {
	// 获取插件组件工厂
	const components = world.resources.getResource<InputManagerExtension<Action>>()!.getComponents();

	// 创建输入映射 - 将动作绑定到具体按键
	// 对应 Rust: InputMap::new([(Action::Jump, KeyCode::Space)])
	const inputMap = new InputMap<Action>();
	inputMap.insert(Action.Jump, KeyCode.from(Enum.KeyCode.Space));

	// 创建动作状态
	const actionState = new ActionState<Action>();
	actionState.registerAction(Action.Jump);

	// 生成实体并添加组件
	// 对应 Rust: commands.spawn(input_map).insert(Player)
	const entity = world.spawn();
	components.insert(world, entity, inputMap, actionState);
	world.insert(entity as any, Player({ tag: "Player" }));

	print("========================================");
	print("Minimal Example - Player Spawned");
	print("Controls:");
	print("  Space - Jump");
	print("========================================");
}

/**
 * 检测跳跃动作
 * 对应 Rust 的 jump 函数
 *
 * @param world - ECS 世界
 */
function jump(world: BevyWorld): void {
	// 获取插件组件工厂
	const components = world.resources.getResource<InputManagerExtension<Action>>()!.getComponents();

	// 查询所有具有 Player 和 ActionState 的实体
	// 对应 Rust: action_state: Single<&ActionState<Action>, With<Player>>
	for (const [entityId, inputData] of components.query(world)) {
		// 检查是否是玩家实体
		const player = world.get(entityId as any, Player);

		if (!player || !inputData.actionState) {
			continue;
		}

		// 检查跳跃动作是否刚被按下
		// 对应 Rust: if action_state.just_pressed(&Action::Jump)
		if (inputData.actionState.justPressed(Action.Jump)) {
			print("I'm jumping!");
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
	// 对应 Rust: .add_systems(Startup, spawn_player)
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);

	// 添加更新系统 - 处理跳跃
	// 对应 Rust: .add_systems(Update, jump)
	app.addSystems(MainScheduleLabel.UPDATE, jump);

	return app;
}

// =====================================
// 入口点
// =====================================

const RunService = game.GetService("RunService");

if (RunService.IsServer()) {
	print("[Server] Starting Minimal Example");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] Starting Minimal Example");
	const app = createApp();
	app.run();
}
