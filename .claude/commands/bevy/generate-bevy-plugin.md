# 生成完整的 Bevy 插件模块

设 `<pluginName>` = #ARGUMENTS

## 任务描述

基于 Rust Bevy 框架的设计理念，生成一个完整的 roblox-ts 插件模块，包含完整的功能实现、测试和文档。

## 输入参考

- `bevy-origin/crates/<pluginName>/` - 如果存在，参考 Bevy 原始实现
- `bevy-origin-packages/<pluginName>/` - 社区贡献, 上面的找不到就在这里找
- `src/bevy_*/` - 参考现有插件实现模式
- `.claude/agents/roblox-ts-pro.md` - 编码规范

## 输出目录

```
src/<pluginName>/
├── index.ts                      # 主导出文件
├── plugin.ts                     # 插件实现
├── prelude.ts                    # 常用导出集合
├── components/                   # 组件定义（如果需要）
│   └── index.ts
├── systems/                      # 系统函数（如果需要）
│   └── index.ts
├── resources/                    # 资源定义（如果需要）
│   └── index.ts
├── events/                       # 事件定义（如果需要）
│   └── index.ts
├── __tests__/                    # 测试文件
│   ├── plugin.spec.ts
│   └── integration.spec.ts
└── README.md                     # 插件文档
```

## 核心实现要求

### 1. 插件结构体 (plugin.ts)

```typescript
import { Plugin, App } from "../bevy_app";
import { World } from "@rbxts/matter";

/**
 * <PluginName>插件 - <插件功能描述>
 */
export class <PluginName>Plugin implements Plugin {
	/**
	 * 插件名称
	 */
	readonly name = "<PluginName>Plugin";

	/**
	 * 插件构造函数
	 * @param config - 插件配置
	 */
	constructor(private readonly config?: <PluginName>Config) {}

	/**
	 * 构建插件
	 * @param app - 应用实例
	 */
	build(app: App): void {
		// 1. 注册组件（如果有）
		this.registerComponents(app);

		// 2. 初始化资源（如果有）
		this.initializeResources(app);

		// 3. 注册事件（如果有）
		this.registerEvents(app);

		// 4. 添加系统
		this.addSystems(app);

		// 5. 设置插件扩展（如果需要）
		this.setupExtensions(app);
	}

	/**
	 * 完成插件构建
	 * @param app - 应用实例
	 */
	finish(app: App): void {
		// 插件初始化完成后的操作
	}

	/**
	 * 清理插件
	 * @param app - 应用实例
	 */
	cleanup(app: App): void {
		// 插件清理逻辑
	}

	// 私有方法实现...
}
```

### 2. 公共 API 定义 (index.ts)

```typescript
/**
 * <pluginName> 模块
 * <模块描述>
 */

// 核心插件导出
export { <PluginName>Plugin } from "./plugin";

// 组件导出（如果有）
export * from "./components";

// 系统导出（如果有）
export * from "./systems";

// 资源导出（如果有）
export * from "./resources";

// 事件导出（如果有）
export * from "./events";

// 类型导出
export type { <PluginName>Config } from "./plugin";

// 辅助函数导出
export { /* 辅助函数 */ } from "./helpers";
```

### 3. Prelude 模块 (prelude.ts)

```typescript
/**
 * <pluginName> prelude 模块
 * 包含最常用的导出，方便用户使用
 */

// 重新导出核心功能
export { <PluginName>Plugin } from "./plugin";

// 导出常用组件
export { /* 最常用的组件 */ } from "./components";

// 导出常用资源
export { /* 最常用的资源 */ } from "./resources";

// 导出常用辅助函数
export { /* 最常用的辅助函数 */ } from "./helpers";
```

### 4. 组件定义 (components/index.ts)

```typescript
import { component } from "@rbxts/matter";

/**
 * <ComponentName>组件 - <组件描述>
 */
export const <ComponentName> = component<{
	// 组件数据字段（按字母顺序）
	fieldA: number;
	fieldB: string;
	fieldC: boolean;
}>("<ComponentName>");

// 导出组件类型
export type <ComponentName>Data = ReturnType<typeof <ComponentName>>;
```

### 5. 系统函数 (systems/index.ts)

```typescript
import { World } from "@rbxts/matter";
import { SystemConfigs, IntoSystemConfigs } from "../../bevy_app";

/**
 * <系统名称>系统 - <系统功能描述>
 * @param world - ECS世界实例
 * @param deltaTime - 时间增量
 */
export function <systemName>System(world: World, deltaTime: number): void {
	// 系统逻辑实现
	for (const [entity, component] of world.query(<ComponentName>)) {
		// 处理实体
	}
}

// 系统配置（如果需要）
export function configure<SystemName>(): IntoSystemConfigs {
	return new SystemConfigs(<systemName>System)
		.runIf(/* 运行条件 */)
		.after(/* 依赖系统 */);
}
```

### 6. 资源定义 (resources/index.ts)

```typescript
/**
 * <ResourceName>资源 - <资源描述>
 */
export class <ResourceName> {
	/**
	 * 构造函数
	 * @param config - 资源配置
	 */
	constructor(public readonly config: <ResourceConfig>) {}

	/**
	 * 资源方法
	 */
	public method(): void {
		// 方法实现
	}
}

// 资源标识符
export const <ResourceName>Resource = "<ResourceName>Resource";
```

### 7. 事件定义 (events/index.ts)

```typescript
import { Events } from "../../bevy_ecs";

/**
 * <EventName>事件 - <事件描述>
 */
export interface <EventName> {
	// 事件数据字段（按字母顺序）
	readonly data: unknown;
	readonly timestamp: number;
}

/**
 * 创建<EventName>事件实例
 * @param data - 事件数据
 * @returns 事件实例
 */
export function create<EventName>(data: unknown): <EventName> {
	return {
		data,
		timestamp: os.clock(),
	};
}

// 事件资源
export type <EventName>Events = Events<<EventName>>;
```

### 8. 插件扩展 (如果需要)

```typescript
// 在 plugin.ts 中
private setupExtensions(app: App): void {
	// 声明扩展接口
	app.context.declare("<pluginName>.feature", {
		description: "插件功能描述",
		methods: {
			methodName: {
				description: "方法描述",
				parameters: [
					{ name: "param1", type: "string", description: "参数描述" }
				],
				returns: { type: "boolean", description: "返回值描述" }
			}
		}
	});

	// 注册扩展实现
	app.context.set("<pluginName>.feature", {
		methodName: (param1: string): boolean => {
			// 方法实现
			return true;
		}
	});
}
```

## 测试要求

### 1. 单元测试 (\_\_tests\_\_/plugin.spec.ts)

```typescript
import { <PluginName>Plugin } from "../plugin";
import { App } from "../../bevy_app";

export = () => {
	describe("<PluginName>Plugin", () => {
		let app: App;

		beforeEach(() => {
			app = new App();
		});

		afterEach(() => {
			app.cleanup();
		});

		it("should register plugin correctly", () => {
			const plugin = new <PluginName>Plugin();
			app.addPlugin(plugin);

			expect(app.hasPlugin("<PluginName>Plugin")).to.equal(true);
		});

		it("should initialize resources", () => {
			const plugin = new <PluginName>Plugin();
			app.addPlugin(plugin);

			const resource = app.world.get(<ResourceName>Resource);
			expect(resource).to.be.ok();
		});

		it("should register systems", () => {
			const plugin = new <PluginName>Plugin();
			app.addPlugin(plugin);

			// 验证系统注册
			expect(app.hasSystem(<systemName>System)).to.equal(true);
		});

		// 更多测试用例...
	});
};
```

### 2. 集成测试 (\_\_tests\_\_/integration.spec.ts)

```typescript
export = () => {
	describe("<PluginName> Integration", () => {
		it("should work with other plugins", () => {
			const app = new App()
				.addPlugin(new <PluginName>Plugin())
				.addPlugin(new OtherPlugin());

			app.update(0.016);

			// 验证插件间交互
		});

		it("should handle edge cases", () => {
			// 边界情况测试
		});
	});
};
```

## 文档要求

### README.md 结构

1. **模块概述** - 插件功能和用途说明
2. **安装方法** - 如何添加到项目
3. **基础用法** - 快速开始示例
4. **核心概念** - 主要组件和系统说明
5. **API 参考** - 详细的 API 文档
6. **配置选项** - 可配置参数说明
7. **示例代码** - 完整的使用示例
8. **最佳实践** - 使用建议和注意事项
9. **与其他插件的集成** - 依赖关系和兼容性

## 编码规范检查清单

### 必须满足的规范

- [ ] 所有文件以 `\n` 结尾
- [ ] 使用 Tab 缩进，不使用空格
- [ ] 所有导出函数有 JSDoc 注释
- [ ] JSDoc 使用 `@param name - description` 格式
- [ ] 接口属性按字母顺序排列
- [ ] 显式声明所有返回类型
- [ ] 使用描述性变量名，不用单字母
- [ ] 正确的空行规则（循环后、变量声明后）
- [ ] 不使用嵌套 if 没有 else
- [ ] 使用 Result<T> 模式处理错误

### Roblox-ts 特定规范

@.claude/agents/roblox-ts-pro.md

## 验证步骤

1. **构建验证**
   ```bash
   npx rbxtsc
   ```

2. **ESLint 检查**
   ```bash
   npx eslint src/<pluginName> --ext .ts
   ```

3. **单元测试**
   ```bash
   npm test -- -p <robloxPath>
   ```

4. **集成测试**
   ```bash
   npm test -- -p <robloxPath>
   ```

## 插件质量标准

### 功能完整性
- 核心功能全部实现
- 边界情况处理完善
- 错误处理机制健全
- 性能优化到位

### 代码质量
- 符合所有编码规范
- 代码结构清晰
- 注释完整准确
- 类型安全严格

### 测试覆盖
- 单元测试覆盖核心功能
- 集成测试验证插件交互
- 性能测试（如果适用）
- 错误场景测试

### 文档质量
- API 文档完整
- 使用示例丰富
- 配置说明清晰
- 最佳实践指导

## 特殊考虑

### Roblox 平台适配
- 单线程执行模型
- 无 yield 函数限制
- RunService 集成
- 客户端/服务端分离

### Matter ECS 集成
- 组件定义规范
- 查询优化
- 系统调度
- 世界管理

### 性能优化
- 避免频繁分配
- 使用对象池（如果适用）
- 批处理操作
- 缓存计算结果

## 输出清单

完成插件开发后，确保包含以下所有文件：

- [ ] `index.ts` - 主导出文件
- [ ] `plugin.ts` - 插件实现
- [ ] `prelude.ts` - 便捷导出
- [ ] 组件文件（如果有）
- [ ] 系统文件（如果有）
- [ ] 资源文件（如果有）
- [ ] 事件文件（如果有）
- [ ] 完整的测试套件
- [ ] README.md 文档
- [ ] 所有代码通过验证

## 使用说明

1. 使用此提示词时，将 `<pluginName>` 替换为实际插件名称
2. 根据插件功能需求，选择性实现组件、系统、资源和事件
3. 参考现有插件实现（如 bevy_input、bevy_time、bevy_transform）
4. 确保所有代码符合 roblox-ts-pro 编码规范
5. 使用 Task 工具调用 generate-bevy-readme 生成文档