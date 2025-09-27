/**
 * Duration - 时间长度表示
 * 对应 Rust std::time::Duration
 * 内部使用 秒 + 纳秒 表示，保证精度
 */
export class Duration {
	/** 零时间长度 */
	public static readonly ZERO = new Duration(0, 0);
	/** 最大时间长度 */
	public static readonly MAX = new Duration(math.huge, 999_999_999);

	/** 秒数部分 */
	private readonly secs: number;
	/** 纳秒部分 (0-999,999,999) */
	private readonly nanos: number;

	/**
	 * 构造函数
	 * @param secs 秒数
	 * @param nanos 纳秒数 (0-999,999,999)
	 */
	private constructor(secs: number, nanos: number) {
		// 确保 nanos 在有效范围内
		const totalNanos = nanos;
		const extraSecs = math.floor(totalNanos / 1_000_000_000);
		this.secs = secs + extraSecs;
		this.nanos = totalNanos - extraSecs * 1_000_000_000;
	}

	/**
	 * 从秒数创建 Duration
	 * 对应 Rust Duration::from_secs_f64
	 */
	static fromSecs(secs: number): Duration {
		const wholeSecs = math.floor(secs);
		const nanos = math.floor((secs - wholeSecs) * 1_000_000_000);
		return new Duration(wholeSecs, nanos);
	}

	/**
	 * 从秒数创建 Duration (f64 精度)
	 * 对应 Rust Duration::from_secs_f64
	 */
	static fromSecsF64(secs: number): Duration {
		return Duration.fromSecs(secs);
	}

	/**
	 * 从毫秒创建 Duration
	 * 对应 Rust Duration::from_millis
	 */
	static fromMillis(millis: number): Duration {
		const secs = math.floor(millis / 1000);
		const nanos = (millis % 1000) * 1_000_000;
		return new Duration(secs, nanos);
	}

	/**
	 * 从微秒创建 Duration
	 * 对应 Rust Duration::from_micros
	 */
	static fromMicros(micros: number): Duration {
		const secs = math.floor(micros / 1_000_000);
		const nanos = (micros % 1_000_000) * 1000;
		return new Duration(secs, nanos);
	}

	/**
	 * 从纳秒创建 Duration
	 * 对应 Rust Duration::from_nanos
	 */
	static fromNanos(nanos: number): Duration {
		const secs = math.floor(nanos / 1_000_000_000);
		const remainingNanos = nanos % 1_000_000_000;
		return new Duration(secs, remainingNanos);
	}

	/**
	 * 获取总秒数 (f32 精度)
	 * 对应 Rust Duration::as_secs_f32
	 */
	asSecsF32(): number {
		return this.secs + this.nanos / 1_000_000_000;
	}

	/**
	 * 获取总秒数 (f64 精度)
	 * 对应 Rust Duration::as_secs_f64
	 */
	asSecsF64(): number {
		return this.secs + this.nanos / 1_000_000_000;
	}

	/**
	 * 获取总毫秒数
	 * 对应 Rust Duration::as_millis
	 */
	asMillis(): number {
		return this.secs * 1000 + this.nanos / 1_000_000;
	}

	/**
	 * 获取总微秒数
	 * 对应 Rust Duration::as_micros
	 */
	asMicros(): number {
		return this.secs * 1_000_000 + this.nanos / 1000;
	}

	/**
	 * 获取总纳秒数
	 * 对应 Rust Duration::as_nanos
	 */
	asNanos(): number {
		return this.secs * 1_000_000_000 + this.nanos;
	}

	/**
	 * 加法运算
	 * 对应 Rust impl Add for Duration
	 */
	add(other: Duration): Duration {
		const totalSecs = this.secs + other.secs;
		const totalNanos = this.nanos + other.nanos;
		return new Duration(totalSecs, totalNanos);
	}

	/**
	 * 减法运算（饱和减法）
	 * 对应 Rust Duration::saturating_sub
	 */
	saturatingSub(other: Duration): Duration {
		// 转换为纳秒进行计算
		const thisNanos = this.asNanos();
		const otherNanos = other.asNanos();
		const result = thisNanos - otherNanos;

		if (result <= 0) {
			return Duration.ZERO;
		}

		return Duration.fromNanos(result);
	}

	/**
	 * 检查减法（返回 undefined 如果结果为负）
	 * 对应 Rust Duration::checked_sub
	 */
	checkedSub(other: Duration): Duration | undefined {
		const thisNanos = this.asNanos();
		const otherNanos = other.asNanos();
		const result = thisNanos - otherNanos;

		if (result < 0) {
			return undefined;
		}

		return Duration.fromNanos(result);
	}

	/**
	 * 乘法运算
	 * 对应 Rust impl Mul<u32> for Duration
	 */
	mul(factor: number): Duration {
		if (factor < 0) {
			error("Duration multiplication factor must be non-negative");
		}
		return Duration.fromNanos(this.asNanos() * factor);
	}

	/**
	 * 饱和乘法运算
	 * 对应 Rust Duration::saturating_mul
	 */
	saturatingMul(factor: number): Duration {
		if (factor < 0) {
			error("Duration multiplication factor must be non-negative");
		}
		const result = this.asNanos() * factor;
		if (result === math.huge || result > Duration.MAX.asNanos()) {
			return Duration.MAX;
		}
		return Duration.fromNanos(result);
	}

	/**
	 * 检查乘法（返回 undefined 如果溢出）
	 * 对应 Rust Duration::checked_mul
	 */
	checkedMul(factor: number): Duration | undefined {
		if (factor < 0) {
			return undefined;
		}
		const result = this.asNanos() * factor;
		if (result === math.huge || result > Duration.MAX.asNanos()) {
			return undefined;
		}
		return Duration.fromNanos(result);
	}

	/**
	 * 除法运算
	 * 对应 Rust impl Div<u32> for Duration
	 */
	div(divisor: number): Duration {
		if (divisor <= 0) {
			error("Duration division by zero or negative number");
		}
		return Duration.fromNanos(math.floor(this.asNanos() / divisor));
	}

	/**
	 * 检查除法（返回 undefined 如果除数为 0）
	 * 对应 Rust Duration::checked_div
	 */
	checkedDiv(divisor: number): Duration | undefined {
		if (divisor <= 0) {
			return undefined;
		}
		return Duration.fromNanos(math.floor(this.asNanos() / divisor));
	}

	/**
	 * 计算两个 Duration 的比率
	 * 对应 Rust Duration::as_secs_f64() / other.as_secs_f64()
	 */
	divDuration(other: Duration): number {
		if (other.isZero()) {
			error("Division by zero Duration");
		}
		return this.asSecsF64() / other.asSecsF64();
	}

	/**
	 * 检查是否相等
	 * 对应 Rust PartialEq for Duration
	 */
	equals(other: Duration): boolean {
		return this.secs === other.secs && this.nanos === other.nanos;
	}

	/**
	 * 检查是否为零
	 */
	isZero(): boolean {
		return this.secs === 0 && this.nanos === 0;
	}

	/**
	 * 比较大小
	 * 对应 Rust PartialOrd for Duration
	 */
	compare(other: Duration): number {
		if (this.secs !== other.secs) {
			return this.secs < other.secs ? -1 : 1;
		}
		if (this.nanos !== other.nanos) {
			return this.nanos < other.nanos ? -1 : 1;
		}
		return 0;
	}

	/**
	 * 是否小于
	 */
	lessThan(other: Duration): boolean {
		return this.compare(other) < 0;
	}

	/**
	 * 是否大于
	 */
	greaterThan(other: Duration): boolean {
		return this.compare(other) > 0;
	}

	/**
	 * 是否小于等于
	 */
	lessThanOrEqual(other: Duration): boolean {
		return this.compare(other) <= 0;
	}

	/**
	 * 是否大于等于
	 */
	greaterThanOrEqual(other: Duration): boolean {
		return this.compare(other) >= 0;
	}

	/**
	 * 获取秒数部分（整数）
	 * 对应 Rust Duration::as_secs
	 */
	asSecs(): number {
		return this.secs;
	}

	/**
	 * 获取纳秒部分（余数）
	 * 对应 Rust Duration::subsec_nanos
	 */
	subsecNanos(): number {
		return this.nanos;
	}

	/**
	 * 调试字符串
	 */
	toString(): string {
		if (this.isZero()) {
			return "0s";
		}

		const secs = this.asSecsF64();
		if (secs >= 1) {
			return `${secs}s`;
		} else if (secs >= 0.001) {
			return `${secs * 1000}ms`;
		} else if (secs >= 0.000001) {
			return `${secs * 1_000_000}μs`;
		} else {
			return `${secs * 1_000_000_000}ns`;
		}
	}
}

/**
 * Duration 取模运算（内部使用）
 * 对应 Rust 内部的 duration_rem 函数
 */
export function durationRem(duration: Duration, period: Duration): Duration {
	if (period.isZero()) {
		return Duration.ZERO;
	}

	const durationNanos = duration.asNanos();
	const periodNanos = period.asNanos();
	const remainder = durationNanos % periodNanos;

	return Duration.fromNanos(remainder);
}