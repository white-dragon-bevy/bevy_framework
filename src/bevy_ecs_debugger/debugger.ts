/**
 * Debugger 封装
 *
 * 从 bull-ecs start.ts 迁移的 getDebugger 逻辑，提供调试器实例的创建和配置。
 *
 * @module debugger
 */

import { World } from "@rbxts/matter";
import Debugger from "./matter-debugger/debugger";
import Plasma from "@rbxts/plasma";
import type { DebuggerOptions, IDebugger } from "./types";

const RunService = game.GetService("RunService");

/**
 * 创建并配置 Matter Debugger 实例
 *
 * 创建一个完全配置好的调试器实例，包括：
 * - 实体到模型的映射
 * - 权限验证逻辑
 * - Plasma UI 集成
 *
 * 对应原项目 start.ts:18-45 getDebugger 函数
 *
 * @param world - Matter World 实例
 * @param options - 调试器配置选项
 * @param getRenderableComponent - 获取实体对应 Renderable 组件的回调函数，用于将实体关联到 3D 模型
 * @returns 配置好的 Debugger 实例
 *
 * @example
 * ```typescript
 * const world = new World();
 * const debugger = createDebugger(
 *     world,
 *     { toggleKey: Enum.KeyCode.F4, groupId: 123456 },
 *     (entityId) => world.get(entityId, Renderable)
 * );
 * ```
 */
export function createDebugger(
	world: World,
	options: DebuggerOptions,
	getRenderableComponent?: (entityId: number) => { model: Model } | undefined,
): IDebugger {
	// 设置调试器
	const myDebugger = new Debugger(Plasma);

	// 添加调试日志
	const isServer = RunService.IsServer();

	// 配置查找实体对应模型的方法
	// 对应 start.ts:24-32
	myDebugger.findInstanceFromEntity = (id): Model | undefined => {
		if (!world.contains(id)) {
			return;
		}

		// 使用提供的组件获取器，如果没有则返回 undefined
		if (getRenderableComponent) {
			const renderable = getRenderableComponent(id);
			return renderable ? renderable.model : undefined;
		}

		return undefined;
	};

	// 配置授权验证
	// 对应 start.ts:34-43
	myDebugger.authorize = (player: Player): boolean => {
		const groupId = options.groupId;
		const studio = RunService.IsStudio();
		if (groupId === undefined) {
			return studio;
		}

		const role = player.GetRoleInGroup(groupId);
		return studio || role === "Admin" || role === "Owner";
	};

	// 在客户端添加日志说明
	if (!isServer) {
	}

	return myDebugger as IDebugger;
}
