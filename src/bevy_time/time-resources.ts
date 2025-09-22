/**
 * 时间资源包装器
 * 用于在资源管理系统中正确存储和获取时间资源
 */

import { Resource } from "../bevy_ecs/resource";
import { Time, Real, Virtual, Fixed, Empty } from "./time";
import { TimeFixed } from "./fixed";
import { TimeUpdateStrategy } from "./time-plugin";

/**
 * Real 时间资源包装器
 */
export class RealTimeResource implements Resource {
	readonly __brand = "Resource" as const;
	constructor(public value: Time<Real>) {}
}

/**
 * Virtual 时间资源包装器
 */
export class VirtualTimeResource implements Resource {
	readonly __brand = "Resource" as const;
	constructor(public value: Time<Virtual>) {}
}

/**
 * Fixed 时间资源包装器
 */
export class FixedTimeResource implements Resource {
	readonly __brand = "Resource" as const;
	constructor(public value: TimeFixed) {}
}

/**
 * 通用时间资源包装器
 */
export class GenericTimeResource implements Resource {
	readonly __brand = "Resource" as const;
	constructor(public value: Time<Empty>) {}
}

/**
 * 时间更新策略资源包装器
 */
export class TimeUpdateStrategyResource implements Resource, TimeUpdateStrategy {
	readonly __brand = "Resource" as const;
	lastUpdate: number | undefined;

	constructor(lastUpdate?: number) {
		this.lastUpdate = lastUpdate;
	}
}