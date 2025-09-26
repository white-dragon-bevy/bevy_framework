/**
 * 帧计数诊断插件
 * 对应 Rust bevy_diagnostic 的 frame_count_diagnostics_plugin.rs
 */

import { Plugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { World } from "@rbxts/matter";
import { Last } from "../../src/bevy_app/main-schedule";
import { Resource } from "../../src/bevy_ecs/resource";
import { Context } from "../bevy_ecs";

/**
 * 维护从应用启动以来渲染的帧数
 * 对应 Rust FrameCount
 *
 * FrameCount 在 Last 阶段递增，提供可预测的行为：
 * 第一次更新时为 0，下一次为 1，依此类推
 *
 * 溢出：
 * FrameCount 在超过 2^32-1 后会回绕到 0
 * 可以利用回绕算术来确定两次观察之间经过的帧数
 */
export class FrameCount implements Resource {
	readonly __brand = "Resource" as const;
	/** 帧计数值 */
	value: number = 0;

	constructor(value: number = 0) {
		// 确保初始值也符合32位无符号整数约束
		const MAX_U32 = 0xffffffff;
		this.value = value & MAX_U32;
	}
}

/**
 * 为应用添加帧计数功能
 * 对应 Rust FrameCountPlugin
 */
export class FrameCountPlugin implements Plugin {
	/**
	 * 配置应用
	 * @param app - 应用实例
	 */
	build(app: App): void {
		// 直接插入资源实例，使用类构造函数作为标识
		const frameCount = new FrameCount();
		app.main()
			.getResourceManager()
			.insertResource(frameCount);
		app.addSystems(Last, updateFrameCount);
	}

	/**
	 * 插件名称
	 * @returns 插件名称字符串
	 */
	name(): string {
		return "FrameCountPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns true表示只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}
}

/**
 * 用于递增 FrameCount 的系统（带回绕加法）
 * 对应 Rust update_frame_count
 * @param world - ECS世界
 * @param context - 系统上下文
 */
export function updateFrameCount(world: World, context: Context): void {
	const resources = context.resources;
	if (!resources) {
		return;
	}
	const frameCount = resources.getResource<FrameCount>();
	if (frameCount) {
		// 使用位运算确保32位无符号整数的回绕行为
		const MAX_U32 = 0xffffffff;
		frameCount.value = (frameCount.value + 1) & MAX_U32;
	}
}
