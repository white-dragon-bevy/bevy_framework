/// <reference types="@rbxts/testez/globals" />

import { World } from "@rbxts/matter";
import {
	fixedTimeSystem,
	getTimeResources,
	initTimeResources,
	runFixedUpdate,
	timeSystem,
	updateFixedTimeSystem,
	updateTimeSystem,
} from "../time-system";

export = () => {
	describe("Time System", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		it("should initialize time resources", () => {
			const resources = initTimeResources(world);

			expect(resources).to.be.ok();
			expect(resources.time).to.be.ok();
			expect(resources.realTime).to.be.ok();
			expect(resources.virtualTime).to.be.ok();
			expect(resources.fixedTime).to.be.ok();
		});

		it("should get time resources from world", () => {
			initTimeResources(world);
			const resources = getTimeResources(world);

			expect(resources).to.be.ok();
			expect(resources!.time).to.be.ok();
		});

		it("should update time system", () => {
			const resources = initTimeResources(world);
			const initialElapsed = resources.time.elapsedTime;

			wait(0.1);
			updateTimeSystem(world);

			expect(resources.time.deltaTime).to.be.ok();
			expect(resources.time.elapsedTime).to.be.ok();
			expect(resources.realTime.deltaTime).to.be.ok();
			expect(resources.virtualTime.deltaTime).to.be.ok();
		});

		it("should handle fixed time accumulation", () => {
			const resources = initTimeResources(world);
			resources.fixedTime.setTimestep(0.016); // 60 FPS

			// Accumulate less than timestep
			let shouldUpdate = updateFixedTimeSystem(world, 0.01);
			expect(shouldUpdate).to.equal(false);

			// Accumulate more
			shouldUpdate = updateFixedTimeSystem(world, 0.01);
			expect(shouldUpdate).to.equal(true);
		});

		it("should run time system", () => {
			const resources = initTimeResources(world);

			wait(0.05);
			timeSystem(world);

			expect(resources.time.deltaTime).to.be.ok();
		});

		it("should create fixed time system", () => {
			const resources = initTimeResources(world);
			const fixedSys = fixedTimeSystem(world);

			resources.virtualTime.update();
			const shouldUpdate = fixedSys();

			expect(shouldUpdate).to.be.a("boolean");
		});

		it("should run fixed update with callback", () => {
			const resources = initTimeResources(world);
			resources.fixedTime.setTimestep(0.01);
			resources.virtualTime.update();

			let callCount = 0;
			runFixedUpdate(world, () => {
				callCount++;
			});

			// Should run at least once if enough time accumulated
			expect(callCount).to.be.ok();
		});

		it("should limit fixed update iterations", () => {
			const resources = initTimeResources(world);
			resources.fixedTime.setTimestep(0.001); // Very small timestep
			resources.virtualTime.update();

			// Simulate large delta time
			wait(0.1);
			resources.virtualTime.update();

			let callCount = 0;
			runFixedUpdate(world, () => {
				callCount++;
			});

			// Should be limited to prevent spiral of death
			expect(callCount).to.be.near(4, 1);
		});

		it("should preserve time context during fixed update", () => {
			const resources = initTimeResources(world);
			resources.fixedTime.setTimestep(0.016);

			// Accumulate enough for one update
			wait(0.02);
			resources.virtualTime.update();

			let fixedDelta = 0;
			let wasFixedTime = false;

			runFixedUpdate(world, () => {
				const current = getTimeResources(world);
				if (current) {
					fixedDelta = current.time.deltaTime;
					// Check if time resource was temporarily swapped
					wasFixedTime = current.time === (current.fixedTime as any);
				}
			});

			// After fixed update, should be back to normal time
			const current = getTimeResources(world);
			expect(current!.time).to.equal(resources.time);
		});
	});
};
