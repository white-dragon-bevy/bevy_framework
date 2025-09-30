/**
 * Player Spawn Replication Example - 玩家生成同步示例
 *
 * 此示例演示真实的多玩家场景:
 * - 玩家加入时创建对应实体
 * - 实体状态同步到所有客户端
 * - 玩家离开时清理实体
 *
 * 组件类型:
 * - ToAllPlayers: 位置、健康值、显示名称（所有玩家可见）
 * - ToSelfOnly: 背包数据、任务进度（仅自己可见）
 */

import { component, useHookState, useDeltaTime, useEvent } from "@rbxts/matter";
import { Players } from "@rbxts/services";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { SimpleReplicationPlugin, MockNetworkAdapter } from "../../simple_replication";
import type { World, AnyEntity } from "@rbxts/matter";

// ============================================================================
// 组件定义
// ============================================================================

/**
 * 玩家组件 - 关联 Roblox Player 实例
 */
const PlayerComponent = component<{ player: Player; loaded: boolean }>("PlayerComponent");

/**
 * 位置组件 - 所有玩家可见
 */
const Transform = component<{
	position: Vector3;
	rotation: CFrame;
}>("Transform");

/**
 * 健康值组件 - 所有玩家可见
 */
const Health = component<{
	current: number;
	maximum: number;
}>("Health");

/**
 * 角色外观组件 - 所有玩家可见
 */
const CharacterAppearance = component<{
	displayName: string;
	teamColor: BrickColor;
	scale: number;
}>("CharacterAppearance");

/**
 * 背包组件 - 仅自己可见
 */
const Inventory = component<{
	items: Array<string>;
	capacity: number;
}>("Inventory");

/**
 * 任务进度组件 - 仅自己可见
 */
const QuestProgress = component<{
	activeQuests: Array<string>;
	completedQuests: Array<string>;
	questPoints: number;
}>("QuestProgress");

// ============================================================================
// 服务端系统
// ============================================================================

/**
 * 玩家加入处理系统
 * 当玩家加入时创建对应的 ECS 实体
 */
function serverPlayerJoinSystem(world: World): void {
	const state = useHookState("spawnedPlayers") as { players?: Set<Player> };
	if (!state.players) {
		state.players = new Set<Player>();
	}

	const spawnedPlayers = state.players;

	for (const player of Players.GetPlayers()) {
		// 跳过已处理的玩家
		if (spawnedPlayers.has(player)) {
			continue;
		}

		spawnedPlayers.add(player);

		// 为玩家创建 ECS 实体
		const entityId = world.spawn(
			PlayerComponent({ player, loaded: true }),
			Transform({
				position: new Vector3(0, 10, 0),
				rotation: CFrame.identity,
			}),
			Health({
				current: 100,
				maximum: 100,
			}),
			CharacterAppearance({
				displayName: player.Name,
				teamColor: BrickColor.random(),
				scale: 1.0,
			}),
			Inventory({
				items: ["剑", "药水"],
				capacity: 20,
			}),
			QuestProgress({
				activeQuests: ["新手任务"],
				completedQuests: [],
				questPoints: 0,
			}),
		);

		print(`[Server] ✅ 玩家 ${player.Name} 加入, 创建实体 ${entityId}`);
		print(`[Server]   - 位置: ${new Vector3(0, 10, 0)}`);
		print(`[Server]   - 生命值: 100/100`);
		print(`[Server]   - 背包物品: 剑, 药水`);
	}
}

/**
 * 玩家离开处理系统
 * 当玩家离开时删除对应的 ECS 实体
 */
function serverPlayerLeaveSystem(world: World): void {
	// 监听玩家离开事件
	for (const [_eventNumber, player] of useEvent(Players, "PlayerRemoving")) {
		print(`[Server] 👋 玩家 ${player.Name} 离开`);

		// 查找并删除玩家对应的实体
		for (const [entityId, playerComponent] of world.query(PlayerComponent)) {
			if (playerComponent.player === player) {
				world.despawn(entityId);
				print(`[Server] 🗑️ 删除实体 ${entityId}`);
				break;
			}
		}
	}
}

/**
 * 游戏逻辑更新系统
 * 模拟游戏中的各种状态变化
 */
function serverGameplaySystem(world: World): void {
	const state = useHookState("gameplay") as {
		elapsedTime: number;
		lastHealthUpdate: number;
		lastPositionUpdate: number;
		lastQuestUpdate: number;
	};
	if (state.elapsedTime === undefined) {
		state.elapsedTime = 0;
		state.lastHealthUpdate = 0;
		state.lastPositionUpdate = 0;
		state.lastQuestUpdate = 0;
	}

	const deltaTime = useDeltaTime();
	state.elapsedTime += deltaTime;

	// 每2秒: 更新所有玩家位置（随机移动）
	if (state.elapsedTime - state.lastPositionUpdate >= 2) {
		state.lastPositionUpdate = state.elapsedTime;

		for (const [entityId, transform, appearance] of world.query(Transform, CharacterAppearance)) {
			const randomOffset = new Vector3(math.random(-5, 5), 0, math.random(-5, 5));

			const newTransform = {
				position: transform.position.add(randomOffset),
				rotation: transform.rotation,
			};

			world.insert(entityId, Transform(newTransform));

			print(
				`[Server] 📍 ${appearance.displayName} 移动到 (${string.format("%.1f", newTransform.position.X)}, ${string.format("%.1f", newTransform.position.Y)}, ${string.format("%.1f", newTransform.position.Z)})`,
			);
		}
	}

	// 每3秒: 更新生命值（受伤或恢复）
	if (state.elapsedTime - state.lastHealthUpdate >= 3) {
		state.lastHealthUpdate = state.elapsedTime;

		for (const [entityId, health, appearance] of world.query(Health, CharacterAppearance)) {
			const healthChange = math.random(-20, 15);
			const newCurrent = math.clamp(health.current + healthChange, 0, health.maximum);

			world.insert(
				entityId,
				Health({
					current: newCurrent,
					maximum: health.maximum,
				}),
			);

			const action = healthChange > 0 ? "恢复" : "受伤";
			print(`[Server] ❤️ ${appearance.displayName} ${action}: ${health.current} -> ${newCurrent}`);
		}
	}

	// 每5秒: 更新任务进度（仅自己可见）
	if (state.elapsedTime - state.lastQuestUpdate >= 5) {
		state.lastQuestUpdate = state.elapsedTime;

		for (const [entityId, questProgress, appearance] of world.query(QuestProgress, CharacterAppearance)) {
			const newQuestPoints = questProgress.questPoints + 10;

			world.insert(
				entityId,
				QuestProgress({
					activeQuests: questProgress.activeQuests,
					completedQuests: questProgress.completedQuests,
					questPoints: newQuestPoints,
				}),
			);

			print(`[Server] 📜 ${appearance.displayName} 任务点数增加: ${newQuestPoints}`);
		}
	}
}

// ============================================================================
// 客户端系统
// ============================================================================

/**
 * 客户端实体显示系统
 * 显示从服务端同步的所有玩家实体
 */
function clientDisplaySystem(world: World): void {
	const state = useHookState("clientDisplay") as { lastEntityCount: number; displayInterval: number };
	if (state.displayInterval === undefined) {
		state.lastEntityCount = 0;
		state.displayInterval = 0;
	}

	// 每3秒打印一次完整状态
	state.displayInterval += 1;

	if (state.displayInterval < 180) {
		// 约3秒 (60fps)
		return;
	}

	state.displayInterval = 0;

	// 统计实体
	let entityCount = 0;

	print("[Client] ========== 当前同步的玩家 ==========");

	for (const [entityId, transform, health, appearance] of world.query(Transform, Health, CharacterAppearance)) {
		entityCount++;

		const healthPercent = (health.current / health.maximum) * 100;

		print(`[Client] 玩家 ${appearance.displayName}:`);
		print(`  - 实体ID: ${entityId}`);
		print(
			`  - 位置: (${string.format("%.1f", transform.position.X)}, ${string.format("%.1f", transform.position.Y)}, ${string.format("%.1f", transform.position.Z)})`,
		);
		print(`  - 生命值: ${health.current}/${health.maximum} (${string.format("%.1f", healthPercent)}%)`);
		print(`  - 队伍颜色: ${appearance.teamColor.Name}`);
	}

	// 显示自己的私有数据
	for (const [entityId, inventory, questProgress] of world.query(Inventory, QuestProgress)) {
		print(`[Client] 🎒 我的背包:`);
		print(`  - 物品: ${inventory.items.join(", ")}`);
		print(`  - 容量: ${inventory.items.size()}/${inventory.capacity}`);
		print(`[Client] 📜 我的任务:`);
		print(`  - 活跃任务: ${questProgress.activeQuests.join(", ")}`);
		print(`  - 任务点数: ${questProgress.questPoints}`);
	}

	print(`[Client] ========== 总计 ${entityCount} 个玩家 ==========`);
	state.lastEntityCount = entityCount;
}

// ============================================================================
// 插件配置
// ============================================================================

/**
 * 配置复制插件
 */
function configureReplication(): SimpleReplicationPlugin {
	const mockAdapter = new MockNetworkAdapter();

	const plugin = new SimpleReplicationPlugin(
		mockAdapter,
		{
			debugEnabled: false, // 关闭调试以减少输出
			forceMode: "server", // 强制服务端模式
		},
		{
			toAllPlayers: new Set([Transform, Health, CharacterAppearance]),
			toSelfOnly: new Set([Inventory, QuestProgress]),
		},
	);

	return plugin;
}

// ============================================================================
// 主函数
// ============================================================================

export function main(): App {
	print("========================================");
	print("Player Spawn Replication - 玩家生成同步");
	print("========================================");

	const app = App.create();

	// 添加默认插件
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加简单复制插件
	app.addPlugin(configureReplication());

	// 服务端系统
	app.addSystems(MainScheduleLabel.UPDATE, serverPlayerJoinSystem);
	app.addSystems(MainScheduleLabel.UPDATE, serverPlayerLeaveSystem);
	app.addSystems(MainScheduleLabel.UPDATE, serverGameplaySystem);

	// 客户端系统
	app.addSystems(MainScheduleLabel.UPDATE, clientDisplaySystem);

	print("========================================");
	print("功能说明:");
	print("  • 玩家加入/离开时自动创建/删除实体");
	print("  • 每2秒更新位置（所有玩家可见）");
	print("  • 每3秒更新生命值（所有玩家可见）");
	print("  • 每5秒更新任务进度（仅自己可见）");
	print("  • 客户端每3秒显示完整状态");
	print("========================================");

	return app;
}

// 运行示例
const app = main();
app.run();