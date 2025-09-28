/**
 * 最小化 Leafwing Input Manager 示例的单元测试
 * 模拟输入交互流程，调试空格键无法获得交互打印的问题
 */

import { App } from "../../../bevy_app";
import { MainScheduleLabel } from "../../../bevy_app";
import { DefaultPlugins } from "../../../bevy_internal";
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
} from "../../../leafwing-input-manager";
import { getInputInstanceManager } from "../../../leafwing-input-manager/plugin/context-helpers";
import { component, type World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { Context } from "../../../bevy_ecs";
import { CentralInputStore } from "../../../leafwing-input-manager/user-input/central-input-store";

// 注意：在实际的 Roblox 环境中，RunService.IsServer() 会根据运行环境返回正确的值
// 测试环境默认为客户端模式

/**
 * 测试用的 Action 类 - 与 minimal.ts 保持一致
 */
class Action implements Actionlike {
	static readonly Jump = new Action("Jump", InputControlKind.Button);
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
 * Player 组件 - 与 minimal.ts 保持一致
 */
const Player = component<{}>("Player");

describe("Minimal Input Manager", () => {
	let app: App;
	let world: World;
	let context: Context;

	beforeEach(() => {
		print("=== Test Setup Starting ===");
		
		// 创建应用实例
		app = App.create()
			.addPlugins(...DefaultPlugins.create().build().getPlugins())
			.addPlugin(new InputManagerPlugin<Action>({
				actionType: Action,
			}));

		// 获取 world 和 context
		world = app.getWorld();
		context = app.getContext();

		print("=== Test Setup Complete ===");
	});

	afterEach(() => {
		// 清理
		if (app) {
			// app.cleanup(); // 如果有清理方法的话
		}
		print("=== Test Cleanup Complete ===");
	});

	it("应该能够创建玩家实体并注册输入映射", () => {
		print("=== Test: 创建玩家实体 ===");

		// 创建输入映射
		const inputMap = new InputMap<Action>();
		inputMap.insert(Action.Jump, KeyCode.Space);

		// 创建动作状态
		const actionState = new ActionState<Action>();
		actionState.registerAction(Action.Jump);

		print(`[Test] InputMap created: ${inputMap !== undefined}`);
		print(`[Test] ActionState created: ${actionState !== undefined}`);
		print(`[Test] KeyCode.Space hash: ${KeyCode.Space.hash()}`);
		print(`[Test] Action.Jump hash: ${Action.Jump.hash()}`);

		// 生成玩家实体
		const entity = world.spawn(
			Player({}),
			InputMapComponent({} as InputMap<Actionlike>), // 占位符
			ActionStateComponent({} as ActionState<Actionlike>), // 占位符
			InputEnabled({ enabled: true }),
			LocalPlayer({ playerId: 1 }),
		);

		print(`[Test] Player entity created: ${entity}`);

		// 手动注册实例到 InstanceManager
		const instanceManager = getInputInstanceManager(context, Action);
		expect(instanceManager).to.be.ok();

		if (instanceManager) {
			instanceManager.registerInputMap(entity, inputMap);
			instanceManager.registerActionState(entity, actionState);
			print(`[Test] ✅ Instances registered for entity ${entity}`);

			// 验证注册成功
			const registeredInputMap = instanceManager.getInputMap(entity);
			const registeredActionState = instanceManager.getActionState(entity);
			
			expect(registeredInputMap).to.be.ok();
			expect(registeredActionState).to.be.ok();
			print(`[Test] ✅ Registration verified - InputMap: ${registeredInputMap !== undefined}, ActionState: ${registeredActionState !== undefined}`);
		}
	});

	it("应该能够模拟键盘输入并触发动作状态", () => {
		print("=== Test: 模拟键盘输入 ===");

		// 首先创建玩家实体（复用上面的逻辑）
		const inputMap = new InputMap<Action>();
		inputMap.insert(Action.Jump, KeyCode.Space);

		const actionState = new ActionState<Action>();
		actionState.registerAction(Action.Jump);

		const entity = world.spawn(
			Player({}),
			InputMapComponent({} as InputMap<Actionlike>),
			ActionStateComponent({} as ActionState<Actionlike>),
			InputEnabled({ enabled: true }),
			LocalPlayer({ playerId: 1 }),
		);

		const instanceManager = getInputInstanceManager(context, Action);
		if (!instanceManager) {
			error("InstanceManager not found");
			return;
		}

		instanceManager.registerInputMap(entity, inputMap);
		instanceManager.registerActionState(entity, actionState);

		// 获取注册的实例
		const registeredActionState = instanceManager.getActionState(entity);
		const registeredInputMap = instanceManager.getInputMap(entity);
		
		if (!registeredActionState || !registeredInputMap) {
			error("Failed to get registered instances");
			return;
		}

		print(`[Test] Before input simulation - Jump pressed: ${registeredActionState.pressed(Action.Jump)}`);

		// 模拟中央输入存储
		const centralStore = new CentralInputStore();
		
		// 模拟按下空格键
		print("[Test] Simulating Space key press...");
		centralStore.simulateKeyPress(Enum.KeyCode.Space, true);

		// 验证 CentralInputStore 中的状态
		const spaceKeyHash = KeyCode.Space.hash();
		const isSpacePressed = centralStore.pressed(spaceKeyHash);
		print(`[Test] CentralInputStore Space pressed: ${isSpacePressed}`);
		expect(isSpacePressed).to.equal(true);

		// 处理输入映射
		const processedActions = registeredInputMap.processActions(centralStore);
		print(`[Test] Processed actions count: ${processedActions.actionData.size()}`);

		// 检查处理结果
		const jumpActionData = processedActions.actionData.get(Action.Jump.hash());
		if (jumpActionData) {
			print(`[Test] Jump action processed - pressed: ${jumpActionData.pressed}, justPressed: ${jumpActionData.justPressed}`);
		} else {
			print("[Test] ❌ Jump action not found in processed actions");
			// 打印所有处理的动作
			processedActions.actionData.forEach((data, hash) => {
				print(`[Test] Found action hash: ${hash}, pressed: ${data.pressed}`);
			});
		}

		// 手动更新 ActionState（模拟系统更新）
		if (jumpActionData?.justPressed) {
			registeredActionState.press(Action.Jump, jumpActionData.value);
			print("[Test] ✅ Manually pressed Jump action");
		}

		// 验证状态
		const isPressed = registeredActionState.pressed(Action.Jump);
		const justPressed = registeredActionState.justPressed(Action.Jump);
		
		print(`[Test] After processing - pressed: ${isPressed}, justPressed: ${justPressed}`);
		
		// 断言验证
		expect(isPressed).to.equal(true);
		expect(justPressed).to.equal(true);

		// 模拟下一帧 tick
		print("[Test] Simulating next frame tick...");
		registeredActionState.tick(1/60);

		const afterTick = registeredActionState.justPressed(Action.Jump);
		print(`[Test] After tick - justPressed: ${afterTick}`);
		expect(afterTick).to.equal(false); // tick 后 justPressed 应该变为 false
	});

	it("应该能够测试输入映射的键匹配", () => {
		print("=== Test: 输入映射键匹配 ===");

		// 创建输入映射和中央存储
		const inputMap = new InputMap<Action>();
		inputMap.insert(Action.Jump, KeyCode.Space);
		
		const centralStore = new CentralInputStore();
		
		// 打印关键哈希值进行比较
		const keyCodeHash = KeyCode.Space.hash();
		print(`[Test] KeyCode.Space hash: "${keyCodeHash}"`);
		
		// 模拟键盘输入
		centralStore.simulateKeyPress(Enum.KeyCode.Space, true);
		
		// 检查 CentralInputStore 中存储的键
		const storedValue = centralStore.getButtonValue(keyCodeHash);
		print(`[Test] Stored button value: ${storedValue ? `pressed=${storedValue.pressed}, value=${storedValue.value}` : "undefined"}`);
		
		// 处理输入映射
		const processedActions = inputMap.processActions(centralStore);
		
		// 检查是否找到匹配的动作
		const jumpHash = Action.Jump.hash();
		const jumpData = processedActions.actionData.get(jumpHash);
		
		print(`[Test] Action.Jump hash: "${jumpHash}"`);
		print(`[Test] Jump data found: ${jumpData !== undefined}`);
		
		if (jumpData) {
			print(`[Test] ✅ Jump data: pressed=${jumpData.pressed}, justPressed=${jumpData.justPressed}, value=${jumpData.value}`);
			expect(jumpData.pressed).to.equal(true);
		} else {
			print("[Test] ❌ Jump data not found - checking all processed actions:");
			processedActions.actionData.forEach((data, hash) => {
				print(`[Test] - Hash: "${hash}", pressed: ${data.pressed}`);
			});
		}
	});

	it("应该能够测试完整的输入处理管道", () => {
		print("=== Test: 完整输入处理管道 ===");

		// 运行应用的初始化系统
		print("[Test] Running startup systems...");
		
		// 手动执行 spawnPlayer 逻辑
		const inputMap = new InputMap<Action>();
		inputMap.insert(Action.Jump, KeyCode.Space);

		const actionState = new ActionState<Action>();
		actionState.registerAction(Action.Jump);

		const entity = world.spawn(
			Player({}),
			InputMapComponent({} as InputMap<Actionlike>),
			ActionStateComponent({} as ActionState<Actionlike>),
			InputEnabled({ enabled: true }),
			LocalPlayer({ playerId: 1 }),
		);

		const instanceManager = getInputInstanceManager(context, Action);
		if (!instanceManager) {
			error("InstanceManager not found");
			return;
		}

		instanceManager.registerInputMap(entity, inputMap);
		instanceManager.registerActionState(entity, actionState);

		print(`[Test] Setup complete - entity: ${entity}`);

		// 模拟输入系统更新
		const centralStore = new CentralInputStore();
		
		// 第一帧：按下空格键
		print("[Test] Frame 1: Press Space");
		centralStore.simulateKeyPress(Enum.KeyCode.Space, true);
		
		// 模拟 updateActionState 系统
		const registeredActionState = instanceManager.getActionState(entity);
		const registeredInputMap = instanceManager.getInputMap(entity);
		
		if (registeredActionState && registeredInputMap) {
			const processedActions = registeredInputMap.processActions(centralStore);
			
			processedActions.actionData.forEach((actionData, hash) => {
				const action = registeredActionState.getActionByHash(hash);
				if (action) {
					if (actionData.justPressed) {
						registeredActionState.press(action, actionData.value);
						print(`[Test] ✅ Action ${action.toString()} just pressed`);
					}
				}
			});

			// 模拟游戏逻辑系统检查
			const jumpPressed = registeredActionState.pressed(Action.Jump);
			const jumpJustPressed = registeredActionState.justPressed(Action.Jump);
			
			print(`[Test] Game logic check - pressed: ${jumpPressed}, justPressed: ${jumpJustPressed}`);
			
			if (jumpJustPressed) {
				print("[Test] 🎯 I'm jumping! (Test simulation successful)");
			}

			// 验证状态
			expect(jumpPressed).to.equal(true);
			expect(jumpJustPressed).to.equal(true);
		}

		// 第二帧：tick 系统
		print("[Test] Frame 2: Tick system");
		if (registeredActionState) {
			registeredActionState.tick(1/60);
			const afterTick = registeredActionState.justPressed(Action.Jump);
			print(`[Test] After tick - justPressed: ${afterTick}`);
			expect(afterTick).to.equal(false);
		}

		print("[Test] ✅ Complete pipeline test finished");
	});
});
