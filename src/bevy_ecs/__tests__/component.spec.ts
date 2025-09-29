import { newComponent, bevyComponent } from "../component/component";
import { None } from "../component/immutable";

// 测试用的组件数据类型
interface TestComponentData {
	value: number;
	name: string;
}

interface SimpleComponentData {
	count: number;
}

interface OptionalComponentData {
	required: string;
	optional?: number;
	nullable?: string | undefined;
}

export = () => {
	describe("newComponent 基础功能测试", () => {
		it("应该能够创建一个基础组件", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			
			expect(TestComponent).to.be.ok();
		});

		it("应该能够创建组件实例", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const instance = TestComponent({ value: 42, name: "test" });
			
			expect(instance).to.be.ok();
			expect(instance.value).to.equal(42);
			expect(instance.name).to.equal("test");
		});

     

		it("应该能够创建不带名称的组件", () => {
			const AnonymousComponent = newComponent<SimpleComponentData>();
			const instance = AnonymousComponent({ count: 10 });
			
			expect(instance).to.be.ok();
			expect(instance.count).to.equal(10);
		});

		it("组件实例应该是不可变的", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const instance = TestComponent({ value: 42, name: "test" });
			
			// 尝试修改应该失败（在Lua中会抛出错误）
			expect(() => {
				(instance as any).value = 100;
			}).to.throw();
		});

		it("应该能够创建空数据的组件实例", () => {
			const EmptyComponent = newComponent<{}>("EmptyComponent");
			const instance = EmptyComponent({});
			
			expect(instance).to.be.ok();
		});
	});

	describe("newComponent 默认数据测试", () => {
		it("应该能够使用默认数据创建组件", () => {
			const defaultData: TestComponentData = { value: 100, name: "default" };
			const TestComponent = newComponent<TestComponentData>("TestComponent", defaultData);
			
			const instance = TestComponent();
			expect(instance.value).to.equal(100);
			expect(instance.name).to.equal("default");
		});

		it("应该能够覆盖默认数据", () => {
			const defaultData: TestComponentData = { value: 100, name: "default" };
			const TestComponent = newComponent<TestComponentData>("TestComponent", defaultData);
			
			const instance = TestComponent({ value: 200, name: "custom" });
			expect(instance.value).to.equal(200);
			expect(instance.name).to.equal("custom");
		});

	

		it("应该能够使用函数作为默认数据", () => {
			const TestComponent = newComponent<TestComponentData>(
				"TestComponent",
				() => ({ value: math.random(1, 100), name: "generated" })
			);
			
			const instance1 = TestComponent();
			const instance2 = TestComponent();
			
			expect(instance1.name).to.equal("generated");
			expect(instance2.name).to.equal("generated");
			// 由于使用随机数，两个实例的值可能不同
			expect(instance1.value).to.be.a("number");
			expect(instance2.value).to.be.a("number");
		});

		it("应该在每次调用时执行默认数据函数", () => {
			let callCount = 0;
			const TestComponent = newComponent<SimpleComponentData>(
				"TestComponent",
				() => {
					callCount++;
					return { count: callCount };
				}
			);
			
			const instance1 = TestComponent();
			const instance2 = TestComponent();
			
			expect(instance1.count).to.equal(1);
			expect(instance2.count).to.equal(2);
		});
	});

	describe("newComponent patch 功能测试", () => {
		it("应该能够使用patch修改组件实例", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const original = TestComponent({ value: 42, name: "original" });
			
			const patched = original.patch({ value: 100 });
			
			expect(original.value).to.equal(42);
			expect(original.name).to.equal("original");
			expect(patched.value).to.equal(100);
			expect(patched.name).to.equal("original");
		});

		it("应该能够使用patch修改多个字段", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const original = TestComponent({ value: 42, name: "original" });
			
			const patched = original.patch({ value: 100, name: "patched" });
			
			expect(patched.value).to.equal(100);
			expect(patched.name).to.equal("patched");
		});

		it("应该能够使用None移除字段", () => {
			const OptionalComponent = newComponent<OptionalComponentData>("OptionalComponent");
			const original = OptionalComponent({ 
				required: "test", 
				optional: 42, 
				nullable: "value" 
			});
			
			const patched = original.patch({ 
				optional: None as any,
				nullable: None as any
			});
			
			expect(patched.required).to.equal("test");
			expect(patched.optional).to.equal(undefined);
			expect(patched.nullable).to.equal(undefined);
		});

		it("patch应该返回新的组件实例", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const original = TestComponent({ value: 42, name: "original" });
			
			const patched = original.patch({ value: 100 });
			
			expect(original).to.never.equal(patched);
			expect(getmetatable(original)).to.equal(getmetatable(patched));
		});

		it("patch应该保持组件类型", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const original = TestComponent({ value: 42, name: "original" });
			
			const patched = original.patch({ value: 100 });
			
			expect(getmetatable(patched)).to.equal(TestComponent);
		});
	});

	describe("bevyComponent 基础功能测试", () => {
		it("应该能够创建bevyComponent", () => {
			const BevyTestComponent = bevyComponent<TestComponentData>();
			
			expect(BevyTestComponent).to.be.ok();
		});

		it("应该能够创建bevyComponent实例", () => {
			const BevyTestComponent = bevyComponent<TestComponentData>();
			const instance = BevyTestComponent({ value: 42, name: "bevy-test" });
			
			expect(instance).to.be.ok();
			expect(instance.value).to.equal(42);
			expect(instance.name).to.equal("bevy-test");
		});

		it("bevyComponent应该支持默认数据", () => {
			const defaultData: TestComponentData = { value: 999, name: "bevy-default" };
			const BevyTestComponent = bevyComponent<TestComponentData>(defaultData);
			
			const instance = BevyTestComponent();
			expect(instance.value).to.equal(999);
			expect(instance.name).to.equal("bevy-default");
		});

		it("bevyComponent应该支持默认数据函数", () => {
			const BevyTestComponent = bevyComponent<TestComponentData>(
				() => ({ value: 777, name: "bevy-generated" })
			);
			
			const instance = BevyTestComponent();
			expect(instance.value).to.equal(777);
			expect(instance.name).to.equal("bevy-generated");
		});

		it("bevyComponent实例应该支持patch", () => {
			const BevyTestComponent = bevyComponent<TestComponentData>();
			const original = BevyTestComponent({ value: 42, name: "bevy-original" });
			
			const patched = original.patch({ value: 200 });
			
			expect(original.value).to.equal(42);
			expect(patched.value).to.equal(200);
			expect(patched.name).to.equal("bevy-original");
		});
	});

	describe("组件不可变性和类型安全测试", () => {
		it("组件实例应该是冻结的", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const instance = TestComponent({ value: 42, name: "test" });
			
			expect(table.isfrozen(instance)).to.equal(true);
		});

		it("组件应该具有正确的元表", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const instance = TestComponent({ value: 42, name: "test" });
			
			expect(getmetatable(instance)).to.equal(TestComponent);
		});

		it("组件应该具有正确的字符串表示", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			
			expect(tostring(TestComponent)).to.equal("TestComponent");
		});

		it("匿名组件应该具有默认名称", () => {
			const AnonymousComponent = newComponent<SimpleComponentData>();
			const componentName = tostring(AnonymousComponent);
			
			// 匿名组件会有一个基于调用位置的默认名称
			expect(componentName).to.be.a("string");
			expect(componentName.size() > 0).to.equal(true);
		});
	});

	describe("错误处理测试", () => {
		it("应该在传入非表类型的默认数据时抛出错误", () => {
			expect(() => {
				newComponent<TestComponentData>("TestComponent", "invalid" as any);
			}).to.throw();
		});

		it("应该能够处理空的patch数据", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const original = TestComponent({ value: 42, name: "original" });
			
			const patched = original.patch({});
			
			expect(patched.value).to.equal(42);
			expect(patched.name).to.equal("original");
			expect(patched).to.never.equal(original); // 应该还是创建新实例
		});
	});

	describe("性能和内存测试", () => {
		it("应该能够高效创建大量组件实例", () => {
			const TestComponent = newComponent<SimpleComponentData>("TestComponent");
			const startTime = os.clock();
			const instanceCount = 1000;
			
			for (let i = 0; i < instanceCount; i++) {
				const instance = TestComponent({ count: i });
				expect(instance.count).to.equal(i);
			}
			
			const endTime = os.clock();
			const duration = endTime - startTime;
			
			// 应该在合理时间内完成（1秒内）
			expect(duration).to.be.near(0, 1.0);
		});

		it("应该能够高效执行patch操作", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			let current = TestComponent({ value: 0, name: "initial" });
			
			const startTime = os.clock();
			const patchCount = 100;
			
			for (let i = 0; i < patchCount; i++) {
				current = current.patch({ value: i });
			}
			
			const endTime = os.clock();
			const duration = endTime - startTime;
			
			expect(current.value).to.equal(patchCount - 1);
			expect(duration).to.be.near(0, 1.0);
		});
	});
};