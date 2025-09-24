/**
 * RVOMath单元测试
 */

import { RVOMath } from "../rvo-math";
import { Vector2D } from "../vector2d";

export = () => {
	describe("RVOMath", () => {
		it("should have correct epsilon value", () => {
			expect(RVOMath.RVO_EPSILON).to.equal(0.01);
		});

		it("should calculate squared value correctly", () => {
			expect(RVOMath.sqr(3)).to.equal(9);
			expect(RVOMath.sqr(-4)).to.equal(16);
			expect(RVOMath.sqr(0)).to.equal(0);
		});

		it("should calculate vector squared length correctly", () => {
			const vector = new Vector2D(3, 4);
			expect(RVOMath.absSq(vector)).to.equal(25);
		});

		it("should calculate vector length correctly", () => {
			const vector = new Vector2D(3, 4);
			expect(RVOMath.abs(vector)).to.equal(5);
		});

		it("should normalize vector correctly", () => {
			const vector = new Vector2D(3, 4);
			const normalized = RVOMath.normalize(vector);
			expect(normalized.x).to.be.near(0.6, 0.001);
			expect(normalized.y).to.be.near(0.8, 0.001);
		});

		it("should handle zero vector normalization", () => {
			const vector = new Vector2D(0, 0);
			const normalized = RVOMath.normalize(vector);
			expect(normalized.x).to.equal(0);
			expect(normalized.y).to.equal(0);
		});

		it("should calculate determinant correctly", () => {
			const vector1 = new Vector2D(2, 3);
			const vector2 = new Vector2D(4, 5);
			const det = RVOMath.det(vector1, vector2);
			expect(det).to.equal(-2); // 2*5 - 3*4 = 10 - 12 = -2
		});

		it("should determine left of correctly", () => {
			const pointA = new Vector2D(0, 0);
			const pointB = new Vector2D(1, 0);
			const pointC1 = new Vector2D(0, 1);
			const pointC2 = new Vector2D(0, -1);

			const leftResult = RVOMath.leftOf(pointA, pointB, pointC1);
			const rightResult = RVOMath.leftOf(pointA, pointB, pointC2);

			expect(leftResult > 0).to.equal(true); // Left side
			expect(rightResult < 0).to.equal(true); // Right side
		});

		it("should calculate point to line segment distance correctly", () => {
			const segmentStart = new Vector2D(0, 0);
			const segmentEnd = new Vector2D(4, 0);
			const point1 = new Vector2D(2, 3);
			const point2 = new Vector2D(-2, 0);
			const point3 = new Vector2D(6, 0);

			// Point perpendicular to segment
			const dist1 = RVOMath.distSqPointLineSegment(segmentStart, segmentEnd, point1);
			expect(dist1).to.equal(9); // Distance is 3, squared is 9

			// Point before segment start
			const dist2 = RVOMath.distSqPointLineSegment(segmentStart, segmentEnd, point2);
			expect(dist2).to.equal(4); // Distance is 2, squared is 4

			// Point after segment end
			const dist3 = RVOMath.distSqPointLineSegment(segmentStart, segmentEnd, point3);
			expect(dist3).to.equal(4); // Distance is 2, squared is 4
		});
	});
};