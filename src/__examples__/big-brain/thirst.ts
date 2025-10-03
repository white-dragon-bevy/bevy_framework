/**
 * Big Brain 示例: 口渴系统
 *
 * 这是最基础的 Big Brain 示例，展示了核心概念：
 * - Thinker: AI 的"大脑"，决策中心
 * - Scorer: 评分器，评估世界状态并生成分数 (0.0-1.0)
 * - Action: 动作，基于分数执行的行为
 * - Picker: 选择器，决定执行哪个动作
 *
 * 场景说明：
 * 一个实体有"口渴"属性，随时间增加。
 * 当口渴值达到阈值时，AI 会执行"喝水"动作。
 */

import { World, component } from "@rbxts/matter";
import type { AnyEntity } from "@rbxts/matter";
import { App, BuiltinSchedules, getContextWithExtensions } from "../../bevy_app";
import type { Context } from "../../bevy_ecs";
import { TimePlugin } from "../../bevy_time";
import {
	BigBrainPlugin,
	ThinkerBuilder,
	FirstToScore,
	ActionState,
	ActionStateComponent,
	Actor,
	setScore,
} from "../../big-brain";
import type { ScorerBuilder, ActionBuilder } from "../../big-brain";
import { ThinkerBuilderComponent } from "../../big-brain/thinker";
import { usePrintDebounce } from "../../utils/hooks/hook-debug-print";

// ============================================================================
// 1. 组件定义 - 这是普通的 ECS 组件，不涉及 AI
// ============================================================================

/**
 * 口渴组件 - 描述实体的口渴状态
 */
const Thirst = component<{
	/** 当前口渴值 (0-100) */
	value: number;
	/** 每秒增加的口渴值 */
	perSecond: number;
}>("Thirst");
type Thirst = ReturnType<typeof Thirst>;

/**
 * 口渴系统 - 让实体随时间变得更渴
 * 这是普通的 Bevy 系统，不涉及 AI 逻辑
 */
function thirstSystem(world: World, context: Context, app: App): void {
	const timeContext = getContextWithExtensions<TimePlugin>(app);
	const deltaTime = timeContext.getDeltaSeconds();

	for (const [entityId, thirst] of world.query(Thirst)) {
		const newValue = math.min(thirst.value + thirst.perSecond * deltaTime, 100.0);
		world.insert(entityId, Thirst({ value: newValue, perSecond: thirst.perSecond }));

		usePrintDebounce(`Thirst: ${string.format("%.2f", newValue)}`);
	}
}

// ============================================================================
// 2. Scorer 定义 - 评估口渴程度
// ============================================================================

/**
 * 口渴评分器组件
 * 用于标识这是一个口渴评分器
 */
const ThirstyScorer = component("ThirstyScorer");
type ThirstyScorer = ReturnType<typeof ThirstyScorer>;

/**
 * 口渴评分器 Builder
 * 实现 ScorerBuilder 接口
 */
class ThirstyScorerBuilder implements ScorerBuilder {
	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		// 添加标识组件
		world.insert(scorerEntityId, ThirstyScorer());
	}

	label(): string {
		return "ThirstyScorer";
	}
}

/**
 * 口渴评分系统
 * 根据实体的口渴值计算分数 (0.0-1.0)
 */
function thirstyScorerSystem(world: World, context: Context): void {
	for (const [scorerEntityId, thirstyScorer, actor] of world.query(ThirstyScorer, Actor)) {
		// 获取 Actor 的口渴组件
		const thirst = world.get(actor.entityId, Thirst);
		if (thirst !== undefined) {
			// 计算分数：口渴值 / 100.0
			// 分数范围：0.0 (不渴) 到 1.0 (非常渴)
			const scoreValue = thirst.value / 100.0;
			setScore(world, scorerEntityId, scoreValue);

			// 当口渴值超过 80 时输出调试信息
			if (thirst.value >= 80.0) {
				usePrintDebounce(`Thirst above threshold! Score: ${string.format("%.2f", scoreValue)}`);
			}
		}
	}
}

// ============================================================================
// 3. Action 定义 - 执行喝水动作
// ============================================================================

/**
 * 喝水动作组件
 */
const DrinkAction = component<{
	/** 喝到什么程度停止 */
	targetValue: number;
	/** 每秒减少的口渴值 */
	perSecond: number;
}>("DrinkAction");
type DrinkAction = ReturnType<typeof DrinkAction>;

/**
 * 喝水动作 Builder
 * 实现 ActionBuilder 接口
 */
class DrinkActionBuilder implements ActionBuilder {
	constructor(
		private readonly targetValue: number,
		private readonly perSecond: number,
	) {}

	build(world: World, actionEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		world.insert(actionEntityId, DrinkAction({ targetValue: this.targetValue, perSecond: this.perSecond }));
	}

	label(): string {
		return "DrinkAction";
	}
}

/**
 * 喝水动作系统
 * 根据 ActionState 状态机执行不同逻辑
 */
function drinkActionSystem(world: World, context: Context, app: App): void {
	const timeContext = getContextWithExtensions<TimePlugin>(app);
	const deltaTime = timeContext.getDeltaSeconds();

	for (const [actionEntityId, drinkAction, actionState, actor] of world.query(
		DrinkAction,
		ActionStateComponent,
		Actor,
	)) {
		// 获取 Actor 的口渴组件
		const thirst = world.get(actor.entityId, Thirst);
		if (thirst === undefined) {
			continue;
		}

		// 状态机处理
		const currentState = actionState.state;

		if (currentState === ActionState.Requested) {
			// 动作刚被请求，开始执行
			usePrintDebounce("Time to drink some water!");
			world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Executing }));
		} else if (currentState === ActionState.Executing) {
			// 正在执行：减少口渴值
			usePrintDebounce("Drinking...");

			const newValue = math.max(thirst.value - drinkAction.perSecond * deltaTime, 0.0);
			world.insert(actor.entityId, Thirst({ value: newValue, perSecond: thirst.perSecond }));

			// 检查是否达到目标
			if (newValue <= drinkAction.targetValue) {
				usePrintDebounce("Done drinking water");
				world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Success }));
			}
		} else if (currentState === ActionState.Cancelled) {
			// 动作被取消，视为失败
			usePrintDebounce("Drink action was cancelled. Considering this a failure.");
			world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Failure }));
		}
	}
}

// ============================================================================
// 4. 初始化系统 - 创建带有 AI 的实体
// ============================================================================

/**
 * 初始化系统：创建一个口渴的实体，并为其添加 Thinker
 */
function initEntitiesSystem(world: World, context: Context): void {
	// 创建实体
	const entityId = world.spawn(
		// 添加口渴组件：初始值 75，每秒增加 2
		Thirst({ value: 75.0, perSecond: 2.0 }),

		// 添加 Thinker：AI 大脑
		ThinkerBuilderComponent({
			builder: new ThinkerBuilder()
				.withLabel("ThirstThinker") // 设置标签（用于调试）
				.picker(new FirstToScore(0.8)) // 使用 FirstToScore 选择器：分数 >= 0.8 时执行
				.when(
					// when: 当口渴评分器达到阈值时
					new ThirstyScorerBuilder(),
					// then: 执行喝水动作
					new DrinkActionBuilder(70.0, 5.0), // 喝到 70，每秒减少 5
				),
		}),
	);

	print(`Created thirsty entity: ${entityId}`);
}

// ============================================================================
// 5. 主函数 - 组装应用
// ============================================================================

/**
 * 主函数：创建并运行应用
 */
function main(): App {
	const app = App.create();

	// 添加 TimePlugin（提供 deltaTime）
	app.addPlugin(new TimePlugin());

	// 添加 BigBrain 插件
	app.addPlugin(new BigBrainPlugin());

	// 添加初始化系统（在 STARTUP 阶段执行一次）
	app.addSystems(BuiltinSchedules.STARTUP, initEntitiesSystem);

	// 添加游戏逻辑系统（在 UPDATE 阶段每帧执行）
	app.addSystems(BuiltinSchedules.UPDATE, (world: World, context: Context) => {
		thirstSystem(world, context, app);
	});

	// 添加 AI 系统（在 PRE_UPDATE 阶段执行）
	// 注意：BigBrainPlugin 会自动在合适的调度阶段注册内部系统
	// 我们只需要添加自定义的 Scorer 和 Action 系统
	app.addSystems(BuiltinSchedules.PRE_UPDATE, [
		thirstyScorerSystem,
		(world: World, context: Context) => {
			drinkActionSystem(world, context, app);
		},
	]);

	// 打印启动信息
	print("=== Big Brain Thirst Example ===");
	print("Watch as the AI decides when to drink water!");

	return app;
}

// 导出主函数
export = main;
