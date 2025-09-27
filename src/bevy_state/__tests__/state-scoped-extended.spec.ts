/**
 * state-scoped-extended.spec.ts - 状态作用域系统扩展单元测试
 * 测试状态作用域系统的高级功能和边界情况
 */

import { World, Entity } from "@rbxts/matter";
import { EnumStates, States } from "../states";
import {
	DespawnStrategy,
	StateScoped,
	markForDespawnOnExit,
	markForDespawnOnEnter,
	markEntitiesForDespawnOnExit,
	markEntitiesForDespawnOnEnter,
	getStateScopedData,
	removeStateScopedMarker,
	getEntitiesInState,
	despawnAllInState,
	cleanupOnStateExit,
	cleanupOnStateEnter,
} from "../state-scoped";

class TestState extends EnumStates {
	public static readonly MENU = new TestState("Menu");
	public static readonly PLAYING = new TestState("Playing");
	public static readonly PAUSED = new TestState("Paused");
}

export = () => {
	let world: World;

	beforeEach(() => {
		world = new World();
	});

	afterEach(() => {
		world = undefined as unknown as World;
	});

	describe("markForDespawnOnExit", () => {
		it("should mark entity with correct strategy", () => {
			const entityId = world.spawn();

			markForDespawnOnExit(world, entityId, TestState.MENU);

			const data = getStateScopedData(world, entityId);

			expect(data).to.be.ok();
			expect(data!.strategy).to.equal(DespawnStrategy.OnExit);
			expect(data!.stateId).to.equal("Menu");
		});

		it("should support recursive flag", () => {
			const entityId = world.spawn();

			markForDespawnOnExit(world, entityId, TestState.MENU, true);

			const data = getStateScopedData(world, entityId);

			expect(data).to.be.ok();
			expect(data!.recursive).to.equal(true);
		});

		it("should default recursive to false", () => {
			const entityId = world.spawn();

			markForDespawnOnExit(world, entityId, TestState.MENU);

			const data = getStateScopedData(world, entityId);

			expect(data).to.be.ok();
			expect(data!.recursive).to.equal(false);
		});
	});

	describe("markForDespawnOnEnter", () => {
		it("should mark entity with correct strategy", () => {
			const entityId = world.spawn();

			markForDespawnOnEnter(world, entityId, TestState.PLAYING);

			const data = getStateScopedData(world, entityId);

			expect(data).to.be.ok();
			expect(data!.strategy).to.equal(DespawnStrategy.OnEnter);
			expect(data!.stateId).to.equal("Playing");
		});

		it("should support recursive flag", () => {
			const entityId = world.spawn();

			markForDespawnOnEnter(world, entityId, TestState.PLAYING, true);

			const data = getStateScopedData(world, entityId);

			expect(data).to.be.ok();
			expect(data!.recursive).to.equal(true);
		});
	});

	describe("批量标记函数", () => {
		it("markEntitiesForDespawnOnExit should mark multiple entities", () => {
			const entities = [world.spawn(), world.spawn(), world.spawn()];

			markEntitiesForDespawnOnExit(world, entities, TestState.MENU);

			for (const entityId of entities) {
				const data = getStateScopedData(world, entityId);
				expect(data).to.be.ok();
				expect(data!.strategy).to.equal(DespawnStrategy.OnExit);
				expect(data!.stateId).to.equal("Menu");
			}
		});

		it("markEntitiesForDespawnOnEnter should mark multiple entities", () => {
			const entities = [world.spawn(), world.spawn(), world.spawn()];

			markEntitiesForDespawnOnEnter(world, entities, TestState.PLAYING);

			for (const entityId of entities) {
				const data = getStateScopedData(world, entityId);
				expect(data).to.be.ok();
				expect(data!.strategy).to.equal(DespawnStrategy.OnEnter);
				expect(data!.stateId).to.equal("Playing");
			}
		});

		it("should handle empty array", () => {
			const entities: Array<Entity> = [];

			expect(() => {
				markEntitiesForDespawnOnExit(world, entities, TestState.MENU);
			}).never.to.throw();

			expect(() => {
				markEntitiesForDespawnOnEnter(world, entities, TestState.PLAYING);
			}).never.to.throw();
		});

		it("should support recursive flag for batch operations", () => {
			const entities = [world.spawn(), world.spawn()];

			markEntitiesForDespawnOnExit(world, entities, TestState.MENU, true);

			for (const entityId of entities) {
				const data = getStateScopedData(world, entityId);
				expect(data).to.be.ok();
				expect(data!.recursive).to.equal(true);
			}
		});
	});

	describe("getEntitiesInState", () => {
		it("should find entities marked for specific state", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();
			const entity3 = world.spawn();

			markForDespawnOnExit(world, entity1, TestState.MENU);
			markForDespawnOnExit(world, entity2, TestState.MENU);
			markForDespawnOnExit(world, entity3, TestState.PLAYING);

			const menuEntities = getEntitiesInState(world, TestState.MENU);

			expect(menuEntities.size()).to.equal(2);
			expect(menuEntities.includes(entity1)).to.equal(true);
			expect(menuEntities.includes(entity2)).to.equal(true);
		});

		it("should filter by strategy", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnExit(world, entity1, TestState.MENU);
			markForDespawnOnEnter(world, entity2, TestState.MENU);

			const exitEntities = getEntitiesInState(world, TestState.MENU, DespawnStrategy.OnExit);
			const enterEntities = getEntitiesInState(world, TestState.MENU, DespawnStrategy.OnEnter);

			expect(exitEntities.size()).to.equal(1);
			expect(exitEntities[0]).to.equal(entity1);
			expect(enterEntities.size()).to.equal(1);
			expect(enterEntities[0]).to.equal(entity2);
		});

		it("should return empty array when no entities match", () => {
			const entities = getEntitiesInState(world, TestState.PAUSED);

			expect(entities.size()).to.equal(0);
		});
	});

	describe("removeStateScopedMarker", () => {
		it("should remove marker from entity", () => {
			const entityId = world.spawn();

			markForDespawnOnExit(world, entityId, TestState.MENU);
			expect(getStateScopedData(world, entityId)).to.be.ok();

			removeStateScopedMarker(world, entityId);
			expect(getStateScopedData(world, entityId)).never.to.be.ok();
		});

		it("should not throw when entity has no marker", () => {
			const entityId = world.spawn();

			expect(() => {
				removeStateScopedMarker(world, entityId);
			}).never.to.throw();
		});
	});

	describe("cleanupOnStateExit", () => {
		it("should despawn entities marked for exit", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();
			const entity3 = world.spawn();

			markForDespawnOnExit(world, entity1, TestState.MENU);
			markForDespawnOnExit(world, entity2, TestState.MENU);
			markForDespawnOnEnter(world, entity3, TestState.MENU);

			cleanupOnStateExit(world, TestState.MENU);

			expect(world.contains(entity1)).to.equal(false);
			expect(world.contains(entity2)).to.equal(false);
			expect(world.contains(entity3)).to.equal(true);
		});

		it("should not despawn entities from different states", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnExit(world, entity1, TestState.MENU);
			markForDespawnOnExit(world, entity2, TestState.PLAYING);

			cleanupOnStateExit(world, TestState.MENU);

			expect(world.contains(entity1)).to.equal(false);
			expect(world.contains(entity2)).to.equal(true);
		});
	});

	describe("cleanupOnStateEnter", () => {
		it("should despawn entities marked for enter", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();
			const entity3 = world.spawn();

			markForDespawnOnEnter(world, entity1, TestState.PLAYING);
			markForDespawnOnEnter(world, entity2, TestState.PLAYING);
			markForDespawnOnExit(world, entity3, TestState.PLAYING);

			cleanupOnStateEnter(world, TestState.PLAYING);

			expect(world.contains(entity1)).to.equal(false);
			expect(world.contains(entity2)).to.equal(false);
			expect(world.contains(entity3)).to.equal(true);
		});

		it("should not despawn entities from different states", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnEnter(world, entity1, TestState.PLAYING);
			markForDespawnOnEnter(world, entity2, TestState.MENU);

			cleanupOnStateEnter(world, TestState.PLAYING);

			expect(world.contains(entity1)).to.equal(false);
			expect(world.contains(entity2)).to.equal(true);
		});
	});

	describe("despawnAllInState", () => {
		it("should despawn all entities in state", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnExit(world, entity1, TestState.MENU);
			markForDespawnOnEnter(world, entity2, TestState.MENU);

			despawnAllInState(world, TestState.MENU);

			expect(world.contains(entity1)).to.equal(false);
			expect(world.contains(entity2)).to.equal(false);
		});

		it("should filter by strategy when provided", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnExit(world, entity1, TestState.MENU);
			markForDespawnOnEnter(world, entity2, TestState.MENU);

			despawnAllInState(world, TestState.MENU, DespawnStrategy.OnExit);

			expect(world.contains(entity1)).to.equal(false);
			expect(world.contains(entity2)).to.equal(true);
		});
	});

	describe("边界条件测试", () => {
		it("should handle large number of entities", () => {
			const entities: Array<Entity> = [];

			for (let index = 1; index <= 100; index++) {
				entities.push(world.spawn());
			}

			markEntitiesForDespawnOnExit(world, entities, TestState.MENU);

			cleanupOnStateExit(world, TestState.MENU);

			for (const entityId of entities) {
				expect(world.contains(entityId)).to.equal(false);
			}
		});

		it("should handle entities with same state but different strategies", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnExit(world, entity1, TestState.MENU);
			markForDespawnOnEnter(world, entity2, TestState.MENU);

			cleanupOnStateExit(world, TestState.MENU);

			expect(world.contains(entity1)).to.equal(false);
			expect(world.contains(entity2)).to.equal(true);

			cleanupOnStateEnter(world, TestState.MENU);

			expect(world.contains(entity2)).to.equal(false);
		});

		it("should handle non-existent entity cleanup gracefully", () => {
			const entityId = world.spawn();

			markForDespawnOnExit(world, entityId, TestState.MENU);
			world.despawn(entityId);

			expect(() => {
				cleanupOnStateExit(world, TestState.MENU);
			}).never.to.throw();
		});

		it("should handle cleanup on empty world", () => {
			expect(() => {
				cleanupOnStateExit(world, TestState.MENU);
				cleanupOnStateEnter(world, TestState.PLAYING);
			}).never.to.throw();
		});
	});

	describe("性能测试", () => {
		it("should handle 1000+ entities efficiently", () => {
			const entities: Array<Entity> = [];
			const entityCount = 1000;

			for (let index = 1; index <= entityCount; index++) {
				entities.push(world.spawn());
			}

			markEntitiesForDespawnOnExit(world, entities, TestState.MENU);

			const foundEntities = getEntitiesInState(world, TestState.MENU);

			expect(foundEntities.size()).to.equal(entityCount);

			cleanupOnStateExit(world, TestState.MENU);

			for (const entityId of entities) {
				expect(world.contains(entityId)).to.equal(false);
			}
		});

		it("should efficiently filter entities by strategy", () => {
			const exitEntities: Array<Entity> = [];
			const enterEntities: Array<Entity> = [];

			for (let index = 1; index <= 500; index++) {
				const exitEntity = world.spawn();
				const enterEntity = world.spawn();

				exitEntities.push(exitEntity);
				enterEntities.push(enterEntity);
			}

			markEntitiesForDespawnOnExit(world, exitEntities, TestState.MENU);
			markEntitiesForDespawnOnEnter(world, enterEntities, TestState.MENU);

			const foundExitEntities = getEntitiesInState(world, TestState.MENU, DespawnStrategy.OnExit);
			const foundEnterEntities = getEntitiesInState(world, TestState.MENU, DespawnStrategy.OnEnter);

			expect(foundExitEntities.size()).to.equal(500);
			expect(foundEnterEntities.size()).to.equal(500);
		});
	});

	describe("递归清理功能占位测试", () => {
		it("should mark entity as recursive", () => {
			const entityId = world.spawn();

			markForDespawnOnExit(world, entityId, TestState.MENU, true);

			const data = getStateScopedData(world, entityId);

			expect(data).to.be.ok();
			expect(data!.recursive).to.equal(true);
		});

		it("should clean up entity marked as recursive", () => {
			const entityId = world.spawn();

			markForDespawnOnExit(world, entityId, TestState.MENU, true);

			cleanupOnStateExit(world, TestState.MENU);

			expect(world.contains(entityId)).to.equal(false);
		});
	});
};