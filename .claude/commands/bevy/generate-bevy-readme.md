创建 Bevy 插件时，为了让其他开发者能够方便地使用它，需要清晰地定义插件的公共 API。以下是通常需要明确为公开（`pub`）的关键信息：

1.  **插件结构体 (Plugin Struct):** 这是最核心的部分。你需要创建一个公共的结构体，并为其实现 `bevy::prelude::Plugin` trait。这是用户将其添加到 `App` 中的唯一方式。

2.  **公共组件 (Public Components):** 任何你希望用户能够添加到实体 (Entities) 或在系统中查询 (Query) 的数据结构都必须是公共的。

3.  **公共资源 (Public Resources):** 如果你的插件引入了全局唯一的配置或状态，并且希望用户能够访问或修改它，那么这个资源 (Resource) 就必须是公共的。

4.  **公共系统 (Public Systems):** 那些直接影响游戏逻辑或者用户可能需要进行排序（例如，在某个系统之前或之后运行）的系统函数需要是公共的。

5.  **公共事件 (Public Events):** 如果你的插件会发送事件 (Events) 或者需要用户发送事件来触发某些行为，那么这些事件的结构体必须是公共的。

6.  **公共状态 (Public States):** 如果你的插件使用了状态机（`State`），那么定义状态的 `enum` 必须是公共的，这样用户才能在自己的逻辑中切换或检查这些状态。

7.  **Prelude 模块 (Optional but recommended):** 这是一个非常好的实践。创建一个名为 `prelude` 的公共模块，然后在这个模块里重新导出（`pub use`）所有最常用的公共项（比如核心组件、插件结构体、关键资源等）。这样，用户只需要 `use my_plugin::prelude::*;` 就可以方便地导入所有必需品。

8.  **插件扩展 (Plugin Extensions):** 如果你的插件使用了扩展系统（Extension System），需要明确以下内容：
    - **扩展接口 (Extension Interfaces):** 定义清晰的扩展接口，声明到 `PluginExtensions` 全局注册表中
    - **扩展文档 (Extension Documentation):** 为每个扩展提供详细的使用说明，包括方法签名、参数说明和返回值描述
    - **扩展命名 (Extension Naming):** 使用点号分隔的命名空间（如 `myPlugin.feature`），保持命名的一致性和可读性
    - **扩展依赖 (Extension Dependencies):** 通过 `ExtensionMetadata` 明确声明扩展之间的依赖关系
    - **扩展示例 (Extension Examples):** 提供使用 `app.context.get()` 访问扩展的示例代码

请根据 #Arguments **生成或维护** `src/<module>` 的文档