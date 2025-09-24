/**
 * Strategy for resolving input clashes when multiple actions share inputs
 */
export enum ClashStrategy {
	/**
	 * Prioritize the action with more inputs (larger combination wins)
	 * E.g., Ctrl+S beats S alone
	 */
	PrioritizeLargest = "PrioritizeLargest",

	/**
	 * Use all actions that have any matching inputs (all actions trigger)
	 */
	UseAll = "UseAll",

	/**
	 * Cancel all conflicting actions (no action triggers)
	 */
	CancelAll = "CancelAll",

	/**
	 * Prioritize based on action order (first action wins)
	 */
	PrioritizeFirst = "PrioritizeFirst",

	/**
	 * Prioritize based on action order (last action wins)
	 */
	PrioritizeLast = "PrioritizeLast",
}

/**
 * Default clash strategy used when not specified
 */
export const DEFAULT_CLASH_STRATEGY = ClashStrategy.PrioritizeLargest;