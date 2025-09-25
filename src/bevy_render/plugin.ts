/**
 * RenderPlugin - Roblox 渲染系统插件
 * 提供基础的渲染功能，包括可见性管理和 Transform 同步
 */

import { Plugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import { BuiltinSchedules } from "../bevy_app/main-schedule";
// import { TransformSystems } from "../bevy_transform/src";
import { visibilitySystem, robloxSyncSystem, cleanupRemovedEntities } from "./systems";
import { BevyWorld } from "../bevy_ecs/bevy-world";
import { Context } from "../bevy_ecs/types";

/**
 * 渲染系统集枚举
 */
export enum RenderSystems {
	/** 可见性计算 */
	Visibility = "RenderVisibility",
	/** Roblox 实例同步 */
	Sync = "RenderSync",
	/** 清理系统 */
	Cleanup = "RenderCleanup",
}

/**
 * Roblox 渲染插件
 * 负责管理对象的可见性和位置同步
 */
export class RenderPlugin implements Plugin {
	/**
	 * 配置应用程序
	 * @param app - Bevy App 实例
	 */
	build(app: App): void {
		// 定义渲染系统组合
		const renderUpdateSystem = (world: BevyWorld, context: Context) => {
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
		const renderStartupSystem = (world: BevyWorld, context: Context) => {
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
	 * 插件名称
	 * @returns 插件的唯一名称
	 */
	name(): string {
		return "RenderPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns true 表示只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}
}

/**
 * 创建 RenderPlugin 实例的辅助函数
 * @returns 新的 RenderPlugin 实例
 */
export function createRenderPlugin(): RenderPlugin {
	return new RenderPlugin();
}