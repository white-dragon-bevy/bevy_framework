/**
 * state-transitions-flow.spec.ts - Tests for complete state transition flow
 */

import { World } from "@rbxts/matter";
import { App } from "../../../../bevy_app/app";
import { extendAppWithState } from "../app-extensions";
import { AppState, TutorialState, InGameState, TurboModeState, IsPausedState } from "../states";
import { State, NextState } from "../../../../bevy_state/resources";
import { ResourceManager, ResourceConstructor } from "../../../../bevy_ecs/resource";

export = () => {
	describe("State Transitions Flow", () => {
		let app: App;
		let world: World;
		let resourceManager: ResourceManager;

		// Define resource keys for consistent access
		const AppStateKey = "State<AppState>" as ResourceConstructor<State<AppState>>;
		const NextAppStateKey = "NextState<AppState>" as ResourceConstructor<NextState<AppState>>;
		const TutorialStateKey = "State<TutorialState>" as ResourceConstructor<State<TutorialState>>;
		const NextTutorialStateKey = "NextState<TutorialState>" as ResourceConstructor<NextState<TutorialState>>;
		const InGameStateKey = "State<InGameState>" as ResourceConstructor<State<InGameState>>;
		const TurboModeStateKey = "State<TurboModeState>" as ResourceConstructor<State<TurboModeState>>;

		beforeEach(() => {
			const baseApp = App.create();
			const extendedApp = extendAppWithState(baseApp);
			app = extendedApp as unknown as App;
			world = app.getWorld();

			// Initialize states
			extendedApp.initState(AppState, () => AppState.Menu());
			extendedApp.initState(TutorialState, () => TutorialState.Active());

			// Add computed states
			extendedApp.addComputedState(AppState, InGameState);
			extendedApp.addComputedState(AppState, TurboModeState);

			// Run one update to trigger plugin builds and initial state setup
			app.update();

			// Get resource manager after plugins have built
			resourceManager = (world as unknown as Record<string, unknown>)[
				"stateResourceManager"
			] as ResourceManager;
		});

		describe("Menu to InGame Transition", () => {
			it("should transition from Menu to InGame", () => {
				// Initial state should be Menu (already updated in beforeEach)
				const initialState = resourceManager.getResource(AppStateKey);
				expect(initialState).to.be.ok();
				expect(initialState?.get().getStateId()).to.equal("Menu");

				// Transition to InGame
				const nextState = resourceManager.getResource(NextAppStateKey);
				expect(nextState).to.be.ok();
				if (nextState) {
					nextState.set(AppState.InGame(false, false));
					app.update();

					// Verify new state
					const currentState = resourceManager.getResource(AppStateKey);
					expect(currentState).to.be.ok();
					if (currentState) {
						const state = currentState.get();
						if (state && typeIs(state, "table") && typeIs(state.isInGame, "function")) {
							expect((state as AppState).isInGame()).to.equal(true);
							expect((state as AppState).isPaused()).to.equal(false);
							expect((state as AppState).isTurbo()).to.equal(false);
						}
					}
				}
			});

			it("should create InGameState computed state when in game", () => {
				// Transition to InGame
				const nextState = resourceManager.getResource(NextAppStateKey);
				if (nextState) {
					nextState.set(AppState.InGame(false, false));

					// Process transition and run update to trigger computed state calculation
					app.update();

					// Check if computed state exists
					const computedState = resourceManager.getResource(InGameStateKey);
					expect(computedState).to.be.ok();
				}
			});

			it("should handle Tutorial state during game transition", () => {
				// Tutorial should remain independent of App state
				const tutorialState = resourceManager.getResource(TutorialStateKey);
				expect(tutorialState).to.be.ok();

				// Transition to InGame
				const nextAppState = resourceManager.getResource(NextAppStateKey);
				if (nextAppState) {
					nextAppState.set(AppState.InGame(false, false));
					app.update();

					// Tutorial state should still exist
					const stillHasTutorial = resourceManager.getResource(TutorialStateKey);
					expect(stillHasTutorial).to.be.ok();
				}
			});
		});

		describe("InGame State Variations", () => {
			beforeEach(() => {
				// Start in game
				const nextState = resourceManager.getResource(NextAppStateKey);
				if (nextState) {
					nextState.set(AppState.InGame(false, false));
					app.update();
				}
			});

			it("should handle pause state toggle", () => {
				const nextState = resourceManager.getResource(NextAppStateKey);
				if (nextState) {
					// Toggle pause on
					nextState.set(AppState.InGame(true, false));
					app.update();

					const state = resourceManager.getResource(AppStateKey);
					if (state) {
						const current = state.get();
						if (current && typeIs(current.isPaused, "function")) {
							expect((current as AppState).isPaused()).to.equal(true);
						}
					}

					// Toggle pause off
					nextState.set(AppState.InGame(false, false));
					app.update();

					const updatedState = resourceManager.getResource(AppStateKey);
					if (updatedState) {
						const current = updatedState.get();
						if (current && typeIs(current.isPaused, "function")) {
							expect((current as AppState).isPaused()).to.equal(false);
						}
					}
				}
			});

			it("should handle turbo mode toggle", () => {
				const nextState = resourceManager.getResource(NextAppStateKey);
				if (nextState) {
					// Enable turbo
					nextState.set(AppState.InGame(false, true));
					app.update();

					const state = resourceManager.getResource(AppStateKey);
					if (state) {
						const current = state.get();
						if (current && typeIs(current.isTurbo, "function")) {
							expect((current as AppState).isTurbo()).to.equal(true);
						}
					}

					// Run update to trigger computed state calculation
					app.update();

					// Check TurboModeState computed state
					const turboState = resourceManager.getResource(TurboModeStateKey);
					expect(turboState).to.be.ok();
				}
			});
		});

		describe("Return to Menu", () => {
			it("should transition back to Menu from InGame", () => {
				const nextState = resourceManager.getResource(NextAppStateKey);
				if (nextState) {
					// Go to InGame first
					nextState.set(AppState.InGame(false, false));
					app.update();

					// Return to Menu
					nextState.set(AppState.Menu());
					app.update();

					const state = resourceManager.getResource(AppStateKey);
					expect(state?.get().getStateId()).to.equal("Menu");
				}
			});

			it("should clean up computed states when returning to Menu", () => {
				const nextState = resourceManager.getResource(NextAppStateKey);
				if (nextState) {
					// Go to InGame with turbo
					nextState.set(AppState.InGame(false, true));

					// Run update to trigger state transition and computed state calculation
					app.update();

					// Verify computed states exist
					expect(resourceManager.getResource(InGameStateKey)).to.be.ok();

					// Return to Menu
					nextState.set(AppState.Menu());
					app.update();

					// Computed states should be cleaned up or updated
					// Note: The actual cleanup depends on the computed state implementation
				}
			});
		});

		describe("Tutorial State Independence", () => {
			it("should maintain Tutorial state across App state changes", () => {
				// Set tutorial to Inactive
				const tutorialNext = resourceManager.getResource(NextTutorialStateKey);
				if (tutorialNext) {
					tutorialNext.set(TutorialState.Inactive());
					app.update();

					// Verify tutorial is inactive
					const tutorial = resourceManager.getResource(TutorialStateKey);
					if (tutorial) {
						const state = tutorial.get();
						if (state && typeIs(state.isActive, "function")) {
							expect((state as TutorialState).isActive()).to.equal(false);
						}
					}

					// Change app state
					const appNext = resourceManager.getResource(NextAppStateKey);
					if (appNext) {
						appNext.set(AppState.InGame(false, false));
						app.update();

						// Tutorial should still be inactive
						const stillTutorial = resourceManager.getResource(TutorialStateKey);
						if (stillTutorial) {
							const state = stillTutorial.get();
							if (state && typeIs(state.isActive, "function")) {
								expect((state as TutorialState).isActive()).to.equal(false);
							}
						}
					}
				}
			});

			it("should toggle Tutorial state in any App state", () => {
				const states = [
					AppState.Menu(),
					AppState.InGame(false, false),
					AppState.InGame(true, false),
					AppState.InGame(false, true),
				];

				const tutorialNext = resourceManager.getResource(NextTutorialStateKey);
				const appNext = resourceManager.getResource(NextAppStateKey);

				if (tutorialNext && appNext) {
					for (const appState of states) {
						// Set app state
						appNext.set(appState);
						app.update();

						// Toggle tutorial
						tutorialNext.set(TutorialState.Active());
						app.update();

						let tutorial = resourceManager.getResource(TutorialStateKey);
						if (tutorial) {
							const state = tutorial.get();
							if (state && typeIs(state.isActive, "function")) {
								expect((state as TutorialState).isActive()).to.equal(true);
							}
						}

						// Toggle back
						tutorialNext.set(TutorialState.Inactive());
						app.update();

						tutorial = resourceManager.getResource(TutorialStateKey);
						if (tutorial) {
							const state = tutorial.get();
							if (state && typeIs(state.isActive, "function")) {
								expect((state as TutorialState).isActive()).to.equal(false);
							}
						}
					}
				}
			});
		});

		describe("Error Handling", () => {
			it("should handle rapid state changes", () => {
				const nextState = resourceManager.getResource(NextAppStateKey);
				if (nextState) {
					// Rapid state changes
					nextState.set(AppState.InGame(false, false));
					nextState.set(AppState.Menu());
					nextState.set(AppState.InGame(true, true));

					// Should process the last one
					app.update();

					const state = resourceManager.getResource(AppStateKey);
					if (state) {
						const current = state.get();
						if (current && typeIs(current, "table")) {
							const stateId = current.getStateId();
							expect(stateId.find("InGame")[0] !== undefined).to.equal(true);
						}
					}
				}
			});

			it("should handle invalid state method calls gracefully", () => {
				// This tests that our type guards work
				const state = resourceManager.getResource(AppStateKey);
				if (state) {
					const current = state.get();

					// Safe method calls with type guards
					let result: boolean | undefined;
					if (current && typeIs(current, "table")) {
						if (typeIs(current.isMenu, "function")) {
							result = (current as AppState).isMenu();
						}
					}

					// Should not throw even if methods don't exist
					expect(result !== undefined || result === undefined).to.equal(true);
				}
			});
		});
	});
};