/**
 * state-scoped.spec.ts - StateScoped 功能单元测试
 */

import { World } from "@rbxts/matter";
import {
	StateScoped,
	DespawnStrategy,
	markForDespawnOnExit,
	markForDespawnOnEnter,
	getStateScopedData,
	removeStateScopedMarker,
	getEntitiesInState,
	despawnAllInState,
	cleanupOnStateExit,
	cleanupOnStateEnter,
} from "../state-scoped";
import { EnumStates } from "../states";

// 测试状态
const TestStates = {
	Menu: new EnumStates("menu"),
	Game: new EnumStates("game"),
	Paused: new EnumStates("paused"),
};

export = () => {
	let world: World;

	beforeEach(() => {
		world = new World();
	});

	afterEach(() => {
		// Cleanup
	});

	describe("StateScoped Component", () => {
		it("should create StateScoped component with correct data", () => {
			const entity = world.spawn();
			markForDespawnOnExit(world, entity, TestStates.Menu, false);

			const stateScoped = getStateScopedData(world, entity);
			expect(stateScoped).to.be.ok();
			expect(stateScoped?.stateId).to.equal("menu");
			expect(stateScoped?.strategy).to.equal(DespawnStrategy.OnExit);
			expect(stateScoped?.recursive).to.equal(false);
		});

		it("should create StateScoped component with recursive flag", () => {
			const entity = world.spawn();
			markForDespawnOnExit(world, entity, TestStates.Menu, true);

			const stateScoped = getStateScopedData(world, entity);
			expect(stateScoped).to.be.ok();
			expect(stateScoped?.recursive).to.equal(true);
		});
	});

	describe("markForDespawnOnExit", () => {
		it("should mark entity for despawn on exit", () => {
			const entity = world.spawn();
			markForDespawnOnExit(world, entity, TestStates.Menu);

			const stateScoped = world.get(entity, StateScoped);
			expect(stateScoped).to.be.ok();
			expect(stateScoped?.stateId).to.equal("menu");
			expect(stateScoped?.strategy).to.equal(DespawnStrategy.OnExit);
		});
	});

	describe("markForDespawnOnEnter", () => {
		it("should mark entity for despawn on enter", () => {
			const entity = world.spawn();
			markForDespawnOnEnter(world, entity, TestStates.Game);

			const stateScoped = world.get(entity, StateScoped);
			expect(stateScoped).to.be.ok();
			expect(stateScoped?.stateId).to.equal("game");
			expect(stateScoped?.strategy).to.equal(DespawnStrategy.OnEnter);
		});
	});

	describe("removeStateScopedMarker", () => {
		it("should remove StateScoped component from entity", () => {
			const entity = world.spawn();
			markForDespawnOnExit(world, entity, TestStates.Menu);

			expect(world.get(entity, StateScoped)).to.be.ok();

			removeStateScopedMarker(world, entity);
			expect(world.get(entity, StateScoped)).to.never.be.ok();
		});
	});

	describe("getEntitiesInState", () => {
		it("should return entities marked for specific state", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();
			const entity3 = world.spawn();

			markForDespawnOnExit(world, entity1, TestStates.Menu);
			markForDespawnOnExit(world, entity2, TestStates.Menu);
			markForDespawnOnEnter(world, entity3, TestStates.Game);

			const menuEntities = getEntitiesInState(world, TestStates.Menu);
			expect(menuEntities.size()).to.equal(2);
			expect(menuEntities.includes(entity1)).to.equal(true);
			expect(menuEntities.includes(entity2)).to.equal(true);
			expect(menuEntities.includes(entity3)).to.equal(false);
		});

		it("should filter by strategy", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnExit(world, entity1, TestStates.Menu);
			markForDespawnOnEnter(world, entity2, TestStates.Menu);

			const exitEntities = getEntitiesInState(world, TestStates.Menu, DespawnStrategy.OnExit);
			expect(exitEntities.size()).to.equal(1);
			expect(exitEntities.includes(entity1)).to.equal(true);

			const enterEntities = getEntitiesInState(world, TestStates.Menu, DespawnStrategy.OnEnter);
			expect(enterEntities.size()).to.equal(1);
			expect(enterEntities.includes(entity2)).to.equal(true);
		});
	});

	describe("despawnAllInState", () => {
		it("should despawn all entities in state", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();
			const entity3 = world.spawn();

			markForDespawnOnExit(world, entity1, TestStates.Menu);
			markForDespawnOnExit(world, entity2, TestStates.Menu);
			markForDespawnOnExit(world, entity3, TestStates.Game);

			// 验证实体存在
			expect(world.contains(entity1)).to.equal(true);
			expect(world.contains(entity2)).to.equal(true);
			expect(world.contains(entity3)).to.equal(true);

			despawnAllInState(world, TestStates.Menu);

			// 验证Menu状态的实体被清理
			expect(world.contains(entity1)).to.equal(false);
			expect(world.contains(entity2)).to.equal(false);
			// Game状态的实体应该还在
			expect(world.contains(entity3)).to.equal(true);
		});
	});

	describe("cleanupOnStateExit", () => {
		it("should despawn entities when exiting state", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnExit(world, entity1, TestStates.Menu);
			markForDespawnOnExit(world, entity2, TestStates.Game);

			// 验证实体存在
			expect(world.contains(entity1)).to.equal(true);
			expect(world.contains(entity2)).to.equal(true);

			// 执行清理 - 从 Menu 退出
			cleanupOnStateExit(world, TestStates.Menu);

			// Menu状态的实体应该被清理
			expect(world.contains(entity1)).to.equal(false);
			// Game状态的实体应该还在
			expect(world.contains(entity2)).to.equal(true);
		});
	});

	describe("cleanupOnStateEnter", () => {
		it("should despawn entities when entering state", () => {
			const entity1 = world.spawn();
			const entity2 = world.spawn();

			markForDespawnOnEnter(world, entity1, TestStates.Game);
			markForDespawnOnEnter(world, entity2, TestStates.Menu);

			// 验证实体存在
			expect(world.contains(entity1)).to.equal(true);
			expect(world.contains(entity2)).to.equal(true);

			// 执行清理 - 进入Game状态
			cleanupOnStateEnter(world, TestStates.Game);

			// Game状态的实体应该被清理
			expect(world.contains(entity1)).to.equal(false);
			// Menu状态的实体应该还在
			expect(world.contains(entity2)).to.equal(true);
		});
	});
};