/**
 * 状态系统插件
 * 集成到 Bevy 应用程序
 */

import type { App, Plugin } from "../../src/bevy_app";
import type { World } from "@rbxts/matter";
import { State, NextState } from "./state";
import { StateManager } from "./state-manager";
import { StateEventManager } from "./events";
import { TransitionScheduler, TransitionValidator } from "./transitions";
import type { StateConfig, StateDefinition } from "./types";

/**
 * 状态插件配置
 */
export interface StatePluginConfig<T extends string> {
	/** 状态类型名称 */
	name: string;
	/** 初始状态 */
	initial: T;
	/** 状态定义 */
	states?: Map<T, StateDefinition<T>>;
	/** 是否启用调试 */
	debug?: boolean;
	/** 是否启用验证 */
	validation?: boolean;
	/** 允许的转换 */
	allowedTransitions?: Array<[T, T]>;
	/** 禁止的转换 */
	forbiddenTransitions?: Array<[T, T]>;
}

/**
 * 状态系统插件
 */
export class StatePlugin<T extends string> implements Plugin {
	private config: StatePluginConfig<T>;
	private manager?: StateManager<T>;
	private eventManager?: StateEventManager<T>;
	private scheduler?: TransitionScheduler<T>;
	private validator?: TransitionValidator<T>;

	constructor(config: StatePluginConfig<T>) {
		this.config = config;
	}

	/**
	 * 插件名称
	 */
	name(): string {
		return `StatePlugin(${this.config.name})`;
	}

	/**
	 * 插件是否唯一
	 */
	isUnique(): boolean {
		return false; // 允许多个不同状态类型的插件
	}

	/**
	 * 构建插件
	 */
	build(app: App): void {
		// 创建管理器
		this.manager = new StateManager<T>(this.config.debug);
		this.eventManager = new StateEventManager<T>();
		this.scheduler = new TransitionScheduler<T>();

		// 设置验证器
		if (this.config.validation) {
			this.validator = new TransitionValidator<T>();
			if (this.config.allowedTransitions) {
				this.validator.allowMany(this.config.allowedTransitions);
			}
			if (this.config.forbiddenTransitions) {
				this.validator.forbidMany(this.config.forbiddenTransitions);
			}

			// 添加验证拦截器
			this.scheduler.addInterceptor((transition) => {
				return this.validator!.isValid(transition.from, transition.to);
			});
		}

		// 注册状态定义
		if (this.config.states) {
			this.manager.addStates(this.config.states);
		}

		// 添加资源
		app.insertResource(`State_${this.config.name}`, new State(this.config.initial));
		app.insertResource(`NextState_${this.config.name}`, new NextState<T>());
		app.insertResource(`StateManager_${this.config.name}`, this.manager);
		app.insertResource(`StateEventManager_${this.config.name}`, this.eventManager);

		// 添加系统
		app.addSystems("Update", (world: World) => this.updateStateSystem(world));
		app.addSystems("PostUpdate", (world: World) => this.processEventsSystem(world));

		if (this.config.debug) {
			print(`[StatePlugin] Initialized state system: ${this.config.name}`);
		}
	}

	/**
	 * 更新状态系统
	 */
	private updateStateSystem(world: World): void {
		if (!this.manager) return;

		// 处理排队的转换
		const scheduler = this.scheduler;
		if (scheduler && scheduler.hasPendingTransitions()) {
			const state = world.get(`State_${this.config.name}`) as State<T>;
			const transition = scheduler.processNext(world, state);

			if (transition) {
				const nextState = world.get(`NextState_${this.config.name}`) as NextState<T>;
				nextState.set(transition.to);
			}
		}

		// 更新状态管理器
		this.manager.update(world, 0);
	}

	/**
	 * 处理事件系统
	 */
	private processEventsSystem(world: World): void {
		if (!this.eventManager) return;
		this.eventManager.processEvents(world);
	}

	/**
	 * 获取状态管理器
	 */
	getManager(): StateManager<T> | undefined {
		return this.manager;
	}

	/**
	 * 获取事件管理器
	 */
	getEventManager(): StateEventManager<T> | undefined {
		return this.eventManager;
	}
}

/**
 * 创建状态插件的辅助函数
 */
export function createStatePlugin<T extends string>(
	name: string,
	initial: T,
	states?: Map<T, StateDefinition<T>>,
): StatePlugin<T> {
	return new StatePlugin({
		name,
		initial,
		states,
	});
}

/**
 * 游戏状态插件预设
 */
export class GameStatePlugin implements Plugin {
	/**
	 * 插件名称
	 */
	name(): string {
		return "GameStatePlugin";
	}

	/**
	 * 插件是否唯一
	 */
	isUnique(): boolean {
		return true;
	}

	build(app: App): void {
		type GameState = "MainMenu" | "Playing" | "Paused" | "GameOver";

		const states = new Map<GameState, StateDefinition<GameState>>();

		states.set("MainMenu", {
			onEnter: (world) => {
				print("[GameState] Entered Main Menu");
			},
			transitions: new Map([
				[
					"Playing",
					(world) => {
						// 检查是否可以开始游戏
						return true;
					},
				],
			]),
		});

		states.set("Playing", {
			onEnter: (world) => {
				print("[GameState] Started Playing");
			},
			onUpdate: (world) => {
				// 游戏逻辑更新
			},
			transitions: new Map([
				[
					"Paused",
					(world) => {
						// 检查暂停输入
						return false;
					},
				],
				[
					"GameOver",
					(world) => {
						// 检查游戏结束条件
						return false;
					},
				],
			]),
		});

		states.set("Paused", {
			onEnter: (world) => {
				print("[GameState] Game Paused");
			},
			transitions: new Map([
				[
					"Playing",
					(world) => {
						// 检查恢复输入
						return false;
					},
				],
				[
					"MainMenu",
					(world) => {
						// 检查返回主菜单输入
						return false;
					},
				],
			]),
		});

		states.set("GameOver", {
			onEnter: (world) => {
				print("[GameState] Game Over");
			},
			transitions: new Map([
				[
					"MainMenu",
					(world) => {
						// 检查重新开始输入
						return false;
					},
				],
			]),
		});

		const plugin = new StatePlugin<GameState>({
			name: "GameState",
			initial: "MainMenu",
			states,
			debug: true,
			validation: true,
			allowedTransitions: [
				["MainMenu", "Playing"],
				["Playing", "Paused"],
				["Playing", "GameOver"],
				["Paused", "Playing"],
				["Paused", "MainMenu"],
				["GameOver", "MainMenu"],
			],
		});

		plugin.build(app);
	}
}

/**
 * 应用状态插件预设
 */
export class AppStatePlugin implements Plugin {
	/**
	 * 插件名称
	 */
	name(): string {
		return "AppStatePlugin";
	}

	/**
	 * 插件是否唯一
	 */
	isUnique(): boolean {
		return true;
	}

	build(app: App): void {
		type AppState = "Loading" | "Ready" | "Running" | "Error";

		const states = new Map<AppState, StateDefinition<AppState>>();

		states.set("Loading", {
			onEnter: (world) => {
				print("[AppState] Loading resources...");
			},
			onUpdate: (world) => {
				// 检查加载进度
			},
		});

		states.set("Ready", {
			onEnter: (world) => {
				print("[AppState] Application ready");
			},
		});

		states.set("Running", {
			onEnter: (world) => {
				print("[AppState] Application running");
			},
			onUpdate: (world) => {
				// 主要应用逻辑
			},
		});

		states.set("Error", {
			onEnter: (world) => {
				print("[AppState] Error occurred");
			},
		});

		const plugin = new StatePlugin<AppState>({
			name: "AppState",
			initial: "Loading",
			states,
			debug: true,
		});

		plugin.build(app);
	}
}

/**
 * 状态插件扩展方法
 */
export interface StatePluginExtensions {
	/**
	 * 添加状态系统
	 */
	addStateSystem<T extends string>(config: StatePluginConfig<T>): void;

	/**
	 * 获取状态
	 */
	getState<T extends string>(name: string): State<T> | undefined;

	/**
	 * 设置下一个状态
	 */
	setNextState<T extends string>(name: string, state: T): void;

	/**
	 * 添加游戏状态系统
	 */
	addGameStateSystem(): void;

	/**
	 * 添加应用状态系统
	 */
	addAppStateSystem(): void;
}

/**
 * 扩展 App 类型以支持状态系统
 */
declare module "../bevy_app" {
	interface App extends StatePluginExtensions {}
}

/**
 * 实现状态插件扩展
 */
export function implementStateExtensions(app: App): void {
	const extensions: StatePluginExtensions = {
		addStateSystem<T extends string>(config: StatePluginConfig<T>) {
			const plugin = new StatePlugin(config);
			app.addPlugin(plugin);
		},

		getState<T extends string>(name: string): State<T> | undefined {
			return app.world.get(`State_${name}`) as State<T> | undefined;
		},

		setNextState<T extends string>(name: string, state: T) {
			const nextState = app.world.get(`NextState_${name}`) as NextState<T> | undefined;
			if (nextState) {
				nextState.set(state);
			}
		},

		addGameStateSystem() {
			app.addPlugin(new GameStatePlugin());
		},

		addAppStateSystem() {
			app.addPlugin(new AppStatePlugin());
		},
	};

	// 将扩展方法添加到 app
	for (const [key, value] of pairs(extensions)) {
		(app as unknown)[key] = value;
	}
}
