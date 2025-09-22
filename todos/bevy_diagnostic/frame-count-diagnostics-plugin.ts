/**
 * 帧计数诊断插件
 * 对应 Rust bevy_diagnostic 的 frame_count_diagnostics_plugin.rs
 */

import { Plugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { World } from "@rbxts/matter";
import { Last } from "../../src/bevy_app/main-schedule";

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
export class FrameCount {
	/** 帧计数值 */
	value: number = 0;

	constructor(value: number = 0) {
		this.value = value;
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
		app.initResource(() => new FrameCount());
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
 */
export function updateFrameCount(world: World): void {
	const [frameCount] = world.get(FrameCount);
	if (frameCount) {
		frameCount.value = (frameCount.value + 1) % (2 ** 32);
	}
}