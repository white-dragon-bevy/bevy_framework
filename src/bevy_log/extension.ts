import type { ExtensionFactory } from "../bevy_app/app";
import { Level, LogSubscriber } from "./lib";
/**
 * LogPlugin 扩展
 * 定义日志插件暴露给 App 的扩展
 */
export interface LogPluginExtension {
	
	logManager:LogSubscriber


	logLevel: Level
}

