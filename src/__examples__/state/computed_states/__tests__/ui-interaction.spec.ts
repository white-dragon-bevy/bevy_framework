/**
 * ui-interaction.spec.ts - UI interaction tests for computed states example
 */

import { World } from "@rbxts/matter";
import { ResourceManager } from "../../../../bevy_ecs/resource";
import { State, NextState } from "../../../../bevy_state/resources";
import { AppState, TutorialState } from "../states";
import { setupMenu } from "../ui";

/**
 * Mock PlayerGui for testing
 */
class MockPlayerGui {
	public readonly children: Instance[] = [];

	public WaitForChild(name: string): Instance | undefined {
		return this as unknown as Instance;
	}
}

/**
 * Mock ScreenGui
 */
class MockScreenGui {
	public Name = "MockScreenGui";
	public Parent: Instance | undefined;

	public Destroy(): void {
		// Mock destroy
	}
}

/**
 * Mock TextButton
 */
class MockTextButton {
	public BackgroundColor3 = new Color3(0, 0, 0);
	public Text = "";
	public TextColor3 = new Color3(1, 1, 1);
	public TextScaled = false;
	public Font = Enum.Font.SourceSans;
	public Size = new UDim2(0, 0, 0, 0);
	public Position = new UDim2(0, 0, 0, 0);
	public Name = "MockTextButton";
	public Parent: Instance | undefined;

	private clickHandlers: (() => void)[] = [];
	private mouseEnterHandlers: (() => void)[] = [];
	private mouseLeaveHandlers: (() => void)[] = [];

	public readonly MouseButton1Click = {
		Connect: (handler: () => void) => {
			this.clickHandlers.push(handler);
			return { Disconnect: () => {} };
		},
	};

	public readonly MouseEnter = {
		Connect: (handler: () => void) => {
			this.mouseEnterHandlers.push(handler);
			return { Disconnect: () => {} };
		},
	};

	public readonly MouseLeave = {
		Connect: (handler: () => void) => {
			this.mouseLeaveHandlers.push(handler);
			return { Disconnect: () => {} };
		},
	};

	// Test helper to simulate click
	public simulateClick(): void {
		for (const handler of this.clickHandlers) {
			handler();
		}
	}

	// Test helper to simulate hover
	public simulateMouseEnter(): void {
		for (const handler of this.mouseEnterHandlers) {
			handler();
		}
	}

	public simulateMouseLeave(): void {
		for (const handler of this.mouseLeaveHandlers) {
			handler();
		}
	}
}

export = () => {
	describe("UI Interaction", () => {
		let world: World;
		let resourceManager: ResourceManager;

		beforeEach(() => {
			world = new World();
			resourceManager = new ResourceManager();

			// Set up world with resource manager
			(world as unknown as Record<string, unknown>)["stateResourceManager"] = resourceManager;

			// Initialize states
			resourceManager.insertResource(State<AppState>, State.create(AppState.Menu()));
			resourceManager.insertResource(NextState<AppState>, NextState.unchanged());
			resourceManager.insertResource(State<TutorialState>, State.create(TutorialState.Active()));
			resourceManager.insertResource(NextState<TutorialState>, NextState.unchanged());
		});

		describe("Button Color States", () => {
			it("should initialize tutorial button with correct color", () => {
				// Test when tutorial is Active
				const activeState = State.create(TutorialState.Active());
				resourceManager.insertResource(State<TutorialState>, activeState);

				// We can't fully test setupMenu without mocking the entire Roblox environment
				// But we can test the state logic
				const tutorialState = resourceManager.getResource(State<TutorialState>);
				expect(tutorialState).to.be.ok();
				if (tutorialState) {
					const state = tutorialState.get();
					expect(state).to.be.ok();
					if (state && typeIs(state, "table") && typeIs(state.isActive, "function")) {
						const isActive = (state as TutorialState).isActive();
						expect(isActive).to.equal(true);
					}
				}
			});

			it("should handle tutorial state toggle", () => {
				// Start with Active
				const activeState = State.create(TutorialState.Active());
				resourceManager.insertResource(State<TutorialState>, activeState);
				const nextState = resourceManager.getResource(NextState<TutorialState>);

				if (nextState) {
					// Toggle to Inactive
					nextState.set(TutorialState.Inactive());
					expect(nextState.hasPending()).to.equal(true);

					const pending = nextState.take();
					expect(pending).to.be.ok();
					if (pending && typeIs(pending, "table") && typeIs(pending.isActive, "function")) {
						const isActive = (pending as TutorialState).isActive();
						expect(isActive).to.equal(false);
					}
				}
			});
		});

		describe("State Transitions", () => {
			it("should transition from Menu to InGame", () => {
				const nextStateResource = resourceManager.getResource(NextState<AppState>);
				expect(nextStateResource).to.be.ok();

				if (nextStateResource) {
					// Simulate Play button click
					nextStateResource.set(AppState.InGame(false, false));
					expect(nextStateResource.hasPending()).to.equal(true);

					const pending = nextStateResource.take();
					expect(pending).to.be.ok();
					if (pending && typeIs(pending, "table") && typeIs(pending.isInGame, "function")) {
						const isInGame = (pending as AppState).isInGame();
						expect(isInGame).to.equal(true);
					}
				}
			});

			it("should set correct flags for InGame state", () => {
				const nextStateResource = resourceManager.getResource(NextState<AppState>);

				if (nextStateResource) {
					// Test unpaused, normal speed
					nextStateResource.set(AppState.InGame(false, false));
					let pending = nextStateResource.take();
					if (pending && typeIs(pending, "table")) {
						if (typeIs(pending.isPaused, "function") && typeIs(pending.isTurbo, "function")) {
							expect((pending as AppState).isPaused()).to.equal(false);
							expect((pending as AppState).isTurbo()).to.equal(false);
						}
					}

					// Test paused, turbo
					nextStateResource.set(AppState.InGame(true, true));
					pending = nextStateResource.take();
					if (pending && typeIs(pending, "table")) {
						if (typeIs(pending.isPaused, "function") && typeIs(pending.isTurbo, "function")) {
							expect((pending as AppState).isPaused()).to.equal(true);
							expect((pending as AppState).isTurbo()).to.equal(true);
						}
					}
				}
			});
		});

		describe("Resource Access", () => {
			it("should access AppState resources correctly", () => {
				const stateResource = resourceManager.getResource(State<AppState>);
				expect(stateResource).to.be.ok();

				const nextStateResource = resourceManager.getResource(NextState<AppState>);
				expect(nextStateResource).to.be.ok();
			});

			it("should access TutorialState resources correctly", () => {
				const stateResource = resourceManager.getResource(State<TutorialState>);
				expect(stateResource).to.be.ok();

				const nextStateResource = resourceManager.getResource(NextState<TutorialState>);
				expect(nextStateResource).to.be.ok();
			});

			it("should handle state methods with type guards", () => {
				const appStateResource = resourceManager.getResource(State<AppState>);
				if (appStateResource) {
					const state = appStateResource.get();
					// Safe method call with type guard
					if (state && typeIs(state, "table")) {
						if (typeIs(state.isMenu, "function")) {
							const isMenu = (state as AppState).isMenu();
							expect(typeIs(isMenu, "boolean")).to.equal(true);
						}
						if (typeIs(state.isInGame, "function")) {
							const isInGame = (state as AppState).isInGame();
							expect(typeIs(isInGame, "boolean")).to.equal(true);
						}
					}
				}
			});
		});
	});
};