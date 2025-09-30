import { BevyWorld, Context } from "../bevy_ecs";
import { TypeDescriptor } from "../bevy_core";
import { VirtualTimeResource } from "../bevy_time";

import type { Abilitylike } from "./abilitylike";
import type { ChargeState } from "./charges";
import type { CooldownState } from "./cooldown";
import type { RegeneratingPool } from "./pool";

/**
 * Creates a system that ticks cooldowns and charges for a specific ability type
 *
 * This factory function creates a system bound to a specific ability type identified by its TypeDescriptor.
 * The system will look for CooldownState<A> resources in the world and tick them.
 *
 * @param typeDescriptor - The type descriptor for the ability type A
 * @returns A system function that ticks cooldowns for the specific ability type
 */
export function createTickCooldownsSystem<A extends Abilitylike>(
	typeDescriptor: TypeDescriptor,
): (world: BevyWorld, context: Context) => void {
	return (world: BevyWorld, context: Context): void => {
		// Get delta time from VirtualTimeResource
		const timeResource = world.resources.getResource<VirtualTimeResource>();
		if (!timeResource) {
			return;
		}

		const deltaTime = timeResource.value.getDelta();

		// Query for CooldownState resource for this specific ability type
		const cooldownsResource = world.resources.getResourceByTypeDescriptor<CooldownState<A>>(typeDescriptor);
		if (cooldownsResource !== undefined) {
			// Try to get charges resource (it might not exist)
			const chargesResource = world.resources.getResourceByTypeDescriptor<ChargeState<A>>(typeDescriptor);
			cooldownsResource.tick(deltaTime, chargesResource);
		}

		// Note: If you need to tick cooldowns stored as components on entities,
		// you would need to provide component constructors and query them here.
		// Example pattern:
		//
		// for (const [entityId, cooldownComponent] of world.query(cooldownStateComponent)) {
		//     const cooldowns = cooldownComponent as unknown as CooldownState<A>;
		//     const charges = ... // get corresponding charges if they exist
		//     cooldowns.tick(deltaTime, charges);
		// }
	};
}

/**
 * Generic tick cooldowns system (for backward compatibility)
 *
 * This is a no-op system that serves as a placeholder. For actual functionality,
 * use createTickCooldownsSystem() with a specific TypeDescriptor, or use AbilityPlugin
 * which automatically creates the type-specific system.
 *
 * @param world - The ECS world
 * @param context - The system context
 */
export function tickCooldownsSystem(world: BevyWorld, context: Context): void {
	// This is a placeholder. The actual implementation should be created per-type
	// using createTickCooldownsSystem(typeDescriptor).
	//
	// If you see this warning, make sure you're using AbilityPlugin.create<YourAbilityType>()
	// or manually creating type-specific systems with createTickCooldownsSystem().
}

/**
 * Creates a regenerate pool system for a specific pool type
 *
 * This is a factory function that creates a system bound to a specific regenerating pool type.
 *
 * @param getPool - A function to retrieve the pool from the world
 * @returns A system function that regenerates the pool
 */
export function createRegeneratePoolSystem<P extends RegeneratingPool>(
	getPool: (world: BevyWorld) => P | undefined,
): (world: BevyWorld, context: Context) => void {
	return (world: BevyWorld, context: Context): void => {
		// Get delta time from VirtualTimeResource
		const timeResource = world.resources.getResource<VirtualTimeResource>();
		if (!timeResource) {
			return;
		}

		const deltaTime = timeResource.value.getDelta();

		// Get the pool using the provided getter
		const pool = getPool(world);
		if (pool !== undefined) {
			pool.regenerate(deltaTime);
		}
	};
}

/**
 * System that regenerates a specific resource pool
 *
 * This is a simplified version that assumes the pool is stored as a resource.
 * For type-specific behavior, use createRegeneratePoolSystem() instead.
 *
 * @param world - The ECS world
 * @param context - The system context
 */
export function regenerateResourcePoolSystem(world: BevyWorld, context: Context): void {
	// Get delta time from VirtualTimeResource
	const timeResource = world.resources.getResource<VirtualTimeResource>();
	if (!timeResource) {
		return;
	}

	const deltaTime = timeResource.value.getDelta();

	// Note: This is a generic placeholder. For production use, create type-specific
	// systems using createRegeneratePoolSystem() with appropriate type descriptors.
	//
	// Example:
	// const regenerateLifePool = createRegeneratePoolSystem<LifePool>(
	//     (world) => world.resources.getResource<LifePool>()
	// );
	// app.addSystems(BuiltinSchedules.UPDATE, regenerateLifePool);
}