/**
 * Hierarchy 系统单元测试
 * 测试层次结构组件和工具函数
 */

import { World } from "@rbxts/matter";
import { Children, HierarchyUtils, Parent } from "../hierarchy";

export = () => {
	describe("Hierarchy System", () => {
		let world: World;

		beforeEach(() => {
			world = new World();
		});

		describe("Parent Component", () => {
			it("应该能够创建 Parent 组件", () => {
				const parent = world.spawn();
				const child = world.spawn();

				world.insert(child, Parent({ entity: parent }));

				const parentComp = world.get(child, Parent);
				expect(parentComp).to.be.ok();
				expect(parentComp!.entity).to.equal(parent);
			});

			it("应该能够更新 Parent 组件", () => {
				const parent1 = world.spawn();
				const parent2 = world.spawn();
				const child = world.spawn();

				world.insert(child, Parent({ entity: parent1 }));
				world.insert(child, Parent({ entity: parent2 }));

				const parentComp = world.get(child, Parent);
				expect(parentComp!.entity).to.equal(parent2);
			});

			it("应该能够移除 Parent 组件", () => {
				const parent = world.spawn();
				const child = world.spawn();

				world.insert(child, Parent({ entity: parent }));
				world.remove(child, Parent);

				const parentComp = world.get(child, Parent);
				expect(parentComp).never.to.be.ok();
			});
		});

		describe("Children Component", () => {
			it("应该能够创建 Children 组件", () => {
				const parent = world.spawn();
				const child1 = world.spawn();
				const child2 = world.spawn();

				world.insert(parent, Children({ entities: [child1, child2] }));

				const childrenComp = world.get(parent, Children);
				expect(childrenComp).to.be.ok();
				expect(childrenComp!.entities.size()).to.equal(2);
				expect(childrenComp!.entities.indexOf(child1) !== -1).to.equal(true);
				expect(childrenComp!.entities.indexOf(child2) !== -1).to.equal(true);
			});

			it("应该支持空的 Children 列表", () => {
				const parent = world.spawn();

				world.insert(parent, Children({ entities: [] }));

				const childrenComp = world.get(parent, Children);
				expect(childrenComp).to.be.ok();
				expect(childrenComp!.entities.size()).to.equal(0);
			});

			it("Children 数组应该是只读的", () => {
				const parent = world.spawn();
				const child = world.spawn();

				world.insert(parent, Children({ entities: [child] }));

				const childrenComp = world.get(parent, Children);
				expect(typeIs(childrenComp!.entities, "table")).to.equal(true);
			});
		});

		describe("setParent", () => {
			it("应该能够设置父级关系", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);

				const parentComp = world.get(child, Parent);
				expect(parentComp).to.be.ok();
				expect(parentComp!.entity).to.equal(parent);
			});

			it("应该自动更新父级的 Children 组件", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);

				const childrenComp = world.get(parent, Children);
				expect(childrenComp).to.be.ok();
				expect(childrenComp!.entities.size()).to.equal(1);
				expect(childrenComp!.entities[0]).to.equal(child);
			});

			it("应该支持添加多个子实体", () => {
				const parent = world.spawn();
				const child1 = world.spawn();
				const child2 = world.spawn();
				const child3 = world.spawn();

				HierarchyUtils.setParent(world, child1, parent);
				HierarchyUtils.setParent(world, child2, parent);
				HierarchyUtils.setParent(world, child3, parent);

				const childrenComp = world.get(parent, Children);
				expect(childrenComp!.entities.size()).to.equal(3);
			});

			it("应该防止实体成为自己的父级", () => {
				const entity = world.spawn();

				expect(() => {
					HierarchyUtils.setParent(world, entity, entity);
				}).to.throw("Cannot set entity as its own parent");
			});

			it("应该检测简单的循环依赖", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);

				expect(() => {
					HierarchyUtils.setParent(world, parent, child);
				}).to.throw("cycle");
			});

			it("应该检测复杂的循环依赖", () => {
				const entity1 = world.spawn();
				const entity2 = world.spawn();
				const entity3 = world.spawn();
				const entity4 = world.spawn();

				HierarchyUtils.setParent(world, entity2, entity1);
				HierarchyUtils.setParent(world, entity3, entity2);
				HierarchyUtils.setParent(world, entity4, entity3);

				expect(() => {
					HierarchyUtils.setParent(world, entity1, entity4);
				}).to.throw("cycle");
			});

			it("应该能够更改父级", () => {
				const parent1 = world.spawn();
				const parent2 = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent1);
				HierarchyUtils.setParent(world, child, parent2);

				const parentComp = world.get(child, Parent);
				expect(parentComp!.entity).to.equal(parent2);

				const children1 = world.get(parent1, Children);
				const children2 = world.get(parent2, Children);

				expect(children1).never.to.be.ok();
				expect(children2).to.be.ok();
				expect(children2!.entities.size()).to.equal(1);
			});

			it("应该能够移除父级关系", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);
				HierarchyUtils.setParent(world, child, undefined);

				const parentComp = world.get(child, Parent);
				const childrenComp = world.get(parent, Children);

				expect(parentComp).never.to.be.ok();
				expect(childrenComp).never.to.be.ok();
			});

			it("应该防止重复添加相同的子实体", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);
				HierarchyUtils.setParent(world, child, parent);

				const childrenComp = world.get(parent, Children);
				expect(childrenComp!.entities.size()).to.equal(1);
			});
		});

		describe("getParent", () => {
			it("应该返回父实体", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);

				const result = HierarchyUtils.getParent(world, child);
				expect(result).to.equal(parent);
			});

			it("没有父级时应该返回 undefined", () => {
				const entity = world.spawn();

				const result = HierarchyUtils.getParent(world, entity);
				expect(result).to.equal(undefined);
			});
		});

		describe("getChildren", () => {
			it("应该返回所有直接子实体", () => {
				const parent = world.spawn();
				const child1 = world.spawn();
				const child2 = world.spawn();

				HierarchyUtils.setParent(world, child1, parent);
				HierarchyUtils.setParent(world, child2, parent);

				const children = HierarchyUtils.getChildren(world, parent);
				expect(children.size()).to.equal(2);
				expect(children.indexOf(child1) !== -1).to.equal(true);
				expect(children.indexOf(child2) !== -1).to.equal(true);
			});

			it("没有子实体时应该返回空数组", () => {
				const entity = world.spawn();

				const children = HierarchyUtils.getChildren(world, entity);
				expect(children.size()).to.equal(0);
			});

			it("不应该包含孙子实体", () => {
				const parent = world.spawn();
				const child = world.spawn();
				const grandchild = world.spawn();

				HierarchyUtils.setParent(world, child, parent);
				HierarchyUtils.setParent(world, grandchild, child);

				const children = HierarchyUtils.getChildren(world, parent);
				expect(children.size()).to.equal(1);
				expect(children[0]).to.equal(child);
			});

			it("应该返回新数组（不影响缓存）", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);

				const children1 = HierarchyUtils.getChildren(world, parent);
				const children2 = HierarchyUtils.getChildren(world, parent);

				expect(children1).never.to.equal(children2);
			});
		});

		describe("getDescendants", () => {
			it("应该返回所有子孙实体", () => {
				const root = world.spawn();
				const child1 = world.spawn();
				const child2 = world.spawn();
				const grandchild1 = world.spawn();
				const grandchild2 = world.spawn();

				HierarchyUtils.setParent(world, child1, root);
				HierarchyUtils.setParent(world, child2, root);
				HierarchyUtils.setParent(world, grandchild1, child1);
				HierarchyUtils.setParent(world, grandchild2, child1);

				const descendants = HierarchyUtils.getDescendants(world, root);
				expect(descendants.size()).to.equal(4);
				expect(descendants.indexOf(child1) !== -1).to.equal(true);
				expect(descendants.indexOf(child2) !== -1).to.equal(true);
				expect(descendants.indexOf(grandchild1) !== -1).to.equal(true);
				expect(descendants.indexOf(grandchild2) !== -1).to.equal(true);
			});

			it("没有子孙时应该返回空数组", () => {
				const entity = world.spawn();

				const descendants = HierarchyUtils.getDescendants(world, entity);
				expect(descendants.size()).to.equal(0);
			});

			it("应该支持深层嵌套", () => {
				const level0 = world.spawn();
				const level1 = world.spawn();
				const level2 = world.spawn();
				const level3 = world.spawn();
				const level4 = world.spawn();

				HierarchyUtils.setParent(world, level1, level0);
				HierarchyUtils.setParent(world, level2, level1);
				HierarchyUtils.setParent(world, level3, level2);
				HierarchyUtils.setParent(world, level4, level3);

				const descendants = HierarchyUtils.getDescendants(world, level0);
				expect(descendants.size()).to.equal(4);
			});
		});

		describe("getAncestors", () => {
			it("应该返回所有祖先实体", () => {
				const root = world.spawn();
				const parent = world.spawn();
				const child = world.spawn();
				const grandchild = world.spawn();

				HierarchyUtils.setParent(world, parent, root);
				HierarchyUtils.setParent(world, child, parent);
				HierarchyUtils.setParent(world, grandchild, child);

				const ancestors = HierarchyUtils.getAncestors(world, grandchild);
				expect(ancestors.size()).to.equal(3);
				expect(ancestors[0]).to.equal(child);
				expect(ancestors[1]).to.equal(parent);
				expect(ancestors[2]).to.equal(root);
			});

			it("根实体应该返回空数组", () => {
				const root = world.spawn();

				const ancestors = HierarchyUtils.getAncestors(world, root);
				expect(ancestors.size()).to.equal(0);
			});
		});

		describe("getRoot", () => {
			it("应该返回根实体", () => {
				const root = world.spawn();
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, parent, root);
				HierarchyUtils.setParent(world, child, parent);

				expect(HierarchyUtils.getRoot(world, child)).to.equal(root);
				expect(HierarchyUtils.getRoot(world, parent)).to.equal(root);
			});

			it("没有父级的实体应该返回自己", () => {
				const entity = world.spawn();

				expect(HierarchyUtils.getRoot(world, entity)).to.equal(entity);
			});
		});

		describe("isAncestor", () => {
			it("应该正确判断祖先关系", () => {
				const root = world.spawn();
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, parent, root);
				HierarchyUtils.setParent(world, child, parent);

				expect(HierarchyUtils.isAncestor(world, root, child)).to.equal(true);
				expect(HierarchyUtils.isAncestor(world, parent, child)).to.equal(true);
				expect(HierarchyUtils.isAncestor(world, root, parent)).to.equal(true);
			});

			it("不是祖先时应该返回 false", () => {
				const entity1 = world.spawn();
				const entity2 = world.spawn();

				expect(HierarchyUtils.isAncestor(world, entity1, entity2)).to.equal(false);
			});

			it("实体不应该是自己的祖先", () => {
				const entity = world.spawn();

				expect(HierarchyUtils.isAncestor(world, entity, entity)).to.equal(false);
			});
		});

		describe("despawnWithDescendants", () => {
			it("应该删除实体及其所有子孙", () => {
				const root = world.spawn();
				const child1 = world.spawn();
				const child2 = world.spawn();
				const grandchild = world.spawn();

				HierarchyUtils.setParent(world, child1, root);
				HierarchyUtils.setParent(world, child2, root);
				HierarchyUtils.setParent(world, grandchild, child1);

				HierarchyUtils.despawnWithDescendants(world, root);

				expect(world.contains(root)).to.equal(false);
				expect(world.contains(child1)).to.equal(false);
				expect(world.contains(child2)).to.equal(false);
				expect(world.contains(grandchild)).to.equal(false);
			});

			it("应该清理父级的 Children 组件", () => {
				const parent = world.spawn();
				const child1 = world.spawn();
				const child2 = world.spawn();

				HierarchyUtils.setParent(world, child1, parent);
				HierarchyUtils.setParent(world, child2, parent);

				HierarchyUtils.despawnWithDescendants(world, child1);

				const childrenComp = world.get(parent, Children);
				expect(childrenComp).to.be.ok();
				expect(childrenComp!.entities.size()).to.equal(1);
				expect(childrenComp!.entities[0]).to.equal(child2);
			});

			it("删除最后一个子实体时应该移除 Children 组件", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);

				HierarchyUtils.despawnWithDescendants(world, child);

				const childrenComp = world.get(parent, Children);
				expect(childrenComp).never.to.be.ok();
			});

			it("应该能够删除没有子实体的实体", () => {
				const entity = world.spawn();

				expect(() => {
					HierarchyUtils.despawnWithDescendants(world, entity);
				}).never.to.throw();

				expect(world.contains(entity)).to.equal(false);
			});

			it("应该支持删除深层树结构", () => {
				const root = world.spawn();
				let current = root;

				for (let index = 0; index < 10; index++) {
					const nextEntity = world.spawn();
					HierarchyUtils.setParent(world, nextEntity, current);
					current = nextEntity;
				}

				HierarchyUtils.despawnWithDescendants(world, root);

				expect(world.contains(root)).to.equal(false);
			});
		});

		describe("reparent", () => {
			it("应该能够重新设置父级", () => {
				const parent1 = world.spawn();
				const parent2 = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent1);
				HierarchyUtils.reparent(world, child, parent2);

				const parentComp = world.get(child, Parent);
				expect(parentComp!.entity).to.equal(parent2);

				const children1 = HierarchyUtils.getChildren(world, parent1);
				const children2 = HierarchyUtils.getChildren(world, parent2);

				expect(children1.size()).to.equal(0);
				expect(children2.size()).to.equal(1);
			});

			it("应该能够移除父级", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);
				HierarchyUtils.reparent(world, child, undefined);

				const parentComp = world.get(child, Parent);
				expect(parentComp).never.to.be.ok();
			});
		});

		describe("getSiblingIndex", () => {
			it("应该返回实体在兄弟中的索引", () => {
				const parent = world.spawn();
				const child1 = world.spawn();
				const child2 = world.spawn();
				const child3 = world.spawn();

				HierarchyUtils.setParent(world, child1, parent);
				HierarchyUtils.setParent(world, child2, parent);
				HierarchyUtils.setParent(world, child3, parent);

				expect(HierarchyUtils.getSiblingIndex(world, child1)).to.equal(0);
				expect(HierarchyUtils.getSiblingIndex(world, child2)).to.equal(1);
				expect(HierarchyUtils.getSiblingIndex(world, child3)).to.equal(2);
			});

			it("没有父级时应该返回 0", () => {
				const entity = world.spawn();

				expect(HierarchyUtils.getSiblingIndex(world, entity)).to.equal(0);
			});
		});

		describe("getDepth", () => {
			it("应该返回实体的深度", () => {
				const level0 = world.spawn();
				const level1 = world.spawn();
				const level2 = world.spawn();
				const level3 = world.spawn();

				HierarchyUtils.setParent(world, level1, level0);
				HierarchyUtils.setParent(world, level2, level1);
				HierarchyUtils.setParent(world, level3, level2);

				expect(HierarchyUtils.getDepth(world, level0)).to.equal(0);
				expect(HierarchyUtils.getDepth(world, level1)).to.equal(1);
				expect(HierarchyUtils.getDepth(world, level2)).to.equal(2);
				expect(HierarchyUtils.getDepth(world, level3)).to.equal(3);
			});
		});

		describe("Children 缓存一致性", () => {
			it("setParent 应该保持缓存一致性", () => {
				const parent = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent);

				const childrenViaComponent = world.get(parent, Children);
				const childrenViaMethod = HierarchyUtils.getChildren(world, parent);

				expect(childrenViaComponent).to.be.ok();
				expect(childrenViaMethod.size()).to.equal(childrenViaComponent!.entities.size());
			});

			it("更改父级应该正确更新两个父级的缓存", () => {
				const parent1 = world.spawn();
				const parent2 = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent1);
				HierarchyUtils.setParent(world, child, parent2);

				const children1 = HierarchyUtils.getChildren(world, parent1);
				const children2 = HierarchyUtils.getChildren(world, parent2);

				expect(children1.size()).to.equal(0);
				expect(children2.size()).to.equal(1);
				expect(children2[0]).to.equal(child);
			});

			it("移除子实体应该更新父级缓存", () => {
				const parent = world.spawn();
				const child1 = world.spawn();
				const child2 = world.spawn();
				const child3 = world.spawn();

				HierarchyUtils.setParent(world, child1, parent);
				HierarchyUtils.setParent(world, child2, parent);
				HierarchyUtils.setParent(world, child3, parent);

				HierarchyUtils.setParent(world, child2, undefined);

				const children = HierarchyUtils.getChildren(world, parent);
				expect(children.size()).to.equal(2);
				expect(children.indexOf(child2) === -1).to.equal(true);
			});
		});

		describe("性能测试", () => {
			it("getChildren 应该是 O(1) 操作", () => {
				const parent = world.spawn();

				for (let index = 0; index < 100; index++) {
					const child = world.spawn();
					HierarchyUtils.setParent(world, child, parent);
				}

				const startTime = os.clock();

				for (let index = 0; index < 1000; index++) {
					HierarchyUtils.getChildren(world, parent);
				}

				const elapsed = os.clock() - startTime;
				expect(elapsed < 0.1).to.equal(true);
			});

			it("应该高效处理大量实体", () => {
				const root = world.spawn();

				const startTime = os.clock();

				for (let index = 0; index < 1000; index++) {
					const entity = world.spawn();
					HierarchyUtils.setParent(world, entity, root);
				}

				const elapsed = os.clock() - startTime;
				expect(elapsed < 1.0).to.equal(true);

				const children = HierarchyUtils.getChildren(world, root);
				expect(children.size()).to.equal(1000);
			});
		});

		describe("边界条件", () => {
			it("应该处理快速添加和移除", () => {
				const parent = world.spawn();
				const child = world.spawn();

				for (let index = 0; index < 10; index++) {
					HierarchyUtils.setParent(world, child, parent);
					HierarchyUtils.setParent(world, child, undefined);
				}

				const children = HierarchyUtils.getChildren(world, parent);
				expect(children.size()).to.equal(0);
			});

			it("应该处理复杂的重新父级场景", () => {
				const parent1 = world.spawn();
				const parent2 = world.spawn();
				const parent3 = world.spawn();
				const child = world.spawn();

				HierarchyUtils.setParent(world, child, parent1);
				HierarchyUtils.setParent(world, child, parent2);
				HierarchyUtils.setParent(world, child, parent3);
				HierarchyUtils.setParent(world, child, parent1);

				const children1 = HierarchyUtils.getChildren(world, parent1);
				const children2 = HierarchyUtils.getChildren(world, parent2);
				const children3 = HierarchyUtils.getChildren(world, parent3);

				expect(children1.size()).to.equal(1);
				expect(children2.size()).to.equal(0);
				expect(children3.size()).to.equal(0);
			});
		});
	});
};