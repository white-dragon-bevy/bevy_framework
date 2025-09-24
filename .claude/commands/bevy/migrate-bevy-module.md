# 迁移 bevy_app 模块到 roblox-ts

设 <pluginName> = #ARGUMENTS

## 任务描述

将 Bevy 引擎的  模块迁移到 roblox-ts 生态，实现应用框架和插件系统。

## 输入目录

- `bevy-origin/crates/<pluginName>/` - Bevy 原始应用框架代码
- `bevy-origin-packages/<pluginName>/` - 社区贡献, 上面的找不到就在这里找

## 输出目录

- `src/<pluginName>/` - 迁移后的 roblox-ts 应用框架

## 任务要求

### 1. 核心功能迁移
- 阅读 `src/` 目录下所有 README.md, 了解已迁移功能和接口.
- 阅读 `src/` 目录下代码, 了解插件结构规范
- 阅读 @.claude/commands/bevy/bevy-readme.md 了解插件结构规范.
- 实现插件系统接口 `Plugin`
- 支持插件的注册、初始化和生命周期管理
- 建立插件间的依赖关系处理
- 严格符合源代码设计逻辑, 接口命名应基本一致(使用roblox-ts 命名规范)

### 2. 架构设计
- `不需要封装 roblox 接口`, 不必兼容 bevy api

### 样例

```typescript
// 核心插件接口
interface MatterPlugin {
    install(world: World): void;
    name?: string;
    dependencies?: Array<string>;
}

// 应用构建器
class MatterApp {
    addPlugin(plugin: MatterPlugin): this;
    addPlugins(plugins: Array<MatterPlugin>): this;
    run(): void;
    world: World;
}
```

### 3. 编码规范

严格遵循 `.claude/agents/roblox-ts-pro.md` 中的编码规范：

- 使用显式返回类型
- 所有导出函数必须有 JSDoc 注释
- 使用 `@param name - description` 格式
- 文件末尾必须以换行符结束
- 使用 Tab 缩进
- 变量名必须具有描述性
- 接口属性按字母顺序排列

### 4. 单元测试

使用 `@rbxts/testez` 编写完整的单元测试：

- 测试插件注册功能
- 测试插件依赖解析
- 测试应用生命周期
- 测试错误处理机制

### 5. 特殊考虑

- 适配 Roblox 单线程执行模型
- 与 `@rbxts/matter` ECS 系统集成
- 处理 Roblox 服务的初始化顺序
- 支持热重载和开发模式

## 文件结构

```
src/<pluginName>/
├── *.ts                         # 代码, 尽量符合源代码结构
├── __tests__/                   # 单元测试和集成测试
├── README.md
└── 
```

## 预期产出

1. 完整的 bevy_app 模块实现
2. 类型安全的插件系统
3. 全面的单元测试覆盖
4. 详细的 JSDoc 文档
5. 与 Matter ECS 的无缝集成
6. README.md (使用代理, 提示词: .claude/commands/bevy/bevy-readme.md)

## 验证标准

- 所有测试通过
- ESLint 检查无错误
- TypeScript 编译无错误
- 符合 roblox-ts-pro 编码规范
- 插件系统可扩展性良好
