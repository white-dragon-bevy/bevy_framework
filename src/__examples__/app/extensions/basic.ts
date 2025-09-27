/**
 * 基础扩展系统示例
 * 展示如何创建简单的插件扩展并使用它们
 */

import { App, AppContext, BasePlugin, BuiltinSchedules } from "../../../bevy_app";
import { World } from "@rbxts/matter";
import { Context } from "../../../bevy_ecs";

/**
 * 计数器扩展接口
 */
interface CounterExtension {
	increment(): void;
	decrement(): void;
	getValue(): number;
	reset(): void;
}

// 声明到全局注册表
declare module "../../../bevy_app/extensions" {
	interface PluginExtensions {
		example_extensions_counter: CounterExtension;
	}
}

/**
 * 计数器插件
 * 提供简单的计数功能扩展
 */
class CounterPlugin extends BasePlugin {
	build(app: App): void {
		// 内部状态
		let counter = 0;

		// 注册扩展
		this.registerExtension(
			app,
			"example_extensions_counter",
			{
				increment() {
					counter++;
					print(`Counter incremented to: ${counter}`);
				},
				decrement() {
					counter--;
					print(`Counter decremented to: ${counter}`);
				},
				getValue() {
					return counter;
				},
				reset() {
					counter = 0;
					print("Counter reset to 0");
				},
			} satisfies CounterExtension,
			{
				description: "Simple counter functionality",
				version: "1.0.0",
			},
		);

		print("CounterPlugin initialized");
	}

	name(): string {
		return "CounterPlugin";
	}
}

/**
 * 使用计数器扩展的系统
 */
function counterSystem(world: World, context: Context): void {
	// 获取计数器扩展
	const counter = context.get("example_extensions_counter");

	// 使用扩展功能
	counter.increment();

	// 每 5 次调用重置一次
	if (counter.getValue() >= 5) {
		print(`Counter reached ${counter.getValue()}, resetting...`);
		counter.reset();
	}
}

/**
 * 演示安全获取扩展的系统
 */
function safeAccessSystem(world: World, context: Context): void {
	// 检查扩展是否存在
	if (context.has("example_extensions_counter")) {
		const counter = context.get("example_extensions_counter");
		print(`Current counter value: ${counter.getValue()}`);
	}

	// 使用 tryGet 安全访问
	const maybeCounter = app.context.tryGet("example_extensions_counter");
	if (maybeCounter !== undefined) {
		// 扩展存在，可以安全使用
		maybeCounter.decrement();
	} else {
		print("Counter extension not available");
	}
}

// 创建和配置应用
const app = App.create();

// 添加插件
app.addPlugin(new CounterPlugin());

// 添加系统
app.addSystems(BuiltinSchedules.UPDATE, counterSystem);
app.addSystems(BuiltinSchedules.POST_UPDATE, safeAccessSystem);

// 列出所有已注册的扩展
print("\n=== Registered Extensions ===");
const extensions = app.context.listExtensions();
for (const ext of extensions) {
	const metadata = app.context.getMetadata(ext);
	print(`  ${ext as string}:`);
	if (metadata) {
		print(`    Description: ${metadata.description ?? "N/A"}`);
		print(`    Version: ${metadata.version ?? "N/A"}`);
	}
}
print("=============================\n");

// 运行几个更新周期
print("Running update cycles...");
for (let index = 1; index <= 3; index++) {
	print(`\n--- Update Cycle ${index} ---`);
	app.update();
	task.wait(0.1);
}

print("\n=== Basic Extensions Example Complete ===");
