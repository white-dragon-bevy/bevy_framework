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

	describe("__value__ 存储和对象访问测试", () => {
		it("应该正确存储数据在 __value__ 字段", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const instance = TestComponent({ value: 42, name: "test" });

			// 使用 unknown 类型替代 any
			const instanceWithValue = instance as unknown as { __value__: TestComponentData };
			expect(instanceWithValue.__value__).to.be.ok();
			expect(instanceWithValue.__value__.value).to.equal(42);
			expect(instanceWithValue.__value__.name).to.equal("test");
		});

		it("应该通过 __index 元方法正确访问属性", () => {
			const TestComponent = newComponent<{ prop1: string; prop2: number }>("TestComponent");
			const instance = TestComponent({ prop1: "value1", prop2: 42 });

			expect(instance.prop1).to.equal("value1");
			expect(instance.prop2).to.equal(42);
			// 不存在的属性应该返回 undefined
			const instanceWithExtra = instance as unknown as { nonExistent?: string };
			expect(instanceWithExtra.nonExistent).to.equal(undefined);
		});

		it("应该正确处理嵌套对象", () => {
			interface NestedData {
				position: { x: number; y: number; z: number };
				config: {
					name: string;
					settings: {
						enabled: boolean;
						level: number;
					};
				};
			}

			const TestComponent = newComponent<NestedData>("TestComponent");
			const instance = TestComponent({
				position: { x: 10, y: 20, z: 30 },
				config: {
					name: "test",
					settings: {
						enabled: true,
						level: 5,
					},
				},
			});

			expect(instance.position.x).to.equal(10);
			expect(instance.position.y).to.equal(20);
			expect(instance.position.z).to.equal(30);
			expect(instance.config.name).to.equal("test");
			expect(instance.config.settings.enabled).to.equal(true);
			expect(instance.config.settings.level).to.equal(5);
		});

		it("应该正确处理带方法的对象", () => {
			interface ObjectWithMethods {
				value: number;
				getValue(): number;
				setValue(newValue: number): ObjectWithMethods;
				multiplyValue(multiplier: number): number;
			}

			const objectWithMethods: ObjectWithMethods = {
				value: 10,
				getValue() {
					return this.value;
				},
				setValue(newValue: number) {
					this.value = newValue;
					return this;
				},
				multiplyValue(multiplier: number) {
					return this.value * multiplier;
				},
			};

			const TestComponent = newComponent<{ myObject: ObjectWithMethods; otherData: string }>("TestComponent");
			const instance = TestComponent({
				myObject: objectWithMethods,
				otherData: "test",
			});

			expect(instance.myObject).to.be.ok();
			expect(instance.myObject.value).to.equal(10);
			expect(typeIs(instance.myObject.getValue, "function")).to.equal(true);

			// 测试方法调用
			expect(instance.myObject.getValue()).to.equal(10);
			expect(instance.myObject.multiplyValue(3)).to.equal(30);
		});

		it("应该正确处理带元表的对象", () => {
			// 创建一个简单的类
			class MyClass {
				value: number;

				constructor(value: number) {
					this.value = value;
				}

				getValue(): number {
					return this.value;
				}

				doubleValue(): number {
					return this.value * 2;
				}
			}

			const TestComponent = newComponent<{ object: MyClass; name: string }>("TestComponent");
			const myInstance = new MyClass(42);
			const componentInstance = TestComponent({
				object: myInstance,
				name: "test",
			});

			expect(componentInstance.object).to.be.ok();
			expect(componentInstance.object.value).to.equal(42);
			expect(componentInstance.object.getValue()).to.equal(42);
			expect(componentInstance.object.doubleValue()).to.equal(84);
		});

		it("应该正确处理数组数据", () => {
			interface ArrayData {
				items: string[];
				numbers: number[];
			}

			const TestComponent = newComponent<ArrayData>("TestComponent");
			const instance = TestComponent({
				items: ["item1", "item2", "item3"],
				numbers: [10, 20, 30, 40],
			});

			expect(instance.items[0]).to.equal("item1");
			expect(instance.items[1]).to.equal("item2");
			expect(instance.items[2]).to.equal("item3");
			expect(instance.items.size()).to.equal(3);

			expect(instance.numbers[3]).to.equal(40);
			expect(instance.numbers.size()).to.equal(4);
		});

		it("应该处理函数作为组件数据", () => {
			interface FunctionData {
				calculator: (x: number, y: number) => number;
				multiplier: (x: number, y: number) => number;
			}

			const TestComponent = newComponent<FunctionData>("TestComponent");
			const instance = TestComponent({
				calculator: (x: number, y: number) => x + y,
				multiplier: (x: number, y: number) => x * y,
			});

			expect(instance.calculator).to.be.a("function");
			expect(instance.calculator(2, 3)).to.equal(5);
			expect(instance.multiplier(4, 5)).to.equal(20);
		});

		it("数据字段名与组件方法名冲突时的行为", () => {
			interface ConflictData {
				patch: string;
				new: number;
			}

			const TestComponent = newComponent<ConflictData>("TestComponent");
			const instance = TestComponent({
				patch: "my data",
				new: 42,
			});

			// 当数据字段名与方法名冲突时，方法优先
			// 数据仍然存储在 __value__ 中
			const instanceWithValue = instance as unknown as { __value__: ConflictData };
			expect(instanceWithValue.__value__.patch).to.equal("my data");
			expect(instanceWithValue.__value__.new).to.equal(42);

			// 由于 patch 是方法名，通过 instance.patch 访问的是方法而非数据
			// 创建一个没有冲突的组件来验证 patch 方法正常工作
			const NormalComponent = newComponent<{ data: string }>("NormalComponent");
			const normalInstance = NormalComponent({ data: "test" });
			const patched = normalInstance.patch({ data: "updated" });
			expect(patched.data).to.equal("updated");
			expect(normalInstance.data).to.equal("test");
		});
	});

	describe("patch 方法高级测试", () => {
		it("应该正确 patch 带方法的对象", () => {
			interface Counter {
				value: number;
				increment(): number;
				reset(): void;
			}

			const counter: Counter = {
				value: 0,
				increment() {
					this.value = this.value + 1;
					return this.value;
				},
				reset() {
					this.value = 0;
				},
			};

			const TestComponent = newComponent<{ counter: Counter; name: string }>("TestComponent");
			const original = TestComponent({
				counter: counter,
				name: "original",
			});

			// 创建新的 counter 对象
			interface ExtendedCounter extends Counter {
				decrement?(): number;
			}

			const newCounter: ExtendedCounter = {
				value: 100,
				increment() {
					this.value = this.value + 10;
					return this.value;
				},
				reset() {
					this.value = 0;
				},
				decrement() {
					this.value = this.value - 1;
					return this.value;
				},
			};

			const patched = original.patch({
				counter: newCounter as Counter,
				name: "patched",
			});

			// 原始对象应该不变
			expect(original.counter.value).to.equal(0);
			expect(original.name).to.equal("original");

			// patch 后的对象应该有新的值和方法
			expect(patched.counter.value).to.equal(100);
			expect(patched.counter.increment()).to.equal(110);
			expect(patched.name).to.equal("patched");
		});

		it("应该正确 patch 嵌套对象", () => {
			interface ConfigData {
				config: {
					level: number;
					settings: {
						difficulty: string;
						sound: boolean;
						music?: boolean;
					};
				};
			}

			const TestComponent = newComponent<ConfigData>("TestComponent");
			const original = TestComponent({
				config: {
					level: 1,
					settings: {
						difficulty: "easy",
						sound: true,
					},
				},
			});

			const patched = original.patch({
				config: {
					level: 2,
					settings: {
						difficulty: "hard",
						sound: false,
						music: true,
					},
				},
			});

			expect(patched.config.level).to.equal(2);
			expect(patched.config.settings.difficulty).to.equal("hard");
			expect(patched.config.settings.sound).to.equal(false);
			expect(patched.config.settings.music).to.equal(true);
		});

		it("应该在 patch 后返回冻结的实例", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const original = TestComponent({ value: 1, name: "test" });
			const patched = original.patch({ value: 2 });

			expect(table.isfrozen(patched)).to.equal(true);

			expect(() => {
				(patched as any).value = 3;
			}).to.throw();
		});

		it("应该在 patch 后保持组件元表", () => {
			const TestComponent = newComponent<TestComponentData>("TestComponent");
			const original = TestComponent({ value: 1, name: "test" });
			const patched = original.patch({ value: 2 });

			expect(getmetatable(patched)).to.equal(getmetatable(original));
			expect(getmetatable(patched)).to.equal(TestComponent);
		});

		it("应该能够添加新字段通过 patch", () => {
			interface ExtensibleData {
				field1: string;
				field2?: string;
				field3?: number;
			}

			const TestComponent = newComponent<ExtensibleData>("TestComponent");
			const original = TestComponent({ field1: "value1" });

			const patched = original.patch({
				field2: "value2",
				field3: 42,
			});

			expect(patched.field1).to.equal("value1");
			expect(patched.field2).to.equal("value2");
			expect(patched.field3).to.equal(42);
		});

		it("应该处理大型对象的 patch 操作", () => {
			interface LargeData {
				[key: string]: number;
			}

			const largeData: LargeData = {};
			for (let i = 1; i <= 100; i++) {
				largeData["field" + i] = i * 10;
			}

			const TestComponent = newComponent<LargeData>("TestComponent");
			const instance = TestComponent(largeData);

			expect(instance.field1).to.equal(10);
			expect(instance.field50).to.equal(500);
			expect(instance.field100).to.equal(1000);

			const patched = instance.patch({
				field50: 9999,
				newField: 12345,
			});

			expect(patched.field50).to.equal(9999);
			expect(patched.field100).to.equal(1000);
			expect(patched.newField).to.equal(12345);
		});
	});

	describe("边缘情况测试", () => {
		it("应该处理空组件数据", () => {
			const TestComponent = newComponent<{}>("EmptyComponent");
			const instance = TestComponent();

			const instanceWithValue = instance as unknown as { __value__: {} };
			expect(instanceWithValue.__value__).to.be.ok();
			// 检查是否为空表 - 使用 next 函数正确判断
			const [firstKey] = next(instanceWithValue.__value__);
			const isEmpty = firstKey === undefined;
			expect(isEmpty).to.equal(true);
		});

		it("应该处理循环引用", () => {
			interface CircularData {
				value: number;
				self?: CircularData;
			}

			const data: CircularData = { value: 1 };
			data.self = data; // 循环引用

			const TestComponent = newComponent<{ circular: CircularData; normal: string }>("TestComponent");
			const instance = TestComponent({
				circular: data,
				normal: "test",
			});

			expect(instance.circular.value).to.equal(1);
			expect(instance.circular.self).to.equal(data);
			expect(instance.circular.self!.value).to.equal(1);
		});

		it("bevyComponent 应该支持类信息", () => {
			// bevyComponent 主要用于宏展开，这里仅测试基本功能
			const BevyTestComponent = bevyComponent<TestComponentData>(
				{ value: 10, name: "default" }
			);

			const instance = BevyTestComponent({ value: 20, name: "custom" });
			expect(instance.value).to.equal(20);
			expect(instance.name).to.equal("custom");

			// bevyComponent 也应该支持 patch
			const patched = instance.patch({ value: 30 });
			expect(patched.value).to.equal(30);
			expect(patched.name).to.equal("custom");
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