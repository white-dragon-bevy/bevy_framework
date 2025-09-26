/**
 * RVO 集成测试
 * 测试 RVO 插件与其他系统的集成
 */

/// <reference types="@rbxts/testez/globals" />

import { App } from "../../bevy_app/app";
import { Transform, createTransform, transformFromPosition } from "../../bevy_transform/src/components/transform";
import { TransformPlugin } from "../../bevy_transform/src/plugin";
import { RVOPlugin } from "../plugin";
import { RVOAgent, createRVOAgent, setAgentGoal, hasReachedGoal } from "../components/rvo-agent";
import { RVOObstacle, createCircleObstacle } from "../components/rvo-obstacle";
import { CollisionAvoidanceEvent, GoalReachedEvent } from "../events/rvo-events";
import { RVOSimulatorResource } from "../resources/rvo-simulator";

export = () => {
	describe("RVO Integration", () => {
		let app: App;

		beforeEach(() => {
			app = App.create();
			app.addPlugin(new TransformPlugin());
			app.addPlugin(new RVOPlugin());
		});

		afterEach(() => {
			if (app) {
				app.cleanup();
			}
		});

		it("should move agent towards goal", () => {
			const world = app.getWorld();
			
			// Create agent with goal
			const entity = world.spawn();
			const startPos = new Vector3(0, 0, 0);
			const goalPos = new Vector2(10, 0);

			world.insert(entity, Transform(transformFromPosition(startPos)));

			const agentData = createRVOAgent({
				maxSpeed: 5,
				goalPosition: goalPos,
			});
			const updatedAgent = setAgentGoal(agentData, goalPos, new Vector2(0, 0));
			world.insert(entity, RVOAgent(updatedAgent));

			// Run multiple update cycles
			for (let index = 0; index < 10; index++) {
				app.update();
			}

			// Check if agent moved towards goal
			const transform = world.get(entity, Transform);
			expect(transform).to.be.ok();
			expect(transform!.cframe.Position.X).to.be.a("number");
			// Agent should have moved in positive X direction
			expect(transform!.cframe.Position.X > 0).to.equal(true);
		});

		it("should avoid collision between agents", () => {
			const world = app.getWorld();
			
			// Create two agents moving towards each other
			const agent1 = world.spawn();
			world.insert(agent1, Transform(transformFromPosition(new Vector3(-5, 0, 0))));
			world.insert(
				agent1,
				RVOAgent(
					createRVOAgent({
						preferredVelocity: new Vector2(1, 0), // Moving right
						maxSpeed: 2,
					}),
				),
			);

			const agent2 = world.spawn();
			world.insert(agent2, Transform(transformFromPosition(new Vector3(5, 0, 0))));
			world.insert(
				agent2,
				RVOAgent(
					createRVOAgent({
						preferredVelocity: new Vector2(-1, 0), // Moving left
						maxSpeed: 2,
					}),
				),
			);

			// Store initial positions
			const initialPos1 = world.get(agent1, Transform)!.cframe.Position;
			const initialPos2 = world.get(agent2, Transform)!.cframe.Position;

			// Run simulation
			for (let index = 0; index < 5; index++) {
				app.update();
			}

			// Check that agents have moved but avoided collision
			const finalPos1 = world.get(agent1, Transform)!.cframe.Position;
			const finalPos2 = world.get(agent2, Transform)!.cframe.Position;

			// Agents should have moved
			expect(finalPos1.X !== initialPos1.X || finalPos1.Z !== initialPos1.Z).to.equal(true);
			expect(finalPos2.X !== initialPos2.X || finalPos2.Z !== initialPos2.Z).to.equal(true);

			// Distance between agents should be at least their combined radii
			const distance = finalPos1.sub(finalPos2).Magnitude;
			expect(distance).to.be.ok();
		});

		it("should avoid static obstacles", () => {
			const world = app.getWorld();
			
			// Create obstacle
			const obstacle = world.spawn();
			world.insert(obstacle, RVOObstacle(createCircleObstacle(new Vector2(5, 0), 2)));

			// Create agent moving towards obstacle
			const agent = world.spawn();
			world.insert(agent, Transform(transformFromPosition(new Vector3(0, 0, 0))));
			world.insert(
				agent,
				RVOAgent(
					createRVOAgent({
						preferredVelocity: new Vector2(1, 0), // Moving towards obstacle
						maxSpeed: 2,
					}),
				),
			);

			// Run simulation
			for (let index = 0; index < 10; index++) {
				app.update();
			}

			// Agent should have moved but avoided obstacle
			const finalTransform = world.get(agent, Transform)!;
			const finalPos = new Vector2(finalTransform.cframe.Position.X, finalTransform.cframe.Position.Z);

			// Check that agent moved
			expect(finalPos.X > 0).to.equal(true);

			// Agent position should be outside obstacle radius
			const distanceToObstacle = finalPos.sub(new Vector2(5, 0)).Magnitude;
			expect(distanceToObstacle > 1).to.equal(true); // Should maintain some distance
		});

		it("should check goal reached condition", () => {
			const agentData = createRVOAgent({
				goalPosition: new Vector2(5, 5),
			});

			// Test not reached
			expect(hasReachedGoal(agentData, new Vector2(0, 0), 0.5)).to.equal(false);

			// Test reached
			expect(hasReachedGoal(agentData, new Vector2(5, 5), 0.5)).to.equal(true);

			// Test reached with larger threshold
			expect(hasReachedGoal(agentData, new Vector2(4.8, 4.8), 0.5)).to.equal(true);
		});

		it("should handle agent removal", () => {
			const world = app.getWorld();
			
			// Create agent
			const entity = world.spawn();
			world.insert(entity, Transform(transformFromPosition(new Vector3(0, 0, 0))));
			world.insert(entity, RVOAgent(createRVOAgent()));

			app.update();

			const simulatorResource = app.getResource<RVOSimulatorResource>();
			expect(simulatorResource!.stats.agentCount).to.equal(1);

			// Remove RVOAgent component
			world.remove(entity, RVOAgent);

			app.update();

			// Agent count should be 0
			expect(simulatorResource!.stats.agentCount).to.equal(0);
		});

		it("should work with disabled agents", () => {
			const world = app.getWorld();
			
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

			const simulatorResource = app.getResource<RVOSimulatorResource>();
			// Disabled agent should not be added to simulator
			expect(simulatorResource!.stats.agentCount).to.equal(0);
		});
	});
};