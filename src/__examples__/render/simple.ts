/**
 * 最简单的渲染系统示例
 * 演示如何使用 bevy_render 模块来管理对象的可见性
 */

import { Workspace } from "@rbxts/services";
import { App } from "../../bevy_app/app";
import { createRenderPlugin, RobloxInstance, Visibility, VisibilityState, ViewVisibility } from "../../bevy_render";
import { BevyWorld } from "../../bevy_ecs/bevy-world";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { Schedule } from "../../bevy_ecs/schedule/schedule";
import { RobloxRunnerPlugin } from "../../bevy_app/roblox-adapters";

/**
 * 运行渲染示例
 */
export function runRenderExample(): void {
	print("开始运行渲染示例");

	// 创建应用实例
	const app = new App();

	// 添加必要的插件
	app.addPlugin(new RobloxRunnerPlugin()); // 添加运行器插件来驱动更新循环
	app.addPlugin(createRenderPlugin());

	// 创建一个 Part 作为渲染对象
	const part = new Instance("Part");
	part.Name = "TestCube";
	part.Size = new Vector3(4, 4, 4);
	part.Position = new Vector3(0, 10, 0);
	part.BrickColor = BrickColor.Red();
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	part.Parent = Workspace;

	// 在启动阶段添加实体
	app.editSchedule(BuiltinSchedules.STARTUP, (schedule: Schedule) => {
		schedule.addSystem({
			name: "SpawnTestEntity",
			system: (world: BevyWorld) => {
				// 创建实体并添加渲染组件
				const entity = world.spawn(
					RobloxInstance({
						instance: part,
						originalParent: Workspace,
					}),
					Visibility({
						state: VisibilityState.Visible,
					}),
					ViewVisibility({
						visible: true,
					}),
				);

				print(`创建了测试实体: ${entity}`);
			},
		});
	});

	// 添加一个切换可见性的系统
	let frameCount = 0;
	app.editSchedule(BuiltinSchedules.UPDATE, (schedule: Schedule) => {
		schedule.addSystem({
			name: "ToggleVisibility",
			system: (world: BevyWorld) => {
				frameCount++;

				// 每60帧切换一次可见性
				if (frameCount % 60 === 0) {
					for (const [entity, visibility] of world.query(Visibility)) {
						const currentState = visibility.state;
						const newState =
							currentState === VisibilityState.Visible
								? VisibilityState.Hidden
								: VisibilityState.Visible;

						world.insert(
							entity,
							Visibility({
								state: newState,
							}),
						);

						print(`切换实体 ${entity} 可见性: ${currentState} -> ${newState}`);
					}
				}
			},
		});
	});

	// 运行应用
	app.run();

	print("渲染示例运行中...");
}

runRenderExample();
