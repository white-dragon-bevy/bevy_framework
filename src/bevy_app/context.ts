/**
 * App 上下文实现
 * 管理和提供插件扩展的访问接口
 */


import { Modding } from "@flamework/core";
import { World } from "../bevy_ecs";

/**
 * App 上下文类
 * 继承自 ContextBase，提供插件扩展的注册、访问和管理功能
 * 同时持有 Matter World 实例的引用，用于系统访问
 */
export class AppContext {
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
		this.world = world;
	}


}