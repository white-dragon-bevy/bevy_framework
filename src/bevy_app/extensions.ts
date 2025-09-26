/**
 * 插件扩展系统
 * 提供类型安全的插件扩展注册和访问机制
 */

/**
 * 插件扩展注册表接口
 * 所有插件的扩展都通过模块扩展(module augmentation)在这里声明
 *
 * @example
 * ```typescript
 * // 在插件模块中声明扩展
 * declare module "../bevy_app/extensions" {
 *     interface PluginExtensions {
 *         'diagnostics': DiagnosticsExtension;
 *         'diagnostics_store': DiagnosticsStoreExtension;
 *     }
 * }
 * ```
 */
export interface PluginExtensions {
	// 插件通过模块扩展来添加自己的接口
	// 使用下划线命名空间组织相关扩展
	// 例如:
	// 'diagnostics': DiagnosticsExtension
	// 'diagnostics_store': DiagnosticsStoreExtension
	// 'time': TimeExtension
	// 'time_control': TimeControlExtension
}

/**
 * 扩展元数据
 * 描述扩展的依赖关系和其他信息
 */
export interface ExtensionMetadata {
	/**
	 * 扩展的依赖项列表
	 * 在访问此扩展时会验证依赖是否存在
	 */
	readonly dependencies?: ReadonlyArray<keyof PluginExtensions>;

	/**
	 * 扩展的描述信息
	 */
	readonly description?: string;

	/**
	 * 扩展的版本信息
	 */
	readonly version?: string;
}

/**
 * 扩展注册配置
 * 用于批量注册扩展时的配置结构
 */
export interface ExtensionConfig<K extends keyof PluginExtensions> {
	/**
	 * 扩展实现
	 */
	readonly extension: PluginExtensions[K];

	/**
	 * 扩展元数据
	 */
	readonly metadata?: ExtensionMetadata;
}

/**
 * 扩展注册表类型
 * 用于批量注册多个扩展
 */
export type ExtensionRegistry = Partial<{
	[K in keyof PluginExtensions]: ExtensionConfig<K>;
}>;

/**
 * 获取命名空间下的扩展键类型
 */
export type NamespaceKeys<T extends string> = {
	[K in keyof PluginExtensions]: K extends `${T}.${string}` ? K : never;
}[keyof PluginExtensions];

/**
 * 获取命名空间下的扩展映射类型
 */
export type NamespaceExtensions<T extends string> = {
	[K in NamespaceKeys<T>]: PluginExtensions[K];
};