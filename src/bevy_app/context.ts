/**
 * App 上下文实现
 * 管理和提供插件扩展的访问接口
 */

import { ContextBase } from "./context-base";
import { CommandBuffer } from "../bevy_ecs/command-buffer";
import { Resource, ResourceManager } from "../bevy_ecs/resource";
import { MessageRegistry } from "../bevy_ecs/message";
import {
	EventManager,
	EventPropagator,
	Event,
	EntityEvent,
	ObserverCallback,
	ObserverConnection,
	ObserverBuilder,
	PropagationConfig,
	EventKey
} from "../bevy_ecs/events";
import { Modding } from "@flamework/core";
import { World } from "../bevy_ecs";

/**
 * App 上下文类
 * 继承自 ContextBase，提供插件扩展的注册、访问和管理功能
 * 同时持有 Matter World 实例的引用，用于系统访问
 */
export class AppContext extends ContextBase {
	/**
	 * Matter ECS World 实例
	 * 系统可以通过此实例访问ECS数据
	 */
	world: World;

	/**
	 * 创建 App 上下文
	 * @param world - Matter World 实例
	 */
	constructor(world: World) {
		super();
		this.world = world;
	}

}