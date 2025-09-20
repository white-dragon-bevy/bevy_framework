## 自检


请使用 `claude  --dangerously-skip-permissions {prompt}`,并使用**无头模式**运行自检流程.

如果"需要重新自检", 请重新运行"自检流程"

### 自检流程

自检需要以下流程:

- 确保 `npm run dev:compile` 正常
- 确保 `npm run config:build` 正常
- 确保 `npm test` 

如果任何一个流程出现错误, 你必须修复它们, 然后返回 "需要重新自检"

如果每个流程都正确, 请返回 "自检完成"
