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

	/**
	 * 清除内部跟踪器
	 * 对应 Rust World::clear_trackers()
	 * 在 Matter 中这个操作可能不需要，但为了保持 API 兼容性而添加
	 */
	clearTrackers(): void {
		// Matter 不需要显式清除跟踪器
		// 这个方法主要是为了与 Rust Bevy API 保持一致
		// 未来如果需要，可以在这里添加清理逻辑
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
