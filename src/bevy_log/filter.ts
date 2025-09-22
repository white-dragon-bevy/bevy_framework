/**
 * 环境过滤器实现
 * 对应 Rust tracing_subscriber::EnvFilter
 */

import { Level, parseLevel } from "./level";

/**
 * 模块过滤规则
 */
interface ModuleFilter {
	/** 模块路径（支持前缀匹配） */
	module: string;
	/** 该模块的日志级别 */
	level: Level;
}

/**
 * 环境过滤器
 * 支持格式："level" 或 "level,module=level,..."
 * 例如："warn,my_crate=debug,my_crate::my_module=trace"
 */
export class EnvFilter {
	private defaultLevel: Level = Level.INFO;
	private moduleFilters: ModuleFilter[] = [];

	constructor(filterString: string) {
		this.parse(filterString);
	}

	/**
	 * 从默认环境变量创建过滤器
	 * 模拟 Rust 的 EnvFilter::try_from_default_env
	 * @param defaultFilter - 默认过滤器字符串
	 * @returns EnvFilter 实例
	 */
	static tryFromDefaultEnv(defaultFilter: string): EnvFilter {
		// 在 Roblox 中没有环境变量，直接使用默认值
		// 未来可以从 ReplicatedStorage 或其他地方读取配置
		return new EnvFilter(defaultFilter);
	}

	/**
	 * 解析过滤器字符串
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
		this.moduleFilters.sort((a, b) => {
			const diff = b.module.size() - a.module.size();
			return diff > 0;
		});
	}

	/**
	 * 检查给定模块和级别是否应该被记录
	 * @param level - 日志级别
	 * @param module - 模块路径（可选）
	 * @returns 是否应该记录
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
	 * @returns 模块过滤器列表
	 */
	getModuleFilters(): readonly ModuleFilter[] {
		return this.moduleFilters;
	}

	/**
	 * 构建器模式：解析宽松模式
	 * 对应 Rust EnvFilter::builder().parse_lossy()
	 * @param filterString - 过滤器字符串
	 * @returns EnvFilter 实例
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
 */
export const DEFAULT_FILTER = "wgpu=error,naga=warn";