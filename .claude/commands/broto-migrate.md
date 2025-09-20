对土豆兄弟的数值计算部分进行全面迁移的工作:

将 godot 代码迁移为 roblox 可执行代码.

请确保执行所有任务, 不必和我确认.

- 源代码 (.gd)： `docs/100_origin/reversed/broto`
- 目标目录 (.lua)： `src/server/broto-engine/`

## 进展
请先使用子代理, 扫描 `src/server/broto-engine/` 目录, 特别关于本次任务范围内的文件。


## 质量保证
- **准确无误**
- **禁止幻想**
- **功能齐备**
- **清除todos**
- **迁移文件和源文件函数命名保持一致**: 使用snake_case，以保持代码的可读性和对照性
- **单元测试或集成测试通过**

## 边界
由于将要使用单独的系统负责战斗表现:
**以下内容不迁移**
- 表现层
    - 音乐
    - ui
    - 音效
    - 用户控制
    - 等等
- 物理
    - 碰撞检测
- 战斗
    - 炮塔
    - 投射物
    - effect_behaviour
    - 效果行为
    - 攻击行为

## 非常重要
- **如何比对完整性**
    - 使用`npm run extract:gd <script>`提取源码函数名
    - 使用`npm run extract:luau <script>`提取迁移代码函数名
- **确保文件名一致**
- **确保函数名一致**(除非被边界排除, 不需要迁移)
- **每个迁移文件要标记来源**
- 所有依赖`src/server/BrotoEngine/singletons` 目录下的单例, 都要从 `_G.broto` 对象读取, 避免循环依赖

## sub-agents
legacy-modernizer: Analyze and plan modernization
roblox-testez: Create tests, tdd tester
code-reviewer: Review  plan
roblox-luau-pro: Implement plan
context-manager: 管理上下文
code-reviewer: 检查迁移完整度


## TDD
**请使用`测试驱动开发`进行迁移工作**
- use `roblox-testez` 确保为`所有`公开函数进行`单元测试`
- use `roblox-luau-pro` 撰写业务代码.
- 将测试文件与被测试文件放在同一文件夹中
- 修改迁移代码前， 确保阅读`源代码 .gd`




Target: $ARGUMENTS