/**
 * 简单碰撞避免示例
 * 演示基础的 RVO 碰撞避免功能，两个 Agent 相向运动并相互避让
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
import { setAgentGoal } from "../../roblox_rvo/components/rvo-agent";
import { Transform, transformFromPosition } from "../../bevy_transform/components/transform";
import { TransformPlugin } from "../../bevy_transform/plugin";

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

	app.editSchedule(BuiltinSchedules.STARTUP, (schedule: Schedule) => {
		schedule.addSystem({
			name: "SpawnTwoAgents",
			system: (world: World) => {
				print("创建两个相向运动的 Agent...");

				const leftPosition = new Vector3(-30, 5, -5);
				const rightPosition = new Vector3(30, 5, 5);

				const leftPart = createAgentPart("LeftAgent", leftPosition, BrickColor.Red());
				const rightPart = createAgentPart("RightAgent", rightPosition, BrickColor.Blue());

				const leftGoal = new Vector2(30, -5);
				const rightGoal = new Vector2(-30, 5);

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
							preferredVelocity: new Vector2(1, 0),
							goalPosition: leftGoal,
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
							preferredVelocity: new Vector2(-1, 0),
							goalPosition: rightGoal,
						}),
					),
				);

				print(`创建了两个 Agent: Left=${leftEntity}, Right=${rightEntity}`);
			},
		});
	});

	let debugFrame = 0;
	app.editSchedule(BuiltinSchedules.UPDATE, (schedule: Schedule) => {
		schedule.addSystem({
			name: "DebugAgentPositions",
			system: (world: World) => {
				debugFrame++;
				if (debugFrame % 60 === 0) {
					print(`[Frame ${debugFrame}] ==================`);
					for (const [entity, transform, robloxInstance, agent] of world.query(
						Transform,
						RobloxInstance,
						RVOAgent,
					)) {
						const pos = transform.cframe.Position;
						const agentIdStr = agent.agentId !== undefined ? `AgentID=${agent.agentId}` : "未注册";
						const posStr = string.format("(%.1f, %.1f, %.1f)", pos.X, pos.Y, pos.Z);
						print(`[Debug] Entity ${entity} (${agentIdStr}): 位置=${posStr}`);
						if (agent.currentVelocity) {
							const velStr = string.format(
								"(%.2f, %.2f)",
								agent.currentVelocity.X,
								agent.currentVelocity.Y,
							);
							print(`[Debug] Entity ${entity} 速度=${velStr}`);
						}
						if (agent.goalPosition) {
							const goalStr = string.format("(%.1f, %.1f)", agent.goalPosition.X, agent.goalPosition.Y);
							print(`[Debug] Entity ${entity} 目标=${goalStr}`);
						}
					}
				}
			},
		});

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

	app.run();

	print("简单碰撞避免示例运行中...");
	print("观察两个 Agent 如何相互避让通过");
}

runSimpleCollisionAvoidanceExample();