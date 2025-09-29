/**
 * @fileoverview Loop 系统执行测试
 * 测试系统在 Loop 中的调度、执行顺序和生命周期管理
 */

import { Loop, BevySystemStruct } from "../schedule/loop";
import { World } from "../bevy-world";
import { component } from "@rbxts/matter";
import { RunService } from "@rbxts/services";

export = () => {
	describe("Loop System Execution", () => {
		let loop: Loop<[World]>;
		let world: World;

		beforeEach(() => {
			world = new World();
			loop = new Loop(world);
		});

		afterEach(() => {
			// 清理 world
			world.clear();
		});

		describe("基本系统执行", () => {
			it("应该执行简单的系统函数", () => {
				let systemExecuted = false;
				let worldReceived: World | undefined;

				const testSystem = (receivedWorld: World) => {
					systemExecuted = true;
					worldReceived = receivedWorld;

					expect(receivedWorld).to.equal(world);
				};

				loop.scheduleSystems([testSystem]);

				// 使用 step 方法执行一帧
				loop.step("default", 1/60);

				expect(systemExecuted).to.equal(true);
				expect(worldReceived).to.equal(world);
			});

			it("应该按提供的顺序执行系统", () => {
				const executionOrder: string[] = [];

				const highPrioritySystem = () => {
					executionOrder.push("high");
				};

				const mediumPrioritySystem = () => {
					executionOrder.push("medium");
				};

				const lowPrioritySystem = () => {
					executionOrder.push("low");
				};

				// 注意：现在系统按照提供的顺序执行，不再内部排序
				// 所以需要手动按照期望的顺序提供系统
				loop.scheduleSystems([
					highPrioritySystem,
					mediumPrioritySystem,
					lowPrioritySystem
				]);

				// 使用 step 方法执行一帧
				loop.step("default", 1/60);

				// 验证执行顺序
				expect(executionOrder.size()).to.equal(3);
				expect(executionOrder[0]).to.equal("high");
				expect(executionOrder[1]).to.equal("medium");
				expect(executionOrder[2]).to.equal("low");
			});

			it("应该按提供的顺序执行系统（依赖关系由调用方处理）", () => {
				const executionOrder: string[] = [];

				const systemA = () => {
					executionOrder.push("A");
				};

				const systemB = () => {
					executionOrder.push("B");
				};

				const systemC = () => {
					executionOrder.push("C");
				};

				// 调用方负责按正确的依赖顺序提供系统
				// A -> B -> C 的顺序
				loop.scheduleSystems([
					systemA,
					systemB,
					systemC
				]);

				// 使用 step 方法执行一帧
				loop.step("default", 1/60);

				// 验证执行顺序
				expect(executionOrder.size()).to.equal(3);
				expect(executionOrder[0]).to.equal("A");
				expect(executionOrder[1]).to.equal("B");
				expect(executionOrder[2]).to.equal("C");
			});
		});

		describe("Bevy 系统特性", () => {
			it("应该支持运行条件", () => {
				let conditionCheckCount = 0;
				let systemExecutionCount = 0;
				let testCompleted = false;

				const conditionalSystem: BevySystemStruct<[World]> = {
					system: () => {
						systemExecutionCount++;
					},
					runCondition: () => {
						conditionCheckCount++;
						return conditionCheckCount >= 3; // 前两次返回 false，第三次返回 true
					}
				};

				const verificationSystem = () => {
					if (conditionCheckCount >= 5 && !testCompleted) {
						// 条件检查了 5 次，但系统只应该执行 3 次（第3、4、5次）
						expect(conditionCheckCount >= 5).to.equal(true);
						expect(systemExecutionCount >= 3).to.equal(true);
						expect(systemExecutionCount < conditionCheckCount).to.equal(true);
						testCompleted = true;
					}
				};

				loop.scheduleSystems([conditionalSystem, verificationSystem]);
				// 使用 step 方法执行多帧直到测试完成
				let stepCount = 0;
				while (!testCompleted && stepCount < 10) {
					loop.step("default", 1/60);
					stepCount++;
				}
				expect(testCompleted).to.equal(true);
			});

			it("应该支持调度阶段", () => {
				const executionOrder: string[] = [];
				let testCompleted = false;

				const firstSystem: BevySystemStruct<[World]> = {
					system: () => executionOrder.push("First"),
					schedule: "First"
				};

				const updateSystem: BevySystemStruct<[World]> = {
					system: () => executionOrder.push("Update"),
					schedule: "Update"
				};

				const lastSystem: BevySystemStruct<[World]> = {
					system: () => {
						executionOrder.push("Last");

						if (!testCompleted) {
							// 验证调度阶段的执行顺序
							expect(executionOrder.includes("First")).to.equal(true);
							expect(executionOrder.includes("Update")).to.equal(true);
							expect(executionOrder.includes("Last")).to.equal(true);
							testCompleted = true;
						}
					},
					schedule: "Last"
				};

				// 配置 Bevy 调度映射
				loop.configureBevySchedules({
					First: RunService.Heartbeat,
					Update: RunService.Heartbeat,
					Last: RunService.Heartbeat
				});

				// 系统按提供的顺序执行（调用方负责排序）
				loop.scheduleSystems([firstSystem, updateSystem, lastSystem]);
				// 使用 step 方法执行调度阶段
				loop.step("First", 1/60);
				loop.step("Update", 1/60);
				loop.step("Last", 1/60);
				expect(testCompleted).to.equal(true);
			});

			it("应该支持系统集（调用方负责排序）", () => {
				const executionOrder: string[] = [];
				let testCompleted = false;

				const inputSystem: BevySystemStruct<[World]> = {
					system: () => executionOrder.push("Input"),
					systemSet: "InputSet"
				};

				const physicsSystem: BevySystemStruct<[World]> = {
					system: () => executionOrder.push("Physics"),
					systemSet: "PhysicsSet"
				};

				const renderSystem: BevySystemStruct<[World]> = {
					system: () => {
						executionOrder.push("Render");

						if (!testCompleted) {
							// 验证系统集的执行顺序
							const inputIndex = executionOrder.indexOf("Input");
							const physicsIndex = executionOrder.indexOf("Physics");
							const renderIndex = executionOrder.indexOf("Render");

							// 系统按提供的顺序执行
							expect(inputIndex).to.equal(0);
							expect(physicsIndex).to.equal(1);
							expect(renderIndex).to.equal(2);
							testCompleted = true;
						}
					},
					systemSet: "RenderSet"
				};

				// 调用方按期望的顺序提供系统
				// Input -> Physics -> Render
				loop.scheduleSystems([inputSystem, physicsSystem, renderSystem]);
				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				expect(testCompleted).to.equal(true);
			});

			it("应该支持排他性系统", () => {
				let exclusiveSystemExecuted = false;
				let normalSystemExecuted = false;

				const exclusiveSystem: BevySystemStruct<[World]> = {
					system: (world: World) => {
						exclusiveSystemExecuted = true;
						// 排他性系统应该能完全访问世界
						expect(world).to.be.ok();
					},
					exclusive: true
				};

				const normalSystem = () => {
					normalSystemExecuted = true;
				};

				loop.scheduleSystems([exclusiveSystem, normalSystem]);
				// 使用 step 方法执行一帧
				loop.step("default", 1/60);

				expect(exclusiveSystemExecuted).to.equal(true);
				expect(normalSystemExecuted).to.equal(true);
			});
		});

		describe("系统生命周期管理", () => {
			it("应该能够驱逐系统", () => {
				let system1ExecutionCount = 0;
				let system2ExecutionCount = 0;

				const system1 = () => {
					system1ExecutionCount++;
				};

				const system2 = () => {
					system2ExecutionCount++;
				};

				loop.scheduleSystems([system1, system2]);

				// 第一帧：两个系统都执行
				loop.step("default", 1/60);
				expect(system1ExecutionCount).to.equal(1);
				expect(system2ExecutionCount).to.equal(1);

				// 驱逐 system1
				loop.evictSystem(system1);

				// 第二帧：只有 system2 执行
				loop.step("default", 1/60);
				expect(system1ExecutionCount).to.equal(1); // 不变
				expect(system2ExecutionCount).to.equal(2);
			});

			it("应该能够替换系统", () => {
				let oldSystemExecutionCount = 0;
				let newSystemExecutionCount = 0;

				const oldSystem = () => {
					oldSystemExecutionCount++;
				};

				const newSystem = () => {
					newSystemExecutionCount++;
				};

				loop.scheduleSystems([oldSystem]);

				// 第一帧：旧系统执行
				loop.step("default", 1/60);
				expect(oldSystemExecutionCount).to.equal(1);
				expect(newSystemExecutionCount).to.equal(0);

				// 替换系统
				loop.replaceSystem(oldSystem, newSystem);

				// 第二帧：新系统执行
				loop.step("default", 1/60);
				expect(oldSystemExecutionCount).to.equal(1); // 不变
				expect(newSystemExecutionCount).to.equal(1);
			});
		});

		describe("不同事件的系统执行", () => {
			it("应该根据事件名称执行对应的系统", () => {
				let defaultSystemExecuted = false;
				let customSystemExecuted = false;

				const defaultSystem: BevySystemStruct<[World]> = {
					system: () => {
						defaultSystemExecuted = true;
					},
					event: "default"
				};

				const customSystem: BevySystemStruct<[World]> = {
					system: () => {
						customSystemExecuted = true;
					},
					event: "custom"
				};

				loop.scheduleSystems([defaultSystem, customSystem]);

				// 执行 default 事件
				loop.step("default", 1/60);
				expect(defaultSystemExecuted).to.equal(true);
				expect(customSystemExecuted).to.equal(false);

				// 重置
				defaultSystemExecuted = false;
				customSystemExecuted = false;

				// 执行 custom 事件
				loop.step("custom", 1/60);
				expect(defaultSystemExecuted).to.equal(false);
				expect(customSystemExecuted).to.equal(true);
			});
		});
	});
};