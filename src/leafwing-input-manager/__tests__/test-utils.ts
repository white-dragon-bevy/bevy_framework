/**
 * 测试工具函数模块
 * 提供创建测试环境所需的辅助函数
 */

import { World } from "@rbxts/matter";
import { App } from "../../bevy_app/app";
import { CentralInputStore } from "../user-input/central-input-store";
import { ClashStrategyResource } from "../clashing-inputs/clash-strategy";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";

/**
 * 创建用于测试的 App 实例
 * 预配置必要的插件和资源
 * @returns 配置好的 App 实例
 */
export function createTestApp(): App {
	const app = App.create();

	// 插入测试所需的基础资源
	app.insertResource(new CentralInputStore());
	app.insertResource(new ClashStrategyResource());

	// 禁用错误输出以避免测试时的噪音
	app.setSilentErrors(true);

	return app;
}

/**
 * 推进一帧,更新所有系统
 * @param app - App 实例
 * @param deltaTime - 帧间隔时间(秒),默认为 1/60 秒
 */
export function advanceFrame(app: App, deltaTime?: number): void {
	const actualDeltaTime = deltaTime ?? 1 / 60;

	// 执行一次更新
	app.update();
}

/**
 * 创建测试用的 World 实例
 * @returns 新的 Matter World 实例
 */
export function createTestWorld(): World {
	return new World();
}

/**
 * 推进多帧
 * @param app - App 实例
 * @param frameCount - 要推进的帧数
 * @param deltaTime - 每帧的时间间隔(秒),默认为 1/60 秒
 */
export function advanceFrames(app: App, frameCount: number, deltaTime?: number): void {
	for (let frameIndex = 0; frameIndex < frameCount; frameIndex++) {
		advanceFrame(app, deltaTime);
	}
}

/**
 * 运行启动调度
 * 执行 PreStartup, Startup, PostStartup 调度
 * @param app - App 实例
 */
export function runStartupSchedules(app: App): void {
	app.runSchedule(BuiltinSchedules.PRE_STARTUP);
	app.runSchedule(BuiltinSchedules.STARTUP);
	app.runSchedule(BuiltinSchedules.POST_STARTUP);
}

/**
 * 运行更新调度
 * 执行 PreUpdate, Update, PostUpdate 调度
 * @param app - App 实例
 */
export function runUpdateSchedules(app: App): void {
	app.runSchedule(BuiltinSchedules.PRE_UPDATE);
	app.runSchedule(BuiltinSchedules.UPDATE);
	app.runSchedule(BuiltinSchedules.POST_UPDATE);
}

/**
 * 获取 App 中的 CentralInputStore 资源
 * @param app - App 实例
 * @returns CentralInputStore 实例或 undefined
 */
export function getInputStore(app: App): CentralInputStore | undefined {
	return app.getResource<CentralInputStore>();
}

/**
 * 清理测试 App
 * 调用 cleanup 方法并释放资源
 * @param app - 要清理的 App 实例
 */
export function cleanupTestApp(app: App): void {
	app.cleanup();
}
