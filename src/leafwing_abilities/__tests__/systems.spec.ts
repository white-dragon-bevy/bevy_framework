import { World as BevyWorld, Context } from "../../bevy_ecs";
import { Duration, Time, Virtual, VirtualTimeResource } from "../../bevy_time";
import { LifePool } from "../premade-pools/life-pool";
import { ManaPool } from "../premade-pools/mana-pool";
import { regenerateResourcePoolSystem, createRegeneratePoolSystem } from "../systems";

export = () => {
	describe("regenerateResourcePoolSystem", () => {
		let world: BevyWorld;
		let context: Context;

		beforeEach(() => {
			// Create a fresh world for each test
			world = new BevyWorld();
			context = {} as Context;

			// Setup time resource with a fixed delta (100ms)
			const virtualContext: Virtual = {
				__brand: "Virtual",
				paused: false,
				relativeSpeed: 1.0,
				effectiveSpeed: 1.0,
				maxDelta: Duration.fromSecs(0.25),
			} as Virtual;

			const virtualTime = new Time<Virtual>(virtualContext);
			virtualTime.advanceBy(Duration.fromSecs(0.1)); // 100ms delta
			world.resources.insertResource(new VirtualTimeResource(virtualTime));
		});

		it("should regenerate LifePool resource", () => {
			// Create a life pool with 50/100 health and 10 regen per second
			const lifePool = LifePool.simple(50, 100, 10);
			world.resources.insertResource(lifePool);

			// Run the system
			regenerateResourcePoolSystem(world, context);

			// With 0.1s delta and 10 regen/s, should gain 1 health
			const updatedPool = world.resources.getResource<LifePool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(51);
		});

		it("should regenerate ManaPool resource", () => {
			// Create a mana pool with 30/100 mana and 20 regen per second
			const manaPool = ManaPool.simple(30, 100, 20);
			world.resources.insertResource(manaPool);

			// Run the system
			regenerateResourcePoolSystem(world, context);

			// With 0.1s delta and 20 regen/s, should gain 2 mana
			const updatedPool = world.resources.getResource<ManaPool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(32);
		});

		it("should regenerate multiple pool resources", () => {
			// Create both pools
			const lifePool = LifePool.simple(50, 100, 10);
			const manaPool = ManaPool.simple(30, 100, 20);

			world.resources.insertResource(lifePool);
			world.resources.insertResource(manaPool);

			// Run the system
			regenerateResourcePoolSystem(world, context);

			// Both pools should regenerate
			const updatedLife = world.resources.getResource<LifePool>();
			const updatedMana = world.resources.getResource<ManaPool>();

			expect(updatedLife).to.be.ok();
			expect(updatedLife!.current()).to.equal(51);

			expect(updatedMana).to.be.ok();
			expect(updatedMana!.current()).to.equal(32);
		});

		it("should not exceed maximum when regenerating", () => {
			// Create a pool close to max with high regen
			const lifePool = LifePool.simple(99, 100, 50);
			world.resources.insertResource(lifePool);

			// Run the system
			regenerateResourcePoolSystem(world, context);

			// Should clamp to maximum (100)
			const updatedPool = world.resources.getResource<LifePool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(100);
			expect(updatedPool!.isFull()).to.equal(true);
		});

		it("should do nothing without time resource", () => {
			// Remove time resource
			world.resources.removeResource<VirtualTimeResource>();

			const lifePool = LifePool.simple(50, 100, 10);
			world.resources.insertResource(lifePool);

			// Run the system
			regenerateResourcePoolSystem(world, context);

			// Pool should remain unchanged
			const updatedPool = world.resources.getResource<LifePool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(50);
		});

		it("should work with zero delta time", () => {
			// Setup with zero delta
			const virtualContext: Virtual = {
				__brand: "Virtual",
				paused: false,
				relativeSpeed: 1.0,
				effectiveSpeed: 1.0,
				maxDelta: Duration.fromSecs(0.25),
			} as Virtual;

			const virtualTime = new Time<Virtual>(virtualContext);
			// Don't advance time, delta will be 0
			world.resources.insertResource(new VirtualTimeResource(virtualTime));

			const lifePool = LifePool.simple(50, 100, 10);
			world.resources.insertResource(lifePool);

			// Run the system
			regenerateResourcePoolSystem(world, context);

			// Pool should remain unchanged with zero delta
			const updatedPool = world.resources.getResource<LifePool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(50);
		});

		it("should regenerate over multiple frames", () => {
			const lifePool = LifePool.simple(50, 100, 10);
			world.resources.insertResource(lifePool);

			// Simulate 5 frames
			for (let frameIndex = 0; frameIndex < 5; frameIndex++) {
				regenerateResourcePoolSystem(world, context);
			}

			// With 0.1s delta * 5 frames = 0.5s, and 10 regen/s = 5 health gained
			const updatedPool = world.resources.getResource<LifePool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(55);
		});
	});

	describe("createRegeneratePoolSystem", () => {
		let world: BevyWorld;
		let context: Context;

		beforeEach(() => {
			world = new BevyWorld();
			context = {} as Context;

			// Setup time resource with a fixed delta (100ms)
			const virtualContext: Virtual = {
				__brand: "Virtual",
				paused: false,
				relativeSpeed: 1.0,
				effectiveSpeed: 1.0,
				maxDelta: Duration.fromSecs(0.25),
			} as Virtual;

			const virtualTime = new Time<Virtual>(virtualContext);
			virtualTime.advanceBy(Duration.fromSecs(0.1)); // 100ms delta
			world.resources.insertResource(new VirtualTimeResource(virtualTime));
		});

		it("should regenerate specific pool type", () => {
			const lifePool = LifePool.simple(50, 100, 10);
			world.resources.insertResource(lifePool);

			// Create type-specific system
			const regenerateLifePool = createRegeneratePoolSystem<LifePool>(
				(w) => w.resources.getResource<LifePool>(),
			);

			// Run the system
			regenerateLifePool(world, context);

			// Pool should regenerate
			const updatedPool = world.resources.getResource<LifePool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(51);
		});

		it("should do nothing when pool does not exist", () => {
			// Create system for non-existent pool
			const regenerateLifePool = createRegeneratePoolSystem<LifePool>(
				(w) => w.resources.getResource<LifePool>(),
			);

			// Run the system (should not error)
			regenerateLifePool(world, context);

			// Should complete without errors
			expect(world.resources.getResource<LifePool>()).to.never.be.ok();
		});

		it("should work with custom getter function", () => {
			const manaPool = ManaPool.simple(30, 100, 20);
			world.resources.insertResource(manaPool);

			// Create system with custom logic
			const regenerateManaPool = createRegeneratePoolSystem<ManaPool>((w) => {
				const pool = w.resources.getResource<ManaPool>();
				// Only regenerate if below 50%
				if (pool && pool.getPercentage() < 0.5) {
					return pool;
				} else {
					return undefined;
				}
			});

			// Run the system (should regenerate since at 30%)
			regenerateManaPool(world, context);

			const updatedPool = world.resources.getResource<ManaPool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(32);
		});

		it("should not regenerate when custom getter returns undefined", () => {
			const manaPool = ManaPool.simple(60, 100, 20);
			world.resources.insertResource(manaPool);

			// Create system with custom logic
			const regenerateManaPool = createRegeneratePoolSystem<ManaPool>((w) => {
				const pool = w.resources.getResource<ManaPool>();
				// Only regenerate if below 50%
				if (pool && pool.getPercentage() < 0.5) {
					return pool;
				} else {
					return undefined;
				}
			});

			// Run the system (should NOT regenerate since at 60%)
			regenerateManaPool(world, context);

			const updatedPool = world.resources.getResource<ManaPool>();
			expect(updatedPool).to.be.ok();
			expect(updatedPool!.current()).to.equal(60); // Unchanged
		});
	});
};
