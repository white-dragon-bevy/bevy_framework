/**
 * 主诊断插件
 * 对应 Rust bevy_diagnostic 的 lib.rs 中的 DiagnosticsPlugin
 */

import { Plugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { DiagnosticsStore, installDiagnosticSystem } from "./diagnostic";

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
		// 安装诊断系统
		installDiagnosticSystem(app);
		// 直接插入资源实例，使用类构造函数作为标识
		const store = new DiagnosticsStore();
		app.main().getResourceManager().insertResource(DiagnosticsStore as any, store);
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