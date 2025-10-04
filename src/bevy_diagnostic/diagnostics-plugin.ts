/**
 * 主诊断插件
 * 对应 Rust bevy_diagnostic 的 lib.rs 中的 DiagnosticsPlugin
 */

import { BasePlugin, Plugin } from "../bevy_app/plugin";
import { App } from "../bevy_app/app";
import { Diagnostic, DiagnosticPath, DiagnosticsStore, installDiagnosticSystem } from "./diagnostic";
import type { World } from "../bevy_ecs";
import type { Context } from "../bevy_ecs";
import { DiagnosticsPluginExtension, DiagnosticConfig } from "./extension";
import { ___getTypeDescriptor } from "bevy_core";

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
 * 向应用添加核心诊断资源
 * 对应 Rust DiagnosticsPlugin
 */
export class DiagnosticsPlugin extends BasePlugin implements Plugin<DiagnosticsPluginExtension> {
	/**
	 * 扩展类型描述符
	 */
	extensionDescriptor = ___getTypeDescriptor<DiagnosticsPluginExtension>()!;

	/**
	 * 诊断存储实例
	 */
	private store!: DiagnosticsStore;

	/**
	 * 诊断渲染器实例
	 */
	private renderer!: DiagnosticsRenderer;

	/**
	 * 创建 DiagnosticsPlugin 实例
	 */
	constructor() {
		super();
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
		this.store = new DiagnosticsStore();
		this.renderer = new DiagnosticsRenderer(this.store);

		// 插入资源
		app.insertResource(this.store);
	}

	/**
	 * 获取插件扩展
	 * @param app - App 实例
	 * @returns 诊断插件扩展对象
	 */
	getExtension(app: App): DiagnosticsPluginExtension {
		return {
			getStore: () => this.store,
			registerDiagnostic: (config: DiagnosticConfig | Diagnostic) => {
				if ("getPath" in config) {
					this.store.add(config as Diagnostic);
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
					this.store.add(diagnostic);
				}
			},
			getDiagnostic: (id: string) => {
				const path = new DiagnosticPath(id);
				return this.store.get(path);
			},
			clearDiagnostics: () => {
				this.store.clear();
			},
			updateDiagnostic: (id: string, value: number) => {
				const path = new DiagnosticPath(id);
				const diagnostic = this.store.get(path);
				if (diagnostic) {
					diagnostic.addMeasurement({
						time: os.clock(),
						value: value,
					});
				}
			},
			getAllDiagnostics: () => this.store.getAll(),
			getDiagnosticsCount: () => this.store.getAll().size(),
			renderToConsole: () => this.renderer.renderToConsole(),
			renderToUI: () => this.renderer.renderToUI(),
			setRenderFormat: (format: "json" | "text" | "table") => {
				this.renderer.setFormat(format);
			},
			getRenderFormat: () => this.renderer.getFormat(),
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