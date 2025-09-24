/**
 * Vector2D单元测试
 */

import { Vector2D } from "../vector2d";

export = () => {
	describe("Vector2D", () => {
		it("should create a zero vector by default", () => {
			const vector = new Vector2D();
			expect(vector.x).to.equal(0);
			expect(vector.y).to.equal(0);
		});

		it("should create a vector with specified coordinates", () => {
			const vector = new Vector2D(3, 4);
			expect(vector.x).to.equal(3);
			expect(vector.y).to.equal(4);
		});

		it("should add two vectors correctly", () => {
			const vector1 = new Vector2D(1, 2);
			const vector2 = new Vector2D(3, 4);
			const result = vector1.plus(vector2);
			expect(result.x).to.equal(4);
			expect(result.y).to.equal(6);
		});

		it("should subtract two vectors correctly", () => {
			const vector1 = new Vector2D(5, 7);
			const vector2 = new Vector2D(2, 3);
			const result = vector1.minus(vector2);
			expect(result.x).to.equal(3);
			expect(result.y).to.equal(4);
		});

		it("should calculate dot product correctly", () => {
			const vector1 = new Vector2D(2, 3);
			const vector2 = new Vector2D(4, 5);
			const result = vector1.multiply(vector2);
			expect(result).to.equal(23); // 2*4 + 3*5 = 8 + 15 = 23
		});

		it("should scale vector correctly", () => {
			const vector = new Vector2D(2, 3);
			const result = vector.scale(2);
			expect(result.x).to.equal(4);
			expect(result.y).to.equal(6);
		});

		it("should calculate vector length correctly", () => {
			const vector = new Vector2D(3, 4);
			const length = vector.abs();
			expect(length).to.equal(5); // sqrt(9 + 16) = 5
		});

		it("should calculate squared length correctly", () => {
			const vector = new Vector2D(3, 4);
			const lengthSq = vector.absSq();
			expect(lengthSq).to.equal(25); // 9 + 16 = 25
		});

		it("should normalize vector correctly", () => {
			const vector = new Vector2D(3, 4);
			const normalized = vector.normalize();
			expect(normalized.x).to.be.near(0.6, 0.001);
			expect(normalized.y).to.be.near(0.8, 0.001);
		});

		it("should handle zero vector normalization", () => {
			const vector = new Vector2D(0, 0);
			const normalized = vector.normalize();
			expect(normalized.x).to.equal(0);
			expect(normalized.y).to.equal(0);
		});

		it("should clone vector correctly", () => {
			const original = new Vector2D(5, 10);
			const clone = original.clone();
			expect(clone.x).to.equal(original.x);
			expect(clone.y).to.equal(original.y);
			expect(clone).to.never.equal(original); // Different objects
		});

		it("should have correct ZERO constant", () => {
			expect(Vector2D.ZERO.x).to.equal(0);
			expect(Vector2D.ZERO.y).to.equal(0);
		});
	});
};