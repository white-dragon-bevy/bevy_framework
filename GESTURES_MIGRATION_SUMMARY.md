# Gestures 模块迁移总结

## 完成的工作

### 1. 创建了 gestures.ts 模块
- **位置**: `src/bevy_input/gestures.ts`
- **内容**:
  - `GestureState` 枚举 (Started, Changed, Ended, Canceled)
  - `PinchGesture` 类 - 双指捏合手势
  - `RotationGesture` 类 - 双指旋转手势
  - `DoubleTapGesture` 类 - 双击手势
  - `PanGesture` 类 - 平移手势
  - `LongPressGesture` 类 - 长按手势
  - `GestureManager` 类 - 手势管理器
  - `GestureManagerConfig` 接口 - 配置接口
  - `DEFAULT_GESTURE_CONFIG` - 默认配置

### 2. 集成到 InputPlugin
- 在 `plugin.ts` 中初始化 `GestureManager`
- 创建手势事件写入器 (EventWriter)
- 设置 Roblox 手势事件连接:
  - `UserInputService.TouchPinch` → `PinchGesture`
  - `UserInputService.TouchRotate` → `RotationGesture`
  - `UserInputService.TouchPan` → `PanGesture`
  - `UserInputService.TouchTap` → `DoubleTapGesture` (通过时间间隔检测)
  - `UserInputService.TouchLongPress` → `LongPressGesture`
- 在 cleanup 中清理手势管理器

### 3. 更新资源存储
- 在 `resource-storage.ts` 中添加:
  - `setGestureManager(world, gestureManager)` 函数
  - `getGestureManager(world)` 函数
  - 在 `InputResourceStorage` 接口中添加 `gestures?` 字段

### 4. 更新导出
- 在 `index.ts` 中导出所有手势相关类型
- 在 `plugin.ts` 中重新导出 `getGestureManager` 函数
- 添加 `InputResources.Gestures` 常量

### 5. 创建单元测试
- **位置**: `src/bevy_input/__tests__/gestures.spec.ts`
- **测试覆盖**:
  - GestureState 枚举
  - 所有手势类的构造
  - 默认配置
  - GestureManager 的创建和清理

## 与 Rust Bevy 的差异

### 简化的设计
Rust Bevy 的 gestures.rs 只定义了简单的消息类型:
- `PinchGesture(f32)` - 仅存储增量值
- `RotationGesture(f32)` - 仅存储增量值
- `DoubleTapGesture` - 无字段
- `PanGesture(Vec2)` - 仅存储向量

### TypeScript 版本的增强
我们的实现添加了更多信息:
- 手势状态 (`GestureState`)
- 速度信息
- 触摸点位置
- 双击的时间间隔和位置
- 长按手势支持 (Rust 版本中没有)

这些增强使 TypeScript 版本更适合 Roblox 平台,并提供更丰富的手势信息。

## 使用示例

```typescript
import { App } from "@white-dragon-bevy/bevy_framework";
import { InputPlugin, PinchGesture, RotationGesture } from "@white-dragon-bevy/bevy_framework/bevy_input";
import { MessageReader  } from "@white-dragon-bevy/bevy_framework/bevy_ecs";

const app = new App();
app.addPlugin(new InputPlugin());

// 处理捏合手势
app.addSystem((world: World) => {
	const eventManager = app.main().getEventManager();
	const pinchReader = eventManager.createReader<PinchGesture>();
	
	for (const gesture of pinchReader.read()) {
		if (gesture.delta > 0) {
			print("Zoom in:", gesture.scale);
		} else {
			print("Zoom out:", gesture.scale);
		}
	}
});

// 处理旋转手势
app.addSystem((world: World) => {
	const eventManager = app.main().getEventManager();
	const rotationReader = eventManager.createReader<RotationGesture>();
	
	for (const gesture of rotationReader.read()) {
		print("Rotation:", math.deg(gesture.rotation));
	}
});

app.run();
```

## 文件清单

### 新建文件
1. `src/bevy_input/gestures.ts` - 手势模块主文件
2. `src/bevy_input/__tests__/gestures.spec.ts` - 单元测试

### 修改文件
1. `src/bevy_input/plugin.ts` - 集成手势管理器
2. `src/bevy_input/resource-storage.ts` - 添加手势资源存储
3. `src/bevy_input/index.ts` - 导出手势类型

## 测试

运行测试:
```bash
npm test -- -p ReplicatedStorage/rbxts_include/node_modules/@white-dragon-bevy/bevy_framework/bevy_input/__tests__/gestures.spec
```

## 注意事项

1. **平台兼容性**: 
   - 手势功能依赖 Roblox 的 `UserInputService` 手势事件
   - 仅在支持触摸输入的平台上可用(移动设备、平板等)

2. **事件处理**: 
   - 手势事件通过 Bevy 的事件系统发送
   - 需要在系统中使用 `MessageReader` 读取手势事件

3. **配置**: 
   - 可通过 `GestureManagerConfig` 自定义手势检测参数
   - 可选择性启用/禁用特定手势

4. **资源清理**: 
   - `GestureManager` 会在 `InputPlugin.cleanup()` 时自动清理
   - 会断开所有 Roblox 事件连接

## 下一步

如果需要进一步扩展,可以考虑:
1. 添加手势识别算法优化
2. 支持自定义手势
3. 添加手势冲突解决机制
4. 性能监控和优化
