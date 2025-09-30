# Migration Guide: InputInstanceManagerResource to Dynamic Components

## Overview

This migration guide explains how to update your code from the old `InputInstanceManagerResource` system to the new dynamic component-based system. The new approach uses proper ECS queries instead of a separate resource manager.

## Key Changes

### 1. Removed Components
- ❌ `InputInstanceManagerResource` - No longer needed
- ❌ `InputManagerStateResource` - Simplified away
- ❌ Complex TypeDescriptor system - Replaced with simple string names

### 2. New Components
- ✅ `ComponentDefinition<A>` - Dynamic component factory
- ✅ `InputSystemData<A>` - Combined component data structure
- ✅ Direct ECS queries - No intermediate manager

## Migration Steps

### Step 1: Update Plugin Creation

**Old Way:**
```typescript
const plugin = InputManagerPlugin.create(
    config,
    Modding.Generic<PlayerAction, "id">(),
    Modding.Generic<PlayerAction, "text">()
);
```

**New Way:**
```typescript
const plugin = new InputManagerPlugin<PlayerAction>({
    actionTypeName: "PlayerAction",
    networkSync: {
        enabled: false
    }
});
```

### Step 2: Create Entities with Input Components

**Old Way:**
```typescript
// Components were managed internally by InputInstanceManagerResource
const entity = world.spawn();
// Complex registration process...
```

**New Way:**
```typescript
// Get the component definition from the plugin
const components = plugin.getComponents();

// Method 1: Use the spawn helper
const entity = components.spawn(
    world,
    new InputMap<PlayerAction>()
        .insert(PlayerAction.Jump, KeyCode.Space)
        .insert(PlayerAction.Attack, MouseButton.Left),
    new ActionState<PlayerAction>()
);

// Method 2: Manual entity creation
const entity = world.spawn();
components.insert(
    world,
    entity,
    inputMap,
    actionState
);
```

### Step 3: Query Entities

**Old Way:**
```typescript
// Through the manager resource
const manager = world.resources.getResource<InputInstanceManagerResource<A>>();
const inputMap = manager?.getInputMap(entity);
const actionState = manager?.getActionState(entity);
```

**New Way:**
```typescript
// Direct ECS query
const components = plugin.getComponents();

// Query all entities with input components
for (const [entityId, data] of components.query(world)) {
    const { inputMap, actionState, enabled } = data;

    if (enabled && inputMap && actionState) {
        // Process the entity
        if (actionState.pressed(PlayerAction.Jump)) {
            // Handle jump
        }
    }
}

// Or get a specific entity
const data = components.get(world, entityId);
if (data?.actionState?.pressed(PlayerAction.Jump)) {
    // Handle jump
}
```

### Step 4: Remove Components

**Old Way:**
```typescript
const manager = world.resources.getResource<InputInstanceManagerResource<A>>();
manager?.removeEntity(entity);
```

**New Way:**
```typescript
const components = plugin.getComponents();
components.remove(world, entity);
```

## Complete Example

```typescript
// Define your actions
enum PlayerAction {
    Jump,
    Attack,
    MoveLeft,
    MoveRight,
}

// Implement Actionlike
class PlayerActionlike implements Actionlike {
    constructor(public readonly action: PlayerAction) {}

    hash(): string {
        return `PlayerAction:${this.action}`;
    }

    equals(other: Actionlike): boolean {
        return this.hash() === other.hash();
    }

    toString(): string {
        return PlayerAction[this.action];
    }
}

// Create the plugin
const inputPlugin = new InputManagerPlugin<PlayerActionlike>({
    actionTypeName: "PlayerAction",
});

// Add plugin to app
app.addPlugin(inputPlugin);

// Get component helpers
const components = inputPlugin.getComponents();

// Create a player entity with input handling
function spawnPlayer(world: BevyWorld): number {
    const inputMap = new InputMap<PlayerActionlike>()
        .insert(new PlayerActionlike(PlayerAction.Jump), KeyCode.Space)
        .insert(new PlayerActionlike(PlayerAction.Attack), MouseButton.Left)
        .insert(new PlayerActionlike(PlayerAction.MoveLeft), KeyCode.A)
        .insert(new PlayerActionlike(PlayerAction.MoveRight), KeyCode.D);

    return components.spawn(world, inputMap);
}

// System to handle player input
function playerInputSystem(world: BevyWorld, context: Context): void {
    for (const [entityId, data] of components.query(world)) {
        if (!data.enabled || !data.actionState) continue;

        const actionState = data.actionState;

        // Check actions
        if (actionState.justPressed(new PlayerActionlike(PlayerAction.Jump))) {
            print(`Player ${entityId} jumped!`);
        }

        if (actionState.pressed(new PlayerActionlike(PlayerAction.MoveLeft))) {
            // Move player left
        }

        if (actionState.pressed(new PlayerActionlike(PlayerAction.MoveRight))) {
            // Move player right
        }
    }
}

// Register the system
app.addSystems(MainScheduleLabel.UPDATE, playerInputSystem);
```

## Benefits of the New System

1. **True ECS Architecture** - Components are managed by the ECS, not a separate manager
2. **Better Performance** - Matter's optimized queries instead of Map lookups
3. **Simpler Code** - No TypeDescriptor complexity or macro magic
4. **Type Safety** - Full TypeScript type checking maintained
5. **Cleaner API** - Direct component access without intermediate layers

## Troubleshooting

### Issue: "Cannot find components"
Make sure you're using the same action type name when creating components and plugins.

### Issue: "Type errors with generics"
Ensure your Actionlike implementation properly extends the interface and has consistent typing.

### Issue: "Components not updating"
Check that:
1. The entity has both `inputMap` and `actionState`
2. The `enabled` flag is true
3. The systems are properly registered in the correct schedule

## Need Help?

If you encounter issues during migration:
1. Check the example code in `__examples__/` directory
2. Review the test files in `__tests__/` for usage patterns
3. Refer to the component-factory.ts for implementation details