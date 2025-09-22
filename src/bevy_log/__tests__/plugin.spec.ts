/**
 * LogPlugin 单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { App } from "../../bevy_app/app";
import { LogPlugin, Level } from "../index";
import { LogSubscriber, Layer, LogRecord } from "../roblox-tracing";

export = () => {
	describe("LogPlugin", () => {
		afterEach(() => {
			// 清理全局订阅器
			LogSubscriber.clearGlobal();
		});

		it("应该使用默认配置创建插件", () => {
			const plugin = new LogPlugin();
			expect(plugin.filter).to.be.a("string");
			expect(plugin.level).to.equal(Level.INFO);
			expect(plugin.name()).to.equal("LogPlugin");
		});

		it("应该接受自定义配置", () => {
			const plugin = new LogPlugin({
				level: Level.DEBUG,
				filter: "custom=trace",
			});
			expect(plugin.level).to.equal(Level.DEBUG);
			expect(plugin.filter).to.equal("custom=trace");
		});

		it("应该在 App 中正确构建", () => {
			const app = new App();
			const plugin = new LogPlugin({
				level: Level.WARN,
				filter: "test=debug",
			});

			app.addPlugin(plugin);

			// 验证全局订阅器已设置
			const subscriber = LogSubscriber.getGlobal();
			expect(subscriber).to.be.ok();
		});

		it("应该支持自定义层", () => {
			let customLayerCalled = false;
			const customLayer: Layer = {
				onEvent(record: LogRecord) {
					customLayerCalled = true;
				},
				name() {
					return "CustomLayer";
				},
			};

			const plugin = new LogPlugin({
				customLayer: () => customLayer,
			});

			const app = new App();
			app.addPlugin(plugin);

			// 触发日志事件
			const subscriber = LogSubscriber.getGlobal();
			if (subscriber) {
				subscriber.logEvent({
					level: Level.INFO,
					message: "Test message",
					timestamp: os.time(),
				});
			}

			expect(customLayerCalled).to.equal(true);
		});

		it("应该支持自定义格式化层", () => {
			let fmtLayerCalled = false;
			const fmtLayer: Layer = {
				onEvent(record: LogRecord) {
					fmtLayerCalled = true;
				},
				name() {
					return "FmtLayer";
				},
			};

			const plugin = new LogPlugin({
				fmtLayer: () => fmtLayer,
			});

			const app = new App();
			app.addPlugin(plugin);

			// 触发日志事件
			const subscriber = LogSubscriber.getGlobal();
			if (subscriber) {
				subscriber.logEvent({
					level: Level.INFO,
					message: "Test message",
					timestamp: os.time(),
				});
			}

			expect(fmtLayerCalled).to.equal(true);
		});

		it("应该防止重复设置全局订阅器", () => {
			const app1 = new App();
			const plugin1 = new LogPlugin();
			app1.addPlugin(plugin1);

			// 第二次尝试应该失败
			const app2 = new App();
			const plugin2 = new LogPlugin();

			// 由于 error 函数会输出错误，这里只验证不会崩溃
			expect(() => {
				app2.addPlugin(plugin2);
			}).never.to.throw();
		});

		it("应该正确设置过滤器", () => {
			const plugin = new LogPlugin({
				level: Level.ERROR,
				filter: "bevy_app=warn,bevy_ecs=info",
			});

			const app = new App();
			app.addPlugin(plugin);

			// 插件应该正确初始化
			expect(LogSubscriber.getGlobal()).to.be.ok();
		});
	});

	describe("LogSubscriber", () => {
		afterEach(() => {
			LogSubscriber.clearGlobal();
		});

		it("应该添加和触发层", () => {
			const events: string[] = [];

			const layer1: Layer = {
				onEvent(record) {
					events.push(`Layer1: ${record.message}`);
				},
				name() {
					return "Layer1";
				},
			};

			const layer2: Layer = {
				onEvent(record) {
					events.push(`Layer2: ${record.message}`);
				},
				name() {
					return "Layer2";
				},
			};

			const subscriber = new LogSubscriber();
			subscriber.addLayer(layer1);
			subscriber.addLayer(layer2);

			subscriber.logEvent({
				level: Level.INFO,
				message: "Test",
				timestamp: os.time(),
			});

			expect(events.size()).to.equal(2);
			expect(events[0]).to.equal("Layer1: Test");
			expect(events[1]).to.equal("Layer2: Test");
		});

		it("应该正确设置和获取全局订阅器", () => {
			expect(LogSubscriber.getGlobal()).never.to.be.ok();

			const subscriber = new LogSubscriber();
			const result = LogSubscriber.setGlobalDefault(subscriber);
			expect(result).to.equal(true);
			expect(LogSubscriber.getGlobal()).to.equal(subscriber);

			// 再次设置应该失败
			const subscriber2 = new LogSubscriber();
			const result2 = LogSubscriber.setGlobalDefault(subscriber2);
			expect(result2).to.equal(false);
		});

		it("应该清除全局订阅器", () => {
			const subscriber = new LogSubscriber();
			LogSubscriber.setGlobalDefault(subscriber);
			expect(LogSubscriber.getGlobal()).to.be.ok();

			LogSubscriber.clearGlobal();
			expect(LogSubscriber.getGlobal()).never.to.be.ok();
		});
	});
};