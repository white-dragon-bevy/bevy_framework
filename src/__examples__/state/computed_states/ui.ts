/**
 * ui.ts - Roblox UI systems for the computed states example
 * Implements menu, pause screen, and tutorial instructions using Roblox GUI
 */

import { Players, TweenService } from "@rbxts/services";
import { component } from "@rbxts/matter";
import type { World, Entity } from "@rbxts/matter";
import { AppState, TutorialState } from "./states";
import { markForDespawnOnExit, markForDespawnOnComputedExit } from "./despawn-on-exit";
import { NextState } from "../../../bevy_state/resources";
import type { ResourceManager } from "../../../bevy_ecs/resource";

// UI Colors
export const NORMAL_BUTTON = new Color3(0.15, 0.15, 0.15);
export const HOVERED_BUTTON = new Color3(0.25, 0.25, 0.25);
export const PRESSED_BUTTON = new Color3(0.35, 0.75, 0.35);
export const ACTIVE_BUTTON = new Color3(0.15, 0.85, 0.15);
export const HOVERED_ACTIVE_BUTTON = new Color3(0.25, 0.55, 0.25);
export const PRESSED_ACTIVE_BUTTON = new Color3(0.35, 0.95, 0.35);

/**
 * Component to track menu UI elements
 */
export const MenuUI = component<{
	readonly screenGui: ScreenGui;
	readonly playButton: TextButton;
	readonly tutorialButton: TextButton;
}>("MenuUI");

/**
 * Component to track pause screen UI
 */
export const PauseUI = component<{
	readonly screenGui: ScreenGui;
}>("PauseUI");

/**
 * Component to track turbo mode indicator
 */
export const TurboUI = component<{
	readonly screenGui: ScreenGui;
	readonly label: TextLabel;
}>("TurboUI");

/**
 * Component to track tutorial instructions UI
 */
export const TutorialUI = component<{
	readonly screenGui: ScreenGui;
	readonly labels: TextLabel[];
}>("TutorialUI");

/**
 * Component to track the game sprite (using ImageLabel)
 */
export const GameSprite = component<{
	readonly screenGui: ScreenGui;
	readonly imageLabel: ImageLabel;
	readonly position: Vector2;
	readonly velocity: Vector2;
}>("GameSprite");

/**
 * Setup the main menu UI
 */
export function setupMenu(world: World, resourceManager: ResourceManager): void {
	const player = Players.LocalPlayer;
	if (!player) return;
	const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
	if (!playerGui) return;

	// Create ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "MenuUI";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = playerGui;

	// Create container frame
	const container = new Instance("Frame");
	container.Size = new UDim2(1, 0, 1, 0);
	container.Position = new UDim2(0, 0, 0, 0);
	container.BackgroundTransparency = 1;
	container.Parent = screenGui;

	// Create Play button
	const playButton = new Instance("TextButton");
	playButton.Size = new UDim2(0, 200, 0, 65);
	playButton.Position = new UDim2(0.5, -100, 0.5, -70);
	playButton.BackgroundColor3 = NORMAL_BUTTON;
	playButton.Text = "Play";
	playButton.TextColor3 = new Color3(0.9, 0.9, 0.9);
	playButton.TextScaled = true;
	playButton.Font = Enum.Font.SourceSans;
	playButton.Parent = container;

	// Create Tutorial button
	const tutorialButton = new Instance("TextButton");
	tutorialButton.Size = new UDim2(0, 200, 0, 65);
	tutorialButton.Position = new UDim2(0.5, -100, 0.5, 10);
	tutorialButton.Text = "Tutorial";
	tutorialButton.TextColor3 = new Color3(0.9, 0.9, 0.9);
	tutorialButton.TextScaled = true;
	tutorialButton.Font = Enum.Font.SourceSans;
	tutorialButton.Parent = container;

	// Check tutorial state and set initial button color
	const tutorialState = resourceManager.getResource(
		State<TutorialState>,
	) as State<TutorialState> | undefined;
	if (tutorialState && tutorialState.get().isActive()) {
		tutorialButton.BackgroundColor3 = ACTIVE_BUTTON;
	} else {
		tutorialButton.BackgroundColor3 = NORMAL_BUTTON;
	}

	// Handle button interactions
	playButton.MouseButton1Click.Connect(() => {
		const nextStateResource = resourceManager.getResource(
			NextState<AppState>,
		) as NextState<AppState> | undefined;
		if (nextStateResource) {
			nextStateResource.set(AppState.InGame(false, false));
		}
	});

	tutorialButton.MouseButton1Click.Connect(() => {
		const currentTutorialState = resourceManager.getResource(
			State<TutorialState>,
		) as State<TutorialState> | undefined;
		const nextTutorialState = resourceManager.getResource(
			NextState<TutorialState>,
		) as NextState<TutorialState> | undefined;

		if (currentTutorialState && nextTutorialState) {
			const isActive = currentTutorialState.get().isActive();
			nextTutorialState.set(isActive ? TutorialState.Inactive() : TutorialState.Active());
			// Update button color immediately
			tutorialButton.BackgroundColor3 = isActive ? NORMAL_BUTTON : ACTIVE_BUTTON;
		}
	});

	// Add hover effects
	playButton.MouseEnter.Connect(() => {
		playButton.BackgroundColor3 = HOVERED_BUTTON;
	});
	playButton.MouseLeave.Connect(() => {
		playButton.BackgroundColor3 = NORMAL_BUTTON;
	});

	tutorialButton.MouseEnter.Connect(() => {
		const state = resourceManager.getResource(
			State<TutorialState>,
		) as State<TutorialState> | undefined;
		if (state && state.get().isActive()) {
			tutorialButton.BackgroundColor3 = HOVERED_ACTIVE_BUTTON;
		} else {
			tutorialButton.BackgroundColor3 = HOVERED_BUTTON;
		}
	});
	tutorialButton.MouseLeave.Connect(() => {
		const state = resourceManager.getResource(
			State<TutorialState>,
		) as State<TutorialState> | undefined;
		if (state && state.get().isActive()) {
			tutorialButton.BackgroundColor3 = ACTIVE_BUTTON;
		} else {
			tutorialButton.BackgroundColor3 = NORMAL_BUTTON;
		}
	});

	// Create entity and mark for cleanup
	const entity = world.spawn(
		MenuUI({
			screenGui,
			playButton,
			tutorialButton,
		}),
	);
	markForDespawnOnExit(world, entity, AppState.Menu());
}

/**
 * Setup the game sprite (Bevy logo equivalent)
 */
export function setupGameSprite(world: World): void {
	const player = Players.LocalPlayer;
	if (!player) return;
	const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
	if (!playerGui) return;

	// Create ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "GameSprite";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = playerGui;

	// Create ImageLabel for the sprite
	const imageLabel = new Instance("ImageLabel");
	imageLabel.Size = new UDim2(0, 100, 0, 100);
	imageLabel.Position = new UDim2(0.5, -50, 0.5, -50);
	imageLabel.BackgroundColor3 = new Color3(1, 1, 1);
	imageLabel.BorderSizePixel = 0;
	// Using a colored square instead of the Bevy logo
	imageLabel.Image = "";
	imageLabel.Parent = screenGui;

	// Create entity with sprite component
	const entity = world.spawn(
		GameSprite({
			screenGui,
			imageLabel,
			position: new Vector2(0.5, 0.5), // Normalized screen position
			velocity: new Vector2(0, 0),
		}),
	);
	markForDespawnOnComputedExit(world, entity, "InGame");
}

/**
 * Setup pause screen overlay
 */
export function setupPausedScreen(world: World): void {
	const player = Players.LocalPlayer;
	if (!player) return;
	const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
	if (!playerGui) return;

	// Create ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "PauseUI";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = playerGui;

	// Create semi-transparent overlay
	const overlay = new Instance("Frame");
	overlay.Size = new UDim2(1, 0, 1, 0);
	overlay.Position = new UDim2(0, 0, 0, 0);
	overlay.BackgroundColor3 = new Color3(0, 0, 0);
	overlay.BackgroundTransparency = 0.5;
	overlay.Parent = screenGui;

	// Create pause label container
	const pauseContainer = new Instance("Frame");
	pauseContainer.Size = new UDim2(0, 400, 0, 400);
	pauseContainer.Position = new UDim2(0.5, -200, 0.5, -200);
	pauseContainer.BackgroundColor3 = NORMAL_BUTTON;
	pauseContainer.Parent = overlay;

	// Create pause text
	const pauseLabel = new Instance("TextLabel");
	pauseLabel.Size = new UDim2(1, 0, 1, 0);
	pauseLabel.Position = new UDim2(0, 0, 0, 0);
	pauseLabel.BackgroundTransparency = 1;
	pauseLabel.Text = "Paused";
	pauseLabel.TextColor3 = new Color3(0.9, 0.9, 0.9);
	pauseLabel.TextScaled = true;
	pauseLabel.Font = Enum.Font.SourceSansBold;
	pauseLabel.Parent = pauseContainer;

	// Create entity and mark for cleanup
	const entity = world.spawn(PauseUI({ screenGui }));
	markForDespawnOnComputedExit(world, entity, "Paused");
}

/**
 * Setup turbo mode indicator
 */
export function setupTurboText(world: World): void {
	const player = Players.LocalPlayer;
	if (!player) return;
	const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
	if (!playerGui) return;

	// Create ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "TurboUI";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = playerGui;

	// Create turbo label
	const turboLabel = new Instance("TextLabel");
	turboLabel.Size = new UDim2(0, 300, 0, 50);
	turboLabel.Position = new UDim2(0.5, -150, 0, 50);
	turboLabel.BackgroundTransparency = 1;
	turboLabel.Text = "TURBO MODE";
	turboLabel.TextColor3 = new Color3(0.9, 0.3, 0.1);
	turboLabel.TextScaled = true;
	turboLabel.Font = Enum.Font.SourceSansBold;
	turboLabel.Parent = screenGui;

	// Add pulsing animation
	const tweenInfo = new TweenInfo(0.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true);
	const tween = TweenService.Create(turboLabel, tweenInfo, {
		TextTransparency: 0.3,
	});
	tween.Play();

	// Create entity and mark for cleanup
	const entity = world.spawn(TurboUI({ screenGui, label: turboLabel }));
	markForDespawnOnComputedExit(world, entity, "TurboMode");
}

/**
 * Setup movement instructions UI
 */
export function setupMovementInstructions(world: World): void {
	const player = Players.LocalPlayer;
	if (!player) return;
	const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
	if (!playerGui) return;

	// Create ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "MovementInstructions";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = playerGui;

	// Create container at bottom of screen
	const container = new Instance("Frame");
	container.Size = new UDim2(1, 0, 0, 200);
	container.Position = new UDim2(0, 0, 1, -200);
	container.BackgroundTransparency = 1;
	container.Parent = screenGui;

	// Create instruction labels
	const instructions = [
		"Move the square with the arrow keys",
		"Press T to enter TURBO MODE",
		"Press SPACE to pause",
		"Press ESCAPE to return to the menu",
	];

	const labels: TextLabel[] = [];
	instructions.forEach((text, index) => {
		const label = new Instance("TextLabel");
		label.Size = new UDim2(1, 0, 0, 40);
		label.Position = new UDim2(0, 0, 0, index * 45);
		label.BackgroundTransparency = 1;
		label.Text = text;
		label.TextColor3 = new Color3(0.3, 0.3, 0.7);
		label.TextScaled = true;
		label.Font = Enum.Font.SourceSans;
		label.Parent = container;
		labels.push(label);
	});

	// Create entity and mark for cleanup
	const entity = world.spawn(TutorialUI({ screenGui, labels }));
	markForDespawnOnComputedExit(world, entity, "MovementInstructions");
}

/**
 * Setup pause instructions UI
 */
export function setupPauseInstructions(world: World): void {
	const player = Players.LocalPlayer;
	if (!player) return;
	const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;
	if (!playerGui) return;

	// Create ScreenGui
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "PauseInstructions";
	screenGui.ResetOnSpawn = false;
	screenGui.Parent = playerGui;

	// Create container at bottom of screen
	const container = new Instance("Frame");
	container.Size = new UDim2(1, 0, 0, 100);
	container.Position = new UDim2(0, 0, 1, -100);
	container.BackgroundTransparency = 1;
	container.Parent = screenGui;

	// Create instruction labels
	const instructions = ["Press SPACE to resume", "Press ESCAPE to return to the menu"];

	const labels: TextLabel[] = [];
	instructions.forEach((text, index) => {
		const label = new Instance("TextLabel");
		label.Size = new UDim2(1, 0, 0, 40);
		label.Position = new UDim2(0, 0, 0, index * 45);
		label.BackgroundTransparency = 1;
		label.Text = text;
		label.TextColor3 = new Color3(0.3, 0.3, 0.7);
		label.TextScaled = true;
		label.Font = Enum.Font.SourceSans;
		label.Parent = container;
		labels.push(label);
	});

	// Create entity and mark for cleanup
	const entity = world.spawn(TutorialUI({ screenGui, labels }));
	markForDespawnOnComputedExit(world, entity, "PauseInstructions");
}

/**
 * Cleanup menu UI
 */
export function cleanupMenu(world: World): void {
	for (const [entity, menuUI] of world.query(MenuUI)) {
		menuUI.screenGui.Destroy();
		world.despawn(entity);
	}
}

// Import State for UI systems
import { State } from "../../../bevy_state/resources";