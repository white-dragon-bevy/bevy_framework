/**
 * 函数式 LogPlugin 使用示例
 * 演示如何使用 createLogPlugin 函数式 API
 * 对比 class 方式与函数式方式的使用
 */

import { App } from "../../../bevy_app/app";
import { createLogPlugin, Level } from "../../../bevy_log";
import { info, debug, warn } from "../../../bevy_log";

/**
 * 示例 1: 使用默认配置的函数式插件
 */
function example1DefaultConfig(): void {
	print("=== 示例 1: 默认配置 ===");

	// 函数式方式
	const app = App.create().addPlugin(createLogPlugin());

	// 测试日志输出
	info("函数式 LogPlugin 已初始化（默认配置）");

	app.cleanup();
}

/**
 * 示例 2: 使用自定义配置的函数式插件
 */
function example2CustomConfig(): void {
	print("=== 示例 2: 自定义配置 ===");

	// 函数式方式 - 自定义日志级别和过滤器
	const app = App.create().addPlugin(
		createLogPlugin({
			level: Level.DEBUG,
			filter: "wgpu=error,bevy_render=info,bevy_ecs=trace",
		}),
	);

	// 测试不同级别的日志
	debug("这是一条 DEBUG 级别的日志");
	info("这是一条 INFO 级别的日志");
	warn("这是一条 WARN 级别的日志");

	app.cleanup();
}

/**
 * 示例 3: 使用扩展方法
 */
function example3Extensions(): void {
	print("=== 示例 3: 使用扩展方法 ===");

	const app = App.create().addPlugin(createLogPlugin({ level: Level.WARN }));

	// 通过 context 访问扩展方法
	const contextWithExt = app.context as typeof app.context & {
		getLogLevel?: () => Level;
		getLogManager?: () => unknown;
	};

	const logLevel = contextWithExt.getLogLevel?.();
	const logManager = contextWithExt.getLogManager?.();

	if (logLevel !== undefined) {
		print(`当前日志级别: ${Level[logLevel]}`);
	}

	if (logManager !== undefined) {
		print("日志管理器已获取");
	}

	app.cleanup();
}

/**
 * 示例 4: 多个插件组合使用
 */
function example4Multiple(): void {
	print("=== 示例 4: 多个插件组合 ===");

	const app = App.create()
		.addPlugin(
			createLogPlugin({
				level: Level.INFO,
				filter: "test=debug",
			}),
		)
		.addPlugin(
			createLogPlugin({
				level: Level.DEBUG,
				filter: "another=trace",
			}),
		);

	info("使用多个 LogPlugin");
	app.cleanup();
}

/**
 * 主函数 - 运行所有示例
 */
function main(): void {
	print("=====================================");
	print("函数式 LogPlugin 示例");
	print("=====================================");

	example1DefaultConfig();
	print("");

	example2CustomConfig();
	print("");

	example3Extensions();
	print("");

	example4Multiple();

	print("=====================================");
	print("示例运行完成！");
	print("=====================================");
}

// 执行示例
main();
