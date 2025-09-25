/**
 * Bevy App系统的基础类型定义
 * 对应 Rust bevy_app 的核心类型
 */

import { Event } from "../bevy_ecs/events";

/**
 * App标签接口 - 用于标识不同的App实例
 * 对应 Rust 的 AppLabel trait
 */
export interface AppLabel {
	readonly __brand: "AppLabel";
	readonly name: string;
}

/**
 * 创建App标签
 */
export function createAppLabel(name: string): AppLabel {
	return { __brand: "AppLabel", name } as AppLabel;
}

/**
 * App退出状态
 * 对应 Rust 的 AppExit enum
 */
export enum AppExitCode {
	Success = 0,
	Error = 1,
}

export class AppExit implements Message, Event {
	readonly __brand = "Message" as const;
	readonly timestamp?: number;
	readonly code: number;

	constructor(code: AppExitCode | number = AppExitCode.Success) {
		this.code = code;
		this.timestamp = os.clock();
	}

	static success(): AppExit {
		return new AppExit(AppExitCode.Success);
	}

	static error(code: number = 1): AppExit {
		return new AppExit(code);
	}

	public isSuccess(this: AppExit): boolean {
		return this.code === AppExitCode.Success;
	}

	public isError(this: AppExit): boolean {
		return this.code !== AppExitCode.Success;
	}
}

/**
 * 调度标签接口
 * 对应 Rust 的 ScheduleLabel trait
 */
export type ScheduleLabel = string;

/**
 * 事件/消息类型接口
 * 对应 Rust 的 Event/Message trait
 */
export interface Message {
	readonly __brand: "Message";
}

/**
 * 错误处理器类型
 */
export type ErrorHandler = (error: unknown) => void;
