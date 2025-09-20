/**
 * Bevy App系统的基础类型定义
 * 对应 Rust bevy_app 的核心类型
 */

import { World } from "@rbxts/matter";

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

export class AppExit implements Message {
	readonly __brand = "Message" as const;

	constructor(public readonly code: AppExitCode = AppExitCode.Success) {}

	static success(): AppExit {
		return new AppExit(AppExitCode.Success);
	}

	static error(code: number = 1): AppExit {
		return new AppExit(code);
	}

	isSuccess(): boolean {
		return this.code === AppExitCode.Success;
	}

	isError(): boolean {
		return this.code !== AppExitCode.Success;
	}
}

/**
 * 系统函数类型定义
 */
export type SystemFunction = (world: World, deltaTime?: number) => void;

/**
 * 调度标签接口
 * 对应 Rust 的 ScheduleLabel trait
 */
export interface ScheduleLabel {
	readonly __brand: "ScheduleLabel";
	readonly name: string;
}

/**
 * 创建调度标签
 */
export function createScheduleLabel(name: string): ScheduleLabel {
	return { __brand: "ScheduleLabel", name } as ScheduleLabel;
}

/**
 * 内置调度标签
 * 对应 Rust bevy_app 的标准调度阶段
 */
export namespace BuiltinSchedules {
	export const First = createScheduleLabel("First");
	export const PreStartup = createScheduleLabel("PreStartup");
	export const Startup = createScheduleLabel("Startup");
	export const PostStartup = createScheduleLabel("PostStartup");
	export const PreUpdate = createScheduleLabel("PreUpdate");
	export const Update = createScheduleLabel("Update");
	export const PostUpdate = createScheduleLabel("PostUpdate");
	export const Last = createScheduleLabel("Last");
	export const Main = createScheduleLabel("Main");
}

/**
 * 资源类型接口
 * 对应 Rust ECS 的 Resource trait
 */
export interface Resource {
	readonly __brand: "Resource";
}

/**
 * 组件类型接口
 * 对应 Rust ECS 的 Component trait
 */
export interface Component {
	readonly __brand: "Component";
}

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