/**
 * 热更新系统示例
 * 展示如何使用 HotReloadPlugin 实现系统热更新
 *
 * 运行步骤：
 * 1. 在 Roblox Studio 中创建 ReplicatedStorage/HotSystems 文件夹
 * 2. 将 example-systems.ts 编译后的代码放入该文件夹
 * 3. 运行此示例
 * 4. 修改系统代码，观察热更新效果
 */

import { BuiltinSchedules } from "bevy_app/main-schedule";
import { App } from "../../../bevy_app/app";
import { RobloxRunnerPlugin } from "../../../bevy_app/roblox-adapters";
import { HotReloadPlugin, HotReloadService } from "../../../bevy_dev/hot_reload";

declare const script: { containers: Folder };

/**
 * 运行热更新示例
 */
export function runHotReloadExample(): void {
	print("╔═══════════════════════════════════════╗");
	print("║   热更新系统示例                      ║");
	print("╚═══════════════════════════════════════╝");
	print("");

	// 创建应用
	const app = new App();

	// 【重要】添加热更新插件（必须在其他插件之前）
	print("1. 添加 HotReloadPlugin...");
	app.addPlugin(new HotReloadPlugin());

	// 添加 Roblox 运行器（提供 Heartbeat 驱动）
	print("2. 添加 RobloxRunnerPlugin...");
	app.addPlugin(new RobloxRunnerPlugin());

	app.getResource<HotReloadService>()?.registerContainers({
		container: script.containers,
		schedule: BuiltinSchedules.UPDATE,
		defaultSet: "MyPlugin",
	  })
	    
	// 运行应用
	app.run();
}

runHotReloadExample();
