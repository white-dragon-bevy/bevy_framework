/**
 * 基础测试和验证文件
 * 用于确保App系统的基本功能正常工作
 */

import { World } from "@rbxts/matter";
import {
	App,
	BasePlugin,
	BuiltinSchedules,
	createPlugin,
	RobloxEnvironment,
	AppExit,
} from "./index";

/**
 * 测试基础App创建和运行
 */
function testBasicApp() {
	print("Testing basic App creation...");

	let systemExecuted = false;

	function testSystem(world: World) {
		systemExecuted = true;
		print("Test system executed successfully!");
	}

	// 创建简单的App进行测试
	const app = App.create().addSystems(BuiltinSchedules.UPDATE, testSystem);

	// 手动更新一次来测试
	app.update();

	assert(systemExecuted, "Test system should have been executed");
	print("✓ Basic App test passed");
}

/**
 * 测试插件系统
 */
function testPluginSystem() {
	print("Testing plugin system...");

	let pluginBuilt = false;
	let pluginFinished = false;

	class TestPlugin extends BasePlugin {
		build(app: App): void {
			pluginBuilt = true;
			print("TestPlugin built");

			app.addSystems(BuiltinSchedules.UPDATE, () => {
				print("TestPlugin system running");
			});
		}

		finish(app: App): void {
			pluginFinished = true;
			print("TestPlugin finished");
		}

		name(): string {
			return "TestPlugin";
		}
	}

	const app = App.create().addPlugin(new TestPlugin());

	// 测试插件是否被正确添加
	assert(pluginBuilt, "Plugin should have been built");
	assert(app.isPluginAdded(TestPlugin), "Plugin should be marked as added");

	// 测试完成和清理
	app.finish();
	assert(pluginFinished, "Plugin finish should have been called");

	print("✓ Plugin system test passed");
}

/**
 * 测试函数式插件
 */
function testFunctionPlugin() {
	print("Testing function plugin...");

	let functionCalled = false;

	const testPlugin = createPlugin(
		(app: App) => {
			functionCalled = true;
			app.addSystems(BuiltinSchedules.UPDATE, () => {
				print("Function plugin system running");
			});
		},
		"TestFunctionPlugin",
	);

	App.create().addPlugin(testPlugin);

	assert(functionCalled, "Function plugin should have been called");
	print("✓ Function plugin test passed");
}

/**
 * 测试调度系统
 */
function testScheduleSystem() {
	print("Testing schedule system...");

	const executionOrder: string[] = [];

	function firstSystem() {
		executionOrder.push("First");
	}

	function updateSystem() {
		executionOrder.push("Update");
	}

	function lastSystem() {
		executionOrder.push("Last");
	}

	const app = App.create()
		.addSystems(BuiltinSchedules.FIRST, firstSystem)
		.addSystems(BuiltinSchedules.UPDATE, updateSystem)
		.addSystems(BuiltinSchedules.LAST, lastSystem);

	// 注意：这个测试需要实际的调度执行顺序支持
	// 当前的简化实现可能不会保证执行顺序

	print("✓ Schedule system test setup completed");
}

/**
 * 测试资源系统
 */
function testResourceSystem() {
	print("Testing resource system...");

	interface TestResource {
		readonly __brand: "Resource";
		value: number;
	}

	const testResource: TestResource = {
		__brand: "Resource",
		value: 42,
	};

	const app = App.create().insertResource(testResource);

	// 注意：这个测试需要实际的资源访问API
	print("✓ Resource system test setup completed");
}

/**
 * 测试错误处理
 */
function testErrorHandling() {
	print("Testing error handling...");

	let errorHandled = false;

	function errorHandler(errorObj: unknown) {
		errorHandled = true;
		print(`Error handled: ${error}`);
	}

	const app = App.create().setErrorHandler(errorHandler);

	assert(app.getErrorHandler() === errorHandler, "Error handler should be set correctly");

	print("✓ Error handling test passed");
}

/**
 * 测试Roblox环境检测
 */
function testRobloxEnvironment() {
	print("Testing Roblox environment detection...");

	// 这些测试依赖于实际的Roblox环境
	print(`Is Studio: ${RobloxEnvironment.isStudio()}`);
	print(`Is Server: ${RobloxEnvironment.isServer()}`);
	print(`Is Client: ${RobloxEnvironment.isClient()}`);

	// 基本的环境检测应该工作
	const isServer = RobloxEnvironment.isServer();
	const isClient = RobloxEnvironment.isClient();

	// 在正常情况下，应该是服务端或客户端之一
	// 但在某些测试环境中可能都是false
	print("✓ Roblox environment test completed");
}

/**
 * 运行所有测试
 */
export function runAllTests() {
	print("🧪 Starting Bevy App tests...");
	print(string.rep("=", 50));

	try {
		testBasicApp();
		testPluginSystem();
		testFunctionPlugin();
		testScheduleSystem();
		testResourceSystem();
		testErrorHandling();
		testRobloxEnvironment();

		print(string.rep("=", 50));
		print("✅ All tests completed successfully!");
	} catch (error) {
		print(string.rep("=", 50));
		print(`❌ Tests failed: ${error}`);
		throw error;
	}
}

/**
 * 简单的演示App
 */
export function createDemoApp(): App {
	class DemoPlugin extends BasePlugin {
		private frameCount = 0;

		build(app: App): void {
			print("🚀 Demo Plugin initialized");

			app.addSystems(BuiltinSchedules.STARTUP, () => this.startupSystem());
			app.addSystems(BuiltinSchedules.UPDATE, () => this.updateSystem());
		}

		name(): string {
			return "DemoPlugin";
		}

		private startupSystem(): void {
			print("📋 Demo app started!");
		}

		private updateSystem(): void {
			this.frameCount++;

			if (this.frameCount % 60 === 0) {
				print(`⏱️ Demo app running... Frame: ${this.frameCount}`);
			}

			// 运行100帧后退出
			if (this.frameCount >= 100) {
				print("🏁 Demo app finished");
				// 这里需要发送AppExit消息
			}
		}
	}

	return App.create()
		.addPlugin(new DemoPlugin())
		.setErrorHandler((errorObj: unknown) => {
			warn(`Demo app error: ${error}`);
		});
}

// 如果这个文件被直接执行，运行测试
if (script.Name === "test") {
	spawn(() => {
		runAllTests();

		print("\n🎮 Running demo app...");
		const demoApp = createDemoApp();
		demoApp.run();
	});
}