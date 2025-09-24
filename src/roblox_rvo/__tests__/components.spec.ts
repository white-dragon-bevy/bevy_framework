/**
 * RVO组件单元测试
 */

import { World } from "@rbxts/matter";
import { RVOAgent, RVOConfig, RVODebug, RVOObstacle, RVOTarget } from "../components";
import { Vector2D } from "../vector2d";

export = () => {
	describe("RVO Components", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		describe("RVOAgent Component", () => {
			it("should create agent with default values", () => {
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 5,
						maxSpeed: 2,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
				);

				const agent = world.get(entity, RVOAgent);
				expect(agent).to.be.ok();
				expect(agent!.agentIndex).to.equal(-1);
				expect(agent!.radius).to.equal(5);
				expect(agent!.maxSpeed).to.equal(2);
				expect(agent!.position.x).to.equal(0);
				expect(agent!.position.y).to.equal(0);
			});

			it("should update agent position", () => {
				const entity = world.spawn(
					RVOAgent({
						agentIndex: 0,
						radius: 5,
						maxSpeed: 2,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
				);

				// 更新位置
				const agent = world.get(entity, RVOAgent)!;
				world.insert(
					entity,
					RVOAgent({
						...agent,
						position: new Vector2D(10, 10),
					}),
				);

				const updatedAgent = world.get(entity, RVOAgent);
				expect(updatedAgent!.position.x).to.equal(10);
				expect(updatedAgent!.position.y).to.equal(10);
			});

			it("should handle multiple agents", () => {
				const agents: Array<number> = [];
				for (let index = 0; index < 10; index++) {
					const entity = world.spawn(
						RVOAgent({
							agentIndex: index,
							radius: 2,
							maxSpeed: 3,
							prefVelocity: Vector2D.ZERO,
							position: new Vector2D(index * 10, 0),
						}),
					);
					agents.push(entity);
				}

				// 验证所有代理
				for (let index = 0; index < 10; index++) {
					const [agentData] = world.get(agents[index], RVOAgent);
					expect(agentData).to.be.ok();
					if (agentData) {
						expect(agentData.agentIndex).to.equal(index);
						expect(agentData.position.x).to.equal(index * 10);
					}
				}
			});
		});

		describe("RVOTarget Component", () => {
			it("should create target with position", () => {
				const entity = world.spawn(
					RVOTarget({
						targetPosition: new Vector2D(100, 100),
						reached: false,
					}),
				);

				const target = world.get(entity, RVOTarget);
				expect(target).to.be.ok();
				expect(target!.targetPosition.x).to.equal(100);
				expect(target!.targetPosition.y).to.equal(100);
				expect(target!.reached).to.equal(false);
			});

			it("should mark target as reached", () => {
				const entity = world.spawn(
					RVOTarget({
						targetPosition: new Vector2D(50, 50),
						reached: false,
					}),
				);

				// 标记为已到达
				const target = world.get(entity, RVOTarget)!;
				world.insert(
					entity,
					RVOTarget({
						...target,
						reached: true,
					}),
				);

				const updatedTarget = world.get(entity, RVOTarget);
				expect(updatedTarget!.reached).to.equal(true);
			});
		});

		describe("RVOObstacle Component", () => {
			it("should create obstacle with vertices", () => {
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

				const obstacle = world.get(entity, RVOObstacle);
				expect(obstacle).to.be.ok();
				expect(obstacle!.vertices.size()).to.equal(4);
				expect(obstacle!.obstacleIndex).to.never.be.ok();
			});

			it("should update obstacle index", () => {
				const vertices = [new Vector2D(0, 0), new Vector2D(10, 0)];

				const entity = world.spawn(
					RVOObstacle({
						vertices: vertices,
					}),
				);

				// 设置索引
				const obstacle = world.get(entity, RVOObstacle)!;
				world.insert(
					entity,
					RVOObstacle({
						...obstacle,
						obstacleIndex: 5,
					}),
				);

				const updatedObstacle = world.get(entity, RVOObstacle);
				expect(updatedObstacle!.obstacleIndex).to.equal(5);
			});
		});

		describe("RVOConfig Component", () => {
			it("should create config with parameters", () => {
				const entity = world.spawn(
					RVOConfig({
						neighborDist: 50,
						maxNeighbors: 10,
						timeHorizon: 100,
						timeHorizonObst: 1,
					}),
				);

				const config = world.get(entity, RVOConfig);
				expect(config).to.be.ok();
				expect(config!.neighborDist).to.equal(50);
				expect(config!.maxNeighbors).to.equal(10);
				expect(config!.timeHorizon).to.equal(100);
				expect(config!.timeHorizonObst).to.equal(1);
			});
		});

		describe("RVODebug Component", () => {
			it("should create debug flags", () => {
				const entity = world.spawn(
					RVODebug({
						showVelocity: true,
						showOrcaLines: false,
						showNeighbors: true,
					}),
				);

				const debug = world.get(entity, RVODebug);
				expect(debug).to.be.ok();
				expect(debug!.showVelocity).to.equal(true);
				expect(debug!.showOrcaLines).to.equal(false);
				expect(debug!.showNeighbors).to.equal(true);
			});
		});

		describe("Component Queries", () => {
			it("should query agents with targets", () => {
				// 创建有目标的代理
				for (let index = 0; index < 5; index++) {
					world.spawn(
						RVOAgent({
							agentIndex: index,
							radius: 2,
							maxSpeed: 3,
							prefVelocity: Vector2D.ZERO,
							position: new Vector2D(0, 0),
						}),
						RVOTarget({
							targetPosition: new Vector2D(100, 100),
							reached: false,
						}),
					);
				}

				// 创建没有目标的代理
				for (let index = 5; index < 8; index++) {
					world.spawn(
						RVOAgent({
							agentIndex: index,
							radius: 2,
							maxSpeed: 3,
							prefVelocity: Vector2D.ZERO,
							position: new Vector2D(0, 0),
						}),
					);
				}

				// 查询有目标的代理
				let agentWithTargets = 0;
				for (const [entity, agent, target] of world.query(RVOAgent, RVOTarget)) {
					agentWithTargets++;
					expect(agent).to.be.ok();
					expect(target).to.be.ok();
				}
				expect(agentWithTargets).to.equal(5);

				// 查询所有代理
				let allAgents = 0;
				for (const [entity, agent] of world.query(RVOAgent)) {
					allAgents++;
				}
				expect(allAgents).to.equal(8);
			});

			it("should query agents with config", () => {
				// 创建有配置的代理
				const entity1 = world.spawn(
					RVOAgent({
						agentIndex: 0,
						radius: 2,
						maxSpeed: 3,
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

				// 创建没有配置的代理
				const entity2 = world.spawn(
					RVOAgent({
						agentIndex: 1,
						radius: 2,
						maxSpeed: 3,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(10, 0),
					}),
				);

				// 查询有配置的代理
				let agentsWithConfig = 0;
				for (const [entity, agent, config] of world.query(RVOAgent, RVOConfig)) {
					agentsWithConfig++;
					expect(config.maxNeighbors).to.equal(20);
				}
				expect(agentsWithConfig).to.equal(1);
			});
		});

		describe("Entity Cleanup", () => {
			it("should remove components from entity", () => {
				const entity = world.spawn(
					RVOAgent({
						agentIndex: 0,
						radius: 2,
						maxSpeed: 3,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
					RVOTarget({
						targetPosition: new Vector2D(100, 100),
						reached: false,
					}),
				);

				// 验证组件存在
				expect(world.get(entity, RVOAgent)).to.be.ok();
				expect(world.get(entity, RVOTarget)).to.be.ok();

				// 移除目标组件
				world.remove(entity, RVOTarget);
				expect(world.get(entity, RVOAgent)).to.be.ok();
				expect(world.get(entity, RVOTarget)).to.never.be.ok();

				// 完全销毁实体
				world.despawn(entity);
				expect(world.get(entity, RVOAgent)).to.never.be.ok();
			});
		});
	});
};