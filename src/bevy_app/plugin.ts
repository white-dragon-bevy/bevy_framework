/**
 * Bevy插件系统实现
 * 对应 Rust bevy_app 的 Plugin trait 和相关类型
 */

import { RobloxContext } from "../utils/roblox-utils";
import { App } from "./app";
import type { IntoSystemConfigs, ScheduleLabel } from "../bevy_ecs/schedule";
import type { Schedule } from "../bevy_ecs/schedule/schedule";
import { Modding } from "@flamework/core";
import { getTypeDescriptor, TypeDescriptor } from "bevy_core/reflect";

/**
 * 插件接口定义
 * 对应 Rust 的 Plugin trait
 */
export interface Plugin {
	/**
	 * 配置App - 插件的主要逻辑
	 * 对应 Rust Plugin::build
	 * @param app - App实例
	 */
	build(app: App): void;

	/**
	 * 插件是否准备完成
	 * 对应 Rust Plugin::ready
	 * @param app - App实例
	 * @returns 插件是否准备就绪
	 */
	ready?(app: App): boolean;

	/**
	 * 完成插件设置
	 * 对应 Rust Plugin::finish
	 * @param app - App实例
	 */
	finish?(app: App): void;

	/**
	 * 清理插件资源
	 * 对应 Rust Plugin::cleanup
	 * @param app - App实例
	 */
	cleanup?(app: App): void;

	/**
	 * 插件名称
	 * 对应 Rust Plugin::name
	 * @returns 插件名称字符串
	 */
	name(): string;

	/**
	 * 插件是否唯一（只能添加一次）
	 * 对应 Rust Plugin::is_unique
	 * @returns 是否唯一
	 */
	isUnique(): boolean;

	/**
	 * 该插件适应的roblox域
	 * - undefined: 服务端和客户端都运行
	 * - RobloxContext.Server: 仅服务端
	 * - RobloxContext.Client: 仅客户端
	 */
	robloxContext?: RobloxContext;

}

/**
 * 插件状态枚举
 * 对应 Rust 的 PluginsState enum
 */
export enum PluginState {
	Adding = "Adding",
	Ready = "Ready",
	Finished = "Finished",
	Cleaned = "Cleaned",
}

/**
 * 基础插件抽象类
 * 提供默认实现和扩展支持
 */
export abstract class BasePlugin implements Plugin {
	/**
	 * 配置App - 插件的主要逻辑
	 * 子类必须实现此方法
	 * @param app - App实例
	 */
	abstract build(app: App): void;

	/**
	 * 插件是否准备完成
	 * 默认实现总是返回true
	 * @param _app - App实例（未使用）
	 * @returns 总是返回true
	 */
	ready(_app: App): boolean {
		return true;
	}

	/**
	 * 完成插件设置
	 * 可选实现
	 * @param _app - App实例（未使用）
	 */
	finish?(_app: App): void;

	/**
	 * 清理插件资源
	 * 可选实现
	 * @param _app - App实例（未使用）
	 */
	cleanup?(_app: App): void;

	/**
	 * 插件名称
	 * 默认返回"BasePlugin"
	 * @returns 插件名称
	 */
	name(): string {
		return "BasePlugin";
	}

	/**
	 * 插件是否唯一
	 * 默认返回true，表示只能添加一次
	 * @returns 是否唯一
	 */
	isUnique(): boolean {
		return true;
	}


	
}

/**
 * 函数式插件
 * 对应 Rust 的 impl Plugin for Fn(&mut App)
 */
export class FunctionPlugin implements Plugin {
	/**
	 * 创建函数式插件
	 * @param buildFn - 插件构建函数
	 * @param pluginName - 插件名称（可选）
	 * @param unique - 是否唯一，默认为true
	 */
	constructor(
		private buildFn: (app: App) => void,
		private pluginName?: string,
		private unique: boolean = true,
	) {}

	/**
	 * 配置App
	 * @param app - App实例
	 */
	build(app: App): void {
		this.buildFn(app);
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	name(): string {
		return this.pluginName ?? "FunctionPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns 是否唯一
	 */
	isUnique(): boolean {
		return this.unique;
	}
}

/**
 * 创建函数式插件的便捷方法
 * @param buildFn - 插件构建函数
 * @param name - 插件名称（可选）
 * @param unique - 是否唯一，默认为true
 * @returns 插件实例
 */
export function createPlugin(buildFn: (app: App) => void, name?: string, unique: boolean = true): Plugin {
	return new FunctionPlugin(buildFn, name, unique);
}

/**
 * 插件组接口
 * 对应 Rust 的 PluginGroup trait
 */
export interface PluginGroup {
	/**
	 * 构建插件组
	 * @returns 插件组构建器
	 */
	build(): PluginGroupBuilder;

	/**
	 * 插件组名称
	 * @returns 插件组名称
	 */
	name(): string;
}

/**
 * 插件组构建器
 * 对应 Rust 的 PluginGroupBuilder
 * 用于管理和配置插件组中的插件
 */
export class PluginGroupBuilder {
	private plugins: Plugin[] = [];

	/**
	 * 添加插件到组中
	 * @param plugin - 要添加的插件
	 * @returns 当前构建器实例，支持链式调用
	 */
	add(plugin: Plugin): this {
		this.plugins.push(plugin);
		return this;
	}

	/**
	 * 添加插件到指定位置之前
	 * @template T - 插件类型
	 * @param beforePlugin - 目标插件构造函数
	 * @param plugin - 要插入的插件
	 * @returns 当前构建器实例，支持链式调用
	 */
	addBefore<T extends Plugin>(beforePlugin: new (...args: any[]) => T, plugin: Plugin): this {
		const index = this.plugins.findIndex((p) => p instanceof beforePlugin);
		if (index !== -1) {
			this.plugins.insert(index, plugin);
		} else {
			this.plugins.push(plugin);
		}
		return this;
	}

	/**
	 * 添加插件到指定位置之后
	 * @template T - 插件类型
	 * @param afterPlugin - 目标插件构造函数
	 * @param plugin - 要插入的插件
	 * @returns 当前构建器实例，支持链式调用
	 */
	addAfter<T extends Plugin>(afterPlugin: new (...args: any[]) => T, plugin: Plugin): this {
		const index = this.plugins.findIndex((p) => p instanceof afterPlugin);
		if (index !== -1) {
			this.plugins.insert(index + 1, plugin);
		} else {
			this.plugins.push(plugin);
		}
		return this;
	}

	/**
	 * 禁用指定插件
	 * @template T - 插件类型
	 * @param pluginType - 要禁用的插件构造函数
	 * @returns 当前构建器实例，支持链式调用
	 */
	disable<T extends Plugin>(pluginType: new (...args: any[]) => T): this {
		this.plugins = this.plugins.filter((p) => !(p instanceof pluginType));
		return this;
	}

	/**
	 * 完成构建并应用到App
	 * @param app - 目标App实例
	 */
	finish(app: App): void {
		for (const plugin of this.plugins) {
			app.addPlugin(plugin);
		}
	}

	/**
	 * 获取所有插件
	 * @returns 插件数组（只读）
	 */
	getPlugins(): readonly Plugin[] {
		return this.plugins;
	}
}

/**
 * 检查对象是否为插件组
 * @param obj - 要检查的对象
 * @returns 是否为插件组
 */
export function isPluginGroup(obj: unknown): boolean {
	if (typeOf(obj) !== "table") {
		return false;
	}
	if ((obj as Record<string, string>).__brand === "PluginGroup") {
		return true;
	}
	return false;
}

/**
 * 基础插件组抽象类
 * 提供插件组的默认实现
 */
export abstract class BasePluginGroup implements PluginGroup {
	readonly __brand = "PluginGroup";

	/**
	 * 构建插件组
	 * 子类必须实现此方法
	 * @returns 插件组构建器
	 */
	abstract build(): PluginGroupBuilder;

	/**
	 * 获取插件组名称
	 * 默认返回"BasePluginGroup"
	 * @returns 插件组名称
	 */
	name(): string {
		return "BasePluginGroup";
	}
}

/**
 * 插件错误类型
 * 表示插件相关的错误
 */
export class PluginError {
	public name = "PluginError";
	public readonly message: string;

	/**
	 * 创建插件错误
	 * @param message - 错误信息
	 * @param pluginName - 插件名称
	 */
	constructor(
		message: string,
		public readonly pluginName: string,
	) {
		this.message = message;
	}

	/**
	 * 将错误转换为字符串
	 * @returns 错误信息字符串
	 */
	toString(): string {
		return `${this.name}: ${this.message}`;
	}
}

/**
 * 重复插件错误
 * 当尝试添加已存在的唯一插件时抛出
 */
export class DuplicatePluginError extends PluginError {
	/**
	 * 创建重复插件错误
	 * @param pluginName - 重复的插件名称
	 */
	constructor(pluginName: string) {
		super(`Plugin "${pluginName}" was already added to the application`, pluginName);
		this.name = "DuplicatePluginError";
	}
}

// ============================================================================
// 函数式 Plugin API
// ============================================================================

/**
 * 插件配置对象（纯数据）
 * 用于创建函数式插件的配置
 * @template E - 扩展工厂类型
 */
export interface PluginConfig<E = {}> {
	/** 插件名称 */
	readonly name: string;
	/** 构建函数 */
	readonly build: (app: App) => void;
	/** 准备检查函数（可选） */
	readonly ready?: (app: App) => boolean;
	/** 完成回调（可选） */
	readonly finish?: (app: App) => void;
	/** 清理回调（可选） */
	readonly cleanup?: (app: App) => void;
	/** 是否唯一（默认true） */
	readonly unique?: boolean;
	/** Roblox执行域（可选） */
	readonly robloxContext?: RobloxContext;
	/** 扩展定义（可选） */
	readonly extension?: E;
}

/**
 * 构建函数类型
 */
export type BuildFn = (app: App) => void;

/**
 * App 转换函数类型
 * 接受一个 App 并返回同一个 App（支持链式调用）
 */
export type AppTransform = (app: App) => App;

/**
 * 创建插件（纯函数）
 * 这是创建函数式插件的核心方法
 * 
 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
 * @metadata macro
 * 
 * @template E - 扩展工厂类型
 * @param config - 插件配置对象
 * @returns Plugin 实例（带扩展类型）
 * 
 *
 * @example
 * ```typescript
 * const myPlugin = plugin({
 *   name: "MyPlugin",
 *   build: (app) => {
 *     app.addSystems(Update, mySystem);
 *   },
 *   unique: true,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // 带扩展的插件
 * const myPlugin = plugin<MyExtension>({
 *   name: "MyPlugin",
 *   build: (app) => {
 *     app.addSystems(Update, mySystem);
 *   },
 *   extension: {
 *     myMethod: (world, context, plugin) => {
 *       return () => { ... };
 *     },
 *   },
 * });
 * ```
 */
export function plugin<E = {},T=any,X=any>(
	config: PluginConfig<E>
): Plugin & { extension?: E } {
	const pluginObject: Plugin & { extension?: E } = {
		build(app: App): void {
			config.build(app);
		},
		name(): string {
			return config.name;
		},
		isUnique(): boolean {
			return config.unique ?? true;
		},
		robloxContext: config.robloxContext,
	};

	// 添加扩展
	if (config.extension) {
		pluginObject.extension = config.extension;
	}

	// 可选方法：只有在配置中提供时才添加
	if (config.ready) {
		pluginObject.ready = (app: App): boolean => {
			return config.ready!(app);
		};
	}

	if (config.finish) {
		pluginObject.finish = (app: App): void => {
			config.finish!(app);
		};
	}

	if (config.cleanup) {
		pluginObject.cleanup = (app: App): void => {
			config.cleanup!(app);
		};
	}

	return pluginObject;
}

/**
 * 快速创建简单插件（只需要 name 和 build）
 * 用于创建只需要构建函数的简单插件
 * @param name - 插件名称
 * @param build - 构建函数
 * @returns Plugin 实例
 *
 * @example
 * ```typescript
 * const myPlugin = simplePlugin("MyPlugin", (app) => {
 *   app.addSystems(Update, mySystem);
 * });
 * ```
 */
export function simplePlugin(name: string, build: BuildFn): Plugin {
	return plugin({ name, build });
}

/**
 * 组合多个构建函数（顺序执行）
 * 允许将多个独立的构建函数组合成一个
 * @param builds - 构建函数数组
 * @returns 组合后的构建函数
 *
 * @example
 * ```typescript
 * const myPlugin = plugin({
 *   name: "MyPlugin",
 *   build: composeBuild(
 *     (app) => app.insertResource(new MyResource()),
 *     (app) => app.addSystems(Update, mySystem),
 *   ),
 * });
 * ```
 */
export function composeBuild(...builds: BuildFn[]): BuildFn {
	return (app: App) => {
		for (const build of builds) {
			build(app);
		}
	};
}

/**
 * 条件执行构建函数
 * 根据条件决定是否执行构建函数
 * @param condition - 条件（布尔值或函数）
 * @param build - 要执行的构建函数
 * @returns 条件构建函数
 *
 * @example
 * ```typescript
 * // 静态条件
 * const myPlugin = plugin({
 *   name: "MyPlugin",
 *   build: when(RunService.IsServer(), (app) => {
 *     app.addSystems(Update, serverSystem);
 *   }),
 * });
 *
 * // 动态条件
 * const myPlugin = plugin({
 *   name: "MyPlugin",
 *   build: when(
 *     (app) => app.getResource<DebugMode>() !== undefined,
 *     (app) => app.addSystems(Update, debugSystem),
 *   ),
 * });
 * ```
 */
export function when(condition: boolean | ((app: App) => boolean), build: BuildFn): BuildFn {
	return (app: App) => {
		const shouldRun = typeIs(condition, "function") ? condition(app) : condition;
		if (shouldRun) {
			build(app);
		}
	};
}

/**
 * 管道操作 - 将 App 通过一系列转换函数
 * 允许以声明式的方式配置 App
 * @param app - 初始 App
 * @param operations - 操作函数数组
 * @returns 转换后的 App
 *
 * @example
 * ```typescript
 * const app = pipe(
 *   new App(),
 *   (app) => app.addPlugin(inputPlugin),
 *   (app) => app.addPlugin(transformPlugin),
 *   addSystems(Startup, initSystem),
 * );
 * ```
 */
export function pipe<T extends App>(app: T, ...operations: Array<(app: T) => T>): T {
	let result = app;
	for (const operation of operations) {
		result = operation(result);
	}
	return result;
}

/**
 * 创建插件组（函数式）
 * 用于组合多个相关的插件
 * @param name - 插件组名称
 * @param builder - 构建器函数
 * @returns PluginGroup 实例
 *
 * @example
 * ```typescript
 * const defaultPlugins = pluginGroup("DefaultPlugins", (group) => {
 *   group
 *     .add(inputPlugin)
 *     .add(transformPlugin)
 *     .add(renderPlugin);
 * });
 * ```
 */
export function pluginGroup(groupName: string, builder: (group: PluginGroupBuilder) => void): PluginGroup {
	return {
		name(): string {
			return groupName;
		},
		build(): PluginGroupBuilder {
			const group = new PluginGroupBuilder();
			builder(group);
			return group;
		},
	};
}

// ============================================================================
// 柯里化的 App 操作函数
// 这些函数返回 AppTransform，可以与 pipe() 配合使用
// ============================================================================

/**
 * 添加系统的柯里化函数
 * 返回一个 App 转换函数，可用于 pipe() 或函数组合
 * @param schedule - 调度标签
 * @param systems - 系统配置
 * @returns App 转换函数
 *
 * @example
 * ```typescript
 * const app = pipe(
 *   new App(),
 *   addSystems(Update, mySystem),
 *   addSystems(Startup, initSystem),
 * );
 * ```
 */
export function addSystems(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): AppTransform {
	return (app: App) => {
		app.addSystems(schedule, ...systems);
		return app;
	};
}

/**
 * 插入资源的柯里化函数
 * 返回一个 App 转换函数
 * @param resource - 资源对象
 * @returns App 转换函数
 *
 * @example
 * ```typescript
 * const app = pipe(
 *   new App(),
 *   insertResource(new MyResource()),
 * );
 * ```
 */
export function insertResource<T extends object>(resource: T): AppTransform {
	return (app: App) => {
		app.insertResource(resource);
		return app;
	};
}

/**
 * 编辑调度的柯里化函数
 * 返回一个 App 转换函数
 * @param label - 调度标签
 * @param editor - 编辑器函数
 * @returns App 转换函数
 *
 * @example
 * ```typescript
 * const app = pipe(
 *   new App(),
 *   editSchedule(Update, (schedule) => {
 *     schedule.addSystem({ system: mySystem, name: "MySystem" });
 *   }),
 * );
 * ```
 */
export function editSchedule(label: ScheduleLabel, editor: (schedule: Schedule) => void): AppTransform {
	return (app: App) => {
		app.editSchedule(label, editor);
		return app;
	};
}

/**
 * 添加插件的柯里化函数
 * 返回一个 App 转换函数
 * @param pluginInstance - 插件实例
 * @returns App 转换函数
 *
 * @example
 * ```typescript
 * const app = pipe(
 *   new App(),
 *   addPlugin(inputPlugin),
 *   addPlugin(transformPlugin),
 * );
 * ```
 */
export function addPlugin(pluginInstance: Plugin): AppTransform {
	return (app: App) => {
		app.addPlugin(pluginInstance);
		return app;
	};
}

/**
 * 设置运行器的柯里化函数
 * 返回一个 App 转换函数
 * @param runner - 运行器函数
 * @returns App 转换函数
 *
 * @example
 * ```typescript
 * const app = pipe(
 *   new App(),
 *   setRunner((app) => {
 *     // 自定义运行逻辑
 *     return AppExit.success();
 *   }),
 * );
 * ```
 */
export function setRunner(runner: (app: App) => unknown): AppTransform {
	return (app: App) => {
		app.setRunner(runner as (app: App) => any);
		return app;
	};
}
