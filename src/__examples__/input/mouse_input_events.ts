/**
 * 鼠标输入事件示例
 * 打印所有鼠标事件到控制台
 *
 * 对应 Rust Bevy 示例: bevy-origin/examples/input/mouse_input_events.rs
 */

import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import { EventReader } from "../../bevy_ecs/events";
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
 * 事件读取器资源存储插件
 * 更好的实现方式：将读取器作为资源存储
 */
class MouseEventReadersPlugin {
	private readers?: {
		buttonReader: EventReader<MouseButtonInput>;
		motionReader: EventReader<MouseMotion>;
		cursorReader: EventReader<CursorMoved>;
		wheelReader: EventReader<MouseWheel>;
	};

	public build(app: App): void {
		const eventManager = app.main().getEventManager();

		// 创建并存储读取器
		this.readers = {
			buttonReader: eventManager.createReader(MouseButtonInput),
			motionReader: eventManager.createReader(MouseMotion),
			cursorReader: eventManager.createReader(CursorMoved),
			wheelReader: eventManager.createReader(MouseWheel),
		};

		// 添加事件打印系统
		app.addSystems(MainScheduleLabel.UPDATE, (_world: World) => {
			if (!this.readers) {
				return;
			}

			// 读取并打印鼠标按钮事件
			const buttonEvents = this.readers.buttonReader.read();
			for (const event of buttonEvents) {
				const buttonName = getButtonName(event.button);
				const stateText = event.state === "Pressed" ? "pressed" : "released";
				print(`[MouseButtonInput] ${buttonName} ${stateText}`);
			}

			// 读取并打印鼠标移动事件
			const motionEvents = this.readers.motionReader.read();
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
			const cursorEvents = this.readers.cursorReader.read();
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
			const wheelEvents = this.readers.wheelReader.read();
			for (const event of wheelEvents) {
				if (math.abs(event.y) > 0.01) {
					const direction = event.y > 0 ? "up" : "down";
					print(`[MouseWheel] scrolling ${direction}: ${string.format("%.2f", event.y)}`);
				}
			}
		});
	}

	public name(): string {
		return "MouseEventReadersPlugin";
	}

	public isUnique(): boolean {
		return true;
	}

	public cleanup(): void {
		if (this.readers) {
			this.readers.buttonReader.cleanup();
			this.readers.motionReader.cleanup();
			this.readers.cursorReader.cleanup();
			this.readers.wheelReader.cleanup();
		}
	}
}

/**
 * 主函数
 * 创建应用并添加鼠标事件系统
 */
export function main(): App {
	const app = App.create();

	// 添加默认插件组（包含 InputPlugin）
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());

	// 添加鼠标事件读取器插件
	app.addPlugin(new MouseEventReadersPlugin());

	// 打印使用说明
	print("========================================");
	print("Mouse Input Events Example - 鼠标输入事件示例");
	print("========================================");
	print("本示例使用事件系统来处理鼠标输入");
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