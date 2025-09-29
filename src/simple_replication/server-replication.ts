/**
 * @fileoverview 服务器端复制系统
 *
 * 负责将实体状态同步到客户端
 * 基于原项目的 replication.ts 改编
 */

import { World, AnyEntity, AnyComponent } from "@rbxts/matter";
import { INetworkAdapter } from "./network";
import {
	ComponentName,
	ComponentCtor,
	Changelog,
	SimpleContext,
	SimpleState,
	ClientComponent,
} from "./types";

const Players = game.GetService("Players");

/** 全局变更记录映射 */
const changes = new Map<string, Changelog>();

/**
 * 服务器端复制系统
 * 将组件变化同步到客户端
 * @param world - Matter 世界实例
 * @param state - 状态对象
 * @param context - 上下文对象
 */
export function serverReplicationSystem(
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
	const debugLog = (...args: unknown[]): void => {
		if (debugEnabled) {
			print("[SimpleReplication:Server]", ...args);
		}
	};

	// 获取客户端组件
	const ClientComponentCtor = context.Components.Client as (() => ClientComponent);
	if (!ClientComponentCtor) {
		warn("[SimpleReplication] Client component not found in context");
		return;
	}

	// 处理新连接的客户端 - 发送初始状态
	for (const [playerId, client] of world.queryChanged(ClientComponentCtor)) {
		if (!world.contains(playerId) || client.new === undefined) {
			continue;
		}

		const { player, loaded } = client.new;
		if (!loaded) {
			continue;
		}

		const playerPayload: Changelog = new Map();

		// 收集所有需要同步的实体数据
		for (const [entityId, entityData] of world) {
			const key = tostring(entityId);
			const entityPayload = new Map<ComponentName, { data: AnyComponent }>();

			for (const [component, componentInstance] of entityData) {
				// 检查组件是否需要复制
				if (
					context.Replicated.ToAllPlayers.has(component) ||
					(playerId === entityId && context.Replicated.ToSelfOnly.has(component))
				) {
					const componentName = tostring(component) as ComponentName;
					entityPayload.set(componentName, { data: componentInstance });
				}
			}

			if (next(entityPayload)[0] !== undefined) {
				playerPayload.set(key, entityPayload);
			}
		}

		debugLog("Setting initial replication", playerId, player.Name, playerPayload);
		changes.set(tostring(player.UserId), playerPayload);
	}

	// 处理需要复制到所有玩家的组件变化
	for (const component of context.Replicated.ToAllPlayers) {
		for (const [entityId, record] of world.queryChanged(component)) {
			const key = tostring(entityId);
			const name = tostring(component) as ComponentName;

			debugLog("Replicated component changed", key, name, record.new);

			for (const player of Players.GetPlayers()) {
				const playerId = tostring(player.UserId);

				if (!changes.has(playerId)) {
					changes.set(playerId, new Map());
				}

				const playerChanges = changes.get(playerId);
				if (playerChanges !== undefined) {
					if (world.contains(entityId as AnyEntity)) {
						if (!playerChanges.has(key)) {
							playerChanges.set(key, new Map());
						}
						const entityChanges = playerChanges.get(key);
						if (entityChanges && record.new) {
							entityChanges.set(name, { data: record.new });
						}
					}
				}
			}
		}
	}

	// 处理只复制给自己的组件变化
	for (const component of context.Replicated.ToSelfOnly) {
		for (const [entityId, record] of world.queryChanged(component)) {
			const key = tostring(entityId);
			const name = tostring(component) as ComponentName;

			if (!world.contains(entityId as AnyEntity)) {
				continue;
			}

			const client = world.get(entityId, ClientComponentCtor);
			if (client !== undefined) {
				const { player } = client;
				const playerId = tostring(player.UserId);

				if (!changes.has(playerId)) {
					changes.set(playerId, new Map());
				}

				const playerChanges = changes.get(playerId);
				if (playerChanges !== undefined) {
					if (world.contains(entityId as AnyEntity)) {
						if (!playerChanges.has(key)) {
							playerChanges.set(key, new Map());
						}
						const entityChanges = playerChanges.get(key);
						if (entityChanges && record.new) {
							entityChanges.set(name, { data: record.new });
						}
					}
				}

				debugLog("Player only component changed", key, name, entityId);
			}
		}
	}

	// 发送变更到客户端
	for (const [, client] of world.query(ClientComponentCtor)) {
		const { player, loaded } = client;
		if (!loaded) {
			continue;
		}

		const currentChangelog = changes.get(tostring(player.UserId));
		if (currentChangelog !== undefined) {
			debugLog("Sending replication changes to player", player.Name, currentChangelog);
			networkAdapter.fire(player, currentChangelog);
			changes.delete(tostring(player.UserId));
		}
	}
}

/**
 * 导出复制系统配置
 */
export const serverReplicationSystemConfig = {
	system: serverReplicationSystem,
	priority: math.huge, // 最高优先级
};