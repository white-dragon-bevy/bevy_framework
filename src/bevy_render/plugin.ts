/**
 * RenderPlugin - Roblox 渲染系统插件
 * 提供基础的渲染功能，包括可见性管理和 Transform 同步
 */

import { Plugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
// import { TransformSystems } from "../bevy_transform/src";
import { visibilitySystem, robloxSyncSystem, cleanupRemovedEntities } from "./systems";
import { World } from "../bevy_ecs/bevy-world";
import { Context } from "../bevy_ecs";

/**
 * 渲染系统集枚举
 * 定义渲染模块中各个系统的唯一标识符
 */
export enum RenderSystems {
	/** 可见性计算系统 */
	Visibility = "RenderVisibility",
	/** Roblox 实例同步系统 */
	Sync = "RenderSync",
	/** 清理系统 */
	Cleanup = "RenderCleanup",
}

/**
 * Roblox 渲染插件
 * 负责管理 ECS 实体与 Roblox 实例之间的同步，包括：
 * - 可见性管理（显示/隐藏）
 * - Transform 数据同步（位置、旋转、缩放）
 * - 已删除实体的清理
 * 系统在 Startup 和 PostUpdate 阶段运行
 */
export class RenderPlugin implements Plugin {
	/**
	 * 构建渲染插件，向应用程序添加渲染系统
	 * 在 Startup 阶段执行初始同步
	 * 在 PostUpdate 阶段持续更新（在 Transform 系统之后）
	 * @param app - Bevy App 实例
	 */
	build(app: App): void {
		// 定义渲染系统组合
		const renderUpdateSystem = (world: World, context: Context) => {
			// 1. 计算可见性
			visibilitySystem(world);

			// 2. 同步 Transform 到 Roblox 实例
			robloxSyncSystem(world);

			// 3. 清理已删除的实体
			cleanupRemovedEntities(world);
		};

		// 在 PostUpdate 阶段运行，确保在 Transform 系统之后
		app.editSchedule(BuiltinSchedules.POST_UPDATE, (schedule) => {
			schedule.addSystem({
				system: renderUpdateSystem,
				name: "RenderUpdateSystem",
				// 确保在 Transform 系统之后运行
				// after: [TransformSystems.Propagate],
			});
		});

		// 启动时的初始化系统
		const renderStartupSystem = (world: World, context: Context) => {
			// 初始化可见性
			visibilitySystem(world);
			// 初始同步
			robloxSyncSystem(world);
		};

		// 在 Startup 阶段运行一次
		app.editSchedule(BuiltinSchedules.STARTUP, (schedule) => {
			schedule.addSystem({
				system: renderStartupSystem,
				name: "RenderStartupSystem",
			});
		});
	}

	/**
	 * 获取插件的唯一标识名称
	 * @returns 插件名称字符串
	 */
	name(): string {
		return "RenderPlugin";
	}

	/**
	 * 检查插件是否为唯一插件
	 * RenderPlugin 是唯一插件，一个应用程序中只能添加一次
	 * @returns true 表示该插件只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}
}

/**
 * 创建 RenderPlugin 实例的工厂函数
 * 提供便捷的方式创建渲染插件，用于添加到 App
 * @returns 新的 RenderPlugin 实例
 * @example
 * ```ts
 * const app = new App();
 * app.addPlugin(createRenderPlugin());
 * ```
 */
export function createRenderPlugin(): RenderPlugin {
	return new RenderPlugin();
}
