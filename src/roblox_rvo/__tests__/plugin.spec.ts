/**
 * RVOPlugin 单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { App } from "../../bevy_app/app";
import { Transform, createTransform } from "../../bevy_transform/components/transform";
import { TransformPlugin } from "../../bevy_transform/plugin";
import { RVOPlugin } from "../plugin";
import { RVOAgent, createRVOAgent } from "../components/rvo-agent";
import { RVOObstacle, createRectangleObstacle } from "../components/rvo-obstacle";
import { RVOConfig } from "../resources/rvo-config";
import { RVOSimulatorResource } from "../resources/rvo-simulator";
import { getRVOSimulator, getRVOConfig, isRVOInitialized } from "../helpers";

export = () => {
	describe("RVOPlugin", () => {
		let app: App;

		beforeEach(() => {
			app = App.create();
		});

		afterEach(() => {
			if (app) {
				app.cleanup();
			}
		});

		it("should create plugin with correct name", () => {
			const plugin = new RVOPlugin();
			expect(plugin.name()).to.equal("RVOPlugin");
			expect(plugin.isUnique()).to.equal(true);
		});

		it("should register resources", () => {
			const plugin = new RVOPlugin({
				maxAgents: 100,
				timeStep: 0.1,
			});
			app.addPlugin(plugin);

			const config = app.getResource<RVOConfig>();
			expect(config).to.be.ok();
			expect(config!.maxAgents).to.equal(100);
			expect(config!.timeStep).to.equal(0.1);

			const simulatorResource = app.getResource<RVOSimulatorResource>();
			expect(simulatorResource).to.be.ok();
		});

		it("should initialize simulator on startup", () => {
			app.addPlugin(new RVOPlugin());
			app.update(); // Run startup systems

			const context = app.main().getContext();
			expect(isRVOInitialized(context)).to.equal(true);

			const simulator = getRVOSimulator(context);
			expect(simulator).to.be.ok();
		});

		it("should sync agents with Transform", () => {
			app.addPlugin(new TransformPlugin());
			app.addPlugin(new RVOPlugin());

			const world = app.getWorld();

			// Create agent entity
			const entity = world.spawn();
			world.insert(
				entity,
				Transform(createTransform(new CFrame(new Vector3(10, 0, 10)))),
			);
			world.insert(
				entity,
				RVOAgent(
					createRVOAgent({
						radius: 2,
						maxSpeed: 5,
					}),
				),
			);

			// Run systems
			app.update();

			// Check if agent was registered
			const simulatorResource = app.getResource<RVOSimulatorResource>();
			expect(simulatorResource).to.be.ok();
			expect(simulatorResource!.stats.agentCount).to.equal(1);

			// Check agent position
			const agentId = simulatorResource!.getEntityAgent(entity);
			expect(agentId).to.be.ok();

			const simulator = simulatorResource!.simulator;
			const position = simulator.getAgentPosition(agentId!);
			expect(position.X).to.be.near(10, 0.001);
			expect(position.Y).to.be.near(10, 0.001);
		});

		it("should handle multiple agents", () => {
			app.addPlugin(new TransformPlugin());
			app.addPlugin(new RVOPlugin());

			const world = app.getWorld();
			const matterWorld = world;

			// Create multiple agents
			for (let index = 0; index < 5; index++) {
				const entity = matterWorld.spawn();
				matterWorld.insert(
					entity,
					Transform(createTransform(new CFrame(new Vector3(index * 5, 0, 0)))),
				);
				matterWorld.insert(entity, RVOAgent(createRVOAgent()));
			}

			app.update();

			const simulatorResource = app.getResource<RVOSimulatorResource>();
			expect(simulatorResource!.stats.agentCount).to.equal(5);
		});

		it("should register obstacles", () => {
			app.addPlugin(new TransformPlugin());
			app.addPlugin(new RVOPlugin());

			const world = app.getWorld();
			const matterWorld = world;

			// Create obstacle
			const entity = matterWorld.spawn();
			matterWorld.insert(
				entity,
				RVOObstacle(createRectangleObstacle(new Vector2(0, 0), 10, 10)),
			);

			app.update();

			const simulatorResource = app.getResource<RVOSimulatorResource>();
			expect(simulatorResource!.stats.obstacleCount).to.equal(1);
		});

		it("should use different config presets", () => {
			const performancePlugin = RVOPlugin.performance();
			app.addPlugin(performancePlugin);

			const config = app.getResource<RVOConfig>();
			expect(config!.maxNeighbors).to.equal(5);
			expect(config!.neighborDist).to.equal(10);
		});

		it("should validate config", () => {
			const config = new RVOConfig({
				maxAgents: 100,
				radius: 1.5,
				maxSpeed: 3,
			});

			expect(config.validate()).to.equal(true);

			// Test invalid config
			config.maxAgents = -1;
			expect(config.validate()).to.equal(false);
		});

		it("should clean up resources", () => {
			app.addPlugin(new RVOPlugin());
			app.update();

			const simulatorResource = app.getResource<RVOSimulatorResource>();
			expect(simulatorResource!.initialized).to.equal(true);

			app.cleanup();

			// After cleanup, resource should be reset
			expect(simulatorResource!.initialized).to.equal(false);
			expect(simulatorResource!.stats.agentCount).to.equal(0);
		});
	});
};