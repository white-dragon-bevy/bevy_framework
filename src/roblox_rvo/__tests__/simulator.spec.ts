/**
 * Simulator单元测试
 */

import { Simulator } from "../simulator";
import { Vector2D } from "../vector2d";

export = () => {
	describe("Simulator", () => {
		let simulator: Simulator;

		beforeEach(() => {
			simulator = new Simulator();
		});

		it("should create simulator with default values", () => {
			expect(simulator.getTimeStep()).to.equal(0.25);
			expect(simulator.getGlobalTime()).to.equal(0);
			expect(simulator.getNumAgents()).to.equal(0);
		});

		it("should set time step correctly", () => {
			simulator.setTimeStep(0.5);
			expect(simulator.getTimeStep()).to.equal(0.5);
		});

		it("should set agent defaults", () => {
			// This should not throw error
			expect(() => {
				simulator.setAgentDefaults(10, 5, 1, 0.5, 2, 10);
			}).to.never.throw();
		});

		it("should add agent with default configuration", () => {
			simulator.setAgentDefaults(10, 5, 1, 0.5, 2, 10);
			const agentIndex = simulator.addAgent(new Vector2D(10, 20));

			expect(agentIndex).to.equal(0);
			expect(simulator.getNumAgents()).to.equal(1);

			const position = simulator.getAgentPosition(0);
			expect(position.x).to.equal(10);
			expect(position.y).to.equal(20);
		});

		it("should add multiple agents", () => {
			simulator.setAgentDefaults(10, 5, 1, 0.5, 2, 10);

			const agent1 = simulator.addAgent(new Vector2D(0, 0));
			const agent2 = simulator.addAgent(new Vector2D(10, 10));
			const agent3 = simulator.addAgent(new Vector2D(20, 20));

			expect(agent1).to.equal(0);
			expect(agent2).to.equal(1);
			expect(agent3).to.equal(2);
			expect(simulator.getNumAgents()).to.equal(3);
		});

		it("should set and get agent properties", () => {
			simulator.setAgentDefaults(10, 5, 1, 0.5, 2, 10);
			const agentIndex = simulator.addAgent();

			// Set position
			simulator.setAgentPosition(agentIndex, 5, 10);
			const position = simulator.getAgentPosition(agentIndex);
			expect(position.x).to.equal(5);
			expect(position.y).to.equal(10);

			// Set preferred velocity
			simulator.setAgentPrefVelocity(agentIndex, 1, 2);
			const prefVelocity = simulator.getAgentPrefVelocity(agentIndex);
			expect(prefVelocity.x).to.equal(1);
			expect(prefVelocity.y).to.equal(2);

			// Set goal
			simulator.setAgentGoal(agentIndex, 100, 200);
			const goal = simulator.getGoal(agentIndex);
			expect(goal.x).to.equal(100);
			expect(goal.y).to.equal(200);
		});

		it("should add obstacles", () => {
			const vertices = [
				new Vector2D(0, 0),
				new Vector2D(10, 0),
				new Vector2D(10, 10),
				new Vector2D(0, 10),
			];

			const obstacleIndex = simulator.addObstacle(vertices);
			expect(obstacleIndex).to.equal(0);
			expect(simulator.getObstacles().size()).to.equal(4);
		});

		it("should reject obstacles with less than 2 vertices", () => {
			const vertices = [new Vector2D(0, 0)];
			const obstacleIndex = simulator.addObstacle(vertices);
			expect(obstacleIndex).to.equal(-1);
		});

		it("should process obstacles", () => {
			const vertices = [
				new Vector2D(0, 0),
				new Vector2D(10, 0),
				new Vector2D(10, 10),
			];

			simulator.addObstacle(vertices);

			// This should not throw
			expect(() => {
				simulator.processObstacles();
			}).to.never.throw();
		});

		it("should check if agents reached goal", () => {
			simulator.setAgentDefaults(10, 5, 1, 0.5, 2, 10);

			const agent1 = simulator.addAgent(new Vector2D(10, 10));
			const agent2 = simulator.addAgent(new Vector2D(20, 20));

			// Agents start at their goal positions
			expect(simulator.reachedGoal()).to.equal(true);

			// Move an agent away from its goal
			simulator.setAgentPosition(agent1, 50, 50);
			expect(simulator.reachedGoal()).to.equal(false);

			// Move agent back to goal
			simulator.setAgentPosition(agent1, 10, 10);
			expect(simulator.reachedGoal()).to.equal(true);
		});

		it("should run simulation step", () => {
			simulator.setAgentDefaults(10, 5, 1, 0.5, 2, 10);
			simulator.addAgent(new Vector2D(0, 0));
			simulator.addAgent(new Vector2D(10, 10));

			const initialTime = simulator.getGlobalTime();
			simulator.run();
			const newTime = simulator.getGlobalTime();

			expect(newTime).to.equal(initialTime + simulator.getTimeStep());
		});

		it("should test visibility between points", () => {
			const point1 = new Vector2D(0, 0);
			const point2 = new Vector2D(10, 10);
			const radius = 1;

			// Without obstacles, should be visible
			const visible = simulator.queryVisibility(point1, point2, radius);
			expect(visible).to.equal(true);
		});
	});
};