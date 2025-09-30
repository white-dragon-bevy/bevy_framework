/**
 * bevy_camera 插件实现
 * 对应 Rust bevy_camera/src/lib.rs::CameraPlugin
 */

import { BasePlugin } from "../bevy_app/plugin";
import { App, ExtensionFactory } from "../bevy_app/app";
import { World } from "@rbxts/matter";
import type { AppContext } from "../bevy_app/context";
import { RobloxContext } from "../utils/roblox-utils";
import { Workspace, RunService } from "@rbxts/services";
import { PrimaryCamera } from "./components";

/**
 * 相机插件扩展工厂接口
 * 定义所有可用的相机扩展方法
 */
export interface CameraPluginExtensionFactories {
	/**
	 * 获取 Roblox Camera 实例
	 * @returns Camera 实例或 undefined
	 */
	getCamera: ExtensionFactory<() => Camera | undefined>;

	/**
	 * 设置相机类型
	 * @param type - 相机类型枚举
	 */
	setCameraType: ExtensionFactory<(type: Enum.CameraType) => void>;

	/**
	 * 设置相机主体
	 * @param subject - 跟随目标（Humanoid 或 BasePart）
	 */
	setCameraSubject: ExtensionFactory<(subject: Humanoid | BasePart) => void>;

	/**
	 * 设置视野角度
	 * @param fov - 视野角度（度）
	 */
	setFieldOfView: ExtensionFactory<(fov: number) => void>;

	/**
	 * 获取主相机实体
	 * @returns 主相机实体 ID 或 undefined
	 */
	getPrimaryCameraEntity: ExtensionFactory<() => number | undefined>;
}

/**
 * Roblox 相机管理插件
 *
 * 提供 Roblox Camera 的 ECS 封装和扩展接口
 *
 * **功能**：
 * - 管理 Roblox 原生 Camera 对象
 * - 提供相机配置和控制的扩展方法
 * - 为未来的相机系统预留接口
 *
 * **注意**：
 * - 仅在客户端运行（robloxContext = Client）
 * - 这是一个占位实现，未来可扩展更多功能
 *
 * 对应 Rust bevy_camera::CameraPlugin
 */
export class CameraPlugin extends BasePlugin {
	/**
	 * 客户端专用标记
	 * 插件仅在客户端环境中运行
	 */
	robloxContext = RobloxContext.Client;

	/**
	 * 插件扩展工厂
	 * 定义所有相机相关的扩展方法
	 */
	extension: CameraPluginExtensionFactories;

	/**
	 * 创建 CameraPlugin 实例
	 */
	constructor() {
		super();

		// 初始化扩展工厂
		this.extension = {
			/**
			 * 获取 Roblox Camera 实例
			 */
			getCamera: (world: World, context: AppContext, plugin: CameraPlugin) => {
				return () => {
					if (!RunService.IsClient()) {
						return undefined;
					}

					return Workspace.CurrentCamera;
				};
			},

			/**
			 * 设置相机类型
			 */
			setCameraType: (world: World, context: AppContext, plugin: CameraPlugin) => {
				return (cameraType: Enum.CameraType) => {
					const camera = Workspace.CurrentCamera;
					if (camera) {
						camera.CameraType = cameraType;
					}
				};
			},

			/**
			 * 设置相机主体
			 */
			setCameraSubject: (world: World, context: AppContext, plugin: CameraPlugin) => {
				return (subject: Humanoid | BasePart) => {
					const camera = Workspace.CurrentCamera;
					if (camera) {
						camera.CameraSubject = subject;
					}
				};
			},

			/**
			 * 设置视野角度
			 */
			setFieldOfView: (world: World, context: AppContext, plugin: CameraPlugin) => {
				return (fov: number) => {
					const camera = Workspace.CurrentCamera;
					if (camera) {
						camera.FieldOfView = fov;
					}
				};
			},

			/**
			 * 获取主相机实体
			 */
			getPrimaryCameraEntity: (world: World, context: AppContext, plugin: CameraPlugin) => {
				return () => {
					// 在 World 中查找主相机实体
					for (const [entity, _] of world.query(PrimaryCamera)) {
						return entity;
					}

					return undefined;
				};
			},
		};
	}

	/**
	 * 构建插件
	 * 对应 Rust Plugin::build
	 *
	 * @param app - App实例
	 */
	build(app: App): void {
		// 占位实现
		// 未来可添加：
		// - app.addSystems(BuiltinSchedules.STARTUP, initializeCameraSystem);
		// - app.addSystems(BuiltinSchedules.PRE_UPDATE, syncCameraConfigSystem);
		// - app.insertResource(new CameraResource());

		print("[CameraPlugin] 已加载（占位实现）");
	}

	/**
	 * 插件名称
	 * @returns 插件的唯一标识名称
	 */
	name(): string {
		return "CameraPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns 总是返回 true，同一应用只能有一个 CameraPlugin
	 */
	isUnique(): boolean {
		return true;
	}
}