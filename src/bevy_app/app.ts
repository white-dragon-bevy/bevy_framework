import { Modding } from "@flamework/core";
/**
 * Bevy App核心实现
 * 对应 Rust bevy_app 的 App struct
 */

import { AppExit, AppExitCode, AppLabel, ErrorHandler, Message, ScheduleLabel } from "./types";
import { BuiltinSchedules } from "./main-schedule";
import { DuplicatePluginError, isPluginGroup, Plugin, PluginGroup, PluginState } from "./plugin";
import { SubApp, SubApps } from "./sub-app";
import { World, WorldContainer } from "../bevy_ecs";
import { Schedule } from "../bevy_ecs/schedule/schedule";
import type { SystemFunction } from "../bevy_ecs/schedule/types";
import type { IntoSystemConfigs } from "../bevy_ecs/schedule";
import type { Diagnostic, DiagnosticsStore } from "../bevy_diagnostic/diagnostic";
import { AppContext } from "./context";
import { RunService } from "@rbxts/services";
import { isMatchRobloxContext, RobloxContext } from "../utils/roblox-utils";
import { MessageReader, MessageWriter } from "../bevy_ecs/message";
import { TypeDescriptor } from "../bevy_core/reflect";

/**
 * 扩展工厂函数类型
 * 接受 (world, context, plugin) 参数，返回实际的扩展函数
 * 第三个参数是插件实例，避免 roblox-ts 的 this 指针问题
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
 */
export type ExtractExtensionTypes<F> = {
	[K in keyof F]: F[K] extends ExtensionFactory<infer T> ? T : never;
};

/**
 * 从插件类型中提取扩展工厂类型
 */
export type ExtractPluginExtensions<P> = P extends { extension: infer E } ? E : {};

/**
 * 从插件数组中提取所有扩展类型
 */
export type ExtractAllPluginExtensions<P extends readonly (Plugin | PluginGroup)[]> = 
	P extends readonly [infer First, ...infer Rest]
		? ExtractExtensionTypes<ExtractPluginExtensions<First>> & 
		  ExtractAllPluginExtensions<Rest extends readonly (Plugin | PluginGroup)[] ? Rest : []>
		: {};

/**
 * 带扩展的Context类型
 */
export type ContextWithExtensions<E = {}> = AppContext & ExtractExtensionTypes<ExtractPluginExtensions<E>>;

/**
 * 获取带扩展的Context的辅助函数
 * 现在可以直接传入插件类型，例如: getContextWithExtensions<LogPlugin>(app)
 */
export function getContextWithExtensions<E = {}>(app: App): ContextWithExtensions<E> {
	return app.context as ContextWithExtensions<E>;
}

/**
 * Bevy App主类
 * 对应 Rust 的 App struct
 */
export class App<T extends AppContext = AppContext> {
	private subApps: SubApps;
	private runner: (app: App) => AppExit;
	private defaultErrorHandler?: ErrorHandler;
	readonly context: T;
	private appExitEventReader?: MessageReader<AppExit>;

	/**
	 * @param context - 应用上下文, 如果未提供, 则使用默认上下文
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
	 * 创建新的App实例
	 * 对应 Rust App::new
	 */
	static create(): App {
		return new App();
	}

	/**
	 * 创建空的App实例
	 * 对应 Rust App::empty
	 */
	static empty(): App {
		const app = new App();
		// 空App不初始化默认调度
		return app;
	}

	/**
	 * 初始化主应用的默认配置
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
	 */
	setRunner(runner: (app: App) => AppExit): this {
		this.runner = runner;
		return this;
	}

	/**
	 * 默认运行器实现
	 * 对应 Rust 的 run_once 函数
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
	 */
	getPluginState(): PluginState {
		return this.subApps.getOverallPluginState();
	}

	/**
	 * 完成所有插件的设置
	 * 对应 Rust App::finish
	 */
	finish(): void {
		this.subApps.finish();
	}

	/**
	 * 清理所有插件
	 * 对应 Rust App::cleanup
	 */
	cleanup(): void {
		this.subApps.cleanup();
	}

	/**
	 * 检查是否正在构建插件
	 */
	private isBuildingPlugins(): boolean {
		return this.subApps.isBuildingPlugins();
	}

	/**
	 * 添加插件
	 * 对应 Rust App::add_plugins
	 */
	addPlugin<P extends Plugin>(plugin: P): App<T & ExtractExtensionTypes<ExtractPluginExtensions<P>>> {
		if (this.getPluginState() === PluginState.Cleaned || this.getPluginState() === PluginState.Finished) {
			error("Plugins cannot be added after App.cleanup() or App.finish() has been called.");
		}

		this.addBoxedPlugin(plugin);
		return this as any;
	}

	/**
	 * 添加多个插件
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
		return this as any;
	}

	/**
	 * 内部插件添加逻辑
	 */
	private addBoxedPlugin(plugin: Plugin): void {
		const mainApp = this.subApps.main();

		if (plugin.isUnique() && mainApp.hasPlugin(plugin.name())) {
			print(`Duplicate plugin detected: ${plugin.name()}`);
			throw new DuplicatePluginError(plugin.name());
		}

		// add by roblox context
		if (isMatchRobloxContext(plugin.robloxContext)) {
			// 添加到插件注册表
			mainApp.addPlugin(plugin);
			
			// 如果插件有扩展工厂，将其转换为实际函数并添加到 context 上
			if ('extension' in plugin && plugin.extension) {
				const extensionFactories = plugin.extension as Record<string, ExtensionFactory<any>>;
				const contextInstance = this.context as unknown as Record<string, unknown>;
				const world = this.getWorld();
				
				// 将扩展工厂转换为实际函数并复制到 context 上
				for (const [key, factory] of pairs(extensionFactories)) {
					if (typeOf(factory) === "function") {
						// 调用工厂函数，传入 world, context 和 plugin 实例，获得实际的扩展函数
						const actualFunction = factory(world, this.context, plugin);
						contextInstance[key] = actualFunction;
					}
				}
			}
		}
	}

	/**
	 * 检查插件是否已添加
	 * 对应 Rust App::is_plugin_added
	 */
	isPluginAdded<T extends Plugin>(pluginType: new (...args: unknown[]) => T): boolean {
		return this.subApps.main().isPluginAdded(pluginType);
	}

	/**
	 * 获取已添加的插件
	 * 对应 Rust App::get_added_plugins
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
	 */
	addServerSystems(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): this {
		if (isMatchRobloxContext(RobloxContext.Server)) {
			this.subApps.main().addSystems(schedule, ...systems);
		}
		return this;
	}

	/**
	 * 仅在客户端添加系统
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
	 */
	addMessage<T extends Message>(): this {
		this.subApps.main().addMessage<T>();
		return this;
	}


	/** 
	 * 插入资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * */
	public insertResource<T extends object>(resource:T, id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">) {
		this.subApps.main().insertResource(resource, id, text);
		return this
	}

	/** 
	 * 插入资源
	 * 
	 * 
	 * */
	public insertResourceByTypeDescriptor<T extends object>(resource:T, typeDescriptor:TypeDescriptor) {
		this.subApps.main().getResourceManager().insertResourceByTypeDescriptor(resource, typeDescriptor);
		return this
	}
	

	/** 
	 * 获取资源
	 * 
	 * **注意**: @claudecode , @cursor ,  这是一个宏文件, 所有 Modding.* 的类型, 不要主动调用.
	 * @metadata macro
	 * 
	 * */
	public getResource<T extends defined>( id?: Modding.Generic<T, "id">, text?: Modding.Generic<T,"text">): T | undefined {
		return this.subApps.main().getResource<T>(id, text);
	}

	
	/** 
	 * 获取资源
	 * 
	 * 
	 * */
	public getResourceByTypeDescriptor<T extends defined>( typeDescriptor:TypeDescriptor): T | undefined {
		return this.subApps.main().getResourceManager().getResourceByTypeDescriptor<T>(typeDescriptor);
	}


	/**
	 * 获取World容器
	 * 对应 Rust App::world
	 */
	world(): WorldContainer {
		return this.subApps.main().world();
	}

	/**
	 * 获取BevyWorld实例
	 */
	getWorld(): World {
		return this.subApps.main().world().world;
	}

	/**
	 * 获取主SubApp
	 * 对应 Rust App::main
	 */
	main(): SubApp {
		return this.subApps.main();
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
	 */
	getSubApp(label: AppLabel): SubApp | undefined {
		return this.subApps.getSubApp(label);
	}

	/**
	 * 插入SubApp
	 * 对应 Rust App::insert_sub_app
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
	 */
	removeSubApp(label: AppLabel): SubApp | undefined {
		return this.subApps.removeSubApp(label);
	}

	/**
	 * 添加调度
	 * 对应 Rust App::add_schedule
	 */
	addSchedule(schedule: Schedule): this {
		this.subApps.main().addSchedule(schedule);
		return this;
	}

	/**
	 * 初始化调度
	 * 对应 Rust App::init_schedule
	 */
	initSchedule(label: ScheduleLabel): this {
		this.subApps.main().initSchedule(label);
		return this;
	}

	/**
	 * 获取调度
	 * 对应 Rust App::get_schedule
	 */
	getSchedule(label: ScheduleLabel): Schedule | undefined {
		return this.subApps.main().getSchedule(label);
	}

	/**
	 * 编辑调度
	 * 对应 Rust App::edit_schedule
	 */
	editSchedule(label: ScheduleLabel, editor: (schedule: Schedule) => void): this {
		this.subApps.main().editSchedule(label, editor);
		return this;
	}

	/**
	 * 运行指定的调度
	 * @param label - 调度标签
	 */
	runSchedule(label: ScheduleLabel): void {
		// 委托给主 SubApp
		this.subApps.main().runSchedule(label);
	}

	/**
	 * 检查是否应该退出
	 * 对应 Rust App::should_exit
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
	 * 发送退出事件
	 * 对应 Rust App::exit
	 */
	exit(): void {
		const writer = this.world().world.messages.createWriter<AppExit>();
		writer.write(AppExit.success());
	}

	/**
	 * 发送带错误码的退出事件
	 * 对应 Rust App::exit_with_code
	 */
	exitWithCode(code: number): void {
		const writer = this.world().world.messages.createWriter<AppExit>();
		writer.write(AppExit.error(code));
	}

	/**
	 * 设置错误处理器
	 * 对应 Rust App::set_error_handler
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
	 */
	getErrorHandler(): ErrorHandler | undefined {
		return this.defaultErrorHandler;
	}

	/**
	 * 获取应用上下文
	 * @returns AppContext 实例
	 */
	getContext(): AppContext {
		return this.context;
	}
}
