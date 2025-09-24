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
	 */
	build(app: App): void;

	/**
	 * 插件是否准备完成
	 * 对应 Rust Plugin::ready
	 */
	ready?(app: App): boolean;

	/**
	 * 完成插件设置
	 * 对应 Rust Plugin::finish
	 */
	finish?(app: App): void;

	/**
	 * 清理插件资源
	 * 对应 Rust Plugin::cleanup
	 */
	cleanup?(app: App): void;

	/**
	 * 插件名称
	 * 对应 Rust Plugin::name
	 */
	name(): string;

	/**
	 * 插件是否唯一（只能添加一次）
	 * 对应 Rust Plugin::is_unique
	 */
	isUnique(): boolean;

	/**
	 * 该插件适应的roblox域
	 * 空: 服务端和客户端
	 * RobloxContext.Server : 服务端
	 * RobloxContext.Client : 客户端
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
	abstract build(app: App): void;

	ready(_app: App): boolean {
		return true;
	}

	finish?(_app: App): void;

	cleanup?(_app: App): void;

	name(): string {
		return "BasePlugin";
	}

	isUnique(): boolean {
		return true;
	}

	/**
	 * 注册单个扩展到 App 上下文
	 * @param app - App 实例
	 * @param key - 扩展键名
	 * @param extension - 扩展实现
	 * @param metadata - 扩展元数据
	 */
	protected registerExtension<K extends keyof PluginExtensions>(
		app: App,
		key: K,
		extension: PluginExtensions[K],
		metadata?: ExtensionMetadata,
	): void {
		app.context.registerExtension(key, extension, metadata);
	}

	/**
	 * 批量注册多个扩展到 App 上下文
	 * @param app - App 实例
	 * @param extensions - 扩展注册表
	 */
	protected registerExtensions(app: App, extensions: ExtensionRegistry): void {
		// 使用 pairs 遍历对象，需要类型断言
		for (const [key, config] of pairs(extensions as unknown as Record<string, unknown>)) {
			const extensionConfig = config as ExtensionConfig<keyof PluginExtensions> | undefined;
			if (extensionConfig) {
				app.context.registerExtension(
					key as keyof PluginExtensions,
					extensionConfig.extension,
					extensionConfig.metadata,
				);
			}
		}
	}
}

/**
 * 函数式插件
 * 对应 Rust 的 impl Plugin for Fn(&mut App)
 */
export class FunctionPlugin implements Plugin {
	constructor(
		private buildFn: (app: App) => void,
		private pluginName?: string,
		private unique: boolean = true,
	) {}

	build(app: App): void {
		this.buildFn(app);
	}

	name(): string {
		return this.pluginName ?? "FunctionPlugin";
	}

	isUnique(): boolean {
		return this.unique;
	}
}

/**
 * 创建函数式插件的便捷方法
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
	 */
	build(): PluginGroupBuilder;

	/**
	 * 插件组名称
	 */
	name(): string;
}

/**
 * 插件组构建器
 * 对应 Rust 的 PluginGroupBuilder
 */
export class PluginGroupBuilder {
	private plugins: Plugin[] = [];

	/**
	 * 添加插件到组中
	 */
	add(plugin: Plugin): this {
		this.plugins.push(plugin);
		return this;
	}

	/**
	 * 添加插件到指定位置之前
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
	 */
	disable<T extends Plugin>(pluginType: new (...args: any[]) => T): this {
		this.plugins = this.plugins.filter((p) => !(p instanceof pluginType));
		return this;
	}

	/**
	 * 完成构建并应用到App
	 */
	finish(app: App): void {
		for (const plugin of this.plugins) {
			app.addPlugin(plugin);
		}
	}

	/**
	 * 获取所有插件
	 */
	getPlugins(): readonly Plugin[] {
		return this.plugins;
	}
}

export function isPluginGroup(obj: unknown) {
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
 */
export abstract class BasePluginGroup implements PluginGroup {
	readonly __brand = "PluginGroup";

	abstract build(): PluginGroupBuilder;

	name(): string {
		return "BasePluginGroup";
	}
}

/**
 * 插件错误类型
 */
export class PluginError {
	public name = "PluginError";
	public readonly message: string;

	constructor(
		message: string,
		public readonly pluginName: string,
	) {
		this.message = message;
	}

	toString(): string {
		return `${this.name}: ${this.message}`;
	}
}

/**
 * 重复插件错误
 */
export class DuplicatePluginError extends PluginError {
	constructor(pluginName: string) {
		super(`Plugin "${pluginName}" was already added to the application`, pluginName);
		this.name = "DuplicatePluginError";
	}
}
