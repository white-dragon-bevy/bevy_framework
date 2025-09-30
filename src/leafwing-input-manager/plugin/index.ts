export { InputManagerPlugin, InputManagerPluginConfig } from "./input-manager-plugin";
export { createActionComponents, ComponentDefinition, InputSystemData } from "./component-factory";
export { clearComponentCache, getComponentCacheSize } from "./component-factory";

// Context helper functions for new architecture
export {
	getActionComponents,
	spawnWithInput,
	getEntityInputData,
	addInputToEntity,
	removeInputFromEntity,
	queryInputEntities
} from "./context-helpers";

// Legacy components for backward compatibility
export { InputMapComponent, ActionStateComponent, InputEnabled, LocalPlayer } from "./components";
