/**
 * World 的继承和兼容层
 */

import { World } from "@rbxts/matter";

// 导出 Matter 的 World
export { World } from "@rbxts/matter";

// 以后会扩展
export const BevyWorld = World;

// WorldContainer 类型（用于兼容）
export interface WorldContainer {
	world: World;
	getWorld(): World;
}

// 创建 WorldContainer
export function createWorldContainer(): WorldContainer {
	const world = new World();
	return {
		world,
		getWorld() {
			return world;
		},
	};
}
