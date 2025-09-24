/**
 * RVO插件集成测试
 */

import { App } from "../../bevy_app/app";
import { MainScheduleLabel } from "../../bevy_app/main-schedule";
import { World } from "@rbxts/matter";
import { RVOPlugin } from "../plugin";
import { getRVOConfig, getRVOSimulator } from "../resources";
import { RVOAgent, RVOObstacle, RVOTarget } from "../components";
import { Vector2D } from "../vector2d";

export = () => {
	describe("RVO Plugin", () => {
		describe("Plugin Installation", () => {
			it("should install plugin with default config", () => {
				const app = new App();
				const plugin = new RVOPlugin();

				app.addPlugin(plugin);

				const world = app.getWorld();
				const simulator = getRVOSimulator(world);
				const config = getRVOConfig(world);

				expect(simulator).to.be.ok();
				expect(config).to.be.ok();
				expect(config!.autoUpdate).to.equal(true);
				expect(config!.timeStep).to.equal(0.25);
			});

			it("should install plugin with custom config", () => {
				const app = new App();
				const customConfig = {
					autoUpdate: false,
					defaultRadius: 10,
					defaultMaxSpeed: 20,
					defaultMaxNeighbors: 30,
					defaultNeighborDist: 100,
					defaultTimeHorizon: 200,
					defaultTimeHorizonObst: 3,
					timeStep: 0.5,
				};

				const plugin = new RVOPlugin(customConfig);
				app.addPlugin(plugin);

				const world = app.getWorld();
				const config = getRVOConfig(world);

				expect(config!.autoUpdate).to.equal(false);
				expect(config!.defaultRadius).to.equal(10);
				expect(config!.defaultMaxSpeed).to.equal(20);
				expect(config!.defaultMaxNeighbors).to.equal(30);
				expect(config!.defaultNeighborDist).to.equal(100);
				expect(config!.defaultTimeHorizon).to.equal(200);
				expect(config!.defaultTimeHorizonObst).to.equal(3);
				expect(config!.timeStep).to.equal(0.5);
			});

			it("should be unique plugin", () => {
				const plugin = new RVOPlugin();
				expect(plugin.isUnique()).to.equal(true);
			});

			it("should have correct name", () => {
				const plugin = new RVOPlugin();
				expect(plugin.name()).to.equal("RVOPlugin");
			});
		});

		describe("Simulator Setup", () => {
			it("should configure simulator with default agent settings", () => {
				const app = new App();
				const plugin = new RVOPlugin({
					defaultRadius: 3,
					defaultMaxSpeed: 10,
					defaultMaxNeighbors: 15,
					defaultNeighborDist: 60,
					defaultTimeHorizon: 150,
					defaultTimeHorizonObst: 2,
					timeStep: 0.3,
				});

				app.addPlugin(plugin);

				const world = app.getWorld();
				const simulator = getRVOSimulator(world);

				expect(simulator).to.be.ok();
				expect(simulator!.getTimeStep()).to.equal(0.3);

				// 添加代理来验证默认设置
				const agentIndex = simulator!.addAgent(new Vector2D(0, 0));
				const agent = simulator!.agents[agentIndex];

				expect(agent.radius).to.equal(3);
				expect(agent.maxSpeed).to.equal(10);
				expect(agent.maxNeighbors).to.equal(15);
				expect(agent.neighborDist).to.equal(60);
				expect(agent.timeHorizon).to.equal(150);
				expect(agent.timeHorizonObst).to.equal(2);
			});
		});

		describe("System Registration", () => {
			it("should register systems when autoUpdate is true", () => {
				const app = new App();
				const plugin = new RVOPlugin({ autoUpdate: true });

				app.addPlugin(plugin);

				// 验证系统已注册到正确的调度阶段
				const mainSchedule = app.main();
				const preUpdateSystems = mainSchedule.getSchedule(MainScheduleLabel.PRE_UPDATE);
				const updateSystems = mainSchedule.getSchedule(MainScheduleLabel.UPDATE);
				const postUpdateSystems = mainSchedule.getSchedule(MainScheduleLabel.POST_UPDATE);

				// 验证调度存在
				expect(preUpdateSystems).to.be.ok();
				expect(updateSystems).to.be.ok();
				expect(postUpdateSystems).to.be.ok();
			});

			it("should not register systems when autoUpdate is false", () => {
				const app = new App();
				const plugin = new RVOPlugin({ autoUpdate: false });

				app.addPlugin(plugin);

				// 手动创建代理并验证不会自动更新
				const world = app.getWorld();
				const simulator = getRVOSimulator(world);

				world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 2,
						maxSpeed: 5,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
				);

				// 运行一次更新（但没有自动更新，所以不会同步）
				app.update();

				// 验证代理没有被自动同步
				expect(simulator!.agents.size()).to.equal(0);
			});
		});

		describe("End-to-End Integration", () => {
			it("should handle complete agent workflow", () => {
				const app = new App();
				const plugin = new RVOPlugin({
					autoUpdate: true,
					defaultRadius: 2,
					defaultMaxSpeed: 5,
					timeStep: 0.1,
				});

				app.addPlugin(plugin);
				const world = app.getWorld();

				// 创建代理
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

				// 运行完整的更新周期
				app.update();

				// 验证代理已同步
				const simulator = getRVOSimulator(world)!;
				expect(simulator.agents.size()).to.equal(1);

				// 验证代理已移动
				const agent = world.get(entity, RVOAgent)!;
				expect(agent.position.x > 0).to.equal(true); // 应该向目标移动了
			});

			it("should handle multiple agents with obstacles", () => {
				const app = new App();
				app.addPlugin(new RVOPlugin({ autoUpdate: true }));
				const world = app.getWorld();

				// 创建多个代理
				for (let index = 0; index < 3; index++) {
					world.spawn(
						RVOAgent({
							agentIndex: -1,
							radius: 1,
							maxSpeed: 3,
							prefVelocity: Vector2D.ZERO,
							position: new Vector2D(index * 5, 0),
						}),
						RVOTarget({
							targetPosition: new Vector2D(50, 50),
							reached: false,
						}),
					);
				}

				// 创建障碍物
				world.spawn(
					RVOObstacle({
						vertices: [
							new Vector2D(20, 20),
							new Vector2D(30, 20),
							new Vector2D(30, 30),
							new Vector2D(20, 30),
						],
					}),
				);

				// 运行几个完整的更新周期
				for (let cycle = 0; cycle < 5; cycle++) {
					app.update();
				}

				// 验证仿真器状态
				const simulator = getRVOSimulator(world)!;
				expect(simulator.agents.size()).to.equal(3);
				expect(simulator.obstacles.size()).to.equal(4); // 方形有4条边

				// 验证代理在移动
				for (const [entity, agent] of world.query(RVOAgent)) {
					const distance = agent.position.abs();
					expect(distance > 0).to.equal(true); // 所有代理都应该移动了
				}
			});

			it("should reach targets", () => {
				const app = new App();
				app.addPlugin(
					new RVOPlugin({
						autoUpdate: true,
						timeStep: 0.1,
						defaultMaxSpeed: 10,
					}),
				);
				const world = app.getWorld();

				// 创建接近目标的代理
				const entity = world.spawn(
					RVOAgent({
						agentIndex: -1,
						radius: 1,
						maxSpeed: 10,
						prefVelocity: Vector2D.ZERO,
						position: new Vector2D(0, 0),
					}),
					RVOTarget({
						targetPosition: new Vector2D(5, 0),
						reached: false,
					}),
				);

				// 运行足够的周期以到达目标
				for (let cycle = 0; cycle < 20; cycle++) {
					app.update();

					const target = world.get(entity, RVOTarget);
					if (target && target.reached) {
						break;
					}
				}

				// 验证到达目标
				const target = world.get(entity, RVOTarget)!;
				expect(target.reached).to.equal(true);

				const agent = world.get(entity, RVOAgent)!;
				const distance = agent.position.minus(new Vector2D(5, 0)).abs();
				expect(distance < 0.2).to.equal(true); // 应该非常接近目标
			});
		});

		describe("Resource Access", () => {
			it("should provide access to simulator", () => {
				const app = new App();
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();
				const simulator = getRVOSimulator(world);

				expect(simulator).to.be.ok();
				expect(simulator!.agents).to.be.ok();
				expect(simulator!.obstacles).to.be.ok();
			});

			it("should provide access to config", () => {
				const app = new App();
				const customConfig = { defaultRadius: 7, timeStep: 0.2 };
				app.addPlugin(new RVOPlugin(customConfig));

				const world = app.getWorld();
				const config = getRVOConfig(world);

				expect(config).to.be.ok();
				expect(config!.defaultRadius).to.equal(7);
				expect(config!.timeStep).to.equal(0.2);
			});

			it("should return undefined when plugin not installed", () => {
				const app = new App();
				const world = app.getWorld();

				const simulator = getRVOSimulator(world);
				const config = getRVOConfig(world);

				expect(simulator).to.never.be.ok();
				expect(config).to.never.be.ok();
			});
		});
	});
};