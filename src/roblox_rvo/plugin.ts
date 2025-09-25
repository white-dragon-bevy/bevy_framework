/**
 * RVOPlugin - RVO2 碰撞避免算法的 Bevy 插件实现
 * 提供多智能体导航和碰撞避免功能
 */

import { Plugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
import { RVOConfig } from "./resources/rvo-config";
import { RVOSimulatorResource } from "./resources/rvo-simulator";
import {
	initRVOSystem,
	syncTransformToRVO,
	simulateRVO,
	updateTransformFromRVO,
	cleanupRVOSystem,
} from "./systems";
import {
	CollisionAvoidanceEvent,
	GoalReachedEvent,
	ObstacleNearbyEvent,
	VelocityChangedEvent,
} from "./events/rvo-events";

/**
 * RVO 插件配置
 */
export type RVOPluginConfig = Partial<RVOConfig>;

/**
 * RVO 插件
 * 处理多智能体碰撞避免和路径规划
 */
export class RVOPlugin implements Plugin {
	/** 插件配置 */
	private readonly config?: RVOPluginConfig;

	/**
	 * 创建 RVO 插件
	 * @param config - 插件配置
	 */
	constructor(config?: RVOPluginConfig) {
		this.config = config;
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	build(app: App): void {
		// 1. 注册资源
		this.registerResources(app);

		// 2. 注册事件
		this.registerEvents(app);

		// 3. 添加系统
		this.addSystems(app);

		print("[RVOPlugin] Built successfully");
	}

	/**
	 * 完成插件构建
	 * @param app - 应用实例
	 */
	finish(app: App): void {
		// 插件初始化完成后的操作
		print("[RVOPlugin] Finished initialization");
	}

	/**
	 * 清理插件
	 * @param app - 应用实例
	 */
	cleanup(app: App): void {
		// 执行清理系统
		const world = app.getWorld();
		const context = app.main().getContext();
		cleanupRVOSystem(world, context);
		print("[RVOPlugin] Cleaned up");
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	name(): string {
		return "RVOPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns true 表示只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}

	/**
	 * 注册资源
	 * @param app - 应用实例
	 */
	private registerResources(app: App): void {
		// 注册配置资源
		const rvoConfig = new RVOConfig(this.config);
		app.insertResource(RVOConfig, rvoConfig);

		// 注册模拟器资源
		const simulatorResource = new RVOSimulatorResource();
		app.insertResource(RVOSimulatorResource, simulatorResource);

		print(`[RVOPlugin] Resources registered - maxAgents: ${rvoConfig.maxAgents}, timeStep: ${rvoConfig.timeStep}`);
	}

	/**
	 * 注册事件
	 * @param app - 应用实例
	 */
	private registerEvents(app: App): void {
		// TODO: 事件系统尚未完全实现
		// 注册碰撞避免事件
		// app.addEvent<CollisionAvoidanceEvent>();

		// 注册目标到达事件
		// app.addEvent<GoalReachedEvent>();

		// 注册障碍物接近事件
		// app.addEvent<ObstacleNearbyEvent>();

		// 注册速度变化事件
		// app.addEvent<VelocityChangedEvent>();

		print("[RVOPlugin] Events system not yet implemented");
	}

	/**
	 * 添加系统
	 * @param app - 应用实例
	 */
	private addSystems(app: App): void {
		// Startup: 初始化系统
		app.editSchedule(BuiltinSchedules.Startup, (schedule) => {
			schedule.addSystem({
				system: initRVOSystem,
				name: "initRVOSystem",
			});
		});

		// PreUpdate: 同步 Transform 到 RVO
		app.editSchedule(BuiltinSchedules.PreUpdate, (schedule) => {
			schedule.addSystem({
				system: syncTransformToRVO,
				name: "syncTransformToRVO",
			});
		});

		// Update: 执行 RVO 模拟
		app.editSchedule(BuiltinSchedules.Update, (schedule) => {
			schedule.addSystem({
				system: simulateRVO,
				name: "simulateRVO",
			});
		});

		// PostUpdate: 更新 Transform
		app.editSchedule(BuiltinSchedules.PostUpdate, (schedule) => {
			schedule.addSystem({
				system: updateTransformFromRVO,
				name: "updateTransformFromRVO",
			});
		});

		print("[RVOPlugin] Systems added to schedules");
	}

	/**
	 * 创建默认配置的 RVO 插件
	 * @returns RVO 插件实例
	 */
	static default(): RVOPlugin {
		return new RVOPlugin();
	}

	/**
	 * 创建高性能配置的 RVO 插件
	 * @returns RVO 插件实例
	 */
	static performance(): RVOPlugin {
		return new RVOPlugin({
			maxNeighbors: 5,
			neighborDist: 10,
			timeHorizon: 5,
			timeHorizonObst: 5,
			kdTreeMaxLeafSize: 500,
		});
	}

	/**
	 * 创建高质量配置的 RVO 插件
	 * @returns RVO 插件实例
	 */
	static quality(): RVOPlugin {
		return new RVOPlugin({
			maxNeighbors: 20,
			neighborDist: 20,
			timeHorizon: 15,
			timeHorizonObst: 15,
			kdTreeMaxLeafSize: 2000,
		});
	}

	/**
	 * 创建调试配置的 RVO 插件
	 * @returns RVO 插件实例
	 */
	static debug(): RVOPlugin {
		return new RVOPlugin({
			debugDraw: true,
			autoSimulate: true,
		});
	}
}