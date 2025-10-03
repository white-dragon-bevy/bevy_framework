import { Actionlike } from "../actionlike";
import { InputMap } from "../input-map/input-map";
import { ActionState } from "../action-state/action-state";
import { BevyWorld } from "../../bevy_ecs";
import { component } from "@rbxts/matter";

/**
 * Component definitions cache to avoid recreation
 */
const componentCache = new Map<string, ComponentDefinition<any>>();

/**
 * Component data structure for input system
 */
export interface InputSystemData<A extends Actionlike> {
	inputMap?: InputMap<A>;
	actionState?: ActionState<A>;
	enabled: boolean;
}

/**
 * Component definition for a specific action type
 */
export interface ComponentDefinition<A extends Actionlike> {
	/** The Matter component */
	component: ReturnType<typeof component<InputSystemData<A>>>;
	/** The action type name */
	actionTypeName: string;
	/** Helper to spawn entity with components */
	spawn: (world: BevyWorld, inputMap: InputMap<A>, actionState?: ActionState<A>) => number;
	/** Helper to query entities */
	query: (world: BevyWorld) => IterableFunction<LuaTuple<[number, InputSystemData<A>]>>;
	/** Helper to get component from entity */
	get: (world: BevyWorld, entityId: number) => InputSystemData<A> | undefined;
	/** Helper to insert component to entity */
	insert: (world: BevyWorld, entityId: number, inputMap: InputMap<A>, actionState?: ActionState<A>) => void;
	/** Helper to remove component from entity */
	remove: (world: BevyWorld, entityId: number) => void;
}

/**
 * Creates component definitions for a specific Action type
 *
 * This function dynamically generates Matter components that are specific to
 * each Action type, allowing us to use ECS queries instead of a manager resource.
 *
 * @param actionTypeName - The name of the action type (e.g., "PlayerAction")
 * @returns Component definition with helper methods
 */
export function createActionComponents<A extends Actionlike>(
	actionTypeName: string
): ComponentDefinition<A> {
	const cacheKey = `components_${actionTypeName}`;

	// Check cache to avoid recreation
	const cached = componentCache.get(cacheKey);
	if (cached) {
		return cached as ComponentDefinition<A>;
	}

	// Create Matter component for this action type
	const InputSystemComponent = component<InputSystemData<A>>(
		`InputSystem_${actionTypeName}`,
		{
			inputMap: undefined,
			actionState: undefined,
			enabled: true,
		}
	);

	// Create component definition
	const definition: ComponentDefinition<A> = {
		component: InputSystemComponent,
		actionTypeName,

		spawn: (world: BevyWorld, inputMap: InputMap<A>, actionState?: ActionState<A>): number => {
			const entityId = world.spawn();
			world.insert(entityId as any, InputSystemComponent({
				inputMap,
				actionState: actionState ?? new ActionState<A>(),
				enabled: true,
			}));
			return entityId;
		},

		query: (world: BevyWorld) => {
			return world.query(InputSystemComponent);
		},

		get: (world: BevyWorld, entityId: number): InputSystemData<A> | undefined => {
			const result = world.get(entityId, InputSystemComponent);
			return result ? result[0] : undefined;
		},

		insert: (world: BevyWorld, entityId: number, inputMap: InputMap<A>, actionState?: ActionState<A>): void => {
			world.insert(entityId as any, InputSystemComponent({
				inputMap,
				actionState: actionState ?? new ActionState<A>(),
				enabled: true,
			}));
		},

		remove: (world: BevyWorld, entityId: number): void => {
			world.remove(entityId as any, InputSystemComponent);
		},
	};

	// Cache the definition
	componentCache.set(cacheKey, definition as ComponentDefinition<any>);

	return definition;
}

/**
 * Clear the component cache (useful for testing)
 */
export function clearComponentCache(): void {
	componentCache.clear();
}

/**
 * Get the size of the component cache
 */
export function getComponentCacheSize(): number {
	return componentCache.size();
}
