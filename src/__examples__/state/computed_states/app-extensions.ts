/**
 * app-extensions.ts - Extensions to App class for state management
 * Adds convenience methods for state initialization and computed states
 */

import { App } from "../../../bevy_app/app";
import { States } from "../../../bevy_state/states";
import { ComputedStates } from "../../../bevy_state/computed-states";
import { StatesPlugin, ComputedStatesPlugin } from "../../../bevy_state/plugin";
import { StateConstructor, DefaultStateFn } from "../../../bevy_state/resources";
import type { ScheduleLabel } from "../../../bevy_ecs/schedule/types";
import type { IntoSystemConfigs } from "../../../bevy_ecs/schedule";
import { OnEnter, OnExit } from "../../../bevy_state/transitions";

/**
 * Extended App interface with state management methods
 */
export interface AppWithState extends App {
	/**
	 * Initialize a state type
	 * @param stateType - The state constructor
	 * @param defaultState - Function returning the default state
	 */
	initState<S extends States>(
		stateType: StateConstructor<S>,
		defaultState: DefaultStateFn<S>,
	): AppWithState;

	/**
	 * Add a computed state type
	 * @param sourceType - The source state constructor
	 * @param computedType - The computed state constructor
	 */
	addComputedState<TSource extends States, TComputed extends ComputedStates<TSource>>(
		sourceType: StateConstructor<TSource>,
		computedType: new () => TComputed,
	): AppWithState;

	/**
	 * Add systems to run when entering a state
	 * @param state - The state to enter
	 * @param systems - Systems to run
	 */
	addSystemsOnEnter<S extends States>(
		state: S,
		...systems: IntoSystemConfigs[]
	): AppWithState;

	/**
	 * Add systems to run when exiting a state
	 * @param state - The state to exit
	 * @param systems - Systems to run
	 */
	addSystemsOnExit<S extends States>(state: S, ...systems: IntoSystemConfigs[]): AppWithState;

	/**
	 * Add systems with state condition
	 * @param schedule - The schedule to add to
	 * @param state - The state condition
	 * @param systems - Systems to run
	 */
	addSystemsInState<S extends States>(
		schedule: ScheduleLabel,
		state: S,
		...systems: IntoSystemConfigs[]
	): AppWithState;
}

/**
 * Extend the App class with state management methods
 * @param app - The app instance to extend
 * @returns The extended app
 */
export function extendAppWithState(app: App): AppWithState {
	const extendedApp = app as AppWithState;

	// Store state types for run conditions
	const stateTypes = new Map<string, StateConstructor<States>>();

	// Define as a regular function to handle Lua method call syntax correctly
	(extendedApp as any)["initState"] = function <S extends States>(
		this: unknown,
		stateTypeOrSelf: unknown,
		defaultStateOrStateType?: unknown,
		defaultStateFn?: unknown,
	): AppWithState {
		// Handle both function and method call styles
		let stateType: StateConstructor<S>;
		let defaultState: DefaultStateFn<S>;

		if (defaultStateFn !== undefined) {
			// Called as method with self (app:initState)
			stateType = defaultStateOrStateType as StateConstructor<S>;
			defaultState = defaultStateFn as DefaultStateFn<S>;
		} else if (defaultStateOrStateType !== undefined) {
			// Called as function (app.initState)
			stateType = stateTypeOrSelf as StateConstructor<S>;
			defaultState = defaultStateOrStateType as DefaultStateFn<S>;
		} else {
			error("initState: Invalid arguments");
		}

		// Store the state type for later use
		const typeName = (stateType as unknown as { name?: string }).name || "State";
		stateTypes.set(typeName, stateType as StateConstructor<States>);

		// Add the state plugin
		if (!typeIs(defaultState, "function")) {
			error(`initState: defaultState must be a function, got ${typeOf(defaultState)}`);
		}
		extendedApp.addPlugin(
			new StatesPlugin({
				stateType,
				defaultState,
				initOnStartup: true,
			}),
		);

		return extendedApp;
	};

	// Similar handling for addComputedState
	(extendedApp as any)["addComputedState"] = function <
		TSource extends States,
		TComputed extends ComputedStates<TSource>,
	>(
		this: unknown,
		sourceTypeOrSelf: unknown,
		computedTypeOrSource?: unknown,
		computedTypeFn?: unknown,
	): AppWithState {
		let sourceType: StateConstructor<TSource>;
		let computedType: new () => TComputed;

		if (computedTypeFn !== undefined) {
			// Method call
			sourceType = computedTypeOrSource as StateConstructor<TSource>;
			computedType = computedTypeFn as new () => TComputed;
		} else if (computedTypeOrSource !== undefined) {
			// Function call
			sourceType = sourceTypeOrSelf as StateConstructor<TSource>;
			computedType = computedTypeOrSource as new () => TComputed;
		} else {
			error("addComputedState: Invalid arguments");
		}

		extendedApp.addPlugin(new ComputedStatesPlugin(sourceType, computedType));
		return extendedApp;
	};

	// Similar for other methods
	(extendedApp as any)["addSystemsOnEnter"] = function <S extends States>(
		this: unknown,
		...args: unknown[]
	): AppWithState {
		let state: S;
		let systems: IntoSystemConfigs[];

		if (typeIs(args[0], "table") && (args[0] as unknown as States).getStateId) {
			// Function call: app.addSystemsOnEnter(state, ...systems)
			state = args[0] as S;
			const systemsArray: IntoSystemConfigs[] = [];
			for (let i = 1; i < args.size(); i++) {
				systemsArray.push(args[i] as IntoSystemConfigs);
			}
			systems = systemsArray;
		} else if (typeIs(args[1], "table") && (args[1] as unknown as States).getStateId) {
			// Method call: app:addSystemsOnEnter(state, ...systems)
			state = args[1] as S;
			const systemsArray: IntoSystemConfigs[] = [];
			for (let i = 2; i < args.size(); i++) {
				systemsArray.push(args[i] as IntoSystemConfigs);
			}
			systems = systemsArray;
		} else {
			error("addSystemsOnEnter: Invalid arguments");
		}

		const schedule = OnEnter(state);
		extendedApp.addSystems(schedule, ...systems);
		return extendedApp;
	};

	(extendedApp as any)["addSystemsOnExit"] = function <S extends States>(
		this: unknown,
		...args: unknown[]
	): AppWithState {
		let state: S;
		let systems: IntoSystemConfigs[];

		if (typeIs(args[0], "table") && (args[0] as unknown as States).getStateId) {
			state = args[0] as S;
			const systemsArray: IntoSystemConfigs[] = [];
			for (let i = 1; i < args.size(); i++) {
				systemsArray.push(args[i] as IntoSystemConfigs);
			}
			systems = systemsArray;
		} else if (typeIs(args[1], "table") && (args[1] as unknown as States).getStateId) {
			state = args[1] as S;
			const systemsArray: IntoSystemConfigs[] = [];
			for (let i = 2; i < args.size(); i++) {
				systemsArray.push(args[i] as IntoSystemConfigs);
			}
			systems = systemsArray;
		} else {
			error("addSystemsOnExit: Invalid arguments");
		}

		const schedule = OnExit(state);
		extendedApp.addSystems(schedule, ...systems);
		return extendedApp;
	};

	(extendedApp as any)["addSystemsInState"] = function <S extends States>(
		this: unknown,
		...args: unknown[]
	): AppWithState {
		let schedule: ScheduleLabel;
		let state: S;
		let systems: IntoSystemConfigs[];

		// Detect call style and extract arguments
		if (typeIs(args[0], "string")) {
			// Function call: app.addSystemsInState(schedule, state, ...systems)
			schedule = args[0] as ScheduleLabel;
			state = args[1] as S;
			const systemsArray: IntoSystemConfigs[] = [];
			for (let i = 2; i < args.size(); i++) {
				systemsArray.push(args[i] as IntoSystemConfigs);
			}
			systems = systemsArray;
		} else if (typeIs(args[1], "string")) {
			// Method call: app:addSystemsInState(schedule, state, ...systems)
			schedule = args[1] as ScheduleLabel;
			state = args[2] as S;
			const systemsArray: IntoSystemConfigs[] = [];
			for (let i = 3; i < args.size(); i++) {
				systemsArray.push(args[i] as IntoSystemConfigs);
			}
			systems = systemsArray;
		} else {
			error("addSystemsInState: Invalid arguments");
		}

		const runCondition = createInStateCondition(state, stateTypes);

		for (const system of systems) {
			if (typeIs(system, "function")) {
				const wrappedSystem = ((world, context) => {
					if (runCondition(world)) {
						(system as SystemFunction)(world, context);
					}
				}) as IntoSystemConfigs;
				extendedApp.addSystems(schedule, wrappedSystem);
			} else {
				extendedApp.addSystems(schedule, system);
			}
		}

		return extendedApp;
	};

	return extendedApp;
}

/**
 * Create a condition function that checks if we're in a specific state
 * @param state - The state to check for
 * @param stateTypes - Map of state type names to constructors
 * @returns A condition function
 */
function createInStateCondition<S extends States>(
	state: S,
	stateTypes: Map<string, StateConstructor<States>>,
): (world: World) => boolean {
	return (world: World) => {
		// Get the resource manager from the world
		const worldWithRM = world as unknown as Record<string, unknown>;
		const resourceManager = worldWithRM["stateResourceManager"];
		if (!resourceManager) {
			return false;
		}

		// Check if the current state matches
		const currentStateResource = (resourceManager as ResourceManager).getResource(State<S>);
		if (!currentStateResource) {
			return false;
		}

		const currentState = currentStateResource.get();
		return currentState && currentState.equals(state);
	};
}

// Re-export necessary imports for convenience
export { OnEnter, OnExit } from "../../../bevy_state/transitions";
import type { World } from "@rbxts/matter";
import { State } from "../../../bevy_state/resources";
import type { ResourceManager } from "../../../bevy_ecs/resource";
import type { SystemFunction } from "../../../bevy_ecs/schedule/types";