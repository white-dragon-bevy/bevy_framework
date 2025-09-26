/**
 * 主诊断插件
 * 对应 Rust bevy_diagnostic 的 lib.rs 中的 DiagnosticsPlugin
 */

import { BasePlugin } from "../../src/bevy_app/plugin";
import { App } from "../../src/bevy_app/app";
import { Diagnostic, DiagnosticPath, DiagnosticsStore, installDiagnosticSystem } from "./diagnostic";
import type {
	DiagnosticsExtension,
	DiagnosticsRendererExtension,
	DiagnosticsStoreExtension,
} from "./extensions";

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
		app.main().getResourceManager().insertResource( store);

		// 注册扩展到 context
		this.registerExtensions(app, {
			diagnostics: {
				extension: {
					registerDiagnostic(config) {
						if ("path" in config) {
							// 是完整的 Diagnostic 对象
							store.add(config as Diagnostic);
						} else {
							// 是 DiagnosticConfig
							const path = new DiagnosticPath(config.id);
							const diagnostic = new Diagnostic(path);
							if (config.maxHistory) diagnostic.withMaxHistoryLength(config.maxHistory);
							store.add(diagnostic);
						}
					},
					getDiagnostic(id: string) {
						return store.get(id as any);
					},
					clearDiagnostics() {
						store.clear();
					},
					updateDiagnostic(id: string, value: number) {
						const diagnostic = store.get(id as any);
						if (diagnostic) {
							diagnostic.addMeasurement({
								time: os.clock(),
								value: value,
							});
						}
					},
				} satisfies DiagnosticsExtension,
				metadata: {
					description: "Core diagnostics API for registering and managing diagnostic metrics",
					version: "0.1.0",
				},
			},
			"diagnostics.store": {
				extension: {
					getStore() {
						return store;
					},
					getAllDiagnostics() {
						return store.getAll();
					},
					getDiagnosticsCount() {
						return store.getAll().size();
					},
				} satisfies DiagnosticsStoreExtension,
				metadata: {
					description: "Direct access to the diagnostics store",
					dependencies: ["diagnostics"],
				},
			},
			"diagnostics.renderer": {
				extension: {
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
				} satisfies DiagnosticsRendererExtension,
				metadata: {
					description: "Rendering utilities for diagnostic output",
					dependencies: ["diagnostics", "diagnostics.store"],
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