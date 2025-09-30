/**
 * @fileoverview 客户端可见性管理
 *
 * 控制实体对不同客户端的可见性
 */

import { Entity } from "@rbxts/matter";
import { Resource } from "../../../src/bevy_ecs";
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
 * 可见性变更记录
 */
export interface VisibilityChange {
	readonly entity: Entity;
	readonly clientId: ClientId;
	readonly wasVisible: boolean;
	readonly isVisible: boolean;
}

/**
 * 可见性变更集合
 */
export interface VisibilityChangeSet {
	readonly becameVisible: Array<[Entity, ClientId]>;
	readonly becameHidden: Array<[Entity, ClientId]>;
	readonly unchanged: Array<[Entity, ClientId]>;
}

/**
 * 可见性性能统计
 */
export interface VisibilityPerformanceStats {
	readonly lastQueryTime: number;
	readonly lastUpdateTime: number;
	readonly queriesPerSecond: number;
	readonly updatesPerSecond: number;
	readonly totalQueries: number;
	readonly totalUpdates: number;
	readonly cacheHitRate: number;
	readonly memoryUsage: {
		readonly entityVisibilityMB: number;
		readonly clientVisibilityMB: number;
		readonly changeTrackingMB: number;
		readonly cacheMB: number;
	};
}

/**
 * 缓存条目
 */
interface CacheEntry {
	readonly result: boolean;
	readonly timestamp: number;
}

/**
 * 变更追踪配置
 */
export interface ChangeTrackingConfig {
	readonly enabled: boolean;
	readonly maxHistorySize: number;
	readonly enablePerformanceTracking: boolean;
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

	// 变更检测相关
	/** 变更追踪配置 */
	private changeTrackingConfig: ChangeTrackingConfig;
	/** 上一帧的可见性状态 - [Entity, ClientId] -> boolean */
	private previousVisibility: Map<string, boolean> = new Map();
	/** 当前帧的可见性状态 - [Entity, ClientId] -> boolean */
	private currentVisibility: Map<string, boolean> = new Map();
	/** 变更历史 */
	private changeHistory: Array<VisibilityChange> = [];

	// 性能优化相关
	/** 查询缓存 - [Entity, ClientId] -> CacheEntry */
	private queryCache: Map<string, CacheEntry> = new Map();
	/** 缓存过期时间（毫秒） */
	private readonly cacheExpirationMs = 100;

	// 性能统计
	private performanceStats = {
		totalQueries: 0,
		totalUpdates: 0,
		cacheHits: 0,
		lastQueryTime: 0,
		lastUpdateTime: 0,
		queryTimes: [] as Array<number>,
		updateTimes: [] as Array<number>,
	};

	constructor(
		config?: Partial<VisibilityConfig>,
		changeTrackingConfig?: Partial<ChangeTrackingConfig>,
	) {
		this.config = {
			policy: VisibilityPolicy.All,
			defaultVisible: true,
			...config,
		};

		this.changeTrackingConfig = {
			enabled: false,
			maxHistorySize: 1000,
			enablePerformanceTracking: false,
			...changeTrackingConfig,
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
			if (entityClients.size() === 0) {
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
		const startTime = this.changeTrackingConfig.enablePerformanceTracking ? os.clock() : 0;
		this.performanceStats.totalQueries++;

		// 生成缓存键
		const cacheKey = `${entity}-${clientId}`;

		// 检查缓存
		const cachedEntry = this.queryCache.get(cacheKey);
		if (cachedEntry && os.clock() * 1000 - cachedEntry.timestamp < this.cacheExpirationMs) {
			this.performanceStats.cacheHits++;
			return cachedEntry.result;
		}

		// 计算实际可见性
		let result: boolean;

		// 检查全局可见性
		if (this.globallyVisible.has(entity)) {
			result = true;
		} else {
			// 根据策略检查
			switch (this.config.policy) {
				case VisibilityPolicy.All:
					result = true;
					break;

				case VisibilityPolicy.Blacklist: {
					const entityClients = this.entityVisibility.get(entity);
					if (!entityClients) {
						result = this.config.defaultVisible ?? true;
					} else {
						result = !entityClients.has(clientId);
					}
					break;
				}

				case VisibilityPolicy.Whitelist: {
					const entityClients = this.entityVisibility.get(entity);
					if (!entityClients) {
						result = this.config.defaultVisible ?? false;
					} else {
						result = entityClients.has(clientId);
					}
					break;
				}

				default:
					result = false;
			}
		}

		// 更新缓存
		this.queryCache.set(cacheKey, {
			result,
			timestamp: os.clock() * 1000,
		});

		// 记录性能统计
		if (this.changeTrackingConfig.enablePerformanceTracking) {
			const queryTime = os.clock() - startTime;
			this.performanceStats.lastQueryTime = queryTime;
			this.performanceStats.queryTimes.push(queryTime);

			// 保持查询时间历史在合理范围内
			if (this.performanceStats.queryTimes.size() > 1000) {
				const newTimes: Array<number> = [];
				for (let index = 1; index < this.performanceStats.queryTimes.size(); index++) {
					newTimes.push(this.performanceStats.queryTimes[index]);
				}
				this.performanceStats.queryTimes = newTimes;
			}
		}

		return result;
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
					if (entityClients.size() === 0) {
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
			totalMappings += clients.size();
		}

		return {
			totalEntities: this.entityVisibility.size() + this.globallyVisible.size(),
			totalClients: this.clientVisibility.size(),
			globallyVisibleEntities: this.globallyVisible.size(),
			totalMappings,
		};
	}

	// ===== 变更检测功能 =====

	/**
	 * 生成实体-客户端键
	 * @param entity - 实体
	 * @param clientId - 客户端 ID
	 * @returns 键字符串
	 */
	private generateKey(entity: Entity, clientId: ClientId): string {
		return `${entity}-${clientId}`;
	}

	/**
	 * 计算指定实体的可见性变更
	 * @param entities - 要检查的实体列表
	 * @returns 变更集合
	 */
	public computeChanges(entities: Entity[]): VisibilityChangeSet {
		if (!this.changeTrackingConfig.enabled) {
			return {
				becameVisible: [],
				becameHidden: [],
				unchanged: [],
			};
		}

		const startTime = this.changeTrackingConfig.enablePerformanceTracking ? os.clock() : 0;
		this.performanceStats.totalUpdates++;

		const becameVisible: Array<[Entity, ClientId]> = [];
		const becameHidden: Array<[Entity, ClientId]> = [];
		const unchanged: Array<[Entity, ClientId]> = [];

		// 获取所有活跃的客户端
		const activeClients: ClientId[] = [];
		for (const [clientId] of this.clientVisibility) {
			activeClients.push(clientId);
		}

		// 检查每个实体对每个客户端的可见性变更
		for (const entity of entities) {
			for (const clientId of activeClients) {
				const key = this.generateKey(entity, clientId);
				const wasVisible = this.previousVisibility.get(key) ?? false;
				const isVisible = this.isEntityVisibleToClient(entity, clientId);

				// 更新当前可见性状态
				this.currentVisibility.set(key, isVisible);

				// 检查是否有变更
				if (wasVisible !== isVisible) {
					const change: VisibilityChange = {
						entity,
						clientId,
						wasVisible,
						isVisible,
					};

					// 添加到变更历史
					this.changeHistory.push(change);

					// 分类变更
					if (isVisible) {
						becameVisible.push([entity, clientId]);
					} else {
						becameHidden.push([entity, clientId]);
					}
				} else {
					unchanged.push([entity, clientId]);
				}
			}
		}

		// 限制变更历史大小
		if (this.changeHistory.size() > this.changeTrackingConfig.maxHistorySize) {
			const excessCount = this.changeHistory.size() - this.changeTrackingConfig.maxHistorySize;
			// 移除多余的历史记录
			const newHistory: Array<VisibilityChange> = [];
			for (let index = excessCount; index < this.changeHistory.size(); index++) {
				newHistory.push(this.changeHistory[index]);
			}
			this.changeHistory = newHistory;
		}

		// 记录性能统计
		if (this.changeTrackingConfig.enablePerformanceTracking) {
			const updateTime = os.clock() - startTime;
			this.performanceStats.lastUpdateTime = updateTime;
			this.performanceStats.updateTimes.push(updateTime);

			// 保持更新时间历史在合理范围内
			if (this.performanceStats.updateTimes.size() > 1000) {
				const newTimes: Array<number> = [];
				for (let index = 1; index < this.performanceStats.updateTimes.size(); index++) {
					newTimes.push(this.performanceStats.updateTimes[index]);
				}
				this.performanceStats.updateTimes = newTimes;
			}
		}

		return {
			becameVisible,
			becameHidden,
			unchanged,
		};
	}

	/**
	 * 应用可见性变更
	 * @param changes - 变更集合
	 */
	public applyChanges(changes: VisibilityChangeSet): void {
		// 将当前状态复制到前一帧状态
		this.previousVisibility.clear();
		for (const [key, value] of this.currentVisibility) {
			this.previousVisibility.set(key, value);
		}

		// 清空当前状态，准备下一次 computeChanges
		this.currentVisibility.clear();

		// 清理过期的缓存条目
		this.cleanupExpiredCache();
	}

	/**
	 * 获取指定客户端的可见性变更
	 * @param clientId - 客户端 ID
	 * @returns 该客户端的变更记录
	 */
	public getChangesForClient(clientId: ClientId): VisibilityChange[] {
		return this.changeHistory.filter((change) => change.clientId === clientId);
	}

	/**
	 * 启用或禁用变更跟踪
	 * @param enabled - 是否启用
	 */
	public enableChangeTracking(enabled: boolean): void {
		this.changeTrackingConfig = {
			...this.changeTrackingConfig,
			enabled,
		};

		if (!enabled) {
			this.previousVisibility.clear();
			this.currentVisibility.clear();
			this.changeHistory.clear();
		}
	}

	// ===== 性能优化功能 =====

	/**
	 * 优化查询 - 基于距离等因素过滤实体
	 * @param entities - 原始实体列表
	 * @param clientIds - 客户端 ID 列表
	 * @returns 优化后的实体列表
	 */
	public optimizeQuery(entities: Entity[], clientIds: ClientId[]): Entity[] {
		// 基础优化：移除全局不可见的实体（如果使用白名单模式）
		if (this.config.policy === VisibilityPolicy.Whitelist) {
			return entities.filter((entity) => {
				// 全局可见的实体总是包含
				if (this.globallyVisible.has(entity)) {
					return true;
				}

				// 检查是否对任何客户端可见
				for (const clientId of clientIds) {
					if (this.isEntityVisibleToClient(entity, clientId)) {
						return true;
					}
				}
				return false;
			});
		}

		return entities;
	}

	/**
	 * 批量查询多个实体的可见性
	 * @param entityClientPairs - [实体, 客户端ID] 对的数组
	 * @returns 可见性结果数组
	 */
	public batchIsVisible(entityClientPairs: Array<[Entity, ClientId]>): boolean[] {
		return entityClientPairs.map(([entity, clientId]) => this.isEntityVisibleToClient(entity, clientId));
	}

	/**
	 * 清理过期的缓存条目
	 */
	private cleanupExpiredCache(): void {
		const currentTime = os.clock() * 1000;
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.queryCache) {
			if (currentTime - entry.timestamp > this.cacheExpirationMs) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			this.queryCache.delete(key);
		}
	}

	// ===== 自动清理功能 =====

	/**
	 * 清理已移除的实体
	 * @param existingEntities - 当前存在的实体列表
	 */
	public cleanupRemovedEntities(existingEntities: Entity[]): void {
		const existingEntitySet = new Set(existingEntities);
		const entitiesToRemove: Entity[] = [];

		// 找出需要清理的实体
		for (const [entity] of this.entityVisibility) {
			if (!existingEntitySet.has(entity)) {
				entitiesToRemove.push(entity);
			}
		}

		// 清理实体
		for (const entity of entitiesToRemove) {
			this.removeEntity(entity);
		}

		// 清理全局可见实体
		const globalToRemove: Entity[] = [];
		for (const entity of this.globallyVisible) {
			if (!existingEntitySet.has(entity)) {
				globalToRemove.push(entity);
			}
		}

		for (const entity of globalToRemove) {
			this.globallyVisible.delete(entity);
		}

		// 清理客户端映射中的已移除实体
		for (const [clientId, entities] of this.clientVisibility) {
			const entitiesToDeleteFromClient: Entity[] = [];
			for (const entity of entities) {
				if (!existingEntitySet.has(entity)) {
					entitiesToDeleteFromClient.push(entity);
				}
			}

			for (const entity of entitiesToDeleteFromClient) {
				entities.delete(entity);
			}
		}

		// 清理变更跟踪中的已移除实体
		this.changeHistory = this.changeHistory.filter((change) => existingEntitySet.has(change.entity));

		// 清理缓存中的已移除实体
		const cacheKeysToRemove: string[] = [];
		for (const [key] of this.queryCache) {
			const entityId = tonumber(key.split("-")[0]);
			if (entityId !== undefined && !existingEntitySet.has(entityId as Entity)) {
				cacheKeysToRemove.push(key);
			}
		}

		for (const key of cacheKeysToRemove) {
			this.queryCache.delete(key);
		}
	}

	/**
	 * 清理已断开连接的客户端
	 * @param activeClients - 当前活跃的客户端列表
	 */
	public cleanupDisconnectedClients(activeClients: ClientId[]): void {
		const activeClientSet = new Set(activeClients);
		const clientsToRemove: ClientId[] = [];

		// 找出需要清理的客户端
		for (const [clientId] of this.clientVisibility) {
			if (!activeClientSet.has(clientId)) {
				clientsToRemove.push(clientId);
			}
		}

		// 清理客户端
		for (const clientId of clientsToRemove) {
			this.removeClient(clientId);
		}

		// 清理变更跟踪中的已断开客户端
		this.changeHistory = this.changeHistory.filter((change) => activeClientSet.has(change.clientId));

		// 清理缓存中的已断开客户端
		const cacheKeysToRemove: string[] = [];
		for (const [key] of this.queryCache) {
			const clientIdStr = key.split("-")[1];
			const clientId = tonumber(clientIdStr);
			if (clientId !== undefined && !activeClientSet.has(clientId as ClientId)) {
				cacheKeysToRemove.push(key);
			}
		}

		for (const key of cacheKeysToRemove) {
			this.queryCache.delete(key);
		}
	}

	// ===== 调试和监控功能 =====

	/**
	 * 获取性能统计信息
	 * @returns 性能统计
	 */
	public getPerformanceStats(): VisibilityPerformanceStats {
		const calculateAverage = (times: Array<number>): number => {
			if (times.size() === 0) return 0;
			const sum = times.reduce((acc, time) => acc + time, 0);
			return sum / times.size();
		};

		const calculateMemoryUsage = (map: Map<unknown, unknown>): number => {
			// 粗略估算内存使用量（字节转MB）
			return (map.size() * 64) / (1024 * 1024); // 假设每个条目约64字节
		};

		const cacheHitRate = this.performanceStats.totalQueries > 0 ?
			this.performanceStats.cacheHits / this.performanceStats.totalQueries : 0;

		return {
			lastQueryTime: this.performanceStats.lastQueryTime,
			lastUpdateTime: this.performanceStats.lastUpdateTime,
			queriesPerSecond: this.performanceStats.queryTimes.size() > 0 ?
				1 / calculateAverage(this.performanceStats.queryTimes) : 0,
			updatesPerSecond: this.performanceStats.updateTimes.size() > 0 ?
				1 / calculateAverage(this.performanceStats.updateTimes) : 0,
			totalQueries: this.performanceStats.totalQueries,
			totalUpdates: this.performanceStats.totalUpdates,
			cacheHitRate,
			memoryUsage: {
				entityVisibilityMB: calculateMemoryUsage(this.entityVisibility),
				clientVisibilityMB: calculateMemoryUsage(this.clientVisibility),
				changeTrackingMB: calculateMemoryUsage(this.previousVisibility) +
					calculateMemoryUsage(this.currentVisibility),
				cacheMB: calculateMemoryUsage(this.queryCache),
			},
		};
	}

	/**
	 * 重置性能统计
	 */
	public resetPerformanceStats(): void {
		this.performanceStats = {
			totalQueries: 0,
			totalUpdates: 0,
			cacheHits: 0,
			lastQueryTime: 0,
			lastUpdateTime: 0,
			queryTimes: [],
			updateTimes: [],
		};
	}

	/**
	 * 导出可见性状态用于调试
	 * @returns 可见性状态的调试信息
	 */
	public exportDebugInfo(): {
		config: VisibilityConfig;
		changeTrackingConfig: ChangeTrackingConfig;
		stats: ReturnType<ClientVisibility["getStats"]>;
		performanceStats: VisibilityPerformanceStats;
		cacheSize: number;
		changeHistorySize: number;
	} {
		return {
			config: this.getConfig(),
			changeTrackingConfig: { ...this.changeTrackingConfig },
			stats: this.getStats(),
			performanceStats: this.getPerformanceStats(),
			cacheSize: this.queryCache.size(),
			changeHistorySize: this.changeHistory.size(),
		};
	}
}