# Bevy App 使用手册

## 目录

1. [核心概念](./01-core-concepts.md) - 了解 Bevy App 的基本架构
2. [快速开始](./02-quick-start.md) - 创建你的第一个 Bevy App
3. [App 类详解](./03-app-class.md) - App 类的使用方法
4. [插件系统](./04-plugin-system.md) - 如何创建和使用插件
5. [调度系统](./05-schedule-system.md) - 理解和使用调度器
6. [资源管理](./06-resource-management.md) - 管理应用资源
7. [子应用系统](./07-sub-app.md) - 使用 SubApp 进行模块化
8. [完整示例](./08-examples.md) - 实际应用示例
9. [API 参考](./09-api-reference.md) - 详细的 API 文档
10. [迁移指南](./10-migration-guide.md) - 从 Rust Bevy 迁移

## 简介

Bevy App 是一个基于 ECS（Entity Component System）架构的应用程序框架，移植自 Rust Bevy 引擎。它提供了：

- 🎯 **模块化插件系统** - 通过插件组织和复用代码
- ⚡ **高性能调度器** - 并行执行系统，优化性能
- 📦 **资源管理** - 全局状态和资源的统一管理
- 🔄 **生命周期管理** - 清晰的应用程序生命周期
- 🎮 **Roblox 集成** - 专为 Roblox 平台优化

## 版本信息

- **当前版本**: 0.2.0
- **Rust Bevy 版本对应**: 0.14
- **最低 Roblox-TS 版本**: 2.0.0
- **依赖**: @rbxts/matter, @rbxts/services

## 快速导航

- [快速开始](./02-quick-start.md) - 如果你是新手，从这里开始
- [API 参考](./09-api-reference.md) - 查找具体的 API 用法
- [完整示例](./08-examples.md) - 通过示例学习最佳实践