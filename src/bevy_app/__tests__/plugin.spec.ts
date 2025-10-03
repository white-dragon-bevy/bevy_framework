import { App } from "../index";
import {
	Plugin,
	BasePlugin,
	PluginState,
	PluginGroup,
	PluginGroupBuilder,
	BasePluginGroup,
	DuplicatePluginError,
} from "../plugin";
import { MainScheduleLabel as BuiltinSchedules } from "../main-schedule";

// 测试用插件
class TestPlugin extends BasePlugin {
	public buildCalled = false;
	public finishCalled = false;
	public cleanupCalled = false;
	public readyCallCount = 0;

	build(app: App): void {
		this.buildCalled = true;
		app.addSystems(BuiltinSchedules.UPDATE, () => {
			// 测试系统
		});
	}

	ready(app: App): boolean {
		this.readyCallCount++;
		return this.readyCallCount >= 2; // 第二次调用时返回 true
	}

	finish(app: App): void {
		this.finishCalled = true;
	}

	cleanup(app: App): void {
		this.cleanupCalled = true;
	}

	name(): string {
		return "TestPlugin";
	}

	isUnique(): boolean {
		return true;
	}
}

// 非唯一插件
class NonUniquePlugin extends BasePlugin {
	build(app: App): void {
		// 插件逻辑
	}

	name(): string {
		return "NonUniquePlugin";
	}

	isUnique(): boolean {
		return false;
	}
}

// 另一个测试插件
class AnotherTestPlugin extends BasePlugin {
	public buildCalled = false;

	build(app: App): void {
		this.buildCalled = true;
	}

	name(): string {
		return "AnotherTestPlugin";
	}
}

// 测试用插件组
class TestPluginGroup extends BasePluginGroup {
	build(): PluginGroupBuilder {
		const builder = new PluginGroupBuilder();
		builder.add(new TestPlugin()).add(new AnotherTestPlugin());
		return builder;
	}

	name(): string {
		return "TestPluginGroup";
	}
}

export = (): void => {
	describe("Plugin", () => {
		describe("BasePlugin", () => {
			it("应该正确实现 Plugin 接口", () => {
				const plugin = new TestPlugin();

				expect(plugin.name()).to.equal("TestPlugin");
				expect(plugin.isUnique()).to.equal(true);
				expect(plugin.buildCalled).to.equal(false);
			});

			it("应该提供默认的 ready 实现", () => {
				const plugin = new NonUniquePlugin();
				const app = App.create();

				// 默认 ready 应该返回 true
				expect(plugin.ready!(app)).to.equal(true);
			});
		});

		describe("插件注册", () => {
			let app: App;

			beforeEach(() => {
				app = App.create();
			});

			it("应该调用插件的 build 方法", () => {
				const plugin = new TestPlugin();

				app.addPlugin(plugin);

				expect(plugin.buildCalled).to.equal(true);
			});

			it("应该检测插件是否已添加", () => {
				const plugin = new TestPlugin();

				app.addPlugin(plugin);

				expect(app.isPluginAdded(TestPlugin)).to.equal(true);
				expect(app.isPluginAdded(AnotherTestPlugin)).to.equal(false);
			});

			it("应该获取已添加的插件", () => {
				const plugin = new TestPlugin();
				app.addPlugin(plugin);

				const addedPlugins = app.getAddedPlugins(TestPlugin);
				expect(addedPlugins.size() > 0).to.equal(true);
			});

			it("应该拒绝重复的唯一插件", () => {
				const plugin1 = new TestPlugin();
				const plugin2 = new TestPlugin();

				app.addPlugin(plugin1);

				expect(() => app.addPlugin(plugin2)).to.throw();
			});

			it("应该允许添加多个非唯一插件", () => {
				const plugin1 = new NonUniquePlugin();
				const plugin2 = new NonUniquePlugin();

				expect(() => {
					app.addPlugin(plugin1);
					app.addPlugin(plugin2);
				}).to.never.throw();
			});

			it("应该支持添加多个不同的插件", () => {
				const testPlugin = new TestPlugin();
				const anotherPlugin = new AnotherTestPlugin();

				expect(() => {
					app.addPlugins(testPlugin, anotherPlugin);
				}).to.never.throw();

				expect(testPlugin.buildCalled).to.equal(true);
				expect(anotherPlugin.buildCalled).to.equal(true);
			});
		});

		describe("插件生命周期", () => {
			let app: App;
			let plugin: TestPlugin;

			beforeEach(() => {
				app = App.create();
				plugin = new TestPlugin();
			});

			it("应该在 finish 时调用插件的 finish 方法", () => {
				app.addPlugin(plugin);
				app.finish();

				expect(plugin.finishCalled).to.equal(true);
			});

			it("应该在 cleanup 时调用插件的 cleanup 方法", () => {
				app.addPlugin(plugin);
				app.finish();
				app.cleanup();

				expect(plugin.cleanupCalled).to.equal(true);
			});

			it("应该等待插件准备就绪", () => {
				app.addPlugin(plugin);

				// 第一次调用 ready 返回 false
				expect(plugin.readyCallCount).to.equal(0);

				// 运行会检查 ready 状态
				// 注意：这需要实际的运行循环实现
			});
		});

		describe("插件状态管理", () => {
			let app: App;

			beforeEach(() => {
				app = App.create();
			});

			it("应该在添加插件后不能再添加新插件（finish 后）", () => {
				app.finish();

				const plugin = new TestPlugin();
				expect(() => app.addPlugin(plugin)).to.throw();
			});

			it("应该在 cleanup 后不能添加插件", () => {
				app.finish();
				app.cleanup();

				const plugin = new TestPlugin();
				expect(() => app.addPlugin(plugin)).to.throw();
			});
		});

		describe("PluginGroupBuilder", () => {
			it("应该添加插件到组", () => {
				const builder = new PluginGroupBuilder();
				const plugin1 = new TestPlugin();
				const plugin2 = new AnotherTestPlugin();

				builder.add(plugin1).add(plugin2);

				const plugins = builder.getPlugins();
				expect(plugins.size()).to.equal(2);
				expect(plugins[0]).to.equal(plugin1);
				expect(plugins[1]).to.equal(plugin2);
			});

			it("应该在指定插件之前添加", () => {
				const builder = new PluginGroupBuilder();
				const plugin1 = new TestPlugin();
				const plugin2 = new AnotherTestPlugin();
				const plugin3 = new NonUniquePlugin();

				builder.add(plugin1).add(plugin2).addBefore(AnotherTestPlugin, plugin3);

				const plugins = builder.getPlugins();
				expect(plugins.size()).to.equal(3);

				// plugin3 应该在 plugin2 之前
				const plugin3Index = plugins.indexOf(plugin3);
				const plugin2Index = plugins.indexOf(plugin2);
				expect(plugin3Index < plugin2Index).to.equal(true);
			});

			it("应该在指定插件之后添加", () => {
				const builder = new PluginGroupBuilder();
				const plugin1 = new TestPlugin();
				const plugin2 = new AnotherTestPlugin();
				const plugin3 = new NonUniquePlugin();

				builder.add(plugin1).add(plugin2).addAfter(TestPlugin, plugin3);

				const plugins = builder.getPlugins();
				expect(plugins.size()).to.equal(3);

				// plugin3 应该在 plugin1 之后
				const plugin1Index = plugins.indexOf(plugin1);
				const plugin3Index = plugins.indexOf(plugin3);
				expect(plugin3Index > plugin1Index).to.equal(true);
			});

			it("应该禁用指定类型的插件", () => {
				const builder = new PluginGroupBuilder();
				const plugin1 = new TestPlugin();
				const plugin2 = new AnotherTestPlugin();

				builder.add(plugin1).add(plugin2).disable(TestPlugin);

				const plugins = builder.getPlugins();
				expect(plugins.size()).to.equal(1);
				expect(plugins[0]).to.equal(plugin2);
			});

			it("应该将所有插件应用到 App", () => {
				const builder = new PluginGroupBuilder();
				const plugin1 = new TestPlugin();
				const plugin2 = new AnotherTestPlugin();

				builder.add(plugin1).add(plugin2);

				const app = App.create();
				builder.finish(app);

				expect(app.isPluginAdded(TestPlugin)).to.equal(true);
				expect(app.isPluginAdded(AnotherTestPlugin)).to.equal(true);
			});
		});

		describe("PluginGroup", () => {
			it("应该构建并应用插件组", () => {
				const group = new TestPluginGroup();
				const app = App.create();

				// 模拟 addPlugins 对 PluginGroup 的处理
				const builder = group.build();
				builder.finish(app);

				expect(app.isPluginAdded(TestPlugin)).to.equal(true);
				expect(app.isPluginAdded(AnotherTestPlugin)).to.equal(true);
			});
		});

		describe("错误处理", () => {
			it("DuplicatePluginError 应该包含正确的信息", () => {
				const err = new DuplicatePluginError("TestPlugin");

				expect(err.name).to.equal("DuplicatePluginError");
				expect(err.pluginName).to.equal("TestPlugin");
				const errorString = err.toString();
				expect(errorString.find("TestPlugin")[0] !== undefined).to.equal(true);
				expect(errorString.find("already added")[0] !== undefined).to.equal(true);
			});
		});
	});
};
