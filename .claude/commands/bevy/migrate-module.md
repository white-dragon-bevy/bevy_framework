# Bevy 模块迁移命令


## 任务描述

你的任务是将 Rust 的 Bevy 框架的 模块 **#ARGUMENTS** 迁移到 Roblox-TS/Matter 生态系统。

- 源代码: `bevy-origin\crates\#ARGUMENTS`
- 目标: `crates\#ARGUMENTS`

### 迁移步骤

1. **分析源码结构**
   - 研究 `bevy-origin/crates/#ARGUMENTS/` 的源码结构
   - 了解模块的核心功能和 API 设计
   - 识别关键的类型、trait 和函数

2. **评估迁移策略**
   - 确定哪些功能可以直接迁移
   - 识别需要适配 Roblox 平台的部分
   - 评估与 @rbxts/matter 的集成方式

3. **创建目录结构**
   - 复制 `crates\_template` 到  `crates/#ARGUMENTS/`
   - 设置 package.json 和 TypeScript 配置
   - 建立与项目的依赖关系

4. **实现核心功能**
   - 将 Rust 代码适配为 TypeScript/Roblox-TS
   - 保持 Bevy 的 API 设计哲学
   - 确保与 Matter ECS 的兼容性
   - 适配 Roblox 平台特性

5. **编写测试**
   - 创建单元测试验证功能
   - 编写集成测试确保与其他模块兼容
   - 提供使用示例

6. **文档编写**
   - 创建 README.md 说明模块功能
   - 编写 API 文档
   - 提供迁移对照表（Bevy API → Roblox-TS API）

### 技术要求

#### 遵循项目约定
- 使用 TypeScript 严格模式
- 遵循项目的代码风格
- 确保与现有 crates 的兼容性

#### Roblox 平台适配
- 使用 Roblox 内置服务和 API
- 考虑 Luau 执行环境的限制
- 优化性能，避免不必要的计算

#### Matter ECS 集成
- 与 @rbxts/matter 的 World、Component、System 概念保持一致
- 实现 Bevy 风格的插件模式
- 支持 ECS 查询和系统调度

#### 保持 Bevy 设计哲学
- 数据驱动的设计
- 组合优于继承
- 明确的关注点分离
- 高度模块化

### 输出要求

完成迁移后，请提供：

1. **功能完整的 TypeScript 模块**
   - 完整的类型定义
   - 实现所有核心功能
   - 导出清晰的 API

2. **测试套件**
   - 单元测试覆盖主要功能
   - 集成测试验证兼容性

3. **文档**
   - 详细的 README.md
   - API 参考文档
   - 使用示例

4. **迁移报告**
   - 已迁移的功能列表
   - 平台限制说明
   - 与原版的差异对比
   - 后续改进建议

### 注意事项

- 严格遵循 1:1 迁移原则，只迁移 Bevy 原生功能
- 不要添加非 Bevy 的外部库功能
- 保持与迁移计划文档的一致性
- 考虑模块间的依赖关系
- 优先实现核心功能，可选功能可以后续迭代

## 相关资源

- [迁移计划文档](../../../docs/migration-plan.md)
- [Bevy 官方文档](https://bevyengine.org/)
- [Matter ECS 文档](https://matter-ecs.github.io/matter/)
- [Roblox-TS 文档](https://roblox-ts.com/)