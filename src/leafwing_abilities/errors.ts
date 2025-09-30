/**
 * Represents the various reasons why an ability cannot be used
 */
export enum CannotUseAbility {
	/**
	 * The input was not pressed
	 */
	NotPressed = "NotPressed",

	/**
	 * The ability has no remaining charges
	 */
	NoCharges = "NoCharges",

	/**
	 * The ability is on cooldown
	 */
	OnCooldown = "OnCooldown",

	/**
	 * The ability is on global cooldown
	 */
	OnGlobalCooldown = "OnGlobalCooldown",

	/**
	 * The resource pool does not have enough resources
	 */
	PoolInsufficient = "PoolInsufficient",
}