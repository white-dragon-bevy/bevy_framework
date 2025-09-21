/// <reference types="@rbxts/testez/globals" />

import {
	clamp,
	durationToSeconds,
	formatTime,
	formatTimeWithMillis,
	FrameRateCounter,
	hasElapsed,
	lerp,
	PerformanceTimer,
	secondsToDuration,
	smoothstep,
} from "../utils";

export = () => {
	describe("Duration conversion", () => {
		it("should convert seconds to duration", () => {
			const duration = secondsToDuration(3.456);
			expect(duration.secs).to.equal(3);
			expect(duration.millis).to.equal(456);
		});

		it("should convert duration to seconds", () => {
			const seconds = durationToSeconds({ secs: 3, millis: 456 });
			expect(seconds).to.equal(3.456);
		});
	});

	describe("Time formatting", () => {
		it("should format time as HH:MM:SS", () => {
			expect(formatTime(0)).to.equal("00:00:00");
			expect(formatTime(61)).to.equal("00:01:01");
			expect(formatTime(3661)).to.equal("01:01:01");
			expect(formatTime(36000)).to.equal("10:00:00");
		});

		it("should format time with milliseconds", () => {
			expect(formatTimeWithMillis(0)).to.equal("00:00.000");
			expect(formatTimeWithMillis(1.234)).to.equal("00:01.234");
			expect(formatTimeWithMillis(61.5)).to.equal("01:01.500");
			expect(formatTimeWithMillis(125.789)).to.equal("02:05.789");
		});
	});

	describe("Math utilities", () => {
		it("should clamp values", () => {
			expect(clamp(5, 0, 10)).to.equal(5);
			expect(clamp(-5, 0, 10)).to.equal(0);
			expect(clamp(15, 0, 10)).to.equal(10);
		});

		it("should lerp between values", () => {
			expect(lerp(0, 10, 0)).to.equal(0);
			expect(lerp(0, 10, 0.5)).to.equal(5);
			expect(lerp(0, 10, 1)).to.equal(10);
			expect(lerp(0, 10, 1.5)).to.equal(10); // Clamped
			expect(lerp(0, 10, -0.5)).to.equal(0); // Clamped
		});

		it("should smoothstep interpolate", () => {
			expect(smoothstep(0, 1, 0)).to.equal(0);
			expect(smoothstep(0, 1, 0.5)).to.be.near(0.5, 0.01);
			expect(smoothstep(0, 1, 1)).to.equal(1);

			// Test smooth curve property
			const mid = smoothstep(0, 1, 0.5);
			expect(mid).to.be.ok();
			expect(mid).to.be.near(0.5, 0.01);
		});
	});

	describe("hasElapsed", () => {
		it("should check if duration has elapsed", () => {
			const startTime = os.clock();
			expect(hasElapsed(startTime, 0)).to.equal(true);

			wait(0.1);
			expect(hasElapsed(startTime, 0.05)).to.equal(true);
			expect(hasElapsed(startTime, 1)).to.equal(false);
		});
	});

	describe("FrameRateCounter", () => {
		it("should calculate FPS", () => {
			const counter = new FrameRateCounter();

			// Simulate 60 FPS (16.67ms per frame)
			for (let i = 0; i < 60; i++) {
				counter.update(1 / 60);
			}

			expect(counter.getFps()).to.be.near(60, 1);
		});

		it("should reset correctly", () => {
			const counter = new FrameRateCounter();

			counter.update(0.016);
			counter.update(0.016);
			counter.reset();

			expect(counter.getFps()).to.equal(0);
		});
	});

	describe("PerformanceTimer", () => {
		it("should measure elapsed time", () => {
			const timer = new PerformanceTimer("TestTimer");

			wait(0.1);
			const elapsed = timer.stop();

			expect(elapsed).to.be.near(0.1, 0.05);
		});

		it("should create with factory method", () => {
			const timer = PerformanceTimer.start("TestTimer");

			wait(0.05);
			const elapsed = timer.stop();

			expect(elapsed).to.be.ok();
		});
	});
};
