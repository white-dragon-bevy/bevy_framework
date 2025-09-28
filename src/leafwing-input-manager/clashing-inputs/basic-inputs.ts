import { UserInput } from "../user-input/traits/user-input";
import { CentralInputStore } from "../user-input/central-input-store";

/**
 * Represents the type of input for clash detection
 */
export enum InputType {
	/** No input */
	None = "None",
	/** Single input (e.g., S key, Left Click) */
	Simple = "Simple",
	/** Multiple individual inputs (e.g., W+A+S+D for movement) */
	Composite = "Composite",
	/** Chord/combination input (e.g., Ctrl+S, Shift+Click) */
	Chord = "Chord",
}

/**
 * Metadata about an input for clash detection
 */
interface InputMetadata {
	/** Hash of the input */
	hash: string;
	/** Type of the input */
	typeValue: InputType;
	/** Size/complexity of the input (number of components) */
	size: number;
	/** The original UserInput object for detailed analysis */
	input?: UserInput;
}

/**
 * A collection of basic inputs that can be checked for conflicts
 */
export class BasicInputs {
	private inputs: Set<string>;
	private metadata: Map<string, InputMetadata>;

	constructor(inputs?: Set<string>, inputSources?: UserInput[]) {
		this.inputs = inputs ?? new Set();
		this.metadata = new Map();

		// Build metadata from input sources if provided
		if (inputSources) {
			for (const input of inputSources) {
				const hash = input.hash();
				this.metadata.set(hash, {
					hash,
					typeValue: this.determineInputType(input),
					size: this.calculateInputSize(input),
					input,
				});
			}
		}
	}

	/**
	 * Creates BasicInputs from a single input
	 * @param input - The input to wrap
	 * @returns A new BasicInputs instance
	 */
	static single(input: UserInput): BasicInputs {
		return new BasicInputs(new Set([input.hash()]), [input]);
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
		return new BasicInputs(hashes, inputs);
	}

	/**
	 * Creates BasicInputs from a composite input
	 * @param inputs - The composite inputs
	 * @returns A new BasicInputs instance
	 */
	static composite(inputs: Set<UserInput>): BasicInputs {
		const hashes = new Set<string>();
		const inputArray: UserInput[] = [];
		inputs.forEach((input) => {
			hashes.add(input.hash());
			inputArray.push(input);
		});
		return new BasicInputs(hashes, inputArray);
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
	 * Gets the length of the input set (alias for size)
	 * @returns The number of inputs
	 */
	length(): number {
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
		const hash = input.hash();
		this.inputs.add(hash);
		this.metadata.set(hash, {
			hash,
			typeValue: this.determineInputType(input),
			size: this.calculateInputSize(input),
			input,
		});
	}

	/**
	 * Removes an input from the set
	 * @param input - The input to remove
	 */
	remove(input: UserInput): void {
		const hash = input.hash();
		this.inputs.delete(hash);
		this.metadata.delete(hash);
	}

	/**
	 * Creates a union with another BasicInputs
	 * @param other - The other BasicInputs
	 * @returns A new BasicInputs containing all inputs from both
	 */
	union(other: BasicInputs): BasicInputs {
		const result = new Set<string>();
		const combinedInputs: UserInput[] = [];

		// Copy all inputs from this set
		this.inputs.forEach((inputHash) => {
			result.add(inputHash);
			const metadata = this.metadata.get(inputHash);
			if (metadata?.input) {
				combinedInputs.push(metadata.input);
			}
		});

		// Add all inputs from other set
		other.inputs.forEach((inputHash) => {
			result.add(inputHash);
			const metadata = other.metadata.get(inputHash);
			if (metadata?.input) {
				combinedInputs.push(metadata.input);
			}
		});

		return new BasicInputs(result, combinedInputs);
	}

	/**
	 * Creates an intersection with another BasicInputs
	 * @param other - The other BasicInputs
	 * @returns A new BasicInputs containing only common inputs
	 */
	intersection(other: BasicInputs): BasicInputs {
		const result = new Set<string>();
		const commonInputs: UserInput[] = [];

		this.inputs.forEach((inputHash) => {
			if (other.inputs.has(inputHash)) {
				result.add(inputHash);
				const metadata = this.metadata.get(inputHash);
				if (metadata?.input) {
					commonInputs.push(metadata.input);
				}
			}
		});

		return new BasicInputs(result, commonInputs);
	}

	/**
	 * Clears all inputs
	 */
	clear(): void {
		this.inputs.clear();
		this.metadata.clear();
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

	/**
	 * Finds the position of a character in a string
	 * @param text - The string to search in
	 * @param char - The character to find
	 * @returns The position (1-indexed) or undefined if not found
	 */
	private findCharPosition(text: string, char: string): number | undefined {
		for (let index = 1; index <= text.size(); index++) {
			if (text.sub(index, index) === char) {
				return index;
			}
		}
		return undefined;
	}

	/**
	 * Checks if a string contains a substring
	 * @param text - The string to search in
	 * @param substring - The substring to find
	 * @returns True if substring is found
	 */
	private containsSubstring(text: string, substring: string): boolean {
		const replaced = text.gsub(substring, "")[0];
		return replaced.size() !== text.size();
	}

	/**
	 * Determines the type of a UserInput for clash detection
	 * @param input - The input to analyze
	 * @returns The InputType classification
	 */
	private determineInputType(input: UserInput): InputType {
		// Check if it's a chord by looking for chord-specific pattern in hash
		const hash = input.hash();
		if (hash.sub(1, 6) === "Chord:") {
			return InputType.Chord;
		}

		// Check if it's a simple input by looking at hash patterns
		if (
			hash.sub(1, 9) === "keyboard_" ||
			hash.sub(1, 6) === "mouse_" ||
			hash.sub(1, 8) === "gamepad_" ||
			hash.sub(1, 12) === "ModifierKey:"
		) {
			return InputType.Simple;
		}

		// If we can't determine the type, treat as composite
		return InputType.Composite;
	}

	/**
	 * Calculates the size/complexity of an input
	 * @param input - The input to measure
	 * @returns The size of the input
	 */
	private calculateInputSize(input: UserInput): number {
		// Check if it's a chord by looking at the hash
		const hash = input.hash();
		if (hash.sub(1, 6) === "Chord:") {
			// Parse the chord hash to count components
			// Format: Chord:[hash1,hash2,...]:requireAllModifiers
			const startPos = this.findCharPosition(hash, "[");
			const endPos = this.findCharPosition(hash, "]");

			if (startPos && endPos && startPos < endPos) {
				const componentsPart = hash.sub(startPos + 1, endPos - 1);
				// Count commas to determine number of components
				let commaCount = 0;
				for (let index = 1; index <= componentsPart.size(); index++) {
					if (componentsPart.sub(index, index) === ",") {
						commaCount++;
					}
				}
				return commaCount + 1; // Number of components is commas + 1
			}
		}

		// Simple inputs have size 1
		return 1;
	}

	/**
	 * Gets the input type of this BasicInputs collection
	 * @returns The dominant input type
	 */
	getInputType(): InputType {
		if (this.isEmpty()) {
			return InputType.None;
		}

		// If we have multiple different inputs, it's composite
		if (this.inputs.size() > 1) {
			return InputType.Composite;
		}

		// Single input - return its type
		let firstHash: string | undefined;
		this.inputs.forEach((hash) => {
			if (firstHash === undefined) {
				firstHash = hash;
			}
		});

		if (firstHash) {
			const metadata = this.metadata.get(firstHash);
			// If no metadata available, treat as Composite for safety
			return metadata?.typeValue ?? InputType.Composite;
		}

		return InputType.Composite;
	}

	/**
	 * Gets the total complexity/size of all inputs
	 * @returns The total size
	 */
	getTotalSize(): number {
		let totalSize = 0;
		this.metadata.forEach((metadata) => {
			totalSize += metadata.size;
		});
		return totalSize;
	}

	/**
	 * Checks if this input clashes with another input based on advanced rules
	 * @param other - The other BasicInputs to check against
	 * @param inputStore - Optional input store for real-time state checking
	 * @returns True if the inputs clash
	 */
	clashesWith(other: BasicInputs, inputStore?: CentralInputStore): boolean {
		// Empty inputs don't clash
		if (this.isEmpty() || other.isEmpty()) {
			return false;
		}

		const thisType = this.getInputType();
		const otherType = other.getInputType();

		// Apply clash rules based on input types
		switch (thisType) {
			case InputType.Simple: {
				switch (otherType) {
					case InputType.Simple:
						// Simple vs Simple: Never clash (e.g., S vs A)
						return false;

					case InputType.Chord:
						// Simple vs Chord: Clash if chord contains the simple input AND chord has multiple components
						return this.simpleVsChordClash(this, other);

					case InputType.Composite:
						// Simple vs Composite: Check if this is a strict subset of other
						return this.isStrictSubset(other);

					default:
						return false;
				}
			}

			case InputType.Chord: {
				switch (otherType) {
					case InputType.Simple:
						// Chord vs Simple: Clash if chord contains the simple input AND chord has multiple components
						return this.simpleVsChordClash(other, this);

					case InputType.Chord:
						// Chord vs Chord: Clash if they share any component inputs or have subset relationship
						return this.chordVsChordClash(this, other);

					case InputType.Composite:
						// Chord vs Composite: Check if chord's decomposed inputs have strict subset relationship
						return this.chordVsCompositeClash(this, other);

					default:
						return false;
				}
			}

			case InputType.Composite: {
				switch (otherType) {
					case InputType.Simple:
						// Composite vs Simple: Check if other is a strict subset of this
						return other.isStrictSubset(this);

					case InputType.Chord:
						// Composite vs Chord: Check if chord's decomposed inputs have strict subset relationship
						return this.chordVsCompositeClash(other, this);

					case InputType.Composite:
						// Composite vs Composite: Check for strict subset relationship in either direction
						return this.isStrictSubset(other) || other.isStrictSubset(this);

					default:
						return false;
				}
			}

			default:
				// Default to simple overlap check
				return this.overlaps(other);
		}
	}

	/**
	 * Checks for clash between a simple input and a chord
	 * @param simpleInput - The BasicInputs containing a simple input
	 * @param chordInput - The BasicInputs containing a chord
	 * @returns True if they clash
	 */
	private simpleVsChordClash(simpleInput: BasicInputs, chordInput: BasicInputs): boolean {
		// Get the chord from the chord input
		let chordHash: string | undefined;
		chordInput.inputs.forEach((hash) => {
			if (chordHash === undefined) {
				chordHash = hash;
			}
		});

		if (!chordHash) {
			return false;
		}

		const chordMetadata = chordInput.metadata.get(chordHash);

		if (!chordMetadata?.input) {
			return false;
		}

		// Check if it's actually a chord by checking the hash pattern
		if (chordHash.sub(1, 6) !== "Chord:") {
			return false;
		}

		// Get the chord size from metadata (we calculate this in calculateInputSize)
		const chordSize = chordMetadata.size;

		// Only clash if chord has more than 1 component (multi-key chord)
		if (chordSize <= 1) {
			return false;
		}

		// Get the simple input hash
		let simpleInputHash: string | undefined;
		simpleInput.inputs.forEach((hash) => {
			if (simpleInputHash === undefined) {
				simpleInputHash = hash;
			}
		});

		if (!simpleInputHash) {
			return false;
		}

		// Check if the chord contains the simple input by examining the chord hash
		// The chord hash format is: Chord:[hash1,hash2,...]:requireAllModifiers
		const startPos = this.findCharPosition(chordHash, "[");
		const endPos = this.findCharPosition(chordHash, "]");
		if (startPos && endPos && startPos < endPos) {
			const componentsPart = chordHash.sub(startPos + 1, endPos - 1);
			// Check if the simple input hash is in the components
			return this.containsSubstring(componentsPart, simpleInputHash);
		}

		return false;
	}

	/**
	 * Checks for clash between two chord inputs
	 * @param chord1 - First chord input
	 * @param chord2 - Second chord input
	 * @returns True if they clash
	 */
	private chordVsChordClash(chord1: BasicInputs, chord2: BasicInputs): boolean {
		// Get decomposed components of both chords
		const components1 = this.getDecomposedComponents(chord1);
		const components2 = this.getDecomposedComponents(chord2);

		if (!components1 || !components2) {
			return false;
		}

		// Check if either chord is a strict subset of the other, or they share components
		return components1.isStrictSubset(components2) ||
			components2.isStrictSubset(components1) ||
			components1.overlaps(components2);
	}

	/**
	 * Checks for clash between a chord and a composite input
	 * @param chordInput - The chord input
	 * @param compositeInput - The composite input
	 * @returns True if they clash
	 */
	private chordVsCompositeClash(chordInput: BasicInputs, compositeInput: BasicInputs): boolean {
		// Get decomposed components of the chord
		const chordComponents = this.getDecomposedComponents(chordInput);

		if (!chordComponents) {
			return false;
		}

		// Check if chord components have strict subset relationship with composite
		return chordComponents.isStrictSubset(compositeInput) ||
			compositeInput.isStrictSubset(chordComponents);
	}

	/**
	 * Gets the decomposed components of a chord input
	 * @param chordInput - The chord input to decompose
	 * @returns The decomposed components or undefined if not a chord
	 */
	private getDecomposedComponents(chordInput: BasicInputs): BasicInputs | undefined {
		let chordHash: string | undefined;
		chordInput.inputs.forEach((hash) => {
			if (chordHash === undefined) {
				chordHash = hash;
			}
		});

		if (!chordHash) {
			return undefined;
		}

		// Check if it's actually a chord by checking the hash pattern
		if (chordHash.sub(1, 6) !== "Chord:") {
			return undefined;
		}

		// Parse the chord hash to get component hashes
		// The chord hash format is: Chord:[hash1,hash2,...]:requireAllModifiers
		const startPos = this.findCharPosition(chordHash, "[");
		const endPos = this.findCharPosition(chordHash, "]");
		if (startPos && endPos && startPos < endPos) {
			const componentsPart = chordHash.sub(startPos + 1, endPos - 1);
			const componentSet = new Set<string>();

			// Split by comma manually
			let currentComponent = "";
			for (let index = 1; index <= componentsPart.size(); index++) {
				const char = componentsPart.sub(index, index);
				if (char === ",") {
					if (currentComponent.size() > 0) {
						componentSet.add(currentComponent);
						currentComponent = "";
					}
				} else {
					currentComponent = currentComponent + char;
				}
			}
			// Add the last component
			if (currentComponent.size() > 0) {
				componentSet.add(currentComponent);
			}

			return new BasicInputs(componentSet);
		}

		return undefined;
	}

	/**
	 * Checks if any input in this collection is currently active
	 * @param inputStore - The input store to check against
	 * @returns True if any input is active
	 */
	isAnyInputActive(inputStore: CentralInputStore): boolean {
		for (const inputHash of this.inputs) {
			if (inputStore.pressed(inputHash)) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Checks if all inputs in this collection are currently active
	 * @param inputStore - The input store to check against
	 * @returns True if all inputs are active
	 */
	areAllInputsActive(inputStore: CentralInputStore): boolean {
		for (const inputHash of this.inputs) {
			if (!inputStore.pressed(inputHash)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Gets metadata for a specific input hash
	 * @param hash - The input hash
	 * @returns The metadata if found
	 */
	getMetadata(hash: string): InputMetadata | undefined {
		return this.metadata.get(hash);
	}

	/**
	 * Gets all metadata for debugging purposes
	 * @returns Map of all input metadata
	 */
	getAllMetadata(): Map<string, InputMetadata> {
		const result = new Map<string, InputMetadata>();
		this.metadata.forEach((metadata, hash) => {
			result.set(hash, metadata);
		});
		return result;
	}

	/**
	 * Checks if this BasicInputs is a strict subset of another
	 * @param other - The other BasicInputs to check against
	 * @returns True if this is a strict subset of other
	 */
	isStrictSubset(other: BasicInputs): boolean {
		// Empty set is not a strict subset
		if (this.isEmpty()) {
			return false;
		}

		// If sizes are equal, it can't be a strict subset
		if (this.inputs.size() >= other.inputs.size()) {
			return false;
		}

		// Check if all inputs in this set are contained in the other set
		return this.isSubsetOf(other);
	}

	/**
	 * Checks if this BasicInputs is a subset of another (not necessarily strict)
	 * @param other - The other BasicInputs to check against
	 * @returns True if this is a subset of other
	 */
	isSubsetOf(other: BasicInputs): boolean {
		for (const inputHash of this.inputs) {
			if (!other.inputs.has(inputHash)) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Checks if this BasicInputs is a superset of another
	 * @param other - The other BasicInputs to check against
	 * @returns True if this is a superset of other
	 */
	isSupersetOf(other: BasicInputs): boolean {
		return other.isSubsetOf(this);
	}

	/**
	 * Checks if this BasicInputs is a strict superset of another
	 * @param other - The other BasicInputs to check against
	 * @returns True if this is a strict superset of other
	 */
	isStrictSuperset(other: BasicInputs): boolean {
		return other.isStrictSubset(this);
	}
}