/**
 * 鼠标输入事件示例
 * 演示如何使用事件系统处理鼠标输入
 * 
 * 使用者只需要：
 * 1. 添加 DefaultPlugins（已包含 InputPlugin）
 * 2. 添加自己的系统，通过 MessageReader 参数读取事件
 *
 * 对应 Rust Bevy 示例: bevy-origin/examples/input/mouse_input_events.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { MessageReader, Message } from "../../bevy_ecs/message";
import { CursorMoved, MouseButtonInput, MouseMotion, MouseWheel } from "../../bevy_input";
import type { World } from "@rbxts/matter";

/**
 * 获取按钮的友好名称
 * @param button - 鼠标按钮枚举
 * @returns 按钮名称字符串
 */
function getButtonName(button: Enum.UserInputType | unknown): string {
	if (button === Enum.UserInputType.MouseButton1) {
		return "Left Mouse Button";
	} else if (button === Enum.UserInputType.MouseButton2) {
		return "Right Mouse Button";
	} else if (button === Enum.UserInputType.MouseButton3) {
		return "Middle Mouse Button";
	} else {
		return "Unknown Button";
	}
}

/**
 * 鼠标事件处理系统
 * 
 * 在 Rust Bevy 中，这个系统会接收 MessageReader 参数：
 * - MessageReader<MouseButtonInput>
 * - MessageReader<MouseMotion>
 * - MessageReader<CursorMoved>
 * - MessageReader<MouseWheel>
 * 
 * 在我们的实现中，我们需要从 world 获取事件管理器来创建读取器
 * 
 * @param world - Matter World 实例
 */
function mouseEventsSystem(world: World): void {
	// 获取事件管理器
	const context = (world as unknown as { context?: { messages?: unknown } }).context;
	if (!context?.messages) return;
	const messageRegistry = context.messages as { createReader: <T extends Message>(type?: any, text?: any) => MessageReader<T> };

	// 创建事件读取器（在 Rust 中这些是系统参数）
	const buttonReader = messageRegistry.createReader<MouseButtonInput>();
	const motionReader = messageRegistry.createReader<MouseMotion>();
	const cursorReader = messageRegistry.createReader<CursorMoved>();
	const wheelReader = messageRegistry.createReader<MouseWheel>();

	// 读取并打印鼠标按钮事件
	const buttonEvents = buttonReader.read();
	for (const event of buttonEvents) {
		const buttonName = getButtonName(event.button);
		const stateText = event.state === "Pressed" ? "pressed" : "released";
		print(`[MouseButtonInput] ${buttonName} ${stateText}`);
	}

	// 读取并打印鼠标移动事件
	const motionEvents = motionReader.read();
	for (const event of motionEvents) {
		if (math.abs(event.deltaX) > 0.01 || math.abs(event.deltaY) > 0.01) {
			print(
				`[MouseMotion] delta: (${string.format("%.2f", event.deltaX)}, ${string.format(
					"%.2f",
					event.deltaY,
				)})`,
			);
		}
	}

	// 读取并打印光标移动事件
	const cursorEvents = cursorReader.read();
	for (const event of cursorEvents) {
		if (event.delta && (math.abs(event.delta.X) > 1 || math.abs(event.delta.Y) > 1)) {
			print(
				`[CursorMoved] position: (${string.format("%.0f", event.position.X)}, ${string.format(
					"%.0f",
					event.position.Y,
				)}) delta: (${string.format("%.0f", event.delta.X)}, ${string.format(
					"%.0f",
					event.delta.Y,
				)})`,
			);
		}
	}

	// 读取并打印鼠标滚轮事件
	const wheelEvents = wheelReader.read();
	for (const event of wheelEvents) {
		if (math.abs(event.y) > 0.01) {
			const direction = event.y > 0 ? "up" : "down";
			print(`[MouseWheel] scrolling ${direction}: ${string.format("%.2f", event.y)}`);
		}
	}
}

/**
 * 主函数 - 使用者的入口点
 * 只需要添加插件，然后添加自己的系统
 */
export function main(): App {
	const app = App.create();

	// 1. 添加默认插件组（包含 InputPlugin）
	// InputPlugin 会自动处理输入事件并发送到事件系统
	app.addPlugins(DefaultPlugins.create());

	// 2. 添加我们的事件处理系统到 Update 阶段
	// 这个系统会读取 InputPlugin 发送的事件
	app.addSystems(MainScheduleLabel.UPDATE, mouseEventsSystem);

	// 打印使用说明
	print("========================================");
	print("Mouse Input Events Example - 鼠标输入事件示例");
	print("========================================");
	print("这个示例展示了 Bevy 风格的事件处理");
	print("----------------------------------------");
	print("操作说明:");
	print("  • 点击鼠标按钮 - 查看 MouseButtonInput 事件");
	print("  • 移动鼠标 - 查看 MouseMotion 和 CursorMoved 事件");
	print("  • 滚动滚轮 - 查看 MouseWheel 事件");
	print("----------------------------------------");
	print("注意: ");
	print("  • Roblox 中鼠标移动需要按住右键");
	print("  • 手势事件（Pinch/Rotation/DoubleTap）在 Roblox 不支持");
	print("========================================");

	return app;
}

// 运行示例
main().run();