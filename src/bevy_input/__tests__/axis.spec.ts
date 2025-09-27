/**
 * Axis 类单元测试
 */

import { Axis } from "../axis";
import { GamepadButton } from "../gamepad";

export = () => {
	describe("Axis 轴输入管理", () => {
		let axis: Axis<GamepadButton>;

		beforeEach(() => {
			axis = new Axis<GamepadButton>();
		});

		describe("set 方法", () => {
			it("应该设置轴值并返回 undefined（首次设置）", () => {
				const result = axis.set(GamepadButton.RightTrigger, 0.5);
				expect(result).to.equal(undefined);
			});

			it("应该设置轴值并返回旧值（更新设置）", () => {
				axis.set(GamepadButton.RightTrigger, 0.5);
				const result = axis.set(GamepadButton.RightTrigger, 0.8);
				expect(result).to.equal(0.5);
			});
		});

		describe("get 方法（限制范围）", () => {
			it("应该返回限制在 [-1.0, 1.0] 范围内的值", () => {
				const testCases: Array<[number, number | undefined]> = [
					[-1.5, -1.0],
					[-1.1, -1.0],
					[-1.0, -1.0],
					[-0.9, -0.9],
					[-0.1, -0.1],
					[0.0, 0.0],
					[0.1, 0.1],
					[0.9, 0.9],
					[1.0, 1.0],
					[1.1, 1.0],
					[1.6, 1.0],
				];

				for (const [inputValue, expectedValue] of testCases) {
					const testAxis = new Axis<GamepadButton>();
					testAxis.set(GamepadButton.RightTrigger, inputValue);
					const actualValue = testAxis.get(GamepadButton.RightTrigger);
					expect(actualValue).to.equal(expectedValue);
				}
			});

			it("应该对未设置的轴返回 undefined", () => {
				const result = axis.get(GamepadButton.LeftTrigger);
				expect(result).to.equal(undefined);
			});
		});

		describe("getUnclamped 方法（不限制范围）", () => {
			it("应该返回未限制的原始值", () => {
				axis.set(GamepadButton.RightTrigger, -1.5);
				expect(axis.getUnclamped(GamepadButton.RightTrigger)).to.equal(-1.5);

				axis.set(GamepadButton.RightTrigger, 2.0);
				expect(axis.getUnclamped(GamepadButton.RightTrigger)).to.equal(2.0);
			});

			it("应该对未设置的轴返回 undefined", () => {
				const result = axis.getUnclamped(GamepadButton.LeftTrigger);
				expect(result).to.equal(undefined);
			});
		});

		describe("remove 方法", () => {
			it("应该移除轴值并返回原值", () => {
				const testCases = [-1.0, -0.9, -0.1, 0.0, 0.1, 0.9, 1.0];

				for (const value of testCases) {
					const testAxis = new Axis<GamepadButton>();
					testAxis.set(GamepadButton.RightTrigger, value);

					expect(testAxis.get(GamepadButton.RightTrigger)).never.to.equal(undefined);

					const removedValue = testAxis.remove(GamepadButton.RightTrigger);
					expect(removedValue).to.equal(value);

					const afterRemove = testAxis.get(GamepadButton.RightTrigger);
					expect(afterRemove).to.equal(undefined);
				}
			});

			it("应该对未设置的轴返回 undefined", () => {
				const result = axis.remove(GamepadButton.LeftTrigger);
				expect(result).to.equal(undefined);
			});
		});

		describe("allAxes 方法", () => {
			it("应该返回所有已设置的轴", () => {
				axis.set(GamepadButton.RightTrigger, 0.5);
				axis.set(GamepadButton.LeftTrigger, 0.3);
				axis.set(GamepadButton.LeftShoulder, 1.0);

				const axes = axis.allAxes();
				expect(axes.size()).to.equal(3);
				expect(axes.includes(GamepadButton.RightTrigger)).to.equal(true);
				expect(axes.includes(GamepadButton.LeftTrigger)).to.equal(true);
				expect(axes.includes(GamepadButton.LeftShoulder)).to.equal(true);
			});

			it("空轴应该返回空数组", () => {
				const axes = axis.allAxes();
				expect(axes.size()).to.equal(0);
			});
		});

		describe("allAxesAndValues 方法", () => {
			it("应该返回所有轴及其值", () => {
				axis.set(GamepadButton.RightTrigger, 0.5);
				axis.set(GamepadButton.LeftTrigger, 0.3);

				const axesAndValues = axis.allAxesAndValues();
				expect(axesAndValues.size()).to.equal(2);

				const axesMap = new Map(axesAndValues);
				expect(axesMap.get(GamepadButton.RightTrigger)).to.equal(0.5);
				expect(axesMap.get(GamepadButton.LeftTrigger)).to.equal(0.3);
			});

			it("空轴应该返回空数组", () => {
				const axesAndValues = axis.allAxesAndValues();
				expect(axesAndValues.size()).to.equal(0);
			});
		});

		describe("clear 方法", () => {
			it("应该清除所有轴数据", () => {
				axis.set(GamepadButton.RightTrigger, 0.5);
				axis.set(GamepadButton.LeftTrigger, 0.3);

				expect(axis.allAxes().size()).to.equal(2);

				axis.clear();

				expect(axis.allAxes().size()).to.equal(0);
				expect(axis.get(GamepadButton.RightTrigger)).to.equal(undefined);
				expect(axis.get(GamepadButton.LeftTrigger)).to.equal(undefined);
			});
		});

		describe("常量值", () => {
			it("MIN 应该等于 -1.0", () => {
				expect(Axis.MIN).to.equal(-1.0);
			});

			it("MAX 应该等于 1.0", () => {
				expect(Axis.MAX).to.equal(1.0);
			});
		});
	});
};
