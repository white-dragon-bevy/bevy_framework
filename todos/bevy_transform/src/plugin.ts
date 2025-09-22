/**
 * TransformPlugin - Transform 系统的 Bevy 插件
 * 负责注册和调度 Transform 相关的系统
 */

import { Plugin } from "../../bevy_app/plugin";
import { App } from "../../bevy_app/app";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { World } from "@rbxts/matter";
import { markDirtyTrees, propagateParentTransforms, syncSimpleTransforms, ensureGlobalTransforms } from "./systems";

/**
 * Transform 系统集枚举
 */
export enum TransformSystems {
	/** 传播变换的系统集 */
	Propagate = "TransformPropagate",
}

/**
 * Transform 插件
 * 处理 Transform 和 GlobalTransform 组件的自动更新
 */
export class TransformPlugin implements Plugin {
	/**
	 * 配置应用程序
	 * @param app - Bevy App 实例
	 */
	build(app: App): void {
		// 在 PostStartup 阶段运行，确保第一次更新是正确的
		app.addSystems(
			BuiltinSchedules.PostStartup,
			(world: World, deltaTime?: number) => {
				ensureGlobalTransforms(world);
				markDirtyTrees(world);
				propagateParentTransforms(world);
				syncSimpleTransforms(world);
			},
		);

		// 在 PostUpdate 阶段运行，处理每帧的变换更新
		app.addSystems(
			BuiltinSchedules.PostUpdate,
			(world: World, deltaTime?: number) => {
				markDirtyTrees(world);
				propagateParentTransforms(world);
				syncSimpleTransforms(world);
			},
		);
	}

	/**
	 * 插件名称
	 * @returns 插件的唯一名称
	 */
	name(): string {
		return "TransformPlugin";
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
 * 创建 TransformPlugin 实例的辅助函数
 * @returns 新的 TransformPlugin 实例
 */
export function createTransformPlugin(): TransformPlugin {
	return new TransformPlugin();
}