/**
 * CameraPlugin 扩展接口
 * 定义相机插件暴露给 App 的扩展方法
 */

/**
 * 相机插件扩展接口
 * 提供 Roblox Camera 的控制和查询方法
 */
export interface CameraPluginExtension {
	/**
	 * 获取 Roblox Camera 实例
	 * @returns Camera 实例或 undefined
	 */
	getCamera: () => Camera | undefined;

	/**
	 * 设置相机类型
	 * @param type - 相机类型枚举
	 */
	setCameraType: (type: Enum.CameraType) => void;

	/**
	 * 设置相机主体
	 * @param subject - 跟随目标（Humanoid 或 BasePart）
	 */
	setCameraSubject: (subject: Humanoid | BasePart) => void;

	/**
	 * 设置视野角度
	 * @param fov - 视野角度（度）
	 */
	setFieldOfView: (fov: number) => void;

	/**
	 * 获取主相机实体
	 * @returns 主相机实体 ID 或 undefined
	 */
	getPrimaryCameraEntity: () => number | undefined;
}
