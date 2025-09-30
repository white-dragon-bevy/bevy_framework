/**
 * 多智能体导航示例
 * 演示如何使用 RVO 插件实现多个 Agent 相互避让并到达各自目标
 */

import { RunService, Workspace } from "@rbxts/services";
import { App } from "../../bevy_app/app";
import { createRenderPlugin, RobloxInstance, Visibility, VisibilityState, ViewVisibility } from "../../bevy_render";
import { World } from "../../bevy_ecs/bevy-world";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { Schedule } from "../../bevy_ecs/schedule/schedule";
import { component } from "@rbxts/matter";
import { RobloxRunnerPlugin } from "../../bevy_app/roblox-adapters";
import { RVOPlugin } from "../../roblox_rvo";
import { RVOAgent, createRVOAgent } from "../../roblox_rvo/components";
import { setAgentGoal, hasReachedGoal } from "../../roblox_rvo/components/rvo-agent";
import { getRVOStats } from "../../roblox_rvo/helpers";
import { Transform, transformFromPosition } from "../../bevy_transform/components/transform";
import { TransformPlugin } from "../../bevy_transform/plugin";

/**
 * Agent 标记组件，包含目标位置
 */
const AgentMarker = component<{
	startPosition: Vector3;
	goalPosition: Vector3;
	reachedGoal: boolean;
}>("AgentMarker");

/**
 * 创建通用 Part 的辅助函数
 * @param name - Part 名称
 * @param position - 位置
 * @param color - 颜色
 * @param config - 配置参数
 * @returns 创建的Part实例
 */
function createPart(
	name: string,
	position: Vector3,
	color: BrickColor,
	config: { shape: Enum.PartType; size: Vector3; transparency?: number; orientation?: Vector3 },
): Part {
	const part = new Instance("Part");
	part.Name = name;
	part.Shape = config.shape;
	part.Size = config.size;
	part.Position = position;
	part.BrickColor = color;
	part.Material = Enum.Material.Neon;
	part.Anchored = true;
	part.CanCollide = false;
	part.Transparency = config.transparency ?? 0;
	if (config.orientation) {
		part.Orientation = config.orientation;
	}
	part.Parent = Workspace;

	return part;
}

/**
 * 运行多智能体导航示例
 */
export function runMultiAgentNavigationExample(): void {
	print("========================================");
	print("开始运行 RVO 多智能体导航示例");
	print("========================================");

	// 创建应用实例
	const app = new App();

	// 添加必要的插件
	app.addPlugin(new RobloxRunnerPlugin());
	app.addPlugin(createRenderPlugin());
	app.addPlugin(new TransformPlugin());
	app.addPlugin(RVOPlugin.default());

	// 存储所有 Agent 实体
	const agentEntities: Array<number> = [];

	// 定义颜色数组
	const colors = [
		BrickColor.Red(),
		BrickColor.Blue(),
		BrickColor.Green(),
		BrickColor.Yellow(),
		new BrickColor("Magenta"),
		new BrickColor("Deep orange"),
		new BrickColor("Teal"),
		new BrickColor("Hot pink"),
		new BrickColor("Lime green"),
		new BrickColor("Cyan"),
	];

	if (RunService.IsClient()) {
		// 在启动阶段创建 Agent
		app.editSchedule(BuiltinSchedules.STARTUP, (schedule: Schedule) => {
			schedule.addSystem({
				name: "SpawnAgents",
				system: (world: World) => {
					const agentCount = 10;
					const circleRadius = 40;

					for (let index = 0; index < agentCount; index++) {
						// 在圆周上均匀分布起点
						const startAngle = (index / agentCount) * math.pi * 2;
						const startX = math.cos(startAngle) * circleRadius;
						const startZ = math.sin(startAngle) * circleRadius;
						const startPosition = new Vector3(startX, 5, startZ);

						// 目标位置在对面
						const goalAngle = startAngle + math.pi;
						const goalX = math.cos(goalAngle) * circleRadius;
						const goalZ = math.sin(goalAngle) * circleRadius;
						const goalPosition = new Vector3(goalX, 5, goalZ);

						const color = colors[index % colors.size()];

						// 创建 Agent Part
						const agentPart = createPart(`Agent_${index}`, startPosition, color, {
							shape: Enum.PartType.Ball,
							size: new Vector3(3, 3, 3),
						});

						// 创建目标标记
						createPart(`Goal_${index}`, goalPosition, color, {
							shape: Enum.PartType.Cylinder,
							size: new Vector3(0.5, 4, 4),
							transparency: 0.5,
							orientation: new Vector3(0, 0, 90),
						});

						// 创建实体并添加组件
						const entity = world.spawn(
							RobloxInstance({
								instance: agentPart,
								originalParent: Workspace,
							}),
							Visibility({
								state: VisibilityState.Visible,
							}),
							ViewVisibility({
								visible: true,
							}),
							Transform(transformFromPosition(startPosition)),
							RVOAgent(
								createRVOAgent({
									radius: 1.5,
									maxSpeed: 1,
									preferredVelocity: new Vector2(0, 0),
									goalPosition: new Vector2(goalX, goalZ),
									maxNeighbors: 10,
									neighborDist: 5,
									timeHorizon: 10,
									timeHorizonObst: 10,
								}),
							),
							AgentMarker({
								startPosition,
								goalPosition,
								reachedGoal: false,
							}),
						);

						agentEntities.push(entity);
					}

					print(`成功创建 ${agentEntities.size()} 个 RVO Agent`);
				},
			});
		});

		// 更新 Agent 目标速度和同步位置
		let frameCounter = 0;
		app.editSchedule(BuiltinSchedules.UPDATE, (schedule: Schedule) => {
			schedule.addSystem({
				name: "UpdateAgentGoals",
				system: (world: World) => {
					frameCounter++;

					for (const [entity, transform, agentData, marker] of world.query(
						Transform,
						RVOAgent,
						AgentMarker,
					)) {
						// 跳过已到达目标的 Agent
						if (marker.reachedGoal) {
							continue;
						}

						const position3D = transform.cframe.Position;
						const currentPosition2D = new Vector2(position3D.X, position3D.Z);

						if (hasReachedGoal(agentData, currentPosition2D, 2)) {
							print(`Agent ${entity} 到达目标！`);
							world.insert(
								entity,
								AgentMarker({
									...marker,
									reachedGoal: true,
								}),
								RVOAgent({
									...agentData,
									preferredVelocity: new Vector2(0, 0),
								}),
							);
						} else {
							const updatedAgent = setAgentGoal(
								agentData,
								agentData.goalPosition!,
								currentPosition2D,
							);
							world.insert(entity, RVOAgent(updatedAgent));
						}
					}

					// 每 60 帧输出统计信息
					if (frameCounter % 60 === 0) {
						const stats = getRVOStats(world);
						if (stats) {
							const avgTime = string.format("%.2f", stats.averageSimulationTime);
							print(`[Stats] Agents: ${stats.agentCount}, Avg Sim Time: ${avgTime}ms`);
						}
					}

					// 每 120 帧检查进度
					if (frameCounter % 120 === 0) {
						let totalAgents = 0;
						let reachedAgents = 0;

						for (const [entity, marker] of world.query(AgentMarker)) {
							totalAgents++;
							if (marker.reachedGoal) {
								reachedAgents++;
							}
						}

						print(`[Progress] ${reachedAgents}/${totalAgents} Agents 到达目标`);
					}
				},
			});

			// 同步位置到 Roblox 实例
			schedule.addSystem({
				name: "SyncPositions",
				system: (world: World) => {
					for (const [entity, transform, robloxInstance] of world.query(Transform, RobloxInstance)) {
						const instance = robloxInstance.instance;
						if (instance && instance.Parent) {
							(instance as Part).CFrame = transform.cframe;
						}
					}
				},
			});
		});
	}
	// 运行应用
	app.run();

	print("RVO 多智能体导航示例运行中...");
	print("观察 Agent 如何相互避让并到达各自的目标位置");
}

runMultiAgentNavigationExample();