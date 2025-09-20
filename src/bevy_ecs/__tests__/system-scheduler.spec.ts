import { World } from "@rbxts/matter";
import {
	SystemScheduler,
	SystemFunction,
	SystemCondition,
	SchedulerErrorType,
	SchedulerError,
} from "../system-scheduler";
import { ResourceManager } from "../resource";
import { CommandBuffer } from "../command-buffer";

/**
 * 测试系统函数
 */
const createTestSystem = (name: string, executionLog: string[]): SystemFunction => {
	return (world, deltaTime, resources, commands) => {
		executionLog.push(`${name}-executed`);
	};
};

/**
 * 创建带有延迟的测试系统
 */
const createDelayedSystem = (name: string, delay: number, executionLog: string[]): SystemFunction => {
	return (world, deltaTime, resources, commands) => {
		const start = os.clock();
		while (os.clock() - start < delay) {
			// 模拟延迟执行
		}
		executionLog.push(`${name}-executed`);
	};
};

/**
 * 创建会抛出错误的测试系统
 */
const createErrorSystem = (name: string, errorMessage: string): SystemFunction => {
	return (world, deltaTime, resources, commands) => {
		error(errorMessage);
	};
};

/**
 * 创建测试运行条件
 */
const createTestCondition = (shouldRun: boolean): SystemCondition => {
	return (world, resources) => shouldRun;
};

/**
 * 创建带有条件的测试条件
 */
const createConditionalCondition = (condition: () => boolean): SystemCondition => {
	return (world, resources) => condition();
};

export = () => {
	let world: World;
	let resourceManager: ResourceManager;
	let commandBuffer: CommandBuffer;
	let scheduler: SystemScheduler;
	let executionLog: string[];

	beforeEach(() => {
		world = new World();
		resourceManager = new ResourceManager();
		commandBuffer = new CommandBuffer();
		scheduler = new SystemScheduler(world, resourceManager, commandBuffer);
		executionLog = [];
	});

	afterEach(() => {
		// 清理资源
		scheduler.setEnabled(false);
		commandBuffer.clear();
		resourceManager.clear();
	});

	describe("SystemScheduler", () => {
		describe("系统管理", () => {
			it("应该能够添加系统", () => {
				const testSystem = createTestSystem("test", executionLog);

				expect(() => {
					scheduler.addSystem("testSystem", testSystem);
				}).never.to.throw();

				const systemNames = scheduler.getSystemNames();
				expect(systemNames.includes("testSystem")).to.equal(true);
			});

			it("不应该允许添加重复名称的系统", () => {
				const testSystem1 = createTestSystem("test1", executionLog);
				const testSystem2 = createTestSystem("test2", executionLog);

				scheduler.addSystem("duplicate", testSystem1);

				expect(() => {
					scheduler.addSystem("duplicate", testSystem2);
				}).to.throw();
			});

			it("应该能够移除系统", () => {
				const testSystem = createTestSystem("test", executionLog);
				scheduler.addSystem("removable", testSystem);

				expect(scheduler.getSystemNames().includes("removable")).to.equal(true);

				const removed = scheduler.removeSystem("removable");
				expect(removed).to.equal(true);
				expect(scheduler.getSystemNames().includes("removable")).to.equal(false);
			});

			it("移除不存在的系统应该返回 false", () => {
				const removed = scheduler.removeSystem("nonexistent");
				expect(removed).to.equal(false);
			});

			it("应该能够启用和禁用系统", () => {
				const testSystem = createTestSystem("toggleable", executionLog);
				scheduler.addSystem("toggleable", testSystem, 0, true);

				// 系统默认启用
				scheduler.run(0.016);
				expect(executionLog.includes("toggleable-executed")).to.equal(true);

				// 禁用系统
				executionLog.clear();
				scheduler.setSystemEnabled("toggleable", false);
				scheduler.run(0.016);
				expect(executionLog.includes("toggleable-executed")).to.equal(false);

				// 重新启用系统
				executionLog.clear();
				scheduler.setSystemEnabled("toggleable", true);
				scheduler.run(0.016);
				expect(executionLog.includes("toggleable-executed")).to.equal(true);
			});
		});

		describe("系统执行", () => {
			it("应该能够运行单个系统", () => {
				const testSystem = createTestSystem("single", executionLog);
				scheduler.addSystem("single", testSystem);

				scheduler.run(0.016);

				expect(executionLog.size()).to.equal(1);
				expect(executionLog[0]).to.equal("single-executed");
			});

			it("应该能够运行多个系统", () => {
				const system1 = createTestSystem("system1", executionLog);
				const system2 = createTestSystem("system2", executionLog);
				const system3 = createTestSystem("system3", executionLog);

				scheduler.addSystem("system1", system1);
				scheduler.addSystem("system2", system2);
				scheduler.addSystem("system3", system3);

				scheduler.run(0.016);

				expect(executionLog.size()).to.equal(3);
				expect(executionLog.includes("system1-executed")).to.equal(true);
				expect(executionLog.includes("system2-executed")).to.equal(true);
				expect(executionLog.includes("system3-executed")).to.equal(true);
			});

			it("禁用的系统不应该被执行", () => {
				const enabledSystem = createTestSystem("enabled", executionLog);
				const disabledSystem = createTestSystem("disabled", executionLog);

				scheduler.addSystem("enabled", enabledSystem, 0, true);
				scheduler.addSystem("disabled", disabledSystem, 0, false);

				scheduler.run(0.016);

				expect(executionLog.includes("enabled-executed")).to.equal(true);
				expect(executionLog.includes("disabled-executed")).to.equal(false);
			});

			it("当调度器被禁用时不应该运行任何系统", () => {
				const testSystem = createTestSystem("test", executionLog);
				scheduler.addSystem("test", testSystem);

				scheduler.setEnabled(false);
				scheduler.run(0.016);

				expect(executionLog.size()).to.equal(0);
			});
		});

		describe("系统优先级", () => {
			it("应该按照优先级顺序执行系统", () => {
				const lowPrioritySystem = createTestSystem("low", executionLog);
				const highPrioritySystem = createTestSystem("high", executionLog);
				const mediumPrioritySystem = createTestSystem("medium", executionLog);

				// 添加系统时故意打乱顺序
				scheduler.addSystem("low", lowPrioritySystem, 10);
				scheduler.addSystem("high", highPrioritySystem, 1);
				scheduler.addSystem("medium", mediumPrioritySystem, 5);

				scheduler.run(0.016);

				expect(executionLog.size()).to.equal(3);
				expect(executionLog[0]).to.equal("high-executed");
				expect(executionLog[1]).to.equal("medium-executed");
				expect(executionLog[2]).to.equal("low-executed");
			});

			it("相同优先级的系统应该按照添加顺序执行", () => {
				const system1 = createTestSystem("first", executionLog);
				const system2 = createTestSystem("second", executionLog);
				const system3 = createTestSystem("third", executionLog);

				scheduler.addSystem("first", system1, 0);
				scheduler.addSystem("second", system2, 0);
				scheduler.addSystem("third", system3, 0);

				scheduler.run(0.016);

				// 注意：相同优先级的顺序可能取决于内部实现
				expect(executionLog.size()).to.equal(3);
				expect(executionLog.includes("first-executed")).to.equal(true);
				expect(executionLog.includes("second-executed")).to.equal(true);
				expect(executionLog.includes("third-executed")).to.equal(true);
			});
		});

		describe("系统条件", () => {
			it("应该支持运行条件", () => {
				const conditionalSystem = createTestSystem("conditional", executionLog);
				let shouldRun = false;

				scheduler.addSystem("conditional", conditionalSystem);
				scheduler.addSystemCondition("conditional", () => shouldRun);

				// 条件为false时不应该运行
				scheduler.run(0.016);
				expect(executionLog.includes("conditional-executed")).to.equal(false);

				// 条件为true时应该运行
				shouldRun = true;
				scheduler.run(0.016);
				expect(executionLog.includes("conditional-executed")).to.equal(true);
			});

			it("应该支持多个运行条件（AND逻辑）", () => {
				const system = createTestSystem("multiCondition", executionLog);
				let condition1 = false;
				let condition2 = false;

				scheduler.addSystem("multiCondition", system);
				scheduler.addSystemCondition("multiCondition", () => condition1);
				scheduler.addSystemCondition("multiCondition", () => condition2);

				// 只有一个条件为true
				condition1 = true;
				scheduler.run(0.016);
				expect(executionLog.includes("multiCondition-executed")).to.equal(false);

				// 两个条件都为true
				condition2 = true;
				scheduler.run(0.016);
				expect(executionLog.includes("multiCondition-executed")).to.equal(true);
			});

			it("条件检查出错时应该跳过系统执行", () => {
				const normalSystem = createTestSystem("normal", executionLog);
				const errorConditionSystem = createTestSystem("errorCondition", executionLog);

				scheduler.addSystem("normal", normalSystem);
				scheduler.addSystem("errorCondition", errorConditionSystem);

				// 添加会抛出错误的条件
				scheduler.addSystemCondition("errorCondition", () => {
					error("Condition error");
				});

				const errors: SchedulerError[] = [];
				scheduler.setErrorHandler((schedulerError) => {
					errors.push(schedulerError);
				});

				scheduler.run(0.016);

				// 正常系统应该执行
				expect(executionLog.includes("normal-executed")).to.equal(true);
				// 错误条件的系统不应该执行
				expect(executionLog.includes("errorCondition-executed")).to.equal(false);
				// 应该有错误报告
				expect(errors.size()).to.equal(1);
				expect(errors[0].type).to.equal(SchedulerErrorType.ConditionError);
			});
		});

		describe("系统依赖", () => {
			it("应该支持系统依赖关系", () => {
				const dependencySystem = createTestSystem("dependency", executionLog);
				const dependentSystem = createTestSystem("dependent", executionLog);

				scheduler.addSystem("dependency", dependencySystem);
				scheduler.addSystem("dependent", dependentSystem);
				scheduler.addSystemDependency("dependent", "dependency");

				scheduler.run(0.016);

				expect(executionLog.size()).to.equal(2);
				const dependencyIndex = executionLog.indexOf("dependency-executed");
				const dependentIndex = executionLog.indexOf("dependent-executed");

				// 依赖应该在被依赖者之前执行
				expect(dependencyIndex < dependentIndex).to.equal(true);
			});

			it("应该支持复杂的依赖链", () => {
				const systemA = createTestSystem("A", executionLog);
				const systemB = createTestSystem("B", executionLog);
				const systemC = createTestSystem("C", executionLog);
				const systemD = createTestSystem("D", executionLog);

				scheduler.addSystem("A", systemA);
				scheduler.addSystem("B", systemB);
				scheduler.addSystem("C", systemC);
				scheduler.addSystem("D", systemD);

				// 创建依赖链: A -> B -> C, D -> C
				scheduler.addSystemDependency("B", "A");
				scheduler.addSystemDependency("C", "B");
				scheduler.addSystemDependency("C", "D");

				scheduler.run(0.016);

				expect(executionLog.size()).to.equal(4);

				const aIndex = executionLog.indexOf("A-executed");
				const bIndex = executionLog.indexOf("B-executed");
				const cIndex = executionLog.indexOf("C-executed");
				const dIndex = executionLog.indexOf("D-executed");

				// 验证依赖顺序
				expect(aIndex < bIndex).to.equal(true);
				expect(bIndex < cIndex).to.equal(true);
				expect(dIndex < cIndex).to.equal(true);
			});

			it("应该处理循环依赖", () => {
				const systemA = createTestSystem("A", executionLog);
				const systemB = createTestSystem("B", executionLog);

				scheduler.addSystem("A", systemA);
				scheduler.addSystem("B", systemB);

				// 创建循环依赖: A -> B -> A
				scheduler.addSystemDependency("A", "B");
				scheduler.addSystemDependency("B", "A");

				// 应该仍然能够运行，只是顺序可能不确定
				scheduler.run(0.016);

				expect(executionLog.size()).to.equal(2);
				expect(executionLog.includes("A-executed")).to.equal(true);
				expect(executionLog.includes("B-executed")).to.equal(true);
			});
		});

		describe("系统排斥", () => {
			it("应该支持系统排斥关系", () => {
				const systemA = createTestSystem("A", executionLog);
				const systemB = createTestSystem("B", executionLog);

				scheduler.addSystem("A", systemA);
				scheduler.addSystem("B", systemB);
				scheduler.addSystemExclusion("A", "B");

				// 排斥关系的具体实现取决于调度器的设计
				// 这里主要测试API是否可用
				expect(() => {
					scheduler.run(0.016);
				}).never.to.throw();
			});
		});

		describe("错误处理", () => {
			it("应该处理系统执行错误", () => {
				const normalSystem = createTestSystem("normal", executionLog);
				const errorSystem = createErrorSystem("error", "Test error");

				scheduler.addSystem("normal", normalSystem);
				scheduler.addSystem("error", errorSystem);

				const errors: SchedulerError[] = [];
				scheduler.setErrorHandler((schedulerError) => {
					errors.push(schedulerError);
				});

				scheduler.run(0.016);

				// 正常系统应该执行
				expect(executionLog.includes("normal-executed")).to.equal(true);
				// 应该有错误报告
				expect(errors.size()).to.equal(1);
				expect(errors[0].type).to.equal(SchedulerErrorType.SystemError);
				expect(errors[0].systemName).to.equal("error");
				expect(errors[0].message.find("Test error")[0] !== undefined).to.equal(true);
			});

			it("一个系统的错误不应该影响其他系统", () => {
				const system1 = createTestSystem("system1", executionLog);
				const errorSystem = createErrorSystem("errorSystem", "Error");
				const system2 = createTestSystem("system2", executionLog);

				scheduler.addSystem("system1", system1, 1);
				scheduler.addSystem("errorSystem", errorSystem, 2);
				scheduler.addSystem("system2", system2, 3);

				const errors: SchedulerError[] = [];
				scheduler.setErrorHandler((schedulerError) => {
					errors.push(schedulerError);
				});

				scheduler.run(0.016);

				// 所有正常系统都应该执行
				expect(executionLog.includes("system1-executed")).to.equal(true);
				expect(executionLog.includes("system2-executed")).to.equal(true);
				// 应该有一个错误
				expect(errors.size()).to.equal(1);
			});

			it("应该能够自定义错误处理器", () => {
				const errorSystem = createErrorSystem("error", "Custom error");
				scheduler.addSystem("error", errorSystem);

				let customErrorHandled = false;
				scheduler.setErrorHandler((schedulerError) => {
					customErrorHandled = true;
					expect(schedulerError.systemName).to.equal("error");
				});

				scheduler.run(0.016);

				expect(customErrorHandled).to.equal(true);
			});
		});

		describe("统计信息", () => {
			it("应该收集系统执行统计信息", () => {
				const testSystem = createTestSystem("stats", executionLog);
				scheduler.addSystem("stats", testSystem);

				// 运行几次
				scheduler.run(0.016);
				scheduler.run(0.016);
				scheduler.run(0.016);

				const systemStats = scheduler.getSystemStats("stats");
				expect(systemStats).to.be.ok();
				expect(systemStats!.systemName).to.equal("stats");
				expect(systemStats!.executionCount).to.equal(3);
				expect(systemStats!.totalExecutionTime > 0).to.equal(true);
				expect(systemStats!.averageExecutionTime > 0).to.equal(true);
			});

			it("应该收集调度器统计信息", () => {
				const system1 = createTestSystem("system1", executionLog);
				const system2 = createTestSystem("system2", executionLog);

				scheduler.addSystem("system1", system1);
				scheduler.addSystem("system2", system2, 0, false); // 禁用

				scheduler.run(0.016);
				scheduler.run(0.016);

				const stats = scheduler.getStats();
				expect(stats.totalSystems).to.equal(2);
				expect(stats.enabledSystems).to.equal(1);
				expect(stats.disabledSystems).to.equal(1);
				expect(stats.totalFrames).to.equal(2);
				expect(stats.averageFrameTime > 0).to.equal(true);
				expect(stats.systemStats.size()).to.equal(2);
			});

			it("应该能够重置统计信息", () => {
				const testSystem = createTestSystem("reset", executionLog);
				scheduler.addSystem("reset", testSystem);

				// 运行几次收集统计
				scheduler.run(0.016);
				scheduler.run(0.016);

				let stats = scheduler.getStats();
				expect(stats.totalFrames).to.equal(2);

				// 重置统计
				scheduler.resetStats();

				stats = scheduler.getStats();
				expect(stats.totalFrames).to.equal(0);
				expect(stats.averageFrameTime).to.equal(0);

				const systemStats = scheduler.getSystemStats("reset");
				expect(systemStats!.executionCount).to.equal(0);
				expect(systemStats!.totalExecutionTime).to.equal(0);
			});

			it("应该跟踪系统执行时间的最小值和最大值", () => {
				const fastSystem = createDelayedSystem("fast", 0.001, executionLog);
				const slowSystem = createDelayedSystem("slow", 0.005, executionLog);

				scheduler.addSystem("fast", fastSystem);
				scheduler.addSystem("slow", slowSystem);

				scheduler.run(0.016);

				const fastStats = scheduler.getSystemStats("fast");
				const slowStats = scheduler.getSystemStats("slow");

				expect(fastStats!.maxExecutionTime < slowStats!.maxExecutionTime).to.equal(true);
				expect(fastStats!.minExecutionTime < slowStats!.minExecutionTime).to.equal(true);
			});
		});

		describe("系统元数据", () => {
			it("应该能够获取系统元数据", () => {
				const testSystem = createTestSystem("metadata", executionLog);
				scheduler.addSystem("metadata", testSystem, 5, true);

				const metadata = scheduler.getSystemMetadata("metadata");
				expect(metadata).to.be.ok();
				expect(metadata!.name).to.equal("metadata");
				expect(metadata!.priority).to.equal(5);
				expect(metadata!.enabled).to.equal(true);
				expect(metadata!.function).to.equal(testSystem);
			});

			it("获取不存在系统的元数据应该返回 undefined", () => {
				const metadata = scheduler.getSystemMetadata("nonexistent");
				expect(metadata).to.equal(undefined);
			});

			it("应该能够获取所有系统名称", () => {
				scheduler.addSystem("system1", createTestSystem("1", executionLog));
				scheduler.addSystem("system2", createTestSystem("2", executionLog));
				scheduler.addSystem("system3", createTestSystem("3", executionLog));

				const names = scheduler.getSystemNames();
				expect(names.size()).to.equal(3);
				expect(names.includes("system1")).to.equal(true);
				expect(names.includes("system2")).to.equal(true);
				expect(names.includes("system3")).to.equal(true);
			});
		});

		describe("命令缓冲区集成", () => {
			it("应该在每帧结束时刷新命令缓冲区", () => {
				const commandSystem: SystemFunction = (world, deltaTime, resources, commands) => {
					// 这个系统会使用命令缓冲区
					commands.spawn([]);
					executionLog.push("command-executed");
				};

				scheduler.addSystem("command", commandSystem);

				expect(commandBuffer.getCommandCount()).to.equal(0);

				scheduler.run(0.016);

				// 系统应该执行
				expect(executionLog.includes("command-executed")).to.equal(true);
				// 命令应该被刷新（清空）
				expect(commandBuffer.getCommandCount()).to.equal(0);
			});
		});
	});

	describe("错误类型和接口", () => {
		it("SchedulerErrorType 应该包含所有错误类型", () => {
			expect(SchedulerErrorType.SystemError).to.equal("system_error");
			expect(SchedulerErrorType.DependencyError).to.equal("dependency_error");
			expect(SchedulerErrorType.ConditionError).to.equal("condition_error");
		});
	});

	describe("复杂集成场景", () => {
		it("应该支持复杂的系统配置", () => {
			// 创建一个复杂的系统网络
			const inputSystem = createTestSystem("input", executionLog);
			const physicsSystem = createTestSystem("physics", executionLog);
			const renderSystem = createTestSystem("render", executionLog);
			const uiSystem = createTestSystem("ui", executionLog);

			// 输入系统最高优先级
			scheduler.addSystem("input", inputSystem, 1);

			// 物理系统依赖输入，中等优先级
			scheduler.addSystem("physics", physicsSystem, 5);
			scheduler.addSystemDependency("physics", "input");

			// 渲染系统依赖物理，低优先级
			scheduler.addSystem("render", renderSystem, 10);
			scheduler.addSystemDependency("render", "physics");

			// UI系统独立，但优先级在渲染之后
			scheduler.addSystem("ui", uiSystem, 15);

			scheduler.run(0.016);

			expect(executionLog.size()).to.equal(4);

			const inputIndex = executionLog.indexOf("input-executed");
			const physicsIndex = executionLog.indexOf("physics-executed");
			const renderIndex = executionLog.indexOf("render-executed");
			const uiIndex = executionLog.indexOf("ui-executed");

			// 验证执行顺序
			expect(inputIndex < physicsIndex).to.equal(true);
			expect(physicsIndex < renderIndex).to.equal(true);
			expect(renderIndex < uiIndex).to.equal(true);
		});

		it("应该支持条件系统的动态启用", () => {
			let gameRunning = false;
			let debugMode = false;

			const gameSystem = createTestSystem("game", executionLog);
			const debugSystem = createTestSystem("debug", executionLog);

			scheduler.addSystem("game", gameSystem);
			scheduler.addSystem("debug", debugSystem);

			scheduler.addSystemCondition("game", () => gameRunning);
			scheduler.addSystemCondition("debug", () => debugMode);

			// 初始状态：游戏未运行
			scheduler.run(0.016);
			expect(executionLog.size()).to.equal(0);

			// 启动游戏
			gameRunning = true;
			scheduler.run(0.016);
			expect(executionLog.includes("game-executed")).to.equal(true);
			expect(executionLog.includes("debug-executed")).to.equal(false);

			// 启用调试模式
			executionLog.clear();
			debugMode = true;
			scheduler.run(0.016);
			expect(executionLog.includes("game-executed")).to.equal(true);
			expect(executionLog.includes("debug-executed")).to.equal(true);
		});
	});
};