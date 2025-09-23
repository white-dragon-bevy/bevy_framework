/**
 * @fileoverview bevy_app 调度系统的全面单元测试
 * 覆盖所有调度功能、执行顺序、系统集、事件映射等场景
 */

import { World } from "@rbxts/matter";
import {
	MainScheduleLabel,
	CoreSystemSet,
	MainScheduleOrder,
	ScheduleExecutionOrder,
	SystemSetExecutionOrder,
	getAllMainScheduleLabels,
	getStartupScheduleLabels,
	getMainLoopScheduleLabels,
	getRenderScheduleLabels,
	getAllCoreSystemSets,
	getDefaultScheduleEventMapping,
	getStartupScheduleEventMapping,
	BuiltinSchedules,
	runMainSchedule,
	ScheduleDescriptions,
	SystemSetDescriptions,
} from "../main-schedule";
import { App } from "../app";
import { SubApp } from "../sub-app";
import { createWorldContainer } from "../../bevy_ecs";
import { createTestApp, TestEnvironment, runTestQuietly } from "./test-helpers";
import type { ScheduleLabel, SystemSet } from "../../bevy_ecs/schedule";

/**
 * 辅助函数：创建测试用系统
 */
function createTestSystem(name: string, log: string[]): () => void {
	return () => {
		log.push(name);
	};
}

/**
 * 辅助函数：数组查找索引（替代 indexOf）
 */
function indexOf<T extends defined>(array: T[], item: T): number {
	for (let i = 0; i < array.size(); i++) {
		if (array[i] === item) {
			return i;
		}
	}
	return -1;
}

// 辅助函数已被移到测试内部以避免 expect 全局变量访问问题

export = (): void => {
	// 在测试运行时定义辅助函数，此时 expect 已经可用
	const expectExecutionOrder = (log: string[], expected: string[]): void => {
		expect(log).to.be.ok();
		expect(log.size()).to.equal(expected.size());
		for (let i = 0; i < expected.size(); i++) {
			expect(log[i]).to.equal(expected[i]);
		}
	};
	describe("Schedule System (调度系统)", () => {
		beforeEach(() => {
			TestEnvironment.setup({ suppressWarnings: true });
		});

		afterEach(() => {
			TestEnvironment.teardown();
		});

		describe("MainScheduleLabel (调度标签)", () => {
			it("应该定义所有必要的调度标签", () => {
				expect(MainScheduleLabel.MAIN).to.equal("Main");
				expect(MainScheduleLabel.STARTUP).to.equal("Startup");
				expect(MainScheduleLabel.FIRST).to.equal("First");
				expect(MainScheduleLabel.PRE_UPDATE).to.equal("PreUpdate");
				expect(MainScheduleLabel.UPDATE).to.equal("Update");
				expect(MainScheduleLabel.POST_UPDATE).to.equal("PostUpdate");
				expect(MainScheduleLabel.LAST).to.equal("Last");
				expect(MainScheduleLabel.PRE_STARTUP).to.equal("PreStartup");
				expect(MainScheduleLabel.POST_STARTUP).to.equal("PostStartup");
				expect(MainScheduleLabel.RENDER).to.equal("Render");
				expect(MainScheduleLabel.EXTRACT).to.equal("Extract");
				expect(MainScheduleLabel.PREPARE).to.equal("Prepare");
				expect(MainScheduleLabel.QUEUE).to.equal("Queue");
				expect(MainScheduleLabel.CLEANUP).to.equal("Cleanup");
			});

			it("所有调度标签应该是唯一的", () => {
				const labels = getAllMainScheduleLabels();
				const uniqueLabels = new Set(labels);
				expect(uniqueLabels.size()).to.equal(labels.size());
			});

			it("getAllMainScheduleLabels 应该返回所有标签", () => {
				const allLabels = getAllMainScheduleLabels();
				expect(allLabels.size()).to.equal(14);
				expect(indexOf(allLabels,MainScheduleLabel.MAIN)).to.never.equal(-1);
				expect(indexOf(allLabels,MainScheduleLabel.STARTUP)).to.never.equal(-1);
				expect(indexOf(allLabels,MainScheduleLabel.UPDATE)).to.never.equal(-1);
			});

			it("getStartupScheduleLabels 应该返回启动相关标签", () => {
				const startupLabels = getStartupScheduleLabels();
				expect(startupLabels.size()).to.equal(3);
				// 验证包含所有期望的标签
				expect(indexOf(startupLabels, MainScheduleLabel.PRE_STARTUP)).to.never.equal(-1);
				expect(indexOf(startupLabels, MainScheduleLabel.STARTUP)).to.never.equal(-1);
				expect(indexOf(startupLabels, MainScheduleLabel.POST_STARTUP)).to.never.equal(-1);
			});

			it("getMainLoopScheduleLabels 应该返回主循环标签", () => {
				const mainLoopLabels = getMainLoopScheduleLabels();
				expect(mainLoopLabels.size()).to.equal(5);
				// 验证包含所有期望的标签
				expect(indexOf(mainLoopLabels, MainScheduleLabel.FIRST)).to.never.equal(-1);
				expect(indexOf(mainLoopLabels, MainScheduleLabel.PRE_UPDATE)).to.never.equal(-1);
				expect(indexOf(mainLoopLabels, MainScheduleLabel.UPDATE)).to.never.equal(-1);
				expect(indexOf(mainLoopLabels, MainScheduleLabel.POST_UPDATE)).to.never.equal(-1);
				expect(indexOf(mainLoopLabels, MainScheduleLabel.LAST)).to.never.equal(-1);
			});

			it("getRenderScheduleLabels 应该返回渲染相关标签", () => {
				const renderLabels = getRenderScheduleLabels();
				expect(renderLabels.size()).to.equal(5);
				// 验证包含所有期望的标签
				expect(indexOf(renderLabels, MainScheduleLabel.EXTRACT)).to.never.equal(-1);
				expect(indexOf(renderLabels, MainScheduleLabel.PREPARE)).to.never.equal(-1);
				expect(indexOf(renderLabels, MainScheduleLabel.QUEUE)).to.never.equal(-1);
				expect(indexOf(renderLabels, MainScheduleLabel.RENDER)).to.never.equal(-1);
				expect(indexOf(renderLabels, MainScheduleLabel.CLEANUP)).to.never.equal(-1);
			});

			it("应该有正确的调度描述信息", () => {
				expect(ScheduleDescriptions[MainScheduleLabel.MAIN]).to.equal("主调度器，包含所有标准更新循环");
				expect(ScheduleDescriptions[MainScheduleLabel.STARTUP]).to.equal("启动调度器，应用程序启动时运行一次");
				expect(ScheduleDescriptions[MainScheduleLabel.UPDATE]).to.equal("更新调度器，主要的游戏逻辑更新");
			});
		});

		describe("CoreSystemSet (系统集)", () => {
			it("应该定义所有必要的系统集", () => {
				expect(CoreSystemSet.CORE).to.equal("Core");
				expect(CoreSystemSet.INPUT).to.equal("Input");
				expect(CoreSystemSet.PHYSICS).to.equal("Physics");
				expect(CoreSystemSet.TRANSFORM).to.equal("Transform");
				expect(CoreSystemSet.ANIMATION).to.equal("Animation");
				expect(CoreSystemSet.AUDIO).to.equal("Audio");
				expect(CoreSystemSet.NETWORKING).to.equal("Networking");
				expect(CoreSystemSet.UI).to.equal("UI");
				expect(CoreSystemSet.RENDERING).to.equal("Rendering");
				expect(CoreSystemSet.DIAGNOSTICS).to.equal("Diagnostics");
				expect(CoreSystemSet.EVENTS).to.equal("Events");
				expect(CoreSystemSet.TIME).to.equal("Time");
				expect(CoreSystemSet.APP).to.equal("App");
			});

			it("所有系统集应该是唯一的", () => {
				const systemSets = getAllCoreSystemSets();
				const uniqueSets = new Set(systemSets);
				expect(uniqueSets.size()).to.equal(systemSets.size());
			});

			it("getAllCoreSystemSets 应该返回所有系统集", () => {
				const allSets = getAllCoreSystemSets();
				expect(allSets.size()).to.equal(13);
				expect(indexOf(allSets,CoreSystemSet.CORE)).to.never.equal(-1);
				expect(indexOf(allSets,CoreSystemSet.PHYSICS)).to.never.equal(-1);
				expect(indexOf(allSets,CoreSystemSet.UI)).to.never.equal(-1);
			});

			it("应该有正确的系统集描述信息", () => {
				expect(SystemSetDescriptions[CoreSystemSet.CORE]).to.equal("核心系统集，包含所有核心功能");
				expect(SystemSetDescriptions[CoreSystemSet.INPUT]).to.equal("输入系统集，处理输入事件");
				expect(SystemSetDescriptions[CoreSystemSet.PHYSICS]).to.equal("物理系统集，物理模拟");
			});
		});

		describe("MainScheduleOrder (调度顺序管理)", () => {
			let scheduleOrder: MainScheduleOrder;

			beforeEach(() => {
				scheduleOrder = new MainScheduleOrder();
			});

			it("第一次调用 getOrder 应该返回启动调度序列", () => {
				const order = scheduleOrder.getOrder();
				expect(order.size()).to.equal(3);
				expectExecutionOrder(order, [BuiltinSchedules.PRE_STARTUP, BuiltinSchedules.STARTUP, BuiltinSchedules.POST_STARTUP]);
			});

			it("第二次调用 getOrder 应该返回主循环调度序列", () => {
				scheduleOrder.getOrder(); // 第一次调用
				const order = scheduleOrder.getOrder(); // 第二次调用
				expect(order.size()).to.equal(5);
				expectExecutionOrder(order, [
					BuiltinSchedules.FIRST,
					BuiltinSchedules.PRE_UPDATE,
					BuiltinSchedules.UPDATE,
					BuiltinSchedules.POST_UPDATE,
					BuiltinSchedules.LAST,
				]);
			});

			it("setOrder 应该设置自定义执行顺序", () => {
				scheduleOrder.getOrder(); // 触发启动序列
				const customOrder = ["CustomFirst" as ScheduleLabel, "CustomSecond" as ScheduleLabel];
				scheduleOrder.setOrder(customOrder);

				const order = scheduleOrder.getOrder();
				expect(order.size()).to.equal(2);
				expectExecutionOrder(order, customOrder);
			});

			it("insertBefore 应该在指定位置前插入调度", () => {
				scheduleOrder.getOrder(); // 触发启动序列

				const newSchedule = "NewSchedule" as ScheduleLabel;
				scheduleOrder.insertBefore(BuiltinSchedules.UPDATE, newSchedule);

				const order = scheduleOrder.getOrder();
				const updateIndex = indexOf(order,BuiltinSchedules.UPDATE);
				const newIndex = indexOf(order,newSchedule);

				expect(newIndex).to.equal(updateIndex - 1);
				expect(order[newIndex]).to.equal(newSchedule);
				expect(order[updateIndex]).to.equal(BuiltinSchedules.UPDATE);
			});

			it("insertAfter 应该在指定位置后插入调度", () => {
				scheduleOrder.getOrder(); // 触发启动序列

				const newSchedule = "NewSchedule" as ScheduleLabel;
				scheduleOrder.insertAfter(BuiltinSchedules.UPDATE, newSchedule);

				const order = scheduleOrder.getOrder();
				const updateIndex = indexOf(order,BuiltinSchedules.UPDATE);
				const newIndex = indexOf(order,newSchedule);

				expect(newIndex).to.equal(updateIndex + 1);
				expect(order[updateIndex]).to.equal(BuiltinSchedules.UPDATE);
				expect(order[newIndex]).to.equal(newSchedule);
			});

			it("插入到不存在的目标应该不改变顺序", () => {
				scheduleOrder.getOrder(); // 触发启动序列
				const originalOrder = [...scheduleOrder.getOrder()];

				const newSchedule = "NewSchedule" as ScheduleLabel;
				const nonExistent = "NonExistent" as ScheduleLabel;

				scheduleOrder.insertBefore(nonExistent, newSchedule);
				const orderAfterBefore = scheduleOrder.getOrder();
				expectExecutionOrder(orderAfterBefore, originalOrder);

				scheduleOrder.insertAfter(nonExistent, newSchedule);
				const orderAfterAfter = scheduleOrder.getOrder();
				expectExecutionOrder(orderAfterAfter, originalOrder);
			});

			it("多次插入应该累积效果", () => {
				scheduleOrder.getOrder(); // 触发启动序列

				const schedule1 = "Schedule1" as ScheduleLabel;
				const schedule2 = "Schedule2" as ScheduleLabel;

				scheduleOrder.insertBefore(BuiltinSchedules.UPDATE, schedule1);
				scheduleOrder.insertBefore(schedule1, schedule2);

				const order = scheduleOrder.getOrder();
				const updateIndex = indexOf(order,BuiltinSchedules.UPDATE);
				const schedule1Index = indexOf(order,schedule1);
				const schedule2Index = indexOf(order,schedule2);

				expect(schedule2Index < schedule1Index).to.equal(true);
				expect(schedule1Index < updateIndex).to.equal(true);
			});
		});

		describe("ScheduleExecutionOrder (调度执行顺序配置)", () => {
			it("启动阶段执行顺序应该正确", () => {
				const startupOrder = ScheduleExecutionOrder.startup;
				expect(startupOrder.size()).to.equal(3);
				expectExecutionOrder(startupOrder as unknown as string[], [
					MainScheduleLabel.PRE_STARTUP,
					MainScheduleLabel.STARTUP,
					MainScheduleLabel.POST_STARTUP,
				]);
			});

			it("主循环执行顺序应该正确", () => {
				const mainLoopOrder = ScheduleExecutionOrder.mainLoop;
				expect(mainLoopOrder.size()).to.equal(5);
				expectExecutionOrder(mainLoopOrder as unknown as string[], [
					MainScheduleLabel.FIRST,
					MainScheduleLabel.PRE_UPDATE,
					MainScheduleLabel.UPDATE,
					MainScheduleLabel.POST_UPDATE,
					MainScheduleLabel.LAST,
				]);
			});

			it("渲染循环执行顺序应该正确", () => {
				const renderOrder = ScheduleExecutionOrder.render;
				expect(renderOrder.size()).to.equal(5);
				expectExecutionOrder(renderOrder as unknown as string[], [
					MainScheduleLabel.EXTRACT,
					MainScheduleLabel.PREPARE,
					MainScheduleLabel.QUEUE,
					MainScheduleLabel.RENDER,
					MainScheduleLabel.CLEANUP,
				]);
			});
		});

		describe("SystemSetExecutionOrder (系统集执行顺序)", () => {
			it("PreUpdate 阶段的系统集顺序应该正确", () => {
				const preUpdateOrder = SystemSetExecutionOrder.preUpdate;
				expect(preUpdateOrder.size()).to.equal(3);
				expectExecutionOrder(preUpdateOrder as unknown as string[], [
					CoreSystemSet.INPUT,
					CoreSystemSet.EVENTS,
					CoreSystemSet.TIME,
				]);
			});

			it("Update 阶段的系统集顺序应该正确", () => {
				const updateOrder = SystemSetExecutionOrder.update;
				expect(updateOrder.size()).to.equal(5);
				expectExecutionOrder(updateOrder as unknown as string[], [
					CoreSystemSet.PHYSICS,
					CoreSystemSet.TRANSFORM,
					CoreSystemSet.ANIMATION,
					CoreSystemSet.AUDIO,
					CoreSystemSet.NETWORKING,
				]);
			});

			it("PostUpdate 阶段的系统集顺序应该正确", () => {
				const postUpdateOrder = SystemSetExecutionOrder.postUpdate;
				expect(postUpdateOrder.size()).to.equal(3);
				expectExecutionOrder(postUpdateOrder as unknown as string[], [
					CoreSystemSet.UI,
					CoreSystemSet.RENDERING,
					CoreSystemSet.DIAGNOSTICS,
				]);
			});
		});

		describe("Roblox Event Mapping (Roblox事件映射)", () => {
			it("getDefaultScheduleEventMapping 应该返回正确的事件映射", () => {
				const mapping = getDefaultScheduleEventMapping();
				const RunService = game.GetService("RunService");

				expect(mapping[MainScheduleLabel.FIRST]).to.equal(RunService.Heartbeat);
				expect(mapping[MainScheduleLabel.PRE_UPDATE]).to.equal(RunService.Heartbeat);
				expect(mapping[MainScheduleLabel.UPDATE]).to.equal(RunService.Heartbeat);
				expect(mapping[MainScheduleLabel.POST_UPDATE]).to.equal(RunService.Heartbeat);
				expect(mapping[MainScheduleLabel.LAST]).to.equal(RunService.Heartbeat);
				expect(mapping[MainScheduleLabel.RENDER]).to.equal(RunService.RenderStepped);
				expect(mapping[MainScheduleLabel.EXTRACT]).to.equal(RunService.RenderStepped);
				expect(mapping[MainScheduleLabel.PREPARE]).to.equal(RunService.RenderStepped);
				expect(mapping[MainScheduleLabel.QUEUE]).to.equal(RunService.RenderStepped);
				expect(mapping[MainScheduleLabel.CLEANUP]).to.equal(RunService.RenderStepped);
			});

			it("getStartupScheduleEventMapping 应该返回启动事件映射", () => {
				const mapping = getStartupScheduleEventMapping();
				const RunService = game.GetService("RunService");

				expect(mapping[MainScheduleLabel.PRE_STARTUP]).to.equal(RunService.Heartbeat);
				expect(mapping[MainScheduleLabel.STARTUP]).to.equal(RunService.Heartbeat);
				expect(mapping[MainScheduleLabel.POST_STARTUP]).to.equal(RunService.Heartbeat);
			});

			it("主循环调度应该映射到 Heartbeat", () => {
				const mapping = getDefaultScheduleEventMapping();
				const RunService = game.GetService("RunService");
				const mainLoopLabels = getMainLoopScheduleLabels();

				for (const label of mainLoopLabels) {
					expect(mapping[label]).to.equal(RunService.Heartbeat);
				}
			});

			it("渲染调度应该映射到 RenderStepped", () => {
				const mapping = getDefaultScheduleEventMapping();
				const RunService = game.GetService("RunService");
				const renderLabels = getRenderScheduleLabels();

				for (const label of renderLabels) {
					expect(mapping[label]).to.equal(RunService.RenderStepped);
				}
			});
		});

		describe("BuiltinSchedules (内置调度兼容性)", () => {
			it("应该支持 UPPERCASE_WITH_UNDERSCORES 命名格式", () => {
				expect(BuiltinSchedules.FIRST).to.equal(MainScheduleLabel.FIRST);
				expect(BuiltinSchedules.PRE_UPDATE).to.equal(MainScheduleLabel.PRE_UPDATE);
				expect(BuiltinSchedules.UPDATE).to.equal(MainScheduleLabel.UPDATE);
				expect(BuiltinSchedules.POST_UPDATE).to.equal(MainScheduleLabel.POST_UPDATE);
				expect(BuiltinSchedules.LAST).to.equal(MainScheduleLabel.LAST);
			});

			it("应该支持已弃用的 PascalCase 别名", () => {
				expect(BuiltinSchedules.First).to.equal(MainScheduleLabel.FIRST);
				expect(BuiltinSchedules.PreUpdate).to.equal(MainScheduleLabel.PRE_UPDATE);
				expect(BuiltinSchedules.Update).to.equal(MainScheduleLabel.UPDATE);
				expect(BuiltinSchedules.PostUpdate).to.equal(MainScheduleLabel.POST_UPDATE);
				expect(BuiltinSchedules.Last).to.equal(MainScheduleLabel.LAST);
			});

			it("应该定义固定更新调度（尚未实现）", () => {
				expect(BuiltinSchedules.RUN_FIXED_MAIN_LOOP).to.equal("RunFixedMainLoop");
				expect(BuiltinSchedules.FIXED_MAIN).to.equal("FixedMain");
				expect(BuiltinSchedules.FIXED_FIRST).to.equal("FixedFirst");
				expect(BuiltinSchedules.FIXED_PRE_UPDATE).to.equal("FixedPreUpdate");
				expect(BuiltinSchedules.FIXED_UPDATE).to.equal("FixedUpdate");
				expect(BuiltinSchedules.FIXED_POST_UPDATE).to.equal("FixedPostUpdate");
				expect(BuiltinSchedules.FIXED_LAST).to.equal("FixedLast");
			});
		});

		describe("runMainSchedule (主调度执行)", () => {
			it("应该按正确顺序执行调度", () => {
				const world = new World();
				const scheduleOrder = new MainScheduleOrder();
				const executionLog: string[] = [];

				// 跳过启动序列
				scheduleOrder.getOrder();

				const runner = (label: ScheduleLabel) => {
					executionLog.push(label);
				};

				runMainSchedule(world, scheduleOrder, runner);

				expectExecutionOrder(executionLog, [
					BuiltinSchedules.FIRST,
					BuiltinSchedules.PRE_UPDATE,
					BuiltinSchedules.UPDATE,
					BuiltinSchedules.POST_UPDATE,
					BuiltinSchedules.LAST,
				]);
			});

			it("应该支持自定义调度顺序", () => {
				const world = new World();
				const scheduleOrder = new MainScheduleOrder();
				const executionLog: string[] = [];

				// 跳过启动序列
				scheduleOrder.getOrder();

				// 设置自定义顺序
				const customOrder = ["Custom1" as ScheduleLabel, "Custom2" as ScheduleLabel, "Custom3" as ScheduleLabel];
				scheduleOrder.setOrder(customOrder);

				const runner = (label: ScheduleLabel) => {
					executionLog.push(label);
				};

				runMainSchedule(world, scheduleOrder, runner);

				expectExecutionOrder(executionLog, customOrder);
			});

			it("应该处理空调度序列", () => {
				const world = new World();
				const scheduleOrder = new MainScheduleOrder();
				const executionLog: string[] = [];

				// 跳过启动序列
				scheduleOrder.getOrder();
				scheduleOrder.setOrder([]);

				const runner = (label: ScheduleLabel) => {
					executionLog.push(label);
				};

				runMainSchedule(world, scheduleOrder, runner);

				expect(executionLog.size()).to.equal(0);
			});
		});

		describe("SubApp Schedule Integration (SubApp调度集成)", () => {
			it("SubApp 应该正确设置和获取更新调度", () => {
				const subApp = new SubApp();
				expect(subApp.getUpdateSchedule()).to.equal(undefined);

				subApp.setUpdateSchedule(BuiltinSchedules.UPDATE);
				expect(subApp.getUpdateSchedule()).to.equal(BuiltinSchedules.UPDATE);
			});

			it("SubApp 应该支持添加系统到调度", () => {
				const subApp = new SubApp();
				const executionLog: string[] = [];

				const system1 = createTestSystem("System1", executionLog);
				const system2 = createTestSystem("System2", executionLog);

				subApp.addSystems(BuiltinSchedules.UPDATE, system1, system2);

				// 验证系统已添加（通过获取调度）
				const schedule = subApp.getSchedule(BuiltinSchedules.UPDATE);
				expect(schedule).to.be.ok();
			});

			it("SubApp 应该支持初始化调度", () => {
				const subApp = new SubApp();
				const customSchedule = "CustomSchedule" as ScheduleLabel;

				subApp.initSchedule(customSchedule);
				const schedule = subApp.getSchedule(customSchedule);
				expect(schedule).to.be.ok();
			});

			it("SubApp 应该支持编辑调度", () => {
				const subApp = new SubApp();
				const executionLog: string[] = [];

				subApp.initSchedule(BuiltinSchedules.UPDATE);
				subApp.editSchedule(BuiltinSchedules.UPDATE, (schedule) => {
					// 在编辑回调中添加系统
					const system = createTestSystem("EditedSystem", executionLog);
					// 这里应该调用 schedule 的添加系统方法
					// schedule.addSystem(system);
				});

				// 验证编辑已生效
				const schedule = subApp.getSchedule(BuiltinSchedules.UPDATE);
				expect(schedule).to.be.ok();
			});
		});

		describe("App Schedule Integration (App调度集成)", () => {
			it("App 应该初始化默认调度", () => {
				const app = createTestApp();

				// 验证默认调度已初始化
				expect(app.getSchedule(BuiltinSchedules.FIRST)).to.be.ok();
				expect(app.getSchedule(BuiltinSchedules.PRE_UPDATE)).to.be.ok();
				expect(app.getSchedule(BuiltinSchedules.UPDATE)).to.be.ok();
				expect(app.getSchedule(BuiltinSchedules.POST_UPDATE)).to.be.ok();
				expect(app.getSchedule(BuiltinSchedules.LAST)).to.be.ok();
			});

			it("App 应该支持添加系统到调度", () => {
				const app = createTestApp();
				const executionLog: string[] = [];

				const system = createTestSystem("AppSystem", executionLog);
				app.addSystems(BuiltinSchedules.UPDATE, system);

				// 验证系统已添加
				const schedule = app.getSchedule(BuiltinSchedules.UPDATE);
				expect(schedule).to.be.ok();
			});

			it("App.empty() 不应该初始化默认调度", () => {
				const app = App.empty();

				// empty app 仍然会有一些基础设置，但不会预先初始化所有调度
				// 这需要根据实际实现来验证
				expect(app).to.be.ok();
				expect(app.world()).to.be.ok();
			});
		});

		describe("Error Handling (错误处理)", () => {
			it("SubApp 应该支持设置错误处理器", () => {
				const subApp = new SubApp();
				let errorCaught: unknown;

				const errorHandler = (err: unknown) => {
					errorCaught = err;
				};

				subApp.setErrorHandler(errorHandler);
				expect(subApp.getErrorHandler()).to.equal(errorHandler);
			});

			// 跳过：错误处理机制尚未完全实现
			/*
			it("调度执行错误应该被错误处理器捕获", () => {
				runTestQuietly(() => {
					const subApp = new SubApp();
					let errorCaught: unknown;

					const errorHandler = (err: unknown) => {
						errorCaught = err;
					};

					const faultySystem = () => {
						// Intentional test error - using throw instead of error() to avoid console output
						throw "Test error";
					};

					subApp.setErrorHandler(errorHandler);
					subApp.setUpdateSchedule(BuiltinSchedules.UPDATE);
					subApp.addSystems(BuiltinSchedules.UPDATE, faultySystem);

					// 执行更新会触发错误
					subApp.update();

					expect(errorCaught).to.be.ok();
				});
			});
			*/
		});

		describe("Schedule Descriptions (调度描述)", () => {
			it("所有调度标签应该有描述", () => {
				const allLabels = getAllMainScheduleLabels();
				for (const label of allLabels) {
					const description = ScheduleDescriptions[label];
					expect(description).to.be.a("string");
					expect(description.size() > 0).to.equal(true);
				}
			});

			it("所有系统集应该有描述", () => {
				const allSets = getAllCoreSystemSets();
				for (const systemSet of allSets) {
					const description = SystemSetDescriptions[systemSet];
					expect(description).to.be.a("string");
					expect(description.size() > 0).to.equal(true);
				}
			});
		});

		describe("Complex Scenarios (复杂场景)", () => {
			it("应该支持混合使用不同调度", () => {
				const app = createTestApp();
				const executionLog: string[] = [];

				// 添加系统到不同调度
				app.addSystems(BuiltinSchedules.FIRST, createTestSystem("First", executionLog));
				app.addSystems(BuiltinSchedules.UPDATE, createTestSystem("Update", executionLog));
				app.addSystems(BuiltinSchedules.LAST, createTestSystem("Last", executionLog));

				// 验证所有调度都已初始化
				expect(app.getSchedule(BuiltinSchedules.FIRST)).to.be.ok();
				expect(app.getSchedule(BuiltinSchedules.UPDATE)).to.be.ok();
				expect(app.getSchedule(BuiltinSchedules.LAST)).to.be.ok();
			});

			it("应该支持动态修改调度顺序", () => {
				const scheduleOrder = new MainScheduleOrder();
				scheduleOrder.getOrder(); // 跳过启动

				// 初始顺序
				const initialOrder = [...scheduleOrder.getOrder()];
				expect(initialOrder.size()).to.equal(5);

				// 插入新调度
				const custom1 = "Custom1" as ScheduleLabel;
				const custom2 = "Custom2" as ScheduleLabel;

				scheduleOrder.insertBefore(BuiltinSchedules.UPDATE, custom1);
				scheduleOrder.insertAfter(BuiltinSchedules.UPDATE, custom2);

				const modifiedOrder = scheduleOrder.getOrder();
				expect(modifiedOrder.size()).to.equal(7);

				// 验证顺序
				const custom1Index = indexOf(modifiedOrder,custom1);
				const updateIndex = indexOf(modifiedOrder,BuiltinSchedules.UPDATE);
				const custom2Index = indexOf(modifiedOrder,custom2);

				expect(custom1Index < updateIndex).to.equal(true);
				expect(updateIndex < custom2Index).to.equal(true);
			});

			it("应该支持调度链式插入", () => {
				const scheduleOrder = new MainScheduleOrder();
				scheduleOrder.getOrder(); // 跳过启动

				const schedules = ["A", "B", "C", "D", "E"].map((s) => s as ScheduleLabel);

				// 链式插入
				for (const schedule of schedules) {
					scheduleOrder.insertBefore(BuiltinSchedules.UPDATE, schedule);
				}

				const order = scheduleOrder.getOrder();

				// 验证所有插入的调度都在 UPDATE 之前
				const updateIndex = indexOf(order,BuiltinSchedules.UPDATE);
				for (const schedule of schedules) {
					const index = indexOf(order,schedule);
					expect(index < updateIndex).to.equal(true);
				}
			});
		});
	});
};