/**
 * bevy_time - High-precision time system for roblox-ts
 * Ported from Rust Bevy engine's time module
 */

// Core time components
export { FixedTime, RealTime, Time, VirtualTime } from "./time";

// Timer and stopwatch
export { Timer, TimerMode } from "./timer";
export { Stopwatch } from "./stopwatch";

// Time systems
export {
	fixedTimeSystem,
	getTimeResources,
	initTimeResources,
	runFixedUpdate,
	timeSystem,
	type TimeResources,
	updateFixedTimeSystem,
	updateTimeSystem,
} from "./time-system";

// Utility functions
export {
	clamp,
	durationToSeconds,
	formatTime,
	formatTimeWithMillis,
	FrameRateCounter,
	hasElapsed,
	lerp,
	PerformanceTimer,
	secondsToDuration,
	smoothstep,
} from "./utils";

// Prelude - commonly used exports
export const prelude = {
	Time: undefined! as typeof import("./time").Time,
	Timer: undefined! as typeof import("./timer").Timer,
	TimerMode: undefined! as typeof import("./timer").TimerMode,
	FixedTime: undefined! as typeof import("./time").FixedTime,
	RealTime: undefined! as typeof import("./time").RealTime,
	VirtualTime: undefined! as typeof import("./time").VirtualTime,
};

// Populate prelude
import { FixedTime as _FixedTime, RealTime as _RealTime, Time as _Time, VirtualTime as _VirtualTime } from "./time";
import { Timer as _Timer, TimerMode as _TimerMode } from "./timer";

(prelude as any).Time = _Time;
(prelude as any).Timer = _Timer;
(prelude as any).TimerMode = _TimerMode;
(prelude as any).FixedTime = _FixedTime;
(prelude as any).RealTime = _RealTime;
(prelude as any).VirtualTime = _VirtualTime;
