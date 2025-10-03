/**
 * Big Brain 示例: 顺序动作 (Steps)
 *
 * 这个示例展示了如何使用 Steps 复合动作来执行多步骤序列：
 * - Steps: 顺序执行多个动作
 * - 动作链：移动 → 喝水
 * - 前置条件：只有在靠近水源时才能喝水
 *
 * 场景说明：
 * 一个实体会口渴，但不能直接喝水。
 * 它必须先移动到水源附近，然后才能喝水。
 */

import { World, component } from "@rbxts/matter";
import type { AnyEntity } from "@rbxts/matter";
import { App, BuiltinSchedules, getContextWithExtensions } from "../../bevy_app";
import type { AppContext } from "../../bevy_app/context";
import { TimePlugin } from "../../bevy_time";
import {
	BigBrainPlugin,
	ThinkerBuilder,
	FirstToScore,
	ActionState,
	ActionStateComponent,
	Actor,
	StepsBuilder,
	setScore,
} from "../../big-brain";
import type { ScorerBuilder, ActionBuilder } from "../../big-brain";
import { ThinkerBuilderComponent } from "../../big-brain/thinker";
import { usePrintDebounce } from "../../utils/hooks/hook-debug-print";

// ============================================================================
// 1. 基础组件定义
// ============================================================================

/**
 * 位置组件 - 2D 位置
 */
const Position = component<{
	x: number;
	y: number;
}>("Position");
type Position = ReturnType<typeof Position>;

/**
 * 水源标记组件
 */
const WaterSource = component("WaterSource");
type WaterSource = ReturnType<typeof WaterSource>;

/**
 * 口渴组件
 */
const Thirst = component<{
	value: number;
	perSecond: number;
}>("Thirst");
type Thirst = ReturnType<typeof Thirst>;

/**
 * 口渴系统
 */
function thirstSystem(world: World, context: AppContext, app: App): void {
	const timeContext = getContextWithExtensions<TimePlugin>(app);
	const deltaTime = timeContext.getDeltaSeconds();

	for (const [entityId, thirst] of world.query(Thirst)) {
		const newValue = math.min(thirst.value + thirst.perSecond * deltaTime, 100.0);
		world.insert(entityId, Thirst({ value: newValue, perSecond: thirst.perSecond }));

		usePrintDebounce(`Thirst: ${string.format("%.2f", newValue)}`);
	}
}

// ============================================================================
// 2. Scorer 定义 - 口渴评分器
// ============================================================================

const ThirstyScorer = component("ThirstyScorer");
type ThirstyScorer = ReturnType<typeof ThirstyScorer>;

class ThirstyScorerBuilder implements ScorerBuilder {
	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		world.insert(scorerEntityId, ThirstyScorer());
	}

	label(): string {
		return "ThirstyScorer";
	}
}

function thirstyScorerSystem(world: World, context: AppContext): void {
	for (const [scorerEntityId, thirstyScorer, actor] of world.query(ThirstyScorer, Actor)) {
		const thirst = world.get(actor.entityId, Thirst);
		if (thirst !== undefined) {
			setScore(world, scorerEntityId, thirst.value / 100.0);
		}
	}
}

// ============================================================================
// 3. Action 1: 移动到水源
// ============================================================================

/**
 * 移动到水源动作组件
 */
const MoveToWaterSourceAction = component<{
	speed: number;
}>("MoveToWaterSourceAction");
type MoveToWaterSourceAction = ReturnType<typeof MoveToWaterSourceAction>;

/**
 * 移动到水源动作 Builder
 */
class MoveToWaterSourceBuilder implements ActionBuilder {
	constructor(private readonly speed: number) {}

	build(world: World, actionEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		world.insert(actionEntityId, MoveToWaterSourceAction({ speed: this.speed }));
	}

	label(): string {
		return "MoveToWaterSource";
	}
}

/** 最大距离：小于此距离认为已到达水源 */
const MAX_DISTANCE = 0.1;

/**
 * 查找最近的水源
 */
function findClosestWaterSource(world: World, actorPosition: Position): Position | undefined {
	let closestPosition: Position | undefined = undefined;
	let minDistanceSquared = math.huge;

	for (const [_, waterPos] of world.query(Position, WaterSource)) {
		const dx = waterPos.x - actorPosition.x;
		const dy = waterPos.y - actorPosition.y;
		const distanceSquared = dx * dx + dy * dy;

		if (distanceSquared < minDistanceSquared) {
			minDistanceSquared = distanceSquared;
			closestPosition = waterPos;
		}
	}

	return closestPosition;
}

/**
 * 移动到水源系统
 */
function moveToWaterSourceSystem(world: World, context: AppContext, app: App): void {
	const timeContext = getContextWithExtensions<TimePlugin>(app);
	const deltaTime = timeContext.getDeltaSeconds();

	for (const [actionEntityId, moveAction, actionState, actor] of world.query(
		MoveToWaterSourceAction,
		ActionStateComponent,
		Actor,
	)) {
		const actorPosition = world.get(actor.entityId, Position);
		if (actorPosition === undefined) {
			continue;
		}

		const currentState = actionState.state;

		if (currentState === ActionState.Requested) {
			usePrintDebounce("Let's go find some water!");
			world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Executing }));
		} else if (currentState === ActionState.Executing) {
			usePrintDebounce(`Actor position: (${string.format("%.2f", actorPosition.x)}, ${string.format("%.2f", actorPosition.y)})`);

			// 查找最近的水源
			const closestWater = findClosestWaterSource(world, actorPosition);
			if (closestWater === undefined) {
				usePrintDebounce("No water source found!");
				world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Failure }));
				continue;
			}

			// 计算距离
			const dx = closestWater.x - actorPosition.x;
			const dy = closestWater.y - actorPosition.y;
			const distance = math.sqrt(dx * dx + dy * dy);

			usePrintDebounce(`Distance to water: ${string.format("%.2f", distance)}`);

			if (distance > MAX_DISTANCE) {
				// 还没到达，继续移动
				usePrintDebounce("Stepping closer...");

				const stepSize = deltaTime * moveAction.speed;
				const actualStep = math.min(stepSize, distance);

				// 计算单位方向向量
				const dirX = dx / distance;
				const dirY = dy / distance;

				// 移动
				world.insert(
					actor.entityId,
					Position({
						x: actorPosition.x + dirX * actualStep,
						y: actorPosition.y + dirY * actualStep,
					}),
				);
			} else {
				// 到达水源
				usePrintDebounce("We got there!");
				world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Success }));
			}
		} else if (currentState === ActionState.Cancelled) {
			world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Failure }));
		}
	}
}

// ============================================================================
// 4. Action 2: 喝水
// ============================================================================

/**
 * 喝水动作组件
 */
const DrinkAction = component<{
	perSecond: number;
}>("DrinkAction");
type DrinkAction = ReturnType<typeof DrinkAction>;

/**
 * 喝水动作 Builder
 */
class DrinkActionBuilder implements ActionBuilder {
	constructor(private readonly perSecond: number) {}

	build(world: World, actionEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		world.insert(actionEntityId, DrinkAction({ perSecond: this.perSecond }));
	}

	label(): string {
		return "Drink";
	}
}

/**
 * 喝水动作系统
 */
function drinkActionSystem(world: World, context: AppContext, app: App): void {
	const timeContext = getContextWithExtensions<TimePlugin>(app);
	const deltaTime = timeContext.getDeltaSeconds();

	for (const [actionEntityId, drinkAction, actionState, actor] of world.query(
		DrinkAction,
		ActionStateComponent,
		Actor,
	)) {
		const actorPosition = world.get(actor.entityId, Position);
		const thirst = world.get(actor.entityId, Thirst);

		if (actorPosition === undefined || thirst === undefined) {
			continue;
		}

		const currentState = actionState.state;

		if (currentState === ActionState.Requested) {
			usePrintDebounce("Drinking the water.");
			world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Executing }));
		} else if (currentState === ActionState.Executing) {
			// 查找最近的水源
			const closestWater = findClosestWaterSource(world, actorPosition);
			if (closestWater === undefined) {
				usePrintDebounce("No water source!");
				world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Failure }));
				continue;
			}

			const dx = closestWater.x - actorPosition.x;
			const dy = closestWater.y - actorPosition.y;
			const distance = math.sqrt(dx * dx + dy * dy);

			if (distance < MAX_DISTANCE) {
				// 在水源附近，可以喝水
				usePrintDebounce("Drinking!");

				const newValue = math.max(thirst.value - drinkAction.perSecond * deltaTime, 0.0);
				world.insert(actor.entityId, Thirst({ value: newValue, perSecond: thirst.perSecond }));

				if (newValue <= 0.0) {
					usePrintDebounce("Done drinking!");
					world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Success }));
				}
			} else {
				// 离水源太远，无法喝水
				usePrintDebounce("We're too far away!");
				world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Failure }));
			}
		} else if (currentState === ActionState.Cancelled) {
			world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Failure }));
		}
	}
}

// ============================================================================
// 5. 初始化系统
// ============================================================================

/**
 * 初始化系统：创建水源和口渴的实体
 */
function initEntitiesSystem(world: World, context: AppContext): void {
	// 创建两个水源
	world.spawn(WaterSource(), Position({ x: 10.0, y: 10.0 }));
	world.spawn(WaterSource(), Position({ x: -10.0, y: 0.0 }));

	// 使用 Steps 构建复合动作：移动 → 喝水
	const moveAndDrink = new StepsBuilder()
		.withLabel("MoveAndDrink")
		.step(new MoveToWaterSourceBuilder(1.0)) // 第一步：移动到水源
		.step(new DrinkActionBuilder(10.0)); // 第二步：喝水

	// 创建口渴的实体
	world.spawn(
		Thirst({ value: 75.0, perSecond: 2.0 }),
		Position({ x: 0.0, y: 0.0 }),
		ThinkerBuilderComponent({
			builder: new ThinkerBuilder()
				.withLabel("ThirstyThinker")
				.picker(new FirstToScore(0.8))
				.when(new ThirstyScorerBuilder(), moveAndDrink),
		}),
	);

	print("Created water sources and thirsty entity");
}

// ============================================================================
// 6. 主函数
// ============================================================================

function main(): App {
	const app = App.create();

	app.addPlugin(new TimePlugin());
	app.addPlugin(new BigBrainPlugin());

	app.addSystems(BuiltinSchedules.STARTUP, initEntitiesSystem);
	app.addSystems(BuiltinSchedules.UPDATE, (world: World, context: AppContext) => {
		thirstSystem(world, context, app);
	});
	app.addSystems(BuiltinSchedules.PRE_UPDATE, [
		thirstyScorerSystem,
		(world: World, context: AppContext) => {
			moveToWaterSourceSystem(world, context, app);
		},
		(world: World, context: AppContext) => {
			drinkActionSystem(world, context, app);
		},
	]);

	print("=== Big Brain Sequence Example ===");
	print("Watch as the AI moves to water and then drinks!");

	return app;
}

export = main;
