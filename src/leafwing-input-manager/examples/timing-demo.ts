import { Timing } from "../core/timing";
import { Instant } from "../core/instant";
import { ActionData } from "../action-state/action-data";

/**
 * 演示 Timing 类的完整功能，包括 tick 和 flip 方法
 * 这个示例展示了如何正确使用时间系统来跟踪动作持续时间
 */
export class TimingDemo {
	private timing: Timing;
	private actionData: ActionData;

	constructor() {
		this.timing = new Timing();
		this.actionData = new ActionData();
	}

	/**
	 * 演示基本的 tick 功能
	 */
	public demonstrateBasicTick(): void {
		print("=== Timing Demo: Basic Tick ===");

		// 创建两个时间点
		const previousInstant = Instant.now();
		task.wait(0.01); // 等待 10ms
		const currentInstant = Instant.now();

		print(`Previous instant: ${previousInstant.elapsedSeconds()}`);
		print(`Current instant: ${currentInstant.elapsedSeconds()}`);

		// 在 timing 未开始时调用 tick
		this.timing.tick(currentInstant, previousInstant);

		print(`After first tick:`);
		print(`  - Current duration: ${this.timing.getCurrentDuration()}`);
		print(`  - Previous duration: ${this.timing.getPreviousDuration()}`);
		print(`  - Is active: ${this.timing.isActive()}`);
		print(`  - Start instant: ${this.timing.getStartInstant()?.elapsedSeconds() || "undefined"}`);
	}

	/**
	 * 演示 flip 状态转换功能
	 */
	public demonstrateFlip(): void {
		print("\n=== Timing Demo: Flip Transition ===");

		// 开始计时
		const startInstant = Instant.now();
		this.timing.start(startInstant);

		// 等待一段时间
		task.wait(0.02);

		// 计算持续时间
		const currentInstant = Instant.now();
		this.timing.tick(currentInstant, startInstant);

		const durationBeforeFlip = this.timing.getCurrentDuration();
		print(`Before flip:`);
		print(`  - Current duration: ${durationBeforeFlip}`);
		print(`  - Previous duration: ${this.timing.getPreviousDuration()}`);

		// 执行状态转换
		this.timing.flip();

		print(`After flip:`);
		print(`  - Current duration: ${this.timing.getCurrentDuration()}`);
		print(`  - Previous duration: ${this.timing.getPreviousDuration()}`);
		print(`  - Is active: ${this.timing.isActive()}`);
	}

	/**
	 * 演示 ActionData 中的 timing 集成
	 */
	public demonstrateActionDataIntegration(): void {
		print("\n=== Timing Demo: ActionData Integration ===");

		// 模拟按键按下
		print("Simulating key press...");
		this.actionData.update(true, 1.0);

		task.wait(0.015); // 等待 15ms

		// 更新时间
		const previousInstant = Instant.now();
		task.wait(0.005); // 再等待 5ms
		const currentInstant = Instant.now();

		this.actionData.tick(currentInstant, previousInstant);

		print(`While pressed:`);
		print(`  - Current duration: ${this.actionData.getCurrentDuration()}`);
		print(`  - Previous duration: ${this.actionData.getPreviousDuration()}`);
		print(`  - Pressed: ${this.actionData.pressed}`);

		// 模拟按键松开
		print("Simulating key release...");
		const durationBeforeRelease = this.actionData.getCurrentDuration();
		this.actionData.update(false, 0.0);

		print(`After release:`);
		print(`  - Current duration: ${this.actionData.getCurrentDuration()}`);
		print(`  - Previous duration: ${this.actionData.getPreviousDuration()}`);
		print(`  - Duration before release was: ${durationBeforeRelease}`);
		print(`  - Pressed: ${this.actionData.pressed}`);
	}

	/**
	 * 演示完整的时间跟踪周期
	 */
	public demonstrateFullCycle(): void {
		print("\n=== Timing Demo: Full Cycle ===");

		const freshActionData = new ActionData();
		const startTime = Instant.now();

		// 第一帧：按键按下
		print("Frame 1: Key pressed");
		freshActionData.update(true, 1.0);

		task.wait(0.01);
		let currentTime = Instant.now();
		freshActionData.tick(currentTime, startTime);

		print(`  Duration: ${freshActionData.getCurrentDuration()}`);
		print(`  Previous: ${freshActionData.getPreviousDuration()}`);

		// 第二帧：继续按住
		print("Frame 2: Key held");
		task.wait(0.01);
		const previousTime = currentTime;
		currentTime = Instant.now();
		freshActionData.tick(currentTime, previousTime);

		print(`  Duration: ${freshActionData.getCurrentDuration()}`);
		print(`  Previous: ${freshActionData.getPreviousDuration()}`);

		// 第三帧：松开按键
		print("Frame 3: Key released");
		const durationBeforeRelease = freshActionData.getCurrentDuration();
		freshActionData.update(false, 0.0);

		print(`  Duration: ${freshActionData.getCurrentDuration()}`);
		print(`  Previous: ${freshActionData.getPreviousDuration()}`);
		print(`  Last held duration was: ${durationBeforeRelease}`);
	}

	/**
	 * 运行所有演示
	 */
	public runAllDemos(): void {
		this.demonstrateBasicTick();
		this.demonstrateFlip();
		this.demonstrateActionDataIntegration();
		this.demonstrateFullCycle();
		print("\n=== Timing Demo Complete ===");
	}
}

// 创建并运行演示实例
const demo = new TimingDemo();
demo.runAllDemos();