/**
 * @fileoverview Bevy ECS 调度器测试
 * 验证新的 Schedule 和 Schedules 系统功能
 */

import { BevyWorld } from "../bevy-world";
import { Schedule, Schedules, SystemConfig, SystemSetConfig } from "../schedule/index";
import { MainScheduleLabel, CoreSystemSet } from "../../bevy_app/main-schedule";
import { ResourceManager } from "../resource";
import { CommandBuffer } from "../command-buffer";
import { AppContext } from "../../bevy_app";
import { Context } from "../types";

export = () => {
	describe("Schedule", () => {
		let schedule: Schedule;
		let world: BevyWorld;

		beforeEach(() => {
			schedule = new Schedule(MainScheduleLabel.UPDATE);
			world = new BevyWorld();
		});

		afterEach(() => {
			schedule.reset();
		});

		describe("基本功能", () => {
			it("应该创建调度器并返回正确的标识符", () => {
				expect(schedule.getLabel()).to.equal(MainScheduleLabel.UPDATE);
			});

			it("应该添加系统并返回系统ID", () => {
				const systemConfig: SystemConfig = {
					system: () => {},
					name: "test_system",
				};

				const systemId = schedule.addSystem(systemConfig);

				expect(systemId).to.be.a("string");
				// 使用 gsub 检查字符串包含
				const [replaced] = systemId.gsub("test_system", "");
				expect(replaced.size() !== systemId.size()).to.equal(true);
			});

			it("应该获取调度器状态", () => {
				const initialState = schedule.getState();
				expect(initialState.compiled).to.equal(false);
				expect(initialState.systemCount).to.equal(0);
				expect(initialState.setCount).to.equal(0);

				schedule.addSystem({
					system: () => {},
					name: "test_system",
				});

				const afterAddState = schedule.getState();
				expect(afterAddState.systemCount).to.equal(1);
			});
		});

		describe("系统配置", () => {
			it("应该配置系统集", () => {
				const setConfig: SystemSetConfig = {
					name: CoreSystemSet.INPUT,
				};

				schedule.configureSet(setConfig);

				const graph = schedule.getGraph();
				expect(graph.systemSets.has(CoreSystemSet.INPUT)).to.equal(true);
			});

			it("应该支持系统优先级", () => {
				const executionOrder: Array<string> = [];

				schedule.addSystem({
					system: () => executionOrder.push("low"),
					name: "low_priority",
					priority: 10,
				});

				schedule.addSystem({
					system: () => executionOrder.push("high"),
					name: "high_priority",
					priority: -10,
				});

				const compiledSystems = schedule.compile();
				expect(compiledSystems.size()).to.equal(2);

				// 执行系统模拟
				for (const loopSystem of compiledSystems) {
					loopSystem.system(world, {} as AppContext);
				}

				expect(executionOrder[0]).to.equal("high");
				expect(executionOrder[1]).to.equal("low");
			});

			it("应该支持运行条件", () => {
				let systemCalled = false;
				let conditionCalled = false;

				schedule.addSystem({
					system: () => {
						systemCalled = true;
					},
					name: "conditional_system",
					runCondition: () => {
						conditionCalled = true;
						return false;
					},
				});

				const compiledSystems = schedule.compile();
				expect(compiledSystems.size()).to.equal(1);

				// 执行系统
				for (const loopSystem of compiledSystems) {
					loopSystem.system(world, {} as Context);
				}

				expect(conditionCalled).to.equal(true);
				expect(systemCalled).to.equal(false);
			});
		});

		describe("系统依赖", () => {
			it("应该支持系统依赖关系", () => {
				const executionOrder: Array<string> = [];

				const systemA = () => executionOrder.push("A");
				const systemB = () => executionOrder.push("B");

				schedule.addSystem({
					system: systemA,
					name: "system_a",
				});

				schedule.addSystem({
					system: systemB,
					name: "system_b",
					after: [systemA],
				});

				const compiledSystems = schedule.compile();

				// 执行系统
				for (const loopSystem of compiledSystems) {
					loopSystem.system(world, {} as Context);
				}

				expect(executionOrder[0]).to.equal("A");
				expect(executionOrder[1]).to.equal("B");
			});

			it("应该支持系统集依赖", () => {
				const executionOrder: Array<string> = [];

				// 配置系统集
				schedule.configureSet({
					name: CoreSystemSet.INPUT,
				});

				schedule.configureSet({
					name: CoreSystemSet.PHYSICS,
					after: [CoreSystemSet.INPUT],
				});

				// 添加系统到不同的系统集
				schedule.addSystem({
					system: () => executionOrder.push("Physics"),
					name: "physics_system",
					inSet: CoreSystemSet.PHYSICS,
				});

				schedule.addSystem({
					system: () => executionOrder.push("Input"),
					name: "input_system",
					inSet: CoreSystemSet.INPUT,
				});

				const compiledSystems = schedule.compile();

				// 执行系统
				for (const loopSystem of compiledSystems) {
					loopSystem.system(world, {} as AppContext);
				}

				expect(executionOrder[0]).to.equal("Input");
				expect(executionOrder[1]).to.equal("Physics");
			});

			it("应该检测循环依赖", () => {
				const systemA = () => {};
				const systemB = () => {};

				schedule.addSystem({
					system: systemA,
					name: "system_a",
					after: [systemB],
				});

				schedule.addSystem({
					system: systemB,
					name: "system_b",
					after: [systemA],
				});

				expect(() => schedule.compile()).to.throw();
			});
		});

		describe("编译", () => {
			it("应该编译调度器", () => {
				schedule.addSystem({
					system: () => {},
					name: "test_system",
				});

				const compiledSystems = schedule.compile();

				expect(compiledSystems.size()).to.equal(1);
				expect(schedule.getState().compiled).to.equal(true);
			});

			it("编译后不应该允许添加系统", () => {
				schedule.compile();

				expect(() => {
					schedule.addSystem({
						system: () => {},
						name: "after_compile",
					});
				}).to.throw();
			});

			it("应该生成调度器图", () => {
				schedule.addSystem({
					system: () => {},
					name: "test_system",
				});

				const graph = schedule.getGraph();

				expect(graph.systems.size()).to.equal(1);
				expect(graph.dependencies.size()).to.equal(1);
			});
		});

		describe("错误处理", () => {
			it("应该防止重复添加相同系统", () => {
				const testSystem = () => {};

				schedule.addSystem({
					system: testSystem,
					name: "duplicate_system",
				});

				expect(() => {
					schedule.addSystem({
						system: testSystem,
						name: "different_name_same_system",
					});
				}).to.throw();
			});

			it("应该在系统执行错误时提供错误处理", () => {
				let errorCaught = false;

				schedule.addSystem({
					system: () => {
						// This is an intentional test error - using throw instead of error() to avoid console output
						throw "Test error";
					},
					name: "error_system",
				});

				const compiledSystems = schedule.compile();

				// 捕获错误
				for (const loopSystem of compiledSystems) {
					try {
						loopSystem.system(world, {} as AppContext);
					} catch {
						errorCaught = true;
					}
				}

				expect(errorCaught).to.equal(true);
			});
		});
	});

	describe("Schedules", () => {
		let schedules: Schedules;
		let world: BevyWorld;

		beforeEach(() => {
			world = new BevyWorld();
			schedules = new Schedules(world, {} as AppContext);
		});

		afterEach(() => {
			schedules.reset();
		});

		describe("基本功能", () => {
			it("应该创建和管理多个调度器", () => {
				const updateSchedule = schedules.getSchedule(MainScheduleLabel.UPDATE);
				const renderSchedule = schedules.getSchedule(MainScheduleLabel.RENDER);

				expect(updateSchedule.getLabel()).to.equal(MainScheduleLabel.UPDATE);
				expect(renderSchedule.getLabel()).to.equal(MainScheduleLabel.RENDER);
				expect(updateSchedule).to.never.equal(renderSchedule);
			});

			it("应该检查调度器是否存在", () => {
				schedules.getSchedule(MainScheduleLabel.UPDATE);

				expect(schedules.hasSchedule(MainScheduleLabel.UPDATE)).to.equal(true);
				expect(schedules.hasSchedule(MainScheduleLabel.RENDER)).to.equal(false);
			});

			it("应该添加系统到指定调度器", () => {
				const systemId = schedules.addSystemToSchedule(MainScheduleLabel.UPDATE, {
					system: () => {},
					name: "test_system",
				});

				expect(systemId).to.be.a("string");
				expect(schedules.hasSchedule(MainScheduleLabel.UPDATE)).to.equal(true);
			});

			it("应该批量添加系统", () => {
				const systemConfigs: Array<SystemConfig> = [
					{
						system: () => {},
						name: "system_1",
					},
					{
						system: () => {},
						name: "system_2",
					},
				];

				const systemIds = schedules.addSystemsToSchedule(MainScheduleLabel.UPDATE, systemConfigs);

				expect(systemIds.size()).to.equal(2);
			});
		});

		describe("编译和执行", () => {
			it("应该编译所有调度器", () => {
				schedules.addSystemToSchedule(MainScheduleLabel.UPDATE, {
					system: () => {},
					name: "update_system",
				});

				schedules.addSystemToSchedule(MainScheduleLabel.RENDER, {
					system: () => {},
					name: "render_system",
				});

				schedules.compile();

				expect(schedules.isCompiled()).to.equal(true);
			});

			it("应该获取总体统计信息", () => {
				schedules.addSystemToSchedule(MainScheduleLabel.UPDATE, {
					system: () => {},
					name: "system_1",
				});

				schedules.addSystemToSchedule(MainScheduleLabel.RENDER, {
					system: () => {},
					name: "system_2",
				});

				const stats = schedules.getOverallStats();

				expect(stats.totalSchedules).to.equal(2);
				expect(stats.totalSystems).to.equal(2);
				expect(stats.compiled).to.equal(false);
			});

			it("应该获取所有调度器标识符", () => {
				schedules.getSchedule(MainScheduleLabel.UPDATE);
				schedules.getSchedule(MainScheduleLabel.RENDER);

				const labels = schedules.getScheduleLabels();

				expect(labels.size()).to.equal(2);
				expect(labels.includes(MainScheduleLabel.UPDATE)).to.equal(true);
				expect(labels.includes(MainScheduleLabel.RENDER)).to.equal(true);
			});
		});

		describe("便捷方法", () => {
			it("应该支持添加系统到多个调度器", () => {
				const testSystem = () => {};
				const scheduleLabels = [MainScheduleLabel.UPDATE, MainScheduleLabel.RENDER];

				const systemIds = schedules.addSystemToSchedules(testSystem, scheduleLabels);

				expect(systemIds.size()).to.equal(2);
				expect(systemIds.has(MainScheduleLabel.UPDATE)).to.equal(true);
				expect(systemIds.has(MainScheduleLabel.RENDER)).to.equal(true);
			});
		});

		describe("状态管理", () => {
			it("应该获取所有调度器状态", () => {
				schedules.addSystemToSchedule(MainScheduleLabel.UPDATE, {
					system: () => {},
					name: "test_system",
				});

				const states = schedules.getStates();

				expect(states.size()).to.equal(1);
				expect(states.has(MainScheduleLabel.UPDATE)).to.equal(true);
			});

			it("应该重置所有调度器", () => {
				schedules.addSystemToSchedule(MainScheduleLabel.UPDATE, {
					system: () => {},
					name: "test_system",
				});

				schedules.reset();

				const stats = schedules.getOverallStats();
				expect(stats.totalSchedules).to.equal(0);
				expect(stats.totalSystems).to.equal(0);
			});
		});
	});
};
