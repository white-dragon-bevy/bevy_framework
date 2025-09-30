import { ResourceManager, Resource, ResourceMetadata } from "../resource";

// 测试用资源类
class TestResource implements Resource {
	public value: number;
	public data: string;

	constructor(value = 0, data = "test") {
		this.value = value;
		this.data = data;
	}
}

class AnotherTestResource implements Resource {
	public name: string;
	public count: number;

	constructor(name = "default", count = 1) {
		this.name = name;
		this.count = count;
	}
}

class EmptyResource implements Resource {}

export = () => {
	let resourceManager: ResourceManager;

	beforeEach(() => {
		resourceManager = new ResourceManager();
	});

	afterEach(() => {
		resourceManager.clear();
	});

	describe("基础功能测试", () => {
		it("应该能够创建资源管理器", () => {
			expect(resourceManager).to.be.ok();
			expect(resourceManager.getResourceCount()).to.equal(0);
		});

		it("应该能够插入和获取资源", () => {
			const testResource = new TestResource(42, "hello");
			resourceManager.insertResource<TestResource>(testResource);

			const retrieved = resourceManager.getResource<TestResource>();
			expect(retrieved).to.be.ok();
			expect(retrieved!.value).to.equal(42);
			expect(retrieved!.data).to.equal("hello");
		});

		it("应该能够插入多个不同类型的资源", () => {
			const resource1 = new TestResource(10, "first");
			const resource2 = new AnotherTestResource("test", 5);

			resourceManager.insertResource<TestResource>(resource1);
			resourceManager.insertResource<AnotherTestResource>(resource2);

			expect(resourceManager.getResourceCount()).to.equal(2);

			const retrieved1 = resourceManager.getResource<TestResource>();
			const retrieved2 = resourceManager.getResource<AnotherTestResource>();

			expect(retrieved1!.value).to.equal(10);
			expect(retrieved2!.name).to.equal("test");
		});

		it("应该能够更新已存在的资源", () => {
			const original = new TestResource(1, "original");
			resourceManager.insertResource<TestResource>(original);

			const updated = new TestResource(2, "updated");
			resourceManager.insertResource<TestResource>(updated);

			const retrieved = resourceManager.getResource<TestResource>();
			expect(retrieved!.value).to.equal(2);
			expect(retrieved!.data).to.equal("updated");
		});

		it("应该能够移除资源", () => {
			const resource = new TestResource();
			resourceManager.insertResource<TestResource>(resource);

			expect(resourceManager.hasResource<TestResource>()).to.equal(true);

			const removed = resourceManager.removeResource<TestResource>();
			expect(removed).to.be.ok();
			expect(removed!.value).to.equal(0);

			expect(resourceManager.hasResource<TestResource>()).to.equal(false);
			expect(resourceManager.getResource<TestResource>()).to.equal(undefined);
		});

		it("应该能够检查资源是否存在", () => {
			expect(resourceManager.hasResource<TestResource>()).to.equal(false);

			const resource = new TestResource();
			resourceManager.insertResource<TestResource>(resource);

			expect(resourceManager.hasResource<TestResource>()).to.equal(true);
		});
	});

	describe("getOrInsertDefaultResource 功能测试", () => {
		it("应该在资源不存在时创建默认实例", () => {
			const resource = resourceManager.getOrInsertDefaultResource(TestResource);

			expect(resource).to.be.ok();
			expect(resource.value).to.equal(0);
			expect(resource.data).to.equal("test");
			expect(resourceManager.hasResource<TestResource>()).to.equal(true);
		});

		it("应该在资源存在时返回现有实例", () => {
			const existing = new TestResource(100, "existing");
			resourceManager.insertResource<TestResource>(existing);

			const resource = resourceManager.getOrInsertDefaultResource(TestResource);

			expect(resource.value).to.equal(100);
			expect(resource.data).to.equal("existing");
		});

		it("应该能够处理空资源类", () => {
			const resource = resourceManager.getOrInsertDefaultResource(EmptyResource);

			expect(resource).to.be.ok();
			expect(resourceManager.hasResource<EmptyResource>()).to.equal(true);
		});
	});

	describe("withResource 和 withResourceMut 功能测试", () => {
		it("withResource 应该允许只读访问资源", () => {
			const resource = new TestResource(50, "readonly");
			resourceManager.insertResource<TestResource>(resource);

			let readValue = 0;
			let readData = "";

			const result = resourceManager.withResource<TestResource>((res) => {
				readValue = res.value;
				readData = res.data;
			});

			expect(readValue).to.equal(50);
			expect(readData).to.equal("readonly");
			expect(result).to.equal(resourceManager); // 链式调用支持
		});

		it("withResource 应该在资源不存在时不执行回调", () => {
			let callbackExecuted = false;

			resourceManager.withResource<TestResource>(() => {
				callbackExecuted = true;
			});

			expect(callbackExecuted).to.equal(false);
		});

		it("withResourceMut 应该允许修改资源", () => {
			const resource = new TestResource(10, "mutable");
			resourceManager.insertResource<TestResource>(resource);

			resourceManager.withResourceMut<TestResource>((res) => {
				res.value = 20;
				res.data = "modified";
			});

			const modified = resourceManager.getResource<TestResource>();
			expect(modified!.value).to.equal(20);
			expect(modified!.data).to.equal("modified");
		});

		it("withResourceMut 应该更新资源的元数据", () => {
			const resource = new TestResource();
			resourceManager.insertResource<TestResource>(resource);

			const originalMetadata = resourceManager.getResourceMetadata<TestResource>();
			const originalUpdated = originalMetadata!.updated;

			// 等待一小段时间以确保时间戳不同
			wait(0.01);

			resourceManager.withResourceMut<TestResource>((res) => {
				res.value = 100;
			});

			const newMetadata = resourceManager.getResourceMetadata<TestResource>();
			expect(newMetadata!.updated).to.never.equal(originalUpdated);
		});

		it("应该支持链式调用", () => {
			const resource1 = new TestResource(1, "first");
			const resource2 = new AnotherTestResource("second", 2);

			resourceManager.insertResource<TestResource>(resource1);
			resourceManager.insertResource<AnotherTestResource>(resource2);

			let value1 = 0;
			let value2 = 0;

			resourceManager
				.withResource<TestResource>((res) => {
					value1 = res.value;
				})
				.withResource<AnotherTestResource>((res) => {
					value2 = res.count;
				});

			expect(value1).to.equal(1);
			expect(value2).to.equal(2);
		});
	});

	describe("资源ID和元数据测试", () => {
		it("应该能够获取所有资源ID", () => {
			const resource1 = new TestResource();
			const resource2 = new AnotherTestResource();

			resourceManager.insertResource<TestResource>(resource1);
			resourceManager.insertResource<AnotherTestResource>(resource2);

			const ids = resourceManager.getResourceIds();
			expect(ids.size()).to.equal(2);
		});

		it("应该能够获取资源元数据", () => {
			const resource = new TestResource(42, "metadata-test");
			resourceManager.insertResource<TestResource>(resource);

			const metadata = resourceManager.getResourceMetadata<TestResource>();

			expect(metadata).to.be.ok();
			expect(metadata!.created).to.be.a("number");
			expect(metadata!.updated).to.be.a("number");
			expect(metadata!.typeDescriptor).to.be.ok();
		});

		it("应该在插入资源时创建元数据", () => {
			const beforeTime = os.clock();
			const resource = new TestResource();
			resourceManager.insertResource<TestResource>(resource);
			const afterTime = os.clock();

			const metadata = resourceManager.getResourceMetadata<TestResource>();

			expect(metadata!.created).to.be.near(beforeTime, 0.1);
			expect(metadata!.created).to.be.near(afterTime, 0.1);
			expect(metadata!.updated).to.equal(metadata!.created);
		});

		it("应该在更新资源时只更新updated时间", () => {
			const resource1 = new TestResource(1);
			resourceManager.insertResource<TestResource>(resource1);

			const metadata1 = resourceManager.getResourceMetadata<TestResource>();
			const created = metadata1!.created;

			// 等待一小段时间
			wait(0.01);

			const resource2 = new TestResource(2);
			resourceManager.insertResource<TestResource>(resource2);

			const metadata2 = resourceManager.getResourceMetadata<TestResource>();

			expect(metadata2!.created).to.equal(created);
			expect(metadata2!.updated).to.never.equal(created);
		});

		it("应该能够通过ID获取元数据", () => {
			const resource = new TestResource();
			resourceManager.insertResource<TestResource>(resource);

			const ids = resourceManager.getResourceIds();
			const firstId = ids[0];

			const metadata = resourceManager.getResourceMetadataById(firstId);
			expect(metadata).to.be.ok();
			expect(metadata!.created).to.be.a("number");
		});
	});

	describe("边界条件和错误处理测试", () => {
		it("获取不存在的资源应返回undefined", () => {
			const resource = resourceManager.getResource<TestResource>();
			expect(resource).to.equal(undefined);
		});

		it("移除不存在的资源应返回undefined", () => {
			const removed = resourceManager.removeResource<TestResource>();
			expect(removed).to.equal(undefined);
		});

		it("获取不存在资源的元数据应返回undefined", () => {
			const metadata = resourceManager.getResourceMetadata<TestResource>();
			expect(metadata).to.equal(undefined);
		});

		it("清空资源管理器应移除所有资源", () => {
			const resource1 = new TestResource();
			const resource2 = new AnotherTestResource();

			resourceManager.insertResource<TestResource>(resource1);
			resourceManager.insertResource<AnotherTestResource>(resource2);

			expect(resourceManager.getResourceCount()).to.equal(2);

			resourceManager.clear();

			expect(resourceManager.getResourceCount()).to.equal(0);
			expect(resourceManager.hasResource<TestResource>()).to.equal(false);
			expect(resourceManager.hasResource<AnotherTestResource>()).to.equal(false);
		});

		it("应该能够获取所有资源的Map", () => {
			const resource1 = new TestResource(10);
			const resource2 = new AnotherTestResource("test");

			resourceManager.insertResource<TestResource>(resource1);
			resourceManager.insertResource<AnotherTestResource>(resource2);

			const allResources = resourceManager.getAllResources();
			expect(allResources.size()).to.equal(2);
		});
	});

	describe("复杂场景测试", () => {
		it("应该能够正确处理资源的多次插入和删除", () => {
			const resource1 = new TestResource(1, "first");
			resourceManager.insertResource<TestResource>(resource1);
			expect(resourceManager.hasResource<TestResource>()).to.equal(true);

			resourceManager.removeResource<TestResource>();
			expect(resourceManager.hasResource<TestResource>()).to.equal(false);

			const resource2 = new TestResource(2, "second");
			resourceManager.insertResource<TestResource>(resource2);
			expect(resourceManager.hasResource<TestResource>()).to.equal(true);

			const retrieved = resourceManager.getResource<TestResource>();
			expect(retrieved!.value).to.equal(2);
		});

		it("应该能够处理不同资源的独立生命周期", () => {
			const test1 = new TestResource(1);
			const another1 = new AnotherTestResource("one");
			const empty1 = new EmptyResource();

			// 插入所有资源
			resourceManager.insertResource<TestResource>(test1);
			resourceManager.insertResource<AnotherTestResource>(another1);
			resourceManager.insertResource<EmptyResource>(empty1);

			expect(resourceManager.getResourceCount()).to.equal(3);

			// 移除中间的资源
			resourceManager.removeResource<AnotherTestResource>();
			expect(resourceManager.getResourceCount()).to.equal(2);

			// 验证其他资源不受影响
			expect(resourceManager.hasResource<TestResource>()).to.equal(true);
			expect(resourceManager.hasResource<EmptyResource>()).to.equal(true);
			expect(resourceManager.hasResource<AnotherTestResource>()).to.equal(false);
		});

		it("应该能够处理资源类型的继承关系", () => {
			class BaseResource implements Resource {
				public baseValue = 10;
			}

			class DerivedResource extends BaseResource {
				public derivedValue = 20;
			}

			const derived = new DerivedResource();
			resourceManager.insertResource<DerivedResource>(derived);

			const retrieved = resourceManager.getResource<DerivedResource>();
			expect(retrieved!.baseValue).to.equal(10);
			expect(retrieved!.derivedValue).to.equal(20);
		});
	});

	describe("性能相关测试", () => {
		it("应该能够高效处理大量资源", () => {
			const startTime = os.clock();
			const resourceCount = 100;

			// 使用不同的资源类来测试多种类型
			for (let index = 0; index < resourceCount; index++) {
				if (index % 2 === 0) {
					const resource = new TestResource(index, `test-${index}`);
					// 动态创建类以模拟不同类型
					(resource as any).__type = `TestResource${index}`;
					resourceManager.insertResource(resource);
				} else {
					const resource = new AnotherTestResource(`name-${index}`, index);
					(resource as any).__type = `AnotherTestResource${index}`;
					resourceManager.insertResource(resource);
				}
			}

			const insertTime = os.clock() - startTime;

			// 验证插入性能（应该在合理时间内完成）
			expect(insertTime).to.be.near(0, 1.0); // 1秒内完成

			// 清理
			resourceManager.clear();
		});
	});
};