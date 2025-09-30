import { Actionlike } from "../actionlike";
import { BasicInputs } from "./basic-inputs";
import { ClashStrategy } from "./clash-strategy";
import { UserInput } from "../user-input/traits/user-input";
import { CentralInputStore } from "../user-input/central-input-store";

/**
 * Represents a potential clash between actions
 */
export interface InputClash<A extends Actionlike> {
	/**
	 * The actions involved in the clash
	 */
	actions: A[];

	/**
	 * The shared inputs causing the clash
	 */
	sharedInputs: BasicInputs;
}

/**
 * Detects and resolves input clashes between actions
 */
export class ClashDetector<A extends Actionlike> {
	private actionInputs: Map<string, BasicInputs> = new Map();

	/**
	 * Registers an action with its inputs
	 * @param action - The action to register
	 * @param inputs - The inputs for this action
	 */
	registerAction(action: A, inputs: UserInput[]): void {
		const basicInputs = BasicInputs.multiple(inputs);
		this.actionInputs.set(action.hash(), basicInputs);
	}

	/**
	 * Clears all registered actions
	 */
	clear(): void {
		this.actionInputs.clear();
	}

	/**
	 * Detects all clashes between registered actions
	 * @param inputStore - Optional input store for advanced clash detection
	 * @returns An array of detected clashes
	 */
	detectClashes(inputStore?: CentralInputStore): InputClash<A>[] {
		const clashes: InputClash<A>[] = [];
		const actionHashes: string[] = [];

		// Convert Map keys to array manually for roblox-ts compatibility
		this.actionInputs.forEach((_, key) => {
			actionHashes.push(key);
		});

		for (let i = 0; i < actionHashes.size(); i++) {
			for (let j = i + 1; j < actionHashes.size(); j++) {
				const hash1 = actionHashes[i];
				const hash2 = actionHashes[j];
				const inputs1 = this.actionInputs.get(hash1)!;
				const inputs2 = this.actionInputs.get(hash2)!;

				// Use the new advanced clash detection
				if (inputs1.clashesWith(inputs2, inputStore)) {
					clashes.push({
						actions: [hash1, hash2] as unknown as A[],
						sharedInputs: inputs1.intersection(inputs2),
					});
				}
			}
		}

		return clashes;
	}

	/**
	 * Resolves clashes according to the given strategy
	 * @param clashes - The clashes to resolve
	 * @param strategy - The strategy to use
	 * @param inputStore - Optional input store for real-time input checking
	 * @returns The actions that should be triggered
	 */
	resolveClashes(clashes: InputClash<A>[], strategy: ClashStrategy, inputStore?: CentralInputStore): Set<string> {
		const triggeredActions = new Set<string>();

		// If no clashes, all actions can trigger
		if (clashes.size() === 0) {
			this.actionInputs.forEach((_, actionHash) => {
				triggeredActions.add(actionHash);
			});
			return triggeredActions;
		}

		// Group actions by clash involvement
		const clashedActions = new Set<string>();
		const actionSizes = new Map<string, number>();

		for (const clash of clashes) {
			for (const action of clash.actions) {
				const actionHash = (action as unknown as string);
				clashedActions.add(actionHash);
				const inputs = this.actionInputs.get(actionHash);
				if (inputs) {
					// Use the new getTotalSize() method for more accurate sizing
					actionSizes.set(actionHash, inputs.getTotalSize());
				}
			}
		}

		// Apply strategy
		switch (strategy) {
			case ClashStrategy.PrioritizeLargest: {
				// Find the globally largest action from all clashed actions
				let globalLargestAction: string | undefined;
				let globalLargestSize = 0;

				// Consider all clashed actions and find the one with the most inputs
				for (const actionHash of clashedActions) {
					const inputs = this.actionInputs.get(actionHash);
					const size = actionSizes.get(actionHash) ?? 0;

					// Only consider this action if its inputs are actually active (if we have inputStore)
					if (inputStore && inputs && !inputs.areAllInputsActive(inputStore)) {
						continue;
					}

					if (size > globalLargestSize) {
						globalLargestSize = size;
						globalLargestAction = actionHash;
					}
				}

				// Add the globally largest action
				if (globalLargestAction) {
					triggeredActions.add(globalLargestAction);
				}

				// Add any non-clashed actions
				this.actionInputs.forEach((_, actionHash) => {
					if (!clashedActions.has(actionHash)) {
						triggeredActions.add(actionHash);
					}
				});
				break;
			}

			case ClashStrategy.UseAll: {
				// All actions trigger regardless of clashes
				this.actionInputs.forEach((_, actionHash) => {
					triggeredActions.add(actionHash);
				});
				break;
			}

			case ClashStrategy.CancelAll: {
				// Only non-clashed actions trigger
				this.actionInputs.forEach((_, actionHash) => {
					if (!clashedActions.has(actionHash)) {
						triggeredActions.add(actionHash);
					}
				});
				break;
			}

			case ClashStrategy.PrioritizeFirst: {
				// Take the first action from each clash
				for (const clash of clashes) {
					const firstAction = (clash.actions[0] as unknown as string);
					triggeredActions.add(firstAction);
				}
				break;
			}

			case ClashStrategy.PrioritizeLast: {
				// Take the last action from each clash
				for (const clash of clashes) {
					const lastAction = (clash.actions[clash.actions.size() - 1] as unknown as string);
					triggeredActions.add(lastAction);
				}
				break;
			}
		}

		// Add non-clashed actions
		this.actionInputs.forEach((_, actionHash) => {
			if (!clashedActions.has(actionHash)) {
				triggeredActions.add(actionHash);
			}
		});

		return triggeredActions;
	}

	/**
	 * Checks if two specific actions clash
	 * @param action1 - First action
	 * @param action2 - Second action
	 * @param inputStore - Optional input store for advanced clash detection
	 * @returns True if the actions clash
	 */
	doActionsClash(action1: A, action2: A, inputStore?: CentralInputStore): boolean {
		const inputs1 = this.actionInputs.get(action1.hash());
		const inputs2 = this.actionInputs.get(action2.hash());

		if (!inputs1 || !inputs2) {
			return false;
		}

		return inputs1.clashesWith(inputs2, inputStore);
	}

	/**
	 * Gets all actions that clash with a specific action
	 * @param action - The action to check
	 * @param inputStore - Optional input store for advanced clash detection
	 * @returns Array of clashing action hashes
	 */
	getClashingActions(action: A, inputStore?: CentralInputStore): string[] {
		const clashingActions: string[] = [];
		const targetInputs = this.actionInputs.get(action.hash());

		if (!targetInputs) {
			return clashingActions;
		}

		this.actionInputs.forEach((inputs, actionHash) => {
			if (actionHash !== action.hash() && inputs.clashesWith(targetInputs, inputStore)) {
				clashingActions.push(actionHash);
			}
		});

		return clashingActions;
	}
}
