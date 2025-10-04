/**
 * DiagnosticsPlugin 扩展接口
 * 定义诊断插件暴露给 App 的扩展方法
 */

import type { Diagnostic, DiagnosticsStore } from "./diagnostic";

/**
 * 简化的诊断项配置接口
 * 用于快速创建诊断项的配置对象
 */
export interface DiagnosticConfig {
	/** 诊断项唯一标识符 */
	readonly id: string;
	/** 最大历史记录长度 */
	readonly maxHistory?: number;
	/** 诊断项显示名称 */
	readonly name?: string;
	/** 初始值 */
	readonly value?: number;
}

/**
 * 诊断插件扩展接口
 * 提供诊断管理和渲染的所有方法
 */
export interface DiagnosticsPluginExtension {
	/**
	 * 清空所有诊断项
	 */
	clearDiagnostics: () => void;

	/**
	 * 获取所有诊断项
	 * @returns 诊断项数组
	 */
	getAllDiagnostics: () => ReadonlyArray<Diagnostic>;

	/**
	 * 根据ID获取诊断项
	 * @param id - 诊断项ID
	 * @returns 诊断项或 undefined
	 */
	getDiagnostic: (id: string) => Diagnostic | undefined;

	/**
	 * 获取诊断项总数
	 * @returns 诊断项数量
	 */
	getDiagnosticsCount: () => number;

	/**
	 * 获取当前渲染格式
	 * @returns 渲染格式类型
	 */
	getRenderFormat: () => "json" | "text" | "table";

	/**
	 * 获取诊断存储实例
	 * @returns 诊断存储实例
	 */
	getStore: () => DiagnosticsStore;

	/**
	 * 注册新的诊断项
	 * @param config - 诊断项配置或诊断实例
	 */
	registerDiagnostic: (config: DiagnosticConfig | Diagnostic) => void;

	/**
	 * 将诊断信息渲染到控制台
	 */
	renderToConsole: () => void;

	/**
	 * 将诊断信息渲染到UI
	 */
	renderToUI: () => void;

	/**
	 * 设置渲染格式
	 * @param format - 渲染格式类型
	 */
	setRenderFormat: (format: "json" | "text" | "table") => void;

	/**
	 * 更新指定诊断项的值
	 * @param id - 诊断项ID
	 * @param value - 新值
	 */
	updateDiagnostic: (id: string, value: number) => void;
}
