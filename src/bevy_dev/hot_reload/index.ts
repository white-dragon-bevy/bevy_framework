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
 *     hotReload.registerContainers({
 *       container: ReplicatedStorage.WaitForChild("MyPlugin/Systems"),
 *       schedule: BuiltinSchedules.UPDATE,
 *       defaultSet: "MyPlugin",
 *     });
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
