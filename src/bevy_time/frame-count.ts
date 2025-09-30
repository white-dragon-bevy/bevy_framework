/**
 * FrameCount - 帧计数资源
 * 对应 Rust bevy_diagnostic/src/frame_count_diagnostics_plugin.rs
 *
 * 跟踪自应用启动以来渲染的帧数
 * 在 Last 阶段增加，提供可预测的行为
 */

import { Resource } from "../bevy_ecs/resource";

/**
 * 帧计数资源包装器
 * 存储应用的帧计数器，在 Last 调度阶段自动递增
 * 对应 Rust FrameCount 资源
 */
export class FrameCountResource implements Resource {
	readonly __brand = "Resource" as const;
	/**
	 * 构造函数
	 * @param value - FrameCount 实例
	 */
	constructor(public value: FrameCount) {}
}

/**
 * 帧计数资源
 * 在应用的 Last 阶段自动递增
 * 第一次更新时为 0，第二次为 1，以此类推
 * 当超过 2^32-1 后会回绕到 0，模拟 Rust u32 行为
 * 对应 Rust FrameCount 结构体
 */
export class FrameCount {
	/** 当前帧数 */
	private value: number;

	/**
	 * 构造函数
	 * @param initialValue - 初始帧数，默认为 0
	 */
	constructor(initialValue = 0) {
		this.value = initialValue;
	}

	/**
	 * 获取当前帧数
	 * @returns 当前帧数
	 */
	getValue(): number {
		return this.value;
	}

	/**
	 * 增加帧数（带回绕）
	 * 对应 Rust frame_count.0.wrapping_add(1)
	 * 使用位运算模拟 u32 溢出行为
	 */
	increment(): void {
		// JavaScript 的 Number 可以安全表示到 2^53-1
		// 但为了与 Rust 行为一致，我们模拟 u32 的回绕
		const MAX_U32 = 0xffffffff;
		this.value = (this.value + 1) & MAX_U32;
	}

	/**
	 * 计算两个帧数之间的差值（考虑回绕）
	 * 对应 Rust u32::wrapping_sub
	 * 正确处理回绕情况，例如 (3).wrappingSub(MAX_U32) = 4
	 * @param other - 要减去的帧数
	 * @returns 差值（考虑回绕）
	 */
	wrappingSub(other: number): number {
		const MAX_U32 = 0xffffffff;
		return (this.value - other + MAX_U32 + 1) & MAX_U32;
	}

	/**
	 * 重置帧数
	 * 将帧数设置回初始值 0
	 */
	reset(): void {
		this.value = 0;
	}

	/**
	 * 克隆当前帧数
	 * 创建一个具有相同值的新实例
	 * @returns 新的 FrameCount 实例
	 */
	clone(): FrameCount {
		return new FrameCount(this.value);
	}

	/**
	 * 转换为字符串
	 * 用于调试和日志输出
	 * @returns 格式化的字符串
	 */
	toString(): string {
		return `FrameCount(${this.value})`;
	}
}

/**
 * 更新帧数的系统
 * 对应 Rust update_frame_count
 * 应该在 Last 调度阶段运行，确保每帧只递增一次
 * @param frameCount - 要更新的帧计数实例
 */
export function updateFrameCount(frameCount: FrameCount): void {
	frameCount.increment();
}
