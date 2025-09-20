import { AnyEntity, World } from "@rbxts/matter";
import { CommandBuffer, ComponentConstructor, Component } from "./command-buffer";
import { SingletonManager, ResourceManager, Resource, ResourceConstructor, initializeResourceManager, getResourceManager } from "./resource";
import { SystemScheduler } from "./system-scheduler";
import { MatterAdapter } from "./matter-adapter";
import { QueryFactory } from "./query";
import {
	EventManager,
	EventWriter,
	EventReader,
	Event,
	EventConstructor,
	EntitySpawnedEvent,
	EntityDespawnedEvent,
	ComponentAddedEvent,
	ComponentRemovedEvent,
} from "./events";

/**
 * World状态快照
 */
export interface WorldSnapshot {
	readonly timestamp: number;
	readonly entityCount: number;
	readonly resourceCount: number;
	readonly systemCount: number;
	readonly metadata: Record<string, unknown>;
}

/**
 * World事件类型
 */
export enum WorldEventType {
	EntitySpawned = "entity_spawned",
	EntityDespawned = "entity_despawned",
	ComponentAdded = "component_added",
	ComponentRemoved = "component_removed",
	ResourceInserted = "resource_inserted",
	ResourceRemoved = "resource_removed",
	SystemAdded = "system_added",
	SystemRemoved = "system_removed",
}

/**
 * World事件接口
 */
export interface WorldEvent {
	readonly type: WorldEventType;
	readonly timestamp: number;
	readonly entityId?: AnyEntity;
	readonly componentType?: ComponentConstructor;
	readonly systemName?: string;
	readonly data?: unknown;
}

/**
 * World事件监听器
 */
export type WorldEventListener = (event: WorldEvent) => void;

/**
 * 扩展的World类 - 在Matter World基础上添加Bevy ECS功能
 *
 * 集成命令缓冲、资源管理、系统调度、查询系统等功能
 * 提供完整的ECS生态系统
 */
export class ExtendedWorld {
	private readonly world: World;
	private readonly commandBuffer: CommandBuffer;
	private readonly resourceManager: SingletonManager;
	private readonly systemScheduler: SystemScheduler;
	private readonly matterAdapter: MatterAdapter;
	private readonly queryFactory: QueryFactory;
	private readonly eventManager: EventManager;

	private nextFrameCallbacks: Array<() => void> = [];
	private frameCount = 0;
	private lastFrameTime = 0;
	private isRunning = false;
	private debugMode = false;

	/**
	 * 创建扩展World
	 * @param world Matter World实例
	 */
	constructor(world: World) {
		this.world = world;
		this.commandBuffer = new CommandBuffer();
		this.resourceManager = new ResourceManager();
		this.matterAdapter = new MatterAdapter(world);
		this.systemScheduler = new SystemScheduler(world, this.resourceManager, this.commandBuffer);
		this.queryFactory = new QueryFactory(world, this.matterAdapter);
		this.eventManager = new EventManager(world);

		// 初始化全局资源管理器
		initializeResourceManager();
	}

	/**
	 * 获取Matter World实例
	 * @returns Matter World
	 */
	public getWorld(): World {
		return this.world;
	}

	/**
	 * 获取命令缓冲器
	 * @returns 命令缓冲器实例
	 */
	public getCommandBuffer(): CommandBuffer {
		return this.commandBuffer;
	}

	/**
	 * 获取资源管理器
	 * @returns 资源管理器实例
	 */
	public getResourceManager(): SingletonManager {
		return this.resourceManager;
	}

	/**
	 * 获取系统调度器
	 * @returns 系统调度器实例
	 */
	public getSystemScheduler(): SystemScheduler {
		return this.systemScheduler;
	}

	/**
	 * 获取查询工厂
	 * @returns 查询工厂实例
	 */
	public getQueryFactory(): QueryFactory {
		return this.queryFactory;
	}

	/**
	 * 获取Matter适配器
	 * @returns Matter适配器实例
	 */
	public getMatterAdapter(): MatterAdapter {
		return this.matterAdapter;
	}

	/**
	 * 获取事件管理器
	 * @returns 事件管理器实例
	 */
	public getEventManager(): EventManager {
		return this.eventManager;
	}

	/**
	 * 创建事件写入器 - 对应 Bevy 的 EventWriter<T>
	 * @param eventType 事件类型
	 * @returns 事件写入器
	 */
	public createEventWriter<T extends Event>(eventType: EventConstructor<T>): EventWriter<T> {
		return this.eventManager.createWriter(eventType);
	}

	/**
	 * 创建事件读取器 - 对应 Bevy 的 EventReader<T>
	 * @param eventType 事件类型
	 * @returns 事件读取器
	 */
	public createEventReader<T extends Event>(eventType: EventConstructor<T>): EventReader<T> {
		return this.eventManager.createReader(eventType);
	}

	/**
	 * 生成实体
	 * @param components 组件数组
	 * @returns 实体ID
	 */
	public spawn(...components: Component[]): AnyEntity {
		const entityId = this.world.spawn(...components);

		// 发送新的 Bevy 风格事件
		this.eventManager.send(EntitySpawnedEvent, new EntitySpawnedEvent(entityId, components.size()));

		return entityId;
	}

	/**
	 * 销毁实体
	 * @param entityId 实体ID
	 */
	public despawn(entityId: AnyEntity): void {
		if (this.world.contains(entityId)) {
			this.world.despawn(entityId);

			// 发送新的 Bevy 风格事件
			this.eventManager.send(EntityDespawnedEvent, new EntityDespawnedEvent(entityId));
		}
	}

	/**
	 * 为实体添加组件
	 * @param entityId 实体ID
	 * @param component 组件实例
	 */
	public addComponent(entityId: AnyEntity, component: Component): void {
		if (this.world.contains(entityId)) {
			this.world.insert(entityId, component);
			const componentType = getmetatable(component) as ComponentConstructor;

			// 发送新的 Bevy 风格事件
			this.eventManager.send(ComponentAddedEvent, new ComponentAddedEvent(entityId, tostring(componentType)));
		}
	}

	/**
	 * 从实体移除组件
	 * @param entityId 实体ID
	 * @param componentType 组件类型
	 */
	public removeComponent(entityId: AnyEntity, componentType: ComponentConstructor): void {
		if (this.world.contains(entityId)) {
			this.world.remove(entityId, componentType as never);

			// 发送新的 Bevy 风格事件
			this.eventManager.send(ComponentRemovedEvent, new ComponentRemovedEvent(entityId, tostring(componentType)));
		}
	}

	/**
	 * 获取实体组件
	 * @param entityId 实体ID
	 * @param componentType 组件类型
	 * @returns 组件实例，如果不存在则返回undefined
	 */
	public getComponent<T extends Component>(
		entityId: AnyEntity,
		componentType: ComponentConstructor<T>,
	): T | undefined {
		if (!this.world.contains(entityId)) {
			return undefined;
		}
		return this.world.get(entityId, componentType as never) as T | undefined;
	}

	/**
	 * 检查实体是否包含组件
	 * @param entityId 实体ID
	 * @param componentType 组件类型
	 * @returns 是否包含组件
	 */
	public hasComponent<T extends Component>(entityId: AnyEntity, componentType: ComponentConstructor<T>): boolean {
		return this.getComponent(entityId, componentType) !== undefined;
	}

	/**
	 * 插入资源
	 * @param resource 资源实例
	 */
	public insertResource<T extends Resource>(resourceType: ResourceConstructor<T>, resource: T): void {
		this.resourceManager.insertResource(resourceType, resource);
		// 发送资源插入事件（如果需要的话，可以在这里添加新的事件系统）
	}

	/**
	 * 获取资源
	 * @param resourceType 资源类型
	 * @returns 资源实例，如果不存在则返回undefined
	 */
	public getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		return this.resourceManager.getResource(resourceType);
	}

	/**
	 * 移除资源
	 * @param resourceType 资源类型
	 * @returns 被移除的资源实例，如果不存在则返回undefined
	 */
	public removeResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		const resource = this.resourceManager.removeResource(resourceType);
		// 发送资源移除事件（如果需要的话，可以在这里添加新的事件系统）
		return resource;
	}

	/**
	 * 运行单帧
	 * @param deltaTime 帧间隔时间
	 */
	public step(deltaTime: number): void {
		const frameStart = os.clock();
		this.lastFrameTime = deltaTime;

		// 运行系统调度器
		this.systemScheduler.run(deltaTime);

		// 清理事件系统
		this.eventManager.cleanup();

		// 处理下一帧回调
		const callbacks = this.nextFrameCallbacks;
		this.nextFrameCallbacks = [];
		for (const callback of callbacks) {
			try {
				callback();
			} catch (error) {
				warn(`[ExtendedWorld] Next frame callback failed: ${tostring(error)}`);
			}
		}

		this.frameCount++;

		if (this.debugMode) {
			const frameTime = os.clock() - frameStart;
			if (frameTime > 0.016) {
				// 超过16ms时警告
				warn(`[ExtendedWorld] Frame took ${frameTime * 1000}ms (frame ${this.frameCount})`);
			}
		}
	}

	/**
	 * 开始运行World（通过RunService.Heartbeat）
	 */
	public start(): void {
		if (this.isRunning) {
			return;
		}

		this.isRunning = true;

		// 可以在这里添加清理逻辑
	}

	/**
	 * 停止运行World
	 */
	public stop(): void {
		this.isRunning = false;
		// 连接会在start()方法中创建，这里简化处理
	}

	/**
	 * 添加下一帧回调
	 * @param callback 回调函数
	 */
	public nextFrame(callback: () => void): void {
		this.nextFrameCallbacks.push(callback);
	}

	/**
	 * 创建World快照
	 * @returns World快照
	 */
	public createSnapshot(): WorldSnapshot {
		const entities = this.matterAdapter.getAllEntities();

		return {
			timestamp: os.clock(),
			entityCount: entities.size(),
			resourceCount: this.resourceManager.getResourceCount(),
			systemCount: this.systemScheduler.getSystemNames().size(),
			metadata: {
				frameCount: this.frameCount,
				lastFrameTime: this.lastFrameTime,
				isRunning: this.isRunning,
			},
		};
	}

	/**
	 * 启用或禁用调试模式
	 * @param enabled 是否启用调试模式
	 */
	public setDebugMode(enabled: boolean): void {
		this.debugMode = enabled;
		if (enabled) {
			print("[ExtendedWorld] Debug mode enabled");
		}
	}

	/**
	 * 获取World统计信息
	 * @returns 统计信息对象
	 */
	public getStats(): Record<string, unknown> {
		const snapshot = this.createSnapshot();
		const schedulerStats = this.systemScheduler.getStats();

		return {
			world: snapshot,
			scheduler: schedulerStats,
			commandBuffer: {
				pendingCommands: this.commandBuffer.getCommandCount(),
				isEmpty: this.commandBuffer.isEmpty(),
			},
		};
	}

	/**
	 * 清理World资源
	 */
	public cleanup(): void {
		this.stop();
		this.commandBuffer.clear();
		this.resourceManager.clear();
		this.systemScheduler.resetStats();
		this.nextFrameCallbacks.clear();
	}
}

/**
 * World构建器 - 提供便捷的World配置和创建
 */
export class WorldBuilder {
	private readonly world: World;
	private readonly extendedWorld: ExtendedWorld;
	private readonly defaultResources: Array<{ resourceType: ResourceConstructor; instance: Resource }> = [];
	private debugMode = false;

	/**
	 * 创建World构建器
	 * @param world Matter World实例（可选）
	 */
	constructor(world?: World) {
		this.world = world || new World();
		this.extendedWorld = new ExtendedWorld(this.world);
	}

	/**
	 * 添加默认资源
	 * @param resource 资源实例
	 * @returns World构建器（链式调用）
	 */
	public withResource(resourceType: ResourceConstructor, resource: Resource): WorldBuilder {
		this.defaultResources.push({ resourceType, instance: resource });
		return this;
	}

	/**
	 * 启用调试模式
	 * @returns World构建器（链式调用）
	 */
	public withDebugMode(): WorldBuilder {
		this.debugMode = true;
		return this;
	}

	/**
	 * 添加系统
	 * @param name 系统名称
	 * @param systemFunction 系统函数
	 * @param priority 优先级
	 * @returns World构建器（链式调用）
	 */
	public withSystem(
		name: string,
		systemFunction: (world: World, deltaTime: number, resources: SingletonManager, commands: CommandBuffer) => void,
		priority: number = 0,
	): WorldBuilder {
		this.extendedWorld.getSystemScheduler().addSystem(name, systemFunction, priority);
		return this;
	}

	/**
	 * 构建并返回ExtendedWorld
	 * @returns ExtendedWorld实例
	 */
	public build(): ExtendedWorld {
		// 插入默认资源
		for (const { resourceType, instance } of this.defaultResources) {
			this.extendedWorld.insertResource(resourceType as ResourceConstructor<Resource>, instance);
		}

		// 设置调试模式
		this.extendedWorld.setDebugMode(this.debugMode);

		return this.extendedWorld;
	}
}

/**
 * 创建新的World构建器
 * @param world Matter World实例（可选）
 * @returns World构建器
 */
export function createWorldBuilder(world?: World): WorldBuilder {
	return new WorldBuilder(world);
}

/**
 * 创建默认的ExtendedWorld
 * @returns ExtendedWorld实例
 */
export function createDefaultWorld(): ExtendedWorld {
	return new WorldBuilder().build();
}
