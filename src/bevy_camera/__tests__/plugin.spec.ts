/**
 * bevy_camera 插件单元测试
 */

import { CameraPlugin } from "../camera-plugin";
import { PrimaryCamera, CameraConfig, createPrimaryCameraData, createCameraConfigData } from "../components";
import { App } from "../../bevy_app/app";
import { RobloxContext } from "../../utils/roblox-utils";

export = () => {
	describe("CameraPlugin", () => {
		it("应该正确创建插件实例", () => {
			const plugin = new CameraPlugin();

			expect(plugin).to.be.ok();
			expect(plugin.name()).to.equal("CameraPlugin");
			expect(plugin.isUnique()).to.equal(true);
		});

		it("应该设置正确的 Roblox 上下文", () => {
			const plugin = new CameraPlugin();

			expect(plugin.robloxContext).to.equal(RobloxContext.Client);
		});

		it("应该有扩展对象", () => {
			const plugin = new CameraPlugin();

			expect(plugin.extension).to.be.ok();
			expect(plugin.extension.getCamera).to.be.a("function");
			expect(plugin.extension.setCameraType).to.be.a("function");
			expect(plugin.extension.setCameraSubject).to.be.a("function");
			expect(plugin.extension.setFieldOfView).to.be.a("function");
			expect(plugin.extension.getPrimaryCameraEntity).to.be.a("function");
		});

		it("应该能够构建到 App", () => {
			const plugin = new CameraPlugin();
			const app = App.create();

			expect(() => {
				plugin.build(app);
			}).never.to.throw();
		});
	});

	describe("组件定义", () => {
		it("PrimaryCamera 组件应该正确定义", () => {
			expect(PrimaryCamera).to.be.ok();
		});

		it("CameraConfig 组件应该正确定义", () => {
			expect(CameraConfig).to.be.ok();
		});
	});

	describe("辅助函数", () => {
		it("createPrimaryCameraData 应该创建正确的数据", () => {
			const mockCamera = {} as Camera;
			const data = createPrimaryCameraData(mockCamera);

			expect(data).to.be.ok();
			expect(data.camera).to.equal(mockCamera);
		});

		it("createCameraConfigData 应该创建默认配置", () => {
			const config = createCameraConfigData();

			expect(config).to.be.ok();
			expect(config.cameraType).to.equal(Enum.CameraType.Custom);
			expect(config.fieldOfView).to.equal(70);
			expect(config.cameraSubject).to.equal(undefined);
		});

		it("createCameraConfigData 应该从相机读取配置", () => {
			const mockCamera = {
				CameraType: Enum.CameraType.Scriptable,
				FieldOfView: 90,
				CameraSubject: undefined,
			} as unknown as Camera;

			const config = createCameraConfigData(mockCamera);

			expect(config.cameraType).to.equal(Enum.CameraType.Scriptable);
			expect(config.fieldOfView).to.equal(90);
		});
	});
};