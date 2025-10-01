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

import { App } from "../../../bevy_app/app";
import { RobloxRunnerPlugin } from "../../../bevy_app/roblox-adapters";
import { HotReloadPlugin } from "../../../bevy_dev/hot_reload";
import { GameplayPlugin, RenderPlugin } from "./gameplay-plugin";

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

	// 添加游戏插件
	print("3. 添加 GameplayPlugin...");
	app.addPlugin(new GameplayPlugin());

	// 添加渲染插件（可选）
	print("4. 添加 RenderPlugin...");
	app.addPlugin(new RenderPlugin());

	print("");
	print("应用初始化完成！");
	print("");
	print("═══════════════════════════════════════");
	print("使用说明：");
	print("1. 在 ReplicatedStorage 中创建以下结构：");
	print("   ReplicatedStorage/");
	print("     └── HotSystems/");
	print("         ├── System1 (ModuleScript)");
	print("         └── System2 (ModuleScript)");
	print("");
	print("2. 系统模块格式（参考 example-systems.ts）：");
	print("   export function mySystem(world, context) {");
	print("     print('Hello from hot reload!');");
	print("   }");
	print("");
	print("3. 修改系统代码后，保存即可自动热更新");
	print("═══════════════════════════════════════");
	print("");

	// 运行应用
	app.run();
}

runHotReloadExample();
