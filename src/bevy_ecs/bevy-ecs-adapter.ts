/**
 * Bevy ECS 适配器
 *
 * 提供 Loop.luau 的 TypeScript 接口适配
 * 纯粹的 Loop 包装器，不包含应用特定逻辑
 */

import { World } from "@rbxts/matter";
import { BevySystemStruct } from "./Loop";
import { ResourceManager, SingletonManager } from "./resource";
import { CommandBuffer } from "./command-buffer";

// Import Lua module as default
const Loop = require(script.Parent!.WaitForChild("Loop") as ModuleScript) as typeof import("./Loop").Loop;

// 重新导出常用类型
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
	/** 调度阶段 */
	schedule?: string;
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
	private readonly loop: InstanceType<typeof Loop>;
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
	}

	/**
	 * 配置调度映射（由应用层调用）
	 */
	configureSchedules(scheduleMap: { [key: string]: RBXScriptSignal }): void {
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
			schedule: config.schedule || "Update",
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
			this.loop.scheduleSystem(systemStruct as any);
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
			this.loop.evictSystem(system as any);
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
				this.loop.replaceSystem(oldSystem as any, newSystem as any);
			}
		}
	}

	/**
	 * 启动调度器
	 */
	start(events: { [key: string]: RBXScriptSignal }): void {
		if (this.isRunning) {
			warn("[BevyEcsAdapter] Already running");
			return;
		}

		// 批量调度所有系统
		const allSystems: BevySystemStruct<[World, number, SingletonManager, CommandBuffer]>[] = [];
		for (const [, system] of this.systems) {
			allSystems.push(system);
		}
		this.loop.scheduleSystems(allSystems as any);

		// 启动 Loop
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
		// 定义 Bevy 调度阶段的执行顺序
		const scheduleOrder = [
			"First",
			"PreStartup",
			"Startup",
			"PostStartup",
			"PreUpdate",
			"FixedUpdate",
			"Update",
			"PostUpdate",
			"Render",
			"Last"
		];

		// 按调度阶段顺序运行系统
		for (const scheduleName of scheduleOrder) {
			// 收集当前调度阶段的所有系统
			const scheduleSystems: Array<{
				name: string,
				system: BevySystemStruct<[World, number, SingletonManager, CommandBuffer]>
			}> = [];

			for (const [name, systemStruct] of this.systems) {
				if (systemStruct.schedule === scheduleName) {
					scheduleSystems.push({ name, system: systemStruct });
				}
			}

			// 按优先级排序（数值越小越先执行）
			scheduleSystems.sort((a, b) => {
				const priorityA = a.system.priority || 0;
				const priorityB = b.system.priority || 0;
				return priorityA < priorityB;
			});

			// 执行当前调度阶段的系统
			for (const { name, system: systemStruct } of scheduleSystems) {
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
					warn(`[BevyEcsAdapter] System "${name}" error in runOnce: ${error}`);
				}
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

	/**
	 * 获取 Loop 实例（高级用法）
	 */
	getLoop(): InstanceType<typeof Loop> {
		return this.loop;
	}
}

/**
 * 创建 Bevy ECS 适配器的便捷函数
 */
export function createBevyEcsAdapter(world: World): BevyEcsAdapter {
	return new BevyEcsAdapter(world);
}