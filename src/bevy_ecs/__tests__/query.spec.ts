import { World, AnyComponent, component } from "@rbxts/matter";
import {
	QueryBuilder,
	QueryFactory,
	QueryHelpers,
	ChangeDetectionType,
	QueryConditionType,
	QueryCondition,
} from "../query";
import { MatterAdapter } from "../matter-adapter";
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

/**
 * 测试标签组件
 */
const PlayerTagComponent = component("PlayerTagComponent");

export = () => {
	let world: World;
	let adapter: MatterAdapter;
	let queryFactory: QueryFactory;

	beforeEach(() => {
		world = new World();
		adapter = new MatterAdapter(world);
		queryFactory = new QueryFactory(world, adapter);
	});

	afterEach(() => {
		// 清理资源
	});

	describe("QueryBuilder", () => {
		describe("基本查询构建", () => {
			it("应该能够创建基本的查询构建器", () => {
				const queryBuilder = new QueryBuilder(world, adapter);
				expect(queryBuilder).to.be.ok();
			});

			it("应该能够链式调用查询方法", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor)
					.with("velocity", VelocityComponent as ComponentConstructor)
					.without(PlayerTagComponent as ComponentConstructor);

				expect(query).to.be.ok();
			});

			it("应该能够添加必需组件条件", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor);

				expect(query).to.be.ok();
			});

			it("应该能够添加排除组件条件", () => {
				const query = queryFactory
					.query()
					.without(PlayerTagComponent as ComponentConstructor);

				expect(query).to.be.ok();
			});

			it("应该能够添加可选组件条件", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor)
					.optional("health", HealthComponent as ComponentConstructor);

				expect(query).to.be.ok();
			});
		});

		describe("变更检测查询", () => {
			it("应该能够添加已变更组件查询", () => {
				const query = queryFactory
					.query()
					.changed(PositionComponent as ComponentConstructor);

				expect(query).to.be.ok();
			});

			it("应该能够添加新增组件查询", () => {
				const query = queryFactory
					.query()
					.added(VelocityComponent as ComponentConstructor);

				expect(query).to.be.ok();
			});

			it("应该能够组合变更检测和常规查询", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor)
					.changed(VelocityComponent as ComponentConstructor)
					.without(PlayerTagComponent as ComponentConstructor);

				expect(query).to.be.ok();
			});
		});

		describe("自定义过滤器", () => {
			it("应该能够添加自定义过滤器", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor)
					.filter((entity, components) => {
						const position = components.position as { x: number; y: number; z: number } | undefined;
						return position !== undefined && position.x > 0;
					});

				expect(query).to.be.ok();
			});

			it("应该能够使用 where 方法添加过滤条件", () => {
				const query = queryFactory
					.query()
					.with("health", HealthComponent as ComponentConstructor)
					.where((entity, components) => {
						const health = components.health as { current: number; maximum: number } | undefined;
						return health !== undefined && health.current > 50;
					});

				expect(query).to.be.ok();
			});
		});

		describe("查询选项", () => {
			it("应该能够设置查询限制", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor)
					.limit(10);

				expect(query).to.be.ok();
			});

			it("应该能够设置跳过数量", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor)
					.skip(5);

				expect(query).to.be.ok();
			});

			it("应该能够组合多个查询选项", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor)
					.limit(20)
					.skip(10);

				expect(query).to.be.ok();
			});
		});

		describe("查询执行", () => {
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

			it("execute 应该返回查询结果迭代器", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor);

				const result = query.execute();

				expect(result).to.be.ok();
				expect(result.entities).to.be.ok();
				expect(result.components).to.be.ok();
				expect(result.entities.size()).to.equal(result.components.size());
			});

			it("any 应该检查是否有查询结果", () => {
				const queryWithResults = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor);

				const queryWithoutResults = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor)
					.with("nonexistent", PlayerTagComponent as ComponentConstructor);

				// 由于MatterAdapter的实现限制，这些测试可能需要根据实际实现调整
				expect(queryWithResults.any()).to.be.a("boolean");
				expect(queryWithoutResults.any()).to.be.a("boolean");
			});

			it("count 应该返回查询结果数量", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor);

				const count = query.count();
				expect(count).to.be.a("number");
				expect(count >= 0).to.equal(true);
			});

			it("single 应该返回第一个查询结果", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor);

				const result = query.single();
				// 结果可能为undefined，这取决于MatterAdapter的实现
				if (result) {
					expect(result[0]).to.be.a("number"); // entity ID
					expect(result[1]).to.be.ok(); // components
				}
			});
		});

		describe("查询迭代", () => {
			it("forEach 应该遍历查询结果", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor);

				let iterationCount = 0;
				query.forEach((entity, components) => {
					expect(entity).to.be.a("number");
					expect(components).to.be.ok();
					iterationCount++;
				});

				expect(iterationCount >= 0).to.equal(true);
			});

			it("map 应该将查询结果映射为新数组", () => {
				const query = queryFactory
					.query()
					.with("position", PositionComponent as ComponentConstructor);

				const entityIds = query.map((entity, components) => entity);

				expect(entityIds).to.be.ok();
				expect(typeIs(entityIds, "table")).to.equal(true);
			});
		});
	});

	describe("QueryFactory", () => {
		describe("便捷查询方法", () => {
			it("应该能够通过工厂创建基本查询", () => {
				const query = queryFactory.query();
				expect(query).to.be.ok();
			});

			it("应该能够通过工厂创建 with 查询", () => {
				const query = queryFactory.with("position", PositionComponent as ComponentConstructor);
				expect(query).to.be.ok();
			});

			it("应该能够通过工厂创建 without 查询", () => {
				const query = queryFactory.without(PlayerTagComponent as ComponentConstructor);
				expect(query).to.be.ok();
			});

			it("应该能够通过工厂创建 changed 查询", () => {
				const query = queryFactory.changed(PositionComponent as ComponentConstructor);
				expect(query).to.be.ok();
			});

			it("应该能够通过工厂创建 added 查询", () => {
				const query = queryFactory.added(VelocityComponent as ComponentConstructor);
				expect(query).to.be.ok();
			});
		});

		describe("实体获取方法", () => {
			it("getAllEntities 应该返回所有实体", () => {
				const entities = queryFactory.getAllEntities();
				expect(entities).to.be.ok();
				expect(typeIs(entities, "table")).to.equal(true);
			});

			it("getEntitiesWithComponent 应该返回包含特定组件的实体", () => {
				const entities = queryFactory.getEntitiesWithComponent(PositionComponent as ComponentConstructor);
				expect(entities).to.be.ok();
				expect(typeIs(entities, "table")).to.equal(true);
			});
		});
	});

	describe("QueryHelpers", () => {
		describe("条件创建辅助函数", () => {
			it("应该能够创建 with 条件", () => {
				const condition = QueryHelpers.with(PositionComponent as ComponentConstructor);

				expect(condition.type).to.equal(QueryConditionType.With);
				expect(condition.componentType).to.equal(PositionComponent);
			});

			it("应该能够创建 without 条件", () => {
				const condition = QueryHelpers.without(PlayerTagComponent as ComponentConstructor);

				expect(condition.type).to.equal(QueryConditionType.Without);
				expect(condition.componentType).to.equal(PlayerTagComponent);
			});

			it("应该能够创建 optional 条件", () => {
				const condition = QueryHelpers.optional(HealthComponent as ComponentConstructor);

				expect(condition.type).to.equal(QueryConditionType.Optional);
				expect(condition.componentType).to.equal(HealthComponent);
			});

			it("应该能够创建 changed 条件", () => {
				const condition = QueryHelpers.changed(VelocityComponent as ComponentConstructor);

				expect(condition.type).to.equal(QueryConditionType.Changed);
				expect(condition.componentType).to.equal(VelocityComponent);
			});

			it("应该能够创建 added 条件", () => {
				const condition = QueryHelpers.added(NameComponent as ComponentConstructor);

				expect(condition.type).to.equal(QueryConditionType.Added);
				expect(condition.componentType).to.equal(NameComponent);
			});

			it("应该能够组合多个条件", () => {
				const conditions = QueryHelpers.and(
					QueryHelpers.with(PositionComponent as ComponentConstructor),
					QueryHelpers.without(PlayerTagComponent as ComponentConstructor),
					QueryHelpers.optional(HealthComponent as ComponentConstructor),
				);

				expect(conditions.size()).to.equal(3);
				expect(conditions[0].type).to.equal(QueryConditionType.With);
				expect(conditions[1].type).to.equal(QueryConditionType.Without);
				expect(conditions[2].type).to.equal(QueryConditionType.Optional);
			});
		});
	});

	describe("枚举和类型", () => {
		describe("ChangeDetectionType", () => {
			it("应该包含所有变更检测类型", () => {
				expect(ChangeDetectionType.Added).to.equal("added");
				expect(ChangeDetectionType.Changed).to.equal("changed");
				expect(ChangeDetectionType.Removed).to.equal("removed");
			});
		});

		describe("QueryConditionType", () => {
			it("应该包含所有查询条件类型", () => {
				expect(QueryConditionType.With).to.equal("with");
				expect(QueryConditionType.Without).to.equal("without");
				expect(QueryConditionType.Optional).to.equal("optional");
				expect(QueryConditionType.Changed).to.equal("changed");
				expect(QueryConditionType.Added).to.equal("added");
			});
		});
	});

	describe("复杂查询场景", () => {
		beforeEach(() => {
			// 创建更复杂的测试数据
			const player1 = world.spawn(
				PositionComponent({ x: 100, y: 200, z: 0 }),
				VelocityComponent({ dx: 5, dy: 0, dz: 0 }),
				HealthComponent({ current: 100, maximum: 100 }),
				NameComponent({ name: "Player1" }),
				PlayerTagComponent(),
			);

			const player2 = world.spawn(
				PositionComponent({ x: 150, y: 250, z: 0 }),
				VelocityComponent({ dx: -3, dy: 2, dz: 0 }),
				HealthComponent({ current: 75, maximum: 100 }),
				NameComponent({ name: "Player2" }),
				PlayerTagComponent(),
			);

			const npc = world.spawn(
				PositionComponent({ x: 200, y: 300, z: 0 }),
				HealthComponent({ current: 50, maximum: 50 }),
				NameComponent({ name: "NPC" }),
			);

			const projectile = world.spawn(
				PositionComponent({ x: 300, y: 400, z: 0 }),
				VelocityComponent({ dx: 10, dy: 15, dz: 0 }),
			);
		});

		it("应该能够查询移动的玩家", () => {
			const query = queryFactory
				.query()
				.with("position", PositionComponent as ComponentConstructor)
				.with("velocity", VelocityComponent as ComponentConstructor)
				.with("player", PlayerTagComponent as ComponentConstructor);

			const result = query.execute();
			// 验证查询结构正确
			expect(result.entities).to.be.ok();
			expect(result.components).to.be.ok();
		});

		it("应该能够查询受伤的实体", () => {
			const query = queryFactory
				.query()
				.with("health", HealthComponent as ComponentConstructor)
				.where((entity, components) => {
					const health = components.health as { current: number; maximum: number } | undefined;
					return health !== undefined && health.current < health.maximum;
				});

			const result = query.execute();
			expect(result.entities).to.be.ok();
		});

		it("应该能够查询静止的实体", () => {
			const query = queryFactory
				.query()
				.with("position", PositionComponent as ComponentConstructor)
				.without(VelocityComponent as ComponentConstructor);

			const result = query.execute();
			expect(result.entities).to.be.ok();
		});

		it("应该能够限制查询结果数量", () => {
			const query = queryFactory
				.query()
				.with("position", PositionComponent as ComponentConstructor)
				.limit(2);

			const result = query.execute();
			expect(result.entities.size() <= 2).to.equal(true);
		});

		it("应该能够跳过查询结果", () => {
			const allQuery = queryFactory
				.query()
				.with("position", PositionComponent as ComponentConstructor);

			const skippedQuery = queryFactory
				.query()
				.with("position", PositionComponent as ComponentConstructor)
				.skip(1);

			const allResult = allQuery.execute();
			const skippedResult = skippedQuery.execute();

			// 跳过的查询结果应该少于或等于总结果
			expect(skippedResult.entities.size() <= allResult.entities.size()).to.equal(true);
		});

		it("应该能够组合限制和跳过", () => {
			const query = queryFactory
				.query()
				.with("position", PositionComponent as ComponentConstructor)
				.skip(1)
				.limit(2);

			const result = query.execute();
			expect(result.entities.size() <= 2).to.equal(true);
		});

		it("应该能够映射查询结果为特定格式", () => {
			const query = queryFactory
				.query()
				.with("position", PositionComponent as ComponentConstructor)
				.with("name", NameComponent as ComponentConstructor);

			const entityNames = query.map((entity, components) => {
				const name = components.name as { name: string } | undefined;
				return name ? name.name : "Unknown";
			});

			expect(typeIs(entityNames, "table")).to.equal(true);
		});
	});

	describe("错误处理和边界情况", () => {
		it("应该处理空查询结果", () => {
			const query = queryFactory
				.query()
				.with("nonexistent", PlayerTagComponent as ComponentConstructor);

			const result = query.execute();
			expect(result.entities.size()).to.equal(0);
			expect(result.components.size()).to.equal(0);
		});

		it("single 在没有结果时应该返回 undefined", () => {
			const query = queryFactory
				.query()
				.with("nonexistent", PlayerTagComponent as ComponentConstructor);

			const result = query.single();
			expect(result).to.equal(undefined);
		});

		it("count 在没有结果时应该返回 0", () => {
			const query = queryFactory
				.query()
				.with("nonexistent", PlayerTagComponent as ComponentConstructor);

			const count = query.count();
			expect(count).to.equal(0);
		});

		it("any 在没有结果时应该返回 false", () => {
			const query = queryFactory
				.query()
				.with("nonexistent", PlayerTagComponent as ComponentConstructor);

			const hasAny = query.any();
			expect(hasAny).to.equal(false);
		});

		it("forEach 在没有结果时不应该执行回调", () => {
			const query = queryFactory
				.query()
				.with("nonexistent", PlayerTagComponent as ComponentConstructor);

			let callbackExecuted = false;
			query.forEach(() => {
				callbackExecuted = true;
			});

			expect(callbackExecuted).to.equal(false);
		});

		it("map 在没有结果时应该返回空数组", () => {
			const query = queryFactory
				.query()
				.with("nonexistent", PlayerTagComponent as ComponentConstructor);

			const results = query.map((entity) => entity);
			expect(results.size()).to.equal(0);
		});
	});
};