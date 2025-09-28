/**
 * useEvent Hook Example with Bevy Framework
 *
 * This example demonstrates how to use the useEvent hook within Bevy systems.
 * useEvent allows you to collect and iterate over events that fire during a frame.
 */

import { useEvent, component } from "@rbxts/matter";
import { RunService, Players, Workspace } from "@rbxts/services";
import { App } from "../../bevy_app";
import { MainScheduleLabel } from "../../bevy_app";
import { DefaultPlugins } from "../../bevy_internal";
import type { World } from "@rbxts/matter";

// Define components
const PlayerComponent = component<{ player: Player }>();
const Character = component<{ model: Model }>();
const TouchedPart = component<{ part: BasePart; touchedBy: BasePart }>();
const Health = component<{ current: number; max: number }>();
const Position = component<{ x: number; y: number; z: number }>();

// Custom event class for demonstration
class CustomHealthEvent {
	private connections = new Array<(oldHealth: number, newHealth: number) => void>();

	public Connect(callback: (oldHealth: number, newHealth: number) => void) {
		this.connections.push(callback);
		return {
			Disconnect: () => {
				const index = this.connections.indexOf(callback);
				if (index !== -1) {
					this.connections.remove(index);
				}
			},
		};
	}

	public Fire(oldHealth: number, newHealth: number) {
		for (const callback of this.connections) {
			callback(oldHealth, newHealth);
		}
	}
}

/**
 * Example 1: Listen to player character spawning
 * @param world - The Matter world
 */
function playerCharacterExample(world: World): void {
	// Iterate through all players and listen for CharacterAdded events
	for (const player of Players.GetPlayers()) {
		for (const [eventNumber, character] of useEvent(player, "CharacterAdded")) {
			print(`Player ${player.Name} spawned! Event #${eventNumber}`);

			// Spawn entities for the new character
			world.spawn(
				Character({ model: character as Model }),
				PlayerComponent({ player }),
				Health({ current: 100, max: 100 }),
			);
		}
	}
}

/**
 * Example 2: Listen to part touched events
 * @param world - The Matter world
 */
function partTouchedExample(world: World): void {
	// Find all parts with a "Touchable" tag
	const touchableParts = Workspace.GetDescendants().filter(
		(instance): instance is BasePart =>
			instance.IsA("BasePart") && instance.GetAttribute("Touchable") === true
	);

	for (const part of touchableParts) {
		// Listen to Touched events on each part
		for (const [eventNumber, otherPart] of useEvent(part, "Touched")) {
			if (!otherPart.IsA("BasePart")) continue;

			print(`Part ${part.Name} was touched by ${otherPart.Name}`);

			// Create a temporary entity to track the touch
			const entity = world.spawn(
				TouchedPart({
					part,
					touchedBy: otherPart as BasePart,
				}),
			);

			// Schedule removal after 1 second (using task.defer to avoid yield)
			task.defer(() => {
				task.wait(1);
				if (world.contains(entity)) {
					world.despawn(entity);
				}
			});
		}
	}
}

/**
 * Example 3: Listen to property changes
 * @param world - The Matter world
 */
function propertyChangeExample(world: World): void {
	const partsToWatch = Workspace.GetDescendants().filter(
		(instance): instance is BasePart => instance.IsA("BasePart")
	);

	let partIndex = 0;
	for (const part of partsToWatch) {
		if (partIndex >= 5) break; // Limit to first 5 parts for performance
		partIndex++;
		// Listen to Name property changes using GetPropertyChangedSignal
		for (const [eventNumber] of useEvent(part, part.GetPropertyChangedSignal("Name"))) {
			print(`Part name changed to: ${part.Name} (Event #${eventNumber})`);
		}

		// Listen to Transparency changes
		for (const [eventNumber] of useEvent(part, part.GetPropertyChangedSignal("Transparency"))) {
			print(`Part ${part.Name} transparency changed to: ${part.Transparency}`);
		}
	}
}

/**
 * Example 4: Using custom events
 * @param world - The Matter world
 */
function customEventExample(world: World): void {
	// Create a custom health event system
	const healthEvents = new Map<string, CustomHealthEvent>();

	// Create some test events
	const playerHealthEvent = new CustomHealthEvent();
	healthEvents.set("Player1", playerHealthEvent);

	// Since useEvent doesn't directly work with custom classes,
	// we'll demonstrate the pattern by manually handling the event
	let eventCount = 0;

	// Simulate health changes (this would normally be triggered by game logic)
	if (math.random() > 0.5) {
		const oldHealthValue = 100;
		const newHealthValue = 75;
		playerHealthEvent.Fire(oldHealthValue, newHealthValue);

		eventCount++;
		print(`Health changed from ${oldHealthValue} to ${newHealthValue} (Event #${eventCount})`);

		// Update health components in the world
		for (const [entity, health] of world.query(Health)) {
			if (health.current === oldHealthValue) {
				world.insert(
					entity,
					Health({ current: newHealthValue, max: health.max }),
				);
			}
		}
	}
}

/**
 * Example 5: Multiple event types on the same instance
 * @param world - The Matter world
 */
function multipleEventsExample(world: World): void {
	for (const player of Players.GetPlayers()) {
		// Listen to multiple different events on the same player

		// Character spawning
		for (const [_, character] of useEvent(player, "CharacterAdded")) {
			print(`${player.Name}'s character added`);
		}

		// Character removing
		for (const [_, character] of useEvent(player, "CharacterRemoving")) {
			print(`${player.Name}'s character removing`);

			// Clean up character entities
			for (const [entity, charComponent, playerComponent] of world.query(Character, PlayerComponent)) {
				if (playerComponent.player === player) {
					world.despawn(entity);
				}
			}
		}

		// Chatting
		for (const [_, message] of useEvent(player, "Chatted")) {
			print(`${player.Name} said: ${message}`);
		}
	}
}

/**
 * Combined system that runs all examples
 * @param world - The Matter world
 */
function useEventSystemsExample(world: World): void {
	// Run all example systems
	playerCharacterExample(world);
	partTouchedExample(world);
	propertyChangeExample(world);
	customEventExample(world);
	multipleEventsExample(world);
}

/**
 * Main function - creates and configures the Bevy app
 */
export function main(): App {
	print("[useEvent Example] 🚀 Creating App...");
	const app = App.create();

	// Add default plugins
	print("[useEvent Example] 📦 Adding DefaultPlugins...");
	app.addPlugins(...DefaultPlugins.create().build().getPlugins());
	print("[useEvent Example] ✅ DefaultPlugins added");

	// Add our useEvent system to the update schedule
	print("[useEvent Example] 🎮 Adding useEvent systems to UPDATE schedule...");
	app.addSystems(MainScheduleLabel.UPDATE, useEventSystemsExample);
	print("[useEvent Example] ✅ useEvent systems added");

	// Print usage instructions
	print("========================================");
	print("useEvent Hook Example - Bevy Framework");
	print("========================================");
	print("This example demonstrates:");
	print("  • Player character spawn events");
	print("  • Part touched events");
	print("  • Property change events");
	print("  • Custom event handling");
	print("  • Multiple event types on same instance");
	print("========================================");

	return app;
}

const app = main();
app.run();
