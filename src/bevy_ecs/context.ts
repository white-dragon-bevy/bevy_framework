import { World } from "./bevy-world";
import { Modding } from "@flamework/core";

/**
 * 应用程序上下文类型别名
 * 提供对应用程序全局状态和配置的访问
 */
export class Context {
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

	/**
	 * 
	 * @metadata macro
	 * 
	 * @returns 
	 */
	getExtension<T extends defined>(id?:Modding.Generic<T, "id">, text?:Modding.Generic<T, "text">):T{
		return this.world.resources.getResource(id,text) as T
	}

}