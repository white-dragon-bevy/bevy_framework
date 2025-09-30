/**
 * @fileoverview Bevy ECS Loop 实现
 * 基于 Matter 框架的系统循环管理器，处理系统调度和执行
 */

import { RunService } from "@rbxts/services";
import type { World } from "@rbxts/matter";

// Import Matter's topological runtime for proper hook support
import { start as topoStart } from "@rbxts/matter/lib/topoRuntime";

// Declare Lua functions for direct table access
declare function rawget<T>(table: unknown, key: unknown): T | undefined;

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
	/** 是否只运行一次（用于启动调度） */
	once?: boolean;
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
	private _bevyScheduleMap?: { [schedule: string]: RBXScriptSignal };
	public _debugger?: unknown; // Matter debugger instance

	// 用于 step 方法的状态跟踪
	private _lastStepTime?: number;
	private _generation: boolean = false;
	// 记录已经执行过的一次性系统
	private readonly _executedOnceSystems: Set<System<T>> = new Set();

	// 使用普通对象而不是 Map，以兼容 Matter 调试器
	public profiling: unknown;
	public trackErrors = false;
	public silentErrors = false;

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
	 * 调度一组系统。
	 *
	 * 重要：系统应该已经按照执行顺序预先排序。
	 * 这个方法不再执行复杂的排序算法，而是直接按事件分组系统。
	 *
	 * @param systems - 要调度的系统数组（已排序）
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

		this._groupSystemsByEvent();
	}

	/**
	 * 调度单个系统。
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

		this._groupSystemsByEvent();
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
		this._systemState.delete(oldSystem);
		this._systemState.set(newSystem, oldState);

		const wasSkipped = this._skipSystems.get(oldSystem);
		if (wasSkipped) {
			this._skipSystems.delete(oldSystem);
			this._skipSystems.set(newSystem, true);
		}

		this._groupSystemsByEvent();
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

			const stepSystems = () => {
				const currentTime = os.clock();
				const deltaTime = currentTime - lastTime;
				lastTime = currentTime;

				// 使用 step 方法执行系统
				this.step(eventNameStr, deltaTime);
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

	/**
	 * 手动执行一帧的系统更新
	 * 这是核心方法，可以被事件驱动的 begin() 调用，也可以被手动调用（如单元测试）
	 *
	 * @param eventName - 要执行的事件名称，默认为 "default"
	 * @param deltaTime - 可选的 deltaTime，如果不提供则自动计算
	 */
	public step(eventName: string = "default", deltaTime?: number): void {
		const orderedSystems = this._orderedSystemsByEvent.get(eventName);
		if (!orderedSystems || orderedSystems.size() === 0) {
			// 没有系统需要执行
			return;
		}

		// 计算 deltaTime
		const currentTime = os.clock();
		const calculatedDeltaTime = deltaTime !== undefined ? deltaTime :
			(this._lastStepTime !== undefined ? currentTime - this._lastStepTime : 1/60);
		this._lastStepTime = currentTime;

		// 切换 generation
		this._generation = !this._generation;

		// Create an empty object for Matter compatibility
		const dirtyWorlds = {} as any;

		// 执行系统
		for (const system of orderedSystems) {
			this._executeSystem(system, calculatedDeltaTime, this._generation, dirtyWorlds);
		}
	}

	// ==================== 私有方法 ====================

	/**
	 * 执行单个系统
	 */
	private _executeSystem(
		system: System<T>,
		deltaTime: number,
		generation: boolean,
		dirtyWorlds: any
	): void {
		// 检查是否跳过
		if (this._skipSystems.get(system)) {
			if (this.profiling !== undefined) {
				rawset(this.profiling, system, undefined);
			}
			return;
		}

		// 检查是否是一次性系统且已执行过
		if (this.isBevySystemStruct(system) && system.once) {
			if (this._executedOnceSystems.has(system)) {
				if (this.profiling !== undefined) {
					rawset(this.profiling, system, undefined);
				}
				return;
			}
		}

		// Bevy: 检查运行条件
		if (this.isBevySystemStruct(system) && system.runCondition) {
			const shouldRun = system.runCondition(...this._state);
			if (!shouldRun) {
				if (this.profiling !== undefined) {
					rawset(this.profiling, system, undefined);
				}
				return;
			}
		}

		// Bevy: 检查应用状态条件
		if (this.isBevySystemStruct(system) && system.state) {
			const world = this._state[0] as unknown;
			const currentState = (world as { currentAppState?: string })?.currentAppState;
			if (currentState !== system.state) {
				if (this.profiling !== undefined) {
					rawset(this.profiling, system, undefined);
				}
				return;
			}
		}

		const fn = this.getSystemFn(system);
		const systemNameStr = this.getSystemName(system);

		debug.profilebegin(
			`system: ${this.isBevySystemStruct(system) && system.exclusive ? "[Exclusive] " : ""}${systemNameStr}`,
		);

		const startTime = os.clock();
		let success: boolean;
		let errorValue: unknown;

		// Run system within topological context
		try {
			// Get or create system state for hook storage
			let systemState = this._systemState.get(system);
			if (!systemState) {
				systemState = {};
				this._systemState.set(system, systemState);
			}

			// Use Matter's topological runtime to execute the system
			const node = {
				frame: {
					generation: generation,
					deltaTime: deltaTime,
					dirtyWorlds: dirtyWorlds,
				},
				currentSystem: system as any,
				system: systemState as any,
			};

			topoStart(node, () => {
				fn(...this._state);
			});

			success = true;

			// 如果是一次性系统且成功执行，记录它
			if (this.isBevySystemStruct(system) && system.once) {
				this._executedOnceSystems.add(system);
			}
		} catch (err) {
			success = false;
			errorValue = err;
		}

		// 更新性能分析数据
		if (this.profiling !== undefined) {
			const duration = os.clock() - startTime;

			let profilingData = rawget<number[] & { index?: number }>(this.profiling, system);
			if (!profilingData) {
				profilingData = [] as number[] & { index?: number };
				rawset(this.profiling, system, profilingData);
			}

			// 实现滚动平均
			const MAX_SAMPLES = 60;
			const currentIndex = (profilingData.index || 1) - 1;
			profilingData[currentIndex] = duration;
			profilingData.index = ((currentIndex + 1) % MAX_SAMPLES) + 1;
		}

		if (!success) {
			this.handleSystemError(system, errorValue as string);
		}

		debug.profileend();
	}

	/**
	 * 按事件分组系统（不执行排序）
	 * 假设传入的系统已经按正确顺序排列
	 */
	private _groupSystemsByEvent(): void {
		this._orderedSystemsByEvent.clear();

		for (const system of this._systems) {
			let eventName = "default";

			if (this.isBevySystemStruct(system)) {
				// Bevy: 优先使用 schedule 字段，否则使用 event
				if (system.schedule) {
					eventName = system.schedule;
				} else if (system.event) {
					eventName = system.event;
				}
			} else if (this.isSystemStruct(system)) {
				if (system.event) {
					eventName = system.event;
				}
			}

			let eventSystems = this._orderedSystemsByEvent.get(eventName);
			if (!eventSystems) {
				eventSystems = [];
				this._orderedSystemsByEvent.set(eventName, eventSystems);
			}
			eventSystems.push(system);
		}
	}

	private handleSystemError(system: System<T>, errorValue: string): void {
		const errorString = `${this.getSystemName(system)}: ${errorValue}\n${debug.traceback()}`;

		if (this.trackErrors) {
			// When tracking errors, log but don't throw
			if (!this.silentErrors) {
				warn(errorString);
			}

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
		} else {
			// When not tracking errors, throw immediately (unless silentErrors is enabled)
			if (!this.silentErrors) {
				task.spawn(error, errorString);
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