/**
 * 日志诊断插件
 * 对应 Rust bevy_diagnostic 的 log_diagnostics_plugin.rs
 */

import { Plugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { World } from "@rbxts/matter";
import { PostUpdate } from "../../src/bevy_app/main-schedule";
import { Diagnostic, DiagnosticPath, DiagnosticsStore } from "./diagnostic";
import { padEnd, padStart, numberToFixed } from "../../src/utils/string-polyfills";

/**
 * 计时器类 - 用于定时触发
 */
class Timer {
	private elapsed: number = 0;
	private duration: number;
	private repeating: boolean;

	constructor(duration: number, repeating: boolean = true) {
		this.duration = duration;
		this.repeating = repeating;
	}

	/**
	 * 更新计时器
	 * @param deltaTime - 增量时间
	 * @returns 是否完成
	 */
	tick(deltaTime: number): { finished: boolean } {
		this.elapsed += deltaTime;
		if (this.elapsed >= this.duration) {
			if (this.repeating) {
				this.elapsed = this.elapsed % this.duration;
			}
			return { finished: true };
		}
		return { finished: false };
	}

	/**
	 * 设置持续时间
	 * @param duration - 新的持续时间
	 */
	setDuration(duration: number): void {
		this.duration = duration;
	}

	/**
	 * 设置已过时间
	 * @param elapsed - 已过时间
	 */
	setElapsed(elapsed: number): void {
		this.elapsed = elapsed;
	}
}

/**
 * 应用插件，将诊断记录到控制台
 * 对应 Rust LogDiagnosticsPlugin
 *
 * 诊断由插件收集，例如 FrameTimeDiagnosticsPlugin，
 * 或者可以由用户提供
 *
 * 当没有提供诊断时，此插件不执行任何操作
 */
export class LogDiagnosticsPlugin implements Plugin {
	/** 如果为 true，则记录每个诊断的调试表示。如果为 false，则记录（平滑的）当前值和历史平均值 */
	debug: boolean = false;
	/** 记录诊断之间等待的时间 */
	waitDuration: number = 1;
	/** 如果设置，则只记录这些诊断 */
	filter?: Set<string>;

	constructor(options?: { debug?: boolean; waitDuration?: number; filter?: Set<string> }) {
		if (options) {
			this.debug = options.debug ?? false;
			this.waitDuration = options.waitDuration ?? 1;
			this.filter = options.filter;
		}
	}

	/**
	 * 使用过滤器创建插件
	 * 对应 Rust filtered
	 * @param filter - 诊断路径集合
	 * @returns 插件实例
	 */
	static filtered(filter: Set<string>): LogDiagnosticsPlugin {
		return new LogDiagnosticsPlugin({ filter });
	}

	/**
	 * 配置应用
	 * @param app - 应用实例
	 */
	build(app: App): void {
		const state = new LogDiagnosticsState(this.waitDuration, this.filter);
		app.insertResource(LogDiagnosticsState, state);

		if (this.debug) {
			app.addSystems(PostUpdate, LogDiagnosticsPlugin.logDiagnosticsDebugSystem);
		} else {
			app.addSystems(PostUpdate, LogDiagnosticsPlugin.logDiagnosticsSystem);
		}
	}

	/**
	 * 插件名称
	 * @returns 插件名称字符串
	 */
	name(): string {
		return "LogDiagnosticsPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns true表示只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}

	/**
	 * 遍历每个诊断
	 * @param state - 日志状态
	 * @param diagnostics - 诊断存储
	 * @param callback - 回调函数
	 */
	private static forEachDiagnostic(
		state: LogDiagnosticsState,
		diagnostics: DiagnosticsStore,
		callback: (diagnostic: Diagnostic) => void,
	): void {
		if (state.filter) {
			for (const pathStr of state.filter) {
				const path = new DiagnosticPath(pathStr);
				const diagnostic = diagnostics.get(path);
				if (diagnostic && diagnostic.isEnabled) {
					callback(diagnostic);
				}
			}
		} else {
			for (const diagnostic of diagnostics.iter()) {
				if (diagnostic.isEnabled) {
					callback(diagnostic);
				}
			}
		}
	}

	/**
	 * 记录单个诊断
	 * @param pathWidth - 路径宽度
	 * @param diagnostic - 诊断实例
	 */
	private static logDiagnostic(pathWidth: number, diagnostic: Diagnostic): void {
		const value = diagnostic.smoothed();
		if (value === undefined) return;

		const path = diagnostic.getPath().asStr();
		const suffix = diagnostic.suffix;

		if (diagnostic.getMaxHistoryLength() > 1) {
			const average = diagnostic.average();
			if (average === undefined) return;

			print(
				`${padEnd(path, pathWidth, " ")}: ${padStart(numberToFixed(value, 6), 11, " ")}${padEnd(
					suffix,
					2,
					" ",
				)} (avg ${numberToFixed(average, 6)}${suffix})`,
			);
		} else {
			print(`${padEnd(path, pathWidth, " ")}: ${numberToFixed(value, 6)}${suffix}`);
		}
	}

	/**
	 * 记录所有诊断
	 * @param state - 日志状态
	 * @param diagnostics - 诊断存储
	 */
	private static logDiagnostics(state: LogDiagnosticsState, diagnostics: DiagnosticsStore): void {
		let pathWidth = 0;
		LogDiagnosticsPlugin.forEachDiagnostic(state, diagnostics, (diagnostic) => {
			const width = diagnostic.getPath().asStr().size();
			pathWidth = math.max(pathWidth, width);
		});

		LogDiagnosticsPlugin.forEachDiagnostic(state, diagnostics, (diagnostic) => {
			LogDiagnosticsPlugin.logDiagnostic(pathWidth, diagnostic);
		});
	}

	/**
	 * 日志诊断系统
	 * 对应 Rust log_diagnostics_system
	 * @param world - ECS世界
	 * @param deltaTime - 增量时间
	 */
	static logDiagnosticsSystem(world: World, deltaTime: number): void {
		const [state] = world.get(LogDiagnosticsState);
		const [diagnostics] = world.get(DiagnosticsStore);

		if (!state || !diagnostics) return;

		if (state.timer.tick(deltaTime).finished) {
			LogDiagnosticsPlugin.logDiagnostics(state, diagnostics);
		}
	}

	/**
	 * 调试日志诊断系统
	 * 对应 Rust log_diagnostics_debug_system
	 * @param world - ECS世界
	 * @param deltaTime - 增量时间
	 */
	static logDiagnosticsDebugSystem(
		world: World,
		context: {
			deltaTime: number;
		},
	): void {
		const [state] = world.get(LogDiagnosticsState);
		const [diagnostics] = world.get(DiagnosticsStore);

		if (!state || !diagnostics) return;

		if (state.timer.tick(context.deltaTime).finished) {
			LogDiagnosticsPlugin.forEachDiagnostic(state, diagnostics, (diagnostic) => {
				print(`[DEBUG] ${diagnostic}`);
			});
		}
	}
}

/**
 * LogDiagnosticsPlugin 使用的状态
 * 对应 Rust LogDiagnosticsState (Resource)
 */
export class LogDiagnosticsState {
	timer: Timer;
	filter?: Set<string>;

	constructor(duration: number, filter?: Set<string>) {
		this.timer = new Timer(duration, true);
		this.filter = filter;
	}

	/**
	 * 设置日志计时器的新持续时间
	 * 对应 Rust set_timer_duration
	 * @param duration - 新的持续时间（秒）
	 */
	setTimerDuration(duration: number): void {
		this.timer.setDuration(duration);
		this.timer.setElapsed(0);
	}

	/**
	 * 向日志状态添加过滤器
	 * 对应 Rust add_filter
	 * @param diagnosticPath - 诊断路径
	 * @returns 如果路径不存在则返回 true
	 */
	addFilter(diagnosticPath: DiagnosticPath): boolean {
		const pathStr = diagnosticPath.toString();
		if (this.filter) {
			if (this.filter.has(pathStr)) {
				return false;
			}
			this.filter.add(pathStr);
			return true;
		} else {
			this.filter = new Set([pathStr]);
			return true;
		}
	}

	/**
	 * 使用多个诊断路径扩展日志状态的过滤器
	 * 对应 Rust extend_filter
	 * @param paths - 诊断路径数组
	 */
	extendFilter(paths: DiagnosticPath[]): void {
		if (this.filter) {
			for (const path of paths) {
				this.filter.add(path.toString());
			}
		} else {
			this.filter = new Set(paths.map((p) => p.toString()));
		}
	}

	/**
	 * 从日志状态中删除过滤器
	 * 对应 Rust remove_filter
	 * @param diagnosticPath - 诊断路径
	 * @returns 如果存在则返回 true
	 */
	removeFilter(diagnosticPath: DiagnosticPath): boolean {
		if (this.filter) {
			return this.filter.delete(diagnosticPath.toString());
		}
		return false;
	}

	/**
	 * 清除日志状态的过滤器
	 * 对应 Rust clear_filter
	 */
	clearFilter(): void {
		if (this.filter) {
			this.filter.clear();
		}
	}

	/**
	 * 启用带空过滤器的过滤
	 * 对应 Rust enable_filtering
	 */
	enableFiltering(): void {
		this.filter = new Set();
	}

	/**
	 * 禁用过滤
	 * 对应 Rust disable_filtering
	 */
	disableFiltering(): void {
		this.filter = undefined;
	}
}
