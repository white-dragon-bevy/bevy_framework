/**
 * 扩展使用示例
 * 展示如何使用插件扩展系统
 */

import { App, getContextWithExtensions } from "../bevy_app/app";
import { LogPlugin } from "../bevy_log";

/**
 * 使用示例 - 直接访问 context（推荐！）
 */
export function directContextExample() {
	// 1. 创建 App 并添加插件
	const app = App.create().addPlugin(new LogPlugin());

	// 2. 现在可以直接访问 context 的扩展方法！
	const contextWithExt = app.context as typeof app.context & {
		getLogManager?: () => unknown;
		getLogLevel?: () => unknown;
	};

	const logManager = contextWithExt.getLogManager?.();
	const logLevel = contextWithExt.getLogLevel?.();

	print("Log Manager (direct):", logManager);
	print("Log Level (direct):", logLevel);

	return app;
}

/**
 * 多个插件扩展的示例
 */
export function multipleExtensionsExample() {
	const app = App.create().addPlugin(new LogPlugin());
	// .addPlugin(new SomeOtherPlugin());

	// 使用类型断言访问扩展
	const contextWithExt = app.context as typeof app.context & {
		getLogManager?: () => unknown;
		getLogLevel?: () => unknown;
	};

	// 类型安全地使用所有扩展
	const logManager = contextWithExt.getLogManager?.();
	const logLevel = contextWithExt.getLogLevel?.();
	// const otherValue = context.someOtherMethod?.();

	return { app, contextWithExt, logManager, logLevel };
}
