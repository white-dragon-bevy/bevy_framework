/**
 * 默认插件组配置
 * 对应 Rust bevy_internal::default_plugins
 *
 * 提供 DefaultPlugins 和 MinimalPlugins 两种预设插件组
 */

import { Plugin, PluginGroup, PluginGroupBuilder, BasePluginGroup } from "../bevy_app/plugin";
import { RobloxRunnerPlugin } from "../bevy_app/roblox-adapters";
import { DiagnosticsPlugin } from "../bevy_diagnostic/diagnostics-plugin";
import { FrameCountPlugin } from "../bevy_diagnostic/frame-count-diagnostics-plugin";
import { InputPlugin } from "../bevy_input/plugin";
import { LogPlugin } from "../bevy_log/lib";
import { TimePlugin } from "../bevy_time/time-plugin";
import { TransformPlugin } from "../bevy_transform/src/plugin";

/**
 * DefaultPlugins - 默认插件组
 * 包含构建完整 Bevy 应用所需的常用插件
 * 对应 Rust DefaultPlugins
 */
export class DefaultPlugins extends BasePluginGroup {
	/**
	 * 构建默认插件组
	 * @returns 插件组构建器
	 */
	build(): PluginGroupBuilder {
		const builder = new PluginGroupBuilder();

		// 基础插件
		builder.add(new LogPlugin());
		builder.add(new TimePlugin());
		builder.add(new TransformPlugin());
		builder.add(new DiagnosticsPlugin());
		builder.add(new FrameCountPlugin());
		builder.add(new InputPlugin());

		// Roblox 运行时插件
		builder.add(new RobloxRunnerPlugin());

		return builder;
	}

	/**
	 * 获取插件组名称
	 * @returns 插件组名称
	 */
	name(): string {
		return "DefaultPlugins";
	}

	/**
	 * 创建默认插件组构建器
	 * @returns 新的默认插件组实例
	 */
	static create(): DefaultPlugins {
		return new DefaultPlugins();
	}
}

/**
 * MinimalPlugins - 最小插件组
 * 包含运行 Bevy 应用所需的最少插件集
 * 对应 Rust MinimalPlugins
 */
export class MinimalPlugins extends BasePluginGroup {
	/**
	 * 构建最小插件组
	 * @returns 插件组构建器
	 */
	build(): PluginGroupBuilder {
		const builder = new PluginGroupBuilder();

		// 最小必需插件
		builder.add(new FrameCountPlugin());
		builder.add(new TimePlugin());
		builder.add(new RobloxRunnerPlugin());

		return builder;
	}

	/**
	 * 获取插件组名称
	 * @returns 插件组名称
	 */
	name(): string {
		return "MinimalPlugins";
	}

	/**
	 * 创建最小插件组构建器
	 * @returns 新的最小插件组实例
	 */
	static create(): MinimalPlugins {
		return new MinimalPlugins();
	}
}

/**
 * DefaultPluginsBuilder - 默认插件组构建器
 * 允许自定义默认插件组，添加或移除特定插件
 */
export class DefaultPluginsBuilder {
	private pluginGroupBuilder: PluginGroupBuilder;

	constructor() {
		this.pluginGroupBuilder = new DefaultPlugins().build();
	}

	/**
	 * 添加插件
	 * @param plugin - 要添加的插件
	 * @returns 构建器自身，支持链式调用
	 */
	add(plugin: Plugin): this {
		this.pluginGroupBuilder.add(plugin);
		return this;
	}

	/**
	 * 在指定插件之前添加插件
	 * @param beforePlugin - 参考插件类型
	 * @param plugin - 要添加的插件
	 * @returns 构建器自身，支持链式调用
	 */
	addBefore<T extends Plugin>(beforePlugin: new (...args: unknown[]) => T, plugin: Plugin): this {
		this.pluginGroupBuilder.addBefore(beforePlugin, plugin);
		return this;
	}

	/**
	 * 在指定插件之后添加插件
	 * @param afterPlugin - 参考插件类型
	 * @param plugin - 要添加的插件
	 * @returns 构建器自身，支持链式调用
	 */
	addAfter<T extends Plugin>(afterPlugin: new (...args: unknown[]) => T, plugin: Plugin): this {
		this.pluginGroupBuilder.addAfter(afterPlugin, plugin);
		return this;
	}

	/**
	 * 禁用指定插件
	 * @param pluginType - 要禁用的插件类型
	 * @returns 构建器自身，支持链式调用
	 */
	disable<T extends Plugin>(pluginType: new (...args: unknown[]) => T): this {
		this.pluginGroupBuilder.disable(pluginType);
		return this;
	}

	/**
	 * 获取所有插件
	 * @returns 插件列表
	 */
	getPlugins(): readonly Plugin[] {
		return this.pluginGroupBuilder.getPlugins();
	}
}

/**
 * MinimalPluginsBuilder - 最小插件组构建器
 * 允许自定义最小插件组
 */
export class MinimalPluginsBuilder {
	private pluginGroupBuilder: PluginGroupBuilder;

	constructor() {
		this.pluginGroupBuilder = new MinimalPlugins().build();
	}

	/**
	 * 添加插件
	 * @param plugin - 要添加的插件
	 * @returns 构建器自身，支持链式调用
	 */
	add(plugin: Plugin): this {
		this.pluginGroupBuilder.add(plugin);
		return this;
	}

	/**
	 * 在指定插件之前添加插件
	 * @param beforePlugin - 参考插件类型
	 * @param plugin - 要添加的插件
	 * @returns 构建器自身，支持链式调用
	 */
	addBefore<T extends Plugin>(beforePlugin: new (...args: unknown[]) => T, plugin: Plugin): this {
		this.pluginGroupBuilder.addBefore(beforePlugin, plugin);
		return this;
	}

	/**
	 * 在指定插件之后添加插件
	 * @param afterPlugin - 参考插件类型
	 * @param plugin - 要添加的插件
	 * @returns 构建器自身，支持链式调用
	 */
	addAfter<T extends Plugin>(afterPlugin: new (...args: unknown[]) => T, plugin: Plugin): this {
		this.pluginGroupBuilder.addAfter(afterPlugin, plugin);
		return this;
	}

	/**
	 * 禁用指定插件
	 * @param pluginType - 要禁用的插件类型
	 * @returns 构建器自身，支持链式调用
	 */
	disable<T extends Plugin>(pluginType: new (...args: unknown[]) => T): this {
		this.pluginGroupBuilder.disable(pluginType);
		return this;
	}

	/**
	 * 获取所有插件
	 * @returns 插件列表
	 */
	getPlugins(): readonly Plugin[] {
		return this.pluginGroupBuilder.getPlugins();
	}
}
