/**
 * 热更新系统模块示例
 *
 * 此文件展示了如何编写热更新系统模块
 *
 * 使用方法：
 * 1. 将此文件编译后的 Lua 代码放到 ReplicatedStorage/HotSystems 中
 * 2. 修改代码后会自动热更新
 */

import type { World } from "../../../../bevy_ecs";
import type { Context } from "../../../../bevy_ecs";
import { BuiltinSchedules } from "../../../../bevy_app/main-schedule";

/**
 * 方式 1：纯函数导出（最简单）
 * 使用容器的默认配置（schedule, defaultSet）
 */
export function simpleSystem(world: World, context: Context) {
	print(`[SimpleSystem] 每帧执行`);
}

/**
 * 方式 2：具名导出 + 配置对象
 * 可以覆盖默认配置
 */
export const playerSystem = {
	system: (world: World, context: Context) => {
		print(`[PlayerSystem] 玩家数量: ${game.GetService("Players").GetPlayers().size()}`);
	},
	// 使用默认 schedule
	inSet: "Player",
};

/**
 * 方式 3：带依赖关系的系统
 */
export const movementSystem = {
	system: (world: World, context: Context) => {
		print(`[MovementSystem] 处理玩家移动`);
	},
	// 在 PlayerSystem 之后运行
	after: ["Player"],
	inSet: "Movement",
};

/**
 * 方式 4：条件执行的系统
 */
export const debugSystem = {
	system: (world: World, context: Context) => {
		print(`[DebugSystem] 调试信息 5555`);
	},
	// 只在 Studio 环境运行
	runIf: (world: World) => {
		return game.GetService("RunService").IsStudio();
	},
	inSet: "Debug",
};

/**
 * 方式 5：覆盖调度的系统
 */
export const renderSystem = {
	system: (world: World, context: Context) => {
		print(`[RenderSystem] 渲染帧`);
	},
	// 使用不同的调度
	schedule: BuiltinSchedules.POST_UPDATE,
	inSet: "Render",
};

/**
 * 方式 6：环境配置
 */
export const serverOnlySystem = {
	system: (world: World, context: Context) => {
		print(`[ServerOnlySystem] 服务端逻辑`);
	},
	// 仅在服务端运行
	env: {
		production: {
			disableClient: true,
			disableServer: false,
		},
	},
};

/**
 * 方式 7：默认导出（兼容模式）
 */
export default {
	system: (world: World, context: Context) => {
		print(`[DefaultSystem] 默认导出系统`);
	},
	inSet: "Default",
};
