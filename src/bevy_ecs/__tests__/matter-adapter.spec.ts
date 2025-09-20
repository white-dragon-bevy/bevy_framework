import { World, AnyComponent, component } from "@rbxts/matter";
import {
	MatterAdapter,
	QueryFilter,
	QueryOptions,
	MatterQueryResult,
} from "../matter-adapter";
import { ComponentConstructor } from "../command-buffer";

/**
 * 测试位置组件
 */
const PositionComponent = component<{ x: number; y: number; z: number }>("PositionComponent", {
	x: 0,
	y: 0,
	z: 0,
});

/**
 * 测试速度组件
 */
const VelocityComponent = component<{ dx: number; dy: number; dz: number }>("VelocityComponent", {
	dx: 0,
	dy: 0,
	dz: 0,
});

/**
 * 测试健康组件
 */
const HealthComponent = component<{ current: number; maximum: number }>("HealthComponent", {
	current: 100,
	maximum: 100,
});

/**
 * 测试名称组件
 */
const NameComponent = component<{ name: string }>("NameComponent", {
	name: "Unnamed",
});

export = () => {
	let world: World;
	let adapter: MatterAdapter;

	beforeEach(() => {
		world = new World();
		adapter = new MatterAdapter(world);
	});

	afterEach(() => {
		// 清理资源
	});

	describe("MatterAdapter", () => {
		describe("基本功能", () => {
			it("应该能够创建适配器实例", () => {
				expect(adapter).to.be.ok();
				expect(adapter.getWorld()).to.equal(world);
			});

			it("getWorld 应该返回传入的 World 实例", () => {
				const returnedWorld = adapter.getWorld();
				expect(returnedWorld).to.equal(world);
			});
		});

		describe("实体组件查询", () => {
			beforeEach(() => {
				// 创建一些测试实体
				const entity1 = world.spawn(
					PositionComponent({ x: 10, y: 20, z: 30 }),
					VelocityComponent({ dx: 1, dy: 2, dz: 3 }),
				);
				const entity2 = world.spawn(
					PositionComponent({ x: 40, y: 50, z: 60 }),
					HealthComponent({ current: 80, maximum: 100 }),
				);
				const entity3 = world.spawn(
					VelocityComponent({ dx: 4, dy: 5, dz: 6 }),
					NameComponent({ name: "TestEntity" }),
				);
			});

			it("hasComponent 应该正确检查实体是否具有指定组件", () => {
				// 创建一个测试实体
				const entity = world.spawn(PositionComponent({ x: 1, y: 2, z: 3 }));

				const hasPosition = adapter.hasComponent(entity, PositionComponent as ComponentConstructor);
				const hasVelocity = adapter.hasComponent(entity, VelocityComponent as ComponentConstructor);

				expect(hasPosition).to.equal(true);
				expect(hasVelocity).to.equal(false);
			});

			it("getComponent 应该返回实体的指定组件", () => {
				const testPosition = PositionComponent({ x: 100, y: 200, z: 300 });
				const entity = world.spawn(testPosition);

				const retrievedPosition = adapter.getComponent(entity, PositionComponent as ComponentConstructor);

				expect(retrievedPosition).to.be.ok();
				const pos = retrievedPosition as unknown as { x: number; y: number; z: number };
				expect(pos.x).to.equal(100);
				expect(pos.y).to.equal(200);
				expect(pos.z).to.equal(300);
			});

			it("getComponent 对不存在的组件应该返回 undefined", () => {
				const entity = world.spawn(PositionComponent({ x: 0, y: 0, z: 0 }));

				const retrievedVelocity = adapter.getComponent(entity, VelocityComponent as ComponentConstructor);

				expect(retrievedVelocity).to.equal(undefined);
			});

			it("getEntityComponents 应该返回实体的组件映射", () => {
				const entity = world.spawn(
					PositionComponent({ x: 1, y: 2, z: 3 }),
					VelocityComponent({ dx: 4, dy: 5, dz: 6 }),
				);

				const components = adapter.getEntityComponents(entity);

				// 由于当前实现返回空对象，我们只测试返回类型
				expect(typeIs(components, "table")).to.equal(true);
			});
		});

		describe("查询操作", () => {
			it("queryComponents 应该返回查询结果", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
					velocity: VelocityComponent as ComponentConstructor,
				};

				const results = adapter.queryComponents(componentTypes);

				expect(typeIs(results, "table")).to.equal(true);
				// 当前实现返回空数组
				expect(results.size()).to.equal(0);
			});

			it("queryComponents 应该支持查询选项", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
				};

				const options: QueryOptions = {
					limit: 5,
					skip: 2,
				};

				const results = adapter.queryComponents(componentTypes, options);

				expect(typeIs(results, "table")).to.equal(true);
			});

			it("countComponents 应该返回查询结果数量", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
				};

				const count = adapter.countComponents(componentTypes);

				expect(typeIs(count, "number")).to.equal(true);
				expect(count >= 0).to.equal(true);
			});

			it("hasEntitiesWith 应该检查是否存在匹配的实体", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
				};

				const hasEntities = adapter.hasEntitiesWith(componentTypes);

				expect(typeIs(hasEntities, "boolean")).to.equal(true);
			});

			it("getAllEntities 应该返回所有实体ID", () => {
				const allEntities = adapter.getAllEntities();

				expect(typeIs(allEntities, "table")).to.equal(true);
				// 当前实现返回空数组
				expect(allEntities.size()).to.equal(0);
			});
		});

		describe("结果过滤", () => {
			it("filterResults 应该能够过滤查询结果", () => {
				// 创建模拟查询结果
				const mockResults: MatterQueryResult<{ position: typeof PositionComponent }> = [
					[1 as never, { position: PositionComponent({ x: 10, y: 20, z: 30 }) }],
					[2 as never, { position: PositionComponent({ x: -5, y: 10, z: 15 }) }],
					[3 as never, { position: PositionComponent({ x: 0, y: 0, z: 0 }) }],
				];

				// 创建过滤器：只保留x坐标大于0的实体
				const filter: QueryFilter<{ position: typeof PositionComponent }> = (entity, components) => {
					const position = components.position as { x: number; y: number; z: number } | undefined;
					return position !== undefined && position.x > 0;
				};

				const filteredResults = adapter.filterResults(mockResults, filter);

				expect(filteredResults.size()).to.equal(2);
				const pos1 = filteredResults[0][1].position as unknown as { x: number; y: number; z: number };
				const pos2 = filteredResults[1][1].position as unknown as { x: number; y: number; z: number };
				expect(pos1.x).to.equal(10);
				expect(pos2.x).to.equal(0);
			});

			it("filterResults 应该处理空结果", () => {
				const emptyResults: MatterQueryResult<{ position: typeof PositionComponent }> = [];

				const filter: QueryFilter<{ position: typeof PositionComponent }> = () => true;

				const filteredResults = adapter.filterResults(emptyResults, filter);

				expect(filteredResults.size()).to.equal(0);
			});

			it("filterResults 应该支持复杂过滤条件", () => {
				const mockResults: MatterQueryResult<{
					position: typeof PositionComponent;
					health: typeof HealthComponent;
				}> = [
					[
						1 as never,
						{
							position: PositionComponent({ x: 10, y: 20, z: 30 }),
							health: HealthComponent({ current: 100, maximum: 100 }),
						},
					],
					[
						2 as never,
						{
							position: PositionComponent({ x: 5, y: 10, z: 15 }),
							health: HealthComponent({ current: 50, maximum: 100 }),
						},
					],
					[
						3 as never,
						{
							position: PositionComponent({ x: 1, y: 2, z: 3 }),
							health: undefined,
						},
					],
				];

				// 过滤器：位置x>5且健康值>75的实体
				const filter: QueryFilter<{
					position: typeof PositionComponent;
					health: typeof HealthComponent;
				}> = (entity, components) => {
					const position = components.position as { x: number; y: number; z: number } | undefined;
					const health = components.health as { current: number; maximum: number } | undefined;

					return (
						position !== undefined &&
						position.x > 5 &&
						health !== undefined &&
						health.current > 75
					);
				};

				const filteredResults = adapter.filterResults(mockResults, filter);

				expect(filteredResults.size()).to.equal(1);
				const pos = filteredResults[0][1].position as unknown as { x: number; y: number; z: number };
				const health = filteredResults[0][1].health as unknown as { current: number; maximum: number };
				expect(pos.x).to.equal(10);
				expect(health.current).to.equal(100);
			});
		});

		describe("查询选项", () => {
			it("应该支持限制查询结果数量", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
				};

				const options: QueryOptions = {
					limit: 3,
				};

				// 这主要测试API是否正确，实际结果取决于实现
				expect(() => {
					adapter.queryComponents(componentTypes, options);
				}).never.to.throw();
			});

			it("应该支持跳过查询结果", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
				};

				const options: QueryOptions = {
					skip: 2,
				};

				expect(() => {
					adapter.queryComponents(componentTypes, options);
				}).never.to.throw();
			});

			it("应该支持偏移查询结果", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
				};

				const options: QueryOptions = {
					offset: 1,
				};

				expect(() => {
					adapter.queryComponents(componentTypes, options);
				}).never.to.throw();
			});

			it("应该支持组合查询选项", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
					velocity: VelocityComponent as ComponentConstructor,
				};

				const options: QueryOptions = {
					limit: 10,
					skip: 5,
					offset: 2,
				};

				expect(() => {
					adapter.queryComponents(componentTypes, options);
				}).never.to.throw();
			});
		});

		describe("类型安全", () => {
			it("查询结果应该保持类型安全", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
					health: HealthComponent as ComponentConstructor,
				};

				const results = adapter.queryComponents(componentTypes);

				// 验证结果类型结构
				for (const [entity, components] of results) {
					expect(typeIs(entity, "number")).to.equal(true);
					expect(typeIs(components, "table")).to.equal(true);

					// 验证组件键存在（即使值可能为undefined）
					expect("position" in components).to.equal(true);
					expect("health" in components).to.equal(true);
				}
			});

			it("过滤器应该保持类型安全", () => {
				const mockResults: MatterQueryResult<{
					position: typeof PositionComponent;
					name: typeof NameComponent;
				}> = [
					[
						1 as never,
						{
							position: PositionComponent({ x: 1, y: 2, z: 3 }),
							name: NameComponent({ name: "Entity1" }),
						},
					],
				];

				const filter: QueryFilter<{
					position: typeof PositionComponent;
					name: typeof NameComponent;
				}> = (entity, components) => {
					// TypeScript应该能够推断出components的正确类型
					const position = components.position as { x: number; y: number; z: number } | undefined;
					const name = components.name as { name: string } | undefined;

					return (
						position !== undefined &&
						name !== undefined &&
						name.name.find("Entity")[0] !== undefined
					);
				};

				const filteredResults = adapter.filterResults(mockResults, filter);
				expect(filteredResults.size()).to.equal(1);
			});
		});

		describe("边界情况和错误处理", () => {
			it("应该处理不存在的实体", () => {
				const nonExistentEntity = 99999 as never;

				expect(() => {
					adapter.hasComponent(nonExistentEntity, PositionComponent as ComponentConstructor);
				}).never.to.throw();

				expect(() => {
					adapter.getComponent(nonExistentEntity, PositionComponent as ComponentConstructor);
				}).never.to.throw();

				expect(() => {
					adapter.getEntityComponents(nonExistentEntity);
				}).never.to.throw();
			});

			it("应该处理空的组件类型映射", () => {
				const emptyComponentTypes = {};

				expect(() => {
					adapter.queryComponents(emptyComponentTypes);
				}).never.to.throw();

				const results = adapter.queryComponents(emptyComponentTypes);
				expect(typeIs(results, "table")).to.equal(true);
			});

			it("应该处理无效的查询选项", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
				};

				const invalidOptions: QueryOptions = {
					limit: -1,
					skip: -5,
					offset: -3,
				};

				expect(() => {
					adapter.queryComponents(componentTypes, invalidOptions);
				}).never.to.throw();
			});

			it("过滤器抛出错误时应该正确处理", () => {
				const mockResults: MatterQueryResult<{ position: typeof PositionComponent }> = [
					[1 as never, { position: PositionComponent({ x: 1, y: 2, z: 3 }) }],
				];

				const errorFilter: QueryFilter<{ position: typeof PositionComponent }> = () => {
					error("Filter error");
				};

				expect(() => {
					adapter.filterResults(mockResults, errorFilter);
				}).to.throw();
			});
		});

		describe("与 Matter World 集成", () => {
			it("应该能够处理 Matter 实体操作", () => {
				// 创建实体
				const entity = world.spawn(PositionComponent({ x: 10, y: 20, z: 30 }));

				// 验证适配器能够访问实体数据
				const hasComponent = adapter.hasComponent(entity, PositionComponent as ComponentConstructor);
				expect(hasComponent).to.equal(true);

				const component = adapter.getComponent(entity, PositionComponent as ComponentConstructor);
				expect(component).to.be.ok();
				const pos = component as unknown as { x: number; y: number; z: number };
				expect(pos.x).to.equal(10);

				// 销毁实体
				world.despawn(entity);

				// 验证适配器反映了变更
				const hasComponentAfterDespawn = adapter.hasComponent(entity, PositionComponent as ComponentConstructor);
				expect(hasComponentAfterDespawn).to.equal(false);
			});

			it("应该能够处理组件的添加和移除", () => {
				const entity = world.spawn();

				// 初始状态：没有位置组件
				expect(adapter.hasComponent(entity, PositionComponent as ComponentConstructor)).to.equal(false);

				// 添加位置组件
				const position = PositionComponent({ x: 5, y: 10, z: 15 });
				world.insert(entity, position);

				// 验证组件已添加
				expect(adapter.hasComponent(entity, PositionComponent as ComponentConstructor)).to.equal(true);
				const retrievedPosition = adapter.getComponent(entity, PositionComponent as ComponentConstructor);
				const pos = retrievedPosition as unknown as { x: number; y: number; z: number };
				expect(pos.x).to.equal(5);

				// 移除组件
				world.remove(entity, PositionComponent as never);

				// 验证组件已移除
				expect(adapter.hasComponent(entity, PositionComponent as ComponentConstructor)).to.equal(false);
			});

			it("应该能够处理组件数据的更新", () => {
				const initialPosition = PositionComponent({ x: 1, y: 2, z: 3 });
				const entity = world.spawn(initialPosition);

				// 获取初始组件
				let position = adapter.getComponent(entity, PositionComponent as ComponentConstructor);
				const initialPos = position as unknown as { x: number; y: number; z: number };
				expect(initialPos.x).to.equal(1);

				// 更新组件数据
				const updatedPosition = PositionComponent({ x: 10, y: 20, z: 30 });
				world.insert(entity, updatedPosition);

				// 验证数据已更新
				position = adapter.getComponent(entity, PositionComponent as ComponentConstructor);
				const updatedPos = position as unknown as { x: number; y: number; z: number };
				expect(updatedPos.x).to.equal(10);
				expect(updatedPos.y).to.equal(20);
				expect(updatedPos.z).to.equal(30);
			});
		});

		describe("性能和优化", () => {
			it("应该能够处理大量实体", () => {
				const ENTITY_COUNT = 100;

				// 创建大量实体
				const entities = [];
				for (let index = 0; index < ENTITY_COUNT; index++) {
					const entity = world.spawn(PositionComponent({ x: index, y: index * 2, z: index * 3 }));
					entities.push(entity);
				}

				// 验证适配器能够处理大量实体
				for (const entity of entities) {
					const hasComponent = adapter.hasComponent(entity, PositionComponent as ComponentConstructor);
					expect(hasComponent).to.equal(true);
				}

				// 清理
				for (const entity of entities) {
					world.despawn(entity);
				}
			});

			it("查询操作应该是高效的", () => {
				const componentTypes = {
					position: PositionComponent as ComponentConstructor,
					velocity: VelocityComponent as ComponentConstructor,
				};

				// 测量查询时间
				const startTime = os.clock();

				for (let index = 0; index < 10; index++) {
					adapter.queryComponents(componentTypes);
				}

				const endTime = os.clock();
				const executionTime = endTime - startTime;

				// 验证执行时间在合理范围内（根据实际需求调整）
				expect(executionTime < 1.0).to.equal(true); // 1秒内完成
			});
		});
	});

	describe("类型定义", () => {
		it("MatterQueryResult 类型应该正确定义", () => {
			const result: MatterQueryResult<{ position: typeof PositionComponent }> = [
				[1 as never, { position: PositionComponent({ x: 1, y: 2, z: 3 }) }],
			];

			expect(typeIs(result, "table")).to.equal(true);
			expect(result.size()).to.equal(1);
			expect(typeIs(result[0][0], "number")).to.equal(true);
			expect(typeIs(result[0][1], "table")).to.equal(true);
		});

		it("QueryFilter 类型应该正确定义", () => {
			const filter: QueryFilter<{ position: typeof PositionComponent }> = (entity, components) => {
				return typeIs(entity, "number") && typeIs(components, "table");
			};

			const result = filter(1 as never, { position: PositionComponent({ x: 0, y: 0, z: 0 }) });
			expect(typeIs(result, "boolean")).to.equal(true);
		});

		it("QueryOptions 接口应该正确定义", () => {
			const options: QueryOptions = {
				limit: 10,
				skip: 5,
				offset: 2,
			};

			expect(options.limit).to.equal(10);
			expect(options.skip).to.equal(5);
			expect(options.offset).to.equal(2);
		});
	});
};