/**
 * 日志示例
 *
 * 演示如何在 Bevy Roblox 中使用日志系统。
 *
 * 对应 Rust 示例：examples/app/logs.rs
 */

import { App, BuiltinSchedules } from "../../../bevy_app";
import { DefaultPlugins } from "../../../bevy_internal";
import { LogPlugin, Level } from "../../../bevy_log";
import { error as logError, warn, info, debug, trace } from "../../../bevy_log";
import { errorOnce, warnOnce, infoOnce, debugOnce, traceOnce, once } from "../../../bevy_log";
import { getKeyboardInput } from "../../../bevy_input";
import { Players, StarterGui, RunService } from "@rbxts/services";
import type { World } from "@rbxts/matter";

/**
 * 设置 UI 提示文本
 * 在 Roblox 中使用原生 UI 替代 Bevy 的 Text/Node 组件
 */
function setup(): void {
	// 创建 ScreenGui
	const player = Players.LocalPlayer;
	if (!player) return;

	const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

	// 创建 ScreenGui 容器
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "LogExampleUI";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = playerGui;

	// 创建文本标签
	const textLabel = new Instance("TextLabel");
	textLabel.Text = "Press P to panic";
	textLabel.Position = new UDim2(0, 12, 0, 12);
	textLabel.Size = new UDim2(0, 200, 0, 50);
	textLabel.BackgroundTransparency = 1;
	textLabel.TextColor3 = new Color3(1, 1, 1);
	textLabel.TextXAlignment = Enum.TextXAlignment.Left;
	textLabel.TextYAlignment = Enum.TextYAlignment.Top;
	textLabel.TextScaled = false;
	textLabel.TextSize = 18;
	textLabel.Font = Enum.Font.SourceSans;
	textLabel.Parent = screenGui;

	info("UI setup complete");
}

/**
 * 处理按键 P 触发 panic
 * @param world - Matter World
 */
function panicOnP(world: World): void {
	const keyboard = getKeyboardInput(world);

	if (keyboard && keyboard.justPressed(Enum.KeyCode.P)) {
		logError("P pressed, panicking");
		// 在 TypeScript 中使用 throw 替代 panic!
		throw "P pressed, panicking";
	}
}

/**
 * 日志系统 - 演示各种日志级别
 * @param world - Matter World
 */
function logSystem(world: World): void {
	// 以下是如何在各个"日志级别"（从"最不重要"到"最重要"的顺序）写入新日志
	trace("very noisy");
	debug("helpful for debugging");
	info("helpful information that is worth printing by default");
	warn("something bad happened that isn't a failure, but thats worth calling out");
	logError("something failed");

	// 默认情况下，trace 和 debug 日志会被忽略，因为它们是"噪音"
	// 你可以通过设置 LogPlugin 来控制记录的级别
	// 或者，你可以通过 RUST_LOG=LEVEL 环境变量设置日志级别
	// 例如：RUST_LOG=trace, RUST_LOG=info,bevy_ecs=warn
	// 这里使用的格式非常灵活。查看此文档以获取更多信息：
	// https://docs.rs/tracing-subscriber/*/tracing_subscriber/filter/struct.EnvFilter.html
}

/**
 * 一次性日志系统 - 演示 once 变体
 * @param world - Matter World
 */
function logOnceSystem(world: World): void {
	// 每个日志级别的 'once' 变体在系统每帧调用时很有用，
	// 但我们仍希望只通知用户一次。换句话说，使用这些来防止垃圾邮件 :)

	traceOnce("one time noisy message");
	debugOnce("one time debug message");
	infoOnce("some info which is printed only once");
	warnOnce("some warning we wish to call out only once");
	errorOnce("some error we wish to report only once");

	for (let index = 0; index < 10; index++) {
		// 使用闭包来捕获 index 值
		(() => {
			const currentIndex = index;
			infoOnce(`logs once per call site, so this works just fine: ${currentIndex}`);
		})();
	}

	// 你也可以直接使用 `once` 宏，
	// 在连续系统的上下文中只想做一次昂贵的事情的情况下
	once(() => {
		info("doing expensive things");
		let accumulator = 0;
		for (let index = 0; index < 100000000; index++) {
			accumulator += index;
		}
		info(`result of some expensive one time calculation: ${accumulator}`);
	});
}

/**
 * 主函数 - 创建并运行应用
 */
function main(): void {
	// 打印示例说明
	print("=====================================");
	print("Bevy 日志系统示例");
	print("=====================================");
	print("此示例将演示：");
	print("1. 普通日志 - 每帧都会输出（演示高频日志）");
	print("2. 一次性日志 - 只输出一次（演示如何避免垃圾日志）");
	print("3. 按键 P - 触发 panic 演示");
	print("");
	print("注意：INFO/WARN/ERROR 日志会持续输出，这是正常行为！");
	print("5秒后开始运行...");
	print("=====================================");

	// 等待5秒让用户有准备
	wait(5);

	// 创建应用并添加默认插件
	// 注意：如果需要自定义 LogPlugin 配置，可以先禁用默认的再添加自定义的
	const app = App.create()
		.addPlugins(DefaultPlugins.create())
		// 如需自定义日志设置，取消注释以下代码：
		// .addPlugins(
		//     new DefaultPluginsBuilder()
		//         .disable(LogPlugin)
		//         .add(new LogPlugin({
		//             level: Level.TRACE,
		//             filter: "wgpu=warn,bevy_ecs=info",
		//         }))
		//         .getPlugins()
		// )
		.addSystems(BuiltinSchedules.STARTUP, setup)
		.addSystems(BuiltinSchedules.UPDATE, logSystem)
		.addSystems(BuiltinSchedules.UPDATE, logOnceSystem)
		.addSystems(BuiltinSchedules.UPDATE, panicOnP)
		.run();
}

// 执行示例
main();