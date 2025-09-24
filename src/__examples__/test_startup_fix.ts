/**
 * 测试启动调度修复
 */

import { App } from "../bevy_app/app";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
import { AppExit } from "../bevy_app/types";

export function testStartupScheduleFix(): void {
	print("\n=== Testing Startup Schedule Fix ===");

	const app = App.create();
	let startupCount = 0;
	let updateCount = 0;

	// 添加启动系统
	app.addSystems(BuiltinSchedules.STARTUP, () => {
		startupCount++;
		print(`[TEST] Startup system called (count: ${startupCount})`);
		if (startupCount > 1) {
			warn(`[TEST] ERROR: STARTUP system called multiple times! This should only happen once.`);
		}
	});

	// 添加更新系统
	app.addSystems(BuiltinSchedules.UPDATE, () => {
		updateCount++;
		print(`[TEST] Update system called (count: ${updateCount})`);
	});

	// 设置运行器
	app.setRunner((app: App): AppExit => {
		print("[TEST] Starting test runner");

		// 模拟多帧更新
		for (let frame = 1; frame <= 5; frame++) {
			print(`[TEST] === Frame ${frame} ===`);
			app.update();
		}

		// 验证结果
		print("\n[TEST] Final Results:");
		print(`  Startup called: ${startupCount} times (expected: 1)`);
		print(`  Update called: ${updateCount} times (expected: 5)`);

		if (startupCount === 1 && updateCount === 5) {
			print("[TEST] ✅ SUCCESS: Startup schedule only ran once!");
		} else {
			print("[TEST] ❌ FAILED: Startup schedule ran multiple times!");
		}

		return AppExit.success();
	});

	// 运行应用
	app.run();
}