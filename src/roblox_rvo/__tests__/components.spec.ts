/**
 * RVO 组件单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import {
	RVOAgent,
	createRVOAgent,
	setAgentGoal,
	hasReachedGoal,
	RVOAgentData,
} from "../components/rvo-agent";
import {
	RVOObstacle,
	createRVOObstacle,
	createRectangleObstacle,
	createCircleObstacle,
	createLineObstacle,
	transformObstacleVertices,
} from "../components/rvo-obstacle";

export = () => {
	describe("RVO Components", () => {
		describe("RVOAgent", () => {
			it("should create agent with default values", () => {
				const agent = createRVOAgent();
				expect(agent.radius).to.equal(1.5);
				expect(agent.maxSpeed).to.equal(2.0);
				expect(agent.maxNeighbors).to.equal(10);
				expect(agent.neighborDist).to.equal(15);
				expect(agent.timeHorizon).to.equal(10);
				expect(agent.timeHorizonObst).to.equal(10);
				expect(agent.enabled).to.equal(true);
				expect(agent.targetVelocity.X).to.equal(0);
				expect(agent.targetVelocity.Y).to.equal(0);
			});

			it("should create agent with custom values", () => {
				const agent = createRVOAgent({
					radius: 2.5,
					maxSpeed: 5.0,
					enabled: false,
					targetVelocity: new Vector2(1, 2),
				});
				expect(agent.radius).to.equal(2.5);
				expect(agent.maxSpeed).to.equal(5.0);
				expect(agent.enabled).to.equal(false);
				expect(agent.targetVelocity.X).to.equal(1);
				expect(agent.targetVelocity.Y).to.equal(2);
			});

			it("should set agent goal correctly", () => {
				const agent = createRVOAgent();
				const goalPosition = new Vector2(10, 10);
				const currentPosition = new Vector2(0, 0);

				const updatedAgent = setAgentGoal(agent, goalPosition, currentPosition);

				expect(updatedAgent.goalPosition).to.be.ok();
				expect(updatedAgent.goalPosition!.X).to.equal(10);
				expect(updatedAgent.goalPosition!.Y).to.equal(10);

				// Should have non-zero preferred velocity
				expect(updatedAgent.preferredVelocity.Magnitude).to.be.near(agent.maxSpeed, 0.1);
			});

			it("should detect when agent reached goal", () => {
				const agent = createRVOAgent({
					goalPosition: new Vector2(5, 5),
				});

				// Not at goal
				expect(hasReachedGoal(agent, new Vector2(0, 0), 0.5)).to.equal(false);
				expect(hasReachedGoal(agent, new Vector2(3, 3), 0.5)).to.equal(false);

				// At goal
				expect(hasReachedGoal(agent, new Vector2(5, 5), 0.5)).to.equal(true);
				expect(hasReachedGoal(agent, new Vector2(5.3, 5.3), 0.5)).to.equal(true);

				// Agent without goal
				const agentNoGoal = createRVOAgent();
				expect(hasReachedGoal(agentNoGoal, new Vector2(0, 0), 0.5)).to.equal(false);
			});

			it("should handle zero distance to goal", () => {
				const agent = createRVOAgent();
				const position = new Vector2(5, 5);

				const updatedAgent = setAgentGoal(agent, position, position);

				expect(updatedAgent.preferredVelocity.X).to.equal(0);
				expect(updatedAgent.preferredVelocity.Y).to.equal(0);
			});
		});

		describe("RVOObstacle", () => {
			it("should create obstacle with vertices", () => {
				const vertices = [new Vector2(0, 0), new Vector2(1, 0), new Vector2(1, 1), new Vector2(0, 1)];

				const obstacle = createRVOObstacle(vertices);

				expect(obstacle.vertices.size()).to.equal(4);
				expect(obstacle.enabled).to.equal(true);
			});

			it("should reject obstacle with too few vertices", () => {
				expect(() => {
					createRVOObstacle([new Vector2(0, 0)]);
				}).to.throw();
			});

			it("should create rectangle obstacle", () => {
				const obstacle = createRectangleObstacle(new Vector2(5, 5), 10, 10);

				expect(obstacle.vertices.size()).to.equal(4);
				expect(obstacle.isConvex).to.equal(true);
				expect(obstacle.enabled).to.equal(true);

				// Check corners
				const minX = math.min(...obstacle.vertices.map((v) => v.X));
				const maxX = math.max(...obstacle.vertices.map((v) => v.X));
				const minY = math.min(...obstacle.vertices.map((v) => v.Y));
				const maxY = math.max(...obstacle.vertices.map((v) => v.Y));

				expect(minX).to.be.near(0, 0.001);
				expect(maxX).to.be.near(10, 0.001);
				expect(minY).to.be.near(0, 0.001);
				expect(maxY).to.be.near(10, 0.001);
			});

			it("should create circle obstacle", () => {
				const center = new Vector2(0, 0);
				const radius = 5;
				const segments = 8;

				const obstacle = createCircleObstacle(center, radius, segments);

				expect(obstacle.vertices.size()).to.equal(segments);
				expect(obstacle.isConvex).to.equal(true);

				// Check all vertices are at correct distance from center
				for (const vertex of obstacle.vertices) {
					const distance = vertex.sub(center).Magnitude;
					expect(distance).to.be.near(radius, 0.001);
				}
			});

			it("should create line obstacle", () => {
				const start = new Vector2(0, 0);
				const endPoint = new Vector2(10, 0);

				const obstacle = createLineObstacle(start, endPoint);

				expect(obstacle.vertices.size()).to.equal(2);
				expect(obstacle.isConvex).to.equal(true);
				expect(obstacle.vertices[0]).to.equal(start);
				expect(obstacle.vertices[1]).to.equal(endPoint);
			});

			it("should detect convex polygons", () => {
				// Convex square
				const convexVertices = [
					new Vector2(0, 0),
					new Vector2(1, 0),
					new Vector2(1, 1),
					new Vector2(0, 1),
				];
				const convexObstacle = createRVOObstacle(convexVertices);
				expect(convexObstacle.isConvex).to.equal(true);

				// Concave polygon (L-shape)
				const concaveVertices = [
					new Vector2(0, 0),
					new Vector2(2, 0),
					new Vector2(2, 1),
					new Vector2(1, 1),
					new Vector2(1, 2),
					new Vector2(0, 2),
				];
				const concaveObstacle = createRVOObstacle(concaveVertices);
				expect(concaveObstacle.isConvex).to.equal(false);
			});

			it("should transform obstacle vertices", () => {
				const obstacle = createRectangleObstacle(new Vector2(0, 0), 2, 2);
				const transform = new CFrame(new Vector3(10, 0, 10)).mul(
					CFrame.Angles(0, math.rad(45), 0),
				);

				const transformed = transformObstacleVertices(obstacle, transform);

				expect(transformed.size()).to.equal(4);

				// Check that center moved to approximately (10, 10)
				let sumX = 0;
				let sumZ = 0;
				for (const vertex of transformed) {
					sumX += vertex.X;
					sumZ += vertex.Y;
				}
				const centerX = sumX / 4;
				const centerZ = sumZ / 4;

				expect(centerX).to.be.near(10, 0.1);
				expect(centerZ).to.be.near(10, 0.1);
			});
		});

		describe("Component Integration", () => {
			it("should work with Matter ECS", () => {
				// Test that components can be used with Matter
				const agentData = RVOAgent(createRVOAgent());
				expect(agentData).to.be.ok();

				const obstacleData = RVOObstacle(createRectangleObstacle(new Vector2(0, 0), 5, 5));
				expect(obstacleData).to.be.ok();
			});
		});
	});
};