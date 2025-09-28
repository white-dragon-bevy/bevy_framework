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

			it("应该按优先级顺序执行系统", () => {
				const executionOrder: string[] = [];

				const highPrioritySystem = () => {
					executionOrder.push("high");
				};

				const lowPrioritySystem = () => {
					executionOrder.push("low");
				};

				const mediumPrioritySystem = () => {
					executionOrder.push("medium");
				};

				loop.scheduleSystems([
					{ system: lowPrioritySystem, priority: 10 },
					{ system: highPrioritySystem, priority: -10 },
					{ system: mediumPrioritySystem, priority: 0 }
				]);

				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				
				// 验证执行顺序
				expect(executionOrder.size()).to.equal(3);
				expect(executionOrder[0]).to.equal("high");
				expect(executionOrder[1]).to.equal("medium");
				expect(executionOrder[2]).to.equal("low");
			});

			it("应该支持系统依赖关系", () => {
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

				loop.scheduleSystems([
					{ system: systemC, after: [systemB] },
					{ system: systemB, after: [systemA] },
					{ system: systemA }
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

				loop.scheduleSystems([lastSystem, firstSystem, updateSystem]);
				// 使用 step 方法执行调度阶段
				loop.step("First", 1/60);
				loop.step("Update", 1/60);
				loop.step("Last", 1/60);
				expect(testCompleted).to.equal(true);
			});

			it("应该支持系统集", () => {
				const executionOrder: string[] = [];
				let testCompleted = false;

				const inputSystem: BevySystemStruct<[World]> = {
					system: () => executionOrder.push("Input"),
					systemSet: "InputSet"
				};

				const physicsSystem: BevySystemStruct<[World]> = {
					system: () => executionOrder.push("Physics"),
					systemSet: "PhysicsSet",
					afterSet: "InputSet"
				};

				const renderSystem: BevySystemStruct<[World]> = {
					system: () => {
						executionOrder.push("Render");
						
						if (!testCompleted) {
							// 验证系统集的执行顺序
							const inputIndex = executionOrder.indexOf("Input");
							const physicsIndex = executionOrder.indexOf("Physics");
							const renderIndex = executionOrder.indexOf("Render");
							
							expect(inputIndex < physicsIndex).to.equal(true);
							expect(physicsIndex < renderIndex).to.equal(true);
							testCompleted = true;
						}
					},
					systemSet: "RenderSet",
					afterSet: "PhysicsSet"
				};

				loop.scheduleSystems([renderSystem, inputSystem, physicsSystem]);
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

		describe("系统生命周期", () => {
			it("应该支持系统的添加和移除", () => {
				let system1Executed = false;
				let system2Executed = false;

				const system1 = () => {
					system1Executed = true;
				};

				const system2 = () => {
					system2Executed = true;
				};

				// 先添加 system1
				loop.scheduleSystems([system1]);

				// 后添加 system2
				loop.scheduleSystem(system2);

				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				expect(system1Executed).to.equal(true);
				expect(system2Executed).to.equal(true);
			});

			it("应该支持系统替换", () => {
				let newSystemExecuted = false;

				const oldSystem = () => {
					// 不应该执行
					error("Old system should not execute");
				};

				const newSystem = () => {
					newSystemExecuted = true;
				};

				loop.scheduleSystems([oldSystem]);

				// 替换系统
				loop.replaceSystem(oldSystem, newSystem);

				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				expect(newSystemExecuted).to.equal(true);
			});

			it("应该支持系统驱逐", () => {
				let system1Executed = false;
				let system2Executed = false;
				let system3Executed = false;

				const system1 = () => {
					system1Executed = true;
				};

				const system2 = () => {
					system2Executed = true;
				};

				const system3 = () => {
					system3Executed = true;
				};

				loop.scheduleSystems([system1, system2, system3]);

				// 驱逐 system2
				loop.evictSystem(system2);

				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				// 验证只有 system1 和 system3 执行了
				expect(system1Executed).to.equal(true);
				expect(system2Executed).to.equal(false);
				expect(system3Executed).to.equal(true);
			});
		});

		describe("错误处理", () => {
			it("应该处理系统执行错误", () => {
				let errorSystemExecuted = false;
				let normalSystemExecuted = false;

				const errorSystem = () => {
					errorSystemExecuted = true;
					throw "Test error";
				};

				const normalSystem = () => {
					normalSystemExecuted = true;
				};

				// 启用错误跟踪
				loop.trackErrors = true;

				loop.scheduleSystems([
					{ system: errorSystem, priority: 1 },
					{ system: normalSystem, priority: 2 }
				]);

				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				// 即使有系统出错，其他系统也应该继续执行
				expect(errorSystemExecuted).to.equal(true);
				expect(normalSystemExecuted).to.equal(true);
			});

			it("应该检测循环依赖", () => {
				const systemA = () => {};
				const systemB = () => {};

				expect(() => {
					loop.scheduleSystems([
						{ system: systemA, after: [systemB] },
						{ system: systemB, after: [systemA] }
					]);
				}).to.throw();
			});
		});

		describe("性能测试", () => {
			it("应该能处理大量系统", () => {
				const systemCount = 100;
				let executedCount = 0;
				let testCompleted = false;

				const systems = [];
				for (let i = 0; i < systemCount; i++) {
					systems.push(() => {
						executedCount++;
						
						if (executedCount === systemCount && !testCompleted) {
							testCompleted = true;
						}
					});
				}

				const startTime = os.clock();
				loop.scheduleSystems(systems);
				const scheduleTime = os.clock() - startTime;

				expect(scheduleTime < 1).to.equal(true); // 调度应该很快

				// 使用 step 方法执行多帧直到测试完成
				let stepCount = 0;
				while (!testCompleted && stepCount < 5) {
					loop.step("default", 1/60);
					stepCount++;
				}
				expect(testCompleted).to.equal(true);
			});

			it("系统执行应该高效", () => {
				const TestComponent = component("TestComponent", { value: 0 });
				let frameCount = 0;
				let totalTime = 0;
				let testCompleted = false;

				const performanceSystem = (world: World) => {
					if (!testCompleted) {
						const startTime = os.clock();
						
						// 执行一些典型的 ECS 操作
						for (let i = 0; i < 10; i++) {
							world.spawn(TestComponent({ value: i }));
						}

						for (const [id, comp] of world.query(TestComponent)) {
							world.insert(id, TestComponent({ value: comp.value + 1 }));
						}

						const endTime = os.clock();
						totalTime += (endTime - startTime);
						frameCount++;

						if (frameCount >= 10) {
							const averageTime = totalTime / frameCount;
							expect(averageTime < 0.01).to.equal(true); // 平均每帧不超过 10ms
							testCompleted = true;
						}
					}
				};

				loop.scheduleSystems([performanceSystem]);
				// 使用 step 方法执行多帧直到测试完成
				let stepCount = 0;
				while (!testCompleted && stepCount < 20) {
					loop.step("default", 1/60);
					stepCount++;
				}
				expect(testCompleted).to.equal(true);
			});
		});

		describe("多事件支持", () => {
			it("应该支持不同事件上的系统", () => {
				let heartbeatSystemExecuted = false;
				let steppedSystemExecuted = false;
				let testCompleted = false;

				const heartbeatSystem = () => {
					heartbeatSystemExecuted = true;
				};

				const steppedSystem = () => {
					steppedSystemExecuted = true;
					
					if (heartbeatSystemExecuted && steppedSystemExecuted && !testCompleted) {
						testCompleted = true;
					}
				};

				loop.scheduleSystems([
					{ system: heartbeatSystem, event: "heartbeat" },
					{ system: steppedSystem, event: "stepped" }
				]);

				// 使用 step 方法分别执行不同事件
				loop.step("heartbeat", 1/60);
				loop.step("stepped", 1/60);
				
				expect(testCompleted).to.equal(true);
			});
		});
	});
};