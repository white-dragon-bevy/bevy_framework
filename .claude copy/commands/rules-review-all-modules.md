# 审核规则所有模块

## 基础文档
- `审核规则文档`: @../../framework/review/index.md
- `模块大纲`: @../../docs/modules.md

## 执行步骤
2. 读取 `../../framework/rules/index.md`
3. 在{{rule}}对应的生成目录内, 获取文件或文件夹列表, 每一项代表一个{{module}}
4. 针对所有的{{module}},依次读取它们的`审核状态`
6. 针对所有`未审核`或`未通过`的{{module}}, 创建`异步子任务列表`
8. 每个`子任务`的参数是 {{module}} 和 {{rule}}.

## 模块依赖分析
- 从`docs/modules.md` 读取模块依赖关系, 用拓扑排序分析执行顺序，标出循环依赖.

## 子任务
1. 创建代理, 提示词为 [执行 @.claude/commands/rules-review.md 工具, 参数 `{"module":{{module}},"rule":{{rule}}}`]
