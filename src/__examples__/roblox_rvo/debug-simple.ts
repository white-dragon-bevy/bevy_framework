/**
 * RVO 调试示例
 * 最简单的示例，带有详细的调试输出
 */

import { Workspace } from "@rbxts/services";
import { App } from "../../bevy_app/app";
import { createRenderPlugin, RobloxInstance, Visibility, VisibilityState, ViewVisibility } from "../../bevy_render";
import { World } from "../../bevy_ecs/bevy-world";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { Schedule } from "../../bevy_ecs/schedule/schedule";
import { RobloxRunnerPlugin } from "../../bevy_app/roblox-adapters";
import { RVOPlugin } from "../../roblox_rvo";
import { RVOAgent, createRVOAgent } from "../../roblox_rvo/components";
import { Transform, transformFromPosition } from "../../bevy_transform/components/transform";
import { TransformPlugin } from "../../bevy_transform/plugin";
import { getRVOSimulator, getRVOStats } from "../../roblox_rvo/helpers";

/**
 * 创建一个测试 Part
 * @param name - Part 名称
 * @param position - 位置
 * @param color - 颜色
 * @returns 创建的 Part
 */
function createTestPart(name: string, position: Vector3, color: BrickColor): Part {
	const part = new Instance("Part");
	part.Name = name;
	part.Shape = Enum.PartType.Ball;
	part.Size = new Vector3(4, 4, 4);
	part.Position = position;
	part.BrickColor = color;
	part.Material = Enum.Material.Neon;
	part.Anchored = true;
	part.CanCollide = false;
	part.Parent = Workspace;

	print(`[CreatePart] 创建了 ${name} 在位置 ${position}`);
	return part;
}

/**
 * 运行调试示例
 */
export function runDebugSimpleExample(): void {
	print("========================================");
	print("RVO 调试示例开始");
	print("========================================");

	const app = new App();

	print("[Setup] 添加插件...");
	app.addPlugin(new RobloxRunnerPlugin());
	app.addPlugin(createRenderPlugin());
	app.addPlugin(new TransformPlugin());
	app.addPlugin(RVOPlugin.debug());
	print("[Setup] 所有插件已添加");

	app.editSchedule(BuiltinSchedules.STARTUP, (schedule: Schedule) => {
		schedule.addSystem({
			name: "DebugSpawnAgent",
			system: (world: World) => {
				print("[Startup] 开始创建 Agent...");

				const position = new Vector3(0, 5, 0);
				const part = createTestPart("TestAgent", position, BrickColor.Red());

				const goalPosition2D = new Vector2(20, 0);
				print(`[Startup] 设置目标位置: ${goalPosition2D}`);

				const entity = world.spawn(
					RobloxInstance({
						instance: part,
						originalParent: Workspace,
					}),
					Visibility({
						state: VisibilityState.Visible,
					}),
					ViewVisibility({
						visible: true,
					}),
					Transform(transformFromPosition(position)),
					RVOAgent(
						createRVOAgent({
							radius: 2,
							maxSpeed: 5,
							preferredVelocity: new Vector2(5, 0),
							goalPosition: goalPosition2D,
						}),
					),
				);

				print(`[Startup] Agent 实体已创建: ${entity}`);

				const simulator = getRVOSimulator(world);
				if (simulator) {
					print(`[Startup] RVO 模拟器已初始化，Agent 数量: ${simulator.getNumAgents()}`);
				} else {
					print("[Startup] 警告: RVO 模拟器未初始化！");
				}
			},
		});
	});

	let debugFrameCount = 0;
	app.editSchedule(BuiltinSchedules.UPDATE, (schedule: Schedule) => {
		schedule.addSystem({
			name: "DebugMonitor",
			system: (world: World) => {
				debugFrameCount++;

				if (debugFrameCount % 30 === 0) {
					print(`[Frame ${debugFrameCount}] ========================================`);

					const simulator = getRVOSimulator(world);
					if (simulator) {
						const agentCount = simulator.getNumAgents();
						print(`[Frame ${debugFrameCount}] RVO Agent 数量: ${agentCount}`);

						if (agentCount > 0) {
							const pos = simulator.getAgentPosition(0);
							const vel = simulator.getAgentVelocity(0);
							const prefVel = simulator.getAgentPrefVelocity(0);
							print(`[Frame ${debugFrameCount}] Agent 0 位置: (${pos.X}, ${pos.Y})`);
							print(`[Frame ${debugFrameCount}] Agent 0 速度: (${vel.X}, ${vel.Y})`);
							print(`[Frame ${debugFrameCount}] Agent 0 首选速度: (${prefVel.X}, ${prefVel.Y})`);
						}
					}

					for (const [entity, transform, agent] of world.query(Transform, RVOAgent)) {
						const pos = transform.cframe.Position;
						print(`[Frame ${debugFrameCount}] Entity ${entity} Transform 位置: ${pos}`);
						print(
							`[Frame ${debugFrameCount}] Entity ${entity} Agent ID: ${agent.agentId}, 启用: ${agent.enabled}`,
						);
						if (agent.currentVelocity) {
							print(
								`[Frame ${debugFrameCount}] Entity ${entity} 当前速度: (${agent.currentVelocity.X}, ${agent.currentVelocity.Y})`,
							);
						}
					}

					const stats = getRVOStats(world);
					if (stats) {
						print(`[Frame ${debugFrameCount}] 统计: Agent=${stats.agentCount}`);
					}
				}
			},
		});

		schedule.addSystem({
			name: "DebugSyncPositions",
			system: (world: World) => {
				for (const [entity, transform, robloxInstance] of world.query(Transform, RobloxInstance)) {
					const instance = robloxInstance.instance;
					if (instance && instance.Parent) {
						(instance as Part).CFrame = transform.cframe;

						if (debugFrameCount === 60) {
							print(`[SyncDebug] Entity ${entity} 同步位置到 Roblox Instance`);
							print(`[SyncDebug] Transform CFrame: ${transform.cframe}`);
							print(`[SyncDebug] Part CFrame: ${(instance as Part).CFrame}`);
						}
					}
				}
			},
		});
	});

	app.run();

	print("RVO 调试示例正在运行...");
	print("观察控制台输出以了解系统状态");
}

runDebugSimpleExample();