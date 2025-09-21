/**
 * 资源标识符 - 用于唯一标识资源类型
 */
export type ResourceId = string;

/**
 * 资源构造函数类型
 */
export type ResourceConstructor<T = unknown> = new (...args: never[]) => T;

/**
 * 资源基础接口
 */
export interface Resource {}

/**
 * 资源元数据
 */
export interface ResourceMetadata {
	readonly resourceType: ResourceConstructor;
	readonly name: string;
	readonly created: number;
	readonly updated: number;
}

/**
 * 资源管理器 - 实现Bevy的Resource系统
 *
 * 直接使用Map存储资源，完全独立于ECS组件系统
 */
export class ResourceManager {
	private readonly resources = new Map<ResourceId, Resource>();
	private readonly resourceMetadata = new Map<ResourceId, ResourceMetadata>();

	/**
	 * 创建资源管理器
	 */
	constructor() {}

	/**
	 * 获取资源实例
	 * @param resourceType 资源类型构造函数
	 * @returns 资源实例，如果不存在则返回undefined
	 */
	public getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		const resourceId = this.getResourceId(resourceType);
		return this.resources.get(resourceId) as T | undefined;
	}

	/**
	 * 插入或更新资源
	 * @param resourceType 资源类型构造函数
	 * @param resource 资源实例
	 */
	public insertResource<T extends Resource>(resourceType: ResourceConstructor<T>, resource: T): void {
		const resourceId = this.getResourceId(resourceType);
		const now = os.clock();

		const existingMetadata = this.resourceMetadata.get(resourceId);

		// 直接存储资源
		this.resources.set(resourceId, resource);

		// 更新元数据
		if (existingMetadata) {
			this.resourceMetadata.set(resourceId, {
				...existingMetadata,
				updated: now,
			});
		} else {
			this.resourceMetadata.set(resourceId, {
				resourceType,
				name: resourceId,
				created: now,
				updated: now,
			});
		}
	}

	/**
	 * 移除资源
	 * @param resourceType 要移除的资源类型
	 * @returns 被移除的资源实例，如果不存在则返回undefined
	 */
	public removeResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		const resourceId = this.getResourceId(resourceType);
		const resource = this.resources.get(resourceId) as T | undefined;

		// 清理资源和元数据
		this.resources.delete(resourceId);
		this.resourceMetadata.delete(resourceId);

		return resource;
	}

	/**
	 * 检查资源是否存在
	 * @param resourceType 资源类型
	 * @returns 资源是否存在
	 */
	public hasResource<T extends Resource>(resourceType: ResourceConstructor<T>): boolean {
		const resourceId = this.getResourceId(resourceType);
		return this.resources.has(resourceId);
	}

	/**
	 * 获取可变资源引用
	 * @param resourceType 资源类型
	 * @returns 可变资源引用，如果不存在则返回undefined
	 */
	public getResourceMut<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		// 在roblox-ts中，我们无法提供真正的可变引用
		// 用户需要获取资源，修改后重新插入
		return this.getResource(resourceType);
	}

	/**
	 * 使用资源执行操作
	 * @param resourceType 资源类型
	 * @param callback 操作回调
	 * @returns 操作结果
	 */
	public withResource<T extends Resource, R>(
		resourceType: ResourceConstructor<T>,
		callback: (resource: T) => R,
	): R | undefined {
		const resource = this.getResource(resourceType);
		if (resource === undefined) {
			return undefined;
		}

		return callback(resource);
	}

	/**
	 * 使用可变资源执行操作，自动重新插入修改后的资源
	 * @param resourceType 资源类型
	 * @param callback 操作回调
	 * @returns 操作结果
	 */
	public withResourceMut<T extends Resource, R>(
		resourceType: ResourceConstructor<T>,
		callback: (resource: T) => R,
	): R | undefined {
		const resource = this.getResource(resourceType);
		if (resource === undefined) {
			return undefined;
		}

		const result = callback(resource);

		// 重新插入资源以确保变更被保存
		this.insertResource(resourceType, resource);

		return result;
	}

	/**
	 * 获取所有已注册的资源类型
	 * @returns 资源ID数组
	 */
	public getResourceIds(): readonly ResourceId[] {
		const ids: ResourceId[] = [];
		for (const [id] of this.resources) {
			ids.push(id);
		}
		return ids;
	}

	/**
	 * 获取资源元数据
	 * @param resourceType 资源类型
	 * @returns 资源元数据，如果不存在则返回undefined
	 */
	public getResourceMetadata<T extends Resource>(resourceType: ResourceConstructor<T>): ResourceMetadata | undefined {
		const resourceId = this.getResourceId(resourceType);
		return this.resourceMetadata.get(resourceId);
	}

	/**
	 * 获取所有资源（用于调试和特殊情况）
	 */
	public getAllResources(): Map<ResourceId, Resource> {
		return this.resources;
	}

	/**
	 * 清空所有资源
	 */
	public clear(): void {
		this.resources.clear();
		this.resourceMetadata.clear();
	}

	/**
	 * 获取资源数量
	 * @returns 资源数量
	 */
	public getResourceCount(): number {
		return this.resources.size();
	}

	/**
	 * 初始化默认资源
	 * @param defaultResources 默认资源数组
	 */
	public initializeDefaults(
		defaultResources: Array<{ resourceType: ResourceConstructor<Resource>; instance: Resource }>,
	): void {
		for (const { resourceType, instance } of defaultResources) {
			this.insertResource(resourceType as ResourceConstructor<Resource>, instance);
		}
	}

	/**
	 * 生成资源ID
	 * @param resourceType 资源类型构造函数
	 * @returns 唯一的资源ID
	 */
	private getResourceId<T extends Resource>(resourceType: ResourceConstructor<T>): ResourceId {
		// 使用构造函数名称作为资源ID
		// 在生产环境中可能需要更健壮的ID生成策略
		return tostring(resourceType);
	}
}

/**
 * 资源装饰器 - 标记类为资源类型
 * @param target 目标类
 */
export function Resource<T extends ResourceConstructor>(target: T): T {
	// 为资源类添加特殊标记
	(target as unknown as { __isResource: boolean }).__isResource = true;
	return target;
}

/**
 * 检查类型是否为资源类型
 * @param type 要检查的类型
 * @returns 是否为资源类型
 */
export function isResourceType(resourceType: ResourceConstructor): boolean {
	return (resourceType as unknown as { __isResource?: boolean }).__isResource === true;
}

/**
 * SingletonManager - ResourceManager的别名，用于向后兼容
 */
export type SingletonManager = ResourceManager;

/**
 * 默认资源管理器实例
 * 需要在使用前通过initializeResourceManager初始化
 */
let defaultResourceManager: ResourceManager | undefined;

/**
 * 初始化默认资源管理器
 */
export function initializeResourceManager(): void {
	defaultResourceManager = new ResourceManager();
}

/**
 * 获取默认资源管理器
 * @returns 默认资源管理器实例
 * @throws 如果未初始化则抛出错误
 */
export function getResourceManager(): ResourceManager {
	if (defaultResourceManager === undefined) {
		error("Resource manager not initialized. Call initializeResourceManager first.");
	}
	return defaultResourceManager;
}

/**
 * SimpleCommandBuffer 实现 - 延迟执行命令（用于调度系统）
 */
export class SimpleCommandBuffer {
	private commands: Array<(world: any) => void> = [];

	/**
	 * 添加命令
	 */
	addCommand(command: (world: any) => void): void {
		this.commands.push(command);
	}

	/**
	 * 刷新所有命令
	 */
	flush(world: any): void {
		for (const command of this.commands) {
			command(world);
		}
		this.commands = [];
	}

	/**
	 * 清空命令
	 */
	clear(): void {
		this.commands = [];
	}

	/**
	 * 获取命令数量
	 */
	getCommandCount(): number {
		return this.commands.size();
	}
}

/**
 * 全局资源访问函数
 */
export const Resources = {
	/**
	 * 获取资源
	 */
	get<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		return getResourceManager().getResource(resourceType);
	},

	/**
	 * 插入资源
	 */
	insert<T extends Resource>(resourceType: ResourceConstructor<T>, resource: T): void {
		getResourceManager().insertResource(resourceType, resource);
	},

	/**
	 * 移除资源
	 */
	remove<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		return getResourceManager().removeResource(resourceType);
	},

	/**
	 * 检查资源是否存在
	 */
	has<T extends Resource>(resourceType: ResourceConstructor<T>): boolean {
		return getResourceManager().hasResource(resourceType);
	},

	/**
	 * 使用资源
	 */
	with<T extends Resource, R>(resourceType: ResourceConstructor<T>, callback: (resource: T) => R): R | undefined {
		return getResourceManager().withResource(resourceType, callback);
	},

	/**
	 * 使用可变资源
	 */
	withMut<T extends Resource, R>(resourceType: ResourceConstructor<T>, callback: (resource: T) => R): R | undefined {
		return getResourceManager().withResourceMut(resourceType, callback);
	},
};
