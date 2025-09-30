import { component } from "@rbxts/matter";

/**
 * A marker component that indicates an entity represents the local player
 */
export const LocalPlayer = component<{
	playerId?: number;
}>("LocalPlayer");
