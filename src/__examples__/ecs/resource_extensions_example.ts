/**
 * ECS 资源扩展系统示例
 * 展示如何使用资源管理扩展功能
 */

import { App, BasePlugin, BuiltinSchedules } from "../../bevy_app";
import { Context } from "../../bevy_ecs";
import { Resource } from "../../bevy_ecs/resource";
import { World } from "@rbxts/matter";

// ============= 定义资源类型 =============

/**
 * 游戏配置资源
 */
class GameConfig implements Resource {
	constructor(
		public gameSpeed: number = 1.0,
		public difficulty: "easy" | "medium" | "hard" = "medium",
		public soundEnabled: boolean = true,
		public maxPlayers: number = 4,
	) {}
}

/**
 * 游戏状态资源
 */
class GameState implements Resource {
	constructor(
		public score: number = 0,
		public level: number = 1,
		public isPlaying: boolean = false,
		public elapsedTime: number = 0,
	) {}
}

/**
 * 玩家数据资源
 */
class PlayerData implements Resource {
	public players = new Map<
		string,
		{
			name: string;
			score: number;
			lives: number;
		}
	>();

	addPlayer(id: string, name: string): void {
		this.players.set(id, {
			name,
			score: 0,
			lives: 3,
		});
	}

	removePlayer(id: string): void {
		this.players.delete(id);
	}

	getPlayerCount(): number {
		return this.players.size();
	}
}

/**
 * 网络配置资源
 */
class NetworkConfig implements Resource {
	constructor(
		public serverUrl: string = "localhost:8080",
		public timeout: number = 5000,
		public retryAttempts: number = 3,
		public isConnected: boolean = false,
	) {}
}

// ============= 游戏系统 =============

/**
 * 游戏更新系统
 */
function gameUpdateSystem(world: World, context: Context): void {
	const resources = context.resources;
	// Get deltaTime from time extension
	const deltaTime = context.has("time") ? context.get("time").getDeltaSeconds() : 0.016;

	// 更新游戏状态
	resources.withResourceMut(GameState, (state: GameState) => {
		if (state.isPlaying) {
			state.elapsedTime += deltaTime;

			// 每10秒增加分数
			if (math.floor(state.elapsedTime) % 10 === 0 && math.floor(state.elapsedTime - deltaTime) % 10 !== 0) {
				state.score += 100;
				print(`[Game] Score increased! Current: ${state.score}`);
			}

			// 每30秒升级
			const newLevel = math.floor(state.elapsedTime / 30) + 1;
			if (newLevel > state.level) {
				state.level = newLevel;
				print(`[Game] Level up! Now at level ${state.level}`);
			}
		}
		return state;
	});
}

/**
 * 资源监控系统
 */
function resourceMonitoringSystem(world: World, context: Context): void {
	const monitoring = context.tryGet("resources.monitoring");

	if (!monitoring) {
		return;
	}

	// Get deltaTime from time extension
	const deltaTime = context.has("time") ? context.get("time").getDeltaSeconds() : 0.016;

	// 每5秒输出一次统计
	const gameState = context.resources.getResource(GameState);
	if (
		gameState &&
		math.floor(gameState.elapsedTime) % 5 === 0 &&
		math.floor(gameState.elapsedTime - deltaTime) % 5 !== 0
	) {
		const stats = monitoring.getResourceStatistics();
		print("\n=== Resource Statistics ===");
		print(`Total resources: ${stats.totalCount}`);
		print("Resource types:");
		for (const [typeName, count] of stats.typeCount) {
			print(`  ${typeName}: ${count}`);
		}
		print("===========================\n");
	}
}

/**
 * 资源查询演示系统
 */
function resourceQuerySystem(world: World, context: Context): void {
	const query = context.tryGet("resources.query");
	const metadata = context.tryGet("resources.metadata");

	if (!query || !metadata) {
		return;
	}

	// Get deltaTime from time extension
	const deltaTime = context.has("time") ? context.get("time").getDeltaSeconds() : 0.016;

	// 每8秒执行一次查询演示
	const gameState = context.resources.getResource(GameState);
	if (
		gameState &&
		math.floor(gameState.elapsedTime) % 8 === 0 &&
		math.floor(gameState.elapsedTime - deltaTime) % 8 !== 0
	) {
		print("\n=== Resource Query Demo ===");

		// 获取最近更新的资源
		const recentlyUpdated = query.getRecentlyUpdatedResources(3);
		print("Recently updated resources:");
		for (const item of recentlyUpdated) {
			const meta = item.metadata;
			const timeSince = os.clock() - meta.updated;
			print(`  ${meta.name}: Updated ${string.format("%.2f", timeSince)}s ago`);
		}

		// 查找特定条件的资源
		const hasLargeResources = query.hasResourceWhere((resource, meta) => {
			// 检查是否有"大型"资源（这里用名称长度模拟）
			return meta.name.size() > 15;
		});
		print(`Has large resources: ${hasLargeResources}`);

		// 获取GameConfig的元数据
		const configMeta = metadata.getResourceMetadata(GameConfig);
		if (configMeta) {
			const timeSince = os.clock() - configMeta.created;
			print(`GameConfig created ${string.format("%.1f", timeSince)}s ago`);
		}

		print("==========================\n");
	}
}

// ============= 主程序 =============

print("\n=== ECS Resource Extensions Example ===\n");

// 创建应用并添加资源插件
const app = App.create();

// 初始化资源
const resources = app.context.resources;

// 插入初始资源
resources.insertResource(GameConfig, new GameConfig(1.5, "medium", true, 8));
resources.insertResource(GameState, new GameState());
resources.insertResource(PlayerData, new PlayerData());
resources.insertResource(NetworkConfig, new NetworkConfig("game.server.com", 3000, 5, false));

// 使用便捷操作
const playerData = resources.getOrInsertDefaultResource(PlayerData);
playerData.addPlayer("player1", "Alice");
playerData.addPlayer("player2", "Bob");
print(`Total players: ${playerData.getPlayerCount()}`);

// 批量操作演示
print("\n--- Batch Operations ---");
const batchResources = new Map<any, Resource>();
batchResources.set("TempResource1" as any, { temp: true } as any);
batchResources.set("TempResource2" as any, { temp: true } as any);
print(`Resources after batch insert: ${resources.getResourceCount()}`);

// 启用监控
const monitoring = app.context.get("resources.monitoring");
monitoring.enableResourceMonitoring({
	trackHistory: true,
	maxHistorySize: 50,
});

// 添加系统
app.addSystems(BuiltinSchedules.UPDATE, gameUpdateSystem);
app.addSystems(BuiltinSchedules.POST_UPDATE, resourceMonitoringSystem);
app.addSystems(BuiltinSchedules.POST_UPDATE, resourceQuerySystem);

// 演示资源操作
print("\n--- Resource Operations Demo ---");

// 使用withResource读取配置
resources.withResource(GameConfig, (config: GameConfig) => {
	print(`Game Config: Speed=${config.gameSpeed}, Difficulty=${config.difficulty}`);
	return config;
});

// 修改游戏状态
resources.withResourceMut(GameState, (state: GameState) => {
	state.isPlaying = true;
	print("Game started!");
	return state;
});

// 获取资源元数据
const metadataExt = app.context.get("resources.metadata");
const allMetadata = metadataExt.getAllResourceMetadata();
print(`\nTotal resource types: ${allMetadata.size()}`);

// 运行游戏循环
print("\n--- Running Game Loop ---");
for (let cycle = 1; cycle <= 10; cycle++) {
	print(`\nUpdate cycle ${cycle}:`);
	app.update();
	task.wait(0.1);
}

// 查看资源历史
print("\n--- Resource History ---");
const gameStateHistory = monitoring.getResourceHistory(GameState, 5);
print(`GameState history (last 5 changes):`);
for (const change of gameStateHistory) {
	print(`  ${change.action} at ${string.format("%.2f", change.timestamp)}s`);
}

// 导出快照
const snapshot = monitoring.exportResourceSnapshot();
print(`\n--- Resource Snapshot ---`);
print(`Timestamp: ${string.format("%.2f", snapshot.timestamp)}s`);
print(`Resources: ${snapshot.resources.size()}`);
print(`Metadata entries: ${snapshot.metadata.size()}`);

// 清理
print("\n--- Cleanup ---");

// 禁用监控
monitoring.disableResourceMonitoring();

// 最终统计
print("\n=== Final Statistics ===");
const finalStats = monitoring.getResourceStatistics();
print(`Total resources: ${finalStats.totalCount}`);
print("Resource types:");
for (const [typeName, count] of finalStats.typeCount) {
	print(`  ${typeName}: ${count}`);
}

const gameState = resources.getResource(GameState);
if (gameState) {
	print(`\nFinal game state:`);
	print(`  Score: ${gameState.score}`);
	print(`  Level: ${gameState.level}`);
	print(`  Time played: ${string.format("%.1f", gameState.elapsedTime)}s`);
}

print("\n=== Example Complete ===");
