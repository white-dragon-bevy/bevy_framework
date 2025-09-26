import { Modding } from "@flamework/core";
import { getTypeDescriptor, TypeDescriptor } from "../bevy_core";
import { ComponentId, getComponentId, getComponentIdByDescriptor } from "./commponent/component-id";

/**
 * 资源标识符 - 用于唯一标识资源类型
 */
export type ResourceId = string;

/**
 * 资源构造函数类型
 */
export type ResourceConstructor<T = unknown> = (new (...args: never[]) => T) | string;

/**
 * 资源基础接口
 */
export interface Resource {}

/**
 * 资源元数据
 */
export interface ResourceMetadata {
	readonly typeDescriptor: TypeDescriptor;
	readonly created: number;
	readonly updated: number;
}

/**
 * 资源管理器 - 实现Bevy的Resource系统
 *
 * 直接使用Map存储资源，完全独立于ECS组件系统
 */
export class ResourceManager {
	private readonly resources = new Map<ComponentId, object>();
	private readonly resourceMetadata = new Map<ComponentId, ResourceMetadata>();

	/**
	 * 创建资源管理器
	 */
	constructor() {}

	/** 
	 * 获取资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro 
	 * 
	 * */
	public getResource<T extends defined>( id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">): T | undefined {
		
		if(id===undefined || text===undefined){
			
			return undefined
		}
		
		const componentId = getComponentId(id,text)
		return this.resources.get(componentId) as T
	}

	/** 
	 * 获取资源，如果不存在则创建默认实例
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro 
	 * 
	 * @param resourceType 资源类构造函数
	 * @param id 可选的类型ID（用于宏）
	 * @param text 可选的类型文本（用于宏）
	 * @returns 资源实例
	 * 
	 * */
	public getOrInsertDefaultResource<T extends defined>(
		resourceType: new () => T, 
		id?: Modding.Generic<T, "id">, 
		text?: Modding.Generic<T, "text">
	): T {
		// 首先尝试获取现有资源
		const existingResource = this.getResource<T>(id, text);
		if (existingResource !== undefined) {
			return existingResource;
		}

		// 如果不存在，创建新实例并插入
		const newResource = new resourceType();
		this.insertResource<T>(newResource, id, text);
		return newResource;
	}




	/**
	 * 使用资源执行操作
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * @param callback 操作回调
	 * @param id 可选的类型ID（用于宏）
	 * @param text 可选的类型文本（用于宏）
	 * @returns 操作结果
	 */
	public withResource<T extends defined>(
		callback: (resource: T) => void,
		id?: Modding.Generic<T, "id">, 
		text?: Modding.Generic<T, "text">
	): ResourceManager {
		const resource = this.getResource<T>(id, text);
		if (resource === undefined) {
			return this;
		}
		callback(resource);

		return this;
	}

	/**
	 * 使用可变资源执行操作，自动重新插入修改后的资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * @param callback 操作回调
	 * @param id 可选的类型ID（用于宏）
	 * @param text 可选的类型文本（用于宏）
	 * @returns 操作结果
	 */
	public withResourceMut<T extends defined>(
		callback: (resource: T) => void,
		id?: Modding.Generic<T, "id">, 
		text?: Modding.Generic<T, "text">
	): ResourceManager {
		const resource = this.getResource<T>(id, text);
		if (resource === undefined) {
			return this;
		}
		callback(resource);

		// 重新插入资源以确保变更被保存
		this.insertResource(resource as T, id, text);

		return this;
	}

	/** 
	 * 插入资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * */
	public insertResource<T>(resource:T, id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">) {
		if(id===undefined || text===undefined){
			error(`insertResource: can't get type descriptor for ${id} ${text}`)
		}
		const descriptor = getTypeDescriptor(id,text)!
		const componentId = getComponentId(id,text)

		// 直接存储资源
		this.resources.set(componentId, resource as object);

		const now = os.clock();

		const existingMetadata = this.resourceMetadata.get(componentId);


		// 更新元数据
		if (existingMetadata) {
			this.resourceMetadata.set(componentId, {
				...existingMetadata,
				updated: now,
			});
		} else {
			this.resourceMetadata.set(componentId, {
				typeDescriptor: descriptor,
				created: now,
				updated: now,
			});
		}
	}



	/**
	 * 移除资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * @returns 被移除的资源实例，如果不存在则返回undefined
	 */
	public removeResource<T extends Resource>(id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">): T|undefined {
		if(id===undefined || text===undefined){
			
			return undefined
		}
		
		const componentId = getComponentId(id,text)

		const resource = this.resources.get(componentId);

		// 清理资源和元数据
		this.resources.delete(componentId);
		this.resourceMetadata.delete(componentId);

		return resource as T;
	}

	/**
	 * 检查资源是否存在
	 *
	 * @metadata macro
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 *
	 * @param resourceType 资源类型
	 * @returns 资源是否存在
	 */
	public hasResource<T >(id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">): boolean {
		if(id===undefined || text===undefined){
			
			return false
		}
		const componentId = getComponentId(id,text)
		return this.resources.has(componentId);
	}

	/**
	 * 获取所有已注册的资源类型
	 * @returns 资源ID数组
	 */
	public getResourceIds(): readonly ComponentId[] {
		const ids: ComponentId[] = [];
		for (const [id] of this.resources) {
			ids.push(id);
		}
		return ids;
	}

	/**
	 * 获取资源元数据
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * @metadata macro 
	 * @param resourceType 资源类型
	 * @returns 资源元数据，如果不存在则返回undefined
	 */
	public getResourceMetadata<T extends Resource>(id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">): ResourceMetadata | undefined {
		if(id===undefined || text===undefined){
			return undefined
		}
		const componentId = getComponentId(id,text)
		return this.resourceMetadata.get(componentId);
	}

	/**
	 * 获取所有资源（用于调试和特殊情况）
	 */
	public getAllResources(): Map<ComponentId, Resource> {
		return this.resources;
	}

	/**
	 * 通过ID获取资源元数据
	 * @param resourceId 资源ID
	 * @returns 资源元数据，如果不存在则返回undefined
	 */
	public getResourceMetadataById(resourceId: ComponentId): ResourceMetadata | undefined {
		return this.resourceMetadata.get(resourceId);
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
	 * 清空所有资源
	 */
	public clearResources(): void {
		this.resources.clear();
		this.resourceMetadata.clear();
	}
}
