/**
 * 运动实体渲染示例
 * 演示如何创建和管理100个运动的实体
 */

import { Workspace } from "@rbxts/services";
import { App } from "../../bevy_app/app";
import { createRenderPlugin, RobloxInstance, Visibility, VisibilityState, ViewVisibility } from "../../bevy_render";
import { World } from "../../bevy_ecs/bevy-world";
import { BuiltinSchedules } from "../../bevy_app/main-schedule";
import { Schedule } from "../../bevy_ecs/schedule/schedule";
import { component } from "@rbxts/matter";
import { RobloxRunnerPlugin } from "../../bevy_app/roblox-adapters";

/**
 * 速度组件
 */
const Velocity = component<{
	x: number;
	y: number;
	z: number;
}>("Velocity");

/**
 * 位置组件
 */
const Position = component<{
	x: number;
	y: number;
	z: number;
}>("Position");

/**
 * 创建一个随机颜色的Part
 * @param index - 实体索引
 * @returns 创建的Part实例
 */
function createRandomPart(index: number): Part {
	const part = new Instance("Part");
	part.Name = `MovingCube_${index}`;
	part.Size = new Vector3(2, 2, 2);

	// 随机初始位置
	const angle = (index / 100) * math.pi * 2;
	const radius = 20 + math.random() * 30;
	part.Position = new Vector3(
		math.cos(angle) * radius,
		5 + math.random() * 20,
		math.sin(angle) * radius,
	);

	// 随机颜色
	const colors = [
		BrickColor.Red(),
		BrickColor.Blue(),
		BrickColor.Green(),
		BrickColor.Yellow(),
		new BrickColor("Magenta"),
		new BrickColor("Deep orange"),
		new BrickColor("Teal"),
		new BrickColor("Hot pink"),
	];
	part.BrickColor = colors[math.floor(math.random() * colors.size())];

	// 设置表面属性
	part.TopSurface = Enum.SurfaceType.Smooth;
	part.BottomSurface = Enum.SurfaceType.Smooth;
	part.Material = Enum.Material.Neon;
	part.Anchored = true;
	part.CanCollide = false;
	part.Parent = Workspace;

	return part;
}

/**
 * 运行运动实体渲染示例
 */
export function runMovingEntitiesExample(): void {
	print("开始运行运动实体渲染示例");

	// 创建应用实例
	const app = new App();

	// 添加必要的插件
	app.addPlugin(new RobloxRunnerPlugin()); // 添加运行器插件来驱动更新循环
	app.addPlugin(createRenderPlugin());

	// 存储所有实体ID
	const entities: Array<number> = [];

	// 在启动阶段创建100个实体
	app.editSchedule(BuiltinSchedules.STARTUP, (schedule: Schedule) => {
		schedule.addSystem({
			name: "SpawnMovingEntities",
			system: (world: World) => {
				print("创建100个运动实体...");

				for (let index = 0; index < 100; index++) {
					const part = createRandomPart(index);

					// 随机速度
					const velocityAngle = math.random() * math.pi * 2;
					const velocityMagnitude = 5 + math.random() * 10;

					// 创建实体并添加组件
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
						Position({
							x: part.Position.X,
							y: part.Position.Y,
							z: part.Position.Z,
						}),
						Velocity({
							x: math.cos(velocityAngle) * velocityMagnitude,
							y: math.random() * 5 - 2.5,
							z: math.sin(velocityAngle) * velocityMagnitude,
						}),
					);

					entities.push(entity);
				}

				print(`成功创建 ${entities.size()} 个运动实体`);
			},
		});
	});

	// 添加运动系统
	let lastTime = os.clock();
	let debugFrame = 0;
	app.editSchedule(BuiltinSchedules.UPDATE, (schedule: Schedule) => {
		schedule.addSystem({
			name: "MoveEntities",
			system: (world: World) => {
				const currentTime = os.clock();
				const deltaTime = currentTime - lastTime;
				lastTime = currentTime;

				// 调试信息
				debugFrame++;
				if (debugFrame % 60 === 0) {
					print(`[MoveEntities] Frame: ${debugFrame}, DeltaTime: ${deltaTime}`);
				}

				// 查询所有具有Position和Velocity组件的实体
				let entityCount = 0;
				for (const [entity, position, velocity] of world.query(Position, Velocity)) {
					entityCount++;
					// 更新位置
					const newX = position.x + velocity.x * deltaTime;
					const newY = position.y + velocity.y * deltaTime;
					const newZ = position.z + velocity.z * deltaTime;

					// 边界检查和反弹
					let bounceVelX = velocity.x;
					let bounceVelY = velocity.y;
					let bounceVelZ = velocity.z;

					const boundary = 50;

					// X轴边界
					if (math.abs(newX) > boundary) {
						bounceVelX = -velocity.x;
					}

					// Y轴边界 (地面和天花板)
					if (newY < 2) {
						bounceVelY = math.abs(velocity.y);
					} else if (newY > 40) {
						bounceVelY = -math.abs(velocity.y);
					}

					// Z轴边界
					if (math.abs(newZ) > boundary) {
						bounceVelZ = -velocity.z;
					}

					// 更新组件
					world.insert(
						entity,
						Position({
							x: newX,
							y: newY,
							z: newZ,
						}),
					);

					// 如果速度改变了，更新速度组件
					if (bounceVelX !== velocity.x || bounceVelY !== velocity.y || bounceVelZ !== velocity.z) {
						world.insert(
							entity,
							Velocity({
								x: bounceVelX,
								y: bounceVelY,
								z: bounceVelZ,
							}),
						);
					}
				}

				// 调试实体数量
				if (debugFrame % 60 === 0) {
					print(`[MoveEntities] Processed ${entityCount} entities`);
				}
			},
		});

		// 同步位置到Roblox实例
		let syncDebugFrame = 0;
		schedule.addSystem({
			name: "SyncPositions",
			system: (world: World) => {
				syncDebugFrame++;
				let syncCount = 0;
				for (const [entity, position, robloxInstance] of world.query(Position, RobloxInstance)) {
					const instance = robloxInstance.instance;
					if (instance && instance.Parent) {
						(instance as Part).Position = new Vector3(position.x, position.y, position.z);
						syncCount++;

						// 每60帧输出一次第一个实体的位置
						if (syncDebugFrame % 60 === 0 && syncCount === 1) {
							print(`[SyncPositions] Entity ${entity} Position: (${position.x}, ${position.y}, ${position.z})`);
							print(`[SyncPositions] Part Position: ${(instance as Part).Position}`);
						}
					}
				}

				if (syncDebugFrame % 60 === 0) {
					print(`[SyncPositions] Synced ${syncCount} entities to Roblox instances`);
				}
			},
		});

		// 添加颜色变化系统
		let colorTimer = 0;
		let colorLastTime = os.clock();
		schedule.addSystem({
			name: "ColorAnimation",
			system: (world: World) => {
				const currentTime = os.clock();
				const deltaTime = currentTime - colorLastTime;
				colorLastTime = currentTime;
				colorTimer += deltaTime;

				// 每2秒改变一些实体的颜色
				if (colorTimer > 2) {
					colorTimer = 0;

					const colors = [
						BrickColor.Red(),
						BrickColor.Blue(),
						BrickColor.Green(),
						BrickColor.Yellow(),
						new BrickColor("Magenta"),
						new BrickColor("Deep orange"),
						new BrickColor("Teal"),
						new BrickColor("Hot pink"),
					];

					// 随机选择10个实体改变颜色
					for (let changeIndex = 0; changeIndex < 10; changeIndex++) {
						const randomIndex = math.floor(math.random() * entities.size());
						const entity = entities[randomIndex];

						for (const [queryEntity, robloxInstance] of world.query(RobloxInstance)) {
							if (queryEntity === entity) {
								const instance = robloxInstance.instance;
								if (instance && instance.Parent) {
									const randomColor = colors[math.floor(math.random() * colors.size())];
									(instance as Part).BrickColor = randomColor;
								}
								break;
							}
						}
					}
				}
			},
		});
	});

	// 运行应用
	app.run();

	print("运动实体渲染示例运行中...");
}

runMovingEntitiesExample();