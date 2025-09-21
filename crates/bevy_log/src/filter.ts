import { LogLevel, parseLogLevel } from "./level";
import { LogFilter } from "./logger";

/**
 * 目标模式过滤器
 */
export class TargetFilter implements LogFilter {
	private patterns: Map<string, LogLevel> = new Map();
	private defaultLevel: LogLevel = LogLevel.Info;

	/**
	 * 创建目标过滤器
	 * @param filterString 过滤字符串，格式如 "warn,my_module=debug,my_module::submodule=trace"
	 */
	constructor(filterString?: string) {
		if (filterString) {
			this.parseFilterString(filterString);
		}
	}

	/**
	 * 解析过滤字符串
	 * @param filterString 过滤字符串
	 */
	private parseFilterString(filterString: string): void {
		const parts = filterString.split(",");

		for (const part of parts) {
			const trimmed = part.gsub("^%s+", "")[0].gsub("%s+$", "")[0];
			if (trimmed === "") continue;

			const [target, levelStr] = trimmed.split("=") as [string, string?];

			if (levelStr) {
				// 特定目标的级别设置
				const level = parseLogLevel(levelStr);
				if (level !== undefined) {
					this.patterns.set(target, level);
				}
			} else {
				// 默认级别设置
				const level = parseLogLevel(target);
				if (level !== undefined) {
					this.defaultLevel = level;
				}
			}
		}
	}

	/**
	 * 检查日志是否应该被记录
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果日志应该被记录返回 true
	 */
	public isEnabled(level: LogLevel, target: string): boolean {
		// 查找最具体的匹配
		let minLevel = this.defaultLevel;
		let bestMatch = "";

		for (const [pattern, patternLevel] of this.patterns) {
			if (this.matchesPattern(target, pattern) && pattern.size() > bestMatch.size()) {
				bestMatch = pattern;
				minLevel = patternLevel;
			}
		}

		return level >= minLevel;
	}

	/**
	 * 检查目标是否匹配模式
	 * @param target 目标
	 * @param pattern 模式
	 * @returns 如果匹配返回 true
	 */
	private matchesPattern(target: string, pattern: string): boolean {
		// 精确匹配
		if (target === pattern) {
			return true;
		}

		// 前缀匹配（模块层次结构）
		const prefix = pattern + ".";
		return target.sub(1, prefix.size()) === prefix;
	}

	/**
	 * 设置默认日志级别
	 * @param level 日志级别
	 * @returns 过滤器自身
	 */
	public setDefaultLevel(level: LogLevel): this {
		this.defaultLevel = level;
		return this;
	}

	/**
	 * 设置特定目标的日志级别
	 * @param target 目标
	 * @param level 日志级别
	 * @returns 过滤器自身
	 */
	public setTargetLevel(target: string, level: LogLevel): this {
		this.patterns.set(target, level);
		return this;
	}

	/**
	 * 移除特定目标的设置
	 * @param target 目标
	 * @returns 过滤器自身
	 */
	public removeTarget(target: string): this {
		this.patterns.delete(target);
		return this;
	}

	/**
	 * 清除所有目标设置
	 * @returns 过滤器自身
	 */
	public clear(): this {
		this.patterns.clear();
		return this;
	}
}

/**
 * 正则表达式过滤器
 */
export class RegexFilter implements LogFilter {
	private includePatterns: string[] = [];
	private excludePatterns: string[] = [];

	/**
	 * 添加包含模式
	 * @param pattern 正则表达式模式
	 * @returns 过滤器自身
	 */
	public addIncludePattern(pattern: string): this {
		this.includePatterns.push(pattern);
		return this;
	}

	/**
	 * 添加排除模式
	 * @param pattern 正则表达式模式
	 * @returns 过滤器自身
	 */
	public addExcludePattern(pattern: string): this {
		this.excludePatterns.push(pattern);
		return this;
	}

	/**
	 * 检查日志是否应该被记录
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果日志应该被记录返回 true
	 */
	public isEnabled(level: LogLevel, target: string): boolean {
		// 检查排除模式
		for (const pattern of this.excludePatterns) {
			if (target.match(pattern)[0]) {
				return false;
			}
		}

		// 如果没有包含模式，默认包含所有
		if (this.includePatterns.size() === 0) {
			return true;
		}

		// 检查包含模式
		for (const pattern of this.includePatterns) {
			if (target.match(pattern)[0]) {
				return true;
			}
		}

		return false;
	}

	/**
	 * 清除所有模式
	 * @returns 过滤器自身
	 */
	public clear(): this {
		this.includePatterns.clear();
		this.excludePatterns.clear();
		return this;
	}
}

/**
 * 组合过滤器
 */
export class CompositeFilter implements LogFilter {
	private filters: LogFilter[] = [];
	private mode: "all" | "any";

	/**
	 * 创建组合过滤器
	 * @param mode 组合模式：'all' 表示所有过滤器都必须通过，'any' 表示任一过滤器通过即可
	 */
	constructor(mode: "all" | "any" = "all") {
		this.mode = mode;
	}

	/**
	 * 添加过滤器
	 * @param filter 日志过滤器
	 * @returns 组合过滤器自身
	 */
	public addFilter(filter: LogFilter): this {
		this.filters.push(filter);
		return this;
	}

	/**
	 * 移除过滤器
	 * @param filter 日志过滤器
	 * @returns 组合过滤器自身
	 */
	public removeFilter(filter: LogFilter): this {
		const index = this.filters.indexOf(filter);
		if (index !== -1) {
			this.filters.remove(index);
		}
		return this;
	}

	/**
	 * 检查日志是否应该被记录
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果日志应该被记录返回 true
	 */
	public isEnabled(level: LogLevel, target: string): boolean {
		if (this.filters.size() === 0) {
			return true;
		}

		if (this.mode === "all") {
			// 所有过滤器都必须通过
			for (const filter of this.filters) {
				if (!filter.isEnabled(level, target)) {
					return false;
				}
			}
			return true;
		} else {
			// 任一过滤器通过即可
			for (const filter of this.filters) {
				if (filter.isEnabled(level, target)) {
					return true;
				}
			}
			return false;
		}
	}

	/**
	 * 设置组合模式
	 * @param mode 组合模式
	 * @returns 组合过滤器自身
	 */
	public setMode(mode: "all" | "any"): this {
		this.mode = mode;
		return this;
	}

	/**
	 * 清除所有过滤器
	 * @returns 组合过滤器自身
	 */
	public clear(): this {
		this.filters.clear();
		return this;
	}
}

/**
 * 速率限制过滤器（防止日志泛滥）
 */
export class RateLimitFilter implements LogFilter {
	private counts: Map<string, { count: number; resetTime: number }> = new Map();
	private maxPerSecond: number;
	private windowSize: number;

	/**
	 * 创建速率限制过滤器
	 * @param maxPerSecond 每秒最大日志数
	 * @param windowSize 时间窗口大小（秒）
	 */
	constructor(maxPerSecond = 10, windowSize = 1) {
		this.maxPerSecond = maxPerSecond;
		this.windowSize = windowSize;
	}

	/**
	 * 检查日志是否应该被记录
	 * @param level 日志级别
	 * @param target 日志目标
	 * @returns 如果日志应该被记录返回 true
	 */
	public isEnabled(level: LogLevel, target: string): boolean {
		const now = tick();
		const key = `${target}:${level}`;

		let entry = this.counts.get(key);
		if (!entry || now >= entry.resetTime) {
			// 重置计数器
			entry = {
				count: 0,
				resetTime: now + this.windowSize * 30, // 假设 30 ticks per second
			};
			this.counts.set(key, entry);
		}

		if (entry.count >= this.maxPerSecond) {
			return false;
		}

		entry.count++;
		return true;
	}

	/**
	 * 清理过期的计数器
	 */
	public cleanup(): void {
		const now = tick();
		const keysToRemove: string[] = [];

		for (const [key, entry] of this.counts) {
			if (now >= entry.resetTime) {
				keysToRemove.push(key);
			}
		}

		for (const key of keysToRemove) {
			this.counts.delete(key);
		}
	}

	/**
	 * 重置所有计数器
	 */
	public reset(): void {
		this.counts.clear();
	}
}