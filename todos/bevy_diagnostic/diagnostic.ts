/**
 * 核心诊断系统实现
 * 对应 Rust bevy_diagnostic 的 diagnostic.rs
 */

import { World } from "@rbxts/matter";

/**
 * 默认最大历史长度
 * 对应 Rust DEFAULT_MAX_HISTORY_LENGTH
 */
export const DEFAULT_MAX_HISTORY_LENGTH = 120;

/**
 * 诊断路径 - 唯一诊断标识符，使用 `/` 分隔
 * 对应 Rust DiagnosticPath
 *
 * 要求:
 * - 不能为空
 * - 不能以 `/` 开头或结尾
 * - 不能包含空组件
 */
export class DiagnosticPath {
	private readonly path: string;
	private readonly hash: string;

	constructor(path: string) {
		assert(path !== "", "diagnostic path should not be empty");
		assert(!(path.sub(1, 1) === "/"), "diagnostic path should not start with `/`");
		assert(!(path.sub(-1) === "/"), "diagnostic path should not end with `/`");
		assert(!path.find("//")[0], "diagnostic path should not contain empty components");

		this.path = path;
		this.hash = path;
	}

	/**
	 * 创建新的诊断路径（用于常量上下文）
	 * 对应 Rust const_new
	 * @param path - 诊断路径字符串
	 * @returns 诊断路径实例
	 */
	static constNew(path: string): DiagnosticPath {
		return new DiagnosticPath(path);
	}

	/**
	 * 从组件迭代器创建诊断路径
	 * 对应 Rust from_components
	 * @param components - 路径组件数组
	 * @returns 诊断路径实例
	 */
	static fromComponents(components: readonly string[]): DiagnosticPath {
		return new DiagnosticPath(components.join("/"));
	}

	/**
	 * 返回完整路径字符串
	 * 对应 Rust as_str
	 * @returns 路径字符串
	 */
	asStr(): string {
		return this.path;
	}

	/**
	 * 返回路径组件迭代器
	 * 对应 Rust components
	 * @returns 组件数组
	 */
	components(): string[] {
		return this.path.split("/");
	}

	/**
	 * 用于 Map 的键
	 * @returns 哈希值
	 */
	toString(): string {
		return this.hash;
	}
}

/**
 * 单个诊断测量值
 * 对应 Rust DiagnosticMeasurement
 */
export interface DiagnosticMeasurement {
	/** 测量时间（秒） */
	time: number;
	/** 测量值 */
	value: number;
}

/**
 * 诊断时间线 - 特定类型的测量值集合
 * 对应 Rust Diagnostic
 */
export class Diagnostic {
	private path: DiagnosticPath;
	/** 日志记录时使用的后缀（例如显示单位） */
	suffix: string = "";
	private history: DiagnosticMeasurement[] = [];
	private sum: number = 0;
	private ema: number = 0;
	private emaSmoothingFactor: number = 2.0 / 21.0;
	private maxHistoryLength: number = DEFAULT_MAX_HISTORY_LENGTH;
	/** 诊断是否启用 */
	isEnabled: boolean = true;

	constructor(path: DiagnosticPath) {
		this.path = path;
	}

	/**
	 * 添加新的测量值
	 * 对应 Rust add_measurement
	 * @param measurement - 测量值
	 */
	addMeasurement(measurement: DiagnosticMeasurement): void {
		if (measurement.value === measurement.value) {
			const previous = this.measurement();
			if (previous) {
				const delta = measurement.time - previous.time;
				const alpha = math.clamp(delta / this.emaSmoothingFactor, 0, 1);
				this.ema += alpha * (measurement.value - this.ema);
			} else {
				this.ema = measurement.value;
			}
		}

		if (this.maxHistoryLength > 1) {
			if (this.history.size() >= this.maxHistoryLength) {
				const removed = this.history.shift();
				if (removed && removed.value !== math.huge && removed.value !== -math.huge && removed.value === removed.value) {
					this.sum -= removed.value;
				}
			}

			if (measurement.value !== math.huge && measurement.value !== -math.huge && measurement.value === measurement.value) {
				this.sum += measurement.value;
			}
		} else {
			this.history.clear();
			if (measurement.value !== measurement.value) {
				this.sum = 0;
			} else {
				this.sum = measurement.value;
			}
		}

		this.history.push(measurement);
	}

	/**
	 * 创建新的诊断
	 * 对应 Rust new
	 * @param path - 诊断路径
	 * @returns 诊断实例
	 */
	static new(path: DiagnosticPath): Diagnostic {
		return new Diagnostic(path);
	}

	/**
	 * 设置最大历史长度
	 * 对应 Rust with_max_history_length
	 * @param maxHistoryLength - 最大历史长度
	 * @returns 当前实例（链式调用）
	 */
	withMaxHistoryLength(maxHistoryLength: number): this {
		this.maxHistoryLength = maxHistoryLength;
		return this;
	}

	/**
	 * 添加日志输出时使用的后缀
	 * 对应 Rust with_suffix
	 * @param suffix - 后缀字符串
	 * @returns 当前实例（链式调用）
	 */
	withSuffix(suffix: string): this {
		this.suffix = suffix;
		return this;
	}

	/**
	 * 设置指数平滑因子
	 * 对应 Rust with_smoothing_factor
	 * @param smoothingFactor - 平滑因子
	 * @returns 当前实例（链式调用）
	 */
	withSmoothingFactor(smoothingFactor: number): this {
		this.emaSmoothingFactor = smoothingFactor;
		return this;
	}

	/**
	 * 获取诊断路径
	 * 对应 Rust path
	 * @returns 诊断路径
	 */
	getPath(): DiagnosticPath {
		return this.path;
	}

	/**
	 * 获取最新的测量值
	 * 对应 Rust measurement
	 * @returns 最新测量值或undefined
	 */
	measurement(): DiagnosticMeasurement | undefined {
		return this.history[this.history.size() - 1];
	}

	/**
	 * 获取最新的值
	 * 对应 Rust value
	 * @returns 最新值或undefined
	 */
	value(): number | undefined {
		const m = this.measurement();
		return m ? m.value : undefined;
	}

	/**
	 * 返回简单移动平均值
	 * 对应 Rust average
	 * @returns 平均值或undefined
	 */
	average(): number | undefined {
		if (this.history.size() > 0) {
			return this.sum / this.history.size();
		}
		return undefined;
	}

	/**
	 * 返回指数移动平均值
	 * 对应 Rust smoothed
	 * @returns 平滑值或undefined
	 */
	smoothed(): number | undefined {
		if (this.history.size() > 0) {
			return this.ema;
		}
		return undefined;
	}

	/**
	 * 返回历史记录长度
	 * 对应 Rust history_len
	 * @returns 历史记录长度
	 */
	historyLen(): number {
		return this.history.size();
	}

	/**
	 * 返回最旧和最新值之间的持续时间
	 * 对应 Rust duration
	 * @returns 持续时间（秒）或undefined
	 */
	duration(): number | undefined {
		if (this.history.size() < 2) {
			return undefined;
		}

		const newest = this.history[this.history.size() - 1];
		const oldest = this.history[0];
		if (!newest || !oldest) {
			return undefined;
		}
		return newest.time - oldest.time;
	}

	/**
	 * 返回最大历史长度
	 * 对应 Rust get_max_history_length
	 * @returns 最大历史长度
	 */
	getMaxHistoryLength(): number {
		return this.maxHistoryLength;
	}

	/**
	 * 所有测量值
	 * 对应 Rust values
	 * @returns 值数组
	 */
	values(): number[] {
		return this.history.map(m => m.value);
	}

	/**
	 * 所有测量记录
	 * 对应 Rust measurements
	 * @returns 测量记录数组
	 */
	measurements(): DiagnosticMeasurement[] {
		return this.history;
	}

	/**
	 * 清空历史记录
	 * 对应 Rust clear_history
	 */
	clearHistory(): void {
		this.history.clear();
		this.sum = 0;
		this.ema = 0;
	}
}

/**
 * 诊断集合
 * 对应 Rust DiagnosticsStore (Resource)
 */
export class DiagnosticsStore {
	private diagnostics = new Map<string, Diagnostic>();

	/**
	 * 添加新诊断
	 * 对应 Rust add
	 * @param diagnostic - 诊断实例
	 */
	add(diagnostic: Diagnostic): void {
		this.diagnostics.set(diagnostic.getPath().toString(), diagnostic);
	}

	/**
	 * 获取诊断
	 * 对应 Rust get
	 * @param path - 诊断路径
	 * @returns 诊断实例或undefined
	 */
	get(path: DiagnosticPath): Diagnostic | undefined {
		return this.diagnostics.get(path.toString());
	}

	/**
	 * 可变获取诊断
	 * 对应 Rust get_mut
	 * @param path - 诊断路径
	 * @returns 诊断实例或undefined
	 */
	getMut(path: DiagnosticPath): Diagnostic | undefined {
		return this.diagnostics.get(path.toString());
	}

	/**
	 * 获取已启用诊断的最新测量值
	 * 对应 Rust get_measurement
	 * @param path - 诊断路径
	 * @returns 测量值或undefined
	 */
	getMeasurement(path: DiagnosticPath): DiagnosticMeasurement | undefined {
		const diagnostic = this.get(path);
		if (diagnostic && diagnostic.isEnabled) {
			return diagnostic.measurement();
		}
		return undefined;
	}

	/**
	 * 返回所有诊断的迭代器
	 * 对应 Rust iter
	 * @returns 诊断数组
	 */
	iter(): Diagnostic[] {
		const result: Diagnostic[] = [];
		for (const [_, diagnostic] of this.diagnostics) {
			result.push(diagnostic);
		}
		return result;
	}

	/**
	 * 返回所有诊断的可变迭代器
	 * 对应 Rust iter_mut
	 * @returns 诊断数组
	 */
	iterMut(): Diagnostic[] {
		const result: Diagnostic[] = [];
		for (const [_, diagnostic] of this.diagnostics) {
			result.push(diagnostic);
		}
		return result;
	}
}

/**
 * 诊断系统参数 - 用于记录新的测量值
 * 对应 Rust Diagnostics (SystemParam)
 */
export class Diagnostics {
	private pendingMeasurements = new Map<string, DiagnosticMeasurement>();

	constructor(private store: DiagnosticsStore) {}

	/**
	 * 添加测量值到已启用的诊断
	 * 对应 Rust add_measurement
	 * @param path - 诊断路径
	 * @param valueFn - 值计算函数（仅在诊断启用时调用）
	 */
	addMeasurement(path: DiagnosticPath, valueFn: () => number): void {
		const diagnostic = this.store.get(path);
		if (diagnostic && diagnostic.isEnabled) {
			const measurement: DiagnosticMeasurement = {
				time: os.clock(),
				value: valueFn(),
			};
			this.pendingMeasurements.set(path.toString(), measurement);
		}
	}

	/**
	 * 应用所有挂起的测量值
	 */
	apply(): void {
		for (const [pathStr, measurement] of this.pendingMeasurements) {
			const path = new DiagnosticPath(pathStr);
			const diagnostic = this.store.getMut(path);
			if (diagnostic) {
				diagnostic.addMeasurement(measurement);
			}
		}
		this.pendingMeasurements.clear();
	}
}

/**
 * App 扩展 - 注册诊断
 * 对应 Rust RegisterDiagnostic trait
 */
export interface RegisterDiagnostic {
	/**
	 * 注册新诊断
	 * 对应 Rust register_diagnostic
	 * @param diagnostic - 诊断实例
	 * @returns App实例（链式调用）
	 */
	registerDiagnostic(diagnostic: Diagnostic): this;
}

/**
 * 扩展 App 类的 registerDiagnostic 方法
 * @param diagnostic - 诊断实例
 * @returns App实例（链式调用）
 */
export function registerDiagnostic(app: any, diagnostic: Diagnostic): any {
	let diagnosticsStore = app.getResource<DiagnosticsStore>();
	if (!diagnosticsStore) {
		diagnosticsStore = new DiagnosticsStore();
		app.insertResource(diagnosticsStore);
	}
	diagnosticsStore.add(diagnostic);
	return app;
}