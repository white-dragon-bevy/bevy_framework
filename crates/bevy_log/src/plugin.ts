import { World } from "@rbxts/matter";
import { LogLevel, parseLogLevel } from "./level";
import { LogManager } from "./manager";
import { ConsoleLogger } from "./targets/console";
import { TargetFilter } from "./filter";
import { DevelopmentFormatter, ProductionFormatter } from "./formatter";
import { RemoteLogger } from "./targets/remote";

/**
 * 日志插件配置
 */
export interface LogPluginConfig {
	/** 日志级别 */
	level?: LogLevel;
	/** 过滤字符串 */
	filter?: string;
	/** 是否启用控制台输出 */
	enableConsole?: boolean;
	/** 是否启用彩色输出 */
	enableColor?: boolean;
	/** 是否为开发模式 */
	isDevelopment?: boolean;
	/** 远程日志服务器配置 */
	remoteConfig?: {
		url: string;
		apiKey?: string;
	};
	/** 是否启用性能监控 */
	enablePerformanceMonitoring?: boolean;
	/** 自定义日志器 */
	customLoggers?: Array<(manager: LogManager) => void>;
}

/**
 * 日志插件 - 为应用提供日志功能
 */
export class LogPlugin {
	private config: LogPluginConfig;

	/**
	 * 创建日志插件
	 * @param config 配置选项
	 */
	constructor(config?: LogPluginConfig) {
		this.config = {
			level: LogLevel.Info,
			enableConsole: true,
			enableColor: true,
			isDevelopment: true,
			...config,
		};

		// 从环境变量读取配置
		this.loadFromEnvironment();
	}

	/**
	 * 安装插件
	 * @param world Matter World
	 */
	public install(world: World): void {
		const manager = LogManager.getInstance();

		// 设置全局日志级别
		manager.setLevel(this.config.level!);

		// 配置过滤器
		if (this.config.filter) {
			const filter = new TargetFilter(this.config.filter);
			// 应用过滤器到所有日志器
		}

		// 添加控制台日志器
		if (this.config.enableConsole) {
			const formatter = this.config.isDevelopment
				? new DevelopmentFormatter()
				: new ProductionFormatter();

			const consoleLogger = new ConsoleLogger(formatter);
			manager.addLogger(consoleLogger);
		}

		// 添加远程日志器
		if (this.config.remoteConfig) {
			const remoteLogger = new RemoteLogger({
				url: this.config.remoteConfig.url,
				apiKey: this.config.remoteConfig.apiKey,
			});
			manager.addLogger(remoteLogger);
		}

		// 应用自定义日志器
		if (this.config.customLoggers) {
			for (const customLogger of this.config.customLoggers) {
				customLogger(manager);
			}
		}

		// 将日志管理器作为资源插入到 World
		world.insert(manager);

		// 记录启动信息
		const logger = manager.getLogger("LogPlugin");
		logger.info("Log system initialized", {
			level: this.config.level,
			isDevelopment: this.config.isDevelopment,
			consoleEnabled: this.config.enableConsole,
			remoteEnabled: !!this.config.remoteConfig,
		});
	}

	/**
	 * 从环境变量加载配置
	 */
	private loadFromEnvironment(): void {
		// 模拟环境变量（Roblox 中可以使用 DataStore 或其他方式）
		const env = this.getEnvironmentVariables();

		// 日志级别
		if (env.LOG_LEVEL) {
			const level = parseLogLevel(env.LOG_LEVEL);
			if (level !== undefined) {
				this.config.level = level;
			}
		}

		// 过滤器
		if (env.LOG_FILTER) {
			this.config.filter = env.LOG_FILTER;
		}

		// 开发模式
		if (env.NODE_ENV === "production") {
			this.config.isDevelopment = false;
		}

		// 颜色输出
		if (env.NO_COLOR) {
			this.config.enableColor = false;
		}
	}

	/**
	 * 获取环境变量（模拟）
	 * @returns 环境变量对象
	 */
	private getEnvironmentVariables(): Record<string, string> {
		// 在 Roblox 中，可以从不同来源获取配置
		// 例如：ServerStorage 中的配置文件、DataStore、命令行参数等
		return {};
	}

	/**
	 * 创建默认日志插件
	 * @returns 默认配置的日志插件
	 */
	public static default(): LogPlugin {
		return new LogPlugin({
			level: LogLevel.Info,
			enableConsole: true,
			enableColor: true,
			isDevelopment: game.GetService("RunService").IsStudio(),
		});
	}

	/**
	 * 创建生产环境日志插件
	 * @returns 生产环境配置的日志插件
	 */
	public static production(): LogPlugin {
		return new LogPlugin({
			level: LogLevel.Warn,
			enableConsole: true,
			enableColor: false,
			isDevelopment: false,
			filter: "warn,error",
		});
	}

	/**
	 * 创建开发环境日志插件
	 * @returns 开发环境配置的日志插件
	 */
	public static development(): LogPlugin {
		return new LogPlugin({
			level: LogLevel.Trace,
			enableConsole: true,
			enableColor: true,
			isDevelopment: true,
			enablePerformanceMonitoring: true,
		});
	}

	/**
	 * 创建测试环境日志插件
	 * @returns 测试环境配置的日志插件
	 */
	public static testing(): LogPlugin {
		return new LogPlugin({
			level: LogLevel.Debug,
			enableConsole: false,
			enableColor: false,
			isDevelopment: false,
		});
	}
}