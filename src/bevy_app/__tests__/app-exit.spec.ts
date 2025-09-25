/**
 * AppExit 消息系统测试
 */

import { App } from "../app";
import { AppExit, AppExitCode } from "../types";

export = () => {
	describe("AppExit 消息系统", () => {
		describe("基本功能", () => {
			it("应该默认不退出", () => {
				const app = App.create();
				const shouldExit = app.shouldExit();
				expect(shouldExit).to.equal(undefined);
			});

			it("应该能发送成功退出事件", () => {
				const app = App.create();

				// 发送退出事件
				app.exit();

				// 检查退出状态
				const shouldExit = app.shouldExit();
				expect(shouldExit).to.be.ok();
				expect(shouldExit!.code).to.equal(AppExitCode.Success);
			});

			it("应该能发送错误退出事件", () => {
				const app = App.create();

				// 发送带错误码的退出事件
				app.exitWithCode(42);

				// 检查退出状态
				const shouldExit = app.shouldExit();
				expect(shouldExit).to.be.ok();
				expect(shouldExit!.code).to.equal(42);
			});
		});

		describe("多个退出事件", () => {
			it("应该优先返回错误退出码", () => {
				const app = App.create();

				// 发送多个退出事件
				app.exit(); // 成功
				app.exitWithCode(1); // 错误
				app.exit(); // 成功

				// 应该返回错误退出码
				const shouldExit = app.shouldExit();
				expect(shouldExit).to.be.ok();
				expect(shouldExit!.code !== AppExitCode.Success).to.equal(true);
				expect(shouldExit!.code).to.equal(1);
			});

			it("多个错误码时返回第一个错误", () => {
				const app = App.create();

				// 发送多个错误退出事件
				app.exitWithCode(10);
				app.exitWithCode(20);
				app.exitWithCode(30);

				// 应该返回第一个错误码
				const shouldExit = app.shouldExit();
				expect(shouldExit).to.be.ok();
				expect(shouldExit!.code).to.equal(10);
			});
		});

		describe("与 update 循环集成", () => {
			it("应该在 update 后检查退出状态", () => {
				const app = App.create();
				let updateCount = 0;
				let shouldStop = false;

				// 添加一个系统，在第三次更新时发送退出事件
				app.addSystems("Update", () => {
					updateCount++;
					if (updateCount === 3) {
						app.exit();
					}
				});

				// 模拟更新循环
				for (let i = 0; i < 5; i++) {
					if (shouldStop) break;

					app.update();

					const exitStatus = app.shouldExit();
					if (exitStatus !== undefined) {
						shouldStop = true;
					}
				}

				expect(updateCount).to.equal(3);
				expect(shouldStop).to.equal(true);
			});
		});

		describe("AppExit 类", () => {
			it("应该正确创建成功退出实例", () => {
				const exit = AppExit.success();
				expect(exit.isSuccess()).to.equal(true);
				expect(exit.isError()).to.equal(false);
				expect(exit.code).to.equal(AppExitCode.Success);
			});

			it("应该正确创建错误退出实例", () => {
				const exit = AppExit.error(5);
				expect(exit.isSuccess()).to.equal(false);
				expect(exit.isError()).to.equal(true);
				expect(exit.code).to.equal(5);
			});

			it("应该有时间戳", () => {
				const exit = AppExit.success();
				expect(exit.timestamp).to.be.a("number");
				expect(exit.timestamp).to.be.near(os.clock(), 0.1);
			});
		});

		describe("事件清理", () => {
			it("连续调用 shouldExit 应该返回相同结果直到事件被清理", () => {
				const app = App.create();

				// 发送退出事件
				app.exitWithCode(99);

				// 第一次检查
				const firstCheck = app.shouldExit();
				expect(firstCheck).to.be.ok();
				expect(firstCheck!.code).to.equal(99);

				// 第二次检查应该没有新事件
				// （因为事件已经被读取过了）
				const secondCheck = app.shouldExit();
				expect(secondCheck).to.equal(undefined);
			});
		});
	});
};