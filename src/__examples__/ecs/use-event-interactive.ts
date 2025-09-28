/**
 * Interactive Matter useEvent Example
 * This example creates interactive parts and demonstrates various event patterns
 */

import { Loop, World, useEvent, component } from "@rbxts/matter";
import { RunService, Players, Workspace } from "@rbxts/services";

// Define components
const PlayerComponent = component<{ player: Player }>();
const Character = component<{ model: Model }>();
const TouchedPart = component<{ part: BasePart; touchedBy: BasePart; time: number }>();
const Health = component<{ current: number; max: number }>();
const InteractivePart = component<{ part: BasePart; color: Color3 }>();

/**
 * Create interactive parts for testing
 */
function createTestParts() {
	// Create a folder for test parts
	let folder = Workspace.FindFirstChild("UseEventTestParts") as Folder;
	if (!folder) {
		folder = new Instance("Folder");
		folder.Name = "UseEventTestParts";
		folder.Parent = Workspace;
	}

	// Create touchable parts
	for (let i = 1; i <= 3; i++) {
		const part = new Instance("Part");
		part.Name = `TouchablePart_${i}`;
		part.Size = new Vector3(4, 4, 4);
		part.Position = new Vector3(i * 6, 5, 0);
		part.BrickColor = BrickColor.random();
		part.TopSurface = Enum.SurfaceType.Smooth;
		part.BottomSurface = Enum.SurfaceType.Smooth;
		part.SetAttribute("Touchable", true);
		part.SetAttribute("PartNumber", i);
		part.CanCollide = true;
		part.Anchored = true;
		part.Parent = folder;

		// Add a click detector for interaction
		const clickDetector = new Instance("ClickDetector");
		clickDetector.MaxActivationDistance = 20;
		clickDetector.Parent = part;
	}

	// Create a moving part that changes properties
	const movingPart = new Instance("Part");
	movingPart.Name = "MovingPart";
	movingPart.Size = new Vector3(3, 3, 3);
	movingPart.Position = new Vector3(0, 10, -10);
	movingPart.BrickColor = new BrickColor("Bright red");
	movingPart.TopSurface = Enum.SurfaceType.Smooth;
	movingPart.BottomSurface = Enum.SurfaceType.Smooth;
	movingPart.CanCollide = false;
	movingPart.Anchored = true;
	movingPart.SetAttribute("Animated", true);
	movingPart.Parent = folder;

	print("Created test parts in workspace");
}

/**
 * System to handle player spawning and character events
 * @param world - The Matter world
 */
function playerEventSystem(world: World) {
	for (const player of Players.GetPlayers()) {
		// Character added
		for (const [eventNumber, character] of useEvent(player, "CharacterAdded")) {
			print(`[CharacterAdded] ${player.Name} spawned! Event #${eventNumber}`);

			const humanoidRootPart = (character as Model).WaitForChild("HumanoidRootPart") as BasePart;

			world.spawn(
				Character({ model: character as Model }),
				PlayerComponent({ player: player }),
				Health({ current: 100, max: 100 }),
			);

			// Teleport player near test parts
			if (humanoidRootPart) {
				humanoidRootPart.CFrame = new CFrame(0, 10, 10);
			}
		}

		// Character removing
		for (const [eventNumber, character] of useEvent(player, "CharacterRemoving")) {
			print(`[CharacterRemoving] ${player.Name}'s character is being removed! Event #${eventNumber}`);

			// Clean up entities
			for (const [entity, charComp, playerComp] of world.query(Character, PlayerComponent)) {
				if (playerComp.player === player) {
					world.despawn(entity);
				}
			}
		}

		// Chat events
		for (const [eventNumber, message] of useEvent(player, "Chatted")) {
			print(`[Chatted] ${player.Name} said: "${message}" (Event #${eventNumber})`);

			// Special commands
			if (message.lower() === "heal") {
				print("Healing all entities to full health!");
				for (const [entity, health] of world.query(Health)) {
					world.insert(entity,
						Health({ current: health.max, max: health.max }),
					);
				}
			} else if (message.lower() === "damage") {
				print("Damaging all entities!");
				for (const [entity, health] of world.query(Health)) {
					const newHealth = math.max(0, health.current - 25);
					world.insert(entity,
						Health({ current: newHealth, max: health.max }),
					);
				}
			}
		}
	}
}

/**
 * System to handle part interactions
 * @param world - The Matter world
 */
function partInteractionSystem(world: World) {
	const folder = Workspace.FindFirstChild("UseEventTestParts");
	if (!folder) return;

	for (const part of folder.GetChildren()) {
		if (!part.IsA("BasePart")) continue;

		// Touched events
		if (part.GetAttribute("Touchable") === true) {
			for (const [eventNumber, otherPart] of useEvent(part, "Touched")) {
				if (!otherPart.IsA("BasePart")) continue;

				const humanoid = otherPart.Parent?.FindFirstChildOfClass("Humanoid");
				if (humanoid) {
					print(`[Touched] ${part.Name} was touched by player! Event #${eventNumber}`);

					// Change part color when touched
					part.BrickColor = BrickColor.random();

					// Create temporary entity
					const entity = world.spawn(
						TouchedPart({
							part: part,
							touchedBy: otherPart as BasePart,
							time: os.clock(),
						}),
					);

					// Remove after 2 seconds
					task.wait(2);
					if (world.contains(entity)) {
						world.despawn(entity);
					}
				}
			}
		}

		// Click events
		const clickDetector = part.FindFirstChildOfClass("ClickDetector");
		if (clickDetector) {
			for (const [eventNumber, playerWhoClicked] of useEvent(clickDetector, "MouseClick")) {
				print(`[MouseClick] ${part.Name} was clicked by ${playerWhoClicked.Name}! Event #${eventNumber}`);

				// Change transparency
				part.Transparency = part.Transparency === 0 ? 0.5 : 0;

				// Create interactive entity
				const entity = world.spawn(
					InteractivePart({ part: part, color: part.Color }),
				);

				// Clean up after 1 second
				task.wait(1);
				if (world.contains(entity)) {
					world.despawn(entity);
				}
			}
		}

		// Property change events
		for (const [eventNumber] of useEvent(part, part.GetPropertyChangedSignal("Transparency"))) {
			print(`[PropertyChanged] ${part.Name} transparency changed to ${part.Transparency} (Event #${eventNumber})`);
		}

		for (const [eventNumber] of useEvent(part, part.GetPropertyChangedSignal("BrickColor"))) {
			print(`[PropertyChanged] ${part.Name} color changed to ${part.BrickColor.Name} (Event #${eventNumber})`);
		}
	}
}

/**
 * System to animate parts and trigger property changes
 * @param world - The Matter world
 */
function animationSystem(world: World) {
	const folder = Workspace.FindFirstChild("UseEventTestParts");
	if (!folder) return;

	const movingPart = folder.FindFirstChild("MovingPart") as BasePart;
	if (movingPart && movingPart.GetAttribute("Animated") === true) {
		const time = os.clock();

		// Animate position
		movingPart.Position = new Vector3(
			math.sin(time) * 10,
			10 + math.sin(time * 2) * 3,
			-10,
		);

		// Periodically change transparency (every 2 seconds)
		if (math.floor(time) % 2 === 0 && math.floor(time * 10) % 10 === 0) {
			movingPart.Transparency = math.random() * 0.8;
		}

		// Periodically change name (every 3 seconds)
		if (math.floor(time) % 3 === 0 && math.floor(time * 10) % 10 === 0) {
			const names = ["MovingPart", "AnimatedPart", "DynamicPart", "FloatingPart"];
			const randomName = names[math.floor(math.random() * names.size())];
			if (movingPart.Name !== randomName) {
				movingPart.Name = randomName;
			}
		}
	}
}

/**
 * System to display entity information
 * @param world - The Matter world
 */
function debugSystem(world: World) {
	let touchedCount = 0;
	let interactiveCount = 0;

	for (const [entity] of world.query(TouchedPart)) {
		touchedCount++;
	}

	for (const [entity] of world.query(InteractivePart)) {
		interactiveCount++;
	}

	if (touchedCount > 0 || interactiveCount > 0) {
		print(`[Debug] Active entities - Touched: ${touchedCount}, Interactive: ${interactiveCount}`);
	}
}

/**
 * Main setup function
 */
export function setupInteractiveExample() {
	print("Setting up interactive useEvent example...");

	// Create test environment
	createTestParts();

	// Create world and loop
	const world = new World();
	const loop = new Loop(world);

	// Schedule systems
	loop.scheduleSystem(playerEventSystem);
	loop.scheduleSystem(partInteractionSystem);
	loop.scheduleSystem(animationSystem);
	loop.scheduleSystem(debugSystem);

	// Start the loop
	loop.begin({
		default: RunService.Heartbeat,
	});

	print("Interactive example started!");
	print("Instructions:");
	print("- Walk into the colored parts to trigger touch events");
	print("- Click on parts to change their transparency");
	print("- Type 'heal' or 'damage' in chat to affect health components");
	print("- Watch the red floating part for property change events");

	// Return cleanup function
	return () => {
		print("Cleaning up interactive example...");
		const folder = Workspace.FindFirstChild("UseEventTestParts");
		if (folder) {
			folder.Destroy();
		}
	};
}

// Auto-run in Studio
if (game.GetService("RunService").IsStudio()) {
	setupInteractiveExample();
}