/**
 * @fileoverview Ability systems for cooldowns and resource pools
 *
 * ## System Scheduling Order Control
 *
 * This module provides systems that can be configured with scheduling order API.
 * All systems support the full Bevy-style scheduling API through SystemConfigs.
 *
 * ### Available Scheduling APIs
 *
 * - `before(system | systemSet)` - Run before specified system/set
 * - `after(system | systemSet)` - Run after specified system/set
 * - `inSet(systemSet)` - Add to system set
 * - `runIf(condition)` - Conditional execution
 * - `chain()` - Execute systems in sequence
 *
 * ### Usage Examples
 *
 * ```typescript
 * import { createTickCooldownsSystem } from "./systems";
 * import { system } from "../bevy_ecs/schedule";
 * import { BuiltinSchedules } from "../bevy_app";
 *
 * // Example 1: Add system with ordering constraints
 * const tickCooldowns = createTickCooldownsSystem<MyAbility>(myAbilityType);
 * app.addSystems(
 *   BuiltinSchedules.PRE_UPDATE,
 *   system(tickCooldowns).after(inputSystem).before(gameLogicSystem)
 * );
 *
 * // Example 2: Add to system set
 * app.addSystems(
 *   BuiltinSchedules.PRE_UPDATE,
 *   system(tickCooldowns).inSet("AbilitySystem.TickCooldowns")
 * );
 *
 * // Example 3: Conditional execution
 * app.addSystems(
 *   BuiltinSchedules.UPDATE,
 *   system(tickCooldowns).runIf((world) => world.resources.get<GameState>()?.isActive ?? false)
 * );
 *
 * // Example 4: Chain multiple systems
 * import { chain } from "../bevy_ecs/schedule";
 * const regeneratePool = createRegeneratePoolSystem<ManaPool>((world) => world.resources.get<ManaPool>());
 * app.addSystems(
 *   BuiltinSchedules.UPDATE,
 *   chain(tickCooldowns, regeneratePool)
 * );
 * ```
 *
 * ### Rust Bevy Equivalent
 *
 * The TypeScript API mirrors Rust Bevy's scheduling system:
 *
 * ```rust
 * // Rust Bevy
 * app.add_systems(
 *   PreUpdate,
 *   tick_cooldowns::<MyAbility>
 *     .in_set(AbilitySystem::TickCooldowns)
 *     .after(input_system)
 *     .before(game_logic_system)
 * );
 * ```
 *
 * ### Implementation Details
 *
 * - Scheduling is handled by `Schedule` class (src/bevy_ecs/schedule/schedule.ts)
 * - System ordering uses topological sort with cycle detection
 * - Priority-based secondary ordering for systems without dependencies
 * - System sets support hierarchical dependencies
 */

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
 * The system processes CooldownState<A> and ChargeState<A> stored as **RESOURCES** in the world.
 *
 * ## Resource-Only Support
 *
 * **IMPORTANT**: This system only processes cooldowns and charges stored as **resources**.
 * Component-based cooldowns are not supported due to Matter ECS limitations with generic components.
 *
 * ### Why Component Support is Not Available
 *
 * - Rust Bevy: `Query<&mut CooldownState<A>>` works because Bevy's type system supports generic components
 * - Matter ECS: Requires concrete component constructors, not generic types like `CooldownState<A>`
 * - TypeDescriptor cannot be mapped to Matter component constructors
 *
 * ### How to Use This System
 *
 * 1. Store your ability states as **resources**, not components:
 *    ```typescript
 *    // ✅ Correct: Store as resource
 *    const cooldowns = new CooldownState<MyAbility>();
 *    const typeDescriptor = getTypeDescriptor(...);
 *    world.resources.setResourceByTypeDescriptor(typeDescriptor, cooldowns);
 *
 *    // ❌ Wrong: Don't store as component (won't be ticked)
 *    world.insert(entity, cooldowns);
 *    ```
 *
 * 2. Create and register the system:
 *    ```typescript
 *    import { system } from "../bevy_ecs/schedule";
 *
 *    const tickCooldowns = createTickCooldownsSystem<MyAbility>(myAbilityType);
 *
 *    // Add with ordering constraints
 *    app.addSystems(
 *      BuiltinSchedules.PRE_UPDATE,
 *      system(tickCooldowns)
 *        .after(inputSystem)
 *        .before(gameLogicSystem)
 *        .inSet("AbilitySystem.TickCooldowns")
 *    );
 *    ```
 *
 * ### Alternative for Per-Entity Cooldowns
 *
 * If you need per-entity cooldowns, create a concrete component class:
 *
 * ```typescript
 * @Component("PlayerAbilityCooldowns")
 * class PlayerAbilityCooldowns {
 *   cooldowns: CooldownState<PlayerAbility>;
 *   charges: ChargeState<PlayerAbility>;
 * }
 *
 * // Then create a custom system to query this specific component
 * function tickPlayerAbilityCooldowns(world: BevyWorld, context: Context) {
 *   const deltaTime = world.resources.getResource<VirtualTimeResource>()?.value.getDelta();
 *   if (!deltaTime) return;
 *
 *   for (const [entity, playerCooldowns] of world.query(PlayerAbilityCooldowns)) {
 *     playerCooldowns.cooldowns.tick(deltaTime, playerCooldowns.charges);
 *   }
 * }
 * ```
 *
 * ## Rust Bevy Comparison
 *
 * Rust version supports both:
 * ```rust
 * // Rust: Supports both resources and components
 * pub fn tick_cooldowns<A: Abilitylike>(
 *     mut query: Query<(&mut CooldownState<A>, Option<&mut ChargeState<A>>)>,  // Components
 *     cooldowns_res: Option<ResMut<CooldownState<A>>>,  // Resources
 *     charges_res: Option<ResMut<ChargeState<A>>>,
 *     time: Res<Time>,
 * ) { ... }
 * ```
 *
 * TypeScript version supports resources only:
 * ```typescript
 * // TypeScript: Resources only
 * export function createTickCooldownsSystem<A extends Abilitylike>(
 *     typeDescriptor: TypeDescriptor,
 * ): (world: BevyWorld, context: Context) => void
 * ```
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
		// NOTE: This only processes RESOURCE form, not component form
		// See function documentation for details on why component support is not available
		const cooldownsResource = world.resources.getResourceByTypeDescriptor<CooldownState<A>>(typeDescriptor);
		if (cooldownsResource !== undefined) {
			// Try to get charges resource (it might not exist)
			const chargesResource = world.resources.getResourceByTypeDescriptor<ChargeState<A>>(typeDescriptor);
			cooldownsResource.tick(deltaTime, chargesResource);
		}
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
 * ## Scheduling Example
 *
 * ```typescript
 * import { system, chain } from "../bevy_ecs/schedule";
 *
 * const regenerateMana = createRegeneratePoolSystem<ManaPool>(
 *   (world) => world.resources.get<ManaPool>()
 * );
 *
 * // Add with conditional execution
 * app.addSystems(
 *   BuiltinSchedules.UPDATE,
 *   system(regenerateMana)
 *     .runIf((world) => world.resources.get<GameState>()?.isPlaying ?? false)
 *     .after(cooldownSystem)
 * );
 *
 * // Or chain with other systems
 * app.addSystems(
 *   BuiltinSchedules.UPDATE,
 *   chain(regenerateMana, updateUI)
 * );
 * ```
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
 * Generic system that regenerates all regenerating resource pools
 *
 * This system iterates over all resources and regenerates those that implement RegeneratingPool.
 * It uses duck typing to identify pools and regenerate them with the current delta time.
 *
 * ## Implementation Notes
 *
 * - Matches Rust Bevy's `regenerate_resource_pool<P: RegeneratingPool>` behavior
 * - Automatically detects and regenerates any resource with a `regenerate` method
 * - Uses VirtualTimeResource for delta time
 *
 * ## Scheduling Example
 *
 * ```typescript
 * import { system } from "../bevy_ecs/schedule";
 *
 * // Add to update schedule
 * app.addSystems(
 *   BuiltinSchedules.UPDATE,
 *   system(regenerateResourcePoolSystem).after(tickCooldownsSystem)
 * );
 * ```
 *
 * ## Type-Specific Alternative
 *
 * For better performance and type safety, use createRegeneratePoolSystem():
 *
 * ```typescript
 * const regenerateLifePool = createRegeneratePoolSystem<LifePool>(
 *   (world) => world.resources.getResource<LifePool>()
 * );
 * app.addSystems(BuiltinSchedules.UPDATE, regenerateLifePool);
 * ```
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

	// Iterate over all resources and regenerate those that implement RegeneratingPool
	const allResources = world.resources.getAllResources();
	for (const [resourceId, resource] of allResources) {
		// Check if this resource has a regenerate method (duck typing for RegeneratingPool)
		if (typeIs(resource, "table") && "regenerate" in resource && typeIs(resource.regenerate, "function")) {
			const pool = resource as unknown as RegeneratingPool;
			pool.regenerate(deltaTime);
		}
	}
}