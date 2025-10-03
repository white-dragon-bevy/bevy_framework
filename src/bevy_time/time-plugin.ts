/**
 * TimePlugin - 时间管理插件
 * 严格对应 Rust bevy_time/src/lib.rs:56-100
 */

import { BasePlugin } from "../bevy_app/plugin";
import { App, ExtensionFactory } from "../bevy_app/app";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
import { World } from "@rbxts/matter";
import { Duration } from "./duration";
import { Time, Real, Virtual, Fixed, Empty } from "./time";
import { TimeFixed } from "./fixed";
import {
	RealTimeResource,
	VirtualTimeResource,
	FixedTimeResource,
	GenericTimeResource,
	TimeUpdateStrategyResource,
} from "./time-resources";
import { FrameCount, FrameCountResource, updateFrameCount } from "./frame-count";
import { Context } from "../bevy_ecs";



/**
 * 时间更新策略接口
 * 对应 Rust TimeUpdateStrategy
 */
export interface TimeUpdateStrategy {
	lastUpdate: number | undefined;
	/** 用于测试的模拟时间增量 */
	mockDelta?: number;
}

/**
 * 时间统计管理器
 * 管理帧率和帧时间统计
 */
class TimeStatsManager {
	private frameTimesMs: Array<number> = [];
	private maxSamples = 60;
	private minFrameTime = math.huge;
	private maxFrameTime = 0;

	/**
	 * 添加一帧的时间
	 * @param deltaMs - 帧时间（毫秒）
	 */
	addFrameTime(deltaMs: number): void {
		this.frameTimesMs.push(deltaMs);
		if (this.frameTimesMs.size() > this.maxSamples) {
			this.frameTimesMs.remove(0);
		}
		this.minFrameTime = math.min(this.minFrameTime, deltaMs);
		this.maxFrameTime = math.max(this.maxFrameTime, deltaMs);
	}

	/**
	 * 获取平均 FPS
	 * @returns 平均帧率
	 */
	getAverageFPS(): number {
		if (this.frameTimesMs.isEmpty()) return 0;
		const avgMs = this.frameTimesMs.reduce((sum, time) => sum + time, 0) / this.frameTimesMs.size();
		return avgMs > 0 ? 1000 / avgMs : 0;
	}

	/**
	 * 获取瞬时 FPS
	 * @returns 当前帧率
	 */
	getInstantFPS(): number {
		const last = this.frameTimesMs[this.frameTimesMs.size() - 1];
		return last !== undefined && last > 0 ? 1000 / last : 0;
	}

	/**
	 * 获取最小帧时间
	 * @returns 最小帧时间（毫秒）
	 */
	getMinFrameTime(): number {
		return this.minFrameTime === math.huge ? 0 : this.minFrameTime;
	}

	/**
	 * 获取最大帧时间
	 * @returns 最大帧时间（毫秒）
	 */
	getMaxFrameTime(): number {
		return this.maxFrameTime;
	}

	/**
	 * 获取平均帧时间
	 * @returns 平均帧时间（毫秒）
	 */
	getAverageFrameTime(): number {
		if (this.frameTimesMs.isEmpty()) return 0;
		return this.frameTimesMs.reduce((sum, time) => sum + time, 0) / this.frameTimesMs.size();
	}

	/**
	 * 重置统计数据
	 */
	reset(): void {
		this.frameTimesMs.clear();
		this.minFrameTime = math.huge;
		this.maxFrameTime = 0;
	}
}

/**
 * 时间扩展工厂接口
 * 提供时间插件的所有扩展方法工厂
 */
export interface TimePluginExtensionFactories {
	getCurrent: ExtensionFactory<() => Time<Empty>>;
	getTime: ExtensionFactory<() => Time<Empty>>;
	getElapsedSeconds: ExtensionFactory<() => number>;
	getDeltaSeconds: ExtensionFactory<() => number>;
	getElapsedMillis: ExtensionFactory<() => number>;
	getDeltaMillis: ExtensionFactory<() => number>;
	pause: ExtensionFactory<() => void>;
	resume: ExtensionFactory<() => void>;
	isPaused: ExtensionFactory<() => boolean>;
	setTimeScale: ExtensionFactory<(scale: number) => void>;
	getTimeScale: ExtensionFactory<() => number>;
	advanceTime: ExtensionFactory<(seconds: number) => void>;
	reset: ExtensionFactory<() => void>;
	getAverageFPS: ExtensionFactory<() => number>;
	getInstantFPS: ExtensionFactory<() => number>;
	getMinFrameTime: ExtensionFactory<() => number>;
	getMaxFrameTime: ExtensionFactory<() => number>;
	getAverageFrameTime: ExtensionFactory<() => number>;
	resetStats: ExtensionFactory<() => void>;
	getFrameCount: ExtensionFactory<() => number>;
}

/**
 * TimePlugin - 为应用添加时间功能
 * 对应 Rust bevy_time::TimePlugin (lib.rs:56-100)
 */
export class TimePlugin extends BasePlugin {
	/** 插件扩展工厂 */
	extension: TimePluginExtensionFactories;

	constructor() {
		super();
		// 扩展工厂将在 build() 中初始化
		this.extension = {} as TimePluginExtensionFactories;
	}

	/**
	 * 插件名称
	 * @returns 插件的唯一标识名称
	 */
	name(): string {
		return "TimePlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns 总是返回 true，表示同一应用中只能有一个 TimePlugin 实例
	 */
	isUnique(): boolean {
		return true;
	}

	/**
	 * 构建插件
	 * 对应 Rust TimePlugin::build (lib.rs:68-94)
	 * @param app - 应用程序实例
	 */
	build(app: App): void {
		// 初始化时间资源
		// 对应 lib.rs:70-74
		const realTime = new Time<Real>({ __brand: "Real" } as Real);
		const virtualTime = new Time<Virtual>({
			__brand: "Virtual",
			paused: false,
			relativeSpeed: 1.0,
			effectiveSpeed: 1.0,
			maxDelta: Duration.fromSecs(0.25),
		} as Virtual);
		const fixedTime = new TimeFixed();
		const genericTime = new Time<Empty>({});

		const tt=new RealTimeResource(realTime)
		app.insertResource(tt);
		app.insertResource(new VirtualTimeResource(virtualTime));
		app.insertResource(new FixedTimeResource(fixedTime));
		app.insertResource(new GenericTimeResource(genericTime));

		// 初始化时间更新策略
		app.insertResource(new TimeUpdateStrategyResource());

		// 初始化帧计数器
		app.insertResource(new FrameCountResource(new FrameCount()));

		// 创建时间统计管理器
		const statsManager = new TimeStatsManager();

		// 添加时间更新系统到 First 调度
		// 对应 lib.rs:84-89
		app.addSystems(BuiltinSchedules.FIRST, (world: World, context: Context) => {
			timeSystem(world, context, app, statsManager);
		});

		// 初始化扩展工厂
		this.extension = {
			getCurrent: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<GenericTimeResource>();
					return resource ? resource.value : genericTime;
				};
			},
			getTime: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<GenericTimeResource>();
					return resource ? resource.value : genericTime;
				};
			},
			getElapsedSeconds: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<GenericTimeResource>();
					return resource ? resource.value.getElapsedSecs() : 0;
				};
			},
			getDeltaSeconds: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<GenericTimeResource>();
					return resource ? resource.value.getDeltaSecs() : 0;
				};
			},
			getElapsedMillis: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<GenericTimeResource>();
					return resource ? resource.value.getElapsedSecs() * 1000 : 0;
				};
			},
			getDeltaMillis: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<GenericTimeResource>();
					return resource ? resource.value.getDeltaSecs() * 1000 : 0;
				};
			},
			pause: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<VirtualTimeResource>();
					if (resource) {
						const vTime = resource.value;
						const timeContext = vTime.getContext() as Virtual;
						vTime.setContext({
							...timeContext,
							paused: true,
							effectiveSpeed: 0,
						});
					}
				};
			},
			resume: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<VirtualTimeResource>();
					if (resource) {
						const vTime = resource.value;
						const timeContext = vTime.getContext() as Virtual;
						vTime.setContext({
							...timeContext,
							paused: false,
							effectiveSpeed: timeContext.relativeSpeed,
						});
					}
				};
			},
			isPaused: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<VirtualTimeResource>();
					return resource ? (resource.value.getContext() as Virtual).paused : false;
				};
			},
			setTimeScale: (world: World, context: Context, plugin: TimePlugin) => {
				return (scale: number) => {
					const resource = app.getResource<VirtualTimeResource>();
					if (resource) {
						const vTime = resource.value;
						const timeContext = vTime.getContext() as Virtual;
						vTime.setContext({
							...timeContext,
							relativeSpeed: scale,
							effectiveSpeed: timeContext.paused ? 0 : scale,
						});
					}
				};
			},
			getTimeScale: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<VirtualTimeResource>();
					return resource ? (resource.value.getContext() as Virtual).relativeSpeed : 1.0;
				};
			},
			advanceTime: (world: World, context: Context, plugin: TimePlugin) => {
				return (seconds: number) => {
					const strategyResource = app.getResource<TimeUpdateStrategyResource>();
					if (strategyResource) {
						strategyResource.mockDelta = seconds;
					}
				};
			},
			reset: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const realResource = app.getResource<RealTimeResource>();
					const virtualResource = app.getResource<VirtualTimeResource>();
					const fixedResource = app.getResource<FixedTimeResource>();

					if (realResource) {
						realResource.value = new Time<Real>({ __brand: "Real" } as Real);
					}
					if (virtualResource) {
						virtualResource.value = new Time<Virtual>({
							__brand: "Virtual",
							paused: false,
							relativeSpeed: 1.0,
							effectiveSpeed: 1.0,
							maxDelta: Duration.fromSecs(0.25),
						} as Virtual);
					}
					if (fixedResource) {
						fixedResource.value = new TimeFixed();
					}

					statsManager.reset();
				};
			},
			getAverageFPS: (world: World, context: Context, plugin: TimePlugin) => {
				return () => statsManager.getAverageFPS();
			},
			getInstantFPS: (world: World, context: Context, plugin: TimePlugin) => {
				return () => statsManager.getInstantFPS();
			},
			getMinFrameTime: (world: World, context: Context, plugin: TimePlugin) => {
				return () => statsManager.getMinFrameTime();
			},
			getMaxFrameTime: (world: World, context: Context, plugin: TimePlugin) => {
				return () => statsManager.getMaxFrameTime();
			},
			getAverageFrameTime: (world: World, context: Context, plugin: TimePlugin) => {
				return () => statsManager.getAverageFrameTime();
			},
			resetStats: (world: World, context: Context, plugin: TimePlugin) => {
				return () => statsManager.reset();
			},
			getFrameCount: (world: World, context: Context, plugin: TimePlugin) => {
				return () => {
					const resource = app.getResource<FrameCountResource>();
					return resource ? resource.value.getValue() : 0;
				};
			},
		};

		// 添加固定主调度运行系统到 RunFixedMainLoop
		// 对应 lib.rs:90-93
		app.addSystems(BuiltinSchedules.RUN_FIXED_MAIN_LOOP, (world: World, context: Context) => {
			runFixedMainLoop(world, context, app);
		});

		// 添加帧计数器更新系统到 Last 调度
		app.addSystems(BuiltinSchedules.LAST, (world: World, context: Context) => {
			const frameCountResource = app.getResource<FrameCountResource>();
			if (frameCountResource) {
				updateFrameCount(frameCountResource.value);
			}
		});

		// TODO: 消息系统配置（lib.rs:95-99）
		// 在 Roblox 中可能需要不同的实现方式
	}

	/**
	 * 插件是否准备就绪
	 * @param app - 应用程序实例
	 * @returns 总是返回 true
	 */
	ready(app: App): boolean {
		return true;
	}

	/**
	 * 完成插件设置
	 * @param app - 应用程序实例
	 */
	finish(app: App): void {
		// 不需要额外的完成步骤
	}

	/**
	 * 清理插件资源
	 * @param app - 应用程序实例
	 */
	cleanup(app: App): void {
		// 清理时间资源
	}
}

/**
 * 时间系统 - 更新所有时间资源
 * 对应 Rust time_system
 * @param world - Matter World 实例
 * @param context - ECS 上下文
 * @param app - 应用程序实例
 * @param statsManager - 统计管理器
 */
function timeSystem(world: World, context: Context, app: App, statsManager: TimeStatsManager): void {
	// 获取时间更新策略
	const strategyResource = app.getResource<TimeUpdateStrategyResource>();
	if (!strategyResource) return;
	const strategy = strategyResource as TimeUpdateStrategyResource;

	let delta: Duration;

	// 如果有模拟时间增量（用于测试），使用它
	if (strategy.mockDelta !== undefined) {
		delta = Duration.fromSecs(strategy.mockDelta);
		// 清除模拟增量，避免重复使用
		strategy.mockDelta = undefined;
	} else {
		// 计算实际的时间增量
		const now = os.clock();

		if (strategy.lastUpdate !== undefined) {
			const deltaSecs = now - strategy.lastUpdate;
			// 确保 deltaSecs 是正数并且合理
			if (deltaSecs < 0) {
				// 时间可能会回绕，使用 0 增量
				delta = Duration.ZERO;
			} else if (deltaSecs > 1.0) {
				// 限制最大增量为 1 秒，防止时间跳跃
				delta = Duration.fromSecs(1.0);
			} else {
				delta = Duration.fromSecs(deltaSecs);
			}
		} else {
			// 第一帧使用 0 增量
			delta = Duration.ZERO;
		}

		strategy.lastUpdate = now;
	}

	// 更新统计
	statsManager.addFrameTime(delta.asSecsF64() * 1000);

	// 更新 Real 时间
	const realTimeResource = app.getResource<RealTimeResource>();
	if (realTimeResource) {
		const realTime = realTimeResource.value;
		realTime.advanceBy(delta);
		app.insertResource(new RealTimeResource(realTime));
	}

	// 更新 Virtual 时间（基于 Real 时间）
	const virtualTimeResource = app.getResource<VirtualTimeResource>();
	if (virtualTimeResource && realTimeResource) {
		const virtualTime = virtualTimeResource.value;
		const realTime = realTimeResource.value;
		const virtualContext = virtualTime.getContext() as Virtual;
		// 如果没有暂停，使用 real 时间的增量
		if (!virtualContext.paused) {
			const virtualDelta = Duration.fromSecs(
				delta.asSecsF64() * virtualContext.relativeSpeed,
			);

			// 应用最大增量限制
			const maxDelta = virtualContext.maxDelta;
			const clampedDelta = virtualDelta.lessThan(maxDelta) ? virtualDelta : maxDelta;

			virtualTime.advanceBy(clampedDelta);
		} else {
			// 暂停时使用零增量
			virtualTime.advanceBy(Duration.ZERO);
		}
		app.insertResource(new VirtualTimeResource(virtualTime));

		// 更新通用 Time（默认使用 Virtual）
		app.insertResource(new GenericTimeResource(virtualTime.asGeneric()));
	}
}

/**
 * 手动推进时间（用于测试）
 * 设置模拟时间增量，下一帧将使用此增量而非真实时间
 * @param app - 应用程序实例
 * @param seconds - 要推进的秒数
 */
export function advanceTime(app: App, seconds: number): void {
	const strategyResource = app.getResource<TimeUpdateStrategyResource>();
	if (strategyResource) {
		strategyResource.mockDelta = seconds;
	}
}

/**
 * 运行固定主循环系统
 * 对应 Rust run_fixed_main_schedule (fixed.rs:239-252)
 * 这个系统在 RunFixedMainLoop 调度中运行
 * @param world - Matter World 实例
 * @param context - ECS 上下文
 * @param app - 应用程序实例
 */
function runFixedMainLoop(world: World, context: Context, app: App): void {
	// 获取虚拟时间和固定时间
	const virtualTimeResource = app.getResource<VirtualTimeResource>();
	const fixedTimeResource = app.getResource<FixedTimeResource>();

	if (!virtualTimeResource || !fixedTimeResource) {
		return;
	}

	const virtualTime = virtualTimeResource.value;
	const fixedTime = fixedTimeResource.value;

	// 累积虚拟时间的增量
	const delta = virtualTime.getDelta();
	fixedTime.accumulate(delta);

	// 运行固定调度直到消耗完累积的时间
	// 对应 fixed.rs:244-249
	let iterations = 0;
	const maxIterations = 10; // 防止死循环

	while (fixedTime.expend() && iterations < maxIterations) {
		// 设置通用时间为固定时间
		app.insertResource( new GenericTimeResource(fixedTime.asGeneric()));

		// 运行 FixedMain 调度（包含所有固定调度）
		app.runSchedule(BuiltinSchedules.FIXED_MAIN);

		iterations++;
	}

	// 恢复通用时间为虚拟时间
	app.insertResource( new GenericTimeResource(virtualTime.asGeneric()));

	// 保存更新后的固定时间
	app.insertResource( new FixedTimeResource(fixedTime));
}
