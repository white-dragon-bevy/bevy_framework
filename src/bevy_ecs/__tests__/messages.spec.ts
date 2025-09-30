import { World } from "../bevy-world";
import {
	Message,
	MessageWriter,
	MessageReader,
	MessageRegistry,
} from "../message";

/**
 * 测试消息类
 */
class TestMessage implements Message {
	constructor(
		public readonly message: string,
		public readonly value: number,
		public readonly timestamp?: number,
	) {}
}

/**
 * 另一个测试消息类
 */
class AnotherTestMessage implements Message {
	constructor(
		public readonly data: string,
		public readonly timestamp?: number,
	) {}
}

export = () => {
	let world: World;
	let messageRegistry: MessageRegistry;

	beforeEach(() => {
		world = new World();
		messageRegistry = new MessageRegistry(world);
	});

	afterEach(() => {
		// 清理资源
		if (messageRegistry) {
			messageRegistry.cleanup();
		}
	});

	describe("MessageWriter", () => {
		it("应该能够发送消息", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const testMessage = new TestMessage("test message", 42);

			expect(() => {
				writer.write(testMessage);
			}).never.to.throw();
		});

		it("应该为发送的消息添加时间戳", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			const testMessage = new TestMessage("test", 123);
			writer.write(testMessage);

			const messages = reader.read();
			expect(messages.size()).to.equal(1);
			expect(messages[0].timestamp).to.be.a("number");
			expect(messages[0]?.timestamp && messages[0].timestamp > 0).to.equal(true);
		});
	});

	describe("MessageReader", () => {
		it("应该能够读取新发送的消息", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			const testMessage = "hello world";
			const testValue = 456;
			const testMsg = new TestMessage(testMessage, testValue);

			writer.write(testMsg);

			const messages = reader.read();
			expect(messages.size()).to.equal(1);
			expect(messages[0].message).to.equal(testMessage);
			expect(messages[0].value).to.equal(testValue);
		});

		it("应该只读取自上次读取以来的新消息", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			// 发送第一个消息
			writer.write(new TestMessage("first", 1));
			const firstRead = reader.read();
			expect(firstRead.size()).to.equal(1);

			// 发送第二个消息
			writer.write(new TestMessage("second", 2));
			const secondRead = reader.read();
			expect(secondRead.size()).to.equal(1);
			expect(secondRead[0].message).to.equal("second");

			// 第三次读取应该没有新消息
			const thirdRead = reader.read();
			expect(thirdRead.size()).to.equal(0);
		});

		it("应该正确实现 isEmpty 方法", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			expect(reader.isEmpty()).to.equal(true);

			writer.write(new TestMessage("test", 1));
			expect(reader.isEmpty()).to.equal(false);

			reader.read();
			expect(reader.isEmpty()).to.equal(true);
		});

		it("多个读取器应该独立工作", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader1 = messageRegistry.createReader<TestMessage>();
			const reader2 = messageRegistry.createReader<TestMessage>();

			writer.write(new TestMessage("shared", 100));

			const messages1 = reader1.read();
			const messages2 = reader2.read();

			expect(messages1.size()).to.equal(1);
			expect(messages2.size()).to.equal(1);
			expect(messages1[0].message).to.equal("shared");
			expect(messages2[0].message).to.equal("shared");
		});
	});

	describe("MessageRegistry", () => {
		it("应该能够为不同消息类型创建独立的写入器和读取器", () => {
			const testWriter = messageRegistry.createWriter<TestMessage>();
			const anotherWriter = messageRegistry.createWriter<AnotherTestMessage>();
			const testReader = messageRegistry.createReader<TestMessage>();
			const anotherReader = messageRegistry.createReader<AnotherTestMessage>();

			testWriter.write(new TestMessage("test", 1));
			anotherWriter.write(new AnotherTestMessage("another"));

			const testMessages = testReader.read();
			const anotherMessages = anotherReader.read();

			expect(testMessages.size()).to.equal(1);
			expect(anotherMessages.size()).to.equal(1);
			expect(testMessages[0].message).to.equal("test");
			expect(anotherMessages[0].data).to.equal("another");
		});

		it("应该支持直接发送消息的便捷方法", () => {
			const reader = messageRegistry.createReader<TestMessage>();
			const testMessage = new TestMessage("direct", 789);

			messageRegistry.send(testMessage);

			const messages = reader.read();
			expect(messages.size()).to.equal(1);
			expect(messages[0].message).to.equal("direct");
			expect(messages[0].value).to.equal(789);
		});

		it("应该能够获取消息统计信息", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			writer.write(new TestMessage("stats test", 1));
			writer.write(new TestMessage("stats test 2", 2));

			const stats = messageRegistry.getStats();
			expect(typeIs(stats, "table")).to.equal(true);

			// 检查是否有TestMessage的统计信息
			let hasTestMessageStats = false;
			for (const [key, value] of pairs(stats)) {
				const keyStr = tostring(key);
				// Check if key contains "TestMessage" or is related to TestMessage class
				if (keyStr.match("TestMessage")[0] !== undefined || keyStr === tostring(TestMessage)) {
					hasTestMessageStats = true;
					const messageStats = value ;
					expect(messageStats.messageCount).to.equal(2);
					expect(messageStats.readerCount).to.equal(1);
					break;
				}
			}
			expect(hasTestMessageStats).to.equal(true);
		});

		it("应该能够清理消息存储器", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			// 发送大量消息以触发清理逻辑
			for (let index = 1; index <= 1001; index++) {
				writer.write(new TestMessage(`message ${index}`, index));
			}

			// 读取一些消息
			reader.read();

			// 执行清理
			messageRegistry.cleanup();

			// 清理后应该仍然能够正常工作
			writer.write(new TestMessage("after cleanup", 999));
			const messagesAfterCleanup = reader.read();
			expect(messagesAfterCleanup.size()).to.equal(1);
			expect(messagesAfterCleanup[0].message).to.equal("after cleanup");
		});
	});

	describe("错误处理和边界情况", () => {
		it("读取器清理后不应该接收新消息", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			writer.write(new TestMessage("before cleanup", 1));
			reader.cleanup();

			writer.write(new TestMessage("after cleanup", 2));

			// 已清理的读取器不应该收到新消息
			const messages = reader.read();
			expect(messages.size()).to.equal(0);
		});

		it("应该处理空消息列表", () => {
			const reader = messageRegistry.createReader<TestMessage>();
			const messages = reader.read();
			expect(messages.size()).to.equal(0);
		});

		it("应该处理相同消息多次发送", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			const sameMessage = new TestMessage("same", 42);
			writer.write(sameMessage);
			writer.write(sameMessage);
			writer.write(sameMessage);

			const messages = reader.read();
			expect(messages.size()).to.equal(3);
			for (const message of messages) {
				expect(message.message).to.equal("same");
				expect(message.value).to.equal(42);
			}
		});
	});

	describe("双缓冲机制", () => {
		it("应该在 update 后交换缓冲区", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			// 第一批消息
			writer.write(new TestMessage("before update", 1));

			// 更新前读取
			const beforeUpdate = reader.read();
			expect(beforeUpdate.size()).to.equal(1);
			expect(beforeUpdate[0].message).to.equal("before update");

			// 执行更新
			messageRegistry.updateAll();

			// 第二批消息
			writer.write(new TestMessage("after update", 2));

			// 更新后读取
			const afterUpdate = reader.read();
			expect(afterUpdate.size()).to.equal(1);
			expect(afterUpdate[0].message).to.equal("after update");
		});

		it("应该在两次 update 后丢弃旧消息", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			// 发送第一条消息
			writer.write(new TestMessage("message 1", 1));

			// 第一次更新
			messageRegistry.updateAll();

			// 发送第二条消息
			writer.write(new TestMessage("message 2", 2));

			// 第二次更新
			messageRegistry.updateAll();

			// 发送第三条消息
			writer.write(new TestMessage("message 3", 3));

			// 新的读取器应该只能看到最新的消息
			const newReader = messageRegistry.createReader<TestMessage>();
			const messages = newReader.read();

			// 由于双缓冲机制，应该能看到 message 2 和 message 3
			// message 1 应该已经被丢弃
			expect(messages.size() > 0).to.equal(true);
			let hasMessage1 = false;
			for (const msg of messages) {
				if (msg.message === "message 1") {
					hasMessage1 = true;
				}
			}
			expect(hasMessage1).to.equal(false);
		});
	});

	describe("MessageCursor 游标管理", () => {
		it("应该正确跟踪多个独立的游标位置", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader1 = messageRegistry.createReader<TestMessage>();
			const reader2 = messageRegistry.createReader<TestMessage>();

			// 发送第一批消息
			writer.write(new TestMessage("message 1", 1));
			writer.write(new TestMessage("message 2", 2));

			// reader1 读取所有消息
			const messages1 = reader1.read();
			expect(messages1.size()).to.equal(2);

			// 发送更多消息
			writer.write(new TestMessage("message 3", 3));
			writer.write(new TestMessage("message 4", 4));

			// reader1 只应看到新消息
			const messages1New = reader1.read();
			expect(messages1New.size()).to.equal(2);
			expect(messages1New[0].message).to.equal("message 3");

			// reader2 应该看到所有消息
			const messages2 = reader2.read();
			expect(messages2.size()).to.equal(4);
		});

		it("应该处理游标落后于最旧消息的情况", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			// 发送消息并多次更新以丢弃旧消息
			writer.write(new TestMessage("old message", 1));
			messageRegistry.updateAll();
			writer.write(new TestMessage("middle message", 2));
			messageRegistry.updateAll();
			writer.write(new TestMessage("new message", 3));

			// 读取应该只返回仍然可用的消息
			const messages = reader.read();
			expect(messages.size() > 0).to.equal(true);
		});
	});

	describe("批量操作", () => {
		it("应该支持批量写入消息", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			const batch = [
				new TestMessage("batch 1", 1),
				new TestMessage("batch 2", 2),
				new TestMessage("batch 3", 3),
			];

			// 使用批量发送
			const batchIds = writer.writeBatch(batch);
			expect(batchIds).to.be.ok();

			// 读取所有消息
			const messages = reader.read();
			expect(messages.size()).to.equal(3);
			for (let index = 0; index < messages.size(); index++) {
				expect(messages[index].message).to.equal(`batch ${index + 1}`);
				expect(messages[index].value).to.equal(index + 1);
			}
		});

		it("应该支持 WriteBatchIds 迭代", () => {
			const writer = messageRegistry.createWriter<TestMessage>();

			const batch = [
				new TestMessage("msg 1", 1),
				new TestMessage("msg 2", 2),
			];

			const batchIds = writer.writeBatch(batch);
			const ids = batchIds.toArray();

			expect(ids.size()).to.equal(2);
			expect(ids[0].id).to.be.a("number");
			expect(ids[1].id).to.equal(ids[0].id + 1);
		});
	});

	describe("并发场景", () => {
		it("应该支持多个 Writer 同时写入", () => {
			const writer1 = messageRegistry.createWriter<TestMessage>();
			const writer2 = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			// 两个 writer 交替写入
			writer1.write(new TestMessage("from writer 1 - 1", 1));
			writer2.write(new TestMessage("from writer 2 - 1", 2));
			writer1.write(new TestMessage("from writer 1 - 2", 3));
			writer2.write(new TestMessage("from writer 2 - 2", 4));

			const messages = reader.read();
			expect(messages.size()).to.equal(4);
		});

		it("应该支持多个 Reader 独立读取", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader1 = messageRegistry.createReader<TestMessage>();
			const reader2 = messageRegistry.createReader<TestMessage>();
			const reader3 = messageRegistry.createReader<TestMessage>();

			writer.write(new TestMessage("shared message", 100));

			// 每个 reader 独立读取
			const messages1 = reader1.read();
			const messages2 = reader2.read();
			const messages3 = reader3.read();

			expect(messages1.size()).to.equal(1);
			expect(messages2.size()).to.equal(1);
			expect(messages3.size()).to.equal(1);

			// 再次读取应该为空
			expect(reader1.read().size()).to.equal(0);
			expect(reader2.read().size()).to.equal(0);
			expect(reader3.read().size()).to.equal(0);
		});

		it("应该支持不同消息类型的并行处理", () => {
			const testWriter = messageRegistry.createWriter<TestMessage>();
			const anotherWriter = messageRegistry.createWriter<AnotherTestMessage>();
			const testReader = messageRegistry.createReader<TestMessage>();
			const anotherReader = messageRegistry.createReader<AnotherTestMessage>();

			// 并行发送不同类型的消息
			for (let index = 1; index <= 5; index++) {
				testWriter.write(new TestMessage(`test ${index}`, index));
				anotherWriter.write(new AnotherTestMessage(`another ${index}`));
			}

			const testMessages = testReader.read();
			const anotherMessages = anotherReader.read();

			expect(testMessages.size()).to.equal(5);
			expect(anotherMessages.size()).to.equal(5);
		});
	});

	describe("边界条件和性能", () => {
		it("应该处理大量消息", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			const messageCount = 10000;

			// 发送大量消息
			for (let index = 1; index <= messageCount; index++) {
				writer.write(new TestMessage(`message ${index}`, index));
			}

			const messages = reader.read();
			expect(messages.size()).to.equal(messageCount);
		});

		it("应该正确处理空消息结构", () => {
			class EmptyMessage implements Message {}

			const writer = messageRegistry.createWriter<EmptyMessage>();
			const reader = messageRegistry.createReader<EmptyMessage>();

			writer.write(new EmptyMessage());

			const messages = reader.read();
			expect(messages.size()).to.equal(1);
			expect(messages[0]).to.be.ok();
		});

		it("应该在清空后正常工作", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const reader = messageRegistry.createReader<TestMessage>();

			writer.write(new TestMessage("before clear", 1));

			// 清空所有消息
			messageRegistry.clearAll();

			// 清空后发送新消息
			writer.write(new TestMessage("after clear", 2));

			const messages = reader.read();
			expect(messages.size()).to.equal(1);
			expect(messages[0].message).to.equal("after clear");
		});

		it("批量写入应该比单个写入更高效", () => {
			const writer = messageRegistry.createWriter<TestMessage>();
			const messageCount = 1000;
			const messages: TestMessage[] = [];

			for (let index = 1; index <= messageCount; index++) {
				messages.push(new TestMessage(`batch ${index}`, index));
			}

			const startBatch = os.clock();
			writer.writeBatch(messages);
			const batchTime = os.clock() - startBatch;

			const writer2 = messageRegistry.createWriter<AnotherTestMessage>();
			const startSingle = os.clock();
			for (let index = 1; index <= messageCount; index++) {
				writer2.write(new AnotherTestMessage(`single ${index}`));
			}
			const singleTime = os.clock() - startSingle;

			// 批量操作应该更快或至少相当
			// 注意：由于 JavaScript 的性能特性，这个测试可能不总是准确
			expect(batchTime < singleTime * 2).to.equal(true);
		});
	});
};
