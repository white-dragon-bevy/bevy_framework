/**
 * states.spec.ts - Unit tests for states
 */

import { AppState, TutorialState, InGameState, TurboModeState, IsPausedState } from "../states";

export = () => {
	describe("AppState", () => {
		it("should create Menu state correctly", () => {
			const state = AppState.Menu();
			expect(state.getStateId()).to.equal("Menu");
			expect(state.isMenu()).to.equal(true);
			expect(state.isInGame()).to.equal(false);
			expect(state.isPaused()).to.equal(undefined);
			expect(state.isTurbo()).to.equal(undefined);
		});

		it("should create InGame state with correct flags", () => {
			const state = AppState.InGame(false, false);
			expect(state.getStateId()).to.equal("InGame_unpaused_normal");
			expect(state.isMenu()).to.equal(false);
			expect(state.isInGame()).to.equal(true);
			expect(state.isPaused()).to.equal(false);
			expect(state.isTurbo()).to.equal(false);
		});

		it("should create InGame paused turbo state", () => {
			const state = AppState.InGame(true, true);
			expect(state.getStateId()).to.equal("InGame_paused_turbo");
			expect(state.isPaused()).to.equal(true);
			expect(state.isTurbo()).to.equal(true);
		});

		it("should clone correctly", () => {
			const state1 = AppState.InGame(true, false);
			const state2 = state1.clone() as AppState;
			expect(state1.equals(state2)).to.equal(true);
			expect(state1).to.never.equal(state2); // Different instances
		});

		it("should compare equality correctly", () => {
			const state1 = AppState.Menu();
			const state2 = AppState.Menu();
			const state3 = AppState.InGame(false, false);

			expect(state1.equals(state2)).to.equal(true);
			expect(state1.equals(state3)).to.equal(false);
		});
	});

	describe("TutorialState", () => {
		it("should create Active state", () => {
			const state = TutorialState.Active();
			expect(state.getStateId()).to.equal("TutorialActive");
			expect(state.isActive()).to.equal(true);
		});

		it("should create Inactive state", () => {
			const state = TutorialState.Inactive();
			expect(state.getStateId()).to.equal("TutorialInactive");
			expect(state.isActive()).to.equal(false);
		});

		it("should compare equality correctly", () => {
			const state1 = TutorialState.Active();
			const state2 = TutorialState.Active();
			const state3 = TutorialState.Inactive();

			expect(state1.equals(state2)).to.equal(true);
			expect(state1.equals(state3)).to.equal(false);
		});
	});

	describe("InGameState (Computed)", () => {
		it("should exist when AppState is InGame", () => {
			const appState = AppState.InGame(false, false);
			const computedState = new InGameState();
			const result = computedState.compute(appState);

			expect(result).to.be.ok();
			if (result) {
				expect(result.getStateId()).to.equal("InGame");
			}
		});

		it("should not exist when AppState is Menu", () => {
			const appState = AppState.Menu();
			const computedState = new InGameState();
			const result = computedState.compute(appState);

			expect(result).to.equal(undefined);
		});

		it("should handle undefined source", () => {
			const computedState = new InGameState();
			const result = computedState.compute(undefined);

			expect(result).to.equal(undefined);
		});
	});

	describe("TurboModeState (Computed)", () => {
		it("should exist when in game with turbo", () => {
			const appState = AppState.InGame(false, true);
			const computedState = new TurboModeState();
			const result = computedState.compute(appState);

			expect(result).to.be.ok();
			if (result) {
				expect(result.getStateId()).to.equal("TurboMode");
			}
		});

		it("should not exist when turbo is false", () => {
			const appState = AppState.InGame(false, false);
			const computedState = new TurboModeState();
			const result = computedState.compute(appState);

			expect(result).to.equal(undefined);
		});

		it("should not exist when in menu", () => {
			const appState = AppState.Menu();
			const computedState = new TurboModeState();
			const result = computedState.compute(appState);

			expect(result).to.equal(undefined);
		});
	});

	describe("IsPausedState (Computed)", () => {
		it("should be Paused when game is paused", () => {
			const appState = AppState.InGame(true, false);
			const computedState = new IsPausedState(false);
			const result = computedState.compute(appState);

			expect(result).to.be.ok();
			if (result && result instanceof IsPausedState) {
				expect(result.getStateId()).to.equal("Paused");
				expect(result.isPaused()).to.equal(true);
			}
		});

		it("should be NotPaused when game is not paused", () => {
			const appState = AppState.InGame(false, false);
			const computedState = new IsPausedState(true);
			const result = computedState.compute(appState);

			expect(result).to.be.ok();
			if (result && result instanceof IsPausedState) {
				expect(result.getStateId()).to.equal("NotPaused");
				expect(result.isPaused()).to.equal(false);
			}
		});

		it("should not exist when in menu", () => {
			const appState = AppState.Menu();
			const computedState = new IsPausedState(false);
			const result = computedState.compute(appState);

			expect(result).to.equal(undefined);
		});

		it("should compare equality correctly", () => {
			const state1 = IsPausedState.Paused();
			const state2 = IsPausedState.Paused();
			const state3 = IsPausedState.NotPaused();

			expect(state1.equals(state2)).to.equal(true);
			expect(state1.equals(state3)).to.equal(false);
		});
	});
};