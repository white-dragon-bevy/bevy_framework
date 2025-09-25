import RVOMath from "../core/RVOMath";

export = () => {
	describe("RVOMath Constants", () => {
		it("should have correct RVO_EPSILON value", () => {
			expect(RVOMath.RVO_EPSILON).to.equal(0.01);
		});

		it("should have correct RVO_INFINITY value", () => {
			expect(RVOMath.RVO_INFINITY).to.equal(math.huge);
		});
	});

	describe("absSq method", () => {
		it("should return correct squared magnitude for positive vector", () => {
			const vector = new Vector2(3, 4);
			const result = RVOMath.absSq(vector);
			expect(result).to.equal(25); // 3² + 4² = 9 + 16 = 25
		});

		it("should return correct squared magnitude for negative vector", () => {
			const vector = new Vector2(-3, -4);
			const result = RVOMath.absSq(vector);
			expect(result).to.equal(25);
		});

		it("should return zero for zero vector", () => {
			const vector = new Vector2(0, 0);
			const result = RVOMath.absSq(vector);
			expect(result).to.equal(0);
		});

		it("should return correct value for unit vector", () => {
			const vector = new Vector2(1, 0);
			const result = RVOMath.absSq(vector);
			expect(result).to.equal(1);
		});

		it("should handle decimal values correctly", () => {
			const vector = new Vector2(0.5, 0.5);
			const result = RVOMath.absSq(vector);
			expect(result).to.be.near(0.5, 0.001); // 0.25 + 0.25 = 0.5
		});
	});

	describe("abs method", () => {
		it("should return correct magnitude for positive vector", () => {
			const vector = new Vector2(3, 4);
			const result = RVOMath.abs(vector);
			expect(result).to.equal(5); // √(3² + 4²) = √25 = 5
		});

		it("should return correct magnitude for negative vector", () => {
			const vector = new Vector2(-3, -4);
			const result = RVOMath.abs(vector);
			expect(result).to.equal(5);
		});

		it("should return zero for zero vector", () => {
			const vector = new Vector2(0, 0);
			const result = RVOMath.abs(vector);
			expect(result).to.equal(0);
		});

		it("should return correct value for unit vector", () => {
			const vector = new Vector2(1, 0);
			const result = RVOMath.abs(vector);
			expect(result).to.equal(1);
		});
	});

	describe("normalize method", () => {
		it("should normalize a positive vector correctly", () => {
			const vector = new Vector2(3, 4);
			const result = RVOMath.normalize(vector);
			expect(result.X).to.be.near(0.6, 0.001); // 3/5
			expect(result.Y).to.be.near(0.8, 0.001); // 4/5
		});

		it("should normalize a negative vector correctly", () => {
			const vector = new Vector2(-3, -4);
			const result = RVOMath.normalize(vector);
			expect(result.X).to.be.near(-0.6, 0.001);
			expect(result.Y).to.be.near(-0.8, 0.001);
		});

		it("should return unit vector for unit vector input", () => {
			const vector = new Vector2(1, 0);
			const result = RVOMath.normalize(vector);
			expect(result.X).to.be.near(1, 0.001);
			expect(result.Y).to.be.near(0, 0.001);
		});

		it("should handle diagonal unit vector", () => {
			const vector = new Vector2(1, 1);
			const result = RVOMath.normalize(vector);
			const expectedValue = 1 / math.sqrt(2);
			expect(result.X).to.be.near(expectedValue, 0.001);
			expect(result.Y).to.be.near(expectedValue, 0.001);
		});
	});

	describe("sqr method", () => {
		it("should return correct square for positive numbers", () => {
			expect(RVOMath.sqr(5)).to.equal(25);
			expect(RVOMath.sqr(3)).to.equal(9);
			expect(RVOMath.sqr(10)).to.equal(100);
		});

		it("should return correct square for negative numbers", () => {
			expect(RVOMath.sqr(-5)).to.equal(25);
			expect(RVOMath.sqr(-3)).to.equal(9);
		});

		it("should return zero for zero", () => {
			expect(RVOMath.sqr(0)).to.equal(0);
		});

		it("should handle decimal values", () => {
			expect(RVOMath.sqr(0.5)).to.be.near(0.25, 0.001);
			expect(RVOMath.sqr(1.5)).to.be.near(2.25, 0.001);
		});

		it("should handle very large numbers", () => {
			expect(RVOMath.sqr(1000)).to.equal(1000000);
		});
	});

	describe("det method (determinant/cross product)", () => {
		it("should return positive value for counter-clockwise vectors", () => {
			const v1 = new Vector2(1, 0);
			const v2 = new Vector2(0, 1);
			const result = RVOMath.det(v1, v2);
			expect(result).to.equal(1);
		});

		it("should return negative value for clockwise vectors", () => {
			const v1 = new Vector2(0, 1);
			const v2 = new Vector2(1, 0);
			const result = RVOMath.det(v1, v2);
			expect(result).to.equal(-1);
		});

		it("should return zero for parallel vectors", () => {
			const v1 = new Vector2(2, 4);
			const v2 = new Vector2(1, 2);
			const result = RVOMath.det(v1, v2);
			expect(result).to.equal(0);
		});

		it("should return zero for same vectors", () => {
			const v1 = new Vector2(3, 5);
			const v2 = new Vector2(3, 5);
			const result = RVOMath.det(v1, v2);
			expect(result).to.equal(0);
		});

		it("should handle negative coordinates", () => {
			const v1 = new Vector2(-1, 2);
			const v2 = new Vector2(3, -4);
			const result = RVOMath.det(v1, v2);
			expect(result).to.equal((-1) * (-4) - 2 * 3); // 4 - 6 = -2
			expect(result).to.equal(-2);
		});
	});

	describe("leftOf method", () => {
		it("should return positive value when point c is left of line ab", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(1, 0);
			const c = new Vector2(0.5, 1); // Above the line
			const result = RVOMath.leftOf(a, b, c);
			expect(result > 0).to.equal(true);
		});

		it("should return negative value when point c is right of line ab", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(1, 0);
			const c = new Vector2(0.5, -1); // Below the line
			const result = RVOMath.leftOf(a, b, c);
			expect(result < 0).to.equal(true);
		});

		it("should return zero when point c is on line ab", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(1, 0);
			const c = new Vector2(0.5, 0); // On the line
			const result = RVOMath.leftOf(a, b, c);
			expect(result).to.be.near(0, 0.001);
		});

		it("should handle diagonal lines correctly", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(1, 1);
			const c = new Vector2(0, 1); // Left of diagonal line
			const result = RVOMath.leftOf(a, b, c);
			expect(result > 0).to.equal(true);
		});
	});

	describe("distSqPointLineSegment method", () => {
		it("should return distance to point a when projection is before segment", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(1, 0);
			const c = new Vector2(-1, 1); // Before segment start
			const result = RVOMath.distSqPointLineSegment(a, b, c);
			const expected = RVOMath.absSq(c.sub(a)); // Distance to point a
			expect(result).to.equal(expected);
			expect(result).to.equal(2); // (-1)² + 1² = 2
		});

		it("should return distance to point b when projection is after segment", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(1, 0);
			const c = new Vector2(2, 1); // After segment end
			const result = RVOMath.distSqPointLineSegment(a, b, c);
			const expected = RVOMath.absSq(c.sub(b)); // Distance to point b
			expect(result).to.equal(expected);
			expect(result).to.equal(2); // (2-1)² + 1² = 2
		});

		it("should return perpendicular distance when projection is within segment", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(2, 0);
			const c = new Vector2(1, 1); // Perpendicular to middle of segment
			const result = RVOMath.distSqPointLineSegment(a, b, c);
			expect(result).to.equal(1); // Distance is 1, squared is 1
		});

		it("should return zero when point is on the segment", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(2, 0);
			const c = new Vector2(1, 0); // On the segment
			const result = RVOMath.distSqPointLineSegment(a, b, c);
			expect(result).to.be.near(0, 0.001);
		});

		it("should handle segment endpoints correctly", () => {
			const a = new Vector2(1, 1);
			const b = new Vector2(1, 1); // Degenerate segment (point)
			const c = new Vector2(2, 2);
			const result = RVOMath.distSqPointLineSegment(a, b, c);
			const expected = RVOMath.absSq(c.sub(a));
			expect(result).to.equal(expected);
		});

		it("should handle diagonal segments", () => {
			const a = new Vector2(0, 0);
			const b = new Vector2(3, 4); // Length 5 diagonal
			const c = new Vector2(1.5, 2); // On the line
			const result = RVOMath.distSqPointLineSegment(a, b, c);
			expect(result).to.be.near(0, 0.01); // Should be very close to 0
		});
	});

	describe("isNaN method", () => {
		it("should return true for NaN values", () => {
			const nanValue = 0 / 0; // Creates NaN in Lua
			expect(RVOMath.isNaN(nanValue)).to.equal(true);
		});

		it("should return false for regular numbers", () => {
			expect(RVOMath.isNaN(0)).to.equal(false);
			expect(RVOMath.isNaN(1)).to.equal(false);
			expect(RVOMath.isNaN(-1)).to.equal(false);
			expect(RVOMath.isNaN(3.14)).to.equal(false);
		});

		it("should return false for infinity", () => {
			expect(RVOMath.isNaN(math.huge)).to.equal(false);
			expect(RVOMath.isNaN(-math.huge)).to.equal(false);
		});

		it("should return false for very large numbers", () => {
			expect(RVOMath.isNaN(1e100)).to.equal(false);
			expect(RVOMath.isNaN(-1e100)).to.equal(false);
		});

		it("should return false for very small numbers", () => {
			expect(RVOMath.isNaN(1e-100)).to.equal(false);
			expect(RVOMath.isNaN(-1e-100)).to.equal(false);
		});
	});

	describe("Edge Cases and Integration", () => {
		it("should handle zero vectors in all methods appropriately", () => {
			const zeroVector = new Vector2(0, 0);

			expect(RVOMath.absSq(zeroVector)).to.equal(0);
			expect(RVOMath.abs(zeroVector)).to.equal(0);
			expect(RVOMath.det(zeroVector, new Vector2(1, 1))).to.equal(0);
		});

		it("should handle very small vectors correctly", () => {
			const smallVector = new Vector2(1e-10, 1e-10);
			const absSq = RVOMath.absSq(smallVector);
			const absValue = RVOMath.abs(smallVector);

			expect(absSq > 0).to.equal(true);
			expect(absValue > 0).to.equal(true);
			expect(math.abs(absValue * absValue - absSq) < 1e-15).to.equal(true);
		});

		it("should maintain mathematical relationships", () => {
			const vector = new Vector2(5, 12);
			const absSq = RVOMath.absSq(vector);
			const abs = RVOMath.abs(vector);
			const sqrAbs = RVOMath.sqr(abs);

			// |v|² should equal sqr(|v|)
			expect(math.abs(absSq - sqrAbs) < 0.001).to.equal(true);
		});

		it("should handle normalize and abs consistency", () => {
			const vector = new Vector2(7, 24);
			const normalized = RVOMath.normalize(vector);
			const normalizedMagnitude = RVOMath.abs(normalized);

			// Normalized vector should have magnitude 1
			expect(normalizedMagnitude).to.be.near(1, 0.001);
		});
	});
};