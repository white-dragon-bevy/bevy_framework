/**
 * 鼠标输入示例
 * 打印鼠标按钮事件和移动/滚动事件
 *
 * 对应 Rust Bevy 示例: bevy-origin/examples/input/mouse_input.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { getMouseInput, getMouseMotion, getMouseWheel } from "../../bevy_input";
import type { World } from "@rbxts/matter";

/**
 * 鼠标点击系统
 * 检测并打印鼠标按钮的按下、刚按下、刚释放状态
 * @param world - Matter World 实例
 */
function mouseClickSystem(world: World): void {
	const mouseButtonInput = getMouseInput(world);

	if (!mouseButtonInput) {
		return;
	}

	// 检查左键状态
	if (mouseButtonInput.isPressed(Enum.UserInputType.MouseButton1)) {
		print("left mouse currently pressed");
	}

	if (mouseButtonInput.justPressed(Enum.UserInputType.MouseButton1)) {
		print("left mouse just pressed");
	}

	if (mouseButtonInput.justReleased(Enum.UserInputType.MouseButton1)) {
		print("left mouse just released");
	}
}

/**
 * 鼠标移动和滚动系统
 * 打印鼠标的移动和滚轮滚动信息
 * @param world - Matter World 实例
 */
function mouseMoveSystem(world: World): void {
	const accumulatedMouseMotion = getMouseMotion(world);
	const accumulatedMouseScroll = getMouseWheel(world);

	// 处理鼠标移动
	if (accumulatedMouseMotion) {
		// 先检查是否有数据
		if (accumulatedMouseMotion.hasData()) {
			const motionData = accumulatedMouseMotion.consume();
			if (motionData) {
				const [deltaX, deltaY] = motionData;
				// 打印任何非零移动
				if (math.abs(deltaX) > 0.01 || math.abs(deltaY) > 0.01) {
					print(`mouse moved (${string.format("%.2f", deltaX)}, ${string.format("%.2f", deltaY)})`);
				}
			}
		}
	}

	// 处理鼠标滚轮
	if (accumulatedMouseScroll) {
		// 首先检查是否有数据
		if (accumulatedMouseScroll.hasData()) {
			const scrollDelta = accumulatedMouseScroll.consume();
			if (scrollDelta !== undefined && math.abs(scrollDelta) > 0.01) {
				// 打印滚轮信息
				print(`mouse scrolled (0, ${string.format("%.2f", scrollDelta)})`);
			}
		}
	}
}

/**
 * 主函数
 * 创建应用并添加鼠标输入系统
 */
export function main(): App {
	const app = App.create();

	// 添加默认插件组（包含 InputPlugin）
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加鼠标系统到更新阶段
	app.addSystems(MainScheduleLabel.UPDATE, mouseClickSystem, mouseMoveSystem);

	// 打印使用说明
	print("========================================");
	print("Mouse Input Example - 鼠标输入示例");
	print("========================================");
	print("操作说明:");
	print("  • 左键点击 - 检测按下/释放状态");
	print("  • 按住右键并移动 - 检测鼠标移动");
	print("  • 滚动滚轮 - 检测滚轮滚动");
	print("----------------------------------------");
	print("注意: Roblox 中鼠标移动事件仅在按住右键时触发");
	print("========================================");

	// 注意: 在示例中我们返回 app 而不是调用 run()
	// 这允许测试框架或其他代码控制应用的运行
	return app;
}

main().run();
