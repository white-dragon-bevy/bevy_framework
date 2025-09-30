import { component } from "@rbxts/matter";

/**
 * A marker component that indicates an entity should process input
 */
export const InputEnabled = component<{
	enabled: boolean;
}>("InputEnabled");
