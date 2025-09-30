/**
 * @fileoverview 客户端接收系统
 *
 * 负责接收服务端的复制数据并更新本地世界状态
 * 基于原项目的 receiveReplication.ts 改编
 */

import { World, AnyEntity, AnyComponent } from "@rbxts/matter";
import { useEvent } from "@rbxts/matter";
import { INetworkAdapter } from "./network";
import {
	ComponentName,
	ComponentCtor,
	SimpleContext,
	SimpleState,
} from "./types";

/**
 * 客户端接收复制数据系统
 * 负责同步服务端实体状态到客户端
 * @param world - Matter 世界实例
 * @param state - 客户端状态
 * @param context - 上下文对象
 */
export function clientReceiveSystem(
	world: World,
	state: SimpleState,
	context: SimpleContext,
	networkAdapter: INetworkAdapter,
): void {
	const { debugEnabled } = state;

	/**
	 * 调试打印函数
	 * @param args - 要打印的参数
	 */
	const debugPrint = (...args: unknown[]): void => {
		if (debugEnabled) {
		}
	};

	// 获取网络事件源
	const eventSource = networkAdapter.getEventSource();
	if (!eventSource) {
		// 如果没有事件源，可能是测试环境
		const getPendingDataFunc = () => networkAdapter.getPendingData?.();
		const pendingData = getPendingDataFunc();
		if (pendingData !== undefined) {
			// 处理测试数据
			for (const data of pendingData) {
				processReplicationData(world, state, context, data);
			}
		}
		return;
	}

	// 使用 useEvent 监听网络事件
	for (const [eventNumber, _entities] of useEvent(eventSource, "OnClientEvent")) {
		const entities = _entities as Map<string, Map<ComponentName, { data: AnyComponent }>>;
		debugPrint("Receiving replication", entities);

		for (const [id, componentMap] of entities) {
			let clientEntityId = tonumber(id) as AnyEntity;

			// 如果实体没有任何组件，则删除该实体
			if (clientEntityId !== undefined && next(componentMap)[0] === undefined) {
				if (world.contains(clientEntityId)) {
					world.despawn(clientEntityId);
					debugPrint("Despawned entity", clientEntityId);
				}
				continue;
			}

			debugPrint("Processing entity", id, componentMap);

			// 收集要插入和移除的组件
			const componentsToInsert = new Array<AnyComponent>();
			const componentsToRemove = new Array<ComponentCtor>();
			const insertNames = new Array<string>();
			const removeNames = new Array<string>();

			for (const [name, container] of componentMap) {
				const component = context.getComponent(name);

				if (container.data) {
					// 创建数据的副本以避免只读表错误
					const dataCopy = { ...container.data };
					componentsToInsert.push(component(dataCopy));
					insertNames.push(name);
				} else {
					// 如果没有数据，则移除组件
					componentsToRemove.push(component as ComponentCtor);
					removeNames.push(name);
				}
			}

			// 处理实体创建或更新
			if (clientEntityId === undefined) {
				// 创建新实体
				clientEntityId = world.spawn() as AnyEntity;

				if (componentsToInsert.size() > 0) {
					world.insert(clientEntityId, ...componentsToInsert);
				}

				// 保存实体ID映射
				state.entityIdMap.set(id, clientEntityId);

				debugPrint(
					"Spawned new entity",
					clientEntityId,
					"(Server:",
					id,
					") with",
					insertNames.join(", "),
				);
			} else {
				// 更新现有实体
				if (!world.contains(clientEntityId)) {
					// 如果实体不存在，则创建它
					world.spawnAt(clientEntityId);
				}

				// 插入新组件
				if (componentsToInsert.size() > 0) {
					world.insert(clientEntityId, ...componentsToInsert);
				}

				// 移除不需要的组件
				if (componentsToRemove.size() > 0) {
					world.remove(clientEntityId, ...componentsToRemove);
				}

				debugPrint(
					string.format(
						"Modified entity %d (Server: %s) - adding %s, removing %s",
						clientEntityId,
						id,
						insertNames.size() > 0 ? insertNames.join(", ") : "nothing",
						removeNames.size() > 0 ? removeNames.join(", ") : "nothing",
					),
				);
			}
		}
	}
}

/**
 * 处理复制数据
 * @param world - Matter 世界实例
 * @param state - 状态
 * @param context - 上下文
 * @param data - 复制数据
 */
function processReplicationData(
	world: World,
	state: SimpleState,
	context: SimpleContext,
	data: unknown,
): void {
	const { debugEnabled } = state;

	const debugPrint = (...args: unknown[]): void => {
		if (debugEnabled) {
		}
	};

	const entities = data as Map<string, Map<ComponentName, { data: AnyComponent }>>;
	debugPrint("Processing replication data", entities);

	for (const [id, componentMap] of entities) {
		let clientEntityId = tonumber(id) as AnyEntity;

		// 如果实体没有任何组件，则删除该实体
		if (clientEntityId !== undefined && next(componentMap)[0] === undefined) {
			if (world.contains(clientEntityId)) {
				world.despawn(clientEntityId);
				debugPrint("Despawned entity", clientEntityId);
			}
			continue;
		}

		debugPrint("Processing entity", id, componentMap);

		// 收集要插入和移除的组件
		const componentsToInsert = new Array<AnyComponent>();
		const componentsToRemove = new Array<ComponentCtor>();
		const insertNames = new Array<string>();
		const removeNames = new Array<string>();

		for (const [name, container] of componentMap) {
			const component = context.getComponent(name);

			if (container.data) {
				// 创建数据的副本以避免只读表错误
				const dataCopy = { ...container.data };
				componentsToInsert.push(component(dataCopy));
				insertNames.push(name);
			} else {
				// 如果没有数据，则移除组件
				componentsToRemove.push(component as ComponentCtor);
				removeNames.push(name);
			}
		}

		// 处理实体创建或更新
		if (clientEntityId === undefined) {
			// 创建新实体
			clientEntityId = world.spawn() as AnyEntity;

			if (componentsToInsert.size() > 0) {
				world.insert(clientEntityId, ...componentsToInsert);
			}

			// 保存实体ID映射
			state.entityIdMap.set(id, clientEntityId);

			debugPrint(
				"Spawned new entity",
				clientEntityId,
				"(Server:",
				id,
				") with",
				insertNames.join(", "),
			);
		} else {
			// 更新现有实体
			if (!world.contains(clientEntityId)) {
				// 如果实体不存在，则创建它
				world.spawnAt(clientEntityId);
			}

			// 插入新组件
			if (componentsToInsert.size() > 0) {
				world.insert(clientEntityId, ...componentsToInsert);
			}

			// 移除不需要的组件
			if (componentsToRemove.size() > 0) {
				world.remove(clientEntityId, ...componentsToRemove);
			}

			debugPrint(
				string.format(
					"Modified entity %d (Server: %s) - adding %s, removing %s",
					clientEntityId,
					id,
					insertNames.size() > 0 ? insertNames.join(", ") : "nothing",
					removeNames.size() > 0 ? removeNames.join(", ") : "nothing",
				),
			);
		}
	}
}

/**
 * 创建客户端接收系统的工厂函数
 * @param debugEnabled - 是否启用调试
 * @returns 返回系统函数
 */
export function createClientReceiveSystem(debugEnabled: boolean = false) {
	return (world: World, state: SimpleState, context: SimpleContext, networkAdapter: INetworkAdapter): void => {
		// 确保状态中有调试标志
		state.debugEnabled = state.debugEnabled ?? debugEnabled;
		clientReceiveSystem(world, state, context, networkAdapter);
	};
}