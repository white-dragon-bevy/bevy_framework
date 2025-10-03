/**
 * Thinker is the "brain" that connects Scorers and Actions
 */

import { World, component } from "@rbxts/matter";
import type { AnyEntity, Component } from "@rbxts/matter";
import type { AppContext } from "../bevy_app/context";
import type { Picker } from "./pickers";
import type { Choice } from "./choices";
import { ChoiceBuilder } from "./choices";
import type { ScorerBuilder } from "./scorers";
import type { ActionBuilder } from "./actions";
import { Actor, spawnAction, ActionState, getActionState, setActionState } from "./actions";

/**
 * HasThinker component - marks entities that have a thinker
 */
export const HasThinker = component<{
	readonly thinkerEntityId: AnyEntity;
}>("HasThinker");
export type HasThinker = ReturnType<typeof HasThinker>;

/**
 * Thinker data type
 */
export interface ThinkerData {
	readonly picker: Picker;
	readonly choices: ReadonlyArray<Choice>;
	readonly otherwise?: ActionBuilder;
	currentActionId?: AnyEntity;
	currentActionBuilder?: ActionBuilder;
}

/**
 * Thinker component - the brain that picks and executes actions
 */
export const ThinkerComponent = component<ThinkerData>("Thinker");
export type ThinkerComponent = ReturnType<typeof ThinkerComponent>;

/**
 * ThinkerBuilder component - used to mark entities that should have a thinker
 */
export const ThinkerBuilderComponent = component<{
	builder: ThinkerBuilder;
}>("ThinkerBuilder");
export type ThinkerBuilderComponent = ReturnType<typeof ThinkerBuilderComponent>;

/**
 * Builder for creating Thinkers
 */
export class ThinkerBuilder implements ActionBuilder {
	private pickerValue?: Picker;
	private choiceBuilders: ChoiceBuilder[] = [];
	private otherwiseValue?: ActionBuilder;
	private labelText?: string;

	/**
	 * Set the picker for this thinker
	 */
	picker(picker: Picker): this {
		this.pickerValue = picker;
		return this;
	}

	/**
	 * Add a when/then choice
	 */
	when(scorer: ScorerBuilder, action: ActionBuilder): this {
		this.choiceBuilders.push(new ChoiceBuilder(scorer, action));
		return this;
	}

	/**
	 * Set default action if no choice is picked
	 */
	otherwise(action: ActionBuilder): this {
		this.otherwiseValue = action;
		return this;
	}

	/**
	 * Set a label for this thinker
	 */
	withLabel(labelText: string): this {
		this.labelText = labelText;
		return this;
	}

	build(world: World, actionEntityId: AnyEntity, actorEntityId: AnyEntity): void {
		assert(this.pickerValue !== undefined, "ThinkerBuilder must have a picker");

		// Build all choices
		const choices: Choice[] = [];
		for (const builder of this.choiceBuilders) {
			const choice = builder.build(world, actorEntityId);
			choices.push(choice);
		}

		// Create thinker component
		world.insert(
			actionEntityId,
			ThinkerComponent({
				picker: this.pickerValue,
				choices: choices,
				otherwise: this.otherwiseValue,
				currentActionId: undefined,
				currentActionBuilder: undefined,
			}),
		);

		// Set initial state
		setActionState(world, actionEntityId, ActionState.Requested);
	}

	label(): string {
		return this.labelText ?? "Thinker";
	}
}

/**
 * Attach thinker to entities with ThinkerBuilder
 */
export function thinkerComponentAttachSystem(world: World, context: AppContext): void {
	// Find entities with ThinkerBuilder but no HasThinker
	for (const [entityId, thinkerBuilderComp] of world.query(ThinkerBuilderComponent)) {
		const hasThinker = world.get(entityId, HasThinker);
		if (hasThinker === undefined) {
			// Spawn thinker action
			const thinkerEntityId = spawnAction(thinkerBuilderComp.builder, world, entityId);
			world.insert(entityId, HasThinker({ thinkerEntityId }));
		}
	}
}

/**
 * Detach thinker from entities without ThinkerBuilder
 */
export function thinkerComponentDetachSystem(world: World, context: AppContext): void {
	// Find entities with HasThinker but no ThinkerBuilder
	for (const [entityId, hasThinker] of world.query(HasThinker)) {
		const thinkerBuilder = world.get(entityId, ThinkerBuilderComponent);
		if (thinkerBuilder === undefined) {
			// Despawn thinker
			world.despawn(hasThinker.thinkerEntityId);
			world.remove(entityId, HasThinker);
		}
	}
}

/**
 * Main thinker system - executes thinking logic
 */
export function thinkerSystem(world: World, context: AppContext): void {
	for (const [thinkerEntityId, thinker] of world.query(ThinkerComponent)) {
		const state = getActionState(world, thinkerEntityId);
		if (state === undefined) {
			continue;
		}

		if (state === ActionState.Init) {
			setActionState(world, thinkerEntityId, ActionState.Requested);
		} else if (state === ActionState.Requested) {
			setActionState(world, thinkerEntityId, ActionState.Executing);
		} else if (state === ActionState.Executing) {
			// Pick an action based on scores
			const pickedChoice = thinker.picker.pick(thinker.choices, world);

			if (pickedChoice !== undefined) {
				// Execute picked action
				execPickedAction(world, thinkerEntityId, thinker, pickedChoice.actionBuilder, true);
			} else if (thinker.otherwise !== undefined) {
				// Execute otherwise action
				execPickedAction(world, thinkerEntityId, thinker, thinker.otherwise, false);
			} else if (thinker.currentActionId !== undefined) {
				// Check current action state
				const currentState = getActionState(world, thinker.currentActionId);
				if (currentState === ActionState.Success || currentState === ActionState.Failure) {
					// Current action done, despawn it
					world.despawn(thinker.currentActionId);
					world.insert(
						thinkerEntityId,
						ThinkerComponent({
							...thinker,
							currentActionId: undefined,
							currentActionBuilder: undefined,
						}),
					);
				} else if (currentState === ActionState.Init) {
					setActionState(world, thinker.currentActionId, ActionState.Requested);
				}
			}
		} else if (state === ActionState.Cancelled) {
			// Cancel current action
			if (thinker.currentActionId !== undefined) {
				const currentState = getActionState(world, thinker.currentActionId);
				if (
					currentState === ActionState.Requested ||
					currentState === ActionState.Executing ||
					currentState === ActionState.Init
				) {
					setActionState(world, thinker.currentActionId, ActionState.Cancelled);
				} else if (currentState === ActionState.Success || currentState === ActionState.Failure) {
					setActionState(world, thinkerEntityId, currentState);
				}
			} else {
				setActionState(world, thinkerEntityId, ActionState.Success);
			}
		}
	}
}

/**
 * Helper function to execute a picked action
 */
function execPickedAction(
	world: World,
	thinkerEntityId: AnyEntity,
	thinker: ThinkerComponent,
	actionBuilder: ActionBuilder,
	overrideCurrent: boolean,
): void {
	const actor = world.get(thinkerEntityId, Actor);
	if (actor === undefined) {
		return;
	}

	if (thinker.currentActionId !== undefined && thinker.currentActionBuilder !== undefined) {
		const currentState = getActionState(world, thinker.currentActionId);
		const previousDone = currentState === ActionState.Success || currentState === ActionState.Failure;

		// Check if we're switching to a different action
		const isSameAction = actionBuilder === thinker.currentActionBuilder;

		if ((!isSameAction && overrideCurrent) || previousDone) {
			if (!previousDone) {
				// Cancel current action
				if (currentState === ActionState.Executing || currentState === ActionState.Requested) {
					setActionState(world, thinker.currentActionId, ActionState.Cancelled);
				}
			} else {
				// Despawn completed action and spawn new one
				world.despawn(thinker.currentActionId);
				const newActionId = spawnAction(actionBuilder, world, actor.entityId);
				world.insert(
					thinkerEntityId,
					ThinkerComponent({
						...thinker,
						currentActionId: newActionId,
						currentActionBuilder: actionBuilder,
					}),
				);
			}
		} else {
			// Continue with current action
			if (currentState === ActionState.Init) {
				setActionState(world, thinker.currentActionId, ActionState.Requested);
			}
		}
	} else {
		// No current action, spawn new one
		const newActionId = spawnAction(actionBuilder, world, actor.entityId);
		world.insert(
			thinkerEntityId,
			ThinkerComponent({
				...thinker,
				currentActionId: newActionId,
				currentActionBuilder: actionBuilder,
			}),
		);
	}
}
