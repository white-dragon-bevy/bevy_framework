/**
 * RVOPlugin - RVO避障算法插件
 * 提供Reciprocal Velocity Obstacles算法的集成
 */

import { App } from "../bevy_app/app";
import { AppContext } from "../bevy_app/context";
import { MainScheduleLabel } from "../bevy_app/main-schedule";
import { Plugin } from "../bevy_app/plugin";
import { RunService } from "@rbxts/services";
import { Simulator } from "./simulator";
import { World } from "@rbxts/matter";
import {
	cleanupRemovedAgents,
	syncAgentPositions,
	syncFromSimulator,
	syncNewAgents,
	syncObstacles,
	updateAgentTargets,
} from "./systems";
import { RVOConfig, RVOResources, setRVOSimulator, setRVOConfig, getRVOSimulator } from "./resources";


/**
 * 默认RVO配置
 */
const DEFAULT_RVO_CONFIG: RVOConfig = {
	autoUpdate: true,
	defaultMaxNeighbors: 10,
	defaultMaxSpeed: 2.0,
	defaultNeighborDist: 80,
	defaultRadius: 5,
	defaultTimeHorizon: 100,
	defaultTimeHorizonObst: 1,
	timeStep: 0.25,
} as RVOConfig;

/**
 * RVO避障插件
 * 提供多代理避障算法的实现
 */
export class RVOPlugin implements Plugin {
	/**
	 * 插件配置
	 */
	private config: RVOConfig;

	/**
	 * 创建RVO插件
	 * @param config - 插件配置（可选）
	 */
	public constructor(config?: Partial<RVOConfig>) {
		this.config = { ...DEFAULT_RVO_CONFIG, ...config };
	}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	public build(app: App): void {
		const world = app.getWorld();

		// 创建并配置仿真器
		const simulator = new Simulator();
		simulator.setTimeStep(this.config.timeStep);

		// 设置默认代理配置
		simulator.setAgentDefaults(
			this.config.defaultNeighborDist,
			this.config.defaultMaxNeighbors,
			this.config.defaultTimeHorizon,
			this.config.defaultTimeHorizonObst,
			this.config.defaultRadius,
			this.config.defaultMaxSpeed,
		);

		// 存储资源到World
		this.storeRVOResources(world, simulator);

		// 添加RVO系统
		if (this.config.autoUpdate) {
			// PreUpdate: 同步实体到仿真器
			app.addSystems(MainScheduleLabel.PRE_UPDATE, [
				syncNewAgents,
				syncObstacles,
				syncAgentPositions,
				updateAgentTargets,
			]);

			// Update: 运行RVO仿真
			app.addSystems(MainScheduleLabel.UPDATE, this.createUpdateSystem());

			// PostUpdate: 从仿真器同步回ECS
			app.addSystems(MainScheduleLabel.POST_UPDATE, [
				syncFromSimulator,
				cleanupRemovedAgents,
			]);
		}

		// 添加调试系统（仅在开发模式）
		if (RunService.IsStudio()) {
			app.addSystems(MainScheduleLabel.POST_UPDATE, this.createDebugSystem());
		}
	}

	/**
	 * 获取插件名称
	 * @returns 插件名称
	 */
	public name(): string {
		return "RVOPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns 总是返回true，RVO插件只能添加一次
	 */
	public isUnique(): boolean {
		return true;
	}

	/**
	 * 存储RVO资源到World
	 * @param world - World实例
	 * @param simulator - 仿真器实例
	 */
	private storeRVOResources(world: World, simulator: Simulator): void {
		setRVOSimulator(world, simulator);
		setRVOConfig(world, this.config);
	}

	/**
	 * 创建更新系统
	 * @returns 更新系统函数
	 */
	private createUpdateSystem(): (world: World, context: AppContext) => void {
		return (world: World, context: AppContext) => {
			const simulator = this.getSimulator(world);
			if (!simulator) return;

			// 运行一个仿真步骤
			simulator.run();
		};
	}

	/**
	 * 创建调试系统
	 * @returns 调试系统函数
	 */
	private createDebugSystem(): (world: World, context: AppContext) => void {
		return (world: World, context: AppContext) => {
			const simulator = this.getSimulator(world);
			if (!simulator) return;

			// 输出调试信息
			if (simulator.getNumAgents() > 0) {
				print(`[RVO Debug] Agents: ${simulator.getNumAgents()}, Time: ${simulator.getGlobalTime()}`);
			}
		};
	}

	/**
	 * 从World获取仿真器
	 * @param world - World实例
	 * @returns 仿真器实例
	 */
	private getSimulator(world: World): Simulator | undefined {
		return getRVOSimulator(world);
	}
}

// 从resources模块导出的函数，保持向后兼容
export { getRVOSimulator, getRVOConfig, RVOConfig } from "./resources";