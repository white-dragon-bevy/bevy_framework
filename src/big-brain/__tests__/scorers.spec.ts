/**
 * Scorers 系统单元测试
 * 测试 Scorer 评分逻辑和 ScorerBuilder 机制
 */

import { World } from "@rbxts/matter";

/**
 * Score 组件
 * 存储 0.0 到 1.0 范围内的评分值
 */
class Score {
	private value: number = 0;

	/**
	 * 获取当前评分值
	 * @returns 评分值 (0.0 到 1.0)
	 */
	getValue(): number {
		return this.value;
	}

	/**
	 * 设置评分值
	 * @param newValue - 新的评分值 (必须在 0.0 到 1.0 范围内)
	 * @throws 如果值不在有效范围内
	 */
	setValue(newValue: number): void {
		if (newValue < 0 || newValue > 1) {
			throw "Score value must be between 0.0 and 1.0";
		}
		this.value = newValue;
	}

	/**
	 * 设置评分值（不检查范围）
	 * 警告：应避免使用，除非确实需要超出范围的值
	 * @param newValue - 新的评分值
	 */
	setValueUnchecked(newValue: number): void {
		this.value = newValue;
	}
}

/**
 * ScorerBuilder 接口
 * 对应 Bevy big-brain 的 ScorerBuilder trait
 */
interface ScorerBuilder {
	/**
	 * 构建 Scorer 组件
	 * @param world - Matter World 实例
	 * @param scorerEntity - Scorer 实体 ID
	 * @param actorEntity - Actor 实体 ID
	 */
	build(world: World, scorerEntity: number, actorEntity: number): void;

	/**
	 * 获取 Scorer 标签
	 * @returns Scorer 标签字符串
	 */
	label(): string | undefined;
}

/**
 * 简单测试 Scorer
 */
class TestScorer implements ScorerBuilder {
	constructor(public readonly scorerLabel?: string) {}

	build(world: World, scorerEntity: number, actorEntity: number): void {
		// 实现待完成
		throw "Not implemented yet";
	}

	label(): string | undefined {
		return this.scorerLabel;
	}
}

/**
 * 泛型测试 Scorer
 */
class GenericTestScorer<T> implements ScorerBuilder {
	constructor(
		public readonly value: T,
		public readonly scorerLabel?: string,
	) {}

	build(world: World, scorerEntity: number, actorEntity: number): void {
		// 实现待完成
		throw "Not implemented yet";
	}

	label(): string | undefined {
		return this.scorerLabel;
	}
}

/**
 * FixedScore Scorer - 始终返回固定分数
 */
class FixedScorer implements ScorerBuilder {
	constructor(
		public readonly fixedValue: number,
		public readonly scorerLabel?: string,
	) {
		if (fixedValue < 0 || fixedValue > 1) {
			throw "Fixed score must be between 0.0 and 1.0";
		}
	}

	build(world: World, scorerEntity: number, actorEntity: number): void {
		// 实现待完成
		throw "Not implemented yet";
	}

	label(): string | undefined {
		return this.scorerLabel || "FixedScore";
	}
}

export = () => {
	describe("ScorerBuilder 基础功能", () => {
		it("应该正确返回 Scorer 标签", () => {
			const scorer = new TestScorer("MyLabel");
			expect(scorer.label()).to.equal("MyLabel");
		});

		it("应该支持无标签的 Scorer", () => {
			const scorer = new TestScorer();
			expect(scorer.label()).to.equal(undefined);
		});

		it("应该支持泛型 Scorer 并返回正确标签", () => {
			const scorer = new GenericTestScorer(42, "MyGenericLabel");
			expect(scorer.label()).to.equal("MyGenericLabel");
			expect(scorer.value).to.equal(42);
		});

		it("应该支持不同类型的泛型参数", () => {
			const stringScorer = new GenericTestScorer("test", "StringScorer");
			const numberScorer = new GenericTestScorer(123, "NumberScorer");

			expect(stringScorer.value).to.equal("test");
			expect(numberScorer.value).to.equal(123);
		});
	});

	describe("Score 值管理", () => {
		it("应该初始化为 0", () => {
			const score = new Score();
			expect(score.getValue()).to.equal(0);
		});

		it("应该接受有效范围内的值 (0.0 到 1.0)", () => {
			const score = new Score();

			score.setValue(0);
			expect(score.getValue()).to.equal(0);

			score.setValue(0.5);
			expect(score.getValue()).to.equal(0.5);

			score.setValue(1);
			expect(score.getValue()).to.equal(1);
		});

		it("应该拒绝小于 0 的值", () => {
			const score = new Score();

			expect(() => {
				score.setValue(-0.1);
			}).to.throw();

			expect(() => {
				score.setValue(-1);
			}).to.throw();
		});

		it("应该拒绝大于 1 的值", () => {
			const score = new Score();

			expect(() => {
				score.setValue(1.1);
			}).to.throw();

			expect(() => {
				score.setValue(2);
			}).to.throw();
		});

		it("应该支持不检查范围的设置 (setValueUnchecked)", () => {
			const score = new Score();

			score.setValueUnchecked(-1);
			expect(score.getValue()).to.equal(-1);

			score.setValueUnchecked(2);
			expect(score.getValue()).to.equal(2);
		});
	});

	describe("FixedScore Scorer", () => {
		it("应该在构造时验证固定值范围", () => {
			expect(() => {
				new FixedScorer(0.5);
			}).never.to.throw();

			expect(() => {
				new FixedScorer(-0.1);
			}).to.throw();

			expect(() => {
				new FixedScorer(1.5);
			}).to.throw();
		});

		it("应该存储正确的固定值", () => {
			const scorer1 = new FixedScorer(0);
			const scorer2 = new FixedScorer(0.5);
			const scorer3 = new FixedScorer(1);

			expect(scorer1.fixedValue).to.equal(0);
			expect(scorer2.fixedValue).to.equal(0.5);
			expect(scorer3.fixedValue).to.equal(1);
		});

		it("应该提供默认标签", () => {
			const scorer = new FixedScorer(0.5);
			expect(scorer.label()).to.equal("FixedScore");
		});

		it("应该支持自定义标签", () => {
			const scorer = new FixedScorer(0.5, "CustomFixed");
			expect(scorer.label()).to.equal("CustomFixed");
		});
	});

	describe("Scorer 构建和初始化", () => {
		it("应该在构建时抛出未实现错误 (因为实现未完成)", () => {
			const scorer = new TestScorer("TestLabel");
			const world = new World();
			const scorerEntity = 1;
			const actorEntity = 2;

			expect(() => {
				scorer.build(world, scorerEntity, actorEntity);
			}).to.throw();
		});

		it("FixedScorer 应该在构建时抛出未实现错误", () => {
			const scorer = new FixedScorer(0.8, "FixedTest");
			const world = new World();

			expect(() => {
				scorer.build(world, 1, 2);
			}).to.throw();
		});
	});

	describe("ScorerBuilder 模式验证", () => {
		it("应该允许创建多个相同类型的 Scorer 实例", () => {
			const scorer1 = new TestScorer("Label1");
			const scorer2 = new TestScorer("Label2");
			const scorer3 = new TestScorer("Label1");

			expect(scorer1.label()).to.equal("Label1");
			expect(scorer2.label()).to.equal("Label2");
			expect(scorer3.label()).to.equal("Label1");
			expect(scorer1).never.to.equal(scorer2);
		});

		it("应该支持 Scorer 克隆语义", () => {
			const original = new GenericTestScorer(100, "Original");
			const cloned = new GenericTestScorer(original.value, original.label());

			expect(cloned.value).to.equal(original.value);
			expect(cloned.label()).to.equal(original.label());
		});

		it("应该支持创建多个不同固定值的 FixedScorer", () => {
			const lowScorer = new FixedScorer(0.2);
			const midScorer = new FixedScorer(0.5);
			const highScorer = new FixedScorer(0.9);

			expect(lowScorer.fixedValue).to.equal(0.2);
			expect(midScorer.fixedValue).to.equal(0.5);
			expect(highScorer.fixedValue).to.equal(0.9);
		});
	});

	describe("复合 Scorer 概念验证", () => {
		it("应该能够组合多个 Score 值 (求和)", () => {
			const score1 = new Score();
			const score2 = new Score();
			const score3 = new Score();

			score1.setValue(0.3);
			score2.setValue(0.4);
			score3.setValue(0.2);

			const totalScore = score1.getValue() + score2.getValue() + score3.getValue();
			expect(totalScore).to.equal(0.9);
		});

		it("应该能够组合多个 Score 值 (求积)", () => {
			const score1 = new Score();
			const score2 = new Score();

			score1.setValue(0.5);
			score2.setValue(0.8);

			const productScore = score1.getValue() * score2.getValue();
			expect(productScore).to.equal(0.4);
		});

		it("应该能够找到最高分数", () => {
			const scores = [new Score(), new Score(), new Score()];

			scores[0].setValue(0.3);
			scores[1].setValue(0.7);
			scores[2].setValue(0.5);

			const maxScore = math.max(...scores.map((score) => score.getValue()));
			expect(maxScore).to.equal(0.7);
		});

		it("应该支持阈值过滤", () => {
			const score = new Score();
			const threshold = 0.5;

			score.setValue(0.3);
			expect(score.getValue() >= threshold).to.equal(false);

			score.setValue(0.7);
			expect(score.getValue() >= threshold).to.equal(true);
		});
	});
};
