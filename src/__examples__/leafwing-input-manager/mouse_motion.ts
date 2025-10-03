/**
 * Mouse Motion Example - 鼠标移动示例
 *
 * 演示如何使用鼠标移动来控制相机平移
 *
 * 对应 Rust 示例: bevy-origin-packages/leafwing-input-manager/examples/mouse_motion.rs
 *
 * 功能说明:
 * - 使用 MouseMove 作为双轴输入捕获鼠标移动
 * - 定义 CameraMovement::Pan 动作用于相机平移
 * - 使用鼠标移动增量来更新相机位置
 * - 演示 UI 坐标系的 Y 轴反转处理
 */

import { component } from "@rbxts/matter";
import { App } from "../../bevy_app/app";
import { RobloxRunnerPlugin } from "../../bevy_app/roblox-adapters";
import { MainScheduleLabel } from "../../bevy_app";
import { InputManagerPlugin } from "../../leafwing-input-manager/plugin/input-manager-plugin";
import { InputMap } from "../../leafwing-input-manager/input-map/input-map";
import { ActionState } from "../../leafwing-input-manager/action-state/action-state";
import { MouseMove } from "../../leafwing-input-manager/user-input/mouse";
import { Actionlike, ActionlikeEnum } from "../../leafwing-input-manager/actionlike";
import { InputControlKind } from "../../leafwing-input-manager/input-control-kind";
import { BevyWorld } from "../../bevy_ecs";
import { InputManagerExtension } from "leafwing-input-manager";

/**
 * 相机移动动../../bevy_ecs/types 的 CameraMovement enum
 */
class CameraMovement extends ActionlikeEnum {
	/**
	 * 平移动作 (DualAxis)
	 */
	static readonly Pan = new CameraMovement("Pan", InputControlKind.DualAxis);

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
 * 存储相机的位置信息
 */
interface Camera2DData {
	readonly position: Vector3;
}

/**
 * 相机组件
 * 使用 Matter component() 创建
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
 */
const Sprite = component<SpriteData>("Sprite");

/**
 * 相机平移速率常量
 */
const CAMERA_PAN_RATE = 0.5;

/**
 * 存储组件定义的全局变量
 */
type InputComponentsType = ReturnType<InputManagerExtension<CameraMovement>["getComponents"]>;
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

	// 创建输入映射: 鼠标移动 -> 相机平移
	// 对应 Rust: InputMap::default().with_dual_axis(CameraMovement::Pan, MouseMove::default())
	const inputMap = new InputMap<CameraMovement>();
	inputMap.insert(CameraMovement.Pan, MouseMove.get());

	// 创建动作状态
	const actionState = new ActionState<CameraMovement>();
	actionState.registerAction(CameraMovement.Pan);

	// 创建相机实体并附加输入组件
	// 对应 Rust: commands.spawn(Camera2d).insert(input_map)
	const cameraEntity = world.spawn(
		Camera2D({
			position: new Vector3(0, 0, 0),
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

	print("Mouse Motion Example: Scene setup complete");
	print("Move your mouse to pan the camera");
}

/**
 * Pan camera system - 根据鼠标移动平移相机
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

		// 获取鼠标移动向量
		// 对应 Rust: action_state.axis_pair(&CameraMovement::Pan)
		const cameraPanVector = inputData.actionState.axisPair(CameraMovement.Pan);

		// 计算新的相机位置
		// 因为我们移动的是相机而不是对象，所以需要反向平移
		// 但是 UI 坐标系的 Y 轴是反转的，所以 Y 轴需要再反转一次
		// 对应 Rust:
		// camera_transform.translation.x -= CAMERA_PAN_RATE * camera_pan_vector.x;
		// camera_transform.translation.y += CAMERA_PAN_RATE * camera_pan_vector.y;
		const newX = camera.position.X - CAMERA_PAN_RATE * cameraPanVector.x;
		const newY = camera.position.Y + CAMERA_PAN_RATE * cameraPanVector.y;

		// 更新相机位置
		world.insert(
			entityId,
			Camera2D({
				position: new Vector3(newX, newY, camera.position.Z),
			}),
		);

		// Debug 输出 (可选)
		if (cameraPanVector.x !== 0 || cameraPanVector.y !== 0) {
			print(
				`Camera panning: delta=(${string.format("%.2f", cameraPanVector.x)}, ${string.format("%.2f", cameraPanVector.y)}) ` +
					`position=(${string.format("%.2f", newX)}, ${string.format("%.2f", newY)})`,
			);
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
		
	});
	app.addPlugins(inputPlugin);

	inputComponents = inputPlugin.getExtension(app).getComponents();


	// 添加初始化系统
	// 对应 Rust: .add_systems(Startup, setup)
	app.addSystems(MainScheduleLabel.STARTUP, setupSystem);

	// 添加相机平移系统
	// 对应 Rust: .add_systems(Update, pan_camera)
	app.addSystems(MainScheduleLabel.UPDATE, panCameraSystem);

	print("Mouse Motion Example: Starting application");
	print("Move your mouse to see camera panning in action");

	// 运行应用
	// 对应 Rust: .run()
	app.run();

	return app;
}

/**
 * 导出用于测试
 */
export { CameraMovement, setupSystem, panCameraSystem };
