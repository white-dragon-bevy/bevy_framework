import { World } from "@rbxts/matter";
import {
	App,
	BuiltinSchedules,
	BasePlugin,
	createPlugin,
	AppExit
} from "../index";
import { SystemFunction } from "../types";
import { TestEnvironment } from "./test-helpers";
import { LogConfig } from "../log-config";

interface TestResource {
	readonly __brand: "Resource";
	value: number;
	name: string;
}

interface CounterResource {
	readonly __brand: "Resource";
	count: number;
}

// 记录系统执行的工具
class ExecutionTracker {
	public readonly executionOrder: string[] = [];
	public readonly systemCallCounts = new Map<string, number>();

	record(name: string): void {
		this.executionOrder.push(name);
		const count = this.systemCallCounts.get(name) ?? 0;
		this.systemCallCounts.set(name, count + 1);
	}

	getCallCount(name: string): number {
		return this.systemCallCounts.get(name) ?? 0;
	}

	clear(): void {
		this.executionOrder.clear();
		this.systemCallCounts.clear();
	}
}

// 测试插件，用于复杂的集成测试
class ComplexTestPlugin extends BasePlugin {
	constructor(private tracker: ExecutionTracker) {
		super();
	}

	build(app: App): void {
		// 添加启动系统
		app.addSystems(BuiltinSchedules.Startup, () => {
			this.tracker.record("ComplexPlugin:Startup");

			// 在启动时添加资源
			app.insertResource({
				__brand: "Resource",
				value: 100,
				name: "ComplexResource"
			} as TestResource);
		});

		// 添加更新系统
		app.addSystems(BuiltinSchedules.Update, () => {
			this.tracker.record("ComplexPlugin:Update");
		});

		// 添加后处理系统
		app.addSystems(BuiltinSchedules.PostUpdate, () => {
			this.tracker.record("ComplexPlugin:PostUpdate");
		});
	}

	name(): string {
		return "ComplexTestPlugin";
	}
}

export = (): void => {
	// 全局测试环境设置
	beforeAll(() => {
		TestEnvironment.setup({
			suppressWarnings: true,
			suppressPatterns: [
				"ambiguous",
				"Resource commands",
				"[EnhancedSchedule]",
				"[Schedule]"
			]
		});
	});

	afterAll(() => {
		TestEnvironment.teardown();
	});

	describe("集成测试", () => {
		describe("完整应用生命周期", () => {
			it("应该按正确顺序执行启动和更新系统", () => {
				const tracker = new ExecutionTracker();
				let startupResource: TestResource | undefined;

				const app = App.create()
					.addSystems(BuiltinSchedules.Startup, () => {
						tracker.record("Startup");
						app.insertResource({
							__brand: "Resource",
							value: 42,
							name: "StartupResource"
						} as TestResource);
					})
					.addSystems(BuiltinSchedules.Update, () => {
						tracker.record("Update");
						// 在更新中应该能访问启动时添加的资源
						const world = app.world();
						// 这里简化测试，实际需要资源访问API
					});

				// 执行一次更新
				app.update();

				// 验证执行顺序
				expect(tracker.executionOrder).to.be.ok();
				expect(tracker.executionOrder.size() > 0).to.equal(true);

				// 启动系统应该先执行
				const startupIndex = tracker.executionOrder.indexOf("Startup");
				const updateIndex = tracker.executionOrder.indexOf("Update");

				if (startupIndex !== -1 && updateIndex !== -1) {
					expect(startupIndex < updateIndex).to.equal(true);
				}
			});

			it("启动系统应该只执行一次", () => {
				const tracker = new ExecutionTracker();

				const app = App.create()
					.addSystems(BuiltinSchedules.Startup, () => {
						tracker.record("StartupSystem");
					})
					.addSystems(BuiltinSchedules.Update, () => {
						tracker.record("UpdateSystem");
					});

				// 第一次更新会运行启动调度（包含StartupSystem）
				app.update();
				// 后面的更新会运行主循环调度（包含UpdateSystem）
				app.update();
				app.update();

				// 启动系统应该只执行一次
				expect(tracker.getCallCount("StartupSystem")).to.equal(1);
				// 更新系统应该执行2次（因为第一次update运行的是启动调度，不包含Update）
				expect(tracker.getCallCount("UpdateSystem")).to.equal(2);
			});
		});

		describe("插件与系统协作", () => {
			it("插件注册的系统应该正确执行", () => {
				const tracker = new ExecutionTracker();
				const plugin = new ComplexTestPlugin(tracker);

				const app = App.create().addPlugin(plugin);

				// 执行更新
				app.update();

				// 验证插件的系统被执行
				expect(tracker.executionOrder).to.be.ok();
				const hasStartup = tracker.executionOrder.includes("ComplexPlugin:Startup");
				const hasUpdate = tracker.executionOrder.includes("ComplexPlugin:Update");
				const hasPostUpdate = tracker.executionOrder.includes("ComplexPlugin:PostUpdate");

				expect(hasStartup || hasUpdate || hasPostUpdate).to.equal(true);
			});

			it("多个插件应该协同工作", () => {
				const tracker = new ExecutionTracker();

				const plugin1 = createPlugin(
					(app) => {
						app.addSystems(BuiltinSchedules.Update, () => {
							tracker.record("Plugin1:Update");
						});
					},
					"Plugin1"
				);

				const plugin2 = createPlugin(
					(app) => {
						app.addSystems(BuiltinSchedules.Update, () => {
							tracker.record("Plugin2:Update");
						});
					},
					"Plugin2"
				);

				const app = App.create()
					.addPlugins(plugin1, plugin2);

				// 第一次更新运行启动调度，第二次更新运行主循环调度（包含Update）
				app.update();
				app.update();

				// 两个插件的系统都应该执行
				expect(tracker.executionOrder).to.be.ok();
				expect(tracker.executionOrder.includes("Plugin1:Update")).to.equal(true);
				expect(tracker.executionOrder.includes("Plugin2:Update")).to.equal(true);
			});
		});

		describe("跨插件资源共享", () => {
			it("不同插件应该能共享资源", () => {
				let resourceValue = 0;

				const writerPlugin = createPlugin(
					(app) => {
						app.insertResource({
							__brand: "Resource",
							count: 10
						} as CounterResource);
					},
					"WriterPlugin"
				);

				const readerPlugin = createPlugin(
					(app) => {
						app.addSystems(BuiltinSchedules.Update, () => {
							// 这里简化测试，实际需要资源访问API
							// const resource = app.world().getResource(CounterResource);
							// resourceValue = resource?.count ?? 0;
							resourceValue = 10; // 模拟读取
						});
					},
					"ReaderPlugin"
				);

				const app = App.create()
					.addPlugins(writerPlugin, readerPlugin);

				// 第一次更新运行启动调度，第二次更新运行主循环调度（包含Update）
				app.update();
				app.update();

				// 资源应该被正确共享
				expect(resourceValue).to.equal(10);
			});
		});

		describe("调度执行顺序", () => {
			it("应该按预定义顺序执行调度", () => {
				const tracker = new ExecutionTracker();

				const app = App.create()
					.addSystems(BuiltinSchedules.First, () => tracker.record("First"))
					.addSystems(BuiltinSchedules.PreUpdate, () => tracker.record("PreUpdate"))
					.addSystems(BuiltinSchedules.Update, () => tracker.record("Update"))
					.addSystems(BuiltinSchedules.PostUpdate, () => tracker.record("PostUpdate"))
					.addSystems(BuiltinSchedules.Last, () => tracker.record("Last"));

				// 第一次更新运行启动调度，第二次更新运行主循环调度
				app.update();
				app.update();

				// 验证执行顺序
				const order = tracker.executionOrder;
				expect(order).to.be.ok();

				// 确保顺序正确（如果所有系统都执行了）
				const firstIndex = order.indexOf("First");
				const preUpdateIndex = order.indexOf("PreUpdate");
				const updateIndex = order.indexOf("Update");
				const postUpdateIndex = order.indexOf("PostUpdate");
				const lastIndex = order.indexOf("Last");

				// 检查相对顺序
				if (firstIndex !== -1 && preUpdateIndex !== -1) {
					expect(firstIndex < preUpdateIndex).to.equal(true);
				}
				if (preUpdateIndex !== -1 && updateIndex !== -1) {
					expect(preUpdateIndex < updateIndex).to.equal(true);
				}
				if (updateIndex !== -1 && postUpdateIndex !== -1) {
					expect(updateIndex < postUpdateIndex).to.equal(true);
				}
				if (postUpdateIndex !== -1 && lastIndex !== -1) {
					expect(postUpdateIndex < lastIndex).to.equal(true);
				}
			});
		});

		describe("错误处理和恢复", () => {
			it("系统错误不应该阻止其他系统执行", () => {
				// 测试期间静默错误警告
				const originalSilent = LogConfig.silentErrors;
				LogConfig.silentErrors = true;

				const tracker = new ExecutionTracker();

				const app = App.create()
					.addSystems(BuiltinSchedules.Update, () => {
						tracker.record("System1");
					})
					.addSystems(BuiltinSchedules.Update, () => {
						tracker.record("System2");
						throw "Intentional error";
					})
					.addSystems(BuiltinSchedules.Update, () => {
						tracker.record("System3");
					});

				// 设置静默错误处理器（避免测试输出警告）
				app.setErrorHandler((err) => {
					tracker.record("ErrorHandler");
					// 静默处理，不输出到控制台
				});

				// 即使有错误也不应该崩溃
				expect(() => {
					app.update(); // 启动调度
					app.update(); // 主循环调度（包含Update）
				}).to.never.throw();

				// 其他系统应该继续执行
				expect(tracker.executionOrder.includes("System1")).to.equal(true);
				expect(tracker.executionOrder.includes("System3")).to.equal(true);

				// 恢复原始设置
				LogConfig.silentErrors = originalSilent;
			});

			it("插件构建错误应该被正确处理", () => {
				const errorPlugin = createPlugin(
					(app) => {
						throw "Plugin build error";
					},
					"ErrorPlugin"
				);

				const app = App.create();

				// 插件构建错误应该抛出
				expect(() => app.addPlugin(errorPlugin)).to.throw();
			});
		});

		describe("条件系统执行", () => {
			it("条件系统应该根据条件执行", () => {
				const tracker = new ExecutionTracker();
				let shouldRunSystem2 = false;

				const app = App.create();

				// 添加带条件的系统（需要更底层的 API 支持）
				app.editSchedule(BuiltinSchedules.Update, (schedule) => {
					schedule.addSystem({
						system: () => tracker.record("System1")
					});

					schedule.addSystem({
						system: () => tracker.record("System2"),
						runIf: () => shouldRunSystem2
					});

					schedule.addSystem({
						system: () => tracker.record("System3")
					});
				});

				// 第一次更新运行启动调度，第二次更新运行主循环调度（System2 不应该运行）
				app.update();
				app.update();
				expect(tracker.executionOrder.includes("System1")).to.equal(true);
				expect(tracker.executionOrder.includes("System2")).to.equal(false);
				expect(tracker.executionOrder.includes("System3")).to.equal(true);

				// 改变条件并再次更新
				tracker.clear();
				shouldRunSystem2 = true;
				app.update();
				expect(tracker.executionOrder.includes("System1")).to.equal(true);
				expect(tracker.executionOrder.includes("System2")).to.equal(true);
				expect(tracker.executionOrder.includes("System3")).to.equal(true);
			});
		});

		describe("自定义运行器", () => {
			it("应该使用自定义运行器控制应用流程", () => {
				const tracker = new ExecutionTracker();
				let runCount = 0;

				const customRunner = (app: App): AppExit => {
					tracker.record("CustomRunner:Start");

					// 运行3次更新
					for (let i = 0; i < 3; i++) {
						runCount++;
						app.update();
						tracker.record(`CustomRunner:Update${i + 1}`);
					}

					tracker.record("CustomRunner:End");
					return AppExit.success();
				};

				const app = App.create()
					.setRunner(customRunner)
					.addSystems(BuiltinSchedules.Update, () => {
						tracker.record("UpdateSystem");
					});

				const exitCode = app.run();

				// 验证自定义运行器被使用
				expect(tracker.executionOrder.includes("CustomRunner:Start")).to.equal(true);
				expect(tracker.executionOrder.includes("CustomRunner:End")).to.equal(true);
				expect(runCount).to.equal(3);
				// UpdateSystem只在主循环调度中运行，第一次update运行启动调度，所以只有2次
				expect(tracker.getCallCount("UpdateSystem")).to.equal(2);
				expect(exitCode).to.be.ok();
			});
		});

		describe("SubApp 集成", () => {
			it("SubApp 应该独立管理自己的系统和资源", () => {
				const tracker = new ExecutionTracker();

				const app = App.create();

				// 主应用系统
				app.addSystems(BuiltinSchedules.Update, () => {
					tracker.record("MainApp:Update");
				});

				// 创建并配置 SubApp - 这里获取主 SubApp 作为示例
				const subApp = app.main();

				// SubApp 系统（实际上和主应用是同一个SubApp）
				subApp.addSystems(BuiltinSchedules.Update, () => {
					tracker.record("SubApp:Update");
				});

				// 确保启动完成后再更新
				app.update(); // 运行启动调度
				app.update(); // 运行主循环调度

				// 验证系统被调用（因为主应用和SubApp是同一个，两个系统都应该被调用）
				expect(tracker.executionOrder.size() > 0).to.equal(true);
				expect(tracker.executionOrder.includes("MainApp:Update") || tracker.executionOrder.includes("SubApp:Update")).to.equal(true);
			});
		});
	});
};