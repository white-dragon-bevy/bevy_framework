import type { ExtensionFactory } from "../bevy_app/app";
import { Level, LogSubscriber } from "./lib";
/**
 * LogPlugin 扩展
 * 定义日志插件暴露给 App 的扩展
 */
export interface LogPluginExtension {
	/**
	 * 获取日志管理器工厂
	 * 返回能够获取全局日志订阅器的工厂函数
	 */
	getLogManager: ExtensionFactory<() => LogSubscriber | undefined>;

	/**
	 * 获取当前日志级别工厂
	 * 返回能够获取当前配置日志级别的工厂函数
	 */
	getLogLevel: ExtensionFactory<() => Level>;
}