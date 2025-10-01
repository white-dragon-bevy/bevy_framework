import {Context as RewireContext,HotReloader } from "@rbxts/rewire"


// 类型声明（编译时占位）
import { RunService } from "@rbxts/services";
import type { App } from "../../bevy_app/app";
import type { Plugin } from "../../bevy_app/plugin";
import type { World } from "../../bevy_ecs";
import type { SystemFunction, ScheduleLabel, RunCondition } from "../../bevy_ecs/schedule/types";
import { intoSystemConfigs, type IntoSystemConfigs } from "../../bevy_ecs/schedule/system-configs";
import type { ContainerConfig, HotReloadConfig, HotSystemModule } from "./config";
import type { Context } from "../../bevy_ecs/types";

/**
 * 热更新服务接口
 * 作为 Resource 注入到 App 中
 */
export interface HotReloadService {
	/**
	 * 注册多个系统容器用于热更新
	 * @param configs - 容器配置数组
	 */
	registerContainers(...configs: ContainerConfig[]): void;

	/**
	 * 等待所有容器加载完成
	 * 用于确保系统注册完成后再启动 app
	 */
	waitForReady(): void;
}

/**
 * 系统元数据
 */
interface SystemMetadata {
	/** 系统名称 */
	readonly name: string;
	/** 调度标签 */
	readonly schedule: ScheduleLabel;
	/** 包装器函数 */
	readonly wrapper: SystemFunction;
	/** 是否已注册到 Schedule */
	registered: boolean;
}

/**
 * 热更新插件
 * 提供零侵入性的系统热更新功能
 */
export class HotReloadPlugin implements Plugin {
	private readonly config: Required<HotReloadConfig>;

	constructor(config?: HotReloadConfig) {
		this.config = {
			enabled: config?.enabled ?? RunService.IsStudio(),
			debounceTime: config?.debounceTime ?? 300,
		};
	}

	name(): string {
		return "HotReloadPlugin";
	}

	isUnique(): boolean {
		return true;
	}

	build(app: App): void {
		// 创建热更新服务
		const service = new HotReloadServiceImpl(app, this.config);
		app.insertResource<HotReloadService>(service);
	}
}

/**
 * 热更新服务实现
 */
class HotReloadServiceImpl implements HotReloadService {
	private readonly app: App;
	private readonly config: Required<HotReloadConfig>;
	private readonly isStudio: boolean;
	private readonly hotReloader?: HotReloader;

	/** 全局系统注册表：系统名称 -> 系统函数 */
	private static readonly systemRegistry = new Map<string, SystemFunction>();

	/** 系统元数据：系统名称 -> 元数据 */
	private readonly systemMetadata = new Map<string, SystemMetadata>();

	/** 模块导出追踪：模块名称 -> 导出名称集合 */
	private readonly moduleExportsMap = new Map<string, Set<string>>();

	/** 容器配置映射：容器 -> 配置 */
	private readonly containerConfigs = new Map<Instance, ContainerConfig>();

	/** 首次运行标记：用于区分初始加载和热更新 */
	private isFirstRun = true;

	/** 就绪标记：所有容器加载完成 */
	private isReady = false;

	/** 待处理容器计数 */
	private pendingContainers = 0;

	constructor(app: App, config: Required<HotReloadConfig>) {
		this.app = app;
		this.config = config;
		this.isStudio = RunService.IsStudio();
		this.hotReloader = new HotReloader();
	}

	registerContainers(...configs: ContainerConfig[]): void {
		this.pendingContainers += configs.size();

		for (const config of configs) {
			this.registerContainer(config);
		}

		// 所有容器注册完成后，标记首次运行结束和就绪
		this.isFirstRun = false;
		this.isReady = true;

		print(`[HotReload] 已注册 ${configs.size()} 个容器，共加载 ${this.systemMetadata.size()} 个系统`);
	}

	waitForReady(): void {
		// scan() 是同步的，registerContainers() 返回时已经加载完成
		// 此方法仅用于明确表示等待，实际上立即返回
		if (!this.isReady) {
			warn("[HotReload] 警告：waitForReady() 在 registerContainers() 之前调用");
		}
	}

	/**
	 * 注册单个容器
	 */
	private registerContainer(config: ContainerConfig): void {
		// 保存配置
		this.containerConfigs.set(config.container, config);

		if (this.config.enabled && this.isStudio && this.hotReloader) {
			// Studio 热更新环境
			if (config.container.IsA("ModuleScript")) {
				// ModuleScript 容器：使用 listen 监听单个模块
				this.hotReloader.listen(
					config.container,
					(module, context) => this.loadModule(module, context, config),
					(module, context) => this.unloadModule(module, context, config),
				);
			} else {
				// Folder 容器：使用 scan 扫描所有子模块
				this.hotReloader.scan(
					config.container,
					(module, context) => this.loadModule(module, context, config),
					(module, context) => this.unloadModule(module, context, config),
				);
			}
		} else {
			// 生产环境：一次性加载
			this.loadAllSystems(config);
		}
	}

	/**
	 * 一次性加载容器中的所有系统
	 */
	private loadAllSystems(config: ContainerConfig): void {
		// 如果容器本身是 ModuleScript，直接加载它
		if (config.container.IsA("ModuleScript")) {
			const [ok, moduleExports] = pcall(require, config.container) as LuaTuple<[boolean, unknown]>;
			if (ok) {
				this.processModuleExports(config.container.Name, moduleExports, config, false);
			}
			return;
		}

		// 否则遍历容器的子 ModuleScript
		for (const child of config.container.GetChildren()) {
			if (child.IsA("ModuleScript")) {
				const [ok, moduleExports] = pcall(require, child) as LuaTuple<[boolean, unknown]>;
				if (ok) {
					this.processModuleExports(child.Name, moduleExports, config, false);
				}
			}
		}
	}

	/**
	 * 加载模块（scan 回调）
	 */
	private loadModule(module: ModuleScript, context: RewireContext, config: ContainerConfig): void {
		const { originalModule } = context;

		print(`[HotReload] loadModule 被调用: ${originalModule.Name}`);

		const [ok, moduleExports] = pcall(require, module) as LuaTuple<[boolean, unknown]>;

		if (!ok) {
			warn(`[HotReload] 加载失败: ${module.Name}`, moduleExports);
			return;
		}

		print(`[HotReload] require 成功，导出类型: ${typeOf(moduleExports)}`);

		// isFirstRun：首次加载，直接注册
		// !isFirstRun：热更新，更新注册表
		const isHotReload = !this.isFirstRun;
		this.processModuleExports(originalModule.Name, moduleExports, config, isHotReload);
	}

	/**
	 * 处理模块导出
	 * @param moduleName - 模块名称
	 * @param moduleExports - 模块导出内容
	 * @param config - 容器配置
	 * @param isHotReload - 是否为热更新
	 */
	private processModuleExports(
		moduleName: string,
		moduleExports: unknown,
		config: ContainerConfig,
		isHotReload: boolean,
	): void {
		if (!typeIs(moduleExports, "table")) {
			return;
		}

		// 当前导出集合
		const currentExports = new Set<string>();

		// 处理默认导出（export default）
		if ("default" in (moduleExports as object)) {
			const defaultExport = (moduleExports as Record<string, unknown>).default;
			this.processExport(moduleName, "default", defaultExport, config, isHotReload);
			currentExports.add("default");
		}

		// 处理具名导出
		for (const [key, value] of pairs(moduleExports as Record<string, unknown>)) {
			if (key === "default") {
				continue; // 已处理
			}

			this.processExport(moduleName, key as string, value, config, isHotReload);
			currentExports.add(key as string);
		}

		// 检测删除的导出（仅热更新时）
		if (isHotReload) {
			const previousExports = this.moduleExportsMap.get(moduleName);
			if (previousExports) {
				for (const oldExport of previousExports) {
					if (!currentExports.has(oldExport)) {
						this.removeSystem(moduleName, oldExport);
					}
				}
			}
		}

		// 保存当前导出列表
		this.moduleExportsMap.set(moduleName, currentExports);
	}

	/**
	 * 处理单个导出
	 */
	private processExport(
		moduleName: string,
		exportName: string,
		value: unknown,
		config: ContainerConfig,
		isHotReload: boolean,
	): void {
		// 跳过测试文件
		if (moduleName.sub(-5) === ".spec" || exportName.sub(-5) === ".spec") {
			return;
		}

		// 自定义验证
		if (config.validate && !config.validate(exportName, value)) {
			return;
		}

		// 构造系统名称：ModuleName::ExportName
		const systemName = `${moduleName}::${exportName}`;

		// 情况 1：纯函数导出
		if (typeIs(value, "function")) {
			const systemConfig: {
				system: SystemFunction;
				schedule: ScheduleLabel;
				inSet?: string;
			} = {
				system: value as SystemFunction,
				schedule: config.schedule,
			};

			if (config.defaultSet !== undefined) {
				systemConfig.inSet = config.defaultSet;
			}

			this.registerOrUpdateSystem(systemName, systemConfig, isHotReload);
			return;
		}

		// 情况 2：配置对象导出
		if (typeIs(value, "table") && "system" in (value as object)) {
			const hotModule = value as Partial<HotSystemModule>;

			// 验证环境配置
			if (hotModule.env?.production) {
				const envConfig = hotModule.env.production;
				if (RunService.IsClient() && envConfig.disableClient === true) {
					return;
				}
				if (RunService.IsServer() && envConfig.disableServer === true) {
					return;
				}
			}

			// 合并配置：系统配置覆盖容器默认配置
			const systemConfig: {
				system: SystemFunction;
				schedule: ScheduleLabel;
				inSet?: string;
				after?: readonly string[];
				before?: readonly string[];
				runIf?: RunCondition;
			} = {
				system: hotModule.system!,
				schedule: hotModule.schedule ?? config.schedule,
			};

			// 设置可选字段
			const finalInSet = hotModule.inSet ?? config.defaultSet;
			if (finalInSet !== undefined) {
				systemConfig.inSet = finalInSet;
			}

			if (hotModule.after !== undefined) {
				systemConfig.after = hotModule.after;
			}

			if (hotModule.before !== undefined) {
				systemConfig.before = hotModule.before;
			}

			if (hotModule.runIf !== undefined) {
				systemConfig.runIf = hotModule.runIf;
			}

			this.registerOrUpdateSystem(systemName, systemConfig, isHotReload);
		}
	}

	/**
	 * 注册或更新系统
	 */
	private registerOrUpdateSystem(
		systemName: string,
		systemModule: {
			system: SystemFunction;
			schedule: ScheduleLabel;
			inSet?: string;
			after?: readonly string[];
			before?: readonly string[];
			runIf?: RunCondition;
		},
		isHotReload: boolean,
	): void {
		const existingMetadata = this.systemMetadata.get(systemName);

		if (existingMetadata) {
			// 已存在：更新注册表中的函数
			HotReloadServiceImpl.systemRegistry.set(systemName, systemModule.system);

			if (isHotReload) {
				print(`✅ [HotReload] 热更新系统: ${systemName}`);
			}
		} else {
			// 首次注册：创建包装器并注册到 Schedule
			const wrapper = this.createWrapper(systemName);

			// 更新注册表
			HotReloadServiceImpl.systemRegistry.set(systemName, systemModule.system);

			// 保存元数据
			this.systemMetadata.set(systemName, {
				name: systemName,
				schedule: systemModule.schedule,
				wrapper,
				registered: false,
			});

			// 应用配置并注册到 Schedule
			this.registerToSchedule(systemName, wrapper, systemModule);

			if (isHotReload) {
				print(`✨ [HotReload] 新增系统: ${systemName}`);
			}
		}
	}

	/**
	 * 创建包装器函数
	 */
	private createWrapper(systemName: string): SystemFunction {
		return (world: World, context: Context) => {
			const systemFn = HotReloadServiceImpl.systemRegistry.get(systemName);
			if (systemFn !== undefined) {
				systemFn(world, context);
			}
		};
	}

	/**
	 * 注册到 Schedule
	 */
	private registerToSchedule(
		systemName: string,
		wrapper: SystemFunction,
		config: {
			schedule: ScheduleLabel;
			inSet?: string;
			after?: readonly string[];
			before?: readonly string[];
			runIf?: RunCondition;
		},
	): void {
		const metadata = this.systemMetadata.get(systemName);
		if (!metadata) {
			return;
		}

		// 应用配置
		let systemConfig: IntoSystemConfigs = wrapper;

		// 应用 after
		if (config.after && config.after.size() > 0) {
			let configs = intoSystemConfigs(systemConfig);
			for (const afterSet of config.after) {
				configs = configs.after(afterSet);
			}
			systemConfig = configs;
		}

		// 应用 before
		if (config.before && config.before.size() > 0) {
			let configs = intoSystemConfigs(systemConfig);
			for (const beforeSet of config.before) {
				configs = configs.before(beforeSet);
			}
			systemConfig = configs;
		}

		// 应用 inSet
		if (config.inSet !== undefined) {
			systemConfig = intoSystemConfigs(systemConfig).inSet(config.inSet);
		}

		// 应用 runIf
		if (config.runIf !== undefined) {
			systemConfig = intoSystemConfigs(systemConfig).runIf(config.runIf);
		}

		// 注册到 Schedule
		this.app.addSystems(config.schedule, systemConfig);
		metadata.registered = true;
	}

	/**
	 * 移除系统
	 */
	private removeSystem(moduleName: string, exportName: string): void {
		const systemName = `${moduleName}::${exportName}`;

		// 从注册表删除（包装器会自动跳过）
		HotReloadServiceImpl.systemRegistry.delete(systemName);

		print(`🗑️ [HotReload] 删除系统: ${systemName}`);
	}

	/**
	 * 卸载模块（热更新回调）
	 */
	private unloadModule(module: ModuleScript, context: RewireContext, config: ContainerConfig): void {
		const { originalModule } = context;

		print(
			`[HotReload] unloadModule 被调用: ${originalModule.Name}, isReloading=${tostring(context.isReloading)}`,
		);

		if (context.isReloading) {
			print(`[HotReload] isReloading=true，跳过删除（即将热更新）`);
			// 清除全局缓存，让下次 require 加载新代码
			delete (_G as Record<string, unknown>)[originalModule as unknown as string];
			return;
		}

		print(`[HotReload] isReloading=false，执行最后清理（模块被移除）`);

		// 清除全局缓存
		delete (_G as Record<string, unknown>)[originalModule as unknown as string];

		// 获取模块的所有导出
		const moduleExportNames = this.moduleExportsMap.get(originalModule.Name);
		if (moduleExportNames) {
			for (const exportName of moduleExportNames) {
				this.removeSystem(originalModule.Name, exportName);
			}
		}

		// 清除导出追踪
		this.moduleExportsMap.delete(originalModule.Name);
	}
}
