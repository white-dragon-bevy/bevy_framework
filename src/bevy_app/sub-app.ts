/**
 * Bevy SubApp系统实现
 * 对应 Rust bevy_app 的 SubApp struct 和 SubApps
 */

import { AppLabel, Component, ErrorHandler, Message, Resource, ScheduleLabel, SystemFunction } from "./types";
import { Plugin, PluginState } from "./plugin";
import { Schedule, Scheduler } from "./scheduler";
import { WorldContainer, createWorldContainer, World } from "../bevy_ecs";
import { ResourceManager, ResourceConstructor } from "../bevy_ecs/resource";
import { CommandBuffer } from "../bevy_ecs/command-buffer";
import { EventManager } from "../bevy_ecs/events";

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
	private scheduler: Scheduler;
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

	constructor() {
		this._world = createWorldContainer();
		this.scheduler = new Scheduler();
		this.resourceManager = new ResourceManager();
		this.commandBuffer = new CommandBuffer();
		this.eventManager = new EventManager(this._world.getWorld());
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
	 * 更新SubApp
	 * 对应 Rust SubApp::update
	 */
	update(): void {
		if (this.updateSchedule) {
			this.scheduler.runSchedule(this.updateSchedule, this._world.getWorld());
		}

		// 执行命令缓冲
		this.commandBuffer.flush(this._world.getWorld());

		// 清理事件
		this.eventManager.cleanup();
	}

	/**
	 * 添加系统到指定调度
	 */
	addSystems(schedule: ScheduleLabel, ...systems: SystemFunction[]): void {
		for (const system of systems) {
			this.scheduler.addSystem(schedule, system);
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
	insertResource<T extends Resource>(resource: T): void {
		// 使用独立的资源管理器
		if (typeIs(resource, "table") && getmetatable(resource)) {
			const resourceType = getmetatable(resource) as ResourceConstructor<T>;
			this.resourceManager.insertResource(resourceType, resource);
		} else {
			// 对于简单类型，暂时跳过
			warn(`[SubApp] Cannot insert resource without proper constructor: ${tostring(resource)}`);
		}
	}

	/**
	 * 初始化资源
	 */
	initResource<T extends Resource>(resourceFactory: () => T): void {
		const resource = resourceFactory();
		this.insertResource(resource);
	}

	/**
	 * 获取资源
	 */
	getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
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
		this.scheduler.addSchedule(schedule.getLabel(), schedule);
	}

	/**
	 * 初始化调度
	 */
	initSchedule(label: ScheduleLabel): void {
		this.scheduler.initSchedule(label);
	}

	/**
	 * 获取调度
	 */
	getSchedule(label: ScheduleLabel): Schedule | undefined {
		return this.scheduler.getSchedule(label);
	}

	/**
	 * 编辑调度
	 */
	editSchedule(label: ScheduleLabel, editor: (schedule: Schedule) => void): void {
		this.scheduler.editSchedule(label, editor);
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
				plugin.build(this.appReference as any);
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
					return plugin.ready(this.appReference as any);
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
				plugin.finish(this.appReference as any);
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
				plugin.cleanup(this.appReference as any);
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