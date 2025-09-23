import { World } from "@rbxts/matter";
import { Context } from "./types";
import { EventManager } from "./events";
import { Resource, ResourceConstructor, ResourceManager } from "./resource";
import { CommandBuffer } from "./command-buffer";

export function createContext(
	world: World,
	options: {
		events: EventManager;
	},
): Context {
	// setups
	const resources = new ResourceManager();
	const commands = new CommandBuffer();

	// shortcuts
	function getResource<T extends Resource>(resourceType: ResourceConstructor<T>): T | undefined {
		return resources.getResource(resourceType);
	}

	const result = {
		deltaTime: 0,
		resources,
		commands,
		getResource,
	};

	return result;
}
