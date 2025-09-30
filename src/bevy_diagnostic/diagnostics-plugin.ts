/**
 * 主诊断插件
 * 对应 Rust bevy_diagnostic 的 lib.rs 中的 DiagnosticsPlugin
 */

import { BasePlugin } from "../../src/bevy_app/plugin";
import { App, ExtensionFactory } from "../../src/bevy_app/app";
import { Diagnostic, DiagnosticPath, DiagnosticsStore, installDiagnosticSystem } from "./diagnostic";
import type { World } from "../../src/bevy_ecs";
import type { AppContext } from "../../src/bevy_app/context";

/**
 * 简化的诊断项接口
 */
export interface DiagnosticConfig {
	id: string;
	name?: string;
	value?: number;
	maxHistory?: number;
}

/**
 * 诊断渲染器
 * 管理诊断信息的输出格式
 */
class DiagnosticsRenderer {
	private format: "json" | "text" | "table" = "text";
	private store: DiagnosticsStore;

	constructor(store: DiagnosticsStore) {
		this.store = store;
	}

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

	renderToUI(): void {
		// 未来可以实现UI渲染
		warn("UI rendering not yet implemented");
	}

	setFormat(format: "json" | "text" | "table"): void {
		this.format = format;
	}

	getFormat(): "json" | "text" | "table" {
		return this.format;
	}
}

/**
 * 诊断扩展工厂接口
 */
export interface DiagnosticPluginExtensionFactories {
	getStore: ExtensionFactory<() => DiagnosticsStore>;
	registerDiagnostic: ExtensionFactory<(config: DiagnosticConfig | Diagnostic) => void>;
	getDiagnostic: ExtensionFactory<(id: string) => Diagnostic | undefined>;
	clearDiagnostics: ExtensionFactory<() => void>;
	updateDiagnostic: ExtensionFactory<(id: string, value: number) => void>;
	getAllDiagnostics: ExtensionFactory<() => ReadonlyArray<Diagnostic>>;
	getDiagnosticsCount: ExtensionFactory<() => number>;
	renderToConsole: ExtensionFactory<() => void>;
	renderToUI: ExtensionFactory<() => void>;
	setRenderFormat: ExtensionFactory<(format: "json" | "text" | "table") => void>;
	getRenderFormat: ExtensionFactory<() => "json" | "text" | "table">;
}

/**
 * 向应用添加核心诊断资源
 * 对应 Rust DiagnosticsPlugin
 */
export class DiagnosticsPlugin extends BasePlugin {
	/** 插件扩展工厂 */
	extension: DiagnosticPluginExtensionFactories;

	constructor() {
		super();
		// 扩展工厂将在 build() 中初始化
		this.extension = {} as DiagnosticPluginExtensionFactories;
	}

	/**
	 * 配置应用
	 * @param app - 应用实例
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
			getStore: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
				return () => store;
			},
			registerDiagnostic: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
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
			getDiagnostic: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
				return (id: string) => {
					const path = new DiagnosticPath(id);
					return store.get(path);
				};
			},
			clearDiagnostics: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
				return () => {
					store.clear();
				};
			},
			updateDiagnostic: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
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
			getAllDiagnostics: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
				return () => store.getAll();
			},
			getDiagnosticsCount: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
				return () => store.getAll().size();
			},
			renderToConsole: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
				return () => renderer.renderToConsole();
			},
			renderToUI: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
				return () => renderer.renderToUI();
			},
			setRenderFormat: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
				return (format: "json" | "text" | "table") => {
					renderer.setFormat(format);
				};
			},
			getRenderFormat: (world: World, context: AppContext, plugin: DiagnosticsPlugin) => {
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