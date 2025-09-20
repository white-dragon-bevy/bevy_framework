# github pull request

- 运行指令 `check-ai-disable`
- 运行指令 `/git-merge-dev`
- 运行指令 `/fix-all-errors`, 如果有错误被修复了,总结,并询问用户是否继续提交pr.
- **重要**: 再次运行 `/fix-all-errors`
- 运行指令 `/git-commit`
- 先检查pr状态, 如果本分支`已提交pr,且被关闭`,则需要创建新的pr
- 向`dev`分支提交pr

注意,如果#ARGUMENTS 里面提及`自动确认`, 则自动完成以上流程.
