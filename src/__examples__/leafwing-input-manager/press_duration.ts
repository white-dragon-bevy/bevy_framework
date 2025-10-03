/**
 * Press Duration Example - 按键持续时间示例
 *
 * 展示如何检测按键持续时间并将其用于游戏逻辑
 * 按住左右方向键或 A/D 键，松开时根据按住时间长度施加速度
 *
 * 对应源文件: bevy-origin-packages/leafwing-input-manager/examples/press_duration.rs
 */

import { App } from "../../bevy_app/app";
import { MainScheduleLabel } from "../../bevy_app/main-schedule";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld } from "../../bevy_ecs/types";
import { component } from "@rbxts/matter";

// 导入输入管理器相关类型
import {
	createInputManagerPlugin,
	InputMap,
	ActionState,
	KeyCode,
	ActionlikeEnum,
	InputControlKind,
} from "../../leafwing-input-manager";

// =====================================
// 定义动作枚举
// =====================================

/**
 * 玩家可以执行的动作
 * 对应 Rust 的 Action enum
 */
class Action extends ActionlikeEnum {
	static readonly Left = new Action("Left");
	static readonly Right = new Action("Right");

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
 * 速度组件
 * 对应 Rust 的 Velocity component
 */
const Velocity = component<{
	x: number;
}>("Velocity");

/**
 * Player 组件标记
 * 对应 Rust 的 Player component
 */
const Player = component<{
	readonly tag: "Player";
}>("Player");

// =====================================
// 系统定义
// =====================================

/**
 * 生成玩家实体
 * 对应 Rust 的 spawn_player 函数
 *
 * @param world - ECS 世界
 */
function spawnPlayer(world: BevyWorld): void {
	// 获取插件组件工厂
	const components = inputPlugin.extension!.getComponents();

	// 创建输入映射 - 将动作绑定到具体按键
	// 对应 Rust: InputMap::new([
	//   (Left, KeyCode::KeyA), (Left, KeyCode::ArrowLeft),
	//   (Right, KeyCode::KeyD), (Right, KeyCode::ArrowRight)
	// ])
	const inputMap = new InputMap<Action>();
	inputMap.insert(Action.Left, KeyCode.from(Enum.KeyCode.A));
	inputMap.insert(Action.Left, KeyCode.from(Enum.KeyCode.Left));
	inputMap.insert(Action.Right, KeyCode.from(Enum.KeyCode.D));
	inputMap.insert(Action.Right, KeyCode.from(Enum.KeyCode.Right));

	// 创建动作状态
	const actionState = new ActionState<Action>();
	actionState.registerAction(Action.Left);
	actionState.registerAction(Action.Right);

	// 生成实体并添加组件
	const entity = world.spawn();
	components.insert(world, entity, inputMap, actionState);
	world.insert(entity as any, Player({ tag: "Player" }));
	world.insert(entity as any, Velocity({ x: 0.0 }));

	print("========================================");
	print("Press Duration Example - Player Spawned");
	print("Controls:");
	print("  Left / A - Move Left (hold to charge)");
	print("  Right / D - Move Right (hold to charge)");
	print("  Release to dash with accumulated speed!");
	print("========================================");
}

/**
 * 蓄力冲刺系统 - 按住时间越长，释放时速度越快
 * 对应 Rust 的 hold_dash 函数
 *
 * @param world - ECS 世界
 */
function holdDash(world: BevyWorld): void {
	const VELOCITY_RATIO = 1000.0;

	// 获取插件组件工厂
	const components = inputPlugin.extension!.getComponents();

	// 查询所有具有 Player、ActionState 和 Velocity 的实体
	for (const [entityId, inputData] of components.query(world)) {
		// 检查是否是玩家实体
		const player = world.get(entityId as any, Player);
		const velocityData = world.get(entityId as any, Velocity);

		if (!player || !inputData.actionState || !velocityData) {
			continue;
		}

		// 检查左方向键是否刚释放
		// 对应 Rust: if action_state.just_released(&Action::Left)
		if (inputData.actionState.justReleased(Action.Left)) {
			// 向左加速，速度基于按住时长
			// 对应 Rust: velocity.x -= VELOCITY_RATIO * action_state.previous_duration(&Action::Left).as_secs_f32()
			const duration = inputData.actionState.getPreviousDuration(Action.Left);
			const newVelocityX = velocityData.x - VELOCITY_RATIO * duration;

			world.insert(entityId as any, Velocity({ x: newVelocityX }));

			print(`Dashing left with velocity: ${newVelocityX} (held for ${duration}s)`);
		}

		// 检查右方向键是否刚释放
		// 对应 Rust: if action_state.just_released(&Action::Right)
		if (inputData.actionState.justReleased(Action.Right)) {
			// 向右加速，速度基于按住时长
			// 对应 Rust: velocity.x += VELOCITY_RATIO * action_state.previous_duration(&Action::Right).as_secs_f32()
			const duration = inputData.actionState.getPreviousDuration(Action.Right);
			const newVelocityX = velocityData.x + VELOCITY_RATIO * duration;

			world.insert(entityId as any, Velocity({ x: newVelocityX }));

			print(`Dashing right with velocity: ${newVelocityX} (held for ${duration}s)`);
		}
	}
}

/**
 * 更新时间追踪
 * 在每帧开始时更新时间，供其他系统使用
 *
 * @param world - ECS 世界
 */
function updateTime(world: BevyWorld): void {
	const currentTime = os.clock();
	deltaTime = currentTime - lastUpdateTime;
	lastUpdateTime = currentTime;
}

/**
 * 应用速度到位置
 * 对应 Rust 的 apply_velocity 函数
 *
 * @param world - ECS 世界
 */
function applyVelocity(world: BevyWorld): void {
	// 查询所有具有 Velocity 的实体
	for (const [entityId, velocityData] of world.query(Velocity)) {
		// 模拟位置更新（在 Roblox 中通常会更新 Part 的 Position）
		// 对应 Rust: transform.translation.x += velocity.x * time.delta_secs()
		// 注意：这里只是示例，实际应用中需要有一个 Transform/Part 组件

		// 如果速度不为零，打印移动信息
		if (math.abs(velocityData.x) > 0.01) {
			const displacement = velocityData.x * deltaTime;
			// print(`Entity ${entityId} moving by ${displacement} units`)
		}
	}
}

/**
 * 阻力系统 - 逐渐减速
 * 对应 Rust 的 drag 函数
 *
 * @param world - ECS 世界
 */
function drag(world: BevyWorld): void {
	const DRAG_COEFFICIENT = 0.8;

	// 查询所有具有 Velocity 的实体
	for (const [entityId, velocityData] of world.query(Velocity)) {
		// 根据速度大小施加阻力，方向与速度相反
		// 对应 Rust: velocity.x -= DRAG_COEFFICIENT * velocity.x * time.delta_secs()
		const dragForce = DRAG_COEFFICIENT * velocityData.x * deltaTime;
		const newVelocityX = velocityData.x - dragForce;

		world.insert(entityId as any, Velocity({ x: newVelocityX }));
	}
}

/**
 * 墙壁碰撞检测
 * 对应 Rust 的 wall_collisions 函数
 *
 * @param world - ECS 世界
 */
function wallCollisions(world: BevyWorld): void {
	// 在 Roblox 中，我们使用屏幕边界或游戏区域边界
	// 对应 Rust 的窗口宽度，这里使用固定值作为示例
	const WINDOW_WIDTH = 1920; // 示例窗口宽度
	const leftSide = 0 - WINDOW_WIDTH / 2;
	const rightSide = 0 + WINDOW_WIDTH / 2;

	// 查询所有具有 Velocity 的实体
	// 注意：实际应用中需要 Transform 或 Part 组件来获取位置
	for (const [entityId, velocityData] of world.query(Velocity)) {
		// 模拟碰撞检测
		// 对应 Rust:
		// if (transform.translation.x < left_side) | (transform.translation.x > right_side) {
		//     velocity.x *= -1.0;
		// }

		// 这里我们简化处理：当速度超过某个阈值时反弹
		// 实际应用中需要检查实际位置
		const MAX_VELOCITY = 500;
		if (math.abs(velocityData.x) > MAX_VELOCITY) {
			const newVelocityX = velocityData.x * -1.0;
			world.insert(entityId as any, Velocity({ x: newVelocityX }));
			print(`Wall collision! Velocity reversed: ${newVelocityX}`);
		}
	}
}

// =====================================
// 应用程序设置
// =====================================

// 保存插件实例供系统使用
let inputPlugin: ReturnType<typeof createInputManagerPlugin<Action>>;

// 时间追踪变量
let lastUpdateTime = os.clock();
let deltaTime = 0;

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
	inputPlugin = createInputManagerPlugin<Action>({
		actionTypeName: "Action",
	});
	app.addPlugin(inputPlugin);

	// 添加启动系统
	// 对应 Rust: .add_systems(Startup, spawn_player)
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);

	// 添加更新系统
	// 对应 Rust:
	// .add_systems(Update, hold_dash)
	// .add_systems(Update, apply_velocity)
	// .add_systems(Update, drag)
	// .add_systems(Update, wall_collisions)
	app.addSystems(MainScheduleLabel.UPDATE, updateTime, holdDash, applyVelocity, drag, wallCollisions);

	return app;
}

// =====================================
// 入口点
// =====================================

const RunService = game.GetService("RunService");

if (RunService.IsServer()) {
	print("[Server] Starting Press Duration Example");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] Starting Press Duration Example");
	const app = createApp();
	app.run();
}
