export { Actionlike, ActionlikeEnum } from "./actionlike";
export { InputControlKind } from "./input-control-kind";
export { Instant } from "./instant";
export { Timing } from "./timing";

/**
 * Type alias for HashMap
 */
export type HashMap<K, V> = Map<K, V>;

/**
 * Serializable interface for objects that can be converted to/from JSON
 */
export interface Serializable {
	/**
	 * Converts the object to a JSON-compatible format
	 * @returns A JSON-compatible object
	 */
	toJSON(): object;

	/**
	 * Loads data from a JSON-compatible format
	 * @param data - The JSON-compatible data
	 */
	fromJSON(data: object): void;
}