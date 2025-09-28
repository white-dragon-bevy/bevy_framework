/**
 * BevyWorld - 扩展的 World 类
 * 继承 Matter World 并添加 Bevy 风格的查询方法
 */

import { CommandBuffer } from "./command-buffer";
import { EventManager, EventPropagator } from "./events";
import { World as MatterWorld } from "./matter-world";
import { MessageRegistry } from "./message";
import { ResourceManager } from "./resource";

/**
 * BevyWorld 类
 * 扩展 Matter 的 World，提供额外的查询功能
 */
export class World extends MatterWorld {
	resources: ResourceManager;
	commands: CommandBuffer;
	messages: MessageRegistry;
	events: EventManager;
	eventPropagator: EventPropagator;
	constructor() {
		super();
		this.resources = new ResourceManager();
		this.commands = new CommandBuffer();
		this.messages = new MessageRegistry(this);
		this.events = new EventManager(this);
		this.eventPropagator = new EventPropagator(this, this.events);
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
