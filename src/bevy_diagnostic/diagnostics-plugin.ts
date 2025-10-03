/**
 * 主诊断插件
 * 对应 Rust bevy_diagnostic 的 lib.rs 中的 DiagnosticsPlugin
 */

import { BasePlugin } from "../bevy_app/plugin";
import { App, ExtensionFactory } from "../bevy_app/app";
import { Diagnostic, DiagnosticPath, DiagnosticsStore, installDiagnosticSystem } from "./diagnostic";
import type { World } from "../bevy_ecs";
import type { Context } from "../bevy_ecs";

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
 * 诊断渲染器
 * 管理诊断信息的输出格式
 */
class DiagnosticsRenderer {
	private format: "json" | "text" | "table" = "text";
	private store: DiagnosticsStore;

	/**
	 * 创建诊断渲染器实例
	 * @param store - 诊断存储实例
	 */
	constructor(store: DiagnosticsStore) {
		this.store = store;
	}

	/**
	 * 将诊断信息渲染到控制台
	 * @returns 无返回值
	 */
	renderToConsole(): void {
		const diagnostics: Diagnostic[] = [];
		// 收集所有诊断项
		this.store.iterDiagnostics((diagnostic) => {
			diagnostics.push(diagnostic);
		});
		if (this.format === "json") {
		} else if (this.format === "table") {
			for (const diagnostic of diagnostics) {
				const pathStr = diagnostic.getPath().asStr();
				const value = diagnostic.value();
			}
		} else {
			for (const diagnostic of diagnostics) {
				const pathStr = diagnostic.getPath().asStr();
				const value = diagnostic.value();
			}
		}
	}

	/**
	 * 将诊断信息渲染到UI界面
	 * 注意: 当前未实现
	 * @returns 无返回值
	 */
	renderToUI(): void {
		// 未来可以实现UI渲染
		warn("UI rendering not yet implemented");
	}

	/**
	 * 设置渲染输出格式
	 * @param format - 输出格式类型 (json/text/table)
	 * @returns 无返回值
	 */
	setFormat(format: "json" | "text" | "table"): void {
		this.format = format;
	}

	/**
	 * 获取当前渲染格式
	 * @returns 当前的输出格式类型
	 */
	getFormat(): "json" | "text" | "table" {
		return this.format;
	}
}

/**
 * 诊断扩展工厂接口
 * 定义 DiagnosticsPlugin 提供的所有扩展方法
 */
export interface DiagnosticPluginExtensionFactories {
	/** 清空所有诊断项 */
	clearDiagnostics: ExtensionFactory<() => void>;
	/** 获取所有诊断项 */
	getAllDiagnostics: ExtensionFactory<() => ReadonlyArray<Diagnostic>>;
	/** 根据ID获取诊断项 */
	getDiagnostic: ExtensionFactory<(id: string) => Diagnostic | undefined>;
	/** 获取诊断项总数 */
	getDiagnosticsCount: ExtensionFactory<() => number>;
	/** 获取当前渲染格式 */
	getRenderFormat: ExtensionFactory<() => "json" | "text" | "table">;
	/** 获取诊断存储实例 */
	getStore: ExtensionFactory<() => DiagnosticsStore>;
	/** 注册新的诊断项 */
	registerDiagnostic: ExtensionFactory<(config: DiagnosticConfig | Diagnostic) => void>;
	/** 将诊断信息渲染到控制台 */
	renderToConsole: ExtensionFactory<() => void>;
	/** 将诊断信息渲染到UI */
	renderToUI: ExtensionFactory<() => void>;
	/** 设置渲染格式 */
	setRenderFormat: ExtensionFactory<(format: "json" | "text" | "table") => void>;
	/** 更新指定诊断项的值 */
	updateDiagnostic: ExtensionFactory<(id: string, value: number) => void>;
}

/**
 * 向应用添加核心诊断资源
 * 对应 Rust DiagnosticsPlugin
 */
export class DiagnosticsPlugin extends BasePlugin {
	/** 插件扩展工厂 */
	extension: DiagnosticPluginExtensionFactories;

	/**
	 * 创建 DiagnosticsPlugin 实例
	 */
	constructor() {
		super();
		// 扩展工厂将在 build() 中初始化
		this.extension = {} as DiagnosticPluginExtensionFactories;
	}

	/**
	 * 配置应用
	 * @param app - 应用实例
	 * @returns 无返回值
	 */
	build(app: App): void {
		// 安装诊断系统
		installDiagnosticSystem(app);

		// 创建诊断存储和渲染器
		const store = new DiagnosticsStore();
		const renderer = new DiagnosticsRenderer(store);

		// 插入资源
		app.insertResource(store);

		// 初始化扩展工厂
		this.extension = {
			getStore: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return () => store;
			},
			registerDiagnostic: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return (config: DiagnosticConfig | Diagnostic) => {
					if ("getPath" in config) {
						store.add(config as Diagnostic);
					} else {
						const path = new DiagnosticPath(config.id);
						const diagnostic = new Diagnostic(path);
						if (config.name) diagnostic.withSuffix(config.name);
						if (config.maxHistory) diagnostic.withMaxHistoryLength(config.maxHistory);
						if (config.value !== undefined) {
							diagnostic.addMeasurement({
								time: os.clock(),
								value: config.value,
							});
						}
						store.add(diagnostic);
					}
				};
			},
			getDiagnostic: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return (id: string) => {
					const path = new DiagnosticPath(id);
					return store.get(path);
				};
			},
			clearDiagnostics: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return () => {
					store.clear();
				};
			},
			updateDiagnostic: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return (id: string, value: number) => {
					const path = new DiagnosticPath(id);
					const diagnostic = store.get(path);
					if (diagnostic) {
						diagnostic.addMeasurement({
							time: os.clock(),
							value: value,
						});
					}
				};
			},
			getAllDiagnostics: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return () => store.getAll();
			},
			getDiagnosticsCount: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return () => store.getAll().size();
			},
			renderToConsole: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return () => renderer.renderToConsole();
			},
			renderToUI: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return () => renderer.renderToUI();
			},
			setRenderFormat: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return (format: "json" | "text" | "table") => {
					renderer.setFormat(format);
				};
			},
			getRenderFormat: (world: World, context: Context, plugin: DiagnosticsPlugin) => {
				return () => renderer.getFormat();
			},
		};
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