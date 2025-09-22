/**
 * @fileoverview Axis 单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { Axis } from "../src/axis";

export = () => {
	describe("Axis", () => {
		let axis: Axis<string>;

		beforeEach(() => {
			axis = new Axis<string>();
		});

		describe("set and get", () => {
			it("should store and retrieve axis values", () => {
				axis.set("X", 0.5);
				expect(axis.get("X")).to.equal(0.5);
			});

			it("should clamp values between -1 and 1", () => {
				axis.set("X", 1.5);
				expect(axis.get("X")).to.equal(1.0);

				axis.set("Y", -1.5);
				expect(axis.get("Y")).to.equal(-1.0);
			});

			it("should return undefined for non-existent axis", () => {
				expect(axis.get("Z")).to.equal(undefined);
			});

			it("should return old value when setting", () => {
				axis.set("X", 0.5);
				const oldValue = axis.set("X", 0.7);
				expect(oldValue).to.equal(0.5);
			});
		});

		describe("getUnclamped", () => {
			it("should return unclamped values", () => {
				axis.set("X", 2.5);
				expect(axis.getUnclamped("X")).to.equal(2.5);
				expect(axis.get("X")).to.equal(1.0);
			});

			it("should return undefined for non-existent axis", () => {
				expect(axis.getUnclamped("Z")).to.equal(undefined);
			});
		});

		describe("remove", () => {
			it("should remove axis and return its value", () => {
				axis.set("X", 0.5);
				const removedValue = axis.remove("X");
				expect(removedValue).to.equal(0.5);
				expect(axis.get("X")).to.equal(undefined);
			});

			it("should return undefined when removing non-existent axis", () => {
				expect(axis.remove("Z")).to.equal(undefined);
			});
		});

		describe("allAxes", () => {
			it("should return all axis identifiers", () => {
				axis.set("X", 0.5);
				axis.set("Y", -0.3);
				axis.set("Z", 0.0);

				const axes = axis.allAxes();
				expect(axes.size()).to.equal(3);
				expect(axes.includes("X")).to.equal(true);
				expect(axes.includes("Y")).to.equal(true);
				expect(axes.includes("Z")).to.equal(true);
			});

			it("should return empty array when no axes", () => {
				const axes = axis.allAxes();
				expect(axes.size()).to.equal(0);
			});
		});

		describe("allAxesAndValues", () => {
			it("should return all axes with their values", () => {
				axis.set("X", 0.5);
				axis.set("Y", -0.3);

				const axesAndValues = axis.allAxesAndValues();
				expect(axesAndValues.size()).to.equal(2);

				const valuesMap = new Map(axesAndValues);
				expect(valuesMap.get("X")).to.equal(0.5);
				expect(valuesMap.get("Y")).to.equal(-0.3);
			});
		});

		describe("clear", () => {
			it("should remove all axes", () => {
				axis.set("X", 0.5);
				axis.set("Y", -0.3);
				axis.set("Z", 0.0);

				axis.clear();
				expect(axis.size()).to.equal(0);
				expect(axis.get("X")).to.equal(undefined);
				expect(axis.get("Y")).to.equal(undefined);
				expect(axis.get("Z")).to.equal(undefined);
			});
		});

		describe("size", () => {
			it("should return the number of axes", () => {
				expect(axis.size()).to.equal(0);

				axis.set("X", 0.5);
				expect(axis.size()).to.equal(1);

				axis.set("Y", -0.3);
				expect(axis.size()).to.equal(2);

				axis.remove("X");
				expect(axis.size()).to.equal(1);
			});
		});

		describe("constants", () => {
			it("should have correct MIN and MAX values", () => {
				expect(Axis.MIN).to.equal(-1.0);
				expect(Axis.MAX).to.equal(1.0);
			});
		});

		describe("edge cases", () => {
			it("should handle zero values correctly", () => {
				axis.set("X", 0);
				expect(axis.get("X")).to.equal(0);
			});

			it("should handle exact boundary values", () => {
				axis.set("X", 1.0);
				expect(axis.get("X")).to.equal(1.0);

				axis.set("Y", -1.0);
				expect(axis.get("Y")).to.equal(-1.0);
			});

			it("should handle very small values", () => {
				axis.set("X", 0.001);
				expect(axis.get("X")).to.equal(0.001);

				axis.set("Y", -0.001);
				expect(axis.get("Y")).to.equal(-0.001);
			});
		});
	});
};