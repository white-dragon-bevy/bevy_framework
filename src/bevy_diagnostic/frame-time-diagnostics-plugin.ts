/**
 * 帧时间诊断插件
 * 对应 Rust bevy_diagnostic 的 frame_time_diagnostics_plugin.rs
 */

import { Plugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { World, Context } from "../bevy_ecs";
import { Update } from "../../src/bevy_app/main-schedule";
import {
	Diagnostic,
	DiagnosticPath,
	Diagnostics,
	DiagnosticsStore,
	DEFAULT_MAX_HISTORY_LENGTH,
	registerDiagnostic,
} from "./diagnostic";
import { FrameCount } from "./frame-count-diagnostics-plugin";

/**
 * 向应用添加"帧时间"诊断，具体包括"帧时间"、"fps"和"帧计数"
 * 对应 Rust FrameTimeDiagnosticsPlugin
 *
 * @see LogDiagnosticsPlugin 用于将诊断输出到控制台
 */
export class FrameTimeDiagnosticsPlugin implements Plugin {
	/** 保留用于平均的总值数量 */
	maxHistoryLength: number;
	/** 指数移动平均的平滑因子。通常为 2.0 / (history_length + 1.0) */
	smoothingFactor: number;

	constructor(maxHistoryLength: number = DEFAULT_MAX_HISTORY_LENGTH) {
		this.maxHistoryLength = maxHistoryLength;
		this.smoothingFactor = 2.0 / (maxHistoryLength + 1.0);
	}

	/**
	 * 创建带有指定 max_history_length 和合理 smoothing_factor 的新插件
	 * 对应 Rust new
	 * @param maxHistoryLength - 最大历史长度
	 * @returns 插件实例
	 */
	static create(maxHistoryLength: number): FrameTimeDiagnosticsPlugin {
		return new FrameTimeDiagnosticsPlugin(maxHistoryLength);
	}

	/**
	 * 每秒帧数
	 * 对应 Rust FPS
	 */
	static readonly FPS = DiagnosticPath.constNew("fps");

	/**
	 * 自应用启动以来的总帧数
	 * 对应 Rust FRAME_COUNT
	 */
	static readonly FRAME_COUNT = DiagnosticPath.constNew("frame_count");

	/**
	 * 帧时间（毫秒）
	 * 对应 Rust FRAME_TIME
	 */
	static readonly FRAME_TIME = DiagnosticPath.constNew("frame_time");

	/**
	 * 配置应用
	 * @param app - 应用实例
	 */
	build(app: App): void {
		registerDiagnostic(
			app,
			Diagnostic.create(FrameTimeDiagnosticsPlugin.FRAME_TIME)
				.withSuffix("ms")
				.withMaxHistoryLength(this.maxHistoryLength)
				.withSmoothingFactor(this.smoothingFactor),
		);

		registerDiagnostic(
			app,
			Diagnostic.create(FrameTimeDiagnosticsPlugin.FPS)
				.withMaxHistoryLength(this.maxHistoryLength)
				.withSmoothingFactor(this.smoothingFactor),
		);

		registerDiagnostic(
			app,
			Diagnostic.create(FrameTimeDiagnosticsPlugin.FRAME_COUNT).withSmoothingFactor(0.0).withMaxHistoryLength(0),
		).addSystems(Update, (world, context) => FrameTimeDiagnosticsPlugin.diagnosticSystem(world, context));
	}

	/**
	 * 插件名称
	 * @returns 插件名称字符串
	 */
	name(): string {
		return "FrameTimeDiagnosticsPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns true表示只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}

	/**
	 * 更新帧计数、帧时间和 FPS 测量值
	 * 对应 Rust diagnostic_system
	 * @param world - ECS世界
	 * @param context - 系统上下文
	 */
	static diagnosticSystem(world: World, context: Context): void {
		const resources = world.resources;
		const diagnosticsStore = resources.getResource<DiagnosticsStore>();
		const frameCount = resources.getResource<FrameCount>();

		if (!diagnosticsStore) return;

		const diagnostics = new Diagnostics(diagnosticsStore);

		if (frameCount) {
			diagnostics.addMeasurement(FrameTimeDiagnosticsPlugin.FRAME_COUNT, () => frameCount.value);
		}

		// Get deltaTime from time extension if available
		const contextWithTime = context as Context & { getDeltaSeconds?: () => number };
		const deltaSeconds = contextWithTime.getDeltaSeconds ? contextWithTime.getDeltaSeconds() : 0;
		if (deltaSeconds === 0) {
			return;
		}

		diagnostics.addMeasurement(FrameTimeDiagnosticsPlugin.FRAME_TIME, () => deltaSeconds * 1000.0);

		diagnostics.addMeasurement(FrameTimeDiagnosticsPlugin.FPS, () => 1.0 / deltaSeconds);

		diagnostics.apply();
	}
}
