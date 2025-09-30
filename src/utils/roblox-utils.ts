/**
 * @fileoverview Roblox 运行环境工具
 * 提供服务端/客户端上下文检测功能
 */

import { RunService } from "@rbxts/services";

/**
 * Roblox 运行上下文枚举
 * 用于区分服务端和客户端环境
 *
 * @example
 * ```typescript
 * // 在插件中指定运行上下文
 * class ServerOnlyPlugin implements Plugin {
 *   readonly context = RobloxContext.Server;
 *   build(app: App): void {
 *     // 仅在服务端运行的逻辑
 *   }
 * }
 * ```
 */
export enum RobloxContext {
	/**
	 * 服务端运行环境
	 */
	Server = 1,
	/**
	 * 客户端运行环境
	 */
	Client = 2,
}

/**
 * 检查当前脚本的运行上下文是否符合要求
 * 使用 RunService 判断当前是服务端还是客户端环境
 * @param robloxContext - 期望的 Roblox 上下文，如果为 undefined 则总是返回 true
 * @returns 如果当前上下文匹配或 robloxContext 为 undefined 则返回 true，否则返回 false
 * @example
 * ```typescript
 * // 检查是否在服务端运行
 * if (isMatchRobloxContext(RobloxContext.Server)) {
 *   print("Running on server");
 * }
 *
 * // 允许任何环境（undefined）
 * if (isMatchRobloxContext(undefined)) {
 *   print("Always runs");
 * }
 * ```
 */
export function isMatchRobloxContext(robloxContext: RobloxContext | undefined): boolean {
	if (robloxContext === undefined) {
		return true;
	}

	if (RunService.IsServer()) {
		return robloxContext === RobloxContext.Server;
	} else {
		return robloxContext === RobloxContext.Client;
	}
}
