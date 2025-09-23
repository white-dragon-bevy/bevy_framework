import { BaseLogger } from "../logger";
import { LogLevel, getLevelName } from "../level";
import { LogRecord } from "../record";
import { LogFormatter, SimpleFormatter } from "../formatter";

/**
 * 控制台日志输出器
 */
export class ConsoleLogger extends BaseLogger {
	private formatter: LogFormatter;
	private useRobloxFunctions: boolean;

	/**
	 * 创建控制台日志器
	 * @param formatter 日志格式化器
	 * @param useRobloxFunctions 是否使用 Roblox 原生函数
	 */
	constructor(formatter?: LogFormatter, useRobloxFunctions = true) {
		super("ConsoleLogger");
		this.formatter = formatter ?? new SimpleFormatter();
		this.useRobloxFunctions = useRobloxFunctions;
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		const formatted = this.formatter.format(record);

		if (this.useRobloxFunctions) {
			this.logToRoblox(record.level, formatted);
		} else {
			print(formatted);
		}
	}

	/**
	 * 使用 Roblox 原生函数输出日志
	 * @param level 日志级别
	 * @param message 格式化后的消息
	 */
	private logToRoblox(level: LogLevel, message: string): void {
		switch (level) {
			case LogLevel.Trace:
			case LogLevel.Debug:
				print(message);
				break;
			case LogLevel.Info:
				print(message);
				break;
			case LogLevel.Warn:
				warn(message);
				break;
			case LogLevel.Error:
				error(message);
				break;
		}
	}

	/**
	 * 设置格式化器
	 * @param formatter 日志格式化器
	 * @returns 控制台日志器自身
	 */
	public setFormatter(formatter: LogFormatter): this {
		this.formatter = formatter;
		return this;
	}

	/**
	 * 设置是否使用 Roblox 原生函数
	 * @param useRobloxFunctions 是否使用
	 * @returns 控制台日志器自身
	 */
	public setUseRobloxFunctions(useRobloxFunctions: boolean): this {
		this.useRobloxFunctions = useRobloxFunctions;
		return this;
	}
}

/**
 * Roblox Studio 输出日志器
 */
export class StudioLogger extends ConsoleLogger {
	private outputService?: LogService;

	/**
	 * 创建 Studio 日志器
	 * @param formatter 日志格式化器
	 */
	constructor(formatter?: LogFormatter) {
		super(formatter, false);
		this.name = "StudioLogger";

		// 尝试获取 LogService
		const success = pcall(() => {
			this.outputService = game.GetService("LogService");
		});

		if (!success[0]) {
			warn("LogService not available, falling back to print");
		}
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		const formatted = this.formatter.format(record);

		if (this.outputService) {
			// 使用 LogService
			const messageType = this.getMessageType(record.level);
			pcall(() => {
				(this.outputService as LogService).MessageOut.Fire(
					formatted,
					messageType,
					record.timestamp,
				);
			});
		} else {
			// 回退到控制台输出
			super.log(record);
		}
	}

	/**
	 * 获取 Roblox MessageType
	 * @param level 日志级别
	 * @returns MessageType 枚举值
	 */
	private getMessageType(level: LogLevel): Enum.MessageType {
		switch (level) {
			case LogLevel.Trace:
			case LogLevel.Debug:
				return Enum.MessageType.MessageOutput;
			case LogLevel.Info:
				return Enum.MessageType.MessageInfo;
			case LogLevel.Warn:
				return Enum.MessageType.MessageWarning;
			case LogLevel.Error:
				return Enum.MessageType.MessageError;
			default:
				return Enum.MessageType.MessageOutput;
		}
	}
}

/**
 * 游戏内控制台日志器（用于显示在游戏 UI 中）
 */
export class InGameConsoleLogger extends BaseLogger {
	private messages: Array<{ level: LogLevel; message: string; timestamp: number }> = [];
	private maxMessages: number;
	private onMessageAdded?: (level: LogLevel, message: string) => void;

	/**
	 * 创建游戏内控制台日志器
	 * @param maxMessages 最大消息数量
	 */
	constructor(maxMessages = 100) {
		super("InGameConsoleLogger");
		this.maxMessages = maxMessages;
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		const message = `[${getLevelName(record.level)}] [${record.target}] ${record.message}`;

		this.messages.push({
			level: record.level,
			message: message,
			timestamp: record.timestamp,
		});

		// 限制消息数量
		if (this.messages.size() > this.maxMessages) {
			this.messages.remove(0);
		}

		// 触发回调
		if (this.onMessageAdded) {
			this.onMessageAdded(record.level, message);
		}
	}

	/**
	 * 获取所有消息
	 * @returns 消息数组
	 */
	public getMessages(): ReadonlyArray<{ level: LogLevel; message: string; timestamp: number }> {
		return this.messages;
	}

	/**
	 * 清空消息
	 */
	public clearMessages(): void {
		this.messages.clear();
	}

	/**
	 * 设置消息添加回调
	 * @param callback 回调函数
	 * @returns 游戏内控制台日志器自身
	 */
	public setOnMessageAdded(callback?: (level: LogLevel, message: string) => void): this {
		this.onMessageAdded = callback;
		return this;
	}

	/**
	 * 获取指定级别的消息
	 * @param level 日志级别
	 * @returns 消息数组
	 */
	public getMessagesByLevel(level: LogLevel): Array<{ message: string; timestamp: number }> {
		return this.messages
			.filter((msg) => msg.level === level)
			.map((msg) => ({ message: msg.message, timestamp: msg.timestamp }));
	}
}

/**
 * 开发者控制台日志器
 */
export class DeveloperConsoleLogger extends BaseLogger {
	private testService?: TestService;

	/**
	 * 创建开发者控制台日志器
	 */
	constructor() {
		super("DeveloperConsoleLogger");

		// 尝试获取 TestService
		const success = pcall(() => {
			this.testService = game.GetService("TestService");
		});

		if (!success[0]) {
			warn("TestService not available");
		}
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		if (!this.testService) {
			return;
		}

		const formatted = `[${getLevelName(record.level)}] [${record.target}] ${record.message}`;

		pcall(() => {
			if (record.level >= LogLevel.Error) {
				(this.testService as TestService).Error(formatted);
			} else if (record.level >= LogLevel.Warn) {
				(this.testService as TestService).Warn(false, formatted);
			} else {
				(this.testService as TestService).Message(formatted);
			}
		});
	}
}