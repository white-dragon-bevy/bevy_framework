/**
 * Debugger 相关类型定义
 * 从 bull-ecs 项目迁移的调试器配置类型
 */

import type { AnyEntity, AnySystem, World } from "@rbxts/matter";
import type { Loop } from "@rbxts/matter";
import type Plasma from "@rbxts/plasma";

/**
 * Debugger 配置选项
 * 对应原项目的 BullOptions 中 debugger 相关配置
 */
export interface DebuggerOptions {
	/** 切换调试器的按键，默认 F4 */
	toggleKey?: Enum.KeyCode;
	/** 权限组ID，用于验证调试权限 */
	groupId?: number;
}

/**
 * Debugger 实例接口
 */
export interface IDebugger {
	/** 是否启用 */
	enabled: boolean;
	/** 切换调试器显示 */
	toggle(): void;
	/** 查找实体对应的模型 */
	findInstanceFromEntity: (id: AnyEntity) => Model | undefined;
	/** 授权验证 */
	authorize: (player: Player) => boolean;
	/** 替换系统（用于热重载） */
	replaceSystem(oldSystem: AnySystem, newSystem: AnySystem): void;
	/** 自动初始化 */
	autoInitialize(loop: Loop<unknown[]>): void;
	/** 获取控件 */
	getWidgets(): Plasma.Widgets;
}

/**
 * 默认 Debugger 选项
 */
export const DefaultDebuggerOptions: DebuggerOptions = {
	toggleKey: Enum.KeyCode.F4,
	groupId: 9999999,
};

/**
 * State 接口扩展（用于 debugEnabled 状态）
 */
export interface DebuggerState {
	/** 调试器是否启用 */
	debugEnabled?: boolean;
}