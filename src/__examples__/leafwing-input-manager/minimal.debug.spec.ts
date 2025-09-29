/**
 * 调试测试用例 - 测试空格键输入是否触发跳跃动作
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
	InputManagerPlugin,
	InputMapComponent,
	ActionStateComponent,
	InputEnabled,
	LocalPlayer,
} from "../../leafwing-input-manager";
import { getInputInstanceManager } from "../../leafwing-input-manager/plugin/context-helpers";
import { InputInstanceManagerResource } from "../../leafwing-input-manager/plugin/input-instance-manager-resource";
import { CentralInputStore } from "../../leafwing-input-manager/user-input/central-input-store";
import { component, type World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { Context } from "../../bevy_ecs";

/**
 * 简单动作枚举
 */
class TestAction implements Actionlike {
	static readonly Jump = new TestAction("Jump", InputControlKind.Button);
	static readonly name = "TestAction";

	constructor(
		private readonly actionName: string,
		private readonly controlKind: InputControlKind,
	) {}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}

	hash(): string {
		return `TestAction_${this.actionName}`;
	}

	equals(other: Actionlike): boolean {
		return other instanceof TestAction && other.actionName === this.actionName;
	}

	toString(): string {
		return this.actionName;
	}
}

const Player = component<{}>("TestPlayer");

export = () => {
	let app: App;
	let playerEntity: number | undefined;
	let instanceManager: InputInstanceManagerResource<TestAction> | undefined;
	let centralInputStore: CentralInputStore | undefined;

	beforeEach(() => {
		print("=== 开始测试设置 ===");

		// 创建应用
		app = App.create()
			.addPlugins(...DefaultPlugins.create().build().getPlugins())
			.addPlugin(InputManagerPlugin.create({
				actionType: TestAction,
			}));

		// 应用会在创建时自动初始化
		print("✅ 应用创建完成");
	});

	afterEach(() => {
		if (app) {
			app.cleanup();
		}
		playerEntity = undefined;
		instanceManager = undefined;
		centralInputStore = undefined;
	});

	describe("空格键输入检测", () => {
		it("应该正确设置 InputInstanceManager", () => {
			const world = app.getWorld();
			const context = app.getContext();

			// 获取 InputInstanceManager
			instanceManager = getInputInstanceManager(context, TestAction);
			print(`📦 InputInstanceManager 存在: ${instanceManager !== undefined}`);
			expect(instanceManager).to.be.ok();

			// 获取 CentralInputStore
			centralInputStore = world.resources.getResource<CentralInputStore>();
			print(`📦 CentralInputStore 存在: ${centralInputStore !== undefined}`);
			expect(centralInputStore).to.be.ok();
		});

		it("应该正确创建玩家实体并注册输入", () => {
			const world = app.getWorld();
			const context = app.getContext();

			// 获取管理器
			instanceManager = getInputInstanceManager(context, TestAction);
			expect(instanceManager).to.be.ok();

			// 创建输入映射和动作状态
			const inputMap = new InputMap<TestAction>();
			inputMap.insert(TestAction.Jump, KeyCode.Space);

			const actionState = new ActionState<TestAction>();
			actionState.registerAction(TestAction.Jump);

			// 生成玩家实体
			playerEntity = world.spawn(
				Player({}),
				InputMapComponent({} as any),
				ActionStateComponent({} as any),
				InputEnabled({ enabled: true }),
				LocalPlayer({ playerId: 1 }),
			);

			print(`🎮 创建玩家实体: ${playerEntity}`);

			// 注册到 InstanceManager
			if (!instanceManager) {
				error("无法获取 InputInstanceManager");
			}
			instanceManager.registerInputMap(playerEntity, inputMap);
			instanceManager.registerActionState(playerEntity, actionState);

			// 验证注册
			const registeredInputMap = instanceManager.getInputMap(playerEntity);
			const registeredActionState = instanceManager.getActionState(playerEntity);

			print(`✅ InputMap 已注册: ${registeredInputMap !== undefined}`);
			print(`✅ ActionState 已注册: ${registeredActionState !== undefined}`);

			expect(registeredInputMap).to.be.ok();
			expect(registeredActionState).to.be.ok();

			// 验证动作已注册
			if (registeredActionState) {
				const jumpAction = registeredActionState.getActionByHash(TestAction.Jump.hash());
				print(`✅ Jump 动作已注册: ${jumpAction !== undefined}`);
				expect(jumpAction).to.be.ok();
			}
		});

		it("应该检测到模拟的空格键输入", () => {
			const world = app.getWorld();
			const context = app.getContext();

			// 设置玩家实体
			instanceManager = getInputInstanceManager(context, TestAction);
			centralInputStore = world.resources.getResource<CentralInputStore>();

			expect(instanceManager).to.be.ok();
			expect(centralInputStore).to.be.ok();

			// 创建玩家
			const inputMap = new InputMap<TestAction>();
			inputMap.insert(TestAction.Jump, KeyCode.Space);

			const actionState = new ActionState<TestAction>();
			actionState.registerAction(TestAction.Jump);

			playerEntity = world.spawn(
				Player({}),
				InputMapComponent({} as any),
				ActionStateComponent({} as any),
				InputEnabled({ enabled: true }),
				LocalPlayer({ playerId: 1 }),
			);

			if (instanceManager) {
				instanceManager.registerInputMap(playerEntity, inputMap);
				instanceManager.registerActionState(playerEntity, actionState);
			}

			print("=== 开始模拟空格键输入 ===");

			// 模拟按下空格键
			if (centralInputStore) {
				print("📝 向 CentralInputStore 添加空格键输入");

				// 使用正确的方法模拟键盘输入
				centralInputStore.updateKeyboardKey(Enum.KeyCode.Space, true);
				print("✅ 调用 updateKeyboardKey(Enum.KeyCode.Space, true)");

				// 验证输入是否被记录
				const buttonValue = centralInputStore.getButtonValue(`keyboard_Space`);
				print(`🔍 CentralInputStore 检测到空格键: pressed=${buttonValue?.pressed}, value=${buttonValue?.value}`);
			}

			// 手动执行更新系统
			print("=== 执行 updateActionState 系统 ===");

			// 手动运行一次更新以处理输入
			print("🔧 手动执行一次更新周期...");
			app.update();

			// 检查 ActionState 是否更新
			const registeredActionState = instanceManager?.getActionState(playerEntity!);
			if (registeredActionState) {
				const pressed = registeredActionState.pressed(TestAction.Jump);
				const justPressed = registeredActionState.justPressed(TestAction.Jump);

				print(`📊 ActionState 更新后 - pressed: ${pressed}, justPressed: ${justPressed}`);

				// 期望至少 pressed 应该为 true
				expect(pressed || justPressed).to.equal(true);
			}
		});

		it("应该通过 InputMap 处理空格键输入", () => {
			const world = app.getWorld();
			const context = app.getContext();

			// 设置
			instanceManager = getInputInstanceManager(context, TestAction);
			centralInputStore = world.resources.getResource<CentralInputStore>();

			const inputMap = new InputMap<TestAction>();
			inputMap.insert(TestAction.Jump, KeyCode.Space);

			const actionState = new ActionState<TestAction>();
			actionState.registerAction(TestAction.Jump);

			print("=== 直接测试 InputMap.processActions ===");

			// 模拟输入
			if (centralInputStore) {
				// 添加空格键输入到 store
				centralInputStore.updateKeyboardKey(Enum.KeyCode.Space, true);

				// 让 InputMap 处理输入
				print("🔧 调用 inputMap.processActions");
				const processedActions = inputMap.processActions(centralInputStore);

				// ProcessedActions 包含 actionData 和 consumedInputs
				print(`📊 处理的动作数量: ${processedActions.actionData.size()}`);

				// 检查是否处理了 Jump 动作
				let foundJump = false;
				processedActions.actionData.forEach((state, actionHash) => {
					print(`  - 动作 hash: ${actionHash}, 状态: value=${state.value}, pressed=${state.pressed}`);
					if (actionHash === TestAction.Jump.hash()) {
						foundJump = true;
						print(`  ✅ 找到 Jump 动作！`);
					}
				});

				expect(foundJump).to.equal(true);
			}
		});

		it("应该完整运行一帧并检测输入", () => {
			const world = app.getWorld();
			const context = app.getContext();

			// 创建玩家
			const setupSystem = (world: World, context: Context) => {
				const instanceManager = getInputInstanceManager(context, TestAction);
				if (!instanceManager) return;

				const inputMap = new InputMap<TestAction>();
				inputMap.insert(TestAction.Jump, KeyCode.Space);

				const actionState = new ActionState<TestAction>();
				actionState.registerAction(TestAction.Jump);

				const entity = world.spawn(
					Player({}),
					InputMapComponent({} as any),
					ActionStateComponent({} as any),
					InputEnabled({ enabled: true }),
					LocalPlayer({ playerId: 1 }),
				);

				instanceManager.registerInputMap(entity, inputMap);
				instanceManager.registerActionState(entity, actionState);

				print(`✅ 在 STARTUP 系统中创建玩家实体: ${entity}`);
			};

			// 检查输入的系统
			const checkInputSystem = (world: World, context: Context) => {
				const instanceManager = getInputInstanceManager(context, TestAction);
				if (!instanceManager) {
					print("❌ 无法获取 InputInstanceManager");
					return;
				}

				for (const [entity, player] of world.query(Player)) {
					const actionState = instanceManager.getActionState(entity);
					if (actionState) {
						const pressed = actionState.pressed(TestAction.Jump);
						const justPressed = actionState.justPressed(TestAction.Jump);

						if (justPressed) {
							print("🚀 检测到跳跃输入！");
						}

						print(`📊 Entity ${entity} - pressed: ${pressed}, justPressed: ${justPressed}`);
					}
				}
			};

			// 添加系统
			app.addSystems(MainScheduleLabel.STARTUP, setupSystem);
			app.addSystems(MainScheduleLabel.UPDATE, checkInputSystem);

			// 运行一帧
			print("=== 运行第一帧 ===");
			app.update();

			// 模拟空格键输入
			centralInputStore = world.resources.getResource<CentralInputStore>( );
			if (centralInputStore) {
				centralInputStore.updateKeyboardKey(Enum.KeyCode.Space, true);
				print("✅ 模拟空格键按下");
			}

			// 运行第二帧
			print("=== 运行第二帧（带输入）===");
			app.update();

			// 验证结果
			const instanceManager = getInputInstanceManager(context, TestAction);
			for (const [entity] of world.query(Player)) {
				const actionState = instanceManager?.getActionState(entity);
				if (actionState) {
					const pressed = actionState.pressed(TestAction.Jump);
					const justPressed = actionState.justPressed(TestAction.Jump);

					print(`🎯 最终状态 - pressed: ${pressed}, justPressed: ${justPressed}`);

					// 期望检测到输入
					expect(pressed || justPressed).to.equal(true);
				}
			}
		});
	});
};