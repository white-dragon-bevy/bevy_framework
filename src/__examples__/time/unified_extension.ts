/**
 * 统一时间扩展示例
 * 展示如何使用合并后的 time 扩展
 */

import { App, BuiltinSchedules } from "../../bevy_app";
import { TimePlugin } from "../../bevy_time";
import { World } from "@rbxts/matter";
import { Context } from "../../bevy_ecs";

// 创建应用
const app = App.create();

// 添加时间插件
app.addPlugin(new TimePlugin());

// 创建游戏系统
function gameUpdateSystem(world: World, context: Context): void {
	// 使用统一的 time 扩展
	const time = context.get("time");

	// 访问当前时间对象
	const currentTime = time.getCurrent();

	// 获取增量时间
	const deltaSecs = time.getDeltaSeconds();
	const deltaMs = time.getDeltaMillis();

	// 获取总时间
	const elapsedSecs = time.getElapsedSeconds();
	const elapsedMs = time.getElapsedMillis();

	print(`Frame ${math.floor(elapsedSecs * 60)}:`);
	print(`  Delta: ${math.floor(deltaMs)}ms (${string.format("%.3f", deltaSecs)}s)`);
	print(`  Elapsed: ${string.format("%.2f", elapsedSecs)}s`);

	// 每3秒暂停一次
	if (math.floor(elapsedSecs) % 6 === 3 && !time.isPaused()) {
		print("⏸️  Pausing time...");
		time.pause();
	}
	// 每6秒恢复
	else if (math.floor(elapsedSecs) % 6 === 0 && time.isPaused()) {
		print("▶️  Resuming time...");
		time.resume();
	}
}

// 创建统计系统
function statsSystem(world: World, context: Context): void {
	const time = context.get("time");

	// 每秒输出一次统计
	const elapsed = time.getElapsedSeconds();
	if (math.floor(elapsed) !== math.floor(elapsed - time.getDeltaSeconds())) {
		print("\n=== Time Statistics ===");
		print(`Average FPS: ${string.format("%.1f", time.getAverageFPS())}`);
		print(`Instant FPS: ${string.format("%.1f", time.getInstantFPS())}`);
		print(`Min Frame Time: ${string.format("%.2f", time.getMinFrameTime())}ms`);
		print(`Max Frame Time: ${string.format("%.2f", time.getMaxFrameTime())}ms`);
		print(`Average Frame Time: ${string.format("%.2f", time.getAverageFrameTime())}ms`);
		print(`Time Scale: ${time.getTimeScale()}`);
		print(`Paused: ${time.isPaused()}`);
		print("======================\n");
	}
}

// 创建时间控制系统
function timeControlSystem(world: World, context: Context): void {
	const time = context.get("time");
	const elapsed = time.getElapsedSeconds();

	// 在第5秒改变时间缩放
	if (math.floor(elapsed) === 5 && time.getTimeScale() === 1.0) {
		print("⚡ Setting time scale to 2x speed");
		time.setTimeScale(2.0);
	}

	// 在第10秒恢复正常速度
	if (math.floor(elapsed) === 10 && time.getTimeScale() !== 1.0) {
		print("🔄 Resetting time scale to normal");
		time.setTimeScale(1.0);
	}

	// 在第15秒手动推进时间
	if (math.floor(elapsed) === 15 && math.floor(elapsed - time.getDeltaSeconds()) === 14) {
		print("⏭️  Manually advancing time by 2 seconds");
		time.advanceTime(2.0);
	}
}

// 添加系统
app.addSystems(BuiltinSchedules.UPDATE, gameUpdateSystem);
app.addSystems(BuiltinSchedules.UPDATE, timeControlSystem);
app.addSystems(BuiltinSchedules.POST_UPDATE, statsSystem);

// 运行应用
print("=== Unified Time Extension Example ===\n");
print("Features demonstrated:");
print("- Direct access to Time object via time.getCurrent()");
print("- Time queries (delta, elapsed)");
print("- Time control (pause, resume, scale)");
print("- Time statistics (FPS, frame times)");
print("- Manual time advancement\n");

// 运行循环
for (let cycle = 1; cycle <= 20; cycle++) {
	print(`\n--- Cycle ${cycle} ---`);
	app.update();
	task.wait(0.1); // 模拟约10 FPS
}

// 演示重置功能
print("\n=== Resetting Time ===");
const time = app.context.get("time");
time.reset();
print(`After reset:`);
print(`  Elapsed: ${time.getElapsedSeconds()}s`);
print(`  Delta: ${time.getDeltaSeconds()}s`);
print(`  Time Scale: ${time.getTimeScale()}`);
print(`  Paused: ${time.isPaused()}`);

// 重置统计
time.resetStats();
print("\n=== Statistics Reset ===");
print(`Average FPS: ${time.getAverageFPS()}`);

print("\n=== Example Complete ===");
