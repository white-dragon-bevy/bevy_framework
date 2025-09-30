/**
 * bevy_camera 系统函数（占位实现）
 * 对应 Rust bevy_camera 中的各种系统函数
 */

import { World } from "@rbxts/matter";
import { Workspace, RunService } from "@rbxts/services";
import {
	PrimaryCamera,
	CameraConfig,
	createPrimaryCameraData,
	createCameraConfigData,
	applyCameraConfig,
} from "./components";

/**
 * 初始化相机系统（占位）
 *
 * 未来可实现：
 * - 在启动时创建主相机实体
 * - 将 Roblox Camera 封装为 ECS 实体
 *
 * @param world - Matter World 实例
 */
export function initializeCameraSystem(world: World): void {
	if (!RunService.IsClient()) {
		return;
	}

	const camera = Workspace.CurrentCamera;
	if (!camera) {
		return;
	}

	// 占位：未来可创建主相机实体
	// const entity = world.spawn(
	//     PrimaryCamera(createPrimaryCameraData(camera)),
	//     CameraConfig(createCameraConfigData(camera))
	// );

	print("[CameraSystem] 相机系统已初始化（占位）");
}

/**
 * 同步相机配置系统（占位）
 *
 * 未来可实现：
 * - 将 ECS 组件的配置同步到 Roblox Camera
 * - 监听配置变化并应用
 *
 * @param world - Matter World 实例
 */
export function syncCameraConfigSystem(world: World): void {
	if (!RunService.IsClient()) {
		return;
	}

	// 占位：未来可实现配置同步
	// for (const [entity, primaryCamera, config] of world.query(
	//     PrimaryCamera,
	//     CameraConfig
	// )) {
	//     applyCameraConfig(primaryCamera.camera, config);
	// }
}

/**
 * 更新相机主体系统（占位）
 *
 * 未来可实现：
 * - 应用 CameraSubject 组件
 * - 自动跟随目标
 *
 * @param world - Matter World 实例
 */
export function updateCameraSubjectSystem(world: World): void {
	if (!RunService.IsClient()) {
		return;
	}

	// 占位：未来可实现主体跟随
}