/**
 * Name 组件单元测试
 * 测试实体名称组件的功能
 */

import { World } from "@rbxts/matter";
import { Name, NameComponent, withName, getEntityName, getNameOrEntity } from "../name";

export = () => {
	describe("Name Component", () => {
		describe("Name 类", () => {
			it("应该能够创建 Name 实例", () => {
				const name = new Name("TestEntity");

				expect(name.getName()).to.equal("TestEntity");
				expect(name.asStr()).to.equal("TestEntity");
			});

			it("应该自动计算哈希值", () => {
				const name1 = new Name("TestEntity");
				const name2 = new Name("TestEntity");

				expect(name1.getHash()).to.equal(name2.getHash());
			});

			it("不同的名称应该有不同的哈希值", () => {
				const name1 = new Name("Entity_A");
				const name2 = new Name("Entity_B");

				expect(name1.getHash()).never.to.equal(name2.getHash());
			});

			it("应该能够使用静态 create 方法", () => {
				const name = Name.create("TestEntity");

				expect(name.getName()).to.equal("TestEntity");
			});

			it("应该支持默认值", () => {
				const name = Name.default();

				expect(name.getName()).to.equal("");
			});
		});

		describe("Name 修改", () => {
			it("应该能够设置新名称", () => {
				const name = new Name("OldName");

				name.set("NewName");

				expect(name.getName()).to.equal("NewName");
			});

			it("设置新名称应该更新哈希值", () => {
				const name = new Name("OldName");
				const oldHash = name.getHash();

				name.set("NewName");
				const newHash = name.getHash();

				expect(oldHash).never.to.equal(newHash);
			});

			it("应该能够使用 mutate 函数修改名称", () => {
				const name = new Name("entity");

				name.mutate((currentName) => currentName.upper());

				expect(name.getName()).to.equal("ENTITY");
			});

			it("mutate 应该更新哈希值", () => {
				const name = new Name("entity");
				const oldHash = name.getHash();

				name.mutate((currentName) => currentName.upper());
				const newHash = name.getHash();

				expect(oldHash).never.to.equal(newHash);
			});
		});

		describe("Name 比较", () => {
			it("相同名称应该相等", () => {
				const name1 = new Name("TestEntity");
				const name2 = new Name("TestEntity");

				expect(name1.equals(name2)).to.equal(true);
			});

			it("不同名称应该不相等", () => {
				const name1 = new Name("Entity_A");
				const name2 = new Name("Entity_B");

				expect(name1.equals(name2)).to.equal(false);
			});

			it("equals 应该首先比较哈希值", () => {
				const name1 = new Name("Test");
				const name2 = new Name("Test");

				expect(name1.getHash()).to.equal(name2.getHash());
				expect(name1.equals(name2)).to.equal(true);
			});
		});

		describe("哈希碰撞处理", () => {
			it("应该正确处理哈希碰撞场景", () => {
				const name1 = new Name("collision_test_1");
				const name2 = new Name("collision_test_2");

				if (name1.getHash() === name2.getHash()) {
					expect(name1.equals(name2)).to.equal(false);
				}
			});

			it("哈希相同但字符串不同应该返回 false", () => {
				const name1 = new Name("abc");
				const name2 = new Name("abc");

				name2.set("xyz");

				const hash1 = name1.getHash();
				const hash2 = name2.getHash();

				if (hash1 === hash2) {
					expect(name1.equals(name2)).to.equal(false);
				}
			});

			it("应该能够区分相似的名称", () => {
				const names = [
					"Entity",
					"Entity_1",
					"Entity_2",
					"Entity_A",
					"Entity_B",
					"Player",
					"Player_1",
					"NPC",
					"NPC_Guard",
					"NPC_Trader",
				];

				for (let index = 0; index < names.size(); index++) {
					for (let otherIndex = index + 1; otherIndex < names.size(); otherIndex++) {
						const name1 = new Name(names[index]);
						const name2 = new Name(names[otherIndex]);

						expect(name1.equals(name2)).to.equal(false);
					}
				}
			});
		});

		describe("Name 字符串转换", () => {
			it("toString 应该返回名称字符串", () => {
				const name = new Name("TestEntity");

				expect(name.toString()).to.equal("TestEntity");
			});

			it("toDebugString 应该包含名称", () => {
				const name = new Name("TestEntity");
				const debug = name.toDebugString();

				expect(debug.find("TestEntity")[0]).to.be.ok();
			});
		});

		describe("Name 克隆", () => {
			it("应该能够克隆 Name 实例", () => {
				const original = new Name("TestEntity");
				const cloned = original.clone();

				expect(cloned.getName()).to.equal(original.getName());
				expect(cloned.getHash()).to.equal(original.getHash());
			});

			it("克隆的实例应该是独立的", () => {
				const original = new Name("Original");
				const cloned = original.clone();

				cloned.set("Modified");

				expect(original.getName()).to.equal("Original");
				expect(cloned.getName()).to.equal("Modified");
			});
		});

		describe("NameComponent 集成", () => {
			let world: World;

			beforeEach(() => {
				world = new World();
			});

			it("应该能够为实体添加名称", () => {
				const entity = world.spawn();
				withName(world, entity, "TestEntity");

				const name = getEntityName(world, entity);
				expect(name).to.equal("TestEntity");
			});

			it("应该能够获取实体名称", () => {
				const entity = world.spawn();
				const nameInstance = new Name("Player");
				world.insert(entity, NameComponent({ name: nameInstance }));

				const name = getEntityName(world, entity);
				expect(name).to.equal("Player");
			});

			it("没有名称的实体应该返回 undefined", () => {
				const entity = world.spawn();

				const name = getEntityName(world, entity);
				expect(name).to.equal(undefined);
			});

			it("getNameOrEntity 应该返回名称或实体 ID", () => {
				const namedEntity = world.spawn();
				withName(world, namedEntity, "NamedEntity");

				const unnamedEntity = world.spawn();

				const namedResult = getNameOrEntity(world, namedEntity);
				const unnamedResult = getNameOrEntity(world, unnamedEntity);

				expect(namedResult).to.equal("NamedEntity");
				expect(unnamedResult.find("Entity")[0]).to.be.ok();
			});
		});

		describe("名称查找和查询", () => {
			let world: World;

			beforeEach(() => {
				world = new World();
			});

			it("应该能够通过名称查找实体", () => {
				const entity1 = world.spawn();
				const entity2 = world.spawn();
				const entity3 = world.spawn();

				withName(world, entity1, "Player");
				withName(world, entity2, "Enemy");
				withName(world, entity3, "NPC");

				let foundPlayer = false;
				for (const [entity, nameComp] of world.query(NameComponent)) {
					if (nameComp.name.getName() === "Player") {
						expect(entity).to.equal(entity1);
						foundPlayer = true;
					}
				}

				expect(foundPlayer).to.equal(true);
			});

			it("应该支持多个实体使用相同名称", () => {
				const entity1 = world.spawn();
				const entity2 = world.spawn();

				withName(world, entity1, "Enemy");
				withName(world, entity2, "Enemy");

				let count = 0;
				for (const [entity, nameComp] of world.query(NameComponent)) {
					if (nameComp.name.getName() === "Enemy") {
						count++;
					}
				}

				expect(count).to.equal(2);
			});

			it("应该能够更新实体的名称", () => {
				const entity = world.spawn();
				withName(world, entity, "OldName");

				const nameComp = world.get(entity, NameComponent);
				if (nameComp) {
					nameComp.name.set("NewName");
					world.insert(entity, NameComponent({ name: nameComp.name }));
				}

				const updatedName = getEntityName(world, entity);
				expect(updatedName).to.equal("NewName");
			});
		});

		describe("性能测试", () => {
			it("哈希计算应该是确定性的", () => {
				const name = "PerformanceTestEntity";
				const hashes: number[] = [];

				for (let index = 0; index < 100; index++) {
					const nameInstance = new Name(name);
					hashes.push(nameInstance.getHash());
				}

				const firstHash = hashes[0];
				for (const hash of hashes) {
					expect(hash).to.equal(firstHash);
				}
			});

			it("应该高效处理大量名称", () => {
				const world = new World();
				const startTime = os.clock();

				for (let index = 0; index < 1000; index++) {
					const entity = world.spawn();
					withName(world, entity, `Entity_${index}`);
				}

				const elapsed = os.clock() - startTime;
				expect(elapsed < 1.0).to.equal(true);
			});
		});

		describe("边界条件", () => {
			it("应该处理空字符串名称", () => {
				const name = new Name("");

				expect(name.getName()).to.equal("");
				expect(name.getHash()).to.be.a("number");
			});

			it("应该处理长名称", () => {
				const longName = "A".rep(1000);
				const name = new Name(longName);

				expect(name.getName()).to.equal(longName);
				expect(name.getHash()).to.be.a("number");
			});

			it("应该处理特殊字符", () => {
				const specialNames = [
					"Entity@123",
					"Player#1",
					"NPC$Test",
					"Object%Value",
					"Test&Symbol",
					"Name*Star",
				];

				for (const specialName of specialNames) {
					const name = new Name(specialName);
					expect(name.getName()).to.equal(specialName);
				}
			});

			it("应该处理 Unicode 字符", () => {
				const unicodeName = "实体_测试_🎮";
				const name = new Name(unicodeName);

				expect(name.getName()).to.equal(unicodeName);
			});
		});
	});
};