/**
 * 诊断系统核心功能测试
 * 对应 Rust bevy_diagnostic 的测试
 */

/// <reference types="@rbxts/testez/globals" />

import { Diagnostic, DiagnosticMeasurement, DiagnosticPath, DiagnosticsStore } from "../diagnostic";

export = () => {
	describe("DiagnosticPath", () => {
		it("should create valid diagnostic path", () => {
			const path = DiagnosticPath.constNew("test/path");
			expect(path.asStr()).to.equal("test/path");
		});

		it("should create path from components", () => {
			const path = DiagnosticPath.fromComponents(["test", "path", "nested"]);
			expect(path.asStr()).to.equal("test/path/nested");
		});

		it("should split path into components", () => {
			const path = DiagnosticPath.constNew("test/path/nested");
			const components = path.components();
			expect(components[0]).to.equal("test");
			expect(components[1]).to.equal("path");
			expect(components[2]).to.equal("nested");
		});

		it("should throw on invalid paths", () => {
			expect(() => new DiagnosticPath("")).to.throw();
			expect(() => new DiagnosticPath("/test")).to.throw();
			expect(() => new DiagnosticPath("test/")).to.throw();
			expect(() => new DiagnosticPath("test//path")).to.throw();
		});
	});

	describe("Diagnostic", () => {
		it("should add measurements", () => {
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path);

			const measurement: DiagnosticMeasurement = {
				time: 0,
				value: 10,
			};

			diagnostic.addMeasurement(measurement);
			expect(diagnostic.value()).to.equal(10);
			expect(diagnostic.historyLen()).to.equal(1);
		});

		it("should calculate average", () => {
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path);

			for (let i = 0; i < 5; i++) {
				diagnostic.addMeasurement({
					time: i,
					value: i * 10, // 0, 10, 20, 30, 40
				});
			}

			const average = diagnostic.average();
			expect(average).to.be.ok();
			expect(average).to.equal(20); // (0 + 10 + 20 + 30 + 40) / 5
		});

		it("should respect max history length", () => {
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path).withMaxHistoryLength(3);

			for (let i = 0; i < 5; i++) {
				diagnostic.addMeasurement({
					time: i,
					value: i,
				});
			}

			expect(diagnostic.historyLen()).to.equal(3);
			expect(diagnostic.value()).to.equal(4); // Last value
		});

		it("should clear history", () => {
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path);

			diagnostic.addMeasurement({ time: 0, value: 10 });
			diagnostic.addMeasurement({ time: 1, value: 20 });

			expect(diagnostic.historyLen()).to.equal(2);

			diagnostic.clearHistory();

			expect(diagnostic.historyLen()).to.equal(0);
			expect(diagnostic.value()).to.equal(undefined);
			expect(diagnostic.average()).to.equal(undefined);
		});

		it("should handle NaN values", () => {
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path);

			diagnostic.addMeasurement({ time: 0, value: 10 });
			diagnostic.addMeasurement({ time: 1, value: 0 / 0 }); // NaN
			diagnostic.addMeasurement({ time: 2, value: 20 });

			const values = diagnostic.values();
			expect(values.size()).to.equal(3);
			expect(isNaN(values[1])).to.equal(true);
		});

		it("should calculate duration", () => {
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path);

			diagnostic.addMeasurement({ time: 0, value: 10 });
			diagnostic.addMeasurement({ time: 5, value: 20 });

			const duration = diagnostic.duration();
			expect(duration).to.equal(5);
		});

		it("should apply suffix", () => {
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path).withSuffix("ms");

			expect(diagnostic.suffix).to.equal("ms");
		});
	});

	describe("DiagnosticsStore", () => {
		it("should add and retrieve diagnostics", () => {
			const store = new DiagnosticsStore();
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path);

			store.add(diagnostic);

			const retrieved = store.get(path);
			expect(retrieved).to.be.ok();
			expect(retrieved).to.equal(diagnostic);
		});

		it("should get measurement from enabled diagnostic", () => {
			const store = new DiagnosticsStore();
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path);

			diagnostic.addMeasurement({ time: 0, value: 10 });
			store.add(diagnostic);

			const measurement = store.getMeasurement(path);
			expect(measurement).to.be.ok();
			expect(measurement?.value).to.equal(10);
		});

		it("should not get measurement from disabled diagnostic", () => {
			const store = new DiagnosticsStore();
			const path = DiagnosticPath.constNew("test");
			const diagnostic = Diagnostic.new(path);

			diagnostic.isEnabled = false;
			diagnostic.addMeasurement({ time: 0, value: 10 });
			store.add(diagnostic);

			const measurement = store.getMeasurement(path);
			expect(measurement).to.equal(undefined);
		});

		it("should iterate over diagnostics", () => {
			const store = new DiagnosticsStore();

			const path1 = DiagnosticPath.constNew("test1");
			const path2 = DiagnosticPath.constNew("test2");

			store.add(Diagnostic.new(path1));
			store.add(Diagnostic.new(path2));

			const diagnostics = store.iter();
			expect(diagnostics.size()).to.equal(2);
		});
	});
};