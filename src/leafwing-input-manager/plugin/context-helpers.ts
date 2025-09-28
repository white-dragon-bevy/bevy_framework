/**
 * InputManager Context Helper Functions
 * 提供类型安全的 InputManagerPlugin 扩展访问
 *
 * 由于 TypeScript 不支持动态扩展类方法，使用 helper 函数模式
 * 支持多个不同 Action 类型的 InputManagerPlugin 实例
 */

import { AppContext } from "../../bevy_app/context";
import { PluginExtensions } from "../../bevy_app/extensions";
import { Actionlike } from "../actionlike";
import { InputManagerExtension } from "./extensions";
import { InputManagerPlugin } from "./input-manager-plugin";
import { InputInstanceManagerResource } from "./input-instance-manager-resource";

/**
 * 生成 InputManager 扩展的唯一键
 * @param actionType - Action 类型构造函数
 * @returns 扩展键字符串
 * @example
 * ```typescript
 * const key = getInputManagerExtensionKey(PlayerAction);
 * // 返回: "input-manager:PlayerAction"
 * ```
 */
export function getInputManagerExtensionKey<A extends Actionlike>(
	actionType: (new (...args: any[]) => A) & { name: string },
): string {
	return `input-manager:${actionType.name}`;
}

/**
 * 获取特定 Action 类型的 InputManager 扩展
 * @param context - App 上下文
 * @param actionType - Action 类型构造函数
 * @returns InputManager 扩展实例，如果不存在则返回 undefined
 * @example
 * ```typescript
 * const extension = getInputManagerExtension(context, PlayerAction);
 * if (extension) {
 *     const plugin = extension.getPlugin();
 * }
 * ```
 */
export function getInputManagerExtension<A extends Actionlike>(
	context: AppContext,
	actionType: (new (...args: any[]) => A) & { name: string },
): InputManagerExtension<A> | undefined {
	const key = getInputManagerExtensionKey(actionType);
	const extension = context.tryGet(key as keyof PluginExtensions) as InputManagerExtension<A> | undefined;
	return extension;
}

/**
 * 获取特定 Action 类型的 InputManager 插件
 * @param context - App 上下文
 * @param actionType - Action 类型构造函数
 * @returns InputManagerPlugin 实例，如果不存在则返回 undefined
 * @example
 * ```typescript
 * const plugin = getInputManagerPlugin(context, PlayerAction);
 * if (plugin) {
 *     const instanceManager = plugin.getInstanceManager();
 * }
 * ```
 */
export function getInputManagerPlugin<A extends Actionlike>(
	context: AppContext,
	actionType: (new (...args: any[]) => A) & { name: string },
): InputManagerPlugin<A> | undefined {
	const extension = getInputManagerExtension(context, actionType);
	if (!extension) {
		return undefined;
	}

	const plugin = extension.getPlugin() as unknown as InputManagerPlugin<A>;

	// 需要类型断言，因为扩展接口返回的是基础类型
	return plugin;
}

/**
 * 获取特定 Action 类型的实例管理器
 * @param context - App 上下文
 * @param actionType - Action 类型构造函数
 * @returns InputInstanceManagerResource 实例，如果不存在则返回 undefined
 * @example
 * ```typescript
 * const instanceManager = getInputInstanceManager(context, PlayerAction);
 * if (instanceManager) {
 *     const actionState = instanceManager.getActionState(entity);
 * }
 * ```
 */
export function getInputInstanceManager<A extends Actionlike>(
	context: AppContext,
	actionType: (new (...args: any[]) => A) & { name: string },
): InputInstanceManagerResource<A> | undefined {
	// 从扩展系统获取
	const extension = getInputManagerExtension(context, actionType);
	if (!extension) {
		return undefined;
	}

	const manager = extension.getInstanceManager();
	return manager;
}

/**
 * 注册 InputManager 扩展到 App 上下文
 * 内部使用，由 InputManagerPlugin 调用
 * @param context - App 上下文
 * @param actionType - Action 类型构造函数
 * @param plugin - InputManagerPlugin 实例
 * @internal
 */
export function registerInputManagerExtension<A extends Actionlike>(
	context: AppContext,
	actionType: (new (...args: any[]) => A) & { name: string },
	plugin: InputManagerPlugin<A>,
	instanceManager: InputInstanceManagerResource<A>,
): void {
	const key = getInputManagerExtensionKey(actionType);

	// Check if extension already exists
	if (context.has(key as keyof PluginExtensions)) {
		// Extension already registered, skip to avoid warning
		return;
	}

	// Store references to ensure they're not lost
	const pluginRef = plugin;
	const managerRef = instanceManager;

	const extension: InputManagerExtension<A> = {
		getPlugin(): InputManagerPlugin<A> {
			return pluginRef;
		},
		getInstanceManager(): InputInstanceManagerResource<A> {
			return managerRef;
		},
	};

	context.registerExtension(key as keyof PluginExtensions, extension as unknown as PluginExtensions[keyof PluginExtensions], {
		description: `InputManager for ${actionType.name} actions`,
		version: "0.1.0",
	});
}

/**
 * 检查特定 Action 类型的 InputManager 是否已注册
 * @param context - App 上下文
 * @param actionType - Action 类型构造函数
 * @returns 是否已注册
 * @example
 * ```typescript
 * if (hasInputManager(context, PlayerAction)) {
 *     print("PlayerAction InputManager is registered");
 * }
 * ```
 */
export function hasInputManager<A extends Actionlike>(
	context: AppContext,
	actionType: (new (...args: any[]) => A) & { name: string },
): boolean {
	const key = getInputManagerExtensionKey(actionType);
	return context.has(key as keyof PluginExtensions);
}

/**
 * 调试：列出所有已注册的 InputManager
 * @param context - App 上下文
 * @returns 已注册的 Action 类型名称数组
 */
export function listInputManagers(context: AppContext): string[] {
	const allExtensions = context.listExtensions();
	const inputManagers: string[] = [];

	for (const key of allExtensions) {
		const keyStr = key as string;
		if (keyStr.sub(1, 14) === "input-manager:") {
			// 提取 Action 类型名称
			const actionTypeName = keyStr.sub(15);
			inputManagers.push(actionTypeName);
		}
	}

	return inputManagers;
}

/**
 * 调试：打印所有 InputManager 信息
 * @param context - App 上下文
 */
export function debugInputManagers(context: AppContext): void {
	const managers = listInputManagers(context);

	if (managers.size() === 0) {
		// No InputManagers registered
	} else {
		for (const manager of managers) {
			const key = `input-manager:${manager}`;
			const metadata = context.getMetadata(key as keyof PluginExtensions);

			// Metadata available but no debug output needed
		}
	}
}