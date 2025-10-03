import { Modding } from "@flamework/core";

import { App, BasePlugin, BuiltinSchedules } from "../bevy_app";
import { getTypeDescriptor, TypeDescriptor } from "../bevy_core";

import type { Abilitylike } from "./abilitylike";
import { createTickCooldownsSystem } from "./systems";

/**
 * Plugin that adds ability management systems for ability type A
 *
 * This plugin:
 * - Registers the tick_cooldowns system to PreUpdate
 * - Can be configured to register regenerate_resource_pool systems
 *
 * ## Resource-Only Support
 *
 * **IMPORTANT**: This plugin only supports ability states stored as **RESOURCES**, not components.
 *
 * ### Usage Example
 *
 * ```typescript
 * import { AbilityPlugin } from "@rbxts/leafwing_abilities";
 * import { App } from "@rbxts/bevy_app";
 * import { getTypeDescriptor } from "@rbxts/bevy_core";
 * import { CooldownState, ChargeState } from "@rbxts/leafwing_abilities";
 *
 * // 1. Define your ability enum
 * enum PlayerAbility {
 *   Jump,
 *   Dash,
 *   Attack,
 * }
 *
 * // 2. Add the plugin to your app
 * const app = new App();
 * app.addPlugin(AbilityPlugin.create<PlayerAbility>());
 *
 * // 3. Store ability states as resources (not components!)
 * const typeDescriptor = getTypeDescriptor(...);
 * const cooldowns = new CooldownState<PlayerAbility>();
 * const charges = new ChargeState<PlayerAbility>();
 *
 * app.world.resources.setResourceByTypeDescriptor(typeDescriptor, cooldowns);
 * app.world.resources.setResourceByTypeDescriptor(typeDescriptor, charges);
 * ```
 *
 * ### Why Not Component Support?
 *
 * Matter ECS requires concrete component constructors for queries, but `CooldownState<A>` is a
 * generic type. TypeDescriptor cannot be mapped to Matter component constructors.
 *
 * For per-entity cooldowns, see the "Alternative for Per-Entity Cooldowns" section in
 * `createTickCooldownsSystem` documentation.
 *
 * ## Rust Bevy Comparison
 *
 * - **Rust Bevy**: Supports both resources and components
 * - **TypeScript/Matter**: Supports resources only (technical limitation)
 */
export class AbilityPlugin<A extends Abilitylike> extends BasePlugin {
	private abilityTypeDescriptor!: TypeDescriptor;

	/**
	 * Creates a new ability plugin instance using the static factory method
	 *
	 * **Note**: @claudecode, @cursor, this is a macro method. All Modding.* parameters are automatically injected.
	 *
	 * @metadata macro
	 * @param id - Type identifier (automatically injected by macro)
	 * @param text - Type text (automatically injected by macro)
	 * @returns A new AbilityPlugin instance
	 */
	static create<A extends Abilitylike>(
		id?: Modding.Generic<A, "id">,
		text?: Modding.Generic<A, "text">,
	): AbilityPlugin<A> {
		// Get TypeDescriptor for the ability type
		const typeDescriptor = getTypeDescriptor(id, text);
		assert(
			typeDescriptor,
			"Failed to get TypeDescriptor for AbilityPlugin: type descriptor is required for plugin initialization",
		);

		// Create instance
		const plugin = new AbilityPlugin<A>();
		plugin.abilityTypeDescriptor = typeDescriptor;

		return plugin;
	}

	/**
	 * Private constructor (use static create() method instead)
	 */
	private constructor() {
		super();
	}

	/**
	 * Builds the plugin, registering systems
	 *
	 * @param app - The application instance
	 */
	build(app: App): void {
		// Create a type-specific tick cooldowns system for this ability type
		// This system will query for CooldownState<A> and ChargeState<A> resources
		// using the type descriptor stored in this plugin instance
		const tickCooldownsSystemForType = createTickCooldownsSystem<A>(this.abilityTypeDescriptor);

		// Register the tick_cooldowns system to PreUpdate schedule
		// This ensures cooldowns and charges are updated before ability systems run
		app.addSystems(BuiltinSchedules.PRE_UPDATE, tickCooldownsSystemForType);

		print(`[${this.name()}] Plugin initialized with type-specific tick cooldowns system`);
	}

	/**
	 * Gets the plugin name
	 *
	 * @returns The plugin name including the ability type
	 */
	name(): string {
		return `AbilityPlugin<${this.abilityTypeDescriptor.text}>`;
	}

	/**
	 * Determines if this plugin is unique
	 *
	 * @returns False, allowing multiple instances for different ability types
	 */
	isUnique(): boolean {
		return false; // Allow multiple instances for different ability types
	}

	/**
	 * Gets the type descriptor for the ability type
	 *
	 * @returns The type descriptor
	 */
	getTypeDescriptor(): TypeDescriptor {
		return this.abilityTypeDescriptor;
	}
}