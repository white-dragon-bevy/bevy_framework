import { LogLevel } from "./level";
import { LogManager } from "./manager";
import { ConsoleLogger, InGameConsoleLogger, DeveloperConsoleLogger } from "./targets/console";
import { RemoteLogger, WebhookLogger, AnalyticsLogger } from "./targets/remote";
import { TargetFilter, RateLimitFilter, CompositeFilter } from "./filter";
import {
	DevelopmentFormatter,
	ProductionFormatter,
	JsonFormatter,
	CompactFormatter,
} from "./formatter";

/**
 * 日志预设配置
 */
export namespace LogPresets {
	/**
	 * 配置开发环境日志
	 * @param manager 日志管理器
	 */
	export function setupDevelopment(manager: LogManager): void {
		manager.setLevel(LogLevel.Trace);

		// 控制台输出（彩色）
		const consoleLogger = new ConsoleLogger(new DevelopmentFormatter());
		manager.addLogger(consoleLogger);

		// Studio 输出
		if (game.GetService("RunService").IsStudio()) {
			const studioLogger = new DeveloperConsoleLogger();
			manager.addLogger(studioLogger);
		}

		// 游戏内控制台
		const inGameLogger = new InGameConsoleLogger(200);
		manager.addLogger(inGameLogger);

		// 详细的目标过滤
		const filter = new TargetFilter("trace");
		consoleLogger.addFilter(filter);
	}

	/**
	 * 配置生产环境日志
	 * @param manager 日志管理器
	 * @param remoteUrl 远程日志服务器 URL
	 * @param apiKey API 密钥
	 */
	export function setupProduction(
		manager: LogManager,
		remoteUrl?: string,
		apiKey?: string,
	): void {
		manager.setLevel(LogLevel.Info);

		// 控制台输出（简洁）
		const consoleLogger = new ConsoleLogger(new ProductionFormatter());
		manager.addLogger(consoleLogger);

		// 速率限制
		const rateLimiter = new RateLimitFilter(10, 1);
		consoleLogger.addFilter(rateLimiter);

		// 远程日志收集（仅错误和警告）
		if (remoteUrl) {
			const remoteLogger = new RemoteLogger({
				url: remoteUrl,
				apiKey: apiKey,
				batchSize: 50,
				flushInterval: 30,
			});
			remoteLogger.setMinLevel(LogLevel.Warn);
			manager.addLogger(remoteLogger);
		}

		// 分析日志器
		const analyticsLogger = new AnalyticsLogger();
		analyticsLogger.setMinLevel(LogLevel.Warn);
		manager.addLogger(analyticsLogger);

		// 生产环境过滤
		const filter = new TargetFilter("info,network=warn,database=warn");
		consoleLogger.addFilter(filter);
	}

	/**
	 * 配置测试环境日志
	 * @param manager 日志管理器
	 */
	export function setupTesting(manager: LogManager): void {
		manager.setLevel(LogLevel.Debug);

		// JSON 格式输出（便于解析）
		const jsonLogger = new ConsoleLogger(new JsonFormatter());
		manager.addLogger(jsonLogger);

		// 测试相关的过滤
		const filter = new TargetFilter("debug,test=trace");
		jsonLogger.addFilter(filter);
	}

	/**
	 * 配置最小化日志（性能优先）
	 * @param manager 日志管理器
	 */
	export function setupMinimal(manager: LogManager): void {
		manager.setLevel(LogLevel.Error);

		// 紧凑格式输出
		const compactLogger = new ConsoleLogger(new CompactFormatter());
		manager.addLogger(compactLogger);

		// 严格的速率限制
		const rateLimiter = new RateLimitFilter(1, 10);
		compactLogger.addFilter(rateLimiter);
	}

	/**
	 * 配置调试环境日志
	 * @param manager 日志管理器
	 * @param modules 要调试的模块列表
	 */
	export function setupDebug(manager: LogManager, modules: string[]): void {
		manager.setLevel(LogLevel.Trace);

		// 详细的控制台输出
		const consoleLogger = new ConsoleLogger(new DevelopmentFormatter());
		manager.addLogger(consoleLogger);

		// 为特定模块设置详细级别
		const filterString = modules.map((m) => `${m}=trace`).join(",");
		const filter = new TargetFilter(`info,${filterString}`);
		consoleLogger.addFilter(filter);

		// 游戏内控制台（大缓冲区）
		const inGameLogger = new InGameConsoleLogger(500);
		manager.addLogger(inGameLogger);
	}

	/**
	 * 配置 Discord Webhook 日志
	 * @param manager 日志管理器
	 * @param webhookUrl Discord Webhook URL
	 */
	export function setupDiscordWebhook(manager: LogManager, webhookUrl: string): void {
		const webhookLogger = new WebhookLogger(webhookUrl, {
			username: "Roblox Game Logger",
			batchSize: 5,
			flushInterval: 10,
		});

		// 只发送警告和错误
		webhookLogger.setMinLevel(LogLevel.Warn);
		manager.addLogger(webhookLogger);
	}

	/**
	 * 配置网络调试日志
	 * @param manager 日志管理器
	 */
	export function setupNetworkDebug(manager: LogManager): void {
		manager.setLevel(LogLevel.Trace);

		const consoleLogger = new ConsoleLogger(new DevelopmentFormatter());
		manager.addLogger(consoleLogger);

		// 网络相关模块的详细日志
		const filter = new TargetFilter(
			"warn,network=trace,http=trace,websocket=trace,api=debug",
		);
		consoleLogger.addFilter(filter);
	}

	/**
	 * 配置性能监控日志
	 * @param manager 日志管理器
	 */
	export function setupPerformanceMonitoring(manager: LogManager): void {
		manager.setLevel(LogLevel.Debug);

		// JSON 格式便于分析
		const jsonLogger = new ConsoleLogger(new JsonFormatter());
		manager.addLogger(jsonLogger);

		// 性能相关模块的日志
		const filter = new TargetFilter(
			"info,performance=debug,profiler=trace,metrics=debug",
		);
		jsonLogger.addFilter(filter);

		// 分析日志器
		const analyticsLogger = new AnalyticsLogger();
		manager.addLogger(analyticsLogger);
	}

	/**
	 * 应用自定义预设
	 * @param manager 日志管理器
	 * @param preset 预设函数
	 */
	export function applyCustomPreset(
		manager: LogManager,
		preset: (manager: LogManager) => void,
	): void {
		preset(manager);
	}
}