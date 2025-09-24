/**
 * 直接测试输入系统是否工作
 */

import { UserInputService, RunService } from "@rbxts/services";

// 检查运行环境
print("========================================");
print("Input Test Script");
print("IsClient:", RunService.IsClient());
print("IsServer:", RunService.IsServer());
print("IsStudio:", RunService.IsStudio());
print("IsRunMode:", RunService.IsRunMode());
print("========================================");

// 只在客户端运行
if (RunService.IsClient()) {
	print("Setting up input handlers on CLIENT");

	// 监听键盘输入
	UserInputService.InputBegan.Connect((input, gameProcessed) => {
		if (gameProcessed) return;

		if (input.UserInputType === Enum.UserInputType.Keyboard) {
			print(`[Direct Test] Key pressed: ${input.KeyCode}`);
			if (input.KeyCode === Enum.KeyCode.Space) {
				print("[Direct Test] SPACE KEY PRESSED!");
			}
		} else if (input.UserInputType === Enum.UserInputType.MouseButton1) {
			print("[Direct Test] LEFT MOUSE BUTTON PRESSED!");
		}
	});

	UserInputService.InputEnded.Connect((input, gameProcessed) => {
		if (input.UserInputType === Enum.UserInputType.Keyboard) {
			if (input.KeyCode === Enum.KeyCode.Space) {
				print("[Direct Test] SPACE KEY RELEASED!");
			}
		} else if (input.UserInputType === Enum.UserInputType.MouseButton1) {
			print("[Direct Test] LEFT MOUSE BUTTON RELEASED!");
		}
	});

	print("Input handlers connected successfully!");
} else {
	print("This is running on SERVER - input not available");
}

// 保持脚本运行
wait(60);
print("Test script finished");