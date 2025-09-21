/**
 * 增强调度系统使用示例
 * 展示 Bevy 风格的链式配置、系统集、依赖关系等功能
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../bevy_ecs/resource";
import { CommandBuffer } from "../../bevy_ecs/command-buffer";
import {
	EnhancedSchedule,
	system,
	configureSet,
	chain,
	systemSet,
	CoreSet,
	SystemSet,
} from "../../bevy_ecs/enhanced-schedule";

// 定义自定义系统集
const GameSystemSets = {
	Input: systemSet("Input"),
	Physics: systemSet("Physics"),
	AI: systemSet("AI"),
	Animation: systemSet("Animation"),
	Rendering: systemSet("Rendering"),
} as const;

/**
 * 创建一个游戏调度示例
 */
export function createGameSchedule(): EnhancedSchedule {
	const schedule = new EnhancedSchedule("GameLoop");

	// 配置系统集的执行顺序
	schedule
		// 核心系统集配置
		.configureSet(configureSet(CoreSet.PreUpdate).after(CoreSet.First))
		.configureSet(configureSet(CoreSet.Update).after(CoreSet.PreUpdate))
		.configureSet(configureSet(CoreSet.PostUpdate).after(CoreSet.Update))
		.configureSet(configureSet(CoreSet.Last).after(CoreSet.PostUpdate))

		// 游戏系统集配置
		.configureSet(configureSet(GameSystemSets.Input).inSet(CoreSet.PreUpdate))
		.configureSet(
			configureSet(GameSystemSets.Physics)
				.inSet(CoreSet.Update)
				.after(GameSystemSets.Input)
		)
		.configureSet(
			configureSet(GameSystemSets.AI)
				.inSet(CoreSet.Update)
				.after(GameSystemSets.Physics)
		)
		.configureSet(
			configureSet(GameSystemSets.Animation)
				.inSet(CoreSet.PostUpdate)
				.after(GameSystemSets.AI)
		)
		.configureSet(
			configureSet(GameSystemSets.Rendering)
				.inSet(CoreSet.PostUpdate)
				.after(GameSystemSets.Animation)
		);

	// 添加输入系统
	schedule.addSystems(
		system(handleKeyboardInput, "keyboard_input")
			.inSet(GameSystemSets.Input),
		system(handleMouseInput, "mouse_input")
			.inSet(GameSystemSets.Input)
			.after("keyboard_input"),
		system(handleGamepadInput, "gamepad_input")
			.inSet(GameSystemSets.Input)
			.after("mouse_input")
	);

	// 添加物理系统链
	const physicsChain = chain(
		updateVelocity,
		applyGravity,
		updatePosition,
		checkCollisions,
		resolveCollisions
	)
		.chain() // 让这些系统按顺序执行
		.inSet(GameSystemSets.Physics);

	for (const config of physicsChain.getConfigs()) {
		schedule.addSystem(system(config.system, config.name));
	}

	// 添加 AI 系统
	schedule
		.addSystem(
			system(updateAIState, "ai_state")
				.inSet(GameSystemSets.AI)
				.runIf(shouldRunAI)
		)
		.addSystem(
			system(pathfinding, "pathfinding")
				.inSet(GameSystemSets.AI)
				.after("ai_state")
				.runIf(shouldRunAI)
		)
		.addSystem(
			system(decisionMaking, "decision_making")
				.inSet(GameSystemSets.AI)
				.after("pathfinding")
				.runIf(shouldRunAI)
		);

	// 添加动画系统
	schedule
		.addSystem(
			system(updateAnimationState, "animation_state")
				.inSet(GameSystemSets.Animation)
		)
		.addSystem(
			system(blendAnimations, "blend_animations")
				.inSet(GameSystemSets.Animation)
				.after("animation_state")
		)
		.addSystem(
			system(applyBoneTransforms, "bone_transforms")
				.inSet(GameSystemSets.Animation)
				.after("blend_animations")
		);

	// 添加渲染系统
	schedule.addSystems(
		system(frustumCulling, "frustum_culling")
			.inSet(GameSystemSets.Rendering),
		system(shadowMapGeneration, "shadow_maps")
			.inSet(GameSystemSets.Rendering)
			.after("frustum_culling"),
		system(renderScene, "render_scene")
			.inSet(GameSystemSets.Rendering)
			.after("shadow_maps"),
		system(postProcessing, "post_processing")
			.inSet(GameSystemSets.Rendering)
			.after("render_scene")
	);

	// 添加调试系统（可以忽略所有模糊性）
	schedule.addSystem(
		system(debugOverlay, "debug_overlay")
			.inSet(CoreSet.Last)
			.ambiguousWithAll()
			.runIf(isDebugMode)
	);

	return schedule;
}

// ============= 示例系统函数 =============

function handleKeyboardInput(world: World, dt: number): void {
	print("[Input] Processing keyboard input");
}

function handleMouseInput(world: World, dt: number): void {
	print("[Input] Processing mouse input");
}

function handleGamepadInput(world: World, dt: number): void {
	print("[Input] Processing gamepad input");
}

function updateVelocity(world: World, dt: number): void {
	print("[Physics] Updating velocities");
}

function applyGravity(world: World, dt: number): void {
	print("[Physics] Applying gravity");
}

function updatePosition(world: World, dt: number): void {
	print("[Physics] Updating positions");
}

function checkCollisions(world: World, dt: number): void {
	print("[Physics] Checking collisions");
}

function resolveCollisions(world: World, dt: number): void {
	print("[Physics] Resolving collisions");
}

function updateAIState(world: World, dt: number): void {
	print("[AI] Updating AI states");
}

function pathfinding(world: World, dt: number): void {
	print("[AI] Computing paths");
}

function decisionMaking(world: World, dt: number): void {
	print("[AI] Making decisions");
}

function updateAnimationState(world: World, dt: number): void {
	print("[Animation] Updating animation states");
}

function blendAnimations(world: World, dt: number): void {
	print("[Animation] Blending animations");
}

function applyBoneTransforms(world: World, dt: number): void {
	print("[Animation] Applying bone transforms");
}

function frustumCulling(world: World, dt: number): void {
	print("[Rendering] Frustum culling");
}

function shadowMapGeneration(world: World, dt: number): void {
	print("[Rendering] Generating shadow maps");
}

function renderScene(world: World, dt: number): void {
	print("[Rendering] Rendering scene");
}

function postProcessing(world: World, dt: number): void {
	print("[Rendering] Post-processing");
}

function debugOverlay(world: World, dt: number): void {
	print("[Debug] Drawing overlay");
}

// ============= 运行条件 =============

function shouldRunAI(world: World, resources: ResourceManager): boolean {
	// 示例：只在有 AI 实体时运行
	return true;
}

function isDebugMode(world: World, resources: ResourceManager): boolean {
	// 示例：检查调试模式
	return false;
}

// ============= 使用示例 =============

export function runExample(): void {
	print("=== Enhanced Schedule Example ===");

	const world = new World();
	const resources = new ResourceManager();
	const commands = new CommandBuffer();
	const schedule = createGameSchedule();

	// 运行一帧
	print("\n--- Running frame ---");
	schedule.run(world, 1 / 60, resources, commands);

	// 获取排序后的系统顺序
	print("\n--- System execution order ---");
	const sortedSystems = schedule.getSortedSystems();
	for (let i = 0; i < sortedSystems.size(); i++) {
		const sys = sortedSystems[i];
		print(`${i + 1}. ${sys.name || `system_${i}`}`);
	}
}