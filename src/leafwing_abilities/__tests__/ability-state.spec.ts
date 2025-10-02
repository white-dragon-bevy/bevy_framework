import { AbilityStateHelper, ActionState, NullPool } from "../ability-state";
import { ChargeState } from "../charges";
import { CooldownState } from "../cooldown";
import { CannotUseAbility } from "../errors";
import type { Abilitylike } from "../abilitylike";
import type { Pool, AbilityCosts } from "../pool";

/**
 * Test ability enum
 */
enum TestAbility {
	Duck = "Duck",
	Cover = "Cover",
	Jump = "Jump",
}

/**
 * Mock implementation of Abilitylike for testing
 */
class TestAbilityImpl implements Abilitylike {
	constructor(public readonly ability: TestAbility) {}

	hash(): string {
		return `TestAbility:${this.ability}`;
	}

	equals(other: Abilitylike): boolean {
		return this.hash() === other.hash();
	}

	toString(): string {
		return this.ability;
	}

	ready<P extends Pool>(
		_charges: ChargeState<this>,
		_cooldowns: CooldownState<this>,
		_pool?: P,
		_costs?: AbilityCosts<this, P>,
	): CannotUseAbility | undefined {
		// Simple implementation for testing - always ready
		return undefined;
	}

	trigger<P extends Pool>(
		_charges: ChargeState<this>,
		_cooldowns: CooldownState<this>,
		_pool?: P,
		_costs?: AbilityCosts<this, P>,
	): CannotUseAbility | undefined {
		// Simple implementation for testing - always succeeds
		return undefined;
	}
}

/**
 * Mock ActionState for testing
 */
class MockActionState implements ActionState<TestAbilityImpl> {
	private pressedActions = new Set<TestAbility>();
	private justPressedActions = new Set<TestAbility>();

	setPressed(action: TestAbilityImpl): void {
		this.pressedActions.add(action.ability);
	}

	setJustPressed(action: TestAbilityImpl): void {
		this.justPressedActions.add(action.ability);
	}

	clear(): void {
		this.pressedActions.clear();
		this.justPressedActions.clear();
	}

	pressed(action: TestAbilityImpl): boolean {
		return this.pressedActions.has(action.ability);
	}

	justPressed(action: TestAbilityImpl): boolean {
		return this.justPressedActions.has(action.ability);
	}
}

export = () => {
	describe("AbilityStateHelper", () => {
		let charges: ChargeState<TestAbilityImpl>;
		let cooldowns: CooldownState<TestAbilityImpl>;
		let actionState: MockActionState;
		let helper: AbilityStateHelper<TestAbilityImpl, NullPool>;
		let testAction: TestAbilityImpl;

		beforeEach(() => {
			charges = new ChargeState<TestAbilityImpl>();
			cooldowns = new CooldownState<TestAbilityImpl>();
			actionState = new MockActionState();
			testAction = new TestAbilityImpl(TestAbility.Duck);
		});

		afterEach(() => {
			actionState.clear();
		});

		describe("ready", () => {
			it("should delegate to ability.ready()", () => {
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.ready(testAction);

				expect(result).to.equal(undefined);
			});
		});

		describe("readyAndPressed", () => {
			it("should return NotPressed when actionState is undefined", () => {
				helper = new AbilityStateHelper(undefined, charges, cooldowns);
				const result = helper.readyAndPressed(testAction);

				expect(result).to.equal(CannotUseAbility.NotPressed);
			});

			it("should return NotPressed when action is not pressed", () => {
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.readyAndPressed(testAction);

				expect(result).to.equal(CannotUseAbility.NotPressed);
			});

			it("should call ready() when action is pressed", () => {
				actionState.setPressed(testAction);
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.readyAndPressed(testAction);

				// Should return ready() result (undefined in our mock)
				expect(result).to.equal(undefined);
			});
		});

		describe("readyAndJustPressed", () => {
			it("should return NotPressed when actionState is undefined", () => {
				helper = new AbilityStateHelper(undefined, charges, cooldowns);
				const result = helper.readyAndJustPressed(testAction);

				expect(result).to.equal(CannotUseAbility.NotPressed);
			});

			it("should return NotPressed when action is not just pressed", () => {
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.readyAndJustPressed(testAction);

				expect(result).to.equal(CannotUseAbility.NotPressed);
			});

			it("should call ready() when action is just pressed", () => {
				actionState.setJustPressed(testAction);
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.readyAndJustPressed(testAction);

				// Should return ready() result (undefined in our mock)
				expect(result).to.equal(undefined);
			});
		});

		describe("trigger", () => {
			it("should delegate to ability.trigger()", () => {
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.trigger(testAction);

				expect(result).to.equal(undefined);
			});
		});

		describe("triggerIfPressed", () => {
			it("should return NotPressed when actionState is undefined", () => {
				helper = new AbilityStateHelper(undefined, charges, cooldowns);
				const result = helper.triggerIfPressed(testAction);

				expect(result).to.equal(CannotUseAbility.NotPressed);
			});

			it("should return NotPressed when action is not pressed", () => {
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.triggerIfPressed(testAction);

				expect(result).to.equal(CannotUseAbility.NotPressed);
			});

			it("should call trigger() when action is pressed", () => {
				actionState.setPressed(testAction);
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.triggerIfPressed(testAction);

				// Should return trigger() result (undefined in our mock)
				expect(result).to.equal(undefined);
			});
		});

		describe("triggerIfJustPressed", () => {
			it("should return NotPressed when actionState is undefined", () => {
				helper = new AbilityStateHelper(undefined, charges, cooldowns);
				const result = helper.triggerIfJustPressed(testAction);

				expect(result).to.equal(CannotUseAbility.NotPressed);
			});

			it("should return NotPressed when action is not just pressed", () => {
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.triggerIfJustPressed(testAction);

				expect(result).to.equal(CannotUseAbility.NotPressed);
			});

			it("should call trigger() when action is just pressed", () => {
				actionState.setJustPressed(testAction);
				helper = new AbilityStateHelper(actionState, charges, cooldowns);
				const result = helper.triggerIfJustPressed(testAction);

				// Should return trigger() result (undefined in our mock)
				expect(result).to.equal(undefined);
			});
		});
	});

	describe("NullPool", () => {
		let pool: NullPool;

		beforeEach(() => {
			pool = new NullPool();
		});

		it("should return 0 for current()", () => {
			expect(pool.current()).to.equal(0);
		});

		it("should return 0 for max()", () => {
			expect(pool.max()).to.equal(0);
		});

		it("should always be available", () => {
			expect(pool.available(100)).to.equal(undefined);
		});

		it("should always expend successfully", () => {
			expect(pool.expend(100)).to.equal(undefined);
		});

		it("should be both full and empty", () => {
			expect(pool.isFull()).to.equal(true);
			expect(pool.isEmpty()).to.equal(true);
		});

		it("should ignore setCurrent", () => {
			const result = pool.setCurrent(50);

			expect(result).to.equal(0);
			expect(pool.current()).to.equal(0);
		});

		it("should ignore setMax", () => {
			pool.setMax(100);
			expect(pool.max()).to.equal(0);
		});

		it("should ignore replenish", () => {
			pool.replenish(50);
			expect(pool.current()).to.equal(0);
		});
	});
};
