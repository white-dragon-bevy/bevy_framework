/**
 * 主诊断插件
 * 对应 Rust bevy_diagnostic 的 lib.rs 中的 DiagnosticsPlugin
 */

import { BasePlugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { Diagnostic, DiagnosticPath, DiagnosticsStore, installDiagnosticSystem } from "./diagnostic";
import type { DiagnosticConfig, DiagnosticExtension } from "./extensions";

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
			print(diagnostics);
		} else if (this.format === "table") {
			print("=== Diagnostics ===");
			for (const diagnostic of diagnostics) {
				const pathStr = diagnostic.getPath().asStr();
				const value = diagnostic.value();
				print(`${pathStr}: ${value ?? "N/A"}`);
			}
			print("==================");
		} else {
			for (const diagnostic of diagnostics) {
				const pathStr = diagnostic.getPath().asStr();
				const value = diagnostic.value();
				print(`[DIAG] ${pathStr} = ${value ?? "N/A"}`);
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
 * 向应用添加核心诊断资源
 * 对应 Rust DiagnosticsPlugin
 */
export class DiagnosticsPlugin extends BasePlugin {
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
		app.insertResource( store);

		// 注册统一的诊断扩展
		this.registerExtensions(app, {
			diagnostic: {
				extension: {
					// 核心存储对象
					store: store,

					// 诊断管理功能
					registerDiagnostic(config: DiagnosticConfig | Diagnostic) {
						if ("getPath" in config) {
							// 是完整的 Diagnostic 对象
							store.add(config as Diagnostic);
						} else {
							// 是 DiagnosticConfig
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
					},

					getDiagnostic(id: string) {
						const path = new DiagnosticPath(id);
						return store.get(path);
					},

					clearDiagnostics() {
						store.clear();
					},

					updateDiagnostic(id: string, value: number) {
						const path = new DiagnosticPath(id);
						const diagnostic = store.get(path);
						if (diagnostic) {
							diagnostic.addMeasurement({
								time: os.clock(),
								value: value,
							});
						}
					},

					getAllDiagnostics() {
						return store.getAll();
					},

					getDiagnosticsCount() {
						return store.getAll().size();
					},

					// 渲染功能
					renderToConsole() {
						renderer.renderToConsole();
					},

					renderToUI() {
						renderer.renderToUI();
					},

					setRenderFormat(format) {
						renderer.setFormat(format);
					},

					getRenderFormat() {
						return renderer.getFormat();
					},
				} satisfies DiagnosticExtension,
				metadata: {
					description: "Unified diagnostics system for registering, managing and rendering diagnostic metrics",
					version: "0.1.0",
				},
			},
		});
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