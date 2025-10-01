/**
 * 热更新系统配置类型定义
 */

import type { ScheduleLabel, RunCondition, SystemSet, SystemFunction } from "../../bevy_ecs/schedule/types";

/**
 * 容器配置
 * 定义一个热更新容器的配置信息
 */
export interface ContainerConfig {
	/**
	 * 系统容器（Roblox Instance，通常是 Folder）
	 */
	readonly container: Instance;

	/**
	 * 默认调度标签
	 * 容器中所有系统的默认调度
	 */
	readonly schedule: ScheduleLabel;

	/**
	 * 默认系统集（可选）
	 * 容器中所有系统的默认系统集
	 */
	readonly defaultSet?: SystemSet;

	/**
	 * 系统验证函数（可选）
	 * 用于过滤不需要加载的系统
	 * @param name - 导出名称
	 * @param module - 模块导出内容
	 * @returns 是否加载该系统
	 */
	readonly validate?: (name: string, module: unknown) => boolean;
}

/**
 * 热更新系统模块格式
 * 支持配置对象导出
 */
export interface HotSystemModule {
	/**
	 * 系统函数（必填）
	 */
	readonly system: SystemFunction;

	/**
	 * 调度标签（可选）
	 * 如果未指定，使用容器的默认调度
	 */
	readonly schedule?: ScheduleLabel;

	/**
	 * 所属系统集（可选）
	 * 如果未指定，使用容器的默认系统集
	 */
	readonly inSet?: SystemSet;

	/**
	 * 在指定系统集之后执行（可选）
	 */
	readonly after?: readonly SystemSet[];

	/**
	 * 在指定系统集之前执行（可选）
	 */
	readonly before?: readonly SystemSet[];

	/**
	 * 条件执行（可选）
	 */
	readonly runIf?: RunCondition;

	/**
	 * 环境配置（可选）
	 */
	readonly env?: {
		readonly production?: {
			readonly disableClient?: boolean;
			readonly disableServer?: boolean;
		};
	};
}

/**
 * 热更新插件配置
 */
export interface HotReloadConfig {
	/**
	 * 是否启用热更新
	 * 默认：仅在 Studio 环境启用
	 */
	readonly enabled?: boolean;

	/**
	 * 防抖时间（毫秒）
	 * 默认：300ms
	 */
	readonly debounceTime?: number;
}
