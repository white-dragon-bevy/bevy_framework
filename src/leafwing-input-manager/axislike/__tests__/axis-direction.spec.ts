import { AxisDirection, DualAxisType, DualAxisDirection } from "../axis-direction";

export = () => {
	describe("AxisDirection", () => {
		it("should have correct enum values", () => {
			expect(AxisDirection.Negative).to.equal(-1);
			expect(AxisDirection.Positive).to.equal(1);
		});

		describe("fullActiveValue", () => {
			it("should return correct values for directions", () => {
				expect(AxisDirection.fullActiveValue(AxisDirection.Negative)).to.equal(-1);
				expect(AxisDirection.fullActiveValue(AxisDirection.Positive)).to.equal(1);
			});
		});

		describe("isActive", () => {
			it("should correctly detect negative direction activation", () => {
				expect(AxisDirection.isActive(AxisDirection.Negative, -0.6)).to.equal(true);
				expect(AxisDirection.isActive(AxisDirection.Negative, -0.4)).to.equal(false);
				expect(AxisDirection.isActive(AxisDirection.Negative, 0.6)).to.equal(false);
			});

			it("should correctly detect positive direction activation", () => {
				expect(AxisDirection.isActive(AxisDirection.Positive, 0.6)).to.equal(true);
				expect(AxisDirection.isActive(AxisDirection.Positive, 0.4)).to.equal(false);
				expect(AxisDirection.isActive(AxisDirection.Positive, -0.6)).to.equal(false);
			});

			it("should respect custom threshold", () => {
				expect(AxisDirection.isActive(AxisDirection.Positive, 0.3, 0.2)).to.equal(true);
				expect(AxisDirection.isActive(AxisDirection.Positive, 0.1, 0.2)).to.equal(false);
			});
		});

		describe("opposite", () => {
			it("should return opposite directions", () => {
				expect(AxisDirection.opposite(AxisDirection.Negative)).to.equal(AxisDirection.Positive);
				expect(AxisDirection.opposite(AxisDirection.Positive)).to.equal(AxisDirection.Negative);
			});
		});

		describe("fromValue", () => {
			it("should detect direction from positive values", () => {
				expect(AxisDirection.fromValue(0.5)).to.equal(AxisDirection.Positive);
				expect(AxisDirection.fromValue(1.0)).to.equal(AxisDirection.Positive);
			});

			it("should detect direction from negative values", () => {
				expect(AxisDirection.fromValue(-0.5)).to.equal(AxisDirection.Negative);
				expect(AxisDirection.fromValue(-1.0)).to.equal(AxisDirection.Negative);
			});

			it("should return undefined for values below threshold", () => {
				expect(AxisDirection.fromValue(0.05)).to.equal(undefined);
				expect(AxisDirection.fromValue(-0.05)).to.equal(undefined);
				expect(AxisDirection.fromValue(0)).to.equal(undefined);
			});

			it("should respect custom threshold", () => {
				expect(AxisDirection.fromValue(0.05, 0.01)).to.equal(AxisDirection.Positive);
				expect(AxisDirection.fromValue(-0.05, 0.01)).to.equal(AxisDirection.Negative);
			});
		});

		describe("toString", () => {
			it("should return correct string representations", () => {
				expect(AxisDirection.toString(AxisDirection.Negative)).to.equal("Negative");
				expect(AxisDirection.toString(AxisDirection.Positive)).to.equal("Positive");
			});
		});
	});

	describe("DualAxisType", () => {
		it("should have correct enum values", () => {
			expect(DualAxisType.X).to.equal("X");
			expect(DualAxisType.Y).to.equal("Y");
		});

		describe("axes", () => {
			it("should return both axis types", () => {
				const result = DualAxisType.axes();
				expect(result[0]).to.equal(DualAxisType.X);
				expect(result[1]).to.equal(DualAxisType.Y);
			});
		});

		describe("directions", () => {
			it("should return negative and positive directions", () => {
				const xDirections = DualAxisType.directions(DualAxisType.X);
				expect(xDirections[0]).to.equal(AxisDirection.Negative);
				expect(xDirections[1]).to.equal(AxisDirection.Positive);

				const yDirections = DualAxisType.directions(DualAxisType.Y);
				expect(yDirections[0]).to.equal(AxisDirection.Negative);
				expect(yDirections[1]).to.equal(AxisDirection.Positive);
			});
		});

		describe("negative and positive", () => {
			it("should return appropriate directions", () => {
				expect(DualAxisType.negative(DualAxisType.X)).to.equal(AxisDirection.Negative);
				expect(DualAxisType.positive(DualAxisType.X)).to.equal(AxisDirection.Positive);
				expect(DualAxisType.negative(DualAxisType.Y)).to.equal(AxisDirection.Negative);
				expect(DualAxisType.positive(DualAxisType.Y)).to.equal(AxisDirection.Positive);
			});
		});

		describe("getValue", () => {
			it("should extract correct axis values from Vector2", () => {
				const vector = new Vector2(0.5, -0.3);
				expect(DualAxisType.getValue(DualAxisType.X, vector)).to.equal(0.5);
				expect(DualAxisType.getValue(DualAxisType.Y, vector)).to.equal(-0.3);
			});
		});

		describe("dualAxisValue", () => {
			it("should create Vector2 with value on X axis", () => {
				const result = DualAxisType.dualAxisValue(DualAxisType.X, 0.7);
				expect(result.X).to.equal(0.7);
				expect(result.Y).to.equal(0);
			});

			it("should create Vector2 with value on Y axis", () => {
				const result = DualAxisType.dualAxisValue(DualAxisType.Y, -0.8);
				expect(result.X).to.equal(0);
				expect(result.Y).to.equal(-0.8);
			});
		});

		describe("opposite", () => {
			it("should return opposite axis types", () => {
				expect(DualAxisType.opposite(DualAxisType.X)).to.equal(DualAxisType.Y);
				expect(DualAxisType.opposite(DualAxisType.Y)).to.equal(DualAxisType.X);
			});
		});

		describe("toString", () => {
			it("should return correct string representations", () => {
				expect(DualAxisType.toString(DualAxisType.X)).to.equal("X");
				expect(DualAxisType.toString(DualAxisType.Y)).to.equal("Y");
			});
		});
	});

	describe("DualAxisDirection", () => {
		it("should have correct enum values", () => {
			expect(DualAxisDirection.Up).to.equal("Up");
			expect(DualAxisDirection.Down).to.equal("Down");
			expect(DualAxisDirection.Left).to.equal("Left");
			expect(DualAxisDirection.Right).to.equal("Right");
		});

		describe("axis", () => {
			it("should return correct axis types", () => {
				expect(DualAxisDirection.axis(DualAxisDirection.Up)).to.equal(DualAxisType.Y);
				expect(DualAxisDirection.axis(DualAxisDirection.Down)).to.equal(DualAxisType.Y);
				expect(DualAxisDirection.axis(DualAxisDirection.Left)).to.equal(DualAxisType.X);
				expect(DualAxisDirection.axis(DualAxisDirection.Right)).to.equal(DualAxisType.X);
			});
		});

		describe("axisDirection", () => {
			it("should return correct axis directions", () => {
				expect(DualAxisDirection.axisDirection(DualAxisDirection.Up)).to.equal(AxisDirection.Positive);
				expect(DualAxisDirection.axisDirection(DualAxisDirection.Down)).to.equal(AxisDirection.Negative);
				expect(DualAxisDirection.axisDirection(DualAxisDirection.Left)).to.equal(AxisDirection.Negative);
				expect(DualAxisDirection.axisDirection(DualAxisDirection.Right)).to.equal(AxisDirection.Positive);
			});
		});

		describe("fullActiveValue", () => {
			it("should return correct Vector2 values", () => {
				const up = DualAxisDirection.fullActiveValue(DualAxisDirection.Up);
				expect(up.X).to.equal(0);
				expect(up.Y).to.equal(1);

				const down = DualAxisDirection.fullActiveValue(DualAxisDirection.Down);
				expect(down.X).to.equal(0);
				expect(down.Y).to.equal(-1);

				const left = DualAxisDirection.fullActiveValue(DualAxisDirection.Left);
				expect(left.X).to.equal(-1);
				expect(left.Y).to.equal(0);

				const right = DualAxisDirection.fullActiveValue(DualAxisDirection.Right);
				expect(right.X).to.equal(1);
				expect(right.Y).to.equal(0);
			});
		});

		describe("isActive", () => {
			it("should correctly detect Up direction activation", () => {
				expect(DualAxisDirection.isActive(DualAxisDirection.Up, new Vector2(0, 0.6))).to.equal(true);
				expect(DualAxisDirection.isActive(DualAxisDirection.Up, new Vector2(0, 0.4))).to.equal(false);
				expect(DualAxisDirection.isActive(DualAxisDirection.Up, new Vector2(0, -0.6))).to.equal(false);
			});

			it("should correctly detect Down direction activation", () => {
				expect(DualAxisDirection.isActive(DualAxisDirection.Down, new Vector2(0, -0.6))).to.equal(true);
				expect(DualAxisDirection.isActive(DualAxisDirection.Down, new Vector2(0, -0.4))).to.equal(false);
				expect(DualAxisDirection.isActive(DualAxisDirection.Down, new Vector2(0, 0.6))).to.equal(false);
			});

			it("should correctly detect Left direction activation", () => {
				expect(DualAxisDirection.isActive(DualAxisDirection.Left, new Vector2(-0.6, 0))).to.equal(true);
				expect(DualAxisDirection.isActive(DualAxisDirection.Left, new Vector2(-0.4, 0))).to.equal(false);
				expect(DualAxisDirection.isActive(DualAxisDirection.Left, new Vector2(0.6, 0))).to.equal(false);
			});

			it("should correctly detect Right direction activation", () => {
				expect(DualAxisDirection.isActive(DualAxisDirection.Right, new Vector2(0.6, 0))).to.equal(true);
				expect(DualAxisDirection.isActive(DualAxisDirection.Right, new Vector2(0.4, 0))).to.equal(false);
				expect(DualAxisDirection.isActive(DualAxisDirection.Right, new Vector2(-0.6, 0))).to.equal(false);
			});

			it("should respect custom threshold", () => {
				expect(DualAxisDirection.isActive(DualAxisDirection.Right, new Vector2(0.3, 0), 0.2)).to.equal(true);
				expect(DualAxisDirection.isActive(DualAxisDirection.Right, new Vector2(0.1, 0), 0.2)).to.equal(false);
			});
		});

		describe("opposite", () => {
			it("should return opposite directions", () => {
				expect(DualAxisDirection.opposite(DualAxisDirection.Up)).to.equal(DualAxisDirection.Down);
				expect(DualAxisDirection.opposite(DualAxisDirection.Down)).to.equal(DualAxisDirection.Up);
				expect(DualAxisDirection.opposite(DualAxisDirection.Left)).to.equal(DualAxisDirection.Right);
				expect(DualAxisDirection.opposite(DualAxisDirection.Right)).to.equal(DualAxisDirection.Left);
			});
		});

		describe("all", () => {
			it("should return all four directions", () => {
				const allDirections = DualAxisDirection.all();
				expect(allDirections.size()).to.equal(4);
				expect(allDirections.includes(DualAxisDirection.Up)).to.equal(true);
				expect(allDirections.includes(DualAxisDirection.Down)).to.equal(true);
				expect(allDirections.includes(DualAxisDirection.Left)).to.equal(true);
				expect(allDirections.includes(DualAxisDirection.Right)).to.equal(true);
			});
		});

		describe("forAxis", () => {
			it("should return correct directions for X axis", () => {
				const xDirections = DualAxisDirection.forAxis(DualAxisType.X);
				expect(xDirections.size()).to.equal(2);
				expect(xDirections.includes(DualAxisDirection.Left)).to.equal(true);
				expect(xDirections.includes(DualAxisDirection.Right)).to.equal(true);
			});

			it("should return correct directions for Y axis", () => {
				const yDirections = DualAxisDirection.forAxis(DualAxisType.Y);
				expect(yDirections.size()).to.equal(2);
				expect(yDirections.includes(DualAxisDirection.Up)).to.equal(true);
				expect(yDirections.includes(DualAxisDirection.Down)).to.equal(true);
			});
		});

		describe("fromVector", () => {
			it("should detect Up direction from positive Y vector", () => {
				expect(DualAxisDirection.fromVector(new Vector2(0, 0.5))).to.equal(DualAxisDirection.Up);
				expect(DualAxisDirection.fromVector(new Vector2(0.2, 0.8))).to.equal(DualAxisDirection.Up);
			});

			it("should detect Down direction from negative Y vector", () => {
				expect(DualAxisDirection.fromVector(new Vector2(0, -0.5))).to.equal(DualAxisDirection.Down);
				expect(DualAxisDirection.fromVector(new Vector2(0.2, -0.8))).to.equal(DualAxisDirection.Down);
			});

			it("should detect Right direction from positive X vector", () => {
				expect(DualAxisDirection.fromVector(new Vector2(0.5, 0))).to.equal(DualAxisDirection.Right);
				expect(DualAxisDirection.fromVector(new Vector2(0.8, 0.2))).to.equal(DualAxisDirection.Right);
			});

			it("should detect Left direction from negative X vector", () => {
				expect(DualAxisDirection.fromVector(new Vector2(-0.5, 0))).to.equal(DualAxisDirection.Left);
				expect(DualAxisDirection.fromVector(new Vector2(-0.8, 0.2))).to.equal(DualAxisDirection.Left);
			});

			it("should return undefined for vectors below threshold", () => {
				expect(DualAxisDirection.fromVector(new Vector2(0.05, 0.05))).to.equal(undefined);
				expect(DualAxisDirection.fromVector(new Vector2(0, 0))).to.equal(undefined);
			});

			it("should respect custom threshold", () => {
				expect(DualAxisDirection.fromVector(new Vector2(0.05, 0), 0.01)).to.equal(DualAxisDirection.Right);
				expect(DualAxisDirection.fromVector(new Vector2(0, 0.05), 0.01)).to.equal(DualAxisDirection.Up);
			});
		});

		describe("toString", () => {
			it("should return correct string representations", () => {
				expect(DualAxisDirection.toString(DualAxisDirection.Up)).to.equal("Up");
				expect(DualAxisDirection.toString(DualAxisDirection.Down)).to.equal("Down");
				expect(DualAxisDirection.toString(DualAxisDirection.Left)).to.equal("Left");
				expect(DualAxisDirection.toString(DualAxisDirection.Right)).to.equal("Right");
			});
		});
	});
};