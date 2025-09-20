# 审核文档

将md文档变更为审核状态, 留存审核标记.

需要从#Arguments或上下文中获取 *文档路径*

## 如果目标是.md文件
将*文档路径*的文档变更为`发布`状态, 并做好版本追踪.

**工具**
hash: `node scripts/hash.js`, 参数为文件地址

**规则**
1. 当前文档必须为`.md`格式
2. 通过`hash`工具, 获取本`文件hash值`, 保留前五位
3. 从`frontmatter`查找 hash 字段, 读取`当前hash值`
4. 如果`文件hash值`等于`当前hash值`,则*结束本任务*
5. 从`frontmatter`查找 version 字段, 读取版本号, 默认为 0.0.0
7. 请先进行`版本更新策略`判断, 如果不是`major`类型, 就不用向用户提问了
8. 否则, 询问是否发布当前文件:{地址}, 给出3个选项 (1:patch,2:minor,3:major)
9. 提升版本号
10. 通过`hash`工具, 获取本文件hash值, 保留前五位
11. 设置其 `frontmatter` 
    - review: pass
    - date: {date}
    - hash: {文件hash值}
    - version: {version}
