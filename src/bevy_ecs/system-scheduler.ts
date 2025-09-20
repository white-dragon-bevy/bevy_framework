import { World } from "@rbxts/matter";
import { CommandBuffer } from "./command-buffer";
import { SingletonManager } from "./resource";

/**
 * 系统函数类型定义
 */
export type SystemFunction = (world: World, deltaTime: number, resources: SingletonManager, commands: CommandBuffer) => void;

/**
 * 系统元数据
 */
export interface SystemMetadata {
	readonly name: string;
	readonly function: SystemFunction;
	readonly priority: number;
	readonly enabled: boolean;
	readonly runConditions: SystemCondition[];
	readonly dependencies: string[];
	readonly exclusions: string[];
}

/**
 * 系统运行条件函数类型
 */
export type SystemCondition = (world: World, resources: SingletonManager) => boolean;

/**
 * 系统执行统计信息
 */
export interface SystemStats {
	readonly systemName: string;
	readonly executionCount: number;
	readonly totalExecutionTime: number;
	readonly averageExecutionTime: number;
	readonly lastExecutionTime: number;
	readonly maxExecutionTime: number;
	readonly minExecutionTime: number;
}

/**
 * 调度器执行统计信息
 */
export interface SchedulerStats {
	readonly totalSystems: number;
	readonly enabledSystems: number;
	readonly disabledSystems: number;
	readonly totalFrames: number;
	readonly averageFrameTime: number;
	readonly systemStats: readonly SystemStats[];
}

/**
 * 系统调度器错误类型
 */
export enum SchedulerErrorType {
	SystemError = "system_error",
	DependencyError = "dependency_error",
	ConditionError = "condition_error",
}

/**
 * 系统调度器错误
 */
export interface SchedulerError {
	readonly type: SchedulerErrorType;
	readonly systemName: string;
	readonly message: string;
	readonly error?: unknown;
}

/**
 * 系统调度器 - 管理和执行ECS系统
 *
 * 提供系统注册、依赖管理、条件执行、统计监控等功能
 * 兼容Roblox的单线程执行模型，避免yield操作
 */
export class SystemScheduler {
	private readonly systems = new Map<string, SystemMetadata>();
	private readonly systemStats = new Map<string, SystemStats>();
	private readonly world: World;
	private readonly resourceManager: SingletonManager;
	private readonly commandBuffer: CommandBuffer;

	private executionOrder: string[] = [];
	private totalFrames = 0;
	private totalFrameTime = 0;
	private lastFrameStart = 0;
	private enabled = true;

	/**
	 * 系统错误处理器
	 */
	private errorHandler: (schedulerError: SchedulerError) => void = (schedulerError) => {
		warn(`[SystemScheduler] ${schedulerError.type}: ${schedulerError.message} (system: ${schedulerError.systemName})`);
	};

	/**
	 * 创建系统调度器
	 * @param world Matter World实例
	 * @param resourceManager 单例管理器实例
	 * @param commandBuffer 命令缓冲器实例
	 */
	constructor(world: World, resourceManager: SingletonManager, commandBuffer: CommandBuffer) {
		this.world = world;
		this.resourceManager = resourceManager;
		this.commandBuffer = commandBuffer;
	}

	/**
	 * 添加系统到调度器
	 * @param name 系统名称（必须唯一）
	 * @param systemFunction 系统函数
	 * @param priority 优先级（数值越小优先级越高，默认为0）
	 * @param enabled 是否启用（默认为true）
	 */
	public addSystem(
		name: string,
		systemFunction: SystemFunction,
		priority: number = 0,
		enabled: boolean = true,
	): void {
		if (this.systems.has(name)) {
			error(`System with name '${name}' already exists`);
		}

		const metadata: SystemMetadata = {
			name,
			function: systemFunction,
			priority,
			enabled,
			runConditions: [],
			dependencies: [],
			exclusions: [],
		};

		this.systems.set(name, metadata);

		// 初始化统计信息
		this.systemStats.set(name, {
			systemName: name,
			executionCount: 0,
			totalExecutionTime: 0,
			averageExecutionTime: 0,
			lastExecutionTime: 0,
			maxExecutionTime: 0,
			minExecutionTime: math.huge,
		});

		// 重新计算执行顺序
		this.rebuildExecutionOrder();
	}

	/**
	 * 移除系统
	 * @param name 系统名称
	 * @returns 是否成功移除
	 */
	public removeSystem(name: string): boolean {
		const removed = this.systems.delete(name);
		if (removed) {
			this.systemStats.delete(name);
			this.rebuildExecutionOrder();
		}
		return removed;
	}

	/**
	 * 启用或禁用系统
	 * @param name 系统名称
	 * @param enabled 是否启用
	 */
	public setSystemEnabled(name: string, enabled: boolean): void {
		const system = this.systems.get(name);
		if (system) {
			this.systems.set(name, { ...system, enabled });
			this.rebuildExecutionOrder();
		}
	}

	/**
	 * 为系统添加运行条件
	 * @param systemName 系统名称
	 * @param condition 运行条件函数
	 */
	public addSystemCondition(systemName: string, condition: SystemCondition): void {
		const system = this.systems.get(systemName);
		if (system) {
			const newConditions = [...system.runConditions, condition];
			this.systems.set(systemName, { ...system, runConditions: newConditions });
		}
	}

	/**
	 * 添加系统依赖关系
	 * @param systemName 系统名称
	 * @param dependsOn 依赖的系统名称
	 */
	public addSystemDependency(systemName: string, dependsOn: string): void {
		const system = this.systems.get(systemName);
		if (system) {
			const newDependencies = [...system.dependencies, dependsOn];
			this.systems.set(systemName, { ...system, dependencies: newDependencies });
			this.rebuildExecutionOrder();
		}
	}

	/**
	 * 添加系统排斥关系（两个系统不能同时运行）
	 * @param systemName 系统名称
	 * @param excludes 排斥的系统名称
	 */
	public addSystemExclusion(systemName: string, excludes: string): void {
		const system = this.systems.get(systemName);
		if (system) {
			const newExclusions = [...system.exclusions, excludes];
			this.systems.set(systemName, { ...system, exclusions: newExclusions });
		}
	}

	/**
	 * 运行所有启用的系统
	 * @param deltaTime 帧间隔时间
	 */
	public run(deltaTime: number): void {
		if (!this.enabled) {
			return;
		}

		const frameStart = os.clock();
		this.lastFrameStart = frameStart;

		const errors: SchedulerError[] = [];

		// 按执行顺序运行系统
		for (const systemName of this.executionOrder) {
			const system = this.systems.get(systemName);
			if (!system || !system.enabled) {
				continue;
			}

			// 检查运行条件
			try {
				const shouldRun = this.checkSystemConditions(system);
				if (!shouldRun) {
					continue;
				}
			} catch (conditionError) {
				errors.push({
					type: SchedulerErrorType.ConditionError,
					systemName,
					message: `Failed to check run conditions: ${tostring(conditionError)}`,
					error: conditionError,
				});
				continue;
			}

			// 执行系统
			const systemStart = os.clock();
			try {
				system.function(this.world, deltaTime, this.resourceManager, this.commandBuffer);
			} catch (systemError) {
				errors.push({
					type: SchedulerErrorType.SystemError,
					systemName,
					message: `System execution failed: ${tostring(systemError)}`,
					error: systemError,
				});
			}
			const systemEnd = os.clock();

			// 更新统计信息
			this.updateSystemStats(systemName, systemEnd - systemStart);
		}

		// 应用命令缓冲区
		this.commandBuffer.flush(this.world);

		// 更新帧统计信息
		const frameEnd = os.clock();
		const frameTime = frameEnd - frameStart;
		this.totalFrames++;
		this.totalFrameTime += frameTime;

		// 处理错误
		for (const schedulerError of errors) {
			this.errorHandler(schedulerError);
		}
	}

	/**
	 * 设置错误处理器
	 * @param handler 错误处理函数
	 */
	public setErrorHandler(handler: (error: SchedulerError) => void): void {
		this.errorHandler = handler;
	}

	/**
	 * 启用或禁用调度器
	 * @param enabled 是否启用
	 */
	public setEnabled(enabled: boolean): void {
		this.enabled = enabled;
	}

	/**
	 * 获取调度器统计信息
	 * @returns 统计信息
	 */
	public getStats(): SchedulerStats {
		const systemStatsArray: SystemStats[] = [];
		for (const [, stats] of this.systemStats) {
			systemStatsArray.push(stats);
		}

		let enabledSystems = 0;
		for (const [, system] of this.systems) {
			if (system.enabled) {
				enabledSystems++;
			}
		}
		const disabledSystems = this.systems.size() - enabledSystems;

		return {
			totalSystems: this.systems.size(),
			enabledSystems,
			disabledSystems,
			totalFrames: this.totalFrames,
			averageFrameTime: this.totalFrames > 0 ? this.totalFrameTime / this.totalFrames : 0,
			systemStats: systemStatsArray,
		};
	}

	/**
	 * 获取特定系统的统计信息
	 * @param systemName 系统名称
	 * @returns 系统统计信息
	 */
	public getSystemStats(systemName: string): SystemStats | undefined {
		return this.systemStats.get(systemName);
	}

	/**
	 * 重置统计信息
	 */
	public resetStats(): void {
		for (const [systemName] of this.systemStats) {
			this.systemStats.set(systemName, {
				systemName,
				executionCount: 0,
				totalExecutionTime: 0,
				averageExecutionTime: 0,
				lastExecutionTime: 0,
				maxExecutionTime: 0,
				minExecutionTime: math.huge,
			});
		}

		this.totalFrames = 0;
		this.totalFrameTime = 0;
	}

	/**
	 * 获取系统列表
	 * @returns 系统名称数组
	 */
	public getSystemNames(): readonly string[] {
		const names: string[] = [];
		for (const [name] of this.systems) {
			names.push(name);
		}
		return names;
	}

	/**
	 * 获取系统元数据
	 * @param systemName 系统名称
	 * @returns 系统元数据
	 */
	public getSystemMetadata(systemName: string): SystemMetadata | undefined {
		return this.systems.get(systemName);
	}

	/**
	 * 检查系统运行条件
	 * @param system 系统元数据
	 * @returns 是否应该运行
	 */
	private checkSystemConditions(system: SystemMetadata): boolean {
		for (const condition of system.runConditions) {
			if (!condition(this.world, this.resourceManager)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * 更新系统统计信息
	 * @param systemName 系统名称
	 * @param executionTime 执行时间
	 */
	private updateSystemStats(systemName: string, executionTime: number): void {
		const currentStats = this.systemStats.get(systemName);
		if (!currentStats) {
			return;
		}

		const newExecutionCount = currentStats.executionCount + 1;
		const newTotalTime = currentStats.totalExecutionTime + executionTime;

		const newStats: SystemStats = {
			systemName,
			executionCount: newExecutionCount,
			totalExecutionTime: newTotalTime,
			averageExecutionTime: newTotalTime / newExecutionCount,
			lastExecutionTime: executionTime,
			maxExecutionTime: math.max(currentStats.maxExecutionTime, executionTime),
			minExecutionTime: math.min(currentStats.minExecutionTime, executionTime),
		};

		this.systemStats.set(systemName, newStats);
	}

	/**
	 * 重新构建系统执行顺序
	 */
	private rebuildExecutionOrder(): void {
		const enabledSystems: SystemMetadata[] = [];
		for (const [, system] of this.systems) {
			if (system.enabled) {
				enabledSystems.push(system);
			}
		}

		// 按优先级排序
		table.sort(enabledSystems, (a, b) => a.priority < b.priority);

		// 处理依赖关系
		const sortedSystems = this.topologicalSort(enabledSystems);

		this.executionOrder = sortedSystems.map((s) => s.name);
	}

	/**
	 * 拓扑排序处理系统依赖关系
	 * @param systems 系统数组
	 * @returns 排序后的系统数组
	 */
	private topologicalSort(systems: SystemMetadata[]): SystemMetadata[] {
		const systemMap = new Map<string, SystemMetadata>();
		const inDegree = new Map<string, number>();
		const graph = new Map<string, string[]>();

		// 初始化
		for (const system of systems) {
			systemMap.set(system.name, system);
			inDegree.set(system.name, 0);
			graph.set(system.name, []);
		}

		// 构建依赖图
		for (const system of systems) {
			for (const dependency of system.dependencies) {
				if (systemMap.has(dependency)) {
					const dependents = graph.get(dependency) || [];
					dependents.push(system.name);
					graph.set(dependency, dependents);

					const currentInDegree = inDegree.get(system.name) || 0;
					inDegree.set(system.name, currentInDegree + 1);
				}
			}
		}

		// Kahn算法进行拓扑排序
		const queue: string[] = [];
		const result: SystemMetadata[] = [];

		// 找到所有入度为0的节点
		for (const [systemName, degree] of inDegree) {
			if (degree === 0) {
				queue.push(systemName);
			}
		}

		while (queue.size() > 0) {
			const current = queue.shift()!;
			const system = systemMap.get(current)!;
			result.push(system);

			const dependents = graph.get(current) || [];
			for (const dependent of dependents) {
				const currentInDegree = inDegree.get(dependent) || 0;
				const newInDegree = currentInDegree - 1;
				inDegree.set(dependent, newInDegree);

				if (newInDegree === 0) {
					queue.push(dependent);
				}
			}
		}

		// 检查是否有循环依赖
		if (result.size() !== systems.size()) {
			const remaining: SystemMetadata[] = [];
			for (const system of systems) {
				let found = false;
				for (const resultSystem of result) {
					if (resultSystem === system) {
						found = true;
						break;
					}
				}
				if (!found) {
					remaining.push(system);
				}
			}

			const remainingNames: string[] = [];
			for (const system of remaining) {
				remainingNames.push(system.name);
			}
			warn(`[SystemScheduler] Circular dependency detected in systems: ${remainingNames.join(", ")}`);

			// 添加剩余系统到结果中
			for (const system of remaining) {
				result.push(system);
			}
		}

		return result;
	}
}