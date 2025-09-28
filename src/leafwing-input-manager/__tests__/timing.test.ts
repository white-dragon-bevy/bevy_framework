import { Instant } from "../instant";
import { Timing } from "../timing";
import { ActionData } from "../action-state/action-data";

export = () => {
	describe("Timing System Tests", () => {
		let timing: Timing;
		let startInstant: Instant;

		beforeEach(() => {
			timing = Timing.default();
			startInstant = Instant.now();
		});

		afterEach(() => {
			// Cleanup after each test
		});

		it("should initialize with default values", () => {
			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getPreviousDuration()).to.equal(0);
			expect(timing.getStartInstant()).to.equal(undefined);
			expect(timing.isActive()).to.equal(false);
		});

		it("should start timing correctly", () => {
			timing.start(startInstant);

			expect(timing.isActive()).to.equal(true);
			expect(timing.getStartInstant()).to.equal(startInstant);
			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getPreviousDuration()).to.equal(0);
		});

		it("should calculate durations correctly during tick", () => {
			timing.start(startInstant);

			// Simulate time passage
			const currentInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 1.0);
			const previousInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 0.5);

			timing.tick(currentInstant, previousInstant);

			expect(timing.getCurrentDuration()).to.be.near(1.0);
			expect(timing.getPreviousDuration()).to.be.near(0.5);
		});

		it("should handle flip operation correctly", () => {
			timing.start(startInstant);

			const currentInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 1.0);
			const previousInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 0.5);

			timing.tick(currentInstant, previousInstant);
			const originalCurrent = timing.getCurrentDuration();

			timing.flip();

			expect(timing.getPreviousDuration()).to.equal(originalCurrent);
		});

		it("should stop timing correctly", () => {
			timing.start(startInstant);
			expect(timing.isActive()).to.equal(true);

			timing.stop();

			expect(timing.isActive()).to.equal(false);
			expect(timing.getStartInstant()).to.equal(undefined);
			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getPreviousDuration()).to.equal(0);
		});

		it("should reset timing correctly", () => {
			timing.start(startInstant);
			const currentInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 1.0);
			const previousInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 0.5);

			timing.tick(currentInstant, previousInstant);
			timing.reset();

			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getPreviousDuration()).to.equal(0);
			expect(timing.getStartInstant()).to.equal(undefined);
			expect(timing.isActive()).to.equal(false);
		});

		it("should clone correctly", () => {
			timing.start(startInstant);
			const currentInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 1.0);
			const previousInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 0.5);

			timing.tick(currentInstant, previousInstant);

			const cloned = timing.clone();

			expect(cloned.getCurrentDuration()).to.equal(timing.getCurrentDuration());
			expect(cloned.getPreviousDuration()).to.equal(timing.getPreviousDuration());
			expect(cloned.isActive()).to.equal(timing.isActive());
		});
	});

	describe("ActionData Timing Integration Tests", () => {
		let actionData: ActionData;

		beforeEach(() => {
			actionData = ActionData.default();
		});

		afterEach(() => {
			// Cleanup after each test
		});

		it("should integrate timing system correctly on press", () => {
			expect(actionData.pressed).to.equal(false);
			expect(actionData.getCurrentDuration()).to.equal(0);

			// Press the action
			actionData.update(true, 1.0);

			expect(actionData.pressed).to.equal(true);
			expect(actionData.timing.isActive()).to.equal(true);
			expect(actionData.getCurrentDuration()).to.equal(0);
		});

		it("should stop timing on release", () => {
			// Press the action
			actionData.update(true, 1.0);
			expect(actionData.timing.isActive()).to.equal(true);

			// Release the action
			actionData.update(false, 0.0);

			expect(actionData.pressed).to.equal(false);
			expect(actionData.timing.isActive()).to.equal(false);
			expect(actionData.getCurrentDuration()).to.equal(0);
		});

		it("should calculate durations correctly with tick", () => {
			// Press the action
			actionData.update(true, 1.0);
			const startInstant = actionData.timing.getStartInstant();

			if (startInstant === undefined) {
				error("Start instant should not be undefined");
			}

			// Simulate time passage
			const currentInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 1.0);
			const previousInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 0.5);

			actionData.tick(currentInstant, previousInstant);

			expect(actionData.getCurrentDuration()).to.be.near(1.0);
			expect(actionData.getPreviousDuration()).to.be.near(0.5);
		});

		it("should handle state transitions correctly", () => {
			// Test press -> release -> press cycle
			actionData.update(true, 1.0);
			const firstStartInstant = actionData.timing.getStartInstant();

			actionData.update(false, 0.0);
			expect(actionData.timing.isActive()).to.equal(false);

			actionData.update(true, 1.0);
			const secondStartInstant = actionData.timing.getStartInstant();

			// Should have a new start time
			if (firstStartInstant === undefined || secondStartInstant === undefined) {
				error("Start instants should not be undefined");
			}

			expect(secondStartInstant.getTimestamp() !== firstStartInstant.getTimestamp()).to.equal(true);
			expect(actionData.timing.isActive()).to.equal(true);
			expect(actionData.getCurrentDuration()).to.equal(0);
		});

		it("should clone with timing data correctly", () => {
			actionData.update(true, 1.0);
			const startInstant = actionData.timing.getStartInstant();

			if (startInstant === undefined) {
				error("Start instant should not be undefined");
			}

			const currentInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 1.0);
			const previousInstant = Instant.fromTimestamp(startInstant.getTimestamp() + 0.5);

			actionData.tick(currentInstant, previousInstant);

			const cloned = actionData.clone();

			expect(cloned.pressed).to.equal(actionData.pressed);
			expect(cloned.timing.getCurrentDuration()).to.equal(actionData.timing.getCurrentDuration());
			expect(cloned.timing.getPreviousDuration()).to.equal(actionData.timing.getPreviousDuration());
			expect(cloned.timing.isActive()).to.equal(actionData.timing.isActive());
		});

		it("should maintain backward compatibility with delta time", () => {
			actionData.update(true, 1.0);

			// Test legacy delta time method
			actionData.tickDelta(1.0);
			expect(actionData.duration).to.equal(1.0);

			actionData.tickDelta(0.5);
			expect(actionData.duration).to.equal(1.5);
		});
	});
};