/**
 * 键盘输入示例
 * 演示如何在业务代码中使用键盘输入
 * 
 * 使用者只需要：
 * 1. 添加 DefaultPlugins（已包含 InputPlugin）
 * 2. 添加自己的系统，通过参数获取键盘输入资源
 *
 * 对应 Rust Bevy 示例: bevy-origin/examples/input/keyboard_input.rs
 */

import { App } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { MainScheduleLabel } from "../../bevy_app";
import { getKeyboardInput } from "../../bevy_input";
import type { World } from "../../bevy_ecs";

/**
 * 键盘输入系统 - 业务逻辑
 * 这个系统响应特定的按键按下事件
 * 
 * 在 Rust Bevy 中，这个系统会接收 Res<ButtonInput<KeyCode>> 参数
 * 在我们的实现中，我们通过 getKeyboardInput(world) 获取相同的功能
 * 
 * @param world - Matter World 实例
 */
function keyboardInputSystem(world: World): void {
	// 获取键盘输入资源（对应 Rust 中的 Res<ButtonInput<KeyCode>>）
	const keyboardInput = getKeyboardInput(world);
	
	if (!keyboardInput) {
		return; // 输入系统未就绪
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
}

/**
 * 主函数 - 使用者的入口点
 * 只需要添加插件，然后添加自己的系统
 */
export function main(): App {
	const app = App.create();

	// 1. 添加默认插件组（包含 InputPlugin）
	// InputPlugin 会自动添加 keyboard_input_system 到 PreUpdate 阶段
	app.addPlugins(DefaultPlugins.create());

	// 2. 添加我们的业务逻辑系统到 Update 阶段 (addClientSystem)
	// 这个系统会在 InputPlugin 的系统之后运行，所以能获取到最新的输入状态
	app.addClientSystems(MainScheduleLabel.UPDATE, keyboardInputSystem);

	// 打印使用说明
	print("========================================");
	print("Keyboard Input Example - 键盘输入示例");
	print("========================================");
	print("这个示例展示了 Bevy 风格的输入处理");
	print("----------------------------------------");
	print("操作说明:");
	print("  • 按下/释放 'A' 键 - 查看三种状态");
	print("  • 按下 '/' 键 - 模拟 '?' 输入");
	print("----------------------------------------");
	print("状态说明:");
	print("  • currently pressed - 按键保持按下状态");
	print("  • just pressed - 按键刚刚按下（本帧）");
	print("  • just released - 按键刚刚释放（本帧）");
	print("========================================");

	return app;
}

const app = main();
app.run();