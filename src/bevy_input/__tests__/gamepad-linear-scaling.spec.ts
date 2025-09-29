/**
 * Gamepad 线性缩放算法单元测试
 */

import { applyDeadzoneAndScaling, linearRemapping } from "../gamepad-linear-scaling";

export = () => {
	beforeEach(() => {
		// Setup before each test
	});

	afterEach(() => {
		// Cleanup after each test
	});

	describe("线性重映射函数", () => {
		it("应该正确映射基本范围", () => {
			// [0, 1] -> [0, 10]
			expect(linearRemapping(0.5, [0, 1], [0, 10])).to.equal(5);
			expect(linearRemapping(0, [0, 1], [0, 10])).to.equal(0);
			expect(linearRemapping(1, [0, 1], [0, 10])).to.equal(10);
		});

		it("应该正确映射负范围", () => {
			// [-1, 1] -> [-10, 10]
			expect(linearRemapping(0, [-1, 1], [-10, 10])).to.equal(0);
			expect(linearRemapping(-1, [-1, 1], [-10, 10])).to.equal(-10);
			expect(linearRemapping(1, [-1, 1], [-10, 10])).to.equal(10);
			expect(linearRemapping(0.5, [-1, 1], [-10, 10])).to.equal(5);
		});

		it("应该处理零范围输入", () => {
			// 当输入范围为 0 时，应返回新范围的最小值
			expect(linearRemapping(5, [5, 5], [0, 10])).to.equal(0);
		});

		it("应该处理反向映射", () => {
			// [0, 1] -> [10, 0]
			expect(linearRemapping(0, [0, 1], [10, 0])).to.equal(10);
			expect(linearRemapping(1, [0, 1], [10, 0])).to.equal(0);
			expect(linearRemapping(0.5, [0, 1], [10, 0])).to.equal(5);
		});
	});

	describe("死区和缩放应用", () => {
		const defaultSettings = {
			deadzoneLowerbound: -0.1,
			deadzoneUpperbound: 0.1,
			livezoneLowerbound: -0.95,
			livezoneUpperbound: 0.95,
		};

		it("应该在死区内返回 0", () => {
			expect(applyDeadzoneAndScaling(0, defaultSettings)).to.equal(0);
			expect(applyDeadzoneAndScaling(0.05, defaultSettings)).to.equal(0);
			expect(applyDeadzoneAndScaling(-0.05, defaultSettings)).to.equal(0);
			expect(applyDeadzoneAndScaling(0.1, defaultSettings)).to.equal(0);
			expect(applyDeadzoneAndScaling(-0.1, defaultSettings)).to.equal(0);
		});

		it("应该正确缩放正向活动区", () => {
			// 死区边缘 (0.1) 应该输出接近 0
			const edgeResult = applyDeadzoneAndScaling(0.1000001, defaultSettings);
			expect(edgeResult).to.be.near(0, 0.01);

			// 中点应该输出约 0.5
			const midValue = (0.1 + 0.95) / 2; // 0.525
			const midResult = applyDeadzoneAndScaling(midValue, defaultSettings);
			expect(midResult).to.be.near(0.5, 0.01);

			// 活动区边缘 (0.95) 应该输出 1.0
			expect(applyDeadzoneAndScaling(0.95, defaultSettings)).to.equal(1.0);

			// 超出活动区应该被限制到 1.0
			expect(applyDeadzoneAndScaling(1.0, defaultSettings)).to.equal(1.0);
		});

		it("应该正确缩放负向活动区", () => {
			// 死区边缘 (-0.1) 应该输出接近 0
			const edgeResult = applyDeadzoneAndScaling(-0.1000001, defaultSettings);
			expect(edgeResult).to.be.near(0, 0.01);

			// 中点应该输出约 -0.5
			const midValue = (-0.1 + -0.95) / 2; // -0.525
			const midResult = applyDeadzoneAndScaling(midValue, defaultSettings);
			expect(midResult).to.be.near(-0.5, 0.01);

			// 活动区边缘 (-0.95) 应该输出 -1.0
			expect(applyDeadzoneAndScaling(-0.95, defaultSettings)).to.equal(-1.0);

			// 超出活动区应该被限制到 -1.0
			expect(applyDeadzoneAndScaling(-1.0, defaultSettings)).to.equal(-1.0);
		});

		it("应该限制输入到 [-1, 1] 范围", () => {
			expect(applyDeadzoneAndScaling(2.0, defaultSettings)).to.equal(1.0);
			expect(applyDeadzoneAndScaling(-2.0, defaultSettings)).to.equal(-1.0);
		});

		it("应该处理边界条件", () => {
			// 精确的死区边界
			expect(applyDeadzoneAndScaling(0.1, defaultSettings)).to.equal(0.0);
			expect(applyDeadzoneAndScaling(-0.1, defaultSettings)).to.equal(0.0);

			// 精确的活动区边界
			expect(applyDeadzoneAndScaling(0.95, defaultSettings)).to.equal(1.0);
			expect(applyDeadzoneAndScaling(-0.95, defaultSettings)).to.equal(-1.0);
		});

		it("应该处理零范围情况", () => {
			const zeroRangeSettings = {
				deadzoneLowerbound: -0.1,
				deadzoneUpperbound: 0.1,
				livezoneLowerbound: -0.1, // 等于死区下界
				livezoneUpperbound: 0.1, // 等于死区上界
			};

			// 应该返回边界值而不是 NaN
			expect(applyDeadzoneAndScaling(0.2, zeroRangeSettings)).to.equal(1.0);
			expect(applyDeadzoneAndScaling(-0.2, zeroRangeSettings)).to.equal(-1.0);
		});
	});

	describe("与 Rust 实现的数值一致性验证", () => {
		const settings = {
			deadzoneLowerbound: -0.1,
			deadzoneUpperbound: 0.1,
			livezoneLowerbound: -0.95,
			livezoneUpperbound: 0.95,
		};

		it("应该与 Rust 参考值精确匹配", () => {
			// 根据 Rust 实现计算的预期值
			const testCases = [
				{ input: 0.0, expected: 0.0 },
				{ input: 0.05, expected: 0.0 }, // 死区内
				{ input: 0.1, expected: 0.0 }, // 死区边缘
				{ input: 0.2, expected: 0.11764705882352941 }, // (0.2 - 0.1) / (0.95 - 0.1)
				{ input: 0.5, expected: 0.47058823529411764 }, // (0.5 - 0.1) / (0.95 - 0.1)
				{ input: 0.95, expected: 1.0 }, // 活动区边缘
				{ input: -0.05, expected: 0.0 }, // 死区内
				{ input: -0.1, expected: 0.0 }, // 死区边缘
				{ input: -0.2, expected: -0.11764705882352941 }, // (-0.2 - (-0.1)) / ((-0.95) - (-0.1))
				{ input: -0.5, expected: -0.47058823529411764 }, // (-0.5 - (-0.1)) / ((-0.95) - (-0.1))
				{ input: -0.95, expected: -1.0 }, // 活动区边缘
			];

			for (const testCase of testCases) {
				const result = applyDeadzoneAndScaling(testCase.input, settings);
				expect(result).to.be.near(testCase.expected, 0.0001);
			}
		});

		it("应该保持对称性", () => {
			const testValues = [0.2, 0.3, 0.5, 0.7, 0.9];

			for (const value of testValues) {
				const positiveResult = applyDeadzoneAndScaling(value, settings);
				const negativeResult = applyDeadzoneAndScaling(-value, settings);

				// 负值的结果应该是正值结果的相反数
				expect(negativeResult).to.be.near(-positiveResult, 0.0001);
			}
		});

		it("应该具有单调性", () => {
			// 在死区外，输入值增大时输出值也应该增大
			const testValues = [0.11, 0.2, 0.3, 0.5, 0.7, 0.9, 0.95];
			let previousResult = -2; // 小于可能的最小输出

			for (const value of testValues) {
				const result = applyDeadzoneAndScaling(value, settings);
				expect(result > previousResult).to.equal(true);
				previousResult = result;
			}
		});
	});

	describe("特殊配置测试", () => {
		it("应该处理小死区", () => {
			const smallDeadzoneSettings = {
				deadzoneLowerbound: -0.01,
				deadzoneUpperbound: 0.01,
				livezoneLowerbound: -0.99,
				livezoneUpperbound: 0.99,
			};

			expect(applyDeadzoneAndScaling(0.005, smallDeadzoneSettings)).to.equal(0);
			expect(applyDeadzoneAndScaling(0.02, smallDeadzoneSettings) > 0).to.equal(true);
		});

		it("应该处理大死区", () => {
			const largeDeadzoneSettings = {
				deadzoneLowerbound: -0.3,
				deadzoneUpperbound: 0.3,
				livezoneLowerbound: -0.8,
				livezoneUpperbound: 0.8,
			};

			expect(applyDeadzoneAndScaling(0.2, largeDeadzoneSettings)).to.equal(0);
			expect(applyDeadzoneAndScaling(0.4, largeDeadzoneSettings) > 0).to.equal(true);
		});

		it("应该处理不对称配置", () => {
			const asymmetricSettings = {
				deadzoneLowerbound: -0.2,
				deadzoneUpperbound: 0.1,
				livezoneLowerbound: -0.9,
				livezoneUpperbound: 0.8,
			};

			expect(applyDeadzoneAndScaling(0.05, asymmetricSettings)).to.equal(0);
			expect(applyDeadzoneAndScaling(-0.1, asymmetricSettings)).to.equal(0);
			expect(applyDeadzoneAndScaling(0.2, asymmetricSettings) > 0).to.equal(true);
			expect(applyDeadzoneAndScaling(-0.3, asymmetricSettings) < 0).to.equal(true);
		});
	});
};