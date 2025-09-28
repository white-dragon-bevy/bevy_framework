# white-dragon-bevy 和 rust-bevy 的区别

**简写**

- white-dragon-bevy: wb
- rust-bevy: rb

**区别**

- world: wb 的world主体为 matter world, 提供 resource,message,event, command支持
- system: wb 的系统不能动态注入参数, 固定为 foo(world,context)
- context: wb 的独有概念, 用来替代 system params, 可以访问所有对象, 可以由其他插件注入快捷访问方式.
