/**
 * Fixed Time 测试用例
 * 严格对应 Rust bevy_time/src/fixed.rs 中的测试
 */

import { Duration } from "../duration";
import { TimeFixed } from "../fixed";

export default () => {
	describe("Time<Fixed>", () => {
		describe("test_set_timestep (对应 Rust fixed.rs:258-272)", () => {
			it("应该使用默认 64Hz 时间步长", () => {
				const time = new TimeFixed();
				// DEFAULT_TIMESTEP = Duration::from_micros(15625)
				expect(time.timestep().equals(Duration.fromMicros(15625))).to.equal(true);
			});

			it("应该支持设置时间步长（毫秒）", () => {
				const time = new TimeFixed();
				time.setTimestep(Duration.fromMillis(500));
				expect(time.timestep().equals(Duration.fromMillis(500))).to.equal(true);
			});

			it("应该支持设置时间步长（秒）", () => {
				const time = new TimeFixed();
				time.setTimestepSeconds(0.25);
				expect(time.timestep().equals(Duration.fromMillis(250))).to.equal(true);
			});

			it("应该支持设置时间步长（Hz）", () => {
				const time = new TimeFixed();
				time.setTimestepHz(8.0);
				expect(time.timestep().equals(Duration.fromMillis(125))).to.equal(true);
			});
		});

		describe("test_expend (对应 Rust fixed.rs:274-337)", () => {
			it("应该正确处理 expend 逻辑（完整测试）", () => {
				// let mut time = Time::<Fixed>::from_seconds(2.0);
				const time = TimeFixed.fromSeconds(2.0);

				// 初始状态
				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
				expect(time.getElapsed().equals(Duration.ZERO)).to.equal(true);

				// time.accumulate(Duration::from_secs(1));
				time.accumulate(Duration.fromSecs(1));

				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
				expect(time.getElapsed().equals(Duration.ZERO)).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(1))).to.equal(true);
				expect(time.overstepFraction()).to.be.near(0.5, 0.001);
				expect(time.overstepFractionF64()).to.be.near(0.5, 0.001);

				// assert!(!time.expend()); // false
				expect(time.expend()).to.equal(false);

				// 状态不变
				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
				expect(time.getElapsed().equals(Duration.ZERO)).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(1))).to.equal(true);
				expect(time.overstepFraction()).to.be.near(0.5, 0.001);
				expect(time.overstepFractionF64()).to.be.near(0.5, 0.001);

				// time.accumulate(Duration::from_secs(1));
				time.accumulate(Duration.fromSecs(1));

				expect(time.getDelta().equals(Duration.ZERO)).to.equal(true);
				expect(time.getElapsed().equals(Duration.ZERO)).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.overstepFraction()).to.be.near(1.0, 0.001);
				expect(time.overstepFractionF64()).to.be.near(1.0, 0.001);

				// assert!(time.expend()); // true
				expect(time.expend()).to.equal(true);

				expect(time.getDelta().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.getElapsed().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.overstep().equals(Duration.ZERO)).to.equal(true);
				expect(time.overstepFraction()).to.be.near(0.0, 0.001);
				expect(time.overstepFractionF64()).to.be.near(0.0, 0.001);

				// assert!(!time.expend()); // false
				expect(time.expend()).to.equal(false);

				expect(time.getDelta().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.getElapsed().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.overstep().equals(Duration.ZERO)).to.equal(true);
				expect(time.overstepFraction()).to.be.near(0.0, 0.001);
				expect(time.overstepFractionF64()).to.be.near(0.0, 0.001);

				// time.accumulate(Duration::from_secs(1));
				time.accumulate(Duration.fromSecs(1));

				expect(time.getDelta().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.getElapsed().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(1))).to.equal(true);
				expect(time.overstepFraction()).to.be.near(0.5, 0.001);
				expect(time.overstepFractionF64()).to.be.near(0.5, 0.001);

				// assert!(!time.expend()); // false
				expect(time.expend()).to.equal(false);

				expect(time.getDelta().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.getElapsed().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(1))).to.equal(true);
				expect(time.overstepFraction()).to.be.near(0.5, 0.001);
				expect(time.overstepFractionF64()).to.be.near(0.5, 0.001);
			});
		});

		describe("test_expend_multiple (对应 Rust fixed.rs:338-360)", () => {
			it("应该正确处理多次 expend", () => {
				// let mut time = Time::<Fixed>::from_seconds(2.0);
				const time = TimeFixed.fromSeconds(2.0);

				// time.accumulate(Duration::from_secs(7));
				time.accumulate(Duration.fromSecs(7));
				expect(time.overstep().equals(Duration.fromSecs(7))).to.equal(true);

				// assert!(time.expend()); // true
				expect(time.expend()).to.equal(true);
				expect(time.getElapsed().equals(Duration.fromSecs(2))).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(5))).to.equal(true);

				// assert!(time.expend()); // true
				expect(time.expend()).to.equal(true);
				expect(time.getElapsed().equals(Duration.fromSecs(4))).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(3))).to.equal(true);

				// assert!(time.expend()); // true
				expect(time.expend()).to.equal(true);
				expect(time.getElapsed().equals(Duration.fromSecs(6))).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(1))).to.equal(true);

				// assert!(!time.expend()); // false
				expect(time.expend()).to.equal(false);
				expect(time.getElapsed().equals(Duration.fromSecs(6))).to.equal(true);
				expect(time.overstep().equals(Duration.fromSecs(1))).to.equal(true);
			});
		});
	});
};