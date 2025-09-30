## 底层工作

- 占位插件
  - bevy_camera
- 功能插件
  - bevy_animation
  - 
- jsdoc注释
- 文档
- 结构调整
- 例子
- src\bevy_ecs\query.ts 要不要了
- 热更新
- 简单同步
- 有可能需要
  - bevy_animation
  - bevy_asset
  - bevy_audio
  - bevy_camera
  - bevy_light

## 社区库迁移和学习

- leafwing-abilities
- leafwing-input-manager
  - 向服务端同步
- bevy-replicon
  - 测试
- 状态机或行为树(实体的)

## 项目目标

- 移植技能系统
- 移植buff系统
- 移植简单例子
- ai
  - https://github.com/zkat/big-brain
- 拯救弥豆子框架

## 完整的开源游戏项目

当你理解了基本模式后，就可以参考这些完整的游戏，看它们是如何在复杂的项目中组织代码的。

Galaxy-Throne
仓库地址: https://github.com/terrabrasil/galaxy-throne

类型: Vampire Survivors-like (吸血鬼幸存者like)

为什么是好例子?

这类游戏的核心玩法就是技能和 Buff 的组合。它的武器系统就是一套自动触发的技能系统，而每次升级获得的被动效果就是 Buff。

代码结构相对清晰，规模适中，适合学习。

你可以从中学习到：

如何用数据定义技能/武器（比如射速、伤害、弹道）。

如何实现被动 Buff 对技能的增强效果。

计时器驱动的技能施放（而不是玩家按键）。

Ethora (前身为 Project Mini-MUD)
仓库地址: https://github.com/EthoVenture/Ethora

类型: Multiplayer RPG (多人RPG)

为什么是好例子?

这是一个目标宏大的多人 RPG 框架，直接对标你的“网络游戏”需求。

包含了非常多的游戏系统，如玩家属性、物品、战斗和网络同步。

它使用了 bevy_replicon 进行网络同步，这正是我们之前讨论的推荐库。

你可以从中学习到：

如何在 Bevy 中组织一个大型项目的模块。

多人环境下，玩家的动作和状态是如何被同步的。

角色属性（Buff 会影响属性）和技能系统是如何交互的。

Oxidized Dungeon
仓库地址: https://github.com/amethyst/oxidized_dungeon

类型: Roguelike (回合制肉鸽)

为什么是好例子?

Roguelike 游戏是回合制的，这使得分析其逻辑流（谁在什么时候做了什么）变得非常容易。

状态效果（中毒、麻痹、燃烧等 Debuff）是 Roguelike 的核心机制之一。

你可以从中学习到：

如何实现一个回合制的行动系统（Action System）。

怪物 AI 是如何决定使用哪个技能的。

各种状态效果（Buff/Debuff）作为组件是如何被添加、更新和移除的。
