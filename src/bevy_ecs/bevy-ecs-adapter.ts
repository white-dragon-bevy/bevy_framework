/**
 * Bevy ECS 适配器
 *
 * 提供简化的 API 来使用增强的 Loop.luau 调度系统
 * 管理资源、命令缓冲和系统注册
 */

import { World } from "@rbxts/matter";
import { RunService } from "@rbxts/services";
import { Loop, BevySystemStruct, BevySchedule } from "./Loop";
import { ResourceManager, SingletonManager } from "./resource";
import { CommandBuffer } from "./command-buffer";

// 重新导出常用类型
export { BevySchedule } from "./Loop";
export { ResourceManager, SingletonManager } from "./resource";
export { CommandBuffer } from "./command-buffer";

/**
 * Bevy 系统函数类型
 */
export type BevySystemFn = (
	world: World,
	deltaTime: number,
	resources: SingletonManager,
	commands: CommandBuffer,
) => void;

/**
 * 系统配置选项
 */
export interface SystemConfig {
	/** 系统名称 */
	name: string;
	/** 系统函数 */
	system: BevySystemFn;
	/** 调度阶段，默认为 Update */
	schedule?: BevySchedule | string;
	/** 优先级（数值越小越先执行） */
	priority?: number;
	/** 依赖的其他系统 */
	dependencies?: string[];
	/** 运行条件 */
	runCondition?: (world: World, resources: SingletonManager) => boolean;
	/** 系统集名称 */
	systemSet?: string;
	/** 是否为排他性系统 */
	exclusive?: boolean;
	/** 关联的应用状态 */
	state?: string;
}

/**
 * Bevy ECS 适配器
 *
 * 简化的适配器，直接使用 Loop.luau 的强大功能
 */
export class BevyEcsAdapter {
	private readonly loop: Loop<[World, number, SingletonManager, CommandBuffer]>;
	private readonly world: World;
	private readonly resources: SingletonManager;
	private readonly commands: CommandBuffer;
	private systems = new Map<string, BevySystemStruct<[World, number, SingletonManager, CommandBuffer]>>();
	private isRunning = false;
	private connections: RBXScriptConnection[] = [];

	constructor(world: World, resources?: SingletonManager, commands?: CommandBuffer) {
		this.world = world;
		this.resources = resources || new ResourceManager();
		this.commands = commands || new CommandBuffer();

		// 创建 Loop 实例
		this.loop = new Loop(world, 0, this.resources, this.commands);

		// 配置 Bevy 调度映射
		this.configureBevySchedules();
	}

	/**
	 * 配置 Bevy 调度阶段到 Roblox 事件的映射
	 */
	private configureBevySchedules(): void {
		const scheduleMap: { [key: string]: RBXScriptSignal } = {
			[BevySchedule.First]: RunService.Heartbeat,
			[BevySchedule.PreStartup]: RunService.Heartbeat,
			[BevySchedule.Startup]: RunService.Heartbeat,
			[BevySchedule.PostStartup]: RunService.Heartbeat,
			[BevySchedule.PreUpdate]: RunService.Heartbeat,
			[BevySchedule.Update]: RunService.Heartbeat,
			[BevySchedule.PostUpdate]: RunService.Heartbeat,
			[BevySchedule.Last]: RunService.Heartbeat,
			[BevySchedule.FixedUpdate]: RunService.Stepped,
		};

		// 客户端特有事件
		if (RunService.IsClient()) {
			scheduleMap[BevySchedule.Render] = RunService.RenderStepped;
		}

		this.loop.configureBevySchedules(scheduleMap);
	}

	/**
	 * 添加系统
	 */
	addSystem(config: SystemConfig): void {
		if (this.systems.has(config.name)) {
			warn(`[BevyEcsAdapter] System "${config.name}" already exists`);
			return;
		}

		// 创建包装的系统函数
		const wrappedSystem = (world: World, deltaTime: number, resources: SingletonManager, commands: CommandBuffer): void => {
			try {
				config.system(world, deltaTime, resources, commands);
				// 自动刷新命令缓冲
				commands.flush(world);
			} catch (error) {
				warn(`[BevyEcsAdapter] System "${config.name}" error: ${error}`);
			}
		};

		// 构建依赖系统数组
		const dependencies: BevySystemStruct<[World, number, SingletonManager, CommandBuffer]>[] = [];
		if (config.dependencies) {
			for (const depName of config.dependencies) {
				const depSystem = this.systems.get(depName);
				if (depSystem) {
					dependencies.push(depSystem);
				} else {
					warn(`[BevyEcsAdapter] Dependency "${depName}" not found for system "${config.name}"`);
				}
			}
		}

		// 创建系统结构
		const systemStruct: BevySystemStruct<[World, number, SingletonManager, CommandBuffer]> = {
			system: wrappedSystem,
			schedule: config.schedule || BevySchedule.Update,
			priority: config.priority || 0,
			after: dependencies.size() > 0 ? dependencies : undefined,
			runCondition: config.runCondition ?
				(world: World, _dt: number, resources: SingletonManager) => config.runCondition!(world, resources) :
				undefined,
			systemSet: config.systemSet,
			exclusive: config.exclusive,
			state: config.state,
		};

		this.systems.set(config.name, systemStruct);

		// 如果已经在运行，动态添加系统
		if (this.isRunning) {
			this.loop.scheduleSystem(systemStruct);
		}
	}

	/**
	 * 批量添加系统
	 */
	addSystems(configs: SystemConfig[]): void {
		for (const config of configs) {
			this.addSystem(config);
		}
	}

	/**
	 * 移除系统
	 */
	removeSystem(name: string): boolean {
		const system = this.systems.get(name);
		if (!system) {
			return false;
		}

		this.systems.delete(name);

		if (this.isRunning) {
			this.loop.evictSystem(system);
		}

		return true;
	}

	/**
	 * 替换系统（用于热重载）
	 */
	replaceSystem(config: SystemConfig): void {
		const oldSystem = this.systems.get(config.name);
		if (!oldSystem) {
			warn(`[BevyEcsAdapter] System "${config.name}" not found for replacement`);
			this.addSystem(config);
			return;
		}

		// 移除旧系统
		this.systems.delete(config.name);

		// 添加新系统
		this.addSystem(config);

		// 如果正在运行，使用 Loop 的热重载功能
		if (this.isRunning && oldSystem) {
			const newSystem = this.systems.get(config.name);
			if (newSystem) {
				this.loop.replaceSystem(oldSystem, newSystem);
			}
		}
	}

	/**
	 * 启动调度器
	 */
	start(): void {
		if (this.isRunning) {
			warn("[BevyEcsAdapter] Already running");
			return;
		}

		// 批量调度所有系统
		const allSystems: BevySystemStruct<[World, number, SingletonManager, CommandBuffer]>[] = [];
		for (const [, system] of this.systems) {
			allSystems.push(system);
		}
		this.loop.scheduleSystems(allSystems);

		// 启动 Loop
		const events: { [key: string]: RBXScriptSignal } = {
			default: RunService.Heartbeat,
		};

		const connections = this.loop.begin(events);

		// 保存连接用于清理
		for (const [, connection] of pairs(connections)) {
			this.connections.push(connection as RBXScriptConnection);
		}

		this.isRunning = true;
	}

	/**
	 * 停止调度器
	 */
	stop(): void {
		if (!this.isRunning) {
			return;
		}

		// 断开所有连接
		for (const connection of this.connections) {
			connection.Disconnect();
		}
		this.connections = [];

		this.isRunning = false;
	}

	/**
	 * 运行单次更新（用于测试或手动控制）
	 */
	runOnce(deltaTime: number = 0.016): void {
		// 按系统顺序运行
		for (const [name, systemStruct] of this.systems) {
			// 检查运行条件
			if (systemStruct.runCondition) {
				const shouldRun = systemStruct.runCondition(this.world, deltaTime, this.resources, this.commands);
				if (!shouldRun) {
					continue;
				}
			}

			try {
				// 调用系统
				const fn = systemStruct.system;
				fn(this.world, deltaTime, this.resources, this.commands);
			} catch (error) {
				warn(`[BevyEcsAdapter] System error in runOnce: ${error}`);
			}
		}

		// 最后刷新命令缓冲
		this.commands.flush(this.world);
	}

	/**
	 * 添加中间件（用于调试、性能监控等）
	 */
	addMiddleware(middleware: (nextFn: () => void, eventName: string) => () => void): void {
		this.loop.addMiddleware(middleware);
	}

	/**
	 * 获取资源管理器
	 */
	getResources(): SingletonManager {
		return this.resources;
	}

	/**
	 * 获取命令缓冲
	 */
	getCommands(): CommandBuffer {
		return this.commands;
	}

	/**
	 * 获取世界
	 */
	getWorld(): World {
		return this.world;
	}

	/**
	 * 检查系统是否存在
	 */
	hasSystem(name: string): boolean {
		return this.systems.has(name);
	}

	/**
	 * 获取系统数量
	 */
	getSystemCount(): number {
		return this.systems.size();
	}

	/**
	 * 是否正在运行
	 */
	getIsRunning(): boolean {
		return this.isRunning;
	}
}

/**
 * 创建 Bevy ECS 适配器的便捷函数
 */
export function createBevyEcsAdapter(world: World): BevyEcsAdapter {
	return new BevyEcsAdapter(world);
}