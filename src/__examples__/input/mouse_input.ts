/**
 * 鼠标输入示例
 * 演示如何在业务代码中使用鼠标输入
 * 
 * 使用者只需要：
 * 1. 添加 DefaultPlugins（已包含 InputPlugin）
 * 2. 在业务逻辑中调用相关 API 获取鼠标状态
 *
 * 对应 Rust Bevy 示例: bevy-origin/examples/input/mouse_input.rs
 */

import { RunService } from "@rbxts/services";
import { App } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { getMouseInput, getMouseMotion, getMouseWheel } from "../../bevy_input";

/**
 * 相机控制器业务逻辑示例
 * 演示如何使用鼠标输入实现相机控制
 */
class CameraController {
	private app: App;
	private sensitivity = 2.0;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * 处理鼠标输入的业务逻辑
	 * 这是使用者需要关心的核心代码
	 */
	public handleMouseInput(): void {
		const world = this.app.getWorld();

		// 获取鼠标按钮输入
		const mouseInput = getMouseInput(world);
		// 获取鼠标移动数据
		const mouseMotion = getMouseMotion(world);
		// 获取鼠标滚轮数据
		const mouseWheel = getMouseWheel(world);

		// 业务逻辑：鼠标点击处理
		if (mouseInput) {
			if (mouseInput.justPressed(Enum.UserInputType.MouseButton1)) {
				print("🎯 Left click - Select object!");
			}

			if (mouseInput.justPressed(Enum.UserInputType.MouseButton2)) {
				print("📋 Right click - Context menu!");
			}

			if (mouseInput.justPressed(Enum.UserInputType.MouseButton3)) {
				print("🔍 Middle click - Focus camera!");
			}

			// 检测拖拽开始
			if (mouseInput.isPressed(Enum.UserInputType.MouseButton1)) {
				// 左键按住状态 - 可以实现拖拽逻辑
			}
		}

		// 业务逻辑：相机旋转（鼠标移动）
		if (mouseMotion && mouseMotion.hasData()) {
			const motionData = mouseMotion.consume();
			if (motionData) {
				const [deltaX, deltaY] = motionData;
				if (math.abs(deltaX) > 0.01 || math.abs(deltaY) > 0.01) {
					const rotationX = deltaX * this.sensitivity;
					const rotationY = deltaY * this.sensitivity;
					print(`🎥 Camera rotation: X=${string.format("%.1f", rotationX)}, Y=${string.format("%.1f", rotationY)}`);
				}
			}
		}

		// 业务逻辑：相机缩放（鼠标滚轮）
		if (mouseWheel && mouseWheel.hasData()) {
			const scrollDelta = mouseWheel.consume();
			if (scrollDelta !== undefined && math.abs(scrollDelta) > 0.01) {
				const zoomAmount = scrollDelta * 0.1;
				if (scrollDelta > 0) {
					print(`🔍 Zoom in: ${string.format("%.2f", zoomAmount)}`);
				} else {
					print(`🔎 Zoom out: ${string.format("%.2f", math.abs(zoomAmount))}`);
				}
			}
		}
	}

	/**
	 * 更新相机控制器
	 */
	public update(): void {
		this.handleMouseInput();
		// 其他相机逻辑...
	}
}

/**
 * UI控制器业务逻辑示例
 * 演示在UI交互中使用鼠标输入
 */
class UIController {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	public handleUIInput(): void {
		const mouseInput = getMouseInput(this.app.getWorld());

		if (!mouseInput) return;

		// 业务逻辑：UI交互
		if (mouseInput.justPressed(Enum.UserInputType.MouseButton1)) {
			print("🖱️ UI Click - Button pressed or item selected!");
		}

		if (mouseInput.justReleased(Enum.UserInputType.MouseButton1)) {
			print("🖱️ UI Release - Button action triggered!");
		}
	}

	public update(): void {
		this.handleUIInput();
	}
}

/**
 * 主函数 - 使用者的入口点
 * 只需要添加插件，然后使用业务逻辑类
 */
export function main(): App {
	// 1. 创建应用并添加默认插件（包含输入系统）
	const app = App.create().addPlugins(DefaultPlugins.create());

	// 2. 创建业务逻辑控制器
	const cameraController = new CameraController(app);
	const uiController = new UIController(app);

	// 3. 启动游戏循环
	const connection = RunService.Heartbeat.Connect(() => {
		cameraController.update();
		uiController.update();
	});

	// 打印使用说明
	print("========================================");
	print("Mouse Input Example - 鼠标输入示例");
	print("========================================");
	print("这是一个面向业务使用者的简单示例");
	print("----------------------------------------");
	print("控制说明:");
	print("  • 左键点击 - 选择对象/UI交互");
	print("  • 右键点击 - 上下文菜单");
	print("  • 中键点击 - 聚焦相机");
	print("  • 鼠标移动 - 相机旋转");
	print("  • 滚轮 - 相机缩放");
	print("----------------------------------------");
	print("注意: Roblox 中鼠标移动需要按住右键");
	print("========================================");

	return app;
}

// 运行示例
main().run();
