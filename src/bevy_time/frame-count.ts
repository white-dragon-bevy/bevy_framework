/**
 * FrameCount - 帧计数资源
 * 对应 Rust bevy_diagnostic/src/frame_count_diagnostics_plugin.rs
 *
 * 跟踪自应用启动以来渲染的帧数
 * 在 Last 阶段增加，提供可预测的行为
 */

/**
 * 帧计数资源
 *
 * 在应用的 Last 阶段自动递增
 * 第一次更新时为 0，第二次为 1，以此类推
 * 当超过 2^32-1 后会回绕到 0
 */
export class FrameCount {
	/** 当前帧数 */
	private value: number;

	constructor(initialValue = 0) {
		this.value = initialValue;
	}

	/**
	 * 获取当前帧数
	 */
	getValue(): number {
		return this.value;
	}

	/**
	 * 增加帧数（带回绕）
	 * 对应 Rust: frame_count.0.wrapping_add(1)
	 */
	increment(): void {
		// JavaScript 的 Number 可以安全表示到 2^53-1
		// 但为了与 Rust 行为一致，我们模拟 u32 的回绕
		const MAX_U32 = 0xffffffff;
		this.value = (this.value + 1) & MAX_U32;
	}

	/**
	 * 计算两个帧数之间的差值（考虑回绕）
	 * 对应 Rust: u32::wrapping_sub
	 */
	wrappingSub(other: number): number {
		const MAX_U32 = 0xffffffff;
		return (this.value - other + MAX_U32 + 1) & MAX_U32;
	}

	/**
	 * 重置帧数
	 */
	reset(): void {
		this.value = 0;
	}

	/**
	 * 克隆当前帧数
	 */
	clone(): FrameCount {
		return new FrameCount(this.value);
	}

	toString(): string {
		return `FrameCount(${this.value})`;
	}
}

/**
 * 更新帧数的系统
 * 对应 Rust: update_frame_count
 * 应该在 Last 阶段运行
 */
export function updateFrameCount(frameCount: FrameCount): void {
	frameCount.increment();
}