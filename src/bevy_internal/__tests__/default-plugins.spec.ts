/**
 * DefaultPlugins 和 MinimalPlugins 单元测试
 */

import { App } from "../../bevy_app/app";
import { DefaultPlugins, DefaultPluginsBuilder, MinimalPlugins, MinimalPluginsBuilder } from "../default-plugins";
import { BasePlugin } from "../../bevy_app/plugin";
import { LogPlugin } from "../../bevy_log/lib";
import { TimePlugin } from "../../bevy_time/time-plugin";
import { TransformPlugin } from "../../bevy_transform/plugin";
import { DiagnosticsPlugin } from "../../bevy_diagnostic/diagnostics-plugin";
import { FrameCountPlugin } from "../../bevy_diagnostic/frame-count-diagnostics-plugin";
import { InputPlugin } from "../../bevy_input/plugin";
import { RobloxRunnerPlugin } from "../../bevy_app";

// 测试用的自定义插件
class TestPlugin extends BasePlugin {
	build(app: App): void {
		// 测试插件逻辑
	}

	name(): string {
		return "TestPlugin";
	}
}

export = () => {
	describe("DefaultPlugins", () => {
		it("should create DefaultPlugins instance", () => {
			const defaultPlugins = new DefaultPlugins();
			expect(defaultPlugins).to.be.ok();
			expect(defaultPlugins.name()).to.equal("DefaultPlugins");
		});

		it("should build with all expected plugins", () => {
			const defaultPlugins = new DefaultPlugins();
			const builder = defaultPlugins.build();
			const plugins = builder.getPlugins();

			// 验证包含所有预期的插件
			const pluginTypes = plugins.map((plugin) => plugin.name());
			expect(pluginTypes.includes("LogPlugin")).to.equal(true);
			expect(pluginTypes.includes("TimePlugin")).to.equal(true);
			expect(pluginTypes.includes("TransformPlugin")).to.equal(true);
			expect(pluginTypes.includes("DiagnosticsPlugin")).to.equal(true);
			expect(pluginTypes.includes("FrameCountPlugin")).to.equal(true);
			expect(pluginTypes.includes("InputPlugin")).to.equal(true);
			expect(pluginTypes.includes("RobloxRunnerPlugin")).to.equal(true);
		});

		it("should apply to App successfully", () => {
			const app = App.create();
			const defaultPlugins = new DefaultPlugins();
			const builder = defaultPlugins.build();

			// 应该能成功应用到 App
			expect(() => builder.finish(app)).never.to.throw();
		});

		it("should use static create method", () => {
			const defaultPlugins = DefaultPlugins.create();
			expect(defaultPlugins).to.be.ok();
			expect(defaultPlugins.name()).to.equal("DefaultPlugins");
		});
	});

	describe("DefaultPluginsBuilder", () => {
		it("should allow adding custom plugins", () => {
			const builder = new DefaultPluginsBuilder();
			const testPlugin = new TestPlugin();

			builder.add(testPlugin);
			const plugins = builder.getPlugins();

			const pluginNames = plugins.map((p) => p.name());
			expect(pluginNames.includes("TestPlugin")).to.equal(true);
		});

		it("should allow disabling plugins", () => {
			const builder = new DefaultPluginsBuilder();

			// 禁用 LogPlugin
			builder.disable(LogPlugin as any);
			const plugins = builder.getPlugins();

			const pluginNames = plugins.map((p) => p.name());
			expect(pluginNames.includes("LogPlugin")).to.equal(false);
		});

		it("should allow adding plugins before another", () => {
			const builder = new DefaultPluginsBuilder();
			const testPlugin = new TestPlugin();

			builder.addBefore(TimePlugin as any, testPlugin);
			const plugins = builder.getPlugins();

			const pluginNames = plugins.map((p) => p.name());
			const testIndex = pluginNames.indexOf("TestPlugin");
			const timeIndex = pluginNames.indexOf("TimePlugin");

			expect(testIndex > -1).to.equal(true);
			expect(timeIndex > -1).to.equal(true);
			expect(testIndex < timeIndex).to.equal(true);
		});

		it("should allow adding plugins after another", () => {
			const builder = new DefaultPluginsBuilder();
			const testPlugin = new TestPlugin();

			builder.addAfter(TimePlugin as any, testPlugin);
			const plugins = builder.getPlugins();

			const pluginNames = plugins.map((p) => p.name());
			const testIndex = pluginNames.indexOf("TestPlugin");
			const timeIndex = pluginNames.indexOf("TimePlugin");

			expect(testIndex > -1).to.equal(true);
			expect(timeIndex > -1).to.equal(true);
			expect(testIndex > timeIndex).to.equal(true);
		});

		it("should support method chaining", () => {
			const builder = new DefaultPluginsBuilder();
			const testPlugin1 = new TestPlugin();
			const testPlugin2 = new TestPlugin();

			const result = builder
				.add(testPlugin1)
				.add(testPlugin2)
				.disable(LogPlugin as any);

			expect(result).to.equal(builder);
		});
	});

	describe("MinimalPlugins", () => {
		it("should create MinimalPlugins instance", () => {
			const minimalPlugins = new MinimalPlugins();
			expect(minimalPlugins).to.be.ok();
			expect(minimalPlugins.name()).to.equal("MinimalPlugins");
		});

		it("should build with minimal plugins", () => {
			const minimalPlugins = new MinimalPlugins();
			const builder = minimalPlugins.build();
			const plugins = builder.getPlugins();

			// 验证只包含最小插件集
			const pluginTypes = plugins.map((plugin) => plugin.name());
			expect(pluginTypes.includes("FrameCountPlugin")).to.equal(true);
			expect(pluginTypes.includes("TimePlugin")).to.equal(true);
			expect(pluginTypes.includes("RobloxRunnerPlugin")).to.equal(true);

			// 验证不包含其他插件
			expect(pluginTypes.includes("LogPlugin")).to.equal(false);
			expect(pluginTypes.includes("TransformPlugin")).to.equal(false);
			expect(pluginTypes.includes("DiagnosticsPlugin")).to.equal(false);
			expect(pluginTypes.includes("InputPlugin")).to.equal(false);
		});

		it("should apply to App successfully", () => {
			const app = App.create();
			const minimalPlugins = new MinimalPlugins();
			const builder = minimalPlugins.build();

			// 应该能成功应用到 App
			expect(() => builder.finish(app)).never.to.throw();
		});

		it("should use static create method", () => {
			const minimalPlugins = MinimalPlugins.create();
			expect(minimalPlugins).to.be.ok();
			expect(minimalPlugins.name()).to.equal("MinimalPlugins");
		});
	});

	describe("MinimalPluginsBuilder", () => {
		it("should allow adding custom plugins", () => {
			const builder = new MinimalPluginsBuilder();
			const testPlugin = new TestPlugin();

			builder.add(testPlugin);
			const plugins = builder.getPlugins();

			const pluginNames = plugins.map((p) => p.name());
			expect(pluginNames.includes("TestPlugin")).to.equal(true);
		});

		it("should allow disabling plugins", () => {
			const builder = new MinimalPluginsBuilder();

			// 禁用 TimePlugin
			builder.disable(TimePlugin as any);
			const plugins = builder.getPlugins();

			const pluginNames = plugins.map((p) => p.name());
			expect(pluginNames.includes("TimePlugin")).to.equal(false);
		});

		it("should support method chaining", () => {
			const builder = new MinimalPluginsBuilder();
			const testPlugin1 = new TestPlugin();
			const testPlugin2 = new TestPlugin();

			const result = builder
				.add(testPlugin1)
				.add(testPlugin2)
				.disable(TimePlugin as any);

			expect(result).to.equal(builder);
		});
	});

	describe("Plugin Integration", () => {
		it("should register all DefaultPlugins without conflicts", () => {
			const app = App.create();
			const defaultPlugins = new DefaultPlugins();
			const builder = defaultPlugins.build();

			builder.finish(app);

			// 验证所有插件都已注册
			expect(app.isPluginAdded(LogPlugin as any)).to.equal(true);
			expect(app.isPluginAdded(TimePlugin as any)).to.equal(true);
			expect(app.isPluginAdded(TransformPlugin as any)).to.equal(true);
			expect(app.isPluginAdded(DiagnosticsPlugin as any)).to.equal(true);
			expect(app.isPluginAdded(FrameCountPlugin as any)).to.equal(true);
			expect(app.isPluginAdded(InputPlugin as any)).to.equal(true);
			expect(app.isPluginAdded(RobloxRunnerPlugin as any)).to.equal(true);
		});

		it("should register all MinimalPlugins without conflicts", () => {
			const app = App.create();
			const minimalPlugins = new MinimalPlugins();
			const builder = minimalPlugins.build();

			builder.finish(app);

			// 验证最小插件都已注册
			expect(app.isPluginAdded(FrameCountPlugin as any)).to.equal(true);
			expect(app.isPluginAdded(TimePlugin as any)).to.equal(true);
			expect(app.isPluginAdded(RobloxRunnerPlugin as any)).to.equal(true);

			// 验证其他插件未注册
			expect(app.isPluginAdded(LogPlugin as any)).to.equal(false);
			expect(app.isPluginAdded(TransformPlugin as any)).to.equal(false);
		});

		it("should handle custom plugin configuration", () => {
			const app = App.create();
			const builder = new DefaultPluginsBuilder();
			const testPlugin = new TestPlugin();

			// 自定义配置：添加测试插件，禁用日志插件
			builder.add(testPlugin).disable(LogPlugin as any);

			const plugins = builder.getPlugins();
			const pluginGroupBuilder = new (class {
				private pluginsArray: BasePlugin[] = [];
				add(plugin: BasePlugin): void {
					this.pluginsArray.push(plugin);
				}
				finish(targetApp: App): void {
					for (const plugin of this.pluginsArray) {
						targetApp.addPlugin(plugin);
					}
				}
			})();

			for (const plugin of plugins) {
				pluginGroupBuilder.add(plugin as BasePlugin);
			}
			pluginGroupBuilder.finish(app);

			// 验证配置生效
			expect(app.isPluginAdded(TestPlugin as any)).to.equal(true);
			expect(app.isPluginAdded(LogPlugin as any)).to.equal(false);
		});
	});
};
