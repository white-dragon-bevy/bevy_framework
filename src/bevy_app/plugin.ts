/**
 * Bevy插件系统实现
 * 对应 Rust bevy_app 的 Plugin trait 和相关类型
 */

import { RobloxContext } from "../utils/roblox-utils";
import { App } from "./app";
import { ExtensionConfig, ExtensionMetadata, ExtensionRegistry, PluginExtensions } from "./extensions";

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
