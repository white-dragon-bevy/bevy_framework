# 审核流程

## 基础文档
- `规则文档`: @../../framework/review/index.md
- `模块大纲`: @../../docs/modules.md

## 执行步骤
1. **参数解析**：根据 #ARGUMENTS 内的参数或上下文，识别 {{rule}} 和 {{module}}
2. 根据`规则文档`和 {{rule}}, 获取 {{module}} *输出位置*
3. **获取审核状态**: 如果模块的审核状态为 *已通过*, 则终止任务.
4. **依赖分析**：查阅 modules.md，完全掌握 {{module}} 的依赖关系
5. **前置阅读**：按照 {{rule}} 规则的前置阅读要求，阅读相关文档
6. **横向对比**：阅读依赖模块的同层级文档
7. **执行审核**：使用对应规则执行审核

## 审计原则
1. **严格标准**：认真审核，不留情面
3. **核心原则**：遵循 **KISS** 原则，禁止过度设计
4. **历史一致**：尊重 memory 文档中的历史决策
5. **聚焦目标**: 仅关注{{module}}范围内的文件审核, 

## 审计输出要求
1. **评分**：必须给出 *0-100* 的客观评分
2. **问题**：详细说明发现的问题及位置
3. **建议**：如果分数低于`90`分, 提供3到10条具体可执行的改进建议, 并*输出问题*
4. **提交**: 如果分数高于`90`分, 请使用工具 [@review-approve.md] 提交审核版本控制.

## 输出问题
输出json文件, 保存到 `{{项目目录}}/tmp/.review-questions/{{rule}}/{{module}}-{{rule}}.json`, 请使用`jq`工具检查输出json格式,确保正确.

每个问题设置1到4个选项, 为每个选项评估推荐度, 如果推荐度小于10%, 就不要问了.

json样例:

```json
{
  "metadata": {
    "title": "成就模块Proto层级审计",
    "name": "本题目集专注于成就模块的Proto层级设计审计结果。\n\n主要内容包括：\n- 接口定义的完整性和一致性\n- 数据结构的合理性\n- 模块间依赖关系\n- KISS原则的遵循程度\n- 与HLD设计的契合度",
    "description": "目标受众：\n- 架构师\n- 高级开发工程师\n- 代码审查人员\n\n难度等级：高级\n预计时间：30-45分钟\n\n重要提醒：\n- 基于实际代码审计结果\n- 关注设计原则和架构一致性\n- 避免过度设计",
    "score": 78
  },
  "questions": [
    {
      "id": "q1",
      "content": "事件系统设计过于复杂，events.ts包含10+个事件接口和295行代码，如何改进？",
      "name": "问题位置：events.ts\n\n当前设计包含：\n- AchievementProgressUpdateEvent\n- AchievementStatusChangeEvent\n- AchievementCompletedEvent\n- AchievementRewardClaimedEvent\n- AchievementCheckTriggeredEvent\n- AchievementSystemInitializedEvent\n- AchievementStatisticsUpdateEvent\n- AchievementUnlockedEvent\n- AchievementConditionMetEventData\n- AchievementNotificationSentEventData\n- AchievementEventListener接口\n- AchievementEventPublisher接口",
      "description": "影响：\n- 违反KISS原则\n- 增加维护成本\n- 过度抽象",
      "options": {
        "a": "【推荐度90%】精简到3个核心事件（progress_updated、completed、reward_claimed），删除细粒度事件和Listener/Publisher接口",
        "b": "【推荐度5%】拆分为多个文件，按事件类型组织",
        "c": "【推荐度5%】保持现状，为未来扩展预留空间",
        "d": "【推荐度0%】增加更多事件类型以覆盖所有场景"
      }
    },
  ]
}
```

