/**
 * App 上下文实现
 * 管理和提供插件扩展的访问接口
 */

import { World } from "@rbxts/matter";
import { ContextBase } from "./context-base";
import { CommandBuffer } from "../bevy_ecs/command-buffer";
import { Resource, ResourceManager } from "../bevy_ecs/resource";
import { Event, EventConstructor, EventManager } from "../bevy_ecs";
import { Modding } from "@flamework/core";

/**
 * App 上下文类
 * 继承自 ContextBase，提供插件扩展的注册、访问和管理功能
 */
export class AppContext extends ContextBase {
	resources: ResourceManager;
	commands: CommandBuffer;
	events: EventManager;
	private world: World;

	constructor(world: World) {
		super();
		this.world = world;
		this.resources = new ResourceManager();
		this.commands = new CommandBuffer();
		this.events = new EventManager(this.world);
	}

	/**
	 * 插入资源
	 * 
	 * resources.insertResource 的快捷方式
	 * 
	 * @param resource - 资源实例
	 * @param id - 资源ID
	 * @param text - 资源描述
	 * @returns 返回自身以支持链式调用
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 */
	public insertResource<T extends object>(resource: T, id?: Modding.Generic<T, "id">, text?: Modding.Generic<T, "text">): this {
		this.resources.insertResource(resource, id, text);
		return this;
	}

	/**
	 * 获取资源
	 * 
	 * resources.insertResource 的快捷方式
	 * 
	 * @param id - 资源ID
	 * @param text - 资源描述
	 * @returns 资源实例或undefined
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 */
	public getResource<T extends defined>(id?: Modding.Generic<T, "id">, text?: Modding.Generic<T, "text">): T | undefined {
		return this.resources.getResource<T>(id, text);
	}
}