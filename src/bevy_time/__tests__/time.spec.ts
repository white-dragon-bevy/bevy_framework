/**
 * Time 基类单元测试
 * @description 测试 Time<T> 泛型类的所有功能
 */

import { Time, Real, Virtual, Fixed, Empty } from "../time";
import { Duration } from "../duration";

export = () => {
	describe("Time<T>", () => {
		describe("默认初始化", () => {
			it("应该使用默认值初始化 Time<Empty>", () => {
				const time = new Time<Empty>({});

				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
				expect(time.getElapsed().equals(Duration.ZERO)).to.equal(true);
				expect(time.getElapsedWrapped().equals(Duration.ZERO)).to.equal(true);
				expect(time.getDeltaSecs()).to.equal(0);
				expect(time.getElapsedSecs()).to.equal(0);
				expect(time.getWrapPeriod().asSecsF64()).to.equal(3600); // 默认 1 小时
			});

			it("应该正确初始化 Time<Real>", () => {
				const context: Real = { __brand: "Real" } as Real;
				const time = new Time<Real>(context);

				expect(time.getContext().__brand).to.equal("Real");
				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
			});

			it("应该正确初始化 Time<Virtual>", () => {
				const context: Virtual = {
					__brand: "Virtual",
					paused: false,
					relativeSpeed: 1.0,
					effectiveSpeed: 1.0,
					maxDelta: Duration.fromSecs(0.25),
				} as Virtual;
				const time = new Time<Virtual>(context);

				expect(time.getContext().__brand).to.equal("Virtual");
				expect(time.getContext().paused).to.equal(false);
				expect(time.getContext().relativeSpeed).to.equal(1.0);
			});

			it("应该正确初始化 Time<Fixed>", () => {
				const context: Fixed = {
					__brand: "Fixed",
					timestep: Duration.fromSecs(0.02),
					overstep: Duration.ZERO,
				} as Fixed;
				const time = new Time<Fixed>(context);

				expect(time.getContext().__brand).to.equal("Fixed");
				expect(time.getContext().timestep.asSecsF64()).to.be.near(0.02, 0.0001);
			});
		});

		describe("advanceBy 方法", () => {
			it("应该正确推进时间", () => {
				const time = new Time<Empty>({});
				const delta = Duration.fromSecs(0.016);

				time.advanceBy(delta);

				expect(time.getDelta().equals(delta)).to.equal(true);
				expect(time.getDeltaSecs()).to.be.near(0.016, 0.0001);
				expect(time.getDeltaSecsF64()).to.be.near(0.016, 0.0001);
				expect(time.getElapsed().equals(delta)).to.equal(true);
				expect(time.getElapsedSecs()).to.be.near(0.016, 0.0001);
			});

			it("应该累积多次推进", () => {
				const time = new Time<Empty>({});

				time.advanceBy(Duration.fromSecs(0.01));
				time.advanceBy(Duration.fromSecs(0.02));
				time.advanceBy(Duration.fromSecs(0.03));

				expect(time.getDelta().asSecsF64()).to.be.near(0.03, 0.0001); // 最后一次增量
				expect(time.getElapsed().asSecsF64()).to.be.near(0.06, 0.0001); // 总累积
			});

			it("应该更新包装后的时间", () => {
				const time = new Time<Empty>({});
				time.setWrapPeriod(Duration.fromSecs(1.0)); // 设置 1 秒包装周期

				// 推进超过包装周期
				time.advanceBy(Duration.fromSecs(0.5));
				expect(time.getElapsedWrapped().asSecsF64()).to.be.near(0.5, 0.0001);

				time.advanceBy(Duration.fromSecs(0.6));
				expect(time.getElapsedWrapped().asSecsF64()).to.be.near(0.1, 0.01); // 1.1 % 1.0 = 0.1
			});
		});

		describe("advanceTo 方法", () => {
			it("应该推进到指定时间", () => {
				const time = new Time<Empty>({});

				time.advanceBy(Duration.fromSecs(1));
				time.advanceTo(Duration.fromSecs(5));

				expect(time.getElapsed().asSecsF64()).to.equal(5);
				expect(time.getDelta().asSecsF64()).to.equal(4); // 5 - 1 = 4
			});

			it("应该拒绝向后推进时间", () => {
				const time = new Time<Empty>({});
				time.advanceBy(Duration.fromSecs(5));

				expect(() => {
					time.advanceTo(Duration.fromSecs(3));
				}).to.throw();
			});

			it("应该允许推进到相同时间", () => {
				const time = new Time<Empty>({});
				time.advanceBy(Duration.fromSecs(3));

				expect(() => {
					time.advanceTo(Duration.fromSecs(3));
				}).never.to.throw();

				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
			});
		});

		describe("wrap period 管理", () => {
			it("应该获取默认 wrap period", () => {
				const time = new Time<Empty>({});
				expect(time.getWrapPeriod().asSecsF64()).to.equal(3600);
			});

			it("应该设置新的 wrap period", () => {
				const time = new Time<Empty>({});
				const newPeriod = Duration.fromSecs(60);

				time.setWrapPeriod(newPeriod);
				expect(time.getWrapPeriod().equals(newPeriod)).to.equal(true);
			});

			it("应该拒绝零 wrap period", () => {
				const time = new Time<Empty>({});

				expect(() => {
					time.setWrapPeriod(Duration.ZERO);
				}).to.throw();
			});

			it("wrap period 应该影响 elapsed wrapped", () => {
				const time = new Time<Empty>({});
				time.setWrapPeriod(Duration.fromSecs(2));

				time.advanceBy(Duration.fromSecs(5.5));

				// 5.5 % 2 = 1.5
				expect(time.getElapsedWrapped().asSecsF64()).to.be.near(1.5, 0.01);
				expect(time.getElapsedSecsWrapped()).to.be.near(1.5, 0.01);
				expect(time.getElapsedSecsWrappedF64()).to.be.near(1.5, 0.01);
			});
		});

		describe("getter 方法", () => {
			it("应该返回正确的 delta 值", () => {
				const time = new Time<Empty>({});
				const delta = Duration.fromSecs(0.033);

				time.advanceBy(delta);

				expect(time.getDelta().equals(delta)).to.equal(true);
				expect(time.getDeltaSecs()).to.be.near(0.033, 0.0001);
				expect(time.getDeltaSecsF64()).to.be.near(0.033, 0.0001);
			});

			it("应该返回正确的 elapsed 值", () => {
				const time = new Time<Empty>({});

				time.advanceBy(Duration.fromSecs(1));
				time.advanceBy(Duration.fromSecs(2));

				expect(time.getElapsed().asSecsF64()).to.equal(3);
				expect(time.getElapsedSecs()).to.be.near(3, 0.0001);
				expect(time.getElapsedSecsF64()).to.equal(3);
			});

			it("应该返回正确的 context", () => {
				const context: Virtual = {
					__brand: "Virtual",
					paused: true,
					relativeSpeed: 2.0,
					effectiveSpeed: 0,
					maxDelta: Duration.fromSecs(0.1),
				} as Virtual;
				const time = new Time<Virtual>(context);

				const retrievedContext = time.getContext();
				expect(retrievedContext.__brand).to.equal("Virtual");
				expect(retrievedContext.paused).to.equal(true);
				expect(retrievedContext.relativeSpeed).to.equal(2.0);
			});
		});

		describe("asGeneric 方法", () => {
			it("应该转换为通用 Time", () => {
				const context: Real = { __brand: "Real" } as Real;
				const realTime = new Time<Real>(context);

				realTime.advanceBy(Duration.fromSecs(5));
				realTime.setWrapPeriod(Duration.fromSecs(10));

				const genericTime = realTime.asGeneric();

				expect(genericTime.getDelta().equals(realTime.getDelta())).to.equal(true);
				expect(genericTime.getElapsed().equals(realTime.getElapsed())).to.equal(true);
				expect(genericTime.getWrapPeriod().equals(realTime.getWrapPeriod())).to.equal(true);
				// 通用时间没有特定的上下文
				expect((genericTime.getContext() as unknown as { __brand?: string }).__brand).to.equal(undefined);
			});

			it("应该保留所有时间数据", () => {
				const context: Fixed = {
					__brand: "Fixed",
					timestep: Duration.fromSecs(0.02),
					overstep: Duration.fromSecs(0.01),
				} as Fixed;
				const fixedTime = new Time<Fixed>(context);

				for (let i = 0; i < 10; i++) {
					fixedTime.advanceBy(Duration.fromSecs(0.02));
				}

				const genericTime = fixedTime.asGeneric();

				expect(genericTime.getDelta().asSecsF64()).to.be.near(0.02, 0.0001);
				expect(genericTime.getElapsed().asSecsF64()).to.be.near(0.2, 0.001);
				expect(genericTime.getElapsedSecs()).to.be.near(0.2, 0.001);
				expect(genericTime.getElapsedSecsF64()).to.be.near(0.2, 0.001);
				expect(genericTime.getDeltaSecs()).to.be.near(0.02, 0.0001);
				expect(genericTime.getDeltaSecsF64()).to.be.near(0.02, 0.0001);
			});
		});

		describe("静态 default 方法", () => {
			it("应该创建默认实例", () => {
				const context: Empty = {};
				const time = Time.default(context);

				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
				expect(time.getElapsed().equals(Duration.ZERO)).to.equal(true);
			});

			it("应该使用提供的上下文", () => {
				const context: Virtual = {
					__brand: "Virtual",
					paused: false,
					relativeSpeed: 1.5,
					effectiveSpeed: 1.5,
					maxDelta: Duration.fromSecs(0.5),
				} as Virtual;
				const time = Time.default(context);

				expect(time.getContext().relativeSpeed).to.equal(1.5);
			});
		});

		describe("精度测试", () => {
			it("应该保持 f32 精度", () => {
				const time = new Time<Empty>({});
				const delta = Duration.fromSecs(0.123456789);

				time.advanceBy(delta);

				const deltaSecs = time.getDeltaSecs(); // f32 精度
				// f32 大约有 7 位有效数字
				expect(deltaSecs).to.be.near(0.123456789, 0.00001);
			});

			it("应该保持 f64 精度", () => {
				const time = new Time<Empty>({});
				const delta = Duration.fromSecs(0.123456789012345);

				time.advanceBy(delta);

				const deltaSecsF64 = time.getDeltaSecsF64(); // f64 精度
				// f64 有更高精度
				expect(deltaSecsF64).to.be.near(0.123456789012345, 0.0000000001);
			});
		});

		describe("边界情况", () => {
			it("应该处理非常小的时间增量", () => {
				const time = new Time<Empty>({});
				const verySmallDelta = Duration.fromNanos(1);

				time.advanceBy(verySmallDelta);

				expect(time.getDelta().asNanos()).to.equal(1);
				expect(time.getElapsed().asNanos()).to.equal(1);
			});

			it("应该处理非常大的时间增量", () => {
				const time = new Time<Empty>({});
				const veryLargeDelta = Duration.fromSecs(86400 * 30); // 30 天

				time.advanceBy(veryLargeDelta);

				expect(time.getElapsed().asSecs()).to.equal(86400 * 30);
			});

			it("应该处理连续的零增量", () => {
				const time = new Time<Empty>({});

				time.advanceBy(Duration.ZERO);
				time.advanceBy(Duration.ZERO);
				time.advanceBy(Duration.ZERO);

				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
				expect(time.getElapsed().equals(Duration.ZERO)).to.equal(true);
			});
		});
	});
};