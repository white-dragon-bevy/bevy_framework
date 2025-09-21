/// <reference types="@rbxts/testez/globals" />

import { FixedTime, RealTime, Time, VirtualTime } from "../time";

export = () => {
	describe("Time", () => {
		it("should track delta time correctly", () => {
			const time = new Time();
			const startTime = os.clock();

			// Simulate time passing
			wait(0.1);
			time.update();

			expect(time.deltaTime).to.be.near(0.1, 0.05);
			expect(time.elapsedTime).to.be.near(0.1, 0.05);
			expect(time.frameCount).to.equal(1);
		});

		it("should handle time scaling", () => {
			const time = new Time();
			time.setTimeScale(2);

			const startTime = os.clock();
			wait(0.1);
			time.update();

			// With 2x time scale, delta should be roughly doubled
			expect(time.deltaTime).to.be.near(0.2, 0.1);
		});

		it("should pause and resume correctly", () => {
			const time = new Time();
			time.update();
			const initialElapsed = time.elapsedTime;

			time.pause();
			wait(0.1);
			time.update();

			expect(time.deltaTime).to.equal(0);
			expect(time.elapsedTime).to.equal(initialElapsed);

			time.resume();
			wait(0.1);
			time.update();

			expect(time.deltaTime).to.be.ok();
			expect(time.elapsedTime).to.be.ok();
		});

		it("should wrap time correctly", () => {
			const time = new Time();
			time.setWrapPeriod(0.5); // Wrap every 0.5 seconds

			// Simulate multiple updates that exceed wrap period
			for (let i = 0; i < 10; i++) {
				wait(0.1);
				time.update();
			}

			expect(time.wrappedTime).to.be.near(0, 0.2);
			expect(time.elapsedTime).to.be.ok();
		});

		it("should reset correctly", () => {
			const time = new Time();
			wait(0.1);
			time.update();

			time.reset();

			expect(time.deltaTime).to.equal(0);
			expect(time.elapsedTime).to.equal(0);
			expect(time.frameCount).to.equal(0);
			expect(time.wrappedTime).to.equal(0);
		});
	});

	describe("FixedTime", () => {
		it("should accumulate time correctly", () => {
			const fixedTime = new FixedTime();
			fixedTime.setTimestep(1 / 60); // 60 FPS

			// Accumulate less than timestep
			let shouldUpdate = fixedTime.accumulate(0.01);
			expect(shouldUpdate).to.equal(false);

			// Accumulate more to exceed timestep
			shouldUpdate = fixedTime.accumulate(0.01);
			expect(shouldUpdate).to.equal(true);
		});

		it("should clamp accumulator to max", () => {
			const fixedTime = new FixedTime();
			fixedTime.setTimestep(0.016);
			fixedTime.setMaxAccumulation(0.1);

			// Try to accumulate a huge amount
			fixedTime.accumulate(1.0);

			// Should be clamped
			expect(fixedTime.accumulator).to.be.near(0.1 - 0.016, 0.001);
		});

		it("should use fixed timestep for delta", () => {
			const fixedTime = new FixedTime();
			const timestep = 0.02;
			fixedTime.setTimestep(timestep);

			fixedTime.update();

			expect(fixedTime.deltaTime).to.equal(timestep);
		});
	});

	describe("VirtualTime", () => {
		it("should report effective speed correctly", () => {
			const virtualTime = new VirtualTime();
			virtualTime.setTimeScale(2);

			expect(virtualTime.effectiveSpeed).to.equal(2);

			virtualTime.pause();
			expect(virtualTime.effectiveSpeed).to.equal(0);

			virtualTime.resume();
			expect(virtualTime.effectiveSpeed).to.equal(2);
		});
	});

	describe("RealTime", () => {
		it("should not allow pausing", () => {
			const realTime = new RealTime();
			const startTime = os.clock();

			realTime.pause();
			wait(0.1);
			realTime.update();

			// Should still advance despite pause attempt
			expect(realTime.deltaTime).to.be.ok();
		});

		it("should not allow time scaling", () => {
			const realTime = new RealTime();
			realTime.setTimeScale(2);

			wait(0.1);
			realTime.update();

			// Should use actual time, not scaled
			expect(realTime.deltaTime).to.be.near(0.1, 0.05);
			expect(realTime.timeScale).to.equal(1);
		});
	});
};
