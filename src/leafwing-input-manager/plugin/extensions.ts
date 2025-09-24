/**
 * InputManagerPlugin 扩展声明
 * 将 InputManagerPlugin 注册到 AppContext 扩展系统
 */

import { Actionlike } from "../core/actionlike";
import { InputManagerPlugin } from "./input-manager-plugin";

/**
 * InputManager 扩展接口
 * 提供对 InputManagerPlugin 实例的访问
 */
export interface InputManagerExtension<A extends Actionlike = Actionlike> {
	/**
	 * 获取 InputManagerPlugin 实例
	 */
	getPlugin(): InputManagerPlugin<A>;
}

// 声明扩展到 PluginExtensions
declare module "../../bevy_app/extensions" {
	interface PluginExtensions {
		"input-manager": InputManagerExtension;
	}
}