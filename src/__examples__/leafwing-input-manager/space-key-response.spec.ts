/**
 * 空格键响应问题测试用例
 * 用于验证和调试空格键输入无法正确触发 ActionState 更新的问题
 */

import { App } from "../../bevy_app";
import { InputPlugin } from "../../bevy_input/plugin";
import {
	InputMap,
	ActionState,
	Actionlike,
	InputControlKind,
	KeyCode,
	InputManagerPlugin,
	CentralInputStore,
} from "../../leafwing-input-manager";
import { getInputInstanceManager } from "../../leafwing-input-manager/plugin/context-helpers";
import { ActionData } from "../../leafwing-input-manager/action-state/action-data";
import { ButtonData } from "../../leafwing-input-manager/action-state/button-data";

/**
 * 测试用动作枚举
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

export = () => {
	describe("空格键响应问题", () => {
		let app: App;

		beforeEach(() => {
			app = new App();

			// 手动初始化 CentralInputStore 资源
			const centralStore = new CentralInputStore();
			app.insertResource(centralStore);

			// 添加必要的插件
			app.addPlugin(new InputPlugin())
				.addPlugin(new InputManagerPlugin({ actionType: TestAction }));
			app.update();
		});

		afterEach(() => {
			app.cleanup();
		});

		describe("ActionState 初始化", () => {
			it("应该在 registerAction 时正确初始化 actionData 和 buttonData", () => {
				const actionState = new ActionState<TestAction>();
				const jumpHash = TestAction.Jump.hash();

				// 注册前应该没有数据
				expect(actionState["actionData"].has(jumpHash)).to.equal(false);
				expect(actionState["buttonData"].has(jumpHash)).to.equal(false);

				// 注册动作
				actionState.registerAction(TestAction.Jump);

				// 注册后应该有数据
				expect(actionState["actionData"].has(jumpHash)).to.equal(true);
				expect(actionState["buttonData"].has(jumpHash)).to.equal(true);

				// 数据应该是默认值
				const actionData = actionState["actionData"].get(jumpHash);
				const buttonData = actionState["buttonData"].get(jumpHash);

				expect(actionData).to.be.ok();
				expect(buttonData).to.be.ok();
				expect(actionData!.pressed).to.equal(false);
				expect(buttonData!.justPressed).to.equal(false);
			});

			it("应该在多次注册同一动作时保持幂等性", () => {
				const actionState = new ActionState<TestAction>();
				const jumpHash = TestAction.Jump.hash();

				// 第一次注册
				actionState.registerAction(TestAction.Jump);
				const firstActionData = actionState["actionData"].get(jumpHash);
				const firstButtonData = actionState["buttonData"].get(jumpHash);

				// 第二次注册
				actionState.registerAction(TestAction.Jump);
				const secondActionData = actionState["actionData"].get(jumpHash);
				const secondButtonData = actionState["buttonData"].get(jumpHash);

				// 应该是同一个对象
				expect(firstActionData).to.equal(secondActionData);
				expect(firstButtonData).to.equal(secondButtonData);
			});
		});

		describe("CentralInputStore 资源注册", () => {
			it("应该正确注册并获取 CentralInputStore 资源", () => {
				const world = app.getWorld();
				const centralStore = world.resources.getResource<CentralInputStore>();

				expect(centralStore).to.be.ok();
				expect(centralStore).to.be.a("table");
				// 验证是 CentralInputStore 的实例
				expect(centralStore instanceof CentralInputStore).to.equal(true);
			});

			it("应该能够同步空格键输入到 CentralInputStore", () => {
				const world = app.getWorld();
				const centralStore = world.resources.getResource<CentralInputStore>();

				expect(centralStore).to.be.ok();

				// 模拟空格键输入 - 使用内部方法
				const storeInternal = centralStore as unknown as {
					buttonStates: Map<string, {pressed: boolean, value: number}>
				};
				storeInternal.buttonStates.set("keyboard_Space", {
					pressed: true,
					value: 1,
				});

				const spaceValue = centralStore!.getButtonValue("keyboard_Space");
				expect(spaceValue).to.be.ok();
				expect(spaceValue!.pressed).to.equal(true);
				expect(spaceValue!.value).to.equal(1);
			});
		});

		describe("ActionState 更新流程", () => {
			it("应该在 updateFromUpdatedActions 时正确更新状态", () => {
				const actionState = new ActionState<TestAction>();
				actionState.registerAction(TestAction.Jump);

				const jumpHash = TestAction.Jump.hash();

				// 创建更新数据
				const updatedActions = {
					actionData: new Map([
						[jumpHash, {
							pressed: true,
							value: 1,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
					]),
					consumedInputs: new Set<string>(),
				};

				// 更新前状态
				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(false);

				// 执行更新
				actionState.updateFromUpdatedActions(updatedActions);

				// 更新后状态
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(true);

				// tick 后 justPressed 应该变为 false
				actionState.tick();
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(false);
			});

			it("应该处理未注册动作的更新", () => {
				const actionState = new ActionState<TestAction>();
				// 不注册动作，直接更新

				const jumpHash = TestAction.Jump.hash();
				const updatedActions = {
					actionData: new Map([
						[jumpHash, {
							pressed: true,
							value: 1,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
					]),
					consumedInputs: new Set<string>(),
				};

				// 更新应该自动创建数据结构
				actionState.updateFromUpdatedActions(updatedActions);

				// 应该能够正确读取状态
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(true);
			});
		});

		describe("完整输入处理流程", () => {
			it("应该从 CentralInputStore 到 ActionState 完整处理空格键输入", () => {
				const world = app.getWorld();
				const context = app.getContext();

				// 获取资源
				const centralStore = world.resources.getResource<CentralInputStore>();
				expect(centralStore).to.be.ok();
				expect(centralStore instanceof CentralInputStore).to.equal(true);

				// 创建输入映射和动作状态
				const inputMap = new InputMap<TestAction>();
				inputMap.insert(TestAction.Jump, KeyCode.Space);

				const actionState = new ActionState<TestAction>();
				actionState.registerAction(TestAction.Jump);

				// 获取 InputInstanceManager 并注册
				const instanceManager = getInputInstanceManager(context, TestAction);
				if (!instanceManager) {
					// 如果没有 instanceManager，跳过这部分
					print("⚠️ 未找到 InputInstanceManager，使用直接测试");
				} else {
					const entity = 1;
					// 使用 register 方法而不是 registerEntity
					if ("register" in instanceManager) {
						const manager = instanceManager as unknown as {
							register(entity: number, inputMap: InputMap<TestAction>, actionState: ActionState<TestAction>): void;
						};
						manager.register(entity, inputMap, actionState);
					}
				}

				// 模拟空格键按下 - 使用内部方法
				const storeInternal = centralStore as unknown as {
					buttonStates: Map<string, {pressed: boolean, value: number}>
				};
				storeInternal.buttonStates.set("keyboard_Space", {
					pressed: true,
					value: 1,
				});

				// 处理输入
				const processedActions = inputMap.processActions(centralStore!);
				expect(processedActions.actionData.size()).to.equal(1);

				const jumpHash = TestAction.Jump.hash();
				const jumpData = processedActions.actionData.get(jumpHash);
				expect(jumpData).to.be.ok();
				expect(jumpData!.pressed).to.equal(true);

				// 转换为 ActionData 格式
				const updatedActions = {
					actionData: new Map<string, ActionData>(),
					consumedInputs: processedActions.consumedInputs,
				};

				processedActions.actionData.forEach((processed, hash) => {
					const data = new ActionData();
					data.pressed = processed.pressed;
					data.value = processed.value;
					updatedActions.actionData.set(hash, data);
				});

				// 更新 ActionState
				actionState.updateFromUpdatedActions(updatedActions);

				// 验证最终状态
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(true);
				expect(actionState.value(TestAction.Jump)).to.equal(1);

				print("✅ 完整输入流程测试通过：空格键 -> CentralInputStore -> InputMap -> ActionState");
			});

			it("应该正确处理按键释放", () => {
				const actionState = new ActionState<TestAction>();
				actionState.registerAction(TestAction.Jump);

				const jumpHash = TestAction.Jump.hash();

				// 第一帧：按下
				const pressedActions = {
					actionData: new Map([
						[jumpHash, {
							pressed: true,
							value: 1,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
					]),
					consumedInputs: new Set<string>(),
				};

				actionState.updateFromUpdatedActions(pressedActions);
				actionState.tick();

				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(false); // tick 后为 false

				// 第二帧：释放
				const releasedActions = {
					actionData: new Map([
						[jumpHash, {
							pressed: false,
							value: 0,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
					]),
					consumedInputs: new Set<string>(),
				};

				actionState.updateFromUpdatedActions(releasedActions);

				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(actionState.justReleased(TestAction.Jump)).to.equal(true);

				// tick 后 justReleased 也应该变为 false
				actionState.tick();
				expect(actionState.justReleased(TestAction.Jump)).to.equal(false);
			});
		});

		describe("边界情况和错误处理", () => {
			it("应该处理禁用的 ActionState", () => {
				const actionState = new ActionState<TestAction>();
				actionState.registerAction(TestAction.Jump);
				actionState.disableAll();

				const jumpHash = TestAction.Jump.hash();
				const updatedActions = {
					actionData: new Map([
						[jumpHash, {
							pressed: true,
							value: 1,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
					]),
					consumedInputs: new Set<string>(),
				};

				// 禁用状态下不应该更新
				actionState.updateFromUpdatedActions(updatedActions);
				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
				expect(actionState.justPressed(TestAction.Jump)).to.equal(false);

				// 重新启用
				actionState.enableAll();
				actionState.updateFromUpdatedActions(updatedActions);
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			});

			it("应该处理单个动作的禁用", () => {
				const actionState = new ActionState<TestAction>();
				actionState.registerAction(TestAction.Jump);
				actionState.disable(TestAction.Jump);

				const jumpHash = TestAction.Jump.hash();
				const updatedActions = {
					actionData: new Map([
						[jumpHash, {
							pressed: true,
							value: 1,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
					]),
					consumedInputs: new Set<string>(),
				};

				// 禁用的动作不应该更新
				actionState.updateFromUpdatedActions(updatedActions);
				expect(actionState.pressed(TestAction.Jump)).to.equal(false);

				// 重新启用
				actionState.enable(TestAction.Jump);
				actionState.updateFromUpdatedActions(updatedActions);
				expect(actionState.pressed(TestAction.Jump)).to.equal(true);
			});

			it("应该处理空的更新数据", () => {
				const actionState = new ActionState<TestAction>();
				actionState.registerAction(TestAction.Jump);

				const emptyActions = {
					actionData: new Map<string, ActionData>(),
					consumedInputs: new Set<string>(),
				};

				// 不应该崩溃
				expect(() => {
					actionState.updateFromUpdatedActions(emptyActions);
				}).to.never.throw();

				// 状态应该保持默认
				expect(actionState.pressed(TestAction.Jump)).to.equal(false);
			});
		});

		describe("性能和并发", () => {
			it("应该正确处理快速连续的输入", () => {
				const actionState = new ActionState<TestAction>();
				actionState.registerAction(TestAction.Jump);

				const jumpHash = TestAction.Jump.hash();

				// 模拟快速按下和释放
				for (let i = 0; i < 10; i++) {
					// 按下
					const pressedActions = {
						actionData: new Map([
							[jumpHash, {
								pressed: true,
								value: 1,
								axisPairX: 0,
								axisPairY: 0,
							} as ActionData],
						]),
						consumedInputs: new Set<string>(),
					};
					actionState.updateFromUpdatedActions(pressedActions);
					expect(actionState.pressed(TestAction.Jump)).to.equal(true);
					expect(actionState.justPressed(TestAction.Jump)).to.equal(true);

					actionState.tick();

					// 释放
					const releasedActions = {
						actionData: new Map([
							[jumpHash, {
								pressed: false,
								value: 0,
								axisPairX: 0,
								axisPairY: 0,
							} as ActionData],
						]),
						consumedInputs: new Set<string>(),
					};
					actionState.updateFromUpdatedActions(releasedActions);
					expect(actionState.pressed(TestAction.Jump)).to.equal(false);
					expect(actionState.justReleased(TestAction.Jump)).to.equal(true);

					actionState.tick();
				}
			});

			it("应该处理多个动作的同时更新", () => {
				// 定义额外的动作
				class ExtendedAction extends TestAction {
					static readonly Attack = new ExtendedAction("Attack", InputControlKind.Button);
					static readonly Block = new ExtendedAction("Block", InputControlKind.Button);
				}

				const actionState = new ActionState<ExtendedAction>();
				actionState.registerAction(ExtendedAction.Jump);
				actionState.registerAction(ExtendedAction.Attack);
				actionState.registerAction(ExtendedAction.Block);

				// 创建多个动作的更新
				const multiActions = {
					actionData: new Map([
						[ExtendedAction.Jump.hash(), {
							pressed: true,
							value: 1,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
						[ExtendedAction.Attack.hash(), {
							pressed: true,
							value: 0.8,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
						[ExtendedAction.Block.hash(), {
							pressed: false,
							value: 0,
							axisPairX: 0,
							axisPairY: 0,
						} as ActionData],
					]),
					consumedInputs: new Set<string>(),
				};

				actionState.updateFromUpdatedActions(multiActions);

				// 验证所有动作的状态
				expect(actionState.pressed(ExtendedAction.Jump)).to.equal(true);
				expect(actionState.value(ExtendedAction.Jump)).to.equal(1);

				expect(actionState.pressed(ExtendedAction.Attack)).to.equal(true);
				expect(actionState.value(ExtendedAction.Attack)).to.equal(0.8);

				expect(actionState.pressed(ExtendedAction.Block)).to.equal(false);
				expect(actionState.value(ExtendedAction.Block)).to.equal(0);
			});
		});
	});
};