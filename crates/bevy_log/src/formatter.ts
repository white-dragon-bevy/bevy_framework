import { LogLevel, getLevelName, getLevelColor } from "./level";
import { LogRecord, formatMetadata, formatLocation } from "./record";

/**
 * 日志格式化器接口
 */
export interface LogFormatter {
	/**
	 * 格式化日志记录
	 * @param record 日志记录
	 * @returns 格式化后的字符串
	 */
	format(record: LogRecord): string;
}

/**
 * 简单文本格式化器
 */
export class SimpleFormatter implements LogFormatter {
	private showTimestamp: boolean;
	private showLevel: boolean;
	private showTarget: boolean;
	private showLocation: boolean;
	private showMetadata: boolean;

	/**
	 * 创建简单格式化器
	 * @param options 格式化选项
	 */
	constructor(options?: {
		showTimestamp?: boolean;
		showLevel?: boolean;
		showTarget?: boolean;
		showLocation?: boolean;
		showMetadata?: boolean;
	}) {
		this.showTimestamp = options?.showTimestamp ?? true;
		this.showLevel = options?.showLevel ?? true;
		this.showTarget = options?.showTarget ?? true;
		this.showLocation = options?.showLocation ?? false;
		this.showMetadata = options?.showMetadata ?? true;
	}

	/**
	 * 格式化日志记录
	 * @param record 日志记录
	 * @returns 格式化后的字符串
	 */
	public format(record: LogRecord): string {
		const parts: string[] = [];

		if (this.showTimestamp) {
			parts.push(this.formatTimestamp(record.timestamp));
		}

		if (this.showLevel) {
			parts.push(`[${getLevelName(record.level)}]`);
		}

		if (this.showTarget) {
			parts.push(`[${record.target}]`);
		}

		parts.push(record.message);

		if (this.showMetadata && record.metadata) {
			const metadataStr = formatMetadata(record.metadata);
			if (metadataStr !== "") {
				parts.push(metadataStr);
			}
		}

		if (this.showLocation && record.location) {
			const locationStr = formatLocation(record.location);
			if (locationStr !== "") {
				parts.push(locationStr);
			}
		}

		return parts.join(" ");
	}

	/**
	 * 格式化时间戳
	 * @param timestamp 时间戳
	 * @returns 格式化后的时间字符串
	 */
	protected formatTimestamp(timestamp: number): string {
		// 转换为时间格式 HH:MM:SS.mmm
		const totalSeconds = timestamp / 30; // 假设 30 ticks per second
		const hours = math.floor(totalSeconds / 3600);
		const minutes = math.floor((totalSeconds % 3600) / 60);
		const seconds = math.floor(totalSeconds % 60);
		const milliseconds = math.floor(((totalSeconds % 1) * 1000));

		return string.format(
			"%02d:%02d:%02d.%03d",
			hours,
			minutes,
			seconds,
			milliseconds,
		);
	}
}

/**
 * 彩色控制台格式化器
 */
export class ColorFormatter extends SimpleFormatter {
	private useColor: boolean;

	/**
	 * 创建彩色格式化器
	 * @param options 格式化选项
	 */
	constructor(options?: {
		showTimestamp?: boolean;
		showLevel?: boolean;
		showTarget?: boolean;
		showLocation?: boolean;
		showMetadata?: boolean;
		useColor?: boolean;
	}) {
		super(options);
		this.useColor = options?.useColor ?? true;
	}

	/**
	 * 格式化日志记录
	 * @param record 日志记录
	 * @returns 格式化后的字符串
	 */
	public format(record: LogRecord): string {
		if (!this.useColor) {
			return super.format(record);
		}

		const parts: string[] = [];
		const color = getLevelColor(record.level);

		if (this.showTimestamp) {
			parts.push(this.colorize(this.formatTimestamp(record.timestamp), "180,180,180"));
		}

		if (this.showLevel) {
			parts.push(this.colorize(`[${getLevelName(record.level)}]`, color));
		}

		if (this.showTarget) {
			parts.push(this.colorize(`[${record.target}]`, "150,150,255"));
		}

		parts.push(this.colorize(record.message, color));

		if (this.showMetadata && record.metadata) {
			const metadataStr = formatMetadata(record.metadata);
			if (metadataStr !== "") {
				parts.push(this.colorize(metadataStr, "200,200,200"));
			}
		}

		if (this.showLocation && record.location) {
			const locationStr = formatLocation(record.location);
			if (locationStr !== "") {
				parts.push(this.colorize(locationStr, "150,150,150"));
			}
		}

		return parts.join(" ");
	}

	/**
	 * 为文本添加颜色
	 * @param text 文本
	 * @param rgb RGB颜色字符串
	 * @returns 带颜色的文本
	 */
	private colorize(text: string, rgb: string): string {
		// Roblox 使用 Color3.fromRGB
		// 这里我们返回原始文本，实际的颜色应用应该在输出层处理
		return text;
	}
}

/**
 * JSON格式化器
 */
export class JsonFormatter implements LogFormatter {
	private pretty: boolean;

	/**
	 * 创建JSON格式化器
	 * @param pretty 是否美化输出
	 */
	constructor(pretty = false) {
		this.pretty = pretty;
	}

	/**
	 * 格式化日志记录
	 * @param record 日志记录
	 * @returns 格式化后的JSON字符串
	 */
	public format(record: LogRecord): string {
		const obj = {
			level: getLevelName(record.level),
			message: record.message,
			target: record.target,
			timestamp: record.timestamp,
			...(record.metadata || {}),
		};

		if (record.location) {
			(obj as any).location = {
				file: record.location.file,
				line: record.location.line,
				column: record.location.column,
				function: record.location.functionName,
			};
		}

		// 使用 HttpService 进行 JSON 序列化
		const HttpService = game.GetService("HttpService");
		return HttpService.JSONEncode(obj);
	}
}

/**
 * 自定义格式化器
 */
export class CustomFormatter implements LogFormatter {
	private template: string;

	/**
	 * 创建自定义格式化器
	 * @param template 格式模板，支持变量：{timestamp}, {level}, {target}, {message}, {metadata}
	 */
	constructor(template: string) {
		this.template = template;
	}

	/**
	 * 格式化日志记录
	 * @param record 日志记录
	 * @returns 格式化后的字符串
	 */
	public format(record: LogRecord): string {
		let result = this.template;

		// 替换占位符
		result = result.gsub("{timestamp}", tostring(record.timestamp))[0];
		result = result.gsub("{level}", getLevelName(record.level))[0];
		result = result.gsub("{target}", record.target)[0];
		result = result.gsub("{message}", record.message)[0];

		if (record.metadata) {
			result = result.gsub("{metadata}", formatMetadata(record.metadata))[0];
		} else {
			result = result.gsub("{metadata}", "")[0];
		}

		if (record.location) {
			result = result.gsub("{location}", formatLocation(record.location))[0];
		} else {
			result = result.gsub("{location}", "")[0];
		}

		return result;
	}
}

/**
 * 紧凑格式化器（最小输出）
 */
export class CompactFormatter implements LogFormatter {
	/**
	 * 格式化日志记录
	 * @param record 日志记录
	 * @returns 格式化后的字符串
	 */
	public format(record: LogRecord): string {
		const levelChar = getLevelName(record.level).sub(1, 1);
		return `${levelChar} ${record.message}`;
	}
}

/**
 * 开发环境格式化器
 */
export class DevelopmentFormatter extends ColorFormatter {
	constructor() {
		super({
			showTimestamp: true,
			showLevel: true,
			showTarget: true,
			showLocation: true,
			showMetadata: true,
			useColor: true,
		});
	}
}

/**
 * 生产环境格式化器
 */
export class ProductionFormatter extends SimpleFormatter {
	constructor() {
		super({
			showTimestamp: true,
			showLevel: true,
			showTarget: true,
			showLocation: false,
			showMetadata: false,
		});
	}
}