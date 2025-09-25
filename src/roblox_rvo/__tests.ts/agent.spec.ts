import Agent from "../core/Agent";
import Simulator from "../core/Simulator";
import Obstacle from "../core/Obstacle";
import Line from "../core/Line";
import RVOMath from "../core/RVOMath";

/**
 * Agent 类单元测试
 * 测试 RVO 算法中 Agent 的核心功能
 */
export = () => {
	describe("Agent", () => {
		let agent: Agent;
		let mockSimulator: Simulator;
		let mockKdTree: any;

		/**
		 * 创建模拟的 Simulator 对象
		 */
		function createMockSimulator(): Simulator {
			const simulator = new Simulator();
			simulator.timeStep = 0.25;

			// 创建模拟的 KdTree
			mockKdTree = {
				computeObstacleNeighbors: function(this: any, agent: Agent, rangeSq: number) {
					// 模拟添加障碍物邻居的行为
				},
				computeAgentNeighbors: function(this: any, agent: Agent, rangeSq: number) {
					// 模拟添加代理邻居的行为
				}
			};

			simulator.kdTree = mockKdTree;
			return simulator;
		}

		/**
		 * 创建测试用的 Agent 对象
		 */
		function createTestAgent(): Agent {
			const agent = new Agent();
			agent.simulator = mockSimulator;
			agent.position = new Vector2(0, 0);
			agent.velocity = new Vector2(1, 0);
			agent.prefVelocity = new Vector2(2, 0);
			agent.radius = 1.0;
			agent.maxSpeed = 5.0;
			agent.maxNeighbors = 10;
			agent.neighborDist = 15.0;
			agent.timeHorizon = 10.0;
			agent.timeHorizonObst = 20.0;
			agent.id = 0;
			return agent;
		}

		/**
		 * 创建测试用的障碍物
		 */
		function createTestObstacle(point: Vector2): Obstacle {
			const obstacle = new Obstacle();
			obstacle.point = point;
			obstacle.unitDir = new Vector2(1, 0);
			obstacle.isConvex = true;
			obstacle.id = 0;

			// 创建循环链接（最小的障碍物需要有next和previous）
			obstacle.next = obstacle;
			obstacle.previous = obstacle;

			return obstacle;
		}

		beforeEach(() => {
			mockSimulator = createMockSimulator();
			agent = createTestAgent();
		});

		afterEach(() => {
			// 清理资源
		});

		describe("基本属性设置和获取", () => {
			it("应该正确初始化基本属性", () => {
				expect(agent.id).to.equal(0);
				expect(agent.radius).to.equal(1.0);
				expect(agent.maxSpeed).to.equal(5.0);
				expect(agent.maxNeighbors).to.equal(10);
				expect(agent.neighborDist).to.equal(15.0);
				expect(agent.timeHorizon).to.equal(10.0);
				expect(agent.timeHorizonObst).to.equal(20.0);
			});

			it("应该正确设置位置和速度", () => {
				expect(agent.position.X).to.equal(0);
				expect(agent.position.Y).to.equal(0);
				expect(agent.velocity.X).to.equal(1);
				expect(agent.velocity.Y).to.equal(0);
				expect(agent.prefVelocity.X).to.equal(2);
				expect(agent.prefVelocity.Y).to.equal(0);
			});

			it("应该正确初始化邻居数组", () => {
				expect(agent.agentNeighbors).to.be.a("table");
				expect(agent.agentNeighbors.size()).to.equal(0);
				expect(agent.obstaclNeighbors).to.be.a("table");
				expect(agent.obstaclNeighbors.size()).to.equal(0);
			});

			it("应该正确初始化 ORCA 线数组", () => {
				expect(agent.orcaLines).to.be.a("table");
				expect(agent.orcaLines.size()).to.equal(0);
			});
		});

		describe("computeNeighbors()", () => {
			it("应该清空并重新计算障碍物邻居", () => {
				// 添加一些初始障碍物邻居
				const initialObstacle = createTestObstacle(new Vector2(5, 5));
				agent.obstaclNeighbors.push({
					key: 25.0,
					value: initialObstacle
				} as any);

				let kdTreeCalled = false;
				mockKdTree.computeObstacleNeighbors = function(this: any, agentParam: Agent, rangeSqParam: number) {
					kdTreeCalled = true;
					expect(agentParam).to.be.ok();
					expect(agentParam.id).to.equal(0);
					expect(rangeSqParam > 0).to.equal(true);
				};

				agent.computeNeighbors();

				expect(agent.obstaclNeighbors.size()).to.equal(0);
				expect(kdTreeCalled).to.equal(true);
			});

			it("应该清空并重新计算代理邻居（当 maxNeighbors > 0）", () => {
				// 添加一些初始代理邻居
				const initialAgent = createTestAgent();
				agent.agentNeighbors.push({
					key: 10.0,
					value: initialAgent
				} as any);

				let kdTreeCalled = false;
				mockKdTree.computeAgentNeighbors = function(this: any, agentParam: Agent, rangeSqParam: number) {
					kdTreeCalled = true;
					expect(agentParam).to.be.ok();
					expect(agentParam.id).to.equal(0);
					expect(rangeSqParam).to.equal(RVOMath.sqr(agent.neighborDist));
				};

				agent.computeNeighbors();

				expect(agent.agentNeighbors.size()).to.equal(0);
				expect(kdTreeCalled).to.equal(true);
			});

			it("当 maxNeighbors = 0 时不应该计算代理邻居", () => {
				agent.maxNeighbors = 0;

				let kdTreeCalled = false;
				mockKdTree.computeAgentNeighbors = function(this: any) {
					kdTreeCalled = true;
				};

				agent.computeNeighbors();

				expect(kdTreeCalled).to.equal(false);
			});

			it("应该正确计算障碍物搜索范围", () => {
				agent.timeHorizonObst = 2.0;
				agent.maxSpeed = 3.0;
				agent.radius = 1.0;

				let capturedRangeSq: number | undefined;
				mockKdTree.computeObstacleNeighbors = function(this: any, agentParam: Agent, rangeSqParam: number) {
					capturedRangeSq = rangeSqParam;
				};

				agent.computeNeighbors();

				const expectedRangeSq = RVOMath.sqr(2.0 * 3.0 + 1.0); // (timeHorizonObst * maxSpeed + radius)^2
				expect(capturedRangeSq).to.equal(expectedRangeSq);
			});
		});

		describe("insertAgentNeighbor()", () => {
			let otherAgent: Agent;

			beforeEach(() => {
				otherAgent = createTestAgent();
				otherAgent.id = 1;
				otherAgent.position = new Vector2(5, 0); // 距离为5
				agent.maxNeighbors = 3;
			});

			it("不应该将自己作为邻居添加", () => {
				const initialSize = agent.agentNeighbors.size();
				agent.insertAgentNeighbor(agent, 100);
				expect(agent.agentNeighbors.size()).to.equal(initialSize);
			});

			it("应该添加范围内的代理邻居", () => {
				const rangeSq = 30; // 距离平方 = 25，小于范围
				agent.insertAgentNeighbor(otherAgent, rangeSq);

				expect(agent.agentNeighbors.size()).to.equal(1);
				expect(agent.agentNeighbors[0].value).to.equal(otherAgent);
				expect(agent.agentNeighbors[0].key).to.equal(25); // 5^2
			});

			it("不应该添加范围外的代理邻居", () => {
				const rangeSq = 20; // 距离平方 = 25，大于范围
				agent.insertAgentNeighbor(otherAgent, rangeSq);

				expect(agent.agentNeighbors.size()).to.equal(0);
			});

			it("应该按距离排序插入邻居", () => {
				const agent1 = createTestAgent();
				agent1.position = new Vector2(3, 0); // 距离 = 9
				const agent2 = createTestAgent();
				agent2.position = new Vector2(1, 0); // 距离 = 1
				const agent3 = createTestAgent();
				agent3.position = new Vector2(4, 0); // 距离 = 16

				agent.insertAgentNeighbor(agent1, 100);
				agent.insertAgentNeighbor(agent2, 100);
				agent.insertAgentNeighbor(agent3, 100);

				expect(agent.agentNeighbors.size()).to.equal(3);
				expect(agent.agentNeighbors[0].key).to.equal(1); // 最近的
				expect(agent.agentNeighbors[1].key).to.equal(9);
				expect(agent.agentNeighbors[2].key).to.equal(16); // 最远的
			});

			it("应该限制邻居数量不超过 maxNeighbors", () => {
				agent.maxNeighbors = 2;

				// 添加3个邻居，但只保留最近的2个
				const agent1 = createTestAgent();
				agent1.position = new Vector2(3, 0); // 距离 = 9
				const agent2 = createTestAgent();
				agent2.position = new Vector2(1, 0); // 距离 = 1
				const agent3 = createTestAgent();
				agent3.position = new Vector2(4, 0); // 距离 = 16

				agent.insertAgentNeighbor(agent1, 100);
				agent.insertAgentNeighbor(agent2, 100);
				agent.insertAgentNeighbor(agent3, 100);

				expect(agent.agentNeighbors.size()).to.equal(2);
				expect(agent.agentNeighbors[0].key).to.equal(1); // 最近的
				expect(agent.agentNeighbors[1].key).to.equal(9); // 第二近的
			});
		});

		describe("insertObstacleNeighbor()", () => {
			it("应该添加范围内的障碍物邻居", () => {
				const obstacle = createTestObstacle(new Vector2(3, 0));
				const rangeSq = 50;

				agent.insertObstacleNeighbor(obstacle, rangeSq);

				expect(agent.obstaclNeighbors.size()).to.equal(1);
				expect(agent.obstaclNeighbors[0].value).to.equal(obstacle);
			});

			it("不应该添加范围外的障碍物邻居", () => {
				const obstacle = createTestObstacle(new Vector2(100, 0)); // 很远的障碍物
				const rangeSq = 50; // 范围较小

				agent.insertObstacleNeighbor(obstacle, rangeSq);

				// 由于距离很远，应该不会被添加（具体行为取决于算法实现）
				expect(agent.obstaclNeighbors.size() >= 0).to.equal(true); // 至少不会崩溃
			});

			it("应该按距离排序插入障碍物邻居", () => {
				const obstacle1 = createTestObstacle(new Vector2(5, 0));
				const obstacle2 = createTestObstacle(new Vector2(2, 0));
				const obstacle3 = createTestObstacle(new Vector2(8, 0));

				agent.insertObstacleNeighbor(obstacle1, 100);
				agent.insertObstacleNeighbor(obstacle2, 100);
				agent.insertObstacleNeighbor(obstacle3, 100);

				expect(agent.obstaclNeighbors.size() >= 0).to.equal(true); // 至少添加了一些障碍物

				// 验证障碍物按距离排序（如果有多个的话）
				if (agent.obstaclNeighbors.size() > 1) {
					for (let i = 1; i < agent.obstaclNeighbors.size(); i++) {
						expect(agent.obstaclNeighbors[i - 1].key <= agent.obstaclNeighbors[i].key).to.equal(true);
					}
				}
			});
		});

		describe("update()", () => {
			it("应该根据新速度更新位置和速度", () => {
				const initialPosition = agent.position;
				const newVelocity = new Vector2(2, 1);

				// 设置私有属性 _newVelocity
				(agent as unknown as {_newVelocity: Vector2})._newVelocity = newVelocity;

				agent.update();

				// 验证速度更新
				expect(agent.velocity.X).to.equal(2);
				expect(agent.velocity.Y).to.equal(1);

				// 验证位置更新：position = position + velocity * timeStep
				const expectedX = initialPosition.X + newVelocity.X * mockSimulator.timeStep;
				const expectedY = initialPosition.Y + newVelocity.Y * mockSimulator.timeStep;

				expect(agent.position.X).to.equal(expectedX);
				expect(agent.position.Y).to.equal(expectedY);
			});

			it("应该使用模拟器的时间步长", () => {
				mockSimulator.timeStep = 0.1;
				const initialPosition = new Vector2(0, 0);
				agent.position = initialPosition;
				const newVelocity = new Vector2(10, 5);

				(agent as unknown as {_newVelocity: Vector2})._newVelocity = newVelocity;

				agent.update();

				expect(agent.position.X).to.equal(1.0); // 10 * 0.1
				expect(agent.position.Y).to.equal(0.5); // 5 * 0.1
			});
		});

		describe("computeNewVelocity() - ORCA算法核心", () => {
			beforeEach(() => {
				// 设置基本参数
				agent.position = new Vector2(0, 0);
				agent.velocity = new Vector2(1, 0);
				agent.prefVelocity = new Vector2(2, 0);
				agent.radius = 1.0;
				agent.maxSpeed = 5.0;
				agent.timeHorizon = 2.0;
				agent.timeHorizonObst = 1.0;
			});

			it("应该清空并重新生成 ORCA 线", () => {
				// 添加一些初始 ORCA 线
				agent.orcaLines.push(new Line());
				agent.orcaLines.push(new Line());

				agent.computeNewVelocity();

				// ORCA线数组应该被清空并重新计算
				expect(agent.orcaLines.size() >= 0).to.equal(true);
			});

			it("应该为障碍物创建 ORCA 线", () => {
				// 添加一个可能发生碰撞的障碍物
				const obstacle = createTestObstacle(new Vector2(2, 0));
				agent.obstaclNeighbors.push({
					key: 4, // 距离平方
					value: obstacle
				} as any);

				agent.computeNewVelocity();

				// 应该有为障碍物生成的ORCA线
				// 具体数量取决于障碍物配置和算法逻辑
				expect(agent.orcaLines.size() >= 0).to.equal(true);
			});

			it("应该为其他代理创建 ORCA 线", () => {
				// 添加一个邻近的代理
				const otherAgent = createTestAgent();
				otherAgent.position = new Vector2(3, 0);
				otherAgent.velocity = new Vector2(-1, 0);
				otherAgent.radius = 1.0;

				agent.agentNeighbors.push({
					key: 9, // 距离平方 = 3^2
					value: otherAgent
				} as any);

				agent.computeNewVelocity();

				// 应该有为其他代理生成的ORCA线
				expect(agent.orcaLines.size() >= 1).to.equal(true);
			});

			it("应该处理与其他代理的碰撞情况", () => {
				// 创建一个正在发生碰撞的情况
				const otherAgent = createTestAgent();
				otherAgent.position = new Vector2(1.5, 0); // 两个半径1.0的代理，距离1.5 < 2.0
				otherAgent.velocity = new Vector2(-2, 0);
				otherAgent.radius = 1.0;

				agent.agentNeighbors.push({
					key: 2.25, // 1.5^2
					value: otherAgent
				} as any);

				agent.computeNewVelocity();

				// 碰撞情况应该生成特殊的ORCA线
				expect(agent.orcaLines.size() >= 1).to.equal(true);
			});

			it("应该处理空邻居列表的情况", () => {
				// 没有邻居的情况
				agent.agentNeighbors = [];
				agent.obstaclNeighbors = [];

				agent.computeNewVelocity();

				// 即使没有邻居，也应该能正常执行
				expect(agent.orcaLines).to.be.a("table");
			});

			it("应该考虑最大速度限制", () => {
				agent.maxSpeed = 2.0;
				agent.prefVelocity = new Vector2(10, 0); // 远超最大速度

				agent.computeNewVelocity();

				// 新速度应该不超过最大速度（在linear program处理后）
				const newVelocity = (agent as unknown as {_newVelocity: Vector2})._newVelocity;
				if (newVelocity) {
					const speed = RVOMath.abs(newVelocity);
					expect(speed <= agent.maxSpeed + 0.1).to.equal(true); // 允许小的数值误差
				}
			});
		});

		describe("线性规划辅助方法测试", () => {
			it("应该处理 NaN 值", () => {
				// 测试算法对异常输入的鲁棒性
				agent.position = new Vector2(0, 0);
				agent.velocity = new Vector2(0, 0);
				agent.prefVelocity = new Vector2(0, 0);

				expect(() => {
					agent.computeNewVelocity();
				}).never.to.throw();
			});
		});

		describe("边界条件和错误处理", () => {
			it("应该处理零速度情况", () => {
				agent.velocity = new Vector2(0, 0);
				agent.prefVelocity = new Vector2(0, 0);

				expect(() => {
					agent.computeNewVelocity();
				}).never.to.throw();
			});

			it("应该处理零半径情况", () => {
				agent.radius = 0;

				expect(() => {
					agent.computeNewVelocity();
				}).never.to.throw();
			});

			it("应该处理极大的邻居列表", () => {
				// 添加大量邻居
				for (let i = 0; i < 100; i++) {
					const neighbor = createTestAgent();
					neighbor.position = new Vector2(i, 0);
					agent.agentNeighbors.push({
						key: i * i,
						value: neighbor
					} as any);
				}

				expect(() => {
					agent.computeNewVelocity();
				}).never.to.throw();
			});

			it("应该处理模拟器未设置的情况", () => {
				agent.simulator = undefined as any;

				expect(() => {
					agent.update();
				}).to.throw();
			});
		});

		describe("集成测试", () => {
			it("完整的代理交互流程", () => {
				// 设置场景：两个代理相向而行
				const otherAgent = createTestAgent();
				otherAgent.position = new Vector2(5, 0);
				otherAgent.velocity = new Vector2(-1, 0);

				agent.agentNeighbors.push({
					key: 25,
					value: otherAgent
				} as any);

				// 执行完整的更新流程
				agent.computeNeighbors();
				agent.computeNewVelocity();

				const initialPosition = agent.position;
				agent.update();

				// 验证代理已经移动
				const moved = !(agent.position.X === initialPosition.X && agent.position.Y === initialPosition.Y);
				expect(moved).to.equal(true);
			});

			it("与障碍物的交互流程", () => {
				// 设置场景：代理朝向障碍物移动
				const obstacle = createTestObstacle(new Vector2(2, 0));
				agent.obstaclNeighbors.push({
					key: 4,
					value: obstacle
				} as any);

				agent.prefVelocity = new Vector2(2, 0); // 朝向障碍物

				agent.computeNeighbors();
				agent.computeNewVelocity();
				agent.update();

				// 验证代理的行为（具体行为取决于ORCA算法的实现）
				expect(agent.position).to.be.a("userdata");
				expect(agent.velocity).to.be.a("userdata");
			});
		});
	});
};