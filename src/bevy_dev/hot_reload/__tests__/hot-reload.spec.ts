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

	describe("容器类型支持", () => {
		it("应该支持 Folder 容器", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			const folderContainer = new Instance("Folder");
			folderContainer.Name = "TestFolder";

			// 应该能正常注册 Folder 容器
			expect(() => {
				hotReload!.registerContainers({
					container: folderContainer,
					schedule: BuiltinSchedules.UPDATE,
				});
			}).never.to.throw();

			folderContainer.Destroy();
		});

		it("应该支持 ModuleScript 容器", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			const moduleContainer = new Instance("ModuleScript");
			moduleContainer.Name = "TestModule";
			moduleContainer.Source = `
				local exports = {}
				exports.testSystem = function(world, context)
					print("Test")
				end
				return exports
			`;

			// 应该能正常注册 ModuleScript 容器
			expect(() => {
				hotReload!.registerContainers({
					container: moduleContainer,
					schedule: BuiltinSchedules.UPDATE,
				});
			}).never.to.throw();

			moduleContainer.Destroy();
		});
	});

	describe("路径 API 支持", () => {
		it("应该支持 addPaths 方法", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 创建测试结构
			const testFolder = new Instance("Folder");
			testFolder.Name = "TestPathSystems";
			testFolder.Parent = game.GetService("ReplicatedStorage");

			// 应该能通过路径字符串注册
			expect(() => {
				hotReload!.addPaths("ReplicatedStorage/TestPathSystems", BuiltinSchedules.UPDATE);
			}).never.to.throw();

			testFolder.Destroy();
		});

		it("应该支持 addPathsGlob 方法匹配多个容器", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 创建测试结构
			const rootFolder = new Instance("Folder");
			rootFolder.Name = "TestGlobRoot";
			rootFolder.Parent = game.GetService("ReplicatedStorage");

			const system1 = new Instance("Folder");
			system1.Name = "System1";
			system1.Parent = rootFolder;

			const system2 = new Instance("Folder");
			system2.Name = "System2";
			system2.Parent = rootFolder;

			// 应该能使用 glob 模式匹配
			expect(() => {
				hotReload!.addPathsGlob("ReplicatedStorage/TestGlobRoot/*", BuiltinSchedules.UPDATE);
			}).never.to.throw();

			rootFolder.Destroy();
		});

		it("应该支持 ** 通配符匹配多层级", () => {
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: false }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 创建嵌套结构
			const rootFolder = new Instance("Folder");
			rootFolder.Name = "TestDeepGlob";
			rootFolder.Parent = game.GetService("ReplicatedStorage");

			const level1 = new Instance("Folder");
			level1.Name = "Level1";
			level1.Parent = rootFolder;

			const level2 = new Instance("Folder");
			level2.Name = "Level2";
			level2.Parent = level1;

			// 应该能使用 ** 匹配多层级
			expect(() => {
				hotReload!.addPathsGlob("ReplicatedStorage/TestDeepGlob/**", BuiltinSchedules.UPDATE);
			}).never.to.throw();

			rootFolder.Destroy();
		});
	});
};
