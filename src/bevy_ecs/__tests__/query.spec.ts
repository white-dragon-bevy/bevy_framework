/**
 * @fileoverview Tests for query system with filters
 */

import { component } from "@rbxts/matter";
import { World } from "../bevy-world";
import { Added, Changed } from "../change-detection";
import { With, Without, Or, And } from "../query";

// Test components
const Position = component<{ x: number; y: number }>("Query_Position");
const Velocity = component<{ x: number; y: number }>("Query_Velocity");
const Health = component<{ value: number }>("Query_Health");
const Enemy = component<{ damage: number }>("Query_Enemy");
const Player = component<{ name: string }>("Query_Player");

// Prevent tree-shaking by using classes
const _preventTreeShaking = { With, Without, Or, And, Added, Changed };

export = () => {
	describe("Query System", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		describe("With filter", () => {
			it("should match entities with specified component", () => {
				const entity1 = world.spawn(Position({ x: 0, y: 0 }), Velocity({ x: 1, y: 1 }));
				const entity2 = world.spawn(Position({ x: 5, y: 5 }));
				const entity3 = world.spawn(Velocity({ x: 2, y: 2 }));

				const results = world.queryWith(Position).with(Velocity).collect();

				expect(results.size()).to.equal(1);
				expect(results[0]![0]).to.equal(entity1);
			});

			it("should return empty results when no entities match", () => {
				world.spawn(Position({ x: 0, y: 0 }));
				world.spawn(Velocity({ x: 1, y: 1 }));

				const results = world.queryWith(Position).with(Health).collect();

				expect(results.size()).to.equal(0);
			});
		});

		describe("Without filter", () => {
			it("should match entities without specified component", () => {
				const entity1 = world.spawn(Position({ x: 0, y: 0 }));
				const entity2 = world.spawn(Position({ x: 5, y: 5 }), Velocity({ x: 1, y: 1 }));
				const entity3 = world.spawn(Position({ x: 10, y: 10 }));

				const results = world.queryWith(Position).without(Velocity).collect();

				expect(results.size()).to.equal(2);
				const entityIds = results.map((result) => result[0]);
				expect(entityIds.indexOf(entity1) !== -1).to.equal(true);
				expect(entityIds.indexOf(entity3) !== -1).to.equal(true);
			});
		});

		describe("Combined filters", () => {
			it("should handle With and Without together", () => {
				const entity1 = world.spawn(Position({ x: 0, y: 0 }), Health({ value: 100 }));
				const entity2 = world.spawn(Position({ x: 5, y: 5 }), Health({ value: 50 }), Enemy({ damage: 10 }));
				const entity3 = world.spawn(Position({ x: 10, y: 10 }), Enemy({ damage: 20 }));

				const results = world.queryWith(Position).with(Health).without(Enemy).collect();

				expect(results.size()).to.equal(1);
				expect(results[0][0]).to.equal(entity1);
			});

			it("should handle multiple With filters", () => {
				const entity1 = world.spawn(
					Position({ x: 0, y: 0 }),
					Velocity({ x: 1, y: 1 }),
					Health({ value: 100 }),
				);
				const entity2 = world.spawn(Position({ x: 5, y: 5 }), Velocity({ x: 2, y: 2 }));
				const entity3 = world.spawn(Position({ x: 10, y: 10 }), Health({ value: 50 }));

				const results = world.queryWith(Position).with(Velocity).with(Health).collect();

				expect(results.size()).to.equal(1);
				expect(results[0][0]).to.equal(entity1);
			});
		});

		describe("Or filter", () => {
			it("should match entities that satisfy any filter", () => {
				const entity1 = world.spawn(Position({ x: 0, y: 0 }), Enemy({ damage: 10 }));
				const entity2 = world.spawn(Position({ x: 5, y: 5 }), Player({ name: "Alice" }));
				const entity3 = world.spawn(Position({ x: 10, y: 10 }), Health({ value: 100 }));

				const results = world.queryWith(Position).or(new With(Enemy), new With(Player)).collect();

				expect(results.size()).to.equal(2);
				const entityIds = results.map((result) => result[0]);
				expect(entityIds.indexOf(entity1) !== -1).to.equal(true);
				expect(entityIds.indexOf(entity2) !== -1).to.equal(true);
			});
		});

		describe("And filter", () => {
			it("should match entities that satisfy all filters", () => {
				const entity1 = world.spawn(Position({ x: 0, y: 0 }), Enemy({ damage: 10 }), Health({ value: 50 }));
				const entity2 = world.spawn(Position({ x: 5, y: 5 }), Enemy({ damage: 20 }));
				const entity3 = world.spawn(Position({ x: 10, y: 10 }), Health({ value: 100 }));

				const results = world
					.queryWith(Position)
					.and(new With(Enemy), new With(Health))
					.collect();

				expect(results.size()).to.equal(1);
				expect(results[0][0]).to.equal(entity1);
			});
		});

		describe("QueryBuilder methods", () => {
			it("should count matching entities", () => {
				world.spawn(Position({ x: 0, y: 0 }));
				world.spawn(Position({ x: 5, y: 5 }));
				world.spawn(Position({ x: 10, y: 10 }));
				world.spawn(Velocity({ x: 1, y: 1 }));

				const totalCount = world.queryWith(Position).count();

				expect(totalCount).to.equal(3);
			});

			it("should check if any entities match", () => {
				world.spawn(Position({ x: 0, y: 0 }));

				const hasAny = world.queryWith(Position).any();
				const hasHealth = world.queryWith(Health).any();

				expect(hasAny).to.equal(true);
				expect(hasHealth).to.equal(false);
			});

			it("should get first matching entity", () => {
				world.spawn(Position({ x: 0, y: 0 }));
				const entity2 = world.spawn(Position({ x: 5, y: 5 }), Velocity({ x: 1, y: 1 }));

				const firstResult = world.queryWith(Position).with(Velocity).first();

				expect(firstResult).to.be.ok();
				expect(firstResult![0]).to.equal(entity2);
			});

			it("should return undefined when no entities match", () => {
				world.spawn(Position({ x: 0, y: 0 }));

				const firstResult = world.queryWith(Position).with(Health).first();

				expect(firstResult).to.equal(undefined);
			});
		});

		describe("Iteration", () => {
			it("should iterate over matching entities", () => {
				const entity1 = world.spawn(Position({ x: 1, y: 2 }), Velocity({ x: 10, y: 20 }));
				const entity2 = world.spawn(Position({ x: 3, y: 4 }), Velocity({ x: 30, y: 40 }));
				world.spawn(Position({ x: 5, y: 6 }));

				const results: Array<[number, { x: number; y: number }]> = [];
				for (const [entity, position] of world.queryWith(Position).with(Velocity).iter()) {
					results.push([entity, position]);
				}

				expect(results.size()).to.equal(2);
				expect(results[0][0]).to.equal(entity1);
				expect(results[0][1].x).to.equal(1);
				expect(results[0][1].y).to.equal(2);
				expect(results[1][0]).to.equal(entity2);
				expect(results[1][1].x).to.equal(3);
				expect(results[1][1].y).to.equal(4);
			});
		});
	});

	describe("Change Detection", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		describe("Added filter", () => {
			it("should detect newly added components", () => {
				const entity1 = world.spawn(Position({ x: 0, y: 0 }));
				const entity2 = world.spawn(Position({ x: 5, y: 5 }));

				const addedFilter = new Added(Position, world.changeTracker);
				const results: number[] = [];

				for (const [entity, _position] of world.queryWith(Position).iter()) {
					if (addedFilter.matches(world, entity as never)) {
						results.push(entity);
					}
				}

				expect(results.size()).to.equal(2);
				expect(results.indexOf(entity1) !== -1).to.equal(true);
				expect(results.indexOf(entity2) !== -1).to.equal(true);
			});

			it("should not detect components after tick update", () => {
				const entity = world.spawn(Position({ x: 0, y: 0 }));

				const addedFilter = new Added(Position, world.changeTracker);
				addedFilter.updateLastCheckTick();

				world.incrementTick();

				const matches = addedFilter.matches(world, entity);

				expect(matches).to.equal(false);
			});

			it("should detect components inserted after spawn", () => {
				const entity = world.spawn(Position({ x: 0, y: 0 }));

				const addedFilter = new Added(Velocity, world.changeTracker);
				addedFilter.reset();

				world.incrementTick();
				world.insert(entity, Velocity({ x: 1, y: 1 }));

				const matches = addedFilter.matches(world, entity);

				expect(matches).to.equal(true);
			});
		});

		describe("Changed filter", () => {
			it("should detect component changes via insert", () => {
				const entity = world.spawn(Position({ x: 0, y: 0 }));

				const changedFilter = new Changed(Position, world.changeTracker);
				changedFilter.updateLastCheckTick();

				world.incrementTick();
				world.insert(entity, Position({ x: 10, y: 10 }));

				const matches = changedFilter.matches(world, entity);

				expect(matches).to.equal(true);
			});

			it("should not detect changes before tracking starts", () => {
				const entity = world.spawn(Position({ x: 0, y: 0 }));

				const changedFilter = new Changed(Position, world.changeTracker);
				changedFilter.reset();

				const matches = changedFilter.matches(world, entity);

				expect(matches).to.equal(false);
			});
		});

		describe("ChangeTracker cleanup", () => {
			it("should cleanup entity data on despawn", () => {
				const entity = world.spawn(Position({ x: 0, y: 0 }));

				world.despawn(entity);

				const addedFilter = new Added(Position, world.changeTracker);
				const matches = addedFilter.matches(world, entity);

				expect(matches).to.equal(false);
			});

			it("should clear old tracking data", () => {
				const entity = world.spawn(Position({ x: 0, y: 0 }));

				// Advance time significantly
				for (let index = 0; index < 150; index++) {
					world.incrementTick();
				}

				world.clearTrackers();

				// Old data should be cleared
				const addedFilter = new Added(Position, world.changeTracker);
				const matches = addedFilter.matches(world, entity);

				expect(matches).to.equal(false);
			});
		});
	});

	describe("Performance", () => {
		it("should handle large numbers of entities efficiently", () => {
			const world = new World();
			const entityCount = 1000;

			const startTime = os.clock();

			// Spawn many entities
			const entities: number[] = [];
			for (let index = 0; index < entityCount; index++) {
				entities.push(world.spawn(Position({ x: index, y: index })));
			}

			// Add Velocity to half of them
			for (let index = 0; index < entityCount / 2; index++) {
				world.insert(entities[index] as never, Velocity({ x: 1, y: 1 }));
			}

			const spawnTime = os.clock() - startTime;

			// Query with filters
			const queryStart = os.clock();
			const results = world.queryWith(Position).with(Velocity).collect();
			const queryTime = os.clock() - queryStart;

			expect(results.size()).to.equal(entityCount / 2);
			expect(spawnTime < 1.0).to.equal(true); // Should complete in < 1 second
			expect(queryTime < 0.1).to.equal(true); // Should complete in < 100ms
		});
	});
};