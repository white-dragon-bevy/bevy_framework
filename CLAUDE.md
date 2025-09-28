@.claude/agents/roblox-ts-pro.md

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

这是一个将 Rust Bevy 框架移植到 Roblox 平台的 TypeScript 项目，使用 roblox-ts 编译器和 @rbxts/matter ECS 框架。

## 技术栈

- **语言**: roblox-ts: `@.claude/agents/roblox-ts-pro.md`
- **目标平台**: Roblox
- **ECS框架**: @rbxts/matter
- **包管理器**: pnpm (10.15.0)
- **主要依赖**: @rbxts/matter, @rbxts/plasma, @rbxts/services

## 项目结构

```
src/
├── bevy_app/       # 应用程序生命周期管理
│   ├── app.ts          # 主应用程序类
│   ├── plugin.ts       # 插件系统
│   ├── scheduler.ts    # 调度系统
│   └── sub-app.ts      # 子应用程序
├── bevy_ecs/       # ECS系统实现
│   ├── command-buffer.ts   # 命令缓冲
│   ├── events.ts           # 事件系统
│   ├── query.ts            # 查询系统
│   ├── resource.ts         # 资源管理
│   ├── system-scheduler.ts # 系统调度
│   ├── world-extensions.ts # World扩展
│   └── __tests__/          # 测试文件
```

## 常用命令

```bash
# 构建项目
pnpm build

# 监视模式构建
pnpm watch

# 安装依赖
pnpm install
```

## 架构说明

### 核心概念

1. **App (应用程序)**: 管理整个应用的生命周期，包含插件、系统和资源
2. **Plugin (插件)**: 模块化功能的载体，可向App添加系统、资源和其他插件
3. **Schedule (调度)**: 控制系统执行顺序和时机，内置多个调度阶段
4. **System (系统)**: 处理游戏逻辑的函数，接收World和deltaTime参数
5. **World (世界)**: Matter ECS的核心，管理实体和组件

### 调度阶段

内置调度按以下顺序执行：

- First → PreStartup → Startup → PostStartup
- PreUpdate → Update → PostUpdate → Last

### Roblox集成

- **RobloxRunnerPlugin**: 提供Heartbeat/Stepped/RenderStepped驱动
- **RobloxPlayerPlugin**: 玩家管理
- **RobloxEnvironment**: 环境检测(服务端/客户端)

## 迁移指南

- Rust Bevy框架代码迁移到 `bevy-origin/` 和 `crates/` 目录
- 自定义插件代码放到 `crates-custom/` 目录
- 使用 @rbxts/matter 替代 Bevy ECS
- 使用 TypeScript 类型系统替代 Rust 类型系统

## 开发注意事项

- 所有TypeScript代码必须兼容roblox-ts编译器限制
- 使用Matter ECS的查询和组件系统
- 客户端和服务端代码需要使用RobloxEnvironment区分
- 如果函数的参数类型为 `Modding.*`, 则说明调用该函数的行将被 transform, 所有的这种类型的参数都不用主动提供.
- 在系统内监听roblox 事件, 应使用 world.useHook() 接口.

## 审计

- 审计报告保存在 `.audit/` 目录
- 应该从 context.resources 里读取 manager，而不是尝试在 World 对象上存储属性。

## 单元测试

- 编码后主动编译 `npm run build`, 然后运行单元测试
- 使用 `npm test` 命令运行单元测试, 该命令将调用 `testez-companion-node-cli`, 同时使用 `testez-companion.toml` 配置
- 使用 `npm test -- -p <robloxPath>`, 该命令将不再读取 testez-companion.toml, 直接测试提供的路径
  - 修改的地址为模块在 dataModel地址, 以 `/` 分割, 比如 `ReplicatedStorage/src/Core/BattleUtilities/Unit`
- 根据测试堆栈, 从 `out/` 目录阅读错误代码 (lua), 再到 `src` 目录定位错误 (ts)
  - 比如, 我们需要测试 `src/roblox_rvo`目录, 根据其转换后地址, 我们需要运行 `npm test -- -p  ReplicatedStorage/rbxts_include/node_modules/@white-dragon-bevy/bevy-framework/roblox_rvo`,
  - `src/<name>` 对应地址 `ReplicatedStorage/.../bevy-framework/<name>`
