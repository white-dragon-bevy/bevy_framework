/// <reference types="@rbxts/testez/globals" />

import { LogLevel } from "../src/level";
import { TargetFilter, RegexFilter, CompositeFilter, RateLimitFilter } from "../src/filter";

export = () => {
	describe("TargetFilter", () => {
		it("should parse filter string correctly", () => {
			const filter = new TargetFilter("warn,my_module=debug,my_module.submodule=trace");

			// Default level is warn
			expect(filter.isEnabled(LogLevel.Warn, "other_module")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "other_module")).to.equal(false);

			// my_module is debug
			expect(filter.isEnabled(LogLevel.Debug, "my_module")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Trace, "my_module")).to.equal(false);

			// my_module.submodule is trace
			expect(filter.isEnabled(LogLevel.Trace, "my_module.submodule")).to.equal(true);
		});

		it("should match module hierarchies", () => {
			const filter = new TargetFilter();
			filter.setTargetLevel("app", LogLevel.Info);
			filter.setTargetLevel("app.network", LogLevel.Debug);

			expect(filter.isEnabled(LogLevel.Info, "app")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Debug, "app")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Debug, "app.network")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Trace, "app.network")).to.equal(false);
			expect(filter.isEnabled(LogLevel.Debug, "app.network.http")).to.equal(true);
		});

		it("should use most specific match", () => {
			const filter = new TargetFilter();
			filter.setDefaultLevel(LogLevel.Error);
			filter.setTargetLevel("app", LogLevel.Warn);
			filter.setTargetLevel("app.module", LogLevel.Info);
			filter.setTargetLevel("app.module.component", LogLevel.Trace);

			expect(filter.isEnabled(LogLevel.Error, "other")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Warn, "app.other")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "app.module.other")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Trace, "app.module.component.detail")).to.equal(true);
		});
	});

	describe("RegexFilter", () => {
		it("should filter by include patterns", () => {
			const filter = new RegexFilter();
			filter.addIncludePattern("network");
			filter.addIncludePattern("database");

			expect(filter.isEnabled(LogLevel.Info, "app.network.http")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "database.connection")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "app.ui")).to.equal(false);
		});

		it("should filter by exclude patterns", () => {
			const filter = new RegexFilter();
			filter.addExcludePattern("debug");
			filter.addExcludePattern("test");

			expect(filter.isEnabled(LogLevel.Info, "app.main")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "app.debug")).to.equal(false);
			expect(filter.isEnabled(LogLevel.Info, "test.module")).to.equal(false);
		});

		it("should apply both include and exclude patterns", () => {
			const filter = new RegexFilter();
			filter.addIncludePattern("app");
			filter.addExcludePattern("debug");

			expect(filter.isEnabled(LogLevel.Info, "app.main")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "app.debug")).to.equal(false);
			expect(filter.isEnabled(LogLevel.Info, "other.main")).to.equal(false);
		});
	});

	describe("CompositeFilter", () => {
		it("should require all filters in 'all' mode", () => {
			const filter = new CompositeFilter("all");

			const filter1 = new TargetFilter("info");
			const filter2 = new RegexFilter();
			filter2.addIncludePattern("app");

			filter.addFilter(filter1);
			filter.addFilter(filter2);

			// Must pass both filters
			expect(filter.isEnabled(LogLevel.Info, "app.module")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Debug, "app.module")).to.equal(false); // Fails filter1
			expect(filter.isEnabled(LogLevel.Info, "other.module")).to.equal(false); // Fails filter2
		});

		it("should require any filter in 'any' mode", () => {
			const filter = new CompositeFilter("any");

			const filter1 = new TargetFilter("error");
			const filter2 = new RegexFilter();
			filter2.addIncludePattern("important");

			filter.addFilter(filter1);
			filter.addFilter(filter2);

			// Passes if any filter passes
			expect(filter.isEnabled(LogLevel.Error, "any.module")).to.equal(true); // Passes filter1
			expect(filter.isEnabled(LogLevel.Info, "important.module")).to.equal(true); // Passes filter2
			expect(filter.isEnabled(LogLevel.Info, "other.module")).to.equal(false); // Fails both
		});
	});

	describe("RateLimitFilter", () => {
		it("should limit logs per second", () => {
			const filter = new RateLimitFilter(3, 1);
			const target = "test.module";

			// First 3 should pass
			expect(filter.isEnabled(LogLevel.Info, target)).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, target)).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, target)).to.equal(true);

			// 4th should be blocked
			expect(filter.isEnabled(LogLevel.Info, target)).to.equal(false);
			expect(filter.isEnabled(LogLevel.Info, target)).to.equal(false);
		});

		it("should track limits per target and level", () => {
			const filter = new RateLimitFilter(2, 1);

			// Different targets have separate limits
			expect(filter.isEnabled(LogLevel.Info, "module1")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "module1")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "module1")).to.equal(false);

			expect(filter.isEnabled(LogLevel.Info, "module2")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "module2")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, "module2")).to.equal(false);

			// Different levels have separate limits
			expect(filter.isEnabled(LogLevel.Warn, "module1")).to.equal(true);
			expect(filter.isEnabled(LogLevel.Error, "module1")).to.equal(true);
		});

		it("should reset counters", () => {
			const filter = new RateLimitFilter(1, 1);
			const target = "test";

			expect(filter.isEnabled(LogLevel.Info, target)).to.equal(true);
			expect(filter.isEnabled(LogLevel.Info, target)).to.equal(false);

			filter.reset();

			expect(filter.isEnabled(LogLevel.Info, target)).to.equal(true);
		});
	});
};