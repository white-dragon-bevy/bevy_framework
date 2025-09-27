/**
 * Component definitions for ECS
 */

/**
 * Component ID type
 */
export type ComponentId = number;

/**
 * Component ID generator
 */
export class ComponentIdGenerator {
	private static nextId = 0;

	/**
	 * Generate a new component ID
	 */
	public static generate(): ComponentId {
		return this.nextId++;
	}

	/**
	 * Reset the ID counter (for testing)
	 */
	public static reset(): void {
		this.nextId = 0;
	}
}