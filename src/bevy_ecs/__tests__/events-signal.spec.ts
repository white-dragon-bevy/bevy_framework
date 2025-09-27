/**
 * Event System Tests
 * 测试基于 rbx-better-signal 的事件系统
 */

import { World, Entity } from "@rbxts/matter";
import {
	Event,
	EntityEvent,
	EventManager,
	EventPropagator,
	createEvent,
	createEntityEvent,
	ObserverBuilder,
	ObserverConnection,
	PropagationConfig,
} from "../events";

// 测试用事件类型
class TestEvent implements Event {
	readonly eventType = "TestEvent";
	constructor(public value: number) {}
}

class TestEntityEvent implements EntityEvent {
	readonly eventType = "TestEntityEvent";
	constructor(
		public entity: Entity,
		public damage: number,
	) {}

	getEventTarget(): Entity {
		return this.entity;
	}

	setEventTarget(entity: Entity): void {
		this.entity = entity;
	}
}

// 使用工厂函数创建的事件
const SimpleEvent = createEvent("SimpleEvent", { message: "" as string });
const DamageEvent = createEntityEvent("DamageEvent", { entity: 0 as Entity, amount: 0 as number });

export = () => {
	let world: World;
	let eventManager: EventManager;

	beforeEach(() => {
		world = new World();
		eventManager = new EventManager(world);
	});

	afterEach(() => {
		eventManager.cleanup();
	});

	describe("EventManager", () => {
		it("should register event types", () => {
			const eventKey = eventManager.registerEventType(TestEvent);
			expect(eventKey).to.be.ok();

			const retrievedKey = eventManager.getEventKey(TestEvent);
			expect(retrievedKey).to.be.ok();
			expect(retrievedKey!.equals(eventKey)).to.equal(true);
		});

		it("should trigger global events", () => {
			let receivedValue = 0;
			let callCount = 0;

			eventManager.addObserver(TestEvent, (event) => {
				receivedValue = event.value;
				callCount++;
			});

			eventManager.trigger(new TestEvent(42));

			expect(receivedValue).to.equal(42);
			expect(callCount).to.equal(1);
		});

		it("should handle multiple observers", () => {
			let count1 = 0;
			let count2 = 0;
			let count3 = 0;

			eventManager.addObserver(TestEvent, () => count1++);
			eventManager.addObserver(TestEvent, () => count2++);
			eventManager.addObserver(TestEvent, () => count3++);

			eventManager.trigger(new TestEvent(1));

			expect(count1).to.equal(1);
			expect(count2).to.equal(1);
			expect(count3).to.equal(1);
		});

		it("should disconnect observers", () => {
			let callCount = 0;

			const connection = eventManager.addObserver(TestEvent, () => {
				callCount++;
			});

			eventManager.trigger(new TestEvent(1));
			expect(callCount).to.equal(1);

			connection.disconnect();

			eventManager.trigger(new TestEvent(2));
			expect(callCount).to.equal(1); // 应该还是1，没有增加
		});

		it("should trigger entity-specific events", () => {
			const entity1 = world.spawn() as Entity;
			const entity2 = world.spawn() as Entity;

			let entity1Count = 0;
			let entity2Count = 0;
			let globalCount = 0;

			// 全局观察者
			eventManager.addObserver(TestEntityEvent, () => {
				globalCount++;
			});

			// 实体特定观察者
			eventManager.addEntityObserver(entity1, TestEntityEvent, () => {
				entity1Count++;
			});

			eventManager.addEntityObserver(entity2, TestEntityEvent, () => {
				entity2Count++;
			});

			// 触发 entity1 的事件
			eventManager.trigger(new TestEntityEvent(entity1, 10));

			expect(globalCount).to.equal(1);
			expect(entity1Count).to.equal(1);
			expect(entity2Count).to.equal(0);

			// 触发 entity2 的事件
			eventManager.trigger(new TestEntityEvent(entity2, 20));

			expect(globalCount).to.equal(2);
			expect(entity1Count).to.equal(1);
			expect(entity2Count).to.equal(1);
		});

		it("should clean up entity observers", () => {
			const entity = world.spawn() as Entity;
			let callCount = 0;

			eventManager.addEntityObserver(entity, TestEntityEvent, () => {
				callCount++;
			});

			eventManager.trigger(new TestEntityEvent(entity, 10));
			expect(callCount).to.equal(1);

			eventManager.cleanupEntity(entity);

			eventManager.trigger(new TestEntityEvent(entity, 20));
			expect(callCount).to.equal(1); // 应该还是1，观察者已被清理
		});
	});

	describe("Factory Functions", () => {
		it("should create simple events", () => {
			let receivedMessage = "";

			eventManager.addObserver(SimpleEvent, (event) => {
				receivedMessage = event.message;
			});

			const event = new SimpleEvent({ message: "Hello, World!" });
			eventManager.trigger(event);

			expect(receivedMessage).to.equal("Hello, World!");
		});

		it("should create entity events", () => {
			const entity = world.spawn() as Entity;
			let receivedDamage = 0;

			eventManager.addEntityObserver(entity, DamageEvent, (event) => {
				receivedDamage = event.amount;
			});

			const event = new DamageEvent({ entity, amount: 50 });
			eventManager.trigger(event);

			expect(receivedDamage).to.equal(50);
		});
	});

	describe("ObserverBuilder", () => {
		it("should build observer configurations", () => {
			const builder = new ObserverBuilder<TestEvent>();
			let callCount = 0;

			const config = builder
				.event(TestEvent)
				.on(() => callCount++)
				.build();

			expect(config.eventType).to.equal(TestEvent);
			expect(config.callback).to.be.ok();
		});

		it("should set watched entities", () => {
			const entity1 = world.spawn() as Entity;
			const entity2 = world.spawn() as Entity;

			const builder = new ObserverBuilder<TestEntityEvent>();

			const config = builder
				.event(TestEntityEvent)
				.on(() => {})
				.watchEntities(entity1, entity2)
				.build();

			expect(config.entities).to.be.ok();
			expect(config.entities!.size()).to.equal(2);
		});
	});

	describe("EventPropagator", () => {
		it("should propagate events along a path", () => {
			const propagator = new EventPropagator(world, eventManager);

			const entity1 = world.spawn() as Entity;
			const entity2 = world.spawn() as Entity;
			const entity3 = world.spawn() as Entity;

			const callOrder: Entity[] = [];

			// 为每个实体添加观察者
			eventManager.addEntityObserver(entity1, TestEntityEvent, (event) => {
				callOrder.push(event.getEventTarget());
			});

			eventManager.addEntityObserver(entity2, TestEntityEvent, (event) => {
				callOrder.push(event.getEventTarget());
			});

			eventManager.addEntityObserver(entity3, TestEntityEvent, (event) => {
				callOrder.push(event.getEventTarget());
			});

			const event = new TestEntityEvent(entity1, 10);

			const config: PropagationConfig = {
				enabled: true,
				autoProppagate: true,
				getPath: () => [entity2, entity3],
			};

			propagator.propagate(event, config);

			// 验证传播顺序
			expect(callOrder.size()).to.equal(2);
			expect(callOrder[0]).to.equal(entity2);
			expect(callOrder[1]).to.equal(entity3);
		});

		it("should skip propagation when disabled", () => {
			const propagator = new EventPropagator(world, eventManager);
			const entity = world.spawn() as Entity;
			let callCount = 0;

			eventManager.addEntityObserver(entity, TestEntityEvent, () => {
				callCount++;
			});

			const event = new TestEntityEvent(entity, 10);

			const config: PropagationConfig = {
				enabled: false,
				autoProppagate: false,
			};

			propagator.propagate(event, config);

			expect(callCount).to.equal(0);
		});
	});

	describe("Integration Tests", () => {
		it("should handle complex event flow", () => {
			// 创建实体层级
			const root = world.spawn() as Entity;
			const child1 = world.spawn() as Entity;
			const child2 = world.spawn() as Entity;

			const eventLog: string[] = [];

			// 添加全局观察者
			eventManager.addObserver(TestEntityEvent, (event) => {
				eventLog.push(`global:${event.damage}`);
			});

			// 添加实体观察者
			eventManager.addEntityObserver(root, TestEntityEvent, (event) => {
				eventLog.push(`root:${event.damage}`);
			});

			eventManager.addEntityObserver(child1, TestEntityEvent, (event) => {
				eventLog.push(`child1:${event.damage}`);
			});

			eventManager.addEntityObserver(child2, TestEntityEvent, (event) => {
				eventLog.push(`child2:${event.damage}`);
			});

			// 触发不同的事件
			eventManager.trigger(new TestEntityEvent(root, 10));
			eventManager.trigger(new TestEntityEvent(child1, 20));
			eventManager.trigger(new TestEntityEvent(child2, 30));

			// 验证事件日志
			expect(eventLog.size()).to.equal(6);
			expect(eventLog.includes("global:10")).to.equal(true);
			expect(eventLog.includes("root:10")).to.equal(true);
			expect(eventLog.includes("global:20")).to.equal(true);
			expect(eventLog.includes("child1:20")).to.equal(true);
			expect(eventLog.includes("global:30")).to.equal(true);
			expect(eventLog.includes("child2:30")).to.equal(true);
		});

		it("should support connection lifecycle", () => {
			let phase = "init";
			const connections: ObserverConnection[] = [];

			// 阶段1：添加观察者
			connections.push(
				eventManager.addObserver(TestEvent, (event) => {
					if (phase === "active") {
						phase = `received:${event.value}`;
					}
				}),
			);

			// 验证连接状态
			expect(connections[0].isConnected()).to.equal(true);

			// 阶段2：触发事件
			phase = "active";
			eventManager.trigger(new TestEvent(100));
			expect(phase).to.equal("received:100");

			// 阶段3：断开连接
			connections[0].disconnect();
			expect(connections[0].isConnected()).to.equal(false);

			// 阶段4：再次触发（不应该接收）
			phase = "disconnected";
			eventManager.trigger(new TestEvent(200));
			expect(phase).to.equal("disconnected");
		});
	});
};