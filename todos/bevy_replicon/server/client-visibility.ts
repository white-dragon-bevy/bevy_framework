/**
 * @fileoverview 客户端可见性管理
 *
 * 控制实体对不同客户端的可见性
 */

import { Entity } from "@rbxts/matter";
import { Resource } from "../../bevy_ecs";
import { ClientId } from "../shared/backend/backend-state";

/**
 * 可见性策略
 */
export enum VisibilityPolicy {
	/** 所有实体对所有客户端可见 */
	All = "All",
	/** 黑名单模式 - 默认可见，除非明确排除 */
	Blacklist = "Blacklist",
	/** 白名单模式 - 默认不可见，除非明确包含 */
	Whitelist = "Whitelist",
}

/**
 * 可见性配置
 */
export interface VisibilityConfig {
	/** 可见性策略 */
	policy: VisibilityPolicy;
	/** 默认可见性（仅在 Blacklist/Whitelist 模式下使用） */
	defaultVisible?: boolean;
	/** 最大可见距离（可选） */
	maxDistance?: number;
}

/**
 * 客户端可见性资源
 * 管理实体对各个客户端的可见性
 */
export class ClientVisibility implements Resource {
	readonly __brand = "Resource" as const;

	/** 可见性配置 */
	private config: VisibilityConfig;
	/** 实体可见性映射 - Entity -> Set<ClientId> */
	private entityVisibility: Map<Entity, Set<ClientId>> = new Map();
	/** 客户端可见性映射 - ClientId -> Set<Entity> */
	private clientVisibility: Map<ClientId, Set<Entity>> = new Map();
	/** 全局可见的实体 */
	private globallyVisible: Set<Entity> = new Set();

	constructor(config?: Partial<VisibilityConfig>) {
		this.config = {
			policy: VisibilityPolicy.All,
			defaultVisible: true,
			...config,
		};
	}

	/**
	 * 设置实体对客户端的可见性
	 * @param entity - 实体
	 * @param clientId - 客户端 ID
	 * @param visible - 是否可见
	 */
	public setEntityVisibility(entity: Entity, clientId: ClientId, visible: boolean): void {
		// 获取或创建实体的可见性集合
		let entityClients = this.entityVisibility.get(entity);
		if (!entityClients) {
			entityClients = new Set();
			this.entityVisibility.set(entity, entityClients);
		}

		// 获取或创建客户端的可见性集合
		let clientEntities = this.clientVisibility.get(clientId);
		if (!clientEntities) {
			clientEntities = new Set();
			this.clientVisibility.set(clientId, clientEntities);
		}

		// 更新可见性
		if (visible) {
			entityClients.add(clientId);
			clientEntities.add(entity);
		} else {
			entityClients.delete(clientId);
			clientEntities.delete(entity);

			// 如果没有客户端可见，清理实体映射
			if (entityClients.size === 0) {
				this.entityVisibility.delete(entity);
			}
		}
	}

	/**
	 * 批量设置实体对多个客户端的可见性
	 * @param entity - 实体
	 * @param clientIds - 客户端 ID 数组
	 * @param visible - 是否可见
	 */
	public setEntityVisibilityBatch(entity: Entity, clientIds: ClientId[], visible: boolean): void {
		for (const clientId of clientIds) {
			this.setEntityVisibility(entity, clientId, visible);
		}
	}

	/**
	 * 设置实体对所有客户端的可见性
	 * @param entity - 实体
	 * @param visible - 是否可见
	 */
	public setEntityGlobalVisibility(entity: Entity, visible: boolean): void {
		if (visible) {
			this.globallyVisible.add(entity);
			// 清除单独的可见性设置
			this.entityVisibility.delete(entity);
		} else {
			this.globallyVisible.delete(entity);
		}
	}

	/**
	 * 检查实体对客户端是否可见
	 * @param entity - 实体
	 * @param clientId - 客户端 ID
	 * @returns 是否可见
	 */
	public isEntityVisibleToClient(entity: Entity, clientId: ClientId): boolean {
		// 检查全局可见性
		if (this.globallyVisible.has(entity)) {
			return true;
		}

		// 根据策略检查
		switch (this.config.policy) {
			case VisibilityPolicy.All:
				return true;

			case VisibilityPolicy.Blacklist: {
				const entityClients = this.entityVisibility.get(entity);
				if (!entityClients) {
					return this.config.defaultVisible ?? true;
				}
				return !entityClients.has(clientId);
			}

			case VisibilityPolicy.Whitelist: {
				const entityClients = this.entityVisibility.get(entity);
				if (!entityClients) {
					return this.config.defaultVisible ?? false;
				}
				return entityClients.has(clientId);
			}

			default:
				return false;
		}
	}

	/**
	 * 获取对客户端可见的所有实体
	 * @param clientId - 客户端 ID
	 * @returns 可见的实体数组
	 */
	public getVisibleEntities(clientId: ClientId): Entity[] {
		const visible: Entity[] = [];

		// 添加全局可见的实体
		for (const entity of this.globallyVisible) {
			visible.push(entity);
		}

		// 根据策略添加其他实体
		switch (this.config.policy) {
			case VisibilityPolicy.All:
				// 所有实体都可见（需要外部提供所有实体列表）
				break;

			case VisibilityPolicy.Blacklist:
			case VisibilityPolicy.Whitelist: {
				const clientEntities = this.clientVisibility.get(clientId);
				if (clientEntities) {
					for (const entity of clientEntities) {
						if (!this.globallyVisible.has(entity)) {
							visible.push(entity);
						}
					}
				}
				break;
			}
		}

		return visible;
	}

	/**
	 * 获取可以看到实体的所有客户端
	 * @param entity - 实体
	 * @returns 客户端 ID 数组
	 */
	public getVisibleClients(entity: Entity): ClientId[] {
		// 如果是全局可见，返回所有客户端
		if (this.globallyVisible.has(entity)) {
			const allClients: ClientId[] = [];
			for (const [clientId] of this.clientVisibility) {
				allClients.push(clientId);
			}
			return allClients;
		}

		// 返回特定的客户端列表
		const entityClients = this.entityVisibility.get(entity);
		if (!entityClients) {
			return [];
		}

		return [...entityClients];
	}

	/**
	 * 移除实体的所有可见性设置
	 * @param entity - 实体
	 */
	public removeEntity(entity: Entity): void {
		// 移除全局可见性
		this.globallyVisible.delete(entity);

		// 获取所有可以看到该实体的客户端
		const entityClients = this.entityVisibility.get(entity);
		if (entityClients) {
			// 从每个客户端的可见性列表中移除
			for (const clientId of entityClients) {
				const clientEntities = this.clientVisibility.get(clientId);
				if (clientEntities) {
					clientEntities.delete(entity);
				}
			}
			// 移除实体映射
			this.entityVisibility.delete(entity);
		}
	}

	/**
	 * 移除客户端的所有可见性设置
	 * @param clientId - 客户端 ID
	 */
	public removeClient(clientId: ClientId): void {
		// 获取客户端可以看到的所有实体
		const clientEntities = this.clientVisibility.get(clientId);
		if (clientEntities) {
			// 从每个实体的可见性列表中移除该客户端
			for (const entity of clientEntities) {
				const entityClients = this.entityVisibility.get(entity);
				if (entityClients) {
					entityClients.delete(clientId);
					// 如果没有客户端可见，清理实体映射
					if (entityClients.size === 0) {
						this.entityVisibility.delete(entity);
					}
				}
			}
			// 移除客户端映射
			this.clientVisibility.delete(clientId);
		}
	}

	/**
	 * 获取配置
	 * @returns 可见性配置
	 */
	public getConfig(): VisibilityConfig {
		return { ...this.config };
	}

	/**
	 * 更新配置
	 * @param config - 新的配置
	 */
	public updateConfig(config: Partial<VisibilityConfig>): void {
		this.config = {
			...this.config,
			...config,
		};
	}

	/**
	 * 清空所有可见性设置
	 */
	public clear(): void {
		this.entityVisibility.clear();
		this.clientVisibility.clear();
		this.globallyVisible.clear();
	}

	/**
	 * 获取统计信息
	 * @returns 统计信息
	 */
	public getStats(): {
		totalEntities: number;
		totalClients: number;
		globallyVisibleEntities: number;
		totalMappings: number;
	} {
		let totalMappings = 0;
		for (const [_, clients] of this.entityVisibility) {
			totalMappings += clients.size;
		}

		return {
			totalEntities: this.entityVisibility.size() + this.globallyVisible.size,
			totalClients: this.clientVisibility.size(),
			globallyVisibleEntities: this.globallyVisible.size,
			totalMappings,
		};
	}
}