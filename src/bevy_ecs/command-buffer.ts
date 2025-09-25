import { AnyEntity, World, AnyComponent } from "@rbxts/matter";

/**
 * 组件构造函数类型 - 兼容 Matter 的 ComponentCtor
 */
export type ComponentConstructor<T extends AnyComponent = AnyComponent> = () => T;

/**
 * 组件实例类型
 */
export type Component = AnyComponent;

/**
 * 实体ID类型（兼容Matter的AnyEntity）
 */
export type EntityId = AnyEntity;

/**
 * 命令类型枚举
 */
export enum CommandType {
	Spawn = "spawn",
	Despawn = "despawn",
	AddComponent = "add_component",
	RemoveComponent = "remove_component",
	InsertResource = "insert_resource",
	RemoveResource = "remove_resource",
}

/**
 * 基础命令接口
 */
export interface BaseCommand {
	readonly type: CommandType;
}

/**
 * 生成实体命令
 */
export interface SpawnCommand extends BaseCommand {
	readonly type: CommandType.Spawn;
	readonly components: Component[];
	readonly entityId?: EntityId;
}

/**
 * 销毁实体命令
 */
export interface DespawnCommand extends BaseCommand {
	readonly type: CommandType.Despawn;
	readonly entityId: EntityId;
}

/**
 * 添加组件命令
 */
export interface AddComponentCommand extends BaseCommand {
	readonly type: CommandType.AddComponent;
	readonly entityId: EntityId;
	readonly component: Component;
}

/**
 * 移除组件命令
 */
export interface RemoveComponentCommand extends BaseCommand {
	readonly type: CommandType.RemoveComponent;
	readonly entityId: EntityId;
	readonly componentType: ComponentConstructor;
}

/**
 * 插入资源命令
 */
export interface InsertResourceCommand extends BaseCommand {
	readonly type: CommandType.InsertResource;
	readonly resource: Component;
}

/**
 * 移除资源命令
 */
export interface RemoveResourceCommand extends BaseCommand {
	readonly type: CommandType.RemoveResource;
	readonly resourceType: ComponentConstructor;
}

/**
 * 自定义命令接口 - 兼容 Rust 的 Command trait
 */
export interface CustomCommand extends Record<string, unknown> {
	readonly type: string;
}

/**
 * 所有命令类型的联合
 */
export type Command =
	| SpawnCommand
	| DespawnCommand
	| AddComponentCommand
	| RemoveComponentCommand
	| InsertResourceCommand
	| RemoveResourceCommand
	| CustomCommand;

/**
 * 命令执行结果
 */
export interface CommandResult {
	readonly success: boolean;
	readonly entityId?: EntityId;
	readonly error?: string;
}

/**
 * 命令缓冲器 - Bevy ECS Commands系统的roblox-ts适配
 *
 * 提供延迟执行的命令系统，允许在系统中排队结构性变更，
 * 然后在安全的时机批量应用到World中
 */
// 定义资源管理器接口
interface ResourceManagerLike {
	insertResource(key: string, resource: unknown): void;
	removeResource(key: string): void;
}

export class CommandBuffer {
	private readonly commands: Command[] = [];
	private readonly pendingEntityIds = new Map<number, EntityId>();
	private nextTempEntityId = 0;
	private resourceManager?: ResourceManagerLike;

	/**
	 * 添加一个通用命令到队列 (兼容 Rust 的 queue 方法)
	 * @param command - 要添加的命令
	 */
	public queue<T extends Command | CustomCommand>(command: T): void {
		this.commands.push(command as Command);
	}

	/**
	 * 生成新实体并添加组件
	 * @param components 要添加的组件数组
	 * @returns 临时实体ID，在flush时会被替换为真实ID
	 */
	public spawn(components: Component[]): EntityId {
		const tempEntityId = this.getNextTempEntityId();

		const command: SpawnCommand = {
			type: CommandType.Spawn,
			components,
			entityId: tempEntityId,
		};

		this.commands.push(command);
		return tempEntityId;
	}

	/**
	 * 销毁指定实体
	 * @param entityId 要销毁的实体ID
	 */
	public despawn(entityId: EntityId): void {
		const command: DespawnCommand = {
			type: CommandType.Despawn,
			entityId,
		};

		this.commands.push(command);
	}

	/**
	 * 为实体添加组件
	 * @param entityId 目标实体ID
	 * @param component 要添加的组件
	 */
	public addComponent(entityId: EntityId, component: Component): void {
		const command: AddComponentCommand = {
			type: CommandType.AddComponent,
			entityId,
			component,
		};

		this.commands.push(command);
	}

	/**
	 * 从实体移除组件
	 * @param entityId 目标实体ID
	 * @param componentType 要移除的组件类型
	 */
	public removeComponent(entityId: EntityId, componentType: ComponentConstructor): void {
		const command: RemoveComponentCommand = {
			type: CommandType.RemoveComponent,
			entityId,
			componentType,
		};

		this.commands.push(command);
	}

	/**
	 * 插入全局资源
	 * @param resource 要插入的资源
	 */
	public insertResource(resource: Component): void {
		const command: InsertResourceCommand = {
			type: CommandType.InsertResource,
			resource,
		};

		this.commands.push(command);
	}

	/**
	 * 移除全局资源
	 * @param resourceType 要移除的资源类型
	 */
	public removeResource(resourceType: ComponentConstructor): void {
		const command: RemoveResourceCommand = {
			type: CommandType.RemoveResource,
			resourceType,
		};

		this.commands.push(command);
	}

	/**
	 * 设置资源管理器
	 * @param manager SingletonManager 实例
	 */
	public setResourceManager(manager: ResourceManagerLike): void {
		this.resourceManager = manager;
	}

	/**
	 * 将所有排队的命令应用到World
	 * @param world Matter World实例
	 * @param resourceManager 可选的资源管理器
	 * @returns 命令执行结果数组
	 */
	public flush(world: World, resourceManager?: ResourceManagerLike): CommandResult[] {
		// 如果提供了资源管理器，使用它
		if (resourceManager) {
			this.resourceManager = resourceManager;
		}

		const results: CommandResult[] = [];

		for (const command of this.commands) {
			try {
				const result = this.executeCommand(world, command);
				results.push(result);
			} catch (e) {
				results.push({
					success: false,
					error: tostring(e),
				});
			}
		}

		// 清空命令队列
		this.clear();

		return results;
	}

	/**
	 * 清空所有待执行的命令
	 */
	public clear(): void {
		this.commands.clear();
		this.pendingEntityIds.clear();
		this.nextTempEntityId = 0;
	}

	/**
	 * 获取当前排队的命令数量
	 * @returns 命令数量
	 */
	public getCommandCount(): number {
		return this.commands.size();
	}

	/**
	 * 检查命令缓冲器是否为空
	 * @returns 是否为空
	 */
	public isEmpty(): boolean {
		return this.commands.size() === 0;
	}

	/**
	 * 获取所有排队的命令（只读）
	 * @returns 命令数组的副本
	 */
	public getCommands(): readonly Command[] {
		return [...this.commands];
	}

	/**
	 * 执行单个命令
	 * @param world Matter World实例
	 * @param command 要执行的命令
	 * @returns 命令执行结果
	 */
	private executeCommand(world: World, command: Command): CommandResult {
		switch (command.type) {
			case CommandType.Spawn: {
				const spawnCmd = command as SpawnCommand;
				const entityId = world.spawn(...spawnCmd.components);

				// 如果有临时ID，记录映射关系
				if (spawnCmd.entityId !== undefined) {
					this.pendingEntityIds.set(spawnCmd.entityId as number, entityId);
				}

				return {
					success: true,
					entityId,
				};
			}

			case CommandType.Despawn: {
				const despawnCmd = command as DespawnCommand;
				const realEntityId = this.resolveEntityId(despawnCmd.entityId);
				world.despawn(realEntityId);

				return {
					success: true,
					entityId: realEntityId,
				};
			}

			case CommandType.AddComponent: {
				const addCmd = command as AddComponentCommand;
				const realEntityId = this.resolveEntityId(addCmd.entityId);
				world.insert(realEntityId, addCmd.component);

				return {
					success: true,
					entityId: realEntityId,
				};
			}

			case CommandType.RemoveComponent: {
				const removeCmd = command as RemoveComponentCommand;
				const realEntityId = this.resolveEntityId(removeCmd.entityId);
				world.remove(realEntityId, removeCmd.componentType as never);

				return {
					success: true,
					entityId: realEntityId,
				};
			}

			case CommandType.InsertResource: {
				const cmd = command as InsertResourceCommand;
				// 使用 SingletonManager 存储资源
				if (this.resourceManager) {
					// 将资源作为单例存储
					const resourceKey = `Resource_${tostring(cmd.resource)}`;
					this.resourceManager.insertResource(resourceKey, cmd.resource);
				}
				return { success: true };
			}

			case CommandType.RemoveResource: {
				const cmd = command as RemoveResourceCommand;
				// 使用 SingletonManager 移除资源
				if (this.resourceManager) {
					const resourceKey = `Resource_${tostring(cmd.resourceType)}`;
					this.resourceManager.removeResource(resourceKey);
				}
				return { success: true };
			}

			default: {
				// 处理自定义命令
				if ("type" in command && typeIs(command.type, "string")) {
					// 自定义命令应该由专门的处理器处理
					// 这里返回成功，实际处理在外部系统中
					return {
						success: true,
					};
				}
				return {
					success: false,
					error: `Unknown command type: ${tostring(command)}`,
				};
			}
		}
	}

	/**
	 * 解析实体ID（处理临时ID到真实ID的映射）
	 * @param entityId 实体ID
	 * @returns 真实的实体ID
	 */
	private resolveEntityId(entityId: EntityId): EntityId {
		const mappedId = this.pendingEntityIds.get(entityId as number);
		return mappedId ?? entityId;
	}

	/**
	 * 获取下一个临时实体ID
	 * @returns 临时实体ID
	 */
	private getNextTempEntityId(): EntityId {
		return this.nextTempEntityId++ as EntityId;
	}
}

/**
 * 全局命令缓冲器实例
 * 可以在需要时使用，但建议通过依赖注入传递
 */
export const globalCommandBuffer = new CommandBuffer();
