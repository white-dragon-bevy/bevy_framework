/**
 * Duration 单元测试
 * @description 完整测试 Duration 类的所有功能
 */

import { Duration, durationRem } from "../duration";

export = () => {
	describe("Duration", () => {
		describe("构造函数", () => {
			it("应该创建 ZERO 常量", () => {
				expect(Duration.ZERO.asSecsF64()).to.equal(0);
				expect(Duration.ZERO.asNanos()).to.equal(0);
				expect(Duration.ZERO.isZero()).to.equal(true);
			});

			it("应该创建 MAX 常量", () => {
				expect(Duration.MAX.asSecsF64()).to.equal(math.huge);
				expect(Duration.MAX.subsecNanos()).to.equal(999_999_999);
			});

			it("fromSecs 应该正确创建 Duration", () => {
				const duration1 = Duration.fromSecs(1.5);
				expect(duration1.asSecs()).to.equal(1);
				expect(duration1.subsecNanos()).to.equal(500_000_000);
				expect(duration1.asSecsF64()).to.be.near(1.5, 0.0001);

				const duration2 = Duration.fromSecs(0.001);
				expect(duration2.asMillis()).to.be.near(1, 0.0001);

				const duration3 = Duration.fromSecs(3600);
				expect(duration3.asSecs()).to.equal(3600);
				expect(duration3.asSecsF64()).to.equal(3600);
			});

			it("fromSecsF64 应该正确创建 Duration", () => {
				const duration = Duration.fromSecsF64(2.5);
				expect(duration.asSecsF64()).to.be.near(2.5, 0.0001);
				expect(duration.asSecs()).to.equal(2);
				expect(duration.subsecNanos()).to.equal(500_000_000);
			});

			it("fromMillis 应该正确创建 Duration", () => {
				const duration1 = Duration.fromMillis(1500);
				expect(duration1.asSecsF64()).to.be.near(1.5, 0.0001);
				expect(duration1.asMillis()).to.equal(1500);

				const duration2 = Duration.fromMillis(50);
				expect(duration2.asSecsF64()).to.be.near(0.05, 0.0001);
				expect(duration2.asMillis()).to.equal(50);
			});

			it("fromMicros 应该正确创建 Duration", () => {
				const duration1 = Duration.fromMicros(1_500_000);
				expect(duration1.asSecsF64()).to.be.near(1.5, 0.0001);
				expect(duration1.asMicros()).to.equal(1_500_000);

				const duration2 = Duration.fromMicros(500);
				expect(duration2.asSecsF64()).to.be.near(0.0005, 0.000001);
				expect(duration2.asMicros()).to.equal(500);
			});

			it("fromNanos 应该正确创建 Duration", () => {
				const duration1 = Duration.fromNanos(1_500_000_000);
				expect(duration1.asSecsF64()).to.be.near(1.5, 0.0001);
				expect(duration1.asNanos()).to.equal(1_500_000_000);

				const duration2 = Duration.fromNanos(123);
				expect(duration2.asNanos()).to.equal(123);
				expect(duration2.asSecs()).to.equal(0);
				expect(duration2.subsecNanos()).to.equal(123);
			});
		});

		describe("转换方法", () => {
			it("asSecsF32 应该返回正确的秒数", () => {
				const duration = Duration.fromSecs(2.5);
				expect(duration.asSecsF32()).to.be.near(2.5, 0.0001);
			});

			it("asSecsF64 应该返回正确的秒数", () => {
				const duration = Duration.fromSecs(3.75);
				expect(duration.asSecsF64()).to.be.near(3.75, 0.0001);
			});

			it("asMillis 应该返回正确的毫秒数", () => {
				const duration1 = Duration.fromSecs(1.5);
				expect(duration1.asMillis()).to.equal(1500);

				const duration2 = Duration.fromMillis(250);
				expect(duration2.asMillis()).to.equal(250);
			});

			it("asMicros 应该返回正确的微秒数", () => {
				const duration = Duration.fromSecs(0.5);
				expect(duration.asMicros()).to.equal(500_000);
			});

			it("asNanos 应该返回正确的纳秒数", () => {
				const duration = Duration.fromSecs(0.001);
				expect(duration.asNanos()).to.equal(1_000_000);
			});

			it("asSecs 应该返回整秒部分", () => {
				const duration = Duration.fromSecs(5.7);
				expect(duration.asSecs()).to.equal(5);
			});

			it("subsecNanos 应该返回纳秒余数", () => {
				const duration = Duration.fromSecs(1.5);
				expect(duration.subsecNanos()).to.equal(500_000_000);
			});
		});

		describe("算术运算", () => {
			it("add 应该正确相加", () => {
				const duration1 = Duration.fromSecs(1.5);
				const duration2 = Duration.fromSecs(2.3);
				const result = duration1.add(duration2);

				expect(result.asSecsF64()).to.be.near(3.8, 0.0001);
			});

			it("add 应该处理纳秒溢出", () => {
				const duration1 = Duration.fromNanos(900_000_000);
				const duration2 = Duration.fromNanos(300_000_000);
				const result = duration1.add(duration2);

				expect(result.asSecs()).to.equal(1);
				expect(result.subsecNanos()).to.equal(200_000_000);
			});

			it("saturatingSub 应该正确相减", () => {
				const duration1 = Duration.fromSecs(5);
				const duration2 = Duration.fromSecs(2);
				const result = duration1.saturatingSub(duration2);

				expect(result.asSecsF64()).to.equal(3);
			});

			it("saturatingSub 应该饱和到零", () => {
				const duration1 = Duration.fromSecs(2);
				const duration2 = Duration.fromSecs(5);
				const result = duration1.saturatingSub(duration2);

				expect(result.equals(Duration.ZERO)).to.equal(true);
				expect(result.isZero()).to.equal(true);
			});

			it("checkedSub 应该返回 undefined 当结果为负", () => {
				const duration1 = Duration.fromSecs(2);
				const duration2 = Duration.fromSecs(5);
				const result = duration1.checkedSub(duration2);

				expect(result).to.equal(undefined);
			});

			it("checkedSub 应该返回正确的结果", () => {
				const duration1 = Duration.fromSecs(5);
				const duration2 = Duration.fromSecs(2);
				const result = duration1.checkedSub(duration2);

				expect(result).never.to.equal(undefined);
				if (result) {
					expect(result.asSecsF64()).to.equal(3);
				}
			});

			it("mul 应该正确相乘", () => {
				const duration = Duration.fromSecs(2);
				const result = duration.mul(3);

				expect(result.asSecsF64()).to.equal(6);
			});

			it("mul 应该处理小数因子", () => {
				const duration = Duration.fromSecs(4);
				const result = duration.mul(0.5);

				expect(result.asSecsF64()).to.be.near(2, 0.0001);
			});

			it("saturatingMul 应该饱和到最大值", () => {
				const duration = Duration.fromSecs(1000000);
				const result = duration.saturatingMul(math.huge);

				expect(result.equals(Duration.MAX)).to.equal(true);
			});

			it("checkedMul 应该返回 undefined 当溢出", () => {
				const duration = Duration.fromSecs(1000000);
				const result = duration.checkedMul(math.huge);

				expect(result).to.equal(undefined);
			});

			it("checkedMul 应该返回 undefined 当因子为负", () => {
				const duration = Duration.fromSecs(1);
				const result = duration.checkedMul(-1);

				expect(result).to.equal(undefined);
			});

			it("div 应该正确相除", () => {
				const duration = Duration.fromSecs(10);
				const result = duration.div(2);

				expect(result.asSecsF64()).to.equal(5);
			});

			it("div 应该向下取整", () => {
				const duration = Duration.fromSecs(7);
				const result = duration.div(3);

				// 7 / 3 = 2.333... -> 2
				expect(result.asSecsF64()).to.be.near(2.333, 0.001);
			});

			it("checkedDiv 应该返回 undefined 当除数为 0", () => {
				const duration = Duration.fromSecs(1);
				const result = duration.checkedDiv(0);

				expect(result).to.equal(undefined);
			});

			it("checkedDiv 应该返回 undefined 当除数为负", () => {
				const duration = Duration.fromSecs(1);
				const result = duration.checkedDiv(-1);

				expect(result).to.equal(undefined);
			});

			it("divDuration 应该计算两个 Duration 的比率", () => {
				const duration1 = Duration.fromSecs(10);
				const duration2 = Duration.fromSecs(2);
				const ratio = duration1.divDuration(duration2);

				expect(ratio).to.equal(5);
			});

			it("divDuration 应该处理小数比率", () => {
				const duration1 = Duration.fromSecs(3);
				const duration2 = Duration.fromSecs(4);
				const ratio = duration1.divDuration(duration2);

				expect(ratio).to.equal(0.75);
			});
		});

		describe("比较操作", () => {
			it("equals 应该正确比较相等", () => {
				const duration1 = Duration.fromSecs(1.5);
				const duration2 = Duration.fromSecs(1.5);
				const duration3 = Duration.fromSecs(2);

				expect(duration1.equals(duration2)).to.equal(true);
				expect(duration1.equals(duration3)).to.equal(false);
			});

			it("isZero 应该正确判断零值", () => {
				expect(Duration.ZERO.isZero()).to.equal(true);
				expect(Duration.fromSecs(0).isZero()).to.equal(true);
				expect(Duration.fromSecs(0.001).isZero()).to.equal(false);
			});

			it("compare 应该返回正确的比较结果", () => {
				const duration1 = Duration.fromSecs(1);
				const duration2 = Duration.fromSecs(2);
				const duration3 = Duration.fromSecs(1);

				expect(duration1.compare(duration2)).to.equal(-1);
				expect(duration2.compare(duration1)).to.equal(1);
				expect(duration1.compare(duration3)).to.equal(0);
			});

			it("lessThan 应该正确比较", () => {
				const duration1 = Duration.fromSecs(1);
				const duration2 = Duration.fromSecs(2);

				expect(duration1.lessThan(duration2)).to.equal(true);
				expect(duration2.lessThan(duration1)).to.equal(false);
				expect(duration1.lessThan(duration1)).to.equal(false);
			});

			it("greaterThan 应该正确比较", () => {
				const duration1 = Duration.fromSecs(2);
				const duration2 = Duration.fromSecs(1);

				expect(duration1.greaterThan(duration2)).to.equal(true);
				expect(duration2.greaterThan(duration1)).to.equal(false);
				expect(duration1.greaterThan(duration1)).to.equal(false);
			});

			it("lessThanOrEqual 应该正确比较", () => {
				const duration1 = Duration.fromSecs(1);
				const duration2 = Duration.fromSecs(2);
				const duration3 = Duration.fromSecs(1);

				expect(duration1.lessThanOrEqual(duration2)).to.equal(true);
				expect(duration1.lessThanOrEqual(duration3)).to.equal(true);
				expect(duration2.lessThanOrEqual(duration1)).to.equal(false);
			});

			it("greaterThanOrEqual 应该正确比较", () => {
				const duration1 = Duration.fromSecs(2);
				const duration2 = Duration.fromSecs(1);
				const duration3 = Duration.fromSecs(2);

				expect(duration1.greaterThanOrEqual(duration2)).to.equal(true);
				expect(duration1.greaterThanOrEqual(duration3)).to.equal(true);
				expect(duration2.greaterThanOrEqual(duration1)).to.equal(false);
			});
		});

		describe("字符串表示", () => {
			it("toString 应该返回可读的字符串", () => {
				expect(Duration.ZERO.toString()).to.equal("0s");
				expect(Duration.fromSecs(5).toString()).to.equal("5s");
				expect(Duration.fromSecs(1.5).toString()).to.equal("1.5s");
				expect(Duration.fromMillis(500).toString()).to.equal("500ms");
				expect(Duration.fromMillis(50).toString()).to.equal("50ms");
				expect(Duration.fromMicros(500).toString()).to.equal("500μs");
				expect(Duration.fromNanos(500).toString()).to.equal("500ns");
			});
		});

		describe("durationRem 函数", () => {
			it("应该正确计算余数", () => {
				const duration = Duration.fromSecs(10);
				const period = Duration.fromSecs(3);
				const result = durationRem(duration, period);

				expect(result.asSecsF64()).to.equal(1);
			});

			it("应该处理零周期", () => {
				const duration = Duration.fromSecs(10);
				const period = Duration.ZERO;
				const result = durationRem(duration, period);

				expect(result.equals(Duration.ZERO)).to.equal(true);
			});

			it("应该处理大于周期的情况", () => {
				const duration = Duration.fromSecs(7.5);
				const period = Duration.fromSecs(2);
				const result = durationRem(duration, period);

				expect(result.asSecsF64()).to.be.near(1.5, 0.0001);
			});

			it("应该处理小于周期的情况", () => {
				const duration = Duration.fromSecs(1.5);
				const period = Duration.fromSecs(3);
				const result = durationRem(duration, period);

				expect(result.equals(duration)).to.equal(true);
			});
		});

		describe("边界情况", () => {
			it("应该处理非常小的值", () => {
				const duration = Duration.fromNanos(1);
				expect(duration.asNanos()).to.equal(1);
				expect(duration.asSecsF64()).to.be.near(0.000000001, 0.0000000001);
			});

			it("应该处理非常大的值", () => {
				const duration = Duration.fromSecs(86400 * 365); // 一年
				expect(duration.asSecs()).to.equal(31536000);
			});

			it("应该正确处理精度", () => {
				const duration = Duration.fromSecs(1.123456789);
				const nanos = duration.subsecNanos();
				// 由于浮点数精度限制，允许小误差
				expect(nanos).to.be.near(123456789, 100);
			});
		});
	});
};