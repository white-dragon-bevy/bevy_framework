import { Duration } from "../../bevy_time";

import { CannotUseAbility } from "../errors";
import { Life, LifePool } from "../premade-pools/life-pool";
import { Mana, ManaPool } from "../premade-pools/mana-pool";

export = () => {
	describe("Life", () => {
		it("should perform arithmetic operations correctly", () => {
			const life1 = new Life(100);
			const life2 = new Life(50);

			const sum = life1.add(life2);
			expect(sum.value).to.equal(150);

			const difference = life1.sub(life2);
			expect(difference.value).to.equal(50);

			const product = life1.mul(2);
			expect(product.value).to.equal(200);

			const quotient = life1.div(2);
			expect(quotient.value).to.equal(50);
		});

		it("should compare life values correctly", () => {
			const life1 = new Life(100);
			const life2 = new Life(50);
			const life3 = new Life(100);

			expect(life1.equals(life3)).to.equal(true);
			expect(life1.equals(life2)).to.equal(false);

			expect(life1.greaterThan(life2)).to.equal(true);
			expect(life2.lessThan(life1)).to.equal(true);
		});
	});

	describe("LifePool", () => {
		it("should initialize with correct values", () => {
			const pool = LifePool.simple(100, 150, 5);

			expect(pool.current()).to.equal(100);
			expect(pool.max()).to.equal(150);
			expect(pool.regenPerSecond()).to.equal(5);
		});

		it("should expend life correctly", () => {
			const pool = LifePool.simple(100, 100);

			const result = pool.expend(30);
			expect(result).to.equal(undefined);
			expect(pool.current()).to.equal(70);
		});

		it("should fail to expend when insufficient", () => {
			const pool = LifePool.simple(50, 100);

			const result = pool.expend(60);
			expect(result).to.equal(CannotUseAbility.PoolInsufficient);
			expect(pool.current()).to.equal(50);
		});

		it("should replenish life correctly", () => {
			const pool = LifePool.simple(50, 100);

			pool.replenish(30);
			expect(pool.current()).to.equal(80);
		});

		it("should not exceed maximum when replenishing", () => {
			const pool = LifePool.simple(90, 100);

			pool.replenish(20);
			expect(pool.current()).to.equal(100);
		});

		it("should regenerate over time", () => {
			const pool = LifePool.simple(50, 100, 10);

			pool.regenerate(Duration.fromSecs(2));
			expect(pool.current()).to.equal(70);

			pool.regenerate(Duration.fromSecs(3));
			expect(pool.current()).to.equal(100);
		});

		it("should set current value with clamping", () => {
			const pool = LifePool.simple(50, 100);

			pool.setCurrent(75);
			expect(pool.current()).to.equal(75);

			pool.setCurrent(150);
			expect(pool.current()).to.equal(100);

			pool.setCurrent(-10);
			expect(pool.current()).to.equal(0);
		});

		it("should set maximum value", () => {
			const pool = LifePool.simple(50, 100);

			pool.setMax(80);
			expect(pool.max()).to.equal(80);
			expect(pool.current()).to.equal(50);
		});

		it("should clamp current when reducing maximum", () => {
			const pool = LifePool.simple(90, 100);

			pool.setMax(70);
			expect(pool.current()).to.equal(70);
		});

		it("should check full/empty states correctly", () => {
			const pool = LifePool.simple(100, 100);

			expect(pool.isFull()).to.equal(true);
			expect(pool.isEmpty()).to.equal(false);

			pool.expend(100);

			expect(pool.isFull()).to.equal(false);
			expect(pool.isEmpty()).to.equal(true);
		});

		it("should calculate percentage correctly", () => {
			const pool = LifePool.simple(50, 100);

			expect(pool.getPercentage()).to.equal(0.5);

			pool.expend(25);
			expect(pool.getPercentage()).to.equal(0.25);
		});

		it("should handle damage and healing", () => {
			const pool = LifePool.simple(100, 100);

			pool.takeDamage(new Life(30));
			expect(pool.current()).to.equal(70);

			pool.heal(new Life(20));
			expect(pool.current()).to.equal(90);
		});
	});

	describe("ManaPool", () => {
		it("should initialize with correct values", () => {
			const pool = ManaPool.simple(50, 100, 5);

			expect(pool.current()).to.equal(50);
			expect(pool.max()).to.equal(100);
			expect(pool.regenPerSecond()).to.equal(5);
		});

		it("should cast spells successfully", () => {
			const pool = ManaPool.simple(100, 100);

			const success = pool.cast(new Mana(30));
			expect(success).to.equal(true);
			expect(pool.current()).to.equal(70);
		});

		it("should fail to cast when insufficient mana", () => {
			const pool = ManaPool.simple(20, 100);

			const success = pool.cast(new Mana(30));
			expect(success).to.equal(false);
			expect(pool.current()).to.equal(20);
		});

		it("should restore mana correctly", () => {
			const pool = ManaPool.simple(50, 100);

			pool.restore(new Mana(30));
			expect(pool.current()).to.equal(80);
		});

		it("should regenerate mana over time", () => {
			const pool = ManaPool.simple(40, 100, 20);

			pool.regenerate(Duration.fromSecs(2));
			expect(pool.current()).to.equal(80);

			pool.regenerate(Duration.fromSecs(1));
			expect(pool.current()).to.equal(100);
		});

		it("should calculate percentage correctly", () => {
			const pool = ManaPool.simple(50, 200);

			expect(pool.getPercentage()).to.equal(0.25);

			pool.restore(new Mana(50));
			expect(pool.getPercentage()).to.equal(0.5);
		});

		it("should check full/empty states", () => {
			const pool = ManaPool.simple(100, 100);

			expect(pool.isFull()).to.equal(true);
			expect(pool.isEmpty()).to.equal(false);

			pool.cast(new Mana(100));

			expect(pool.isFull()).to.equal(false);
			expect(pool.isEmpty()).to.equal(true);
		});

		it("should format toString correctly", () => {
			const pool = ManaPool.simple(50, 100);
			const stringRepresentation = pool.toString();

			expect(stringRepresentation).to.be.a("string");
			expect(stringRepresentation.find("50")).never.to.equal(undefined);
			expect(stringRepresentation.find("100")).never.to.equal(undefined);
		});
	});
};