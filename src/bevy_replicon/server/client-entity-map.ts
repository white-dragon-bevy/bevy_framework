/**
 * @fileoverview 客户端实体映射（服务器端组件）
 *
 * 服务器端资源,用于映射服务器实体到客户端预生成的实体。
 * 这些映射作为复制数据的一部分发送到客户端,并注入到客户端的 ServerEntityMap 中。
 *
 * 有时你不希望在服务器生成某些东西之前等待它出现在客户端上——当客户端执行某个动作时,
 * 它们可以立即在客户端上模拟它,然后将该实体与最终复制的服务器生成匹配,
 * 而不是让复制在客户端上生成一个全新的实体。
 *
 * 在这种情况下,客户端可以向服务器发送其预生成的实体 ID,然后服务器可以生成自己的实体
 * 并将映射注入到其 ClientEntityMap 中。
 *
 * 复制数据包将向客户端发送此类映射列表,这些映射将被插入到客户端的 ServerEntityMap 中。
 * 使用复制来传播映射可确保与预映射服务器实体相关的任何复制消息
 * 将与更新客户端的 ServerEntityMap 同步。
 *
 * 这是 AuthorizedClient 的必需组件。因此,如果你想在启用复制之前映射实体,
 * 你需要插入此组件,并已填充实体。
 *
 * ## 示例
 *
 * ```typescript
 * // 客户端射击子弹并生成实体
 * function shootBullet(world: World): void {
 * 	const entity = world.spawn(Bullet);
 * 	sendToServer(new SpawnBullet(entity));
 * }
 *
 * // 服务器验证并确认
 * function confirmBullet(
 * 	world: World,
 * 	bulletEvents: Array<FromClient<SpawnBullet>>,
 * ): void {
 * 	for (const event of bulletEvents) {
 * 		// 生成服务器子弹(可以插入更多组件,它们将正确发送到客户端实体)
 * 		const bullet = world.spawn(Bullet);
 *
 * 		// 获取客户端的实体映射
 * 		const clientEntityMap = world.get(event.clientEntity, ClientEntityMap);
 * 		if (clientEntityMap) {
 * 			// 注册映射：服务器实体 -> 客户端实体
 * 			const updated = insertMapping(clientEntityMap, bullet, event.data.clientEntity);
 * 			world.insert(event.clientEntity, updated);
 * 		}
 * 	}
 * }
 * ```
 *
 * 如果客户端已连接并接收到服务器实体映射的复制数据,
 * 复制的数据将应用于客户端的原始实体,而不是生成新实体。
 * 你可以通过查询原始客户端实体上的 Added<Replicated> 来检测映射何时被复制。
 *
 * 如果找不到客户端的原始实体,将在客户端上生成一个新实体,
 * 就像没有提供客户端实体时一样。
 */

import { Component, component, Entity } from "@rbxts/matter";

/**
 * 客户端实体映射组件数据
 */
interface ClientEntityMapData {
	/**
	 * 映射列表：[服务器实体, 客户端实体]
	 * 这些映射将作为复制数据的一部分发送到客户端
	 */
	readonly mappings: ReadonlyArray<readonly [serverEntity: Entity, clientEntity: Entity]>;
}

/**
 * 客户端实体映射组件类型
 *
 * 附加到客户端连接实体上,存储该客户端预生成的实体映射。
 * 每个映射条目包含一个服务器实体和对应的客户端实体。
 */
export type ClientEntityMap = Component<ClientEntityMapData>;

/**
 * ClientEntityMap 组件构造函数
 */
export const ClientEntityMap = component<ClientEntityMapData>("ClientEntityMap");

/**
 * 创建空的 ClientEntityMap 组件
 *
 * @returns 新的 ClientEntityMap 实例
 */
export function createClientEntityMap(): ClientEntityMap {
	return ClientEntityMap({
		mappings: [],
	});
}

/**
 * 插入映射到 ClientEntityMap
 *
 * 这将作为复制数据的一部分发送,并添加到客户端的 ServerEntityMap 中。
 *
 * @param entityMap - 现有的 ClientEntityMap
 * @param serverEntity - 服务器生成的实体
 * @param clientEntity - 客户端预生成的实体 ID(由客户端发送)
 * @returns 更新后的 ClientEntityMap
 */
export function insertMapping(
	entityMap: ClientEntityMap,
	serverEntity: Entity,
	clientEntity: Entity,
): ClientEntityMap {
	return entityMap.patch({
		mappings: [...entityMap.mappings, [serverEntity, clientEntity] as const],
	});
}

/**
 * 获取所有映射
 *
 * @param entityMap - ClientEntityMap 组件
 * @returns 映射的只读数组
 */
export function getMappings(entityMap: ClientEntityMap): ReadonlyArray<readonly [Entity, Entity]> {
	return entityMap.mappings;
}

/**
 * 清空映射(发送后调用)
 *
 * 映射被发送到客户端后,应该清空以避免重复发送。
 *
 * @param entityMap - ClientEntityMap 组件
 * @returns 清空后的 ClientEntityMap
 */
export function clearMappings(entityMap: ClientEntityMap): ClientEntityMap {
	return entityMap.patch({
		mappings: [],
	});
}

/**
 * 获取映射数量
 *
 * @param entityMap - ClientEntityMap 组件
 * @returns 当前映射数量
 */
export function getMappingCount(entityMap: ClientEntityMap): number {
	return entityMap.mappings.size();
}

/**
 * 检查是否有映射
 *
 * @param entityMap - ClientEntityMap 组件
 * @returns 如果有待发送的映射则返回 true
 */
export function isEmpty(entityMap: ClientEntityMap): boolean {
	return entityMap.mappings.size() === 0;
}

/**
 * 移除特定的映射
 *
 * @param entityMap - ClientEntityMap 组件
 * @param serverEntity - 要移除的服务器实体
 * @returns 更新后的 ClientEntityMap
 */
export function removeMapping(entityMap: ClientEntityMap, serverEntity: Entity): ClientEntityMap {
	const filtered = entityMap.mappings.filter(([server]) => server !== serverEntity);
	return entityMap.patch({
		mappings: filtered,
	});
}

/**
 * 查找客户端实体
 *
 * @param entityMap - ClientEntityMap 组件
 * @param serverEntity - 服务器实体
 * @returns 对应的客户端实体,如果不存在则返回 undefined
 */
export function getClientEntity(entityMap: ClientEntityMap, serverEntity: Entity): Entity | undefined {
	const mapping = entityMap.mappings.find(([server]) => server === serverEntity);
	return mapping?.[1];
}

/**
 * 检查是否存在特定服务器实体的映射
 *
 * @param entityMap - ClientEntityMap 组件
 * @param serverEntity - 服务器实体
 * @returns 如果存在映射则返回 true
 */
export function hasMapping(entityMap: ClientEntityMap, serverEntity: Entity): boolean {
	return entityMap.mappings.some(([server]) => server === serverEntity);
}

/**
 * 批量插入映射
 *
 * @param entityMap - ClientEntityMap 组件
 * @param mappings - 映射数组
 * @returns 更新后的 ClientEntityMap
 */
export function insertManyMappings(
	entityMap: ClientEntityMap,
	mappings: ReadonlyArray<readonly [Entity, Entity]>,
): ClientEntityMap {
	return entityMap.patch({
		mappings: [...entityMap.mappings, ...mappings],
	});
}

/**
 * 获取统计信息
 *
 * @param entityMap - ClientEntityMap 组件
 * @returns 映射统计信息
 */
export function getStats(entityMap: ClientEntityMap): {
	readonly totalMappings: number;
} {
	return {
		totalMappings: entityMap.mappings.size(),
	};
}