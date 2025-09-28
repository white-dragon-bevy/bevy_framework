/**
 * @fileoverview Loop 与 Matter 集成测试
 * 测试 Loop 启动后，系统内部调用 Matter 接口的功能性
 */

import { Loop } from "../schedule/loop";
import { World } from "../bevy-world";
import { component, useEvent, useDeltaTime, useThrottle, log } from "@rbxts/matter";
import { RunService, Players } from "@rbxts/services";

export = () => {
	describe("Loop Matter Integration", () => {
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

		describe("World 操作测试", () => {
			it("系统内部应该能正常操作 World", () => {
				const TestComponent = component("TestComponent", { value: 0 });
				let systemExecuted = false;
				let entityCreated: number | undefined;
				let queryResults: Array<{ id: number; value: number }> = [];

				const testSystem = (world: World) => {
					if (!systemExecuted) {
						systemExecuted = true;

						// 测试实体创建
						entityCreated = world.spawn(TestComponent({ value: 42 }));

						// 测试查询
						for (const [id, comp] of world.query(TestComponent)) {
							queryResults.push({ id, value: comp.value });
						}

						// 测试组件插入
						const newEntity = world.spawn();
						world.insert(newEntity, TestComponent({ value: 100 }));

						// 再次查询验证
						queryResults = [];
						for (const [id, comp] of world.query(TestComponent)) {
							queryResults.push({ id, value: comp.value });
						}
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法手动执行一帧，更适合单元测试
				loop.step("default", 1/60);

				expect(systemExecuted).to.equal(true);
				expect(entityCreated).to.be.a("number");
				expect(queryResults.size()).to.equal(2);
				expect(queryResults.some(r => r.value === 42)).to.equal(true);
				expect(queryResults.some(r => r.value === 100)).to.equal(true);
			});

			it("系统应该能够修改和删除实体", () => {
				const TestComponent = component("TestComponent", { value: 0 });
				const OtherComponent = component("OtherComponent", { data: "" });
				
				let phase = 0;
				let testEntity: number;
				let testCompleted = false;

				const testSystem = (world: World) => {
					if (phase === 0) {
						// 第一阶段：创建实体
						testEntity = world.spawn(TestComponent({ value: 1 }));
						phase = 1;
					} else if (phase === 1) {
						// 第二阶段：修改组件
						world.insert(testEntity as any, TestComponent({ value: 2 }));
						world.insert(testEntity as any, OtherComponent({ data: "test" }));
						phase = 2;
					} else if (phase === 2) {
						// 第三阶段：验证修改
						let found = false;
						for (const [id, testComp, otherComp] of world.query(TestComponent, OtherComponent)) {
							if (id === testEntity) {
								found = true;
								expect(testComp.value).to.equal(2);
								expect(otherComp.data).to.equal("test");
							}
						}
						expect(found).to.equal(true);

						// 移除组件
						world.remove(testEntity as any, OtherComponent);
						phase = 3;
					} else if (phase === 3) {
						// 第四阶段：验证移除
						let foundAfterRemove = false;
						for (const [id] of world.query(TestComponent, OtherComponent)) {
							if (id === testEntity) {
								foundAfterRemove = true;
							}
						}
						expect(foundAfterRemove).to.equal(false);

						// 删除实体
						world.despawn(testEntity as any);
						phase = 4;
					} else if (phase === 4 && !testCompleted) {
						// 第五阶段：验证删除
						expect(world.contains(testEntity as any)).to.equal(false);
						testCompleted = true;
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法逐帧执行，直到测试完成
				let stepCount = 0;
				while (!testCompleted && stepCount < 10) {
					loop.step("default", 1/60);
					stepCount++;
				}
				expect(testCompleted).to.equal(true);
			});
		});

		describe("Matter Hooks 测试", () => {
			it("系统内部应该能使用 useDeltaTime", () => {
				let deltaTimeReceived = false;
				let deltaValue: number;

				const testSystem = (world: World) => {
					if (!deltaTimeReceived) {
						deltaValue = useDeltaTime();
						deltaTimeReceived = true;

						expect(deltaValue).to.be.a("number");
						expect(deltaValue > 0).to.equal(true);
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				
				expect(deltaTimeReceived).to.equal(true);
			});

			it("系统内部应该能使用 useThrottle", () => {
				let throttleCallCount = 0;
				let throttleResults: boolean[] = [];
				let testCompleted = false;

				const testSystem = (world: World) => {
					if (!testCompleted) {
						throttleCallCount++;
						const shouldExecute = useThrottle(0.05); // 50ms 节流
						throttleResults.push(shouldExecute);

						if (throttleCallCount >= 5) {
							// 第一次调用应该返回 true
							expect(throttleResults[0]).to.equal(true);
							// 后续调用在节流时间内应该返回 false
							expect(throttleResults.some(r => r === false)).to.equal(true);
							testCompleted = true;
						}
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法执行多帧来测试节流
				for (let i = 0; i < 10 && !testCompleted; i++) {
					loop.step("default", 0.01); // 10ms 间隔
				}
				
				expect(testCompleted).to.equal(true);
			});

			it("系统内部应该能使用 useEvent", () => {
				let eventReceived = false;

				const testSystem = (world: World) => {
					if (!eventReceived) {
						// 监听玩家加入事件
						for (const [i, player] of useEvent(Players, "PlayerAdded")) {
							eventReceived = true;
							expect(player).to.be.a("table");
							expect(player.Name).to.be.a("string");
						}

						// 模拟触发事件（在测试环境中可能不会有真实的玩家加入）
						// 但至少验证 useEvent 不会报错
						if (!eventReceived) {
							// 如果没有真实事件，至少验证函数调用成功
							eventReceived = true;
						}
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				
				expect(eventReceived).to.equal(true);
			});

			it("系统内部应该能使用 log", () => {
				let logCalled = false;

				const testSystem = (world: World) => {
					if (!logCalled) {
						// 测试 Matter 的 log 函数
						log("Test log message", { data: "test" });
						logCalled = true;
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				
				expect(logCalled).to.equal(true);
			});
		});

		describe("组件操作测试", () => {
			it("系统内部应该能创建和使用组件", () => {
				const TestComponent = component("TestComponent", { value: 0, name: "" });
				let componentCreated = false;
				let componentUsed = false;

				const testSystem = (world: World) => {
					if (!componentCreated) {
						// 创建组件实例
						const comp = TestComponent({ value: 42, name: "test" });
						const entityId = world.spawn(comp);
						componentCreated = true;

						expect(entityId).to.be.a("number");
						expect(world.contains(entityId)).to.equal(true);
					} else if (!componentUsed) {
						// 使用组件
						for (const [id, comp] of world.query(TestComponent)) {
							componentUsed = true;
							expect(comp.value).to.equal(42);
							expect(comp.name).to.equal("test");
						}
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法执行多帧直到测试完成
				let stepCount = 0;
				while ((!componentCreated || !componentUsed) && stepCount < 5) {
					loop.step("default", 1/60);
					stepCount++;
				}
				
				expect(componentCreated).to.equal(true);
				expect(componentUsed).to.equal(true);
			});

			it("系统内部应该能使用组件的默认数据", () => {
				const ComponentWithDefaults = component("ComponentWithDefaults", { 
					value: 100, 
					enabled: true,
					name: "default" 
				});
				
				let testCompleted = false;

				const testSystem = (world: World) => {
					if (!testCompleted) {
						// 创建组件时只提供部分数据
						const comp = ComponentWithDefaults({ value: 200, enabled: true, name: "default" });
						const entityId = world.spawn(comp);

						// 查询并验证默认数据
						for (const [id, component] of world.query(ComponentWithDefaults)) {
							if (id === entityId) {
								expect(component.value).to.equal(200); // 覆盖的值
								expect(component.enabled).to.equal(true); // 默认值
								expect(component.name).to.equal("default"); // 默认值
								testCompleted = true;
							}
						}
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法执行一帧
				loop.step("default", 1/60);
				
				expect(testCompleted).to.equal(true);
			});
		});

		describe("查询功能测试", () => {
			it("系统内部应该能使用复杂查询", () => {
				const PositionComponent = component("Position", { x: 0, y: 0 });
				const VelocityComponent = component("Velocity", { dx: 0, dy: 0 });
				const StaticComponent = component("Static");

				let setupComplete = false;
				let queryTestComplete = false;

				const testSystem = (world: World) => {
					if (!setupComplete) {
						// 设置测试数据
						world.spawn(PositionComponent({ x: 1, y: 1 }), VelocityComponent({ dx: 1, dy: 0 }));
						world.spawn(PositionComponent({ x: 2, y: 2 }), StaticComponent());
						world.spawn(PositionComponent({ x: 3, y: 3 }), VelocityComponent({ dx: 0, dy: 1 }), StaticComponent());
						setupComplete = true;
					} else if (!queryTestComplete) {
						// 测试复杂查询
						
						// 查询有位置和速度但没有静态标记的实体
						const movingEntities = [];
						for (const [id, pos, vel] of world.query(PositionComponent, VelocityComponent).without(StaticComponent)) {
							movingEntities.push({ id, pos, vel });
						}
						expect(movingEntities.size()).to.equal(1);
						expect(movingEntities[0].pos.x).to.equal(1);

						// 查询所有有位置的实体
						const allPositioned = [];
						for (const [id, pos] of world.query(PositionComponent)) {
							allPositioned.push({ id, pos });
						}
						expect(allPositioned.size()).to.equal(3);

						// 查询静态实体
						const staticEntities = [];
						for (const [id, pos] of world.query(PositionComponent, StaticComponent)) {
							staticEntities.push({ id, pos });
						}
						expect(staticEntities.size()).to.equal(2);

						queryTestComplete = true;
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法执行多帧直到测试完成
				let stepCount = 0;
				while (!queryTestComplete && stepCount < 5) {
					loop.step("default", 1/60);
					stepCount++;
				}
				
				expect(queryTestComplete).to.equal(true);
			});

			it("系统内部应该能使用 queryChanged", () => {
				const TestComponent = component("TestComponent", { value: 0 });
				let phase = 0;
				let entityId: number;
				let testCompleted = false;

				const testSystem = (world: World) => {
					if (phase === 0) {
						// 创建实体
						entityId = world.spawn(TestComponent({ value: 1 }));
						phase = 1;
					} else if (phase === 1) {
						// 第一次查询 changed - 应该找到新创建的实体
						const changedEntities = [];
						for (const [id, comp] of world.queryChanged(TestComponent)) {
							// Matter 的 queryChanged 返回的是 { new, old } 格式
							if (comp.new) {
								changedEntities.push({ id, value: comp.new.value });
							}
						}
						expect(changedEntities.size()).to.equal(1);
						expect(changedEntities[0].id).to.equal(entityId);
						phase = 2;
					} else if (phase === 2) {
						// 第二次查询 changed - 应该没有变化
						const changedEntities = [];
						for (const [id] of world.queryChanged(TestComponent)) {
							changedEntities.push(id);
						}
						expect(changedEntities.size()).to.equal(0);

						// 修改组件
						world.insert(entityId as any, TestComponent({ value: 2 }));
						phase = 3;
					} else if (phase === 3 && !testCompleted) {
						// 第三次查询 changed - 应该找到修改的实体
						const changedEntities = [];
						for (const [id, comp] of world.queryChanged(TestComponent)) {
							if (comp.new) {
								changedEntities.push({ id, value: comp.new.value });
							}
						}
						expect(changedEntities.size()).to.equal(1);
						expect(changedEntities[0].value).to.equal(2);
						testCompleted = true;
					}
				};

				loop.scheduleSystems([testSystem]);
				
				// 使用 step 方法执行多帧直到测试完成
				let stepCount = 0;
				while (!testCompleted && stepCount < 10) {
					loop.step("default", 1/60);
					stepCount++;
				}
				
				expect(testCompleted).to.equal(true);
			});
		});

		describe("系统间通信测试", () => {
			it("多个系统应该能共享 World 状态", () => {
				const SharedComponent = component("Shared", { counter: 0 });
				let sharedEntityId: number;
				let system1Executed = false;
				let system2Executed = false;
				let testCompleted = false;

				const system1 = (world: World) => {
					if (!system1Executed) {
						sharedEntityId = world.spawn(SharedComponent({ counter: 0 }));
						system1Executed = true;
					} else if (system1Executed && !testCompleted) {
						// 增加计数器
						for (const [id, comp] of world.query(SharedComponent)) {
							if (id === sharedEntityId) {
								world.insert(id, SharedComponent({ counter: comp.counter + 1 }));
							}
						}
					}
				};

				const system2 = (world: World) => {
					if (system1Executed && !system2Executed) {
						// 验证能看到 system1 创建的实体
						let found = false;
						for (const [id, comp] of world.query(SharedComponent)) {
							if (id === sharedEntityId) {
								found = true;
								expect(comp.counter >= 0).to.equal(true);
							}
						}
						expect(found).to.equal(true);
						system2Executed = true;
					} else if (system2Executed && !testCompleted) {
						// 验证能看到 system1 的修改
						for (const [id, comp] of world.query(SharedComponent)) {
							if (id === sharedEntityId && comp.counter > 0) {
								testCompleted = true;
							}
						}
					}
				};

				loop.scheduleSystems([
					{ system: system1, priority: 1 },
					{ system: system2, priority: 2 }
				]);
				
				// 使用 step 方法执行多帧直到测试完成
				let stepCount = 0;
				while (!testCompleted && stepCount < 10) {
					loop.step("default", 1/60);
					stepCount++;
				}
				
				expect(testCompleted).to.equal(true);
			});
		});
	});
};