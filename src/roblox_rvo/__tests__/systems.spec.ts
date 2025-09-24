/**
 * RVO系统集成测试
 */

import { World } from "@rbxts/matter";
import { RVOAgent, RVOConfig, RVOObstacle, RVOTarget } from "../components";
import { Simulator } from "../simulator";
import {
	syncAgentPositions,
	syncFromSimulator,
	syncNewAgents,
	syncObstacles,
	updateAgentTargets,
} from "../systems";
import { Vector2D } from "../vector2d";
import { AppContext } from "../../bevy_app/context";

// 模拟RVO资源存储
function setupWorldWithSimulator(world: World): Simulator {
	const simulator = new Simulator();
	simulator.setAgentDefaults(50, 10, 100, 1, 2, 5);

	// 存储仿真器到World（模拟插件行为）
	const worldWithResources = world as unknown as Record<string, unknown>;
	worldWithResources["RVO_Simulator"] = simulator;

	return simulator;
}

function getSimulator(world: World): Simulator | undefined {
	const worldWithResources = world as unknown as Record<string, unknown>;
	return worldWithResources["RVO_Simulator"] as Simulator | undefined;
}

export = () => {
	describe("RVO Systems", () => {
		let world: World;
		let context: AppContext;

		beforeEach(() => {
			world = new World();
			context = {
				deltaTime: 0.016,
			} as unknown as AppContext;
		});

		describe("syncNewAgents", () => {
			it("should sync new agents to simulator", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建代理实体
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: new Vector2D(1, 0),
						position: new Vector2D(10, 20),
					}),
				);

				// 同步新代理
				syncNewAgents(world, context);

				// 验证代理已添加到仿真器
				expect(simulator.agents.size()).to.equal(1);
				const agent = world.get(entity, RVOAgent);
				expect(agent!.agentIndex).to.equal(0); // 应该分配了索引

				// 验证仿真器中的位置
				const simPos = simulator.getAgentPosition(0);
				expect(simPos.x).to.equal(10);
				expect(simPos.y).to.equal(20);
			});

			it("should apply custom config to agents", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建带配置的代理
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 3,
						maxSpeed: 7,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
					RVOConfig({
						neighborDist: 100,
						maxNeighbors: 20,
						timeHorizon: 200,
						timeHorizonObst: 2,
					}),
				);

				// 同步
				syncNewAgents(world, context);

				// 验证配置已应用
				const simAgent = simulator.agents[0];
				expect(simAgent.neighborDist).to.equal(100);
				expect(simAgent.maxNeighbors).to.equal(20);
				expect(simAgent.timeHorizon).to.equal(200);
				expect(simAgent.timeHorizonObst).to.equal(2);
			});

			it("should not re-add existing agents", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建已有索引的代理
				const entity = world.spawn(
					RVOAgent({
						agentIndex: 0,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
				);

				// 手动添加到仿真器
				simulator.addAgent(new Vector2D(0, 0));

				// 同步
				syncNewAgents(world, context);

				// 验证没有重复添加
				expect(simulator.agents.size()).to.equal(1);
			});
		});

		describe("syncAgentPositions", () => {
			it("should sync agent positions to simulator", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建并同步代理
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
				);

				syncNewAgents(world, context);

				// 更新位置
				const agent = world.get(entity, RVOAgent)!;
				world.insert(
					entity,
					RVOAgent({
						...agent,
						position: new Vector2D(50, 60),
					}),
				);

				// 同步位置
				syncAgentPositions(world, context);

				// 验证仿真器中的位置
				const simPos = simulator.getAgentPosition(0);
				expect(simPos.x).to.equal(50);
				expect(simPos.y).to.equal(60);
			});
		});

		describe("updateAgentTargets", () => {
			it("should calculate preferred velocity from target", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建代理和目标
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
					RVOTarget({
						targetPosition: new Vector2D(10, 0),
						reached: false,
					}),
				);

				syncNewAgents(world, context);

				// 更新目标
				updateAgentTargets(world, context);

				// 验证期望速度指向目标
				const prefVel = simulator.getAgentPrefVelocity(0);
				expect(prefVel.x > 0).to.equal(true); // 应该向右移动
				expect(math.abs(prefVel.y)).to.be.near(0, 0.01); // Y应该接近0
			});

			it("should mark target as reached when close", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建接近目标的代理
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(9.95, 0),
					}),
					RVOTarget({
						targetPosition: new Vector2D(10, 0),
						reached: false,
					}),
				);

				syncNewAgents(world, context);

				// 更新目标
				updateAgentTargets(world, context);

				// 验证目标标记为已到达
				const target = world.get(entity, RVOTarget);
				expect(target!.reached).to.equal(true);

				// 验证速度设为0
				const prefVel = simulator.getAgentPrefVelocity(0);
				expect(prefVel.x).to.equal(0);
				expect(prefVel.y).to.equal(0);
			});

			it("should limit velocity to max speed", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建远离目标的代理
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
					RVOTarget({
						targetPosition: new Vector2D(100, 0),
						reached: false,
					}),
				);

				syncNewAgents(world, context);
				updateAgentTargets(world, context);

				// 验证速度不超过最大速度
				const agent = world.get(entity, RVOAgent)!;
				const speed = agent.prefVelocity.abs();
				expect(speed).to.be.near(5, 0.01); // 应该等于maxSpeed
			});
		});

		describe("syncFromSimulator", () => {
			it("should sync positions from simulator to ECS", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建代理
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: new Vector2D(1, 0),
						position: new Vector2D(0, 0),
					}),
				);

				syncNewAgents(world, context);

				// 手动更新仿真器中的位置
				simulator.setAgentPosition(0, 25, 30);
				simulator.setAgentPrefVelocity(0, 2, 3);

				// 从仿真器同步
				syncFromSimulator(world, context);

				// 验证ECS组件已更新
				const agent = world.get(entity, RVOAgent)!;
				expect(agent.position.x).to.equal(25);
				expect(agent.position.y).to.equal(30);
			});
		});

		describe("syncObstacles", () => {
			it("should sync obstacles to simulator", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建障碍物
				const vertices = [
					new Vector2D(0, 0),
					new Vector2D(10, 0),
					new Vector2D(10, 10),
					new Vector2D(0, 10),
				];

				const entity = world.spawn(
					RVOObstacle({
						vertices: vertices,
					}),
				);

				// 同步障碍物
				syncObstacles(world, context);

				// 验证障碍物已添加
				expect(simulator.obstacles.size()).to.equal(4); // 每条边一个障碍物
				const obstacle = world.get(entity, RVOObstacle);
				expect(obstacle!.obstacleIndex).to.equal(0);
			});

			it("should not re-add existing obstacles", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建已有索引的障碍物
				const vertices = [new Vector2D(0, 0), new Vector2D(10, 0)];

				const entity = world.spawn(
					RVOObstacle({
						vertices: vertices,
						obstacleIndex: 0,
					}),
				);

				// 同步
				syncObstacles(world, context);

				// 验证没有重复添加
				expect(simulator.obstacles.size()).to.equal(0);
			});
		});

		describe("System Integration", () => {
			it("should handle complete agent lifecycle", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建多个代理
				const agents: Array<number> = [];
				for (let index = 0; index < 5; index++) {
					const entity = world.spawn(
						RVOAgent({
							agentIndex: -1,
							radius: 2,
							maxSpeed: 5,
							prefVelocity: Vector2D.ZERO,
							position: new Vector2D(index * 10, 0),
						}),
						RVOTarget({
							targetPosition: new Vector2D(50, 50),
							reached: false,
						}),
					);
					agents.push(entity);
				}

				// 运行完整的系统流程
				syncNewAgents(world, context);
				syncAgentPositions(world, context);
				updateAgentTargets(world, context);

				// 验证所有代理都已正确设置
				expect(simulator.agents.size()).to.equal(5);
				for (let index = 0; index < 5; index++) {
					const [agentData] = world.get(agents[index], RVOAgent);
					if (agentData) {
						expect(agentData.agentIndex).to.equal(index);
					}

					const prefVel = simulator.getAgentPrefVelocity(index);
					expect(prefVel.abs() > 0).to.equal(true); // 应该有速度
				}

				// 运行仿真步骤
				simulator.run();

				// 同步回ECS
				syncFromSimulator(world, context);

				// 验证位置已更新
				for (let index = 0; index < 5; index++) {
					const [agentData] = world.get(agents[index], RVOAgent);
					if (agentData) {
						const simPos = simulator.getAgentPosition(index);
						expect(agentData.position.x).to.equal(simPos.x);
						expect(agentData.position.y).to.equal(simPos.y);
					}
				}
			});

			it("should handle agents and obstacles together", () => {
				const simulator = setupWorldWithSimulator(world);

				// 创建代理
				const agent = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(-20, 0),
					}),
					RVOTarget({
						targetPosition: new Vector2D(20, 0),
						reached: false,
					}),
				);

				// 创建障碍物（在路径中间）
				const obstacle = world.spawn(
					RVOObstacle({
						vertices: [
							new Vector2D(-5, -5),
							new Vector2D(5, -5),
							new Vector2D(5, 5),
							new Vector2D(-5, 5),
						],
					}),
				);

				// 同步所有内容
				syncNewAgents(world, context);
				syncObstacles(world, context);
				updateAgentTargets(world, context);

				// 验证都已添加
				expect(simulator.agents.size()).to.equal(1);
				expect(simulator.obstacles.size()).to.equal(4);

				// 运行几个仿真步骤
				for (let step = 0; step < 10; step++) {
					updateAgentTargets(world, context);
					simulator.run();
					syncFromSimulator(world, context);
				}

				// 代理应该已经移动但避开障碍物
				const agentComp = world.get(agent, RVOAgent)!;
				expect(agentComp.position.x > -20).to.equal(true); // 应该移动了
			});
		});
	});
};