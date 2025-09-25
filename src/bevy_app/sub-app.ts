/**
 * Bevy SubApp系统实现
 * 对应 Rust bevy_app 的 SubApp struct 和 SubApps
 */

import { AppLabel, ErrorHandler, Message, ScheduleLabel } from "./types";
import { Plugin, PluginState } from "./plugin";
import { WorldContainer, createWorldContainer, World, Context } from "../bevy_ecs";
import { ResourceManager, ResourceConstructor, Resource } from "../bevy_ecs/resource";
import { CommandBuffer } from "../bevy_ecs/command-buffer";
import { EventManager } from "../bevy_ecs/events";
import { MainScheduleOrder, runMainSchedule } from "./main-schedule";
import { App } from "./app";
import { Schedule } from "../bevy_ecs/schedule/schedule";
import { Schedules } from "../bevy_ecs/schedule/schedules";
import type { SystemFunction, SystemConfig } from "../bevy_ecs/schedule/types";
import { intoSystemConfigs } from "../bevy_ecs/schedule/system-configs";
import type { IntoSystemConfigs } from "../bevy_ecs/schedule";
import { AppContext } from "./context";

// 前向声明 App 类型
interface AppInterface {
	addPlugin(plugin: Plugin): AppInterface;
	world(): WorldContainer;
}

/**
 * SubApp - 子应用程序
 * 对应 Rust 的 SubApp struct
 */
export class SubApp {
	private _world: WorldContainer;
	private schedules: Schedules;
	private resourceManager: ResourceManager;
	private commandBuffer: CommandBuffer;
	private eventManager: EventManager;
	private pluginRegistry: Plugin[] = [];
	private pluginNames = new Set<string>();
	private pluginBuildDepth = 0;
	private _pluginState: PluginState = PluginState.Adding;
	private updateSchedule?: ScheduleLabel;
	private extractFunction?: (mainWorld: WorldContainer, subWorld: WorldContainer) => void;
	private errorHandler?: ErrorHandler;
	private appReference?: AppInterface; // 保存App引用用于插件回调
	private scheduleOrder: MainScheduleOrder;
	private context: Context;
	private loopConnections?: { [scheduleLabel: string]: RBXScriptConnection };
	private isLoopRunning = false;
	private hasRunStartup = false; // 跟踪启动调度是否已经运行

	constructor() {
		this._world = createWorldContainer();

		// Initialize context 
		this.context = new AppContext(this._world.getWorld());

		this.resourceManager = this.context.resources;
		this.commandBuffer = this.context.commands;
		this.eventManager = this.context.events;


		this.schedules = new Schedules(this._world.getWorld(), this.context);
		this.scheduleOrder = new MainScheduleOrder();


	}

	/**
	 * 获取World容器实例
	 */
	world(): WorldContainer {
		return this._world;
	}

	/**
	 * 获取资源管理器
	 */
	getResourceManager(): ResourceManager {
		return this.resourceManager;
	}

	/**
	 * 获取命令缓冲器
	 */
	getCommandBuffer(): CommandBuffer {
		return this.commandBuffer;
	}

	/**
	 * 获取事件管理器
	 */
	getEventManager(): EventManager {
		return this.eventManager;
	}

	/**
	 * 获取应用上下文
	 */
	getContext(): Context {
		return this.context;
	}

	/**
	 * 设置更新调度
	 * 对应 Rust SubApp 的 update_schedule 字段
	 */
	setUpdateSchedule(schedule: ScheduleLabel): void {
		this.updateSchedule = schedule;
	}

	/**
	 * 获取更新调度
	 */
	getUpdateSchedule(): ScheduleLabel | undefined {
		return this.updateSchedule;
	}

	/**
	 * 设置提取函数
	 * 对应 Rust SubApp::set_extract
	 */
	setExtract(extractFn: (mainWorld: WorldContainer, subWorld: WorldContainer) => void): void {
		this.extractFunction = extractFn;
	}

	/**
	 * 执行提取操作
	 */
	extract(mainWorld: WorldContainer): void {
		if (this.extractFunction) {
			this.extractFunction(mainWorld, this._world);
		}
	}

	/**
	 * 运行启动调度
	 * 只应该在应用启动时调用一次
	 * 对应 Rust Main::run_main 中的启动逻辑
	 */
	runStartupSchedule(): void {
		if (this.hasRunStartup) {
			return; // 已经运行过，不再重复运行
		}
		this.hasRunStartup = true;

		// 运行启动调度序列
		for (const label of this.scheduleOrder.startupLabels) {
			const schedule = this.schedules.getSchedule(label);
			if (schedule) {
				const compiledSystems = schedule.compile();
				for (const systemStruct of compiledSystems) {
					try {
						systemStruct.system(this._world.getWorld(), this.context);
					} catch (err) {
						if (this.errorHandler) {
							this.errorHandler(err);
						} else {
							throw err;
						}
					}
				}
			}
		}

		// 执行命令缓冲
		this.commandBuffer.flush(this._world.getWorld());

		// 清理事件
		this.eventManager.cleanup();
	}

	/**
	 * 更新SubApp
	 * 对应 Rust SubApp::update
	 */
	update(): void {
		// 如果 Loop 正在运行，它会自动处理系统执行
		// 我们只需要处理命令缓冲和事件清理
		if (this.isLoopRunning) {
			// Loop 正在运行，系统通过 Loop 执行
			// 执行命令缓冲
			this.commandBuffer.flush(this._world.getWorld());
			// 清理事件
			this.eventManager.cleanup();
			return;
		}

		// 向后兼容：如果 Loop 没有运行，使用旧的直接执行方式
		// 使用已初始化的 context

		// 特殊处理 Main 调度
		// 在 Rust Bevy 中，Main 调度包含 run_main 系统，负责运行启动（仅第一次）和常规调度
		if (this.updateSchedule === "Main") {
			// Main 调度的特殊处理：先运行启动调度（只在第一次），然后运行常规调度
			if (!this.hasRunStartup) {
				this.runStartupSchedule();
			}

			// 运行常规调度序列
			runMainSchedule(this._world.getWorld(), this.scheduleOrder, (label) => {
				// 执行指定调度中的所有系统
				const schedule = this.schedules.getSchedule(label);
				if (schedule) {
					const compiledSystems = schedule.compile();
					for (const systemStruct of compiledSystems) {
						try {
							systemStruct.system(this._world.getWorld(), this.context);
						} catch (err) {
							// 如果有错误处理器，调用它；否则抛出错误
							if (this.errorHandler) {
								this.errorHandler(err);
							} else {
								throw err;
							}
						}
					}
				}
			});
		} else if (this.updateSchedule) {
			// 运行单个调度
			const schedule = this.schedules.getSchedule(this.updateSchedule);
			if (schedule) {
				const compiledSystems = schedule.compile();
				for (const systemStruct of compiledSystems) {
					try {
						systemStruct.system(this._world.getWorld(), this.context);
					} catch (err) {
						// 如果有错误处理器，调用它；否则抛出错误
						if (this.errorHandler) {
							this.errorHandler(err);
						} else {
							throw err;
						}
					}
				}
			}
		}

		// 执行命令缓冲
		this.commandBuffer.flush(this._world.getWorld());

		// 清理事件
		this.eventManager.cleanup();
	}

	/**
	 * 添加系统到指定调度
	 * 支持简单系统函数和配置对象
	 */
	addSystems(schedule: ScheduleLabel, ...systems: IntoSystemConfigs[]): void {
		for (const system of systems) {
			// 转换为 SystemConfigs
			const systemConfigs = intoSystemConfigs(system);
			// 转换为 SystemConfig 数组
			const configs = systemConfigs.toSystemConfigs();
			// 添加到调度
			for (const config of configs) {
				this.schedules.addSystemToSchedule(schedule, config);
			}
		}
	}

	/**
	 * 添加消息类型
	 */
	addMessage<T extends Message>(): void {
		// 在Matter中添加消息处理逻辑
		// 这里需要根据Matter的API来实现
	}

	/**
	 * 插入资源
	 */
	insertResource<T extends Resource>(resource: T): void;
	insertResource<T extends Resource>(resourceType: ResourceConstructor<T>, resource: T): void;
	insertResource<T extends Resource>(resourceOrType: T | ResourceConstructor<T>, resource?: T): void {
		if (resource !== undefined) {
			// 两个参数的重载：insertResource(Type, instance)
			this.resourceManager.insertResource(resourceOrType as ResourceConstructor<T>, resource);
		} else {
			// 单个参数的重载：insertResource(instance)
			// 使用对象的构造函数作为类型
			const instance = resourceOrType as T;
			const ResourceType = (instance as unknown as { constructor: ResourceConstructor<T> }).constructor;

			if (ResourceType) {
				// 如果有构造函数，使用它作为资源类型
				this.resourceManager.insertResource(ResourceType, instance);
			} else {
				// 如果没有构造函数（例如对象字面量），生成一个唯一的标识符
				const uniqueId = `Resource_${tostring(instance)}`;
				this.resourceManager.insertResource(uniqueId as ResourceConstructor<T>, instance);
			}
		}
	}

	/**
	 * 初始化资源
	 */
	initResource<T extends Resource>(resourceFactory: () => T): void {
		const resource = resourceFactory();
		// 获取资源的构造函数作为类型标识
		const ResourceType = (resource as unknown as { constructor: ResourceConstructor<T> }).constructor;

		if (ResourceType) {
			// 使用构造函数作为资源类型进行注册
			this.resourceManager.insertResource(ResourceType, resource);
		} else {
			// 如果没有构造函数（例如对象字面量），生成一个唯一的标识符
			const uniqueId = `Resource_${tostring(resource)}` as ResourceConstructor<T>;
			this.resourceManager.insertResource(uniqueId, resource);
		}
	}

	/**
	 * 获取资源
	 */
	getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		// 直接从资源管理器获取资源
		return this.resourceManager.getResource(resourceType);
	}

	/**
	 * 移除资源
	 */
	removeResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		return this.resourceManager.removeResource(resourceType);
	}

	/**
	 * 添加调度
	 */
	addSchedule(schedule: Schedule): void {
		// Schedule 实例会自动在 Schedules 中创建
		// 这里我们只需要确保它存在
		this.schedules.getSchedule(schedule.getLabel());
	}

	/**
	 * 初始化调度
	 */
	initSchedule(label: ScheduleLabel): void {
		// 在 Schedules 中获取或创建调度
		this.schedules.getSchedule(label);
	}

	/**
	 * 获取调度
	 */
	getSchedule(label: ScheduleLabel): Schedule | undefined {
		if (this.schedules.hasSchedule(label)) {
			return this.schedules.getSchedule(label);
		}
		return undefined;
	}

	/**
	 * 编辑调度
	 */
	editSchedule(label: ScheduleLabel, editor: (schedule: Schedule) => void): void {
		const schedule = this.schedules.getSchedule(label);
		editor(schedule);
	}

	/**
	 * 设置App引用
	 */
	setAppReference(app: AppInterface): void {
		this.appReference = app;
	}

	/**
	 * 添加插件
	 */
	addPlugin(plugin: Plugin): void {
		this.pluginRegistry.push(plugin);
		this.pluginNames.add(plugin.name());

		this.pluginBuildDepth += 1;
		try {
			if (this.appReference) {
				plugin.build(this.appReference as unknown as App);
			} else {
				warn(`[SubApp] App reference not set, cannot build plugin: ${plugin.name()}`);
			}
		} finally {
			this.pluginBuildDepth -= 1;
		}
	}

	/**
	 * 检查插件是否已添加
	 */
	hasPlugin(pluginName: string): boolean {
		return this.pluginNames.has(pluginName);
	}

	/**
	 * 检查特定类型的插件是否已添加
	 */
	isPluginAdded<T extends Plugin>(pluginType: new (...args: unknown[]) => T): boolean {
		return this.pluginRegistry.some((plugin) => plugin instanceof pluginType);
	}

	/**
	 * 获取已添加的插件
	 */
	getAddedPlugins<T extends Plugin>(pluginType: new (...args: unknown[]) => T): T[] {
		return this.pluginRegistry.filter((plugin) => plugin instanceof pluginType) as T[];
	}

	/**
	 * 检查是否正在构建插件
	 */
	isBuildingPlugins(): boolean {
		return this.pluginBuildDepth > 0;
	}

	/**
	 * 获取插件状态
	 */
	getPluginState(): PluginState {
		if (this._pluginState === PluginState.Adding) {
			// 检查所有插件是否准备就绪
			const allReady = this.pluginRegistry.every((plugin) => {
				if (plugin.ready !== undefined && this.appReference) {
					return plugin.ready(this.appReference as unknown as App);
				}
				return true;
			});

			if (allReady) {
				this._pluginState = PluginState.Ready;
			}
		}

		return this._pluginState;
	}

	/**
	 * 完成插件设置
	 */
	finish(): void {
		for (const plugin of this.pluginRegistry) {
			if (plugin.finish !== undefined && this.appReference) {
				plugin.finish(this.appReference as unknown as App);
			}
		}
		this._pluginState = PluginState.Finished;
	}

	/**
	 * 清理插件
	 */
	cleanup(): void {
		for (const plugin of this.pluginRegistry) {
			if (plugin.cleanup !== undefined && this.appReference) {
				plugin.cleanup(this.appReference as unknown as App);
			}
		}
		this._pluginState = PluginState.Cleaned;
	}

	/**
	 * 设置错误处理器
	 */
	setErrorHandler(handler: ErrorHandler): void {
		this.errorHandler = handler;
	}

	/**
	 * 获取错误处理器
	 */
	getErrorHandler(): ErrorHandler | undefined {
		return this.errorHandler;
	}

	/**
	 * 获取调度器
	 */
	getSchedules(): Schedules {
		return this.schedules;
	}

	/**
	 * 启动 Loop 执行
	 * 使用 Loop 和中间件来执行系统，支持调试器
	 * @param events - 事件映射
	 */
	startLoop(events: { [scheduleLabel: string]: RBXScriptSignal }): void {
		if (this.isLoopRunning) {
			warn("Loop is already running");
			return;
		}

		// 编译并启动 Loop
		this.schedules.compile();
		this.loopConnections = this.schedules.begin(events);
		this.isLoopRunning = true;
		const eventKeys: string[] = [];
		for (const [key] of pairs(events)) {
			eventKeys.push(key as string);
		}
	}

	/**
	 * 停止 Loop 执行
	 */
	stopLoop(): void {
		if (!this.isLoopRunning || !this.loopConnections) {
			return;
		}

		this.schedules.stop(this.loopConnections);
		this.loopConnections = undefined;
		this.isLoopRunning = false;
		print("[SubApp] Loop stopped");
	}
}

/**
 * SubApps集合 - 管理多个SubApp实例
 * 对应 Rust 的 SubApps struct
 */
export class SubApps {
	private _main: SubApp;
	private subApps = new Map<string, SubApp>();

	constructor() {
		this._main = new SubApp();
	}

	/**
	 * 获取主SubApp
	 */
	main(): SubApp {
		return this._main;
	}

	/**
	 * 更新所有SubApp
	 */
	update(): void {
		// 首先更新主应用
		this._main.update();

		// 然后更新所有子应用
		for (const [_, subApp] of this.subApps) {
			// 首先从主世界提取数据
			subApp.extract(this._main.world());
			// 然后更新子应用
			subApp.update();
		}
	}

	/**
	 * 获取整体插件状态
	 */
	getOverallPluginState(): PluginState {
		let overallState = this._main.getPluginState();

		// 取最早的状态作为整体状态
		for (const [_, subApp] of this.subApps) {
			const subState = subApp.getPluginState();
			if (this.comparePluginState(subState, overallState) < 0) {
				overallState = subState;
			}
		}

		return overallState;
	}

	/**
	 * 比较插件状态
	 */
	private comparePluginState(a: PluginState, b: PluginState): number {
		const order = {
			[PluginState.Adding]: 0,
			[PluginState.Ready]: 1,
			[PluginState.Finished]: 2,
			[PluginState.Cleaned]: 3,
		};
		return order[a] - order[b];
	}

	/**
	 * 检查是否有SubApp正在构建插件
	 */
	isBuildingPlugins(): boolean {
		if (this._main.isBuildingPlugins()) {
			return true;
		}

		for (const [_, subApp] of this.subApps) {
			if (subApp.isBuildingPlugins()) {
				return true;
			}
		}

		return false;
	}

	/**
	 * 完成所有SubApp的插件设置
	 */
	finish(): void {
		this._main.finish();
		for (const [_, subApp] of this.subApps) {
			subApp.finish();
		}
	}

	/**
	 * 清理所有SubApp的插件
	 */
	cleanup(): void {
		this._main.cleanup();
		for (const [_, subApp] of this.subApps) {
			subApp.cleanup();
		}
	}

	/**
	 * 获取指定标签的SubApp
	 */
	getSubApp(label: AppLabel): SubApp | undefined {
		return this.subApps.get(label.name);
	}

	/**
	 * 插入SubApp
	 */
	insertSubApp(label: AppLabel, subApp: SubApp): void {
		this.subApps.set(label.name, subApp);
	}

	/**
	 * 移除SubApp
	 */
	removeSubApp(label: AppLabel): SubApp | undefined {
		const subApp = this.subApps.get(label.name);
		if (subApp) {
			this.subApps.delete(label.name);
		}
		return subApp;
	}

	/**
	 * 遍历所有SubApp（包括主应用）
	 */
	*iter(): IterableIterator<SubApp> {
		yield this._main;
		for (const [_, subApp] of this.subApps) {
			yield subApp;
		}
	}

	/**
	 * 设置错误处理器到所有SubApp
	 */
	setErrorHandler(handler: ErrorHandler): void {
		this._main.setErrorHandler(handler);
		for (const [_, subApp] of this.subApps) {
			subApp.setErrorHandler(handler);
		}
	}

	/**
	 * 根据标签更新特定SubApp
	 */
	updateSubAppByLabel(label: AppLabel): void {
		const subApp = this.getSubApp(label);
		if (subApp) {
			subApp.extract(this._main.world());
			subApp.update();
		}
	}
}
