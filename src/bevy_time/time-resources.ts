/**
 * 时间资源包装器
 * 用于在资源管理系统中正确存储和获取时间资源
 * 对应 Rust bevy_time 的资源系统
 */

import { Resource } from "../bevy_ecs/resource";
import { Time, Real, Virtual, Fixed, Empty } from "./time";
import { TimeFixed } from "./fixed";
import { TimeUpdateStrategy } from "./time-plugin";

/**
 * Real 时间资源包装器
 * 存储实际物理时间，不受游戏暂停或时间缩放影响
 * 对应 Rust Time<Real> 资源
 */
export class RealTimeResource implements Resource {
	readonly __brand = "Resource" as const;
	/**
	 * 构造函数
	 * @param value - Real 时间实例
	 */
	constructor(public value: Time<Real>) {}
}

/**
 * Virtual 时间资源包装器
 * 存储游戏逻辑时间，支持暂停、时间缩放和最大增量限制
 * 对应 Rust Time<Virtual> 资源
 */
export class VirtualTimeResource implements Resource {
	readonly __brand = "Resource" as const;
	/**
	 * 构造函数
	 * @param value - Virtual 时间实例
	 */
	constructor(public value: Time<Virtual>) {}
}

/**
 * Fixed 时间资源包装器
 * 存储固定时间步长，用于物理模拟等需要固定更新频率的系统
 * 对应 Rust Time<Fixed> 资源
 */
export class FixedTimeResource implements Resource {
	readonly __brand = "Resource" as const;
	/**
	 * 构造函数
	 * @param value - Fixed 时间实例
	 */
	constructor(public value: TimeFixed) {}
}

/**
 * 通用时间资源包装器
 * 存储当前活跃的时间上下文，默认为 Virtual 时间
 * 在固定更新阶段会临时切换为 Fixed 时间
 * 对应 Rust Time<()> 或 Time 资源
 */
export class GenericTimeResource implements Resource {
	readonly __brand = "Resource" as const;
	/**
	 * 构造函数
	 * @param value - 通用时间实例
	 */
	constructor(public value: Time<Empty>) {}
}

/**
 * 时间更新策略资源包装器
 * 管理时间系统的更新策略，包括上次更新时间戳和测试用的模拟增量
 * 对应 Rust 时间系统的内部状态
 */
export class TimeUpdateStrategyResource implements Resource, TimeUpdateStrategy {
	readonly __brand = "Resource" as const;
	lastUpdate: number | undefined;
	/** 用于测试的模拟时间增量 */
	mockDelta?: number;

	/**
	 * 构造函数
	 * @param lastUpdate - 上次更新的时间戳
	 * @param mockDelta - 用于测试的模拟时间增量
	 */
	constructor(lastUpdate?: number, mockDelta?: number) {
		this.lastUpdate = lastUpdate;
		this.mockDelta = mockDelta;
	}
}
