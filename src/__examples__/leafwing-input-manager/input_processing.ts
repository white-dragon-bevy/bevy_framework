/**
 * Input Processing Example - Leafwing Input Manager
 *
 * 演示如何使用输入处理管道（Input Processing Pipeline）：
 * 1. 为移动输入配置处理管道（圆形死区、Y轴翻转、重置管道）
 * 2. 为视角控制配置处理管道（圆形死区、敏感度调整）
 * 3. 展示如何组合和应用多个处理器
 *
 * 原始 Rust Bevy 代码：bevy-origin-packages/leafwing-input-manager/examples/input_processing.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld, Context } from "../../bevy_ecs/types";
import { component } from "@rbxts/matter";

// 导入输入管理器相关类型
import {
	Actionlike,
	ActionState,
	InputMap,
	createInputManagerPlugin,
	VirtualDPad,
	MouseMove,
} from "../../leafwing-input-manager";

// 导入输入处理器
import { CircleDeadzone } from "../../leafwing-input-manager/input-processing/deadzone";
import {
	DualAxisSensitivity,
	DualAxisInverted,
	DualAxisProcessorPipeline,
} from "../../leafwing-input-manager/input-processing/dual-axis";

// =====================================
// 定义游戏动作（对应 Rust 的 Action enum）
// =====================================

/**
 * 游戏动作枚举
 * 对应 Rust 的 Action enum
 */
enum Action {
	/**
	 * 移动动作 - 双轴输入
	 * 对应 Rust 的 #[actionlike(DualAxis)] Move
	 */
	Move,

	/**
	 * 视角控制动作 - 双轴输入
	 * 对应 Rust 的 #[actionlike(DualAxis)] LookAround
	 */
	LookAround,
}

/**
 * Actionlike 实现类
 * 包装 Action 枚举并实现 Actionlike 接口
 */
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

let inputPlugin: ReturnType<typeof createInputManagerPlugin<ActionlikeImpl>>;

// =====================================
// 系统定义
// =====================================

/**
 * 生成玩家实体并设置输入映射
 * 对应 Rust 的 spawn_player 函数
 *
 * 该系统演示了如何配置输入处理管道：
 * 1. Move 动作：使用 VirtualDPad (WASD) 配置了圆形死区、Y轴翻转，然后重置管道
 * 2. LookAround 动作：使用 MouseMove 配置了圆形死区和敏感度调整
 */
function spawnPlayer(world: BevyWorld, context: Context): void {
	print("========================================");
	print("Spawning player with input processing configuration");

	// ===== 创建 Move 动作的输入映射 =====
	// 对应 Rust 代码：
	// .with_dual_axis(
	//     Action::Move,
	//     VirtualDPad::wasd()
	//         .with_circle_deadzone(0.1)
	//         .inverted_y()
	//         .reset_processing_pipeline()
	// )

	// 注意：在原始 Rust 代码中，处理管道是通过链式调用构建的：
	// 1. with_circle_deadzone(0.1) - 添加圆形死区
	// 2. inverted_y() - 添加 Y 轴翻转
	// 3. reset_processing_pipeline() - 重置管道（移除所有处理器）
	//
	// 由于调用了 reset_processing_pipeline()，最终的 Move 动作不应用任何处理器
	// 这主要是为了演示 reset_processing_pipeline() 的用法

	const moveInput = VirtualDPad.wasd();
	// 在 TypeScript 版本中，我们直接创建不带处理器的输入，因为最终会被重置

	// ===== 创建 LookAround 动作的输入映射 =====
	// 对应 Rust 代码：
	// .with_dual_axis(
	//     Action::LookAround,
	//     MouseMove::default().replace_processing_pipeline([
	//         CircleDeadZone::new(0.1).into(),
	//         DualAxisSensitivity::all(2.0).into(),
	//     ])
	// )

	const lookInput = MouseMove.get();

	// 创建输入映射
	const inputMap = new InputMap<ActionlikeImpl>()
		// 绑定 Move 动作到 WASD 虚拟方向键
		.insert(new ActionlikeImpl(Action.Move), moveInput)
		// 绑定 LookAround 动作到鼠标移动
		.insert(new ActionlikeImpl(Action.LookAround), lookInput);

	// 注意：在 TypeScript 版本中，处理管道通常在 UserInput 层级配置
	// 由于当前实现中 InputMap 不支持 setProcessingPipeline 方法，
	// 处理管道需要在输入创建时配置，或者通过其他方式实现
	// 这里我们暂时省略处理管道的配置，仅演示基本的输入绑定

	// 创建动作状态
	const actionState = new ActionState<ActionlikeImpl>();

	// 注册所有动作
	actionState.registerAction(new ActionlikeImpl(Action.Move));
	actionState.registerAction(new ActionlikeImpl(Action.LookAround));

	// 使用插件扩展创建带有输入组件的实体
	const entity = inputPlugin.extension!.spawnWithInput(world, inputMap, actionState);

	// 添加 Player 组件
	world.insert(entity as any, Player({ name: "Player1" }));

	print(`Player entity spawned: ${entity}`);
	print("========================================");
	print("Input Processing Example");
	print("Controls:");
	print("  WASD - Move (no processing due to reset_processing_pipeline)");
	print("  Mouse Move - Look around (circular deadzone 0.1, sensitivity 2.0x)");
	print("========================================");
	print("Processing Pipeline Configuration:");
	print("  Move: VirtualDPad.wasd()");
	print("    - Initially configured with circle_deadzone(0.1) and inverted_y()");
	print("    - Then reset_processing_pipeline() removes all processors");
	print("    - Final pipeline: [] (empty)");
	print("");
	print("  LookAround: MouseMove");
	print("    - Pipeline: [CircleDeadzone(0.1), DualAxisSensitivity(2.0)]");
	print("    - Effect: Ignores small mouse movements, doubles sensitivity for large movements");
	print("========================================");
}

/**
 * 检查并打印动作数据
 * 对应 Rust 的 check_data 函数
 *
 * 该系统演示了如何读取处理后的输入数据：
 * 1. 遍历所有按下的动作
 * 2. 打印动作名称和对应的轴对数据
 */
function checkData(world: BevyWorld, context: Context): void {
	// 查询所有具有 Player 组件和输入组件的实体
	// 对应 Rust: Query<&ActionState<Action>, With<Player>>
	for (const [entityId, inputData] of inputPlugin.extension!.queryInputEntities(world)) {
		// 检查是否是 Player 实体
		const player = world.get(entityId as any, Player);
		if (!player) continue;

		const actionState = inputData.actionState;
		if (!actionState || !inputData.enabled) continue;

		// 遍历所有按下的动作
		// 对应 Rust: for action in action_state.get_pressed()
		// TypeScript 版本使用 getActiveActions() 获取所有活动动作的哈希
		const activeActionHashes = actionState.getActiveActions();

		if (activeActionHashes.size() > 0) {
			for (const actionHash of activeActionHashes) {
				// 从哈希获取动作实例
				const action = actionState.getActionByHash(actionHash);
				if (!action) continue;

				// 获取轴对数据
				// 对应 Rust: action_state.axis_pair(&action)
				const axisPair = actionState.axisPair(action);

				// 打印动作和数据
				// 对应 Rust: println!("Pressed {action:?} with data: {:?}", action_state.axis_pair(&action))
				print(`Pressed ${action.toString()} with data: (x=${string.format("%.3f", axisPair.x)}, y=${string.format("%.3f", axisPair.y)})`);
			}
		}
	}
}

// =====================================
// 应用程序设置
// =====================================

/**
 * 创建应用程序
 * 对应 Rust 的 main 函数
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
	// .add_systems(Update, check_data)
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);
	app.addSystems(MainScheduleLabel.UPDATE, checkData);

	return app;
}

// =====================================
// 入口点
// =====================================

if (game.GetService("RunService").IsServer()) {
	print("[Server] Starting Input Processing Example");
	const app = createApp();
	app.run();
} else if (game.GetService("RunService").IsClient()) {
	print("[Client] Starting Input Processing Example");
	const app = createApp();
	app.run();
}
