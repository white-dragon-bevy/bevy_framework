/**
 * 插件扩展系统使用示例
 * 展示如何使用新的 context 系统访问插件扩展功能
 */

import { App, BuiltinSchedules } from "../src/bevy_app";
import { DiagnosticsPlugin } from "../src/bevy_diagnostic/diagnostics-plugin";
import { TimePlugin } from "../src/bevy_time/time-plugin";
import { World } from "@rbxts/matter";
import { Context } from "../src/bevy_ecs";

/**
 * 示例：使用诊断扩展的系统
 */
function diagnosticsExampleSystem(world: World, context: Context, app: App): void {
	// 通过 context 访问诊断扩展
	const diag = app.context.get("diagnostics");

	// 注册一个新的诊断项
	diag.registerDiagnostic({
		id: "example.counter",
		name: "Example Counter",
		value: 0,
		maxHistory: 100,
	});

	// 更新诊断值
	const currentValue = diag.getDiagnostic("example.counter")?.value ?? 0;
	diag.updateDiagnostic("example.counter", currentValue + 1);

	// 访问诊断存储扩展
	if (app.context.has("diagnostics.store")) {
		const store = app.context.get("diagnostics.store");
		print(`Total diagnostics: ${store.getDiagnosticsCount()}`);
	}

	// 使用渲染器扩展
	if (app.context.has("diagnostics.renderer")) {
		const renderer = app.context.get("diagnostics.renderer");
		// 每 60 帧输出一次
		const counter = diag.getDiagnostic("example.counter");
		if (counter && counter.value % 60 === 0) {
			renderer.setRenderFormat("table");
			renderer.renderToConsole();
		}
	}
}

/**
 * 示例：使用时间扩展的系统
 */
function timeExampleSystem(world: World, context: Context, app: App): void {
	// 访问核心时间扩展
	const time = app.context.get("time");

	// 获取时间信息
	const elapsed = time.getElapsedSeconds();
	const delta = time.getDeltaSeconds();

	// 每秒输出一次时间信息
	const lastPrint = (world as any).lastPrintTime ?? 0;
	if (elapsed - lastPrint > 1.0) {
		print(`Elapsed: ${elapsed.toFixed(2)}s, Delta: ${(delta * 1000).toFixed(2)}ms`);
		(world as any).lastPrintTime = elapsed;

		// 访问时间统计扩展
		if (app.context.has("time.stats")) {
			const stats = app.context.get("time.stats");
			print(`  FPS: ${stats.getInstantFPS().toFixed(1)}`);
			print(`  Avg FPS: ${stats.getAverageFPS().toFixed(1)}`);
			print(`  Frame Time: ${stats.getAverageFrameTime().toFixed(2)}ms`);
		}
	}

	// 使用时间控制扩展
	if (app.context.has("time.control")) {
		const control = app.context.get("time.control");

		// 示例：在第 5 秒暂停
		if (elapsed > 5 && elapsed < 5.1 && !control.isPaused()) {
			print("Pausing time at 5 seconds");
			control.pause();
		}

		// 示例：在第 7 秒恢复并设置 2 倍速
		if (elapsed > 7 && elapsed < 7.1 && control.isPaused()) {
			print("Resuming time at 2x speed");
			control.resume();
			control.setTimeScale(2.0);
		}

		// 示例：在第 10 秒恢复正常速度
		if (elapsed > 10 && elapsed < 10.1 && control.getTimeScale() !== 1.0) {
			print("Restoring normal time speed");
			control.setTimeScale(1.0);
		}
	}
}

/**
 * 示例：使用命名空间功能
 */
function namespaceExampleSystem(world: World, context: Context, app: App): void {
	// 获取诊断命名空间下的所有扩展
	const diagNamespace = app.context.getNamespace("diagnostics");

	// 检查命名空间是否存在
	if (app.context.hasNamespace("diagnostics")) {
		print("Diagnostics namespace is available");

		// 列出该命名空间下的所有扩展
		for (const key of app.context.listExtensions()) {
			const keyStr = key as string;
			if (keyStr.startsWith("diagnostics")) {
				const metadata = app.context.getMetadata(key);
				if (metadata) {
					print(`  ${keyStr}: ${metadata.description ?? "No description"}`);
				}
			}
		}
	}
}

/**
 * 主函数 - 创建并运行应用
 */
export function runPluginExtensionsExample(): void {
	print("=== Plugin Extensions Example ===");

	// 创建应用并添加插件
	const app = App.create()
		.addPlugin(new DiagnosticsPlugin())
		.addPlugin(new TimePlugin());

	// 验证扩展已注册
	print("\nRegistered extensions:");
	for (const ext of app.context.listExtensions()) {
		print(`  - ${ext as string}`);
	}

	// 添加示例系统
	app.addSystems(BuiltinSchedules.UPDATE, diagnosticsExampleSystem)
		.addSystems(BuiltinSchedules.UPDATE, timeExampleSystem)
		.addSystems(BuiltinSchedules.POST_UPDATE, namespaceExampleSystem);

	// 调试输出所有扩展信息
	app.context.debug();

	// 运行几个更新周期
	print("\nRunning update cycles...");
	for (let i = 0; i < 5; i++) {
		app.update();
		task.wait(0.1); // 等待 0.1 秒
	}

	print("\n=== Example Complete ===");
}

// 如果作为主模块运行
if (script === script.Parent) {
	runPluginExtensionsExample();
}