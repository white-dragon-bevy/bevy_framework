// import { Context as RewireContext, HotReloader } from "@rbxts/rewire";

// Temporary types until @rbxts/rewire is installed
interface RewireContext {
	originalModule: ModuleScript;
	isReloading?: boolean;
}

class HotReloader {
	listen(container: Instance, onLoad: (module: ModuleScript, context: RewireContext) => void, onUnload: (module: ModuleScript, context: RewireContext) => void): void {}
	scan(container: Instance, onLoad: (module: ModuleScript, context: RewireContext) => void, onUnload: (module: ModuleScript, context: RewireContext) => void): void {}
}
import { RunService } from "@rbxts/services";
import type { App } from "../../bevy_app/app";
import type { Plugin } from "../../bevy_app/plugin";
import type { World } from "../../bevy_ecs";
import type { Context } from "../../bevy_ecs";
import type { RunCondition, ScheduleLabel, SystemFunction } from "../../bevy_ecs/schedule/types";
import { intoSystemConfigs, type IntoSystemConfigs } from "../../bevy_ecs/schedule/system-configs";
import type { ContainerConfig, HotReloadConfig, HotSystemModule } from "./config";

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
	 * 通过路径字符串添加容器
	 * @param path - Instance 路径（例如："ReplicatedStorage/Systems"）
	 * @param schedule - 调度标签
	 * @param defaultSet - 默认系统集（可选）
	 */
	addPaths(path: string, schedule: ScheduleLabel, defaultSet?: string): void;

	/**
	 * 通过 glob 模式添加多个容器
	 * 支持通配符匹配多个 Instance
	 * @param pattern - Glob 模式（例如："ReplicatedStorage/Systems/**"）
	 * @param schedule - 调度标签
	 * @param defaultSet - 默认系统集（可选）
	 */
	addPathsGlob(pattern: string, schedule: ScheduleLabel, defaultSet?: string): void;
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
	private readonly hotReloader: HotReloader;

	/**
	 * 系统注册表：系统名称 -> 系统函数
	 * 包装器通过查询此表获取最新的系统函数
	 */
	private readonly systemRegistry = new Map<string, SystemFunction>();

	/**
	 * 模块导出追踪：模块名称 -> 导出名称集合
	 * 用于检测删除的导出
	 */
	private readonly moduleExportsMap = new Map<string, Set<string>>();

	/**
	 * 已注册系统集合
	 * 追踪哪些系统已经注册到调度器，避免重复注册
	 */
	private readonly registeredSystems = new Set<string>();

	constructor(app: App, config: Required<HotReloadConfig>) {
		this.app = app;
		this.config = config;
		this.hotReloader = new HotReloader();
	}

	registerContainers(...configs: ContainerConfig[]): void {
		for (const config of configs) {
			this.registerContainer(config);
		}

		print(`[HotReload] 已注册 ${configs.size()} 个容器，共加载 ${this.registeredSystems.size()} 个系统`);
	}

	addPaths(path: string, schedule: ScheduleLabel, defaultSet?: string): void {
		const instance = this.resolvePath(path);
		if (instance === undefined) {
			warn(`[HotReload] 路径未找到: ${path}`);
			return;
		}

		this.registerContainers({
			container: instance,
			schedule,
			defaultSet,
		});
	}

	addPathsGlob(pattern: string, schedule: ScheduleLabel, defaultSet?: string): void {
		const matchedInstances = this.resolveGlob(pattern);

		if (matchedInstances.size() === 0) {
			warn(`[HotReload] Glob 模式未匹配到任何 Instance: ${pattern}`);
			return;
		}

		print(`[HotReload] Glob 模式 "${pattern}" 匹配到 ${matchedInstances.size()} 个 Instance`);

		for (const instance of matchedInstances) {
			this.registerContainers({
				container: instance,
				schedule,
				defaultSet,
			});
		}
	}

	/**
	 * 注册单个容器
	 * @param config - 容器配置
	 */
	private registerContainer(config: ContainerConfig): void {
		if (config.container.IsA("ModuleScript")) {
			// ModuleScript 容器：监听单个模块
			this.hotReloader.listen(
				config.container,
				(module: ModuleScript, context: RewireContext) => this.onModuleLoaded(module, context, config),
				(module: ModuleScript, context: RewireContext) => this.onModuleUnloaded(module, context, config),
			);
		} else {
			// Folder 容器：扫描所有子模块
			this.hotReloader.scan(
				config.container,
				(module: ModuleScript, context: RewireContext) => this.onModuleLoaded(module, context, config),
				(module: ModuleScript, context: RewireContext) => this.onModuleUnloaded(module, context, config),
			);
		}
	}

	/**
	 * 模块加载/重载回调
	 * @param module - 模块脚本
	 * @param context - Rewire 上下文
	 * @param config - 容器配置
	 */
	private onModuleLoaded(module: ModuleScript, context: RewireContext, config: ContainerConfig): void {
		const { originalModule } = context;

		if (this.config.enabled) {
			print(`[HotReload] 加载模块: ${originalModule.Name}`);
		}

		const [success, moduleExports] = pcall(require, module) as LuaTuple<[boolean, unknown]>;

		if (!success) {
			warn(`[HotReload] 加载失败: ${module.Name}`, moduleExports);
			return;
		}

		this.processModuleExports(originalModule.Name, moduleExports, config);
	}

	/**
	 * 处理模块导出
	 * @param moduleName - 模块名称
	 * @param moduleExports - 模块导出内容
	 * @param config - 容器配置
	 */
	private processModuleExports(moduleName: string, moduleExports: unknown, config: ContainerConfig): void {
		if (!typeIs(moduleExports, "table")) {
			return;
		}

		const currentExports = new Set<string>();

		// 处理默认导出（export default）
		if ("default" in (moduleExports as object)) {
			const defaultExport = (moduleExports as Record<string, unknown>).default;
			this.processExport(moduleName, "default", defaultExport, config);
			currentExports.add("default");
		}

		// 处理具名导出
		for (const [key, value] of pairs(moduleExports as Record<string, unknown>)) {
			if (key === "default") {
				continue; // 已处理
			}

			this.processExport(moduleName, key as string, value, config);
			currentExports.add(key as string);
		}

		// 检测删除的导出
		const previousExports = this.moduleExportsMap.get(moduleName);
		if (previousExports !== undefined) {
			for (const oldExportName of previousExports) {
				if (!currentExports.has(oldExportName)) {
					this.removeSystem(moduleName, oldExportName);
				}
			}
		}

		// 保存当前导出列表
		this.moduleExportsMap.set(moduleName, currentExports);
	}

	/**
	 * 处理单个导出
	 * @param moduleName - 模块名称
	 * @param exportName - 导出名称
	 * @param value - 导出值
	 * @param config - 容器配置
	 */
	private processExport(
		moduleName: string,
		exportName: string,
		value: unknown,
		config: ContainerConfig,
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

			this.registerOrUpdateSystem(systemName, systemConfig);
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

			this.registerOrUpdateSystem(systemName, systemConfig);
		}
	}

	/**
	 * 注册或更新系统
	 * @param systemName - 系统名称
	 * @param config - 系统配置
	 */
	private registerOrUpdateSystem(
		systemName: string,
		config: {
			system: SystemFunction;
			schedule: ScheduleLabel;
			inSet?: string;
			after?: readonly string[];
			before?: readonly string[];
			runIf?: RunCondition;
		},
	): void {
		if (this.registeredSystems.has(systemName)) {
			// 已存在：热更新，只更新注册表中的函数
			this.systemRegistry.set(systemName, config.system);

			if (this.config.enabled) {
				print(`✅ [HotReload] 热更新系统: ${systemName}`);
			}
		} else {
			// 首次注册：创建包装器并注册到调度器
			const wrapper = this.createWrapper(systemName);

			// 更新注册表
			this.systemRegistry.set(systemName, config.system);

			// 标记为已注册
			this.registeredSystems.add(systemName);

			// 注册到调度器
			this.registerToSchedule(wrapper, config);

			if (this.config.enabled) {
				print(`✨ [HotReload] 新增系统: ${systemName}`);
			}
		}
	}

	/**
	 * 创建包装器函数
	 * @param systemName - 系统名称
	 * @returns 包装器函数
	 */
	private createWrapper(systemName: string): SystemFunction {
		return (world: World, context: Context) => {
			const systemFn = this.systemRegistry.get(systemName);
			if (systemFn !== undefined) {
				systemFn(world, context);
			}
		};
	}

	/**
	 * 注册到调度器
	 * @param wrapper - 包装器函数
	 * @param config - 系统配置
	 */
	private registerToSchedule(
		wrapper: SystemFunction,
		config: {
			schedule: ScheduleLabel;
			inSet?: string;
			after?: readonly string[];
			before?: readonly string[];
			runIf?: RunCondition;
		},
	): void {
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

		// 注册到调度器
		this.app.addSystems(config.schedule, systemConfig);
	}

	/**
	 * 移除系统
	 * @param moduleName - 模块名称
	 * @param exportName - 导出名称
	 */
	private removeSystem(moduleName: string, exportName: string): void {
		const systemName = `${moduleName}::${exportName}`;

		// 从注册表删除（包装器会自动跳过调用）
		this.systemRegistry.delete(systemName);

		if (this.config.enabled) {
			print(`🗑️ [HotReload] 删除系统: ${systemName}`);
		}
	}

	/**
	 * 模块卸载回调
	 * @param module - 模块脚本
	 * @param context - Rewire 上下文
	 * @param config - 容器配置
	 */
	private onModuleUnloaded(module: ModuleScript, context: RewireContext, config: ContainerConfig): void {
		const { originalModule } = context;

		if (this.config.enabled) {
			print(
				`[HotReload] 卸载模块: ${originalModule.Name}, isReloading=${tostring(context.isReloading)}`,
			);
		}

		// 热更新场景：Rewire 会立即调用 onModuleLoaded，不需要清理
		if (context.isReloading) {
			return;
		}

		// 模块删除场景：清理所有相关数据
		const moduleExportNames = this.moduleExportsMap.get(originalModule.Name);
		if (moduleExportNames !== undefined) {
			for (const exportName of moduleExportNames) {
				this.removeSystem(originalModule.Name, exportName);
			}
		}

		// 清除导出追踪
		this.moduleExportsMap.delete(originalModule.Name);
	}

	/**
	 * 解析路径字符串为 Instance
	 * @param path - 路径字符串（例如："ReplicatedStorage/Systems"）
	 * @returns Instance 或 undefined
	 */
	private resolvePath(path: string): Instance | undefined {
		const segments = path.split("/");
		let current: Instance | undefined = game;

		for (const segment of segments) {
			if (segment === "" || segment === "game") {
				continue;
			}

			current = current?.FindFirstChild(segment);
			if (current === undefined) {
				return undefined;
			}
		}

		return current;
	}

	/**
	 * 解析 glob 模式匹配多个 Instance
	 * @param pattern - Glob 模式（支持 * 和 ** 通配符）
	 * @returns 匹配的 Instance 数组
	 */
	private resolveGlob(pattern: string): Array<Instance> {
		const segments = pattern.split("/");
		const results: Array<Instance> = [];

		// 从 game 开始递归匹配
		this.matchGlobRecursive(game, segments, 0, results);

		return results;
	}

	/**
	 * 递归匹配 glob 模式
	 * @param current - 当前 Instance
	 * @param segments - 路径段数组
	 * @param segmentIndex - 当前段索引
	 * @param results - 匹配结果数组
	 */
	private matchGlobRecursive(
		current: Instance,
		segments: Array<string>,
		segmentIndex: number,
		results: Array<Instance>,
	): void {
		// 跳过 "game" 段
		if (segmentIndex < segments.size() && (segments[segmentIndex] === "game" || segments[segmentIndex] === "")) {
			this.matchGlobRecursive(current, segments, segmentIndex + 1, results);
			return;
		}

		// 到达末尾，添加结果
		if (segmentIndex >= segments.size()) {
			results.push(current);
			return;
		}

		const segment = segments[segmentIndex];

		if (segment === "**") {
			// ** 匹配任意层级
			// 尝试匹配当前层级
			this.matchGlobRecursive(current, segments, segmentIndex + 1, results);

			// 递归所有子项
			for (const child of current.GetChildren()) {
				this.matchGlobRecursive(child, segments, segmentIndex, results);
			}
		} else if (segment === "*") {
			// * 匹配当前层级的任意子项
			for (const child of current.GetChildren()) {
				this.matchGlobRecursive(child, segments, segmentIndex + 1, results);
			}
		} else if (segment.match("*")[0] !== undefined || segment.match("?")[0] !== undefined) {
			// 包含通配符的段，转换为正则匹配
			const regexPattern = segment.gsub("*", ".*")[0].gsub("?", ".")[0];
			for (const child of current.GetChildren()) {
				if (child.Name.match(`^${regexPattern}$`)[0] !== undefined) {
					this.matchGlobRecursive(child, segments, segmentIndex + 1, results);
				}
			}
		} else {
			// 精确匹配
			const child = current.FindFirstChild(segment);
			if (child !== undefined) {
				this.matchGlobRecursive(child, segments, segmentIndex + 1, results);
			}
		}
	}
}
