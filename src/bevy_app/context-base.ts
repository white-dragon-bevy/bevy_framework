/**
 * App 上下文实现
 * 管理和提供插件扩展的访问接口
 */

import {
	ExtensionMetadata,
	NamespaceExtensions,
	NamespaceKeys,
	PluginExtensions,
} from "./extensions";

/**
 * 扩展注册项
 * 存储扩展实例和其关联的元数据
 */
interface ExtensionEntry {
	/** 扩展实例 */
	readonly extension: unknown;
	/** 扩展元数据（可选） */
	readonly metadata?: ExtensionMetadata;
}

/**
 * App 上下文基类
 * 提供插件扩展的注册、访问和管理功能
 * 通过继承 PluginExtensions 实现类型安全的属性访问
 */
export class ContextBase {
	private readonly extensions = new Map<keyof PluginExtensions, ExtensionEntry>();

	/**
	 * 注册扩展到上下文
	 * 如果扩展已存在，会发出警告并覆盖
	 * @template K - 扩展键名类型
	 * @param key - 扩展键名
	 * @param extension - 扩展实现
	 * @param metadata - 扩展元数据（可选）
	 */
	registerExtension<K extends keyof PluginExtensions>(
		key: K,
		extension: PluginExtensions[K],
		metadata?: ExtensionMetadata,
	): void {
		if (this.extensions.has(key)) {
			warn(`Extension '${key as string}' is being overwritten`);
		}

		this.extensions.set(key, {
			extension,
			metadata,
		});

		// 动态添加属性到实例上，实现直接属性访问
		const obj = this as unknown as Record<string, unknown>;
		obj[key as string] = extension;
	}

	/**
	 * 获取扩展
	 * 会验证扩展的依赖关系
	 * @template K - 扩展键名类型
	 * @param key - 扩展键名
	 * @returns 扩展实例
	 * @throws 如果扩展不存在或依赖未满足
	 */
	get<K extends keyof PluginExtensions>(key: K): PluginExtensions[K] {
		const entry = this.extensions.get(key);

		if (!entry) {
			error(`Extension '${key as string}' not found. Did you forget to add the plugin?`);
		}

		// 验证依赖
		this.validateDependencies(key, entry);

		return entry.extension as PluginExtensions[K];
	}

	/**
	 * 安全获取扩展
	 * 不会抛出错误，而是返回undefined
	 * @template K - 扩展键名类型
	 * @param key - 扩展键名
	 * @returns 扩展实例或undefined
	 */
	tryGet<K extends keyof PluginExtensions>(key: K): PluginExtensions[K] | undefined {
		const entry = this.extensions.get(key);

		if (!entry) {
			return undefined;
		}

		// 验证依赖
		try {
			this.validateDependencies(key, entry);
		} catch {
			return undefined;
		}

		return entry.extension as PluginExtensions[K];
	}

	/**
	 * 检查扩展是否存在
	 * @template K - 扩展键名类型
	 * @param key - 扩展键名
	 * @returns 是否存在该扩展
	 */
	has<K extends keyof PluginExtensions>(key: K): boolean {
		return this.extensions.has(key);
	}

	/**
	 * 获取命名空间下的所有扩展
	 * 例如: getNamespace("diagnostics") 会返回所有以 "diagnostics." 开头的扩展
	 * @template T - 命名空间字符串类型
	 * @param namespace - 命名空间前缀
	 * @returns 命名空间下的扩展映射
	 */
	getNamespace<T extends string>(namespace: T): NamespaceExtensions<T> {
		const result = {} as NamespaceExtensions<T>;
		const prefix = `${namespace}.`;
		const prefixSize = prefix.size();

		for (const [key, entry] of this.extensions) {
			const keyStr = key as string;
			if (keyStr === namespace || keyStr.sub(1, prefixSize) === prefix) {
				(result as any)[key] = entry.extension;
			}
		}

		return result;
	}

	/**
	 * 检查命名空间是否存在
	 * 检查是否有任何扩展以该命名空间开头
	 * @param namespace - 命名空间前缀
	 * @returns 是否存在该命名空间
	 */
	hasNamespace(namespace: string): boolean {
		const prefix = `${namespace}.`;
		const prefixSize = prefix.size();

		for (const [key] of this.extensions) {
			const keyStr = key as string;
			if (keyStr === namespace || keyStr.sub(1, prefixSize) === prefix) {
				return true;
			}
		}

		return false;
	}

	/**
	 * 列出所有已注册的扩展
	 * @returns 扩展键名数组
	 */
	listExtensions(): ReadonlyArray<keyof PluginExtensions> {
		const keys: Array<keyof PluginExtensions> = [];
		for (const [key] of this.extensions) {
			keys.push(key);
		}
		return keys;
	}

	/**
	 * 获取扩展的元数据
	 * @template K - 扩展键名类型
	 * @param key - 扩展键名
	 * @returns 元数据或undefined
	 */
	getMetadata<K extends keyof PluginExtensions>(key: K): ExtensionMetadata | undefined {
		return this.extensions.get(key)?.metadata;
	}

	/**
	 * 验证扩展依赖
	 * 检查扩展的所有依赖是否都已注册
	 * @param key - 扩展键名
	 * @param entry - 扩展注册项
	 * @throws 如果有任何依赖未满足
	 */
	private validateDependencies(key: keyof PluginExtensions, entry: ExtensionEntry): void {
		if (!entry.metadata?.dependencies) {
			return;
		}

		for (const dep of entry.metadata.dependencies) {
			if (!this.extensions.has(dep)) {
				error(
					`Extension '${key as string}' requires '${dep as string}' which is not registered`,
				);
			}
		}
	}

	/**
	 * 清空所有扩展
	 * 同时移除动态添加的属性
	 * **警告**: 此方法主要用于测试环境，生产环境慎用
	 */
	clear(): void {
		// 清除动态添加的属性
		for (const [key] of this.extensions) {
			const obj = this as unknown as Record<string, unknown>;
			delete obj[key as string];
		}
		this.extensions.clear();
	}

	/**
	 * 获取已注册扩展的数量
	 * @returns 扩展数量
	 */
	size(): number {
		return this.extensions.size();
	}

	/**
	 * 调试输出所有扩展信息
	 * 用于开发和调试阶段查看扩展注册状态
	 * 输出每个扩展的键名和依赖关系
	 */
	debug(): void {
		for (const [key, entry] of this.extensions) {
			const metadata = entry.metadata;
			if (metadata) {
				if (metadata.dependencies && metadata.dependencies.size() > 0) {
				}
			}
		}
	}
}

/**
 * 类型安全的 ContextBase 接口
 * 通过接口合并实现类型安全的扩展属性访问
 * 合并基础类和插件扩展，允许直接通过属性访问扩展
 */
export interface ContextBase extends PluginExtensions {}