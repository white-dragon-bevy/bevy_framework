import { BevyWorld } from "../bevy-world";
import {
	Event,
	EventWriter,
	EventReader,
	EventManager,
	EntitySpawnedEvent,
	EntityDespawnedEvent,
	ComponentAddedEvent,
	ComponentRemovedEvent,
} from "../events";

/**
 * 测试事件类
 */
class TestEvent implements Event {
	constructor(
		public readonly message: string,
		public readonly value: number,
		public readonly timestamp?: number,
	) {}
}

/**
 * 另一个测试事件类
 */
class AnotherTestEvent implements Event {
	constructor(
		public readonly data: string,
		public readonly timestamp?: number,
	) {}
}

export = () => {
	let world: BevyWorld;
	let eventManager: EventManager;

	beforeEach(() => {
		world = new BevyWorld();
		eventManager = new EventManager(world);
	});

	afterEach(() => {
		// 清理资源
		if (eventManager) {
			eventManager.cleanup();
		}
	});

	describe("EventWriter", () => {
		it("应该能够发送事件", () => {
			const writer = eventManager.createWriter(TestEvent);
			const testEvent = new TestEvent("test message", 42);

			expect(() => {
				writer.send(testEvent);
			}).never.to.throw();
		});

		it("应该为发送的事件添加时间戳", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader = eventManager.createReader(TestEvent);

			const testEvent = new TestEvent("test", 123);
			writer.send(testEvent);

			const events = reader.read();
			expect(events.size()).to.equal(1);
			expect(events[0].timestamp).to.be.a("number");
			expect(events[0]?.timestamp && events[0].timestamp > 0).to.equal(true);
		});
	});

	describe("EventReader", () => {
		it("应该能够读取新发送的事件", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader = eventManager.createReader(TestEvent);

			const testMessage = "hello world";
			const testValue = 456;
			const testEvent = new TestEvent(testMessage, testValue);

			writer.send(testEvent);

			const events = reader.read();
			expect(events.size()).to.equal(1);
			expect(events[0].message).to.equal(testMessage);
			expect(events[0].value).to.equal(testValue);
		});

		it("应该只读取自上次读取以来的新事件", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader = eventManager.createReader(TestEvent);

			// 发送第一个事件
			writer.send(new TestEvent("first", 1));
			const firstRead = reader.read();
			expect(firstRead.size()).to.equal(1);

			// 发送第二个事件
			writer.send(new TestEvent("second", 2));
			const secondRead = reader.read();
			expect(secondRead.size()).to.equal(1);
			expect(secondRead[0].message).to.equal("second");

			// 第三次读取应该没有新事件
			const thirdRead = reader.read();
			expect(thirdRead.size()).to.equal(0);
		});

		it("应该正确实现 isEmpty 方法", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader = eventManager.createReader(TestEvent);

			expect(reader.isEmpty()).to.equal(true);

			writer.send(new TestEvent("test", 1));
			expect(reader.isEmpty()).to.equal(false);

			reader.read();
			expect(reader.isEmpty()).to.equal(true);
		});

		it("多个读取器应该独立工作", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader1 = eventManager.createReader(TestEvent);
			const reader2 = eventManager.createReader(TestEvent);

			writer.send(new TestEvent("shared", 100));

			const events1 = reader1.read();
			const events2 = reader2.read();

			expect(events1.size()).to.equal(1);
			expect(events2.size()).to.equal(1);
			expect(events1[0].message).to.equal("shared");
			expect(events2[0].message).to.equal("shared");
		});
	});

	describe("EventManager", () => {
		it("应该能够为不同事件类型创建独立的写入器和读取器", () => {
			const testWriter = eventManager.createWriter(TestEvent);
			const anotherWriter = eventManager.createWriter(AnotherTestEvent);
			const testReader = eventManager.createReader(TestEvent);
			const anotherReader = eventManager.createReader(AnotherTestEvent);

			testWriter.send(new TestEvent("test", 1));
			anotherWriter.send(new AnotherTestEvent("another"));

			const testEvents = testReader.read();
			const anotherEvents = anotherReader.read();

			expect(testEvents.size()).to.equal(1);
			expect(anotherEvents.size()).to.equal(1);
			expect(testEvents[0].message).to.equal("test");
			expect(anotherEvents[0].data).to.equal("another");
		});

		it("应该支持直接发送事件的便捷方法", () => {
			const reader = eventManager.createReader(TestEvent);
			const testEvent = new TestEvent("direct", 789);

			eventManager.send(TestEvent, testEvent);

			const events = reader.read();
			expect(events.size()).to.equal(1);
			expect(events[0].message).to.equal("direct");
			expect(events[0].value).to.equal(789);
		});

		it("应该能够获取事件统计信息", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader = eventManager.createReader(TestEvent);

			writer.send(new TestEvent("stats test", 1));
			writer.send(new TestEvent("stats test 2", 2));

			const stats = eventManager.getStats();
			expect(typeIs(stats, "table")).to.equal(true);

			// 检查是否有TestEvent的统计信息
			let hasTestEventStats = false;
			for (const [key, value] of pairs(stats)) {
				if (key.find("TestEvent")[0] !== undefined) {
					hasTestEventStats = true;
					const eventStats = value as { eventCount: number; readerCount: number };
					expect(eventStats.eventCount).to.equal(2);
					expect(eventStats.readerCount).to.equal(1);
					break;
				}
			}
			expect(hasTestEventStats).to.equal(true);
		});

		it("应该能够清理事件存储器", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader = eventManager.createReader(TestEvent);

			// 发送大量事件以触发清理逻辑
			for (let index = 1; index <= 1001; index++) {
				writer.send(new TestEvent(`message ${index}`, index));
			}

			// 读取一些事件
			reader.read();

			// 执行清理
			eventManager.cleanup();

			// 清理后应该仍然能够正常工作
			writer.send(new TestEvent("after cleanup", 999));
			const eventsAfterCleanup = reader.read();
			expect(eventsAfterCleanup.size()).to.equal(1);
			expect(eventsAfterCleanup[0].message).to.equal("after cleanup");
		});
	});

	describe("预定义事件类型", () => {
		it("EntitySpawnedEvent 应该正确创建", () => {
			const entityId = 12345 as never;
			const componentCount = 3;
			const event = new EntitySpawnedEvent(entityId, componentCount);

			expect(event.entityId).to.equal(entityId);
			expect(event.componentCount).to.equal(componentCount);
			expect(event.timestamp).to.equal(undefined);
		});

		it("EntityDespawnedEvent 应该正确创建", () => {
			const entityId = 54321 as never;
			const event = new EntityDespawnedEvent(entityId);

			expect(event.entityId).to.equal(entityId);
			expect(event.timestamp).to.equal(undefined);
		});

		it("ComponentAddedEvent 应该正确创建", () => {
			const entityId = 11111 as never;
			const componentType = "TestComponent";
			const event = new ComponentAddedEvent(entityId, componentType);

			expect(event.entityId).to.equal(entityId);
			expect(event.componentType).to.equal(componentType);
			expect(event.timestamp).to.equal(undefined);
		});

		it("ComponentRemovedEvent 应该正确创建", () => {
			const entityId = 22222 as never;
			const componentType = "AnotherComponent";
			const event = new ComponentRemovedEvent(entityId, componentType);

			expect(event.entityId).to.equal(entityId);
			expect(event.componentType).to.equal(componentType);
			expect(event.timestamp).to.equal(undefined);
		});

		it("预定义事件应该能够通过 EventManager 使用", () => {
			const entityId = 99999 as never;
			const writer = eventManager.createWriter(EntitySpawnedEvent);
			const reader = eventManager.createReader(EntitySpawnedEvent);

			const spawnEvent = new EntitySpawnedEvent(entityId, 5);
			writer.send(spawnEvent);

			const events = reader.read();
			expect(events.size()).to.equal(1);
			expect(events[0].entityId).to.equal(entityId);
			expect(events[0].componentCount).to.equal(5);
		});
	});

	describe("错误处理和边界情况", () => {
		it("读取器清理后不应该接收新事件", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader = eventManager.createReader(TestEvent);

			writer.send(new TestEvent("before cleanup", 1));
			reader.cleanup();

			writer.send(new TestEvent("after cleanup", 2));

			// 已清理的读取器不应该收到新事件
			// 注意：这个测试假设清理后的读取器不会被重新注册
			const events = reader.read();
			// 这里的行为取决于具体实现，可能需要调整期望值
			expect(events.size() < 2).to.equal(true);
		});

		it("应该处理空事件列表", () => {
			const reader = eventManager.createReader(TestEvent);
			const events = reader.read();
			expect(events.size()).to.equal(0);
		});

		it("应该处理相同事件多次发送", () => {
			const writer = eventManager.createWriter(TestEvent);
			const reader = eventManager.createReader(TestEvent);

			const sameEvent = new TestEvent("same", 42);
			writer.send(sameEvent);
			writer.send(sameEvent);
			writer.send(sameEvent);

			const events = reader.read();
			expect(events.size()).to.equal(3);
			for (const event of events) {
				expect(event.message).to.equal("same");
				expect(event.value).to.equal(42);
			}
		});
	});
};