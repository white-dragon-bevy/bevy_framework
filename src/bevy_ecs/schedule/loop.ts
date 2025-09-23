/**
 * @fileoverview Bevy ECS Loop 实现
 * 基于 Matter 框架的系统循环管理器，处理系统调度和执行
 */

import { RunService } from "@rbxts/services";
import type { World } from "@rbxts/matter";
import type { BevySystem, Context } from "../types";

// Declare Lua functions for direct table access
declare function rawget<T>(table: unknown, key: unknown): T | undefined;
declare function rawset(table: unknown, key: unknown, value: unknown): void;

/**
 * 系统函数类型
 */
type SystemFn<T extends Array<unknown>> = (...params: T) => void;

/**
 * 基础系统结构
 */
export type SystemStruct<T extends Array<unknown>> = {
	system: SystemFn<T>;
	event?: string;
	priority?: number;
	after?: Array<SystemFn<T> | SystemStruct<T>>;
};

/**
 * Bevy 扩展的系统结构
 * 添加了 Bevy ECS 特有的调度功能
 */
export type BevySystemStruct<T extends Array<unknown>> = SystemStruct<T> & {
	/** 调度阶段 (First, PreUpdate, Update, PostUpdate, Last等) */
	schedule?: string;
	/** 运行条件函数 */
	runCondition?: (...params: T) => boolean;
	/** 系统集名称，用于分组管理 */
	systemSet?: string;
	/** 是否为排他性系统（独占世界访问） */
	exclusive?: boolean;
	/** 关联的应用状态 */
	state?: string;
	/** 在某个系统集之前运行 */
	beforeSet?: string;
	/** 在某个系统集之后运行 */
	afterSet?: string;
	/** 原始系统函数（用于调试器获取正确的函数名） */
	originalSystem?: SystemFn<T>;
	/** 系统名称（用于调试器显示） */
	systemName?: string;
};

export type System<T extends Array<unknown>> = SystemFn<T> | SystemStruct<T> | BevySystemStruct<T>;

export type AnySystem = System<unknown[]>;

/**
 * Loop 类处理所有游戏系统的调度和循环执行
 *
 * Yielding 在系统中是不被允许的。这样做会导致系统线程提前关闭，
 * 但不会影响其他系统。
 */
export class Loop<T extends Array<unknown>> {
	private readonly _systems: Array<System<T>> = [];
	private readonly _skipSystems: Map<System<T>, boolean> = new Map();
	private readonly _orderedSystemsByEvent: Map<string, Array<System<T>>> = new Map();
	private readonly _state: T;
	private readonly _stateLength: number;
	private readonly _systemState: Map<System<T>, Record<string, unknown>> = new Map();
	private readonly _middlewares: Array<(nextFn: () => void, eventName: string) => () => void> = [];
	private readonly _systemErrors: Map<System<T>, Array<{ error: string; when: number }>> = new Map();
	private readonly _systemLogs: Map<System<T>, Array<unknown>> = new Map();
	private readonly _systemSets: Map<string, Array<System<T>>> = new Map();
	private _bevyScheduleMap?: { [schedule: string]: RBXScriptSignal };
	public _debugger?: unknown; // Matter debugger instance

	// 使用普通对象而不是 Map，以兼容 Matter 调试器
	// Matter 调试器期望 profiling 是一个Lua表，系统对象作为键
	// 使用unknown类型，运行时是Lua表
	public profiling: unknown;
	public trackErrors = false;

	/**
	 * 创建一个新的循环。接受参数将传递给所有系统。
	 *
	 * 通常，你需要在这里传入 World 以及可能的全局游戏状态表。
	 *
	 * ```typescript
	 * const world = new World()
	 * const gameState = {}
	 *
	 * const loop = new Loop(world, gameState)
	 * ```
	 *
	 * @param dynamicBundle - 将传递给所有系统的值
	 */
	public constructor(...dynamicBundle: T) {
		this._state = dynamicBundle;
		this._stateLength = dynamicBundle.size();

		if (RunService.IsStudio()) {
			// 在 Studio 中，我们立即开始日志记录
			for (const system of this._systems) {
				this._systemLogs.set(system, []);
			}
		}
	}

	/**
	 * 根据系统定义的约束调度一组系统。
	 *
	 * 系统可以可选地声明：
	 * - 它们运行的事件名称（例如 RenderStepped、Stepped、Heartbeat）
	 * - 数值优先级值
	 * - 它们必须在之后运行的其他系统
	 *
	 * 如果系统不指定事件，它们将在 `default` 事件上运行。
	 *
	 * 共享事件的系统将按优先级顺序运行，这意味着具有较低 `priority` 值的系统先运行。默认优先级是 `0`。
	 *
	 * @param systems - 要调度的系统数组
	 */
	public scheduleSystems<S extends Array<System<T>>>(systems: S): void {
		for (const system of systems) {
			if (!this._systems.includes(system)) {
				this._systems.push(system);
			}
			this._systemState.set(system, {});

			if (RunService.IsStudio()) {
				this._systemLogs.set(system, []);
			}
		}

		this._sortSystems();
	}

	/**
	 * 调度单个系统。这是一个昂贵的函数，多次调用。
	 * 相反，尽可能尝试使用 scheduleSystems 批量调度系统。
	 *
	 * @param system - 要调度的系统
	 */
	public scheduleSystem(system: System<T>): void {
		this.scheduleSystems([system]);
	}

	/**
	 * 从循环中移除先前调度的系统。驱逐系统也会清理钩子的任何存储。
	 * 这用于热重载。不建议为游戏逻辑动态加载和卸载系统。
	 *
	 * @param system - 要从循环中驱逐的系统
	 */
	public evictSystem(system: System<T>): void {
		const systemIndex = this._systems.indexOf(system);

		if (systemIndex === -1) {
			error("Can't evict system because it doesn't exist");
		}

		this._systems.unorderedRemove(systemIndex);
		this._systemErrors.delete(system);
		this._systemState.delete(system);
		this._systemLogs.delete(system);

		this._sortSystems();
	}

	/**
	 * 用新版本的系统替换旧版本的系统。内部系统存储（由钩子使用）
	 * 将被移动以与新系统关联。这用于热重载。
	 *
	 * @param oldSystem - 要替换的旧系统
	 * @param newSystem - 要替换的新系统
	 */
	public replaceSystem(oldSystem: System<T>, newSystem: System<T>): void {
		const systemIndex = this._systems.indexOf(oldSystem);

		if (systemIndex === -1) {
			error("Before system does not exist!");
		}

		this._systems[systemIndex] = newSystem;

		const oldState = this._systemState.get(oldSystem) || {};
		this._systemState.set(newSystem, oldState);
		this._systemState.delete(oldSystem);

		const wasSkipped = this._skipSystems.get(oldSystem);
		if (wasSkipped) {
			this._skipSystems.delete(oldSystem);
			this._skipSystems.set(newSystem, true);
		}

		// 更新依赖关系
		for (const system of this._systems) {
			if (this.isSystemStruct(system) && system.after) {
				const index = system.after.indexOf(oldSystem as any);
				if (index !== -1) {
					system.after[index] = newSystem as any;
				}
			}
		}

		this._sortSystems();
	}

	/**
	 * Bevy: 配置调度阶段映射
	 * 允许将 Bevy 调度阶段映射到 Roblox 事件
	 *
	 * @param scheduleMap - 调度阶段到事件的映射
	 */
	public configureBevySchedules(scheduleMap?: { [schedule: string]: RBXScriptSignal }): void {
		this._bevyScheduleMap = scheduleMap || {
			First: RunService.Heartbeat,
			PreStartup: RunService.Heartbeat,
			Startup: RunService.Heartbeat,
			PostStartup: RunService.Heartbeat,
			PreUpdate: RunService.Heartbeat,
			Update: RunService.Heartbeat,
			PostUpdate: RunService.Heartbeat,
			Last: RunService.Heartbeat,
			FixedUpdate: RunService.Stepped,
			Render: RunService.RenderStepped,
		};
	}

	/**
	 * 连接到帧事件并开始调用你的系统。
	 *
	 * 传递一个你想要能够在其上运行系统的事件表，从名称到事件的映射。
	 * 系统可以使用这些名称来定义它们运行的事件。默认情况下，系统在名为 `"default"` 的事件上运行。
	 *
	 * @param events - 从事件名称到事件对象的映射
	 * @returns 从你的事件名称到连接对象的映射
	 */
	public begin<TEvents extends { [index: string]: RBXScriptSignal }>(
		events: TEvents,
	): { [P in keyof TEvents]: RBXScriptConnection } {
		const connections = {} as { [P in keyof TEvents]: RBXScriptConnection };

		// Bevy: 合并 Bevy 调度映射到事件中
		if (this._bevyScheduleMap) {
			for (const [scheduleName, scheduleEvent] of pairs(this._bevyScheduleMap)) {
				if (!(scheduleName in events)) {
					(events as any)[scheduleName] = scheduleEvent;
				}
			}
		}

		for (const [eventNameKey, event] of pairs(events)) {
			const eventName = eventNameKey as keyof TEvents;
			const eventNameStr = eventName as string;
			let lastTime = os.clock();
			let generation = false;

			const stepSystems = () => {
				const orderedSystems = this._orderedSystemsByEvent.get(eventNameStr);
				if (!orderedSystems) {
					// 跳过没有系统的事件
					return;
				}

				const currentTime = os.clock();
				const deltaTime = currentTime - lastTime;
				lastTime = currentTime;

				generation = !generation;

				const dirtyWorlds = new Set<World>();

				for (const system of orderedSystems) {
					if (this._skipSystems.get(system)) {
						if (this.profiling !== undefined) {
							rawset(this.profiling, system, undefined);
						}
						continue;
					}

					// Bevy: 检查运行条件
					if (this.isBevySystemStruct(system) && system.runCondition) {
						const shouldRun = system.runCondition(...this._state);
						if (!shouldRun) {
							if (this.profiling !== undefined) {
								rawset(this.profiling, system, undefined);
							}
							continue;
						}
					}

					// Bevy: 检查应用状态条件
					if (this.isBevySystemStruct(system) && system.state) {
						// 从资源中获取当前状态（需要在状态中实现）
						const world = this._state[0] as unknown;
						const currentState = (world as { currentAppState?: string })?.currentAppState;
						if (currentState !== system.state) {
							if (this.profiling !== undefined) {
								rawset(this.profiling, system, undefined);
							}
							continue;
						}
					}

					const fn = this.getSystemFn(system);
					const systemNameStr = this.getSystemName(system);

					debug.profilebegin(
						`system: ${this.isBevySystemStruct(system) && system.exclusive ? "[Exclusive] " : ""}${systemNameStr}`,
					);

					const thread = coroutine.create(fn);
					const startTime = os.clock();
					const [success, errorValue] = coroutine.resume(thread, ...this._state);

					if (this.profiling !== undefined) {
						const duration = os.clock() - startTime;

						// Matter uses a different structure for profiling data
						// It's an array with an index property for rolling average
						let profilingData = rawget<number[] & { index?: number }>(this.profiling, system);
						if (!profilingData) {
							profilingData = [] as number[] & { index?: number };
							rawset(this.profiling, system, profilingData);
						}

						// Implement rolling average like Matter does
						const MAX_SAMPLES = 60;
						const currentIndex = (profilingData.index || 1) - 1; // Convert to 0-based
						profilingData[currentIndex] = duration;
						profilingData.index = ((currentIndex + 1) % MAX_SAMPLES) + 1; // Back to 1-based
					}

					if (coroutine.status(thread) !== "dead") {
						coroutine.close(thread);
						task.spawn(
							error,
							`Matter: System ${systemNameStr} yielded! Its thread has been closed. Yielding in systems is not allowed.`,
						);
					}

					// 优化脏世界
					for (const world of dirtyWorlds) {
						(world as { optimizeQueries?: () => void }).optimizeQueries?.();
					}
					dirtyWorlds.clear();

					if (!success) {
						this.handleSystemError(system, errorValue as string, thread);
					}

					debug.profileend();
				}
			};

			// 应用中间件
			let finalStepSystems = stepSystems;
			for (const middleware of this._middlewares) {
				finalStepSystems = middleware(finalStepSystems, eventNameStr);

				if (typeOf(finalStepSystems) !== "function") {
					error(`Middleware function returned ${typeOf(finalStepSystems)} instead of a function`);
				}
			}

			connections[eventName] = (event as RBXScriptSignal).Connect(finalStepSystems);
		}

		return connections;
	}

	/**
	 * 添加用户定义的中间件函数，在每帧期间调用。
	 *
	 * 这允许你在每帧之前和之后运行代码，执行初始化和清理工作。
	 *
	 * @param middleware - 中间件函数
	 */
	public addMiddleware(middleware: (nextFn: () => void, eventName: string) => () => void): void {
		this._middlewares.push(middleware);
	}

	// ==================== 私有方法 ====================

	private _sortSystems(): void {
		const systemsByEvent = new Map<string, Array<System<T>>>();
		this._systemSets.clear();

		for (const system of this._systems) {
			let eventName = "default";

			if (this.isBevySystemStruct(system)) {
				// Bevy: 优先使用 schedule 字段，否则使用 event
				if (system.schedule) {
					eventName = system.schedule;
				} else if (system.event) {
					eventName = system.event;
				}

				// Bevy: 记录系统集成员
				if (system.systemSet) {
					let setMembers = this._systemSets.get(system.systemSet);
					if (!setMembers) {
						setMembers = [];
						this._systemSets.set(system.systemSet, setMembers);
					}
					setMembers.push(system);
				}
			} else if (this.isSystemStruct(system)) {
				if (system.event) {
					eventName = system.event;
				}
			}

			// 验证依赖关系
			if (this.isSystemStruct(system) && system.after) {
				if (system.priority !== undefined) {
					error(`${this.getSystemName(system)} shouldn't have both priority and after defined`);
				}

				if (system.after.size() === 0) {
					error(
						`System "${this.getSystemName(system)}" "after" table was provided but is empty; did you accidentally use a nil value or make a typo?`,
					);
				}

				for (const dependency of system.after) {
					if (!this._systems.includes(dependency as any)) {
						error(
							`Unable to schedule "${this.getSystemName(system)}" because the system "${this.getSystemName(dependency as any)}" is not scheduled.\n\nEither schedule "${this.getSystemName(dependency as any)}" before "${this.getSystemName(system)}" or consider scheduling these systems together with scheduleSystems`,
						);
					}
				}
			}

			let eventSystems = systemsByEvent.get(eventName);
			if (!eventSystems) {
				eventSystems = [];
				systemsByEvent.set(eventName, eventSystems);
			}
			eventSystems.push(system);
		}

		this._orderedSystemsByEvent.clear();

		for (const [eventName, systems] of systemsByEvent) {
			this._orderedSystemsByEvent.set(eventName, this.orderSystemsByDependencies(systems));
		}
	}

	private orderSystemsByDependencies(unscheduledSystems: Array<System<T>>): Array<System<T>> {
		const systemPriorityMap = new Map<System<T>, number | "visiting">();

		const getSystemPriority = (system: System<T>): number => {
			const existingPriority = systemPriorityMap.get(system);

			if (existingPriority === undefined) {
				let priority = 0;
				systemPriorityMap.set(system, "visiting");

				if (this.isBevySystemStruct(system)) {
					// Bevy: 处理调度阶段的默认优先级
					if (system.schedule) {
						const schedulePriorities: Record<string, number> = {
							First: -1000,
							PreStartup: -900,
							Startup: -800,
							PostStartup: -700,
							PreUpdate: -600,
							Update: 0,
							PostUpdate: 600,
							Last: 1000,
						};
						priority = schedulePriorities[system.schedule] || 0;
					}

					if (system.after) {
						for (const dependency of system.after) {
							const depSystem = dependency as System<T>;
							if (systemPriorityMap.get(depSystem) === "visiting") {
								error(
									`Cyclic dependency detected: System '${this.getSystemName(system)}' is set to execute after System '${this.getSystemName(depSystem)}', and vice versa. This creates a loop that prevents the systems from being able to execute in a valid order.\nTo resolve this issue, reconsider the dependencies between these systems. One possible solution is to update the 'after' field from one of the systems.`,
								);
							}
							priority = math.max(priority, getSystemPriority(depSystem) + 1);
						}
					} else if (system.priority !== undefined) {
						priority = system.priority;
					}

					// Bevy: 处理系统集依赖
					if (system.afterSet) {
						const setMembers = this._systemSets.get(system.afterSet);
						if (setMembers) {
							for (const member of setMembers) {
								if (member !== system) {
									const memberPriority = getSystemPriority(member);
									priority = math.max(priority, memberPriority + 1);
								}
							}
						}
					}
				} else if (this.isSystemStruct(system)) {
					if (system.after) {
						for (const dependency of system.after) {
							const depSystem = dependency as System<T>;
							if (systemPriorityMap.get(depSystem) === "visiting") {
								error(
									`Cyclic dependency detected: System '${this.getSystemName(system)}' is set to execute after System '${this.getSystemName(depSystem)}', and vice versa.`,
								);
							}
							priority = math.max(priority, getSystemPriority(depSystem) + 1);
						}
					} else if (system.priority !== undefined) {
						priority = system.priority;
					}
				}

				systemPriorityMap.set(system, priority);
				return priority;
			} else if (existingPriority === "visiting") {
				error("Detected circular dependency in system scheduling");
			} else {
				return existingPriority;
			}
		};

		const scheduledSystems = [...unscheduledSystems];

		scheduledSystems.sort((a, b) => {
			const priorityA = getSystemPriority(a);
			const priorityB = getSystemPriority(b);

			if (priorityA === priorityB) {
				const nameA = this.getSystemName(a);
				const nameB = this.getSystemName(b);

				if (nameA === nameB) {
					return unscheduledSystems.indexOf(a) < unscheduledSystems.indexOf(b);
				}

				return nameA < nameB;
			}

			return priorityA < priorityB;
		});

		return scheduledSystems;
	}

	private handleSystemError(system: System<T>, errorValue: string, thread: thread): void {
		// 错误处理逻辑（简化版）
		const errorString = `${this.getSystemName(system)}: ${errorValue}\n${debug.traceback(thread)}`;
		task.spawn(error, errorString);

		if (this.trackErrors) {
			let errors = this._systemErrors.get(system);
			if (!errors) {
				errors = [];
				this._systemErrors.set(system, errors);
			}

			const lastError = errors[errors.size() - 1];
			if (lastError && lastError.error === errorString) {
				lastError.when = os.time();
			} else {
				errors.push({
					error: errorString,
					when: os.time(),
				});

				if (errors.size() > 100) {
					errors.remove(0);
				}
			}
		}
	}

	private isSystemStruct(system: System<T>): system is SystemStruct<T> {
		return typeIs(system, "table") && "system" in system;
	}

	private isBevySystemStruct(system: System<T>): system is BevySystemStruct<T> {
		return this.isSystemStruct(system) && ("schedule" in system || "runCondition" in system || "systemSet" in system);
	}

	private getSystemFn(system: System<T>): SystemFn<T> {
		if (typeIs(system, "function")) {
			return system;
		}
		return system.system;
	}

	/**
	 * Matter调试器期望的公共方法
	 */
	public systemName(system: System<T>): string {
		return this.getSystemName(system);
	}

	private getSystemName(system: System<T>): string {
		// 如果是 Bevy 系统且有原始函数，使用原始函数获取名称
		if (this.isBevySystemStruct(system) && system.originalSystem) {
			const fn = system.originalSystem;
			return `${debug.info(fn, "s")}->${debug.info(fn, "n")}`;
		}
		// 否则使用常规方式获取函数
		const fn = this.getSystemFn(system);
		return `${debug.info(fn, "s")}->${debug.info(fn, "n")}`;
	}
}