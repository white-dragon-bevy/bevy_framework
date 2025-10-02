/**
 * 热更新模块
 * 提供零侵入性的系统热更新功能
 *
 * @example
 * ```typescript
 * // 启动代码
 * const app = new App();
 * app.addPlugin(new HotReloadPlugin());
 * app.addPlugin(new MyPlugin());
 * app.run();
 *
 * // 插件代码
 * class MyPlugin implements Plugin {
 *   build(app: App): void {
 *     const hotReload = app.getResource<HotReloadService>();
 *     assert(hotReload);
 *
 *     // 方式 1：Instance 容器（推荐，类型安全）
 *     hotReload.registerContainers({
 *       container: ReplicatedStorage.WaitForChild("MyPlugin/Systems"),
 *       schedule: BuiltinSchedules.UPDATE,
 *       defaultSet: "MyPlugin",
 *     });
 *
 *     // 方式 2：字符串路径（类似 Flamework.addPaths）
 *     hotReload.addPaths(
 *       "ReplicatedStorage/MyPlugin/Systems",
 *       BuiltinSchedules.UPDATE,
 *       "MyPlugin"
 *     );
 *
 *     // 方式 3：Glob 模式（类似 Flamework.addPathsGlob）
 *     // 支持通配符：* 匹配单层，** 匹配多层
 *     hotReload.addPathsGlob(
 *       "ReplicatedStorage/Systems/**",  // 匹配所有子目录
 *       BuiltinSchedules.UPDATE
 *     );
 *
 *     // Glob 示例：匹配特定模式
 *     hotReload.addPathsGlob(
 *       "ReplicatedStorage/Systems/Combat*",  // CombatSystem, CombatAI 等
 *       BuiltinSchedules.UPDATE
 *     );
 *   }
 * }
 *
 * // 系统模块（具名导出）
 * export function handleInput(world: World, context: Context) {
 *   print("HandleInput");
 * }
 *
 * export const updateMovement = {
 *   system: (world, context) => print("Movement"),
 *   after: ["HandleInput"],
 * };
 * ```
 */

export { HotReloadPlugin, type HotReloadService } from "./plugin";
export type { ContainerConfig, HotReloadConfig, HotSystemModule } from "./config";
