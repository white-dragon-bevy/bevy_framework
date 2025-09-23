/**
 * Bevy empty_defaults 示例
 *
 * 创建一个带有默认插件的空应用程序
 * 对应 Rust Bevy 示例：examples/app/empty_defaults.rs
 *
 * 这个示例演示了最基本的 Bevy 应用程序结构：
 * - 创建 App 实例
 * - 添加默认插件集（在 Roblox 环境中使用 RobloxDefaultPlugins）
 * - 运行应用程序
 */

import { App } from "../../../bevy_app";
import { DefaultPlugins } from "../../../bevy_internal";

/**
 * 主入口函数
 * 创建并运行带有 Roblox 默认插件的空应用程序
 */
function main(): void {
	// 创建新的 App 实例并添加 Roblox 默认插件集
	// 这相当于 Rust Bevy 中的：App::new().add_plugins(DefaultPlugins).run()
	const app = App.create().addPlugins(DefaultPlugins.create()).run();
}

// 执行主函数
main();
