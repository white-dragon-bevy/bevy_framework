/**
 * Transform 传播系统单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { World } from "@rbxts/matter";
import { Transform, GlobalTransform, createTransform, createGlobalTransform } from "../src/components";
import {
	Parent,
	Children,
	markDirtyTrees,
	propagateParentTransforms,
	syncSimpleTransforms,
	ensureGlobalTransforms,
} from "../src/systems";

export = () => {
	describe("Transform Propagation Systems", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		afterEach(() => {
			world.clear();
		});

		describe("syncSimpleTransforms", () => {
			it("should sync transform to global transform for entities without parent", () => {
				const entity = world.spawn();
				const transform = {
					cframe: new CFrame(new Vector3(10, 20, 30)),
					scale: new Vector3(2, 2, 2),
				};
				world.insert(entity, Transform(transform));
				world.insert(entity, GlobalTransform(createGlobalTransform()));

				syncSimpleTransforms(world);

				const globalTransform = world.get(entity, GlobalTransform);
				expect(globalTransform).to.be.ok();
				expect(globalTransform!.cframe).to.equal(transform.cframe);
				expect(globalTransform!.scale).to.equal(transform.scale);
			});

			it("should not sync entities with parent", () => {
				const parent = world.spawn();
				const child = world.spawn();

				const childTransform = {
					cframe: new CFrame(new Vector3(5, 0, 0)),
					scale: Vector3.one,
				};

				world.insert(parent, Transform(createTransform()));
				world.insert(parent, GlobalTransform(createGlobalTransform()));
				world.insert(parent, Children({ entities: [child] }));

				world.insert(child, Transform(childTransform));
				world.insert(child, GlobalTransform(createGlobalTransform()));
				world.insert(child, Parent({ entity: parent }));

				syncSimpleTransforms(world);

				const childGlobal = world.get(child, GlobalTransform);
				// 子实体不应该被 syncSimpleTransforms 更新
				expect(childGlobal!.cframe).to.equal(CFrame.identity);
			});
		});

		describe("ensureGlobalTransforms", () => {
			it("should create GlobalTransform for entities with Transform", () => {
				const entity = world.spawn();
				const transform = createTransform();
				world.insert(entity, Transform(transform));

				ensureGlobalTransforms(world);

				const globalTransform = world.get(entity, GlobalTransform);
				expect(globalTransform).to.be.ok();
				expect(globalTransform!.cframe).to.equal(transform.cframe);
				expect(globalTransform!.scale).to.equal(transform.scale);
			});
		});

		describe("propagateParentTransforms", () => {
			it("should propagate transform from parent to child", () => {
				const parent = world.spawn();
				const child = world.spawn();

				const parentTransform = {
					cframe: new CFrame(new Vector3(10, 0, 0)),
					scale: new Vector3(2, 2, 2),
				};
				const childTransform = {
					cframe: new CFrame(new Vector3(5, 0, 0)),
					scale: Vector3.one,
				};

				// 设置父级
				world.insert(parent, Transform(parentTransform));
				world.insert(parent, GlobalTransform(createGlobalTransform()));
				world.insert(parent, Children({ entities: [child] }));

				// 设置子级
				world.insert(child, Transform(childTransform));
				world.insert(child, GlobalTransform(createGlobalTransform()));
				world.insert(child, Parent({ entity: parent }));

				// 标记并传播
				markDirtyTrees(world);
				propagateParentTransforms(world);

				const childGlobal = world.get(child, GlobalTransform);
				expect(childGlobal).to.be.ok();

				// 子级的全局位置应该是相对于父级计算的
				const expectedPosition = parentTransform.cframe.mul(childTransform.cframe).Position;
				expect(childGlobal!.cframe.Position.X).to.be.near(expectedPosition.X, 0.001);
				expect(childGlobal!.cframe.Position.Y).to.be.near(expectedPosition.Y, 0.001);
				expect(childGlobal!.cframe.Position.Z).to.be.near(expectedPosition.Z, 0.001);

				// 子级的全局缩放应该是父级缩放 * 子级缩放
				expect(childGlobal!.scale).to.equal(new Vector3(2, 2, 2));
			});

			it("should propagate through multiple levels", () => {
				const root = world.spawn();
				const parent = world.spawn();
				const child = world.spawn();

				// 创建三级层次结构
				world.insert(root, Transform(createTransform()));
				world.insert(root, GlobalTransform(createGlobalTransform()));
				world.insert(root, Children({ entities: [parent] }));

				world.insert(
					parent,
					Transform({
						cframe: new CFrame(new Vector3(10, 0, 0)),
						scale: new Vector3(2, 2, 2),
					}),
				);
				world.insert(parent, GlobalTransform(createGlobalTransform()));
				world.insert(parent, Parent({ entity: root }));
				world.insert(parent, Children({ entities: [child] }));

				world.insert(
					child,
					Transform({
						cframe: new CFrame(new Vector3(5, 0, 0)),
						scale: Vector3.one,
					}),
				);
				world.insert(child, GlobalTransform(createGlobalTransform()));
				world.insert(child, Parent({ entity: parent }));

				// 标记并传播
				markDirtyTrees(world);
				propagateParentTransforms(world);

				const childGlobal = world.get(child, GlobalTransform);
				expect(childGlobal).to.be.ok();

				// 验证最深层子级的全局变换
				expect(childGlobal!.cframe.Position.X).to.be.near(20, 0.001); // 0 + 10 + (5 * 2)
				expect(childGlobal!.scale).to.equal(new Vector3(2, 2, 2));
			});
		});
	});
};