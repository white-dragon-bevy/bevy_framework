/**
 * @fileoverview 服务器实体映射
 *
 * 管理服务器实体到客户端实体的映射
 */

import { Entity } from "@rbxts/matter";
import { Resource } from "../../../bevy_ecs";

/**
 * 服务器实体映射资源
 * 在客户端使用，将服务器实体映射到本地实体
 */
export class ServerEntityMap implements Resource {
	readonly __brand = "Resource" as const;

	/** 服务器实体到客户端实体的映射 */
	private serverToClient: Map<Entity, Entity> = new Map();
	/** 客户端实体到服务器实体的映射 */
	private clientToServer: Map<Entity, Entity> = new Map();
	/** 复制 ID 到客户端实体的映射 */
	private replicationIdToClient: Map<number, Entity> = new Map();

	/**
	 * 添加实体映射
	 * @param serverEntity - 服务器实体
	 * @param clientEntity - 客户端实体
	 * @param replicationId - 复制 ID
	 */
	public addMapping(serverEntity: Entity, clientEntity: Entity, replicationId?: number): void {
		// 检查是否已存在映射
		const existing = this.serverToClient.get(serverEntity);
		if (existing !== undefined && existing !== clientEntity) {
			warn(`Server entity ${serverEntity} already mapped to ${existing}, overwriting with ${clientEntity}`);
		}

		// 添加双向映射
		this.serverToClient.set(serverEntity, clientEntity);
		this.clientToServer.set(clientEntity, serverEntity);

		// 添加复制 ID 映射
		if (replicationId !== undefined) {
			this.replicationIdToClient.set(replicationId, clientEntity);
		}
	}

	/**
	 * 移除实体映射
	 * @param serverEntity - 服务器实体
	 */
	public removeMapping(serverEntity: Entity): void {
		const clientEntity = this.serverToClient.get(serverEntity);
		if (clientEntity !== undefined) {
			this.serverToClient.delete(serverEntity);
			this.clientToServer.delete(clientEntity);

			// 移除复制 ID 映射
			for (const [replicationId, entity] of this.replicationIdToClient) {
				if (entity === clientEntity) {
					this.replicationIdToClient.delete(replicationId);
					break;
				}
			}
		}
	}

	/**
	 * 通过客户端实体移除映射
	 * @param clientEntity - 客户端实体
	 */
	public removeMappingByClient(clientEntity: Entity): void {
		const serverEntity = this.clientToServer.get(clientEntity);
		if (serverEntity !== undefined) {
			this.removeMapping(serverEntity);
		}
	}

	/**
	 * 获取客户端实体
	 * @param serverEntity - 服务器实体
	 * @returns 客户端实体
	 */
	public getClientEntity(serverEntity: Entity): Entity | undefined {
		return this.serverToClient.get(serverEntity);
	}

	/**
	 * 获取服务器实体
	 * @param clientEntity - 客户端实体
	 * @returns 服务器实体
	 */
	public getServerEntity(clientEntity: Entity): Entity | undefined {
		return this.clientToServer.get(clientEntity);
	}

	/**
	 * 通过复制 ID 获取客户端实体
	 * @param replicationId - 复制 ID
	 * @returns 客户端实体
	 */
	public getClientEntityByReplicationId(replicationId: number): Entity | undefined {
		return this.replicationIdToClient.get(replicationId);
	}

	/**
	 * 检查服务器实体是否已映射
	 * @param serverEntity - 服务器实体
	 * @returns 是否已映射
	 */
	public hasServerEntity(serverEntity: Entity): boolean {
		return this.serverToClient.has(serverEntity);
	}

	/**
	 * 检查客户端实体是否已映射
	 * @param clientEntity - 客户端实体
	 * @returns 是否已映射
	 */
	public hasClientEntity(clientEntity: Entity): boolean {
		return this.clientToServer.has(clientEntity);
	}

	/**
	 * 获取所有映射
	 * @returns 服务器到客户端的映射
	 */
	public getAllMappings(): Map<Entity, Entity> {
		return new Map(this.serverToClient);
	}

	/**
	 * 获取映射数量
	 * @returns 映射数量
	 */
	public getMappingCount(): number {
		return this.serverToClient.size();
	}

	/**
	 * 清空所有映射
	 */
	public clear(): void {
		this.serverToClient.clear();
		this.clientToServer.clear();
		this.replicationIdToClient.clear();
	}

	/**
	 * 映射实体数组
	 * @param entities - 服务器实体数组
	 * @returns 客户端实体数组
	 */
	public mapEntities(entities: Entity[]): Entity[] {
		const mapped: Entity[] = [];
		for (const entity of entities) {
			const clientEntity = this.getClientEntity(entity);
			if (clientEntity !== undefined) {
				mapped.push(clientEntity);
			}
		}
		return mapped;
	}

	/**
	 * 反向映射实体数组
	 * @param entities - 客户端实体数组
	 * @returns 服务器实体数组
	 */
	public unmapEntities(entities: Entity[]): Entity[] {
		const mapped: Entity[] = [];
		for (const entity of entities) {
			const serverEntity = this.getServerEntity(entity);
			if (serverEntity !== undefined) {
				mapped.push(serverEntity);
			}
		}
		return mapped;
	}

	/**
	 * 批量添加映射
	 * @param mappings - 映射数组
	 */
	public addMappings(mappings: Array<[serverEntity: Entity, clientEntity: Entity, replicationId?: number]>): void {
		for (const [serverEntity, clientEntity, replicationId] of mappings) {
			this.addMapping(serverEntity, clientEntity, replicationId);
		}
	}

	/**
	 * 获取统计信息
	 * @returns 统计信息
	 */
	public getStats(): {
		totalMappings: number;
		replicationIdMappings: number;
	} {
		return {
			totalMappings: this.serverToClient.size(),
			replicationIdMappings: this.replicationIdToClient.size(),
		};
	}
}