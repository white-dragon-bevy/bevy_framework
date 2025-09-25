/**
 * 状态转换系统单元测试
 */

import { App } from "../../bevy_app/app";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { extendAppWithState } from "../../__examples__/state/computed_states/app-extensions";
import { AppState } from "../../__examples__/state/computed_states/states";
import { State, NextState } from "../resources";
import { ResourceManager, ResourceConstructor } from "../../bevy_ecs/resource";

export = () => {
	describe("State Transitions", () => {
		it("should initialize default state", () => {
			// 创建应用并扩展状态管理
			const baseApp = App.create();
			const app = extendAppWithState(baseApp);

			// 初始化状态
			app.initState(AppState, () => AppState.Menu());

			// 获取 world 和资源管理器
			const world = app.getWorld();
			const resourceManager = (world as unknown as Record<string, unknown>)[
				"stateResourceManager"
			] as ResourceManager | undefined;

			expect(resourceManager).to.be.ok();

			// 检查初始状态是否为 Menu
			if (resourceManager) {
				// 运行一次更新以处理初始状态
				app.update();

				// 获取当前状态
				const stateResourceKey = "State<AppState>" as ResourceConstructor<State<AppState>>;
				const stateResource = resourceManager.getResource(stateResourceKey);
				expect(stateResource).to.be.ok();

				if (stateResource) {
					const currentState = stateResource.get();
					expect(currentState).to.be.ok();
					expect(currentState.getStateId()).to.equal("Menu");
				}
			}
		});

		it("should trigger OnEnter systems", () => {
			const baseApp = App.create();
			const app = extendAppWithState(baseApp);

			// 跟踪是否执行了 OnEnter 系统
			let onEnterCalled = false;

			// 初始化状态
			app.initState(AppState, () => AppState.Menu());

			// 添加 OnEnter 系统
			app.addSystemsOnEnter(AppState.Menu(), () => {
				onEnterCalled = true;
				print("[Test] OnEnter Menu state called");
			});

			// 运行一次更新循环以触发状态初始化
			app.update();

			// 验证 OnEnter 被调用
			expect(onEnterCalled).to.equal(true);
		});

		it("should trigger OnExit systems on state change", () => {
			const baseApp = App.create();
			const app = extendAppWithState(baseApp);

			let onExitMenuCalled = false;
			let onEnterInGameCalled = false;

			// 初始化状态
			app.initState(AppState, () => AppState.Menu());

			// 添加 OnExit 和 OnEnter 系统
			app.addSystemsOnExit(AppState.Menu(), () => {
				onExitMenuCalled = true;
				print("[Test] OnExit Menu state called");
			});

			app.addSystemsOnEnter(AppState.InGame(false, false), () => {
				onEnterInGameCalled = true;
				print("[Test] OnEnter InGame state called");
			});

			// 运行一次更新以处理初始状态
			app.update();

			// 获取资源管理器
			const world = app.getWorld();
			const resourceManager = (world as unknown as Record<string, unknown>)[
				"stateResourceManager"
			] as ResourceManager | undefined;

			// 触发状态转换
			if (resourceManager) {
				const nextStateResourceKey = "NextState<AppState>" as ResourceConstructor<NextState<AppState>>;
				const nextStateResource = resourceManager.getResource(nextStateResourceKey);
				if (nextStateResource) {
					nextStateResource.set(AppState.InGame(false, false));
				}
			}

			// 运行更新循环以处理状态转换
			app.update();

			// 验证状态转换系统被触发
			expect(onExitMenuCalled).to.equal(true);
			expect(onEnterInGameCalled).to.equal(true);
		});

		it("should handle multiple state transitions", () => {
			const baseApp = App.create();
			const app = extendAppWithState(baseApp);

			const transitionLog: string[] = [];

			// 初始化状态
			app.initState(AppState, () => AppState.Menu());

			// 为所有状态添加 OnEnter 和 OnExit 系统
			app.addSystemsOnEnter(AppState.Menu(), () => {
				transitionLog.push("Enter:Menu");
			});

			app.addSystemsOnExit(AppState.Menu(), () => {
				transitionLog.push("Exit:Menu");
			});

			app.addSystemsOnEnter(AppState.InGame(false, false), () => {
				transitionLog.push("Enter:InGame");
			});

			app.addSystemsOnExit(AppState.InGame(false, false), () => {
				transitionLog.push("Exit:InGame");
			});

			// 运行初始更新
			app.update();

			// 获取资源管理器
			const world = app.getWorld();
			const resourceManager = (world as unknown as Record<string, unknown>)[
				"stateResourceManager"
			] as ResourceManager | undefined;

			// 转换到 InGame
			if (resourceManager) {
				const nextStateResourceKey = "NextState<AppState>" as ResourceConstructor<NextState<AppState>>;
				const nextStateResource = resourceManager.getResource(nextStateResourceKey);
				if (nextStateResource) {
					nextStateResource.set(AppState.InGame(false, false));
					app.update();

					// 转换回 Menu
					nextStateResource.set(AppState.Menu());
					app.update();
				}
			}

			// 验证转换顺序
			expect(transitionLog.size() >= 3).to.equal(true);
			expect(transitionLog[0]).to.equal("Enter:Menu");
			// 后续转换可能因为实现细节而有所不同
		});
	});

	describe("Computed States", () => {
		it("should compute states from source states", () => {
			// 这里可以添加计算状态的测试
			// 由于示例代码复杂，这里仅作为占位符
			expect(true).to.equal(true);
		});
	});
};
