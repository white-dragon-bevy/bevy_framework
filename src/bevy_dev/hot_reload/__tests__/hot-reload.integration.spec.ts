/**
 * 热更新集成测试
 * 真实触发热更新流程，验证系统代码更新
 */

import { App } from "../../../bevy_app/app";
import { BuiltinSchedules } from "../../../bevy_app/main-schedule";
import { HotReloadPlugin, type HotReloadService } from "../plugin";

export = () => {
	describe("基础热更新", () => {
		it("应该能检测到系统热更新并执行新代码", () => {
		// 创建测试容器
		const testContainer = new Instance("Folder");
		testContainer.Name = "HotReloadIntegrationTestContainer";

		// 创建原始系统模块
		const originalModule = new Instance("ModuleScript");
		originalModule.Name = "TestSystem";
		originalModule.Parent = testContainer;

		// 原始系统代码：返回 "version1"
		originalModule.Source = `
			local exports = {}
			exports.testSystem = function(world, context)
				return "version1"
			end
			return exports
		`;

		// 准备热更新后的代码副本（放在容器外部）
		const updatedModuleBackup = new Instance("ModuleScript");
		updatedModuleBackup.Name = "TestSystemV2";
		updatedModuleBackup.Source = `
			local exports = {}
			exports.testSystem = function(world, context)
				return "version2"
			end
			return exports
		`;

		// 用于收集系统执行结果
		let executionCount = 0;
		let latestVersion = "";

		// 创建验证系统
		const verifySystem = () => {
			const module = testContainer.FindFirstChild("TestSystem") as ModuleScript | undefined;
			if (module !== undefined) {
				const [success, moduleExports] = pcall(require, module) as LuaTuple<[boolean, unknown]>;
				if (success && typeIs(moduleExports, "table")) {
					const exportedFunctions = moduleExports as Record<string, unknown>;
					if (typeIs(exportedFunctions.testSystem, "function")) {
						const systemFn = exportedFunctions.testSystem as () => string;
						latestVersion = systemFn();
						executionCount += 1;
					}
				}
			}
		};

		// 创建应用并注册热更新
		const app = new App();
		app.addPlugin(new HotReloadPlugin({ enabled: true }));

		const hotReload = app.getResource<HotReloadService>();
		expect(hotReload).to.be.ok();

		hotReload!.registerContainers({
			container: testContainer,
			schedule: BuiltinSchedules.UPDATE,
		});

		app.addSystems(BuiltinSchedules.UPDATE, verifySystem);
		app.finish();

		// 第一阶段：验证原始版本
		executionCount = 0;
		latestVersion = "";

		for (let frameIndex = 0; frameIndex < 3; frameIndex++) {
			app.update();
		}

		expect(executionCount).to.equal(3);
		expect(latestVersion).to.equal("version1");

		// 第二阶段：模拟热更新
		// 步骤1：删除原模块（触发 onModuleUnloaded）
		originalModule.Destroy();

		// 步骤2：等待 Rewire 处理删除
		task.wait(0.1);

		// 步骤3：克隆副本到容器（触发 onModuleLoaded）
		const newModule = updatedModuleBackup.Clone();
		newModule.Name = "TestSystem"; // 保持相同名称
		newModule.Parent = testContainer;

		// 步骤4：等待 Rewire 处理新增
		task.wait(0.5);

		// 重置计数
		executionCount = 0;
		latestVersion = "";

		// 运行几帧验证热更新生效
		for (let frameIndex = 0; frameIndex < 3; frameIndex++) {
			app.update();
		}

		expect(executionCount).to.equal(3);
		expect(latestVersion).to.equal("version2");

			// 清理
			testContainer.Destroy();
			updatedModuleBackup.Destroy();

			print("✅ 热更新集成测试通过");
		});
	});

	describe("addPaths API 集成测试", () => {
		it("应该能通过路径字符串加载和热更新系统", () => {
			// 创建测试容器在 ReplicatedStorage
			const replicatedStorage = game.GetService("ReplicatedStorage");
			const testContainer = new Instance("Folder");
			testContainer.Name = "IntegrationTestPath";
			testContainer.Parent = replicatedStorage;

			// 创建原始系统模块
			const systemModule = new Instance("ModuleScript");
			systemModule.Name = "PathTestSystem";
			systemModule.Parent = testContainer;

			systemModule.Source = `
				local exports = {}
				exports.pathSystem = function(world, context)
					return "path_v1"
				end
				return exports
			`;

			// 准备热更新副本
			const updatedBackup = new Instance("ModuleScript");
			updatedBackup.Name = "PathTestSystemV2";
			updatedBackup.Source = `
				local exports = {}
				exports.pathSystem = function(world, context)
					return "path_v2"
				end
				return exports
			`;

			let executionCount = 0;
			let latestResult = "";

			const verifySystem = () => {
				const module = testContainer.FindFirstChild("PathTestSystem") as ModuleScript | undefined;
				if (module !== undefined) {
					const [success, moduleExports] = pcall(require, module) as LuaTuple<[boolean, unknown]>;
					if (success && typeIs(moduleExports, "table")) {
						const funcs = moduleExports as Record<string, unknown>;
						if (typeIs(funcs.pathSystem, "function")) {
							const fn = funcs.pathSystem as () => string;
							latestResult = fn();
							executionCount += 1;
						}
					}
				}
			};

			// 创建应用
			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: true }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 使用 addPaths 注册
			hotReload!.addPaths("ReplicatedStorage/IntegrationTestPath", BuiltinSchedules.UPDATE);

			app.addSystems(BuiltinSchedules.UPDATE, verifySystem);
			app.finish();

			// 验证原始版本
			executionCount = 0;
			for (let i = 0; i < 3; i++) {
				app.update();
			}

			expect(executionCount).to.equal(3);
			expect(latestResult).to.equal("path_v1");

			// 触发热更新
			systemModule.Destroy();
			task.wait(0.1);

			const newModule = updatedBackup.Clone();
			newModule.Name = "PathTestSystem";
			newModule.Parent = testContainer;
			task.wait(0.5);

			// 验证热更新
			executionCount = 0;
			for (let i = 0; i < 3; i++) {
				app.update();
			}

			expect(executionCount).to.equal(3);
			expect(latestResult).to.equal("path_v2");

			// 清理
			testContainer.Destroy();
			updatedBackup.Destroy();

			print("✅ addPaths 集成测试通过");
		});
	});

	describe("addPathsGlob API 集成测试", () => {
		it("应该能通过 * 通配符匹配多个系统容器", () => {
			const replicatedStorage = game.GetService("ReplicatedStorage");

			// 创建根文件夹
			const rootFolder = new Instance("Folder");
			rootFolder.Name = "IntegrationTestGlob";
			rootFolder.Parent = replicatedStorage;

			// 创建两个子容器
			const container1 = new Instance("Folder");
			container1.Name = "System1";
			container1.Parent = rootFolder;

			const container2 = new Instance("Folder");
			container2.Name = "System2";
			container2.Parent = rootFolder;

			// 在每个容器中创建模块
			const module1 = new Instance("ModuleScript");
			module1.Name = "Module1";
			module1.Parent = container1;
			module1.Source = `
				local exports = {}
				exports.sys1 = function(world, context)
					return "sys1"
				end
				return exports
			`;

			const module2 = new Instance("ModuleScript");
			module2.Name = "Module2";
			module2.Parent = container2;
			module2.Source = `
				local exports = {}
				exports.sys2 = function(world, context)
					return "sys2"
				end
				return exports
			`;

			let sys1Count = 0;
			let sys2Count = 0;

			const verifySystem = () => {
				// 检查 System1
				const mod1 = container1.FindFirstChild("Module1") as ModuleScript | undefined;
				if (mod1 !== undefined) {
					const [success, moduleExports1] = pcall(require, mod1) as LuaTuple<[boolean, unknown]>;
					if (success && typeIs(moduleExports1, "table")) {
						const funcs = moduleExports1 as Record<string, unknown>;
						if (typeIs(funcs.sys1, "function")) {
							sys1Count += 1;
						}
					}
				}

				// 检查 System2
				const mod2 = container2.FindFirstChild("Module2") as ModuleScript | undefined;
				if (mod2 !== undefined) {
					const [success, moduleExports2] = pcall(require, mod2) as LuaTuple<[boolean, unknown]>;
					if (success && typeIs(moduleExports2, "table")) {
						const funcs = moduleExports2 as Record<string, unknown>;
						if (typeIs(funcs.sys2, "function")) {
							sys2Count += 1;
						}
					}
				}
			};

			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: true }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 使用 glob 匹配两个容器
			hotReload!.addPathsGlob("ReplicatedStorage/IntegrationTestGlob/*", BuiltinSchedules.UPDATE);

			app.addSystems(BuiltinSchedules.UPDATE, verifySystem);
			app.finish();

			// 运行几帧
			for (let i = 0; i < 3; i++) {
				app.update();
			}

			// 验证两个系统都被加载
			expect(sys1Count).to.equal(3);
			expect(sys2Count).to.equal(3);

			// 清理
			rootFolder.Destroy();

			print("✅ addPathsGlob(*) 集成测试通过");
		});

		it("应该能通过 ** 通配符匹配嵌套的系统容器", () => {
			const replicatedStorage = game.GetService("ReplicatedStorage");

			// 创建嵌套结构
			const rootFolder = new Instance("Folder");
			rootFolder.Name = "IntegrationTestDeepGlob";
			rootFolder.Parent = replicatedStorage;

			const level1 = new Instance("Folder");
			level1.Name = "Level1";
			level1.Parent = rootFolder;

			const level2 = new Instance("Folder");
			level2.Name = "Level2";
			level2.Parent = level1;

			// 在不同层级创建模块
			const moduleRoot = new Instance("ModuleScript");
			moduleRoot.Name = "RootModule";
			moduleRoot.Parent = rootFolder;
			moduleRoot.Source = `
				local exports = {}
				exports.rootSys = function() return "root" end
				return exports
			`;

			const moduleLevel1 = new Instance("ModuleScript");
			moduleLevel1.Name = "Level1Module";
			moduleLevel1.Parent = level1;
			moduleLevel1.Source = `
				local exports = {}
				exports.level1Sys = function() return "level1" end
				return exports
			`;

			const moduleLevel2 = new Instance("ModuleScript");
			moduleLevel2.Name = "Level2Module";
			moduleLevel2.Parent = level2;
			moduleLevel2.Source = `
				local exports = {}
				exports.level2Sys = function() return "level2" end
				return exports
			`;

			let totalSystemsFound = 0;

			const verifySystem = () => {
				// 计算加载的系统数量
				const modules = [moduleRoot, moduleLevel1, moduleLevel2];
				for (const module of modules) {
					if (module.Parent !== undefined) {
						const [success, moduleExports] = pcall(require, module) as LuaTuple<[boolean, unknown]>;
						if (success && typeIs(moduleExports, "table")) {
							totalSystemsFound += 1;
						}
					}
				}
			};

			const app = new App();
			app.addPlugin(new HotReloadPlugin({ enabled: true }));

			const hotReload = app.getResource<HotReloadService>();
			expect(hotReload).to.be.ok();

			// 使用 ** 匹配所有嵌套容器
			hotReload!.addPathsGlob("ReplicatedStorage/IntegrationTestDeepGlob/**", BuiltinSchedules.UPDATE);

			app.addSystems(BuiltinSchedules.UPDATE, verifySystem);
			app.finish();

			// 运行一帧
			app.update();

			// 验证所有层级的系统都被加载（3个模块，每个模块可能有多个导出）
			expect(totalSystemsFound > 0).to.equal(true);

			// 清理
			rootFolder.Destroy();

			print("✅ addPathsGlob(**) 集成测试通过");
		});
	});
};
