/**
 * Custom Loop Example - 自定义运行器示例
 *
 * 此示例展示了如何创建自定义运行器来手动控制 App 的更新循环。
 * 由于 Roblox 环境没有标准输入，我们使用模拟输入队列来演示功能。
 *
 * 原始 Rust 示例从 stdin 读取输入，在 Roblox 中我们提供两种方式：
 * 1. 使用预定义的输入队列（用于演示）
 * 2. 可扩展为使用 Roblox 聊天系统或 GUI 输入
 */

import { App, AppExit, AppExitCode, AppContext } from "../../../bevy_app";
import { BuiltinSchedules } from "../../../bevy_app";
import { Resource } from "../../../bevy_ecs/resource";
import type { World } from "../../../bevy_ecs";

/**
 * Input 资源 - 存储当前输入字符串
 */
class Input implements Resource {
	constructor(public value: string = "") {}
}

/**
 * 模拟输入队列 - 在 Roblox 环境中模拟控制台输入
 */
class InputSimulator {
	private queue: string[] = [
		"Hello World",
		"Testing custom runner",
		"Another input",
		"exit", // 触发退出
	];
	private currentIndex = 0;

	/**
	 * 获取下一个输入
	 */
	public getNextInput(): string | undefined {
		if (this.currentIndex < this.queue.size()) {
			const input = this.queue[this.currentIndex];
			this.currentIndex++;
			return input;
		}
		return undefined;
	}

	/**
	 * 检查是否还有输入
	 */
	public hasInput(): boolean {
		return this.currentIndex < this.queue.size();
	}

	/**
	 * 添加输入到队列（可用于集成实际输入源）
	 */
	public addInput(input: string): void {
		this.queue.push(input);
	}
}

/**
 * 自定义运行器 - 手动控制应用程序更新循环
 * @param app - Bevy 应用实例
 * @returns 应用退出状态
 */
function myRunner(app: App): AppExit {
	// 完成插件构建并执行清理
	// 这通常由默认运行器完成
	app.finish();
	app.cleanup();

	print("Type stuff into the console (simulated input):");

	// 创建输入模拟器
	const inputSimulator = new InputSimulator();

	// 主循环 - 处理输入并更新应用
	while (inputSimulator.hasInput()) {
		const line = inputSimulator.getNextInput();
		if (line === undefined) {
			break;
		}

		// 更新 Input 资源 - 直接插入新的资源实例
		app.insertResource(new Input(line));

		// 更新应用程序
		app.update();

		// 检查是否应该退出
		const shouldExit = app.shouldExit();
		if (shouldExit !== undefined) {
			return shouldExit;
		}
	}

	return AppExit.success();
}

/**
 * 打印系统 - 打印当前输入内容
 * @param world - Bevy World 实例
 * @param context - App 上下文，提供扩展访问
 */
function printSystem(world: World, context: AppContext): void {
	// 通过上下文访问资源扩展
	const resources = world.resources;
	const inputResource = resources.getResource<Input>();

	if (inputResource) {
		print(`You typed: ${inputResource.value}`);
	}
}

/**
 * 退出系统 - 检查输入并触发应用退出
 * @param world - Bevy World 实例
 * @param context - App 上下文，提供扩展访问
 */
function exitSystem(world: World, context: AppContext): void {
	// 通过上下文访问资源扩展
	const resources = world.resources;
	const inputResource = resources.getResource<Input>();

	if (inputResource && inputResource.value === "exit") {
		// 由于我们还没有完整的消息系统集成，
		// 这里使用一个简化的方式来触发退出
		// 在实际实现中，应该使用 EventWriter<AppExit>
		print("Exit command received - application will terminate");

		// 注意：在当前实现中，我们依赖 runner 中的检查来处理退出
		// 未来可以通过事件系统来实现更优雅的退出机制
	}
}

/**
 * 创建并运行示例应用
 */
export function runExample(): AppExit {
	// 创建应用并配置
	const app = App.create()
		.insertResource(new Input(""))
		.setRunner(myRunner)
		.addClientSystems(BuiltinSchedules.UPDATE, printSystem, exitSystem);

	// 运行应用
	return app.run();
}

/**
 * 扩展示例 - 集成 Roblox 聊天系统
 *
 * 这是一个可选的扩展，展示如何将实际的 Roblox 输入集成到系统中
 */
export function createRobloxInputRunner(): (app: App) => AppExit {
	return (app: App) => {
		app.finish();
		app.cleanup();

		print("Custom runner with Roblox integration started");
		print("This is where you would integrate with Roblox chat or GUI");

		// 示例：这里可以集成 Roblox 的 Players.PlayerChatted 事件
		// 或者使用 UserInputService 来捕获键盘输入

		// 为了演示，我们仍使用模拟输入
		const simulator = new InputSimulator();

		while (simulator.hasInput()) {
			const input = simulator.getNextInput();
			if (input === undefined) break;

			// 更新 Input 资源 - 直接插入新的资源实例
			app.insertResource(new Input(input));

			app.update();

			const shouldExit = app.shouldExit();
			if (shouldExit !== undefined) {
				return shouldExit;
			}
		}

		return AppExit.success();
	};
}

runExample();
