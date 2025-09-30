/**
 * Simple Replication Example - 基础网络同步示例
 *
 * 此示例演示如何使用 SimpleReplicationPlugin 进行服务端-客户端实体同步。
 *
 * 功能展示:
 * - 服务端创建可复制实体
 * - 客户端自动接收实体更新
 * - ToAllPlayers: 所有玩家可见的组件
 * - ToSelfOnly: 仅自己可见的组件
 *
 * 运行方式:
 * - 服务端: 创建实体并修改组件
 * - 客户端: 自动同步并显示实体状态
 */

import { component, useHookState, useDeltaTime } from "@rbxts/matter";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { SimpleReplicationPlugin, MockNetworkAdapter } from "../../simple_replication";
import type { World } from "@rbxts/matter";

// ============================================================================
// 组件定义
// ============================================================================

/**
 * 位置组件 - 所有玩家可见
 */
const Position = component<{ x: number; y: number; z: number }>("Position");

/**
 * 速度组件 - 所有玩家可见
 */
const Velocity = component<{ vx: number; vy: number; vz: number }>("Velocity");

/**
 * 玩家私有数据组件 - 仅自己可见
 */
const PlayerPrivateData = component<{ gold: number; secrets: string }>("PlayerPrivateData");

/**
 * 显示名称组件 - 所有玩家可见
 */
const DisplayName = component<{ name: string; color: Color3 }>("DisplayName");

// ============================================================================
// 服务端系统
// ============================================================================

/**
 * 服务端初始化系统
 * 创建测试实体并设置初始状态
 */
function serverInitSystem(world: World): void {
	// 仅运行一次
	const hook = useHookState("serverInit") as { initialized?: boolean };
	if (hook.initialized) {
		return;
	}

	hook.initialized = true;

	print("[Server] 🎮 初始化服务端实体...");

	// 创建实体1 - 所有玩家可见
	const entity1 = world.spawn(
		Position({ x: 10, y: 5, z: 0 }),
		Velocity({ vx: 1, vy: 0, vz: 0 }),
		DisplayName({ name: "Player1", color: Color3.fromRGB(255, 0, 0) }),
	);
	print(`[Server] ✅ 创建实体 ${entity1} - 所有玩家可见`);

	// 创建实体2 - 包含私有数据
	const entity2 = world.spawn(
		Position({ x: 0, y: 5, z: 10 }),
		Velocity({ vx: 0, vy: 1, vz: 0 }),
		DisplayName({ name: "Player2", color: Color3.fromRGB(0, 255, 0) }),
		PlayerPrivateData({ gold: 1000, secrets: "This is secret!" }),
	);
	print(`[Server] ✅ 创建实体 ${entity2} - 包含私有数据`);
}

/**
 * 服务端更新系统
 * 定期更新实体位置
 */
function serverUpdateSystem(world: World): void {
	const state = useHookState("serverUpdate") as { elapsedTime: number; lastUpdate: number };
	if (state.elapsedTime === undefined) {
		state.elapsedTime = 0;
		state.lastUpdate = 0;
	}

	const deltaTime = useDeltaTime();
	state.elapsedTime += deltaTime;

	// 每1秒更新一次
	if (state.elapsedTime - state.lastUpdate < 1) {
		return;
	}

	state.lastUpdate = state.elapsedTime;

	// 更新所有实体的位置
	for (const [entityId, position, velocity] of world.query(Position, Velocity)) {
		const newPosition = {
			x: position.x + velocity.vx,
			y: position.y + velocity.vy,
			z: position.z + velocity.vz,
		};

		world.insert(entityId, Position(newPosition));

		print(
			`[Server] 📍 更新实体 ${entityId} 位置: (${string.format("%.1f", newPosition.x)}, ${string.format("%.1f", newPosition.y)}, ${string.format("%.1f", newPosition.z)})`,
		);
	}

	// 更新玩家金币数
	for (const [entityId, privateData] of world.query(PlayerPrivateData)) {
		const newData = {
			gold: privateData.gold + 10,
			secrets: privateData.secrets,
		};

		world.insert(entityId, PlayerPrivateData(newData));

		print(`[Server] 💰 玩家金币增加: ${newData.gold}`);
	}
}

// ============================================================================
// 客户端系统
// ============================================================================

/**
 * 客户端显示系统
 * 显示从服务端同步的实体
 */
function clientDisplaySystem(world: World): void {
	const state = useHookState("clientDisplay") as { lastCount?: number };
	if (state.lastCount === undefined) {
		state.lastCount = 0;
	}

	// 统计实体数量
	let entityCount = 0;
	const displayInfos = new Array<string>();

	for (const [entityId, position, displayName] of world.query(Position, DisplayName)) {
		entityCount++;

		const info = `  实体 ${entityId}: ${displayName.name} at (${string.format("%.1f", position.x)}, ${string.format("%.1f", position.y)}, ${string.format("%.1f", position.z)})`;
		displayInfos.push(info);
	}

	// 仅在实体数量变化时打印
	if (entityCount !== state.lastCount) {
		state.lastCount = entityCount;

		print(`[Client] 📊 同步的实体数量: ${entityCount}`);
		for (const info of displayInfos) {
			print(info);
		}
	}

	// 显示私有数据（如果有）
	for (const [entityId, privateData] of world.query(PlayerPrivateData)) {
		print(`[Client] 🔐 私有数据 - 金币: ${privateData.gold}, 秘密: ${privateData.secrets}`);
	}
}

// ============================================================================
// 插件配置
// ============================================================================

/**
 * 配置复制插件
 * 指定哪些组件需要同步以及同步方式
 */
function configureReplication(): SimpleReplicationPlugin {
	// 创建模拟网络适配器（用于示例演示）
	const mockAdapter = new MockNetworkAdapter();

	const plugin = new SimpleReplicationPlugin(
		mockAdapter,
		{
			debugEnabled: true, // 启用调试输出
			forceMode: "server", // 示例中强制为服务端模式
		},
		{
			toAllPlayers: new Set([Position, Velocity, DisplayName]),
			toSelfOnly: new Set([PlayerPrivateData]),
		},
	);

	return plugin;
}

// ============================================================================
// 主函数
// ============================================================================

/**
 * 创建并配置应用
 */
export function main(): App {
	print("========================================");
	print("Simple Replication Example - 基础网络同步");
	print("========================================");

	const app = App.create();

	// 添加默认插件
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加简单复制插件
	const replicationPlugin = configureReplication();
	app.addPlugin(replicationPlugin);

	// 添加服务端系统
	app.addSystems(MainScheduleLabel.STARTUP, serverInitSystem);
	app.addSystems(MainScheduleLabel.UPDATE, serverUpdateSystem);

	// 添加客户端系统
	app.addSystems(MainScheduleLabel.UPDATE, clientDisplaySystem);

	print("========================================");
	print("功能说明:");
	print("  • 服务端每秒更新实体位置");
	print("  • 客户端自动接收并显示实体");
	print("  • Position/Velocity/DisplayName - 所有玩家可见");
	print("  • PlayerPrivateData - 仅自己可见");
	print("========================================");

	return app;
}

// 运行示例
const app = main();
app.run();