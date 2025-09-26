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

}