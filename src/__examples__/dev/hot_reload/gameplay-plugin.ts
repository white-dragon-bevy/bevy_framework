/**
 * 示例游戏插件
 * 展示如何在插件中使用热更新系统
 */

import type { App } from "../../../bevy_app/app";
import type { Plugin } from "../../../bevy_app/plugin";
import { BuiltinSchedules } from "../../../bevy_app/main-schedule";
import type { HotReloadService } from "../../../bevy_dev/hot_reload";
import { ReplicatedStorage } from "@rbxts/services";

declare const script: LuaSourceContainer & { Parent: Instance };

/**
 * 游戏玩法插件
 * 使用热更新加载所有游戏系统
 */
export class GameplayPlugin implements Plugin {
	name(): string {
		return "GameplayPlugin";
	}

	isUnique(): boolean {
		return true;
	}

	build(app: App): void {
		print("=== GameplayPlugin 初始化 ===");

		// 1. 获取热更新服务
		const hotReload = app.getResource<HotReloadService>();

		if (!hotReload) {
			warn("HotReloadService 未找到！");
			warn("请确保在 GameplayPlugin 之前添加 HotReloadPlugin：");
			warn("  app.addPlugin(new HotReloadPlugin());");
			warn("  app.addPlugin(new GameplayPlugin());");
			error("缺少 HotReloadService");
		}

		// 2. 注册热更新容器
		this.registerHotSystems(hotReload);

		print("GameplayPlugin 初始化完成");
	}

	/**
	 * 注册热更新系统容器
	 */
	private registerHotSystems(hotReload: HotReloadService): void {
		// 尝试查找系统容器（使用 FindFirstChild 更安全）
		const parent = script.Parent;
		const hotSystemsContainer = parent.FindFirstChild("systems");

		if (!hotSystemsContainer) {
			warn(`未找到系统容器: ${parent.GetFullName()}/systems`);
			warn("当前目录内容：");
			for (const child of parent.GetChildren()) {
				warn(`  - ${child.Name} (${child.ClassName})`);
			}
			return;
		}

		// 注册容器
		hotReload.registerContainers({
			container: hotSystemsContainer,
			schedule: BuiltinSchedules.UPDATE,
			defaultSet: "Gameplay",
		});

		print(`已注册热更新容器: ${hotSystemsContainer.GetFullName()}`);

		// 判断容器类型并列出系统
		if (hotSystemsContainer.IsA("ModuleScript")) {
			print("容器类型: ModuleScript（单文件多系统导出）");
		} else {
			print(`当前系统数量: ${hotSystemsContainer.GetChildren().size()}`);

			// 列出所有系统模块
			const systems = hotSystemsContainer.GetChildren();
			if (systems.size() > 0) {
				print("发现以下系统模块：");
				for (const system of systems) {
					if (system.IsA("ModuleScript")) {
						print(`  - ${system.Name}`);
					}
				}
			} else {
				print("提示：容器中暂无系统模块");
			}
		}
	}
}

/**
 * 渲染插件（示例）
 * 展示如何使用多个容器
 */
export class RenderPlugin implements Plugin {
	name(): string {
		return "RenderPlugin";
	}

	isUnique(): boolean {
		return true;
	}

	build(app: App): void {
		print("=== RenderPlugin 初始化 ===");

		const hotReload = app.getResource<HotReloadService>();
		if (!hotReload) {
			warn("HotReloadService 未找到，跳过渲染系统注册");
			return;
		}

		const renderSystemsFolder = ReplicatedStorage.FindFirstChild("RenderSystems");
		if (!renderSystemsFolder) {
			print("未找到 ReplicatedStorage/RenderSystems 文件夹，跳过");
			return;
		}

		// 注册渲染系统容器
		hotReload.registerContainers({
			container: renderSystemsFolder,
			schedule: BuiltinSchedules.POST_UPDATE,
			defaultSet: "Render",
		});

		print(`已注册渲染系统容器: ${renderSystemsFolder.GetFullName()}`);
	}
}
