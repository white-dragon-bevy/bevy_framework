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
 * 统一的诊断扩展接口
 * 整合所有诊断相关功能
 */
export interface DiagnosticExtension {
	/**
	 * 核心诊断存储对象
	 */
	store: DiagnosticsStore;

	// 诊断管理功能
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

	// 渲染功能
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
		diagnostic: DiagnosticExtension;
	}
}