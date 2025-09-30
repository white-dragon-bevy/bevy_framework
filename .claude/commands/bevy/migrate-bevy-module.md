# 迁移 bevy_app 模块到 roblox-ts

设 <pluginName> = #ARGUMENTS

## 任务描述

将 Bevy 引擎的  模块 `1:1` 迁移到 roblox-ts 生态，实现应用框架和插件系统。

## 输入目录

- `bevy-origin/crates/<pluginName>/` - Bevy 原始应用框架代码
- `bevy-origin-packages/<pluginName>/` - 社区贡献, 上面的找不到就在这里找

## 输出目录

- `src/<pluginName>/` - 迁移后的 roblox-ts 应用框架

## 任务要求

### 1. 使用`roblox-ts-pro`代理进行 核心功能迁移
- 必读文档:
    - docs\white-dragon-bevy-introduction.md
    - docs\generic-type-handling.md
    - docs\plugin-development-specification.md
- 阅读 `src/` 目录下所有 README.md, 了解已迁移功能和接口.
- 实现插件系统接口 `Plugin`
- 支持插件的注册、初始化和生命周期管理
- 建立插件间的依赖关系处理
- 严格符合源代码设计逻辑, 接口命名应基本一致

## 验证标准

- 所有测试通过
- TypeScript 编译无错误
- 符合 roblox-ts-pro 编码规范
- **一比一迁移**
