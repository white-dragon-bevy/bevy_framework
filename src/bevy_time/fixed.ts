/**
 * Fixed Time 实现
 * 严格对应 Rust bevy_time/src/fixed.rs
 * 提供固定时间步长功能，用于物理模拟等需要稳定更新频率的系统
 */

import { Duration } from "./duration";
import { Time as TimeBase, Fixed, FixedTime as FixedTimeAlias } from "./time";

/**
 * Time<Fixed> 的扩展实现
 * 对应 Rust impl Time<Fixed> (fixed.rs:75-224)
 * 管理固定时间步长和时间累积/消耗
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
	 * @param timestep - 固定时间步长
	 * @returns TimeFixed 实例
	 */
	static fromDuration(timestep: Duration): TimeFixed {
		const time = new TimeFixed();
		time.setTimestep(timestep);
		return time;
	}

	/**
	 * 从秒数创建
	 * 对应 Rust Time::<Fixed>::from_seconds (fixed.rs:89-97)
	 * @param seconds - 固定时间步长（秒）
	 * @returns TimeFixed 实例
	 */
	static fromSeconds(seconds: number): TimeFixed {
		const time = new TimeFixed();
		time.setTimestepSeconds(seconds);
		return time;
	}

	/**
	 * 从 Hz 创建
	 * 对应 Rust Time::<Fixed>::from_hz (fixed.rs:100-108)
	 * @param hz - 频率（赫兹）
	 * @returns TimeFixed 实例
	 */
	static fromHz(hz: number): TimeFixed {
		const time = new TimeFixed();
		time.setTimestepHz(hz);
		return time;
	}

	/**
	 * 获取时间步长
	 * 对应 Rust Time::<Fixed>::timestep (fixed.rs:114-116)
	 * @returns 当前时间步长
	 */
	timestep(): Duration {
		return this.getContext().timestep;
	}

	/**
	 * 设置时间步长
	 * 对应 Rust Time::<Fixed>::set_timestep (fixed.rs:128-135)
	 * @param timestep - 新的时间步长
	 * @throws 如果 timestep 为零
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
	 * @param seconds - 时间步长（秒）
	 * @throws 如果 seconds 为零、NaN 或无穷大
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
	 * @param hz - 频率（赫兹）
	 * @throws 如果 hz 为零、NaN 或无穷大
	 */
	setTimestepHz(hz: number): void {
		assert(hz !== 0 && math.abs(hz) !== math.huge, "Hz is invalid (zero, NaN or infinite)");
		this.setTimestepSeconds(1.0 / hz);
	}

	/**
	 * 获取 overstep（累积但未消耗的时间）
	 * 对应 Rust Time::<Fixed>::overstep (fixed.rs:181-183)
	 * @returns 累积但未消耗的时间
	 */
	overstep(): Duration {
		return this.getContext().overstep;
	}

	/**
	 * 丢弃部分 overstep
	 * 对应 Rust Time::<Fixed>::discard_overstep (fixed.rs:189-192)
	 * @param discard - 要丢弃的时间量
	 */
	discardOverstep(discard: Duration): void {
		const context = this.getContextMut();
		context.overstep = context.overstep.saturatingSub(discard);
	}

	/**
	 * 获取 overstep 分数 (f32)
	 * 对应 Rust Time::<Fixed>::overstep_fraction (fixed.rs:197-199)
	 * @returns overstep 占 timestep 的比例（32位浮点）
	 */
	overstepFraction(): number {
		return this.getContext().overstep.asSecsF32() / this.getContext().timestep.asSecsF32();
	}

	/**
	 * 获取 overstep 分数 (f64)
	 * 对应 Rust Time::<Fixed>::overstep_fraction_f64 (fixed.rs:204-206)
	 * @returns overstep 占 timestep 的比例（64位浮点）
	 */
	overstepFractionF64(): number {
		return this.getContext().overstep.asSecsF64() / this.getContext().timestep.asSecsF64();
	}

	/**
	 * 累积时间
	 * 对应 Rust Time::<Fixed>::accumulate (fixed.rs:208-210)
	 * @param delta - 要累积的时间增量
	 */
	accumulate(delta: Duration): void {
		this.getContextMut().overstep = this.getContext().overstep.add(delta);
	}

	/**
	 * 消费时间步
	 * 对应 Rust Time::<Fixed>::expend (fixed.rs:212-223)
	 * @returns 如果成功消费一个时间步则返回 true，否则返回 false
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
 * 累积虚拟时间增量并运行固定调度，直到消耗完所有累积时间
 * @param virtualTimeDelta - 虚拟时间增量
 * @param fixedTime - 固定时间实例
 * @param runSchedule - 要运行的调度函数
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

