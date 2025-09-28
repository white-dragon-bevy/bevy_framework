/**
 * 键盘输入示例
 * 演示处理键盘按键的按下/释放事件
 *
 * 对应 Rust Bevy 示例: bevy-origin/examples/input/keyboard_input.rs
 */

import { RunService } from "@rbxts/services";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { getKeyboardInput } from "../../bevy_input";
import type { World } from "@rbxts/matter";

// 添加计数器来减少日志频率
let frameCount = 0;

/**
 * 键盘输入系统
 * 响应特定的按键按下事件
 * @param world - Matter World 实例
 */
function keyboardInputSystem(world: World): void {
	frameCount++;

	// 键盘输入只在客户端处理
	if (!RunService.IsClient()) {
		if (frameCount === 1) {
			print("[keyboardInputSystem] ⚠️ Running on SERVER - keyboard input is CLIENT only!");
		}
		return;
	}

	// 每60帧输出一次调试信息
	if (frameCount % 60 === 1) {
		print(`[keyboardInputSystem] 🔍 Frame ${frameCount} - Getting keyboard input from world (CLIENT)...`);
	}

	const keyboardInput = getKeyboardInput(world);

	if (!keyboardInput) {
		if (frameCount % 60 === 1) {
			print("[keyboardInputSystem] ❌ No keyboard input found in world!");
		}
		return;
	}

	if (frameCount % 60 === 1) {
		print("[keyboardInputSystem] ✅ Keyboard input found, checking for key presses...");
	}

	// 调试：显示当前按键状态
	const pressed = keyboardInput.getPressed();
	const justPressed = keyboardInput.getJustPressed();
	const justReleased = keyboardInput.getJustReleased();

	if (pressed.size() > 0 || justPressed.size() > 0 || justReleased.size() > 0) {
		print(`[keyboardInputSystem] 📊 Current state:`);
		print(`  - Pressed keys: ${pressed.size()}`);
		print(`  - Just pressed: ${justPressed.size()}`);
		print(`  - Just released: ${justReleased.size()}`);
	}

	// KeyCode 用于跨不同键盘布局时的按键位置
	// 查看 https://developer.roblox.com/en-us/api-reference/enum/KeyCode 了解按键位置
	if (keyboardInput.isPressed(Enum.KeyCode.A)) {
		print("'A' currently pressed");
	}

	if (keyboardInput.justPressed(Enum.KeyCode.A)) {
		print("'A' just pressed");
	}

	if (keyboardInput.justReleased(Enum.KeyCode.A)) {
		print("'A' just released");
	}

	// 在 Roblox 中，我们使用特定的 KeyCode 来检测特殊字符
	// 例如，'?' 键通常对应 Slash 键（在 Shift 组合下）
	// 注意：Roblox 不直接支持字符级别的输入检测，需要使用 KeyCode

	// 检测问号键（通常是 Slash + Shift）
	// 这里我们简化为只检测 Slash 键
	if (keyboardInput.isPressed(Enum.KeyCode.Slash)) {
		print("'/' currently pressed (? with Shift)");
	}

	if (keyboardInput.justPressed(Enum.KeyCode.Slash)) {
		print("'/' just pressed (? with Shift)");
	}

	if (keyboardInput.justReleased(Enum.KeyCode.Slash)) {
		print("'/' just released (? with Shift)");
	}

	// 演示其他常用按键
	if (keyboardInput.justPressed(Enum.KeyCode.Space)) {
		print("Space just pressed");
	}

	if (keyboardInput.justPressed(Enum.KeyCode.Return)) {
		print("Enter just pressed");
	}

	if (keyboardInput.justPressed(Enum.KeyCode.Escape)) {
		print("Escape just pressed");
	}

	// 演示组合键检测（需要同时按下多个键）
	if (keyboardInput.allPressed([Enum.KeyCode.LeftControl, Enum.KeyCode.S])) {
		print("Ctrl+S combination pressed (Save)");
	}

	if (keyboardInput.allPressed([Enum.KeyCode.LeftControl, Enum.KeyCode.C])) {
		print("Ctrl+C combination pressed (Copy)");
	}
}

/**
 * 主函数
 * 创建应用并添加键盘输入系统
 */
export function main(): App {
	print("[main] 🚀 Creating App...");
	const app = App.create();

	// 添加默认插件组（包含 InputPlugin）
	print("[main] 📦 Adding DefaultPlugins...");
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());
	print("[main] ✅ DefaultPlugins added");

	// 添加键盘系统到更新阶段
	print("[main] 🎮 Adding keyboard input system to UPDATE schedule...");
	app.addSystems(MainScheduleLabel.UPDATE, keyboardInputSystem);
	print("[main] ✅ Keyboard input system added");

	// 打印使用说明
	print("========================================");
	print("Keyboard Input Example - 键盘输入示例");
	print("========================================");
	print("操作说明:");
	print("  • 按下/释放 'A' 键 - 查看三种状态");
	print("  • 按下 '/' 键 - 模拟 '?' 输入");
	print("  • 按下 Space/Enter/Escape - 特殊按键");
	print("  • Ctrl+S / Ctrl+C - 组合键检测");
	print("----------------------------------------");
	print("状态说明:");
	print("  • currently pressed - 按键保持按下状态");
	print("  • just pressed - 按键刚刚按下（本帧）");
	print("  • just released - 按键刚刚释放（本帧）");
	print("========================================");

	// 注意: 在示例中我们返回 app 而不是调用 run()
	// 这允许测试框架或其他代码控制应用的运行
	print("[main] 💡 Returning app instance...");
	return app;
}

// 运行应用 - 只在客户端运行键盘输入示例
if (RunService.IsClient()) {
	print("\n=== STARTING KEYBOARD INPUT EXAMPLE (CLIENT) ===\n");
	const app = main();
	print("[App] 🏃 Starting app.run() on CLIENT...");
	app.run();
	print("[App] ⚠️ App.run() has returned (this shouldn't happen in normal operation)");
} else {
	print("\n=== KEYBOARD INPUT EXAMPLE - SKIPPED (SERVER) ===");
	print("Keyboard input example only runs on client side");
}