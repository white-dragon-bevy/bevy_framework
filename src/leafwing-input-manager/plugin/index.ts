/**
 * Input manager plugin module exports
 *
 * This module provides the main plugin class, component factory, extensions,
 * and context helpers for integrating the input manager with the Bevy app framework.
 */

export { InputManagerPlugin, InputManagerPluginConfig } from "./input-manager-plugin";
export { createActionComponents, ComponentDefinition, InputSystemData } from "./component-factory";
export { clearComponentCache, getComponentCacheSize } from "./component-factory";
export { InputManagerExtension } from "./extensions";

// Context helper functions for new architecture
export {
	getActionComponents,
	spawnWithInput,
	getEntityInputData,
	addInputToEntity,
	removeInputFromEntity,
	queryInputEntities,
} from "./context-helpers";

// Legacy components for backward compatibility
export { InputMapComponent, ActionStateComponent, InputEnabled, LocalPlayer } from "./components";
