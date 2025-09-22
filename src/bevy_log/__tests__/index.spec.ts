/**
 * bevy_log 测试套件入口
 */

/// <reference types="@rbxts/testez/globals" />

import filterSpec = require("./filter.spec");
import onceSpec = require("./once.spec");
import pluginSpec = require("./plugin.spec");

export = () => {
	describe("bevy_log", () => {
		// 导入并运行各个测试文件
		describe("filter", filterSpec);
		describe("once", onceSpec);
		describe("plugin", pluginSpec);
	});
};