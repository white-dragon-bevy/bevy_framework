/**
 * Fixed Time 实现
 * 严格对应 Rust bevy_time/src/fixed.rs
 */

import { Duration } from "./duration";
import { Time as TimeBase, Fixed, FixedTime as FixedTimeAlias } from "./time";

/**
 * Time<Fixed> 的扩展实现
 * 对应 Rust impl Time<Fixed> (fixed.rs:75-224)
 */
export class TimeFixed extends TimeBase<Fixed> {
	// 默认时间步长：64Hz = 15625 微秒
	// 对应 Rust Time::<Fixed>::DEFAULT_TIMESTEP (fixed.rs:75)
	public static readonly DEFAULT_TIMESTEP = Duration.fromMicros(15625);

	/**
	 * 默认构造函数
	 * 对应 Rust Default for Fixed (fixed.rs:226-233)
	 */
	constructor() {
		super({
			__brand: "Fixed",
			timestep: TimeFixed.DEFAULT_TIMESTEP,
			overstep: Duration.ZERO,
		});
	}

	/**
	 * 从 Duration 创建
	 * 对应 Rust Time::<Fixed>::from_duration (fixed.rs:78-86)
	 */
	static fromDuration(timestep: Duration): TimeFixed {
		const time = new TimeFixed();
		time.setTimestep(timestep);
		return time;
	}

	/**
	 * 从秒数创建
	 * 对应 Rust Time::<Fixed>::from_seconds (fixed.rs:89-97)
	 */
	static fromSeconds(seconds: number): TimeFixed {
		const time = new TimeFixed();
		time.setTimestepSeconds(seconds);
		return time;
	}

	/**
	 * 从 Hz 创建
	 * 对应 Rust Time::<Fixed>::from_hz (fixed.rs:100-108)
	 */
	static fromHz(hz: number): TimeFixed {
		const time = new TimeFixed();
		time.setTimestepHz(hz);
		return time;
	}

	/**
	 * 获取时间步长
	 * 对应 Rust Time::<Fixed>::timestep (fixed.rs:114-116)
	 */
	timestep(): Duration {
		return this.getContext().timestep;
	}

	/**
	 * 设置时间步长
	 * 对应 Rust Time::<Fixed>::set_timestep (fixed.rs:128-135)
	 */
	setTimestep(timestep: Duration): void {
		assert(
			!timestep.isZero(),
			"attempted to set fixed timestep to zero",
		);
		this.getContextMut().timestep = timestep;
	}

	/**
	 * 设置时间步长（秒）
	 * 对应 Rust Time::<Fixed>::set_timestep_seconds (fixed.rs:150-157)
	 */
	setTimestepSeconds(seconds: number): void {
		assert(
			seconds !== 0 && math.abs(seconds) !== math.huge,
			"seconds is invalid (zero, NaN or infinite)",
		);
		this.setTimestep(Duration.fromSecsF64(seconds));
	}

	/**
	 * 设置时间步长（Hz）
	 * 对应 Rust Time::<Fixed>::set_timestep_hz (fixed.rs:172-176)
	 */
	setTimestepHz(hz: number): void {
		assert(hz !== 0 && math.abs(hz) !== math.huge, "Hz is invalid (zero, NaN or infinite)");
		this.setTimestepSeconds(1.0 / hz);
	}

	/**
	 * 获取 overstep
	 * 对应 Rust Time::<Fixed>::overstep (fixed.rs:181-183)
	 */
	overstep(): Duration {
		return this.getContext().overstep;
	}

	/**
	 * 丢弃部分 overstep
	 * 对应 Rust Time::<Fixed>::discard_overstep (fixed.rs:189-192)
	 */
	discardOverstep(discard: Duration): void {
		const context = this.getContextMut();
		context.overstep = context.overstep.saturatingSub(discard);
	}

	/**
	 * 获取 overstep 分数 (f32)
	 * 对应 Rust Time::<Fixed>::overstep_fraction (fixed.rs:197-199)
	 */
	overstepFraction(): number {
		return this.getContext().overstep.asSecsF32() / this.getContext().timestep.asSecsF32();
	}

	/**
	 * 获取 overstep 分数 (f64)
	 * 对应 Rust Time::<Fixed>::overstep_fraction_f64 (fixed.rs:204-206)
	 */
	overstepFractionF64(): number {
		return this.getContext().overstep.asSecsF64() / this.getContext().timestep.asSecsF64();
	}

	/**
	 * 累积时间
	 * 对应 Rust Time::<Fixed>::accumulate (fixed.rs:208-210)
	 */
	accumulate(delta: Duration): void {
		this.getContextMut().overstep = this.getContext().overstep.add(delta);
	}

	/**
	 * 消费时间步
	 * 对应 Rust Time::<Fixed>::expend (fixed.rs:212-223)
	 */
	expend(): boolean {
		const timestep = this.timestep();
		const newValue = this.getContextMut().overstep.checkedSub(timestep);

		if (newValue !== undefined) {
			// reduce accumulated and increase elapsed by period
			this.getContextMut().overstep = newValue;
			this.advanceBy(timestep);
			return true;
		} else {
			// no more periods left in accumulated
			return false;
		}
	}

}

/**
 * 运行固定主调度
 * 对应 Rust run_fixed_main_schedule (fixed.rs:239-252)
 */
export function runFixedMainSchedule(
	virtualTimeDelta: Duration,
	fixedTime: TimeFixed,
	runSchedule: () => void,
): void {
	// 累积虚拟时间增量
	fixedTime.accumulate(virtualTimeDelta);

	// 运行调度直到消耗完累积的时间
	while (fixedTime.expend()) {
		runSchedule();
	}
}

