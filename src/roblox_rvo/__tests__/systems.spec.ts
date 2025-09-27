/**
 * RVO 系统单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { App } from "../../bevy_app/app";
import { BevyWorld } from "../../bevy_ecs/bevy-world";
import { Context } from "../../bevy_ecs/types";
import { Transform, transformFromPosition } from "../../bevy_transform/components/transform";
import { TransformPlugin } from "../../bevy_transform/plugin";
import { RVOPlugin } from "../plugin";
import { RVOAgent, createRVOAgent } from "../components/rvo-agent";
import { RVOObstacle, createRectangleObstacle } from "../components/rvo-obstacle";
import { RVOConfig } from "../resources/rvo-config";
import { RVOSimulatorResource } from "../resources/rvo-simulator";
import { syncTransformToRVO } from "../systems/sync-system";
import { simulateRVO } from "../systems/simulate-system";
import { updateTransformFromRVO } from "../systems/update-system";

export = () => {
	describe("RVO Systems", () => {
		describe("Sync System", () => {
			it("should sync Transform to RVO agents", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();
				const simulatorResource = app.getResource<RVOSimulatorResource>()!;

				// Create entity with Transform and RVOAgent
				const entity = world.spawn();
				const position = new Vector3(10, 0, 20);
				world.insert(entity, Transform(transformFromPosition(position)));
				world.insert(entity, RVOAgent(createRVOAgent()));

				// Run sync system
				app.update();

				// Check agent was created in simulator
				const agent = world.get(entity, RVOAgent);
				expect(agent).to.be.ok();
				expect(agent!.agentId).to.be.a("number");

				// Check position was synced
				if (agent!.agentId !== undefined) {
					const simPos = simulatorResource.simulator.getAgentPosition(agent!.agentId);
					expect(simPos.X).to.be.near(10, 0.01);
					expect(simPos.Y).to.be.near(20, 0.01);
				}

				app.cleanup();
			});

			it("should handle agent removal", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();
				const simulatorResource = app.getResource<RVOSimulatorResource>()!;

				// Create agent
				const entity = world.spawn();
				world.insert(entity, Transform(transformFromPosition(new Vector3(0, 0, 0))));
				world.insert(entity, RVOAgent(createRVOAgent()));

				app.update();
				expect(simulatorResource.stats.agentCount).to.equal(1);

				// Remove RVOAgent component
				world.remove(entity, RVOAgent);
				app.update();

				expect(simulatorResource.stats.agentCount).to.equal(0);

				app.cleanup();
			});

			it("should sync obstacles", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();
				const simulatorResource = app.getResource<RVOSimulatorResource>()!;

				// Create obstacle
				const entity = world.spawn();
				world.insert(entity, RVOObstacle(createRectangleObstacle(new Vector2(0, 0), 10, 10)));

				app.update();

				// Check obstacle was added
				expect(simulatorResource.stats.obstacleCount).to.equal(1);

				const obstacle = world.get(entity, RVOObstacle);
				expect(obstacle).to.be.ok();
				expect(obstacle!.obstacleId).to.be.a("number");

				app.cleanup();
			});

			it("should handle disabled agents", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();
				const simulatorResource = app.getResource<RVOSimulatorResource>()!;

				// Create disabled agent
				const entity = world.spawn();
				world.insert(entity, Transform(transformFromPosition(new Vector3(0, 0, 0))));
				world.insert(
					entity,
					RVOAgent(
						createRVOAgent({
							enabled: false,
						}),
					),
				);

				app.update();

				// Disabled agent should not be added to simulator
				expect(simulatorResource.stats.agentCount).to.equal(0);

				const agent = world.get(entity, RVOAgent);
				expect(agent!.agentId).to.equal(undefined);

				app.cleanup();
			});
		});

		describe("Simulate System", () => {
			it("should run simulation", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const simulatorResource = app.getResource<RVOSimulatorResource>()!;

				// Create agent
				const world = app.getWorld();
				const entity = world.spawn();
				world.insert(entity, Transform(transformFromPosition(new Vector3(0, 0, 0))));
				world.insert(
					entity,
					RVOAgent(
						createRVOAgent({
							preferredVelocity: new Vector2(1, 0),
						}),
					),
				);

				app.update();

				// Check simulation ran
				expect(simulatorResource.stats.simulationCount).to.be.ok();
				expect(simulatorResource.stats.simulationCount > 0).to.equal(true);
				expect(simulatorResource.stats.lastSimulationTime).to.be.a("number");

				app.cleanup();
			});

			it("should skip simulation when no agents", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const simulatorResource = app.getResource<RVOSimulatorResource>()!;

				app.update();

				// No simulation should run without agents
				expect(simulatorResource.stats.simulationCount).to.equal(0);

				app.cleanup();
			});

			it("should handle manual simulation control", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());

				// Create plugin with autoSimulate disabled
				const config = new RVOConfig({
					autoSimulate: false,
				});
				app.insertResource(config);
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();
				const simulatorResource = app.getResource<RVOSimulatorResource>()!;

				// Create agent
				const entity = world.spawn();
				world.insert(entity, Transform(transformFromPosition(new Vector3(0, 0, 0))));
				world.insert(entity, RVOAgent(createRVOAgent()));

				app.update();

				// Simulation should not run automatically
				expect(simulatorResource.stats.simulationCount).to.equal(0);

				// Manual simulation
				simulatorResource.simulate();
				expect(simulatorResource.stats.simulationCount).to.equal(1);

				app.cleanup();
			});
		});

		describe("Update System", () => {
			it("should update Transform from RVO", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();

				// Create agent with velocity
				const entity = world.spawn();
				const initialPos = new Vector3(0, 0, 0);
				world.insert(entity, Transform(transformFromPosition(initialPos)));
				world.insert(
					entity,
					RVOAgent(
						createRVOAgent({
							preferredVelocity: new Vector2(1, 0),
							maxSpeed: 2,
						}),
					),
				);

				// Run multiple updates
				for (let index = 0; index < 5; index++) {
					app.update();
				}

				// Check Transform was updated
				const transform = world.get(entity, Transform);
				expect(transform).to.be.ok();
				// Agent should have moved in positive X direction
				expect(transform!.cframe.Position.X > 0).to.equal(true);

				app.cleanup();
			});

			it("should maintain Y position", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();

				// Create agent at specific Y height
				const entity = world.spawn();
				const yHeight = 10;
				world.insert(entity, Transform(transformFromPosition(new Vector3(0, yHeight, 0))));
				world.insert(
					entity,
					RVOAgent(
						createRVOAgent({
							preferredVelocity: new Vector2(1, 1),
						}),
					),
				);

				app.update();
				app.update();

				// Y position should remain unchanged
				const transform = world.get(entity, Transform);
				expect(transform!.cframe.Position.Y).to.equal(yHeight);

				app.cleanup();
			});

			it("should orient agent towards movement direction", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();

				// Create agent moving diagonally
				const entity = world.spawn();
				world.insert(entity, Transform(transformFromPosition(new Vector3(0, 0, 0))));
				world.insert(
					entity,
					RVOAgent(
						createRVOAgent({
							preferredVelocity: new Vector2(1, 1).Unit.mul(2),
							maxSpeed: 2,
						}),
					),
				);

				app.update();
				app.update();

				// Check that agent is oriented towards movement
				const transform = world.get(entity, Transform)!;
				const lookVector = transform.cframe.LookVector;

				// Look vector should point roughly in movement direction
				// For diagonal movement, both X and Z should be positive
				expect(lookVector.X > 0).to.equal(true);
				expect(lookVector.Z > 0).to.equal(true);

				app.cleanup();
			});
		});

		describe("System Integration", () => {
			it("should work together in pipeline", () => {
				const app = App.create();
				app.addPlugin(new TransformPlugin());
				app.addPlugin(new RVOPlugin());

				const world = app.getWorld();

				// Create two agents that will collide
				const agent1 = world.spawn();
				world.insert(agent1, Transform(transformFromPosition(new Vector3(-5, 0, 0))));
				world.insert(
					agent1,
					RVOAgent(
						createRVOAgent({
							preferredVelocity: new Vector2(2, 0),
						}),
					),
				);

				const agent2 = world.spawn();
				world.insert(agent2, Transform(transformFromPosition(new Vector3(5, 0, 0))));
				world.insert(
					agent2,
					RVOAgent(
						createRVOAgent({
							preferredVelocity: new Vector2(-2, 0),
						}),
					),
				);

				// Run full pipeline multiple times
				for (let index = 0; index < 10; index++) {
					app.update();
				}

				// Both agents should have moved and avoided collision
				const transform1 = world.get(agent1, Transform)!;
				const transform2 = world.get(agent2, Transform)!;

				const distance = transform1.cframe.Position.sub(transform2.cframe.Position).Magnitude;

				// Agents should maintain distance (at least their combined radii)
				expect(distance > 2).to.equal(true);

				app.cleanup();
			});
		});
	});
};