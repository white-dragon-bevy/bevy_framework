/**
 * InputManagerPlugin 扩展声明
 * 将 InputManagerPlugin 注册到 AppContext 扩展系统
 *
 * 支持多个不同 Action 类型的 InputManagerPlugin 实例
 * 每个插件使用动态键: "input-manager:ActionTypeName"
 */

import { Actionlike } from "../actionlike";
import { InputManagerPlugin } from "./input-manager-plugin";
import { InputInstanceManagerResource } from "./input-instance-manager-resource";

/**
 * InputManager 扩展接口
 * 提供对 InputManagerPlugin 实例和 InputInstanceManager 的访问
 */
export interface InputManagerExtension<A extends Actionlike = Actionlike> {
	/**
	 * 获取 InputManagerPlugin 实例
	 */
	getPlugin(): InputManagerPlugin<A>;

	/**
	 * 获取 InputInstanceManagerResource 实例
	 */
	getInstanceManager(): InputInstanceManagerResource<A>;
}

/**
 * 声明扩展到 PluginExtensions
 *
 * 注意：由于 TypeScript 限制，无法声明动态键模式
 * 实际使用时，键的格式为: "input-manager:ActionTypeName"
 * 例如:
 * - "input-manager:PlayerAction"
 * - "input-manager:MenuAction"
 * - "input-manager:CameraAction"
 *
 * 使用 context-helpers.ts 中的辅助函数来访问这些扩展
 */
declare module "../../bevy_app/extensions" {
	interface PluginExtensions {
		// 动态键将在运行时通过 context-helpers 注册
		// 格式: "input-manager:${actionTypeName}": InputManagerExtension
	}
}