/// <reference types="@rbxts/testez/globals" />

import { Stopwatch } from "../stopwatch";

export = () => {
	describe("Stopwatch", () => {
		it("should start unpaused by default", () => {
			const stopwatch = new Stopwatch();
			expect(stopwatch.isPaused()).to.equal(false);
			expect(stopwatch.elapsedSecs()).to.equal(0);
		});

		it("should track elapsed time when running", () => {
			const stopwatch = new Stopwatch();

			stopwatch.tick(0.5);
			expect(stopwatch.elapsedSecs()).to.equal(0.5);

			stopwatch.tick(0.3);
			expect(stopwatch.elapsedSecs()).to.equal(0.8);
		});

		it("should not track time when paused", () => {
			const stopwatch = new Stopwatch();

			stopwatch.tick(0.5);
			stopwatch.pause();
			stopwatch.tick(0.3);

			expect(stopwatch.elapsedSecs()).to.equal(0.5);
		});

		it("should resume tracking after unpause", () => {
			const stopwatch = new Stopwatch();

			stopwatch.tick(0.5);
			stopwatch.pause();
			stopwatch.tick(0.3);
			stopwatch.resume();
			stopwatch.tick(0.2);

			expect(stopwatch.elapsedSecs()).to.equal(0.7);
		});

		it("should toggle pause state", () => {
			const stopwatch = new Stopwatch();
			expect(stopwatch.isPaused()).to.equal(false);

			stopwatch.toggle();
			expect(stopwatch.isPaused()).to.equal(true);

			stopwatch.toggle();
			expect(stopwatch.isPaused()).to.equal(false);
		});

		it("should reset elapsed time", () => {
			const stopwatch = new Stopwatch();

			stopwatch.tick(1.5);
			expect(stopwatch.elapsedSecs()).to.equal(1.5);

			stopwatch.reset();
			expect(stopwatch.elapsedSecs()).to.equal(0);
			expect(stopwatch.isPaused()).to.equal(false); // Maintains state
		});

		it("should reset and pause", () => {
			const stopwatch = new Stopwatch();

			stopwatch.tick(1.5);
			stopwatch.resetAndPause();

			expect(stopwatch.elapsedSecs()).to.equal(0);
			expect(stopwatch.isPaused()).to.equal(true);
		});

		it("should reset and resume", () => {
			const stopwatch = new Stopwatch();
			stopwatch.pause();

			stopwatch.tick(1.5);
			stopwatch.resetAndResume();

			expect(stopwatch.elapsedSecs()).to.equal(0);
			expect(stopwatch.isPaused()).to.equal(false);
		});

		it("should return elapsed duration", () => {
			const stopwatch = new Stopwatch();
			stopwatch.tick(1.234);

			const duration = stopwatch.elapsedDuration();
			expect(duration.secs).to.equal(1);
			expect(duration.millis).to.equal(234);
		});

		it("should return elapsed millis", () => {
			const stopwatch = new Stopwatch();
			stopwatch.tick(1.5);

			expect(stopwatch.elapsedMillis()).to.equal(1500);
		});

		it("should return elapsed as f64", () => {
			const stopwatch = new Stopwatch();
			stopwatch.tick(1.23456);

			expect(stopwatch.elapsedSecsF64()).to.equal(1.23456);
		});

		it("should set elapsed directly", () => {
			const stopwatch = new Stopwatch();
			stopwatch.setElapsed(2.5);

			expect(stopwatch.elapsedSecs()).to.equal(2.5);

			stopwatch.setElapsed(-1);
			expect(stopwatch.elapsedSecs()).to.equal(0); // Clamped to 0
		});

		describe("Factory methods", () => {
			it("should create running stopwatch", () => {
				const stopwatch = Stopwatch.new();
				expect(stopwatch.isPaused()).to.equal(false);
			});

			it("should create paused stopwatch", () => {
				const stopwatch = Stopwatch.newPaused();
				expect(stopwatch.isPaused()).to.equal(true);
			});
		});

		it("should start paused if specified", () => {
			const stopwatch = new Stopwatch(true);
			expect(stopwatch.isPaused()).to.equal(true);

			stopwatch.tick(0.5);
			expect(stopwatch.elapsedSecs()).to.equal(0);
		});
	});
};
