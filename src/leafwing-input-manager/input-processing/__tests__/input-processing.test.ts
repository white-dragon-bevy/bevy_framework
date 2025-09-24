import {
	AxisDeadzone,
	AxisSensitivity,
	AxisInverted,
	singleAxisPipeline,
	DualAxisSensitivity,
	DualAxisInverted,
	dualAxisSingleProcessors,
	dualAxisPipeline,
	CircleDeadzone,
	SquareDeadzone,
	CrossDeadzone,
	EllipseDeadzone,
} from "../index";

export = () => {
	describe("SingleAxisProcessor", () => {
		it("should apply deadzone correctly", () => {
			const deadzone = new AxisDeadzone(0.2);

			// Values below threshold should be 0
			expect(deadzone.process(0.1)).to.equal(0);
			expect(deadzone.process(-0.15)).to.equal(0);

			// Values above threshold should be scaled
			expect(deadzone.process(0.6)).to.be.near(0.5, 0.01);
			expect(deadzone.process(-0.6)).to.be.near(-0.5, 0.01);

			// Edge case: exactly at threshold
			expect(deadzone.process(0.2)).to.equal(0);
		});

		it("should apply sensitivity correctly", () => {
			const sensitivity = new AxisSensitivity(2);

			expect(sensitivity.process(0.5)).to.equal(1);
			expect(sensitivity.process(-0.3)).to.equal(-0.6);

			// Should clamp to [-1, 1]
			expect(sensitivity.process(0.8)).to.equal(1);
			expect(sensitivity.process(-0.8)).to.equal(-1);
		});

		it("should invert axis correctly", () => {
			const inverted = new AxisInverted();

			expect(inverted.process(0.5)).to.equal(-0.5);
			expect(inverted.process(-0.3)).to.equal(0.3);
			expect(inverted.process(0)).to.equal(0);
		});

		it("should chain processors in pipeline", () => {
			const pipeline = singleAxisPipeline(
				new AxisDeadzone(0.1),
				new AxisSensitivity(2),
				new AxisInverted(),
			);

			// Input 0.2: deadzone -> ~0.11 -> sensitivity -> ~0.22 -> invert -> ~-0.22
			const result = pipeline.process(0.2);
			expect(result).to.be.near(-0.22, 0.01);
		});
	});

	describe("DualAxisProcessor", () => {
		it("should apply sensitivity to both axes", () => {
			const sensitivity = new DualAxisSensitivity(2, 1.5);
			const result = sensitivity.process(new Vector2(0.4, 0.6));

			expect(result.X).to.equal(0.8);
			expect(result.Y).to.equal(0.9);
		});

		it("should invert specified axes", () => {
			const invertX = new DualAxisInverted(true, false);
			const result = invertX.process(new Vector2(0.5, -0.3));

			expect(result.X).to.equal(-0.5);
			expect(result.Y).to.equal(-0.3);
		});

		it("should apply single-axis processors to each axis", () => {
			const processor = dualAxisSingleProcessors(
				new AxisDeadzone(0.1),
				new AxisSensitivity(2),
			);
			const result = processor.process(new Vector2(0.2, 0.05));

			expect(result.X).to.be.near(0.22, 0.01); // Deadzone applied, then scaled
			expect(result.Y).to.equal(0); // Below Y processor threshold
		});

		it("should chain dual-axis processors in pipeline", () => {
			const pipeline = dualAxisPipeline(
				new DualAxisSensitivity(2),
				new DualAxisInverted(true, false),
			);
			const result = pipeline.process(new Vector2(0.3, 0.4));

			expect(result.X).to.equal(-0.6); // 0.3 * 2 = 0.6, then inverted
			expect(result.Y).to.equal(0.8); // 0.4 * 2 = 0.8, not inverted
		});
	});

	describe("Deadzone Processors", () => {
		it("should apply circular deadzone correctly", () => {
			const deadzone = new CircleDeadzone(0.3);

			// Vector inside deadzone
			const inside = deadzone.process(new Vector2(0.2, 0.1));
			expect(inside.Magnitude).to.equal(0);

			// Vector outside deadzone should be scaled
			const outside = deadzone.process(new Vector2(0.6, 0.8)); // Magnitude = 1.0
			expect(outside.Magnitude).to.be.near(0.7, 0.01); // (1.0 - 0.3) / (1.0 - 0.3) = 0.7
		});

		it("should apply square deadzone correctly", () => {
			const deadzone = new SquareDeadzone(0.2);

			const result = deadzone.process(new Vector2(0.5, 0.1));
			expect(result.X).to.be.near(0.375, 0.01); // (0.5 - 0.2) / (1 - 0.2) = 0.375
			expect(result.Y).to.equal(0); // 0.1 < 0.2
		});

		it("should apply cross deadzone correctly", () => {
			const deadzone = new CrossDeadzone(0.15, 0.25);

			const result = deadzone.process(new Vector2(0.3, 0.4));
			expect(result.X).to.be.near(0.176, 0.01); // (0.3 - 0.15) / (1 - 0.15)
			expect(result.Y).to.equal(0.2); // (0.4 - 0.25) / (1 - 0.25)
		});

		it("should apply elliptical deadzone correctly", () => {
			const deadzone = new EllipseDeadzone(0.3, 0.4);

			// Point inside ellipse
			const inside = deadzone.process(new Vector2(0.2, 0.2));
			expect(inside.Magnitude).to.equal(0);

			// Point outside ellipse should be scaled
			const outside = deadzone.process(new Vector2(0.6, 0.8));
			expect(outside.Magnitude > 0).to.equal(true);
		});
	});

	describe("Helper Functions", () => {
		it("should create processors using helper functions", () => {
			// These should not throw and should create valid processors
			expect(() => {
				const deadzone = new AxisDeadzone(0.1);
				const sensitivity = new AxisSensitivity(1.5);
				const inverted = new AxisInverted();
				const pipeline = singleAxisPipeline(deadzone, sensitivity, inverted);

				const dualSensitivity = new DualAxisSensitivity(2);
				const dualInverted = new DualAxisInverted();
				const dualPipeline = dualAxisPipeline(dualSensitivity, dualInverted);

				const circleDeadzone = new CircleDeadzone(0.2);
				const squareDeadzone = new SquareDeadzone(0.2);
				const crossDeadzone = new CrossDeadzone(0.2);
				const ellipseDeadzone = new EllipseDeadzone(0.2);

				// Basic smoke test
				pipeline.process(0.5);
				dualPipeline.process(new Vector2(0.5, 0.5));
				circleDeadzone.process(new Vector2(0.5, 0.5));
				squareDeadzone.process(new Vector2(0.5, 0.5));
				crossDeadzone.process(new Vector2(0.5, 0.5));
				ellipseDeadzone.process(new Vector2(0.5, 0.5));
			}).to.never.throw();
		});
	});
};