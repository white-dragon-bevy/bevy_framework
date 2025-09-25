/**
 * RVO 清理系统
 * 用于清理 RVO 资源和状态
 */

import { BevyWorld } from "../../bevy_ecs/bevy-world";
import { Context } from "../../bevy_ecs/types";
import { RVOSimulatorResource } from "../resources/rvo-simulator";

/**
 * 清理 RVO 系统
 * @param world - ECS 世界实例
 * @param context - 系统上下文
 */
export function cleanupRVOSystem(world: BevyWorld, context: Context): void {
	// 获取模拟器资源
	const simulatorResource = context.getResource(RVOSimulatorResource);
	if (!simulatorResource) {
		return;
	}

	// 清理资源
	simulatorResource.cleanup();

	print("[RVO] System cleaned up");
}