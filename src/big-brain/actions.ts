/**
 * Actions define what entities actually DO in response to scores.
 * This module includes ActionBuilder interface and Composite Actions.
 */

import { World, component } from "@rbxts/matter";
import type { AnyEntity, Component } from "@rbxts/matter";
import type { AppContext } from "../bevy_app/context";
import { Actor } from "./scorers";

// Re-export Actor for use in other modules
export { Actor };

/**
 * ActionState represents the current execution state of an Action
 * Action systems must handle all these states appropriately
 */
export enum ActionState {
	/** Initial state, no action performed */
	Init = "Init",
	/** Action requested, system should start ASAP */
	Requested = "Requested",
	/** Action is currently executing */
	Executing = "Executing",
	/** Action has been cancelled, system must cleanup and set Success/Failure */
	Cancelled = "Cancelled",
	/** Action completed successfully */
	Success = "Success",
	/** Action failed */
	Failure = "Failure",
}

/**
 * Component that holds the current action state
 */
export const ActionStateComponent = component<{
	state: ActionState;
}>("ActionState");
export type ActionStateComponent = ReturnType<typeof ActionStateComponent>;

/**
 * Trait/Interface that ActionBuilders must implement
 */
export interface ActionBuilder {
	/**
	 * Build the action entity and attach necessary components
	 * @param world - ECS world
	 * @param actionEntityId - The action entity ID
	 * @param actorEntityId - The actor entity ID
	 */
	build(world: World, actionEntityId: AnyEntity, actorEntityId: AnyEntity): void;

	/**
	 * Optional label for logging and debugging
	 */
	label?(): string;
}

/**
 * Spawn a new action entity
 * @param builder - Action builder
 * @param world - ECS world
 * @param actorEntityId - Actor entity ID
 * @returns Action entity ID
 */
export function spawnAction(builder: ActionBuilder, world: World, actorEntityId: AnyEntity): AnyEntity {
	const actionEntityId = world.spawn(
		ActionStateComponent({
			state: ActionState.Init,
		}),
		Actor({ entityId: actorEntityId }),
	);

	// Build the action
	builder.build(world, actionEntityId, actorEntityId);

	return actionEntityId;
}

/**
 * Get action state from entity
 */
export function getActionState(world: World, entityId: AnyEntity): ActionState | undefined {
	const component = world.get(entityId, ActionStateComponent);
	return component?.state;
}

/**
 * Set action state for entity
 */
export function setActionState(world: World, entityId: AnyEntity, state: ActionState): void {
	world.insert(entityId, ActionStateComponent({ state }));
}

// ============================================================================
// Composite Actions
// ============================================================================

/**
 * Steps - Execute actions sequentially
 * Continues as long as each step succeeds
 */
export const Steps = component<{
	readonly builders: ReadonlyArray<ActionBuilder>;
	activeStep: number;
	activeActionId?: AnyEntity;
}>("Steps");
export type Steps = ReturnType<typeof Steps>;

/**
 * Builder for Steps composite action
 */
export class StepsBuilder implements ActionBuilder {
	private stepBuilders: ActionBuilder[] = [];
	private labelText?: string;

	/**
	 * Add a step to execute
	 */
	step(action: ActionBuilder): this {
		this.stepBuilders.push(action);
		return this;
	}

	/**
	 * Set a label for this action
	 */
	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, actionEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		// Spawn first step
		let firstStepId: AnyEntity | undefined = undefined;
		if (this.stepBuilders.size() > 0) {
			firstStepId = spawnAction(this.stepBuilders[0], world, actorEntityId);
		}

		world.insert(
			actionEntityId,
			Steps({
				builders: this.stepBuilders,
				activeStep: 0,
				activeActionId: firstStepId,
			}),
		);
	}

	label(): string {
		return this.labelText ?? "Steps";
	}
}

/**
 * System to execute Steps composite actions
 */
export function stepsSystem(world: World, context: AppContext): void {
	for (const [entityId, steps, actionState, actor] of world.query(Steps, ActionStateComponent, Actor)) {
		const currentState = actionState.state;

		if (currentState === ActionState.Requested) {
			// Begin execution
			if (steps.activeActionId !== undefined) {
				setActionState(world, steps.activeActionId, ActionState.Requested);
			}
			setActionState(world, entityId, ActionState.Executing);
		} else if (currentState === ActionState.Executing) {
			if (steps.activeActionId === undefined) {
				setActionState(world, entityId, ActionState.Success);
				continue;
			}

			const stepState = getActionState(world, steps.activeActionId);

			if (stepState === ActionState.Init) {
				setActionState(world, steps.activeActionId, ActionState.Requested);
			} else if (stepState === ActionState.Failure) {
				// Step failed, fail entire sequence
				world.despawn(steps.activeActionId);
				setActionState(world, entityId, ActionState.Failure);
			} else if (stepState === ActionState.Success) {
				// Step succeeded
				world.despawn(steps.activeActionId);

				const nextStep = steps.activeStep + 1;
				if (nextStep >= steps.builders.size()) {
					// All steps completed
					setActionState(world, entityId, ActionState.Success);
				} else {
					// Spawn next step
					const nextActionId = spawnAction(steps.builders[nextStep], world, actor.entityId);
					world.insert(
						entityId,
						Steps({
							builders: steps.builders,
							activeStep: nextStep,
							activeActionId: nextActionId,
						}),
					);
				}
			}
		} else if (currentState === ActionState.Cancelled) {
			// Cancel active step
			if (steps.activeActionId !== undefined) {
				const stepState = getActionState(world, steps.activeActionId);
				if (
					stepState === ActionState.Requested ||
					stepState === ActionState.Executing ||
					stepState === ActionState.Init
				) {
					setActionState(world, steps.activeActionId, ActionState.Cancelled);
				} else if (stepState === ActionState.Success || stepState === ActionState.Failure) {
					setActionState(world, entityId, stepState);
				}
			}
		}
	}
}

/**
 * Concurrent mode for Concurrently composite action
 */
export enum ConcurrentMode {
	/** Success when ANY action succeeds */
	Race = "Race",
	/** Success when ALL actions succeed */
	Join = "Join",
}

/**
 * Concurrently - Execute multiple actions at the same time
 */
export const Concurrently = component<{
	readonly mode: ConcurrentMode;
	readonly actionIds: ReadonlyArray<AnyEntity>;
}>("Concurrently");
export type Concurrently = ReturnType<typeof Concurrently>;

/**
 * Builder for Concurrently composite action
 */
export class ConcurrentlyBuilder implements ActionBuilder {
	private actionBuilders: ActionBuilder[] = [];
	private modeValue: ConcurrentMode = ConcurrentMode.Join;
	private labelText?: string;

	/**
	 * Add an action to execute concurrently
	 */
	push(action: ActionBuilder): this {
		this.actionBuilders.push(action);
		return this;
	}

	/**
	 * Set the concurrent mode
	 */
	mode(mode: ConcurrentMode): this {
		this.modeValue = mode;
		return this;
	}

	/**
	 * Set a label for this action
	 */
	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, actionEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		const actionIds: AnyEntity[] = [];

		for (const builder of this.actionBuilders) {
			const childActionId = spawnAction(builder, world, actorEntityId);
			actionIds.push(childActionId);
		}

		world.insert(
			actionEntityId,
			Concurrently({
				mode: this.modeValue,
				actionIds: actionIds,
			}),
		);
	}

	label(): string {
		return this.labelText ?? "Concurrently";
	}
}

/**
 * System to execute Concurrently composite actions
 */
export function concurrentlySystem(world: World, context: AppContext): void {
	for (const [entityId, concurrent, actionState] of world.query(Concurrently, ActionStateComponent)) {
		const currentState = actionState.state;

		if (currentState === ActionState.Requested) {
			// Request all child actions
			for (const childId of concurrent.actionIds) {
				setActionState(world, childId, ActionState.Requested);
			}
			setActionState(world, entityId, ActionState.Executing);
		} else if (currentState === ActionState.Executing) {
			if (concurrent.mode === ConcurrentMode.Join) {
				// All must succeed
				let allSuccess = true;
				let anyFailed = false;

				for (const childId of concurrent.actionIds) {
					const childState = getActionState(world, childId);
					if (childState === ActionState.Failure) {
						anyFailed = true;
						allSuccess = false;
					} else if (childState !== ActionState.Success) {
						allSuccess = false;
					}
				}

				if (anyFailed) {
					// Cancel remaining actions
					for (const childId of concurrent.actionIds) {
						const childState = getActionState(world, childId);
						if (childState !== ActionState.Success && childState !== ActionState.Failure) {
							setActionState(world, childId, ActionState.Cancelled);
						}
					}
					setActionState(world, entityId, ActionState.Failure);
				} else if (allSuccess) {
					setActionState(world, entityId, ActionState.Success);
				}
			} else if (concurrent.mode === ConcurrentMode.Race) {
				// Any can succeed
				let allFailed = true;
				let anySucceeded = false;

				for (const childId of concurrent.actionIds) {
					const childState = getActionState(world, childId);
					if (childState === ActionState.Success) {
						anySucceeded = true;
						allFailed = false;
					} else if (childState !== ActionState.Failure) {
						allFailed = false;
					}
				}

				if (anySucceeded) {
					// Cancel remaining actions
					for (const childId of concurrent.actionIds) {
						const childState = getActionState(world, childId);
						if (childState !== ActionState.Success && childState !== ActionState.Failure) {
							setActionState(world, childId, ActionState.Cancelled);
						}
					}
					setActionState(world, entityId, ActionState.Success);
				} else if (allFailed) {
					setActionState(world, entityId, ActionState.Failure);
				}
			}
		} else if (currentState === ActionState.Cancelled) {
			// Cancel all child actions
			let allDone = true;
			let anySuccess = false;
			let anyFailed = false;

			for (const childId of concurrent.actionIds) {
				const childState = getActionState(world, childId);
				if (childState === ActionState.Success) {
					anySuccess = true;
				} else if (childState === ActionState.Failure) {
					anyFailed = true;
				} else if (childState !== ActionState.Init) {
					allDone = false;
					setActionState(world, childId, ActionState.Cancelled);
				}
			}

			if (allDone) {
				if (concurrent.mode === ConcurrentMode.Race) {
					setActionState(world, entityId, anySuccess ? ActionState.Success : ActionState.Failure);
				} else {
					setActionState(world, entityId, anyFailed ? ActionState.Failure : ActionState.Success);
				}
			}
		}
	}
}
