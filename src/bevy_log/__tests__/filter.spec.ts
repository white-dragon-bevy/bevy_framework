/**
 * EnvFilter 单元测试
 */

/// <reference types="@rbxts/testez/globals" />

import { EnvFilter } from "../filter";
import { Level } from "../level";

export = () => {
	describe("EnvFilter", () => {
		it("应该解析默认级别", () => {
			const filter = new EnvFilter("info");
			expect(filter.getDefaultLevel()).to.equal(Level.INFO);

			const filter2 = new EnvFilter("debug");
			expect(filter2.getDefaultLevel()).to.equal(Level.DEBUG);
		});

		it("应该解析模块特定的级别", () => {
			const filter = new EnvFilter("warn,my_module=debug");
			expect(filter.getDefaultLevel()).to.equal(Level.WARN);

			const moduleFilters = filter.getModuleFilters();
			expect(moduleFilters.size()).to.equal(1);
			expect(moduleFilters[0].module).to.equal("my_module");
			expect(moduleFilters[0].level).to.equal(Level.DEBUG);
		});

		it("应该正确判断日志是否启用", () => {
			const filter = new EnvFilter("warn,my_module=debug,my_module::sub=trace");

			// 默认级别
			expect(filter.isEnabled(Level.ERROR)).to.equal(true);
			expect(filter.isEnabled(Level.WARN)).to.equal(true);
			expect(filter.isEnabled(Level.INFO)).to.equal(false);
			expect(filter.isEnabled(Level.DEBUG)).to.equal(false);

			// my_module 级别
			expect(filter.isEnabled(Level.DEBUG, "my_module")).to.equal(true);
			expect(filter.isEnabled(Level.TRACE, "my_module")).to.equal(false);

			// my_module::sub 级别（更具体的规则优先）
			expect(filter.isEnabled(Level.TRACE, "my_module::sub")).to.equal(true);
		});

		it("应该处理复杂的过滤器字符串", () => {
			const filter = new EnvFilter("error,bevy_app=warn,bevy_ecs=info,bevy_render=debug");

			expect(filter.getDefaultLevel()).to.equal(Level.ERROR);
			expect(filter.isEnabled(Level.ERROR, "random_module")).to.equal(true);
			expect(filter.isEnabled(Level.WARN, "random_module")).to.equal(false);

			expect(filter.isEnabled(Level.WARN, "bevy_app")).to.equal(true);
			expect(filter.isEnabled(Level.INFO, "bevy_ecs")).to.equal(true);
			expect(filter.isEnabled(Level.DEBUG, "bevy_render")).to.equal(true);
		});

		it("应该支持宽松解析模式", () => {
			// 包含无效部分的过滤器
			const filter = EnvFilter.parseLossy("info,invalid_level,my_module=debug");

			// 应该忽略无效部分
			expect(filter.getDefaultLevel()).to.equal(Level.INFO);
			expect(filter.isEnabled(Level.DEBUG, "my_module")).to.equal(true);
		});

		it("应该处理空字符串", () => {
			const filter = new EnvFilter("");
			expect(filter.getDefaultLevel()).to.equal(Level.INFO); // 默认值
		});

		it("应该正确排序模块过滤器", () => {
			const filter = new EnvFilter("info,a=warn,a::b=debug,a::b::c=trace");
			const moduleFilters = filter.getModuleFilters();

			// 应该按路径长度降序排序
			expect(moduleFilters[0].module).to.equal("a::b::c");
			expect(moduleFilters[1].module).to.equal("a::b");
			expect(moduleFilters[2].module).to.equal("a");
		});
	});
};