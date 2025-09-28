# InputManagerPlugin 重构总结

## 重构原因

原始的 `InputManagerPlugin` 违反了 Bevy 框架的设计规则：
- 系统函数被定义为类的私有方法
- 大量使用 `this` 引用，导致系统函数与插件实例紧耦合
- 不符合 Bevy 系统函数应该是独立函数的设计理念

## 重构内容

### 1. 系统函数独立化

**重构前：**
```typescript
export class InputManagerPlugin<A extends Actionlike> implements Plugin {
    private tickActionState(world: World, app: App): void {
        // 使用 this.inputSystem, this.centralStore 等
    }
    
    private updateActionState(world: World): void {
        // 大量 this 引用
    }
}
```

**重构后：**
```typescript
function createInputManagerSystems<A extends Actionlike>(
    actionType: (new (...args: any[]) => A) & { name: string }
) {
    const tickActionStateSystem = (world: BevyWorld, context: Context): void => {
        // 通过资源系统和扩展系统访问状态
    };
    
    const updateActionStateSystem = (world: BevyWorld, context: Context): void => {
        // 无 this 引用，完全独立
    };
    
    return { tickActionStateSystem, updateActionStateSystem, ... };
}
```

### 2. 状态管理资源化

**新增资源类：**
```typescript
export class InputManagerStateResource<A extends Actionlike> implements Resource {
    constructor(
        public config: InputManagerPluginConfig<A>,
        public centralStore?: CentralInputStore,
        public inputSystem?: InputManagerSystem<A>,
        public connections: RBXScriptConnection[] = []
    ) {}
}
```

### 3. 辅助函数提取

**新增辅助函数：**
```typescript
// 从上下文获取实例管理器
function getInstanceManagerFromContext<A extends Actionlike>(
    context: AppContext, 
    actionType: (new (...args: any[]) => A) & { name: string }
): InputInstanceManagerResource<A> | undefined

// 同步 bevy_input 资源
function syncFromBevyInput(world: BevyWorld, centralStore: CentralInputStore): void
```

### 4. 插件构建方法简化

**重构前：**
```typescript
build(app: App): void {
    // 大量内联系统函数定义
    app.addSystems(MainScheduleLabel.PRE_UPDATE, (world: World) => {
        this.tickActionState(world, app);
    });
}
```

**重构后：**
```typescript
build(app: App): void {
    // 创建系统函数集合
    const systems = createInputManagerSystems(this.config.actionType);
    
    // 直接注册独立系统函数
    app.addSystems(MainScheduleLabel.PRE_UPDATE, systems.tickActionStateSystem);
}
```

## 重构优势

### 1. 符合 Bevy 设计规则
- 系统函数是独立的纯函数
- 无 `this` 引用，避免了与插件实例的耦合
- 通过资源系统和扩展系统访问状态

### 2. 更好的可测试性
- 系统函数可以独立测试
- 状态通过参数传递，便于模拟

### 3. 更清晰的职责分离
- 插件负责配置和注册
- 系统函数负责具体逻辑
- 资源负责状态管理

### 4. 更好的性能
- 减少了方法调用开销
- 系统函数直接访问资源，无需通过插件实例

## 测试验证

重构后的代码通过了所有现有测试：
- ✅ 101 个测试全部通过
- ✅ 编译无错误
- ✅ 功能完全保持一致

## 迁移指南

如果其他插件也存在类似问题，可以参考以下模式：

1. **提取系统函数**：将私有方法改为独立函数
2. **创建状态资源**：将插件内部状态移至资源类
3. **使用工厂函数**：为泛型插件创建系统函数工厂
4. **更新构建方法**：使用独立系统函数注册
5. **更新清理方法**：通过资源系统清理状态

这种重构模式可以应用于所有需要系统函数的 Bevy 插件。
