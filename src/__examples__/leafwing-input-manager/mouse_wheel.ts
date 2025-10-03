/**
 * Mouse Wheel Example - 鼠标滚轮示例
 *
 * 演示如何使用鼠标滚轮来控制相机缩放和平移
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/mouse_wheel.rs
 *
 * 功能说明:
 * - 使用 MouseScrollAxis.Y 作为单轴输入捕获垂直滚轮
 * - 使用 MouseScrollDirection 作为按钮输入捕获水平滚动方向
 * - 使用 MouseScroll 作为双轴输入捕获完整滚轮输入
 * - 定义 CameraMovement::Zoom 动作用于相机缩放
 * - 定义 CameraMovement::Pan 动作用于相机平移
 * - 演示滚轮控制相机变换的两种模式
 */

import { component } from "@rbxts/matter";
import { App } from "../../bevy_app/app";
import { RobloxRunnerPlugin } from "../../bevy_app/roblox-adapters";
import { MainScheduleLabel } from "../../bevy_app";
import { InputManagerPlugin } from "../../leafwing-input-manager/plugin/input-manager-plugin";
import { InputMap } from "../../leafwing-input-manager/input-map/input-map";
import { ActionState } from "../../leafwing-input-manager/action-state/action-state";
import { MouseScrollAxis, MouseScrollDirection, MouseScroll } from "../../leafwing-input-manager/user-input/mouse";
import { Actionlike, ActionlikeEnum } from "../../leafwing-input-manager/actionlike";
import { InputControlKind } from "../../leafwing-input-manager/input-control-kind";
import { BevyWorld } from "../../bevy_ecs";

/**
 * 相机移动动作枚举
 * 对应 Rust 的 CameraMovement enum
 */
class CameraMovement extends ActionlikeEnum {
	/**
	 * 缩放动作 (Axis)
	 * 对应 Rust: #[actionlike(Axis)] Zoom
	 */
	static readonly Zoom = new CameraMovement("Zoom", InputControlKind.Axis);

	/**
	 * 平移动作 (DualAxis)
	 * 对应 Rust: #[actionlike(DualAxis)] Pan
	 */
	static readonly Pan = new CameraMovement("Pan", InputControlKind.DualAxis);

	/**
	 * 向左平移动作 (Button)
	 * 对应 Rust: PanLeft
	 */
	static readonly PanLeft = new CameraMovement("PanLeft", InputControlKind.Button);

	/**
	 * 向右平移动作 (Button)
	 * 对应 Rust: PanRight
	 */
	static readonly PanRight = new CameraMovement("PanRight", InputControlKind.Button);

	private constructor(value: string, private readonly controlKind: InputControlKind) {
		super(value);
	}

	hash(): string {
		return `CameraMovement::${this.value}`;
	}

	getInputControlKind(): InputControlKind {
		return this.controlKind;
	}
}

/**
 * 相机组件数据
 * 存储相机的位置和缩放比例
 */
interface Camera2DData {
	readonly position: Vector3;
	readonly scale: number;
}

/**
 * 相机组件
 * 使用 Matter component() 创建
 * 对应 Rust 的 Camera2d
 */
const Camera2D = component<Camera2DData>("Camera2D");

/**
 * 精灵组件数据
 * 标记场景中的精灵实体
 */
interface SpriteData {
	readonly scale: Vector3;
}

/**
 * 精灵组件
 * 使用 Matter component() 创建
 * 对应 Rust 的 Sprite
 */
const Sprite = component<SpriteData>("Sprite");

/**
 * 相机缩放速率常量
 * 对应 Rust: const CAMERA_ZOOM_RATE: f32 = 0.05
 */
const CAMERA_ZOOM_RATE = 0.05;

/**
 * 相机平移速率常量
 * 对应 Rust: const CAMERA_PAN_RATE: f32 = 10.
 */
const CAMERA_PAN_RATE = 10.0;

/**
 * 存储组件定义的全局变量
 */
type InputComponentsType = ReturnType<
	NonNullable<ReturnType<typeof InputManagerPlugin.create<CameraMovement>>["extension"]>["getComponents"]
>;
let inputComponents: InputComponentsType | undefined;

/**
 * Setup system - 初始化场景
 * 对应 Rust 的 setup 函数
 * @param world - Bevy 世界实例
 */
function setupSystem(world: BevyWorld): void {
	if (!inputComponents) {
		warn("InputManagerPlugin components not initialized in setupSystem");
		return;
	}

	const components = inputComponents;

	// 创建输入映射
	// 对应 Rust:
	// let input_map = InputMap::default()
	//     .with_axis(CameraMovement::Zoom, MouseScrollAxis::Y)
	//     .with(CameraMovement::PanLeft, MouseScrollDirection::LEFT)
	//     .with(CameraMovement::PanRight, MouseScrollDirection::RIGHT)
	//     .with_dual_axis(CameraMovement::Pan, MouseScroll::default())
	//     .with_dual_axis(CameraMovement::Pan, MouseScroll::default().digital());
	const inputMap = new InputMap<CameraMovement>();

	// 将垂直滚轮映射到缩放动作
	inputMap.insert(CameraMovement.Zoom, MouseScrollAxis.Y);

	// 将水平滚动方向映射到按钮式平移动作
	inputMap.insert(CameraMovement.PanLeft, MouseScrollDirection.LEFT);
	inputMap.insert(CameraMovement.PanRight, MouseScrollDirection.RIGHT);

	// 将滚轮双轴输入映射到双轴平移动作
	// 注意: Rust 示例中有两个映射，这里合并为一个
	// MouseScroll.default().digital() 在 TypeScript 版本中暂不实现
	inputMap.insert(CameraMovement.Pan, MouseScroll.get());

	// 创建动作状态
	const actionState = new ActionState<CameraMovement>();
	actionState.registerAction(CameraMovement.Zoom);
	actionState.registerAction(CameraMovement.Pan);
	actionState.registerAction(CameraMovement.PanLeft);
	actionState.registerAction(CameraMovement.PanRight);

	// 创建相机实体并附加输入组件
	// 对应 Rust: commands.spawn(Camera2d).insert(input_map)
	const cameraEntity = world.spawn(
		Camera2D({
			position: new Vector3(0, 0, 0),
			scale: 1.0,
		}),
	);

	// 将输入组件添加到实体
	components.insert(world, cameraEntity, inputMap, actionState);

	// 创建一个精灵作为参考对象
	// 对应 Rust: commands.spawn((Sprite::default(), Transform::from_scale(Vec3::new(100., 100., 1.))))
	world.spawn(
		Sprite({
			scale: new Vector3(100, 100, 1),
		}),
	);

	print("Mouse Wheel Example: Scene setup complete");
	print("Use mouse wheel up/down to zoom camera");
	print("Use mouse wheel left/right to pan camera");
}

/**
 * Zoom camera system - 根据滚轮缩放相机
 * 对应 Rust 的 zoom_camera 函数
 * @param world - Bevy 世界实例
 */
function zoomCameraSystem(world: BevyWorld): void {
	if (!inputComponents) {
		return;
	}

	const components = inputComponents;

	// 查询所有带有相机和输入组件的实体
	// 对应 Rust: query: Single<(&mut Projection, &ActionState<CameraMovement>), With<Camera2d>>
	for (const [entityId, camera, inputData] of world.query(Camera2D, components.component)) {
		if (!inputData.actionState || !inputData.enabled) {
			continue;
		}

		// 获取滚轮缩放值
		// 对应 Rust: let zoom_delta = action_state.value(&CameraMovement::Zoom)
		// 向上滚动为正值，向下滚动为负值
		const zoomDelta = inputData.actionState.value(CameraMovement.Zoom);

		if (zoomDelta !== 0) {
			// 计算新的缩放比例
			// 对应 Rust: orthographic_projection.scale *= 1. - zoom_delta * CAMERA_ZOOM_RATE
			// 注意: 缩放比例必须保持为正数
			let newScale = camera.scale * (1 - zoomDelta * CAMERA_ZOOM_RATE);

			// 限制缩放范围，避免缩放比例过小或过大
			newScale = math.max(0.1, math.min(10, newScale));

			// 更新相机缩放
			world.insert(
				entityId,
				Camera2D({
					position: camera.position,
					scale: newScale,
				}),
			);

			// Debug 输出
			print(
				`Camera zoom: delta=${string.format("%.2f", zoomDelta)} scale=${string.format("%.2f", newScale)}`,
			);
		}
	}
}

/**
 * Pan camera system - 根据滚轮或按钮输入平移相机
 * 对应 Rust 的 pan_camera 函数
 * @param world - Bevy 世界实例
 */
function panCameraSystem(world: BevyWorld): void {
	if (!inputComponents) {
		return;
	}

	const components = inputComponents;

	// 查询所有带有相机和输入组件的实体
	// 对应 Rust: query: Single<(&mut Transform, &ActionState<CameraMovement>), With<Camera2d>>
	for (const [entityId, camera, inputData] of world.query(Camera2D, components.component)) {
		if (!inputData.actionState || !inputData.enabled) {
			continue;
		}

		let positionChanged = false;
		let newX = camera.position.X;
		let newY = camera.position.Y;

		// 处理按钮式平移输入
		// 对应 Rust:
		// if action_state.pressed(&CameraMovement::PanLeft) {
		//     camera_transform.translation.x -= CAMERA_PAN_RATE;
		// }
		if (inputData.actionState.pressed(CameraMovement.PanLeft)) {
			newX -= CAMERA_PAN_RATE;
			positionChanged = true;
		}

		// 对应 Rust:
		// if action_state.pressed(&CameraMovement::PanRight) {
		//     camera_transform.translation.x += CAMERA_PAN_RATE;
		// }
		if (inputData.actionState.pressed(CameraMovement.PanRight)) {
			newX += CAMERA_PAN_RATE;
			positionChanged = true;
		}

		// 处理双轴平移输入（可选）
		// 注意: Rust 示例中没有使用 Pan 双轴输入，但我们可以支持它
		const panVector = inputData.actionState.axisPair(CameraMovement.Pan);
		if (panVector && (panVector.x !== 0 || panVector.y !== 0)) {
			newX += panVector.x * CAMERA_PAN_RATE * 0.1; // 降低双轴灵敏度
			newY += panVector.y * CAMERA_PAN_RATE * 0.1;
			positionChanged = true;
		}

		// 更新相机位置
		if (positionChanged) {
			world.insert(
				entityId,
				Camera2D({
					position: new Vector3(newX, newY, camera.position.Z),
					scale: camera.scale,
				}),
			);

			// Debug 输出
			print(`Camera pan: position=(${string.format("%.2f", newX)}, ${string.format("%.2f", newY)})`);
		}
	}
}

/**
 * 主函数 - 创建并运行应用
 * 对应 Rust 的 main 函数
 * @returns App 实例
 */
export function main(): App {
	const app = new App();

	// 添加默认插件 (Roblox 运行器)
	// 对应 Rust: .add_plugins(DefaultPlugins)
	app.addPlugins(new RobloxRunnerPlugin());

	// 添加输入管理器插件
	// 对应 Rust: .add_plugins(InputManagerPlugin::<CameraMovement>::default())
	const inputPlugin = InputManagerPlugin.create<CameraMovement>({
		actionTypeName: "CameraMovement",
	});
	app.addPlugins(inputPlugin);

	// 保存组件定义用于系统访问
	if (inputPlugin.extension) {
		inputComponents = inputPlugin.extension.getComponents();
	} else {
		warn("InputManagerPlugin extension is undefined");
	}

	// 添加初始化系统
	// 对应 Rust: .add_systems(Startup, setup)
	app.addSystems(MainScheduleLabel.STARTUP, setupSystem);

	// 添加缩放系统
	// 对应 Rust: .add_systems(Update, zoom_camera)
	app.addSystems(MainScheduleLabel.UPDATE, zoomCameraSystem);

	// 添加平移系统，在缩放之后执行
	// 对应 Rust: .add_systems(Update, pan_camera.after(zoom_camera))
	app.addSystems(MainScheduleLabel.UPDATE, panCameraSystem);

	print("Mouse Wheel Example: Starting application");
	print("Scroll mouse wheel vertically to zoom");
	print("Scroll mouse wheel horizontally to pan left/right");

	// 运行应用
	// 对应 Rust: .run()
	app.run();

	return app;
}

/**
 * 导出用于测试
 */
export { CameraMovement, setupSystem, zoomCameraSystem, panCameraSystem };
