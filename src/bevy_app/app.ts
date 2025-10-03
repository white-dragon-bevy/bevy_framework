import { Modding } from "@flamework/core";
/**
 * Bevy App核心实现
 * 对应 Rust bevy_app 的 App struct
 */

import { AppExit, AppExitCode, AppLabel, ErrorHandler } from "./types";
import { BuiltinSchedules } from "./main-schedule";
import { DuplicatePluginError, isPluginGroup, Plugin, PluginGroup, PluginState } from "./plugin";
import { SubApp, SubApps } from "./sub-app";
import { World, WorldContainer } from "../bevy_ecs";
import { Schedule } from "../bevy_ecs/schedule/schedule";
import type { ScheduleLabel, SystemFunction } from "../bevy_ecs/schedule/types";
import type { IntoSystemConfigs } from "../bevy_ecs/schedule";
import type { Diagnostic, DiagnosticsStore } from "../bevy_diagnostic/diagnostic";
import { AppContext } from "./context";
import { RunService } from "@rbxts/services";
import { isMatchRobloxContext, RobloxContext } from "../utils/roblox-utils";
import { Message, MessageReader, MessageWriter } from "../bevy_ecs/message";
import { TypeDescriptor } from "../bevy_core/reflect";

/**
 * 扩展工厂函数类型
 * 接受 (world, context, plugin) 参数，返回实际的扩展函数
 * 第三个参数是插件实例，避免 roblox-ts 的 this 指针问题
 * @template T - 扩展函数类型，必须是一个函数
 * @param world - Matter World 实例
 * @param context - App 上下文实例
 * @param plugin - 插件实例
 * @returns 实际的扩展函数
 */
export type ExtensionFactory<T extends (...args: any[]) => any> = (world: World, context: AppContext, plugin: any) => T;

/**
 * 插件扩展工厂接口
 * 所有扩展成员都是工厂函数
 */
export interface PluginExtensionFactories {
	// 插件可以在这里添加扩展工厂方法
	// 例如: getLogManager: ExtensionFactory<() => LogSubscriber | undefined>;
}

/**
 * 从工厂类型提取实际扩展类型
 * @template F - 扩展工厂类型
 */
export type ExtractExtensionTypes<F> = {
	[K in keyof F]: F[K] extends ExtensionFactory<infer T>
		? T
		: F[K] extends (world: any, context: any, plugin: any) => infer R
		? R
		: never;
};

/**
 * 从插件类型中提取扩展工厂类型
 * @template P - 插件类型
 */
export type ExtractPluginExtensions<P> = P extends { extension: infer E } ? E : {};

/**
 * 从插件数组中提取所有扩展类型
 * @template P - 插件或插件组数组类型
 */
export type ExtractAllPluginExtensions<P extends readonly (Plugin | PluginGroup)[]> =
	P extends readonly [infer First, ...infer Rest]
		? ExtractExtensionTypes<ExtractPluginExtensions<First>> &
		  ExtractAllPluginExtensions<Rest extends readonly (Plugin | PluginGroup)[] ? Rest : []>
		: {};

/**
 * 带扩展的Context类型
 * @template E - 插件扩展类型
 */
export type ContextWithExtensions<E = {}> = AppContext & ExtractExtensionTypes<ExtractPluginExtensions<E>>;

/**
 * 获取带扩展的Context的辅助函数
 * 现在可以直接传入插件类型，例如: getContextWithExtensions<LogPlugin>(app)
 * @template E - 插件扩展类型
 * @param app - App实例
 * @returns 带有插件扩展类型的上下文
 */
export function getContextWithExtensions<E = {}>(app: App): ContextWithExtensions<E> {
	return app.context as ContextWithExtensions<E>;
}

/**
 * Bevy App主类
 * 对应 Rust 的 App struct
 * @template T - App上下文类型，继承自AppContext
 */
export class App<T extends AppContext = AppContext> {
	private subApps: SubApps;
	private runner: (app: App) => AppExit;
	private defaultErrorHandler?: ErrorHandler;
	readonly context: T;
	private appExitEventReader?: MessageReader<AppExit>;

	/**
	 * 创建App实例
	 * @param context - 应用上下文，如果未提供则使用默认上下文
	 */
	constructor(context?:T) {
		this.subApps = new SubApps(context);
		this.runner = (app: App) => this.runOnce(app);

		// 设置主SubApp的App引用
		this.subApps.main().setAppReference(this);

		this.context = this.subApps.main().getContext() as T;

		// 初始化主应用
		this.initializeMainApp();
	}

	/**
	 * 创建新的App实例（带默认调度）
	 * 对应 Rust App::new
	 * @returns 新的App实例
	 */
	static create(): App {
		return new App();
	}

	/**
	 * 创建空的App实例（不含默认调度）
	 * 对应 Rust App::empty
	 * @returns 空的App实例
	 */
	static empty(): App {
		const app = new App();
		// 空App不初始化默认调度
		return app;
	}

	/**
	 * 初始化主应用的默认配置
	 * 对应 Rust App::new 中的初始化逻辑
	 */
	private initializeMainApp(): void {
		const mainApp = this.subApps.main();
		mainApp.setUpdateSchedule(BuiltinSchedules.MAIN);

		// 创建 AppExit 消息读取器
		this.appExitEventReader = this.world().world.messages.createReader<AppExit>();

		// 添加基础调度
		this.initializeDefaultSchedules();

		// 添加AppExit消息处理
		this.addMessage<AppExit>();
	}

	/**
	 * 初始化默认调度
	 * 创建所有内置调度阶段
	 */
	private initializeDefaultSchedules(): void {
		const schedules = [
			BuiltinSchedules.FIRST,
			BuiltinSchedules.PRE_STARTUP,
			BuiltinSchedules.STARTUP,
			BuiltinSchedules.POST_STARTUP,
			BuiltinSchedules.PRE_UPDATE,
			BuiltinSchedules.UPDATE,
			BuiltinSchedules.POST_UPDATE,
			BuiltinSchedules.LAST,
			BuiltinSchedules.MAIN,
			// 固定更新相关调度 (这些调度当前未实现)
			// BuiltinSchedules.RunFixedMainLoop,
			// BuiltinSchedules.FixedMain,
			// BuiltinSchedules.FixedFirst,
			// BuiltinSchedules.FixedPreUpdate,
			// BuiltinSchedules.FixedUpdate,
			// BuiltinSchedules.FixedPostUpdate,
			// BuiltinSchedules.FixedLast,
		];

		for (const schedule of schedules) {
			this.initSchedule(schedule);
		}
	}

	/**
	 * 更新App - 运行一次所有调度
	 * 对应 Rust App::update
	 * @throws 如果在构建插件时调用
	 */
	update(): void {
		if (this.isBuildingPlugins()) {
			error("App.update() was called while a plugin was building.");
		}

		this.subApps.update();
	}

	/**
	 * 运行App
	 * 对应 Rust App::run
	 * @returns App退出状态
	 * @throws 如果在构建插件时调用
	 */
	run(): AppExit {
		if (this.isBuildingPlugins()) {
			error("App.run() was called while a plugin was building.");
		}

		// 注意：启动调度现在由 Main 调度在第一次 update() 时自动处理
		// 这与 Rust Bevy 的 Main::run_main 行为一致

		const runner = this.runner;
		const app = this;
		return runner(app);
	}

	/**
	 * 设置自定义运行器
	 * 对应 Rust App::set_runner
	 * @param runner - 自定义运行器函数
	 * @returns 当前App实例，支持链式调用
	 */
	setRunner(runner: (app: App) => AppExit): this {
		this.runner = runner;
		return this;
	}

	/**
	 * 默认运行器实现
	 * 对应 Rust 的 run_once 函数
	 * @param _app - App实例（未使用，保持与类型签名一致）
	 * @returns App退出状态
	 */
	private runOnce(_app: App): AppExit {
		// 等待所有插件准备完成
		// 对应 Rust: while app.plugins_state() == PluginsState::Adding
		while (this.getPluginState() === PluginState.Adding) {
			// 在 Roblox 中使用 task.wait() 处理异步
			// 对应 Rust: bevy_tasks::tick_global_task_pools_on_main_thread()
			task.wait();
		}

		// 完成插件设置
		// 对应 Rust: app.finish()
		this.finish();

		// 清理插件
		// 对应 Rust: app.cleanup()
		this.cleanup();

		// 执行一次更新（这会运行 Main 调度，包含启动和常规调度）
		// 对应 Rust: app.update()
		this.update();

		// 返回退出状态
		// 对应 Rust: app.should_exit().unwrap_or(AppExit::Success)
		return this.shouldExit() ?? AppExit.success();
	}

	/**
	 * 获取插件状态
	 * 对应 Rust App::plugins_state
	 * @returns 当前插件状态
	 */
	getPluginState(): PluginState {
		return this.subApps.getOverallPluginState();
	}

	/**
	 * 完成所有插件的设置
	 * 对应 Rust App::finish
	 * 调用所有插件的 finish 方法
	 */
	finish(): void {
		this.subApps.finish();
	}

	/**
	 * 清理所有插件
	 * 对应 Rust App::cleanup
	 * 调用所有插件的 cleanup 方法
	 */
	cleanup(): void {
		this.subApps.cleanup();
	}

	/**
	 * 检查是否正在构建插件
	 * @returns 是否正在构建插件
	 */
	private isBuildingPlugins(): boolean {
		return this.subApps.isBuildingPlugins();
	}

	/**
	 * 添加单个插件
	 * 对应 Rust App::add_plugins
	 * @param plugin - 要添加的插件实例
	 * @returns 带有插件扩展类型的App实例
	 * @throws 如果在cleanup或finish之后调用
	 */
	addPlugin<P extends Plugin>(plugin: P): App<T & ExtractExtensionTypes<ExtractPluginExtensions<P>>> {
		if (this.getPluginState() === PluginState.Cleaned || this.getPluginState() === PluginState.Finished) {
			error("Plugins cannot be added after App.cleanup() or App.finish() has been called.");
		}

		this.addBoxedPlugin(plugin);
		return this as unknown as App<T & ExtractExtensionTypes<ExtractPluginExtensions<P>>>;
	}

	/**
	 * 添加多个插件或插件组
	 * @template P - 插件或插件组数组类型
	 * @param plugins - 要添加的插件或插件组
	 * @returns 带有所有插件扩展类型的App实例
	 */
	addPlugins<P extends readonly (Plugin | PluginGroup)[]>(...plugins: P): App<T & ExtractAllPluginExtensions<P>> {
		for (const plugin of plugins) {
			if (isPluginGroup(plugin)) {
				// 是PluginGroup
				const group = plugin as PluginGroup;
				group.build().finish(this);
			} else {
				// 是Plugin
				this.addPlugin(plugin as Plugin);
			}
		}
		return this as unknown as App<T & ExtractAllPluginExtensions<P>>;
	}

	/**
	 * 内部插件添加逻辑
	 * 处理插件注册和扩展工厂转换
	 * @param plugin - 要添加的插件实例
	 */
	private addBoxedPlugin(plugin: Plugin): void {
		const mainApp = this.subApps.main();

		if (plugin.isUnique() && mainApp.hasPlugin(plugin.name())) {
			throw new DuplicatePluginError(plugin.name());
		}

		// add by roblox context
		if (isMatchRobloxContext(plugin.robloxContext)) {
			// 添加到插件注册表
			mainApp.addPlugin(plugin);

			// 如果插件有扩展对象，直接复制到 context 上（函数式插件）
			if ('extension' in plugin && plugin.extension) {
				const extension = plugin.extension as Record<string, unknown>;
				const contextInstance = this.context as unknown as Record<string, unknown>;

				// 直接将扩展对象的方法复制到 context 上
				for (const [key, value] of pairs(extension)) {
					contextInstance[key] = value;
				}
			}
		}
	}

	/**
	 * 检查插件是否已添加
	 * 对应 Rust App::is_plugin_added
	 * @template T - 插件类型
	 * @param pluginType - 插件构造函数
	 * @returns 是否已添加该类型的插件
	 */
	isPluginAdded<T extends Plugin>(pluginType: new (...args: unknown[]) => T): boolean {
		return this.subApps.main().isPluginAdded(pluginType);
	}

	/**
	 * 获取已添加的插件
	 * 对应 Rust App::get_added_plugins
	 * @template T - 插件类型
	 * @param pluginType - 插件构造函数
	 * @returns 已添加的该类型插件数组
	 */
	getAddedPlugins<T extends Plugin>(pluginType: new (...args: unknown[]) => T): T[] {
		return this.subApps.main().getAddedPlugins(pluginType);
	}

	/**
	 * 添加系统到指定调度
	 * 对应 Rust App::add_systems
	 *
	 * @param schedule - 调度标签
	 * @param systems - 系统或系统配置
	 *
	 * @example
	 * // 简单用法
	 * app.addSystems(Update, system_a);
	 * app.addSystems(Update, system_a, system_b, system_c);
	 *
	 * @example
	 * // 链式配置
	 * app.addSystems(Update, system_b.after(system_a).runIf(condition));
	 *
	 * @example
	 * // 元组链式执行
	 * app.addSystems(Update, [system_c, system_d].chain());
	 */
	addSystems(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): this {
		this.subApps.main().addSystems(schedule, ...systems);
		return this;
	}

	/**
	 * 仅在服务端添加系统
	 * @param schedule - 调度标签
	 * @param systems - 要添加的系统
	 * @returns 当前App实例，支持链式调用
	 */
	addServerSystems(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): this {
		if (isMatchRobloxContext(RobloxContext.Server)) {
			this.subApps.main().addSystems(schedule, ...systems);
		}
		return this;
	}

	/**
	 * 仅在客户端添加系统
	 * @param schedule - 调度标签
	 * @param systems - 要添加的系统
	 * @returns 当前App实例，支持链式调用
	 */
	addClientSystems(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): this {
		if (isMatchRobloxContext(RobloxContext.Client)) {
			this.subApps.main().addSystems(schedule, ...systems);
		}
		return this;
	}

	/**
	 * 添加消息类型
	 * 对应 Rust App::add_message
	 * @template T - 消息类型
	 * @returns 当前App实例，支持链式调用
	 */
	addMessage<T extends Message>(): this {
		this.subApps.main().addMessage<T>();
		return this;
	}


	/**
	 * 插入资源到应用程序
	 *
	 * **注意**: @claudecode, @cursor - 这是一个宏方法，Modding.* 类型参数由编译器自动提供
	 * @metadata macro
	 * @template T - 资源对象类型
	 * @param resource - 要插入的资源对象
	 * @param id - 资源类型标识符（由宏自动提供）
	 * @param text - 资源类型文本描述（由宏自动提供）
	 * @returns 当前App实例，支持链式调用
	 */
	public insertResource<T extends object>(resource:T, id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">): this {
		this.subApps.main().insertResource(resource, id, text);
		return this
	}

	/**
	 * 通过类型描述符插入资源
	 * @template T - 资源对象类型
	 * @param resource - 要插入的资源对象
	 * @param typeDescriptor - 类型描述符
	 * @returns 当前App实例，支持链式调用
	 */
	public insertResourceByTypeDescriptor<T extends object>(resource:T, typeDescriptor:TypeDescriptor): this {
		this.subApps.main().getResourceManager().insertResourceByTypeDescriptor(resource, typeDescriptor);
		return this;
	}


	/**
	 * 获取资源
	 *
	 * **注意**: @claudecode, @cursor - 这是一个宏方法，Modding.* 类型参数由编译器自动提供
	 * @metadata macro
	 * @template T - 资源对象类型
	 * @param id - 资源类型标识符（由宏自动提供）
	 * @param text - 资源类型文本描述（由宏自动提供）
	 * @returns 资源实例或undefined
	 */
	public getResource<T extends defined>( id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">): T | undefined {
		return this.subApps.main().getResource<T>(id, text);
	}



	/**
	 * 通过类型描述符获取资源
	 * @template T - 资源对象类型
	 * @param typeDescriptor - 类型描述符
	 * @returns 资源实例或undefined
	 */
	public getResourceByTypeDescriptor<T extends defined>( typeDescriptor:TypeDescriptor): T | undefined {
		return this.subApps.main().getResourceManager().getResourceByTypeDescriptor<T>(typeDescriptor);
	}


	/**
	 * 获取World容器
	 * 对应 Rust App::world
	 * @returns World容器实例
	 */
	world(): WorldContainer {
		return this.subApps.main().world();
	}

	/**
	 * 获取Matter World实例
	 * @returns Matter World实例
	 */
	getWorld(): World {
		return this.subApps.main().world().world;
	}

	/**
	 * 获取主SubApp
	 * 对应 Rust App::main
	 * @returns 主SubApp实例
	 */
	main(): SubApp {
		return this.subApps.main();
	}

	withServer(handler:(app:App) => App): App {
		error(1)
	}

	/**
	 * 获取SubApps集合
	 * 对应 Rust App::sub_apps
	 */
	getSubApps(): SubApps {
		return this.subApps;
	}

	/**
	 * 获取指定标签的SubApp
	 * 对应 Rust App::sub_app
	 * @param label - SubApp标签
	 * @returns SubApp实例
	 * @throws 如果SubApp不存在
	 */
	subApp(label: AppLabel): SubApp {
		const subApp = this.getSubApp(label);
		if (!subApp) {
			error(`No sub-app with label '${label.name}' exists.`);
		}
		return subApp;
	}

	/**
	 * 获取指定标签的SubApp（可选）
	 * 对应 Rust App::get_sub_app
	 * @param label - SubApp标签
	 * @returns SubApp实例或undefined
	 */
	getSubApp(label: AppLabel): SubApp | undefined {
		return this.subApps.getSubApp(label);
	}

	/**
	 * 插入SubApp
	 * 对应 Rust App::insert_sub_app
	 * @param label - SubApp标签
	 * @param subApp - SubApp实例
	 */
	insertSubApp(label: AppLabel, subApp: SubApp): void {
		subApp.setAppReference(this);
		if (this.defaultErrorHandler) {
			subApp.setErrorHandler(this.defaultErrorHandler);
		}
		this.subApps.insertSubApp(label, subApp);
	}

	/**
	 * 移除SubApp
	 * 对应 Rust App::remove_sub_app
	 * @param label - SubApp标签
	 * @returns 被移除的SubApp实例或undefined
	 */
	removeSubApp(label: AppLabel): SubApp | undefined {
		return this.subApps.removeSubApp(label);
	}

	/**
	 * 添加调度
	 * 对应 Rust App::add_schedule
	 * @param schedule - 调度实例
	 * @returns 当前App实例，支持链式调用
	 */
	addSchedule(schedule: Schedule): this {
		this.subApps.main().addSchedule(schedule);
		return this;
	}

	/**
	 * 初始化调度
	 * 对应 Rust App::init_schedule
	 * @param label - 调度标签
	 * @returns 当前App实例，支持链式调用
	 */
	initSchedule(label: ScheduleLabel): this {
		this.subApps.main().initSchedule(label);
		return this;
	}

	/**
	 * 获取调度
	 * 对应 Rust App::get_schedule
	 * @param label - 调度标签
	 * @returns 调度实例或undefined
	 */
	getSchedule(label: ScheduleLabel): Schedule | undefined {
		return this.subApps.main().getSchedule(label);
	}

	/**
	 * 编辑调度
	 * 对应 Rust App::edit_schedule
	 * @param label - 调度标签
	 * @param editor - 编辑器函数，接收Schedule实例进行修改
	 * @returns 当前App实例，支持链式调用
	 */
	editSchedule(label: ScheduleLabel, editor: (schedule: Schedule) => void): this {
		this.subApps.main().editSchedule(label, editor);
		return this;
	}

	/**
	 * 手动运行指定的调度
	 * @param label - 调度标签
	 */
	runSchedule(label: ScheduleLabel): void {
		// 委托给主 SubApp
		this.subApps.main().runSchedule(label);
	}

	/**
	 * 检查应用是否应该退出
	 * 对应 Rust App::should_exit
	 * @returns 退出状态，如果没有退出事件则返回undefined
	 */
	shouldExit(): AppExit | undefined {
		if (!this.appExitEventReader) {
			return undefined;
		}

		// 读取所有 AppExit 事件
		const events = this.appExitEventReader.read();

		if (events.size() === 0) {
			return undefined;
		}

		// 优先返回错误退出码（如果有）
		for (const event of events) {
			// 直接检查 code 而不是调用方法，避免方法丢失问题
			if (event.code !== AppExitCode.Success) {
				return event;
			}
		}

		// 否则返回第一个退出事件
		return events[0];
	}

	/**
	 * 发送成功退出事件
	 * 对应 Rust App::exit
	 * 向消息系统写入成功退出事件
	 */
	exit(): void {
		const writer = this.world().world.messages.createWriter<AppExit>();
		writer.write(AppExit.success());
	}

	/**
	 * 发送带错误码的退出事件
	 * 对应 Rust App::exit_with_code
	 * @param code - 退出错误码
	 */
	exitWithCode(code: number): void {
		const writer = this.world().world.messages.createWriter<AppExit>();
		writer.write(AppExit.error(code));
	}

	/**
	 * 设置错误处理器
	 * 对应 Rust App::set_error_handler
	 * @param handler - 错误处理函数
	 * @returns 当前App实例，支持链式调用
	 * @throws 如果错误处理器已经被设置
	 */
	setErrorHandler(handler: ErrorHandler): this {
		if (this.defaultErrorHandler !== undefined) {
			error("setErrorHandler called multiple times on same App");
		}

		this.defaultErrorHandler = handler;
		this.subApps.setErrorHandler(handler);
		return this;
	}

	/**
	 * 获取错误处理器
	 * 对应 Rust App::get_error_handler
	 * @returns 错误处理函数或undefined
	 */
	getErrorHandler(): ErrorHandler | undefined {
		return this.defaultErrorHandler;
	}

	/**
	 * 设置静默错误模式
	 * 当设置为 true 时，系统错误不会输出警告信息，适用于测试环境
	 * @param silent - 是否静默错误
	 * @returns 当前App实例，支持链式调用
	 */
	setSilentErrors(silent: boolean): this {
		this.subApps.setSilentErrors(silent);
		return this;
	}

	/**
	 * 获取应用上下文
	 * @returns AppContext 实例
	 */
	getContext(): AppContext {
		return this.context;
	}
}
