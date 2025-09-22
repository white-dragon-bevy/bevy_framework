/**
 * 诊断插件集成测试
 */

/// <reference types="@rbxts/testez/globals" />

import { App } from "../../../src/bevy_app/app";
import { ScheduleLabel } from "../../../src/bevy_app/scheduler";
import { World } from "@rbxts/matter";
import {
	DiagnosticsPlugin,
	DiagnosticsStore,
	DiagnosticPath,
	Diagnostic,
	FrameCountPlugin,
	FrameCount,
	updateFrameCount,
	FrameTimeDiagnosticsPlugin,
	LogDiagnosticsPlugin,
	LogDiagnosticsState,
	EntityCountDiagnosticsPlugin,
} from "../index";

export = () => {
	describe("DiagnosticsPlugin", () => {
		it("should initialize DiagnosticsStore resource", () => {
			const app = App.create();
			app.addPlugin(new DiagnosticsPlugin());

			const diagnosticsStore = app.getResource(DiagnosticsStore);
			expect(diagnosticsStore).to.be.ok();
			expect(diagnosticsStore).to.be.a("table");
		});
	});

	describe("FrameCountPlugin", () => {
		it("should initialize FrameCount resource", () => {
			const app = App.create();
			app.addPlugin(new FrameCountPlugin());

			const frameCount = app.getResource(FrameCount);
			expect(frameCount).to.be.ok();
			expect(frameCount?.value).to.equal(0);
		});

		it("should increment frame count", () => {
			const app = App.create();
			const frameCount = new FrameCount();
			app.insertResource(frameCount);
			const world = app.main().world().getWorld();

			updateFrameCount(world);
			expect(frameCount.value).to.equal(1);

			updateFrameCount(world);
			expect(frameCount.value).to.equal(2);
		});

		it("should wrap around at max value", () => {
			const app = App.create();
			const frameCount = new FrameCount(2 ** 32 - 1);
			app.insertResource(frameCount);
			const world = app.main().world().getWorld();

			updateFrameCount(world);
			expect(frameCount.value).to.equal(0);
		});
	});

	describe("FrameTimeDiagnosticsPlugin", () => {
		it("should register frame time diagnostics", () => {
			const app = App.create();
			app.addPlugin(new DiagnosticsPlugin());
			app.addPlugin(new FrameTimeDiagnosticsPlugin());

			const diagnosticsStore = app.getResource(DiagnosticsStore);
			expect(diagnosticsStore).to.be.ok();

			const fpsDiagnostic = diagnosticsStore?.get(FrameTimeDiagnosticsPlugin.FPS);
			expect(fpsDiagnostic).to.be.ok();

			const frameTimeDiagnostic = diagnosticsStore?.get(FrameTimeDiagnosticsPlugin.FRAME_TIME);
			expect(frameTimeDiagnostic).to.be.ok();
			expect(frameTimeDiagnostic?.suffix).to.equal("ms");

			const frameCountDiagnostic = diagnosticsStore?.get(FrameTimeDiagnosticsPlugin.FRAME_COUNT);
			expect(frameCountDiagnostic).to.be.ok();
		});

		it("should use custom history length", () => {
			const app = App.create();
			app.addPlugin(new DiagnosticsPlugin());
			app.addPlugin(new FrameTimeDiagnosticsPlugin(60));

			const diagnosticsStore = app.getResource(DiagnosticsStore);
			const fpsDiagnostic = diagnosticsStore?.get(FrameTimeDiagnosticsPlugin.FPS);

			expect(fpsDiagnostic?.getMaxHistoryLength()).to.equal(60);
		});
	});

	describe("LogDiagnosticsPlugin", () => {
		it("should initialize LogDiagnosticsState", () => {
			const app = App.create();
			app.addPlugin(new LogDiagnosticsPlugin());

			const state = app.getResource(LogDiagnosticsState);
			expect(state).to.be.ok();
		});

		it("should support filter configuration", () => {
			const filter = new Set<string>();
			filter.add("fps");
			filter.add("frame_time");

			const plugin = LogDiagnosticsPlugin.filtered(filter);
			expect(plugin.filter).to.equal(filter);
		});

		it("should manage filters in state", () => {
			const state = new LogDiagnosticsState(1);
			const path = DiagnosticPath.constNew("test");

			expect(state.addFilter(path)).to.equal(true);
			expect(state.addFilter(path)).to.equal(false); // Already exists

			expect(state.removeFilter(path)).to.equal(true);
			expect(state.removeFilter(path)).to.equal(false); // Already removed
		});

		it("should extend filters", () => {
			const state = new LogDiagnosticsState(1);
			const paths = [DiagnosticPath.constNew("test1"), DiagnosticPath.constNew("test2")];

			state.extendFilter(paths);
			expect(state.filter?.size).to.equal(2);
		});

		it("should enable and disable filtering", () => {
			const state = new LogDiagnosticsState(1);

			state.enableFiltering();
			expect(state.filter).to.be.ok();
			expect(state.filter?.size).to.equal(0);

			state.disableFiltering();
			expect(state.filter).to.equal(undefined);
		});
	});

	describe("EntityCountDiagnosticsPlugin", () => {
		it("should register entity count diagnostic", () => {
			const app = App.create();
			app.addPlugin(new DiagnosticsPlugin());
			app.addPlugin(new EntityCountDiagnosticsPlugin());

			const diagnosticsStore = app.getResource(DiagnosticsStore);
			const entityCountDiagnostic = diagnosticsStore?.get(EntityCountDiagnosticsPlugin.ENTITY_COUNT);

			expect(entityCountDiagnostic).to.be.ok();
		});

		it("should use custom history length", () => {
			const app = App.create();
			app.addPlugin(new DiagnosticsPlugin());
			app.addPlugin(new EntityCountDiagnosticsPlugin(50));

			const diagnosticsStore = app.getResource(DiagnosticsStore);
			const entityCountDiagnostic = diagnosticsStore?.get(EntityCountDiagnosticsPlugin.ENTITY_COUNT);

			expect(entityCountDiagnostic?.getMaxHistoryLength()).to.equal(50);
		});
	});

	describe("App.registerDiagnostic", () => {
		it("should register diagnostic through App", () => {
			const app = App.create();
			const path = DiagnosticPath.constNew("custom/diagnostic");
			const diagnostic = Diagnostic.new(path).withSuffix("units");

			app.registerDiagnostic(diagnostic);

			const diagnosticsStore = app.getResource(DiagnosticsStore);
			const retrieved = diagnosticsStore?.get(path);

			expect(retrieved).to.be.ok();
			expect(retrieved?.suffix).to.equal("units");
		});

		it("should create DiagnosticsStore if not exists", () => {
			const app = App.create();

			// 不先添加 DiagnosticsPlugin
			const path = DiagnosticPath.constNew("custom/diagnostic");
			const diagnostic = Diagnostic.new(path);

			app.registerDiagnostic(diagnostic);

			const diagnosticsStore = app.getResource(DiagnosticsStore);
			expect(diagnosticsStore).to.be.ok();

			const retrieved = diagnosticsStore?.get(path);
			expect(retrieved).to.be.ok();
		});
	});
};