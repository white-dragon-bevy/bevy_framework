# luau 语法补充

## require

### require by string
- 例子: `require("../foo")`
- 你应当按照 `roblox rojo` 的特性， 去思考`DataModel`组织结构。 

**init.lua** 特例
- 注意：`init.lua(u)` 在 roblox 环境中，将会被转为`高一级`的ModuleScript 
- 使用`require("@self/foo")`引用同级以下的目录
- 使用`require("../foo)` 引用上级目录

比如：
.
├── foo.lua
└── bar
    ├── ejf.lua
    └── zee
        ├── init.lua
        └── doa.lua

引用：
```luau
-- foo/bar/zee/init.lua
local foo = require("../foo")
local ejf = require("./ejf")
local doa = require("@self/doa")

-- foo/bar/zee/doa.lua
local foo = require("../../foo")
local ejf = require("../ejf")
local zee = require("../zee")   -- 此处比较特殊， 不能使用 require("./") 定位

```

### require by module
- 绝大部分情况下， 你都应该使用 `require by string`
- 例外：
    - `require(game.ReplicatedStorage.Packages...)`
- 原因：某些模块需要客户端和服务端共同引用， 此时需要一个公共的位置来存放模块，且需要 `rojo` 正确配置。
    - `require(game.ReplicatedStorage.Packages...)` 需要在项目根目录存放 `Packages/` 代码。