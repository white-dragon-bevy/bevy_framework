请分类并修复 lint 错误

- **自我进化**：@../../docs/framework/010_concept/014-evolution.md
- 运行`修复所有错误`子任务

## 修复所有错误
1. 运行 `npm test` 获取单元测试错误, 如果有错误, 跳转到 `4.`
2. 运行 `npm run dev:compile` 获取编译错误, 如果有错误, 跳转到 `5.`
2. 运行 `npm run lint` 查看错误列表
3. 如果没有错误, 跳转到 `7.`
4. 认真思考，进行合理分类
5. 创建异步子任务并**异步执行**.
6. 等待所有子任务结束
8. 等待任务执行完毕, 再次运行`修复所有错误`


## 参考

- **roblox-ts**: @../../framework/020_base-coding/021_roblox-ts.md
- **roblox-ts-limit**: @../../framework/020_base-coding/roblox-ts-limit.md