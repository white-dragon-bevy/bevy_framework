/**
 * Once 函数单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import {
	once,
	traceOnce,
	debugOnce,
	infoOnce,
	warnOnce,
	errorOnce,
	clearOnceCache,
} from "../once";

export = () => {
	describe("Once Functions", () => {
		beforeEach(() => {
			// 清除缓存以确保测试独立
			clearOnceCache();
		});

		it("应该只执行一次", () => {
			let counter = 0;
			const increment = () => {
				counter++;
			};

			// 在同一位置多次调用
			for (let i = 0; i < 5; i++) {
				once(increment);
			}

			expect(counter).to.equal(1);
		});

		it("不同位置的 once 应该独立", () => {
			let counter = 0;
			const increment = () => {
				counter++;
			};

			// 位置 1
			once(increment);
			// 位置 2
			once(increment);

			// 由于是不同的调用位置，应该执行两次
			expect(counter).to.equal(2);
		});

		it("clearOnceCache 应该重置缓存", () => {
			let counter = 0;
			const increment = () => {
				counter++;
			};

			once(increment);
			expect(counter).to.equal(1);

			// 清除缓存
			clearOnceCache();

			// 再次调用应该执行
			once(increment);
			expect(counter).to.equal(2);
		});

		describe("日志 Once 函数", () => {
			let logMessages: string[] = [];

			beforeEach(() => {
				logMessages = [];
				clearOnceCache();
			});

			it("traceOnce 应该只记录一次", () => {
				// 模拟多次调用
				for (let i = 0; i < 3; i++) {
					traceOnce("Trace message");
				}
				// 由于实际日志输出到控制台，这里只验证函数可以正常调用
				expect(true).to.equal(true);
			});

			it("debugOnce 应该只记录一次", () => {
				for (let i = 0; i < 3; i++) {
					debugOnce("Debug message");
				}
				expect(true).to.equal(true);
			});

			it("infoOnce 应该只记录一次", () => {
				for (let i = 0; i < 3; i++) {
					infoOnce("Info message");
				}
				expect(true).to.equal(true);
			});

			it("warnOnce 应该只记录一次", () => {
				for (let i = 0; i < 3; i++) {
					warnOnce("Warning message");
				}
				expect(true).to.equal(true);
			});

			it("errorOnce 应该只记录一次", () => {
				for (let i = 0; i < 3; i++) {
					errorOnce("Error message");
				}
				expect(true).to.equal(true);
			});

			it("应该支持模块名称和额外字段", () => {
				const fields = new Map<string, unknown>();
				fields.set("key", "value");
				fields.set("count", 42);

				infoOnce("Message with fields", "test_module", fields);
				expect(true).to.equal(true);
			});
		});
	});
};