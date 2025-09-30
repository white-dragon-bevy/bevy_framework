/**
 * Bevy App系统的基础类型定义
 * 对应 Rust bevy_app 的核心类型
 */

import type { Message as BevyMessage } from "../bevy_ecs/message";

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
 * @param name - 标签名称
 * @returns App标签实例
 */
export function createAppLabel(name: string): AppLabel {
	return { __brand: "AppLabel", name } as AppLabel;
}

/**
 * App退出状态码枚举
 * 对应 Rust 的 AppExit enum
 */
export enum AppExitCode {
	/** 成功退出 */
	Success = 0,
	/** 错误退出 */
	Error = 1,
}

/**
 * App退出事件类
 * 表示应用程序的退出状态
 * 对应 Rust bevy_app::AppExit
 */
export class AppExit implements BevyMessage {
	readonly code: number;
	readonly timestamp?: number;

	/**
	 * 创建App退出事件
	 * @param code - 退出码，默认为成功（0）
	 */
	constructor(code: AppExitCode | number = AppExitCode.Success) {
		this.code = code;
		this.timestamp = os.clock();
	}

	/**
	 * 创建成功退出状态
	 * @returns 成功退出实例
	 */
	static success(): AppExit {
		return new AppExit(AppExitCode.Success);
	}

	/**
	 * 创建错误退出状态
	 * @param code - 错误码，默认为1
	 * @returns 错误退出实例
	 */
	static error(code: number = 1): AppExit {
		return new AppExit(code);
	}

	/**
	 * 检查是否为成功退出
	 * @returns 是否成功
	 */
	public isSuccess(this: AppExit): boolean {
		return this.code === AppExitCode.Success;
	}

	/**
	 * 检查是否为错误退出
	 * @returns 是否错误
	 */
	public isError(this: AppExit): boolean {
		return this.code !== AppExitCode.Success;
	}
}

/**
 * 调度标签类型
 * 用于标识和引用不同的调度
 * 对应 Rust 的 ScheduleLabel trait
 */
export type ScheduleLabel = string;

/**
 * 消息类型
 * 应用程序内部通信的基础类型
 * 对应 Rust 的 Event/Message trait
 */
export type Message = BevyMessage;

/**
 * 错误处理器类型
 * 用于处理应用程序运行时的错误
 * @param error - 捕获的错误对象
 */
export type ErrorHandler = (error: unknown) => void;