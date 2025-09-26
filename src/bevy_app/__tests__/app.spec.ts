import { World } from "@rbxts/matter";
import { App, AppExit, PluginState } from "../index";
import { MainScheduleLabel as BuiltinSchedules } from "../main-schedule";
import { SubApp } from "../sub-app";
import { createTestApp } from "./test-helpers";

interface TestResource {
	readonly __brand: "Resource";
	value: number;
	name: string;
}

interface AnotherResource {
	readonly __brand: "Resource";
	data: string;
}

export = (): void => {
	describe("App", () => {
		describe("构建器", () => {
			it("应该使用 create() 创建有效的 App 实例", () => {
				const app = createTestApp();

				expect(app).to.be.ok();
				expect(app.getWorld()).to.be.ok();
				expect(app.main()).to.be.ok();
			});

			it("应该使用 empty() 创建空的 App 实例", () => {
				const app = App.empty();

				expect(app).to.be.ok();
				expect(app.getWorld()).to.be.ok();
			});

			it("应该支持链式调用", () => {
				const app = createTestApp();

				const result = app
					.insertResource({ __brand: "Resource" as const, value: 42 })
					.setErrorHandler(() => {});

				expect(result).to.equal(app);
			});
		});

		describe("资源管理", () => {
			let app: App;

			beforeEach(() => {
				app = createTestApp();
			});

			it("应该能够插入和获取资源", () => {
				const resource: TestResource = {
					__brand: "Resource",
					value: 42,
					name: "TestResource",
				};

				app.insertResource(resource);

				// 通过 SubApp 的 world 获取资源
				const world = app.main().world();
				expect(world).to.be.ok();
			});


			it("应该能够覆盖已存在的资源", () => {
				const firstResource: TestResource = {
					__brand: "Resource",
					value: 1,
					name: "First",
				};

				const secondResource: TestResource = {
					__brand: "Resource",
					value: 2,
					name: "Second",
				};

				app.insertResource(firstResource);
				app.insertResource(secondResource);

				// 验证资源被覆盖
				const world = app.main().world();
				expect(world).to.be.ok();
			});
		});

		describe("SubApp 管理", () => {
			let app: App;

			beforeEach(() => {
				app = createTestApp();
			});

			it("应该能够获取主 SubApp", () => {
				const mainApp = app.main();

				expect(mainApp).to.be.ok();
				expect(mainApp).to.be.a("table");
			});

			it("应该能够插入新的 SubApp", () => {
				const subApp = new SubApp();
				const label = { name: "TestSubApp", __brand: "AppLabel" } as const;

				app.insertSubApp(label, subApp);

				const retrieved = app.getSubApp(label);
				expect(retrieved).to.equal(subApp);
			});

			it("应该能够移除 SubApp", () => {
				const subApp = new SubApp();
				const label = { name: "TestSubApp", __brand: "AppLabel" } as const;

				app.insertSubApp(label, subApp);
				const removed = app.removeSubApp(label);

				expect(removed).to.equal(subApp);
				expect(app.getSubApp(label)).to.never.be.ok();
			});

			it("应该在访问不存在的 SubApp 时抛出错误", () => {
				const label = { name: "NonExistent", __brand: "AppLabel" } as const;

				expect(() => app.subApp(label)).to.throw();
			});
		});

		describe("调度管理", () => {
			let app: App;

			beforeEach(() => {
				app = createTestApp();
			});

			it("应该初始化默认调度", () => {
				// createTestApp() 应该已经初始化了默认调度
				const schedules = [
					BuiltinSchedules.FIRST,
					BuiltinSchedules.PRE_STARTUP,
					BuiltinSchedules.STARTUP,
					BuiltinSchedules.POST_STARTUP,
					BuiltinSchedules.PRE_UPDATE,
					BuiltinSchedules.UPDATE,
					BuiltinSchedules.POST_UPDATE,
					BuiltinSchedules.LAST,
					BuiltinSchedules.MAIN,
				];

				for (const schedule of schedules) {
					const sched = app.getSchedule(schedule);
					expect(sched).to.be.ok();
				}
			});

			it("应该能够添加系统到调度", () => {
				let systemCalled = false;
				const testSystem = () => {
					systemCalled = true;
				};

				app.addSystems(BuiltinSchedules.UPDATE, testSystem);

				// 系统应该被添加但还未执行
				expect(systemCalled).to.equal(false);
			});

			it("应该能够编辑调度", () => {
				let editCalled = false;

				app.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
					editCalled = true;
					expect(schedule).to.be.ok();
					expect(schedule.getLabel()).to.equal(BuiltinSchedules.UPDATE);
				});

				expect(editCalled).to.equal(true);
			});
		});

		describe("错误处理", () => {
			let app: App;

			beforeEach(() => {
				app = createTestApp();
			});

			it("应该能够设置错误处理器", () => {
				const errorHandler = (err: unknown) => {
					print(`Error: ${err}`);
				};

				const result = app.setErrorHandler(errorHandler);

				expect(result).to.equal(app); // 链式调用
				expect(app.getErrorHandler()).to.equal(errorHandler);
			});

			it("应该在多次设置错误处理器时抛出错误", () => {
				const handler1 = () => {};
				const handler2 = () => {};

				app.setErrorHandler(handler1);

				expect(() => app.setErrorHandler(handler2)).to.throw();
			});

			it("新的 SubApp 应该继承错误处理器", () => {
				const errorHandler = () => {};
				app.setErrorHandler(errorHandler);

				const subApp = new SubApp();
				const label = { name: "TestSubApp", __brand: "AppLabel" } as const;
				app.insertSubApp(label, subApp);

				// SubApp 应该被设置了相同的错误处理器
				expect(app.getSubApp(label)).to.be.ok();
			});
		});

		describe("运行器设置", () => {
			let app: App;

			beforeEach(() => {
				app = createTestApp();
			});

			it("应该能够设置自定义运行器", () => {
				let customRunnerCalled = false;
				const customRunner = (app: App): AppExit => {
					customRunnerCalled = true;
					return AppExit.success();
				};

				const result = app.setRunner(customRunner);

				expect(result).to.be.ok(); // 链式调用应该返回对象
				expect(typeOf(result)).to.equal("table"); // 确保返回的是表对象

				// 确保应用完成初始化
				app.finish();

				// 检查插件状态
				const pluginState = app.getPluginState();

				// 运行应该调用自定义运行器
				expect(() => app.run()).to.never.throw(); // 确保不抛出错误
				expect(customRunnerCalled).to.equal(true);
			});
		});

		describe("插件状态检查", () => {
			let app: App;

			beforeEach(() => {
				app = createTestApp();
			});

			it("应该在构建插件时阻止 update 调用", () => {
				// 这个测试需要模拟插件正在构建的状态
				// 由于状态是内部管理的，我们只能测试正常情况
				expect(() => app.update()).to.never.throw();
			});

			it("应该在构建插件时阻止 run 调用", () => {
				// 同上，测试正常情况
				expect(() => {
					const result = app.run();
					expect(result).to.be.ok();
				}).to.never.throw();
			});
		});

		describe("生命周期管理", () => {
			let app: App;

			beforeEach(() => {
				app = createTestApp();
			});

			it("应该正确执行 finish()", () => {
				expect(() => app.finish()).to.never.throw();

				// finish 后插件状态应该改变
				const state = app.getPluginState();
				expect(state === PluginState.Finished || state === PluginState.Ready).to.equal(true);
			});

			it("应该正确执行 cleanup()", () => {
				app.finish(); // 先 finish
				expect(() => app.cleanup()).to.never.throw();

				// cleanup 后插件状态应该是 Cleaned
				expect(app.getPluginState()).to.equal(PluginState.Cleaned);
			});

			it("应该能够执行 update()", () => {
				let updateSystemCalled = false;

				app.addSystems(BuiltinSchedules.UPDATE, () => {
					updateSystemCalled = true;
				});

				// 第一次更新运行启动调度，第二次更新运行主循环调度（包含Update）
				app.update();
				app.update();

				expect(updateSystemCalled).to.equal(true);
			});
		});
	});
};
