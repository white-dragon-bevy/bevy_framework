/**
 * Duration - 时间长度表示
 * 对应 Rust std::time::Duration
 * 内部使用秒 + 纳秒表示，保证精度
 * 所有算术操作都会正确处理纳秒溢出
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
	 * @param secs - 秒数
	 * @param nanos - 纳秒数 (0-999,999,999)
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
	 * @param secs - 秒数
	 * @returns Duration 实例
	 */
	static fromSecs(secs: number): Duration {
		const wholeSecs = math.floor(secs);
		const nanos = math.floor((secs - wholeSecs) * 1_000_000_000);
		return new Duration(wholeSecs, nanos);
	}

	/**
	 * 从秒数创建 Duration (f64 精度)
	 * 对应 Rust Duration::from_secs_f64
	 * @param secs - 秒数 (64位浮点精度)
	 * @returns Duration 实例
	 */
	static fromSecsF64(secs: number): Duration {
		return Duration.fromSecs(secs);
	}

	/**
	 * 从毫秒创建 Duration
	 * 对应 Rust Duration::from_millis
	 * @param millis - 毫秒数
	 * @returns Duration 实例
	 */
	static fromMillis(millis: number): Duration {
		const secs = math.floor(millis / 1000);
		const nanos = (millis % 1000) * 1_000_000;
		return new Duration(secs, nanos);
	}

	/**
	 * 从微秒创建 Duration
	 * 对应 Rust Duration::from_micros
	 * @param micros - 微秒数
	 * @returns Duration 实例
	 */
	static fromMicros(micros: number): Duration {
		const secs = math.floor(micros / 1_000_000);
		const nanos = (micros % 1_000_000) * 1000;
		return new Duration(secs, nanos);
	}

	/**
	 * 从纳秒创建 Duration
	 * 对应 Rust Duration::from_nanos
	 * @param nanos - 纳秒数
	 * @returns Duration 实例
	 */
	static fromNanos(nanos: number): Duration {
		const secs = math.floor(nanos / 1_000_000_000);
		const remainingNanos = nanos % 1_000_000_000;
		return new Duration(secs, remainingNanos);
	}

	/**
	 * 获取总秒数 (f32 精度)
	 * 对应 Rust Duration::as_secs_f32
	 * @returns 总秒数 (32位浮点精度)
	 */
	asSecsF32(): number {
		return this.secs + this.nanos / 1_000_000_000;
	}

	/**
	 * 获取总秒数 (f64 精度)
	 * 对应 Rust Duration::as_secs_f64
	 * @returns 总秒数 (64位浮点精度)
	 */
	asSecsF64(): number {
		return this.secs + this.nanos / 1_000_000_000;
	}

	/**
	 * 获取总毫秒数
	 * 对应 Rust Duration::as_millis
	 * @returns 总毫秒数
	 */
	asMillis(): number {
		return this.secs * 1000 + this.nanos / 1_000_000;
	}

	/**
	 * 获取总微秒数
	 * 对应 Rust Duration::as_micros
	 * @returns 总微秒数
	 */
	asMicros(): number {
		return this.secs * 1_000_000 + this.nanos / 1000;
	}

	/**
	 * 获取总纳秒数
	 * 对应 Rust Duration::as_nanos
	 * @returns 总纳秒数
	 */
	asNanos(): number {
		return this.secs * 1_000_000_000 + this.nanos;
	}

	/**
	 * 加法运算
	 * 对应 Rust impl Add for Duration
	 * @param other - 另一个 Duration
	 * @returns 相加后的新 Duration
	 */
	add(other: Duration): Duration {
		const totalSecs = this.secs + other.secs;
		const totalNanos = this.nanos + other.nanos;
		return new Duration(totalSecs, totalNanos);
	}

	/**
	 * 减法运算（饱和减法）
	 * 对应 Rust Duration::saturating_sub
	 * @param other - 要减去的 Duration
	 * @returns 相减后的新 Duration，如果结果为负则返回 ZERO
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
	 * @param other - 要减去的 Duration
	 * @returns 相减后的新 Duration，如果结果为负则返回 undefined
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
	 * @param factor - 乘数，必须为非负数
	 * @returns 相乘后的新 Duration
	 * @throws 如果 factor 为负数
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
	 * @param factor - 乘数，必须为非负数
	 * @returns 相乘后的新 Duration，如果溢出则返回 MAX
	 * @throws 如果 factor 为负数
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
	 * @param factor - 乘数
	 * @returns 相乘后的新 Duration，如果溢出或 factor 为负则返回 undefined
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
	 * @param divisor - 除数，必须大于 0
	 * @returns 相除后的新 Duration
	 * @throws 如果 divisor 小于等于 0
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
	 * @param divisor - 除数
	 * @returns 相除后的新 Duration，如果 divisor 小于等于 0 则返回 undefined
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
	 * @param other - 另一个 Duration
	 * @returns 两个 Duration 的比率
	 * @throws 如果 other 为零
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
	 * @param other - 另一个 Duration
	 * @returns 如果两个 Duration 相等则返回 true
	 */
	equals(other: Duration): boolean {
		return this.secs === other.secs && this.nanos === other.nanos;
	}

	/**
	 * 检查是否为零
	 * @returns 如果 Duration 为零则返回 true
	 */
	isZero(): boolean {
		return this.secs === 0 && this.nanos === 0;
	}

	/**
	 * 比较大小
	 * 对应 Rust PartialOrd for Duration
	 * @param other - 另一个 Duration
	 * @returns -1 表示小于，0 表示相等，1 表示大于
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
	 * @param other - 另一个 Duration
	 * @returns 如果当前 Duration 小于 other 则返回 true
	 */
	lessThan(other: Duration): boolean {
		return this.compare(other) < 0;
	}

	/**
	 * 是否大于
	 * @param other - 另一个 Duration
	 * @returns 如果当前 Duration 大于 other 则返回 true
	 */
	greaterThan(other: Duration): boolean {
		return this.compare(other) > 0;
	}

	/**
	 * 是否小于等于
	 * @param other - 另一个 Duration
	 * @returns 如果当前 Duration 小于等于 other 则返回 true
	 */
	lessThanOrEqual(other: Duration): boolean {
		return this.compare(other) <= 0;
	}

	/**
	 * 是否大于等于
	 * @param other - 另一个 Duration
	 * @returns 如果当前 Duration 大于等于 other 则返回 true
	 */
	greaterThanOrEqual(other: Duration): boolean {
		return this.compare(other) >= 0;
	}

	/**
	 * 获取秒数部分（整数）
	 * 对应 Rust Duration::as_secs
	 * @returns 秒数部分（整数）
	 */
	asSecs(): number {
		return this.secs;
	}

	/**
	 * 获取纳秒部分（余数）
	 * 对应 Rust Duration::subsec_nanos
	 * @returns 纳秒部分（0-999,999,999）
	 */
	subsecNanos(): number {
		return this.nanos;
	}

	/**
	 * 转换为可读字符串
	 * @returns 格式化的时间字符串
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
 * 用于计算时间周期性包装
 * @param duration - 被除数 Duration
 * @param period - 除数 Duration（包装周期）
 * @returns 取模后的余数 Duration
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
