/**
 * 诊断插件扩展定义
 * 为 DiagnosticsPlugin 提供类型安全的扩展接口
 */

import type { Diagnostic, DiagnosticsStore } from "./diagnostic";

/**
 * 简化的诊断项接口
 * 用于创建新的诊断项
 */
export interface DiagnosticConfig {
	id: string;
	name?: string;
	value?: number;
	maxHistory?: number;
}

/**
 * 核心诊断扩展接口
 * 提供基本的诊断注册和访问功能
 */
export interface DiagnosticsExtension {
	/**
	 * 注册新的诊断项
	 * @param config - 诊断项配置
	 */
	registerDiagnostic(config: DiagnosticConfig | Diagnostic): void;

	/**
	 * 获取指定的诊断项
	 * @param id - 诊断项标识符
	 * @returns 诊断项或 undefined
	 */
	getDiagnostic(id: string): Diagnostic | undefined;

	/**
	 * 清空所有诊断项
	 */
	clearDiagnostics(): void;

	/**
	 * 更新诊断项的值
	 * @param id - 诊断项标识符
	 * @param value - 新的值
	 */
	updateDiagnostic(id: string, value: number): void;
}

/**
 * 诊断存储扩展接口
 * 提供对底层存储的直接访问
 */
export interface DiagnosticsStoreExtension {
	/**
	 * 获取诊断存储实例
	 * @returns 诊断存储
	 */
	getStore(): DiagnosticsStore;

	/**
	 * 获取所有诊断项
	 * @returns 所有诊断项的只读数组
	 */
	getAllDiagnostics(): ReadonlyArray<Diagnostic>;

	/**
	 * 获取诊断项数量
	 * @returns 诊断项数量
	 */
	getDiagnosticsCount(): number;
}

/**
 * 诊断渲染扩展接口
 * 提供诊断信息的渲染和显示功能
 */
export interface DiagnosticsRendererExtension {
	/**
	 * 渲染诊断信息到控制台
	 */
	renderToConsole(): void;

	/**
	 * 渲染诊断信息到UI
	 */
	renderToUI(): void;

	/**
	 * 设置渲染格式
	 * @param format - 输出格式
	 */
	setRenderFormat(format: "json" | "text" | "table"): void;

	/**
	 * 获取当前渲染格式
	 * @returns 当前格式
	 */
	getRenderFormat(): "json" | "text" | "table";
}

/**
 * 声明扩展到全局插件扩展注册表
 */
declare module "../bevy_app/extensions" {
	interface PluginExtensions {
		diagnostics: DiagnosticsExtension;
		"diagnostics.store": DiagnosticsStoreExtension;
		"diagnostics.renderer": DiagnosticsRendererExtension;
	}
}