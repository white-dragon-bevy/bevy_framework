import { Timing } from "../timing";
import { Instant } from "../instant";

export = () => {
	describe("Timing", () => {
		let timing: Timing;

		beforeEach(() => {
			timing = new Timing();
		});

		it("should initialize with default values", () => {
			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getPreviousDuration()).to.equal(0);
			expect(timing.getStartInstant()).to.equal(undefined);
			expect(timing.isActive()).to.equal(false);
		});

		it("should start timing correctly", () => {
			const startInstant = Instant.now();
			timing.start(startInstant);

			expect(timing.getStartInstant()).to.equal(startInstant);
			expect(timing.isActive()).to.equal(true);
			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getPreviousDuration()).to.equal(0);
		});

		it("should tick correctly when not started", () => {
			const previousInstant = Instant.now();
			task.wait(0.01); // Wait 10ms
			const currentInstant = Instant.now();

			timing.tick(currentInstant, previousInstant);

			expect(timing.isActive()).to.equal(true);
			expect(timing.getStartInstant()).to.equal(previousInstant);
			expect(timing.getCurrentDuration()).to.be.near(0.01, 0.005);
		});

		it("should tick correctly when already started", () => {
			const startInstant = Instant.now();
			timing.start(startInstant);

			task.wait(0.01); // Wait 10ms
			const previousInstant = Instant.now();
			task.wait(0.01); // Wait another 10ms
			const currentInstant = Instant.now();

			timing.tick(currentInstant, previousInstant);

			expect(timing.getCurrentDuration()).to.be.near(0.02, 0.005);
		});

		it("should flip correctly", () => {
			const startInstant = Instant.now();
			timing.start(startInstant);
			task.wait(0.01);

			const currentInstant = Instant.now();
			const previousInstant = startInstant;
			timing.tick(currentInstant, previousInstant);

			const currentDurationBeforeFlip = timing.getCurrentDuration();
			timing.flip();

			expect(timing.getPreviousDuration()).to.equal(currentDurationBeforeFlip);
			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getStartInstant()).to.equal(undefined);
			expect(timing.isActive()).to.equal(false);
		});

		it("should stop correctly", () => {
			const startInstant = Instant.now();
			timing.start(startInstant);
			timing.stop();

			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getPreviousDuration()).to.equal(0);
			expect(timing.getStartInstant()).to.equal(undefined);
			expect(timing.isActive()).to.equal(false);
		});

		it("should reset correctly", () => {
			timing.start(Instant.now());
			timing.reset();

			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.getPreviousDuration()).to.equal(0);
			expect(timing.getStartInstant()).to.equal(undefined);
			expect(timing.isActive()).to.equal(false);
		});

		it("should clone correctly", () => {
			const startInstant = Instant.now();
			timing.start(startInstant);
			task.wait(0.01);

			const currentInstant = Instant.now();
			timing.tick(currentInstant, startInstant);

			const cloned = timing.clone();

			expect(cloned.getCurrentDuration()).to.equal(timing.getCurrentDuration());
			expect(cloned.getPreviousDuration()).to.equal(timing.getPreviousDuration());
			expect(cloned.getStartInstant()).to.equal(timing.getStartInstant());
			expect(cloned.isActive()).to.equal(timing.isActive());

			// Verify it's a different instance
			cloned.flip();
			expect(timing.getCurrentDuration() !== cloned.getCurrentDuration()).to.equal(true);
		});

		it("should handle state transitions correctly", () => {
			// Simulate action being pressed
			const startInstant = Instant.now();
			timing.start(startInstant);

			// Advance time and tick
			task.wait(0.01);
			const firstTickInstant = Instant.now();
			timing.tick(firstTickInstant, startInstant);

			const durationBeforeFlip = timing.getCurrentDuration();
			expect(durationBeforeFlip).to.be.near(0.01, 0.005);

			// Simulate action being released (flip)
			timing.flip();
			expect(timing.getPreviousDuration()).to.equal(durationBeforeFlip);
			expect(timing.getCurrentDuration()).to.equal(0);
			expect(timing.isActive()).to.equal(false);
		});
	});
};