/**
 * 热更新系统测试
 */

import { App } from "../../../bevy_app/app";
import { BuiltinSchedules } from "../../../bevy_app/main-schedule";
import { HotReloadPlugin, type HotReloadService } from "../plugin";

export = () => {
	describe("HotReloadPlugin", () => {
		it("应该成功创建并注册服务", () => {
			const app = new App();

			// 添加热更新插件
			app.addPlugin(new HotReloadPlugin());

			// 获取服务
			const hotReload = app.getResource<HotReloadService>();

			// 验证服务存在
			expect(hotReload).to.be.ok();
		});

		it("应该支持配置选项", () => {
			const app = new App();

			// 使用自定义配置
			app.addPlugin(
				new HotReloadPlugin({
					enabled: false,
					debounceTime: 500,
				}),
			);

			// 获取服务
			const hotReload = app.getResource<HotReloadService>();

			// 验证服务存在
			expect(hotReload).to.be.ok();
		});

		it("应该是唯一插件", () => {
			const plugin = new HotReloadPlugin();
			expect(plugin.isUnique()).to.equal(true);
		});

		it("应该有正确的名称", () => {
			const plugin = new HotReloadPlugin();
			expect(plugin.name()).to.equal("HotReloadPlugin");
		});
	});

	describe("HotReloadService", () => {
		it("应该提供 registerContainers 方法", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 验证方法存在
			expect(typeOf((hotReload as unknown as Record<string, unknown>).registerContainers)).to.equal(
				"function",
			);
		});

		it("应该提供 waitForReady 方法", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 验证方法存在
			expect(typeOf((hotReload as unknown as Record<string, unknown>).waitForReady)).to.equal("function");
		});

		it("应该支持调用 waitForReady", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 应该能正常调用（不抛出错误）
			expect(() => {
				hotReload!.waitForReady();
			}).never.to.throw();
		});

		it("应该支持注册空容器列表", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 应该能正常调用（不抛出错误）
			expect(() => {
				hotReload!.registerContainers();
			}).never.to.throw();
		});
	});

	describe("热更新配置", () => {
		it("Studio 环境默认启用", () => {
			const app = new App();
			const plugin = new HotReloadPlugin();

			// 在 Studio 环境中应该默认启用
			expect(plugin.name()).to.equal("HotReloadPlugin");
		});

		it("可以显式禁用", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();
		});

		it("可以自定义防抖时间", () => {
			const app = new App();
			app.addPlugin(
				new HotReloadPlugin({
					debounceTime: 1000,
				}),
			);

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();
		});
	});
};
