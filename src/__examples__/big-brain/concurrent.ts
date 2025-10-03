/**
 * Big Brain 示例: 并发动作 (Concurrently)
 *
 * 这个示例展示了如何使用 Concurrently 复合动作来并发执行多个动作：
 * - ConcurrentMode.Race: 任意一个动作成功即成功
 * - ConcurrentMode.Join: 所有动作都成功才成功
 * - 动作组合：先 Race，后 Join
 *
 * 场景说明：
 * AI 需要猜测一个神秘数字。
 * 使用 Race 模式：多个猜测者竞速，任意一个猜对就成功。
 * 使用 Join 模式：多个猜测者同时猜，全部猜对才成功。
 */

import { World, component } from "@rbxts/matter";
import type { AnyEntity } from "@rbxts/matter";
import { App, BuiltinSchedules } from "../../bevy_app";
import type { AppContext } from "../../bevy_app/context";
import {
	BigBrainPlugin,
	ThinkerBuilder,
	Highest,
	ActionState,
	ActionStateComponent,
	Actor,
	StepsBuilder,
	ConcurrentlyBuilder,
	ConcurrentMode,
} from "../../big-brain";
import type { ScorerBuilder, ActionBuilder } from "../../big-brain";
import { setScore } from "../../big-brain";
import { ThinkerBuilderComponent } from "../../big-brain/thinker";
import { usePrintDebounce } from "../../utils/hooks/hook-debug-print";

// ============================================================================
// 1. Action 定义: 猜数字
// ============================================================================

/**
 * 猜数字动作组件
 */
const GuessNumberAction = component<{
	/** 要猜的目标数字 (0-10) */
	toGuess: number;
	/** 随机种子（模拟随机猜测） */
	seed: number;
	/** 当前猜测次数 */
	attempts: number;
}>("GuessNumberAction");
type GuessNumberAction = ReturnType<typeof GuessNumberAction>;

/**
 * 猜数字动作 Builder
 */
class GuessNumberBuilder implements ActionBuilder {
	constructor(
		private readonly toGuess: number,
		private readonly seed: number,
	) {}

	build(world: World, actionEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		world.insert(actionEntityId, GuessNumberAction({ toGuess: this.toGuess, seed: this.seed, attempts: 0 }));
	}

	label(): string {
		return `GuessNumber(${this.toGuess})`;
	}
}

/**
 * 简单的伪随机数生成器（基于 LCG 算法）
 */
function pseudoRandom(seed: number, min: number, max: number): number {
	const a = 1103515245;
	const c = 12345;
	const m = 2 ** 31;
	const nextValue = (a * seed + c) % m;
	const normalized = nextValue / m;
	return math.floor(min + normalized * (max - min + 1));
}

/**
 * 猜数字系统
 */
function guessNumberSystem(world: World, context: AppContext): void {
	for (const [actionEntityId, guessAction, actionState] of world.query(GuessNumberAction, ActionStateComponent)) {
		const currentState = actionState.state;

		if (currentState === ActionState.Requested) {
			usePrintDebounce(`Let's try to guess the secret number: ${guessAction.toGuess}`);
			world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Executing }));
		} else if (currentState === ActionState.Executing) {
			// 使用种子+尝试次数生成猜测
			const guess = pseudoRandom(guessAction.seed + guessAction.attempts, 0, 10);
			usePrintDebounce(`Guessed: ${guess}`);

			// 增加尝试次数
			const newAttempts = guessAction.attempts + 1;
			world.insert(
				actionEntityId,
				GuessNumberAction({
					toGuess: guessAction.toGuess,
					seed: guessAction.seed,
					attempts: newAttempts,
				}),
			);

			if (guess === guessAction.toGuess) {
				usePrintDebounce(`Guessed the secret number: ${guessAction.toGuess}! Action succeeded.`);
				world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Success }));
			}
		} else if (currentState === ActionState.Cancelled) {
			world.insert(actionEntityId, ActionStateComponent({ state: ActionState.Failure }));
		}
	}
}

// ============================================================================
// 2. Scorer 定义: 虚拟评分器 (总是返回 1.0)
// ============================================================================

const DummyScorer = component("DummyScorer");
type DummyScorer = ReturnType<typeof DummyScorer>;

class DummyScorerBuilder implements ScorerBuilder {
	build(world: World, scorerEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		world.insert(scorerEntityId, DummyScorer());
	}

	label(): string {
		return "DummyScorer";
	}
}

function dummyScorerSystem(world: World, context: AppContext): void {
	for (const [scorerEntityId] of world.query(DummyScorer)) {
		setScore(world, scorerEntityId, 1.0);
	}
}

// ============================================================================
// 3. 初始化系统
// ============================================================================

/**
 * 初始化系统：创建猜数字的 AI
 */
function initEntitiesSystem(world: World, context: AppContext): void {
	const numberToGuess = 5;

	// 场景 1: Race 模式 - 任意一个猜对就成功
	// 两个猜测者同时猜数字，只要有一个猜对就算成功
	const raceGuessNumbers = new ConcurrentlyBuilder()
		.mode(ConcurrentMode.Race)
		.withLabel("RaceToGuessNumbers")
		.push(new GuessNumberBuilder(numberToGuess, 12345)) // 猜测者 1
		.push(new GuessNumberBuilder(numberToGuess, 67890)); // 猜测者 2

	// 场景 2: Join 模式 - 所有猜测者都要成功
	// 两个猜测者同时猜数字，必须全部猜对才算成功
	const joinGuessNumbers = new ConcurrentlyBuilder()
		.mode(ConcurrentMode.Join) // 这是默认模式，可以省略
		.withLabel("JoinToGuessNumbers")
		.push(new GuessNumberBuilder(numberToGuess, 11111)) // 猜测者 3
		.push(new GuessNumberBuilder(numberToGuess, 22222)); // 猜测者 4

	// 使用 Steps 组合：先执行 Race，成功后执行 Join
	const guessSequence = new StepsBuilder()
		.withLabel("RaceAndThenJoin")
		.step(raceGuessNumbers) // 第一步：Race 模式猜数字
		.step(joinGuessNumbers); // 第二步：Join 模式猜数字

	// 创建 Thinker
	world.spawn(
		ThinkerBuilderComponent({
			builder: new ThinkerBuilder()
				.withLabel("GuesserThinker")
				.picker(new Highest()) // 使用 Highest 选择器：选择分数最高的动作
				.when(new DummyScorerBuilder(), guessSequence),
		}),
	);

	print("Created number guessing AI");
}

// ============================================================================
// 4. 主函数
// ============================================================================

function main(): App {
	const app = App.create();

	app.addPlugin(new BigBrainPlugin());

	app.addSystems(BuiltinSchedules.STARTUP, initEntitiesSystem);
	app.addSystems(BuiltinSchedules.PRE_UPDATE, [dummyScorerSystem, guessNumberSystem]);

	print("=== Big Brain Concurrent Example ===");
	print("Watch as multiple AI agents try to guess numbers concurrently!");
	print("First with Race mode (any wins), then Join mode (all must win).");

	return app;
}

export = main;
