/**
 * Minimal Input Manager 调试测试
 * 用于诊断空格键输入没有响应的问题
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
	InputManagerPlugin,
	InputMapComponent,
	ActionStateComponent,
	InputEnabled,
	LocalPlayer,
} from "../../../leafwing-input-manager";
import { getInputInstanceManager } from "../../../leafwing-input-manager/plugin/context-helpers";
import { component, type World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { Context } from "../../../bevy_ecs";

// 复制 Action 类定义
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

const Player = component<{}>("Player");

export = () => {
	describe("Minimal Input Manager Debug", () => {
		let testApp: App;
		let debugWorld: World;
		let debugContext: Context;

		beforeEach(() => {
			print("\n=== 开始新的测试用例 ===");
		});

		afterEach(() => {
			if (testApp) {
				// 清理资源
				print("=== 测试用例结束 ===\n");
			}
		});

		it("should create InputMap and ActionState correctly", () => {
			print("[TEST] 测试 InputMap 和 ActionState 创建");

			// 1. 创建 InputMap
			const inputMap = new InputMap<Action>();
			inputMap.insert(Action.Jump, KeyCode.Space);
			print(`[TEST] InputMap 创建成功: ${typeOf(inputMap)}`);
			print(`[TEST] InputMap 有 insert 方法: ${"insert" in (inputMap as unknown as Record<string, unknown>)}`);

			// 2. 创建 ActionState
			const actionState = new ActionState<Action>();
			actionState.registerAction(Action.Jump);
			print(`[TEST] ActionState 创建成功: ${typeOf(actionState)}`);
			print(`[TEST] ActionState 有 justPressed 方法: ${"justPressed" in (actionState as unknown as Record<string, unknown>)}`);

			// 3. 检查初始状态
			const initialPressed = actionState.pressed(Action.Jump);
			const initialJustPressed = actionState.justPressed(Action.Jump);
			print(`[TEST] 初始状态 - pressed: ${initialPressed}, justPressed: ${initialJustPressed}`);

			expect(inputMap).to.be.ok();
			expect(actionState).to.be.ok();
			expect(initialPressed).to.equal(false);
			expect(initialJustPressed).to.equal(false);
		});

		it("should setup InputManagerPlugin correctly", () => {
			print("[TEST] 测试 InputManagerPlugin 设置");

			// 创建 App 并添加必要的插件
			testApp = App.create()
				.addPlugin(new InputManagerPlugin<Action>({
					actionType: Action,
				}));

			print("[TEST] InputManagerPlugin 添加成功");

			// 检查 App 是否正确设置
			expect(testApp).to.be.ok();
		});

		it("should spawn player with correct components", () => {
			print("[TEST] 测试玩家实体生成");

			// 模拟客户端环境（如果在服务端测试需要特殊处理）
			const originalIsServer = () => RunService.IsServer();
			(RunService as { IsServer: () => boolean }).IsServer = () => false;

			try {
				// 创建完整的 App
				testApp = App.create()
					.addPlugins(...DefaultPlugins.create().build().getPlugins())
					.addPlugin(new InputManagerPlugin<Action>({
						actionType: Action,
					}))
					.addSystems(MainScheduleLabel.STARTUP, (world: World, context: Context) => {
						debugWorld = world;
						debugContext = context;

						print("[TEST] STARTUP 系统执行");

						// 创建输入映射
						const inputMap = new InputMap<Action>();
						inputMap.insert(Action.Jump, KeyCode.Space);

						// 创建动作状态
						const actionState = new ActionState<Action>();
						actionState.registerAction(Action.Jump);

						print("[TEST] 生成玩家实体");
						const entity = world.spawn(
							Player({}),
							InputMapComponent({} as InputMap<Actionlike>),
							ActionStateComponent({} as ActionState<Actionlike>),
							InputEnabled({ enabled: true }),
							LocalPlayer({ playerId: 1 }),
						);

						// 手动注册实例
						const instanceManager = getInputInstanceManager(context, Action);
						if (instanceManager) {
							instanceManager.registerInputMap(entity, inputMap);
							instanceManager.registerActionState(entity, actionState);
							print(`[TEST] ✅ 已注册实例到 entity ${entity}`);
						} else {
							print("[TEST] ❌ 无法获取 InputInstanceManager");
						}
					});

				// 运行一个 tick 来执行 STARTUP 系统
				print("[TEST] 执行 App 的 STARTUP 阶段");
				testApp.update();

				// 检查实体是否正确创建
				if (debugWorld) {
					let playerCount = 0;
					for (const [entity, player, inputMap, actionState, inputEnabled] of debugWorld.query(Player, InputMapComponent, ActionStateComponent, InputEnabled)) {
						playerCount++;
						print(`[TEST] 找到玩家实体 ${entity}, InputEnabled: ${inputEnabled.enabled}`);

						// 检查 InstanceManager 中的注册
						const instanceManager = getInputInstanceManager(debugContext, Action);
						if (instanceManager) {
							const registeredInputMap = instanceManager.getInputMap(entity);
							const registeredActionState = instanceManager.getActionState(entity);
							print(`[TEST] 实例注册状态 - InputMap: ${registeredInputMap !== undefined}, ActionState: ${registeredActionState !== undefined}`);

							if (registeredActionState) {
								const hasJumpAction = registeredActionState.getActionByHash(Action.Jump.hash());
								print(`[TEST] ActionState 包含 Jump 动作: ${hasJumpAction !== undefined}`);
							}
						}
					}
					print(`[TEST] 总共找到 ${playerCount} 个玩家实体`);
					expect(playerCount).to.equal(1);
				}

			} finally {
				// 恢复原始方法
				(RunService as { IsServer: () => boolean }).IsServer = originalIsServer;
			}
		});

		it("should simulate input processing", () => {
			print("[TEST] 测试输入处理模拟");

			// 先确保已经设置了 testApp 和 debugWorld
			if (!testApp || !debugWorld || !debugContext) {
				// 重新创建 App
				const originalIsServer = () => RunService.IsServer();
				(RunService as { IsServer: () => boolean }).IsServer = () => false;

				try {
					testApp = App.create()
						.addPlugins(...DefaultPlugins.create().build().getPlugins())
						.addPlugin(new InputManagerPlugin<Action>({
							actionType: Action,
						}))
						.addSystems(MainScheduleLabel.STARTUP, (world: World, context: Context) => {
							debugWorld = world;
							debugContext = context;

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
							if (instanceManager) {
								instanceManager.registerInputMap(entity, inputMap);
								instanceManager.registerActionState(entity, actionState);
								print(`[TEST] 重新注册实例到 entity ${entity}`);
							}
						});

					// 执行 STARTUP
					testApp.update();
				} finally {
					(RunService as { IsServer: () => boolean }).IsServer = originalIsServer;
				}
			}

			// 现在测试输入处理
			const instanceManager = getInputInstanceManager(debugContext, Action);
			expect(instanceManager).to.be.ok();

			// 找到玩家实体
			for (const [entity, player] of debugWorld.query(Player)) {
				const actionState = instanceManager!.getActionState(entity);
				expect(actionState).to.be.ok();

				print("[TEST] 模拟按下空格键");

				// 检查初始状态
				const initialPressed = actionState!.pressed(Action.Jump);
				const initialJustPressed = actionState!.justPressed(Action.Jump);
				print(`[TEST] 按键前状态 - pressed: ${initialPressed}, justPressed: ${initialJustPressed}`);

				// 这里我们需要深入了解 ActionState 的内部机制
				// 检查 ActionState 的内部状态
				const actionStateRecord = actionState as unknown as Record<string, unknown>;
				const keys = Object.keys(actionStateRecord);
				print(`[TEST] ActionState 内部属性: ${keys.join(", ")}`);

				// 尝试手动触发状态更新
				// 注意：这需要了解 ActionState 的内部实现
				break; // 只测试第一个玩家
			}
		});
	});
};