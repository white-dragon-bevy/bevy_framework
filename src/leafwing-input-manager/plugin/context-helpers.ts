/**
 * InputManager Context Helper Functions
 * 提供类型安全的 InputManagerPlugin 扩展访问
 *
 * 由于 TypeScript 不支持动态扩展类方法，使用 helper 函数模式
 * 支持多个不同 Action 类型的 InputManagerPlugin 实例
 */

import { AppContext } from "../../bevy_app/context";
import { PluginExtensions } from "../../bevy_app/extensions";
import { Actionlike } from "../actionlike";
import { InputManagerPlugin } from "./input-manager-plugin";
import { InputInstanceManagerResource } from "./input-instance-manager-resource";
import { Modding } from "@flamework/core";


/**
 * 获取特定 Action 类型的 InputManager 插件
 * 
 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
 * @metadata macro 
 * 
 * @param context - App 上下文
 * @param actionType - Action 类型构造函数
 * @returns InputManagerPlugin 实例，如果不存在则返回 undefined
 * @example
 * ```typescript
 * const plugin = getInputManagerPlugin(context, PlayerAction);
 * if (plugin) {
 *     const instanceManager = plugin.getInstanceManager();
 * }
 * ```
 */
export function getInputManagerPlugin<A extends Actionlike>(
	context: AppContext,
	actionType: (new (...args: any[]) => A) & { name: string },
	id?: Modding.Generic<A, "id">, 
	text?: Modding.Generic<A,"text">
): InputManagerPlugin<A> | undefined {
	return context.world.resources.getResource(id,text) as InputManagerPlugin<A> | undefined;

}

/**
 * 获取特定 Action 类型的实例管理器
 * 
 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
 * @metadata macro 
 * 
 * @param context - App 上下文
 * @param actionType - Action 类型构造函数
 * @returns InputInstanceManagerResource 实例，如果不存在则返回 undefined
 * @example
 * ```typescript
 * const instanceManager = getInputInstanceManager(context, PlayerAction);
 * if (instanceManager) {
 *     const actionState = instanceManager.getActionState(entity);
 * }
 * ```
 */
export function getInputInstanceManager<A extends Actionlike>(
	context: AppContext,
	actionType: (new (...args: any[]) => A) & { name: string },
	id?: Modding.Generic<A, "id">, 
	text?: Modding.Generic<A,"text">
): InputInstanceManagerResource<A> | undefined {
	return context.world.resources.getResource(id,text) as InputInstanceManagerResource<A> | undefined;
}


