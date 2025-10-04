/**
 * bevy_camera 插件实现
 * 对应 Rust bevy_camera/src/lib.rs::CameraPlugin
 */

import { BasePlugin, Plugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import { World } from "@rbxts/matter";
import type { Context } from "../bevy_ecs";
import { RobloxContext } from "../utils/roblox-utils";
import { Workspace, RunService } from "@rbxts/services";
import { PrimaryCamera } from "./components";
import { CameraPluginExtension } from "./extension";
import { ___getTypeDescriptor } from "bevy_core";

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
export class CameraPlugin extends BasePlugin implements Plugin<CameraPluginExtension> {
	/**
	 * 客户端专用标记
	 * 插件仅在客户端环境中运行
	 */
	robloxContext = RobloxContext.Client;

	/**
	 * 扩展类型描述符
	 */
	extensionDescriptor = ___getTypeDescriptor<CameraPluginExtension>()!;

	/**
	 * 创建 CameraPlugin 实例
	 */
	constructor() {
		super();
	}

	/**
	 * 获取插件扩展
	 * @param app - App 实例
	 * @returns 相机插件扩展对象
	 */
	getExtension(app: App): CameraPluginExtension {
		const world = app.getWorld();

		return {
			/**
			 * 获取 Roblox Camera 实例
			 */
			getCamera: () => {
				if (!RunService.IsClient()) {
					return undefined;
				}

				return Workspace.CurrentCamera;
			},

			/**
			 * 设置相机类型
			 */
			setCameraType: (cameraType: Enum.CameraType) => {
				const camera = Workspace.CurrentCamera;
				if (camera) {
					camera.CameraType = cameraType;
				}
			},

			/**
			 * 设置相机主体
			 */
			setCameraSubject: (subject: Humanoid | BasePart) => {
				const camera = Workspace.CurrentCamera;
				if (camera) {
					camera.CameraSubject = subject;
				}
			},

			/**
			 * 设置视野角度
			 */
			setFieldOfView: (fov: number) => {
				const camera = Workspace.CurrentCamera;
				if (camera) {
					camera.FieldOfView = fov;
				}
			},

			/**
			 * 获取主相机实体
			 */
			getPrimaryCameraEntity: () => {
				// 在 World 中查找主相机实体
				for (const [entity, _] of world.query(PrimaryCamera)) {
					return entity;
				}

				return undefined;
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