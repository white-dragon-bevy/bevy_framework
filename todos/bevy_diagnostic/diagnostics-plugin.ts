/**
 * 主诊断插件
 * 对应 Rust bevy_diagnostic 的 lib.rs 中的 DiagnosticsPlugin
 */

import { Plugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { DiagnosticsStore } from "./diagnostic";

/**
 * 向应用添加核心诊断资源
 * 对应 Rust DiagnosticsPlugin
 */
export class DiagnosticsPlugin implements Plugin {
	/**
	 * 配置应用
	 * @param app - 应用实例
	 */
	build(app: App): void {
		app.initResource(() => new DiagnosticsStore());
	}

	/**
	 * 插件名称
	 * @returns 插件名称字符串
	 */
	name(): string {
		return "DiagnosticsPlugin";
	}

	/**
	 * 插件是否唯一
	 * @returns true表示只能添加一次
	 */
	isUnique(): boolean {
		return true;
	}
}