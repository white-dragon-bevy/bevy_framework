/**
 * Single Player Example - 单人游戏输入管理示例
 *
 * 这是从 Rust Bevy 迁移的 leafwing-input-manager 单人游戏示例
 * 展示核心功能：
 * - 定义 ARPG 风格的动作枚举
 * - 创建复杂的输入映射（键盘、手柄、鼠标）
 * - 实现多个输入处理系统
 * - 使用消息系统传递玩家移动事件
 *
 * 对应源文件: bevy-origin-packages/leafwing-input-manager/examples/single_player.rs
 */

import { App } from "../../bevy_app/app";
import { MainScheduleLabel } from "../../bevy_app/main-schedule";
import { DefaultPlugins } from "../../bevy_internal";
import { BevyWorld } from "../../bevy_ecs";
import { component } from "@rbxts/matter";
import { MessageReader, MessageWriter } from "../../bevy_ecs/message";

// 导入输入管理器相关类型
import {
	InputManagerPlugin,
	InputMap,
	ActionState,
	KeyCode,
	ActionlikeEnum,
	InputControlKind,
	MouseButton,
	InputManagerExtension,
} from "../../leafwing-input-manager";

// =====================================
// 定义动作枚举
// =====================================

/**
 * ARPG 游戏中可以执行的动作列表
 * 对应 Rust 的 ArpgAction enum
 */
class ArpgAction extends ActionlikeEnum {
	// Movement (移动)
	static readonly Up = new ArpgAction("Up");
	static readonly Down = new ArpgAction("Down");
	static readonly Left = new ArpgAction("Left");
	static readonly Right = new ArpgAction("Right");

	// Abilities (技能)
	static readonly Ability1 = new ArpgAction("Ability1");
	static readonly Ability2 = new ArpgAction("Ability2");
	static readonly Ability3 = new ArpgAction("Ability3");
	static readonly Ability4 = new ArpgAction("Ability4");
	static readonly Ultimate = new ArpgAction("Ultimate");

	// 方向列表 - 对应 Rust 的 DIRECTIONS 常量
	static readonly DIRECTIONS = [
		ArpgAction.Up,
		ArpgAction.Down,
		ArpgAction.Left,
		ArpgAction.Right,
	] as const;

	private constructor(value: string) {
		super(value);
	}

	/**
	 * 获取动作对应的方向向量
	 * 对应 Rust 的 direction 方法
	 *
	 * @returns 方向向量，如果动作不是方向则返回 undefined
	 */
	getDirection(): Vector2 | undefined {
		if (this === ArpgAction.Up) {
			return new Vector2(0, 1);
		}
		if (this === ArpgAction.Down) {
			return new Vector2(0, -1);
		}
		if (this === ArpgAction.Left) {
			return new Vector2(-1, 0);
		}
		if (this === ArpgAction.Right) {
			return new Vector2(1, 0);
		}
		return undefined;
	}

	hash(): string {
		return `ArpgAction:${this.value}`;
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
 * 对应 Rust 的 #[derive(Component)] pub struct Player
 */
const Player = component<{
	readonly tag: "Player";
}>("Player");

// =====================================
// 消息定义
// =====================================

/**
 * 玩家行走消息
 * 对应 Rust 的 PlayerWalk 消息
 */
interface PlayerWalk {
	readonly direction: Vector2;
}

// =====================================
// 辅助函数
// =====================================

/**
 * 创建默认输入映射
 * 对应 Rust 的 Player::default_input_map
 *
 * @returns 默认输入映射
 */
function createDefaultInputMap(): InputMap<ArpgAction> {
	const inputMap = new InputMap<ArpgAction>();

	// Movement - 使用箭头键
	// 对应 Rust: input_map.insert(Up, KeyCode::ArrowUp)
	inputMap.insert(ArpgAction.Up, KeyCode.from(Enum.KeyCode.Up));
	inputMap.insert(ArpgAction.Down, KeyCode.from(Enum.KeyCode.Down));
	inputMap.insert(ArpgAction.Left, KeyCode.from(Enum.KeyCode.Left));
	inputMap.insert(ArpgAction.Right, KeyCode.from(Enum.KeyCode.Right));

	// Abilities - 键盘按键和鼠标按键
	// 对应 Rust: input_map.insert(Ability1, KeyCode::KeyQ)
	inputMap.insert(ArpgAction.Ability1, KeyCode.from(Enum.KeyCode.Q));
	inputMap.insert(ArpgAction.Ability1, MouseButton.left());

	inputMap.insert(ArpgAction.Ability2, KeyCode.from(Enum.KeyCode.W));
	inputMap.insert(ArpgAction.Ability2, MouseButton.right());

	inputMap.insert(ArpgAction.Ability3, KeyCode.from(Enum.KeyCode.E));

	inputMap.insert(ArpgAction.Ability4, KeyCode.from(Enum.KeyCode.Space));

	inputMap.insert(ArpgAction.Ultimate, KeyCode.from(Enum.KeyCode.R));

	return inputMap;
}

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
	const extension = world.resources.getResource<InputManagerExtension<ArpgAction>>()!;
	const components = extension.getComponents();

	// 创建输入映射
	const inputMap = createDefaultInputMap();

	// 创建动作状态
	const actionState = new ActionState<ArpgAction>();
	// 注册所有动作
	actionState.registerAction(ArpgAction.Up);
	actionState.registerAction(ArpgAction.Down);
	actionState.registerAction(ArpgAction.Left);
	actionState.registerAction(ArpgAction.Right);
	actionState.registerAction(ArpgAction.Ability1);
	actionState.registerAction(ArpgAction.Ability2);
	actionState.registerAction(ArpgAction.Ability3);
	actionState.registerAction(ArpgAction.Ability4);
	actionState.registerAction(ArpgAction.Ultimate);

	// 生成实体并添加组件
	// 对应 Rust: commands.spawn((Player, Player::default_input_map()))
	const entity = world.spawn();
	components.insert(world, entity, inputMap, actionState);
	world.insert(entity as any, Player({ tag: "Player" }));

	print("========================================");
	print("Single Player Example - Player Spawned");
	print("Controls:");
	print("  Arrow Keys - Move");
	print("  Q / Left Mouse - Ability1 (Fireball)");
	print("  W / Right Mouse - Ability2");
	print("  E - Ability3");
	print("  Space - Ability4 (Dash)");
	print("  R - Ultimate");
	print("========================================");
}

/**
 * 检测释放火球技能
 * 对应 Rust 的 cast_fireball 函数
 *
 * @param world - ECS 世界
 */
function castFireball(world: BevyWorld): void {
	// 获取插件组件工厂
		const extension = world.resources.getResource<InputManagerExtension<ArpgAction>>()!;
	const components = extension.getComponents();

	// 查询所有具有 Player 和 ActionState 的实体
	// 对应 Rust: action_state: Single<&ActionState<ArpgAction>, With<Player>>
	for (const [entityId, inputData] of components.query(world)) {
		// 检查是否是玩家实体
		const player = world.get(entityId as any, Player);

		if (!player || !inputData.actionState) {
			continue;
		}

		// 检查 Ability1 是否刚被按下
		// 对应 Rust: if action_state.just_pressed(&ArpgAction::Ability1)
		if (inputData.actionState.justPressed(ArpgAction.Ability1)) {
			print("Fwoosh!");
		}
	}
}

/**
 * 玩家冲刺系统
 * 对应 Rust 的 player_dash 函数
 *
 * @param world - ECS 世界
 */
function playerDash(world: BevyWorld): void {
	// 获取插件组件工厂
	const extension = world.resources.getResource<InputManagerExtension<ArpgAction>>()!;
	const components = extension.getComponents();

	// 查询所有具有 Player 和 ActionState 的实体
	for (const [entityId, inputData] of components.query(world)) {
		// 检查是否是玩家实体
		const player = world.get(entityId as any, Player);

		if (!player || !inputData.actionState) {
			continue;
		}

		// 检查 Ability4 是否刚被按下
		// 对应 Rust: if action_state.just_pressed(&ArpgAction::Ability4)
		if (inputData.actionState.justPressed(ArpgAction.Ability4)) {
			let directionVector = new Vector2(0, 0);

			// 累加所有按下的方向键
			// 对应 Rust: for input_direction in ArpgAction::DIRECTIONS
			for (const inputDirection of ArpgAction.DIRECTIONS) {
				if (inputData.actionState.pressed(inputDirection)) {
					const direction = inputDirection.getDirection();
					if (direction) {
						directionVector = directionVector.add(direction);
					}
				}
			}

			// 归一化方向向量
			// 对应 Rust: let net_direction = Dir2::new(direction_vector)
			if (directionVector.Magnitude > 0) {
				const normalizedDirection = directionVector.Unit;
				print(`Dashing in direction: (${normalizedDirection.X}, ${normalizedDirection.Y})`);
			}
		}
	}
}

/**
 * 玩家行走系统（发送消息）
 * 对应 Rust 的 player_walks 函数
 *
 * @param world - ECS 世界
 */
function playerWalks(world: BevyWorld): void {
	// 获取插件组件工厂
	const extension = world.resources.getResource<InputManagerExtension<ArpgAction>>()!;
	const components = extension.getComponents();

	// 创建消息写入器
	// 对应 Rust: message_writer: MessageWriter<PlayerWalk>
	const messageWriter = new MessageWriter<PlayerWalk>(world.messages.getOrCreateMessages<PlayerWalk>());

	// 查询所有具有 Player 和 ActionState 的实体
	for (const [entityId, inputData] of components.query(world)) {
		// 检查是否是玩家实体
		const player = world.get(entityId as any, Player);

		if (!player || !inputData.actionState) {
			continue;
		}

		let directionVector = new Vector2(0, 0);

		// 累加所有按下的方向键
		for (const inputDirection of ArpgAction.DIRECTIONS) {
			if (inputData.actionState.pressed(inputDirection)) {
				const direction = inputDirection.getDirection();
				if (direction) {
					directionVector = directionVector.add(direction);
				}
			}
		}

		// 如果有移动方向，发送消息
		// 对应 Rust: if let Ok(direction) = net_direction
		if (directionVector.Magnitude > 0) {
			const normalizedDirection = directionVector.Unit;
			// 对应 Rust: message_writer.write(PlayerWalk { direction })
			messageWriter.write({
				direction: normalizedDirection,
			});
		}
	}
}

// =====================================
// 应用程序设置
// =====================================

// 保存插件实例供系统使用
let inputPlugin: ReturnType<typeof InputManagerPlugin.create<ArpgAction>>;

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
	// 对应 Rust: .add_plugins(InputManagerPlugin::<ArpgAction>::default())
	inputPlugin = InputManagerPlugin.create<ArpgAction>({
		
	});
	app.addPlugin(inputPlugin);

	// 添加消息类型
	// 对应 Rust: .add_message::<PlayerWalk>()
	app.addMessage<PlayerWalk>();

	// 添加启动系统 - 生成玩家
	// 对应 Rust: .add_systems(Startup, spawn_player)
	app.addSystems(MainScheduleLabel.STARTUP, spawnPlayer);

	// 添加更新系统
	// 对应 Rust: .add_systems(Update, cast_fireball)
	app.addSystems(MainScheduleLabel.UPDATE, castFireball);

	// 对应 Rust: .add_systems(Update, player_dash)
	app.addSystems(MainScheduleLabel.UPDATE, playerDash);

	// 对应 Rust: .add_systems(Update, player_walks)
	app.addSystems(MainScheduleLabel.UPDATE, playerWalks);

	return app;
}

// =====================================
// 入口点
// =====================================

const RunService = game.GetService("RunService");

if (RunService.IsServer()) {
	print("[Server] Starting Single Player Example");
	const app = createApp();
	app.run();
} else if (RunService.IsClient()) {
	print("[Client] Starting Single Player Example");
	const app = createApp();
	app.run();
}
