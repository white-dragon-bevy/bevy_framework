import { Duration } from "../../bevy_time";

import { CannotUseAbility } from "../errors";
import { Cooldown, CooldownState } from "../cooldown";
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
	describe("Cooldown", () => {
		it("should initialize in ready state", () => {
			const cooldown = Cooldown.fromSecs(5);

			expect(cooldown.getElapsed().asSecsF32()).to.equal(5);
			expect(cooldown.getMaxTime().asSecsF32()).to.equal(5);
			expect(cooldown.ready()).to.equal(undefined);
		});

		it("should not be ready initially after trigger", () => {
			const cooldown = Cooldown.fromSecs(5);
			cooldown.trigger();

			expect(cooldown.ready()).to.equal(CannotUseAbility.OnCooldown);
			expect(cooldown.isActive()).to.equal(true);
		});

		it("should become ready after max time elapses", () => {
			const cooldown = Cooldown.fromSecs(5);
			cooldown.trigger();

			cooldown.tick(Duration.fromSecs(5));

			expect(cooldown.ready()).to.equal(undefined);
			expect(cooldown.isActive()).to.equal(false);
		});

		it("should track elapsed time correctly", () => {
			const cooldown = Cooldown.fromSecs(10);
			cooldown.trigger();

			cooldown.tick(Duration.fromSecs(3));
			expect(cooldown.getElapsed().asSecsF32()).to.equal(3);

			cooldown.tick(Duration.fromSecs(4));
			expect(cooldown.getElapsed().asSecsF32()).to.equal(7);
		});

		it("should clamp elapsed time to max time", () => {
			const cooldown = Cooldown.fromSecs(5);
			cooldown.trigger();

			cooldown.tick(Duration.fromSecs(10));

			expect(cooldown.getElapsed().asSecsF32()).to.equal(5);
			expect(cooldown.ready()).to.equal(undefined);
		});

		it("should calculate remaining time correctly", () => {
			const cooldown = Cooldown.fromSecs(10);
			cooldown.trigger();

			cooldown.tick(Duration.fromSecs(3));

			const remaining = cooldown.getRemaining();
			expect(remaining.asSecsF32()).to.equal(7);
		});

		it("should refresh cooldown to ready state", () => {
			const cooldown = Cooldown.fromSecs(5);
			cooldown.trigger();

			cooldown.tick(Duration.fromSecs(3));
			expect(cooldown.getElapsed().asSecsF32()).to.equal(3);

			// refresh() sets elapsed = maxTime, making it immediately ready
			cooldown.refresh();
			expect(cooldown.getElapsed().asSecsF32()).to.equal(5);
			expect(cooldown.ready()).to.equal(undefined); // Ready to use
		});

		it("should calculate progress fraction correctly", () => {
			const cooldown = Cooldown.fromSecs(10);
			cooldown.trigger();

			expect(cooldown.getFraction()).to.equal(0);

			cooldown.tick(Duration.fromSecs(5));
			expect(cooldown.getFraction()).to.equal(0.5);

			cooldown.tick(Duration.fromSecs(5));
			expect(cooldown.getFraction()).to.equal(1);
		});
	});

	describe("CooldownState", () => {
		it("should manage cooldowns for multiple abilities", () => {
			const state = new CooldownState<TestAbility>();
			const ability1 = new TestAbility("ability1");
			const ability2 = new TestAbility("ability2");

			state.set(ability1, Cooldown.fromSecs(5));
			state.set(ability2, Cooldown.fromSecs(3));

			expect(state.size()).to.equal(2);
		});

		it("should trigger cooldowns correctly", () => {
			const state = new CooldownState<TestAbility>();
			const ability = new TestAbility("ability1");
			state.set(ability, Cooldown.fromSecs(5));

			const triggerResult = state.trigger(ability);
			expect(triggerResult).to.equal(undefined);

			const readyResult = state.ready(ability);
			expect(readyResult).to.equal(CannotUseAbility.OnCooldown);
		});

		it("should tick all cooldowns", () => {
			const state = new CooldownState<TestAbility>();
			const ability1 = new TestAbility("ability1");
			const ability2 = new TestAbility("ability2");

			state.set(ability1, Cooldown.fromSecs(5));
			state.set(ability2, Cooldown.fromSecs(3));

			state.trigger(ability1);
			state.trigger(ability2);

			state.tick(Duration.fromSecs(4));

			expect(state.ready(ability1)).to.equal(CannotUseAbility.OnCooldown);
			expect(state.ready(ability2)).to.equal(undefined);
		});

		it("should enforce global cooldown", () => {
			const state = new CooldownState<TestAbility>();
			state.globalCooldown = Cooldown.fromSecs(1.5);

			const ability = new TestAbility("ability1");
			state.set(ability, Cooldown.fromSecs(5));

			state.trigger(ability);

			expect(state.ready(ability)).to.equal(CannotUseAbility.OnGlobalCooldown);

			state.tick(Duration.fromSecs(1.5));

			expect(state.ready(ability)).to.equal(CannotUseAbility.OnCooldown);
		});

		it("should remove cooldowns", () => {
			const state = new CooldownState<TestAbility>();
			const ability = new TestAbility("ability1");
			state.set(ability, Cooldown.fromSecs(5));

			expect(state.size()).to.equal(1);

			const removed = state.remove(ability);
			expect(removed).to.equal(true);
			expect(state.size()).to.equal(0);
		});

		it("should clear all cooldowns", () => {
			const state = new CooldownState<TestAbility>();
			const ability1 = new TestAbility("ability1");
			const ability2 = new TestAbility("ability2");

			state.set(ability1, Cooldown.fromSecs(5));
			state.set(ability2, Cooldown.fromSecs(3));
			state.globalCooldown = Cooldown.fromSecs(1);

			state.clear();

			expect(state.size()).to.equal(0);
			expect(state.globalCooldown).to.equal(undefined);
		});
	});
};