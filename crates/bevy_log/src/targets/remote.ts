import { BufferedLogger } from "../logger";
import { LogRecord } from "../record";
import { JsonFormatter } from "../formatter";

/**
 * 远程日志收集器配置
 */
export interface RemoteLoggerConfig {
	/** 远程服务器 URL */
	url: string;
	/** API 密钥 */
	apiKey?: string;
	/** 批量大小 */
	batchSize?: number;
	/** 刷新间隔（秒） */
	flushInterval?: number;
	/** 重试次数 */
	maxRetries?: number;
	/** 超时时间（秒） */
	timeout?: number;
	/** 附加头信息 */
	headers?: Record<string, string>;
}

/**
 * 远程日志收集器
 */
export class RemoteLogger extends BufferedLogger {
	private config: RemoteLoggerConfig;
	private httpService: HttpService;
	private formatter: JsonFormatter;
	private sending = false;
	private retryQueue: LogRecord[][] = [];

	/**
	 * 创建远程日志器
	 * @param config 配置
	 */
	constructor(config: RemoteLoggerConfig) {
		super(
			"RemoteLogger",
			config.batchSize ?? 50,
			config.flushInterval ?? 10,
		);

		this.config = {
			batchSize: 50,
			flushInterval: 10,
			maxRetries: 3,
			timeout: 30,
			...config,
		};

		this.httpService = game.GetService("HttpService");
		this.formatter = new JsonFormatter();

		// 启动重试队列处理
		this.startRetryProcessor();
	}

	/**
	 * 刷新日志记录
	 * @param records 日志记录数组
	 */
	protected flushRecords(records: LogRecord[]): void {
		if (this.sending) {
			// 如果正在发送，添加到重试队列
			this.retryQueue.push(records);
			return;
		}

		this.sendBatch(records);
	}

	/**
	 * 发送日志批次
	 * @param records 日志记录数组
	 * @param retryCount 重试次数
	 */
	private sendBatch(records: LogRecord[], retryCount = 0): void {
		this.sending = true;

		// 准备请求数据
		const data = {
			logs: records.map((record) => ({
				level: record.level,
				message: record.message,
				target: record.target,
				timestamp: record.timestamp,
				metadata: record.metadata,
				location: record.location,
			})),
			source: "roblox",
			sessionId: game.JobId,
			placeId: game.PlaceId,
			gameId: game.GameId,
		};

		// 准备请求头
		const headers: Record<string, string> = {
			"Content-Type": "application/json",
			...this.config.headers,
		};

		if (this.config.apiKey) {
			headers["Authorization"] = `Bearer ${this.config.apiKey}`;
		}

		// 发送请求
		const requestOptions: RequestAsyncRequest = {
			Url: this.config.url,
			Method: "POST",
			Headers: headers,
			Body: this.httpService.JSONEncode(data),
		};

		const [success, response] = pcall(() =>
			this.httpService.RequestAsync(requestOptions),
		);

		this.sending = false;

		if (!success) {
			// 请求失败，重试
			this.handleSendError(records, retryCount, response as string);
		} else {
			const httpResponse = response as RequestAsyncResponse;
			if (httpResponse.Success) {
				// 成功发送
				this.onSendSuccess(records.size());
			} else {
				// HTTP 错误，重试
				this.handleSendError(
					records,
					retryCount,
					`HTTP ${httpResponse.StatusCode}: ${httpResponse.StatusMessage}`,
				);
			}
		}

		// 处理重试队列
		this.processRetryQueue();
	}

	/**
	 * 处理发送错误
	 * @param records 日志记录数组
	 * @param retryCount 重试次数
	 * @param error 错误信息
	 */
	private handleSendError(records: LogRecord[], retryCount: number, error: string): void {
		warn(`RemoteLogger send error: ${error}`);

		if (retryCount < (this.config.maxRetries ?? 3)) {
			// 添加到重试队列
			task.spawn(() => {
				task.wait(math.pow(2, retryCount) * 2); // 指数退避
				this.sendBatch(records, retryCount + 1);
			});
		} else {
			// 达到最大重试次数，丢弃日志
			warn(`RemoteLogger: Dropping ${records.size()} logs after ${retryCount} retries`);
		}
	}

	/**
	 * 发送成功回调
	 * @param count 发送的日志数量
	 */
	private onSendSuccess(count: number): void {
		// 可以在这里添加统计或监控
	}

	/**
	 * 处理重试队列
	 */
	private processRetryQueue(): void {
		if (this.sending || this.retryQueue.size() === 0) {
			return;
		}

		const batch = this.retryQueue.remove(0);
		if (batch) {
			this.sendBatch(batch);
		}
	}

	/**
	 * 启动重试队列处理器
	 */
	private startRetryProcessor(): void {
		task.spawn(() => {
			while (true) {
				task.wait(5); // 每 5 秒检查一次
				this.processRetryQueue();
			}
		});
	}
}

/**
 * Webhook 日志器（用于 Discord、Slack 等）
 */
export class WebhookLogger extends BufferedLogger {
	private webhookUrl: string;
	private httpService: HttpService;
	private username?: string;
	private avatarUrl?: string;

	/**
	 * 创建 Webhook 日志器
	 * @param webhookUrl Webhook URL
	 * @param options 选项
	 */
	constructor(
		webhookUrl: string,
		options?: {
			username?: string;
			avatarUrl?: string;
			batchSize?: number;
			flushInterval?: number;
		},
	) {
		super("WebhookLogger", options?.batchSize ?? 10, options?.flushInterval ?? 5);

		this.webhookUrl = webhookUrl;
		this.httpService = game.GetService("HttpService");
		this.username = options?.username ?? "Roblox Logger";
		this.avatarUrl = options?.avatarUrl;
	}

	/**
	 * 刷新日志记录
	 * @param records 日志记录数组
	 */
	protected flushRecords(records: LogRecord[]): void {
		// 构建消息内容
		const messages: string[] = [];
		for (const record of records) {
			const emoji = this.getLevelEmoji(record.level);
			messages.push(`${emoji} **[${record.target}]** ${record.message}`);
		}

		// 发送到 Webhook
		this.sendToWebhook(messages.join("\n"));
	}

	/**
	 * 发送到 Webhook
	 * @param content 消息内容
	 */
	private sendToWebhook(content: string): void {
		const data = {
			username: this.username,
			avatar_url: this.avatarUrl,
			content: content.sub(1, 2000), // Discord 限制 2000 字符
		};

		const requestOptions: RequestAsyncRequest = {
			Url: this.webhookUrl,
			Method: "POST",
			Headers: {
				"Content-Type": "application/json",
			},
			Body: this.httpService.JSONEncode(data),
		};

		task.spawn(() => {
			const [success, response] = pcall(() =>
				this.httpService.RequestAsync(requestOptions),
			);

			if (!success) {
				warn(`WebhookLogger error: ${response}`);
			}
		});
	}

	/**
	 * 获取日志级别对应的 emoji
	 * @param level 日志级别
	 * @returns emoji 字符串
	 */
	private getLevelEmoji(level: LogLevel): string {
		switch (level) {
			case LogLevel.Trace:
				return "🔍";
			case LogLevel.Debug:
				return "🐛";
			case LogLevel.Info:
				return "ℹ️";
			case LogLevel.Warn:
				return "⚠️";
			case LogLevel.Error:
				return "❌";
			default:
				return "📝";
		}
	}
}

/**
 * 分析日志器（用于收集分析数据）
 */
export class AnalyticsLogger extends BaseLogger {
	private analyticsService?: AnalyticsService;
	private gameAnalytics?: GameAnalytics;

	/**
	 * 创建分析日志器
	 */
	constructor() {
		super("AnalyticsLogger");

		// 尝试获取分析服务
		pcall(() => {
			this.analyticsService = game.GetService("AnalyticsService");
		});

		// 这里可以集成第三方分析服务
	}

	/**
	 * 记录日志
	 * @param record 日志记录
	 */
	public log(record: LogRecord): void {
		// 只记录警告和错误级别的日志
		if (record.level < LogLevel.Warn) {
			return;
		}

		// 发送到 Roblox Analytics
		if (this.analyticsService) {
			pcall(() => {
				(this.analyticsService as AnalyticsService).FireEvent("LogEvent", {
					level: record.level,
					target: record.target,
					message: record.message.sub(1, 100), // 限制长度
				});
			});
		}

		// 发送到第三方分析服务
		if (this.gameAnalytics) {
			// 实现第三方分析服务集成
		}
	}
}