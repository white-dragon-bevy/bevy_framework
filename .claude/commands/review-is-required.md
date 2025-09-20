# 判断是否需要审核

通过 #ARGUMENTS 或上下文获取 {{目标}}

如果{{目标}}已审核且hash未改变, 则不需要审核.


根据 @review-approve.md 规则, 读取 {{目标}} 路径对应的审核状态.


**工具**
hash: `node scripts/hash.js`, 参数为文件地址

使用*工具* 获取 {{目标}} 当前的 hash.

如果审核hash不等于当前hash, 则需要重新审核.