/**
 * Thinker 系统单元测试
 * 测试 Thinker 决策逻辑和 Picker 选择机制
 */

import { World } from "@rbxts/matter";

/**
 * Score 组件
 */
interface Score {
	getValue(): number;
	setValue(value: number): void;
}

/**
 * Picker 接口
 * 用于从多个选项中选择最佳 Action
 */
interface Picker {
	/**
	 * 从给定的选项中选择一个
	 * @param choices - 可用的选项列表
	 * @param scores - 分数查询接口
	 * @returns 选中的选项索引，如果没有选中则返回 undefined
	 */
	pick(choices: Array<Choice>, scores: Map<number, Score>): Choice | undefined;
}

/**
 * Choice 表示一个 Scorer-Action 对
 */
interface Choice {
	scorerEntity: number;
	actionBuilderLabel: string;
}

/**
 * FirstToScore Picker
 * 选择第一个达到阈值的选项
 */
class FirstToScore implements Picker {
	constructor(public readonly threshold: number) {
		if (threshold < 0 || threshold > 1) {
			throw "Threshold must be between 0.0 and 1.0";
		}
	}

	pick(choices: Array<Choice>, scores: Map<number, Score>): Choice | undefined {
		for (const choice of choices) {
			const score = scores.get(choice.scorerEntity);

			if (score !== undefined && score.getValue() >= this.threshold) {
				return choice;
			}
		}

		return undefined;
	}
}

/**
 * Highest Picker
 * 选择得分最高的选项
 */
class Highest implements Picker {
	pick(choices: Array<Choice>, scores: Map<number, Score>): Choice | undefined {
		if (choices.size() === 0) {
			return undefined;
		}

		let bestChoice: Choice | undefined = undefined;
		let bestScore = -1;

		for (const choice of choices) {
			const score = scores.get(choice.scorerEntity);

			if (score !== undefined) {
				const currentValue = score.getValue();

				if (currentValue > bestScore) {
					bestScore = currentValue;
					bestChoice = choice;
				}
			}
		}

		return bestChoice;
	}
}

/**
 * HighestToScore Picker
 * 选择得分最高且达到阈值的选项
 */
class HighestToScore implements Picker {
	constructor(public readonly threshold: number) {
		if (threshold < 0 || threshold > 1) {
			throw "Threshold must be between 0.0 and 1.0";
		}
	}

	pick(choices: Array<Choice>, scores: Map<number, Score>): Choice | undefined {
		if (choices.size() === 0) {
			return undefined;
		}

		let bestChoice: Choice | undefined = undefined;
		let bestScore = -1;

		for (const choice of choices) {
			const score = scores.get(choice.scorerEntity);

			if (score !== undefined) {
				const currentValue = score.getValue();

				if (currentValue >= this.threshold && currentValue > bestScore) {
					bestScore = currentValue;
					bestChoice = choice;
				}
			}
		}

		return bestChoice;
	}
}

/**
 * 简单的 Score 实现用于测试
 */
class SimpleScore implements Score {
	constructor(private value: number = 0) {}

	getValue(): number {
		return this.value;
	}

	setValue(newValue: number): void {
		this.value = newValue;
	}
}

export = () => {
	describe("FirstToScore Picker", () => {
		it("应该验证阈值范围", () => {
			expect(() => {
				new FirstToScore(0.5);
			}).never.to.throw();

			expect(() => {
				new FirstToScore(-0.1);
			}).to.throw();

			expect(() => {
				new FirstToScore(1.5);
			}).to.throw();
		});

		it("应该选择第一个达到阈值的选项", () => {
			const picker = new FirstToScore(0.5);

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
				{ scorerEntity: 3, actionBuilderLabel: "Action3" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.3));
			scores.set(2, new SimpleScore(0.7));
			scores.set(3, new SimpleScore(0.9));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(2);
		});

		it("应该在没有达到阈值时返回 undefined", () => {
			const picker = new FirstToScore(0.8);

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.3));
			scores.set(2, new SimpleScore(0.5));

			const selected = picker.pick(choices, scores);
			expect(selected).to.equal(undefined);
		});

		it("应该在空选项列表时返回 undefined", () => {
			const picker = new FirstToScore(0.5);

			const choices: Array<Choice> = [];
			const scores = new Map<number, Score>();

			const selected = picker.pick(choices, scores);
			expect(selected).to.equal(undefined);
		});

		it("应该接受恰好等于阈值的分数", () => {
			const picker = new FirstToScore(0.5);

			const choices: Array<Choice> = [{ scorerEntity: 1, actionBuilderLabel: "Action1" }];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.5));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(1);
		});
	});

	describe("Highest Picker", () => {
		it("应该选择得分最高的选项", () => {
			const picker = new Highest();

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
				{ scorerEntity: 3, actionBuilderLabel: "Action3" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.3));
			scores.set(2, new SimpleScore(0.9));
			scores.set(3, new SimpleScore(0.5));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(2);
		});

		it("应该在空选项列表时返回 undefined", () => {
			const picker = new Highest();

			const choices: Array<Choice> = [];
			const scores = new Map<number, Score>();

			const selected = picker.pick(choices, scores);
			expect(selected).to.equal(undefined);
		});

		it("应该在所有分数相同时返回第一个选项", () => {
			const picker = new Highest();

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
				{ scorerEntity: 3, actionBuilderLabel: "Action3" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.5));
			scores.set(2, new SimpleScore(0.5));
			scores.set(3, new SimpleScore(0.5));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(1);
		});

		it("应该处理负分数", () => {
			const picker = new Highest();

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(-0.5));
			scores.set(2, new SimpleScore(-0.2));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(2);
		});
	});

	describe("HighestToScore Picker", () => {
		it("应该验证阈值范围", () => {
			expect(() => {
				new HighestToScore(0.5);
			}).never.to.throw();

			expect(() => {
				new HighestToScore(-0.1);
			}).to.throw();

			expect(() => {
				new HighestToScore(1.5);
			}).to.throw();
		});

		it("应该选择达到阈值中得分最高的选项", () => {
			const picker = new HighestToScore(0.5);

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
				{ scorerEntity: 3, actionBuilderLabel: "Action3" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.3));
			scores.set(2, new SimpleScore(0.7));
			scores.set(3, new SimpleScore(0.9));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(3);
		});

		it("应该忽略未达到阈值的选项", () => {
			const picker = new HighestToScore(0.6);

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
				{ scorerEntity: 3, actionBuilderLabel: "Action3" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.9));
			scores.set(2, new SimpleScore(0.5));
			scores.set(3, new SimpleScore(0.7));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(1);
		});

		it("应该在没有选项达到阈值时返回 undefined", () => {
			const picker = new HighestToScore(0.8);

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.3));
			scores.set(2, new SimpleScore(0.5));

			const selected = picker.pick(choices, scores);
			expect(selected).to.equal(undefined);
		});

		it("应该接受恰好等于阈值的分数", () => {
			const picker = new HighestToScore(0.5);

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.5));
			scores.set(2, new SimpleScore(0.4));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(1);
		});
	});

	describe("Picker 行为对比", () => {
		it("FirstToScore 和 Highest 应该在某些情况下返回不同结果", () => {
			const firstPicker = new FirstToScore(0.5);
			const highestPicker = new Highest();

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.6));
			scores.set(2, new SimpleScore(0.9));

			const firstResult = firstPicker.pick(choices, scores);
			const highestResult = highestPicker.pick(choices, scores);

			expect(firstResult!.scorerEntity).to.equal(1);
			expect(highestResult!.scorerEntity).to.equal(2);
		});

		it("HighestToScore 应该结合两者的特点", () => {
			const highestToScore = new HighestToScore(0.7);

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
				{ scorerEntity: 3, actionBuilderLabel: "Action3" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.6));
			scores.set(2, new SimpleScore(0.75));
			scores.set(3, new SimpleScore(0.85));

			const selected = highestToScore.pick(choices, scores);

			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(3);
		});
	});

	describe("边界情况测试", () => {
		it("应该处理缺失的 Score 数据", () => {
			const picker = new Highest();

			const choices: Array<Choice> = [
				{ scorerEntity: 1, actionBuilderLabel: "Action1" },
				{ scorerEntity: 2, actionBuilderLabel: "Action2" },
			];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.5));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(1);
		});

		it("应该处理单个选项的情况", () => {
			const picker = new Highest();

			const choices: Array<Choice> = [{ scorerEntity: 1, actionBuilderLabel: "OnlyAction" }];

			const scores = new Map<number, Score>();
			scores.set(1, new SimpleScore(0.5));

			const selected = picker.pick(choices, scores);
			expect(selected).to.be.ok();
			expect(selected!.scorerEntity).to.equal(1);
		});
	});
};
