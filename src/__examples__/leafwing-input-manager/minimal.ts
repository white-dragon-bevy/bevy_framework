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
	print("🎯 [spawnPlayer] STARTUP 系统开始执行");
	print(`🎯 [spawnPlayer] 运行环境 - IsServer: ${RunService.IsServer()}, IsClient: ${RunService.IsClient()}`);

	// 服务端不需要处理本地输入
	if (RunService.IsServer()) {
		print("🎯 [spawnPlayer] 服务端环境，跳过输入处理");
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

	// 调试：检查创建的实例
	print(`[spawnPlayer] InputMap type: ${typeOf(inputMap)}, has insert: ${"insert" in (inputMap as unknown as Record<string, unknown>)}`);
	print(`[spawnPlayer] ActionState type: ${typeOf(actionState)}, has justPressed: ${"justPressed" in (actionState as unknown as Record<string, unknown>)}`);
	print(`[spawnPlayer] InputMap is valid: ${inputMap !== undefined}`);
	print(`[spawnPlayer] ActionState is valid: ${actionState !== undefined}`);

	// 生成玩家实体 - 使用占位符，真实实例通过 InstanceManager 管理
	const entity = world.spawn(
		Player({}),
		InputMapComponent({} as InputMap<Actionlike>), // 占位符
		ActionStateComponent({} as ActionState<Actionlike>), // 占位符
		InputEnabled({ enabled: true }),
		LocalPlayer({ playerId: 1 }),
	);

	// 手动注册实例到 InstanceManager
	const instanceManager = getInputInstanceManager(context, Action);
	if (instanceManager) {
		instanceManager.registerInputMap(entity, inputMap);
		instanceManager.registerActionState(entity, actionState);
		print(`[spawnPlayer] ✅ Manually registered instances for entity ${entity}`);

		// 🔥 验证注册是否成功
		const verifyInputMap = instanceManager.getInputMap(entity);
		const verifyActionState = instanceManager.getActionState(entity);
		print(`[spawnPlayer] 🔍 验证注册 - InputMap: ${verifyInputMap !== undefined}, ActionState: ${verifyActionState !== undefined}`);

		if (verifyActionState) {
			const jumpAction = verifyActionState.getActionByHash(Action.Jump.hash());
			print(`[spawnPlayer] 🔍 Jump 动作已注册: ${jumpAction !== undefined}`);

			// 测试初始状态
			const initialPressed = verifyActionState.pressed(Action.Jump);
			const initialJustPressed = verifyActionState.justPressed(Action.Jump);
			print(`[spawnPlayer] 🔍 初始状态 - pressed: ${initialPressed}, justPressed: ${initialJustPressed}`);
		}

		// 🔥 检查 InstanceManager 的内部状态
		const managerRecord = instanceManager as unknown as Record<string, unknown>;
		print(`[spawnPlayer] 🔍 InstanceManager 属性: ${Object.keys(managerRecord).join(", ")}`);

	} else {
		print(`[spawnPlayer] ❌ Could not get InputInstanceManager`);
	}

	print("========================================");
	print("Minimal Input Manager Example");
	print("Controls:");
	print("  Space - Jump");
	print("========================================");
}

/**
 * 调试系统 - 检查实例注册状态
 */
function debugInstanceRegistration(world: World, context: Context): void {
	if (RunService.IsServer()) {
		return;
	}

	// 每10秒打印一次基本状态
	if (tick() % 600 === 0) {
		print("🔍 [debugInstanceRegistration] POST_UPDATE 系统运行中");
	}

	const instanceManager = getInputInstanceManager(context, Action);
	if (!instanceManager) {
		print("[debug] ERROR: Could not get InputInstanceManager");
		return;
	}

	// 检查 InputManagerPlugin.updateActionState 使用的查询条件
	print("[debug] === Checking entities with InputMapComponent + ActionStateComponent ===");
	let foundWithoutInputEnabled = 0;
	for (const [entity, inputMap, actionState] of world.query(InputMapComponent, ActionStateComponent)) {
		foundWithoutInputEnabled++;
		print(`[debug] Entity ${entity}: Found in updateActionState query`);
		
		// 检查组件内容
		print(`[debug] Entity ${entity}: InputMap type=${typeOf(inputMap)}, ActionState type=${typeOf(actionState)}`);
		
		// 检查是否是真实的实例
		const isRealInputMap = inputMap && typeOf(inputMap) === "table" && "insert" in (inputMap as unknown as Record<string, unknown>);
		const isRealActionState = actionState && typeOf(actionState) === "table" && "justPressed" in (actionState as unknown as Record<string, unknown>);
		print(`[debug] Entity ${entity}: RealInputMap=${isRealInputMap}, RealActionState=${isRealActionState}`);
		
		// 更详细的调试信息
		if (inputMap && typeOf(inputMap) === "table") {
			const inputMapRecord = inputMap as unknown as Record<string, unknown>;
			const keys = Object.keys(inputMapRecord);
			print(`[debug] Entity ${entity}: InputMap keys: ${keys.size() > 0 ? keys.join(", ") : "EMPTY"}`);
		} else {
			print(`[debug] Entity ${entity}: InputMap is nil or not a table`);
		}
		
		if (actionState && typeOf(actionState) === "table") {
			const actionStateRecord = actionState as unknown as Record<string, unknown>;
			const keys = Object.keys(actionStateRecord);
			print(`[debug] Entity ${entity}: ActionState keys: ${keys.size() > 0 ? keys.join(", ") : "EMPTY"}`);
		} else {
			print(`[debug] Entity ${entity}: ActionState is nil or not a table`);
		}
	}
	print(`[debug] Total entities found by updateActionState query: ${foundWithoutInputEnabled}`);

	// 检查我们调试系统使用的查询条件
	print("[debug] === Checking entities with full components ===");
	for (const [entity, inputMap, actionState, inputEnabled] of world.query(InputMapComponent, ActionStateComponent, InputEnabled)) {
		print(`[debug] Entity ${entity}: InputEnabled=${inputEnabled.enabled}`);
		
		const registeredInputMap = instanceManager.getInputMap(entity);
		const registeredActionState = instanceManager.getActionState(entity);
		
		print(`[debug] Entity ${entity}: RegisteredInputMap=${registeredInputMap !== undefined}, RegisteredActionState=${registeredActionState !== undefined}`);
		
		if (registeredActionState) {
			// 检查 ActionState 是否有注册的动作
			const hasJumpAction = registeredActionState.getActionByHash(Action.Jump.hash());
			print(`[debug] Entity ${entity}: HasJumpAction=${hasJumpAction !== undefined}`);
			
			if (hasJumpAction) {
				const isPressed = registeredActionState.pressed(Action.Jump);
				const justPressed = registeredActionState.justPressed(Action.Jump);
				print(`[debug] Entity ${entity}: Jump - pressed=${isPressed}, justPressed=${justPressed}`);
			}
		}
	}
}

/**
 * 跳跃系统 - 对应 Rust 版本的 jump 函数
 * 在游戏逻辑系统中查询 ActionState 组件！
 */
function jump2(world: World, context: Context): void {
	// 服务端不处理本地输入
	if (RunService.IsServer()) {
		return;
	}

	// 防抖：只在特定时刻打印调试信息
	const currentTick = tick();
	const shouldLogDebug = currentTick % 60 === 0; // 每60帧（约1秒）打印一次

	// 每10秒打印一次基本状态
	if (currentTick % 600 === 0) {
		print("⚡ [jump2] UPDATE 系统运行中");
	}

	// 获取实例管理器
	const instanceManager = getInputInstanceManager(context, Action);
	if (!instanceManager) {
		if (shouldLogDebug) {
			print("[jump] ❌ 无法获取 InputInstanceManager");
		}
		return;
	}

	let totalPlayerEntities = 0;
	let entitiesWithRegisteredState = 0;

	// 查询带有 Player 组件的实体
	for (const [entity, player, inputMap, actionState, inputEnabled] of world.query(Player, InputMapComponent, ActionStateComponent, InputEnabled)) {
		totalPlayerEntities++;

		// 从实例管理器获取真实的 ActionState 实例
		const registeredActionState = instanceManager.getActionState(entity);
		if (!registeredActionState) {
			if (shouldLogDebug) {
				print(`[jump] ❌ Entity ${entity} 没有注册的 ActionState`);
			}
			continue;
		}

		entitiesWithRegisteredState++;

		// 详细调试 ActionState 状态
		const directPressed = registeredActionState.pressed(Action.Jump);
		const directJustPressed = registeredActionState.justPressed(Action.Jump);
		const directJustReleased = registeredActionState.justReleased(Action.Jump);
		const wrapperJustPressed = isJustPressed(registeredActionState, Action.Jump);

		// 🔥 关键调试：检查 InputManager 的更新状态
		const inputManagerRecord = instanceManager as unknown as Record<string, unknown>;
		if (shouldLogDebug) {
			print(`[jump] InputManager 属性: ${Object.keys(inputManagerRecord).join(", ")}`);
		}

		// 🔥 检查 UserInputService 状态
		const UserInputService = game.GetService("UserInputService");
		const keysPressed = UserInputService.GetKeysPressed();
		const spacePressed = keysPressed.some(key => key.KeyCode === Enum.KeyCode.Space);

		if (shouldLogDebug) {
			print(`[jump] Roblox UserInputService - Space pressed: ${spacePressed}`);
			print(`[jump] Total keys pressed: ${keysPressed.size()}`);
		}

		// 🔥 检查 ActionState 的内部状态
		const actionStateRecord = registeredActionState as unknown as Record<string, unknown>;
		if (shouldLogDebug) {
			print(`[jump] ActionState 内部属性: ${Object.keys(actionStateRecord).join(", ")}`);
		}

		// 任何输入状态变化都要打印
		if (directPressed || directJustPressed || directJustReleased || wrapperJustPressed || spacePressed) {
			print(`[jump] 🎯 输入检测 - Roblox Space: ${spacePressed}, ActionState pressed: ${directPressed}, justPressed: ${directJustPressed}, justReleased: ${directJustReleased}`);
			print(`[jump] 🎯 Wrapper justPressed: ${wrapperJustPressed}`);
		}

		// 每秒显示系统运行状态
		if (shouldLogDebug) {
			print(`[jump] 📊 系统状态 - 实体: ${entity}, 输入启用: ${inputEnabled.enabled}`);
			print(`[jump] 📊 ActionState 状态 - pressed: ${directPressed}, justPressed: ${directJustPressed}`);
		}

		// 检查任何输入状态变化
		if (directJustPressed || wrapperJustPressed) {
			print(`🚀 I'm jumping! (direct: ${directJustPressed}, wrapper: ${wrapperJustPressed})`);
		}

		if (directJustReleased) {
			print(`⬇️ Jump released! (direct: ${directJustReleased})`);
		}

		// 🔥 检查 Roblox 原生输入但 ActionState 没响应的情况
		if (spacePressed && !directPressed && !directJustPressed) {
			print(`🚨 警告：Roblox 检测到空格键但 ActionState 没有响应！`);
		}
	}

	// 防抖的总体调试信息
	if (shouldLogDebug) {
		print(`[jump] 📈 总览 - 玩家实体: ${totalPlayerEntities}, 有注册状态: ${entitiesWithRegisteredState}`);
	}
}

/**
 * 主函数 - 对应 Rust 版本的 main 函数
 */
export function main(): App {
	print("🚀 [main] 开始创建 App");

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
		// 添加调试系统来检查实例注册状态 - 在 POST_UPDATE 确保在 updateActionState 之后运行
		.addSystems(MainScheduleLabel.POST_UPDATE, debugInstanceRegistration)
		// 使用查询在你的系统中读取 ActionState！
		.addClientSystems(MainScheduleLabel.UPDATE, jump2);

	print("🚀 [main] App 创建完成，准备运行");
	return app;
}

// 创建并运行应用
print("🎬 [main] 开始运行应用");
const app = main();
print("🎬 [main] 调用 app.run()");
app.run();
print("🎬 [main] app.run() 执行完毕");