/**
 * BevyWorld - 扩展的 World 类
 * 继承 Matter World 并添加 Bevy 风格的查询方法
 */

import { World } from "./matter-world";

// 导出 Matter 的 World 类型
export { World } from "@rbxts/matter";

/**
 * BevyWorld 类
 * 扩展 Matter 的 World，提供额外的查询功能
 */
export class BevyWorld extends World {
	constructor() {
		super();
	}
}

// WorldContainer 类型（用于兼容）
export interface WorldContainer {
	world: BevyWorld;
	getWorld(): BevyWorld;
}

// 创建 WorldContainer
export function createWorldContainer(): WorldContainer {
	const world = new BevyWorld();
	return {
		world,
		getWorld() {
			return world;
		},
	};
}
