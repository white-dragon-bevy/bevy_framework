/**
 * 统一诊断扩展示例
 * 展示如何使用合并后的 diagnostic 扩展
 */

import { App, BuiltinSchedules } from "../../bevy_app";
import { DiagnosticsPlugin, DiagnosticPath, Diagnostic } from "../../bevy_diagnostic";
import { World } from "@rbxts/matter";
import { Context } from "../../bevy_ecs";

// 创建应用
const app = App.create();

// 添加诊断插件
app.addPlugin(new DiagnosticsPlugin());

// 创建自定义诊断系统
function customMetricsSystem(world: World, context: Context): void {
	// 使用统一的 diagnostic 扩展
	const diagnostic = context.get("diagnostic");

	// 第一次运行时注册诊断项
	if (!diagnostic.getDiagnostic("performance/fps")) {
		// 注册 FPS 诊断
		diagnostic.registerDiagnostic({
			id: "performance/fps",
			name: " fps",
			maxHistory: 60,
		});

		// 注册内存诊断
		diagnostic.registerDiagnostic({
			id: "performance/memory",
			name: " MB",
			maxHistory: 120,
		});

		// 使用完整的 Diagnostic 对象注册
		const cpuDiagnostic = Diagnostic.create(
			new DiagnosticPath("performance/cpu")
		)
		.withSuffix("%")
		.withMaxHistoryLength(100);

		diagnostic.registerDiagnostic(cpuDiagnostic);
	}

	// 更新诊断值
	const fps = math.random(55, 65);
	const memory = math.random(100, 200);
	const cpu = math.random(10, 50);

	diagnostic.updateDiagnostic("performance/fps", fps);
	diagnostic.updateDiagnostic("performance/memory", memory);
	diagnostic.updateDiagnostic("performance/cpu", cpu);
}

// 创建日志系统
function logDiagnosticsSystem(world: World, context: Context): void {
	const diagnostic = context.get("diagnostic");

	// 直接访问存储对象
	const store = diagnostic.store;

	print("\n=== Diagnostic Report ===");
	print(`Total diagnostics: ${diagnostic.getDiagnosticsCount()}`);

	// 遍历所有诊断项
	for (const diag of diagnostic.getAllDiagnostics()) {
		const path = diag.getPath().asStr();
		const value = diag.value();
		const average = diag.average();
		const suffix = diag.suffix;

		if (value !== undefined) {
			print(`  ${path}: ${math.floor(value)}${suffix} (avg: ${math.floor(average ?? 0)}${suffix})`);
		}
	}

	// 使用不同的渲染格式
	print("\n--- Console Output ---");
	diagnostic.setRenderFormat("text");
	diagnostic.renderToConsole();

	print("\n--- JSON Output ---");
	diagnostic.setRenderFormat("json");
	diagnostic.renderToConsole();
}

// 添加系统
app.addSystems(BuiltinSchedules.UPDATE, customMetricsSystem);
app.addSystems(BuiltinSchedules.POST_UPDATE, logDiagnosticsSystem);

// 运行几个循环
print("=== Unified Diagnostic Extension Example ===\n");

for (let cycle = 1; cycle <= 3; cycle++) {
	print(`\n--- Update Cycle ${cycle} ---`);
	app.update();
	task.wait(0.1);
}

// 展示直接访问存储
print("\n=== Direct Store Access ===");
const diagnostic = app.context.get("diagnostic");
const store = diagnostic.store;

// 直接从存储获取诊断
const fpsDiag = store.get(new DiagnosticPath("performance/fps"));
if (fpsDiag) {
	print(`FPS History Length: ${fpsDiag.historyLen()}`);
	print(`FPS Values: ${fpsDiag.values().join(", ")}`);
}

// 清空诊断
print("\n=== Clearing Diagnostics ===");
diagnostic.clearDiagnostics();
print(`Diagnostics count after clear: ${diagnostic.getDiagnosticsCount()}`);

print("\n=== Example Complete ===");