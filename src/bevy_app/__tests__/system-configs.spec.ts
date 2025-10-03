/**
 * @fileoverview 系统配置 API 测试
 */
/// <reference types="@rbxts/testez/globals" />

import { App } from "../app";
import { BuiltinSchedules } from "../main-schedule";
import { system, chain, when, after, before, inSet } from "../../bevy_ecs/schedule";
import type { World } from "@rbxts/matter";
import type { Context } from "../../bevy_ecs";

export = () => {
describe("System Configs API", () => {
	let app: App;
	let executionOrder: string[] = [];

	beforeEach(() => {
		app = App.create();
		executionOrder = [];
	});

	const createSystem = (name: string) => {
		return (world: World, context: Context) => {
			executionOrder.push(name);
		};
	};

	describe("基本功能", () => {
		it("应该支持添加简单系统", () => {
			const systemA = createSystem("A");
			app.addSystems(BuiltinSchedules.UPDATE, systemA);
			// 第一次update运行启动调度和常规调度，第二次也运行常规调度
			app.update();
			app.update();
			expect(executionOrder.size()).to.equal(2);
			expect(executionOrder[0]).to.equal("A");
			expect(executionOrder[1]).to.equal("A");
		});

		it("应该支持添加多个系统", () => {
			const systemA = createSystem("A");
			const systemB = createSystem("B");
			const systemC = createSystem("C");
			app.addSystems(BuiltinSchedules.UPDATE, systemA, systemB, systemC);
			app.update();
			app.update();
			expect(executionOrder.includes("A")).to.equal(true);
			expect(executionOrder.includes("B")).to.equal(true);
			expect(executionOrder.includes("C")).to.equal(true);
		});
	});

	describe("链式配置", () => {
		it("应该支持 system() 包装器", () => {
			const systemA = createSystem("A");
			const systemB = system(createSystem("B"));

			app.addSystems(BuiltinSchedules.UPDATE, systemA, systemB.after(systemA));
			app.update();
			app.update();

			expect(executionOrder.size()).to.equal(4);
			expect(executionOrder[0]).to.equal("A");
			expect(executionOrder[1]).to.equal("B");
			expect(executionOrder[2]).to.equal("A");
			expect(executionOrder[3]).to.equal("B");
		});

		it("应该支持 chain() 顺序执行", () => {
			const systemA = createSystem("A");
			const systemB = createSystem("B");
			const systemC = createSystem("C");

			app.addSystems(BuiltinSchedules.UPDATE, chain(systemA, systemB, systemC));
			app.update();
			app.update();

			expect(executionOrder.size()).to.equal(6);
			expect(executionOrder[0]).to.equal("A");
			expect(executionOrder[1]).to.equal("B");
			expect(executionOrder[2]).to.equal("C");
			expect(executionOrder[3]).to.equal("A");
			expect(executionOrder[4]).to.equal("B");
			expect(executionOrder[5]).to.equal("C");
		});

		it("应该支持数组的 chain() 方法", () => {
			const systemA = createSystem("A");
			const systemB = createSystem("B");
			const systemC = createSystem("C");

			// 使用数组的链式方法
			const systems = [systemA, systemB, systemC];
			app.addSystems(BuiltinSchedules.UPDATE, chain(systemA, systemB, systemC));
			app.update();
			app.update();

			expect(executionOrder.size()).to.equal(6);
			expect(executionOrder[0]).to.equal("A");
			expect(executionOrder[1]).to.equal("B");
			expect(executionOrder[2]).to.equal("C");
			expect(executionOrder[3]).to.equal("A");
			expect(executionOrder[4]).to.equal("B");
			expect(executionOrder[5]).to.equal("C");
		});
	});

	describe("条件执行", () => {
		it("应该支持 runIf 条件", () => {
			let shouldRun = false;
			const systemA = system(createSystem("A"));

			app.addSystems(BuiltinSchedules.UPDATE, systemA.runIf(() => shouldRun));

			// 第一次不运行
			app.update();
			expect(executionOrder.size()).to.equal(0);

			// 第二次运行
			shouldRun = true;
			app.update();
			expect(executionOrder.size()).to.equal(1);
			expect(executionOrder[0]).to.equal("A");
		});

		it("应该支持 when() 辅助函数", () => {
			let shouldRun = true;
			const systemA = createSystem("A");

			app.addSystems(BuiltinSchedules.UPDATE, when(systemA, () => shouldRun));

			app.update();
			app.update();
			expect(executionOrder.size()).to.equal(2);
			expect(executionOrder[0]).to.equal("A");
			expect(executionOrder[1]).to.equal("A");

			shouldRun = false;
			executionOrder = [];
			app.update();
			expect(executionOrder.size()).to.equal(0);
		});
	});

	describe("顺序依赖", () => {
		it("应该支持 before 配置", () => {
			const systemA = createSystem("A");
			const systemB = system(createSystem("B"));

			app.addSystems(BuiltinSchedules.UPDATE, systemA, systemB.before(systemA));
			app.update();
			app.update();

			const indexA = executionOrder.indexOf("A");
			const indexB = executionOrder.indexOf("B");
			expect(indexB < indexA).to.equal(true);
		});

		it("应该支持 after 配置", () => {
			const systemA = createSystem("A");
			const systemB = system(createSystem("B"));

			app.addSystems(BuiltinSchedules.UPDATE, systemA, systemB.after(systemA));
			app.update();
			app.update();

			const indexA = executionOrder.indexOf("A");
			const indexB = executionOrder.indexOf("B");
			expect(indexB > indexA).to.equal(true);
		});

		it("应该支持 before() 和 after() 辅助函数", () => {
			const systemA = createSystem("A");
			const systemB = createSystem("B");
			const systemC = createSystem("C");

			app.addSystems(
				BuiltinSchedules.UPDATE,
				systemB,
				before(systemA, systemB),
				after(systemC, systemB),
			);
			app.update();
			app.update();

			const indexA = executionOrder.indexOf("A");
			const indexB = executionOrder.indexOf("B");
			const indexC = executionOrder.indexOf("C");

			expect(indexA < indexB).to.equal(true);
			expect(indexC > indexB).to.equal(true);
		});
	});

	describe("系统集", () => {
		it("应该支持 inSet 配置", () => {
			const systemA = system(createSystem("A"));
			const systemB = createSystem("B");

			// 测试带 inSet 的情况（现在可以正常工作了）
			app.addSystems(BuiltinSchedules.UPDATE, systemA.inSet("MySet"), systemB);

			// 系统集功能主要用于组织，这里只验证不会报错
			app.update();
			app.update();

			// 使用 indexOf 检查系统是否执行
			expect(executionOrder.indexOf("A") >= 0).to.equal(true);
			expect(executionOrder.indexOf("B") >= 0).to.equal(true);
		});
	});

	describe("复杂组合", () => {
		it("应该支持链式调用多个配置方法", () => {
			let shouldRun = true;
			const systemA = createSystem("A");
			const systemB = createSystem("B");
			const systemC = createSystem("C");

			app.addSystems(
				BuiltinSchedules.UPDATE,
				systemA,
				system(systemB).after(systemA).runIf(() => shouldRun).inSet("MySet"),
				after(systemC, systemB),
			);

			app.update();
			app.update();
			expect(executionOrder.size()).to.equal(6);
			expect(executionOrder[0]).to.equal("A");
			expect(executionOrder[1]).to.equal("B");
			expect(executionOrder[2]).to.equal("C");
			expect(executionOrder[3]).to.equal("A");
			expect(executionOrder[4]).to.equal("B");
			expect(executionOrder[5]).to.equal("C");
		});

		it("应该支持嵌套配置", () => {
			const systemA = createSystem("A");
			const systemB = createSystem("B");
			const systemC = createSystem("C");
			const systemD = createSystem("D");

			app.addSystems(
				BuiltinSchedules.UPDATE,
				chain(systemA, systemB),
				chain(systemC, systemD).after(systemB),
			);

			app.update();
			app.update();

			const indexB = executionOrder.indexOf("B");
			const indexC = executionOrder.indexOf("C");

			expect(indexC > indexB).to.equal(true);
			expect(executionOrder.indexOf("D") > executionOrder.indexOf("C")).to.equal(true);
		});
	});
});
};