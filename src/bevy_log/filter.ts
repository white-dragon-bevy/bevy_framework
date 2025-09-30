/**
 * 环境过滤器实现
 * 对应 Rust tracing_subscriber::EnvFilter
 */

import { Level, parseLevel } from "./level";

/**
 * 模块过滤规则
 * 定义特定模块的日志级别配置
 * 对应 Rust tracing_subscriber::filter::Directive
 */
export interface ModuleFilter {
	/** 模块路径（支持前缀匹配） */
	module: string;
	/** 该模块的日志级别 */
	level: Level;
}

/**
 * 环境过滤器
 * 对应 Rust tracing_subscriber::EnvFilter
 * 支持格式："level" 或 "level,module=level,..."
 * 例如："warn,my_crate=debug,my_crate::my_module=trace"
 *
 * @example
 * ```typescript
 * // 设置默认为 WARN 级别，my_crate 模块为 DEBUG 级别
 * const filter = new EnvFilter("warn,my_crate=debug");
 *
 * // 检查是否应该记录
 * if (filter.isEnabled(Level.DEBUG, "my_crate")) {
 *     debug("Debug message", "my_crate");
 * }
 * ```
 */
export class EnvFilter {
	private defaultLevel: Level = Level.INFO;
	private moduleFilters: Array<ModuleFilter> = [];

	/**
	 * 创建环境过滤器实例
	 * @param filterString - 过滤器配置字符串，格式："level" 或 "level,module=level,..."
	 * @example
	 * ```typescript
	 * const filter = new EnvFilter("info,bevy_ecs=trace");
	 * ```
	 */
	constructor(filterString: string) {
		this.parse(filterString);
	}

	/**
	 * 从默认环境变量创建过滤器
	 * 模拟 Rust 的 EnvFilter::try_from_default_env
	 * 在 Roblox 中没有环境变量，直接使用默认值
	 * @param defaultFilter - 默认过滤器字符串
	 * @returns EnvFilter 实例
	 * @example
	 * ```typescript
	 * const filter = EnvFilter.tryFromDefaultEnv("warn,my_module=debug");
	 * ```
	 */
	static tryFromDefaultEnv(defaultFilter: string): EnvFilter {
		// 在 Roblox 中没有环境变量，直接使用默认值
		// 未来可以从 ReplicatedStorage 或其他地方读取配置
		return new EnvFilter(defaultFilter);
	}

	/**
	 * 解析过滤器字符串
	 * 支持格式："level" 或 "level,module=level,module2=level2,..."
	 * @param filterString - 过滤器字符串
	 */
	private parse(filterString: string): void {
		this.defaultLevel = Level.INFO; // 默认级别
		this.moduleFilters = [];

		if (!filterString || filterString.size() === 0) {
			return;
		}

		const parts = filterString.split(",");
		for (const part of parts) {
			const trimmed = part.gsub("^%s*(.-)%s*$", "%1")[0]; // trim
			if (!trimmed || trimmed.size() === 0) continue;

			// 检查是否包含 '='
			const equalIndex = trimmed.find("=")[0];
			if (equalIndex) {
				// 模块特定的过滤器
				const module = trimmed.sub(1, equalIndex - 1);
				const levelStr = trimmed.sub(equalIndex + 1);
				const level = parseLevel(levelStr);
				if (level !== undefined) {
					this.moduleFilters.push({ module, level });
				}
			} else {
				// 默认级别
				const level = parseLevel(trimmed);
				if (level !== undefined) {
					this.defaultLevel = level;
				}
			}
		}

		// 按模块路径长度降序排序，确保更具体的规则优先
		// Lua sort expects a boolean comparator for "less than" relationship
		// To sort in descending order by length, we return true if a should come before b
		this.moduleFilters.sort((a, b) => {
			// For descending order: longer strings come first
			// Return true if a should come before b (a.length > b.length)
			return a.module.size() > b.module.size();
		});
	}

	/**
	 * 检查给定模块和级别是否应该被记录
	 * 对应 Rust EnvFilter::enabled
	 * @param level - 日志级别
	 * @param module - 模块路径（可选），支持前缀匹配
	 * @returns 如果应该记录返回 true，否则返回 false
	 * @example
	 * ```typescript
	 * const filter = new EnvFilter("warn,my_module=trace");
	 * filter.isEnabled(Level.DEBUG, "my_module"); // true
	 * filter.isEnabled(Level.DEBUG, "other_module"); // false
	 * ```
	 */
	isEnabled(level: Level, module?: string): boolean {
		let targetLevel = this.defaultLevel;

		// 如果提供了模块，查找最匹配的规则
		if (module) {
			for (const filter of this.moduleFilters) {
				if (module.sub(1, filter.module.size()) === filter.module) {
					targetLevel = filter.level;
					break;
				}
			}
		}

		// 检查级别是否满足
		return level <= targetLevel;
	}

	/**
	 * 获取默认级别
	 * @returns 默认日志级别
	 */
	getDefaultLevel(): Level {
		return this.defaultLevel;
	}

	/**
	 * 获取所有模块过滤器
	 * @returns 模块过滤器列表（只读）
	 */
	getModuleFilters(): ReadonlyArray<ModuleFilter> {
		return this.moduleFilters;
	}

	/**
	 * 构建器模式：解析宽松模式
	 * 对应 Rust EnvFilter::builder().parse_lossy()
	 * 在解析失败时返回默认配置而不是抛出错误
	 * @param filterString - 过滤器字符串
	 * @returns EnvFilter 实例
	 * @example
	 * ```typescript
	 * const filter = EnvFilter.parseLossy("invalid,syntax");
	 * // 返回默认的 info 级别过滤器
	 * ```
	 */
	static parseLossy(filterString: string): EnvFilter {
		// 宽松解析：忽略无效的部分
		try {
			return new EnvFilter(filterString);
		} catch {
			// 如果解析失败，返回默认配置
			return new EnvFilter("info");
		}
	}
}

/**
 * 默认过滤器配置
 * 对应 Rust DEFAULT_FILTER
 * 设置 wgpu 模块为 ERROR 级别，naga 模块为 WARN 级别
 */
export const DEFAULT_FILTER = "wgpu=error,naga=warn";