# 获取审核状态

根据 @review-approve.md 规则, 读取 #ARGUMENTS 参数路径对应的审核状态并输出.

#ARGUMENTS 参数可以是{{路径}} 或 {{路径数组}}

**限定输出格式为**

```yaml
- file-path
    - review：pass
    - version：0.0.1
    - date: ..
```

严格按例子格式输出.