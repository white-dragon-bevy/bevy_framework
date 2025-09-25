/**
 * resources.spec.ts - Resources 单元测试
 */

import { State, NextState, NextStateVariant } from "../resources";
import { EnumStates } from "../states";

export = () => {
	describe("State", () => {
		let testState: EnumStates;

		beforeEach(() => {
			testState = new EnumStates("menu");
		});

		it("should create state resource correctly", () => {
			const stateResource = State.create(testState);
			expect(stateResource.get().getStateId()).to.equal("menu");
		});

		it("should compare with state correctly", () => {
			const stateResource = State.create(testState);
			const sameState = new EnumStates("menu");
			const differentState = new EnumStates("game");

			expect(stateResource.is(sameState)).to.equal(true);
			expect(stateResource.is(differentState)).to.equal(false);
		});

		it("should update state internally", () => {
			const stateResource = State.create(testState);
			const newState = new EnumStates("game");

			stateResource._set(newState);
			expect(stateResource.get().getStateId()).to.equal("game");
		});

		it("should clone state resource", () => {
			const original = State.create(testState);
			const cloned = original.clone();

			expect(cloned.get().getStateId()).to.equal(original.get().getStateId());
			expect(cloned.is(testState)).to.equal(true);
		});
	});

	describe("NextState", () => {
		let testState: EnumStates;

		beforeEach(() => {
			testState = new EnumStates("menu");
		});

		it("should create unchanged next state", () => {
			const nextState = NextState.unchanged<EnumStates>();
			expect(nextState.isUnchanged()).to.equal(true);
			expect(nextState.isPending()).to.equal(false);
			expect(nextState.pending()).to.equal(undefined);
			// 兼容性测试
			expect(nextState.hasPending()).to.equal(false);
			expect(nextState.getPending()).to.equal(undefined);
		});

		it("should create pending next state using static factory", () => {
			const nextState = NextState.withPending(testState);
			expect(nextState.isPending()).to.equal(true);
			expect(nextState.isUnchanged()).to.equal(false);
			expect(nextState.pending()?.getStateId()).to.equal("menu");
		});

		it("should support deprecated withPending method", () => {
			const nextState = NextState.withPending(testState);
			expect(nextState.isPending()).to.equal(true);
			expect(nextState.hasPending()).to.equal(true);
			expect(nextState.getPending()?.getStateId()).to.equal("menu");
		});

		it("should set next state and change variant", () => {
			const nextState = NextState.unchanged<EnumStates>();
			const newState = new EnumStates("game");

			// 初始状态应该是 Unchanged
			expect(nextState.isUnchanged()).to.equal(true);

			// 设置后应该变为 Pending
			nextState.set(newState);
			expect(nextState.isPending()).to.equal(true);
			expect(nextState.isUnchanged()).to.equal(false);
			expect(nextState.pending()?.getStateId()).to.equal("game");

			// 兼容性测试
			expect(nextState.hasPending()).to.equal(true);
			expect(nextState.getPending()?.getStateId()).to.equal("game");
		});

		it("should reset next state to unchanged variant", () => {
			const nextState = NextState.withPending(testState);
			expect(nextState.isPending()).to.equal(true);

			nextState.reset();
			expect(nextState.isUnchanged()).to.equal(true);
			expect(nextState.isPending()).to.equal(false);
			expect(nextState.pending()).to.equal(undefined);

			// 兼容性测试
			expect(nextState.hasPending()).to.equal(false);
			expect(nextState.getPending()).to.equal(undefined);
		});

		it("should take and clear pending state", () => {
			const nextState = NextState.withPending(testState);
			expect(nextState.isPending()).to.equal(true);

			const taken = nextState.take();
			expect(taken?.getStateId()).to.equal("menu");

			// 取出后应该重置为 Unchanged
			expect(nextState.isUnchanged()).to.equal(true);
			expect(nextState.isPending()).to.equal(false);
			expect(nextState.pending()).to.equal(undefined);

			// 兼容性测试
			expect(nextState.hasPending()).to.equal(false);
			expect(nextState.getPending()).to.equal(undefined);
		});

		it("should return undefined when taking unchanged state", () => {
			const nextState = NextState.unchanged<EnumStates>();
			const taken = nextState.take();

			expect(taken).to.equal(undefined);
			expect(nextState.isUnchanged()).to.equal(true);
		});
	});
};
