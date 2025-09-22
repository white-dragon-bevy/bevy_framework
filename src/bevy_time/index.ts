/**
 * bevy_time 模块导出
 * 对应 Rust bevy_time crate
 */

// 核心类型导出
export { Duration, durationRem } from "./duration";
export { Time, type TimeContext, type Real, type Virtual, type Fixed, type Empty } from "./time";
export { TimeFixed, runFixedMainSchedule } from "./fixed";
export { TimePlugin, type TimeUpdateStrategy, advanceTime } from "./time-plugin";
export {
	RealTimeResource,
	VirtualTimeResource,
	FixedTimeResource,
	GenericTimeResource,
	TimeUpdateStrategyResource,
} from "./time-resources";
export { FrameCount, updateFrameCount } from "./frame-count";

// 类型别名
export type { GenericTime, RealTime, VirtualTime, FixedTime } from "./time";