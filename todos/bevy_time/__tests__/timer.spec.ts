/// <reference types="@rbxts/testez/globals" />

import { Timer, TimerMode } from "../timer";

export = () => {
	describe("Timer", () => {
		describe("Once mode", () => {
			it("should finish after duration", () => {
				const timer = new Timer(1, TimerMode.Once);

				timer.tick(0.5);
				expect(timer.isFinished()).to.equal(false);
				expect(timer.justFinished()).to.equal(false);

				timer.tick(0.6);
				expect(timer.isFinished()).to.equal(true);
				expect(timer.justFinished()).to.equal(true);

				// Should stay finished
				timer.tick(0.5);
				expect(timer.isFinished()).to.equal(true);
				expect(timer.justFinished()).to.equal(false);
			});

			it("should clamp elapsed to duration", () => {
				const timer = new Timer(1, TimerMode.Once);
				timer.tick(2);

				expect(timer.elapsed()).to.equal(1);
				expect(timer.remaining()).to.equal(0);
			});
		});

		describe("Repeating mode", () => {
			it("should repeat after duration", () => {
				const timer = new Timer(1, TimerMode.Repeating);

				timer.tick(0.5);
				expect(timer.isFinished()).to.equal(false);

				timer.tick(0.6);
				expect(timer.isFinished()).to.equal(true);
				expect(timer.justFinished()).to.equal(true);
				expect(timer.timesFinished()).to.equal(1);

				// Should reset and continue
				timer.tick(0.5);
				expect(timer.isFinished()).to.equal(false);
				expect(timer.elapsed()).to.be.near(0.6, 0.01);
			});

			it("should handle multiple completions in one tick", () => {
				const timer = new Timer(0.5, TimerMode.Repeating);

				timer.tick(1.5);
				expect(timer.timesFinished()).to.equal(3);
				expect(timer.elapsed()).to.be.near(0, 0.01);
			});
		});

		describe("Percentage methods", () => {
			it("should calculate percentages correctly", () => {
				const timer = new Timer(2, TimerMode.Once);

				timer.tick(0.5);
				expect(timer.percentComplete()).to.equal(0.25);
				expect(timer.percentRemaining()).to.equal(0.75);

				timer.tick(1);
				expect(timer.percentComplete()).to.equal(0.75);
				expect(timer.percentRemaining()).to.equal(0.25);

				timer.tick(1);
				expect(timer.percentComplete()).to.equal(1);
				expect(timer.percentRemaining()).to.equal(0);
			});
		});

		describe("Pause and resume", () => {
			it("should pause and resume correctly", () => {
				const timer = new Timer(1, TimerMode.Once);

				timer.tick(0.5);
				expect(timer.elapsed()).to.equal(0.5);

				timer.pause();
				timer.tick(0.3);
				expect(timer.elapsed()).to.equal(0.5); // No change

				timer.resume();
				timer.tick(0.3);
				expect(timer.elapsed()).to.equal(0.8);
			});
		});

		describe("Reset", () => {
			it("should reset timer state", () => {
				const timer = new Timer(1, TimerMode.Once);
				timer.tick(1.5);

				expect(timer.isFinished()).to.equal(true);

				timer.reset();
				expect(timer.isFinished()).to.equal(false);
				expect(timer.elapsed()).to.equal(0);
				expect(timer.justFinished()).to.equal(false);
			});
		});

		describe("Duration and mode changes", () => {
			it("should allow changing duration", () => {
				const timer = new Timer(1, TimerMode.Once);
				timer.tick(0.5);

				timer.setDuration(2);
				expect(timer.getDuration()).to.equal(2);
				expect(timer.remaining()).to.equal(1.5);
			});

			it("should allow changing mode", () => {
				const timer = new Timer(1, TimerMode.Once);
				timer.tick(1.5);
				expect(timer.isFinished()).to.equal(true);

				timer.setMode(TimerMode.Repeating);
				timer.tick(0.1);
				// Should continue from where it left off
				expect(timer.isFinished()).to.equal(false);
			});
		});

		describe("Factory methods", () => {
			it("should create timer from seconds", () => {
				const timer = Timer.fromSeconds(2.5, false);
				expect(timer.getDuration()).to.equal(2.5);
				expect(timer.getMode()).to.equal(TimerMode.Once);

				const repeatingTimer = Timer.fromSeconds(1.5, true);
				expect(repeatingTimer.getDuration()).to.equal(1.5);
				expect(repeatingTimer.getMode()).to.equal(TimerMode.Repeating);
			});
		});

		describe("Set elapsed", () => {
			it("should set elapsed time directly", () => {
				const timer = new Timer(2, TimerMode.Once);
				timer.setElapsed(1.5);

				expect(timer.elapsed()).to.equal(1.5);
				expect(timer.remaining()).to.equal(0.5);
				expect(timer.isFinished()).to.equal(false);

				timer.setElapsed(2.5);
				expect(timer.elapsed()).to.equal(2); // Clamped
				expect(timer.isFinished()).to.equal(true);
			});
		});
	});
};
