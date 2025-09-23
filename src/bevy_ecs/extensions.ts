/**
 * ECS资源系统扩展定义
 * 为 ECS ResourceManager 提供类型安全的扩展接口
 */

import type { Resource, ResourceConstructor, ResourceId, ResourceMetadata } from "./resource";

/**
 * 核心资源管理扩展接口
 * 提供资源的增删改查功能
 */
export interface ResourceManagerExtension {
	/**
	 * 获取资源实例
	 * @param resourceType - 资源类型构造函数
	 * @returns 资源实例或 undefined
	 */
	getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined;

	/**
	 * 插入或更新资源
	 * @param resourceType - 资源类型构造函数
	 * @param resource - 资源实例
	 */
	insertResource<T extends Resource>(resourceType: ResourceConstructor<T>, resource: T): void;

	/**
	 * 移除资源
	 * @param resourceType - 资源类型构造函数
	 * @returns 被移除的资源实例或 undefined
	 */
	removeResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined;

	/**
	 * 检查资源是否存在
	 * @param resourceType - 资源类型构造函数
	 * @returns 资源是否存在
	 */
	hasResource<T extends Resource>(resourceType: ResourceConstructor<T>): boolean;

	/**
	 * 获取所有已注册的资源类型
	 * @returns 资源ID数组
	 */
	getResourceIds(): ReadonlyArray<ResourceId>;

	/**
	 * 获取资源数量
	 * @returns 资源数量
	 */
	getResourceCount(): number;

	/**
	 * 清空所有资源
	 */
	clearResources(): void;
}

/**
 * 资源元数据扩展接口
 * 提供资源的元信息查询功能
 */
export interface ResourceMetadataExtension {
	/**
	 * 获取资源元数据
	 * @param resourceType - 资源类型
	 * @returns 资源元数据或 undefined
	 */
	getResourceMetadata<T extends Resource>(resourceType: ResourceConstructor<T>): ResourceMetadata | undefined;

	/**
	 * 获取所有资源元数据
	 * @returns 资源元数据映射
	 */
	getAllResourceMetadata(): ReadonlyMap<ResourceId, ResourceMetadata>;

	/**
	 * 获取资源创建时间
	 * @param resourceType - 资源类型
	 * @returns 创建时间戳或 undefined
	 */
	getResourceCreatedTime<T extends Resource>(resourceType: ResourceConstructor<T>): number | undefined;

	/**
	 * 获取资源更新时间
	 * @param resourceType - 资源类型
	 * @returns 更新时间戳或 undefined
	 */
	getResourceUpdatedTime<T extends Resource>(resourceType: ResourceConstructor<T>): number | undefined;
}

/**
 * 资源操作扩展接口
 * 提供便捷的资源操作方法
 */
export interface ResourceOperationsExtension {
	/**
	 * 使用资源执行操作
	 * @param resourceType - 资源类型
	 * @param callback - 操作回调
	 * @returns 操作结果或 undefined
	 */
	withResource<T extends Resource, R>(
		resourceType: ResourceConstructor<T>,
		callback: (resource: T) => R,
	): R | undefined;

	/**
	 * 使用可变资源执行操作，自动重新插入修改后的资源
	 * @param resourceType - 资源类型
	 * @param callback - 操作回调
	 * @returns 操作结果或 undefined
	 */
	withResourceMut<T extends Resource, R>(
		resourceType: ResourceConstructor<T>,
		callback: (resource: T) => R,
	): R | undefined;

	/**
	 * 获取或插入资源
	 * @param resourceType - 资源类型
	 * @param factory - 资源工厂函数
	 * @returns 资源实例
	 */
	getOrInsertResource<T extends Resource>(resourceType: ResourceConstructor<T>, factory: () => T): T;

	/**
	 * 获取或插入默认资源
	 * @param resourceType - 资源类型（必须有无参构造函数）
	 * @returns 资源实例
	 */
	getOrInsertDefaultResource<T extends Resource>(resourceType: new () => T): T;

	/**
	 * 批量插入资源
	 * @param resources - 资源映射
	 */
	insertResourceBatch(resources: Map<ResourceConstructor, Resource>): void;

	/**
	 * 批量移除资源
	 * @param resourceTypes - 资源类型数组
	 */
	removeResourceBatch(resourceTypes: ResourceConstructor[]): void;
}

/**
 * 资源查询扩展接口
 * 提供资源的高级查询功能
 */
export interface ResourceQueryExtension {
	/**
	 * 查找符合条件的资源
	 * @param predicate - 判断函数
	 * @returns 符合条件的资源数组
	 */
	findResources(predicate: (resource: Resource, metadata: ResourceMetadata) => boolean): Resource[];

	/**
	 * 获取特定类型的所有资源
	 * @param baseType - 基类型
	 * @returns 资源数组
	 */
	getResourcesByType<T extends Resource>(baseType: ResourceConstructor<T>): T[];

	/**
	 * 获取最近更新的资源
	 * @param count - 数量限制
	 * @returns 资源数组
	 */
	getRecentlyUpdatedResources(count: number): Array<{ resource: Resource; metadata: ResourceMetadata }>;

	/**
	 * 获取最早创建的资源
	 * @param count - 数量限制
	 * @returns 资源数组
	 */
	getOldestResources(count: number): Array<{ resource: Resource; metadata: ResourceMetadata }>;

	/**
	 * 检查是否存在符合条件的资源
	 * @param predicate - 判断函数
	 * @returns 是否存在
	 */
	hasResourceWhere(predicate: (resource: Resource, metadata: ResourceMetadata) => boolean): boolean;
}

/**
 * 资源监控扩展接口
 * 提供资源使用情况的监控功能
 */
export interface ResourceMonitoringExtension {
	/**
	 * 获取资源使用统计
	 * @returns 统计信息
	 */
	getResourceStatistics(): {
		totalCount: number;
		typeCount: Map<string, number>;
		totalMemory?: number;
		lastUpdateTime: number;
	};

	/**
	 * 获取资源变更历史（如果启用）
	 * @param resourceType - 资源类型
	 * @param limit - 限制数量
	 * @returns 变更历史
	 */
	getResourceHistory<T extends Resource>(
		resourceType: ResourceConstructor<T>,
		limit?: number,
	): Array<{
		action: "insert" | "update" | "remove";
		timestamp: number;
		resource?: T;
	}>;

	/**
	 * 启用资源监控
	 * @param options - 监控选项
	 */
	enableResourceMonitoring(options?: {
		trackHistory?: boolean;
		trackMemory?: boolean;
		maxHistorySize?: number;
	}): void;

	/**
	 * 禁用资源监控
	 */
	disableResourceMonitoring(): void;

	/**
	 * 导出资源快照
	 * @returns 资源快照
	 */
	exportResourceSnapshot(): {
		timestamp: number;
		resources: Map<ResourceId, Resource>;
		metadata: Map<ResourceId, ResourceMetadata>;
	};
}

/**
 * 声明扩展到全局插件扩展注册表
 */
declare module "../bevy_app/extensions" {
	interface PluginExtensions {
		resources: ResourceManagerExtension;
		"resources.metadata": ResourceMetadataExtension;
		"resources.operations": ResourceOperationsExtension;
		"resources.query": ResourceQueryExtension;
		"resources.monitoring": ResourceMonitoringExtension;
	}
}
