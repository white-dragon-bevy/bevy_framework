/**
 * Axis Inputs Example - Leafwing Input Manager
 *
 * 演示如何使用轴输入（Axis）和双轴输入（DualAxis）：
 * 1. 双轴输入（DualAxis）- 使用左摇杆控制移动
 * 2. 按钮输入 - 使用右扳机控制油门
 * 3. 单轴输入（Axis）- 使用右摇杆的X轴控制方向舵
 *
 * 原始 Rust Bevy 代码：bevy-origin-packages/leafwing-input-manager/examples/axis_inputs.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs";
import { component } from "@rbxts/matter";

// 导入输入管理器相关类型
import {
	Actionlike,
	ActionState,
	GamepadButton,
	GamepadControlAxis,
	GamepadStick,
	InputMap,
	InputManagerPlugin,
	InputManagerExtension,
} from "../../leafwing-input-manager";
import { CircleDeadzone } from "../../leafwing-input-manager/input-processing/deadzone";

// =====================================
// 定义游戏动作（对应 Rust 的 Action enum）
// =====================================

enum Action {
	/**
	 * 双轴移动动作 - 对应 Rust 的 #[actionlike(DualAxis)] Move
	 */
	Move,

	/**
	 * 油门动作 - 按钮输入但可以获取压力值
	 */
	Throttle,

	/**
	 * 方向舵动作 - 单轴输入，对应 Rust 的 #[actionlike(Axis)] Rudder
	 */
	Rudder,
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
	name: string;
}>("Player");

// =====================================
// 插件实例
// =====================================

let inputPlugin: ReturnType<typeof InputManagerPlugin.create<ActionlikeImpl>>;

// =====================================
// 系统定义
// =====================================

/**
 * 生成玩家实体并设置输入映射
 *
 * 对应 Rust 的 spawn_player 函数
 */
function spawnPlayer(world: BevyWorld, context: Context): void {
	print("========================================");
	print("Spawning player with axis input configuration");

	// 创建输入映射
	const inputMap = new InputMap<ActionlikeImpl>()
		// 绑定左摇杆到移动动作（双轴输入）
		// 对应 Rust: .with_dual_axis(Action::Move, GamepadStick::LEFT)
		.insert(new ActionlikeImpl(Action.Move), GamepadStick.left())
		// 绑定右扳机到油门动作（按钮输入，但可以获取压力值）
		// 对应 Rust: .with(Action::Throttle, GamepadButton::RightTrigger2)
		.insert(new ActionlikeImpl(Action.Throttle), GamepadButton.rightTrigger())
		// 绑定右摇杆X轴到方向舵动作（单轴输入，带死区）
		// 对应 Rust: .with_axis(Action::Rudder, GamepadControlAxis::RIGHT_X.with_deadzone_symmetric(0.1))
		.insert(new ActionlikeImpl(Action.Rudder), GamepadControlAxis.rightX());

	// 创建动作状态
	const actionState = new ActionState<ActionlikeImpl>();

	// 注册所有动作
	actionState.registerAction(new ActionlikeImpl(Action.Move));
	actionState.registerAction(new ActionlikeImpl(Action.Throttle));
	actionState.registerAction(new ActionlikeImpl(Action.Rudder));

	// 使用插件扩展创建带有输入组件的实体
	const entity = world.resources.getResource<InputManagerExtension<ActionlikeImpl>>()!.spawnWithInput(world, inputMap, actionState);

	// 添加 Player 组件
	world.insert(entity as any, Player({ name: "Player1" }));

	print(`Player entity spawned: ${entity}`);
	print("========================================");
	print("Axis Inputs Example");
	print("Controls:");
	print("  Left Stick - Move (dual-axis)");
	print("  Right Trigger - Throttle (pressure-sensitive button)");
	print("  Right Stick X - Rudder (single axis with deadzone)");
	print("========================================");
}

/**
 * 处理玩家输入并输出当前状态
 *
 * 对应 Rust 的 move_player 函数
 */
function movePlayer(world: BevyWorld, context: Context): void {
	// 查询所有具有 Player 组件和输入组件的实体
	// 对应 Rust: Query<&ActionState<Action>, With<Player>>
	for (const [entityId, inputData] of world.resources.getResource<InputManagerExtension<ActionlikeImpl>>()!.queryInputEntities(world)) {
		// 检查是否是 Player 实体
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) continue;

		// ===== 处理移动输入（双轴） =====
		// 对应 Rust: let axis_pair = action_state.clamped_axis_pair(&Action::Move);
		const moveAction = new ActionlikeImpl(Action.Move);
		const axisPair = actionState.axisPair(moveAction);

		// 计算移动距离（magnitude）
		const movementVector = new Vector2(axisPair.x, axisPair.y);
		const distance = movementVector.Magnitude;

		print("Move:");
		print(`   distance: ${string.format("%.3f", distance)}`);
		print(`          x: ${string.format("%.3f", axisPair.x)}`);
		print(`          y: ${string.format("%.3f", axisPair.y)}`);

		// ===== 处理油门输入（按钮但可获取压力值） =====
		// 对应 Rust:
		// if action_state.pressed(&Action::Throttle) {
		//     let value = action_state.clamped_button_value(&Action::Throttle);
		//     println!("Throttle: {value}");
		// }
		const throttleAction = new ActionlikeImpl(Action.Throttle);
		if (actionState.pressed(throttleAction)) {
			// 注意：某些手柄按钮支持压力感应，可以返回 0.0 到 1.0 的值
			// 如果手柄不支持压力感应，按下时返回 1.0，未按下时返回 0.0
			const throttleValue = actionState.buttonValue(throttleAction);
			print(`Throttle: ${string.format("%.3f", throttleValue)}`);
		}

		// ===== 处理方向舵输入（单轴） =====
		// 对应 Rust: let value = action_state.clamped_value(&Action::Rudder);
		const rudderAction = new ActionlikeImpl(Action.Rudder);
		const rudderValue = actionState.value(rudderAction);
		print(`Rudder: ${string.format("%.3f", rudderValue)}`);
	}
}

// =====================================
// 应用程序设置
// =====================================

export function createApp(): App {
	const app = new App();

	// 添加默认插件组
	// 对应 Rust: .add_plugins(DefaultPlugins)
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 创建并添加 InputManagerPlugin
	// 对应 Rust: .add_plugins(InputManagerPlugin::<Action>::default())
	inputPlugin = InputManagerPlugin.create<ActionlikeImpl>({
		
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

if (game.GetService("RunService").IsServer()) {
	print("[Server] Starting Axis Inputs Example");
	const app = createApp();
	app.run();
} else if (game.GetService("RunService").IsClient()) {
	print("[Client] Starting Axis Inputs Example");
	const app = createApp();
	app.run();
}
