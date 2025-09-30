/**
 * Debugger 相关类型定义
 *
 * 从 bull-ecs 项目迁移的调试器配置类型，提供类型安全的调试器接口定义。
 *
 * @module types
 */

import type { AnyEntity, AnySystem, World } from "@rbxts/matter";
import type { Loop } from "@rbxts/matter";
import type Plasma from "@rbxts/plasma";

/**
 * Debugger 配置选项
 *
 * 对应原项目的 BullOptions 中 debugger 相关配置
 *
 * @interface DebuggerOptions
 */
export interface DebuggerOptions {
	/**
	 * 切换调试器的按键
	 *
	 * @default Enum.KeyCode.F4
	 */
	toggleKey?: Enum.KeyCode;

	/**
	 * 权限组ID，用于验证调试权限
	 *
	 * 仅限该组的 Admin 或 Owner 角色可以访问调试器
	 *
	 * @default 9999999
	 */
	groupId?: number;
}

/**
 * Debugger 实例接口
 *
 * 定义调试器的核心功能方法
 *
 * @interface IDebugger
 */
export interface IDebugger {
	/**
	 * 调试器是否已启用
	 */
	enabled: boolean;

	/**
	 * 切换调试器显示状态
	 */
	toggle(): void;

	/**
	 * 查找实体对应的 Roblox Model 实例
	 * @param id - Matter 实体 ID
	 * @returns 对应的 Model 实例，如果未找到则返回 undefined
	 */
	findInstanceFromEntity: (id: AnyEntity) => Model | undefined;

	/**
	 * 验证玩家是否有权限使用调试器
	 * @param player - 要验证的玩家
	 * @returns 是否通过授权
	 */
	authorize: (player: Player) => boolean;

	/**
	 * 替换系统（用于热重载）
	 *
	 * 在运行时替换已注册的系统，通常用于开发时的热重载功能
	 * @param oldSystem - 要被替换的旧系统
	 * @param newSystem - 新的系统实现
	 */
	replaceSystem(oldSystem: AnySystem, newSystem: AnySystem): void;

	/**
	 * 自动初始化调试器与 Loop 的集成
	 *
	 * 必须在 loop.begin() 之前调用
	 * @param loop - Matter Loop 实例
	 */
	autoInitialize(loop: Loop<unknown[]>): void;

	/**
	 * 获取 Plasma UI 控件集合
	 *
	 * @returns Plasma Widgets 对象
	 */
	getWidgets(): Plasma.Widgets;
}

/**
 * 默认 Debugger 选项
 *
 * 提供合理的默认配置值
 *
 * @constant
 */
export const DefaultDebuggerOptions: DebuggerOptions = {
	toggleKey: Enum.KeyCode.F4,
	groupId: 9999999,
};

/**
 * State 接口扩展
 *
 * 用于在应用状态中存储调试器启用状态
 *
 * @interface DebuggerState
 */
export interface DebuggerState {
	/**
	 * 调试器是否启用
	 *
	 * 该状态会在调试器切换时更新
	 */
	debugEnabled?: boolean;
}
