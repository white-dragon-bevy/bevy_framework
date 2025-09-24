/**
 * Leafwing Input Manager for Roblox
 * A powerful input management system ported from Bevy's leafwing-input-manager
 */

// Core exports
export * from "./core";

// User input traits
export * from "./user-input/traits/user-input";
export * from "./user-input/traits/buttonlike";
export * from "./user-input/traits/axislike";
export * from "./user-input/traits/dual-axislike";
export * from "./user-input/traits/triple-axislike";

// Input implementations
export * from "./user-input/central-input-store";
export * from "./user-input/keyboard";
export * from "./user-input/mouse";
export * from "./user-input/gamepad";
export * from "./user-input/virtual-controls";
export * from "./user-input/chord";

// Input map
export * from "./input-map/input-map";

// Action state
export { ActionData } from "./action-state/action-data";
export { ActionState, UpdatedActions } from "./action-state/action-state";
export { ButtonData } from "./action-state/button-data";

// Input processing
export * from "./input-processing";

// Clashing inputs - specific exports to avoid conflicts
export { BasicInputs } from "./clashing-inputs/basic-inputs";
export { ClashStrategy } from "./clashing-inputs/clash-strategy";
export { ClashDetector } from "./clashing-inputs/clash-detection";
export type { InputClash } from "./clashing-inputs/clash-detection";

// Networking
export * from "./networking";

// Plugin system
export * from "./plugin";

// Re-export commonly used types
export { InputControlKind } from "./core/input-control-kind";
export { Actionlike, ActionlikeEnum } from "./core/actionlike";
export { Instant } from "./core/instant";
export { CentralInputStore } from "./user-input/central-input-store";
export { KeyCode, ModifierKey } from "./user-input/keyboard";
export { MouseButton, MouseMove, MouseScroll, MouseMoveAxis } from "./user-input/mouse";
export { GamepadButton, GamepadStick, GamepadControlAxis } from "./user-input/gamepad";
