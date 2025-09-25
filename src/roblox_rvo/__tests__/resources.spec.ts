/**
 * RVO 资源单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { RVOConfig } from "../resources/rvo-config";
import { RVOSimulatorResource } from "../resources/rvo-simulator";

export = () => {
	describe("RVO Resources", () => {
		describe("RVOConfig", () => {
			it("should create config with default values", () => {
				const config = new RVOConfig();
				expect(config.maxAgents).to.equal(1000);
				expect(config.timeStep).to.equal(0.25);
				expect(config.neighborDist).to.equal(15);
				expect(config.maxNeighbors).to.equal(10);
				expect(config.timeHorizon).to.equal(10);
				expect(config.timeHorizonObst).to.equal(10);
				expect(config.radius).to.equal(1.5);
				expect(config.maxSpeed).to.equal(2);
				expect(config.debugDraw).to.equal(false);
				expect(config.autoSimulate).to.equal(true);
				expect(config.kdTreeMaxLeafSize).to.equal(1000);
			});

			it("should create config with custom values", () => {
				const config = new RVOConfig({
					maxAgents: 500,
					timeStep: 0.1,
					radius: 2.0,
					debugDraw: true,
				});
				expect(config.maxAgents).to.equal(500);
				expect(config.timeStep).to.equal(0.1);
				expect(config.radius).to.equal(2.0);
				expect(config.debugDraw).to.equal(true);
				// Other values should still be defaults
				expect(config.maxSpeed).to.equal(2);
			});

			it("should validate config correctly", () => {
				const validConfig = new RVOConfig();
				expect(validConfig.validate()).to.equal(true);

				const invalidConfig1 = new RVOConfig({ maxAgents: -1 });
				expect(invalidConfig1.validate()).to.equal(false);

				const invalidConfig2 = new RVOConfig({ timeStep: 0 });
				expect(invalidConfig2.validate()).to.equal(false);

				const invalidConfig3 = new RVOConfig({ radius: -1 });
				expect(invalidConfig3.validate()).to.equal(false);

				const invalidConfig4 = new RVOConfig({ maxSpeed: 0 });
				expect(invalidConfig4.validate()).to.equal(false);

				const invalidConfig5 = new RVOConfig({ maxNeighbors: -1 });
				expect(invalidConfig5.validate()).to.equal(false);
			});

			it("should get agent defaults", () => {
				const config = new RVOConfig({
					neighborDist: 20,
					maxNeighbors: 15,
					radius: 2.5,
				});

				const defaults = config.getAgentDefaults();
				expect(defaults.neighborDist).to.equal(20);
				expect(defaults.maxNeighbors).to.equal(15);
				expect(defaults.radius).to.equal(2.5);
				expect(defaults.timeHorizon).to.equal(config.timeHorizon);
			});

			it("should clone config", () => {
				const original = new RVOConfig({
					maxAgents: 100,
					timeStep: 0.5,
				});

				const cloned = original.clone();
				expect(cloned.maxAgents).to.equal(100);
				expect(cloned.timeStep).to.equal(0.5);

				// Modifying clone should not affect original
				cloned.maxAgents = 200;
				expect(original.maxAgents).to.equal(100);
			});

			it("should merge configs", () => {
				const config = new RVOConfig();
				config.merge({
					maxAgents: 750,
					debugDraw: true,
				});

				expect(config.maxAgents).to.equal(750);
				expect(config.debugDraw).to.equal(true);
				// Other values unchanged
				expect(config.timeStep).to.equal(0.25);
			});

			it("should create preset configs", () => {
				const defaultConfig = RVOConfig.default();
				expect(defaultConfig.maxAgents).to.equal(1000);

				const performanceConfig = RVOConfig.performance();
				expect(performanceConfig.maxNeighbors).to.equal(5);
				expect(performanceConfig.neighborDist).to.equal(10);

				const qualityConfig = RVOConfig.quality();
				expect(qualityConfig.maxNeighbors).to.equal(20);
				expect(qualityConfig.neighborDist).to.equal(20);
			});
		});

		describe("RVOSimulatorResource", () => {
			it("should create simulator resource", () => {
				const resource = new RVOSimulatorResource();
				expect(resource.simulator).to.be.ok();
				expect(resource.initialized).to.equal(false);
				expect(resource.stats.agentCount).to.equal(0);
				expect(resource.stats.obstacleCount).to.equal(0);
			});

			it("should manage agent registration", () => {
				const resource = new RVOSimulatorResource();

				// Register agent
				resource.registerAgent(1, 100);
				expect(resource.getAgentEntity(100)).to.equal(1);
				expect(resource.getEntityAgent(1)).to.equal(100);
				expect(resource.stats.agentCount).to.equal(1);

				// Register another agent
				resource.registerAgent(2, 101);
				expect(resource.stats.agentCount).to.equal(2);

				// Unregister agent
				resource.unregisterAgent(1);
				expect(resource.getAgentEntity(100)).to.equal(undefined);
				expect(resource.getEntityAgent(1)).to.equal(undefined);
				expect(resource.stats.agentCount).to.equal(1);
			});

			it("should manage obstacle registration", () => {
				const resource = new RVOSimulatorResource();

				// Register obstacle
				resource.registerObstacle(10, 200);
				expect(resource.getObstacleEntity(200)).to.equal(10);
				expect(resource.getEntityObstacle(10)).to.equal(200);
				expect(resource.stats.obstacleCount).to.equal(1);

				// Unregister obstacle
				resource.unregisterObstacle(10);
				expect(resource.getObstacleEntity(200)).to.equal(undefined);
				expect(resource.getEntityObstacle(10)).to.equal(undefined);
				expect(resource.stats.obstacleCount).to.equal(0);
			});

			it("should generate unique IDs", () => {
				const resource = new RVOSimulatorResource();

				const id1 = resource.generateAgentId();
				const id2 = resource.generateAgentId();
				const id3 = resource.generateAgentId();

				expect(id1).to.be.a("number");
				expect(id2).to.equal(id1 + 1);
				expect(id3).to.equal(id2 + 1);

				const obstacleId1 = resource.generateObstacleId();
				const obstacleId2 = resource.generateObstacleId();

				expect(obstacleId1).to.be.a("number");
				expect(obstacleId2).to.equal(obstacleId1 + 1);
			});

			it("should track simulation statistics", () => {
				const resource = new RVOSimulatorResource();

				expect(resource.stats.simulationCount).to.equal(0);
				expect(resource.stats.totalSimulationTime).to.equal(0);

				// Simulate (though this would normally set up agents first)
				resource.initialized = true;
				resource.simulate();

				expect(resource.stats.simulationCount).to.equal(1);
				expect(resource.stats.lastSimulationTime).to.be.a("number");
				expect(resource.stats.totalSimulationTime).to.be.ok();
			});

			it("should calculate average simulation time", () => {
				const resource = new RVOSimulatorResource();

				// No simulations yet
				expect(resource.getAverageSimulationTime()).to.equal(0);

				// After simulations
				resource.stats.simulationCount = 10;
				resource.stats.totalSimulationTime = 0.1; // 100ms total

				const avg = resource.getAverageSimulationTime();
				expect(avg).to.be.near(10, 0.1); // 10ms average
			});

			it("should reset resource", () => {
				const resource = new RVOSimulatorResource();

				// Set up some data
				resource.registerAgent(1, 100);
				resource.registerObstacle(2, 200);
				resource.initialized = true;
				resource.stats.simulationCount = 5;

				// Reset
				resource.reset();

				expect(resource.initialized).to.equal(false);
				expect(resource.stats.agentCount).to.equal(0);
				expect(resource.stats.obstacleCount).to.equal(0);
				expect(resource.stats.simulationCount).to.equal(0);
				expect(resource.getAgentEntity(100)).to.equal(undefined);
				expect(resource.getObstacleEntity(200)).to.equal(undefined);
			});

			it("should handle cleanup", () => {
				const resource = new RVOSimulatorResource();

				resource.registerAgent(1, 100);
				resource.initialized = true;

				resource.cleanup();

				expect(resource.initialized).to.equal(false);
				expect(resource.stats.agentCount).to.equal(0);
			});
		});
	});
};