/**
 * 实体计数诊断插件
 * 对应 Rust bevy_diagnostic 的 entity_count_diagnostics_plugin.rs
 */

import { Plugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { World } from "@rbxts/matter";
import { Context } from "../bevy_ecs";
import { Update } from "../../src/bevy_app/main-schedule";
import {
	Diagnostic,
	DiagnosticPath,
	Diagnostics,
	DiagnosticsStore,
	DEFAULT_MAX_HISTORY_LENGTH,
	registerDiagnostic,
} from "./diagnostic";

/**
 * 向应用添加"实体计数"诊断
 * 对应 Rust EntityCountDiagnosticsPlugin
 *
 * @see LogDiagnosticsPlugin 用于将诊断输出到控制台
 */
export class EntityCountDiagnosticsPlugin implements Plugin {
	/** 要保留的总值数量 */
	maxHistoryLength: number;

	constructor(maxHistoryLength: number = DEFAULT_MAX_HISTORY_LENGTH) {
		this.maxHistoryLength = maxHistoryLength;
	}

	/**
	 * 创建带有指定 max_history_length 的新插件
	 * 对应 Rust new
	 * @param maxHistoryLength - 最大历史长度
	 * @returns 插件实例
	 */
	static create(maxHistoryLength: number): EntityCountDiagnosticsPlugin {
		return new EntityCountDiagnosticsPlugin(maxHistoryLength);
	}

	/**
	 * 当前分配的实体数量
	 * 对应 Rust ENTITY_COUNT
	 */
	static readonly ENTITY_COUNT = DiagnosticPath.constNew("entity_count");

	/**
	 * 配置应用
	 * @param app - 应用实例
	 */
	build(app: App): void {
		registerDiagnostic(
			app,
			Diagnostic.create(EntityCountDiagnosticsPlugin.ENTITY_COUNT).withMaxHistoryLength(this.maxHistoryLength),
		).addSystems(Update, (world, context) => EntityCountDiagnosticsPlugin.diagnosticSystem(world, context));
	}

	/**
	 * 插件名称
	 * @returns 插件名称字符串
	 */
	name(): string {
		return "EntityCountDiagnosticsPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns true表示只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}

	/**
	 * 更新实体计数测量值
	 * 对应 Rust diagnostic_system
	 * @param world - ECS世界
	 * @param context - 系统上下文
	 */
	static diagnosticSystem(world: World, context: Context): void {
		const resources = context.resources;
		const diagnosticsStore = resources.getResource(DiagnosticsStore);
		if (!diagnosticsStore) return;

		const diagnostics = new Diagnostics(diagnosticsStore);

		let entityCount = 0;
		for (const _ of world.query()) {
			entityCount++;
		}

		diagnostics.addMeasurement(EntityCountDiagnosticsPlugin.ENTITY_COUNT, () => entityCount);
		diagnostics.apply();
	}
}
