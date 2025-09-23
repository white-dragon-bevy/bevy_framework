/**
 * @fileoverview Bevy ECS 调度器实现
 * 提供系统调度、依赖解析和执行管理功能
 */

import { RunService } from "@rbxts/services";
import type {
	SystemConfig,
	SystemSetConfig,
	SystemFunction,
	SystemSet,
	ScheduleLabel,
	InternalSystemStruct,
	ScheduleGraph,
	SchedulerState,
	ScheduleStats,
} from "./types";
import type { BevySystem, BevyWorld, Context } from "../types";

/**
 * 系统调度器 - 管理单个调度阶段的系统执行
 *
 * Schedule 负责：
 * - 注册和配置系统
 * - 解析系统依赖关系
 * - 编译为 Matter Loop 可执行的系统结构
 * - 提供调试和统计信息
 */
export class Schedule {
	private readonly label: ScheduleLabel;
	private readonly systems = new Map<string, InternalSystemStruct>();
	private readonly systemSets = new Map<string, SystemSetConfig>();
	private readonly systemsByFunction = new Map<SystemFunction, string>();
	private compiled = false;
	private compiledSystems?: Array<BevySystem>;
	private nextSystemId = 1;
	private stats: ScheduleStats = {
		executionCount: 0,
		totalTime: 0,
		lastExecutionTime: 0,
	};
	private resourceManager?: import("../resource").ResourceManager;
	private commandBuffer?: import("../command-buffer").CommandBuffer;

	/**
	 * 创建新的调度器
	 * @param label - 调度阶段标识符
	 */
	public constructor(label: ScheduleLabel) {
		this.label = label;
	}

	/**
	 * 设置依赖项 - 由 Schedules 调用
	 * @param resourceManager - 资源管理器实例
	 * @param commandBuffer - 命令缓冲器实例
	 */
	public setDependencies(
		resourceManager: import("../resource").ResourceManager,
		commandBuffer: import("../command-buffer").CommandBuffer,
	): void {
		this.resourceManager = resourceManager;
		this.commandBuffer = commandBuffer;
	}

	/**
	 * 获取调度器标识符
	 * @returns 调度阶段标识符
	 */
	public getLabel(): ScheduleLabel {
		return this.label;
	}

	/**
	 * 添加系统到调度器
	 * @param config - 系统配置
	 * @returns 系统标识符
	 */
	public addSystem(config: SystemConfig): string {
		this.assertNotCompiled("Cannot add system after compilation");

		const systemId = this.generateSystemId(config);

		// 检查系统是否已注册
		if (this.systemsByFunction.has(config.system)) {
			// 系统已经注册，抛出错误
			error(`System "${config.name || "unnamed"}" has already been added to schedule "${this.label}"`);
		}

		const internalSystem: InternalSystemStruct = {
			...config,
			id: systemId,
			schedule: this.label,
			dependencies: [],
			loopSystem: this.createLoopSystem(config),
		};

		this.systems.set(systemId, internalSystem);
		this.systemsByFunction.set(config.system, systemId);

		return systemId;
	}

	/**
	 * 配置系统集
	 * @param config - 系统集配置
	 */
	public configureSet(config: SystemSetConfig): void {
		this.assertNotCompiled("Cannot configure system set after compilation");

		if (this.systemSets.has(config.name)) {
			error(`System set '${config.name}' is already configured`);
		}

		this.systemSets.set(config.name, config);
	}

	/**
	 * 编译调度器 - 解析依赖关系并准备执行
	 * @returns 编译后的系统列表，可直接用于 Matter Loop
	 */
	public compile(): Array<BevySystem> {
		if (this.compiled && this.compiledSystems) {
			return this.compiledSystems;
		}

		// 1. 解析系统集依赖
		this.resolveSystemSetDependencies();

		// 2. 解析系统依赖
		this.resolveSystemDependencies();

		// 3. 检查循环依赖
		this.detectCircularDependencies();

		// 4. 生成执行顺序
		const sortedSystems = this.topologicalSort();

		// 5. 创建最终的 Loop 系统结构，并分配优先级确保执行顺序
		const compiledSystems = sortedSystems.map((systemId, index) => {
			const system = this.systems.get(systemId)!;
			return this.enhanceLoopSystem(system, index);
		});

		this.compiled = true;
		this.compiledSystems = compiledSystems;
		return compiledSystems;
	}

	/**
	 * 获取调度器状态
	 * @returns 调度器状态信息
	 */
	public getState(): SchedulerState {
		return {
			compiled: this.compiled,
			systemCount: this.systems.size(),
			setCount: this.systemSets.size(),
		};
	}

	/**
	 * 获取调度器图结构
	 * @returns 调度器图，包含所有系统和依赖关系
	 */
	public getGraph(): ScheduleGraph {
		const dependencies = new Map<string, Array<string>>();

		for (const [systemId, system] of this.systems) {
			dependencies.set(systemId, [...system.dependencies]);
		}

		return {
			systems: this.systems as ReadonlyMap<string, InternalSystemStruct>,
			systemSets: this.systemSets as ReadonlyMap<string, SystemSetConfig>,
			dependencies,
		};
	}

	/**
	 * 获取执行统计
	 * @returns 调度器执行统计信息
	 */
	public getStats(): ScheduleStats {
		return { ...this.stats };
	}

	/**
	 * 重置调度器 - 清除所有系统和编译状态
	 */
	public reset(): void {
		this.systems.clear();
		this.systemSets.clear();
		this.systemsByFunction.clear();
		this.compiled = false;
		this.compiledSystems = undefined;
		this.nextSystemId = 1;
		this.stats = {
			executionCount: 0,
			totalTime: 0,
			lastExecutionTime: 0,
		};
	}

	// ==================== 私有方法 ====================

	/**
	 * 生成系统唯一标识符
	 * @param config - 系统配置
	 * @returns 系统标识符
	 */
	private generateSystemId(config: SystemConfig): string {
		const baseName = config.name ?? `System${this.nextSystemId}`;
		const systemId = `${this.label}::${baseName}::${this.nextSystemId}`;
		this.nextSystemId++;
		return systemId;
	}

	/**
	 * 创建 Matter Loop 系统结构
	 * @param config - 系统配置
	 * @returns Loop 系统结构
	 */
	private createLoopSystem(config: SystemConfig): BevySystem {
		// 创建一个适配函数，将 (World, number) 转换为 (World, Context)
		const adaptedSystem = (world: BevyWorld, context: Context): void => {
			// 这里会在 enhanceLoopSystem 中被正确的包装函数替换
			config.system(world, context);
		};

		return {
			system: adaptedSystem,
			schedule: this.label,
			priority: config.priority,
			runCondition: config.runCondition,
			exclusive: config.exclusive,
		};
	}

	/**
	 * 增强 Loop 系统结构，添加统计和错误处理
	 * @param system - 内部系统结构
	 * @param sortIndex - 拓扑排序的索引，用于设置优先级
	 * @returns 增强的 Loop 系统结构
	 */
	private enhanceLoopSystem(system: InternalSystemStruct, sortIndex?: number): BevySystem {
		const originalSystem = system.system;

		// 包装系统函数以添加统计和错误处理
		const wrappedSystem = (world: BevyWorld, context: Context): void => {
			const startTime = os.clock();

			try {
				// 检查运行条件
				if (system.runCondition && !system.runCondition(world)) {
					return;
				}

				// 执行原始系统
				originalSystem(world, context);

				// 更新统计
				const executionTime = (os.clock() - startTime) * 1000;
				this.stats = {
					executionCount: this.stats.executionCount + 1,
					totalTime: this.stats.totalTime + executionTime,
					lastExecutionTime: executionTime,
				};
			} catch (err) {
				// 不输出警告，直接抛出错误
				throw err;
			}
		};

		const finalPriority = sortIndex !== undefined ? sortIndex : (system.priority ?? 0);

		return {
			...system.loopSystem,
			system: wrappedSystem,
			// 使用拓扑排序的索引作为优先级，确保系统按正确顺序执行
			priority: finalPriority,
			// 清除 after 依赖，因为 Schedule 已经通过拓扑排序处理了依赖关系
			// 如果保留 after，Loop 会重新计算优先级，破坏我们的排序
			after: undefined,
		};
	}

	/**
	 * 解析系统集依赖关系
	 */
	private resolveSystemSetDependencies(): void {
		// 构建系统集依赖图
		const setDependencies = new Map<string, Array<string>>();

		for (const [setName, setConfig] of this.systemSets) {
			const dependencies: Array<string> = [];

			if (setConfig.after) {
				for (const dependency of setConfig.after) {
					if (this.systemSets.has(dependency)) {
						dependencies.push(dependency);
					}
				}
			}

			setDependencies.set(setName, dependencies);
		}

		// 处理 before 关系（反向依赖）
		for (const [setName, setConfig] of this.systemSets) {
			if (setConfig.before) {
				for (const beforeSet of setConfig.before) {
					if (this.systemSets.has(beforeSet)) {
						const dependencies = setDependencies.get(beforeSet) ?? [];
						dependencies.push(setName);
						setDependencies.set(beforeSet, dependencies);
					}
				}
			}
		}
	}

	/**
	 * 解析系统依赖关系
	 */
	private resolveSystemDependencies(): void {
		for (const [systemId, system] of this.systems) {
			const dependencies: Array<string> = [];

			// 处理直接系统依赖
			if (system.after) {
				for (const dependency of system.after) {
					if (typeIs(dependency, "function")) {
						const depSystemId = this.systemsByFunction.get(dependency);
						if (depSystemId !== undefined) {
							dependencies.push(depSystemId);
						}
					} else {
						// 系统集依赖 - 添加该集合中的所有系统
						const setSystems = this.getSystemsInSet(dependency);
						for (const sys of setSystems) {
							dependencies.push(sys);
						}
					}
				}
			}

			// 处理系统集成员关系
			if (system.inSet !== undefined) {
				const setConfig = this.systemSets.get(system.inSet);
				if (setConfig?.after) {
					for (const setDep of setConfig.after) {
						const setSystems = this.getSystemsInSet(setDep);
						for (const sys of setSystems) {
							dependencies.push(sys);
						}
					}
				}
			}

			// 更新系统依赖
			const updatedSystem: InternalSystemStruct = {
				...system,
				dependencies,
			};
			this.systems.set(systemId, updatedSystem);
		}

		// 处理 before 关系
		for (const [systemId, system] of this.systems) {
			if (system.before) {
				for (const beforeTarget of system.before) {
					if (typeIs(beforeTarget, "function")) {
						const targetSystemId = this.systemsByFunction.get(beforeTarget);
						if (targetSystemId !== undefined) {
							this.addDependencyToSystem(targetSystemId, systemId);
						}
					} else {
						// 系统集 before 关系
						const setSystems = this.getSystemsInSet(beforeTarget);
						for (const setSystemId of setSystems) {
							this.addDependencyToSystem(setSystemId, systemId);
						}
					}
				}
			}
		}
	}

	/**
	 * 获取指定系统集中的所有系统
	 * @param setName - 系统集名称
	 * @returns 系统ID列表
	 */
	private getSystemsInSet(setName: SystemSet): Array<string> {
		const result: Array<string> = [];
		for (const [systemId, system] of this.systems) {
			if (system.inSet === setName) {
				result.push(systemId);
			}
		}
		return result;
	}

	/**
	 * 向指定系统添加依赖
	 * @param systemId - 目标系统ID
	 * @param dependencyId - 依赖系统ID
	 */
	private addDependencyToSystem(systemId: string, dependencyId: string): void {
		const system = this.systems.get(systemId);
		if (system) {
			const updatedSystem: InternalSystemStruct = {
				...system,
				dependencies: [...system.dependencies, dependencyId],
			};
			this.systems.set(systemId, updatedSystem);
		}
	}

	/**
	 * 检测循环依赖
	 */
	private detectCircularDependencies(): void {
		const visited = new Set<string>();
		const recursionStack = new Set<string>();

		for (const [systemId] of this.systems) {
			if (!visited.has(systemId)) {
				this.detectCircularDependenciesRecursive(systemId, visited, recursionStack);
			}
		}
	}

	/**
	 * 递归检测循环依赖
	 * @param systemId - 当前系统ID
	 * @param visited - 已访问的系统
	 * @param recursionStack - 递归栈
	 */
	private detectCircularDependenciesRecursive(
		systemId: string,
		visited: Set<string>,
		recursionStack: Set<string>,
	): void {
		visited.add(systemId);
		recursionStack.add(systemId);

		const system = this.systems.get(systemId);
		if (system) {
			for (const dependency of system.dependencies) {
				if (!visited.has(dependency)) {
					this.detectCircularDependenciesRecursive(dependency, visited, recursionStack);
				} else if (recursionStack.has(dependency)) {
					error(`Circular dependency detected: ${systemId} -> ${dependency}`);
				}
			}
		}

		recursionStack.delete(systemId);
	}

	/**
	 * 拓扑排序系统
	 * @returns 排序后的系统ID列表
	 */
	private topologicalSort(): Array<string> {
		const inDegree = new Map<string, number>();
		const adjList = new Map<string, Array<string>>();

		// 初始化
		for (const [systemId] of this.systems) {
			inDegree.set(systemId, 0);
			adjList.set(systemId, []);
		}

		// 构建邻接表和入度计算
		for (const [systemId, system] of this.systems) {
			for (const dependency of system.dependencies) {
				const dependencyList = adjList.get(dependency) ?? [];
				dependencyList.push(systemId);
				adjList.set(dependency, dependencyList);

				const currentInDegree = inDegree.get(systemId) ?? 0;
				inDegree.set(systemId, currentInDegree + 1);
			}
		}

		// Kahn 算法
		const queue: Array<string> = [];
		const result: Array<string> = [];

		// 找到所有入度为0的系统
		for (const [systemId, degree] of inDegree) {
			if (degree === 0) {
				queue.push(systemId);
			}
		}

		while (queue.size() > 0) {
			const systemId = queue.shift()!;
			result.push(systemId);

			const neighbors = adjList.get(systemId) ?? [];
			for (const neighbor of neighbors) {
				const newInDegree = (inDegree.get(neighbor) ?? 0) - 1;
				inDegree.set(neighbor, newInDegree);

				if (newInDegree === 0) {
					queue.push(neighbor);
				}
			}
		}

		if (result.size() !== this.systems.size()) {
			error("Cannot resolve system dependencies - possible circular dependency");
		}

		// 按优先级进行二次排序
		return this.sortByPriority(result);
	}

	/**
	 * 按优先级排序系统
	 * @param systemIds - 系统ID列表
	 * @returns 按优先级排序的系统ID列表
	 */
	private sortByPriority(systemIds: Array<string>): Array<string> {
		const sorted = [...systemIds];
		sorted.sort((idA, idB) => {
			const systemA = this.systems.get(idA)!;
			const systemB = this.systems.get(idB)!;

			const priorityA = systemA.priority ?? 0;
			const priorityB = systemB.priority ?? 0;

			if (priorityA < priorityB) return true;
			if (priorityA > priorityB) return false;
			return false;
		});
		return sorted;
	}

	/**
	 * 断言调度器未编译
	 * @param message - 错误消息
	 */
	private assertNotCompiled(message: string): void {
		if (this.compiled) {
			error(message);
		}
	}
}
