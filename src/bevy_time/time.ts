/**
 * Time<T> - 通用时间管理类
 * 对应 Rust bevy_time/src/time.rs
 * 完全映射 Rust 结构体字段 (time.rs:192-204)
 */

import { Duration, durationRem } from "./duration";

/**
 * Time 上下文基础接口
 * 所有时间类型都可以扩展这个接口
 */
export interface TimeContext {
	// 可以被具体时间类型扩展
}

/**
 * Real 时间类型标记
 */
export interface Real extends TimeContext {
	readonly __brand: "Real";
}

/**
 * Virtual 时间类型标记
 */
export interface Virtual extends TimeContext {
	readonly __brand: "Virtual";
	readonly paused: boolean;
	readonly relativeSpeed: number;
	readonly effectiveSpeed: number;
	readonly maxDelta: Duration;
}

/**
 * Fixed 时间类型标记
 * 对应 Rust fixed.rs:69-72
 */
export interface Fixed extends TimeContext {
	readonly __brand: "Fixed";
	timestep: Duration;
	overstep: Duration;
}

/**
 * 空上下文类型（默认）
 */
export interface Empty extends TimeContext {}

/**
 * Time<T> 通用时间类
 * 对应 Rust time.rs:190-204
 */
export class Time<T extends TimeContext = Empty> {
	// 对应 Rust 字段 (time.rs:193-203)
	protected context: T;
	protected wrapPeriod: Duration;
	protected delta: Duration;
	protected deltaSecs: number; // f32
	protected deltaSecsF64: number; // f64
	protected elapsed: Duration;
	protected elapsedSecs: number; // f32
	protected elapsedSecsF64: number; // f64
	protected elapsedWrapped: Duration;
	protected elapsedSecsWrapped: number; // f32
	protected elapsedSecsWrappedF64: number; // f64

	// 默认 wrap period = 1 小时
	// 对应 Rust time.rs:207
	private static readonly DEFAULT_WRAP_PERIOD = Duration.fromSecs(3600);

	/**
	 * 构造函数
	 * 对应 Rust Time::new_with (time.rs:211)
	 */
	constructor(context: T) {
		this.context = context;
		this.wrapPeriod = Time.DEFAULT_WRAP_PERIOD;
		this.delta = Duration.ZERO;
		this.deltaSecs = 0;
		this.deltaSecsF64 = 0;
		this.elapsed = Duration.ZERO;
		this.elapsedSecs = 0;
		this.elapsedSecsF64 = 0;
		this.elapsedWrapped = Duration.ZERO;
		this.elapsedSecsWrapped = 0;
		this.elapsedSecsWrappedF64 = 0;
	}

	/**
	 * 推进时间
	 * 对应 Rust Time::advance_by (time.rs:223-233)
	 */
	advanceBy(delta: Duration): void {
		this.delta = delta;
		this.deltaSecs = this.delta.asSecsF32();
		this.deltaSecsF64 = this.delta.asSecsF64();
		this.elapsed = this.elapsed.add(delta);
		this.elapsedSecs = this.elapsed.asSecsF32();
		this.elapsedSecsF64 = this.elapsed.asSecsF64();
		this.elapsedWrapped = durationRem(this.elapsed, this.wrapPeriod);
		this.elapsedSecsWrapped = this.elapsedWrapped.asSecsF32();
		this.elapsedSecsWrappedF64 = this.elapsedWrapped.asSecsF64();
	}

	/**
	 * 推进到指定时间
	 * 对应 Rust Time::advance_to (time.rs:244-250)
	 */
	advanceTo(elapsed: Duration): void {
		assert(elapsed.greaterThanOrEqual(this.elapsed), "tried to move time backwards to an earlier elapsed moment");
		this.advanceBy(elapsed.saturatingSub(this.elapsed));
	}

	/**
	 * 获取 wrap period
	 * 对应 Rust Time::wrap_period (time.rs:256-258)
	 */
	getWrapPeriod(): Duration {
		return this.wrapPeriod;
	}

	/**
	 * 设置 wrap period
	 * 对应 Rust Time::set_wrap_period (time.rs:268-273)
	 */
	setWrapPeriod(wrapPeriod: Duration): void {
		assert(!wrapPeriod.isZero(), "attempted to set wrap period to zero");
		this.wrapPeriod = wrapPeriod;
	}

	/**
	 * 获取时间增量
	 * 对应 Rust Time::delta (time.rs:278-280)
	 */
	getDelta(): Duration {
		return this.delta;
	}

	/**
	 * 获取时间增量（秒，f32）
	 * 对应 Rust Time::delta_secs (time.rs:285-287)
	 */
	getDeltaSecs(): number {
		return this.deltaSecs;
	}

	/**
	 * 获取时间增量（秒，f64）
	 * 对应 Rust Time::delta_secs_f64 (time.rs:292-294)
	 */
	getDeltaSecsF64(): number {
		return this.deltaSecsF64;
	}

	/**
	 * 获取总时间
	 * 对应 Rust Time::elapsed (time.rs:299-301)
	 */
	getElapsed(): Duration {
		return this.elapsed;
	}

	/**
	 * 获取总时间（秒，f32）
	 * 对应 Rust Time::elapsed_secs (time.rs:311-313)
	 */
	getElapsedSecs(): number {
		return this.elapsedSecs;
	}

	/**
	 * 获取总时间（秒，f64）
	 * 对应 Rust Time::elapsed_secs_f64 (time.rs:323-325)
	 */
	getElapsedSecsF64(): number {
		return this.elapsedSecsF64;
	}

	/**
	 * 获取包装后的总时间
	 * 对应 Rust Time::elapsed_wrapped (time.rs:337-339)
	 */
	getElapsedWrapped(): Duration {
		return this.elapsedWrapped;
	}

	/**
	 * 获取包装后的总时间（秒，f32）
	 * 对应 Rust Time::elapsed_secs_wrapped (time.rs:350-352)
	 */
	getElapsedSecsWrapped(): number {
		return this.elapsedSecsWrapped;
	}

	/**
	 * 获取包装后的总时间（秒，f64）
	 * 对应 Rust Time::elapsed_secs_wrapped_f64 (time.rs:363-365)
	 */
	getElapsedSecsWrappedF64(): number {
		return this.elapsedSecsWrappedF64;
	}

	/**
	 * 获取上下文（只读）
	 * 对应 Rust Time::context (time.rs:370-372)
	 */
	getContext(): T {
		return this.context;
	}

	/**
	 * 获取上下文（可写）
	 * 对应 Rust Time::context_mut (time.rs:380-382)
	 */
	protected getContextMut(): T {
		return this.context;
	}

	/**
	 * 设置新的上下文
	 * @param newContext - 新的上下文
	 */
	setContext(newContext: T): void {
		this.context = newContext;
	}

	/**
	 * 转换为通用 Time
	 * 对应 Rust Time::as_generic (time.rs:396-409)
	 */
	asGeneric(): Time<Empty> {
		const genericTime = new Time<Empty>({});
		genericTime.wrapPeriod = this.wrapPeriod;
		genericTime.delta = this.delta;
		genericTime.deltaSecs = this.deltaSecs;
		genericTime.deltaSecsF64 = this.deltaSecsF64;
		genericTime.elapsed = this.elapsed;
		genericTime.elapsedSecs = this.elapsedSecs;
		genericTime.elapsedSecsF64 = this.elapsedSecsF64;
		genericTime.elapsedWrapped = this.elapsedWrapped;
		genericTime.elapsedSecsWrapped = this.elapsedSecsWrapped;
		genericTime.elapsedSecsWrappedF64 = this.elapsedSecsWrappedF64;
		return genericTime;
	}

	/**
	 * 创建默认实例
	 * 对应 Rust Default trait
	 */
	static default<T extends TimeContext>(context: T): Time<T> {
		return new Time(context);
	}
}

/**
 * Time 的简化别名（为了兼容性）
 */
export type GenericTime = Time<Empty>;
export type RealTime = Time<Real>;
export type VirtualTime = Time<Virtual>;
export type FixedTime = Time<Fixed>;
