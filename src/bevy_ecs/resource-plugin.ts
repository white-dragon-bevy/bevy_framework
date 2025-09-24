/**
 * ECS 资源管理插件
 * 提供资源系统的扩展功能
 */

import { BasePlugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import { Resource, ResourceConstructor, ResourceId, ResourceMetadata } from "./resource";
import type {
	ResourceManagerExtension,
	ResourceMetadataExtension,
	ResourceOperationsExtension,
	ResourceQueryExtension,
	ResourceMonitoringExtension,
} from "./extensions";

/**
 * 资源变更记录
 */
interface ResourceChange {
	action: "insert" | "update" | "remove";
	timestamp: number;
	resourceId: ResourceId;
	resource?: Resource;
}

/**
 * 监控选项
 */
interface MonitoringOptions {
	trackHistory?: boolean;
	trackMemory?: boolean;
	maxHistorySize?: number;
}

/**
 * ECS 资源管理插件
 * 提供资源系统的所有扩展功能
 */
export class EcsResourcePlugin extends BasePlugin {
	private monitoringEnabled = false;
	private monitoringOptions: MonitoringOptions = {};
	private resourceHistory = new Map<ResourceId, ResourceChange[]>();

	build(app: App): void {
		const resourceManager = app.main().getResourceManager();
		const plugin = this;  // Capture this reference for use in object literal

		// 注册核心资源管理扩展
		this.registerExtension(
			app,
			"resources",
			{
				getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
					return resourceManager.getResource(resourceType);
				},
				insertResource<T extends Resource>(resourceType: ResourceConstructor<T>, resource: T): void {
					// 记录历史
					if (plugin.monitoringEnabled && plugin.monitoringOptions.trackHistory) {
						const resourceId = resourceManager.getResourceId(resourceType);
						const history = plugin.resourceHistory.get(resourceId) ?? [];
						const action = resourceManager.hasResource(resourceType) ? "update" : "insert";

						history.push({
							action: action as "insert" | "update",
							timestamp: os.clock(),
							resourceId,
							resource: { ...resource },
						});

						// 限制历史大小
						const maxSize = plugin.monitoringOptions.maxHistorySize ?? 100;
						if (history.size() > maxSize) {
							history.remove(0);
						}

						plugin.resourceHistory.set(resourceId, history);
					}

					resourceManager.insertResource(resourceType, resource);
				},
				removeResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
					const resource = resourceManager.getResource(resourceType);

					// 记录历史
					if (plugin.monitoringEnabled && plugin.monitoringOptions.trackHistory && resource) {
						const resourceId = resourceManager.getResourceId(resourceType);
						const history = plugin.resourceHistory.get(resourceId) ?? [];

						history.push({
							action: "remove",
							timestamp: os.clock(),
							resourceId,
							resource: { ...resource },
						});

						plugin.resourceHistory.set(resourceId, history);
					}

					return resourceManager.removeResource(resourceType);
				},
				hasResource<T extends Resource>(resourceType: ResourceConstructor<T>): boolean {
					return resourceManager.hasResource(resourceType);
				},
				getResourceIds(): ReadonlyArray<ResourceId> {
					return resourceManager.getResourceIds();
				},
				getResourceCount(): number {
					return resourceManager.getResourceCount();
				},
				clearResources(): void {
					resourceManager.clear();
					plugin.resourceHistory.clear();
				},
			} satisfies ResourceManagerExtension,
			{
				description: "Core resource management functionality",
				version: "1.0.0",
			},
		);

		// 注册元数据扩展
		this.registerExtension(
			app,
			"resources.metadata",
			{
				getResourceMetadata<T extends Resource>(
					resourceType: ResourceConstructor<T>,
				): ResourceMetadata | undefined {
					return resourceManager.getResourceMetadata(resourceType);
				},
				getAllResourceMetadata(): ReadonlyMap<ResourceId, ResourceMetadata> {
					const metadata = new Map<ResourceId, ResourceMetadata>();
					for (const id of resourceManager.getResourceIds()) {
						const meta = resourceManager.getResourceMetadataById(id);
						if (meta) {
							metadata.set(id, meta);
						}
					}
					return metadata;
				},
				getResourceCreatedTime<T extends Resource>(resourceType: ResourceConstructor<T>): number | undefined {
					const metadata = resourceManager.getResourceMetadata(resourceType);
					return metadata?.created;
				},
				getResourceUpdatedTime<T extends Resource>(resourceType: ResourceConstructor<T>): number | undefined {
					const metadata = resourceManager.getResourceMetadata(resourceType);
					return metadata?.updated;
				},
			} satisfies ResourceMetadataExtension,
			{
				description: "Resource metadata query functionality",
				dependencies: ["resources"],
			},
		);

		// 注册操作扩展
		this.registerExtension(
			app,
			"resources.operations",
			{
				withResource<T extends Resource, R>(
					resourceType: ResourceConstructor<T>,
					callback: (resource: T) => R,
				): R | undefined {
					return resourceManager.withResource(resourceType, callback);
				},
				withResourceMut<T extends Resource, R>(
					resourceType: ResourceConstructor<T>,
					callback: (resource: T) => R,
				): R | undefined {
					return resourceManager.withResourceMut(resourceType, callback);
				},
				getOrInsertResource<T extends Resource>(resourceType: ResourceConstructor<T>, factory: () => T): T {
					let resource = resourceManager.getResource(resourceType);
					if (!resource) {
						resource = factory();
						resourceManager.insertResource(resourceType, resource);
					}
					return resource;
				},
				getOrInsertDefaultResource<T extends Resource>(resourceType: new () => T): T {
					let resource = resourceManager.getResource(resourceType);
					if (!resource) {
						resource = new resourceType();
						resourceManager.insertResource(resourceType, resource);
					}
					return resource;
				},
				insertResourceBatch(resources: Map<ResourceConstructor, Resource>): void {
					for (const [resourceType, resource] of resources) {
						resourceManager.insertResource(resourceType as ResourceConstructor<Resource>, resource);
					}
				},
				removeResourceBatch(resourceTypes: ResourceConstructor[]): void {
					for (const resourceType of resourceTypes) {
						resourceManager.removeResource(resourceType as ResourceConstructor<Resource>);
					}
				},
			} satisfies ResourceOperationsExtension,
			{
				description: "Convenient resource operation methods",
				dependencies: ["resources"],
			},
		);

		// 注册查询扩展
		this.registerExtension(
			app,
			"resources.query",
			{
				findResources(predicate: (resource: Resource, metadata: ResourceMetadata) => boolean): Resource[] {
					const results: Resource[] = [];
					const allResources = resourceManager.getAllResources();

					for (const [id, resource] of allResources) {
						const metadata = resourceManager.getResourceMetadataById(id);
						if (metadata && predicate(resource, metadata)) {
							results.push(resource);
						}
					}

					return results;
				},
				getResourcesByType<T extends Resource>(baseType: ResourceConstructor<T>): T[] {
					// 简化实现：返回单个资源（如果存在）
					const resource = resourceManager.getResource(baseType);
					return resource ? [resource] : [];
				},
				getRecentlyUpdatedResources(count: number): Array<{ resource: Resource; metadata: ResourceMetadata }> {
					const results: Array<{ resource: Resource; metadata: ResourceMetadata }> = [];
					const allResources = resourceManager.getAllResources();
					const items: Array<{ resource: Resource; metadata: ResourceMetadata }> = [];

					for (const [id, resource] of allResources) {
						const metadata = resourceManager.getResourceMetadataById(id);
						if (metadata) {
							items.push({ resource, metadata });
						}
					}

					// 按更新时间排序
					items.sort((a, b) => b.metadata.updated > a.metadata.updated);

					// 返回前N个
					for (let index = 0; index < math.min(count, items.size()); index++) {
						results.push(items[index]);
					}

					return results;
				},
				getOldestResources(count: number): Array<{ resource: Resource; metadata: ResourceMetadata }> {
					const results: Array<{ resource: Resource; metadata: ResourceMetadata }> = [];
					const allResources = resourceManager.getAllResources();
					const items: Array<{ resource: Resource; metadata: ResourceMetadata }> = [];

					for (const [id, resource] of allResources) {
						const metadata = resourceManager.getResourceMetadataById(id);
						if (metadata) {
							items.push({ resource, metadata });
						}
					}

					// 按创建时间排序
					items.sort((a, b) => a.metadata.created < b.metadata.created);

					// 返回前N个
					for (let index = 0; index < math.min(count, items.size()); index++) {
						results.push(items[index]);
					}

					return results;
				},
				hasResourceWhere(predicate: (resource: Resource, metadata: ResourceMetadata) => boolean): boolean {
					const allResources = resourceManager.getAllResources();

					for (const [id, resource] of allResources) {
						const metadata = resourceManager.getResourceMetadataById(id);
						if (metadata && predicate(resource, metadata)) {
							return true;
						}
					}

					return false;
				},
			} satisfies ResourceQueryExtension,
			{
				description: "Advanced resource query functionality",
				dependencies: ["resources", "resources.metadata"],
			},
		);

		// 注册监控扩展
		this.registerExtension(
			app,
			"resources.monitoring",
			{
				getResourceStatistics() {
					const typeCount = new Map<string, number>();
					const allResources = resourceManager.getAllResources();

					for (const [id] of allResources) {
						const typeName = id.split("::")[0] ?? "unknown";
						typeCount.set(typeName, (typeCount.get(typeName) ?? 0) + 1);
					}

					return {
						totalCount: resourceManager.getResourceCount(),
						typeCount,
						totalMemory: undefined, // 在 Lua 中难以准确测量
						lastUpdateTime: os.clock(),
					};
				},
				getResourceHistory<T extends Resource>(resourceType: ResourceConstructor<T>, limit?: number) {
					const resourceId = resourceManager.getResourceId(resourceType);
					const history = plugin.resourceHistory.get(resourceId) ?? [];

					const result: Array<{
						action: "insert" | "update" | "remove";
						timestamp: number;
						resource?: T;
					}> = [];

					const startIndex = limit !== undefined ? math.max(0, history.size() - limit) : 0;
					const endIndex = history.size();

					for (let index = startIndex; index < endIndex; index++) {
						const change = history[index];
						result.push({
							action: change.action,
							timestamp: change.timestamp,
							resource: change.resource as T | undefined,
						});
					}

					return result;
				},
				enableResourceMonitoring(options?: MonitoringOptions) {
					plugin.monitoringEnabled = true;
					plugin.monitoringOptions = options ?? {};
					print("[ECS Resources] Monitoring enabled");
				},
				disableResourceMonitoring() {
					plugin.monitoringEnabled = false;
					plugin.resourceHistory.clear();
					print("[ECS Resources] Monitoring disabled");
				},
				exportResourceSnapshot() {
					const resources = new Map<ResourceId, Resource>();
					const metadata = new Map<ResourceId, ResourceMetadata>();

					for (const [id, resource] of resourceManager.getAllResources()) {
						resources.set(id, resource);
						const meta = resourceManager.getResourceMetadataById(id);
						if (meta) {
							metadata.set(id, meta);
						}
					}

					return {
						timestamp: os.clock(),
						resources,
						metadata,
					};
				},
			} satisfies ResourceMonitoringExtension,
			{
				description: "Resource usage monitoring and analysis",
				dependencies: ["resources", "resources.metadata"],
			},
		);
	}

	name(): string {
		return "EcsResourcePlugin";
	}

	isUnique(): boolean {
		return true;
	}
}
