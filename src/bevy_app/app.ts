/**
 * Bevy App核心实现
 * 对应 Rust bevy_app 的 App struct
 */

import { World } from "@rbxts/matter";
import {
	AppExit,
	AppLabel,
	BuiltinSchedules,
	Component,
	ErrorHandler,
	Message,
	Resource,
	ScheduleLabel,
	SystemFunction,
} from "./types";
import { DuplicatePluginError, Plugin, PluginGroup, PluginState } from "./plugin";
import { SubApp, SubApps } from "./sub-app";
import { RobloxInputPlugin } from "./roblox-adapters";
import { Schedule, Scheduler } from "./scheduler";

/**
 * Bevy App主类
 * 对应 Rust 的 App struct
 */
export class App {
	private subApps: SubApps;
	private runner: (app: App) => AppExit;
	private defaultErrorHandler?: ErrorHandler;

	constructor() {
		this.subApps = new SubApps();
		this.runner = (app: App) => this.runOnce(app);

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
		mainApp.setUpdateSchedule(BuiltinSchedules.Main);

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
			BuiltinSchedules.First,
			BuiltinSchedules.PreStartup,
			BuiltinSchedules.Startup,
			BuiltinSchedules.PostStartup,
			BuiltinSchedules.PreUpdate,
			BuiltinSchedules.Update,
			BuiltinSchedules.PostUpdate,
			BuiltinSchedules.Last,
			BuiltinSchedules.Main,
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
	 */
	private runOnce(_app: App): AppExit {
		// 等待所有插件准备完成
		while (this.getPluginState() === PluginState.Adding) {
			// 可以在这里添加异步任务处理逻辑
			task.wait();
		}

		this.finish();
		this.cleanup();
		this.update();

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
	addPlugin(plugin: Plugin): this {
		if (
			this.getPluginState() === PluginState.Cleaned ||
			this.getPluginState() === PluginState.Finished
		) {
			error("Plugins cannot be added after App.cleanup() or App.finish() has been called.");
		}

		this.addBoxedPlugin(plugin);
		return this;
	}

	/**
	 * 添加多个插件
	 */
	addPlugins(...plugins: (Plugin | PluginGroup)[]): this {
		for (const plugin of plugins) {
			if ("build" in plugin && typeIs(plugin.build, "function")) {
				// 是Plugin
				this.addPlugin(plugin as Plugin);
			} else if ("build" in plugin && typeIs((plugin as PluginGroup).build, "function")) {
				// 是PluginGroup
				const group = plugin as PluginGroup;
				group.build().finish(this);
			}
		}
		return this;
	}

	/**
	 * 内部插件添加逻辑
	 */
	private addBoxedPlugin(plugin: Plugin): void {
		const mainApp = this.subApps.main();

		if (plugin.isUnique() && mainApp.hasPlugin(plugin.name())) {
			throw new DuplicatePluginError(plugin.name());
		}

		// 添加到插件注册表
		mainApp.addPlugin(plugin);
	}

	/**
	 * 检查插件是否已添加
	 * 对应 Rust App::is_plugin_added
	 */
	isPluginAdded<T extends Plugin>(pluginType: new (...args: any[]) => T): boolean {
		return this.subApps.main().isPluginAdded(pluginType);
	}

	/**
	 * 获取已添加的插件
	 * 对应 Rust App::get_added_plugins
	 */
	getAddedPlugins<T extends Plugin>(pluginType: new (...args: any[]) => T): T[] {
		return this.subApps.main().getAddedPlugins(pluginType);
	}

	/**
	 * 添加系统到指定调度
	 * 对应 Rust App::add_systems
	 */
	addSystems(schedule: ScheduleLabel, ...systems: SystemFunction[]): this {
		this.subApps.main().addSystems(schedule, ...systems);
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
	 * 对应 Rust App::insert_resource
	 */
	insertResource<T extends Resource>(resource: T): this {
		this.subApps.main().insertResource(resource);
		return this;
	}

	/**
	 * 初始化资源
	 * 对应 Rust App::init_resource
	 */
	initResource<T extends Resource>(resourceFactory: () => T): this {
		this.subApps.main().initResource(resourceFactory);
		return this;
	}

	/**
	 * 获取World引用
	 * 对应 Rust App::world
	 */
	world(): World {
		return this.subApps.main().world();
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
	 * 检查是否应该退出
	 * 对应 Rust App::should_exit
	 */
	shouldExit(): AppExit | undefined {
		// 这里需要实现消息系统来检查AppExit消息
		// 暂时返回undefined表示不退出
		return undefined;
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
}