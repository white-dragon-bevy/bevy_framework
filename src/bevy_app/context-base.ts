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

}

/**
 * 类型安全的 ContextBase 接口
 * 通过接口合并实现类型安全的扩展属性访问
 * 合并基础类和插件扩展，允许直接通过属性访问扩展
 */
export interface ContextBase extends PluginExtensions {}