/**
 * Virtual D-Pad Example - Leafwing Input Manager
 *
 * 演示如何使用虚拟方向键（VirtualDPad）：
 * 1. 使用 VirtualDPad 组合多个按键创建一个虚拟双轴输入
 * 2. 结合键盘和手柄按键实现混合输入
 * 3. 双轴输入返回离散的 -1.0、0.0 或 1.0 值
 *
 * 原始 Rust Bevy 代码：bevy-origin-packages/leafwing-input-manager/examples/virtual_dpad.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import type { BevyWorld, Context } from "../../bevy_ecs/types";
import { component } from "@rbxts/matter";

// 导入输入管理器相关类型
import {
	Actionlike,
	ActionState,
	GamepadButton,
	InputMap,
	KeyCode,
	VirtualDPad,
	createInputManagerPlugin,
} from "../../leafwing-input-manager";

// =====================================
// 定义游戏动作（对应 Rust 的 Action enum）
// =====================================

enum Action {
	/**
	 * 移动动作 - 对应 Rust 的 #[actionlike(DualAxis)] Move
	 */
	Move,
}

class ActionlikeImpl implements Actionlike {
	constructor(public readonly action: Action) {}

	hash(): string {
		return `Action:${this.action}`;
	}

	equals(other: Actionlike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return Action[this.action];
	}
}

// =====================================
// 定义 Player 组件（对应 Rust 的 #[derive(Component)] Player）
// =====================================

const Player = component<{
	readonly tag: "Player";
}>("Player");

// =====================================
// 插件实例
// =====================================

let inputPlugin: ReturnType<typeof createInputManagerPlugin<ActionlikeImpl>>;

// =====================================
// 系统定义
// =====================================

/**
 * 生成玩家实体并设置输入映射
 *
 * 对应 Rust 的 spawn_player 函数
 *
 * @param world - ECS 世界
 * @param _context - 上下文（未使用）
 */
function spawnPlayer(world: BevyWorld, _context: Context): void {
	print("========================================");
	print("Spawning player with virtual D-pad configuration");

	// 创建虚拟方向键输入映射
	// 对应 Rust:
	// let input_map = InputMap::default().with_dual_axis(
	//     Action::Move,
	//     VirtualDPad::new(
	//         KeyCode::KeyW,
	//         KeyCode::KeyS,
	//         GamepadButton::DPadLeft,
	//         GamepadButton::DPadRight,
	//     ),
	// );
	const inputMap = new InputMap<ActionlikeImpl>().insert(
		new ActionlikeImpl(Action.Move),
		new VirtualDPad(
			KeyCode.from(Enum.KeyCode.W), // 上
			KeyCode.from(Enum.KeyCode.S), // 下
			GamepadButton.dPadLeft(), // 左
			GamepadButton.dPadRight(), // 右
		),
	);

	// 创建动作状态
	const actionState = new ActionState<ActionlikeImpl>();
	actionState.registerAction(new ActionlikeImpl(Action.Move));

	// 使用插件扩展创建带有输入组件的实体
	const entity = inputPlugin.extension!.spawnWithInput(world, inputMap, actionState);

	// 添加 Player 组件
	// 对应 Rust: commands.spawn(input_map).insert(Player)
	world.insert(entity as any, Player({ tag: "Player" }));

	print(`Player entity spawned: ${entity}`);
	print("========================================");
	print("Virtual D-Pad Example");
	print("Controls:");
	print("  W/S - Move Up/Down");
	print("  Gamepad D-Pad Left/Right - Move Left/Right");
	print("  Values will be -1.0, 0.0, or 1.0");
	print("========================================");
}

/**
 * 处理玩家移动输入并输出当前状态
 *
 * 对应 Rust 的 move_player 函数
 *
 * @param world - ECS 世界
 * @param _context - 上下文（未使用）
 */
function movePlayer(world: BevyWorld, _context: Context): void {
	// 查询所有具有 Player 组件和输入组件的实体
	// 对应 Rust: Query<&ActionState<Action>, With<Player>>
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		// 检查是否是 Player 实体
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) continue;

		// 获取移动轴向输入
		// 对应 Rust: if action_state.axis_pair(&Action::Move) != Vec2::ZERO
		const moveAction = new ActionlikeImpl(Action.Move);
		const axisPair = actionState.axisPair(moveAction);

		// Virtual D-Pad 返回的是离散值：-1.0、0.0 或 1.0
		// 对应 Rust:
		// println!("Move:");
		// println!("   distance: {}", axis_pair.length());
		// println!("          x: {}", axis_pair.x);
		// println!("          y: {}", axis_pair.y);
		if (axisPair.x !== 0 || axisPair.y !== 0) {
			const movementVector = new Vector2(axisPair.x, axisPair.y);
			const distance = movementVector.Magnitude;

			print("Move:");
			print(`   distance: ${string.format("%.1f", distance)}`);
			print(`          x: ${string.format("%.1f", axisPair.x)}`);
			print(`          y: ${string.format("%.1f", axisPair.y)}`);
		}
	}
}

// =====================================
// 应用程序设置
// =====================================

/**
 * 创建并配置应用程序
 *
 * 对应 Rust 的 main 函数
 *
 * @returns 配置好的 App 实例
 */
export function createApp(): App {
	const app = new App();

	// 添加默认插件组
	// 对应 Rust: .add_plugins(DefaultPlugins)
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 创建并添加 InputManagerPlugin
	// 对应 Rust: .add_plugins(InputManagerPlugin::<Action>::default())
	inputPlugin = createInputManagerPlugin<ActionlikeImpl>({
		actionTypeName: "Action",
	});

	app.addPlugin(inputPlugin);

	// 添加系统
	// 对应 Rust:
	// .add_systems(Startup, spawn_player)
	// .add_systems(Update, move_player)
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);
	app.addSystems(MainScheduleLabel.UPDATE, movePlayer);

	return app;
}

// =====================================
// 入口点
// =====================================

const RunService = game.GetService("RunService");

if (RunService.IsServer()) {
	print("[Server] Starting Virtual D-Pad Example");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] Starting Virtual D-Pad Example");
	const app = createApp();
	app.run();
}
