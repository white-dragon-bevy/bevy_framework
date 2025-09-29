/**
 * 扩展使用示例
 * 展示如何使用插件扩展系统
 */

import { App, getContextWithExtensions } from "../bevy_app/app";
import { LogPlugin } from "../bevy_log/lib";

/**
 * 使用示例 - 方式1：使用辅助函数
 */
export function extensionExample() {
    // 1. 创建 App 并添加插件
    const app = App.create()
        .addPlugin(new LogPlugin());

    // 2. 获取带扩展的 context - 现在可以直接使用插件类型！
    const contextWithExtensions = getContextWithExtensions<LogPlugin>(app);

    // 3. 现在可以使用类型安全的扩展方法
    const logManager = contextWithExtensions.getLogManager();
    const logLevel = contextWithExtensions.getLogLevel();

    print("Log Manager:", logManager);
    print("Log Level:", logLevel);

    return app;
}

/**
 * 使用示例 - 方式2：直接访问 context（推荐！）
 */
export function directContextExample() {
    // 1. 创建 App 并添加插件
    const app = App.create()
        .addPlugin(new LogPlugin());

    // 2. 现在可以直接访问 context 的扩展方法！
    const logManager = app.context.getLogManager();
    const logLevel = app.context.getLogLevel();

    print("Log Manager (direct):", logManager);
    print("Log Level (direct):", logLevel);

    return app;
}

/**
 * 多个插件扩展的示例
 */
export function multipleExtensionsExample() {
    // 假设有多个插件，可以创建联合类型
    type MyPlugins = LogPlugin; // | SomeOtherPlugin;

    const app = App.create()
        .addPlugin(new LogPlugin());
        // .addPlugin(new SomeOtherPlugin());

    // 获取合并了所有扩展的 context
    const context = getContextWithExtensions<MyPlugins>(app);


    // 类型安全地使用所有扩展
    const logManager = context.getLogManager();
    const logLevel = context.getLogLevel();
    // const otherValue = context.someOtherMethod();

    return { app, context, logManager, logLevel };
}
