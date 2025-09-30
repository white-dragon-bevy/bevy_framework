/**
 * 简单碰撞避免示例
 * 演示基础的 RVO 碰撞避免功能，两个 Agent 相向运动并相互避让
 */

import { Workspace } from "@rbxts/services";
import { App } from "../../bevy_app/app";
import { createRenderPlugin, RobloxInstance, Visibility, VisibilityState, ViewVisibility } from "../../bevy_render";
import { World } from "../../bevy_ecs/bevy-world";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { RobloxRunnerPlugin } from "../../bevy_app/roblox-adapters";
import { RVOPlugin } from "../../roblox_rvo";
import { RVOAgent, createRVOAgent } from "../../roblox_rvo/components";
import { Transform, transformFromPosition } from "../../bevy_transform/components/transform";
import { TransformPlugin } from "../../bevy_transform/plugin";
import { getRVOSimulator } from "../../roblox_rvo/helpers";

/**
 * 创建一个 Agent Part
 * @param name - Part 名称
 * @param position - 位置
 * @param color - 颜色
 * @returns 创建的 Part
 */
function createAgentPart(name: string, position: Vector3, color: BrickColor): Part {
	const part = new Instance("Part");
	part.Name = name;
	part.Shape = Enum.PartType.Ball;
	part.Size = new Vector3(4, 4, 4);
	part.Position = position;
	part.BrickColor = color;
	part.Material = Enum.Material.Neon;
	part.Anchored = true;
	part.CanCollide = false;
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	part.Parent = Workspace;

	return part;
}

/**
 * 运行简单碰撞避免示例
 */
export function runSimpleCollisionAvoidanceExample(): void {
	print("========================================");
	print("开始运行简单 RVO 碰撞避免示例");
	print("========================================");

	const app = new App();

	app.addPlugin(new RobloxRunnerPlugin());
	app.addPlugin(createRenderPlugin());
	app.addPlugin(new TransformPlugin());
	app.addPlugin(RVOPlugin.default());

	// 客户端：创建和模拟 Agent
	app.addClientSystems(BuiltinSchedules.STARTUP, (world: World) => {
		print("创建两个相向运动的 Agent...");

				const leftPosition = new Vector3(-30, 5, -5);
				const rightPosition = new Vector3(30, 5, 5);

				const leftPart = createAgentPart("LeftAgent", leftPosition, BrickColor.Red());
				const rightPart = createAgentPart("RightAgent", rightPosition, BrickColor.Blue());

				const leftEntity = world.spawn(
					RobloxInstance({
						instance: leftPart,
						originalParent: Workspace,
					}),
					Visibility({
						state: VisibilityState.Visible,
					}),
					ViewVisibility({
						visible: true,
					}),
					Transform(transformFromPosition(leftPosition)),
					RVOAgent(
						createRVOAgent({
							radius: 2,
							maxSpeed: 5,
							preferredVelocity: new Vector2(5, 0.5),
						}),
					),
				);

				const rightEntity = world.spawn(
					RobloxInstance({
						instance: rightPart,
						originalParent: Workspace,
					}),
					Visibility({
						state: VisibilityState.Visible,
					}),
					ViewVisibility({
						visible: true,
					}),
					Transform(transformFromPosition(rightPosition)),
					RVOAgent(
						createRVOAgent({
							radius: 2,
							maxSpeed: 5,
							preferredVelocity: new Vector2(-5, -0.5),
						}),
					),
				);

		print(`创建了两个 Agent: Left=${leftEntity}, Right=${rightEntity}`);
	});

	// 客户端：调试输出
	let debugFrame = 0;
	app.addClientSystems(BuiltinSchedules.UPDATE, (world: World) => {
		debugFrame++;
				if (debugFrame % 60 === 0) {
					print(`[Frame ${debugFrame}] ==================`);

					const simulator = getRVOSimulator(world);
					if (simulator) {
						const agentCount = simulator.getNumAgents();
						print(`[RVO] Agent 数量: ${agentCount}`);

						for (let index = 0; index < agentCount; index++) {
							const pos = simulator.getAgentPosition(index);
							const vel = simulator.getAgentVelocity(index);
							const prefVel = simulator.getAgentPrefVelocity(index);
							const radius = simulator.agents[index].radius;
							const maxSpeed = simulator.agents[index].maxSpeed;

							const posStr = string.format("(%.1f, %.1f)", pos.X, pos.Y);
							const velStr = string.format("(%.2f, %.2f)", vel.X, vel.Y);
							const prefVelStr = string.format("(%.2f, %.2f)", prefVel.X, prefVel.Y);

							print(`[RVO] Agent ${index}: 位置=${posStr} 速度=${velStr} 首选=${prefVelStr}`);
							print(`[RVO] Agent ${index}: 半径=${radius} 最大速度=${maxSpeed}`);
						}

						if (agentCount === 2) {
							const pos0 = simulator.getAgentPosition(0);
							const pos1 = simulator.getAgentPosition(1);
							const distance = pos0.sub(pos1).Magnitude;
							const distStr = string.format("%.2f", distance);
							print(`[RVO] Agent 距离: ${distStr}`);
						}
					}

					for (const [entity, transform, robloxInstance, agent] of world.query(
						Transform,
						RobloxInstance,
						RVOAgent,
					)) {
						const pos = transform.cframe.Position;
						const agentIdStr = agent.agentId !== undefined ? `AgentID=${agent.agentId}` : "未注册";
						const posStr = string.format("(%.1f, %.1f, %.1f)", pos.X, pos.Y, pos.Z);
						print(`[Entity] ${entity} (${agentIdStr}): Transform位置=${posStr}`);

						const prefVelStr = string.format("(%.2f, %.2f)", agent.preferredVelocity.X, agent.preferredVelocity.Y);
						print(`[Entity] ${entity}: 首选速度=${prefVelStr} 半径=${agent.radius} 最大速度=${agent.maxSpeed}`);
				}
			}
	});

	// 客户端：同步位置到 Roblox
	app.addClientSystems(BuiltinSchedules.UPDATE, (world: World) => {
		for (const [entity, transform, robloxInstance] of world.query(Transform, RobloxInstance)) {
					const instance = robloxInstance.instance;
					if (instance && instance.Parent) {
						(instance as Part).CFrame = transform.cframe;
			}
		}
	});

	app.run();

	print("简单碰撞避免示例运行中...");
	print("观察两个 Agent 如何相互避让通过");
}

runSimpleCollisionAvoidanceExample();