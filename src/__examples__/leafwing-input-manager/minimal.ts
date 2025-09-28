/**
 * 最小化的 Leafwing Input Manager 示例
 * 标准的用户示范，展示如何正确使用 InputMap 和 ActionState
 * 对应 Rust leafwing-input-manager 的 minimal.rs 示例
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
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
import { getInputInstanceManager } from "../../leafwing-input-manager/plugin/context-helpers";
import { component, type World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { Context } from "../../bevy_ecs";

/**
 * 简单动作枚举 - 对应 Rust 版本的 Action enum
 * 这是游戏中所有可能动作的列表
 */
class Action implements Actionlike {
	static readonly Jump = new Action("Jump", InputControlKind.Button);

	// 添加类名属性供 InputManager 使用
	static readonly name = "Action";

	constructor(
		private readonly actionName: string,
		private readonly controlKind: InputControlKind,
	) {}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}

	hash(): string {
		return `Action_${this.actionName}`;
	}

	equals(other: Actionlike): boolean {
		return other instanceof Action && other.actionName === this.actionName;
	}

	toString(): string {
		return this.actionName;
	}
}

/**
 * Player组件 - 对应 Rust 版本的 Player struct
 */
const Player = component<{}>("Player");

/**
 * 生成玩家实体 - 对应 Rust 版本的 spawn_player 函数
 * 描述如何将玩家输入转换为游戏动作
 */
function spawnPlayer(world: World, context: Context): void {
	// 服务端不需要处理本地输入
	if (RunService.IsServer()) {
		return;
	}

	// 检查是否已存在玩家
	for (const [_entity, _player] of world.query(Player)) {
		return;
	}

	// 创建输入映射 - 对应 Rust 版本的 InputMap::new([(Action::Jump, KeyCode::Space)])
	const inputMap = new InputMap<Action>();
	inputMap.insert(Action.Jump, KeyCode.Space);

	// 创建动作状态
	const actionState = new ActionState<Action>();
	actionState.registerAction(Action.Jump);

	// 生成玩家实体 - 使用实际的实例而不是空占位符
	world.spawn(
		Player({}),
		InputMapComponent(inputMap as InputMap<Actionlike>),
		ActionStateComponent(actionState as ActionState<Actionlike>),
		InputEnabled({ enabled: true }),
		LocalPlayer({ playerId: 1 }),
	);

	print("========================================");
	print("Minimal Input Manager Example");
	print("Controls:");
	print("  Space - Jump");
	print("========================================");
}

/**
 * 跳跃系统 - 对应 Rust 版本的 jump 函数
 * 在游戏逻辑系统中查询 ActionState 组件！
 */
function jump(world: World, context: Context): void {
	// 服务端不处理本地输入
	if (RunService.IsServer()) {
		return;
	}

	// 获取实例管理器
	const instanceManager = getInputInstanceManager(context, Action);
	if (!instanceManager) {
		print("[jump] ERROR: Could not get InputInstanceManager");
		return;
	}

	// 查询带有 Player 组件的实体
	let foundEntities = 0;
	for (const [entity, player] of world.query(Player, InputMapComponent, ActionStateComponent)) {
		foundEntities++;
		print(`[jump] Found player entity ${entity}`);
		
		// 从实例管理器获取真实的 ActionState 实例
		const actionState = instanceManager.getActionState(entity);
		if (!actionState) {
			print(`[jump] ERROR: No ActionState for entity ${entity}`);
			continue;
		}

		print(`[jump] Got ActionState for entity ${entity}`);

		// 每个动作都有自己的类似按钮的状态，你可以检查
		if (isJustPressed(actionState, Action.Jump)) {
			print("I'm jumping!");
		}
	}

	if (foundEntities === 0) {
		print("[jump] WARNING: No player entities found");
	}
}

/**
 * 主函数 - 对应 Rust 版本的 main 函数
 */
export function main(): App {
	const app = App.create()
		// 添加默认插件
		.addPlugins(...DefaultPlugins.create().build().getPlugins())
		// 这个插件将输入映射到与输入类型无关的动作状态
		// 我们需要为它提供一个枚举，该枚举存储玩家可能采取的所有可能动作
		.addPlugin(new InputManagerPlugin<Action>({
			actionType: Action,
		}))
		// InputMap 和 ActionState 组件将被添加到任何具有 Player 组件的实体
		.addSystems(MainScheduleLabel.STARTUP, spawnPlayer)
		// 使用查询在你的系统中读取 ActionState！
		.addSystems(MainScheduleLabel.UPDATE, jump);

	return app;
}

// 创建并运行应用
const app = main();
app.run();