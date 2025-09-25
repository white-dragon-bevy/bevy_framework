/**
 * App 上下文实现
 * 管理和提供插件扩展的访问接口
 */

import { World } from "@rbxts/matter";
import { ContextBase } from "./context-base";
import { CommandBuffer } from "../bevy_ecs/command-buffer";
import { Resource, ResourceConstructor, ResourceManager } from "../bevy_ecs/resource";
import { Event, EventConstructor, EventManager } from "../bevy_ecs";

/**
 * App 上下文类
 * 提供插件扩展的注册、访问和管理功能
 */
export class AppContext extends ContextBase {
	resources: ResourceManager;
	commands: CommandBuffer;
	events: EventManager;
	constructor(private world: World) {
		super();
		this.resources = new ResourceManager();
		this.commands = new CommandBuffer();
		this.events = new EventManager(this.world);	
	}

	/**
	 * 获取资源实例 （便捷方法）
	 * @param resourceType 资源类型构造函数
	 * @returns 资源实例，如果不存在则返回undefined
	 */
	public getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		return this.resources.getResource(resourceType);
	}

	/**
	 * 插入或更新资源 （便捷方法）
	 * @param resourceType 资源类型构造函数
	 * @param resource 资源实例
	 */
	public insertResource<T extends Resource>(resourceType: ResourceConstructor<T>, resource: T): void {
		return this.resources.insertResource(resourceType, resource);
	}

	/**
	 * 直接发送事件（便捷方法）
	 */
	public sendEvent<T extends Event>(eventType: EventConstructor<T>, event: T): void {
		this.events.send(eventType, event);
	}
}