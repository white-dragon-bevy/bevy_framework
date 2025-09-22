/**
 * TransformPlugin 单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { World } from "@rbxts/matter";
import { App } from "../../bevy_app/app";
import { Transform, GlobalTransform, createTransform } from "../src/components";
import { TransformPlugin, createTransformPlugin } from "../src/plugin";
import { Parent, Children } from "../src/systems";

export = () => {
	describe("TransformPlugin", () => {
		let app: App;

		beforeEach(() => {
			app = App.create();
		});

		it("should create plugin with correct name", () => {
			const plugin = createTransformPlugin();
			expect(plugin.name()).to.equal("TransformPlugin");
			expect(plugin.isUnique()).to.equal(true);
		});

		it("should register transform systems", () => {
			const plugin = createTransformPlugin();
			app.addPlugin(plugin);

			// 获取 world
			const world = (app as any).subApps.main().getWorld();

			// 创建测试实体
			const entity = world.spawn();
			world.insert(
				entity as any,
				Transform({
					cframe: new CFrame(new Vector3(10, 20, 30)),
					scale: Vector3.one,
				}),
			);

			// 运行 PostUpdate 调度
			app.update();

			// 应该自动创建 GlobalTransform
			const globalTransform = world.get(entity, GlobalTransform);
			expect(globalTransform).to.be.ok();
			expect(globalTransform!.cframe.Position).to.equal(new Vector3(10, 20, 30));
		});

		it("should propagate transforms in hierarchy", () => {
			const plugin = createTransformPlugin();
			app.addPlugin(plugin);

			// 获取 world
			const world = (app as any).subApps.main().getWorld();

			// 创建父子实体
			const parent = world.spawn();
			const child = world.spawn();

			world.insert(
				parent as any,
				Transform({
					cframe: new CFrame(new Vector3(10, 0, 0)),
					scale: new Vector3(2, 2, 2),
				}),
			);
			world.insert(parent as any, Children({ entities: [child] }));

			world.insert(
				child as any,
				Transform({
					cframe: new CFrame(new Vector3(5, 0, 0)),
					scale: Vector3.one,
				}),
			);
			world.insert(child as any, Parent({ entity: parent }));

			// 运行系统
			app.update();

			// 检查子实体的全局变换
			const childGlobal = world.get(child, GlobalTransform);
			expect(childGlobal).to.be.ok();
			expect(childGlobal!.cframe.Position.X).to.be.near(20, 0.001); // 10 + (5 * 2)
			expect(childGlobal!.scale).to.equal(new Vector3(2, 2, 2));
		});

		it("should handle transform updates", () => {
			const plugin = createTransformPlugin();
			app.addPlugin(plugin);

			// 获取 world
			const world = (app as any).subApps.main().getWorld();

			const entity = world.spawn();
			world.insert(
				entity as any,
				Transform({
					cframe: CFrame.identity,
					scale: Vector3.one,
				}),
			);

			// 第一次更新
			app.update();

			// 修改 Transform
			world.insert(
				entity as any,
				Transform({
					cframe: new CFrame(new Vector3(50, 50, 50)),
					scale: new Vector3(3, 3, 3),
				}),
			);

			// 第二次更新
			app.update();

			// GlobalTransform 应该被更新
			const globalTransform = world.get(entity, GlobalTransform);
			expect(globalTransform).to.be.ok();
			expect(globalTransform!.cframe.Position).to.equal(new Vector3(50, 50, 50));
			expect(globalTransform!.scale).to.equal(new Vector3(3, 3, 3));
		});
	});
};