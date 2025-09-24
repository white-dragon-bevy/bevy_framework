import { UserInput } from "../user-input/traits/user-input";

/**
 * A collection of basic inputs that can be checked for conflicts
 */
export class BasicInputs {
	private inputs: Set<string>;

	constructor(inputs?: Set<string>) {
		this.inputs = inputs ?? new Set();
	}

	/**
	 * Creates BasicInputs from a single input
	 * @param input - The input to wrap
	 * @returns A new BasicInputs instance
	 */
	static single(input: UserInput): BasicInputs {
		return new BasicInputs(new Set([input.hash()]));
	}

	/**
	 * Creates BasicInputs from multiple inputs
	 * @param inputs - The inputs to wrap
	 * @returns A new BasicInputs instance
	 */
	static multiple(inputs: UserInput[]): BasicInputs {
		const hashes = new Set<string>();
		for (const input of inputs) {
			hashes.add(input.hash());
		}
		return new BasicInputs(hashes);
	}

	/**
	 * Creates BasicInputs from a composite input
	 * @param inputs - The composite inputs
	 * @returns A new BasicInputs instance
	 */
	static composite(inputs: Set<UserInput>): BasicInputs {
		const hashes = new Set<string>();
		inputs.forEach((input) => hashes.add(input.hash()));
		return new BasicInputs(hashes);
	}

	/**
	 * Creates empty BasicInputs
	 * @returns An empty BasicInputs instance
	 */
	static empty(): BasicInputs {
		return new BasicInputs();
	}

	/**
	 * Checks if this set contains all inputs from another set
	 * @param other - The other BasicInputs to check
	 * @returns True if this contains all of other's inputs
	 */
	contains(other: BasicInputs): boolean {
		for (const input of other.inputs) {
			if (!this.inputs.has(input)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Checks if this set overlaps with another set
	 * @param other - The other BasicInputs to check
	 * @returns True if there's any overlap
	 */
	overlaps(other: BasicInputs): boolean {
		for (const input of other.inputs) {
			if (this.inputs.has(input)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Gets the size of the input set
	 * @returns The number of inputs
	 */
	size(): number {
		return this.inputs.size();
	}

	/**
	 * Checks if the input set is empty
	 * @returns True if empty
	 */
	isEmpty(): boolean {
		return this.inputs.size() === 0;
	}

	/**
	 * Adds an input to the set
	 * @param input - The input to add
	 */
	add(input: UserInput): void {
		this.inputs.add(input.hash());
	}

	/**
	 * Removes an input from the set
	 * @param input - The input to remove
	 */
	remove(input: UserInput): void {
		this.inputs.delete(input.hash());
	}

	/**
	 * Creates a union with another BasicInputs
	 * @param other - The other BasicInputs
	 * @returns A new BasicInputs containing all inputs from both
	 */
	union(other: BasicInputs): BasicInputs {
		const result = new Set<string>();
		// Copy all inputs from this set
		this.inputs.forEach((input) => result.add(input));
		// Add all inputs from other set
		other.inputs.forEach((input) => result.add(input));
		return new BasicInputs(result);
	}

	/**
	 * Creates an intersection with another BasicInputs
	 * @param other - The other BasicInputs
	 * @returns A new BasicInputs containing only common inputs
	 */
	intersection(other: BasicInputs): BasicInputs {
		const result = new Set<string>();
		this.inputs.forEach((input) => {
			if (other.inputs.has(input)) {
				result.add(input);
			}
		});
		return new BasicInputs(result);
	}

	/**
	 * Clears all inputs
	 */
	clear(): void {
		this.inputs.clear();
	}

	/**
	 * Gets all input hashes
	 * @returns An array of input hashes
	 */
	toArray(): string[] {
		const result: string[] = [];
		this.inputs.forEach((input) => result.push(input));
		return result;
	}
}