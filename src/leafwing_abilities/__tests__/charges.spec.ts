import { CannotUseAbility } from "../errors";
import { Charges, ChargeState, ReplenishStrategy, CooldownStrategy } from "../charges";
import type { Abilitylike } from "../abilitylike";

// Mock ability for testing
class TestAbility implements Abilitylike {
	constructor(private readonly id: string) {}

	hash(): string {
		return this.id;
	}

	equals(other: TestAbility): boolean {
		return this.id === other.id;
	}

	toString(): string {
		return this.id;
	}

	ready(): CannotUseAbility | undefined {
		return undefined;
	}

	trigger(): CannotUseAbility | undefined {
		return undefined;
	}
}

export = () => {
	describe("Charges", () => {
		it("should initialize with correct charge count", () => {
			const charges = Charges.simple(3);

			expect(charges.charges()).to.equal(3);
			expect(charges.max()).to.equal(3);
		});

		it("should expend charges successfully", () => {
			const charges = Charges.simple(3);

			const result1 = charges.expend();
			expect(result1).to.equal(undefined);
			expect(charges.charges()).to.equal(2);

			const result2 = charges.expend();
			expect(result2).to.equal(undefined);
			expect(charges.charges()).to.equal(1);
		});

		it("should fail to expend when no charges available", () => {
			const charges = Charges.simple(1);

			charges.expend();
			expect(charges.charges()).to.equal(0);

			const result = charges.expend();
			expect(result).to.equal(CannotUseAbility.NoCharges);
		});

		it("should replenish charges correctly", () => {
			const charges = Charges.simple(3);

			charges.expend();
			charges.expend();
			expect(charges.charges()).to.equal(1);

			charges.replenish();
			expect(charges.charges()).to.equal(2);

			charges.replenish();
			expect(charges.charges()).to.equal(3);
		});

		it("should not replenish above maximum", () => {
			const charges = Charges.simple(3);

			charges.replenish();
			expect(charges.charges()).to.equal(3);
		});

		it("should add charges correctly", () => {
			const charges = Charges.simple(5);
			charges.expend();
			charges.expend();

			// addCharges() returns excess, not added count
			const excess = charges.addCharges(2);
			expect(excess).to.equal(0); // No excess since 3 + 2 = 5 (max)
			expect(charges.charges()).to.equal(5);
		});

		it("should not add charges beyond maximum", () => {
			const charges = Charges.simple(5);
			charges.expend();

			// addCharges() returns excess, not added count
			// Current: 4, adding 10, max: 5
			// Result: 5 charges, excess: 9
			const excess = charges.addCharges(10);
			expect(excess).to.equal(9); // Excess charges that couldn't be added
			expect(charges.charges()).to.equal(5);
		});

		it("should handle OneAtATime replenish strategy", () => {
			const charges = Charges.replenishOne(3);

			charges.expend();
			charges.expend();
			expect(charges.charges()).to.equal(1);

			charges.replenish();
			expect(charges.charges()).to.equal(2);
		});

		it("should handle AllAtOnce replenish strategy", () => {
			const charges = Charges.replenishAll(3);

			charges.expend();
			charges.expend();
			expect(charges.charges()).to.equal(1);

			charges.replenish();
			expect(charges.charges()).to.equal(3);
		});

		it("should check availability correctly", () => {
			const charges = Charges.simple(2);

			expect(charges.available()).to.equal(true);

			charges.expend();
			charges.expend();

			expect(charges.available()).to.equal(false);
		});

		it("should report full/empty states correctly", () => {
			const charges = Charges.simple(3);

			expect(charges.isFull()).to.equal(true);
			expect(charges.isEmpty()).to.equal(false);

			charges.expend();
			expect(charges.isFull()).to.equal(false);
			expect(charges.isEmpty()).to.equal(false);

			charges.expend();
			charges.expend();
			expect(charges.isFull()).to.equal(false);
			expect(charges.isEmpty()).to.equal(true);
		});
	});

	describe("ChargeState", () => {
		it("should manage charges for multiple abilities", () => {
			const state = new ChargeState<TestAbility>();
			const ability1 = new TestAbility("ability1");
			const ability2 = new TestAbility("ability2");

			state.set(ability1, Charges.simple(3));
			state.set(ability2, Charges.simple(5));

			expect(state.available(ability1)).to.equal(true);
			expect(state.available(ability2)).to.equal(true);
		});

		it("should expend charges for specific abilities", () => {
			const state = new ChargeState<TestAbility>();
			const ability = new TestAbility("ability1");
			state.set(ability, Charges.simple(2));

			const result1 = state.expend(ability);
			expect(result1).to.equal(undefined);
			expect(state.available(ability)).to.equal(true);

			const result2 = state.expend(ability);
			expect(result2).to.equal(undefined);
			expect(state.available(ability)).to.equal(false);

			const result3 = state.expend(ability);
			expect(result3).to.equal(CannotUseAbility.NoCharges);
		});

		it("should replenish charges for specific abilities", () => {
			const state = new ChargeState<TestAbility>();
			const ability = new TestAbility("ability1");
			state.set(ability, Charges.simple(3));

			state.expend(ability);
			state.expend(ability);

			state.replenish(ability);
			expect(state.available(ability)).to.equal(true);
		});

		it("should remove charges from state", () => {
			const state = new ChargeState<TestAbility>();
			const ability = new TestAbility("ability1");
			state.set(ability, Charges.simple(3));

			const removed = state.remove(ability);
			expect(removed).to.equal(true);

			const removedAgain = state.remove(ability);
			expect(removedAgain).to.equal(false);
		});

		it("should clear all charges", () => {
			const state = new ChargeState<TestAbility>();
			const ability1 = new TestAbility("ability1");
			const ability2 = new TestAbility("ability2");

			state.set(ability1, Charges.simple(3));
			state.set(ability2, Charges.simple(5));

			state.clear();

			// After clearing, abilities have no charge system, so they're always available
			expect(state.available(ability1)).to.equal(true);
			expect(state.available(ability2)).to.equal(true);
			// But the internal map should be empty
			expect(state.get(ability1)).to.equal(undefined);
			expect(state.get(ability2)).to.equal(undefined);
		});
	});
};