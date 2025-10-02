/**
 * bevy_camera 组件定义
 * 对应 Rust bevy_camera/src/camera.rs 和 components.rs
 */

import { component } from "@rbxts/matter";

/**
 * 主相机标记组件
 * 标记实体为主相机，包含 Roblox Camera 实例引用
 *
 * 对应 Rust Camera 组件的基础部分
 */
export interface PrimaryCameraData {
	/** Roblox Camera 实例引用 */
	readonly camera: Camera;
}

/**
 * 主相机组件
 * 使用 Matter component() 创建
 */
export const PrimaryCamera = component<PrimaryCameraData>("PrimaryCamera");

/**
 * 相机配置组件
 * 封装 Roblox Camera 的配置选项
 *
 * 对应 Rust Camera 组件的配置部分
 */
export interface CameraConfigData {
	/**
	 * 相机类型
	 * 控制相机的行为模式
	 */
	cameraType: Enum.CameraType;

	/**
	 * 视野角度（度）
	 * 范围通常为 1-120
	 */
	fieldOfView: number;

	/**
	 * 相机跟随主体
	 * 可以是 Humanoid 或 BasePart
	 */
	cameraSubject?: Humanoid | BasePart;
}

/**
 * 相机配置组件
 * 使用 Matter component() 创建
 */
export const CameraConfig = component<CameraConfigData>("CameraConfig");

/**
 * 辅助函数：创建默认的 PrimaryCamera 数据
 * @param camera - Roblox Camera 实例
 * @returns PrimaryCameraData
 */
export function createPrimaryCameraData(camera: Camera): PrimaryCameraData {
	return { camera };
}

/**
 * 辅助函数：创建默认的 CameraConfig 数据
 * @param camera - Roblox Camera 实例（可选，用于读取当前配置）
 * @returns CameraConfigData
 */
export function createCameraConfigData(camera?: Camera): CameraConfigData {
	if (camera) {
		return {
			cameraType: camera.CameraType,
			fieldOfView: camera.FieldOfView,
			cameraSubject: camera.CameraSubject,
		};
	}

	return {
		cameraType: Enum.CameraType.Custom,
		fieldOfView: 70,
		cameraSubject: undefined,
	};
}

/**
 * 辅助函数：将 CameraConfig 应用到 Roblox Camera
 * @param camera - Roblox Camera 实例
 * @param config - 相机配置数据
 */
export function applyCameraConfig(camera: Camera, config: CameraConfigData): void {
	camera.CameraType = config.cameraType;
	camera.FieldOfView = config.fieldOfView;

	if (config.cameraSubject !== undefined) {
		camera.CameraSubject = config.cameraSubject;
	}
}